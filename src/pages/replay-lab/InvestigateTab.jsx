import React, { useState, useCallback, useEffect, useRef } from "react";
import styled from "styled-components";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import { useReplayLabStore } from "../../lib/useReplayLabStore";
import PeonLoader from "../../components/PeonLoader";
import PlayerIdentityCard, {
  polarToCart, RADAR_GROUPS, RADAR_SIZE, RADAR_CX, RADAR_CY, RADAR_R,
  SIG_AXES, extractSignature,
} from "../../components/PlayerIdentityCard";
import { searchLadder } from "../../lib/api";
import { raceMapping } from "../../lib/constants";
import { EmptyState, CloseBtn } from "./shared-styles";

// ── Constants ───────────────────────────────────

const ACTION_LABELS = ["Right-click", "Ability", "Build/Train", "Item", "Select HK", "Assign HK"];
const TEMPO_LABELS = ["<50ms", "50-100", "100-200", "200-500", "500ms-1s", "1-2s", "2-5s", "5s+"];
const ACTION_ID_LABELS = {
  16: "Ability₁", 17: "Ability₂", 18: "Ability₃", 19: "Ability₄", 20: "Ability₅",
  22: "Select", 23: "Assign HK", 24: "Select HK", 25: "Tab",
  30: "Dequeue", 97: "ESC", 102: "Skill", 103: "Build", 104: "Ping",
};

function getVerdict(score, percentile, zScore) {
  // Use percentile if available (population-calibrated), fall back to raw score
  if (percentile != null) {
    if (percentile >= 99) return { label: "Very strong", color: "var(--green)" };
    if (percentile >= 95) return { label: "Strong", color: "var(--green)" };
    if (percentile >= 90) return { label: "Possible", color: "var(--gold)" };
    if (percentile >= 80) return { label: "Weak", color: "var(--grey-light)" };
    return { label: "Unlikely", color: "var(--grey-mid)" };
  }
  if (score >= 0.90) return { label: "Strong match", color: "var(--green)" };
  if (score >= 0.80) return { label: "Possible", color: "var(--gold)" };
  if (score >= 0.70) return { label: "Weak", color: "var(--grey-light)" };
  return { label: "Unlikely", color: "var(--grey-mid)" };
}

// ── Styled components ───────────────────────────

const ResultsHeader = styled.div`text-align: center; margin-bottom: var(--space-4);`;
const ResultsTitle = styled.h3`
  font-family: var(--font-display); font-size: var(--text-base); color: var(--gold);
  margin: 0 0 var(--space-1) 0;
`;
const ResultsSubtitle = styled.div`
  font-family: var(--font-mono); font-size: var(--text-xxs); color: var(--grey-light);
  text-transform: uppercase; letter-spacing: 0.08em;
`;

const HybridBadge = styled.span`
  display: inline-block; font-size: 0.65rem; color: var(--green);
  border: 1px solid rgba(76, 175, 80, 0.3); background: rgba(76, 175, 80, 0.08);
  border-radius: var(--radius-sm); padding: 1px 5px; margin-left: 6px;
  vertical-align: middle; letter-spacing: 0.06em;
`;

const ResultCard = styled.div`
  background: var(--theme-bg, var(--surface-1));
  backdrop-filter: var(--theme-blur, none);
  border: var(--theme-border, 1px solid ${(p) => p.$active ? "var(--gold)" : "var(--grey-mid)"});
  border-image: var(--theme-border-image, none);
  border-radius: var(--radius-md);
  box-shadow: var(--theme-shadow, none);
  padding: var(--space-4); margin-bottom: ${(p) => p.$active ? "0" : "var(--space-3)"};
  display: grid; grid-template-columns: 32px 1fr auto; gap: var(--space-4);
  align-items: flex-start; cursor: pointer; transition: border-color 0.15s;
  ${(p) => !p.$active && `&:hover { border-color: var(--gold); }`}
  ${(p) => p.$active && `border-bottom-left-radius: 0; border-bottom-right-radius: 0;`}
`;

const ResultRank = styled.div`
  display: flex; align-items: center; justify-content: center;
  width: 24px; height: 24px; font-family: var(--font-mono); font-size: var(--text-xxs);
  color: var(--gold); background: rgba(252, 219, 51, 0.08);
  border: 1px solid rgba(252, 219, 51, 0.2); border-radius: 50%; font-weight: 600;
`;
const ResultInfo = styled.div`min-width: 0;`;
const ResultName = styled.div`
  font-family: var(--font-display); font-size: var(--text-base);
  color: var(--gold); margin-bottom: var(--space-1);
`;
const ResultMeta = styled.div`
  font-family: var(--font-mono); font-size: var(--text-xxs);
  color: var(--grey-light); margin-bottom: var(--space-3);
`;
const BreakdownWrap = styled.div`display: flex; flex-direction: column; gap: 4px;`;
const BreakdownRow = styled.div`display: flex; align-items: center; gap: 8px;`;
const BreakdownLabel = styled.span`
  font-family: var(--font-mono); font-size: var(--text-xxxs);
  color: var(--grey-light); text-transform: uppercase; width: 52px;
`;
const BreakdownTrack = styled.div`
  width: 100px; height: 4px; background: rgba(255, 255, 255, 0.08);
  border-radius: 2px; overflow: hidden;
`;
const BreakdownFill = styled.div`
  height: 100%; border-radius: 2px;
  background: ${(p) =>
    p.$val >= 0.8 ? "var(--green)" : p.$val >= 0.6 ? "var(--gold)" : "rgba(255, 255, 255, 0.3)"};
`;
const ResultScoreWrap = styled.div`text-align: center;`;
const ResultScore = styled.div`
  font-family: var(--font-mono); font-size: var(--text-lg);
  color: ${(p) => p.$color || "var(--white)"}; font-weight: 700; margin-bottom: var(--space-1);
`;
const VerdictBadge = styled.div`
  font-family: var(--font-mono); font-size: var(--text-xxxs);
  color: ${(p) => p.$color || "var(--grey-light)"}; background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08); border-radius: var(--radius-sm);
  padding: 3px 6px; text-transform: uppercase; letter-spacing: 0.06em; text-align: center;
`;
const NoDataText = styled.div`
  font-family: var(--font-mono); font-size: var(--text-xs); color: var(--grey-light);
  text-align: center; padding: var(--space-8) var(--space-4);
`;
const ExpandToggle = styled.button`
  display: flex; align-items: center; gap: 6px; font-family: var(--font-mono);
  font-size: var(--text-xxs); color: var(--grey-light); background: none; border: none;
  cursor: pointer; padding: 0; margin-top: var(--space-3);
  &:hover { color: var(--gold); }
`;

// ── Compare Panel Styles ────────────────────────

const ComparePanel = styled.div`
  background: rgba(0, 0, 0, 0.4); border: 1px solid var(--gold); border-top: none;
  border-radius: 0 0 var(--radius-md) var(--radius-md);
  padding: var(--space-4) var(--space-6); margin-bottom: var(--space-3);
`;
const CompareSection = styled.div`
  margin-bottom: var(--space-5); &:last-child { margin-bottom: 0; }
`;
const CompareSectionTitle = styled.div`
  font-family: var(--font-mono); font-size: var(--text-xxxs); color: var(--gold);
  text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: var(--space-2);
`;
const PlayerTag = styled.div`
  font-family: var(--font-mono); font-size: var(--text-xxxs);
  display: flex; justify-content: space-between; margin-bottom: 8px;
`;
const TagLeft = styled.span`color: #4fc3f7;`;
const TagRight = styled.span`color: #ef5350;`;

// ── Compare Grid (butterfly bars) ───────────────

const CompareGrid = styled.div`
  display: grid; grid-template-columns: 80px 1fr 28px 1fr;
  gap: 4px 8px; align-items: center;
`;
const CLabel = styled.span`
  font-family: var(--font-mono); font-size: var(--text-xxxs);
  color: var(--grey-light); text-align: right;
`;
const CBar = styled.div`
  height: 10px; border-radius: 2px; position: relative;
  overflow: hidden; background: rgba(255, 255, 255, 0.06);
`;
const CFill = styled.div`
  position: absolute; top: 0; height: 100%; border-radius: 2px;
`;
const CVs = styled.span`
  font-family: var(--font-mono); font-size: var(--text-xxxs);
  color: var(--grey-mid); text-align: center;
`;

// ── APM Sparkline ───────────────────────────────

const SparkWrap = styled.div`
  position: relative; height: 80px; margin-top: 4px;
`;
const SparkLabel = styled.div`
  position: absolute; font-family: var(--font-mono); font-size: 9px;
  color: var(--grey-mid);
`;

function ApmSparkline({ curveA, curveB, nameA, nameB }) {
  const maxLen = Math.max(curveA.length, curveB.length);
  if (maxLen === 0) return null;
  const maxVal = Math.max(...curveA, ...curveB, 1);
  const w = 100;
  const h = 60;
  const pad = 2;

  function toPath(curve, color) {
    if (curve.length < 2) return null;
    const step = (w - pad * 2) / (maxLen - 1);
    const pts = curve.map((v, i) => {
      const x = pad + i * step;
      const y = h - pad - ((v / maxVal) * (h - pad * 2));
      return `${x},${y}`;
    });
    return <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="1.5" opacity="0.8" />;
  }

  // Y-axis labels
  const midVal = Math.round(maxVal / 2);

  return (
    <SparkWrap>
      <SparkLabel style={{ top: 0, left: 0 }}>{Math.round(maxVal)}</SparkLabel>
      <SparkLabel style={{ top: 26, left: 0 }}>{midVal}</SparkLabel>
      <SparkLabel style={{ bottom: 14, left: 0 }}>0</SparkLabel>
      <SparkLabel style={{ bottom: 0, left: "50%", transform: "translateX(-50%)" }}>
        game time →
      </SparkLabel>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: 60, marginLeft: 24 }} preserveAspectRatio="none">
        {/* grid lines */}
        <line x1={pad} y1={h / 2} x2={w - pad} y2={h / 2} stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
        <line x1={pad} y1={pad} x2={w - pad} y2={pad} stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
        {toPath(curveA, "#4fc3f7")}
        {toPath(curveB, "#ef5350")}
      </svg>
    </SparkWrap>
  );
}

// ── Tempo Histogram ─────────────────────────────

const TempoGrid = styled.div`
  display: grid; grid-template-columns: 60px 1fr 28px 1fr;
  gap: 3px 8px; align-items: center;
`;
const TempoBar = styled.div`
  height: 8px; border-radius: 2px; background: rgba(255,255,255,0.06);
  overflow: hidden; position: relative;
`;
const TempoFill = styled.div`
  position: absolute; top: 0; height: 100%; border-radius: 2px;
`;

// ── Hotkey Cells ────────────────────────────────


// ── Transition Flow ─────────────────────────────

const TransRow = styled.div`
  display: flex; align-items: center; gap: 6px; margin-bottom: 2px;
`;
const TransArrow = styled.span`
  font-family: var(--font-mono); font-size: var(--text-xxxs); color: var(--grey-light);
  white-space: nowrap;
`;
const TransBar = styled.div`
  flex: 1; height: 6px; background: rgba(255,255,255,0.06); border-radius: 3px;
  overflow: hidden; position: relative;
`;
const TransFill = styled.div`
  position: absolute; top: 0; height: 100%; border-radius: 3px;
`;

// ── Early Game Timeline ─────────────────────────

const TimelineWrap = styled.div`
  position: relative; height: 28px; background: rgba(255,255,255,0.03);
  border-radius: 4px; overflow: hidden;
`;
const TimelineDot = styled.div`
  position: absolute; width: 3px; height: 12px; border-radius: 1px;
  top: ${(p) => p.$row === 0 ? "2px" : "14px"};
`;
const TimelineLegend = styled.div`
  display: flex; gap: 12px; margin-top: 4px; flex-wrap: wrap;
`;
const LegendItem = styled.span`
  font-family: var(--font-mono); font-size: 9px; color: var(--grey-light);
  display: flex; align-items: center; gap: 3px;
`;
const LegendSwatch = styled.span`
  width: 8px; height: 8px; border-radius: 2px; display: inline-block;
`;

// ── Early game action colors ────────────────────

const ACTION_COLORS = {
  16: "#66bb6a", 17: "#66bb6a", 18: "#66bb6a", 19: "#66bb6a", 20: "#66bb6a",
  22: "#78909c", 23: "#ffa726", 24: "#42a5f5", 25: "#ab47bc",
  30: "#ef5350", 97: "#ef5350", 102: "#e0e0e0", 103: "#ffd54f", 104: "#ff7043",
};

function getActionColor(id) { return ACTION_COLORS[id] || "rgba(255,255,255,0.3)"; }

// ── Hotkey Radar Chart ──────────────────────────

function radarPolygon(values, maxVal, color, opacity = 0.25) {
  if (!values || values.length === 0) return null;
  const step = (2 * Math.PI) / RADAR_GROUPS.length;
  const points = RADAR_GROUPS.map((g, i) => {
    const val = values[g] || 0;
    const r = maxVal > 0 ? (val / maxVal) * RADAR_R : 0;
    const clamped = Math.max(r, 2); // minimum 2px so zero values still show a dot
    return polarToCart(i * step, val > 0 ? clamped : 0);
  });
  const pathData = points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ") + " Z";
  return (
    <>
      <path d={pathData} fill={color} fillOpacity={opacity} stroke={color} strokeWidth="1.5" strokeOpacity={0.8} />
      {points.map((p, i) => (
        values[RADAR_GROUPS[i]] > 0.005 && <circle key={i} cx={p[0]} cy={p[1]} r="2" fill={color} opacity={0.9} />
      ))}
    </>
  );
}

function HotkeyRadar({ selectA, selectB, assignA, assignB, nameA, nameB }) {
  const step = (2 * Math.PI) / RADAR_GROUPS.length;
  const maxVal = Math.max(
    ...selectA, ...selectB, ...(assignA || []), ...(assignB || []),
    0.01
  );

  // Concentric rings
  const rings = [0.25, 0.5, 0.75, 1.0];

  return (
    <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
      {/* Select Hotkeys Radar */}
      <div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--grey-light)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4, textAlign: "center" }}>
          Select Hotkeys
        </div>
        <svg width={RADAR_SIZE} height={RADAR_SIZE} viewBox={`0 0 ${RADAR_SIZE} ${RADAR_SIZE}`}>
          {/* Grid rings */}
          {rings.map(r => (
            <circle key={r} cx={RADAR_CX} cy={RADAR_CY} r={RADAR_R * r}
              fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
          ))}
          {/* Spokes + labels */}
          {RADAR_GROUPS.map((g, i) => {
            const angle = i * step;
            const [x1, y1] = polarToCart(angle, 0);
            const [x2, y2] = polarToCart(angle, RADAR_R);
            const [lx, ly] = polarToCart(angle, RADAR_R + 14);
            return (
              <g key={g}>
                <line x1={RADAR_CX} y1={RADAR_CY} x2={x2} y2={y2} stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
                <text x={lx} y={ly} textAnchor="middle" dominantBaseline="central"
                  fill="var(--grey-light)" fontSize="10" fontFamily="var(--font-mono)">
                  {g}
                </text>
              </g>
            );
          })}
          {/* Data polygons */}
          {radarPolygon(selectA, maxVal, "#4fc3f7", 0.2)}
          {radarPolygon(selectB, maxVal, "#ef5350", 0.2)}
        </svg>
      </div>

      {/* Assign Hotkeys Radar */}
      {assignA && assignB && (
        <div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--grey-light)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4, textAlign: "center" }}>
            Assign Hotkeys
          </div>
          <svg width={RADAR_SIZE} height={RADAR_SIZE} viewBox={`0 0 ${RADAR_SIZE} ${RADAR_SIZE}`}>
            {rings.map(r => (
              <circle key={r} cx={RADAR_CX} cy={RADAR_CY} r={RADAR_R * r}
                fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
            ))}
            {RADAR_GROUPS.map((g, i) => {
              const angle = i * step;
              const [x2, y2] = polarToCart(angle, RADAR_R);
              const [lx, ly] = polarToCart(angle, RADAR_R + 14);
              return (
                <g key={g}>
                  <line x1={RADAR_CX} y1={RADAR_CY} x2={x2} y2={y2} stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
                  <text x={lx} y={ly} textAnchor="middle" dominantBaseline="central"
                    fill="var(--grey-light)" fontSize="10" fontFamily="var(--font-mono)">
                    {g}
                  </text>
                </g>
              );
            })}
            {radarPolygon(assignA, maxVal, "#4fc3f7", 0.2)}
            {radarPolygon(assignB, maxVal, "#ef5350", 0.2)}
          </svg>
        </div>
      )}

      {/* Legend */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, justifyContent: "center", minWidth: 80 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 12, height: 12, borderRadius: 2, background: "#4fc3f7", opacity: 0.7 }} />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#4fc3f7" }}>{nameA}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 12, height: 12, borderRadius: 2, background: "#ef5350", opacity: 0.7 }} />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#ef5350" }}>{nameB}</span>
        </div>
      </div>
    </div>
  );
}

// ── Player Signature Radar (multi-feature) ──────

function SignatureRadar({ sigA, sigB, nameA, nameB }) {
  if (!sigA && !sigB) return null;
  const pad = 32;
  const size = 200 + pad * 2;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 78;
  const axes = SIG_AXES;
  const step = (2 * Math.PI) / axes.length;
  const rings = [0.25, 0.5, 0.75, 1.0];

  function toPts(sig) {
    if (!sig) return null;
    return axes.map((a, i) => {
      const val = sig[a.key] || 0;
      const r = val * maxR;
      const angle = i * step;
      const x = cx + r * Math.sin(angle);
      const y = cy - r * Math.cos(angle);
      return [x, y, val];
    });
  }

  const ptsA = toPts(sigA);
  const ptsB = toPts(sigB);

  function renderPoly(pts, color, opacity) {
    if (!pts) return null;
    const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ") + " Z";
    return (
      <>
        <path d={d} fill={color} fillOpacity={opacity} stroke={color} strokeWidth="1.5" strokeOpacity={0.8} />
        {pts.map((p, i) => p[2] > 0.02 && <circle key={i} cx={p[0]} cy={p[1]} r="2.5" fill={color} opacity={0.9} />)}
      </>
    );
  }

  return (
    <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {rings.map(r => (
          <circle key={r} cx={cx} cy={cy} r={maxR * r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
        ))}
        {axes.map((a, i) => {
          const angle = i * step;
          const x2 = cx + maxR * Math.sin(angle);
          const y2 = cy - maxR * Math.cos(angle);
          const lx = cx + (maxR + 16) * Math.sin(angle);
          const ly = cy - (maxR + 16) * Math.cos(angle);
          return (
            <g key={a.key}>
              <line x1={cx} y1={cy} x2={x2} y2={y2} stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
              <text x={lx} y={ly} textAnchor="middle" dominantBaseline="central"
                fill="var(--grey-light)" fontSize="9" fontFamily="var(--font-mono)">
                {a.label}
              </text>
            </g>
          );
        })}
        {renderPoly(ptsA, "#4fc3f7", 0.15)}
        {renderPoly(ptsB, "#ef5350", 0.15)}
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, justifyContent: "center" }}>
        {sigA && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: 2, background: "#4fc3f7", opacity: 0.7 }} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#4fc3f7" }}>{nameA}</span>
          </div>
        )}
        {sigB && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: 2, background: "#ef5350", opacity: 0.7 }} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#ef5350" }}>{nameB}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Compare Detail Component ────────────────────

function CompareDetail({ fpDataA, fpDataB, compareData, nameA, nameB }) {
  if (!fpDataA || !fpDataB) return null;

  const qSeg = fpDataA.averaged?.segments;
  const mSeg = fpDataB.averaged?.segments;
  if (!qSeg || !mSeg) return null;

  const qAction = qSeg.action || [];
  const mAction = mSeg.action || [];
  const qApm = qSeg.apm || [];
  const mApm = mSeg.apm || [];
  const qHotkey = qSeg.hotkey || [];
  const mHotkey = mSeg.hotkey || [];

  const qSelect = qHotkey.slice(0, 10);
  const mSelect = mHotkey.slice(0, 10);
  const qAssign = qHotkey.slice(10, 20);
  const mAssign = mHotkey.slice(10, 20);
  const maxAction = Math.max(...qAction, ...mAction, 0.01);

  const qMeanApm = Math.round(qApm[0] * 300);
  const mMeanApm = Math.round(mApm[0] * 300);

  function hotkeyColor(val) {
    if (val < 0.01) return undefined;
    if (val < 0.1) return "rgba(76, 175, 80, 0.2)";
    if (val < 0.25) return "rgba(76, 175, 80, 0.4)";
    return "rgba(76, 175, 80, 0.7)";
  }

  const hasDeep = compareData?.profileA && compareData?.profileB;
  const pA = compareData?.profileA;
  const pB = compareData?.profileB;

  // Tempo max for scaling
  const tempoMax = hasDeep
    ? Math.max(...(pA.tempo || []), ...(pB.tempo || []), 1)
    : 1;

  // Transition flow — merge and show side by side
  const transA = hasDeep ? (pA.topTransitions || []) : [];
  const transB = hasDeep ? (pB.topTransitions || []) : [];
  const transMax = Math.max(
    ...transA.map(t => t.count),
    ...transB.map(t => t.count),
    1
  );

  const sigA = extractSignature(qSeg);
  const sigB = extractSignature(mSeg);

  return (
    <ComparePanel>
      <PlayerTag>
        <TagLeft>{nameA}</TagLeft>
        <TagRight>{nameB}</TagRight>
      </PlayerTag>

      {/* Player Signature */}
      <CompareSection>
        <CompareSectionTitle>Player Signature</CompareSectionTitle>
        <SignatureRadar sigA={sigA} sigB={sigB} nameA={nameA} nameB={nameB} />
      </CompareSection>

      {/* APM Curve */}
      {hasDeep && pA.apmCurve?.length > 1 && pB.apmCurve?.length > 1 && (
        <CompareSection>
          <CompareSectionTitle>APM Over Time</CompareSectionTitle>
          <ApmSparkline curveA={pA.apmCurve} curveB={pB.apmCurve} nameA={nameA} nameB={nameB} />
        </CompareSection>
      )}

      {/* Action Distribution */}
      <CompareSection>
        <CompareSectionTitle>Action Distribution</CompareSectionTitle>
        <CompareGrid>
          {ACTION_LABELS.map((label, i) => (
            <React.Fragment key={label}>
              <CLabel>{label}</CLabel>
              <CBar>
                <CFill style={{ right: 0, width: `${(qAction[i] / maxAction) * 100}%`, background: "#4fc3f7", opacity: 0.7 }} />
              </CBar>
              <CVs>vs</CVs>
              <CBar>
                <CFill style={{ left: 0, width: `${(mAction[i] / maxAction) * 100}%`, background: "#ef5350", opacity: 0.7 }} />
              </CBar>
            </React.Fragment>
          ))}
        </CompareGrid>
      </CompareSection>

      {/* Action Tempo */}
      {hasDeep && (
        <CompareSection>
          <CompareSectionTitle>Action Tempo (time between clicks)</CompareSectionTitle>
          <TempoGrid>
            {TEMPO_LABELS.map((label, i) => (
              <React.Fragment key={label}>
                <CLabel>{label}</CLabel>
                <TempoBar>
                  <TempoFill style={{ right: 0, width: `${((pA.tempo?.[i] || 0) / tempoMax) * 100}%`, background: "#4fc3f7", opacity: 0.7 }} />
                </TempoBar>
                <CVs>vs</CVs>
                <TempoBar>
                  <TempoFill style={{ left: 0, width: `${((pB.tempo?.[i] || 0) / tempoMax) * 100}%`, background: "#ef5350", opacity: 0.7 }} />
                </TempoBar>
              </React.Fragment>
            ))}
          </TempoGrid>
        </CompareSection>
      )}

      {/* APM Summary */}
      <CompareSection>
        <CompareSectionTitle>APM Profile</CompareSectionTitle>
        <CompareGrid>
          <CLabel>Mean APM</CLabel>
          <div style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "var(--text-xxs)", color: "#fff" }}>{qMeanApm}</div>
          <CVs>vs</CVs>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xxs)", color: "#fff" }}>{mMeanApm}</div>

          <CLabel>Variability</CLabel>
          <div style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "var(--text-xxs)", color: "#fff" }}>{(qApm[1] * 100).toFixed(0)}</div>
          <CVs>vs</CVs>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xxs)", color: "#fff" }}>{(mApm[1] * 100).toFixed(0)}</div>

          <CLabel>Burstiness</CLabel>
          <div style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "var(--text-xxs)", color: "#fff" }}>{(qApm[2] || 0).toFixed(2)}</div>
          <CVs>vs</CVs>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xxs)", color: "#fff" }}>{(mApm[2] || 0).toFixed(2)}</div>
        </CompareGrid>
      </CompareSection>

      {/* Hotkey Radar */}
      <CompareSection>
        <CompareSectionTitle>Hotkey Fingerprint</CompareSectionTitle>
        <HotkeyRadar
          selectA={qSelect} selectB={mSelect}
          assignA={qAssign} assignB={mAssign}
          nameA={nameA} nameB={nameB}
        />
      </CompareSection>

      {/* Hotkey Switching Patterns */}
      {hasDeep && (transA.length > 0 || transB.length > 0) && (
        <CompareSection>
          <CompareSectionTitle>Hotkey Switching Patterns</CompareSectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "#4fc3f7", marginBottom: 4 }}>{nameA}</div>
              {transA.map((t, i) => (
                <TransRow key={i}>
                  <TransArrow>{t.from}→{t.to}</TransArrow>
                  <TransBar>
                    <TransFill style={{ left: 0, width: `${(t.count / transMax) * 100}%`, background: "#4fc3f7", opacity: 0.6 }} />
                  </TransBar>
                </TransRow>
              ))}
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "#ef5350", marginBottom: 4 }}>{nameB}</div>
              {transB.map((t, i) => (
                <TransRow key={i}>
                  <TransArrow>{t.from}→{t.to}</TransArrow>
                  <TransBar>
                    <TransFill style={{ left: 0, width: `${(t.count / transMax) * 100}%`, background: "#ef5350", opacity: 0.6 }} />
                  </TransBar>
                </TransRow>
              ))}
            </div>
          </div>
        </CompareSection>
      )}

      {/* Early Game Timeline */}
      {hasDeep && (pA.earlyGame?.length > 0 || pB.earlyGame?.length > 0) && (
        <CompareSection>
          <CompareSectionTitle>Early Game (first 60s)</CompareSectionTitle>
          <TimelineWrap>
            {(pA.earlyGame || []).map((a, i) => (
              <TimelineDot
                key={`a-${i}`}
                $row={0}
                style={{
                  left: `${(a.ms / 60000) * 100}%`,
                  background: getActionColor(a.id),
                  opacity: 0.8,
                }}
                title={`${(a.ms / 1000).toFixed(1)}s — ${ACTION_ID_LABELS[a.id] || `0x${a.id.toString(16)}`}${a.g != null ? ` [${a.g}]` : ""}`}
              />
            ))}
            {(pB.earlyGame || []).map((a, i) => (
              <TimelineDot
                key={`b-${i}`}
                $row={1}
                style={{
                  left: `${(a.ms / 60000) * 100}%`,
                  background: getActionColor(a.id),
                  opacity: 0.8,
                }}
                title={`${(a.ms / 1000).toFixed(1)}s — ${ACTION_ID_LABELS[a.id] || `0x${a.id.toString(16)}`}${a.g != null ? ` [${a.g}]` : ""}`}
              />
            ))}
          </TimelineWrap>
          <TimelineLegend>
            <LegendItem><LegendSwatch style={{ background: "#66bb6a" }} />Ability</LegendItem>
            <LegendItem><LegendSwatch style={{ background: "#42a5f5" }} />Select HK</LegendItem>
            <LegendItem><LegendSwatch style={{ background: "#ffa726" }} />Assign HK</LegendItem>
            <LegendItem><LegendSwatch style={{ background: "#ab47bc" }} />Tab</LegendItem>
            <LegendItem><LegendSwatch style={{ background: "#78909c" }} />Select</LegendItem>
            <LegendItem><LegendSwatch style={{ background: "#ef5350" }} />Cancel</LegendItem>
          </TimelineLegend>
        </CompareSection>
      )}
    </ComparePanel>
  );
}

// ── Main Component ──────────────────────────────

export default function InvestigateTab() {
  const { apiKey, RELAY_URL } = useReplayLabStore();

  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef(null);

  const [selectedTag, setSelectedTag] = useState(null);
  const [playstyleData, setPlaystyleData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showAllResults, setShowAllResults] = useState(false);

  const [expandedTag, setExpandedTag] = useState(null);
  const [queryFpData, setQueryFpData] = useState(null);
  const [matchFpData, setMatchFpData] = useState(null);
  const [compareData, setCompareData] = useState(null);
  const [compareLoading, setCompareLoading] = useState(false);

  useEffect(() => {
    if (!showDropdown) return;
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showDropdown]);

  useEffect(() => {
    if (query.length < 2) { setSearchResults([]); setShowDropdown(false); return; }
    setIsSearching(true);
    const timer = setTimeout(async () => {
      const results = await searchLadder(query);
      const deduped = [];
      const seen = new Set();
      for (const r of Array.isArray(results) ? results : []) {
        const tag = r.player?.playerIds?.[0]?.battleTag || r.player1Id;
        if (!tag || seen.has(tag)) continue;
        seen.add(tag);
        deduped.push(r);
      }
      setSearchResults(deduped.slice(0, 8));
      setShowDropdown(true);
      setIsSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const selectPlayer = useCallback(async (battleTag) => {
    setQuery(""); setSearchResults([]); setShowDropdown(false); setIsSearching(false);
    setSelectedTag(battleTag); setPlaystyleData(null); setLoading(true);
    setShowAllResults(false); setExpandedTag(null); setQueryFpData(null);
    setMatchFpData(null); setCompareData(null);

    if (apiKey) {
      try {
        const [simRes, fpRes] = await Promise.all([
          fetch(`${RELAY_URL}/api/fingerprints/similar/${encodeURIComponent(battleTag)}`, { headers: { "X-API-Key": apiKey } }),
          fetch(`${RELAY_URL}/api/fingerprints/player/${encodeURIComponent(battleTag)}`, { headers: { "X-API-Key": apiKey } }),
        ]);
        if (simRes.ok) setPlaystyleData(await simRes.json());
        if (fpRes.ok) setQueryFpData(await fpRes.json());
      } catch (err) { console.error("Playstyle fetch failed:", err); }
    }
    setLoading(false);
  }, [apiKey, RELAY_URL]);

  const toggleCompare = useCallback(async (battleTag) => {
    if (expandedTag === battleTag) {
      setExpandedTag(null); setMatchFpData(null); setCompareData(null); return;
    }
    setExpandedTag(battleTag); setMatchFpData(null); setCompareData(null); setCompareLoading(true);
    try {
      const [fpRes, cmpRes] = await Promise.all([
        fetch(`${RELAY_URL}/api/fingerprints/player/${encodeURIComponent(battleTag)}`, { headers: { "X-API-Key": apiKey } }),
        fetch(`${RELAY_URL}/api/fingerprints/compare/${encodeURIComponent(selectedTag)}/${encodeURIComponent(battleTag)}`, { headers: { "X-API-Key": apiKey } }),
      ]);
      if (fpRes.ok) setMatchFpData(await fpRes.json());
      if (cmpRes.ok) setCompareData(await cmpRes.json());
    } catch (err) { console.error("Compare fetch failed:", err); }
    setCompareLoading(false);
  }, [expandedTag, apiKey, RELAY_URL, selectedTag]);

  const dismiss = useCallback(() => {
    setSelectedTag(null); setPlaystyleData(null); setExpandedTag(null);
    setQueryFpData(null); setMatchFpData(null); setCompareData(null);
  }, []);

  const queryGames = playstyleData?.query?.replayCount || 0;
  const queryName = selectedTag ? selectedTag.split("#")[0] : "";

  return (
    <>
      {!loading && (
        <div className="navbar-search" ref={searchRef} style={{ marginLeft: 0, maxWidth: 560 }}>
          <input className="navbar-search-input" type="text" placeholder="Search a player to investigate..."
            value={query} onChange={(e) => setQuery(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
            style={{ width: "100%", fontSize: "18px", padding: "14px 20px", background: "rgba(0,0,0,0.7)" }}
          />
          {query && (
            <button className="navbar-search-clear" onClick={() => { setQuery(""); setSearchResults([]); setShowDropdown(false); }}>&times;</button>
          )}
          {showDropdown && searchResults.length > 0 && (
            <div className="navbar-search-dropdown">
              {searchResults.map((r) => {
                const p = r.player || {};
                const tag = p.playerIds?.[0]?.battleTag || r.player1Id || "";
                const mmr = p.mmr;
                const wins = p.wins || 0;
                const losses = p.losses || 0;
                const [name, hashNum] = (tag || "").split("#");
                return (
                  <button key={tag} className="navbar-search-result" onClick={() => selectPlayer(tag)}>
                    <span className="navbar-search-avatar-wrap">
                      {raceMapping[p.race] ? <img src={raceMapping[p.race]} alt="" className="navbar-search-avatar race-fallback" /> : <span className="navbar-search-avatar placeholder" />}
                    </span>
                    <span className="navbar-search-info">
                      <span className="navbar-search-name-row">
                        <span className="navbar-search-name">{name}</span>
                        {hashNum && <span className="navbar-search-tag">#{hashNum}</span>}
                      </span>
                      <span className="navbar-search-meta">
                        <span className="navbar-search-w">{wins}W</span>
                        <span className="navbar-search-l">{losses}L</span>
                      </span>
                    </span>
                    <span className="navbar-search-mmr">{mmr != null ? `${Math.round(mmr)} MMR` : "—"}</span>
                  </button>
                );
              })}
            </div>
          )}
          {isSearching && query.length >= 2 && !showDropdown && (
            <div className="navbar-search-dropdown"><div className="navbar-search-loading"><PeonLoader size="sm" /></div></div>
          )}
        </div>
      )}

      {loading && (
        <div style={{ textAlign: "center", padding: "var(--space-8) 0" }}>
          <PeonLoader subject={queryName} />
        </div>
      )}

      {selectedTag && !loading && (
        <>
          {queryGames === 0 && (
            <NoDataText>
              No replay data for <span style={{ color: "var(--gold)", fontFamily: "var(--font-display)" }}>{queryName}</span> yet.
              {" • "}<CloseBtn onClick={dismiss}>Dismiss</CloseBtn>
            </NoDataText>
          )}
          {playstyleData && queryGames > 0 && (
            <>
              <ResultsHeader>
                <ResultsTitle>Most Similar Players</ResultsTitle>
                <ResultsSubtitle>
                  {queryGames} replay{queryGames !== 1 ? "s" : ""} analyzed for {queryName}
                  {playstyleData.query?.hasEmbedding && <HybridBadge>Neural</HybridBadge>}
                  {playstyleData.calibration && (
                    <span style={{ color: "var(--grey-mid)", marginLeft: 8 }}>
                      {playstyleData.calibration.playerCount} players calibrated
                    </span>
                  )}
                  {" • "}<CloseBtn onClick={dismiss}>Dismiss</CloseBtn>
                </ResultsSubtitle>
              </ResultsHeader>
              {queryFpData && <PlayerIdentityCard fpData={queryFpData} name={queryName} />}
              {playstyleData.similar.length > 0 ? (
                <>
                  {playstyleData.similar.slice(0, showAllResults ? undefined : 3).map((s, i) => {
                    const verdict = getVerdict(s.similarity, s.percentile, s.zScore);
                    const name = (s.playerName || s.battleTag || "").split("#")[0];
                    const hasCalibration = s.percentile != null;
                    const displayScore = hasCalibration
                      ? `p${Math.round(s.percentile)}`
                      : `${Math.round(s.similarity * 100)}%`;
                    const bd = s.breakdown || {};
                    const isExpanded = expandedTag === s.battleTag;
                    return (
                      <React.Fragment key={s.battleTag}>
                        <ResultCard $active={isExpanded} onClick={() => toggleCompare(s.battleTag)}>
                          <ResultRank>{i + 1}</ResultRank>
                          <ResultInfo>
                            <ResultName>{name}</ResultName>
                            <ResultMeta>
                              {s.race || "Unknown"} • {s.replayCount} game{s.replayCount !== 1 ? "s" : ""}
                              {s.hybrid && <HybridBadge>Hybrid</HybridBadge>}
                              {hasCalibration && s.zScore != null && (
                                <span style={{ color: "var(--grey-mid)", marginLeft: 6 }}>
                                  z={s.zScore > 0 ? "+" : ""}{s.zScore}
                                </span>
                              )}
                            </ResultMeta>
                            <BreakdownWrap>
                              {[
                                { key: "action", label: "Actions", val: bd.action },
                                { key: "apm", label: "APM", val: bd.apm },
                                { key: "hotkey", label: "Hotkeys", val: bd.hotkey },
                                { key: "tempo", label: "Tempo", val: bd.tempo },
                                { key: "intensity", label: "Intens.", val: bd.intensity },
                                { key: "trans", label: "Switch", val: bd.transitions },
                                ...(bd.embedding != null ? [{ key: "embedding", label: "Neural", val: bd.embedding }] : []),
                              ].filter(({ val }) => val != null && val > 0).map(({ key, label, val }) => (
                                <BreakdownRow key={key}>
                                  <BreakdownLabel>{label}</BreakdownLabel>
                                  <BreakdownTrack>
                                    <BreakdownFill $val={val || 0} style={{ width: `${Math.round((val || 0) * 100)}%` }} />
                                  </BreakdownTrack>
                                </BreakdownRow>
                              ))}
                            </BreakdownWrap>
                          </ResultInfo>
                          <ResultScoreWrap>
                            <ResultScore $color={verdict.color}>{displayScore}</ResultScore>
                            <VerdictBadge $color={verdict.color}>{verdict.label}</VerdictBadge>
                          </ResultScoreWrap>
                        </ResultCard>
                        {isExpanded && (
                          compareLoading ? (
                            <ComparePanel><div style={{ textAlign: "center", padding: "var(--space-4)" }}><PeonLoader size="sm" /></div></ComparePanel>
                          ) : (
                            <CompareDetail fpDataA={queryFpData} fpDataB={matchFpData} compareData={compareData} nameA={queryName} nameB={name} />
                          )
                        )}
                      </React.Fragment>
                    );
                  })}
                  {playstyleData.similar.length > 3 && (
                    <div style={{ textAlign: "center" }}>
                      <ExpandToggle onClick={() => setShowAllResults((v) => !v)}>
                        {showAllResults ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
                        {showAllResults ? "Show top 3" : `Show all ${playstyleData.similar.length} results`}
                      </ExpandToggle>
                    </div>
                  )}
                </>
              ) : (
                <EmptyState>No similar players found in the database yet.</EmptyState>
              )}
            </>
          )}
        </>
      )}
    </>
  );
}
