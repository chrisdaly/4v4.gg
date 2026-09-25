import React from "react";
import { Link, useHistory } from "react-router-dom";
import "./GameRow.css";

import { RaceIcon, ResultBadge } from "../ui";
import { getMapImageUrl, formatDuration, formatTimeAgo } from "../../lib/formatters";

const HERO_SLOTS = 3;

/**
 * GameRow - one match in the player profile's history, in five zones:
 *
 *   result | map + length/when | the heroes you fielded | both teams | MMR
 *
 * Each team is listed highest MMR first, so a player's slot shows where
 * they sat in their own lineup; the profile player is that gold MMR chip
 * rather than a repeated name. Opponents follow a dim "vs" in grey so the
 * two sides read apart at a glance.
 *
 * @param {Object} game - Match data object
 * @param {string} playerBattleTag - The profile player: their heroes, MMR and result
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

  const allPlayers = (match.teams || []).flatMap((t) => t.players || []);
  const avgMmr = allPlayers.length > 0
    ? Math.round(allPlayers.reduce((sum, p) => sum + (p.oldMmr || 0), 0) / allPlayers.length)
    : null;

  const matchId = match.id || game.id;
  const href = linkTo || (matchId ? `/match/${matchId}` : null);

  const goTo = (tag) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    history.push(`/player/${encodeURIComponent(tag)}`);
  };

  const chip = (p, i, opponent = false) => {
    const isSelf = p.battleTag?.toLowerCase() === battleTagLower;
    if (isSelf) {
      return (
        <span
          key={i}
          className="gr-player gr-player-self"
          title={`${p.name} · ${p.oldMmr || "?"} MMR · ${ordinal} highest on the team`}
          data-self-seat={seat}
        >
          <RaceIcon race={p.race} rndRace={p.rndRace} className="gr-race" />
          <span className="gr-self-mmr">{p.oldMmr ? p.oldMmr.toLocaleString("en-US") : "–"}</span>
        </span>
      );
    }
    return (
      <span key={i} className="gr-player" title={`${p.name} · ${p.oldMmr || "?"} MMR`} onClick={goTo(p.battleTag)}>
        <RaceIcon race={p.race} rndRace={p.rndRace} className="gr-race" />
        <span className={`gr-player-name${opponent ? " gr-player-name--opp" : ""}`}>{p.name}</span>
      </span>
    );
  };

  const content = (
    <>
      <div className="gr-col gr-result">
        <ResultBadge $square $won={won} $lost={!won}>
          {won ? "W" : "L"}
        </ResultBadge>
      </div>

      <div className="gr-col gr-game">
        {mapUrl && <img src={mapUrl} alt="" className="gr-map-img" />}
        <span className="gr-game-meta">
          <span className="gr-map-name">{cleanMapName}</span>
          <span className="gr-game-sub">
            {formatDuration(match.durationInSeconds)} · {formatTimeAgo(match.endTime)}
          </span>
        </span>
      </div>

      <div className="gr-col gr-heroes" data-heroes={heroes.length}>
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
      </div>

      <div className="gr-col gr-players">
        <span className="gr-team" data-team="ally">
          {teamMembers.slice(0, 4).map((p, i) => chip(p, i))}
        </span>
        <span className="gr-team gr-team--opp" data-team="opponent">
          <span className="gr-vs">vs</span>
          {opponents.slice(0, 4).map((p, i) => chip(p, i, true))}
        </span>
      </div>

      <div className="gr-col gr-score">
        <span className={`gr-mmr-change ${mmrChange >= 0 ? "positive" : "negative"}`}>
          {mmrChange >= 0 ? "+" : ""}
          {mmrChange}
        </span>
        {avgMmr && <span className="gr-avg-mmr-value">{avgMmr.toLocaleString("en-US")} avg</span>}
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
