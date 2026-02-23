import React from "react";
import { GOLD, GOLD_DIM, GREY, GREY_MID, polarToCart, safeMax } from "../vizUtils";

/**
 * TreeRings — Concentric rings per segment, modulated by data values.
 * Inner rings = high-weight segments, outer = low-weight.
 * Cracks/marks from transition patterns.
 */
export default function TreeRings({ segments }) {
  const W = 200, H = 200;
  const cx = W / 2, cy = H / 2;
  const {
    action = Array(6).fill(0),
    apm = [0, 0, 0],
    hotkey = Array(20).fill(0),
    tempo = Array(7).fill(0),
    intensity = [0, 0],
    transitions = Array(10).fill(0),
    rhythm = Array(15).fill(0),
  } = segments || {};

  const elements = [];

  // Segment order by weight (innermost = highest weight)
  const segmentRings = [
    { data: rhythm.slice(0, 10), color: GOLD, label: "RHY" },
    { data: transitions, color: GOLD_DIM, label: "TRN" },
    { data: hotkey.slice(0, 10), color: GOLD, label: "HK" },
    { data: intensity, color: "#c084fc", label: "INT" },
    { data: apm, color: "#4ade80", label: "APM" },
    { data: tempo, color: "#f87171", label: "TMP" },
    { data: action, color: "#3b82f6", label: "ACT" },
  ];

  const minR = 12;
  const maxR = 88;
  const ringGap = (maxR - minR) / segmentRings.length;

  segmentRings.forEach((seg, si) => {
    const baseR = minR + si * ringGap;
    const data = seg.data;
    const maxVal = safeMax(data);

    // Draw ring as a polygon with radius modulated by data values
    const numPoints = Math.max(data.length * 4, 36);
    const points = [];
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      const dataIdx = Math.floor((i / numPoints) * data.length) % data.length;
      const nextIdx = (dataIdx + 1) % data.length;
      const t = ((i / numPoints) * data.length) % 1;
      const val = data[dataIdx] * (1 - t) + data[nextIdx] * t;
      const wobble = (val / maxVal) * ringGap * 0.5;
      const r = baseR + ringGap * 0.3 + wobble;
      points.push(polarToCart(cx, cy, r, angle));
    }

    const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";
    elements.push(
      <path key={`ring-${si}`} d={pathD}
        fill="none" stroke={seg.color} strokeWidth="1"
        opacity={0.3 + (si / segmentRings.length) * 0.3} />
    );
  });

  // Radial cracks from transitions
  const maxTrans = safeMax(transitions);
  transitions.forEach((v, i) => {
    if (v < 0.03) return;
    const angle = (i / transitions.length) * Math.PI * 2;
    const innerR = minR + 5;
    const outerR = minR + (v / maxTrans) * (maxR - minR) * 0.8;
    const inner = polarToCart(cx, cy, innerR, angle);
    const outer = polarToCart(cx, cy, outerR, angle);
    elements.push(
      <line key={`crack-${i}`} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
        stroke={GREY_MID} strokeWidth="0.5" opacity={0.3 + (v / maxTrans) * 0.3} />
    );
  });

  // Center dot (heartwood)
  elements.push(
    <circle key="center" cx={cx} cy={cy} r={minR - 2}
      fill={GOLD} opacity="0.15" />
  );
  elements.push(
    <circle key="center-dot" cx={cx} cy={cy} r="2" fill={GOLD} opacity="0.6" />
  );

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      {elements}
    </svg>
  );
}
