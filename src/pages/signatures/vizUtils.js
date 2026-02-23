/**
 * Shared utilities for signature visualizations.
 * All viz components should import helpers from here instead of defining their own.
 */

// ── Color palette ──────────────────────────────────────
export const GOLD = "#fcdb33";
export const GOLD_DIM = "#b89a1e";
export const GREEN = "#4ade80";
export const RED = "#f87171";
export const BLUE = "#3b82f6";
export const GREY = "#bbb";
export const GREY_MID = "#444";
export const GREY_DARK = "#1a1a1a";
export const TRAIT_COLORS = [GOLD, GREEN, BLUE, RED, "#c084fc", "#f472b6"];

export const RACE_COLORS = {
  Human: "#3b82f6",
  Orc: "#ef4444",
  "Night Elf": "#a855f7",
  Undead: "#22c55e",
  Random: GREY,
};

// ── Seeded RNG ─────────────────────────────────────────

export function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// ── Geometry helpers ───────────────────────────────────

/** Convert polar coordinates to cartesian */
export function polarPoint(cx, cy, radius, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + Math.cos(rad) * radius,
    y: cy + Math.sin(rad) * radius,
  };
}

/** Convert polar (radians) to cartesian */
export function polarToCart(cx, cy, radius, angleRad) {
  return {
    x: cx + Math.cos(angleRad) * radius,
    y: cy + Math.sin(angleRad) * radius,
  };
}

/** Smooth cubic bezier path through points */
export function smoothPath(pts, tension = 0.4) {
  if (!pts || pts.length < 2) return "";
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const cpx1 = prev.x + (curr.x - prev.x) * tension;
    const cpx2 = curr.x - (curr.x - prev.x) * tension;
    d += ` C ${cpx1} ${prev.y}, ${cpx2} ${curr.y}, ${curr.x} ${curr.y}`;
  }
  return d;
}

/** Linear interpolation */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** Clamp value between min and max */
export function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val));
}

/** Map value from one range to another */
export function mapRange(val, inMin, inMax, outMin, outMax) {
  return outMin + ((val - inMin) / (inMax - inMin || 1)) * (outMax - outMin);
}

// ── Color helpers ──────────────────────────────────────

/** Blue → Black → Gold color scale for embedding values */
export function valToColor(v, min, max) {
  const range = max - min || 1;
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

/** Interpolate between two hex colors */
export function lerpColor(colorA, colorB, t) {
  const a = hexToRgb(colorA);
  const b = hexToRgb(colorB);
  const r = Math.round(lerp(a.r, b.r, t));
  const g = Math.round(lerp(a.g, b.g, t));
  const bl = Math.round(lerp(a.b, b.b, t));
  return `rgb(${r},${g},${bl})`;
}

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

/** Get a hue-shifted gold for variety */
export function goldVariant(index, total) {
  const hue = 45 + (index / total) * 30 - 15; // 30-60 range
  const sat = 85 + (index % 3) * 5;
  return `hsl(${hue}, ${sat}%, 60%)`;
}

// ── Data helpers ───────────────────────────────────────

/** Safely get all 63 dims as a flat array from segments */
export function flattenSegments(segments) {
  if (!segments) return Array(63).fill(0);
  const { action = [], apm = [], hotkey = [], tempo = [], intensity = [], transitions = [], rhythm = [] } = segments;
  return [...action, ...apm, ...hotkey, ...tempo, ...intensity, ...transitions, ...rhythm];
}

/** Normalize an array to 0-1 range */
export function normalize(arr) {
  const min = Math.min(...arr);
  const max = Math.max(...arr);
  const range = max - min || 1;
  return arr.map((v) => (v - min) / range);
}

/** Safe max of array (returns fallback if empty/all zeros) */
export function safeMax(arr, fallback = 0.01) {
  const m = Math.max(...(arr || []), 0);
  return m > 0 ? m : fallback;
}

/** Sum an array */
export function sum(arr) {
  return (arr || []).reduce((a, b) => a + b, 0);
}
