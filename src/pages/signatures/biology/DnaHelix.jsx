import React from "react";
import { GOLD, GOLD_DIM, BLUE, GREY, GREY_MID, safeMax, lerpColor } from "../vizUtils";

/**
 * DnaHelix — Double helix: select strand + assign strand,
 * rungs (base pairs) colored by transition frequency.
 */
export default function DnaHelix({ segments }) {
  const W = 280, H = 160;
  const { hotkey = Array(20).fill(0), transitions = Array(10).fill(0) } = segments || {};

  const selectFreqs = hotkey.slice(0, 10);
  const assignFreqs = hotkey.slice(10, 20);
  const maxSel = safeMax(selectFreqs);
  const maxAsn = safeMax(assignFreqs);
  const maxTrans = safeMax(transitions);

  const padL = 20, padR = 20;
  const midY = H / 2;
  const amplitude = 30;
  const numPoints = 40;
  const xStep = (W - padL - padR) / numPoints;

  const strand1 = [];
  const strand2 = [];
  const rungs = [];

  for (let i = 0; i <= numPoints; i++) {
    const x = padL + i * xStep;
    const phase = (i / numPoints) * Math.PI * 4; // 2 full twists

    // Strand 1 (select) — sine wave
    const y1 = midY + Math.sin(phase) * amplitude;
    // Strand 2 (assign) — opposite phase
    const y2 = midY + Math.sin(phase + Math.PI) * amplitude;

    // Modulate by hotkey data
    const groupIdx = Math.floor((i / numPoints) * 10) % 10;
    const selMod = selectFreqs[groupIdx] / maxSel;
    const asnMod = assignFreqs[groupIdx] / maxAsn;

    strand1.push({
      x,
      y: midY + Math.sin(phase) * amplitude * (0.6 + selMod * 0.4),
      thickness: 1 + selMod * 1.5,
      opacity: 0.4 + selMod * 0.5,
    });
    strand2.push({
      x,
      y: midY + Math.sin(phase + Math.PI) * amplitude * (0.6 + asnMod * 0.4),
      thickness: 1 + asnMod * 1.5,
      opacity: 0.4 + asnMod * 0.5,
    });

    // Rungs every 4 points (when strands cross)
    if (i % 4 === 2 && i < numPoints) {
      const transIdx = Math.floor((i / numPoints) * transitions.length) % transitions.length;
      const transVal = transitions[transIdx] / maxTrans;
      rungs.push({
        x1: strand1[i].x,
        y1: strand1[i].y,
        x2: strand2[i].x,
        y2: strand2[i].y,
        color: lerpColor(GREY_MID, GOLD, transVal),
        opacity: 0.3 + transVal * 0.5,
        width: 0.5 + transVal * 2,
      });
    }
  }

  // Build strand paths
  function strandPath(pts) {
    if (pts.length < 2) return "";
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const curr = pts[i];
      const cpx1 = prev.x + (curr.x - prev.x) * 0.4;
      const cpx2 = curr.x - (curr.x - prev.x) * 0.4;
      d += ` C ${cpx1} ${prev.y}, ${cpx2} ${curr.y}, ${curr.x} ${curr.y}`;
    }
    return d;
  }

  // Determine z-ordering per segment — which strand is "in front"
  const elements = [];

  // Draw rungs first (behind both strands)
  rungs.forEach((r, i) => {
    elements.push(
      <line key={`rung-${i}`} x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2}
        stroke={r.color} strokeWidth={r.width} opacity={r.opacity} strokeLinecap="round" />
    );
  });

  // Strand 1
  elements.push(
    <path key="s1" d={strandPath(strand1)}
      fill="none" stroke={GOLD} strokeWidth="2" opacity="0.7" strokeLinecap="round" />
  );
  // Strand 2
  elements.push(
    <path key="s2" d={strandPath(strand2)}
      fill="none" stroke={BLUE} strokeWidth="2" opacity="0.7" strokeLinecap="round" />
  );

  // Group dots at strand intersections
  for (let i = 0; i < strand1.length; i += 4) {
    const s = strand1[i];
    const groupIdx = Math.floor((i / numPoints) * 10) % 10;
    if (selectFreqs[groupIdx] > 0.03) {
      elements.push(
        <circle key={`d1-${i}`} cx={s.x} cy={s.y} r="2"
          fill={GOLD} opacity="0.6" />
      );
    }
  }

  // Labels
  elements.push(
    <text key="l1" x={padL - 4} y={midY - amplitude - 6}
      fill={GOLD} fontSize="7" fontFamily="Inconsolata, monospace">SELECT</text>,
    <text key="l2" x={padL - 4} y={midY + amplitude + 12}
      fill={BLUE} fontSize="7" fontFamily="Inconsolata, monospace">ASSIGN</text>
  );

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      {elements}
    </svg>
  );
}
