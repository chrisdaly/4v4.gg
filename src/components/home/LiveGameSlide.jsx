import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CountryFlag, RaceIcon } from "../ui";
import FormDots from "../FormDots";
import { MmrComparison } from "../MmrComparison";
import { processOngoingGameData, detectArrangedTeams, buildATGroupIdMap } from "../../lib/utils";
import { enrichPlayerData } from "../../lib/gameDataUtils";
import { raceMapping } from "../../lib/constants";
import { getMapImageUrl, geometricMean } from "../../lib/formatters";
import { cache } from "../../lib/cache";

/**
 * One live game on the home page's live panel: Game.jsx's layout without
 * the stats table or per-player MMR. Team headers (TEAM 1 / 2 in team
 * colour, geometric-mean MMR, four race icons), the player cells (team 1
 * reversed, as in Game.jsx: 60px portrait, flag on the outer corner, race
 * on the inner one, gold name, form dots, a purple connector between AT
 * partners), the card MMR comparison between them and the map footer. The
 * whole slide links to /live.
 *
 * Player enrichment (portraits, countries, session form) goes through the
 * same cache key OngoingGame uses, so /live opens warm.
 *
 * Props: match (an ongoing match), active (the visible slide), now (a
 * timestamp the panel refreshes once a minute, for the elapsed time)
 */

const MATCH_CACHE_TTL = 2 * 60 * 1000;

const elapsedMinutes = (startTime, now) => {
  if (!startTime) return null;
  const mins = Math.floor((now - new Date(startTime).getTime()) / 60000);
  return mins >= 0 ? mins : null;
};

function PlayerCell({ player, side, profilePic, country, form, atRight }) {
  const name = player.name || player.battleTag?.split("#")[0] || "?";
  return (
    <div className={`hm-cell hm-cell-${side}`} data-player={player.battleTag}>
      <div className="hm-portrait">
        {profilePic ? (
          <img src={profilePic} alt="" className="hm-portrait-img" />
        ) : (
          <img src={raceMapping[player.race] || raceMapping[0]} alt="" className="hm-portrait-img hm-portrait-race" />
        )}
        {country && <CountryFlag name={country.toLowerCase()} className="hm-portrait-flag" />}
        <img src={raceMapping[player.rndRace ?? player.race] || raceMapping[0]} alt="" className="hm-portrait-race-badge" />
      </div>
      {atRight && <span className="hm-at-line" data-at-line aria-hidden="true" />}
      <span className="hm-cell-name">{name}</span>
      {form && form.length > 0 && (
        <div className="hm-cell-form">
          <FormDots form={form} size="small" maxDots={8} showSummary={false} />
        </div>
      )}
    </div>
  );
}

export default function LiveGameSlide({ match, active = false, now = Date.now() }) {
  const matchId = match?.id;
  const { playerData, metaData } = useMemo(() => processOngoingGameData(match), [match]);
  const cached = matchId ? cache.get(`matchPlayers:${matchId}`) : null;
  const [meta, setMeta] = useState(() => cached ? { profilePics: cached.profilePics, countries: cached.countries, sessions: cached.sessions } : null);
  const [atGroups, setAtGroups] = useState({});

  // Portraits, countries and session form for the eight players
  useEffect(() => {
    if (!matchId || cached) return undefined;
    let cancelled = false;
    enrichPlayerData(playerData, { fetchSessions: true, fetchTwitchStatus: false })
      .then((result) => {
        if (cancelled) return;
        setMeta({ profilePics: result.profilePics, countries: result.countries, sessions: result.sessions });
        cache.set(`matchPlayers:${matchId}`, {
          playerData,
          metaData,
          profilePics: result.profilePics,
          countries: result.countries,
          sessions: result.sessions,
        }, MATCH_CACHE_TTL);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // keyed on the match: player data never changes mid-game
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  // Arranged teams: purple connectors and the chart's sliced circles
  useEffect(() => {
    let cancelled = false;
    detectArrangedTeams(playerData).then((groups) => {
      if (!cancelled) setAtGroups(groups || {});
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  const atIds = useMemo(() => buildATGroupIdMap(atGroups), [atGroups]);
  const teamOne = playerData.slice(0, 4);
  const teamTwo = playerData.slice(4, 8);
  const displayOne = [...teamOne].reverse();
  const teamOneMmr = geometricMean(teamOne.map((p) => p.oldMmr || 0));
  const teamTwoMmr = geometricMean(teamTwo.map((p) => p.oldMmr || 0));
  const partners = (tag) => atGroups[tag?.toLowerCase()] || [];
  const isPartnerRight = (list, i) =>
    i < list.length - 1 && partners(list[i].battleTag).some((p) => p.toLowerCase() === list[i + 1].battleTag?.toLowerCase());
  const chartData = {
    teamOneMmrs: teamOne.map((p) => p.oldMmr || 0),
    teamTwoMmrs: teamTwo.map((p) => p.oldMmr || 0),
    teamOneAT: teamOne.map((p) => atIds[p.battleTag?.toLowerCase()] || 0),
    teamTwoAT: teamTwo.map((p) => atIds[p.battleTag?.toLowerCase()] || 0),
  };
  const mapName = (match.mapName || "").replace(/^\(\d\)\s*/, "");
  const mapImg = getMapImageUrl(match.mapName);
  const mins = elapsedMinutes(match.startTime, now);

  const cell = (p, side, list, i) => (
    <PlayerCell
      key={p.battleTag || i}
      player={p}
      side={side}
      profilePic={meta?.profilePics?.[p.battleTag]}
      country={meta?.countries?.[p.battleTag]}
      form={meta?.sessions?.[p.battleTag]?.form}
      atRight={isPartnerRight(list, i)}
    />
  );

  return (
    <Link
      to="/live"
      className={`hm-slide ${active ? "is-active" : ""}`}
      data-live-slide={matchId}
      data-active={active ? "true" : undefined}
      tabIndex={active ? 0 : -1}
      aria-hidden={active ? undefined : "true"}
    >
      <div className="hm-slide-heads">
        <div className="hm-team-head hm-team-head-a">
          <span className="hm-team-label">TEAM 1</span>
          <span className="hm-team-mmr">
            {teamOneMmr > 0 ? teamOneMmr.toLocaleString("en-US") : "–"} <small>MMR</small>
          </span>
          <div className="hm-team-races">
            {displayOne.map((p, i) => (
              <RaceIcon key={i} race={p.race} rndRace={p.rndRace} className="hm-team-race" />
            ))}
          </div>
        </div>
        <span className="hm-vs">VS</span>
        <div className="hm-team-head hm-team-head-b">
          <span className="hm-team-label">TEAM 2</span>
          <span className="hm-team-mmr">
            {teamTwoMmr > 0 ? teamTwoMmr.toLocaleString("en-US") : "–"} <small>MMR</small>
          </span>
          <div className="hm-team-races">
            {teamTwo.map((p, i) => (
              <RaceIcon key={i} race={p.race} rndRace={p.rndRace} className="hm-team-race" />
            ))}
          </div>
        </div>
      </div>
      <div className="hm-slide-body">
        <div className="hm-cells hm-cells-a" data-team="a">
          {displayOne.map((p, i) => cell(p, "a", displayOne, i))}
        </div>
        <div className="hm-chart" data-mmr-chart key={active ? "on" : "off"}>
          <MmrComparison data={chartData} variant="card" hideVs />
        </div>
        <div className="hm-cells hm-cells-b" data-team="b">
          {teamTwo.map((p, i) => cell(p, "b", teamTwo, i))}
        </div>
      </div>
      <div className="hm-slide-foot">
        {mapImg && <img src={mapImg} alt="" className="hm-map-thumb" onError={(e) => { e.target.style.display = "none"; }} />}
        <div className="hm-map-meta">
          <span className="hm-map-name">{mapName}</span>
          <span className="hm-map-mins">
            {mins != null ? `${mins} mins` : "live"}
            <span className="live-dot hm-live-dot" />
          </span>
        </div>
      </div>
    </Link>
  );
}
