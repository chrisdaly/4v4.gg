import React, { useId } from "react";
import { GOLD, GOLD_DIM, GREY, GREY_MID, polarToCart, safeMax, TRAIT_COLORS } from "../vizUtils";

/**
 * ChordDiagram — Circular arcs for hotkey groups + ribbons for transitions.
 * Each group gets an arc proportional to its frequency.
 * Ribbons connect groups based on transition frequency.
 */
export default function ChordDiagram({ segments }) {
  const W = 220, H = 220;
  const cx = W / 2, cy = H / 2;
  const id = useId();
  const { hotkey = Array(20).fill(0), transitions = Array(10).fill(0) } = segments || {};

  const selectFreqs = hotkey.slice(0, 10);
  const total = selectFreqs.reduce((s, v) => s + v, 0) || 1;
  const maxTrans = safeMax(transitions);
  const outerR = 85;
  const innerR = 75;
  const gap = 0.02; // radians gap between arcs

  const elements = [];

  // Compute arc angles
  const arcs = [];
  let currentAngle = -Math.PI / 2;
  selectFreqs.forEach((freq, i) => {
    const arcLen = (freq / total) * (Math.PI * 2 - gap * 10);
    arcs.push({
      startAngle: currentAngle,
      endAngle: currentAngle + arcLen,
      midAngle: currentAngle + arcLen / 2,
      freq,
      idx: i,
    });
    currentAngle += arcLen + gap;
  });

  // Draw arcs
  arcs.forEach((arc, i) => {
    const s1 = polarToCart(cx, cy, outerR, arc.startAngle);
    const e1 = polarToCart(cx, cy, outerR, arc.endAngle);
    const s2 = polarToCart(cx, cy, innerR, arc.endAngle);
    const e2 = polarToCart(cx, cy, innerR, arc.startAngle);
    const largeArc = (arc.endAngle - arc.startAngle) > Math.PI ? 1 : 0;

    const pathD = [
      `M ${s1.x} ${s1.y}`,
      `A ${outerR} ${outerR} 0 ${largeArc} 1 ${e1.x} ${e1.y}`,
      `L ${s2.x} ${s2.y}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${e2.x} ${e2.y}`,
      "Z",
    ].join(" ");

    const color = TRAIT_COLORS[i % TRAIT_COLORS.length];
    elements.push(
      <path key={`arc-${i}`} d={pathD} fill={color} opacity="0.6" stroke="none" />
    );

    // Label
    if (arc.endAngle - arc.startAngle > 0.15) {
      const labelPt = polarToCart(cx, cy, outerR + 10, arc.midAngle);
      elements.push(
        <text key={`label-${i}`} x={labelPt.x} y={labelPt.y}
          textAnchor="middle" dominantBaseline="central"
          fill={GREY} fontSize="7" fontFamily="Inconsolata, monospace">{i}</text>
      );
    }
  });

  // Draw ribbons (chords) for transitions
  transitions.forEach((v, i) => {
    if (v < 0.02) return;
    const fromIdx = i % arcs.length;
    const toIdx = (i + 1 + Math.floor(i / 2)) % arcs.length;
    if (fromIdx === toIdx) return;

    const from = arcs[fromIdx];
    const to = arcs[toIdx];
    const fromPt = polarToCart(cx, cy, innerR, from.midAngle);
    const toPt = polarToCart(cx, cy, innerR, to.midAngle);

    // Quadratic bezier through center
    const ribbonPath = `M ${fromPt.x} ${fromPt.y} Q ${cx} ${cy} ${toPt.x} ${toPt.y}`;
    elements.push(
      <path key={`chord-${i}`} d={ribbonPath}
        fill="none" stroke={GOLD} strokeWidth={0.5 + (v / maxTrans) * 3}
        opacity={0.15 + (v / maxTrans) * 0.35} strokeLinecap="round" />
    );
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      {elements}
    </svg>
  );
}
