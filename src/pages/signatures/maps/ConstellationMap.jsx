import React from "react";
import { GOLD, GOLD_DIM, GREY, GREY_MID, BLUE, seededRandom, hashCode, safeMax } from "../vizUtils";

/**
 * ConstellationMap — Stars = hotkey groups positioned by embedding,
 * constellation lines from transitions, background stars from rhythm.
 */
export default function ConstellationMap({ segments, embedding, battleTag }) {
  const W = 280, H = 200;
  const { hotkey = Array(20).fill(0), transitions = Array(10).fill(0), rhythm = Array(15).fill(0) } = segments || {};

  const rand = seededRandom(hashCode(battleTag || "default"));
  const selectFreqs = hotkey.slice(0, 10);
  const maxHK = safeMax(selectFreqs);
  const maxTrans = safeMax(transitions);
  const elements = [];

  // Background nebula from embedding (soft gradient circles)
  if (embedding && embedding.length > 0) {
    const min = Math.min(...embedding);
    const max = Math.max(...embedding);
    const range = max - min || 1;
    for (let i = 0; i < embedding.length; i += 4) {
      const t = (embedding[i] - min) / range;
      const x = 20 + (i / embedding.length) * (W - 40);
      const y = 30 + rand() * (H - 60);
      elements.push(
        <circle key={`neb-${i}`} cx={x} cy={y} r={8 + t * 20}
          fill={BLUE} opacity={0.03 + t * 0.04} />
      );
    }
  }

  // Background stars from rhythm
  const trigrams = rhythm.slice(0, 10);
  trigrams.forEach((v, i) => {
    if (v < 0.005) return;
    const x = 15 + rand() * (W - 30);
    const y = 15 + rand() * (H - 30);
    elements.push(
      <circle key={`bgstar-${i}`} cx={x} cy={y} r={0.5 + v * 2}
        fill="#fff" opacity={0.15 + v * 0.3} />
    );
  });
  // Extra tiny background stars
  for (let i = 0; i < 30; i++) {
    elements.push(
      <circle key={`tiny-${i}`} cx={rand() * W} cy={rand() * H} r={0.3 + rand() * 0.5}
        fill="#fff" opacity={0.1 + rand() * 0.15} />
    );
  }

  // Star positions for 10 hotkey groups — deterministic but spread out
  const stars = selectFreqs.map((freq, i) => {
    const angle = (i / 10) * Math.PI * 2 + rand() * 0.4;
    const dist = 40 + rand() * 50;
    return {
      x: W / 2 + Math.cos(angle) * dist + (rand() - 0.5) * 30,
      y: H / 2 + Math.sin(angle) * dist + (rand() - 0.5) * 20,
      freq,
      r: 1.5 + (freq / maxHK) * 5,
    };
  });

  // Constellation lines from transitions
  transitions.forEach((v, i) => {
    if (v < 0.02) return;
    const from = i % 10;
    const to = (i + 1 + Math.floor(i / 3)) % 10;
    if (from === to) return;
    const a = stars[from];
    const b = stars[to];
    elements.push(
      <line key={`line-${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
        stroke={GOLD_DIM} strokeWidth={0.5 + (v / maxTrans) * 1.5}
        opacity={0.2 + (v / maxTrans) * 0.4} strokeLinecap="round" />
    );
  });

  // Stars
  stars.forEach((s, i) => {
    if (s.freq < 0.005) return;
    // Glow
    elements.push(
      <circle key={`glow-${i}`} cx={s.x} cy={s.y} r={s.r * 3}
        fill={GOLD} opacity={0.06 + (s.freq / maxHK) * 0.06} />
    );
    // Star
    elements.push(
      <circle key={`star-${i}`} cx={s.x} cy={s.y} r={s.r}
        fill="#fff" opacity={0.6 + (s.freq / maxHK) * 0.4} />
    );
    // Label
    elements.push(
      <text key={`label-${i}`} x={s.x + s.r + 3} y={s.y + 2}
        fill={GREY} fontSize="6" fontFamily="Inconsolata, monospace" opacity="0.6">{i}</text>
    );
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      {/* Dark sky background */}
      <rect x="0" y="0" width={W} height={H} fill="#0a0a14" rx="4" />
      {elements}
    </svg>
  );
}
