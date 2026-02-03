import React from "react";
import { Link } from "react-router-dom";
import { Sparklines, SparklinesLine } from "react-sparklines";
import { GiCrossedSwords } from "react-icons/gi";
import { FaTwitch } from "react-icons/fa";

import human from "./icons/human.svg";
import orc from "./icons/orc.svg";
import elf from "./icons/elf.svg";
import undead from "./icons/undead.svg";
import random from "./icons/random.svg";

const raceMapping = {
  8: undead,
  0: random,
  4: elf,
  2: orc,
  1: human,
};

const LadderRow = ({ rank, sparklineData, session, detectedRace, twitch, isStreaming, streamInfo, isLive, isEven }) => {
  const { name, mmr, wins, losses, winrate, race: playerRace } = rank.player || {};
  const battleTag = rank.playersInfo?.[0]?.battleTag || rank.player?.playerIds?.[0]?.battleTag || "";
  // Use detected race from sparkline data (most accurate), then player.race, then calculatedRace
  const race = detectedRace ?? playerRace ?? rank.playersInfo?.[0]?.calculatedRace;
  const raceIcon = raceMapping[race];
  const rankNumber = rank.rankNumber;

  const winratePercent = winrate ? Math.round(winrate * 10000) / 100 : 0;
  const encodedBattleTag = battleTag.replace("#", "%23");

  // Session form dots (win/loss indicators)
  const formDots = session?.form?.length > 0 ? (
    <div className="form-dots small">
      {session.form.map((won, idx) => (
        <span
          key={idx}
          className={`form-dot ${won ? "win" : "loss"} ${idx === session.form.length - 1 ? "latest" : ""}`}
        />
      ))}
    </div>
  ) : null;

  // Session display
  const sessionDisplay = session ? (
    <>
      <span className="session-record">
        <span className="wins">{session.wins}</span>
        <span className="record-separator">-</span>
        <span className="losses">{session.losses}</span>
      </span>
      <span className={`session-mmr ${session.mmrChange >= 0 ? "positive" : "negative"}`}>
        {session.mmrChange >= 0 ? "+" : ""}{session.mmrChange}
      </span>
    </>
  ) : (
    <span className="session-none">-</span>
  );

  return (
    <div className={`ladder-row ${isLive ? "is-live" : ""} ${isEven ? "even" : "odd"}`}>
      <div className="col-rank">
        {isLive ? <GiCrossedSwords className="in-game-icon" /> : <span className="in-game-placeholder" />}
        <span className="rank-number">{rankNumber}</span>
      </div>
      <div className="col-player">
        <img src={raceIcon} alt="" className="player-race-icon" />
        <Link to={`/player/${encodedBattleTag}`} className="player-name-link">
          {name}
        </Link>
        {twitch && isStreaming && (
          <a
            href={`https://twitch.tv/${twitch}`}
            target="_blank"
            rel="noopener noreferrer"
            className="twitch-link"
            title={`${streamInfo?.title || "Streaming"} (${streamInfo?.viewerCount || 0} viewers)`}
          >
            <FaTwitch className="twitch-icon" />
          </a>
        )}
      </div>
      <div className="col-mmr">
        <span className="mmr-value">{mmr}</span>
      </div>
      <div className="col-record">
        <span className="wins">{wins}</span>
        <span className="record-separator">-</span>
        <span className="losses">{losses}</span>
      </div>
      <div className="col-winrate">
        <span className={winratePercent >= 50 ? "winrate-positive" : "winrate-negative"}>
          {winratePercent.toFixed(1)}%
        </span>
      </div>
      <div className="col-session">
        <div className="session-stats">
          {sessionDisplay}
        </div>
        {formDots}
      </div>
      <div className="col-form">
        {sparklineData.length > 0 ? (
          <Sparklines data={sparklineData.slice(-50)} width={120} height={24}>
            <SparklinesLine
              style={{ strokeWidth: 1.5, stroke: "var(--gold)", fill: "none" }}
            />
          </Sparklines>
        ) : (
          <div className="sparkline-placeholder" />
        )}
      </div>
    </div>
  );
};

export default LadderRow;
