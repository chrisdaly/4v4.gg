import React, { useState, useCallback, useEffect, useRef } from "react";
import styled from "styled-components";
import { useHistory, useLocation } from "react-router-dom";
import { useReplayLabStore } from "../../lib/useReplayLabStore";
import PeonLoader from "../../components/PeonLoader";
import PlayerIdentityCard, {
  polarToCart, RADAR_GROUPS, RADAR_SIZE, RADAR_CX, RADAR_CY, RADAR_R,
  SIG_AXES, extractSignature,
} from "../../components/PlayerIdentityCard";
import TransitionGlyph from "../../components/replay-lab/TransitionGlyph";
import { getGroupUnits, HERO_IMAGES, BUILDINGS } from "../../components/replay-lab/PlaystyleReport";
import { searchLadder, getPlayerProfilesBatch } from "../../lib/api";
import { raceMapping } from "../../lib/constants";
import { Input, CountryFlag } from "../../components/ui";
import { raceIcons } from "../../lib/constants";
import { EmptyState, CloseBtn } from "./shared-styles";

// ── Constants ───────────────────────────────────

const RACE_ICON_MAP = {
  Human: raceIcons.human, human: raceIcons.human,
  Orc: raceIcons.orc, orc: raceIcons.orc,
  "Night Elf": raceIcons.elf, NightElf: raceIcons.elf, nightelf: raceIcons.elf,
  Undead: raceIcons.undead, undead: raceIcons.undead,
  Random: raceIcons.random, random: raceIcons.random,
};

const ACTION_LABELS = ["Right-click", "Ability", "Build/Train", "Item", "Select HK", "Assign HK"];
const TEMPO_LABELS = ["<50ms", "50-100", "100-200", "200-500", "500ms-1s", "1-2s", "2-5s", "5s+"];
const ACTION_ID_LABELS = {
  16: "Ability₁", 17: "Ability₂", 18: "Ability₃", 19: "Ability₄", 20: "Ability₅",
  22: "Select", 23: "Assign HK", 24: "Select HK", 25: "Tab",
  30: "Dequeue", 97: "ESC", 102: "Skill", 103: "Build", 104: "Ping",
};

function getIdentifyVerdict(verdict, topMatch, queryName) {
  const matchName = topMatch ? (topMatch.playerName || topMatch.battleTag || "").split("#")[0] : null;
  if (verdict === 'confident') return {
    icon: "🚨", color: "#f87171",
    heading: `Likely smurf of ${matchName}`,
    sub: `p${Math.round(topMatch.percentile)} similarity — above the confident threshold`,
  };
  if (verdict === 'possible') return {
    icon: "⚠️", color: "var(--gold)",
    heading: matchName ? `Possibly related to ${matchName}` : "Possible match found",
    sub: `p${Math.round(topMatch.percentile)} similarity — warrants investigation`,
  };
  if (verdict === 'no_match') return {
    icon: "✓", color: "var(--grey-light)",
    heading: `${queryName} — no confident match`,
    sub: "Playstyle does not closely match any indexed player",
  };
  return null;
}

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

const NewSearchRow = styled.div`
  display: flex; align-items: center; gap: var(--space-3);
  margin-bottom: var(--space-4);
`;
const BackLink = styled.button`
  background: none; border: none; padding: 0; cursor: pointer;
  font-family: var(--font-mono); font-size: var(--text-xxs);
  color: var(--grey-light); text-transform: uppercase; letter-spacing: 0.1em;
  opacity: 0.6; transition: opacity 0.15s;
  &:hover { opacity: 1; }
`;
/* ── Compare table — players as columns, features as rows ── */
const CompareTable = styled.div`
  display: grid;
  grid-template-columns: 100px repeat(${p => p.$cols}, 1fr);
  margin-bottom: var(--space-6);
`;
const TH = styled.div`
  padding: var(--space-4) var(--space-4) var(--space-3);
  display: flex; flex-direction: column; align-items: center; gap: var(--space-2);
  border-bottom: 1px solid rgba(255,255,255,0.08);
  ${p => p.$query && `border-left: 2px solid rgba(252,219,51,0.3); background: rgba(252,219,51,0.03);`}
  ${p => p.$active && `border-left: 2px solid var(--gold);`}
  ${p => p.$clickable && `cursor: pointer; &:hover { background: rgba(252,219,51,0.05); }`}
`;
const THLabel = styled.div`
  font-family: var(--font-mono); font-size: var(--text-xxxs);
  text-transform: uppercase; letter-spacing: 0.12em;
  color: var(--grey-light); opacity: 0.4;
  align-self: flex-start;
`;
const THName = styled.div`
  font-family: var(--font-display); font-size: var(--text-base); color: var(--gold);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;
`;
const RowLabel = styled.div`
  display: flex; align-items: center;
  padding: var(--space-3) var(--space-2) var(--space-3) 0;
  font-family: var(--font-mono); font-size: var(--text-xxs);
  text-transform: uppercase; letter-spacing: 0.1em;
  color: var(--grey-light); opacity: 0.5;
  border-bottom: 1px solid rgba(255,255,255,0.04);
`;
const TD = styled.div`
  display: flex; align-items: center; justify-content: center;
  padding: var(--space-3) var(--space-2);
  font-family: var(--font-mono); font-size: var(--text-xs); color: #fff;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  text-align: center;
  ${p => p.$query && `background: rgba(252,219,51,0.03);`}
  ${p => p.$active && `background: rgba(252,219,51,0.06);`}
  ${p => p.$clickable && `cursor: pointer; &:hover { background: rgba(252,219,51,0.05); }`}
`;
const GlyphTD = styled(TD)`
  align-items: center; justify-content: center;
  padding: var(--space-4) var(--space-2);
  border-bottom: 1px solid rgba(255,255,255,0.08);
`;
const GlyphRowLabel = styled(RowLabel)`
  border-bottom: 1px solid rgba(255,255,255,0.08);
  align-items: flex-start; padding-top: var(--space-4);
`;
const ColSectionLabel = styled.div`
  font-family: var(--font-mono); font-size: var(--text-xxxs); color: var(--grey-light);
  text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: var(--space-2);
  opacity: 0.45;
`;
const ColName = styled.div`
  font-family: var(--font-display); font-size: var(--text-base); color: var(--gold);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  margin: var(--space-1) 0;
`;
const ColMeta = styled.div`
  font-family: var(--font-mono); font-size: var(--text-xs); color: var(--grey-light);
  margin-bottom: var(--space-3);
`;
const ColScoreRow = styled.div`
  display: flex; align-items: baseline; gap: var(--space-2); margin-bottom: var(--space-3);
`;
const ColScore = styled.div`
  font-family: var(--font-mono); font-size: var(--text-xl);
  color: ${p => p.$color || 'var(--white)'}; font-weight: 700; line-height: 1;
`;
const ColScoreBadge = styled.div`
  font-family: var(--font-mono); font-size: var(--text-xxxs);
  color: ${p => p.$color || 'var(--grey-light)'};
  border: 1px solid ${p => p.$color ? `${p.$color}50` : 'rgba(255,255,255,0.1)'};
  border-radius: var(--radius-sm); padding: 2px 6px;
  text-transform: uppercase; letter-spacing: 0.06em;
`;
const RankPill = styled.div`
  display: inline-block; font-family: var(--font-mono); font-size: var(--text-xxxs);
  color: var(--grey-light); background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1); border-radius: var(--radius-full);
  padding: 1px 7px; margin-bottom: var(--space-2);
`;
const ChatLog = styled.div`
  max-height: 130px; overflow-y: auto;
  scrollbar-width: thin; scrollbar-color: var(--grey-dark) transparent;
`;
const ChatLine = styled.div`
  font-family: var(--font-mono); font-size: 11px; color: rgba(255,255,255,0.65);
  padding: 2px 0 2px 8px; border-left: 2px solid rgba(255,255,255,0.1);
  margin-bottom: 4px; line-height: 1.35;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
`;
const NoDataText = styled.div`
  font-family: var(--font-mono); font-size: var(--text-xs); color: var(--grey-light);
  text-align: center; padding: var(--space-8) var(--space-4);
`;
const SearchSection = styled.div`
  position: relative; margin-bottom: var(--space-6);
`;
const SearchInputWrap = styled.div`
  position: relative;
`;
const VerdictBanner = styled.div`
  display: flex; align-items: center; gap: var(--space-3);
  padding: var(--space-3) var(--space-4); margin-bottom: var(--space-4);
  border-radius: var(--radius-md);
  background: ${p => p.$verdict === 'confident' ? 'rgba(248,113,113,0.08)' : p.$verdict === 'possible' ? 'rgba(252,219,51,0.07)' : 'rgba(255,255,255,0.04)'};
  border: 1px solid ${p => p.$verdict === 'confident' ? 'rgba(248,113,113,0.3)' : p.$verdict === 'possible' ? 'rgba(252,219,51,0.25)' : 'rgba(255,255,255,0.08)'};
`;
const VerdictIcon = styled.div`
  font-size: 20px; line-height: 1; flex-shrink: 0;
`;
const VerdictText = styled.div`flex: 1; min-width: 0;`;
const VerdictHeading = styled.div`
  font-family: var(--font-display); font-size: var(--text-sm);
  color: ${p => p.$verdict === 'confident' ? '#f87171' : p.$verdict === 'possible' ? 'var(--gold)' : 'var(--grey-light)'};
  margin-bottom: 2px;
`;
const VerdictSub = styled.div`
  font-family: var(--font-mono); font-size: var(--text-xxxs); color: var(--grey-light);
  text-transform: uppercase; letter-spacing: 0.07em;
`;

// ── Activity Timeline ────────────────────────────

// Approximate W3C season start dates (used only for the timeline x-axis)
const SEASON_STARTS = {
  16: new Date(2022, 8, 1),
  17: new Date(2023, 2, 1),
  18: new Date(2023, 9, 1),
  19: new Date(2024, 0, 1),
  20: new Date(2024, 8, 1),
  21: new Date(2025, 0, 1),
  22: new Date(2025, 4, 1),
  23: new Date(2025, 7, 1),
  24: new Date(2025, 11, 1),
};
const TIMELINE_START = new Date(2022, 8, 1).getTime();
const SHOWN_SEASONS = [16, 17, 18, 19, 20, 21, 22, 23, 24];

function toPct(dateStr) {
  if (!dateStr) return null;
  const t = new Date(dateStr).getTime();
  const end = Date.now();
  const total = end - TIMELINE_START;
  return Math.max(0, Math.min(100, ((t - TIMELINE_START) / total) * 100));
}

function ActivityTimeline({ players, matchProfiles }) {
  const nowPct = 100;
  const tickLabels = [
    { label: '2023', date: new Date(2023, 0, 1) },
    { label: '2024', date: new Date(2024, 0, 1) },
    { label: '2025', date: new Date(2025, 0, 1) },
    { label: '2026', date: new Date(2026, 0, 1) },
  ];

  return (
    <div style={{ marginBottom: 'var(--space-6)' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xxxs)', color: 'var(--grey-light)', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.5, marginBottom: 'var(--space-3)' }}>
        Activity Timeline
      </div>

      {/* Time axis ticks */}
      <div style={{ position: 'relative', marginLeft: 100, height: 18, marginBottom: 2 }}>
        {tickLabels.map(({ label, date }) => {
          const pct = toPct(date.toISOString());
          if (pct === null) return null;
          return (
            <div key={label} style={{ position: 'absolute', left: `${pct}%`, transform: 'translateX(-50%)', fontFamily: 'var(--font-mono)', fontSize: 9, color: 'rgba(255,255,255,0.2)', whiteSpace: 'nowrap' }}>
              {label}
            </div>
          );
        })}
      </div>

      {/* Player rows */}
      {players.map((player) => {
        const activityByS = new Map((player.seasonActivity || []).map(sa => [sa.season, sa]));
        const activeSeasonsNums = [...activityByS.keys()].sort((a, b) => a - b);
        const latestSeason = activeSeasonsNums[activeSeasonsNums.length - 1];
        const isCurrentlyActive = activityByS.has(24);
        const profile = matchProfiles?.[player.tag];

        const barColor = player.isQuery
          ? { fill: 'rgba(252,219,51,0.35)', border: 'rgba(252,219,51,0.6)', dot: '#fcdb33' }
          : { fill: 'rgba(100,200,255,0.25)', border: 'rgba(100,200,255,0.5)', dot: '#64c8ff' };

        // One bar per season, plus per-day dots for S24 (where we have full timeline data)
        const seasonBars = activeSeasonsNums.filter(s => s !== 24).map(s => {
          const startPct = SEASON_STARTS[s] ? toPct(SEASON_STARTS[s].toISOString()) : null;
          if (startPct === null) return null;
          const sa = activityByS.get(s);
          const endDate = sa?.lastPlayed || (SEASON_STARTS[s + 1] ? SEASON_STARTS[s + 1].toISOString() : null);
          const endPct = endDate ? toPct(endDate) : null;
          if (endPct === null) return null;
          return { s, startPct, endPct, lastPlayed: sa?.lastPlayed };
        }).filter(Boolean);

        // S24 dots — one per unique play-day from the timeline
        const s24 = activityByS.get(24);
        const s24Dots = (s24?.matchDays || []).map(day => toPct(day + 'T12:00:00Z')).filter(p => p !== null);

        return (
          <div key={player.tag} style={{ display: 'flex', alignItems: 'center', height: 40, marginBottom: 6 }}>
            {/* Player label */}
            <div style={{ width: 100, flexShrink: 0, paddingRight: 8, display: 'flex', alignItems: 'center', gap: 5, overflow: 'hidden' }}>
              {profile?.profilePicUrl
                ? <img src={profile.profilePicUrl} alt="" style={{ width: 20, height: 20, borderRadius: 2, flexShrink: 0 }} />
                : <span style={{ width: 20, height: 20, flexShrink: 0 }} />}
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 12, color: player.isQuery ? 'var(--gold)' : 'var(--grey-light)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {player.name}
              </span>
            </div>

            {/* Track */}
            <div style={{ flex: 1, position: 'relative', height: 40 }}>
              {/* Background */}
              <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.07)', transform: 'translateY(-50%)' }} />
              {/* Season ticks */}
              {SHOWN_SEASONS.map(s => {
                const pct = SEASON_STARTS[s] ? toPct(SEASON_STARTS[s].toISOString()) : null;
                if (pct === null) return null;
                return <div key={s} style={{ position: 'absolute', left: `${pct}%`, top: '25%', height: '50%', width: 1, background: 'rgba(255,255,255,0.1)' }} />;
              })}
              {/* Bars for historical seasons (S16–S23) */}
              {seasonBars.map(({ s, startPct, endPct, lastPlayed: lp }) => (
                <div
                  key={s}
                  title={lp ? `S${s}: last played ${lp.slice(0, 10)}` : `S${s}`}
                  style={{
                    position: 'absolute',
                    left: `${startPct}%`,
                    width: `${Math.max(endPct - startPct - 0.3, 0.5)}%`,
                    top: 'calc(50% - 5px)',
                    height: 10,
                    borderRadius: 3,
                    background: barColor.fill,
                    border: `1px solid ${barColor.border}`,
                    cursor: 'default',
                  }}
                />
              ))}
              {/* S24: per-day dots showing exact activity — gaps are real gaps */}
              {s24Dots.map((pct, i) => (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: `${pct}%`,
                    top: 'calc(50% - 4px)',
                    width: 3,
                    height: 8,
                    borderRadius: 1,
                    background: barColor.border,
                    transform: 'translateX(-50%)',
                  }}
                />
              ))}
              {/* S24 bar (fallback if no matchDays) */}
              {s24Dots.length === 0 && s24?.lastPlayed && (() => {
                const startPct = SEASON_STARTS[24] ? toPct(SEASON_STARTS[24].toISOString()) : null;
                const endPct = toPct(s24.lastPlayed);
                if (startPct === null || endPct === null) return null;
                return (
                  <div style={{
                    position: 'absolute', left: `${startPct}%`,
                    width: `${Math.max(endPct - startPct - 0.3, 0.5)}%`,
                    top: 'calc(50% - 5px)', height: 10, borderRadius: 3,
                    background: barColor.fill, border: `1px solid ${barColor.border}`,
                  }} />
                );
              })()}
              {/* Season labels */}
              {seasonBars.map(({ s, startPct }) => (
                <div key={s} style={{ position: 'absolute', left: `${startPct + 0.5}%`, top: 2, fontFamily: 'var(--font-mono)', fontSize: 9, color: barColor.dot, opacity: 0.8 }}>
                  S{s}
                </div>
              ))}
              {s24 && SEASON_STARTS[24] && (
                <div style={{ position: 'absolute', left: `${toPct(SEASON_STARTS[24].toISOString()) + 0.5}%`, top: 2, fontFamily: 'var(--font-mono)', fontSize: 9, color: barColor.dot, opacity: 0.8 }}>
                  S24
                </div>
              )}
              {/* "Last seen" callout for inactive players (no S24) */}
              {!isCurrentlyActive && latestSeason && seasonBars.length > 0 && (() => {
                const lastBar = seasonBars[seasonBars.length - 1];
                return (
                  <div style={{ position: 'absolute', left: `${lastBar.endPct}%`, bottom: 2, transform: 'translateX(-50%)', fontFamily: 'var(--font-mono)', fontSize: 9, color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }}>
                    S{latestSeason} · {lastBar.lastPlayed?.slice(0, 7)}
                  </div>
                );
              })()}
            </div>
          </div>
        );
      })}

      {/* Season legend at bottom */}
      <div style={{ marginLeft: 100, position: 'relative', height: 16 }}>
        {SHOWN_SEASONS.map(s => {
          const pct = SEASON_STARTS[s] ? toPct(SEASON_STARTS[s].toISOString()) : null;
          if (pct === null) return null;
          return (
            <div key={s} style={{ position: 'absolute', left: `${pct}%`, top: 0, fontFamily: 'var(--font-mono)', fontSize: 9, color: 'rgba(255,255,255,0.2)', transform: 'translateX(-50%)' }}>
              S{s}
            </div>
          );
        })}
      </div>
    </div>
  );
}

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
const TagLeft = styled.span`color: var(--blue);`;
const TagRight = styled.span`color: var(--red);`;

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
  height: 10px; border-radius: var(--radius-sm); position: relative;
  overflow: hidden; background: rgba(255, 255, 255, 0.06);
`;
const CFill = styled.div`
  position: absolute; top: 0; height: 100%; border-radius: var(--radius-sm);
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
  height: 8px; border-radius: var(--radius-sm); background: rgba(255,255,255,0.06);
  overflow: hidden; position: relative;
`;
const TempoFill = styled.div`
  position: absolute; top: 0; height: 100%; border-radius: var(--radius-sm);
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
  flex: 1; height: 6px; background: rgba(255,255,255,0.06); border-radius: var(--radius-sm);
  overflow: hidden; position: relative;
`;
const TransFill = styled.div`
  position: absolute; top: 0; height: 100%; border-radius: var(--radius-sm);
`;

// ── Early Game Timeline ─────────────────────────

const TimelineWrap = styled.div`
  position: relative; height: 28px; background: rgba(255,255,255,0.03);
  border-radius: var(--radius-md); overflow: hidden;
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
  width: 8px; height: 8px; border-radius: var(--radius-sm); display: inline-block;
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

const RELAY_URL_DEFAULT = import.meta.env.VITE_CHAT_RELAY_URL || "https://4v4gg-chat-relay.fly.dev";

export default function InvestigateTab() {
  const { apiKey, RELAY_URL: storeRelay } = useReplayLabStore();
  const RELAY_URL = storeRelay || RELAY_URL_DEFAULT;
  const history = useHistory();
  const location = useLocation();

  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef(null);

  const [selectedTag, setSelectedTag] = useState(null);
  const [playstyleData, setPlaystyleData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedTag, setExpandedTag] = useState(null);
  const [queryFpData, setQueryFpData] = useState(null);
  const [matchFpData, setMatchFpData] = useState(null);
  const [compareData, setCompareData] = useState(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [matchProfiles, setMatchProfiles] = useState({});
  const [demotedTags, setDemotedTags] = useState(new Set());

  const toggleDemote = (tag) => setDemotedTags(prev => {
    const next = new Set(prev);
    next.has(tag) ? next.delete(tag) : next.add(tag);
    return next;
  });

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

  // Sync URL → auto-search on mount / back-nav
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const qTag = params.get("q");
    if (qTag && qTag !== selectedTag) selectPlayer(qTag);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selectPlayer = useCallback(async (battleTag) => {
    history.replace({ search: `?tab=identify&q=${encodeURIComponent(battleTag)}` });

    setQuery(""); setSearchResults([]); setShowDropdown(false); setIsSearching(false);
    setSelectedTag(battleTag); setPlaystyleData(null); setLoading(true);
    setDemotedTags(new Set());
    setExpandedTag(null); setQueryFpData(null);
    setMatchFpData(null); setCompareData(null);

    try {
      const identifyRes = await fetch(`${RELAY_URL}/api/fingerprints/identify/${encodeURIComponent(battleTag)}`);
      if (identifyRes.ok) {
        const data = await identifyRes.json();
        setPlaystyleData(data);
        const tags = (data.similar || []).map(s => s.battleTag).filter(Boolean);
        if (tags.length > 0) {
          getPlayerProfilesBatch([battleTag, ...tags]).then(profileMap => {
            const obj = {};
            for (const [tag, profile] of profileMap) obj[tag] = profile;
            setMatchProfiles(obj);
          });
        }
      }
      if (apiKey) {
        const fpRes = await fetch(`${RELAY_URL}/api/fingerprints/player/${encodeURIComponent(battleTag)}`, { headers: { "X-API-Key": apiKey } });
        if (fpRes.ok) setQueryFpData(await fpRes.json());
      }
    } catch (err) { console.error("Playstyle fetch failed:", err); }
    setLoading(false);
  }, [apiKey, RELAY_URL, history]);

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
    const params = new URLSearchParams(location.search);
    params.delete("q");
    history.replace({ search: params.toString() ? `?${params}` : "" });
    setSelectedTag(null); setPlaystyleData(null); setExpandedTag(null);
    setQueryFpData(null); setMatchFpData(null); setCompareData(null); setMatchProfiles({});
  }, [history, location.search]);

  const queryGames = playstyleData?.query?.replayCount || 0;
  const queryName = selectedTag ? selectedTag.split("#")[0] : "";

  return (
    <>
      {!selectedTag && !loading && (
        <SearchSection ref={searchRef}>
          <SearchInputWrap>
            <Input
              $fullWidth
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setQuery("")}
              onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
              placeholder="Search a player to investigate…"
              autoFocus
            />
          </SearchInputWrap>
          {showDropdown && searchResults.length > 0 && (
            <div className="navbar-search-dropdown">
              {searchResults.map((r) => {
                const p = r.player || {};
                const tag = p.playerIds?.[0]?.battleTag || r.player1Id || "";
                const mmr = p.mmr;
                const wins = p.wins || 0;
                const losses = p.losses || 0;
                const [name, hashNum] = (tag || "").split("#");
                const raceIcon = RACE_ICON_MAP[p.race];
                return (
                  <button key={tag} className="navbar-search-result" onClick={() => selectPlayer(tag)}>
                    <span className="navbar-search-avatar-wrap">
                      {raceIcon
                        ? <img src={raceIcon} alt="" className="navbar-search-avatar race-fallback" />
                        : <span className="navbar-search-avatar placeholder" />}
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
        </SearchSection>
      )}

      {loading && (
        <div style={{ textAlign: "center", padding: "var(--space-8) 0" }}>
          <PeonLoader subject={queryName} />
        </div>
      )}

      {selectedTag && !loading && (
        <>
          <NewSearchRow>
            <BackLink onClick={dismiss}>← Search again</BackLink>
          </NewSearchRow>
          {queryGames === 0 && (
            <NoDataText>
              No replay data for <span style={{ color: "var(--gold)", fontFamily: "var(--font-display)" }}>{queryName}</span> yet.
            </NoDataText>
          )}
          {playstyleData && queryGames > 0 && (
            <>

              {playstyleData.similar.length > 0 ? (
                <>
                  {(() => {
                    const qGlyph = playstyleData.query?.glyph;
                    const qApm = playstyleData.query?.apm;
                    const qRace = playstyleData.query?.race;
                    const qMmr = playstyleData.query?.mmr;
                    const qProfile = matchProfiles[selectedTag];
                    const qCountry = qProfile?.country;
                    const qAvatar = qProfile?.profilePicUrl;
                    const qRaceIcon = RACE_ICON_MAP[qRace];

                    const rawCandidates = playstyleData.similar.slice(0, 5);
                    // Demoted candidates move to the end, preserving relative order within each group
                    const candidates = [
                      ...rawCandidates.filter(s => !demotedTags.has(s.battleTag)),
                      ...rawCandidates.filter(s => demotedTags.has(s.battleTag)),
                    ];
                    const numCols = 1 + candidates.length;

                    const renderAvatar = (avatarUrl, raceIcon, size = 44) => (
                      <span className="navbar-search-avatar-wrap" style={{ position: "relative", flexShrink: 0 }}>
                        {avatarUrl
                          ? <img src={avatarUrl} alt="" className="navbar-search-avatar" style={{ width: size, height: size, borderRadius: "var(--radius-sm)" }} />
                          : raceIcon
                            ? <img src={raceIcon} alt="" className="navbar-search-avatar race-fallback" style={{ width: size, height: size, borderRadius: "var(--radius-sm)" }} />
                            : <span className="navbar-search-avatar placeholder" style={{ width: size, height: size, borderRadius: "var(--radius-sm)" }} />}
                      </span>
                    );

                    const fmtDate = (d) => {
                      if (!d) return '—';
                      const [y, m] = d.split('-');
                      return new Date(parseInt(y), parseInt(m) - 1).toLocaleString('default', { month: 'short', year: 'numeric' });
                    };

                    // Collect all active group numbers across query + candidates
                    const allGlyphs = [qGlyph, ...candidates.map(s => s.glyph)];
                    const activeGroupNums = new Set();
                    for (const glyph of allGlyphs) {
                      if (!glyph?.groupCompositions) continue;
                      for (const [g, items] of Object.entries(glyph.groupCompositions)) {
                        if (items && items.length > 0) activeGroupNums.add(parseInt(g));
                      }
                    }
                    const sortedGroupNums = [...activeGroupNums].filter(n => !isNaN(n)).sort((a, b) => a - b);

                    const renderGroupUnits = (glyph, groupNum) => {
                      const items = glyph?.groupCompositions?.[String(groupNum)] || [];
                      const units = getGroupUnits(items).slice(0, 5);
                      if (units.length === 0) return <span style={{ color: "var(--grey-mid)" }}>—</span>;
                      return units.map(u => {
                        const isHero = !!HERO_IMAGES[u.id];
                        const isBuilding = BUILDINGS.has(u.id);
                        const img = u.img || (isHero ? `/heroes/${HERO_IMAGES[u.id]}.png` : null);
                        return img
                          ? <img key={u.id} src={img} alt={u.name} title={u.name} style={{ width: isHero ? 28 : 22, height: isHero ? 28 : 22, objectFit: "contain" }} onError={e => { e.target.style.display = 'none'; }} />
                          : <span key={u.id} title={u.name} style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: isBuilding ? "var(--amber)" : "var(--grey-light)", padding: "0 2px" }}>{u.name}</span>;
                      });
                    };

                    // Played-together matrix (all pairs among query + candidates)
                    const matrixTags = [selectedTag, ...candidates.map(s => s.battleTag)];
                    const matrixNames = [queryName, ...candidates.map(s => (s.playerName || s.battleTag || "").split("#")[0])];
                    const sharedMatrix = playstyleData.matrix || {};
                    const getShared = (t1, t2) => {
                      const k1 = `${t1}|${t2}`;
                      const k2 = `${t2}|${t1}`;
                      return sharedMatrix[k1] ?? sharedMatrix[k2] ?? 0;
                    };

                    return (
                      <>
                      <CompareTable $cols={numCols}>
                        {/* ── Header row: player names ── */}
                        <div />
                        <TH $query>
                          {renderAvatar(qAvatar, qRaceIcon)}
                          <THName>{queryName}</THName>
                          {qCountry && <CountryFlag name={qCountry.toLowerCase()} style={{ width: 16, height: 12 }} />}
                        </TH>
                        {candidates.map(s => {
                          const name = (s.playerName || s.battleTag || "").split("#")[0];
                          const isExpanded = expandedTag === s.battleTag;
                          const isDemoted = demotedTags.has(s.battleTag);
                          const mp = matchProfiles[s.battleTag];
                          return (
                            <TH key={s.battleTag} $active={isExpanded} $clickable onClick={() => toggleCompare(s.battleTag)} style={{ opacity: isDemoted ? 0.55 : 1 }}>
                              {renderAvatar(mp?.profilePicUrl, RACE_ICON_MAP[s.race])}
                              <THName>{name}</THName>
                              {mp?.country && <CountryFlag name={mp.country.toLowerCase()} style={{ width: 16, height: 12 }} />}
                              <button
                                title={isDemoted ? "Restore to top" : "Move to comparison"}
                                onClick={e => { e.stopPropagation(); toggleDemote(s.battleTag); }}
                                style={{ marginTop: 2, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 10, color: isDemoted ? 'var(--gold)' : 'rgba(255,255,255,0.3)', lineHeight: 1 }}
                              >
                                {isDemoted ? '↑' : '↓'}
                              </button>
                            </TH>
                          );
                        })}

                        {/* ── Fingerprint row ── */}
                        <GlyphRowLabel>Fingerprint</GlyphRowLabel>
                        <GlyphTD $query>
                          <TransitionGlyph
                            transitionPairs={qGlyph?.transitionPairs || []}
                            groupUsage={qGlyph?.groupUsage || []}
                            groupCompositions={qGlyph?.groupCompositions || {}}
                            segments={qApm ? { apm: [qApm / 300, 0, 0] } : null}
                            playerName={queryName}
                            replayCount={queryGames}
                            mini
                          />
                        </GlyphTD>
                        {candidates.map(s => {
                          const name = (s.playerName || s.battleTag || "").split("#")[0];
                          const isExpanded = expandedTag === s.battleTag;
                          const hasArcs = s.glyph?.transitionPairs?.length > 0;
                          return (
                            <GlyphTD key={s.battleTag} $active={isExpanded} $clickable onClick={() => toggleCompare(s.battleTag)}>
                              <div style={{ position: "relative", width: "100%" }}>
                                <TransitionGlyph
                                  transitionPairs={s.glyph?.transitionPairs || []}
                                  groupUsage={s.glyph?.groupUsage || []}
                                  groupCompositions={s.glyph?.groupCompositions || {}}
                                  segments={s.apm ? { apm: [s.apm / 300, 0, 0] } : null}
                                  playerName={name}
                                  replayCount={s.replayCount}
                                  mini
                                />
                                {!hasArcs && (
                                  <div style={{ position: "absolute", bottom: 4, left: 0, right: 0, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--grey-mid)", fontStyle: "italic" }}>
                                    fetching sequence…
                                  </div>
                                )}
                              </div>
                            </GlyphTD>
                          );
                        })}

                        {/* ── Feature rows ── */}
                        <RowLabel>MMR</RowLabel>
                        <TD $query>{qMmr != null ? Math.round(qMmr) : '—'}</TD>
                        {candidates.map(s => (
                          <TD key={s.battleTag} $active={expandedTag === s.battleTag}>{s.mmr != null ? Math.round(s.mmr) : '—'}</TD>
                        ))}

                        <RowLabel>Country</RowLabel>
                        <TD $query>
                          {qCountry ? <CountryFlag name={qCountry.toLowerCase()} style={{ width: 22, height: 16 }} /> : '—'}
                        </TD>
                        {candidates.map(s => {
                          const c = matchProfiles[s.battleTag]?.country;
                          return (
                            <TD key={s.battleTag} $active={expandedTag === s.battleTag}>
                              {c ? <CountryFlag name={c.toLowerCase()} style={{ width: 22, height: 16 }} /> : '—'}
                            </TD>
                          );
                        })}

                        <RowLabel>Race</RowLabel>
                        <TD $query>
                          {qRaceIcon ? <img src={qRaceIcon} alt={qRace || ''} style={{ width: 22, height: 22 }} /> : (qRace || '—')}
                        </TD>
                        {candidates.map(s => {
                          const ri = RACE_ICON_MAP[s.race];
                          return (
                            <TD key={s.battleTag} $active={expandedTag === s.battleTag}>
                              {ri ? <img src={ri} alt={s.race || ''} style={{ width: 22, height: 22 }} /> : (s.race || '—')}
                            </TD>
                          );
                        })}

                        {/* ── One row per active group across all players ── */}
                        {sortedGroupNums.map(groupNum => (
                          <React.Fragment key={`group-${groupNum}`}>
                            <RowLabel>Group {groupNum}</RowLabel>
                            <TD $query style={{ gap: 3, flexWrap: "wrap", justifyContent: "center" }}>
                              {renderGroupUnits(qGlyph, groupNum)}
                            </TD>
                            {candidates.map(s => (
                              <TD key={s.battleTag} $active={expandedTag === s.battleTag} style={{ gap: 3, flexWrap: "wrap", justifyContent: "center" }}>
                                {renderGroupUnits(s.glyph, groupNum)}
                              </TD>
                            ))}
                          </React.Fragment>
                        ))}

                        <RowLabel>APM</RowLabel>
                        <TD $query>{qApm ?? '—'}</TD>
                        {candidates.map(s => (
                          <TD key={s.battleTag} $active={expandedTag === s.battleTag}>{s.apm ?? '—'}</TD>
                        ))}

                        <RowLabel>Last seen</RowLabel>
                        <TD $query>{fmtDate(playstyleData.query?.lastSeen)}</TD>
                        {candidates.map(s => (
                          <TD key={s.battleTag} $active={expandedTag === s.battleTag}>{fmtDate(s.lastSeen)}</TD>
                        ))}

                        <RowLabel>Replays</RowLabel>
                        <TD $query>{queryGames}</TD>
                        {candidates.map(s => (
                          <TD key={s.battleTag} $active={expandedTag === s.battleTag}>{s.replayCount}</TD>
                        ))}
                      </CompareTable>

                      {/* ── Played-together matrix (outside the column grid) ── */}
                      {matrixTags.length > 1 && (
                        <div style={{ marginBottom: "var(--space-6)" }}>
                          <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xxxs)", color: "var(--grey-light)", textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.5, marginBottom: "var(--space-2)" }}>Played together</div>
                          <div style={{ display: "grid", gridTemplateColumns: `120px repeat(${matrixTags.length}, 1fr)`, gap: 1 }}>
                            {/* header */}
                            <div />
                            {matrixNames.map((n, i) => (
                              <div key={i} style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-xs)", color: i === 0 ? "var(--gold)" : "var(--grey-light)", padding: "4px 6px", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n}</div>
                            ))}
                            {/* rows */}
                            {matrixTags.map((tagA, i) => (
                              <React.Fragment key={tagA}>
                                <div style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-xs)", color: i === 0 ? "var(--gold)" : "var(--grey-light)", padding: "4px 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{matrixNames[i]}</div>
                                {matrixTags.map((tagB, j) => {
                                  if (i === j) return <div key={j} style={{ textAlign: "center", padding: "4px 6px", fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "rgba(255,255,255,0.15)" }}>—</div>;
                                  const count = getShared(tagA, tagB);
                                  return (
                                    <div key={j} style={{ textAlign: "center", padding: "4px 6px", fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: count > 0 ? "var(--gold)" : "rgba(255,255,255,0.25)", fontWeight: count > 0 ? 700 : 400 }}>
                                      {count > 0 ? `${count}×` : "0"}
                                    </div>
                                  );
                                })}
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                      )}
                      </>
                    );
                  })()}

                  {/* Activity timeline — shows when each player was active across seasons */}
                  {(() => {
                    const tlCandidates = playstyleData.similar.slice(0, 5);
                    const tlPlayers = [
                      {
                        tag: selectedTag,
                        name: queryName,
                        isQuery: true,
                        seasonActivity: playstyleData.query?.seasonActivity || [],
                      },
                      ...tlCandidates.map(s => ({
                        tag: s.battleTag,
                        name: (s.playerName || s.battleTag || "").split("#")[0],
                        isQuery: false,
                        seasonActivity: s.seasonActivity || [],
                      })),
                    ];
                    const hasAnyActivity = tlPlayers.some(p => p.seasonActivity.length > 0);
                    if (!hasAnyActivity) return null;
                    return <ActivityTimeline players={tlPlayers} matchProfiles={matchProfiles} />;
                  })()}

                  {/* Compare panel spans below the whole grid */}
                  {expandedTag && (
                    compareLoading ? (
                      <ComparePanel><div style={{ textAlign: "center", padding: "var(--space-4)" }}><PeonLoader size="sm" /></div></ComparePanel>
                    ) : (
                      <CompareDetail
                        fpDataA={queryFpData}
                        fpDataB={matchFpData}
                        compareData={compareData}
                        nameA={queryName}
                        nameB={(playstyleData.similar.find(s => s.battleTag === expandedTag)?.playerName || expandedTag || "").split("#")[0]}
                      />
                    )
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
