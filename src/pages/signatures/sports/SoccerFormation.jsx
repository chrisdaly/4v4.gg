import React from "react";
import { GOLD, GOLD_DIM, GREY, GREY_MID, safeMax, seededRandom, hashCode } from "../vizUtils";

/**
 * SoccerFormation — Hotkey groups as players on a pitch,
 * arrows = transition patterns between groups.
 * Position on pitch determined by frequency (more used = closer to front).
 */
export default function SoccerFormation({ segments, battleTag }) {
  const W = 240, H = 180;
  const { hotkey = Array(20).fill(0), transitions = Array(10).fill(0) } = segments || {};

  const rand = seededRandom(hashCode(battleTag || "default"));
  const selectFreqs = hotkey.slice(0, 10);
  const maxHK = safeMax(selectFreqs);
  const maxTrans = safeMax(transitions);
  const elements = [];

  // Pitch markings
  const pitchPad = 12;
  const pw = W - pitchPad * 2;
  const ph = H - pitchPad * 2;

  // Field outline
  elements.push(
    <rect key="field" x={pitchPad} y={pitchPad} width={pw} height={ph}
      fill="none" stroke={GREY_MID} strokeWidth="0.5" rx="2" />
  );
  // Center line
  elements.push(
    <line key="center-line" x1={W / 2} y1={pitchPad} x2={W / 2} y2={H - pitchPad}
      stroke={GREY_MID} strokeWidth="0.5" />
  );
  // Center circle
  elements.push(
    <circle key="center-circle" cx={W / 2} cy={H / 2} r={ph * 0.15}
      fill="none" stroke={GREY_MID} strokeWidth="0.5" />
  );
  // Penalty areas
  [pitchPad, W - pitchPad - pw * 0.15].forEach((x, i) => {
    elements.push(
      <rect key={`penalty-${i}`} x={x} y={H / 2 - ph * 0.25} width={pw * 0.15} height={ph * 0.5}
        fill="none" stroke={GREY_MID} strokeWidth="0.3" />
    );
  });

  // Position players (groups) on the pitch
  // Sort by frequency — most used groups play forward
  const sortedGroups = selectFreqs
    .map((f, i) => ({ idx: i, freq: f }))
    .sort((a, b) => b.freq - a.freq);

  // Formation layout: GK + rows of 3-4
  const positions = [];
  const formationRows = [
    { x: 0.1, slots: 1 },   // GK
    { x: 0.3, slots: 3 },   // Defense
    { x: 0.55, slots: 3 },  // Midfield
    { x: 0.8, slots: 3 },   // Forward
  ];

  let playerIdx = 0;
  formationRows.forEach((row) => {
    for (let s = 0; s < row.slots && playerIdx < 10; s++) {
      const yFrac = (s + 0.5) / row.slots;
      positions.push({
        x: pitchPad + row.x * pw + (rand() - 0.5) * 10,
        y: pitchPad + yFrac * ph,
        group: sortedGroups[playerIdx],
      });
      playerIdx++;
    }
  });

  // Draw transition arrows
  transitions.forEach((v, i) => {
    if (v < 0.03) return;
    const fromIdx = i % positions.length;
    const toIdx = (i + 1 + Math.floor(i / 2)) % positions.length;
    if (fromIdx === toIdx) return;
    const from = positions[fromIdx];
    const to = positions[toIdx];
    if (!from || !to) return;

    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const arrowLen = 5;

    elements.push(
      <line key={`arrow-${i}`}
        x1={from.x} y1={from.y}
        x2={to.x - (dx / dist) * 8} y2={to.y - (dy / dist) * 8}
        stroke={GOLD_DIM} strokeWidth={0.5 + (v / maxTrans) * 1.5}
        opacity={0.2 + (v / maxTrans) * 0.4}
        strokeLinecap="round"
        markerEnd=""
      />
    );
  });

  // Draw players
  positions.forEach((pos, i) => {
    const { group } = pos;
    if (!group) return;
    const r = 4 + (group.freq / maxHK) * 8;
    elements.push(
      <circle key={`player-${i}`} cx={pos.x} cy={pos.y} r={r}
        fill={group.freq > maxHK * 0.3 ? GOLD : GREY_MID}
        opacity={0.5 + (group.freq / maxHK) * 0.4}
        stroke={GOLD} strokeWidth="0.5" />
    );
    elements.push(
      <text key={`pnum-${i}`} x={pos.x} y={pos.y + 3}
        textAnchor="middle" dominantBaseline="central"
        fill="#000" fontSize="7" fontFamily="Inconsolata, monospace" fontWeight="bold">
        {group.idx}
      </text>
    );
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      {elements}
    </svg>
  );
}
