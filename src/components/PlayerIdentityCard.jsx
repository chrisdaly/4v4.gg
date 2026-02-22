import React from "react";
import styled from "styled-components";

// ── Radar Constants ─────────────────────────────

const RADAR_PAD = 20;
const RADAR_INNER = 160;
const RADAR_SIZE = RADAR_INNER + RADAR_PAD * 2;
const RADAR_CX = RADAR_SIZE / 2;
const RADAR_CY = RADAR_SIZE / 2;
const RADAR_R = RADAR_INNER / 2 - 6;
const RADAR_GROUPS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];

export function polarToCart(angle, radius) {
  const x = RADAR_CX + radius * Math.sin(angle);
  const y = RADAR_CY - radius * Math.cos(angle);
  return [x, y];
}

export { RADAR_GROUPS, RADAR_PAD, RADAR_INNER, RADAR_SIZE, RADAR_CX, RADAR_CY, RADAR_R };

// ── Signature Axes ──────────────────────────────

export const SIG_AXES = [
  { key: "speed", label: "Speed" },
  { key: "burst", label: "Burst" },
  { key: "hkIntensity", label: "HK Use" },
  { key: "hkDiversity", label: "HK Spread" },
  { key: "assignRatio", label: "Assign" },
  { key: "tempo", label: "Fast Tempo" },
];

/**
 * Extract signature features from fingerprint segments.
 * All values normalized to 0-1 range for radar display.
 */
export function extractSignature(segments) {
  if (!segments) return null;
  const apm = segments.apm || [0, 0, 0];
  const action = segments.action || [];
  const hotkey = segments.hotkey || [];
  const intensity = segments.intensity || [0, 0];
  const tempo = segments.tempo || [];
  const select = hotkey.slice(0, 10);
  const assign = hotkey.slice(10, 20);

  const speed = Math.min(apm[0] * 300 / 400, 1);
  const burst = Math.min((apm[2] || 0) / 3, 1);
  const hkIntensity = Math.min((intensity[0] + intensity[1]) * 2, 1);
  const activeGroups = select.filter(v => v > 0.01).length + assign.filter(v => v > 0.01).length;
  const hkDiversity = Math.min(activeGroups / 20, 1);
  const totalHk = intensity[0] + intensity[1];
  const assignRatio = totalHk > 0 ? intensity[1] / totalHk : 0;
  const fastTempo = (tempo[0] || 0) + (tempo[1] || 0) + (tempo[2] || 0);

  return { speed, burst, hkIntensity, hkDiversity, assignRatio, tempo: Math.min(fastTempo, 1) };
}

// ── Trait Definitions ───────────────────────────

// Trait thresholds calibrated from population distribution (193 players, 2026-02-22)
// hiT ≈ p85, loT ≈ p15 — only truly distinctive players get badges
export const TRAIT_DEFS = [
  { key: "speed",       hi: "Fast",           lo: "Slow",         hiT: 0.55, loT: 0.31, color: "var(--green)",   bg: "rgba(76,175,80,0.08)",  border: "rgba(76,175,80,0.2)" },
  { key: "burst",       hi: "Bursty",         lo: "Steady",       hiT: 0.28, loT: 0.11, color: "#ffa726",        bg: "rgba(255,167,38,0.08)", border: "rgba(255,167,38,0.2)" },
  { key: "hkDiversity", hi: "Wide Spread",    lo: "Focused",      hiT: 0.65, loT: 0.30, color: "#ab47bc",        bg: "rgba(171,71,188,0.08)", border: "rgba(171,71,188,0.2)" },
  { key: "assignRatio", hi: "Re-binder",      lo: null,           hiT: 0.20, loT: 0,    color: "var(--gold)",    bg: "rgba(252,219,51,0.08)", border: "rgba(252,219,51,0.2)" },
  { key: "tempo",       hi: "Twitchy",        lo: "Deliberate",   hiT: 0.75, loT: 0.58, color: "#4fc3f7",        bg: "rgba(79,195,247,0.08)", border: "rgba(79,195,247,0.2)" },
];

export function describeTraits(sig) {
  if (!sig) return [];
  const scored = TRAIT_DEFS.map(d => {
    const val = sig[d.key] || 0;
    const isHigh = val >= d.hiT;
    const isLow = d.lo && val <= d.loT;
    if (!isHigh && !isLow) return null;
    return {
      text: isHigh ? d.hi : d.lo,
      color: isHigh ? d.color : "var(--grey-light)",
      bg: isHigh ? d.bg : "rgba(255,255,255,0.04)",
      border: isHigh ? d.border : "rgba(255,255,255,0.08)",
      extremeness: isHigh ? val - d.hiT : d.loT - val,
    };
  }).filter(Boolean);
  scored.sort((a, b) => b.extremeness - a.extremeness);
  return scored.slice(0, 3);
}

// ── Solo Hotkey Radar ───────────────────────────

export function SoloHotkeyRadar({ select, assign, color = "var(--gold)" }) {
  const step = (2 * Math.PI) / RADAR_GROUPS.length;
  const maxVal = Math.max(...select, ...(assign || []), 0.01);
  const rings = [0.25, 0.5, 0.75, 1.0];

  function soloPoly(values, c, opacity) {
    if (!values || values.length === 0) return null;
    const pts = RADAR_GROUPS.map((g, i) => {
      const val = values[g] || 0;
      const r = maxVal > 0 ? (val / maxVal) * RADAR_R : 0;
      return polarToCart(i * step, val > 0 ? Math.max(r, 2) : 0);
    });
    const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ") + " Z";
    return (
      <>
        <path d={d} fill={c} fillOpacity={opacity} stroke={c} strokeWidth="1.5" strokeOpacity={0.8} />
        {pts.map((p, i) => values[RADAR_GROUPS[i]] > 0.005 && <circle key={i} cx={p[0]} cy={p[1]} r="2.5" fill={c} opacity={0.9} />)}
      </>
    );
  }

  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      <div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--grey-light)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4, textAlign: "center" }}>Select</div>
        <svg width={160} height={160} viewBox={`0 0 ${RADAR_SIZE} ${RADAR_SIZE}`}>
          {rings.map(r => <circle key={r} cx={RADAR_CX} cy={RADAR_CY} r={RADAR_R * r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />)}
          {RADAR_GROUPS.map((g, i) => {
            const angle = i * step;
            const [x2, y2] = polarToCart(angle, RADAR_R);
            const [lx, ly] = polarToCart(angle, RADAR_R + 14);
            return (
              <g key={g}>
                <line x1={RADAR_CX} y1={RADAR_CY} x2={x2} y2={y2} stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
                <text x={lx} y={ly} textAnchor="middle" dominantBaseline="central" fill="var(--grey-light)" fontSize="10" fontFamily="var(--font-mono)">{g}</text>
              </g>
            );
          })}
          {soloPoly(select, color, 0.25)}
        </svg>
      </div>
      {assign && (
        <div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--grey-light)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4, textAlign: "center" }}>Assign</div>
          <svg width={160} height={160} viewBox={`0 0 ${RADAR_SIZE} ${RADAR_SIZE}`}>
            {rings.map(r => <circle key={r} cx={RADAR_CX} cy={RADAR_CY} r={RADAR_R * r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />)}
            {RADAR_GROUPS.map((g, i) => {
              const angle = i * step;
              const [x2, y2] = polarToCart(angle, RADAR_R);
              const [lx, ly] = polarToCart(angle, RADAR_R + 14);
              return (
                <g key={g}>
                  <line x1={RADAR_CX} y1={RADAR_CY} x2={x2} y2={y2} stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
                  <text x={lx} y={ly} textAnchor="middle" dominantBaseline="central" fill="var(--grey-light)" fontSize="10" fontFamily="var(--font-mono)">{g}</text>
                </g>
              );
            })}
            {soloPoly(assign, color, 0.25)}
          </svg>
        </div>
      )}
    </div>
  );
}

// ── Solo Signature Radar ────────────────────────

export function SoloSignatureRadar({ sig, color = "var(--gold)", renderSize }) {
  if (!sig) return null;
  const pad = 30;
  const size = 180 + pad * 2;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 68;
  const axes = SIG_AXES;
  const step = (2 * Math.PI) / axes.length;
  const rings = [0.25, 0.5, 0.75, 1.0];

  const pts = axes.map((a, i) => {
    const val = sig[a.key] || 0;
    const r = val * maxR;
    const angle = i * step;
    return [cx + r * Math.sin(angle), cy - r * Math.cos(angle), val];
  });

  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ") + " Z";
  const displaySize = renderSize || size;

  return (
    <svg width={displaySize} height={displaySize} viewBox={`0 0 ${size} ${size}`}>
      {rings.map(r => <circle key={r} cx={cx} cy={cy} r={maxR * r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />)}
      {axes.map((a, i) => {
        const angle = i * step;
        const x2 = cx + maxR * Math.sin(angle);
        const y2 = cy - maxR * Math.cos(angle);
        const lx = cx + (maxR + 15) * Math.sin(angle);
        const ly = cy - (maxR + 15) * Math.cos(angle);
        return (
          <g key={a.key}>
            <line x1={cx} y1={cy} x2={x2} y2={y2} stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="central" fill="var(--grey-light)" fontSize="9" fontFamily="var(--font-mono)">{a.label}</text>
          </g>
        );
      })}
      <path d={d} fill={color} fillOpacity={0.2} stroke={color} strokeWidth="1.5" strokeOpacity={0.8} />
      {pts.map((p, i) => p[2] > 0.02 && <circle key={i} cx={p[0]} cy={p[1]} r="2.5" fill={color} opacity={0.9} />)}
    </svg>
  );
}

// ── Styled Components ───────────────────────────

const IdCard = styled.div`
  background: var(--theme-bg, var(--surface-1));
  backdrop-filter: var(--theme-blur, none);
  border: var(--theme-border, var(--border-thick) solid var(--gold));
  border-image: var(--theme-border-image, none);
  border-radius: var(--radius-md);
  box-shadow: var(--theme-shadow, none);
  padding: var(--space-6);
  margin-bottom: var(--space-6);
`;
const IdCardHeader = styled.div`
  display: flex; align-items: center; gap: var(--space-4); margin-bottom: var(--space-4);
`;
const IdCardName = styled.div`
  font-family: var(--font-display); font-size: var(--text-lg); color: var(--gold);
`;
const IdCardMeta = styled.div`
  font-family: var(--font-mono); font-size: var(--text-xxs); color: var(--grey-light);
`;
const IdCardTraits = styled.div`
  display: flex; flex-wrap: wrap; gap: 6px; margin-top: var(--space-2);
`;
const Trait = styled.span`
  font-family: var(--font-mono); font-size: var(--text-xxxs); color: ${p => p.$color || "var(--grey-light)"};
  background: ${p => p.$bg || "rgba(255,255,255,0.04)"};
  border: 1px solid ${p => p.$border || "rgba(255,255,255,0.08)"};
  border-radius: var(--radius-sm); padding: 2px 8px;
  text-transform: uppercase; letter-spacing: 0.06em;
`;
const IdCardRadars = styled.div`
  display: flex; gap: var(--space-4); flex-wrap: wrap; align-items: flex-start;
`;

// ── PlayerIdentityCard Component ────────────────

export default function PlayerIdentityCard({ fpData, name }) {
  if (!fpData?.averaged?.segments) return null;

  const seg = fpData.averaged.segments;
  const sig = extractSignature(seg);
  const select = (seg.hotkey || []).slice(0, 10);
  const assign = (seg.hotkey || []).slice(10, 20);
  const traits = describeTraits(sig);
  const meanApm = Math.round((seg.apm?.[0] || 0) * 300);

  return (
    <IdCard>
      <IdCardHeader>
        <div>
          <IdCardName>{name}</IdCardName>
          <IdCardMeta>
            {fpData.replayCount} replay{fpData.replayCount !== 1 ? "s" : ""} analyzed
            {meanApm > 0 && ` • ${meanApm} avg APM`}
            {fpData.embeddingCount > 0 && ` • ${fpData.embeddingCount} neural`}
          </IdCardMeta>
          {traits.length > 0 && (
            <IdCardTraits>
              {traits.map(t => (
                <Trait key={t.text} $color={t.color} $bg={t.bg} $border={t.border}>{t.text}</Trait>
              ))}
            </IdCardTraits>
          )}
        </div>
      </IdCardHeader>
      <IdCardRadars>
        <div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--grey-light)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Signature</div>
          <SoloSignatureRadar sig={sig} />
        </div>
        <SoloHotkeyRadar select={select} assign={assign} />
      </IdCardRadars>
    </IdCard>
  );
}
