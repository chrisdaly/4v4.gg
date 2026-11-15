import React, { useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { chartColors } from "../lib/design-tokens";
import DumbbellKey from "./DumbbellKey";
import data from "../lib/data/heroModeSplit.json";

/**
 * Which heroes each mode actually picks.
 *
 * A dumbbell rather than a bar of the difference, because the levels matter as
 * much as the change: Archmage moves only 1.4 points but is near the top of
 * both lists, while Demon Hunter moves 7 and effectively leaves the game.
 *
 * Sorted by difference, so the shape of the list is the finding: the heroes
 * that gain in 4v4 are auras and team heals, the ones that fall are duelists.
 */

const SOLO = chartColors.blue;
const FOUR = chartColors.gold;
const M = { top: 8, right: 56, bottom: 44, left: 168 };
const ARROW_GAP = 13.5;
// Below this the names eat the plot, so the chart scrolls instead.
const MIN_W = 560;
const DOT_R = 4.5;
const ROW = 22;

export default function HeroModeSplit({ showKey = true }) {
  const wrapRef = useRef(null);
  const [width, setWidth] = useState(760);
  const [hover, setHover] = useState(null);

  React.useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      if (e.contentRect.width > 0) setWidth(Math.max(e.contentRect.width, MIN_W));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Biggest faller first: the posts that use these charts are about what
  // left 4v4, so the subject of the paragraph above should be the top row.
  const rows = useMemo(() => [...data.rows].sort((a, b) => a.diff - b.diff), []);
  const height = M.top + M.bottom + rows.length * ROW;
  const x = useMemo(
    () =>
      d3
        .scaleLinear()
        .domain([0, d3.max(rows, (r) => Math.max(r.solo, r.four)) * 1.08])
        .range([M.left, width - M.right]),
    [width, rows]
  );

  return (
    <figure className="hm-figure" ref={wrapRef}>
      <figcaption className="hm-caption">
        <span className="hm-title">The same heroes, a different game</span>
        <span className="hm-sub">
          Share of all hero picks, {data.sample.soloPicks.toLocaleString()} in solo and{" "}
          {data.sample.fourPicks.toLocaleString()} in 4v4. Biggest faller first.
        </span>
      </figcaption>

      {showKey && <DumbbellKey unit="hero picks" />}

      <div className="hm-scroll">
        <svg width={width} height={height} role="img" className="hm-svg">
        <title>
          Hero pick rate in solo against 4v4. Aura and team-heal heroes rise in 4v4; duelists
          such as Demon Hunter and Naga Sea Witch fall sharply.
        </title>

      <defs>
        <marker
          id="hm-ar-up"
          viewBox="0 0 8 8"
          refX="7"
          refY="4"
          markerWidth="5"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L8,4 L0,8 z" fill={FOUR} />
        </marker>
        <marker
          id="hm-ar-down"
          viewBox="0 0 8 8"
          refX="7"
          refY="4"
          markerWidth="5"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L8,4 L0,8 z" fill={SOLO} />
        </marker>
      </defs>

        {x.ticks(5).map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={M.top} y2={height - M.bottom} stroke={chartColors.grid} />
            <text x={x(t)} y={height - M.bottom + 18} textAnchor="middle" className="hm-axis">
              {t}%
            </text>
          </g>
        ))}

        {rows.map((r, i) => {
          const cy = M.top + i * ROW + ROW / 2;
          const up = r.diff > 0;
          const sx = x(r.solo);
          const fx = x(r.four);
          // Measured in pixels, not data units: below a gap's worth plus the
          // dot, an arrowhead sits between two touching dots pointing at
          // nothing, and a shortened line would reach back past its own start.
          const moved = Math.abs(fx - sx) >= ARROW_GAP + DOT_R + 1;
          const on = hover === r.icon;
          return (
            <g
              key={r.icon}
              onMouseEnter={() => setHover(r.icon)}
              onMouseLeave={() => setHover(null)}
              className="hm-row"
            >
              <rect
                x={0}
                y={M.top + i * ROW}
                width={width}
                height={ROW}
                fill={on ? "rgba(255,255,255,0.04)" : "transparent"}
              />
              <text x={M.left - 12} y={cy} dy="0.32em" textAnchor="end" className="hm-name">
                {r.name}
              </text>
              {/* The connector carries the direction; the dots carry the levels */}
              {/* The arrow points at the 4v4 value, so the row reads as a move.
                  It stops short of the dot so the head and the mark stay legible. */}
              <line
                x1={sx}
                x2={fx + (moved ? (up ? -ARROW_GAP : ARROW_GAP) : 0)}
                y1={cy}
                y2={cy}
                stroke={up ? FOUR : SOLO}
                strokeOpacity={0.55}
                strokeWidth={2}
                markerEnd={moved ? (up ? "url(#hm-ar-up)" : "url(#hm-ar-down)") : undefined}
              />
              <circle cx={x(r.solo)} cy={cy} r={DOT_R} fill={SOLO} stroke="rgba(0,0,0,0.45)" strokeWidth={2} />
              <circle cx={x(r.four)} cy={cy} r={DOT_R} fill={FOUR} stroke="rgba(0,0,0,0.45)" strokeWidth={2} />
              <text
                x={Math.max(x(r.solo), x(r.four)) + 10}
                y={cy}
                dy="0.32em"
                className="hm-diff"
                fill={up ? FOUR : SOLO}
              >
                {up ? "+" : ""}
                {r.diff.toFixed(1)}
              </text>
            </g>
          );
        })}

        <text
          x={(width - M.right + M.left) / 2}
          y={height - 6}
          textAnchor="middle"
          className="hm-axis-title"
        >
          share of hero picks
        </text>
        </svg>
      </div>

      <div className="hm-readout" aria-live="polite">
        {hover ? (
          (() => {
            const r = rows.find((v) => v.icon === hover);
            return (
              <>
                <strong>{r.name}</strong> · solo {r.solo.toFixed(1)}% · 4v4 {r.four.toFixed(1)}% ·{" "}
                {r.diff > 0 ? "+" : ""}
                {r.diff.toFixed(1)} points in 4v4
              </>
            );
          })()
        ) : (
          <>
            {data.sample.soloGames.toLocaleString()} solo games and{" "}
            {data.sample.fourGames.toLocaleString()} 4v4 games, season 25
          </>
        )}
      </div>
    </figure>
  );
}
