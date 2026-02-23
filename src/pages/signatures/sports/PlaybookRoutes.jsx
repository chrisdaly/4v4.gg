import React from "react";
import { GOLD, GOLD_DIM, GREY, GREY_MID, safeMax, seededRandom, hashCode } from "../vizUtils";

/**
 * PlaybookRoutes — Football playbook X's and O's with route lines.
 * O's = hotkey groups (offensive players), route lines from rhythm trigrams.
 * X's = unused groups (defensive players).
 */
export default function PlaybookRoutes({ segments, battleTag }) {
  const W = 260, H = 180;
  const { rhythm = Array(15).fill(0), hotkey = Array(20).fill(0) } = segments || {};

  const rand = seededRandom(hashCode(battleTag || "default"));
  const selectFreqs = hotkey.slice(0, 10);
  const maxHK = safeMax(selectFreqs);
  const trigrams = rhythm.slice(0, 10);
  const maxTri = safeMax(trigrams);
  const elements = [];

  // Field markings
  const fieldTop = 15, fieldBot = H - 15;
  const fieldL = 20, fieldR = W - 20;

  // Line of scrimmage
  const losY = fieldBot - 40;
  elements.push(
    <line key="los" x1={fieldL} y1={losY} x2={fieldR} y2={losY}
      stroke={GREY} strokeWidth="1" strokeDasharray="6,4" opacity="0.3" />
  );

  // Yard lines
  for (let i = 0; i < 5; i++) {
    const y = fieldTop + (i / 4) * (fieldBot - fieldTop);
    elements.push(
      <line key={`yard-${i}`} x1={fieldL} y1={y} x2={fieldR} y2={y}
        stroke={GREY_MID} strokeWidth="0.3" />
    );
  }

  // Hash marks
  [fieldL + 60, fieldR - 60].forEach((x, hi) => {
    for (let i = 0; i < 8; i++) {
      const y = fieldTop + (i / 7) * (fieldBot - fieldTop);
      elements.push(
        <line key={`hash-${hi}-${i}`} x1={x - 3} y1={y} x2={x + 3} y2={y}
          stroke={GREY_MID} strokeWidth="0.3" />
      );
    }
  });

  // Player positions along the line
  const playerSpacing = (fieldR - fieldL) / 10;
  const players = selectFreqs.map((freq, i) => {
    const isActive = freq > maxHK * 0.1;
    return {
      x: fieldL + (i + 0.5) * playerSpacing,
      y: losY + (isActive ? 0 : -5),
      freq,
      isActive,
      idx: i,
    };
  });

  // Route lines from trigrams
  trigrams.forEach((v, i) => {
    if (v < 0.02) return;
    const playerIdx = i % players.length;
    const player = players[playerIdx];
    if (!player.isActive) return;

    const routeType = i % 5; // different route shapes
    const routeLen = 30 + (v / maxTri) * 60;
    const routePoints = [{ x: player.x, y: player.y }];

    if (routeType === 0) {
      // Go route (straight up)
      routePoints.push({ x: player.x, y: player.y - routeLen });
    } else if (routeType === 1) {
      // Out route (up then sideways)
      const dir = player.x > W / 2 ? 1 : -1;
      routePoints.push({ x: player.x, y: player.y - routeLen * 0.5 });
      routePoints.push({ x: player.x + dir * routeLen * 0.4, y: player.y - routeLen * 0.5 });
    } else if (routeType === 2) {
      // Slant route (diagonal)
      const dir = player.x > W / 2 ? -1 : 1;
      routePoints.push({ x: player.x + dir * routeLen * 0.3, y: player.y - routeLen * 0.8 });
    } else if (routeType === 3) {
      // Post route (up then diagonal inside)
      const dir = player.x > W / 2 ? -1 : 1;
      routePoints.push({ x: player.x, y: player.y - routeLen * 0.4 });
      routePoints.push({ x: player.x + dir * routeLen * 0.3, y: player.y - routeLen * 0.8 });
    } else {
      // Curl route (up then back)
      routePoints.push({ x: player.x, y: player.y - routeLen * 0.7 });
      routePoints.push({ x: player.x + (rand() - 0.5) * 15, y: player.y - routeLen * 0.55 });
    }

    // Draw route
    const pathD = routePoints.map((p, j) => `${j === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    elements.push(
      <path key={`route-${i}`} d={pathD}
        fill="none" stroke={GOLD} strokeWidth={1 + (v / maxTri) * 1.5}
        opacity={0.3 + (v / maxTri) * 0.4}
        strokeLinecap="round" strokeLinejoin="round" />
    );

    // Arrow at end
    const last = routePoints[routePoints.length - 1];
    elements.push(
      <circle key={`arrow-${i}`} cx={last.x} cy={last.y} r={2}
        fill={GOLD} opacity={0.4 + (v / maxTri) * 0.4} />
    );
  });

  // Draw players (O's and X's)
  players.forEach((p, i) => {
    if (p.isActive) {
      // O — offensive player
      elements.push(
        <circle key={`o-${i}`} cx={p.x} cy={p.y} r={5 + (p.freq / maxHK) * 4}
          fill="none" stroke={GOLD} strokeWidth="1.5"
          opacity={0.5 + (p.freq / maxHK) * 0.4} />
      );
    } else {
      // X — defensive/unused
      const s = 4;
      elements.push(
        <g key={`x-${i}`} opacity="0.3">
          <line x1={p.x - s} y1={p.y - s} x2={p.x + s} y2={p.y + s} stroke={GREY} strokeWidth="1.5" />
          <line x1={p.x + s} y1={p.y - s} x2={p.x - s} y2={p.y + s} stroke={GREY} strokeWidth="1.5" />
        </g>
      );
    }
    // Group number
    elements.push(
      <text key={`pn-${i}`} x={p.x} y={p.y + 15}
        textAnchor="middle" fill={GREY} fontSize="6" fontFamily="Inconsolata, monospace" opacity="0.5">
        {i}
      </text>
    );
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      {elements}
    </svg>
  );
}
