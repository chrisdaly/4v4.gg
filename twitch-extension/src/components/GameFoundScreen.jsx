import React, { useState, useEffect } from "react";
import { raceMapping } from "../lib/constants";
import { MmrComparison } from "./MmrComparison";
import FormDots from "@main/components/FormDots";
import { geometricMean } from "@main/lib/formatters";

const GATEWAY_LABELS = { 20: "Europe", 10: "Americas", 30: "Asia" };

const getMapImageName = (mapName) => {
  if (!mapName) return null;
  return mapName.replace(/^\(\d+\)\s*/, "").replace(/\s+/g, "").replace(/'/g, "");
};

const CountryFlag = ({ name, teamClass }) => {
  if (!name) return null;
  const code = name.toLowerCase();
  return (
    <img
      src={`https://flagcdn.com/16x12/${code}.png`}
      srcSet={`https://flagcdn.com/32x24/${code}.png 2x`}
      alt={name}
      className={`${teamClass} flag player-flag`}
      loading="lazy"
    />
  );
};

const AVATAR_SIZE = 80;

const PlayerCard = ({ player, avatarUrls, countries, sessionData, teamClass }) => {
  const avatarUrl = avatarUrls[player.battleTag];
  const country   = countries[player.battleTag];
  const mmr       = player.currentMmr || player.oldMmr || 0;
  const form      = sessionData?.[player.battleTag]?.form;

  return (
    <div className={`playerDiv ${teamClass}`} style={{ flex: 1, minWidth: 0, width: "auto", padding: "0 4px" }}>
      <div style={{ position: "relative", display: "inline-block" }}>
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="profile-pic" style={{ width: AVATAR_SIZE }}
            onError={e => { e.target.src = raceMapping[player.race]; }} />
        ) : (
          <img src={raceMapping[player.race]} alt="" className="profile-pic"
            style={{ width: AVATAR_SIZE, objectFit: "contain", background: "rgba(0,0,0,0.3)", padding: 10, border: "2px solid rgba(255,255,255,0.08)" }} />
        )}
        <CountryFlag name={country} teamClass={teamClass} />
        <img src={raceMapping[player.race]} alt="" className="race-overlay" />
      </div>

      <div className="player-name-row">
        <h2 style={{ color: "var(--gold)", fontSize: "var(--text-sm)", fontFamily: "var(--font-display)" }}>
          {player.name}
        </h2>
      </div>

      <div className="player-mmr-line" style={{ marginTop: 4 }}>
        {mmr > 0 ? (
          <>
            <span className="mmr-value">{mmr.toLocaleString()}</span>
            <span className="mmr-label"> MMR</span>
          </>
        ) : (
          <span className="mmr-label-muted">Unranked</span>
        )}
      </div>

      <div className="form-dots-wrapper" style={{ marginTop: 6 }}>
        <FormDots form={form} size="small" />
      </div>
    </div>
  );
};

const formatElapsed = (s) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

const GameFoundScreen = ({ matchData, avatarUrls = {}, countries = {}, sessionData = {}, slideOut = false }) => {
  if (!matchData?.teams || matchData.teams.length < 2) return null;

  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!matchData.startTime) return;
    const start = new Date(matchData.startTime).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [matchData.startTime]);

  const rawTeam1 = matchData.teams[0]?.players || [];
  const rawTeam2 = matchData.teams[1]?.players || [];

  // Highest MMR closest to center
  const team1 = [...rawTeam1].sort((a, b) => (a.currentMmr || 0) - (b.currentMmr || 0));
  const team2 = [...rawTeam2].sort((a, b) => (b.currentMmr || 0) - (a.currentMmr || 0));

  const team1Mmr = Math.round(geometricMean(rawTeam1.map(p => p.currentMmr || p.oldMmr || 0)));
  const team2Mmr = Math.round(geometricMean(rawTeam2.map(p => p.currentMmr || p.oldMmr || 0)));

  const mapName      = matchData.mapName || matchData.map || "";
  const mapImageName = getMapImageName(mapName);
  const mapImageUrl  = mapImageName ? `https://4v4.gg/maps/${mapImageName}.png` : null;
  const serverLabel  = matchData.serverInfo?.name || GATEWAY_LABELS[matchData.gateWay] || "";

  return (
    <div className={`gi-screen ${slideOut ? "gi-out" : "gi-in"}`}>
      <div className="gi-card Game">

        {/* Team headers — stacked columns */}
        <div className="gi-header-row">
          <div className="gi-team-header gi-header-1 team-0">
            <h2 className="team-name">TEAM 1</h2>
            <div className="image-container">
              {rawTeam1.map((p, i) => (
                <img key={i} src={raceMapping[p.race]} alt="" className="race teamHeaderRace" />
              ))}
            </div>
            <div className="team-mmr-line">
              <span className="mmr-value">{team1Mmr.toLocaleString()}</span>
              <span className="mmr-label"> MMR</span>
            </div>
          </div>

          <div className="gi-header-vs">VS</div>

          <div className="gi-team-header gi-header-2 team-1">
            <h2 className="team-name">TEAM 2</h2>
            <div className="image-container">
              {rawTeam2.map((p, i) => (
                <img key={i} src={raceMapping[p.race]} alt="" className="race teamHeaderRace" />
              ))}
            </div>
            <div className="team-mmr-line">
              <span className="mmr-value">{team2Mmr.toLocaleString()}</span>
              <span className="mmr-label"> MMR</span>
            </div>
          </div>
        </div>

        {/* Players + center */}
        <div className="gi-body">
          <div className="gi-team gi-team-1">
            {team1.map(p => (
              <PlayerCard key={p.battleTag} player={p} avatarUrls={avatarUrls} countries={countries} sessionData={sessionData} teamClass="team-0" />
            ))}
          </div>

          <div className="gi-center">
            <div className="gi-chart-wrap">
              <MmrComparison
                data={{
                  teamOneMmrs: rawTeam1.map(p => p.currentMmr || p.oldMmr || 0),
                  teamTwoMmrs: rawTeam2.map(p => p.currentMmr || p.oldMmr || 0),
                  teamOneAT: [],
                  teamTwoAT: [],
                }}
                variant="scorecard"
                localScale
              />
            </div>
            {elapsed > 0 && (
              <div className="gi-game-time">{formatElapsed(elapsed)}</div>
            )}
            {mapImageUrl && (
              <img src={mapImageUrl} alt={mapName} className="gi-map-img" onError={e => { e.target.style.display = "none"; }} />
            )}
            {(mapName || serverLabel) && (
              <div className="gi-map-info">
                {mapName     && <div className="gi-map-name">{mapName}</div>}
                {serverLabel && <div className="gi-server-label">{serverLabel}</div>}
              </div>
            )}
          </div>

          <div className="gi-team gi-team-2">
            {team2.map(p => (
              <PlayerCard key={p.battleTag} player={p} avatarUrls={avatarUrls} countries={countries} sessionData={sessionData} teamClass="team-1" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameFoundScreen;
