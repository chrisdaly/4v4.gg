import React from "react";
import { GOLD, GOLD_DIM, GREY, GREY_MID, safeMax, lerpColor } from "../vizUtils";

/**
 * PianoRoll — MIDI-style grid. Rows = 10 hotkey groups, Columns = 7 tempo bins.
 * Cell intensity = cross-product of hotkey frequency and tempo frequency.
 * Select groups on top half, assign groups on bottom half.
 */
export default function PianoRoll({ segments }) {
  const W = 280, H = 200;
  const { hotkey = Array(20).fill(0), tempo = Array(7).fill(0) } = segments || {};

  const selectFreqs = hotkey.slice(0, 10);
  const assignFreqs = hotkey.slice(10, 20);
  const maxSel = safeMax(selectFreqs);
  const maxAsn = safeMax(assignFreqs);
  const maxTempo = safeMax(tempo);

  const cols = 7;
  const rows = 10;
  const padL = 24, padR = 8, padT = 16, padB = 24;
  const cellW = (W - padL - padR) / cols;
  const cellH = (H - padT - padB) / (rows * 2 + 1); // +1 for divider

  const tempoLabels = ["<50", "50", "100", "200", "500", "1k", "2k+"];
  const cells = [];

  // Select groups (top half)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const hkVal = selectFreqs[r] / maxSel;
      const tVal = tempo[c] / maxTempo;
      const intensity = hkVal * tVal;
      if (intensity < 0.01) continue;
      cells.push(
        <rect
          key={`sel-${r}-${c}`}
          x={padL + c * cellW + 0.5}
          y={padT + r * cellH + 0.5}
          width={cellW - 1}
          height={cellH - 1}
          fill={lerpColor("#0a0a0a", GOLD, intensity)}
          rx="1"
          opacity={0.4 + intensity * 0.6}
        />
      );
    }
  }

  // Assign groups (bottom half)
  const assignStartY = padT + rows * cellH + cellH; // +cellH for divider
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const hkVal = assignFreqs[r] / maxAsn;
      const tVal = tempo[c] / maxTempo;
      const intensity = hkVal * tVal;
      if (intensity < 0.01) continue;
      cells.push(
        <rect
          key={`asn-${r}-${c}`}
          x={padL + c * cellW + 0.5}
          y={assignStartY + r * cellH + 0.5}
          width={cellW - 1}
          height={cellH - 1}
          fill={lerpColor("#0a0a0a", GOLD_DIM, intensity)}
          rx="1"
          opacity={0.4 + intensity * 0.6}
        />
      );
    }
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      {/* Grid lines */}
      {Array.from({ length: rows * 2 + 2 }, (_, i) => {
        const y = padT + i * cellH;
        return <line key={`h-${i}`} x1={padL} y1={y} x2={W - padR} y2={y} stroke={GREY_MID} strokeWidth="0.3" />;
      })}
      {Array.from({ length: cols + 1 }, (_, i) => {
        const x = padL + i * cellW;
        return <line key={`v-${i}`} x1={x} y1={padT} x2={x} y2={H - padB} stroke={GREY_MID} strokeWidth="0.3" />;
      })}

      {/* Divider line between select/assign */}
      <line
        x1={padL} y1={padT + rows * cellH + cellH / 2}
        x2={W - padR} y2={padT + rows * cellH + cellH / 2}
        stroke={GREY} strokeWidth="0.5" strokeDasharray="3,2"
      />

      {cells}

      {/* Row labels */}
      {Array.from({ length: rows }, (_, i) => (
        <text key={`rl-${i}`} x={padL - 4} y={padT + i * cellH + cellH / 2 + 2}
          textAnchor="end" fill={GREY} fontSize="5.5" fontFamily="Inconsolata, monospace">{i}</text>
      ))}

      {/* Column labels */}
      {tempoLabels.map((label, i) => (
        <text key={`cl-${i}`} x={padL + i * cellW + cellW / 2} y={H - 6}
          textAnchor="middle" fill={GREY} fontSize="5.5" fontFamily="Inconsolata, monospace">{label}</text>
      ))}

      {/* Section labels */}
      <text x={padL - 4} y={padT - 4} fill={GOLD} fontSize="6" fontFamily="Inconsolata, monospace">SEL</text>
      <text x={padL - 4} y={assignStartY - 4} fill={GOLD_DIM} fontSize="6" fontFamily="Inconsolata, monospace">ASN</text>
    </svg>
  );
}
