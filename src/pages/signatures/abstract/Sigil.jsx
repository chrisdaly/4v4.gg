import React from "react";
import { GOLD, GOLD_DIM, GREY, GREY_MID, seededRandom, hashCode, polarToCart, safeMax } from "../vizUtils";

/**
 * Sigil — Rune/glyph generated from player data.
 * Central spine + crossbars from APM, diagonal strokes from hotkey usage,
 * small decorative marks from rhythm data.
 */
export default function Sigil({ segments, battleTag }) {
  const W = 200, H = 200;
  const cx = W / 2, cy = H / 2;
  const { apm = [0, 0, 0], action = Array(6).fill(0), hotkey = Array(20).fill(0), rhythm = Array(15).fill(0) } = segments || {};

  const rand = seededRandom(hashCode(battleTag || "default"));
  const elements = [];

  // Central spine — vertical line, height from APM
  const spineH = 40 + (apm[0] || 0) * 100;
  const spineTop = cy - spineH / 2;
  const spineBot = cy + spineH / 2;
  elements.push(
    <line key="spine" x1={cx} y1={spineTop} x2={cx} y2={spineBot}
      stroke={GOLD} strokeWidth="2" strokeLinecap="round" />
  );

  // Crossbars from action distribution (6 actions → up to 6 crossbars)
  const maxAction = safeMax(action);
  action.forEach((v, i) => {
    if (v < 0.01) return;
    const y = spineTop + ((i + 1) / (action.length + 1)) * spineH;
    const halfW = 10 + (v / maxAction) * 40;
    const offset = (rand() - 0.5) * 6;
    elements.push(
      <line key={`cross-${i}`}
        x1={cx - halfW + offset} y1={y}
        x2={cx + halfW + offset} y2={y}
        stroke={GOLD} strokeWidth={1 + (v / maxAction) * 1.5}
        strokeLinecap="round" opacity={0.5 + (v / maxAction) * 0.4}
      />
    );
  });

  // Diagonal strokes from hotkey select (10 groups)
  const selectFreqs = hotkey.slice(0, 10);
  const maxHK = safeMax(selectFreqs);
  selectFreqs.forEach((v, i) => {
    if (v < 0.02) return;
    const side = i % 2 === 0 ? -1 : 1;
    const yBase = spineTop + ((i + 0.5) / 10) * spineH;
    const len = 12 + (v / maxHK) * 35;
    const angle = (Math.PI / 6) + rand() * (Math.PI / 4);
    const dx = Math.cos(angle) * len * side;
    const dy = Math.sin(angle) * len * (rand() > 0.5 ? 1 : -1);
    elements.push(
      <line key={`diag-${i}`}
        x1={cx} y1={yBase}
        x2={cx + dx} y2={yBase + dy}
        stroke={GOLD_DIM} strokeWidth={0.8 + (v / maxHK) * 1.2}
        strokeLinecap="round" opacity={0.4 + (v / maxHK) * 0.4}
      />
    );
  });

  // Decorative dots from rhythm trigrams
  const trigrams = rhythm.slice(0, 10);
  const maxTri = safeMax(trigrams);
  trigrams.forEach((v, i) => {
    if (v < 0.01) return;
    const angle = ((i / 10) * Math.PI * 2) + rand() * 0.3;
    const dist = 55 + rand() * 25;
    const pt = polarToCart(cx, cy, dist, angle);
    const r = 1 + (v / maxTri) * 3;
    elements.push(
      <circle key={`dot-${i}`} cx={pt.x} cy={pt.y} r={r}
        fill={GOLD} opacity={0.3 + (v / maxTri) * 0.5} />
    );
  });

  // Top/bottom terminals
  const termSize = 3 + (apm[2] || 0) * 6;
  elements.push(
    <circle key="top-term" cx={cx} cy={spineTop - 4} r={termSize}
      fill="none" stroke={GOLD} strokeWidth="1" opacity="0.6" />,
    <circle key="bot-term" cx={cx} cy={spineBot + 4} r={termSize * 0.7}
      fill={GOLD} opacity="0.4" />
  );

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      {elements}
    </svg>
  );
}
