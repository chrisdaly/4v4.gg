import React from "react";
import { GOLD, GOLD_DIM, GREEN, RED, BLUE, GREY, GREY_MID, TRAIT_COLORS, seededRandom, hashCode, safeMax } from "../vizUtils";

/**
 * SubwayMap — Transit map: stations = hotkey groups,
 * colored lines = transitions between groups.
 * Station size = frequency of use.
 */

const LINE_COLORS = [GOLD, GREEN, RED, BLUE, "#c084fc", "#f472b6", GOLD_DIM, "#22c55e", "#ef4444", "#a855f7"];

export default function SubwayMap({ segments, battleTag }) {
  const W = 280, H = 200;
  const { hotkey = Array(20).fill(0), transitions = Array(10).fill(0) } = segments || {};

  const rand = seededRandom(hashCode(battleTag || "default"));
  const selectFreqs = hotkey.slice(0, 10);
  const maxHK = safeMax(selectFreqs);
  const maxTrans = safeMax(transitions);
  const elements = [];

  // Station positions — grid-like layout (subway maps are orthogonal)
  const gridCols = 4;
  const gridRows = 3;
  const cellW = (W - 40) / gridCols;
  const cellH = (H - 40) / gridRows;

  const stationPositions = [
    // Row 0
    { col: 0, row: 0 }, { col: 1, row: 0 }, { col: 3, row: 0 },
    // Row 1
    { col: 0, row: 1 }, { col: 2, row: 1 }, { col: 3, row: 1 },
    // Row 2
    { col: 1, row: 2 }, { col: 2, row: 2 }, { col: 3, row: 2 },
    // Extra
    { col: 1, row: 1 },
  ];

  const stations = selectFreqs.map((freq, i) => {
    const pos = stationPositions[i % stationPositions.length];
    return {
      x: 30 + pos.col * cellW + (rand() - 0.5) * 8,
      y: 30 + pos.row * cellH + (rand() - 0.5) * 8,
      freq,
      idx: i,
      r: 4 + (freq / maxHK) * 8,
    };
  });

  // Transit lines (L-shaped connections for subway look)
  transitions.forEach((v, i) => {
    if (v < 0.02) return;
    const fromIdx = i % stations.length;
    const toIdx = (i + 2 + Math.floor(i / 2)) % stations.length;
    if (fromIdx === toIdx) return;

    const from = stations[fromIdx];
    const to = stations[toIdx];
    const color = LINE_COLORS[i % LINE_COLORS.length];
    const width = 2 + (v / maxTrans) * 3;

    // L-shaped path (horizontal then vertical, subway style)
    const midX = from.x;
    const midY = to.y;
    const pathD = `M ${from.x} ${from.y} L ${midX} ${midY} L ${to.x} ${to.y}`;

    elements.push(
      <path key={`line-${i}`} d={pathD}
        fill="none" stroke={color} strokeWidth={width}
        opacity={0.25 + (v / maxTrans) * 0.35}
        strokeLinecap="round" strokeLinejoin="round" />
    );
  });

  // Stations (drawn on top of lines)
  stations.forEach((s, i) => {
    const isActive = s.freq > maxHK * 0.1;
    elements.push(
      <circle key={`station-outer-${i}`} cx={s.x} cy={s.y} r={s.r + 2}
        fill={isActive ? "#fff" : GREY_MID} opacity={isActive ? 0.9 : 0.3} />,
      <circle key={`station-inner-${i}`} cx={s.x} cy={s.y} r={s.r}
        fill={isActive ? GREY_MID : "#111"} opacity="0.8"
        stroke="#fff" strokeWidth="1" />,
      <text key={`sname-${i}`} x={s.x} y={s.y + 3}
        textAnchor="middle" dominantBaseline="central"
        fill={isActive ? "#fff" : GREY}
        fontSize="7" fontFamily="Inconsolata, monospace" fontWeight="bold">
        {i}
      </text>
    );

    // Station name label
    if (s.freq > maxHK * 0.15) {
      elements.push(
        <text key={`slabel-${i}`} x={s.x + s.r + 4} y={s.y + 3}
          fill={GREY} fontSize="6" fontFamily="Inconsolata, monospace" opacity="0.7">
          GRP {i}
        </text>
      );
    }
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      {/* Faint grid */}
      {Array.from({ length: gridCols + 1 }, (_, i) => (
        <line key={`gv-${i}`} x1={20 + i * cellW} y1={20} x2={20 + i * cellW} y2={H - 20}
          stroke={GREY_MID} strokeWidth="0.2" />
      ))}
      {Array.from({ length: gridRows + 1 }, (_, i) => (
        <line key={`gh-${i}`} x1={20} y1={20 + i * cellH} x2={W - 20} y2={20 + i * cellH}
          stroke={GREY_MID} strokeWidth="0.2" />
      ))}
      {elements}
    </svg>
  );
}
