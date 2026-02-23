import React from "react";
import { GOLD, GOLD_DIM, BLUE, GREEN, RED, GREY, GREY_MID, lerpColor } from "../vizUtils";

/**
 * ChromosomeBanding — Vertical banded bar showing all 63 dimensions as horizontal bands.
 * Each segment gets its own color palette. Constriction (centromere) between segments.
 */

const SEGMENT_COLORS = {
  action: ["#1a1a2e", BLUE],
  apm: ["#1a1a2e", GREEN],
  hotkey: ["#1a1a2e", GOLD],
  tempo: ["#1a1a2e", RED],
  intensity: ["#1a1a2e", "#c084fc"],
  transitions: ["#1a1a2e", GOLD_DIM],
  rhythm: ["#1a1a2e", "#f472b6"],
};

const SEGMENT_ORDER = ["action", "apm", "hotkey", "tempo", "intensity", "transitions", "rhythm"];
const SEGMENT_LABELS = ["ACT", "APM", "HK", "TMP", "INT", "TRN", "RHY"];

export default function ChromosomeBanding({ segments }) {
  const W = 100, H = 280;
  if (!segments) return <svg viewBox={`0 0 ${W} ${H}`} width="100%" />;

  const allBands = [];
  let y = 12;
  const bandH = 3;
  const gap = 1;
  const chrW = 36;
  const cx = W / 2;

  SEGMENT_ORDER.forEach((seg, si) => {
    const data = segments[seg] || [];
    if (data.length === 0) return;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const [cLow, cHigh] = SEGMENT_COLORS[seg];

    // Centromere constriction between segments
    if (si > 0) {
      allBands.push(
        <ellipse
          key={`cent-${si}`}
          cx={cx}
          cy={y + 1}
          rx={chrW / 2 - 6}
          ry={2}
          fill="none"
          stroke={GREY_MID}
          strokeWidth="0.5"
        />
      );
      y += 5;
    }

    // Segment label
    allBands.push(
      <text
        key={`label-${si}`}
        x={cx + chrW / 2 + 6}
        y={y + (data.length * (bandH + gap)) / 2 + 3}
        fill={GREY}
        fontSize="7"
        fontFamily="Inconsolata, monospace"
      >
        {SEGMENT_LABELS[si]}
      </text>
    );

    data.forEach((v, i) => {
      const t = (v - min) / range;
      const color = lerpColor(cLow, cHigh, t);
      // Chromosome shape: slightly narrower at ends
      const distFromCenter = Math.abs(i - data.length / 2) / (data.length / 2);
      const w = chrW * (1 - distFromCenter * 0.15);
      allBands.push(
        <rect
          key={`band-${seg}-${i}`}
          x={cx - w / 2}
          y={y}
          width={w}
          height={bandH}
          fill={color}
          rx="1.5"
          opacity={0.7 + t * 0.3}
        />
      );
      y += bandH + gap;
    });
  });

  return (
    <svg viewBox={`0 0 ${W} ${y + 8}`} width="100%">
      {/* Chromosome outline */}
      <rect
        x={cx - chrW / 2 - 2}
        y={8}
        width={chrW + 4}
        height={y - 4}
        fill="none"
        stroke={GREY_MID}
        strokeWidth="0.5"
        rx="8"
        opacity="0.3"
      />
      {allBands}
    </svg>
  );
}
