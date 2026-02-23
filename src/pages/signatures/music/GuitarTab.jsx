import React from "react";
import { GOLD, GOLD_DIM, GREY, GREY_MID, safeMax } from "../vizUtils";

/**
 * GuitarTab — 6 strings = 6 action types, "fret numbers" from hotkey groups.
 * Tempo bins determine horizontal spacing of note clusters.
 */
export default function GuitarTab({ segments }) {
  const W = 300, H = 110;
  const { action = Array(6).fill(0), hotkey = Array(20).fill(0), tempo = Array(7).fill(0) } = segments || {};

  const maxAction = safeMax(action);
  const selectFreqs = hotkey.slice(0, 10);
  const maxHK = safeMax(selectFreqs);
  const maxTempo = safeMax(tempo);

  const padL = 28, padR = 10;
  const stringTop = 18, stringBot = 88;
  const stringSpacing = (stringBot - stringTop) / 5;
  const stringY = Array.from({ length: 6 }, (_, i) => stringTop + i * stringSpacing);
  const stringLabels = ["R", "A", "B", "I", "S", "G"]; // action types as "strings"

  const elements = [];

  // Draw 6 strings
  stringY.forEach((y, i) => {
    const thickness = 0.3 + (action[i] / maxAction) * 0.8;
    elements.push(
      <line key={`str-${i}`} x1={padL} y1={y} x2={W - padR} y2={y}
        stroke={GREY} strokeWidth={thickness} opacity="0.4" />
    );
    elements.push(
      <text key={`sl-${i}`} x={padL - 4} y={y + 3}
        textAnchor="end" fill={GREY} fontSize="7" fontFamily="Inconsolata, monospace">{stringLabels[i]}</text>
    );
  });

  // Place "fret numbers" based on tempo bins × hotkey groups
  // Each tempo bin = a vertical position along the tab
  const colWidth = (W - padL - padR) / tempo.length;

  tempo.forEach((tVal, col) => {
    if (tVal < 0.02) return;
    const x = padL + col * colWidth + colWidth / 2;

    // For each string, show a fret number if the action type has meaningful frequency
    action.forEach((aVal, str) => {
      if (aVal < 0.02) return;
      // Pick which hotkey group to show (highest active one weighted by tempo)
      const groupIdx = Math.round((col + str) % 10);
      const hkVal = selectFreqs[groupIdx];
      if (hkVal < 0.01) return;

      const fretNum = Math.round(hkVal / maxHK * 12);
      const opacity = 0.3 + (aVal / maxAction) * 0.4 + (tVal / maxTempo) * 0.3;

      elements.push(
        <text key={`fret-${col}-${str}`}
          x={x} y={stringY[str] + 3}
          textAnchor="middle" dominantBaseline="central"
          fill={GOLD} fontSize="8" fontFamily="Inconsolata, monospace"
          fontWeight="bold" opacity={Math.min(opacity, 1)}
        >
          {fretNum}
        </text>
      );
    });

    // Tempo column label
    elements.push(
      <text key={`tcl-${col}`} x={x} y={H - 2}
        textAnchor="middle" fill={GREY_MID} fontSize="5" fontFamily="Inconsolata, monospace">
        {["<50", "50", "100", "200", "500", "1k", "2k+"][col]}
      </text>
    );
  });

  // TAB label
  elements.push(
    <text key="tab-label" x={padL - 4} y={stringTop - 6}
      textAnchor="end" fill={GOLD_DIM} fontSize="8" fontFamily="Inconsolata, monospace" fontWeight="bold">TAB</text>
  );

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      {elements}
    </svg>
  );
}
