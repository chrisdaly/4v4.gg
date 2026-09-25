import React from "react";
import styled, { css } from "styled-components";

/**
 * One 7px dot per rated player on a 1200..2200+ MMR axis, stacked upwards
 * per ~30-MMR column: gold fill = in a game, hollow = waiting, a dashed
 * line at the median. The chat roster and the home page's "Online by MMR"
 * share it.
 *
 * Props
 *   users        [{ battleTag, name }]
 *   stats        Map battleTag -> { mmr }
 *   inGameTags   Set of battleTags in a game
 *   axis         "roster" (<1300 / 1600 / 1900 / 2200+), "range"
 *                (1,200 / median N / 2,200+) or false for none
 *   animate      fade the dots in low to high (15ms stagger), once
 */

const STRIP_MIN = 1200; // MMR at the left edge
const STRIP_SPAN = 1000; // MMR across the strip (1200..2200+)
const STRIP_COLS = 33; // ~30 MMR per stacking column
const DOT = 7; // px
const DOT_STEP = 8; // px between stacked dots
const STAGGER_MS = 15;

const stripX = (mmr) => Math.max(0, Math.min(100, ((mmr - STRIP_MIN) / STRIP_SPAN) * 100));

/**
 * stripDots(users, stats, inGameTags) -> { dots: [{ tag, name, mmr, x, y,
 * inGame }], height, median, medianMmr } with x and median as percents, y
 * in px from the baseline (median null with nobody rated).
 */
export function stripDots(users, stats, inGameTags) {
  const rated = (users || [])
    .map((u) => ({ tag: u.battleTag, name: u.name, mmr: stats?.get(u.battleTag)?.mmr }))
    .filter((d) => d.mmr != null)
    .sort((a, b) => a.mmr - b.mmr);
  const columns = new Map();
  const dots = rated.map((d) => {
    const x = stripX(d.mmr);
    const col = Math.round((x / 100) * STRIP_COLS);
    const level = columns.get(col) || 0;
    columns.set(col, level + 1);
    return { ...d, x, y: level * DOT_STEP + 1, inGame: Boolean(inGameTags?.has(d.tag)) };
  });
  const tallest = Math.max(1, ...columns.values());
  const medianMmr = rated.length ? rated[Math.floor(rated.length / 2)].mmr : null;
  return { dots, height: tallest * DOT_STEP + 4, median: medianMmr == null ? null : stripX(medianMmr), medianMmr };
}

const Area = styled.div`
  position: relative;
  height: ${(p) => p.$height}px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
`;

const MedianLine = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  left: ${(p) => p.$x}%;
  border-left: 1px dashed rgba(255, 255, 255, 0.35);
`;

const Dot = styled.span`
  position: absolute;
  left: ${(p) => p.$x}%;
  bottom: ${(p) => p.$y}px;
  width: ${DOT}px;
  height: ${DOT}px;
  margin-left: ${-DOT / 2}px;
  box-sizing: border-box;
  border-radius: var(--radius-full);
  border: 1.5px solid var(--gold);
  background: ${(p) => (p.$on ? "var(--gold)" : "transparent")};
  ${(p) =>
    p.$animate &&
    css`
      opacity: 0;
      animation: mmrDotIn 0.4s ease forwards;
      animation-delay: ${p.$delay}ms;
      @keyframes mmrDotIn {
        to {
          opacity: 1;
        }
      }
    `}
`;

const Axis = styled.div`
  display: flex;
  justify-content: space-between;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--grey-light);
  opacity: 0.6;
  padding-top: 4px;
`;

export default function MmrDotStrip({ users, stats, inGameTags, axis = "roster", animate = false, className }) {
  const strip = stripDots(users, stats, inGameTags);
  return (
    <div className={className} data-mmr-strip>
      <Area $height={strip.height} data-strip-height={strip.height}>
        {strip.median != null && <MedianLine $x={strip.median} data-strip-median={strip.median.toFixed(1)} />}
        {strip.dots.map((d, i) => (
          <Dot
            key={d.tag}
            data-strip-dot={d.tag}
            data-strip-in-game={d.inGame ? "true" : undefined}
            title={`${d.name} · ${Math.round(d.mmr)}${d.inGame ? " · in game" : ""}`}
            $x={d.x}
            $y={d.y}
            $on={d.inGame}
            $animate={animate}
            $delay={i * STAGGER_MS}
          />
        ))}
      </Area>
      {axis === "roster" && (
        <Axis>
          <span>&lt;1300</span>
          <span>1600</span>
          <span>1900</span>
          <span>2200+</span>
        </Axis>
      )}
      {axis === "range" && (
        <Axis>
          <span>1,200</span>
          {strip.medianMmr != null && <span data-strip-median-label>median {Math.round(strip.medianMmr).toLocaleString("en-US")}</span>}
          <span>2,200+</span>
        </Axis>
      )}
    </div>
  );
}
