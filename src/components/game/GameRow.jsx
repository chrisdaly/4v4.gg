import React from "react";
import { Link, useHistory } from "react-router-dom";
import "./GameRow.css";

import { RaceIcon } from "../ui";
import { getMapImageUrl, formatDuration, formatTimeAgo } from "../../lib/formatters";

const HERO_SLOTS = 3;

/**
 * GameRow - one match in the player profile's history, as a fixture list:
 *
 *   result + map + your heroes | your team ▸ | avg vs avg | ◂ opponents | +/-
 *
 * Both sides are sorted highest MMR first, and every player carries their MMR
 * under their name, so the ordering is visible instead of implied - no tooltip
 * needed to see who the strongest player in the lobby was. The two teams read
 * apart from position, each leaning into the centre divider, rather than from
 * two different text colours. The profile player is the one gold name.
 *
 * @param {Object} game - Match data object
 * @param {string} playerBattleTag - The profile player: their heroes, result and gold slot
 * @param {string} linkTo - URL for click navigation (default: /match/{id})
 * @param {boolean} striped - Alternate row styling
 * @param {string} className - Additional CSS class
 */
const GameRow = ({ game, playerBattleTag, linkTo, striped = false, className = "" }) => {
  const history = useHistory();

  if (!game) return null;

  const match = game.match || game;
  const battleTagLower = playerBattleTag?.toLowerCase();

  let playerData = null;
  let allies = [];
  let opponents = [];

  for (const team of match.teams || []) {
    const player = team.players?.find((p) => p.battleTag?.toLowerCase() === battleTagLower);
    if (player) {
      playerData = player;
      allies = team.players
        .filter((p) => p.battleTag?.toLowerCase() !== battleTagLower)
        .sort((a, b) => (b.oldMmr || 0) - (a.oldMmr || 0));
    } else {
      opponents = [...(team.players || [])].sort((a, b) => (b.oldMmr || 0) - (a.oldMmr || 0));
    }
  }

  if (!playerData) return null;

  // Highest MMR first, so a slot's position is the player's standing in the lineup
  const teamMembers = [playerData, ...allies].sort((a, b) => (b.oldMmr || 0) - (a.oldMmr || 0));
  const seat = teamMembers.findIndex((p) => p.battleTag?.toLowerCase() === battleTagLower) + 1;
  const ordinal = ["", "1st", "2nd", "3rd", "4th"][seat] || `${seat}th`;

  const won = playerData.won === true || playerData.won === 1;
  const mmrChange = (playerData.currentMmr || 0) - (playerData.oldMmr || 0);
  const cleanMapName = match.mapName?.replace(/^\(\d\)\s*/, "") || "Unknown";
  const mapUrl = getMapImageUrl(match.mapName);
  const heroes = (playerData.heroes || []).filter((h) => h?.icon).slice(0, HERO_SLOTS);

  // Skip players the API gave no MMR for, or one zero drags the average
  // hundreds of points below the lobby it is meant to describe
  const teamAvg = (ps) => {
    const rated = ps.filter((p) => p.oldMmr > 0);
    return rated.length
      ? Math.round(rated.reduce((sum, p) => sum + p.oldMmr, 0) / rated.length)
      : null;
  };
  const myAvg = teamAvg(teamMembers);
  const theirAvg = teamAvg(opponents);

  const matchId = match.id || game.id;
  const href = linkTo || (matchId ? `/match/${matchId}` : null);

  const goTo = (tag) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    history.push(`/player/${encodeURIComponent(tag)}`);
  };

  // Name over MMR, both sides. The only difference is which way the race icon
  // sits, so each side leans into the centre divider.
  const chip = (p, i, mine) => {
    const isSelf = p.battleTag?.toLowerCase() === battleTagLower;
    const icon = <RaceIcon race={p.race} rndRace={p.rndRace} className="gr-race" />;
    const stack = (
      <span className="gr-p-stack">
        <span className="gr-p-name">{p.name}</span>
        <span className="gr-p-mmr">{p.oldMmr > 0 ? p.oldMmr.toLocaleString("en-US") : "–"}</span>
      </span>
    );
    return (
      <span
        key={i}
        className={`gr-p${isSelf ? " gr-p--self" : ""}`}
        title={isSelf ? `${p.name} · ${ordinal} highest on the team` : p.name}
        data-self-seat={isSelf ? seat : undefined}
        onClick={isSelf ? undefined : goTo(p.battleTag)}
      >
        {mine ? <>{stack}{icon}</> : <>{icon}{stack}</>}
      </span>
    );
  };

  const content = (
    <>
      <div className="gr-col gr-game">
        <span className={`gr-result ${won ? "gr-result--won" : "gr-result--lost"}`}>
          {won ? "W" : "L"}
        </span>
        {mapUrl && <img src={mapUrl} alt="" className="gr-map-img" />}
        <span className="gr-game-meta">
          <span className="gr-map-name">{cleanMapName}</span>
          <span className="gr-game-sub">
            {formatDuration(match.durationInSeconds)} · {formatTimeAgo(match.endTime)}
          </span>
        </span>
        <span className="gr-heroes" data-heroes={heroes.length}>
          {Array.from({ length: HERO_SLOTS }, (_, i) => {
            const h = heroes[i];
            if (!h) return <span key={i} className="gr-hero gr-hero--empty" />;
            return (
              <img
                key={i}
                src={`/heroes/${h.icon}.jpeg`}
                alt={h.name}
                title={`${h.name}${h.level ? ` · level ${h.level}` : ""}`}
                className="gr-hero"
                loading="lazy"
                onError={(e) => { e.target.style.visibility = "hidden"; }}
              />
            );
          })}
        </span>
      </div>

      <div className="gr-col gr-side gr-side--mine" data-team="ally">
        {teamMembers.slice(0, 4).map((p, i) => chip(p, i, true))}
      </div>

      <div className="gr-col gr-mid">
        <span className="gr-avg gr-avg--mine" title="Your team's average MMR">{myAvg ?? "–"}</span>
        <span className="gr-vs">vs</span>
        <span className="gr-avg gr-avg--theirs" title="Opponents' average MMR">{theirAvg ?? "–"}</span>
      </div>

      <div className="gr-col gr-side gr-side--theirs" data-team="opponent">
        {opponents.slice(0, 4).map((p, i) => chip(p, i, false))}
      </div>

      <div className="gr-col gr-score">
        <span className={`gr-mmr-change ${mmrChange >= 0 ? "positive" : "negative"}`}>
          {mmrChange >= 0 ? "+" : ""}
          {mmrChange}
        </span>
      </div>
    </>
  );

  const classNames = ["game-row", won ? "gr-won" : "gr-lost", striped && "gr-striped", className]
    .filter(Boolean)
    .join(" ");

  if (href) {
    return (
      <Link to={href} className={classNames}>
        {content}
      </Link>
    );
  }

  return <div className={classNames}>{content}</div>;
};

export default GameRow;
