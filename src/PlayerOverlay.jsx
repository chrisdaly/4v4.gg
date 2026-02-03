import React from "react";
import { Flag } from "semantic-ui-react";
import FormDots from "./FormDots.jsx";

/**
 * PlayerOverlay - Compact player card for stream overlay
 *
 * layout options: "default", "horizontal", "minimal", "compact", "session", "banner"
 * bgStyle options: bg-gradient-fade, bg-dark-gold, bg-frosted, bg-none, bg-minimal
 */
const PlayerOverlay = ({ playerData, layout = "default", bgStyle = "bg-gradient-fade" }) => {
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

  // ============================================
  // LAYOUT: HORIZONTAL - Single row along bottom edge
  // ============================================
  if (layout === "horizontal") {
    return (
      <div className={`player-overlay po-horizontal ${bgStyle}`}>
        {profilePic ? (
          <img src={profilePic} alt="" className="po-pic-small" />
        ) : (
          <div className="po-pic-small po-pic-placeholder" />
        )}
        <div className="po-name">{name}</div>
        <div className="po-divider">|</div>
        <div className="po-mmr-inline">
          <span className="po-mmr">{mmr}</span>
          <span className="po-mmr-label"> MMR</span>
        </div>
        <div className="po-divider">|</div>
        <div className="po-record-inline">
          <span className="po-wins">{wins}</span>
          <span className="po-sep">-</span>
          <span className="po-losses">{losses}</span>
        </div>
        <div className="po-divider">|</div>
        <div className="po-session-inline">
          <span className={`po-session-change ${sessionChange >= 0 ? 'positive' : 'negative'}`}>
            {sessionChange >= 0 ? '+' : ''}{sessionChange}
          </span>
          <FormDots form={form} size="small" />
        </div>
      </div>
    );
  }

  // ============================================
  // LAYOUT: MINIMAL - Name, MMR, Session only
  // ============================================
  if (layout === "minimal") {
    return (
      <div className={`player-overlay po-minimal ${bgStyle}`}>
        <div className="po-name">{name}</div>
        <div className="po-mmr-line">
          <span className="po-mmr">{mmr}</span>
          <span className="po-mmr-label"> MMR</span>
        </div>
        <div className="po-session">
          <span className="po-session-label">SESSION</span>
          <span className={`po-session-change ${sessionChange >= 0 ? 'positive' : 'negative'}`}>
            {sessionChange >= 0 ? '+' : ''}{sessionChange}
          </span>
          <FormDots form={form} size="small" />
        </div>
      </div>
    );
  }

  // ============================================
  // LAYOUT: COMPACT - Two lines only
  // ============================================
  if (layout === "compact") {
    return (
      <div className={`player-overlay po-compact ${bgStyle}`}>
        <div className="po-top-row">
          <span className="po-name">{name}</span>
          <span className="po-mmr">{mmr}</span>
          <span className="po-mmr-label">MMR</span>
        </div>
        <div className="po-bottom-row">
          <span className={`po-session-change ${sessionChange >= 0 ? 'positive' : 'negative'}`}>
            {sessionChange >= 0 ? '+' : ''}{sessionChange}
          </span>
          <FormDots form={form} size="small" />
        </div>
      </div>
    );
  }

  // ============================================
  // LAYOUT: SESSION - Just session progress (scoreboard)
  // ============================================
  if (layout === "session") {
    return (
      <div className={`player-overlay po-session-only ${bgStyle}`}>
        <div className="po-session-header">SESSION</div>
        <div className="po-session-main">
          <span className={`po-session-change-big ${sessionChange >= 0 ? 'positive' : 'negative'}`}>
            {sessionChange >= 0 ? '+' : ''}{sessionChange}
          </span>
        </div>
        <FormDots form={form} size="medium" />
      </div>
    );
  }

  // ============================================
  // LAYOUT: BANNER - WC3 themed vertical banner
  // ============================================
  if (layout === "banner") {
    return (
      <div className={`player-overlay po-banner ${bgStyle}`}>
        {/* Portrait in ornate frame */}
        <div className="po-banner-portrait">
          <div className="po-banner-frame">
            {profilePic ? (
              <img src={profilePic} alt="" className="po-banner-pic" />
            ) : (
              <div className="po-banner-pic po-pic-placeholder" />
            )}
          </div>
          {country && <Flag name={country.toLowerCase()} className="po-banner-flag" />}
        </div>

        {/* Name */}
        <div className="po-banner-name">{name}</div>

        {/* MMR + Rank row */}
        <div className="po-banner-mmr-row">
          <span className="po-banner-mmr-value">{mmr}</span>
          <span className="po-banner-mmr-label">MMR</span>
          {rank && <><span className="po-banner-sep">·</span><span className="po-banner-rank">#{rank}</span></>}
        </div>

        {/* Record + Winrate row */}
        <div className="po-banner-record">
          <span className="po-banner-wins">{wins}</span>
          <span className="po-banner-losses">-{losses}</span>
          <span className="po-banner-winrate">({winrate}%)</span>
        </div>

        {/* Session indicator */}
        <div className="po-banner-session">
          <span className={`po-banner-session-change ${sessionChange >= 0 ? 'positive' : 'negative'}`}>
            {sessionChange >= 0 ? '+' : ''}{sessionChange}
          </span>
          <FormDots form={form} size="small" />
        </div>
      </div>
    );
  }

  // ============================================
  // LAYOUT: DEFAULT - Original vertical layout
  // ============================================
  return (
    <div className={`player-overlay po-default ${bgStyle}`}>
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
