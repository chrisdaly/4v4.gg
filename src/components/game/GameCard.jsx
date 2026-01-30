import React from "react";
import { Link } from "react-router-dom";
import "./GameCard.css";

import human from "../../icons/human.svg";
import orc from "../../icons/orc.svg";
import elf from "../../icons/elf.svg";
import undead from "../../icons/undead.svg";
import random from "../../icons/random.svg";

const raceMapping = { 8: undead, 0: random, 4: elf, 2: orc, 1: human };

// Map images stored locally in /public/maps/
const getMapImageUrl = (mapName) => {
  if (!mapName) return null;
  const cleanName = mapName.replace(/^\(\d\)/, "").replace(/ /g, "").replace(/'/g, "");
  return `/maps/${cleanName}.png`;
};

// Format duration from seconds
const formatDuration = (seconds) => {
  if (!seconds) return null;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

// Format time ago
const formatTimeAgo = (dateString) => {
  if (!dateString) return null;
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

// Calculate elapsed time for live games
const formatElapsedTime = (startTime) => {
  if (!startTime) return null;
  const start = new Date(startTime);
  const now = new Date();
  const diffMs = now - start;
  const mins = Math.floor(diffMs / 60000);
  const secs = Math.floor((diffMs % 60000) / 1000);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

/**
 * GameCard - Unified game display component
 *
 * @param {Object} game - Match data object
 * @param {string} status - "live" | "won" | "lost" (auto-detected if not provided)
 * @param {string} size - "mini" | "default" | "expanded" (default: "default")
 * @param {string} playerBattleTag - Highlight this player as "me"
 * @param {boolean} showTeams - Show both teams with names (default: true for default/expanded)
 * @param {boolean} showDuration - Show game duration (default: true)
 * @param {boolean} showMap - Show map thumbnail (default: true)
 * @param {string} linkTo - URL for click navigation (default: /match/{id})
 * @param {boolean} overlay - Overlay mode (transparent bg, no borders)
 * @param {string} layout - "horizontal" | "vertical" | "compact" | "wide" (for overlay mode)
 * @param {string} className - Additional CSS class
 */
const GameCard = ({
  game,
  status,
  size = "default",
  playerBattleTag,
  showTeams,
  showDuration = true,
  showMap = true,
  linkTo,
  overlay = false,
  layout = "horizontal",
  className = "",
}) => {
  if (!game) return null;

  // Normalize game data - handle both ongoing games and finished games
  const match = game.match || game;
  const mapName = match.mapName || game.mapName;
  const teams = match.teams || game.teams || [];
  const mapUrl = showMap ? getMapImageUrl(mapName) : null;
  const cleanMapName = mapName?.replace(/^\(\d\)\s*/, "") || "Unknown";

  // Find player in teams
  const battleTagLower = playerBattleTag?.toLowerCase();
  let playerTeamIndex = null;
  let playerData = null;

  if (battleTagLower && teams.length > 0) {
    for (let i = 0; i < teams.length; i++) {
      const team = teams[i];
      const player = team.players?.find(
        (p) => p.battleTag?.toLowerCase() === battleTagLower
      );
      if (player) {
        playerTeamIndex = i;
        playerData = player;
        break;
      }
    }
  }

  // Determine status if not provided
  let computedStatus = status;
  if (!computedStatus && playerData) {
    if (game.startTime && !game.endTime && !match.endTime) {
      computedStatus = "live";
    } else {
      const won = playerData.won === true || playerData.won === 1;
      computedStatus = won ? "won" : "lost";
    }
  }

  // Get MMR change for finished games
  const mmrChange = playerData
    ? (playerData.currentMmr || 0) - (playerData.oldMmr || 0)
    : game.mmrChange || 0;

  // Get teams
  const myTeam = playerTeamIndex !== null ? teams[playerTeamIndex] : teams[0];
  const opponentTeam = playerTeamIndex !== null
    ? teams[playerTeamIndex === 0 ? 1 : 0]
    : teams[1];

  // Calculate team MMRs for live games
  const myTeamMmr = myTeam?.players
    ? Math.round(
        myTeam.players.reduce((sum, p) => sum + (p.oldMmr || 0), 0) /
          myTeam.players.length
      )
    : null;
  const opponentTeamMmr = opponentTeam?.players
    ? Math.round(
        opponentTeam.players.reduce((sum, p) => sum + (p.oldMmr || 0), 0) /
          opponentTeam.players.length
      )
    : null;

  // Duration and time
  const durationSeconds = match.durationInSeconds || game.durationInSeconds || game.duration;
  const duration = formatDuration(durationSeconds);
  const elapsed = computedStatus === "live" ? formatElapsedTime(game.startTime || match.startTime) : null;
  const endTime = match.endTime || game.endTime;
  const timeAgo = endTime ? formatTimeAgo(endTime) : null;

  // Link URL
  const matchId = match.id || game.id;
  const href = linkTo || (matchId ? `/match/${matchId}` : null);

  // Determine if teams should be shown
  const shouldShowTeams = showTeams !== undefined ? showTeams : size !== "mini";

  // Build class names
  const classNames = [
    "game-card",
    `gc-${size}`,
    computedStatus && `gc-${computedStatus}`,
    overlay && "gc-overlay",
    overlay && `gc-layout-${layout}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  // Wrapper component (Link or div)
  const Wrapper = href && !overlay ? Link : "div";
  const wrapperProps = href && !overlay ? { to: href, className: classNames } : { className: classNames };

  // ============================================
  // SIZE: MINI - Just map + badge + MMR
  // ============================================
  if (size === "mini") {
    return (
      <Wrapper {...wrapperProps}>
        {showMap && mapUrl && (
          <div className="gc-map gc-map-mini">
            <img src={mapUrl} alt={cleanMapName} />
          </div>
        )}
        <div className="gc-mini-info">
          <div className="gc-result">
            {computedStatus === "live" ? (
              <span className="gc-live-badge">
                <span className="gc-live-dot"></span>
                LIVE
              </span>
            ) : (
              <span className={`gc-badge gc-badge-${computedStatus}`}>
                {computedStatus === "won" ? "WIN" : "LOSS"}
              </span>
            )}
            {computedStatus !== "live" && (
              <span className={`gc-mmr ${mmrChange >= 0 ? "positive" : "negative"}`}>
                {mmrChange >= 0 ? "+" : ""}
                {mmrChange}
              </span>
            )}
          </div>
          <span className="gc-map-name">{cleanMapName}</span>
        </div>
      </Wrapper>
    );
  }

  // ============================================
  // OVERLAY MODE - Multiple layouts
  // ============================================
  if (overlay) {
    // Vertical layout for overlays
    if (layout === "vertical") {
      return (
        <div className={classNames}>
          <div className="gc-label">
            {computedStatus === "live" ? "LIVE GAME" : "LAST GAME"}
          </div>
          <div className="gc-result-row">
            {computedStatus === "live" ? (
              <span className="gc-live-text">
                <span className="gc-live-dot"></span>
                LIVE
              </span>
            ) : (
              <>
                <span className={`gc-result-text gc-result-${computedStatus}`}>
                  {computedStatus === "won" ? "WIN" : "LOSS"}
                </span>
                <span className={`gc-mmr gc-mmr-large ${mmrChange >= 0 ? "positive" : "negative"}`}>
                  {mmrChange >= 0 ? "+" : ""}
                  {mmrChange}
                </span>
              </>
            )}
          </div>
          <div className="gc-meta">
            <span className="gc-map-name">{cleanMapName}</span>
            {showDuration && (duration || elapsed) && (
              <span className="gc-duration">{elapsed || duration}</span>
            )}
          </div>
          {showMap && mapUrl && (
            <div className="gc-map gc-map-vertical">
              <img src={mapUrl} alt={cleanMapName} />
            </div>
          )}
          {shouldShowTeams && myTeam && opponentTeam && (
            <div className="gc-teams-row">
              <div className="gc-team gc-team-allies">
                {myTeam.players?.map((p, i) => (
                  <div
                    key={i}
                    className={`gc-player ${
                      p.battleTag?.toLowerCase() === battleTagLower ? "gc-player-me" : ""
                    }`}
                  >
                    <img src={raceMapping[p.race]} alt="" className="gc-race" />
                    <span className="gc-name">{p.name}</span>
                  </div>
                ))}
              </div>
              <div className="gc-vs">vs</div>
              <div className="gc-team gc-team-opponents">
                {opponentTeam.players?.map((p, i) => (
                  <div key={i} className="gc-player">
                    <img src={raceMapping[p.race]} alt="" className="gc-race" />
                    <span className="gc-name">{p.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    // Compact overlay layout
    if (layout === "compact") {
      return (
        <div className={classNames}>
          {showMap && mapUrl && (
            <div className="gc-map gc-map-compact">
              <img src={mapUrl} alt={cleanMapName} />
              <div className={`gc-result-overlay gc-result-${computedStatus}`}>
                {computedStatus === "live" ? "LIVE" : computedStatus === "won" ? "W" : "L"}
              </div>
              {computedStatus !== "live" && (
                <div className={`gc-mmr-overlay ${mmrChange >= 0 ? "positive" : "negative"}`}>
                  {mmrChange >= 0 ? "+" : ""}
                  {mmrChange}
                </div>
              )}
            </div>
          )}
          {shouldShowTeams && myTeam && opponentTeam && (
            <div className="gc-teams-compact">
              <div className="gc-team-row">
                {myTeam.players?.map((p, i) => (
                  <img key={i} src={raceMapping[p.race]} alt="" className="gc-race" />
                ))}
              </div>
              <span className="gc-vs-small">v</span>
              <div className="gc-team-row">
                {opponentTeam.players?.map((p, i) => (
                  <img key={i} src={raceMapping[p.race]} alt="" className="gc-race" />
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    // Wide overlay layout
    if (layout === "wide") {
      return (
        <div className={classNames}>
          {showMap && mapUrl && (
            <div className="gc-map gc-map-wide">
              <img src={mapUrl} alt={cleanMapName} />
            </div>
          )}
          <div className={`gc-result gc-result-${computedStatus}`}>
            {computedStatus === "live" ? (
              <>
                <span className="gc-live-dot"></span>
                LIVE
              </>
            ) : computedStatus === "won" ? (
              "WIN"
            ) : (
              "LOSS"
            )}
          </div>
          {computedStatus !== "live" && (
            <div className={`gc-mmr ${mmrChange >= 0 ? "positive" : "negative"}`}>
              {mmrChange >= 0 ? "+" : ""}
              {mmrChange}
            </div>
          )}
          {shouldShowTeams && myTeam && (
            <div className="gc-team">
              {myTeam.players?.map((p, i) => (
                <div key={i} className="gc-player-inline">
                  <img src={raceMapping[p.race]} alt="" className="gc-race" />
                  <span>{p.name}</span>
                </div>
              ))}
            </div>
          )}
          <span className="gc-vs">vs</span>
          {shouldShowTeams && opponentTeam && (
            <div className="gc-team gc-team-opponents">
              {opponentTeam.players?.map((p, i) => (
                <div key={i} className="gc-player-inline">
                  <img src={raceMapping[p.race]} alt="" className="gc-race" />
                  <span>{p.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Default horizontal overlay layout
    return (
      <div className={classNames}>
        {showMap && mapUrl && (
          <div className="gc-map gc-map-horizontal">
            <img src={mapUrl} alt={cleanMapName} />
            <div className={`gc-result-badge gc-result-${computedStatus}`}>
              {computedStatus === "live" ? "LIVE" : computedStatus === "won" ? "WIN" : "LOSS"}
            </div>
          </div>
        )}
        <div className="gc-info">
          <div className="gc-header">
            <span className="gc-label">
              {computedStatus === "live" ? "LIVE GAME" : "LAST GAME"}
            </span>
            {computedStatus !== "live" && (
              <span className={`gc-mmr gc-mmr-large ${mmrChange >= 0 ? "positive" : "negative"}`}>
                {mmrChange >= 0 ? "+" : ""}
                {mmrChange}
              </span>
            )}
            {computedStatus === "live" && elapsed && (
              <span className="gc-elapsed">{elapsed}</span>
            )}
          </div>
          {shouldShowTeams && myTeam && opponentTeam && (
            <div className="gc-teams">
              <div className="gc-team gc-team-allies">
                {myTeam.players?.map((p, i) => (
                  <div
                    key={i}
                    className={`gc-player ${
                      p.battleTag?.toLowerCase() === battleTagLower ? "gc-player-me" : ""
                    }`}
                  >
                    <img src={raceMapping[p.race]} alt="" className="gc-race" />
                    <span className="gc-name">{p.name}</span>
                  </div>
                ))}
              </div>
              <div className="gc-vs">vs</div>
              <div className="gc-team gc-team-opponents">
                {opponentTeam.players?.map((p, i) => (
                  <div key={i} className="gc-player">
                    <img src={raceMapping[p.race]} alt="" className="gc-race" />
                    <span className="gc-name">{p.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============================================
  // SIZE: DEFAULT - Map + badge + MMR + teams
  // ============================================
  if (size === "default") {
    return (
      <Wrapper {...wrapperProps}>
        {showMap && mapUrl && (
          <div className="gc-map">
            <img src={mapUrl} alt={cleanMapName} />
          </div>
        )}
        <div className="gc-content">
          <div className="gc-top">
            <div className="gc-result">
              {computedStatus === "live" ? (
                <span className="gc-live-badge">
                  <span className="gc-live-dot"></span>
                  <span className="gc-live-text">LIVE</span>
                  {elapsed && <span className="gc-duration">{elapsed}</span>}
                </span>
              ) : (
                <>
                  <span className={`gc-badge gc-badge-${computedStatus}`}>
                    {computedStatus === "won" ? "WIN" : "LOSS"}
                  </span>
                  <span className={`gc-mmr ${mmrChange >= 0 ? "positive" : "negative"}`}>
                    {mmrChange >= 0 ? "+" : ""}
                    {mmrChange}
                  </span>
                </>
              )}
            </div>
            <div className="gc-meta">
              <span className="gc-map-name">{cleanMapName}</span>
              {showDuration && duration && <span className="gc-duration">{duration}</span>}
              {timeAgo && <span className="gc-time">{timeAgo}</span>}
            </div>
          </div>
          {shouldShowTeams && myTeam && opponentTeam && (
            <div className="gc-teams">
              <div className="gc-team gc-team-allies">
                {myTeam.players?.map((p, i) => (
                  <div
                    key={i}
                    className={`gc-player ${
                      p.battleTag?.toLowerCase() === battleTagLower ? "gc-player-me" : ""
                    }`}
                  >
                    <img src={raceMapping[p.race]} alt="" className="gc-race" />
                    <span className="gc-name">{p.name}</span>
                  </div>
                ))}
              </div>
              <div className="gc-vs">vs</div>
              <div className="gc-team gc-team-opponents">
                {opponentTeam.players?.map((p, i) => (
                  <div key={i} className="gc-player">
                    <img src={raceMapping[p.race]} alt="" className="gc-race" />
                    <span className="gc-name">{p.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        {href && !overlay && <div className="gc-arrow">→</div>}
      </Wrapper>
    );
  }

  // ============================================
  // SIZE: EXPANDED - Full teams with all metadata
  // ============================================
  return (
    <Wrapper {...wrapperProps}>
      {showMap && mapUrl && (
        <div className="gc-map gc-map-expanded">
          <img src={mapUrl} alt={cleanMapName} />
        </div>
      )}
      <div className="gc-content gc-content-expanded">
        <div className="gc-top">
          <div className="gc-result">
            {computedStatus === "live" ? (
              <span className="gc-live-badge gc-live-expanded">
                <span className="gc-live-dot"></span>
                <span className="gc-live-text">LIVE</span>
                {elapsed && <span className="gc-duration">{elapsed}</span>}
              </span>
            ) : (
              <>
                <span className={`gc-badge gc-badge-large gc-badge-${computedStatus}`}>
                  {computedStatus === "won" ? "WIN" : "LOSS"}
                </span>
                <span className={`gc-mmr gc-mmr-large ${mmrChange >= 0 ? "positive" : "negative"}`}>
                  {mmrChange >= 0 ? "+" : ""}
                  {mmrChange}
                </span>
              </>
            )}
          </div>
          <div className="gc-meta gc-meta-expanded">
            <span className="gc-map-name">{cleanMapName}</span>
            {showDuration && (duration || elapsed) && (
              <span className="gc-duration">{elapsed || duration}</span>
            )}
            {timeAgo && <span className="gc-time">{timeAgo}</span>}
          </div>
        </div>
        {shouldShowTeams && myTeam && opponentTeam && (
          <div className="gc-teams gc-teams-expanded">
            <div className="gc-team-block gc-team-allies">
              {computedStatus === "live" && myTeamMmr && (
                <div className="gc-team-mmr">{myTeamMmr} MMR</div>
              )}
              <div className="gc-team-players">
                {myTeam.players?.map((p, i) => (
                  <div
                    key={i}
                    className={`gc-player ${
                      p.battleTag?.toLowerCase() === battleTagLower ? "gc-player-me" : ""
                    }`}
                  >
                    <img src={raceMapping[p.race]} alt="" className="gc-race" />
                    <span className="gc-name">{p.name}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="gc-vs">vs</div>
            <div className="gc-team-block gc-team-opponents">
              {computedStatus === "live" && opponentTeamMmr && (
                <div className="gc-team-mmr">{opponentTeamMmr} MMR</div>
              )}
              <div className="gc-team-players">
                {opponentTeam.players?.map((p, i) => (
                  <div key={i} className="gc-player">
                    <img src={raceMapping[p.race]} alt="" className="gc-race" />
                    <span className="gc-name">{p.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      {href && !overlay && <div className="gc-arrow">→</div>}
    </Wrapper>
  );
};

export default GameCard;
