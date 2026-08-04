import React, { useState, useEffect } from "react";
import { raceMapping } from "../lib/constants";
import { CountryFlag } from "./ui";
import { MmrComparison } from "./MmrComparison";

const getMapImageName = (mapName) => {
  if (!mapName) return null;
  return mapName.replace(/^\(\d+\)\s*/, "").replace(/\s+/g, "").replace(/'/g, "");
};

const PlayerCard = ({ player, avatarUrls, countries, sessionData, flipped }) => {
  const avatarUrl = avatarUrls[player.battleTag];
  const country = countries[player.battleTag];
  const session = sessionData[player.battleTag];
  const mmr = player.currentMmr || player.oldMmr || 0;

  const avatar = (
    <div className="gi-avatar-wrap">
      <img
        src={avatarUrl || raceMapping[player.race]}
        alt=""
        className={`gi-avatar${avatarUrl ? "" : " gi-avatar-race"}`}
        onError={e => { e.target.src = raceMapping[player.race]; }}
      />
      {avatarUrl && <img src={raceMapping[player.race]} alt="" className="gi-race-badge" />}
    </div>
  );

  const info = (
    <div className={`gi-player-info${flipped ? " gi-player-info-r" : ""}`}>
      <div className={`gi-player-top${flipped ? " gi-player-top-r" : ""}`}>
        <span className="gi-name">{player.name}</span>
        {country && <CountryFlag name={country.toLowerCase()} className="gi-flag" />}
      </div>
      <div className={`gi-player-stats${flipped ? " gi-player-stats-r" : ""}`}>
        <span className="gi-mmr">{mmr.toLocaleString()}</span>
      </div>
      {session?.recentGames?.length > 0 && (
        <div className="gi-dots">
          {session.recentGames.slice(0, 5).map((won, i, arr) => (
            <span key={i} className={`gi-dot ${won ? "win" : "loss"}${i === arr.length - 1 ? " latest" : ""}`} />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className={`gi-player${flipped ? " gi-player-flip" : ""}`}>
      {avatar}{info}
    </div>
  );
};

// ── Center layout variants ───────────────────────────────────────────────────

// Shared chart props for all variants
const ChartBlock = ({ team1, team2, height = 200 }) => (
  <div className="gi-chart-wrap" style={{ height }}>
    <MmrComparison
      data={{
        teamOneMmrs: team1.map(p => p.currentMmr || p.oldMmr || 0),
        teamTwoMmrs: team2.map(p => p.currentMmr || p.oldMmr || 0),
        teamOneAT: [],
        teamTwoAT: [],
      }}
      variant="scorecard"
      localScale
    />
  </div>
);

const MapThumb = ({ mapImageUrl, mapName, size = 160 }) =>
  mapImageUrl ? (
    <img
      src={mapImageUrl}
      alt={mapName}
      className="gi-map-img"
      style={{ width: size, height: size }}
      onError={e => { e.target.style.display = "none"; }}
    />
  ) : null;

const AvgMmrRow = ({ team1Mmr, team2Mmr }) => (
  <div className="gi-avg-row">
    <span className="gi-avg-num gi-avg-blue">{team1Mmr.toLocaleString()}</span>
    <span className="gi-avg-sep">avg</span>
    <span className="gi-avg-num gi-avg-red">{team2Mmr.toLocaleString()}</span>
  </div>
);

// Option A — chart is the hero, map thumbnail below
const CenterChart = ({ team1, team2, mapImageUrl, mapName, team1Mmr, team2Mmr }) => (
  <>
    <ChartBlock team1={team1} team2={team2} height={230} />
    <AvgMmrRow team1Mmr={team1Mmr} team2Mmr={team2Mmr} />
    <MapThumb mapImageUrl={mapImageUrl} mapName={mapName} size={80} />
  </>
);

// Option B — map is the hero, chart below
const CenterMap = ({ team1, team2, mapImageUrl, mapName, team1Mmr, team2Mmr }) => (
  <>
    <MapThumb mapImageUrl={mapImageUrl} mapName={mapName} size={180} />
    <AvgMmrRow team1Mmr={team1Mmr} team2Mmr={team2Mmr} />
    <ChartBlock team1={team1} team2={team2} height={120} />
  </>
);

// Option C — equal split: chart on top, map on bottom, no avg MMR text
const CenterSplit = ({ team1, team2, mapImageUrl, mapName }) => (
  <>
    <ChartBlock team1={team1} team2={team2} height={160} />
    <MapThumb mapImageUrl={mapImageUrl} mapName={mapName} size={140} />
  </>
);

// Option D — pure chart only, no map image
const CenterPure = ({ team1, team2, team1Mmr, team2Mmr }) => (
  <>
    <ChartBlock team1={team1} team2={team2} height={280} />
    <AvgMmrRow team1Mmr={team1Mmr} team2Mmr={team2Mmr} />
  </>
);

const CENTER_VARIANTS = { chart: CenterChart, map: CenterMap, split: CenterSplit, pure: CenterPure };

// ── Main component ───────────────────────────────────────────────────────────

const GameIntroScreen = ({
  matchData,
  avatarUrls = {},
  countries = {},
  sessionData = {},
  playerStats = {},
  matchStyle = "default",
  dismissing = false,
}) => {
  const [showCards, setShowCards] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowCards(true), 1800);
    return () => clearTimeout(t);
  }, []);

  if (!matchData?.teams || matchData.teams.length < 2) return null;

  const team1 = matchData.teams[0]?.players || [];
  const team2 = matchData.teams[1]?.players || [];

  const avgMmr = (players) =>
    Math.round(players.reduce((s, p) => s + (p.currentMmr || p.oldMmr || 0), 0) / Math.max(1, players.length));

  const team1Mmr = avgMmr(team1);
  const team2Mmr = avgMmr(team2);

  const mapName = matchData.mapName || matchData.map || "";
  const mapImageName = getMapImageName(mapName);
  const mapImageUrl = mapImageName ? `/maps/${mapImageName}.png` : null;

  const splashParam = new URLSearchParams(window.location.search).get("splash") || "chart";
  const CenterLayout = CENTER_VARIANTS[splashParam] || CenterChart;

  return (
    <div className={`gi-screen ${dismissing ? "gi-out" : "gi-in"}`}>
      {!showCards && (
        <div className="gi-found go-fade-in">GAME FOUND</div>
      )}

      {showCards && (
        <>
          {mapName && <div className="gi-map-name-top go-fade-in">{mapName}</div>}
          <div className="gi-body go-fade-in">
            <div className="gi-team gi-team-1">
              {team1.map(p => (
                <PlayerCard key={p.battleTag} player={p} avatarUrls={avatarUrls}
                  countries={countries} sessionData={sessionData} flipped />
              ))}
            </div>

            <div className="gi-center">
              <CenterLayout
                team1={team1} team2={team2}
                mapImageUrl={mapImageUrl} mapName={mapName}
                team1Mmr={team1Mmr} team2Mmr={team2Mmr}
              />
            </div>

            <div className="gi-team gi-team-2">
              {team2.map(p => (
                <PlayerCard key={p.battleTag} player={p} avatarUrls={avatarUrls}
                  countries={countries} sessionData={sessionData} flipped={false} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default GameIntroScreen;
