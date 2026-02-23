import React from "react";
import { GOLD, GOLD_DIM, GREEN, GREY, GREY_MID, safeMax, seededRandom, hashCode, TRAIT_COLORS } from "../vizUtils";

/**
 * CircuitBoard — PCB traces connecting action type chips.
 * Chips = action types (6 ICs), traces = transitions via hotkey groups.
 * Vias (through-holes) at intersections.
 */
export default function CircuitBoard({ segments, battleTag }) {
  const W = 280, H = 180;
  const { action = Array(6).fill(0), transitions = Array(10).fill(0), hotkey = Array(20).fill(0) } = segments || {};

  const rand = seededRandom(hashCode(battleTag || "default"));
  const maxAction = safeMax(action);
  const maxTrans = safeMax(transitions);
  const selectFreqs = hotkey.slice(0, 10);
  const maxHK = safeMax(selectFreqs);
  const elements = [];

  // PCB background texture — faint grid
  for (let x = 10; x < W; x += 10) {
    elements.push(
      <line key={`gv-${x}`} x1={x} y1={5} x2={x} y2={H - 5}
        stroke={GREY_MID} strokeWidth="0.15" />
    );
  }
  for (let y = 10; y < H; y += 10) {
    elements.push(
      <line key={`gh-${y}`} x1={5} y1={y} x2={W - 5} y2={y}
        stroke={GREY_MID} strokeWidth="0.15" />
    );
  }

  // IC Chip positions (6 action types)
  const chipLabels = ["R-CLK", "ABL", "BLD", "ITM", "SEL", "ASN"];
  const chipPositions = [
    { x: 50, y: 40 }, { x: 150, y: 30 }, { x: 240, y: 45 },
    { x: 45, y: 130 }, { x: 140, y: 140 }, { x: 235, y: 125 },
  ];

  // Draw traces (orthogonal routing like real PCBs)
  transitions.forEach((v, i) => {
    if (v < 0.02) return;
    const fromIdx = i % chipPositions.length;
    const toIdx = (i + 1 + Math.floor(i / 2)) % chipPositions.length;
    if (fromIdx === toIdx) return;

    const from = chipPositions[fromIdx];
    const to = chipPositions[toIdx];
    const traceW = 1 + (v / maxTrans) * 2;

    // Orthogonal routing with one bend
    const midX = from.x + (rand() > 0.5 ? 0 : to.x - from.x);
    const midY = midX === from.x ? to.y : from.y;

    elements.push(
      <path key={`trace-${i}`}
        d={`M ${from.x} ${from.y} L ${midX} ${midY} L ${to.x} ${to.y}`}
        fill="none" stroke={GREEN} strokeWidth={traceW}
        opacity={0.2 + (v / maxTrans) * 0.3}
        strokeLinejoin="round" strokeLinecap="round" />
    );

    // Via at the bend point
    elements.push(
      <circle key={`via-${i}`} cx={midX} cy={midY} r={2 + (v / maxTrans) * 1.5}
        fill={GREY_MID} stroke={GREEN} strokeWidth="0.5" opacity="0.5" />
    );
  });

  // Draw IC chips
  chipPositions.forEach((pos, i) => {
    const chipW = 30 + (action[i] / maxAction) * 15;
    const chipH = 16;
    const pinCount = 3 + Math.round((action[i] / maxAction) * 3);

    // Chip body
    elements.push(
      <rect key={`chip-${i}`}
        x={pos.x - chipW / 2} y={pos.y - chipH / 2}
        width={chipW} height={chipH}
        fill="#111" stroke={GOLD_DIM} strokeWidth="0.8"
        rx="1" opacity="0.9" />
    );

    // Chip notch
    elements.push(
      <circle key={`notch-${i}`}
        cx={pos.x - chipW / 2 + 4} cy={pos.y}
        r="1.5" fill="none" stroke={GREY} strokeWidth="0.5" opacity="0.5" />
    );

    // Pins
    for (let p = 0; p < pinCount; p++) {
      const px = pos.x - chipW / 2 + ((p + 1) / (pinCount + 1)) * chipW;
      // Top pins
      elements.push(
        <line key={`pin-t-${i}-${p}`}
          x1={px} y1={pos.y - chipH / 2} x2={px} y2={pos.y - chipH / 2 - 4}
          stroke={GREY} strokeWidth="0.8" />
      );
      // Bottom pins
      elements.push(
        <line key={`pin-b-${i}-${p}`}
          x1={px} y1={pos.y + chipH / 2} x2={px} y2={pos.y + chipH / 2 + 4}
          stroke={GREY} strokeWidth="0.8" />
      );
    }

    // Chip label
    elements.push(
      <text key={`clabel-${i}`} x={pos.x} y={pos.y + 2}
        textAnchor="middle" dominantBaseline="central"
        fill={GOLD} fontSize="6" fontFamily="Inconsolata, monospace" fontWeight="bold">
        {chipLabels[i]}
      </text>
    );
  });

  // Capacitors/resistors — small components from hotkey data
  selectFreqs.slice(0, 6).forEach((v, i) => {
    if (v < 0.03) return;
    const x = 20 + (i / 6) * (W - 40) + rand() * 20;
    const y = H / 2 + (rand() - 0.5) * 40;
    const compW = 6;
    const compH = 3;
    elements.push(
      <rect key={`comp-${i}`} x={x} y={y} width={compW} height={compH}
        fill={GREY_MID} stroke={GREY} strokeWidth="0.3" rx="0.5" opacity="0.4" />
    );
    // Leads
    elements.push(
      <line key={`lead1-${i}`} x1={x - 3} y1={y + compH / 2} x2={x} y2={y + compH / 2}
        stroke={GREY} strokeWidth="0.3" opacity="0.4" />,
      <line key={`lead2-${i}`} x1={x + compW} y1={y + compH / 2} x2={x + compW + 3} y2={y + compH / 2}
        stroke={GREY} strokeWidth="0.3" opacity="0.4" />
    );
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      {/* PCB background */}
      <rect x="0" y="0" width={W} height={H} fill="#0a1a0a" rx="4" opacity="0.5" />
      {elements}
    </svg>
  );
}
