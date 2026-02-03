import React from "react";
import { Link } from "react-router-dom";
import "./GameTile.css";

import human from "../../icons/human.svg";
import orc from "../../icons/orc.svg";
import elf from "../../icons/elf.svg";
import undead from "../../icons/undead.svg";
import random from "../../icons/random.svg";

const raceMapping = { 8: undead, 0: random, 4: elf, 2: orc, 1: human };

const getMapImageUrl = (mapName) => {
  if (!mapName) return null;
  const cleanName = mapName.replace(/^\(\d\)/, "").replace(/ /g, "").replace(/'/g, "");
  return `/maps/${cleanName}.png`;
};

const formatDuration = (seconds) => {
  if (!seconds) return "--";
  const mins = Math.floor(seconds / 60);
  return `${mins}m`;
};

const formatTimeAgo = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString();
};

const getTeamAvgMmr = (team) => {
  if (!team?.players?.length) return 0;
  const total = team.players.reduce((sum, p) => sum + (p.currentMmr || p.oldMmr || 0), 0);
  return Math.round(total / team.players.length);
};

/**
 * GameTile - Compact game summary for browsing
 * Shows map, both teams in 2x2 grid, avg MMR, winner, duration
 */
const GameTile = ({ data }) => {
  if (!data?.match) return null;

  const match = data.match;
  const team1 = match.teams?.[0];
  const team2 = match.teams?.[1];

  if (!team1 || !team2) return null;

  const team1Won = team1.players?.[0]?.won;
  const team1Mmr = getTeamAvgMmr(team1);
  const team2Mmr = getTeamAvgMmr(team2);
  const mapUrl = getMapImageUrl(match.mapName);
  const cleanMapName = match.mapName?.replace(/^\(\d\)\s*/, "").replace(/v\d+.*$/, "") || "Unknown";
  const duration = formatDuration(match.durationInSeconds);
  const timeAgo = formatTimeAgo(match.endTime);

  return (
    <Link to={`/match/${match.id}`} className="game-tile">
      {/* Map thumbnail */}
      <div className="gt-map">
        {mapUrl && <img src={mapUrl} alt={cleanMapName} />}
      </div>

      {/* Team 1 */}
      <div className={`gt-team ${team1Won ? "gt-winner" : "gt-loser"}`}>
        {team1Won && <span className="gt-win-badge">W</span>}
        <div className="gt-players">
          {team1.players?.slice(0, 4).map((p, i) => (
            <div key={i} className="gt-player">
              <img src={raceMapping[p.race]} alt="" className="gt-race" />
              <span className="gt-name">{p.name}</span>
            </div>
          ))}
        </div>
        <div className="gt-mmr">{team1Mmr}</div>
      </div>

      {/* VS */}
      <div className="gt-vs">vs</div>

      {/* Team 2 */}
      <div className={`gt-team gt-team-right ${!team1Won ? "gt-winner" : "gt-loser"}`}>
        <div className="gt-mmr">{team2Mmr}</div>
        <div className="gt-players">
          {team2.players?.slice(0, 4).map((p, i) => (
            <div key={i} className="gt-player">
              <img src={raceMapping[p.race]} alt="" className="gt-race" />
              <span className="gt-name">{p.name}</span>
            </div>
          ))}
        </div>
        {!team1Won && <span className="gt-win-badge">W</span>}
      </div>

      {/* Meta */}
      <div className="gt-meta">
        <span className="gt-duration">{duration}</span>
        <span className="gt-time">{timeAgo}</span>
      </div>
    </Link>
  );
};

export default GameTile;
