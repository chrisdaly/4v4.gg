import React from "react";
import { GOLD, GOLD_DIM, GREY, GREY_MID, polarToCart, safeMax } from "../vizUtils";

/**
 * VinylGroove — Spiral groove modulated by tempo, rhythm, and APM.
 * Like a vinyl record viewed from above. Groove wobble encodes tempo distribution,
 * groove depth/thickness encodes APM, pops/crackles from rhythm patterns.
 */
export default function VinylGroove({ segments }) {
  const W = 200, H = 200;
  const cx = W / 2, cy = H / 2;
  const { tempo = Array(7).fill(0), rhythm = Array(15).fill(0), apm = [0, 0, 0] } = segments || {};

  const maxTempo = safeMax(tempo);
  const maxRhythm = safeMax(rhythm);
  const elements = [];

  // Outer rim
  elements.push(
    <circle key="rim" cx={cx} cy={cy} r={90} fill="none" stroke={GREY_MID} strokeWidth="2" />
  );

  // Label area (center circle)
  const labelR = 22;
  elements.push(
    <circle key="label-bg" cx={cx} cy={cy} r={labelR} fill={GREY_MID} opacity="0.3" />,
    <circle key="spindle" cx={cx} cy={cy} r={3} fill={GOLD} opacity="0.6" />,
    <text key="label-text" x={cx} y={cy + labelR - 6} textAnchor="middle"
      fill={GREY} fontSize="5" fontFamily="Inconsolata, monospace" opacity="0.6">33 RPM</text>
  );

  // Spiral grooves
  const spiralTurns = 15;
  const spiralPoints = spiralTurns * 60;
  const minR = labelR + 3;
  const maxR = 85;

  const groovePoints = [];
  for (let i = 0; i < spiralPoints; i++) {
    const t = i / spiralPoints;
    const angle = t * spiralTurns * Math.PI * 2;
    const baseR = minR + t * (maxR - minR);

    // Modulate by tempo — different frequencies create wobble
    const tempoIdx = Math.floor((angle / (Math.PI * 2)) % tempo.length);
    const tempoVal = tempo[tempoIdx] / maxTempo;
    const wobble = Math.sin(angle * 7 * (1 + tempoVal * 3)) * tempoVal * 2;

    // Modulate by rhythm — creates subtle variations
    const rhythmIdx = Math.floor((i / spiralPoints) * rhythm.length) % rhythm.length;
    const rhythmVal = rhythm[rhythmIdx] / maxRhythm;
    const microWobble = Math.sin(angle * 23) * rhythmVal * 0.5;

    const r = baseR + wobble + microWobble;
    groovePoints.push(polarToCart(cx, cy, r, angle));
  }

  // Build path in segments for varying thickness
  const chunkSize = 10;
  for (let i = 0; i < groovePoints.length - chunkSize; i += chunkSize) {
    const chunk = groovePoints.slice(i, i + chunkSize + 1);
    let d = `M ${chunk[0].x} ${chunk[0].y}`;
    for (let j = 1; j < chunk.length; j++) {
      d += ` L ${chunk[j].x} ${chunk[j].y}`;
    }

    const t = i / groovePoints.length;
    const apmMod = 0.3 + (apm[0] || 0) * 0.7;
    const opacity = 0.15 + t * 0.25 * apmMod;

    elements.push(
      <path key={`groove-${i}`} d={d}
        fill="none" stroke={GOLD_DIM} strokeWidth={0.4 + apmMod * 0.4}
        opacity={opacity} strokeLinecap="round" />
    );
  }

  // "Pops" — scattered dots from rhythm trigrams
  const trigrams = rhythm.slice(0, 10);
  trigrams.forEach((v, i) => {
    if (v < 0.02) return;
    const angle = (i / 10) * Math.PI * 2 + Math.PI * 0.3;
    const r = minR + 10 + (i / 10) * (maxR - minR - 15);
    const pt = polarToCart(cx, cy, r, angle);
    elements.push(
      <circle key={`pop-${i}`} cx={pt.x} cy={pt.y} r={0.8 + v * 2}
        fill={GOLD} opacity={0.2 + v * 0.4} />
    );
  });

  // Highlight groove — the "playing" position
  const playAngle = Math.PI * 1.3;
  const playR = minR + 0.4 * (maxR - minR);
  const playPt = polarToCart(cx, cy, playR, playAngle);
  elements.push(
    <circle key="needle" cx={playPt.x} cy={playPt.y} r="2" fill={GOLD} opacity="0.8" />
  );

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      {/* Vinyl background */}
      <circle cx={cx} cy={cy} r={90} fill="#0a0a0a" />
      {elements}
    </svg>
  );
}
