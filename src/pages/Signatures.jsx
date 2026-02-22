import React, { useState, useEffect, useId, useMemo } from "react";
import styled from "styled-components";
import { PageLayout } from "../components/PageLayout";
import { PageHero } from "../components/ui";
import PeonLoader from "../components/PeonLoader";

const RELAY_URL =
  import.meta.env.VITE_CHAT_RELAY_URL || "https://4v4gg-chat-relay.fly.dev";

const TEST_PLAYERS = [
  { tag: "ToD#2792", label: "ToD", race: "Night Elf" },
  { tag: "Lacoste#22218", label: "Lacoste", race: "Orc" },
  { tag: "Boyzinho#11456", label: "Boyzinho", race: "Orc" },
  { tag: "XIIINostra#2552", label: "XIIINostra", race: "Orc" },
];

// ── Color palette ──────────────────────────────────────
const GOLD = "#fcdb33";
const GOLD_DIM = "#b89a1e";
const GREEN = "#4ade80";
const RED = "#f87171";
const BLUE = "#3b82f6";
const GREY = "#bbb";
const GREY_MID = "#444";
const TRAIT_COLORS = [GOLD, GREEN, BLUE, RED, "#c084fc", "#f472b6"];

// Feature importance from the handcrafted model (weights in fingerprint.js)
const FEATURES = [
  { name: "Rhythm", weight: 4.0, dims: 15, desc: "Subconscious micro-routines: repeating trigram patterns (e.g. 1→2→1→2), oscillation score, cycle lengths" },
  { name: "HK Transitions", weight: 4.0, dims: 10, desc: "Which hotkey groups a player switches between and how often" },
  { name: "HK Usage", weight: 3.0, dims: 20, desc: "Distribution of select/assign across 10 control groups" },
  { name: "HK Intensity", weight: 3.0, dims: 2, desc: "Proportion of all actions that are hotkey-related" },
  { name: "APM Profile", weight: 2.0, dims: 3, desc: "Mean APM, variability, and burstiness pattern" },
  { name: "Action Tempo", weight: 2.0, dims: 7, desc: "Distribution of time gaps between consecutive clicks" },
  { name: "Action Mix", weight: 1.0, dims: 6, desc: "Right-click vs ability vs build/train ratio" },
];
const TOTAL_WEIGHT = FEATURES.reduce((s, f) => s + f.weight, 0);

// ── Helpers ────────────────────────────────────────────

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

// ── 1. Penstroke Signature ─────────────────────────────

function PenstrokeSignature({ segments, battleTag }) {
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

// ── 2. Transition Glyph ───────────────────────────────

function TransitionGlyph({ segments }) {
  const W = 220, H = 220;
  const cx = W / 2, cy = H / 2, radius = 80;
  const { hotkey, transitions } = segments;

  const nodes = [];
  const selectFreqs = hotkey?.slice(0, 10) || Array(10).fill(0);
  const maxFreq = Math.max(...selectFreqs, 0.01);

  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * Math.PI * 2 - Math.PI / 2;
    nodes.push({
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
      freq: selectFreqs[i],
      r: 3 + (selectFreqs[i] / maxFreq) * 9,
    });
  }

  const arcs = [];
  const trans = transitions || Array(10).fill(0);
  const maxTrans = Math.max(...trans, 0.01);

  for (let i = 0; i < trans.length; i++) {
    if (trans[i] < 0.01) continue;
    const from = i % 10;
    const to = (i + 1 + Math.floor(i / 2)) % 10;
    if (from === to) continue;

    const thickness = 0.5 + (trans[i] / maxTrans) * 3;
    const opacity = 0.3 + (trans[i] / maxTrans) * 0.5;
    const mx = (nodes[from].x + nodes[to].x) / 2;
    const my = (nodes[from].y + nodes[to].y) / 2;
    const dx = nodes[to].x - nodes[from].x;
    const dy = nodes[to].y - nodes[from].y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const curveOffset = 15 + i * 2;
    const cpx = mx + (-dy / dist) * curveOffset;
    const cpy = my + (dx / dist) * curveOffset;

    arcs.push(
      <path key={`arc-${i}`} d={`M ${nodes[from].x} ${nodes[from].y} Q ${cpx} ${cpy} ${nodes[to].x} ${nodes[to].y}`}
        fill="none" stroke={GOLD} strokeWidth={thickness} opacity={opacity} strokeLinecap="round" />
    );
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      {arcs}
      {nodes.map((n, i) => (
        <g key={i}>
          <circle cx={n.x} cy={n.y} r={n.r} fill={n.freq > 0 ? GOLD : GREY_MID} opacity={0.8} />
          <text x={n.x} y={n.y + 1} textAnchor="middle" dominantBaseline="central" fill="#000"
            fontSize="8" fontWeight="bold" fontFamily="Inconsolata, monospace">{i}</text>
        </g>
      ))}
    </svg>
  );
}

// ── 3. Tempo Waveform ─────────────────────────────────

function TempoWaveform({ segments }) {
  const W = 300, H = 140;
  const { tempo } = segments;
  const id = useId();
  if (!tempo || tempo.every(v => v === 0)) {
    return <svg viewBox={`0 0 ${W} ${H}`} width="100%" />;
  }

  const maxVal = Math.max(...tempo, 0.01);
  const points = tempo.map((v, i) => ({
    x: 30 + (i / (tempo.length - 1)) * (W - 60),
    y: H / 2 - (v / maxVal) * (H / 2 - 16),
  }));
  const mirrorPoints = points.map(p => ({ x: p.x, y: H - p.y }));

  function smoothPath(pts) {
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

  const gradId = `tg-${id}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={GOLD} />
          <stop offset="50%" stopColor={GOLD_DIM} />
          <stop offset="100%" stopColor={GREY} />
        </linearGradient>
      </defs>
      <path d={smoothPath(points)} fill="none" stroke={`url(#${gradId})`} strokeWidth="2.5" strokeLinecap="round" />
      <path d={smoothPath(mirrorPoints)} fill="none" stroke={`url(#${gradId})`} strokeWidth="2.5" strokeLinecap="round" opacity="0.35" />
      <line x1="20" y1={H / 2} x2={W - 20} y2={H / 2} stroke={GREY_MID} strokeWidth="0.5" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3.5" fill={GOLD} opacity="0.9" />
      ))}
      {["<50ms", "50", "100", "200", "500", "1k", "2k+"].map((label, i) => (
        <text key={i} x={30 + (i / 6) * (W - 60)} y={H - 3} textAnchor="middle" fill={GREY}
          fontSize="7" fontFamily="Inconsolata, monospace">{label}</text>
      ))}
    </svg>
  );
}

// ── 4. Radial Rhythm ──────────────────────────────────

function RadialRhythm({ segments }) {
  const W = 220, H = 220;
  const cx = W / 2, cy = H / 2;
  const { action, apm, hotkey, tempo, intensity } = segments;

  const radarData = [
    apm[0] || 0,
    apm[2] || 0,
    tempo?.[1] || 0,
    intensity?.[0] || 0,
    intensity?.[1] || 0,
    action[1] || 0,
  ];
  const radarLabels = ["SPD", "BRT", "TMP", "SEL", "ASN", "ABL"];
  const radarR = 42;
  const maxRadar = Math.max(...radarData, 0.01);

  const radarPoints = radarData.map((v, i) => {
    const angle = (i / radarData.length) * Math.PI * 2 - Math.PI / 2;
    const r = radarR * (v / maxRadar);
    return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
  });
  const radarPath = radarPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";

  const radarGuides = radarData.map((_, i) => {
    const angle = (i / radarData.length) * Math.PI * 2 - Math.PI / 2;
    return {
      x: cx + Math.cos(angle) * radarR,
      y: cy + Math.sin(angle) * radarR,
      lx: cx + Math.cos(angle) * (radarR + 14),
      ly: cy + Math.sin(angle) * (radarR + 14),
    };
  });

  const selectFreqs = hotkey?.slice(0, 10) || Array(10).fill(0);
  const maxPetal = Math.max(...selectFreqs, 0.01);
  const petalBaseR = 62;
  const petalMaxExt = 32;

  const petals = selectFreqs.map((freq, i) => {
    const angle = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const ext = petalBaseR + (freq / maxPetal) * petalMaxExt;
    const halfArc = Math.PI / 10 * 0.6;
    const a1 = angle - halfArc;
    const a2 = angle + halfArc;
    const p1 = { x: cx + Math.cos(a1) * petalBaseR, y: cy + Math.sin(a1) * petalBaseR };
    const p2 = { x: cx + Math.cos(angle) * ext, y: cy + Math.sin(angle) * ext };
    const p3 = { x: cx + Math.cos(a2) * petalBaseR, y: cy + Math.sin(a2) * petalBaseR };
    return `M ${p1.x} ${p1.y} Q ${p2.x} ${p2.y} ${p3.x} ${p3.y}`;
  });

  const tempoR = 56;
  const tempoData = tempo || Array(7).fill(0);
  const maxTempo = Math.max(...tempoData, 0.01);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      {tempoData.map((v, i) => {
        const sa = (i / 7) * Math.PI * 2 - Math.PI / 2;
        const ea = ((i + 1) / 7) * Math.PI * 2 - Math.PI / 2;
        const w = 2 + (v / maxTempo) * 4;
        return (
          <path key={`ring-${i}`}
            d={`M ${cx + Math.cos(sa) * tempoR} ${cy + Math.sin(sa) * tempoR} A ${tempoR} ${tempoR} 0 0 1 ${cx + Math.cos(ea) * tempoR} ${cy + Math.sin(ea) * tempoR}`}
            fill="none" stroke={GOLD_DIM} strokeWidth={w} opacity={0.4 + (v / maxTempo) * 0.5} strokeLinecap="round" />
        );
      })}
      {petals.map((d, i) => (
        <path key={`petal-${i}`} d={d} fill="none" stroke={GOLD} strokeWidth="1.5"
          opacity={0.5 + (selectFreqs[i] / maxPetal) * 0.4} strokeLinecap="round" />
      ))}
      {radarGuides.map((g, i) => (
        <g key={`guide-${i}`}>
          <line x1={cx} y1={cy} x2={g.x} y2={g.y} stroke={GREY_MID} strokeWidth="0.5" />
          <text x={g.lx} y={g.ly} textAnchor="middle" dominantBaseline="central" fill={GREY}
            fontSize="7" fontFamily="Inconsolata, monospace">{radarLabels[i]}</text>
        </g>
      ))}
      <path d={radarPath} fill={GOLD} fillOpacity="0.15" stroke={GOLD} strokeWidth="1.5" />
      {radarPoints.map((p, i) => (
        <circle key={`rp-${i}`} cx={p.x} cy={p.y} r="2.5" fill={TRAIT_COLORS[i]} />
      ))}
      <circle cx={cx} cy={cy} r="2" fill={GOLD} opacity="0.6" />
    </svg>
  );
}

// ── 5. Embedding Heatmap (DNA Barcode) ──────────────────

function EmbeddingHeatmap({ embedding, label }) {
  const W = 300, H = 50;
  if (!embedding || embedding.length === 0) {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} width="100%">
        <text x={W / 2} y={H / 2} textAnchor="middle" dominantBaseline="central"
          fill={GREY} fontSize="10" fontFamily="Inconsolata, monospace">No embedding</text>
      </svg>
    );
  }

  const dim = embedding.length;
  const barW = (W - 8) / dim;
  const min = Math.min(...embedding);
  const max = Math.max(...embedding);
  const range = max - min || 1;

  // Color scale: blue (low) → black (mid) → gold (high)
  function valToColor(v) {
    const t = (v - min) / range; // 0..1
    if (t < 0.5) {
      const s = t * 2; // 0..1 for low half
      const r = Math.round(30 * s);
      const g = Math.round(30 * s);
      const b = Math.round(180 * (1 - s) + 40 * s);
      return `rgb(${r},${g},${b})`;
    } else {
      const s = (t - 0.5) * 2; // 0..1 for high half
      const r = Math.round(40 + 212 * s);
      const g = Math.round(40 + 179 * s);
      const b = Math.round(40 - 9 * s);
      return `rgb(${r},${g},${b})`;
    }
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      {embedding.map((v, i) => (
        <rect key={i} x={4 + i * barW} y={6} width={barW - 0.3} height={H - 18}
          fill={valToColor(v)} rx="1" />
      ))}
      <text x={4} y={H - 2} fill={GREY} fontSize="7" fontFamily="Inconsolata, monospace">
        64 dimensions
      </text>
      <text x={W - 4} y={H - 2} textAnchor="end" fill={GREY} fontSize="7" fontFamily="Inconsolata, monospace">
        [{min.toFixed(2)} … {max.toFixed(2)}]
      </text>
    </svg>
  );
}

// ── 6. Embedding Scatter Plot (PCA 2D) ──────────────────

const RACE_COLORS = {
  "Human": "#3b82f6",
  "Orc": "#ef4444",
  "Night Elf": "#a855f7",
  "Undead": "#22c55e",
  "Random": GREY,
};

function EmbeddingScatter({ mapData, highlightTags }) {
  if (!mapData || mapData.players.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "40px 0" }}>
        <span style={{ fontFamily: "var(--font-mono)", color: GREY, fontSize: 13 }}>
          Loading embedding map...
        </span>
      </div>
    );
  }

  const W = 600, H = 400;
  const PAD = 50;
  const { players, pca } = mapData;

  const xs = players.map(p => p.x);
  const ys = players.map(p => p.y);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const yMin = Math.min(...ys), yMax = Math.max(...ys);
  const xRange = xMax - xMin || 1;
  const yRange = yMax - yMin || 1;

  const scale = (px, py) => ({
    sx: PAD + ((px - xMin) / xRange) * (W - PAD * 2),
    sy: PAD + ((py - yMin) / yRange) * (H - PAD * 2),
  });

  const highlightSet = new Set(highlightTags);
  const bgPlayers = players.filter(p => !highlightSet.has(p.battleTag));
  const fgPlayers = players.filter(p => highlightSet.has(p.battleTag));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: 700 }}>
      {/* Axes */}
      <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke={GREY_MID} strokeWidth="1" />
      <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke={GREY_MID} strokeWidth="1" />
      <text x={W / 2} y={H - 10} textAnchor="middle" fill={GREY} fontSize="10" fontFamily="Inconsolata, monospace">
        PC1 ({pca?.varianceExplained?.[0]}% var)
      </text>
      <text x={14} y={H / 2} textAnchor="middle" fill={GREY} fontSize="10" fontFamily="Inconsolata, monospace"
        transform={`rotate(-90, 14, ${H / 2})`}>
        PC2 ({pca?.varianceExplained?.[1]}% var)
      </text>

      {/* Background dots */}
      {bgPlayers.map((p, i) => {
        const { sx, sy } = scale(p.x, p.y);
        return (
          <circle key={`bg-${i}`} cx={sx} cy={sy} r="4"
            fill={RACE_COLORS[p.race] || GREY} opacity="0.25" />
        );
      })}

      {/* Highlighted dots */}
      {fgPlayers.map((p, i) => {
        const { sx, sy } = scale(p.x, p.y);
        const color = RACE_COLORS[p.race] || GOLD;
        const label = p.battleTag.split("#")[0];
        return (
          <g key={`fg-${i}`}>
            <circle cx={sx} cy={sy} r="7" fill={color} stroke="#fff" strokeWidth="1.5" />
            <text x={sx + 10} y={sy + 4} fill="#fff" fontSize="11"
              fontFamily="var(--font-display)" fontWeight="bold">
              {label}
            </text>
          </g>
        );
      })}

      {/* Legend */}
      {Object.entries(RACE_COLORS).filter(([r]) => r !== "Random").map(([race, color], i) => (
        <g key={race} transform={`translate(${W - PAD + 5}, ${PAD + i * 18})`}>
          <circle cx="5" cy="0" r="4" fill={color} opacity="0.7" />
          <text x="14" y="4" fill={GREY} fontSize="9" fontFamily="Inconsolata, monospace">{race}</text>
        </g>
      ))}
    </svg>
  );
}

// ── Styled Components ──────────────────────────────────

const Section = styled.section`
  margin-bottom: var(--space-12);
`;

const SectionTitle = styled.h2`
  font-family: var(--font-display);
  font-size: clamp(1.2rem, 3vw, 1.6rem);
  color: #fff;
  margin: 0 0 var(--space-4);
`;

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
`;

const FeatureCard = styled.div`
  border: 1px solid var(--grey-mid);
  border-radius: var(--radius-md);
  padding: 14px;
  background: rgba(0, 0, 0, 0.3);

  .feat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }
  .feat-name {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: #fff;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .feat-weight {
    font-family: var(--font-mono);
    font-size: var(--text-xxs);
    color: var(--gold);
    font-weight: bold;
  }
  .feat-bar {
    height: 4px;
    border-radius: 2px;
    background: var(--grey-mid);
    margin-bottom: 8px;
  }
  .feat-bar-fill {
    height: 100%;
    border-radius: 2px;
    background: var(--gold);
  }
  .feat-desc {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--grey-light);
    line-height: 1.4;
  }
  .feat-dims {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--grey-mid);
    margin-top: 4px;
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;

  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const PlayerRow = styled.div`
  margin-bottom: 48px;
`;

const PlayerHeader = styled.div`
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 12px;

  h3 {
    font-family: var(--font-display);
    color: var(--gold);
    font-size: var(--text-lg);
    margin: 0;
  }
  .meta {
    font-family: var(--font-mono);
    color: var(--grey-light);
    font-size: var(--text-xs);
  }
  .confidence {
    font-family: var(--font-mono);
    font-size: var(--text-xxs);
    padding: 2px 8px;
    border-radius: var(--radius-full);
    background: rgba(252, 219, 51, 0.12);
    color: var(--gold);
  }
`;

const VizCard = styled.div`
  border: 1px solid var(--grey-mid);
  border-radius: var(--radius-md);
  padding: 16px;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  align-items: center;

  h4 {
    font-family: var(--font-mono);
    color: var(--grey-light);
    font-size: var(--text-xxs);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin: 0 0 12px;
  }

  svg {
    width: 100%;
    height: auto;
  }
`;

const NeuralNote = styled.div`
  border: 1px solid var(--grey-mid);
  border-radius: var(--radius-md);
  padding: 16px;
  background: rgba(0, 0, 0, 0.3);
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
  line-height: 1.6;

  strong {
    color: #fff;
  }
  .gold {
    color: var(--gold);
  }
`;

const ErrorMsg = styled.div`
  font-family: var(--font-mono);
  color: var(--red);
  font-size: var(--text-xs);
  padding: 8px;
  text-align: center;
`;

// ── Page Header ────────────────────────────────────────

const sigHeader = (
  <PageHero
    eyebrow="Fingerprint Lab"
    title="Player Signatures"
    lead="Generative visualizations from replay fingerprints. Each style encodes the same 48-dimensional player vector into a different visual form."
    lg
  />
);

// ── Page Component ─────────────────────────────────────

export default function Signatures() {
  const [players, setPlayers] = useState({});
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [embeddingMap, setEmbeddingMap] = useState(null);

  useEffect(() => {
    async function fetchAll() {
      const results = {};
      const errs = {};
      await Promise.all(
        TEST_PLAYERS.map(async ({ tag }) => {
          try {
            const res = await fetch(
              `${RELAY_URL}/api/fingerprints/profile/${encodeURIComponent(tag)}`
            );
            if (!res.ok) { errs[tag] = `HTTP ${res.status}`; return; }
            results[tag] = await res.json();
          } catch (err) { errs[tag] = err.message; }
        })
      );
      setPlayers(results);
      setErrors(errs);
      setLoading(false);
    }
    fetchAll();

    // Fetch embedding map for scatter plot
    fetch(`${RELAY_URL}/api/fingerprints/embedding-map`)
      .then(r => r.ok ? r.json() : null)
      .then(data => setEmbeddingMap(data))
      .catch(() => {});
  }, []);

  if (loading) {
    return (
      <PageLayout maxWidth="1200px" bare header={sigHeader}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <PeonLoader />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout maxWidth="1200px" bare header={sigHeader}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>

        {/* ── Feature Importance Summary ── */}
        <Section>
          <SectionTitle>What Makes Players Distinct</SectionTitle>
          <SummaryGrid>
            {FEATURES.map(f => (
              <FeatureCard key={f.name}>
                <div className="feat-header">
                  <span className="feat-name">{f.name}</span>
                  <span className="feat-weight">{Math.round((f.weight / TOTAL_WEIGHT) * 100)}%</span>
                </div>
                <div className="feat-bar">
                  <div className="feat-bar-fill" style={{ width: `${(f.weight / 4) * 100}%` }} />
                </div>
                <div className="feat-desc">{f.desc}</div>
                <div className="feat-dims">{f.dims} dimensions &middot; weight {f.weight}</div>
              </FeatureCard>
            ))}
          </SummaryGrid>
          <NeuralNote style={{ marginTop: 12 }}>
            <strong>Handcrafted model</strong> (above) is fully interpretable — 48 dimensions, 6 weighted segments.
            Combined 50/50 with a <span className="gold">neural embedding</span> (64-dim black box from action sequence encoder).
            The neural model captures sequential patterns the handcrafted features miss.
          </NeuralNote>
        </Section>

        {/* ── Embedding Scatter Plot ── */}
        <Section>
          <SectionTitle>Neural Embedding Space</SectionTitle>
          <NeuralNote style={{ marginBottom: 16 }}>
            All player embeddings projected to 2D via PCA. Players with similar playstyles cluster together.
            Test players highlighted against the full population.
          </NeuralNote>
          <VizCard style={{ padding: 24 }}>
            <EmbeddingScatter
              mapData={embeddingMap}
              highlightTags={TEST_PLAYERS.map(p => p.tag)}
            />
          </VizCard>
        </Section>

        {/* ── Player Viz Grid ── */}
        <Section>
          <SectionTitle>Visualization Mockups</SectionTitle>
          {TEST_PLAYERS.map(({ tag, label, race }) => {
            const data = players[tag];
            const err = errors[tag];

            if (err) {
              return (
                <PlayerRow key={tag}>
                  <PlayerHeader><h3>{label}</h3><span className="meta">{race}</span></PlayerHeader>
                  <ErrorMsg>Error: {err}</ErrorMsg>
                </PlayerRow>
              );
            }
            if (!data?.averaged?.segments) {
              return (
                <PlayerRow key={tag}>
                  <PlayerHeader><h3>{label}</h3><span className="meta">{race}</span></PlayerHeader>
                  <ErrorMsg>No fingerprint data</ErrorMsg>
                </PlayerRow>
              );
            }

            const seg = data.averaged.segments;
            const conf = data.confidence;
            const emb = data.averagedEmbedding;

            return (
              <PlayerRow key={tag}>
                <PlayerHeader>
                  <h3>{label}</h3>
                  <span className="meta">{race} &middot; {data.replayCount} replays</span>
                  {conf && <span className="confidence">{Math.round(conf.confidence * 100)}% confidence</span>}
                </PlayerHeader>
                <Grid>
                  <VizCard>
                    <h4>Penstroke</h4>
                    <PenstrokeSignature segments={seg} battleTag={tag} />
                  </VizCard>
                  <VizCard>
                    <h4>Transition Glyph</h4>
                    <TransitionGlyph segments={seg} />
                  </VizCard>
                  <VizCard>
                    <h4>Tempo Waveform</h4>
                    <TempoWaveform segments={seg} />
                  </VizCard>
                  <VizCard>
                    <h4>Radial Rhythm</h4>
                    <RadialRhythm segments={seg} />
                  </VizCard>
                </Grid>
                <VizCard style={{ marginTop: 8 }}>
                  <h4>Neural Embedding</h4>
                  <EmbeddingHeatmap embedding={emb} label={label} />
                </VizCard>
              </PlayerRow>
            );
          })}
        </Section>

      </div>
    </PageLayout>
  );
}
