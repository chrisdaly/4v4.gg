import React from "react";
import { GOLD, GOLD_DIM, GREY, GREY_MID, polarToCart, safeMax, seededRandom, hashCode } from "../vizUtils";

/**
 * GeometricTattoo — Sacred geometry mandala.
 * Hexagonal core from action types, radial lines from hotkey groups,
 * petal/arc decorations from tempo and rhythm, outer ring from embedding.
 */
export default function GeometricTattoo({ segments, embedding, battleTag }) {
  const W = 220, H = 220;
  const cx = W / 2, cy = H / 2;
  const {
    action = Array(6).fill(0),
    hotkey = Array(20).fill(0),
    tempo = Array(7).fill(0),
    rhythm = Array(15).fill(0),
    intensity = [0, 0],
  } = segments || {};

  const rand = seededRandom(hashCode(battleTag || "default"));
  const elements = [];

  // 1. Hexagonal core — 6 vertices from action distribution
  const maxAction = safeMax(action);
  const coreR = 20;
  const hexPoints = action.map((v, i) => {
    const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
    const r = coreR * 0.5 + (v / maxAction) * coreR * 0.5;
    return polarToCart(cx, cy, r, angle);
  });
  const hexPath = hexPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";
  elements.push(
    <path key="hex" d={hexPath} fill={GOLD} fillOpacity="0.1" stroke={GOLD} strokeWidth="1" />,
    <circle key="center" cx={cx} cy={cy} r="2" fill={GOLD} opacity="0.6" />
  );

  // 2. Radial lines from hotkey select groups
  const selectFreqs = hotkey.slice(0, 10);
  const maxHK = safeMax(selectFreqs);
  selectFreqs.forEach((v, i) => {
    if (v < 0.02) return;
    const angle = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const len = 30 + (v / maxHK) * 50;
    const end = polarToCart(cx, cy, len, angle);
    elements.push(
      <line key={`ray-${i}`} x1={cx} y1={cy} x2={end.x} y2={end.y}
        stroke={GOLD} strokeWidth={0.5 + (v / maxHK) * 1} opacity={0.3 + (v / maxHK) * 0.4}
        strokeLinecap="round" />
    );
    // Dot at end
    elements.push(
      <circle key={`rdot-${i}`} cx={end.x} cy={end.y} r={1 + (v / maxHK) * 2}
        fill={GOLD} opacity={0.4 + (v / maxHK) * 0.4} />
    );
  });

  // 3. Concentric guide rings
  [35, 55, 75].forEach((r, i) => {
    elements.push(
      <circle key={`ring-${i}`} cx={cx} cy={cy} r={r}
        fill="none" stroke={GREY_MID} strokeWidth="0.3" />
    );
  });

  // 4. Petal arcs from tempo bins
  const maxTempo = safeMax(tempo);
  tempo.forEach((v, i) => {
    if (v < 0.02) return;
    const startAngle = (i / 7) * Math.PI * 2 - Math.PI / 2;
    const endAngle = ((i + 0.8) / 7) * Math.PI * 2 - Math.PI / 2;
    const r = 55 + (v / maxTempo) * 20;
    const start = polarToCart(cx, cy, r, startAngle);
    const end = polarToCart(cx, cy, r, endAngle);
    elements.push(
      <path key={`petal-${i}`}
        d={`M ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${end.x} ${end.y}`}
        fill="none" stroke={GOLD_DIM} strokeWidth={1 + (v / maxTempo) * 2}
        opacity={0.3 + (v / maxTempo) * 0.5} strokeLinecap="round" />
    );
  });

  // 5. Outer decoration dots from rhythm
  const trigrams = rhythm.slice(0, 10);
  const maxTri = safeMax(trigrams);
  trigrams.forEach((v, i) => {
    if (v < 0.01) return;
    const angle = (i / 10) * Math.PI * 2 + rand() * 0.2 - Math.PI / 2;
    const r = 80 + rand() * 15;
    const pt = polarToCart(cx, cy, r, angle);
    elements.push(
      <circle key={`outer-${i}`} cx={pt.x} cy={pt.y} r={1 + (v / maxTri) * 2.5}
        fill="none" stroke={GOLD} strokeWidth="0.5" opacity={0.3 + (v / maxTri) * 0.4} />
    );
  });

  // 6. Embedding ring — if available, show as tiny dots around outer edge
  if (embedding && embedding.length > 0) {
    const min = Math.min(...embedding);
    const max = Math.max(...embedding);
    const range = max - min || 1;
    embedding.forEach((v, i) => {
      const angle = (i / embedding.length) * Math.PI * 2 - Math.PI / 2;
      const t = (v - min) / range;
      const pt = polarToCart(cx, cy, 98, angle);
      elements.push(
        <circle key={`emb-${i}`} cx={pt.x} cy={pt.y} r={0.5 + t * 1.5}
          fill={GOLD} opacity={0.2 + t * 0.5} />
      );
    });
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      {elements}
    </svg>
  );
}
