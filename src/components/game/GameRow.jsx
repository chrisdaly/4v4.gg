import React from "react";
import { Link, useHistory } from "react-router-dom";
import "./GameRow.css";

import { raceMapping } from "../../lib/constants";
import { getMapImageUrl, formatDuration, formatTimeAgo } from "../../lib/formatters";

/**
 * GameRow - Table row format for match history
 *
 * @param {Object} game - Match data object
 * @param {string} playerBattleTag - Highlight this player and extract their data
 * @param {boolean} showAllies - Show allies column (default: true)
 * @param {string} linkTo - URL for click navigation (default: /match/{id})
 * @param {boolean} striped - Alternate row styling
 * @param {string} className - Additional CSS class
 */
const GameRow = ({
  game,
  playerBattleTag,
  showAllies = true,
  linkTo,
  striped = false,
  className = "",
}) => {
  const history = useHistory();

  if (!game) return null;

  const match = game.match || game;
  const battleTagLower = playerBattleTag?.toLowerCase();

  // Find player in teams
  let playerData = null;
  let allies = [];
  let opponents = [];

  for (const team of match.teams || []) {
    const player = team.players?.find(
      (p) => p.battleTag?.toLowerCase() === battleTagLower
    );
    if (player) {
      playerData = player;
      allies = team.players.filter(
        (p) => p.battleTag?.toLowerCase() !== battleTagLower
      );
    } else {
      opponents = team.players || [];
    }
  }

  if (!playerData) return null;

  const won = playerData.won === true || playerData.won === 1;
  const mmrChange = (playerData.currentMmr || 0) - (playerData.oldMmr || 0);
  const cleanMapName = match.mapName?.replace(/^\(\d\)\s*/, "") || "Unknown";
  const mapUrl = getMapImageUrl(match.mapName);
  const duration = formatDuration(match.durationInSeconds);
  const timeAgo = formatTimeAgo(match.endTime);

  // Calculate average MMR across all players in the game
  const allPlayers = (match.teams || []).flatMap((t) => t.players || []);
  const avgMmr = allPlayers.length > 0
    ? Math.round(allPlayers.reduce((sum, p) => sum + (p.oldMmr || 0), 0) / allPlayers.length)
    : null;

  const matchId = match.id || game.id;
  const href = linkTo || (matchId ? `/match/${matchId}` : null);

  const classNames = [
    "game-row",
    won ? "gr-won" : "gr-lost",
    striped && "gr-striped",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      <div className="gr-col gr-result">
        <span className={`gr-badge ${won ? "gr-badge-won" : "gr-badge-lost"}`}>
          {won ? "W" : "L"}
        </span>
      </div>
      <div className="gr-col gr-map">
        {mapUrl && (
          <img src={mapUrl} alt={cleanMapName} className="gr-map-img" />
        )}
        <span className="gr-map-name">{cleanMapName}</span>
      </div>
      <div className="gr-col gr-avg-mmr">
        {avgMmr && <span className="gr-avg-mmr-value">{avgMmr}</span>}
      </div>
      <div className="gr-col gr-mmr">
        <span className={`gr-mmr-change ${mmrChange >= 0 ? "positive" : "negative"}`}>
          {mmrChange >= 0 ? "+" : ""}
          {mmrChange}
        </span>
      </div>
      {showAllies && (
        <div className="gr-col gr-allies">
          <div className="gr-players-list">
            {allies.slice(0, 3).map((ally, i) => (
              <span
                key={i}
                className="gr-player"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  history.push(`/player/${encodeURIComponent(ally.battleTag)}`);
                }}
              >
                <img src={raceMapping[ally.race]} alt="" className="gr-race" />
                <span className="gr-player-name">{ally.name}</span>
              </span>
            ))}
          </div>
        </div>
      )}
      {showAllies && (
        <div className="gr-col gr-opponents">
          <div className="gr-players-list">
            {opponents.slice(0, 4).map((opp, i) => (
              <span
                key={i}
                className="gr-player"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  history.push(`/player/${encodeURIComponent(opp.battleTag)}`);
                }}
              >
                <img src={raceMapping[opp.race]} alt="" className="gr-race" />
                <span className="gr-player-name">{opp.name}</span>
              </span>
            ))}
          </div>
        </div>
      )}
      <div className="gr-col gr-duration">{duration}</div>
      <div className="gr-col gr-time">{timeAgo}</div>
    </>
  );

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
