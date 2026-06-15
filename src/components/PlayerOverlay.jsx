import React from "react";
import { GiCrossedSwords } from "react-icons/gi";
import { CountryFlag } from "./ui";
import FormDots from "./FormDots";
import MmrRangeBar from "./MmrRangeBar";
import MmrSparkline from "./MmrSparkline";

/**
 * PlayerOverlay - Compact player card for stream overlay
 *
 * layout options: "default", "horizontal", "minimal", "compact", "session", "banner"
 * bgStyle options: bg-gradient-fade, bg-dark-gold, bg-frosted, bg-none, bg-minimal
 */
const formatDuration = (seconds) => {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

const PlayerOverlay = ({ playerData, layout = "default", bgStyle = "bg-gradient-fade" }) => {
  const {
    name,
    profilePic,
    country,
    mmr,
    allTimeLow,
    allTimePeak,
    seasonMmrs,
    wins,
    losses,
    sessionChange,
    form,
    rank,
    ladderNeighbors,
    lastGame,
  } = playerData;

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
          {country && <CountryFlag name={country.toLowerCase()} className="po-banner-flag" />}
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
  // LAYOUT: RICH - Profile panel with sparkline, ladder strip, last game
  // ============================================
  if (layout === "rich") {
    return (
      <div className={`player-overlay po-rich ${bgStyle}`}>
        <div className="hd-info">
          <div className="hd-name-row">
            <span className="hd-name">{name}</span>
          </div>
          <div className="hd-stats-row">
            {rank && <span className="hd-rank">#{rank}</span>}
            <span className="hd-mmr">{mmr}</span>
            <span className="hd-mmr-label">MMR</span>
          </div>
        </div>

        <div className="po-rich-divider" />

        <div className="po-rich-session">
          <span className="po-rich-session-label">SESSION</span>
          <span className={`po-rich-session-change ${sessionChange >= 0 ? 'positive' : 'negative'}`}>
            {sessionChange >= 0 ? '+' : ''}{sessionChange}
          </span>
          {form.length > 0 && <FormDots form={form} size="small" />}
        </div>

        {lastGame && (
          <>
            <div className="po-rich-divider" />
            <div className="po-rich-last-game">
              <GiCrossedSwords className="po-rich-last-icon" />
              <span className="po-rich-last-map">{lastGame.mapName}</span>
              {lastGame.won != null && (
                <span className={`po-rich-last-result ${lastGame.won ? 'positive' : 'negative'}`}>
                  {lastGame.won ? 'W' : 'L'}
                </span>
              )}
              {formatDuration(lastGame.durationInSeconds) && (
                <span className="po-rich-last-duration">{formatDuration(lastGame.durationInSeconds)}</span>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  // ============================================
  // WIDGET LAYOUTS - standalone modules for independent OBS positioning
  // ============================================

  if (layout === "widget-card") {
    return (
      <div className={`player-overlay po-rich po-widget ${bgStyle}`}>
        <div className="po-rich-header">
          <div className="hd-pic-wrapper">
            {profilePic
              ? <img src={profilePic} alt="" className="hd-pic" />
              : <div className="hd-pic po-pic-placeholder" />
            }
            {country && <CountryFlag name={country.toLowerCase()} className="hd-flag" />}
          </div>
          <div className="hd-info">
            <div className="hd-name-row">
              <span className="hd-name">{name}</span>
            </div>
            <div className="hd-stats-row">
              {rank && <span className="hd-rank">#{rank}</span>}
              <span className="hd-mmr">{mmr}</span>
              <span className="hd-mmr-label">MMR</span>
            </div>
            <div className="hd-record-row">
              <span className="hd-wins">{wins}W</span>
              <span className="hd-losses">-{losses}L</span>
              <span className="hd-sep">·</span>
              <span className="hd-winrate">{winrate}%</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (layout === "widget-sparkline") {
    return (
      <div className={`player-overlay po-rich po-widget ${bgStyle}`}>
        {seasonMmrs && seasonMmrs.length >= 2
          ? <MmrSparkline data={seasonMmrs} width="100%" height={24} className="po-rich-sparkline" />
          : null
        }
      </div>
    );
  }

  if (layout === "widget-session") {
    return (
      <div className={`player-overlay po-rich po-widget ${bgStyle}`}>
        <div className="po-rich-session">
          <span className="po-rich-session-label">SESSION</span>
          <span className={`po-rich-session-change ${sessionChange >= 0 ? 'positive' : 'negative'}`}>
            {sessionChange >= 0 ? '+' : ''}{sessionChange}
          </span>
          {form.length > 0 && <FormDots form={form} size="small" />}
        </div>
      </div>
    );
  }

  if (layout === "widget-ladder") {
    if (!rank || (!ladderNeighbors?.above && !ladderNeighbors?.below)) return null;
    return (
      <div className={`player-overlay po-rich po-widget ${bgStyle}`}>
        <div className="po-rich-ladder">
          {ladderNeighbors?.above && (
            <div className="po-rich-ladder-row po-rich-ladder-neighbor">
              <span className="po-rich-ladder-rank">#{ladderNeighbors.above.rank}</span>
              <span className="po-rich-ladder-name">{ladderNeighbors.above.name}</span>
              <span className="po-rich-ladder-mmr">{ladderNeighbors.above.mmr}</span>
            </div>
          )}
          <div className="po-rich-ladder-row po-rich-ladder-self">
            <span className="po-rich-ladder-rank">#{rank}</span>
            <span className="po-rich-ladder-name">{name}</span>
            <span className="po-rich-ladder-mmr">{mmr}</span>
          </div>
          {ladderNeighbors?.below && (
            <div className="po-rich-ladder-row po-rich-ladder-neighbor">
              <span className="po-rich-ladder-rank">#{ladderNeighbors.below.rank}</span>
              <span className="po-rich-ladder-name">{ladderNeighbors.below.name}</span>
              <span className="po-rich-ladder-mmr">{ladderNeighbors.below.mmr}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (layout === "widget-lastgame") {
    if (!lastGame) return null;
    const duration = formatDuration(lastGame.durationInSeconds);
    return (
      <div className={`player-overlay po-rich po-widget ${bgStyle}`}>
        <div className="po-rich-last-game">
          <GiCrossedSwords className="po-rich-last-icon" />
          <span className="po-rich-last-map">{lastGame.mapName}</span>
          {lastGame.won != null && (
            <span className={`po-rich-last-result ${lastGame.won ? 'positive' : 'negative'}`}>
              {lastGame.won ? 'W' : 'L'}
            </span>
          )}
          {duration && <span className="po-rich-last-duration">{duration}</span>}
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
        {country && <CountryFlag name={country.toLowerCase()} className="po-flag" />}
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

      {/* MMR gradient bar (all-time low → peak) */}
      {allTimePeak && allTimeLow && (
        <MmrRangeBar className="po-mmr-bar" low={allTimeLow} peak={allTimePeak} current={mmr} detail="minimal" />
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
