import React, { useEffect, useMemo, useRef, useState } from "react";
import { scaleLinear } from "d3";
import { chartColors } from "../../lib/design-tokens";

/**
 * Vertical MMR beeswarm for the chat Pulse column: MMR on the y axis on
 * the site's fixed 900..2600 scale (ticks every 300 down the left), one
 * 4px dot per player spread sideways by a deterministic dodge layout (no
 * simulation: dots are sorted by MMR and each takes the innermost x that
 * clears every already-placed neighbour, alternating sides). In-game dots
 * are gold, the rest white at 0.75; watched players wear a gold ring.
 * Hover shows name and MMR (native title); click calls onPlayerClick(tag).
 * Fills its host (ResizeObserver) and renders nothing until measured.
 */

export const MMR_DOMAIN = [900, 2600];
export const TICK_STEP = 300;
const R = 4; // dot radius
const GAP = 1; // px between dot edges
const RING_R = R + 2.5;
const AXIS_W = 40; // left gutter for tick text
const PAD = { top: 10, right: 12, bottom: 10 };

/** Deterministic dodge: points sorted by y, each placed at the smallest |x| that clears its neighbours. */
export function dodge(points, radius, halfWidth) {
  const minDist = radius * 2 + GAP;
  const sorted = [...points].sort((a, b) => a.y - b.y || a.tag.localeCompare(b.tag));
  const placed = [];
  for (const p of sorted) {
    const neighbours = placed.filter((q) => Math.abs(q.y - p.y) < minDist);
    const candidates = [0];
    for (const q of neighbours) {
      const dx = Math.sqrt(minDist * minDist - (q.y - p.y) ** 2);
      candidates.push(q.x + dx, q.x - dx);
    }
    const clear = (x) => neighbours.every((q) => Math.hypot(q.x - x, q.y - p.y) >= minDist - 1e-6);
    let x = candidates
      .filter(clear)
      .sort((a, b) => Math.abs(a) - Math.abs(b) || a - b)[0];
    if (x === undefined) x = 0;
    x = Math.max(-halfWidth, Math.min(halfWidth, x));
    placed.push({ ...p, x });
  }
  return placed;
}

export const ticks = () => {
  const out = [];
  for (let v = MMR_DOMAIN[0]; v <= MMR_DOMAIN[1]; v += TICK_STEP) out.push(v);
  return out;
};

const dotStyle = { transition: "cx 0.6s ease, cy 0.6s ease" };

export default function MmrBeeswarmV({ players, inGameTags = null, watchList = null, onPlayerClick = null }) {
  const hostRef = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!hostRef.current || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) setSize({ width: Math.floor(rect.width), height: Math.floor(rect.height) });
    });
    observer.observe(hostRef.current);
    return () => observer.disconnect();
  }, []);

  const { width, height } = size;
  const y = useMemo(
    () => scaleLinear().domain(MMR_DOMAIN).range([height - PAD.bottom, PAD.top]).clamp(true),
    [height],
  );
  const centerX = AXIS_W + (width - AXIS_W - PAD.right) / 2;
  const halfWidth = Math.max(0, (width - AXIS_W - PAD.right) / 2 - R);

  const dots = useMemo(() => {
    if (!width || !height || !players?.length) return [];
    const points = players.map((p) => ({
      tag: p.battleTag,
      name: p.name || p.battleTag.split("#")[0],
      mmr: p.mmr,
      y: y(p.mmr),
      inGame: Boolean(inGameTags?.has(p.battleTag)),
      watched: Boolean(watchList?.has(p.battleTag.toLowerCase())),
    }));
    return dodge(points, R, halfWidth);
  }, [players, inGameTags, watchList, width, height, y, halfWidth]);

  return (
    <div ref={hostRef} data-beeswarm style={{ position: "relative", width: "100%", height: "100%", minHeight: 0 }}>
      {width > 0 && height > 0 && (
        <svg width={width} height={height} style={{ display: "block" }} role="img" aria-label="Channel MMR distribution">
          <g data-axis pointerEvents="none">
            {ticks().map((v) => (
              <g key={v} data-tick={v}>
                <line x1={AXIS_W} x2={width - PAD.right} y1={y(v)} y2={y(v)} stroke={chartColors.grid} strokeWidth={1} />
                <text
                  x={AXIS_W - 6}
                  y={y(v) + 3.5}
                  textAnchor="end"
                  fontSize="var(--text-xxxs)"
                  fontFamily="var(--font-mono)"
                  fill="var(--grey-light)"
                >
                  {v}
                </text>
              </g>
            ))}
            <line x1={centerX} x2={centerX} y1={PAD.top} y2={height - PAD.bottom} stroke={chartColors.grid} strokeWidth={1} />
          </g>
          <g data-dots>
            {dots.map((d) => (
              <g
                key={d.tag}
                data-dot={d.tag}
                data-ingame={d.inGame ? "true" : undefined}
                data-watched={d.watched ? "true" : undefined}
                style={{ cursor: onPlayerClick ? "pointer" : "default" }}
                onClick={onPlayerClick ? () => onPlayerClick(d.tag) : undefined}
              >
                <title>{`${d.name} · ${Math.round(d.mmr)}${d.inGame ? " · in game" : ""}`}</title>
                {d.watched && (
                  <circle data-ring cx={centerX + d.x} cy={d.y} r={RING_R} fill="none" stroke="var(--gold)" strokeWidth={1.5} style={dotStyle} />
                )}
                <circle cx={centerX + d.x} cy={d.y} r={R} fill={d.inGame ? chartColors.gold : chartColors.dot} style={dotStyle} />
              </g>
            ))}
          </g>
        </svg>
      )}
    </div>
  );
}
