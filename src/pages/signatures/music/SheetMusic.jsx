import React from "react";
import { GOLD, GOLD_DIM, GREY, GREY_MID, safeMax } from "../vizUtils";

/**
 * SheetMusic — 5-line musical staff with notes per action type.
 * Note position (line) = action type, note size = frequency.
 * Rhythm data creates beam groups and rest markers.
 */
export default function SheetMusic({ segments }) {
  const W = 300, H = 120;
  const { action = Array(6).fill(0), rhythm = Array(15).fill(0), apm = [0, 0, 0] } = segments || {};

  const maxAction = safeMax(action);
  const padL = 30, padR = 10;
  const staffTop = 25, staffBot = 85;
  const lineSpacing = (staffBot - staffTop) / 4;
  const staffLines = Array.from({ length: 5 }, (_, i) => staffTop + i * lineSpacing);

  // Map 6 action types to staff positions (line indices, can be between lines)
  const notePositions = [0, 0.5, 1, 2, 3, 4]; // R-CLK, ABL, BLD, ITM, SEL, ASN
  const noteLabels = ["R", "A", "B", "I", "S", "G"];

  // Generate notes spread across the staff width
  const noteCount = 6;
  const noteSpacing = (W - padL - padR) / (noteCount + 1);

  const elements = [];

  // Staff lines
  staffLines.forEach((y, i) => {
    elements.push(
      <line key={`staff-${i}`} x1={padL - 5} y1={y} x2={W - padR} y2={y}
        stroke={GREY_MID} strokeWidth="0.5" />
    );
  });

  // Clef area (treble clef symbol simplified)
  elements.push(
    <text key="clef" x={padL - 2} y={staffTop + lineSpacing * 2 + 4}
      fill={GOLD} fontSize="28" fontFamily="serif" opacity="0.4">&#119070;</text>
  );

  // Bar lines
  [0, 3].forEach((i) => {
    const x = padL + (i + 0.5) * noteSpacing * 2 + noteSpacing;
    if (x < W - padR) {
      elements.push(
        <line key={`bar-${i}`} x1={x} y1={staffTop} x2={x} y2={staffBot}
          stroke={GREY} strokeWidth="0.5" />
      );
    }
  });

  // Notes
  action.forEach((v, i) => {
    const x = padL + (i + 1) * noteSpacing;
    const linePos = notePositions[i];
    const y = staffTop + linePos * lineSpacing;
    const r = 3 + (v / maxAction) * 5;
    const filled = v / maxAction > 0.3;

    // Ledger line if above or below staff
    if (linePos < 0 || linePos > 4) {
      elements.push(
        <line key={`ledger-${i}`} x1={x - r - 3} y1={y} x2={x + r + 3} y2={y}
          stroke={GREY_MID} strokeWidth="0.5" />
      );
    }

    // Note head
    elements.push(
      <ellipse key={`note-${i}`} cx={x} cy={y} rx={r} ry={r * 0.7}
        fill={filled ? GOLD : "none"} stroke={GOLD}
        strokeWidth="1" opacity={0.5 + (v / maxAction) * 0.5}
        transform={`rotate(-10, ${x}, ${y})`} />
    );

    // Stem
    const stemDir = linePos < 2 ? 1 : -1;
    elements.push(
      <line key={`stem-${i}`} x1={x + (stemDir > 0 ? r : -r)} y1={y}
        x2={x + (stemDir > 0 ? r : -r)} y2={y + stemDir * 25}
        stroke={GOLD} strokeWidth="0.8" opacity={0.6} />
    );

    // Accent dot for high-frequency actions
    if (v / maxAction > 0.7) {
      elements.push(
        <circle key={`accent-${i}`} cx={x + r + 4} cy={y} r="1.5" fill={GOLD} opacity="0.7" />
      );
    }
  });

  // Rhythm marks at bottom — small beat indicators from rhythm trigrams
  const trigrams = rhythm.slice(0, 10);
  const maxTri = safeMax(trigrams);
  trigrams.forEach((v, i) => {
    if (v < 0.01) return;
    const x = padL + ((i + 0.5) / 10) * (W - padL - padR);
    const h = 2 + (v / maxTri) * 8;
    elements.push(
      <rect key={`beat-${i}`} x={x - 1} y={staffBot + 8} width={2} height={h}
        fill={GOLD_DIM} opacity={0.4 + (v / maxTri) * 0.4} rx="0.5" />
    );
  });

  // Tempo marking
  elements.push(
    <text key="tempo" x={padL} y={staffTop - 8}
      fill={GREY} fontSize="7" fontFamily="Inconsolata, monospace">
      &#9833; = {(60 + (apm[0] || 0) * 200).toFixed(0)}
    </text>
  );

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      {elements}
    </svg>
  );
}
