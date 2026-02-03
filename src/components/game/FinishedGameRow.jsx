import React from "react";
import { Link } from "react-router-dom";
import "./FinishedGameRow.css";

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

// Format time with timezone
const formatTime = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const tz = date.toLocaleTimeString([], { timeZoneName: "short" }).split(" ").pop();
  return `${timeStr} ${tz}`;
};

// Calculate team average MMR
const getTeamAvgMmr = (team) => {
  if (!team?.players?.length) return 0;
  const total = team.players.reduce((sum, p) => sum + (p.currentMmr || p.oldMmr || 0), 0);
  return Math.round(total / team.players.length);
};

/**
 * FinishedGameRow - Compact table row for finished games list
 * Shows both teams, MMR comparison, and game info
 */
const FinishedGameRow = ({ data, striped = false }) => {
  if (!data?.match) return null;

  const match = data.match;
  const team1 = match.teams?.[0];
  const team2 = match.teams?.[1];

  if (!team1 || !team2) return null;

  const team1Won = team1.players?.[0]?.won;
  const team1Mmr = getTeamAvgMmr(team1);
  const team2Mmr = getTeamAvgMmr(team2);
  const totalMmr = team1Mmr + team2Mmr;
  const team1Pct = totalMmr > 0 ? (team1Mmr / totalMmr) * 100 : 50;

  const duration = formatDuration(match.durationInSeconds);
  const timeStr = formatTime(match.startTime);
  const cleanMapName = match.mapName?.replace(/^\(\d\)\s*/, "").replace(/v\d+(_\d+)?$/, "") || "Unknown";

  const classNames = ["fgr", striped && "fgr-striped"].filter(Boolean).join(" ");

  return (
    <Link to={`/match/${match.id}`} className={classNames}>
      {/* Time */}
      <div className="fgr-col fgr-time">{timeStr}</div>

      {/* Map */}
      <div className="fgr-col fgr-map">{cleanMapName}</div>

      {/* Duration */}
      <div className="fgr-col fgr-duration">{duration}</div>

      {/* Team 1 */}
      <div className={`fgr-col fgr-team fgr-team1 ${team1Won ? "fgr-winner" : "fgr-loser"}`}>
        <div className="fgr-players">
          {team1.players?.slice(0, 4).map((p, i) => (
            <div key={i} className="fgr-player">
              <img src={raceMapping[p.race]} alt="" className="fgr-race" />
              <span className="fgr-name">{p.name}</span>
            </div>
          ))}
        </div>
        {team1Won && <span className="fgr-win-badge">W</span>}
      </div>

      {/* MMR Bar */}
      <div className="fgr-col fgr-mmr-col">
        <div className="fgr-mmr-bar">
          <div
            className={`fgr-mmr-fill fgr-mmr-team1 ${team1Won ? "winner" : ""}`}
            style={{ width: `${team1Pct}%` }}
          />
          <div
            className={`fgr-mmr-fill fgr-mmr-team2 ${!team1Won ? "winner" : ""}`}
            style={{ width: `${100 - team1Pct}%` }}
          />
        </div>
        <div className="fgr-mmr-values">
          <span className={team1Won ? "winner" : ""}>{team1Mmr}</span>
          <span className="fgr-mmr-vs">vs</span>
          <span className={!team1Won ? "winner" : ""}>{team2Mmr}</span>
        </div>
      </div>

      {/* Team 2 */}
      <div className={`fgr-col fgr-team fgr-team2 ${!team1Won ? "fgr-winner" : "fgr-loser"}`}>
        {!team1Won && <span className="fgr-win-badge">W</span>}
        <div className="fgr-players">
          {team2.players?.slice(0, 4).map((p, i) => (
            <div key={i} className="fgr-player">
              <img src={raceMapping[p.race]} alt="" className="fgr-race" />
              <span className="fgr-name">{p.name}</span>
            </div>
          ))}
        </div>
      </div>
    </Link>
  );
};

export default FinishedGameRow;
