import React from "react";
import { Link } from "react-router-dom";
import "./GameRow.css";

import human from "../../icons/human.svg";
import orc from "../../icons/orc.svg";
import elf from "../../icons/elf.svg";
import undead from "../../icons/undead.svg";
import random from "../../icons/random.svg";

const raceMapping = { 8: undead, 0: random, 4: elf, 2: orc, 1: human };

// Format duration from seconds
const formatDuration = (seconds) => {
  if (!seconds) return "--";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

// Format time ago
const formatTimeAgo = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

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
  if (!game) return null;

  const match = game.match || game;
  const battleTagLower = playerBattleTag?.toLowerCase();

  // Find player in teams
  let playerData = null;
  let allies = [];

  for (const team of match.teams || []) {
    const player = team.players?.find(
      (p) => p.battleTag?.toLowerCase() === battleTagLower
    );
    if (player) {
      playerData = player;
      allies = team.players.filter(
        (p) => p.battleTag?.toLowerCase() !== battleTagLower
      );
      break;
    }
  }

  if (!playerData) return null;

  const won = playerData.won === true || playerData.won === 1;
  const mmrChange = (playerData.currentMmr || 0) - (playerData.oldMmr || 0);
  const cleanMapName = match.mapName?.replace(/^\(\d\)\s*/, "") || "Unknown";
  const duration = formatDuration(match.durationInSeconds);
  const timeAgo = formatTimeAgo(match.endTime);

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
        <span className="gr-map-name">{cleanMapName}</span>
      </div>
      <div className="gr-col gr-mmr">
        <span className={`gr-mmr-change ${mmrChange >= 0 ? "positive" : "negative"}`}>
          {mmrChange >= 0 ? "+" : ""}
          {mmrChange}
        </span>
      </div>
      {showAllies && (
        <div className="gr-col gr-allies">
          <div className="gr-allies-list">
            {allies.slice(0, 3).map((ally, i) => (
              <div key={i} className="gr-ally">
                <img src={raceMapping[ally.race]} alt="" className="gr-race" />
                <span className="gr-ally-name">{ally.name}</span>
              </div>
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
