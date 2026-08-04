import React, { useState, useEffect, useMemo } from "react";
import { preprocessPlayerScores } from "../lib/utils";
import Game from "./Game";

const fmtDuration = (secs) => {
  if (!secs) return null;
  const m = Math.floor(secs / 60);
  const s = String(secs % 60).padStart(2, "0");
  return `${m}:${s}`;
};

// ── Phase 1: Announcement ─────────────────────────────────────────────────────

const Announcement = ({ won, duration, mmrGain, sessionForm }) => (
  <div className="go-announcement go-fade-in">
    <div className={`go-verdict-frame ${won ? "go-verdict-frame-win" : "go-verdict-frame-loss"}`}>
      <span className="go-deco-line" />
      <span className={`go-verdict ${won ? "go-verdict-win" : "go-verdict-loss"}`}>
        {won ? "VICTORY" : "DEFEAT"}
      </span>
      <span className="go-deco-line" />
    </div>

    {mmrGain !== null && mmrGain !== undefined && (
      <div className={`go-mmr-gain ${mmrGain >= 0 ? "win" : "loss"}`}>
        {mmrGain > 0 ? "+" : ""}{mmrGain} MMR
      </div>
    )}

    {sessionForm?.length > 0 && (
      <div className="go-session-dots">
        {sessionForm.map((w, i, arr) => (
          <span
            key={i}
            className={`go-sdot ${w ? "win" : "loss"}${i === arr.length - 1 ? " go-sdot-new" : ""}`}
          />
        ))}
      </div>
    )}

    {duration && (
      <div className="go-announcement-sub">
        <span className="go-duration">{duration}</span>
      </div>
    )}
  </div>
);

// ── Phase 2: Full match scorecard ─────────────────────────────────────────────

const Scoreboard = ({ processedPlayerData, processedMetaData, avatarUrls, countries, adaptedSessionData, streamerTag }) => (
  <div className="go-game-wrap go-fade-in">
    <Game
      playerData={processedPlayerData}
      metaData={processedMetaData}
      profilePics={avatarUrls}
      playerCountries={countries}
      sessionData={adaptedSessionData}
      streamerTag={streamerTag}
    />
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────

const GameOutroScreen = ({
  matchData,
  avatarUrls = {},
  countries = {},
  sessionData = {},
  matchStyle = "default",
  dismissing = false,
  streamerTag = "",
}) => {
  const [showScoreboard, setShowScoreboard] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowScoreboard(true), 4000);
    return () => clearTimeout(t);
  }, []);

  // Process raw API data into Game-compatible format (percentiles, efficiency stats, etc.)
  const { processedPlayerData, processedMetaData } = useMemo(() => {
    if (!matchData?.match || !matchData?.playerScores?.length) return {};
    try {
      const { playerData, metaData } = preprocessPlayerScores(matchData.match, matchData.playerScores);
      return { processedPlayerData: playerData, processedMetaData: metaData };
    } catch (e) {
      console.error("[outro] preprocessPlayerScores failed:", e);
      return {};
    }
  }, [matchData]);

  // MatchOverlayPage stores { recentGames, wins, losses }
  // Game component expects { form, mmrChange }
  const adaptedSessionData = useMemo(() => (
    Object.fromEntries(
      Object.entries(sessionData).map(([tag, s]) => [tag, {
        form: s.recentGames || s.form || [],
        mmrChange: s.mmrChange || 0,
      }])
    )
  ), [sessionData]);

  if (!matchData?.match?.teams) return null;

  const allPlayers = matchData.match.teams.flatMap(t => t.players);
  const streamerPlayer = allPlayers.find(p => p.battleTag === streamerTag);
  const streamerWon = streamerPlayer?.won ?? matchData.match.teams[0].players.some(p => p.won);

  // MMR gain: use mmrGain field, or derive from currentMmr - oldMmr
  const mmrGain = streamerPlayer
    ? (streamerPlayer.mmrGain ?? (
        streamerPlayer.currentMmr != null && streamerPlayer.oldMmr != null
          ? streamerPlayer.currentMmr - streamerPlayer.oldMmr
          : null
      ))
    : null;

  // Session strip: existing form + this game's result as the newest dot
  const existingForm = sessionData[streamerTag]?.recentGames || sessionData[streamerTag]?.form || [];
  const sessionForm = [...existingForm, streamerWon].slice(-6);

  const duration = fmtDuration(matchData.match.durationInSeconds);

  return (
    <div className={`go-screen ${streamerWon ? "go-win" : "go-loss"} ${dismissing ? "gi-out" : "gi-in"}`}>
      {!showScoreboard && (
        <Announcement
          won={streamerWon}
          duration={duration}
          mmrGain={mmrGain}
          sessionForm={sessionForm}
        />
      )}
      {showScoreboard && (
        processedPlayerData ? (
          <Scoreboard
            processedPlayerData={processedPlayerData}
            processedMetaData={processedMetaData}
            avatarUrls={avatarUrls}
            countries={countries}
            adaptedSessionData={adaptedSessionData}
            streamerTag={streamerTag}
          />
        ) : (
          <div className="go-announcement go-fade-in">
            <div className={`go-verdict ${streamerWon ? "go-verdict-win" : "go-verdict-loss"}`}>
              {streamerWon ? "VICTORY" : "DEFEAT"}
            </div>
            <div className="go-no-stats">Score data unavailable</div>
          </div>
        )
      )}
    </div>
  );
};

export default GameOutroScreen;
