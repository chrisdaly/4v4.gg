import React from "react";

const GOLD = "#fcdb33";

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export default function PenstrokeSignature({ segments, battleTag }) {
  const W = 300, H = 140;
  const { action, apm, hotkey, tempo, intensity } = segments;

  const speed = apm[0] || 0;
  const burst = apm[2] || 0;
  const smoothness = tempo?.[2] || 0;
  const weight = intensity?.[0] || 0;
  const loops = Math.max(1, Math.round((hotkey?.slice(0, 10).filter(v => v > 0.05).length || 3)));
  const actionBias = action[0] || 0;

  const rand = seededRandom(hashCode(battleTag));
  const strokes = [];

  for (let s = 0; s < 6; s++) {
    const baseY = 30 + s * 14 + (rand() - 0.5) * 20;
    const startX = 20 + rand() * 30;
    const length = 60 + speed * 200 + rand() * 40;
    const amp = 10 + burst * 40 + rand() * 10;
    const sw = 1.2 + weight * 4 + s * 0.3;

    const points = [];
    const segCount = loops + 1;
    for (let i = 0; i <= segCount; i++) {
      const t = i / segCount;
      points.push({
        x: startX + t * length + actionBias * 20 * (rand() - 0.5),
        y: baseY + Math.sin(t * Math.PI * loops) * amp * (1 - smoothness * 0.5) + (rand() - 0.5) * 8,
      });
    }

    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx1 = prev.x + (curr.x - prev.x) * (0.3 + smoothness * 0.3);
      const cpy1 = prev.y + (rand() - 0.5) * amp * 0.5;
      const cpx2 = curr.x - (curr.x - prev.x) * (0.3 + smoothness * 0.3);
      const cpy2 = curr.y + (rand() - 0.5) * amp * 0.5;
      d += ` C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${curr.x} ${curr.y}`;
    }

    strokes.push(
      <path key={s} d={d} fill="none" stroke={GOLD} strokeWidth={sw} strokeLinecap="round" opacity={0.6 + s * 0.06} />
    );
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      {strokes}
    </svg>
  );
}
