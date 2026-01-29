import React from "react";

import human from "./icons/human.svg";
import orc from "./icons/orc.svg";
import elf from "./icons/elf.svg";
import undead from "./icons/undead.svg";
import random from "./icons/random.svg";

const raceMapping = { 8: undead, 0: random, 4: elf, 2: orc, 1: human };

// Map images stored locally in /public/maps/
const getMapImageUrl = (mapName) => {
  if (!mapName) return null;
  const cleanName = mapName.replace(/^\(\d\)/, "").replace(/ /g, "").replace(/'/g, "");
  return `/maps/${cleanName}.png`;
};

/**
 * LastGameOverlay - Shows the last game with map, players, and result
 * Designed for bottom-right corner of stream
 */
const LastGameOverlay = ({
  game,
  layout = "default",
  bgStyle = "bg-gradient-fade"
}) => {
  if (!game) return null;

  const { mapName, won, mmrChange, allies = [], opponents = [], duration } = game;
  const mapUrl = getMapImageUrl(mapName);
  const cleanMapName = mapName?.replace(/^\(\d\)\s*/, "") || "Unknown";

  // Format duration (assumes seconds or already formatted string)
  const formatDuration = (dur) => {
    if (!dur) return null;
    if (typeof dur === 'string') return dur;
    const mins = Math.floor(dur / 60);
    const secs = dur % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Layout: default - map on left, info on right
  if (layout === "default" || layout === "horizontal") {
    return (
      <div className={`last-game-overlay lgo-horizontal ${bgStyle}`}>
        {/* Map thumbnail */}
        <div className="lgo-map">
          {mapUrl && <img src={mapUrl} alt={cleanMapName} />}
          <div className={`lgo-result-badge ${won ? 'win' : 'loss'}`}>
            {won ? 'WIN' : 'LOSS'}
          </div>
        </div>

        {/* Game info */}
        <div className="lgo-info">
          <div className="lgo-header">
            <span className="lgo-label">LAST GAME</span>
            <span className={`lgo-mmr ${mmrChange >= 0 ? 'positive' : 'negative'}`}>
              {mmrChange >= 0 ? '+' : ''}{mmrChange}
            </span>
          </div>

          {/* Teams */}
          <div className="lgo-teams">
            <div className="lgo-team allies">
              {allies.map((p, i) => (
                <div key={i} className="lgo-player">
                  <img src={raceMapping[p.race]} alt="" className="lgo-race" />
                  <span className="lgo-name">{p.name}</span>
                </div>
              ))}
            </div>
            <div className="lgo-vs">vs</div>
            <div className="lgo-team opponents">
              {opponents.map((p, i) => (
                <div key={i} className="lgo-player">
                  <img src={raceMapping[p.race]} alt="" className="lgo-race" />
                  <span className="lgo-name">{p.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Layout: vertical - map on top, info below (styled like PlayerOverlay)
  if (layout === "vertical") {
    return (
      <div className={`last-game-overlay lgo-vertical ${bgStyle}`}>
        {/* Label */}
        <div className="lgo-label">LAST GAME</div>

        {/* Result + MMR - prominent like PlayerOverlay */}
        <div className="lgo-result-row">
          <span className={`lgo-result-text ${won ? 'win' : 'loss'}`}>
            {won ? 'WIN' : 'LOSS'}
          </span>
          <span className={`lgo-mmr ${mmrChange >= 0 ? 'positive' : 'negative'}`}>
            {mmrChange >= 0 ? '+' : ''}{mmrChange}
          </span>
        </div>

        {/* Map */}
        <div className="lgo-map">
          {mapUrl && <img src={mapUrl} alt={cleanMapName} />}
        </div>

        {/* Teams side by side */}
        <div className="lgo-teams-row">
          <div className="lgo-team allies">
            {allies.map((p, i) => (
              <div key={i} className="lgo-player">
                <img src={raceMapping[p.race]} alt="" className="lgo-race" />
                <span className="lgo-name">{p.name}</span>
              </div>
            ))}
          </div>
          <div className="lgo-vs">vs</div>
          <div className="lgo-team opponents">
            {opponents.map((p, i) => (
              <div key={i} className="lgo-player">
                <img src={raceMapping[p.race]} alt="" className="lgo-race" />
                <span className="lgo-name">{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Layout: compact - smaller, just essentials
  if (layout === "compact") {
    return (
      <div className={`last-game-overlay lgo-compact ${bgStyle}`}>
        <div className="lgo-map">
          {mapUrl && <img src={mapUrl} alt={cleanMapName} />}
          <div className={`lgo-result-badge ${won ? 'win' : 'loss'}`}>
            {won ? 'W' : 'L'}
          </div>
          <div className={`lgo-mmr-badge ${mmrChange >= 0 ? 'positive' : 'negative'}`}>
            {mmrChange >= 0 ? '+' : ''}{mmrChange}
          </div>
        </div>
        <div className="lgo-teams-compact">
          <div className="lgo-team-row">
            {allies.map((p, i) => (
              <img key={i} src={raceMapping[p.race]} alt="" className="lgo-race" />
            ))}
          </div>
          <span className="lgo-vs-small">v</span>
          <div className="lgo-team-row">
            {opponents.map((p, i) => (
              <img key={i} src={raceMapping[p.race]} alt="" className="lgo-race" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Layout: wide - single row, good for bottom edge
  return (
    <div className={`last-game-overlay lgo-wide ${bgStyle}`}>
      <div className="lgo-map">
        {mapUrl && <img src={mapUrl} alt={cleanMapName} />}
      </div>
      <div className={`lgo-result ${won ? 'win' : 'loss'}`}>
        {won ? 'WIN' : 'LOSS'}
      </div>
      <div className={`lgo-mmr ${mmrChange >= 0 ? 'positive' : 'negative'}`}>
        {mmrChange >= 0 ? '+' : ''}{mmrChange}
      </div>
      <div className="lgo-team">
        {allies.map((p, i) => (
          <div key={i} className="lgo-player-inline">
            <img src={raceMapping[p.race]} alt="" className="lgo-race" />
            <span>{p.name}</span>
          </div>
        ))}
      </div>
      <span className="lgo-vs">vs</span>
      <div className="lgo-team opponents">
        {opponents.map((p, i) => (
          <div key={i} className="lgo-player-inline">
            <img src={raceMapping[p.race]} alt="" className="lgo-race" />
            <span>{p.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LastGameOverlay;
