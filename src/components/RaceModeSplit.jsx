import React, { useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { chartColors } from "../lib/design-tokens";
import DumbbellKey from "./DumbbellKey";
import data from "../lib/data/raceModeSplit.json";

/**
 * Which race each mode picks.
 *
 * Same dumbbell grammar as the hero chart on purpose: once a reader has
 * learned to read one of them, the second costs nothing.
 *
 * Win rate is deliberately not plotted. Every race sits inside 1.2 points of
 * 50% in both modes, which is what matchmaking is for, so a chart of it would
 * be five identical bars pretending to be a finding. It belongs in a sentence.
 */

const SOLO = chartColors.blue;
const FOUR = chartColors.gold;
const M = { top: 8, right: 56, bottom: 44, left: 108 };
const ARROW_GAP = 14.0;
// Below this the names eat the plot, so the chart scrolls instead.
const MIN_W = 460;
const DOT_R = 5;
const ROW = 34;

export default function RaceModeSplit({ showKey = true }) {
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
  const faller = rows[0];
  const riser = rows[rows.length - 1];
  const x = useMemo(
    () =>
      d3
        .scaleLinear()
        .domain([0, d3.max(rows, (r) => Math.max(r.solo, r.four)) * 1.1])
        .range([M.left, width - M.right]),
    [width, rows]
  );

  return (
    <figure className="hm-figure" ref={wrapRef}>
      <figcaption className="hm-caption">
        <span className="hm-title">In 4v4, the most popular choice is not to choose</span>
        <span className="hm-sub">
          Share of player slots across {data.sample.soloGames.toLocaleString()} solo and{" "}
          {data.sample.fourGames.toLocaleString()} 4v4 games, season 25.
        </span>
      </figcaption>

      {showKey && <DumbbellKey unit="player slots" />}

      <div className="hm-scroll">
        <svg width={width} height={height} role="img" className="hm-svg">
        <title>
          Race pick rate in solo against 4v4. {riser.name} rises from {riser.solo}% to{" "}
          {riser.four}%; {faller.name} falls from {faller.solo}% to {faller.four}%.
        </title>

      <defs>
        <marker
          id="rm-ar-up"
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
          id="rm-ar-down"
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
          const on = hover === r.name;
          return (
            <g
              key={r.name}
              onMouseEnter={() => setHover(r.name)}
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
                markerEnd={moved ? (up ? "url(#rm-ar-up)" : "url(#rm-ar-down)") : undefined}
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
          share of player slots
        </text>
        </svg>
      </div>

      <div className="hm-readout" aria-live="polite">
        {hover ? (
          (() => {
            const r = rows.find((v) => v.name === hover);
            return (
              <>
                <strong>{r.name}</strong> · solo {r.solo}% picked, {r.soloWin}% won · 4v4 {r.four}%
                picked, {r.fourWin}% won
              </>
            );
          })()
        ) : (
          <>Every race wins between 48.8% and 51.0% in both modes, so none of this is strength</>
        )}
      </div>
    </figure>
  );
}
