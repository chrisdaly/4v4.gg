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
 * SessionHistoryOverlay - Shows recent games with minimap, allies, opponents
 *
 * Props:
 * - games: Array of recent games with structure:
 *   { mapName, won, mmrChange, allies: [{race}], opponents: [{race}] }
 * - layout: "horizontal" | "vertical" | "compact" | "minimal" | "cards"
 * - maxGames: Number of games to show (default 3)
 * - showHeader: Whether to show session summary header
 * - bgStyle: Background style class
 */
const SessionHistoryOverlay = ({
  games = [],
  layout = "horizontal",
  maxGames = 3,
  showHeader = true,
  bgStyle = "bg-gradient-fade"
}) => {
  if (!games || games.length === 0) return null;

  const displayGames = games.slice(0, maxGames);
  const wins = displayGames.filter(g => g.won).length;
  const losses = displayGames.length - wins;
  const totalMmr = displayGames.reduce((sum, g) => sum + (g.mmrChange || 0), 0);

  const renderRaceIcons = (players, className = "") => (
    <div className={`sho-races ${className}`}>
      {players.map((p, i) => (
        <img key={i} src={raceMapping[p.race]} alt="" className="sho-race-icon" />
      ))}
    </div>
  );

  const renderHeader = () => (
    <div className="sho-header">
      <span className="sho-title">SESSION</span>
      <span className="sho-record">
        <span className="sho-wins">{wins}W</span>
        <span className="sho-sep">-</span>
        <span className="sho-losses">{losses}L</span>
      </span>
      <span className={`sho-total ${totalMmr >= 0 ? 'positive' : 'negative'}`}>
        {totalMmr >= 0 ? '+' : ''}{totalMmr}
      </span>
    </div>
  );

  // ============================================
  // LAYOUT: HORIZONTAL - Wide, games stacked vertically
  // Best for: Bottom right corner
  // ============================================
  if (layout === "horizontal") {
    return (
      <div className={`session-history-overlay sho-horizontal ${bgStyle}`}>
        {showHeader && renderHeader()}
        <div className="sho-games">
          {displayGames.map((game, idx) => (
            <div key={idx} className={`sho-game ${game.won ? 'win' : 'loss'}`}>
              <div className="sho-map-thumb">
                <img src={getMapImageUrl(game.mapName)} alt="" />
              </div>
              <div className={`sho-result ${game.won ? 'win' : 'loss'}`}>
                {game.won ? 'W' : 'L'}
              </div>
              <div className={`sho-mmr ${game.mmrChange >= 0 ? 'positive' : 'negative'}`}>
                {game.mmrChange >= 0 ? '+' : ''}{game.mmrChange}
              </div>
              {renderRaceIcons(game.allies, "sho-allies")}
              <span className="sho-vs">vs</span>
              {renderRaceIcons(game.opponents, "sho-opponents")}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ============================================
  // LAYOUT: VERTICAL - Tall, narrow column
  // Best for: Right edge of screen
  // ============================================
  if (layout === "vertical") {
    return (
      <div className={`session-history-overlay sho-vertical ${bgStyle}`}>
        {showHeader && renderHeader()}
        <div className="sho-games">
          {displayGames.map((game, idx) => (
            <div key={idx} className={`sho-game ${game.won ? 'win' : 'loss'}`}>
              <div className="sho-map-thumb">
                <img src={getMapImageUrl(game.mapName)} alt="" />
                <div className={`sho-result-badge ${game.won ? 'win' : 'loss'}`}>
                  {game.won ? 'W' : 'L'}
                </div>
              </div>
              <div className="sho-game-info">
                <div className={`sho-mmr ${game.mmrChange >= 0 ? 'positive' : 'negative'}`}>
                  {game.mmrChange >= 0 ? '+' : ''}{game.mmrChange}
                </div>
                <div className="sho-teams">
                  {renderRaceIcons(game.allies, "sho-allies")}
                  {renderRaceIcons(game.opponents, "sho-opponents")}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ============================================
  // LAYOUT: COMPACT - Ultra minimal, just essentials
  // Best for: Small corner space
  // ============================================
  if (layout === "compact") {
    return (
      <div className={`session-history-overlay sho-compact ${bgStyle}`}>
        {showHeader && renderHeader()}
        <div className="sho-games">
          {displayGames.map((game, idx) => (
            <div key={idx} className={`sho-game ${game.won ? 'win' : 'loss'}`}>
              <div className="sho-map-thumb">
                <img src={getMapImageUrl(game.mapName)} alt="" />
              </div>
              <div className={`sho-result ${game.won ? 'win' : 'loss'}`}>
                {game.won ? 'W' : 'L'}
              </div>
              <div className={`sho-mmr ${game.mmrChange >= 0 ? 'positive' : 'negative'}`}>
                {game.mmrChange >= 0 ? '+' : ''}{game.mmrChange}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ============================================
  // LAYOUT: MINIMAL - Just map thumbnails with W/L overlay
  // Best for: Tiny space, maximum density
  // ============================================
  if (layout === "minimal") {
    return (
      <div className={`session-history-overlay sho-minimal ${bgStyle}`}>
        {showHeader && (
          <div className="sho-header-mini">
            <span className={`sho-total ${totalMmr >= 0 ? 'positive' : 'negative'}`}>
              {totalMmr >= 0 ? '+' : ''}{totalMmr}
            </span>
          </div>
        )}
        <div className="sho-games">
          {displayGames.map((game, idx) => (
            <div key={idx} className={`sho-game ${game.won ? 'win' : 'loss'}`}>
              <div className="sho-map-thumb">
                <img src={getMapImageUrl(game.mapName)} alt="" />
                <div className={`sho-result-overlay ${game.won ? 'win' : 'loss'}`}>
                  {game.won ? 'W' : 'L'}
                </div>
                <div className={`sho-mmr-overlay ${game.mmrChange >= 0 ? 'positive' : 'negative'}`}>
                  {game.mmrChange >= 0 ? '+' : ''}{game.mmrChange}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ============================================
  // LAYOUT: CARDS - Each game as a distinct card
  // Best for: More visual impact, larger space
  // ============================================
  if (layout === "cards") {
    return (
      <div className={`session-history-overlay sho-cards ${bgStyle}`}>
        {showHeader && renderHeader()}
        <div className="sho-games">
          {displayGames.map((game, idx) => (
            <div key={idx} className={`sho-card ${game.won ? 'win' : 'loss'}`}>
              <div className="sho-card-map">
                <img src={getMapImageUrl(game.mapName)} alt="" />
              </div>
              <div className="sho-card-content">
                <div className="sho-card-top">
                  <span className={`sho-result ${game.won ? 'win' : 'loss'}`}>
                    {game.won ? 'WIN' : 'LOSS'}
                  </span>
                  <span className={`sho-mmr ${game.mmrChange >= 0 ? 'positive' : 'negative'}`}>
                    {game.mmrChange >= 0 ? '+' : ''}{game.mmrChange}
                  </span>
                </div>
                <div className="sho-card-teams">
                  <div className="sho-card-team">
                    {renderRaceIcons(game.allies)}
                  </div>
                  <span className="sho-vs">vs</span>
                  <div className="sho-card-team opponents">
                    {renderRaceIcons(game.opponents)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ============================================
  // LAYOUT: ROW - Single horizontal row of games
  // Best for: Bottom edge, wide but short
  // ============================================
  return (
    <div className={`session-history-overlay sho-row ${bgStyle}`}>
      {showHeader && renderHeader()}
      <div className="sho-games">
        {displayGames.map((game, idx) => (
          <div key={idx} className={`sho-game ${game.won ? 'win' : 'loss'}`}>
            <div className="sho-map-thumb">
              <img src={getMapImageUrl(game.mapName)} alt="" />
              <div className={`sho-result-corner ${game.won ? 'win' : 'loss'}`}>
                {game.won ? 'W' : 'L'}
              </div>
            </div>
            <div className="sho-game-details">
              <div className={`sho-mmr ${game.mmrChange >= 0 ? 'positive' : 'negative'}`}>
                {game.mmrChange >= 0 ? '+' : ''}{game.mmrChange}
              </div>
              <div className="sho-matchup">
                {renderRaceIcons(game.allies, "sho-allies")}
                <span className="sho-vs-small">v</span>
                {renderRaceIcons(game.opponents, "sho-opponents")}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SessionHistoryOverlay;
