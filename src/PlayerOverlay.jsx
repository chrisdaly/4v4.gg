import React from "react";
import { Flag } from "semantic-ui-react";
import FormDots from "./FormDots.jsx";

/**
 * PlayerOverlay - Compact player card for stream overlay
 * Centered layout like demo Option 6
 */
const PlayerOverlay = ({ playerData }) => {
  const {
    name,
    profilePic,
    country,
    mmr,
    allTimeLow,
    allTimePeak,
    wins,
    losses,
    sessionChange,
    form,
    rank,
  } = playerData;

  // Calculate MMR bar position (where current MMR sits between all-time low and peak)
  const mmrRange = allTimePeak && allTimeLow ? allTimePeak - allTimeLow : 0;
  const mmrPosition = mmrRange > 0 ? ((mmr - allTimeLow) / mmrRange) * 100 : 50;
  const winrate = (wins + losses) > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;

  return (
    <div className="player-overlay">
      {/* Profile pic with flag */}
      <div className="po-pic-container">
        {profilePic ? (
          <img src={profilePic} alt="" className="po-pic" />
        ) : (
          <div className="po-pic po-pic-placeholder" />
        )}
        {country && <Flag name={country.toLowerCase()} className="po-flag" />}
      </div>

      {/* Name */}
      <div className="po-name">{name}</div>

      {/* MMR line: 2235 MMR · #52 */}
      <div className="po-mmr-line">
        <span className="po-mmr">{mmr}</span>
        <span className="po-mmr-label"> MMR</span>
        {rank && (
          <>
            <span className="po-separator"> · </span>
            <span className="po-rank">#{rank}</span>
          </>
        )}
      </div>

      {/* Record line: 11-10 (52%) */}
      <div className="po-record-line">
        <span className="po-wins">{wins}</span>
        <span className="po-sep">-</span>
        <span className="po-losses">{losses}</span>
        <span className="po-winrate"> ({winrate}%)</span>
      </div>

      {/* MMR gradient bar */}
      {allTimePeak && allTimeLow && (
        <div className="po-mmr-bar">
          <div className="po-mmr-bar-track">
            <div className="po-mmr-bar-marker" style={{ left: `${mmrPosition}%` }} />
          </div>
          <div className="po-mmr-bar-labels">
            <span className="po-mmr-low">{allTimeLow}</span>
            <span className="po-mmr-peak">{allTimePeak}</span>
          </div>
        </div>
      )}

      {/* Session row */}
      <div className="po-session">
        <span className="po-session-label">SESSION</span>
        <span className={`po-session-change ${sessionChange >= 0 ? 'positive' : 'negative'}`}>
          {sessionChange >= 0 ? '+' : ''}{sessionChange}
        </span>
        <FormDots form={form} size="small" />
      </div>
    </div>
  );
};

export default PlayerOverlay;
