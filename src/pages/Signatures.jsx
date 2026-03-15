import React, { useState, useEffect, useCallback, useId, useRef, useMemo, Suspense } from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";
import { PageLayout } from "../components/PageLayout";
import { PageHero, Button } from "../components/ui";
import PeonLoader from "../components/PeonLoader";
import CompareView from "./signatures/CompareView";
import { VIZ_REGISTRY } from "./signatures/vizRegistry";
import TransitionGlyph from "../components/replay-lab/TransitionGlyph";

const RELAY_URL =
  import.meta.env.VITE_CHAT_RELAY_URL || "https://4v4gg-chat-relay.fly.dev";

const TEST_PLAYERS = [
  { tag: "ToD#2792", label: "ToD", race: "Night Elf" },
  { tag: "Lacoste#22218", label: "Lacoste", race: "Orc" },
  { tag: "Boyzinho#11456", label: "Boyzinho", race: "Orc" },
  { tag: "XIIINostra#2552", label: "XIIINostra", race: "Orc" },
];

// Race colors for mini-glyphs
const RACE_BADGE_COLORS = {
  Human: "#3b82f6",
  Orc: "#ef4444",
  "Night Elf": "#a855f7",
  Undead: "#22c55e",
  Random: "#888",
};

// ── Color palette ──────────────────────────────────────
const GOLD = "#fcdb33";
const GOLD_DIM = "#b89a1e";
const GREEN = "#4ade80";
const RED = "#f87171";
const BLUE = "#3b82f6";
const GREY = "var(--grey-light)";
const GREY_MID = "var(--grey-mid)";
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

// ── 1. Penstroke Signature ─────────────────────────────
// (Imported from ../components/PenstrokeSignature)

// ── 2. Transition Glyph ───────────────────────────────
// (Imported from ../components/replay-lab/TransitionGlyph)

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

  function valToColor(v) {
    const t = (v - min) / range;
    if (t < 0.5) {
      const s = t * 2;
      const r = Math.round(30 * s);
      const g = Math.round(30 * s);
      const b = Math.round(180 * (1 - s) + 40 * s);
      return `rgb(${r},${g},${b})`;
    } else {
      const s = (t - 0.5) * 2;
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

function projectEmbedding(embedding, pcaMean, pcaComponents) {
  const centered = embedding.map((v, d) => v - pcaMean[d]);
  const x = pcaComponents[0].reduce((s, c, d) => s + centered[d] * c, 0);
  const y = pcaComponents[1].reduce((s, c, d) => s + centered[d] * c, 0);
  return { x, y };
}

// Compute 2×2 covariance matrix eigendecomposition for rotated ellipse
function covarianceEllipse(dots) {
  if (dots.length < 3) return null;
  const n = dots.length;
  const mx = dots.reduce((s, d) => s + d.x, 0) / n;
  const my = dots.reduce((s, d) => s + d.y, 0) / n;
  let cxx = 0, cyy = 0, cxy = 0;
  for (const d of dots) {
    cxx += (d.x - mx) ** 2;
    cyy += (d.y - my) ** 2;
    cxy += (d.x - mx) * (d.y - my);
  }
  cxx /= n; cyy /= n; cxy /= n;

  // Eigenvalues of [[cxx, cxy], [cxy, cyy]]
  const trace = cxx + cyy;
  const det = cxx * cyy - cxy * cxy;
  const disc = Math.sqrt(Math.max((trace * trace) / 4 - det, 0));
  const l1 = trace / 2 + disc;
  const l2 = trace / 2 - disc;

  // Rotation angle (eigenvector of larger eigenvalue)
  const angle = Math.abs(cxy) < 1e-10 ? 0 : Math.atan2(l1 - cxx, cxy);

  return {
    cx: mx, cy: my,
    rx: Math.sqrt(Math.max(l1, 0)),
    ry: Math.sqrt(Math.max(l2, 0)),
    angleDeg: (angle * 180) / Math.PI,
  };
}

const HOVER_THRESHOLD = 25; // px distance for nearest-point hover

function EmbeddingScatter({ mapData, highlightTags, suspects }) {
  const [expandedTag, setExpandedTag] = useState(null);
  const [replayDots, setReplayDots] = useState(null);
  const [loadingReplays, setLoadingReplays] = useState(false);
  const [hoveredPlayer, setHoveredPlayer] = useState(null);
  const [hoveredReplay, setHoveredReplay] = useState(null);
  const [mousePos, setMousePos] = useState(null);
  const svgRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchedTags, setSearchedTags] = useState([]);
  const [showSuspects, setShowSuspects] = useState(true);
  const [hoveredSuspect, setHoveredSuspect] = useState(null);

  const handlePlayerClick = useCallback(async (battleTag) => {
    if (expandedTag === battleTag) {
      setExpandedTag(null);
      setReplayDots(null);
      return;
    }

    if (!mapData?.pca?.mean || !mapData?.pca?.components) return;

    setExpandedTag(battleTag);
    setLoadingReplays(true);
    try {
      const res = await fetch(
        `${RELAY_URL}/api/fingerprints/embeddings/${encodeURIComponent(battleTag)}`
      );
      if (!res.ok) { setReplayDots(null); setLoadingReplays(false); return; }
      const data = await res.json();

      const dots = data.replays.map(r => {
        const { x, y } = projectEmbedding(r.embedding, mapData.pca.mean, mapData.pca.components);
        return {
          x: Math.round(x * 1000) / 1000,
          y: Math.round(y * 1000) / 1000,
          mapName: r.mapName,
          matchDate: r.matchDate,
          gameDuration: r.gameDuration,
          replayId: r.replayId,
        };
      });

      // Compute cluster stats
      const avgX = dots.reduce((s, d) => s + d.x, 0) / dots.length;
      const avgY = dots.reduce((s, d) => s + d.y, 0) / dots.length;
      const stdX = Math.sqrt(dots.reduce((s, d) => s + (d.x - avgX) ** 2, 0) / dots.length);
      const stdY = Math.sqrt(dots.reduce((s, d) => s + (d.y - avgY) ** 2, 0) / dots.length);
      const ellipse = covarianceEllipse(dots);

      setReplayDots({ dots, avgX, avgY, stdX, stdY, count: dots.length, ellipse });
    } catch {
      setReplayDots(null);
    }
    setLoadingReplays(false);
  }, [expandedTag, mapData]);

  if (!mapData || mapData.players.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "40px 0" }}>
        <PeonLoader size="sm" />
      </div>
    );
  }

  const W = 800, H = 500;
  const PAD_L = 60, PAD_B = 60, PAD_T = 30, PAD_R = 30;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;
  const { players, pca } = mapData;

  const xs = players.map(p => p.x);
  const ys = players.map(p => p.y);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const yMin = Math.min(...ys), yMax = Math.max(...ys);
  const xRange = xMax - xMin || 1;
  const yRange = yMax - yMin || 1;

  const scale = (px, py) => ({
    sx: PAD_L + ((px - xMin) / xRange) * plotW,
    sy: PAD_T + ((py - yMin) / yRange) * plotH,
  });

  // Inverse scale: pixel → data space
  const unscale = (sx, sy) => ({
    dx: xMin + ((sx - PAD_L) / plotW) * xRange,
    dy: yMin + ((sy - PAD_T) / plotH) * yRange,
  });

  // Density heatmap via KDE (memoized — only recomputes when mapData changes)
  const DENSITY_N = 20;
  const densityResult = useMemo(() => {
    const ps = mapData?.players;
    if (!ps || ps.length < 5) return null;
    const xs_ = ps.map(p => p.x), ys_ = ps.map(p => p.y);
    const x0 = Math.min(...xs_), x1 = Math.max(...xs_);
    const y0 = Math.min(...ys_), y1 = Math.max(...ys_);
    const xR = x1 - x0 || 1, yR = y1 - y0 || 1;
    const bw = 1.8, grid = [];
    let max = 0;
    for (let gy = 0; gy < DENSITY_N; gy++) {
      const row = [];
      for (let gx = 0; gx < DENSITY_N; gx++) {
        let sum = 0;
        for (const p of ps) {
          const dx = gx + 0.5 - ((p.x - x0) / xR) * DENSITY_N;
          const dy = gy + 0.5 - ((p.y - y0) / yR) * DENSITY_N;
          const d2 = dx * dx + dy * dy;
          if (d2 < 25) sum += Math.exp(-d2 / (2 * bw * bw));
        }
        row.push(sum);
        if (sum > max) max = sum;
      }
      grid.push(row);
    }
    return { grid, max };
  }, [mapData]);

  const highlightSet = new Set([...highlightTags, ...searchedTags]);
  const searchSuggestions = searchQuery.length >= 2
    ? players.filter(p =>
        p.battleTag.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !highlightSet.has(p.battleTag)
      ).slice(0, 8)
    : [];
  const bgPlayers = players.filter(p => !highlightSet.has(p.battleTag));
  const fgPlayers = players.filter(p => highlightSet.has(p.battleTag));

  // Population centroid + spread
  const popMeanX = players.reduce((a, p) => a + p.x, 0) / players.length;
  const popMeanY = players.reduce((a, p) => a + p.y, 0) / players.length;
  const popStdX = Math.sqrt(
    players.reduce((s, p) => s + (p.x - popMeanX) ** 2, 0) / players.length
  );
  const popStdY = Math.sqrt(
    players.reduce((s, p) => s + (p.y - popMeanY) ** 2, 0) / players.length
  );
  const popStd = Math.sqrt(popStdX ** 2 + popStdY ** 2);

  // Distance from centroid for any player
  const distFromCenter = (p) => {
    const d = Math.sqrt((p.x - popMeanX) ** 2 + (p.y - popMeanY) ** 2);
    return popStd > 0 ? d / popStd : 0;
  };

  // Grid ticks
  const TICK_COUNT = 5;
  const xTicks = Array.from({ length: TICK_COUNT }, (_, i) => {
    const t = i / (TICK_COUNT - 1);
    return { val: xMin + t * xRange, px: PAD_L + t * plotW };
  });
  const yTicks = Array.from({ length: TICK_COUNT }, (_, i) => {
    const t = i / (TICK_COUNT - 1);
    return { val: yMin + t * yRange, px: PAD_T + t * plotH };
  });

  const formatDuration = (secs) => {
    if (!secs) return "?";
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  // Nearest-point hover handler (checks replay dots first, then players)
  const handleMouseMove = (e) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    // Only consider points in the plot area
    if (mx < PAD_L || mx > W - PAD_R || my < PAD_T || my > H - PAD_B) {
      setHoveredPlayer(null);
      setHoveredReplay(null);
      setMousePos(null);
      return;
    }

    const clientPos = { clientX: e.clientX, clientY: e.clientY };

    // Check replay dots first (they're smaller, need priority)
    if (replayDots?.dots) {
      let nearestReplay = null;
      let nearestReplayDist = Infinity;
      for (const d of replayDots.dots) {
        const { sx, sy } = scale(d.x, d.y);
        const dist = Math.sqrt((mx - sx) ** 2 + (my - sy) ** 2);
        if (dist < nearestReplayDist) {
          nearestReplayDist = dist;
          nearestReplay = d;
        }
      }
      if (nearestReplay && nearestReplayDist < 12) {
        setHoveredReplay(nearestReplay);
        setHoveredPlayer(null);
        setMousePos(clientPos);
        return;
      }
    }

    setHoveredReplay(null);

    // Check players
    let nearest = null;
    let nearestDist = Infinity;
    for (const p of players) {
      const { sx, sy } = scale(p.x, p.y);
      const dist = Math.sqrt((mx - sx) ** 2 + (my - sy) ** 2);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = p;
      }
    }

    if (nearest && nearestDist < HOVER_THRESHOLD) {
      setHoveredPlayer(nearest);
      setMousePos(clientPos);
    } else {
      setHoveredPlayer(null);
      setMousePos(null);
    }
  };

  const handleMouseLeave = () => {
    setHoveredPlayer(null);
    setHoveredReplay(null);
    setMousePos(null);
  };

  const handleOverlayClick = () => {
    if (hoveredPlayer && highlightSet.has(hoveredPlayer.battleTag)) {
      handlePlayerClick(hoveredPlayer.battleTag);
    }
  };

  // Hovered point screen coords for crosshairs
  const hoveredSc = hoveredPlayer ? scale(hoveredPlayer.x, hoveredPlayer.y) : null;

  // Date range for cluster stats
  const clusterDateRange = replayDots?.dots?.length > 0 ? (() => {
    const dates = replayDots.dots.filter(d => d.matchDate).map(d => new Date(d.matchDate));
    if (dates.length === 0) return null;
    const min = new Date(Math.min(...dates));
    const max = new Date(Math.max(...dates));
    return `${min.toLocaleDateString()} — ${max.toLocaleDateString()}`;
  })() : null;

  // Cluster tightness (cluster std / population std)
  const tightness = replayDots && popStdX > 0
    ? (replayDots.stdX / popStdX)
    : null;

  return (
    <ScatterContainer>
      {/* ── Search bar ── */}
      <SearchRow>
        <SearchInputWrap>
          <SearchInput
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === "Escape" && setSearchQuery("")}
            placeholder="Search players…"
          />
          {searchSuggestions.length > 0 && (
            <SearchDropdown>
              {searchSuggestions.map(p => (
                <SearchItem key={p.battleTag} onClick={() => {
                  setSearchedTags(prev => [...prev, p.battleTag]);
                  setSearchQuery("");
                }}>
                  <span className="dot" style={{ background: RACE_COLORS[p.race] || GREY }} />
                  <span className="name">{p.battleTag.split("#")[0]}</span>
                  <span className="meta">{p.race} · {p.replayCount} replays</span>
                </SearchItem>
              ))}
            </SearchDropdown>
          )}
        </SearchInputWrap>
        {searchedTags.map(tag => {
          const p = players.find(pl => pl.battleTag === tag);
          return (
            <SearchChip key={tag} style={{ borderColor: p ? RACE_COLORS[p.race] : GREY }}>
              <span className="dot" style={{ background: p ? RACE_COLORS[p.race] : GREY }} />
              {tag.split("#")[0]}
              <button onClick={() => {
                setSearchedTags(prev => prev.filter(t => t !== tag));
                if (expandedTag === tag) { setExpandedTag(null); setReplayDots(null); }
              }}>×</button>
            </SearchChip>
          );
        })}
      </SearchRow>

      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} width="100%">
        {/* ── Defs ── */}
        <defs>
          <filter id="dot-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ── Plot background ── */}
        <rect x={PAD_L} y={PAD_T} width={plotW} height={plotH}
          fill="rgba(0, 0, 0, 0.25)" />

        {/* ── Density heatmap ── */}
        {densityResult && (() => {
          const { grid, max } = densityResult;
          const cellW = plotW / DENSITY_N;
          const cellH = plotH / DENSITY_N;
          const rects = [];
          for (let gy = 0; gy < DENSITY_N; gy++) {
            for (let gx = 0; gx < DENSITY_N; gx++) {
              const t = grid[gy][gx] / max;
              if (t < 0.08) continue;
              const w = t * t;
              const r = Math.round(30 + w * 222);
              const g = Math.round(40 + w * 179);
              const b = Math.round(90 - w * 59);
              const a = 0.03 + w * 0.17;
              rects.push(
                <rect key={`d-${gy}-${gx}`}
                  x={PAD_L + gx * cellW} y={PAD_T + gy * cellH}
                  width={cellW + 0.5} height={cellH + 0.5}
                  fill={`rgba(${r}, ${g}, ${b}, ${a})`} rx="2" />
              );
            }
          }
          return rects;
        })()}

        {/* ── Layer 1: Grid lines ── */}
        {xTicks.map((t, i) => (
          <g key={`xt-${i}`}>
            <line x1={t.px} y1={PAD_T} x2={t.px} y2={H - PAD_B}
              stroke={GREY_MID} strokeWidth="0.5" strokeDasharray="3 3" opacity="0.3" />
            <text x={t.px} y={H - PAD_B + 16} textAnchor="middle"
              fill={GREY} fontSize="9" fontFamily="Inconsolata, monospace">{t.val.toFixed(1)}</text>
          </g>
        ))}
        {yTicks.map((t, i) => (
          <g key={`yt-${i}`}>
            <line x1={PAD_L} y1={t.px} x2={W - PAD_R} y2={t.px}
              stroke={GREY_MID} strokeWidth="0.5" strokeDasharray="3 3" opacity="0.3" />
            <text x={PAD_L - 8} y={t.px + 3} textAnchor="end"
              fill={GREY} fontSize="9" fontFamily="Inconsolata, monospace">{t.val.toFixed(1)}</text>
          </g>
        ))}

        {/* ── Layer 1.5: Suspect connection lines ── */}
        {showSuspects && suspects?.pairs && (() => {
          const playerMap = new Map(players.map(p => [p.battleTag, p]));
          const topPairs = suspects.pairs.slice(0, 20);
          const maxSim = topPairs[0]?.similarity || 1;
          const minSim = topPairs[topPairs.length - 1]?.similarity || 0;
          const simRange = maxSim - minSim || 1;
          return topPairs.map((pair, i) => {
            const pA = playerMap.get(pair.tagA);
            const pB = playerMap.get(pair.tagB);
            if (!pA || !pB) return null;
            const { sx: x1, sy: y1 } = scale(pA.x, pA.y);
            const { sx: x2, sy: y2 } = scale(pB.x, pB.y);
            const t = (pair.similarity - minSim) / simRange;
            const isHovered = hoveredSuspect === i;
            return (
              <line key={`suspect-${i}`} x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={RED} strokeWidth={isHovered ? 2.5 : 0.8 + t * 1.2}
                opacity={isHovered ? 0.8 : 0.1 + t * 0.25}
                strokeDasharray={isHovered ? "none" : "4 3"}
                pointerEvents="none" />
            );
          });
        })()}

        {/* ── Layer 2: Background player dots ── */}
        {bgPlayers.map((p, i) => {
          const { sx, sy } = scale(p.x, p.y);
          const isHovered = hoveredPlayer?.battleTag === p.battleTag;
          return (
            <circle key={`bg-${i}`} cx={sx} cy={sy}
              r={isHovered ? 5.5 : 4}
              fill={RACE_COLORS[p.race] || GREY}
              opacity={isHovered ? 0.85 : 0.35}
              stroke={isHovered ? "#fff" : "rgba(0,0,0,0.4)"}
              strokeWidth={isHovered ? 1 : 0.5}
              pointerEvents="none"
            />
          );
        })}

        {/* ── Layer 3: Replay cluster: ellipses → journey → dots → center ── */}
        {replayDots && expandedTag && (() => {
          const { dots, avgX, avgY, ellipse } = replayDots;
          const player = players.find(p => p.battleTag === expandedTag);
          const color = player ? (RACE_COLORS[player.race] || GOLD) : GOLD;
          const { sx: csx, sy: csy } = scale(avgX, avgY);

          // Sort dated replays for journey path
          const sortedDated = dots.filter(d => d.matchDate)
            .sort((a, b) => new Date(a.matchDate) - new Date(b.matchDate));
          const firstId = sortedDated[0]?.replayId;
          const lastId = sortedDated[sortedDated.length - 1]?.replayId;

          // Rotated covariance ellipse
          let ellipseEls = null;
          if (ellipse) {
            const { sx: esx, sy: esy } = scale(ellipse.cx, ellipse.cy);
            const rxPx = Math.max((ellipse.rx / xRange) * plotW, 4);
            const ryPx = Math.max((ellipse.ry / yRange) * plotH, 4);
            ellipseEls = (
              <g>
                <ellipse cx={esx} cy={esy} rx={rxPx * 2} ry={ryPx * 2}
                  fill="none" stroke={color} strokeWidth="0.8"
                  strokeDasharray="4 3" opacity="0.2"
                  transform={`rotate(${ellipse.angleDeg}, ${esx}, ${esy})`} />
                <ellipse cx={esx} cy={esy} rx={rxPx} ry={ryPx}
                  fill={color} fillOpacity="0.06" stroke={color} strokeWidth="1.2"
                  opacity="0.5"
                  transform={`rotate(${ellipse.angleDeg}, ${esx}, ${esy})`} />
              </g>
            );
          }

          return (
            <g>
              {ellipseEls}

              {/* Radial lines to center (dim) */}
              {dots.map((d, i) => {
                const { sx, sy } = scale(d.x, d.y);
                return (
                  <line key={`line-${i}`} x1={csx} y1={csy} x2={sx} y2={sy}
                    stroke={color} strokeWidth="0.5" opacity="0.08"
                    pointerEvents="none" />
                );
              })}

              {/* Journey path (chronological, old→new = dim→bright) */}
              {sortedDated.length >= 2 && sortedDated.slice(0, -1).map((d, i) => {
                const next = sortedDated[i + 1];
                const { sx: x1, sy: y1 } = scale(d.x, d.y);
                const { sx: x2, sy: y2 } = scale(next.x, next.y);
                const progress = sortedDated.length > 2 ? i / (sortedDated.length - 2) : 1;
                return (
                  <line key={`journey-${i}`} x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke={color} strokeWidth={1 + progress * 1.5}
                    opacity={0.15 + progress * 0.5}
                    strokeLinecap="round" pointerEvents="none" />
                );
              })}

              {/* Replay dots */}
              {dots.map((d, i) => {
                const { sx, sy } = scale(d.x, d.y);
                const isHovered = hoveredReplay === d;
                const isFirst = d.replayId === firstId;
                const isLast = d.replayId === lastId;
                const isEndpoint = isFirst || isLast;
                return (
                  <g key={`replay-${i}`}>
                    <circle cx={sx} cy={sy}
                      r={isHovered ? 4.5 : isEndpoint ? 4 : 3}
                      fill={color} opacity={isHovered ? 0.9 : isEndpoint ? 0.85 : 0.6}
                      stroke={isEndpoint ? "#fff" : "rgba(255,255,255,0.4)"}
                      strokeWidth={isEndpoint ? 1 : 0.5}
                      pointerEvents="none" />
                    {isFirst && sortedDated.length >= 2 && (
                      <text x={sx} y={sy - 7} textAnchor="middle"
                        fill="rgba(255,255,255,0.5)" fontSize="7"
                        fontFamily="Inconsolata, monospace" pointerEvents="none">1</text>
                    )}
                    {isLast && sortedDated.length >= 2 && (
                      <text x={sx} y={sy - 7} textAnchor="middle"
                        fill="rgba(255,255,255,0.7)" fontSize="7"
                        fontFamily="Inconsolata, monospace" pointerEvents="none">
                        {sortedDated.length}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Cluster center (mean) */}
              <circle cx={csx} cy={csy} r="2.5" fill="#fff" stroke={color}
                strokeWidth="1" opacity="0.9" />
              <line x1={csx - 5} y1={csy} x2={csx + 5} y2={csy}
                stroke="#fff" strokeWidth="0.8" opacity="0.6" />
              <line x1={csx} y1={csy - 5} x2={csx} y2={csy + 5}
                stroke="#fff" strokeWidth="0.8" opacity="0.6" />
            </g>
          );
        })()}

        {/* ── Layer 4: Foreground (highlighted) player dots ── */}
        {fgPlayers.map((p, i) => {
          const { sx, sy } = scale(p.x, p.y);
          const color = RACE_COLORS[p.race] || GOLD;
          const label = p.battleTag.split("#")[0];
          const isExpanded = expandedTag === p.battleTag;
          const isHovered = hoveredPlayer?.battleTag === p.battleTag;
          const r = isExpanded ? 7 : isHovered ? 6.5 : 5.5;
          return (
            <g key={`fg-${i}`} pointerEvents="none">
              {/* Glow */}
              <circle cx={sx} cy={sy} r={r} fill={color} opacity="0.4"
                filter="url(#dot-glow)" />
              {isExpanded && (
                <circle cx={sx} cy={sy} r="15" fill="none" stroke={color}
                  strokeWidth="1.2" strokeDasharray="3 2" opacity="0.5" />
              )}
              <circle cx={sx} cy={sy} r={r}
                fill={color} stroke="#fff" strokeWidth={isExpanded ? 2 : 1.5} />
              <text x={sx + 12} y={sy + 4} fill="#fff" fontSize="11"
                fontFamily="var(--font-display)" fontWeight="bold"
                stroke="rgba(0,0,0,0.7)" strokeWidth="3" paintOrder="stroke">
                {label}
              </text>
            </g>
          );
        })}

        {/* ── Layer 5: Hover crosshairs + highlight ring ── */}
        {hoveredSc && (
          <g pointerEvents="none">
            <line x1={hoveredSc.sx} y1={PAD_T} x2={hoveredSc.sx} y2={H - PAD_B}
              stroke={RACE_COLORS[hoveredPlayer.race] || GREY} strokeWidth="0.8"
              strokeDasharray="4 3" opacity="0.35" />
            <line x1={PAD_L} y1={hoveredSc.sy} x2={W - PAD_R} y2={hoveredSc.sy}
              stroke={RACE_COLORS[hoveredPlayer.race] || GREY} strokeWidth="0.8"
              strokeDasharray="4 3" opacity="0.35" />
            {/* Coordinate labels at axis edges */}
            {(() => {
              const { dx, dy } = unscale(hoveredSc.sx, hoveredSc.sy);
              return (
                <>
                  <text x={hoveredSc.sx} y={H - PAD_B + 28} textAnchor="middle"
                    fill={RACE_COLORS[hoveredPlayer.race] || GREY} fontSize="8"
                    fontFamily="Inconsolata, monospace">{dx.toFixed(2)}</text>
                  <text x={PAD_L - 8} y={hoveredSc.sy + 3} textAnchor="end"
                    fill={RACE_COLORS[hoveredPlayer.race] || GREY} fontSize="8"
                    fontFamily="Inconsolata, monospace">{dy.toFixed(2)}</text>
                </>
              );
            })()}
            {/* Enlarged ring around hovered dot (if not highlighted) */}
            {!highlightSet.has(hoveredPlayer.battleTag) && (
              <circle cx={hoveredSc.sx} cy={hoveredSc.sy} r="8"
                fill="none" stroke={RACE_COLORS[hoveredPlayer.race] || GREY}
                strokeWidth="1.5" opacity="0.6" />
            )}
          </g>
        )}

        {/* ── Population centroid ── */}
        {(() => {
          const { sx: cmx, sy: cmy } = scale(popMeanX, popMeanY);
          return (
            <g opacity="0.25" pointerEvents="none">
              <line x1={cmx - 8} y1={cmy} x2={cmx + 8} y2={cmy} stroke={GREY} strokeWidth="1" />
              <line x1={cmx} y1={cmy - 8} x2={cmx} y2={cmy + 8} stroke={GREY} strokeWidth="1" />
              <circle cx={cmx} cy={cmy} r="3" fill="none" stroke={GREY} strokeWidth="0.8" />
            </g>
          );
        })()}

        {/* ── Layer 7: Axis lines + labels + legend ── */}
        <line x1={PAD_L} y1={H - PAD_B} x2={W - PAD_R} y2={H - PAD_B} stroke={GREY_MID} strokeWidth="1" />
        <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={H - PAD_B} stroke={GREY_MID} strokeWidth="1" />
        <text x={(PAD_L + W - PAD_R) / 2} y={H - 12} textAnchor="middle"
          fill={GREY} fontSize="10" fontFamily="Inconsolata, monospace">
          PC1 ({pca?.varianceExplained?.[0]}% var)
        </text>
        <text x={16} y={(PAD_T + H - PAD_B) / 2} textAnchor="middle"
          fill={GREY} fontSize="10" fontFamily="Inconsolata, monospace"
          transform={`rotate(-90, 16, ${(PAD_T + H - PAD_B) / 2})`}>
          PC2 ({pca?.varianceExplained?.[1]}% var)
        </text>

        {/* Legend */}
        {Object.entries(RACE_COLORS).filter(([r]) => r !== "Random").map(([race, color], i) => {
          const count = players.filter(p => p.race === race).length;
          return (
            <g key={race} transform={`translate(${W - PAD_R - 90}, ${PAD_T + 6 + i * 16})`}>
              <circle cx="4" cy="0" r="3" fill={color} opacity="0.6" />
              <text x="12" y="3" fill={GREY} fontSize="8" fontFamily="Inconsolata, monospace">
                {race} ({count})
              </text>
            </g>
          );
        })}
        <text x={W - PAD_R - 90} y={PAD_T + 6 + 4 * 16 + 6} fill={GREY_MID}
          fontSize="8" fontFamily="Inconsolata, monospace">
          n={players.length}
        </text>

        {/* ── Layer 8: Transparent overlay (captures all mouse events) ── */}
        <rect x={PAD_L} y={PAD_T} width={plotW} height={plotH}
          fill="transparent" style={{ cursor: hoveredPlayer && highlightSet.has(hoveredPlayer.battleTag) ? "pointer" : "crosshair" }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleOverlayClick} />
      </svg>

      {/* HTML tooltip — player */}
      {hoveredPlayer && mousePos && (
        <ScatterTooltip style={{
          left: mousePos.clientX,
          top: mousePos.clientY,
        }}>
          <span className="name" style={{ color: RACE_COLORS[hoveredPlayer.race] || GREY }}>
            {hoveredPlayer.battleTag.split("#")[0]}
          </span>
          <span className="race">{hoveredPlayer.race} &middot; {hoveredPlayer.replayCount} replays</span>
          <span className="count">{distFromCenter(hoveredPlayer).toFixed(1)}σ from center</span>
        </ScatterTooltip>
      )}

      {/* HTML tooltip — replay dot */}
      {hoveredReplay && mousePos && (
        <ScatterTooltip style={{
          left: mousePos.clientX,
          top: mousePos.clientY,
        }}>
          <span className="name">{hoveredReplay.mapName || "Unknown map"}</span>
          <span className="count">
            {hoveredReplay.matchDate ? new Date(hoveredReplay.matchDate).toLocaleDateString() : "?"} — {formatDuration(hoveredReplay.gameDuration)}
          </span>
        </ScatterTooltip>
      )}

      {/* Cluster stats panel */}
      {loadingReplays && (
        <div style={{ marginTop: 8 }}><PeonLoader size="sm" /></div>
      )}
      {replayDots && expandedTag && !loadingReplays && (
        <ClusterStats>
          <span className="tag">{expandedTag.split("#")[0]}</span>
          <span>{replayDots.count} replays</span>
          {tightness !== null && (
            <span>tightness: <strong style={{ color: tightness < 0.3 ? GREEN : tightness < 0.6 ? GOLD : RED }}>
              {(tightness * 100).toFixed(0)}%
            </strong></span>
          )}
          {clusterDateRange && <span>{clusterDateRange}</span>}
          <span className="hint">click player to collapse</span>
        </ClusterStats>
      )}

      {/* ── Suspects panel ── */}
      {suspects?.pairs?.length > 0 && (
        <SuspectsPanel>
          <SuspectsPanelHeader>
            <span className="title">Smurf Detection</span>
            <span className="meta">{suspects.pairs.length} pairs · {suspects.playerCount} players</span>
            <button
              className={showSuspects ? "active" : ""}
              onClick={() => setShowSuspects(s => !s)}
            >
              {showSuspects ? "Hide lines" : "Show lines"}
            </button>
          </SuspectsPanelHeader>
          <SuspectsTable>
            <thead>
              <tr>
                <th>Player A</th>
                <th>Player B</th>
                <th>Match</th>
                <th>Pctl</th>
                <th>HC</th>
                <th>NN</th>
              </tr>
            </thead>
            <tbody>
              {suspects.pairs.map((pair, i) => {
                const isTop20 = i < 20;
                return (
                  <tr key={i}
                    className={hoveredSuspect === i ? "hovered" : ""}
                    onMouseEnter={() => setHoveredSuspect(i)}
                    onMouseLeave={() => setHoveredSuspect(null)}
                    onClick={() => {
                      const tags = [pair.tagA, pair.tagB].filter(t =>
                        !new Set(highlightTags).has(t)
                      );
                      setSearchedTags(prev => {
                        const existing = new Set(prev);
                        const next = [...prev];
                        for (const t of tags) {
                          if (!existing.has(t)) next.push(t);
                        }
                        return next;
                      });
                    }}
                  >
                    <td>
                      <span className="dot" style={{ background: RACE_COLORS[pair.raceA] || GREY }} />
                      {pair.tagA.split("#")[0]}
                    </td>
                    <td>
                      <span className="dot" style={{ background: RACE_COLORS[pair.raceB] || GREY }} />
                      {pair.tagB.split("#")[0]}
                    </td>
                    <td className="sim" style={{
                      color: pair.similarity > 0.85 ? RED
                        : pair.similarity > 0.75 ? GOLD
                        : GREY,
                    }}>
                      {(pair.similarity * 100).toFixed(1)}%
                    </td>
                    <td className="pctl">
                      {pair.percentile != null ? `${pair.percentile}%` : "—"}
                    </td>
                    <td className="dim">{pair.handcrafted != null ? (pair.handcrafted * 100).toFixed(0) : "—"}</td>
                    <td className="dim">{pair.embedding != null ? (pair.embedding * 100).toFixed(0) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </SuspectsTable>
        </SuspectsPanel>
      )}
    </ScatterContainer>
  );
}

// ── Styled Components ──────────────────────────────────

const Section = styled.section`
  margin-bottom: var(--space-12);
`;

const SectionTitle = styled.h2`
  font-family: var(--font-display);
  font-size: clamp(1.2rem, 3vw, 1.6rem);
  color: var(--white);
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
    color: var(--white);
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

const VizRow = styled.div`
  margin-bottom: var(--space-8);
`;

const VizRowHeader = styled.div`
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 12px;

  .name {
    font-family: var(--font-display);
    color: var(--white);
    font-size: var(--text-base);
  }
  .desc {
    font-family: var(--font-mono);
    color: var(--grey-light);
    font-size: var(--text-xxs);
  }
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

const ScatterContainer = styled.div`
  position: relative;

  svg {
    display: block;
    width: 100%;
    height: auto;
  }
`;

const SearchRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
`;

const SearchInputWrap = styled.div`
  position: relative;
`;

const SearchInput = styled.input`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  background: var(--surface-1);
  border: 1px solid var(--grey-mid);
  border-radius: var(--radius-sm);
  color: var(--white);
  padding: 6px 12px;
  width: 200px;
  outline: none;
  transition: var(--transition);

  &:focus {
    border-color: var(--gold);
    background: var(--surface-2);
  }

  &:hover {
    border-color: rgba(252,219,51,0.5);
  }

  &::placeholder {
    color: var(--grey-mid);
    opacity: 0.8;
  }
`;

const SearchDropdown = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  width: 280px;
  background: rgba(10, 10, 10, 0.95);
  border: 1px solid var(--grey-mid);
  border-radius: var(--radius-sm, 4px);
  margin-top: 4px;
  z-index: 50;
  max-height: 240px;
  overflow-y: auto;
`;

const SearchItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  cursor: pointer;
  font-family: var(--font-mono);
  font-size: 11px;

  &:hover {
    background: rgba(252, 219, 51, 0.08);
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .name {
    color: var(--white);
    font-family: var(--font-display);
    font-size: 12px;
  }
  .meta {
    color: var(--grey-light);
    margin-left: auto;
    font-size: 10px;
  }
`;

const SearchChip = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px 4px 6px;
  border: 1px solid var(--grey-mid);
  border-radius: var(--radius-full);
  font-family: var(--font-display);
  font-size: 12px;
  color: var(--white);
  background: rgba(0, 0, 0, 0.3);

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }
  button {
    background: none;
    border: none;
    color: var(--grey-light);
    cursor: pointer;
    font-size: 14px;
    padding: 0 2px;
    line-height: 1;
    &:hover {
      color: var(--red);
    }
  }
`;

const SuspectsPanel = styled.div`
  margin-top: var(--space-4);
  border: 1px solid var(--grey-mid);
  border-radius: var(--radius-md);
  background: rgba(0, 0, 0, 0.3);
  overflow: hidden;
`;

const SuspectsPanelHeader = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-2) var(--space-4);
  border-bottom: 1px solid var(--grey-mid);

  .title {
    font-family: var(--font-display);
    color: var(--white);
    font-size: var(--text-sm);
  }
  .meta {
    font-family: var(--font-mono);
    color: var(--grey-light);
    font-size: var(--text-xxs);
  }
  button {
    margin-left: auto;
    font-family: var(--font-mono);
    font-size: var(--text-xxs);
    background: none;
    border: 1px solid var(--grey-mid);
    border-radius: var(--radius-sm, 4px);
    color: var(--grey-light);
    padding: 3px 10px;
    cursor: pointer;
    &.active { color: var(--red); border-color: var(--red); }
    &:hover { color: #fff; }
  }
`;

const SuspectsTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-family: var(--font-mono);
  font-size: 11px;
  max-height: 320px;
  display: block;
  overflow-y: auto;

  thead, tbody, tr { display: table; width: 100%; table-layout: fixed; }

  th {
    text-align: left;
    padding: 6px 10px;
    color: var(--grey-mid);
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    border-bottom: 1px solid var(--grey-mid);
    position: sticky;
    top: 0;
    background: rgba(10, 10, 10, 0.95);
  }
  td {
    padding: 5px 10px;
    color: var(--grey-light);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .dot {
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    margin-right: 6px;
    vertical-align: middle;
  }
  .sim {
    font-weight: bold;
    font-size: 12px;
  }
  .pctl {
    color: var(--grey-mid);
  }
  .dim {
    color: var(--grey-mid);
    font-size: 10px;
  }
  tbody tr {
    cursor: pointer;
    &:hover, &.hovered {
      background: rgba(248, 113, 113, 0.06);
    }
  }
`;

const ScatterTooltip = styled.div`
  position: fixed;
  transform: translate(12px, -100%);
  pointer-events: none;
  background: rgba(0, 0, 0, 0.9);
  border: 1px solid var(--grey-mid);
  border-radius: var(--radius-sm, 4px);
  padding: 6px 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  z-index: 100;
  white-space: nowrap;
  font-family: var(--font-mono);
  font-size: 11px;

  .name {
    font-family: var(--font-display);
    font-size: 13px;
    font-weight: bold;
  }
  .race {
    color: var(--grey-light, #bbb);
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .count {
    color: var(--grey-light, #bbb);
    font-size: 10px;
  }
`;

const ClusterStats = styled.div`
  display: flex;
  gap: var(--space-4);
  align-items: center;
  flex-wrap: wrap;
  margin-top: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border: 1px solid var(--grey-mid);
  border-radius: var(--radius-md);
  background: rgba(0, 0, 0, 0.3);
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);

  .tag {
    color: var(--gold);
    font-weight: bold;
  }
  .hint {
    color: var(--grey-mid);
    margin-left: auto;
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
    color: var(--white);
  }
  .gold {
    color: var(--gold);
  }
`;

// ── Player Gallery Styles ──────────────────────────────

const GalleryControls = styled.div`
  display: flex;
  gap: var(--space-4);
  margin-bottom: var(--space-6);
  flex-wrap: wrap;
  align-items: center;
`;

const GallerySearch = styled.input`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  background: var(--surface-1);
  border: 1px solid var(--grey-mid);
  border-radius: var(--radius-md);
  color: var(--white);
  padding: 10px 16px;
  width: 280px;
  outline: none;
  transition: var(--transition);

  &:focus {
    border-color: var(--gold);
    background: var(--surface-2);
  }
  &::placeholder {
    color: var(--grey-mid);
  }
`;

const RaceFilter = styled.div`
  display: flex;
  gap: 4px;
`;

const RaceButton = styled.button`
  background: ${p => p.$active ? "rgba(252, 219, 51, 0.15)" : "transparent"};
  border: 1px solid ${p => p.$active ? "var(--gold)" : "var(--grey-mid)"};
  border-radius: var(--radius-sm);
  color: ${p => p.$active ? "var(--gold)" : "var(--grey-light)"};
  padding: 6px 12px;
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: var(--gold);
    color: var(--white);
  }
`;

const SortSelect = styled.select`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  background: var(--surface-1);
  border: 1px solid var(--grey-mid);
  border-radius: var(--radius-sm);
  color: var(--grey-light);
  padding: 6px 10px;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: var(--gold);
  }
`;

const GalleryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-6);
`;

const PlayerCard = styled(Link)`
  display: flex;
  flex-direction: column;
  border: 1px solid var(--grey-mid);
  border-radius: var(--radius-md);
  background: rgba(0, 0, 0, 0.3);
  padding: var(--space-4);
  text-decoration: none;
  transition: all 0.15s;

  &:hover {
    border-color: var(--gold);
    background: rgba(252, 219, 51, 0.03);
    transform: translateY(-2px);
  }
`;

const PlayerCardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
`;

const RaceDot = styled.span`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${p => p.$color || "#888"};
  flex-shrink: 0;
`;

const PlayerName = styled.span`
  font-family: var(--font-display);
  color: var(--gold);
  font-size: var(--text-base);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const PlayerMmr = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: #fff;
  margin-left: auto;
`;

const PlayerMeta = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
`;

const MiniGlyphWrap = styled.div`
  height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
`;

const PlayerStats = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: auto;
`;

const StatCell = styled.div`
  text-align: center;

  .value {
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    color: var(--gold);
    font-weight: bold;
  }
  .label {
    font-family: var(--font-mono);
    font-size: 9px;
    color: var(--grey-mid);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
`;

const GalleryEmpty = styled.div`
  text-align: center;
  padding: var(--space-8);
  color: var(--grey-light);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
`;

const GalleryCount = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-mid);
  margin-left: auto;
`;

const SegmentRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: var(--space-6);
`;

const SegmentTag = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  background: ${p => p.$active ? `${p.$color}20` : "transparent"};
  border: 1px solid ${p => p.$active ? p.$color : "var(--grey-mid)"};
  border-radius: var(--radius-full);
  color: ${p => p.$active ? p.$color : "var(--grey-light)"};
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: ${p => p.$color};
    color: ${p => p.$color};
    background: ${p => `${p.$color}10`};
  }

  .label {
    font-weight: 500;
  }

  .count {
    font-size: 10px;
    opacity: 0.7;
    background: ${p => p.$active ? `${p.$color}30` : "rgba(255,255,255,0.08)"};
    padding: 1px 6px;
    border-radius: 10px;
  }
`;

// ── Segment Definitions ────────────────────────────────

// Building IDs from WC3 (all races)
const BUILDINGS = new Set([
  'htow','hkee','hcas','halt','hbar','hbla','hars','hlum','hwtw','hatw','hgtw','hctw','harm','hgra','hvlt','hhou','hrtt',
  'ogre','ostr','ofrt','oalt','obar','ofor','osld','obea','otrb','otto','owtw','ovln','ohou',
  'etol','etoa','etoe','eate','eaom','eaow','eaoe','edob','emow','etrp','eden',
  'unpl','unp1','unp2','uaod','usep','ugrv','utod','uslh','ubon','utom','uzig','uzg1','uzg2','ugol',
]);

// Check if player only uses building groups (4-9), no army groups (1-3)
const hasNoArmyHotkeys = (p) => {
  const groupUsage = p.groupUsage || [];
  const armyGroups = groupUsage.filter(g => g.group >= 1 && g.group <= 3);
  const totalArmyUsage = armyGroups.reduce((sum, g) => sum + (g.used || 0) + (g.assigned || 0), 0);
  const totalUsage = groupUsage.reduce((sum, g) => sum + (g.used || 0) + (g.assigned || 0), 0);
  return totalUsage > 10 && totalArmyUsage < 5;
};

// Check if group 1 has mostly buildings (classic RTS habit)
const hasBuildingsOnOne = (p) => {
  const comp = p.groupCompositions?.["1"];
  if (!comp || comp.length === 0) return false;
  const totalCount = comp.reduce((s, u) => s + u.count, 0);
  const buildingCount = comp.filter(u => BUILDINGS.has(u.id)).reduce((s, u) => s + u.count, 0);
  return totalCount > 0 && (buildingCount / totalCount) > 0.5;
};

const SEGMENTS = [
  {
    id: "speed-demons",
    label: "Speed Demons",
    desc: "200+ APM average",
    filter: p => (p.metrics?.meanApm || 0) >= 200,
    color: "#f97316", // orange
  },
  {
    id: "slow-steady",
    label: "Slow & Steady",
    desc: "Under 120 APM",
    filter: p => (p.metrics?.meanApm || 999) < 120 && (p.metrics?.meanApm || 0) > 0,
    color: "#64748b", // slate
  },
  {
    id: "control-masters",
    label: "Control Masters",
    desc: "6+ hotkey groups active",
    filter: p => (p.metrics?.activeGroups || 0) >= 6,
    color: "#8b5cf6", // purple
  },
  {
    id: "selection-addicts",
    label: "Selection Addicts",
    desc: "40%+ actions are re-selects",
    filter: p => (p.metrics?.selectPct || 0) >= 40,
    color: "#ec4899", // pink
  },
  {
    id: "buildings-on-1",
    label: "Buildings on 1",
    desc: "Classic RTS habit - production on group 1",
    filter: hasBuildingsOnOne,
    color: "#14b8a6", // teal
  },
  {
    id: "no-army-hotkeys",
    label: "No Army Hotkeys",
    desc: "Only buildings on control groups",
    filter: hasNoArmyHotkeys,
    color: "#06b6d4", // cyan
  },
  {
    id: "one-group-wonders",
    label: "One-Group Wonders",
    desc: "70%+ on single group",
    filter: p => (p.metrics?.topGroupPct || 0) >= 70,
    color: "#ef4444", // red
  },
];

// ── Player Gallery Component ───────────────────────────

function PlayerGallery({ players, loading }) {
  const [search, setSearch] = useState("");
  const [raceFilter, setRaceFilter] = useState(null);
  const [segmentFilter, setSegmentFilter] = useState(null);
  const [sortBy, setSortBy] = useState("mmr");

  // Compute segment counts
  const segmentCounts = useMemo(() => {
    const counts = {};
    for (const seg of SEGMENTS) {
      counts[seg.id] = players.filter(seg.filter).length;
    }
    return counts;
  }, [players]);

  const filtered = useMemo(() => {
    let result = [...players];

    // Filter by search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.battleTag.toLowerCase().includes(q)
      );
    }

    // Filter by race
    if (raceFilter) {
      result = result.filter(p => p.race === raceFilter);
    }

    // Filter by segment
    if (segmentFilter) {
      const seg = SEGMENTS.find(s => s.id === segmentFilter);
      if (seg) {
        result = result.filter(seg.filter);
      }
    }

    // Sort
    switch (sortBy) {
      case "mmr":
        result.sort((a, b) => (b.mmr || 0) - (a.mmr || 0));
        break;
      case "apm":
        result.sort((a, b) => (b.metrics?.meanApm || 0) - (a.metrics?.meanApm || 0));
        break;
      case "name":
        result.sort((a, b) => a.battleTag.localeCompare(b.battleTag));
        break;
    }

    return result;
  }, [players, search, raceFilter, segmentFilter, sortBy]);

  if (loading) {
    return <PeonLoader />;
  }

  return (
    <>
      <GalleryControls>
        <GallerySearch
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search players..."
        />
        <RaceFilter>
          <RaceButton $active={!raceFilter} onClick={() => setRaceFilter(null)}>All</RaceButton>
          <RaceButton $active={raceFilter === "Human"} onClick={() => setRaceFilter("Human")}>HU</RaceButton>
          <RaceButton $active={raceFilter === "Orc"} onClick={() => setRaceFilter("Orc")}>ORC</RaceButton>
          <RaceButton $active={raceFilter === "Night Elf"} onClick={() => setRaceFilter("Night Elf")}>NE</RaceButton>
          <RaceButton $active={raceFilter === "Undead"} onClick={() => setRaceFilter("Undead")}>UD</RaceButton>
        </RaceFilter>
        <SortSelect value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="mmr">Highest MMR</option>
          <option value="apm">Highest APM</option>
          <option value="name">Name A-Z</option>
        </SortSelect>
        <GalleryCount>{filtered.length} players</GalleryCount>
      </GalleryControls>

      <SegmentRow>
        {SEGMENTS.map(seg => (
          <SegmentTag
            key={seg.id}
            $active={segmentFilter === seg.id}
            $color={seg.color}
            onClick={() => setSegmentFilter(segmentFilter === seg.id ? null : seg.id)}
            title={seg.desc}
          >
            <span className="label">{seg.label}</span>
            <span className="count">{segmentCounts[seg.id]}</span>
          </SegmentTag>
        ))}
      </SegmentRow>

      {filtered.length === 0 ? (
        <GalleryEmpty>
          {players.length === 0
            ? "No player signatures yet. Upload a replay to get started!"
            : "No players match your search."}
        </GalleryEmpty>
      ) : (
        <GalleryGrid>
          {filtered.slice(0, 60).map(p => (
            <PlayerCard key={p.battleTag} to={`/player/${encodeURIComponent(p.battleTag)}?tab=playstyle`}>
              <PlayerCardHeader>
                <RaceDot $color={RACE_BADGE_COLORS[p.race]} />
                <PlayerName>{p.battleTag.split("#")[0]}</PlayerName>
                {p.mmr > 0 && <PlayerMmr>{p.mmr}</PlayerMmr>}
              </PlayerCardHeader>
              <MiniGlyphWrap>
                <TransitionGlyph
                  transitionPairs={p.transitionPairs || []}
                  groupUsage={p.groupUsage || []}
                  groupCompositions={p.groupCompositions || {}}
                  segments={p.segments}
                  playerName={p.battleTag}
                  mini
                />
              </MiniGlyphWrap>
              <PlayerMeta>{p.race} · {p.replayCount} games</PlayerMeta>
            </PlayerCard>
          ))}
        </GalleryGrid>
      )}

      {filtered.length > 60 && (
        <NeuralNote style={{ marginTop: "var(--space-4)", textAlign: "center" }}>
          Showing 60 of {filtered.length} players. Use search to find specific players.
        </NeuralNote>
      )}
    </>
  );
}


const ErrorMsg = styled.div`
  font-family: var(--font-mono);
  color: var(--red);
  font-size: var(--text-xs);
  padding: 8px;
  text-align: center;
`;

const ModeToggle = styled.div`
  display: flex;
  gap: 0;
  margin-bottom: var(--space-6);
  border: 1px solid var(--grey-mid);
  border-radius: var(--radius-md);
  overflow: hidden;
  width: fit-content;
`;

const ModeButton = styled.button`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: var(--space-2) var(--space-6);
  border: none;
  cursor: pointer;
  transition: all 0.15s;
  background: ${(p) => (p.$active ? "rgba(252, 219, 51, 0.15)" : "transparent")};
  color: ${(p) => (p.$active ? "var(--gold)" : "var(--grey-light)")};

  &:hover {
    color: var(--white);
    background: ${(p) => (p.$active ? "rgba(252, 219, 51, 0.15)" : "var(--surface-2)")};
  }

  & + & {
    border-left: 1px solid var(--grey-mid);
  }
`;

const VizCount = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-mid);
  margin-left: var(--space-4);
`;

// ── Page Header ────────────────────────────────────────

const sigHeader = (
  <PageHero
    eyebrow="Playstyle Analysis"
    title="Player Signatures"
    lead="Every player has a unique fingerprint based on their APM, hotkey usage, and action patterns. Upload replays to build the database and explore how players compare."
    lg
  />
);

// ── Page Component ─────────────────────────────────────

export default function Signatures() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${RELAY_URL}/api/fingerprints/gallery`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.players) {
          setPlayers(data.players);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <PageLayout maxWidth="1200px" bare header={sigHeader}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <PlayerGallery players={players} loading={loading} />
      </div>
    </PageLayout>
  );
}
