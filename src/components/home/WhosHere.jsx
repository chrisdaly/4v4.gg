import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import WorldMap from "../WorldMap";
import MmrDotStrip from "../MmrDotStrip";
import { buildMapData } from "../../lib/chat/regions";
import useCountUp from "../../lib/home/useCountUp";

/**
 * The "Who's here" card (links to /chat): online count and country count,
 * the mini world map, today's numbers (games / players / peak online) and
 * the online-by-MMR dot strip.
 *
 * Props: onlineUsers, avatars, stats (Maps from usePlayerMeta), inGameTags
 * (Set), today ({ games, players, peakOnline } | null)
 */

const fmt = (n) => (n == null ? "–" : n.toLocaleString("en-US"));

export default function WhosHere({ onlineUsers = [], avatars, stats, inGameTags, today }) {
  const { playerCountries, mapPlayers } = useMemo(
    () => buildMapData(onlineUsers, { stats, avatars, inGameTags }),
    [onlineUsers, stats, avatars, inGameTags]
  );
  const countries = playerCountries.size;
  const onlineShown = useCountUp(onlineUsers.length);
  const countriesShown = useCountUp(countries);
  return (
    <Link to="/chat" className="hm-here hm-panel" data-whos-here>
      <div className="hm-here-head">
        <span className="hm-here-count">{onlineShown}</span>
        <span className="hm-here-sub">online · {countriesShown} {countries === 1 ? "country" : "countries"}</span>
        <span className="hm-here-link">Chat →</span>
      </div>
      <div className="hm-here-map">
        <WorldMap instant compact highlightInGame playerCountries={playerCountries} players={mapPlayers} />
      </div>
      <div className="hm-here-body">
        <span className="hm-here-label">TODAY</span>
        <div className="hm-today" data-today>
          <div className="hm-today-stat">
            <span className="hm-today-num">{fmt(today?.games)}</span>
            <span className="hm-today-l">games</span>
          </div>
          <div className="hm-today-stat">
            <span className="hm-today-num">{fmt(today?.players)}</span>
            <span className="hm-today-l">players</span>
          </div>
          <div className="hm-today-stat">
            <span className="hm-today-num">{fmt(today?.peakOnline)}</span>
            <span className="hm-today-l">peak online</span>
          </div>
        </div>
        <span className="hm-here-label">ONLINE BY MMR</span>
        <MmrDotStrip users={onlineUsers} stats={stats} inGameTags={inGameTags} axis="range" animate />
      </div>
    </Link>
  );
}
