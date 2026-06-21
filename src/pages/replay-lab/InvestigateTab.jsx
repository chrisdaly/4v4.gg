import React, { useState, useCallback, useEffect, useRef } from "react";
import styled from "styled-components";
import { useHistory, useLocation, Link } from "react-router-dom";
import { useReplayLabStore } from "../../lib/useReplayLabStore";
import { ADMIN_KEY_401_EVENT } from "../../lib/useAdmin";
import PeonLoader from "../../components/PeonLoader";
import PlayerIdentityCard, {
  polarToCart, RADAR_GROUPS, RADAR_SIZE, RADAR_CX, RADAR_CY, RADAR_R,
  SIG_AXES, extractSignature,
} from "../../components/PlayerIdentityCard";
import TransitionGlyph from "../../components/replay-lab/TransitionGlyph";
import { getGroupUnits, HERO_IMAGES, BUILDINGS } from "../../components/replay-lab/PlaystyleReport";
import { searchLadderWithFallback, getPlayerProfilesBatch, getLadder } from "../../lib/api";
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
  grid-template-columns: 90px repeat(${p => p.$cols}, 200px);
  margin-bottom: var(--space-6);
`;
const TH = styled.div`
  position: relative;
  padding: var(--space-4) var(--space-3) var(--space-3);
  display: flex; flex-direction: column; align-items: center; gap: var(--space-2);
  border-bottom: 2px solid rgba(255,255,255,0.12);
  border-left: 1px solid rgba(255,255,255,0.07);
  ${p => p.$query && `
    border-left: 3px solid rgba(252,219,51,0.55);
    background: rgba(252,219,51,0.04);
  `}
  ${p => p.$active && `border-left: 3px solid var(--gold);`}
  ${p => p.$clickable && `cursor: pointer; &:hover { background: rgba(252,219,51,0.05); }`}
`;
const THLabel = styled.div`
  font-family: var(--font-mono); font-size: var(--text-xxxs);
  text-transform: uppercase; letter-spacing: 0.1em;
  color: var(--grey-mid);
`;
const THName = styled.div`
  font-family: var(--font-display); font-size: var(--text-sm); color: var(--gold);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;
`;
const RowLabel = styled.div`
  display: flex; align-items: center;
  padding: var(--space-2) var(--space-2) var(--space-2) 0;
  font-family: var(--font-mono); font-size: var(--text-xxxs);
  text-transform: uppercase; letter-spacing: 0.1em;
  color: var(--grey-mid);
  border-bottom: 1px solid rgba(255,255,255,0.05);
`;
const TD = styled.div`
  display: flex; align-items: center; justify-content: center;
  padding: var(--space-2) var(--space-2);
  font-family: var(--font-mono); font-size: var(--text-xs); color: #fff;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  border-left: 1px solid rgba(255,255,255,0.06);
  text-align: center;
  ${p => p.$query && `background: rgba(252,219,51,0.03);`}
  ${p => p.$active && `background: rgba(252,219,51,0.06);`}
  ${p => p.$clickable && `cursor: pointer; &:hover { background: rgba(252,219,51,0.05); }`}
`;
const GlyphTD = styled(TD)`
  align-items: center; justify-content: center;
  padding: var(--space-3) var(--space-2);
  border-bottom: 2px solid rgba(255,255,255,0.1);
`;
const GlyphRowLabel = styled(RowLabel)`
  border-bottom: 2px solid rgba(255,255,255,0.1);
  align-items: flex-start; padding-top: var(--space-3);
`;
const FilterBtn = styled.button`
  width: 100%; margin-top: var(--space-1);
  padding: 5px 8px;
  display: flex; align-items: center; justify-content: space-between; gap: 4px;
  background: ${p => p.$active ? 'rgba(212,175,55,0.12)' : 'rgba(255,255,255,0.05)'};
  border: 1px solid ${p => p.$active ? 'rgba(212,175,55,0.4)' : 'rgba(255,255,255,0.1)'};
  border-radius: var(--radius-sm); cursor: pointer;
  color: ${p => p.$active ? 'var(--gold)' : 'var(--grey-mid)'};
  font-size: var(--text-xxxs); font-family: var(--font-mono);
  &:hover { border-color: ${p => p.$active ? 'rgba(212,175,55,0.6)' : 'rgba(255,255,255,0.2)'}; }
`;
const RemoveBtn = styled.button`
  position: absolute; top: 6px; right: 6px;
  width: 18px; height: 18px; padding: 0;
  display: flex; align-items: center; justify-content: center;
  background: rgba(255,60,60,0.1); border: 1px solid rgba(255,60,60,0.25);
  border-radius: var(--radius-sm); cursor: pointer;
  font-size: 12px; font-weight: 700; line-height: 1;
  color: rgba(255,100,100,0.7);
  opacity: 0.6; transition: opacity 0.15s;
  &:hover { opacity: 1; background: rgba(255,60,60,0.2); }
`;
const ColSectionLabel = styled.div`
  font-family: var(--font-mono); font-size: var(--text-xxxs); color: var(--grey-mid);
  text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: var(--space-2);
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
  font-family: var(--font-mono); font-size: var(--text-xxxs); color: var(--grey-light);
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
const SkeletonCard = () => (
  <div style={{ width: 210, flexShrink: 0, padding: '14px', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(255,255,255,0.06)', background: 'var(--surface-1)', display: 'flex', flexDirection: 'column', gap: 12 }}>
    <div style={{ display: 'flex', gap: 12 }}>
      <div className="loader-skeleton" style={{ width: 56, height: 56, borderRadius: 'var(--radius-sm)', flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8 }}>
        <div className="loader-skeleton text" style={{ height: 14, width: '75%' }} />
        <div className="loader-skeleton text" style={{ height: 10, width: '45%' }} />
        <div className="loader-skeleton text" style={{ height: 14, width: '55%' }} />
      </div>
    </div>
    <div className="loader-skeleton" style={{ height: 30, borderRadius: 'var(--radius-sm)' }} />
  </div>
);
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

function toWeekStart(dayStr) {
  const d = new Date(dayStr + 'T12:00:00Z');
  const dow = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - (dow - 1));
  return d.toISOString().slice(0, 10);
}

function ActivityTimeline({ players, matchProfiles, startDate = null }) {
  // When a date filter is active, clip matchDays to only those on/after startDate
  const filterMs = startDate ? new Date(startDate).getTime() : null;
  const filteredPlayers = filterMs
    ? players.map(p => ({
        ...p,
        seasonActivity: (p.seasonActivity || []).map(sa => ({
          ...sa,
          matchDays: (sa.matchDays || []).filter(d => new Date(d + 'T12:00:00Z').getTime() >= filterMs),
        })).filter(sa => sa.matchDays.length > 0),
      }))
    : players;

  // Build raw day sets per player for shared-day detection
  const daySetByTag = new Map(filteredPlayers.map(p => [
    p.tag,
    new Set((p.seasonActivity || []).flatMap(sa => sa.matchDays || [])),
  ]));
  const queryDays = filteredPlayers[0] ? (daySetByTag.get(filteredPlayers[0].tag) || new Set()) : new Set();

  const sharedDays = new Set();
  for (const p of filteredPlayers.slice(1)) {
    for (const d of (daySetByTag.get(p.tag) || [])) {
      if (queryDays.has(d)) sharedDays.add(d);
    }
  }
  const totalShared = sharedDays.size;

  // Only show seasons where at least one player has activity
  const usedSeasons = new Set(filteredPlayers.flatMap(p => (p.seasonActivity || []).map(sa => sa.season)));
  const visibleSeasons = SHOWN_SEASONS.filter(s => usedSeasons.has(s));

  // Clip x-axis: use filterDate when active, otherwise earliest season
  const earliestSeason = visibleSeasons[0] ?? 16;
  const effectiveStart = filterMs
    ? filterMs
    : (SEASON_STARTS[earliestSeason] ?? new Date(2022, 8, 1)).getTime();
  const effectiveEnd = Date.now();
  const tl = (dateStr) => {
    if (!dateStr) return null;
    const t = new Date(dateStr).getTime();
    return Math.max(0, Math.min(100, ((t - effectiveStart) / (effectiveEnd - effectiveStart)) * 100));
  };

  // Year labels that fall within the visible range
  const allYearLabels = [2022, 2023, 2024, 2025, 2026].map(y => ({ label: String(y), date: new Date(y, 0, 1) }));
  const yearLabels = allYearLabels.filter(({ date }) => date.getTime() > effectiveStart && date.getTime() < effectiveEnd);

  const LABEL_W = 140;

  return (
    <div style={{ marginBottom: 'var(--space-6)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 'var(--space-4)' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xxxs)', color: 'var(--grey-mid)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Activity Timeline
        </div>
        {totalShared > 0 && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xxs)', color: 'var(--gold)' }}>
            {totalShared} shared day{totalShared !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Year labels */}
      <div style={{ position: 'relative', marginLeft: LABEL_W, height: 20, marginBottom: 4 }}>
        {yearLabels.map(({ label, date }) => {
          const pct = tl(date.toISOString());
          if (pct === null) return null;
          return (
            <div key={label} style={{ position: 'absolute', left: `${pct}%`, transform: 'translateX(-50%)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xxs)', color: 'var(--grey-mid)', whiteSpace: 'nowrap' }}>
              {label}
            </div>
          );
        })}
      </div>

      {/* Player rows */}
      {filteredPlayers.map((player) => {
        const activityByS = new Map((player.seasonActivity || []).map(sa => [sa.season, sa]));
        const playerActiveSeasonsNums = [...activityByS.keys()].sort((a, b) => a - b);
        const latestSeason = playerActiveSeasonsNums[playerActiveSeasonsNums.length - 1];
        const isCurrentlyActive = activityByS.has(24);
        const profile = matchProfiles?.[player.tag];

        const baseColor = player.isQuery ? '#fcdb33' : '#64c8ff';
        const fillColor = player.isQuery ? 'rgba(252,219,51,0.25)' : 'rgba(100,200,255,0.2)';

        const seasonDots = playerActiveSeasonsNums.map(s => {
          const sa = activityByS.get(s);
          const rawDays = sa?.matchDays || [];
          let dotDays;
          if (rawDays.length > 20) {
            const weekSet = new Set(rawDays.map(toWeekStart));
            dotDays = [...weekSet].sort();
          } else {
            dotDays = [...rawDays].sort();
          }
          const dots = dotDays.map(day => ({
            pct: tl(day + 'T12:00:00Z'),
            shared: rawDays.some(rd => sharedDays.has(rd) && toWeekStart(rd) === toWeekStart(day)),
          })).filter(d => d.pct !== null);
          const startPct = SEASON_STARTS[s] ? tl(SEASON_STARTS[s].toISOString()) : null;
          const endDate = sa?.lastPlayed || (SEASON_STARTS[s + 1]?.toISOString() || null);
          const endPct = endDate ? tl(endDate) : null;
          return { s, dots, rawDays, startPct, endPct, lastPlayed: sa?.lastPlayed };
        });

        const playerSharedCount = [...(daySetByTag.get(player.tag) || [])].filter(d => sharedDays.has(d)).length;

        return (
          <div key={player.tag} style={{ display: 'flex', alignItems: 'center', height: 64, marginBottom: 6 }}>
            {/* Label */}
            <div style={{ width: LABEL_W, flexShrink: 0, paddingRight: 10, display: 'flex', alignItems: 'center', gap: 7, overflow: 'hidden' }}>
              {profile?.profilePicUrl
                ? <img src={profile.profilePicUrl} alt="" style={{ width: 28, height: 28, borderRadius: 2, flexShrink: 0 }} />
                : <span style={{ width: 28, height: 28, flexShrink: 0 }} />}
              <div style={{ overflow: 'hidden', minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xs)', color: player.isQuery ? 'var(--gold)' : '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {player.name}
                </div>
                {!player.isQuery && playerSharedCount > 0 && (
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xxxs)', color: 'var(--gold)' }}>
                    {playerSharedCount}d overlap
                  </div>
                )}
              </div>
            </div>

            {/* Track */}
            <div style={{ flex: 1, position: 'relative', height: 64 }}>
              <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.07)', transform: 'translateY(-50%)' }} />
              {visibleSeasons.map(s => {
                const pct = SEASON_STARTS[s] ? tl(SEASON_STARTS[s].toISOString()) : null;
                if (pct === null) return null;
                return <div key={s} style={{ position: 'absolute', left: `${pct}%`, top: '15%', height: '70%', width: 1, background: 'rgba(255,255,255,0.09)' }} />;
              })}
              {/* Ticks */}
              {seasonDots.map(({ s, dots, startPct, endPct, lastPlayed: lp }) => (
                <React.Fragment key={s}>
                  {dots.length > 0
                    ? dots.map((dot, i) => (
                        <div key={i} title={dot.shared ? 'Played same day as query' : undefined} style={{
                          position: 'absolute', left: `${dot.pct}%`,
                          top: 'calc(50% - 8px)',
                          width: dot.shared ? 4 : 3,
                          height: dot.shared ? 18 : 14,
                          borderRadius: 1,
                          background: dot.shared ? 'var(--gold)' : baseColor,
                          opacity: dot.shared ? 1 : 0.65,
                          transform: 'translateX(-50%)',
                          zIndex: dot.shared ? 2 : 1,
                        }} />
                      ))
                    : (startPct !== null && endPct !== null && (
                        <div title={lp ? `S${s}: last played ${lp.slice(0, 10)}` : `S${s}`} style={{
                          position: 'absolute', left: `${startPct}%`,
                          width: `${Math.max(endPct - startPct - 0.3, 0.5)}%`,
                          top: 'calc(50% - 6px)', height: 12, borderRadius: 3,
                          background: fillColor, border: `1px solid ${baseColor}`,
                          opacity: 0.7,
                        }} />
                      ))
                  }
                </React.Fragment>
              ))}
              {/* Season labels */}
              {seasonDots.map(({ s }) => {
                const pct = SEASON_STARTS[s] ? tl(SEASON_STARTS[s].toISOString()) : null;
                if (pct === null) return null;
                return (
                  <div key={s} style={{ position: 'absolute', left: `${pct + 0.3}%`, top: 5, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xxxs)', color: baseColor, opacity: 0.75 }}>
                    S{s}
                  </div>
                );
              })}
              {/* Last-seen callout */}
              {!isCurrentlyActive && latestSeason && (() => {
                const last = seasonDots.find(d => d.s === latestSeason);
                if (!last?.lastPlayed) return null;
                const endPct = last.dots.length > 0 ? last.dots[0].pct : last.endPct;
                if (endPct === null) return null;
                return (
                  <div style={{ position: 'absolute', left: `${endPct}%`, bottom: 5, transform: 'translateX(-50%)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xxxs)', color: 'var(--grey-mid)', whiteSpace: 'nowrap' }}>
                    S{latestSeason} · {last.lastPlayed.slice(0, 7)}
                  </div>
                );
              })()}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Compare Panel Styles ────────────────────────

const ComparePanel = styled.div`
  border-top: 1px solid rgba(255,255,255,0.06);
  padding: var(--space-5) 0 var(--space-3);
  margin-bottom: var(--space-3);
`;
const CompareSection = styled.div`
  margin-bottom: var(--space-5); &:last-child { margin-bottom: 0; }
`;
const CompareSectionTitle = styled.div`
  font-family: var(--font-mono); font-size: var(--text-xxxs); color: var(--grey-mid);
  text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: var(--space-2);
`;
const PlayerTag = styled.div`
  font-family: var(--font-mono); font-size: var(--text-xxxs);
  display: flex; justify-content: space-between; margin-bottom: 8px;
`;
const TagLeft = styled.span`color: var(--blue);`;
const TagRight = styled.span`color: var(--red);`;

// ── Compare Grid (butterfly bars) ───────────────

const MetricsTable = styled.table`
  width: 100%; border-collapse: collapse;
  font-family: var(--font-mono); font-size: var(--text-xxs);
  th { padding: 2px 8px 6px; text-align: left; font-weight: normal; font-size: 10px; }
  td { padding: 3px 8px; }
  tr + tr td { border-top: 1px solid rgba(255,255,255,0.04); }
`;
const MetricsHead = styled.thead``;
const MetricsTd = styled.td`
  color: ${p => p.$label ? 'var(--grey-light)' : '#fff'};
  font-size: ${p => p.$label ? '10px' : 'var(--text-xxs)'};
  opacity: ${p => p.$label ? 0.7 : 1};
`;
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
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xxxs)", color: "var(--grey-mid)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4, textAlign: "center" }}>
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
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xxxs)", color: "var(--grey-mid)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4, textAlign: "center" }}>
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
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xxxs)", color: "#4fc3f7" }}>{nameA}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 12, height: 12, borderRadius: 2, background: "#ef5350", opacity: 0.7 }} />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xxxs)", color: "#ef5350" }}>{nameB}</span>
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
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xxxs)", color: "#4fc3f7" }}>{nameA}</span>
          </div>
        )}
        {sigB && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: 2, background: "#ef5350", opacity: 0.7 }} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xxxs)", color: "#ef5350" }}>{nameB}</span>
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

  const qBurst = qApm[0] > 0 ? +(qApm[2] / qApm[0]).toFixed(2) : null;
  const mBurst = mApm[0] > 0 ? +(mApm[2] / mApm[0]).toFixed(2) : null;
  const qAcounts = fpDataA.actionCounts;
  const mAcounts = fpDataB.actionCounts;

  return (
    <ComparePanel>
      {/* Key Metrics */}
      <CompareSection>
        <MetricsTable>
          <MetricsHead>
            <th />
            <th style={{ color: "#4fc3f7" }}>{nameA}</th>
            <th style={{ color: "#ef5350" }}>{nameB}</th>
          </MetricsHead>
          <tbody>
            <tr>
              <MetricsTd $label>APM</MetricsTd>
              <MetricsTd>{qMeanApm || '—'}</MetricsTd>
              <MetricsTd>{mMeanApm || '—'}</MetricsTd>
            </tr>
            <tr>
              <MetricsTd $label>Burst ratio</MetricsTd>
              <MetricsTd>{qBurst ?? '—'}</MetricsTd>
              <MetricsTd>{mBurst ?? '—'}</MetricsTd>
            </tr>
            {(qAcounts || mAcounts) && (
              <tr>
                <MetricsTd $label>Rebind %</MetricsTd>
                <MetricsTd>{qAcounts?.reassignRatio ?? '—'}%</MetricsTd>
                <MetricsTd>{mAcounts?.reassignRatio ?? '—'}%</MetricsTd>
              </tr>
            )}
            {(qAcounts || mAcounts) && (
              <tr>
                <MetricsTd $label>Tab/min</MetricsTd>
                <MetricsTd>{qAcounts?.tabPerMin ?? '—'}</MetricsTd>
                <MetricsTd>{mAcounts?.tabPerMin ?? '—'}</MetricsTd>
              </tr>
            )}
            {(qAcounts?.attackMovePerMin > 0 || mAcounts?.attackMovePerMin > 0) && (
              <tr>
                <MetricsTd $label>A-move/min</MetricsTd>
                <MetricsTd>{qAcounts?.attackMovePerMin ?? '—'}</MetricsTd>
                <MetricsTd>{mAcounts?.attackMovePerMin ?? '—'}</MetricsTd>
              </tr>
            )}
          </tbody>
        </MetricsTable>
      </CompareSection>

      {/* Player Signature */}
      <CompareSection>
        <CompareSectionTitle>Player Signature</CompareSectionTitle>
        <SignatureRadar sigA={sigA} sigB={sigB} nameA={nameA} nameB={nameB} />
      </CompareSection>

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

      {/* APM Profile */}
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

      {/* Hotkey Fingerprint */}
      <CompareSection>
        <CompareSectionTitle>Hotkey Fingerprint</CompareSectionTitle>
        <HotkeyRadar
          selectA={qSelect} selectB={mSelect}
          assignA={qAssign} assignB={mAssign}
          nameA={nameA} nameB={nameB}
        />
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

      {/* Hotkey Switching Patterns */}
      {hasDeep && (transA.length > 0 || transB.length > 0) && (
        <CompareSection>
          <CompareSectionTitle>Hotkey Switching Patterns</CompareSectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xxxs)", color: "#4fc3f7", marginBottom: 4 }}>{nameA}</div>
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
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xxxs)", color: "#ef5350", marginBottom: 4 }}>{nameB}</div>
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

  // "Add player" search — injects a manual candidate into the grid
  const [addQuery, setAddQuery] = useState("");
  const [addResults, setAddResults] = useState([]);
  const [addShowDropdown, setAddShowDropdown] = useState(false);
  const [addIsSearching, setAddIsSearching] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const addRef = useRef(null);
  const [manualCandidates, setManualCandidates] = useState(new Map()); // tag → candidate shape

  const [selectedTag, setSelectedTag] = useState(null);
  const [playstyleData, setPlaystyleData] = useState(null);
  const [identifyError, setIdentifyError] = useState(null); // 'not_indexed' | 'server_error'
  const [loading, setLoading] = useState(false);
  const [matchProfiles, setMatchProfiles] = useState({});
  const [candidateOrder, setCandidateOrder] = useState([]);
  const [removedTags, setRemovedTags] = useState(new Set());
  const dragTagRef = useRef(null);
  const [playerRaceFilters, setPlayerRaceFilters] = useState(new Map()); // tag → race | null (per-player)
  const [playerDateFilters, setPlayerDateFilters] = useState(new Map()); // tag → afterDate
  const [showResults, setShowResults] = useState(false);
  const [resultsTab, setResultsTab] = useState('replays'); // 'replays' | 'fingerprint'
  const [refetchingTags, setRefetchingTags] = useState(new Set()); // tags currently re-fetching
  const [importingTags, setImportingTags] = useState(new Set()); // tags being imported
  const [importMessages, setImportMessages] = useState(new Map()); // tag → result message
  const [playerReplayLists, setPlayerReplayLists] = useState(new Map()); // tag → replay[]
  const [playerReplaySelections, setPlayerReplaySelections] = useState(new Map()); // tag → Set<replayId> | null
  const [openReplayPicker, setOpenReplayPicker] = useState(null); // tag with picker open
  const [expandedCards, setExpandedCards] = useState(new Set()); // tags with controls visible (setup phase)
  const [openResultsFilter, setOpenResultsFilter] = useState(null); // tag with filter panel open (results phase)
  const playerReplaySelectionsRef = useRef(new Map());
  const playerRaceFiltersRef = useRef(new Map());
  const playerDateFiltersRef = useRef(new Map());
  const selectedTagRef = useRef(null);
  const manualCandidatesRef = useRef(new Map());
  const fetchedReplayListTagsRef = useRef(new Set()); // prevent duplicate fetches
  const [countryMates, setCountryMates] = useState([]);
  const [newAccounts, setNewAccounts] = useState([]);
  const [countryMatesLoading, setCountryMatesLoading] = useState(false);
  const countryMatesFetchedRef = useRef(null);

  const removeCandidate = (tag) => {
    setRemovedTags(prev => new Set([...prev, tag]));
    setCandidateOrder(prev => prev.filter(t => t !== tag));
  };

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
      const results = await searchLadderWithFallback(query);
      const deduped = [];
      const seen = new Set();
      for (const r of Array.isArray(results) ? results : []) {
        const tag = r.player?.playerIds?.[0]?.battleTag || r.player1Id;
        if (!tag || seen.has(tag)) continue;
        seen.add(tag);
        deduped.push(r);
      }
      deduped.sort((a, b) => ((b.player?.wins || 0) + (b.player?.losses || 0)) - ((a.player?.wins || 0) + (a.player?.losses || 0)));
      setSearchResults(deduped.slice(0, 15));
      setShowDropdown(true);
      setIsSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (addQuery.length < 2) { setAddResults([]); setAddShowDropdown(false); return; }
    setAddIsSearching(true);
    const timer = setTimeout(async () => {
      const results = await searchLadderWithFallback(addQuery);
      const deduped = [];
      const seen = new Set();
      for (const r of Array.isArray(results) ? results : []) {
        const tag = r.player?.playerIds?.[0]?.battleTag || r.player1Id;
        if (!tag || seen.has(tag)) continue;
        seen.add(tag);
        deduped.push(r);
      }
      deduped.sort((a, b) => ((b.player?.wins || 0) + (b.player?.losses || 0)) - ((a.player?.wins || 0) + (a.player?.losses || 0)));
      setAddResults(deduped.slice(0, 15));
      setAddShowDropdown(true);
      setAddIsSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [addQuery]);

  // Keep refs in sync so fetch callbacks can read current values without closure staleness
  useEffect(() => { playerRaceFiltersRef.current = playerRaceFilters; }, [playerRaceFilters]);
  useEffect(() => { playerDateFiltersRef.current = playerDateFilters; }, [playerDateFilters]);
  useEffect(() => { playerReplaySelectionsRef.current = playerReplaySelections; }, [playerReplaySelections]);
  useEffect(() => { selectedTagRef.current = selectedTag; }, [selectedTag]);
  useEffect(() => { manualCandidatesRef.current = manualCandidates; }, [manualCandidates]);

  const markRefetching = useCallback((tags) => {
    setRefetchingTags(prev => { const s = new Set(prev); tags.forEach(t => s.add(t)); return s; });
  }, []);
  const unmarkRefetching = useCallback((tag) => {
    setRefetchingTags(prev => { const s = new Set(prev); s.delete(tag); return s; });
  }, []);

  // Auto-fetch replay lists for the query player + all suggested candidates when playstyleData loads
  useEffect(() => {
    if (!playstyleData || !selectedTag) return;
    const tags = [selectedTag, ...playstyleData.similar.slice(0, 5).map(s => s.battleTag)];
    for (const tag of tags) {
      if (fetchedReplayListTagsRef.current.has(tag)) continue;
      fetchedReplayListTagsRef.current.add(tag);
      fetch(`${RELAY_URL}/api/fingerprints/profile/${encodeURIComponent(tag)}/replays`)
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d?.replays) setPlayerReplayLists(prev => new Map([...prev, [tag, d.replays]])); })
        .catch(() => {});
    }
  }, [playstyleData, selectedTag, RELAY_URL]);

  // Discover candidates: ladder (for MMR) + recent finished games (for unranked/new accounts)
  useEffect(() => {
    const qMmr = playstyleData?.query?.mmr;
    if (!selectedTag || !qMmr) return;
    if (countryMatesFetchedRef.current === selectedTag) return;
    countryMatesFetchedRef.current = selectedTag;
    setCountryMatesLoading(true);
    const W3C = 'https://website-backend.w3champions.com/api';
    const fiveDaysAgo = Date.now() - 5 * 24 * 60 * 60 * 1000;
    (async () => {
      try {
        // 1. Current + previous season ladders → veteran players (not new accounts)
        // W3C uses league IDs 0-16 (divisions across all tiers). Fetch both seasons in parallel
        // so veterans who haven't played the new season yet aren't mistaken for new accounts.
        const leagueIds = Array.from({ length: 20 }, (_, i) => i); // 0-19, empty leagues return []
        const [curPages, prevPages] = await Promise.all([
          Promise.all(leagueIds.map(id => getLadder(id))),
          Promise.all(leagueIds.map(id => getLadder(id, 24))),
        ]);
        const ladderByTag = new Map();
        for (const rank of [...curPages.flat(), ...prevPages.flat()]) {
          const tag = rank.playersInfo?.[0]?.battleTag;
          if (tag) ladderByTag.set(tag, rank.player?.mmr ?? null);
        }

        // 2. Recent finished games (last 5 days) → everyone who played, ranked or not
        const tagAppearances = new Map();
        for (let page = 0; page < 10; page++) {
          let hitOld = false;
          try {
            const res = await fetch(`${W3C}/matches?gameMode=4&gateway=20&pageSize=50&offset=${page * 50}`);
            if (!res.ok) break;
            const data = await res.json();
            const items = data.matches || [];
            if (!items.length) break;
            for (const m of items) {
              const t = new Date(m.endTime || m.startTime || 0).getTime();
              if (t < fiveDaysAgo) { hitOld = true; break; }
              for (const team of m.teams || []) {
                for (const p of team.players || []) {
                  if (p.battleTag) tagAppearances.set(p.battleTag, (tagAppearances.get(p.battleTag) || 0) + 1);
                }
              }
            }
          } catch { break; }
          if (hitOld) break;
        }

        // 3. Batch-enrich profiles for all unique tags (include query player for their country)
        // Also include similar players — they may be off-ladder but still share country
        const similarTags = playstyleData?.similar?.map(s => s.battleTag) || [];
        const allTags = [...new Set([selectedTag, ...similarTags, ...ladderByTag.keys(), ...tagAppearances.keys()])];
        const profileMap = await getPlayerProfilesBatch(allTags);
        setMatchProfiles(prev => { const next = { ...prev }; for (const [t, p] of profileMap) next[t] = p; return next; });

        const qCountry = profileMap.get(selectedTag)?.country;

        // 4. Same-country: ladder + recent games, ranked first then by MMR distance
        if (qCountry) {
          const matches = [];
          for (const tag of allTags) {
            if (tag === selectedTag) continue;
            const profile = profileMap.get(tag);
            if (profile?.country !== qCountry) continue;
            const mmr = ladderByTag.get(tag) ?? null;
            matches.push({ battleTag: tag, mmr, mmrDist: mmr != null ? Math.abs(mmr - qMmr) : Infinity, isRanked: ladderByTag.has(tag) });
          }
          matches.sort((a, b) => a.isRanked !== b.isRanked ? (a.isRanked ? -1 : 1) : a.mmrDist - b.mmrDist);
          setCountryMates(matches);
        }

        // 5. New / unranked: played in last 5 days but not on current ladder
        //    sorted ascending by appearance count (1 game ≈ brand new)
        const newUnranked = [...tagAppearances.entries()]
          .filter(([tag]) => tag !== selectedTag && !ladderByTag.has(tag))
          .sort(([, a], [, b]) => a - b)
          .map(([tag, recentGames]) => ({ battleTag: tag, recentGames, country: profileMap.get(tag)?.country ?? null }));
        setNewAccounts(newUnranked);

      } catch (e) {
        console.error('candidate discovery failed', e);
      } finally {
        setCountryMatesLoading(false);
      }
    })();
  }, [selectedTag, playstyleData]);

  // Shared refetch for a single player using current filter state from refs
  const refetchPlayer = useCallback((tag) => {
    const race = playerRaceFiltersRef.current.get(tag) || null;
    const after = playerDateFiltersRef.current.get(tag) || null;
    const replayIds = playerReplaySelectionsRef.current.get(tag);
    const ids = replayIds ? [...replayIds] : null;
    const p = new URLSearchParams();
    if (race) p.set('race', race);
    if (after) p.set('after', after);
    if (ids?.length) p.set('replayIds', ids.join(','));
    const qs = p.toString() ? `?${p}` : '';
    const isQuery = tag === selectedTagRef.current;
    markRefetching([tag]);
    fetch(`${RELAY_URL}/api/fingerprints/identify/${encodeURIComponent(tag)}${qs}`, { headers: { 'X-API-Key': apiKey } })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        unmarkRefetching(tag);
        if (!data) return;
        if (isQuery) {
          if (data.verdict === 'insufficient_data') {
            setPlaystyleData(prev => prev ? { ...prev, query: { ...prev.query, replayCount: data.replayCount ?? 0, totalReplayCount: data.totalReplayCount ?? prev.query?.totalReplayCount } } : prev);
          } else {
            setPlaystyleData(data);
          }
        } else {
          const prev = manualCandidatesRef.current.get(tag) || {};
          const replayCount = data.verdict === 'insufficient_data' ? (data.replayCount ?? 0) : (data.query?.replayCount ?? prev.replayCount);
          const q = data.query || {};
          setManualCandidates(m => new Map([...m, [tag, { ...prev, apm: q.apm ?? prev.apm, race: q.race ?? prev.race, replayCount, glyph: data.verdict === 'insufficient_data' ? { transitionPairs: [], groupUsage: [], groupCompositions: {} } : (q.glyph || prev.glyph), seasonActivity: q.seasonActivity ?? prev.seasonActivity }]]));
        }
      })
      .catch(() => unmarkRefetching(tag));
  }, [RELAY_URL, apiKey, markRefetching, unmarkRefetching]);

  // Per-player race filter
  const setPlayerRace = useCallback((tag, race) => {
    setPlayerRaceFilters(prev => {
      const next = new Map(prev);
      if (!race) next.delete(tag); else next.set(tag, race);
      return next;
    });
    // Trigger refetch after state update; use setTimeout so ref is current
    setTimeout(() => refetchPlayer(tag), 0);
  }, [refetchPlayer]);

  // Per-player date filter
  const setPlayerDate = useCallback((tag, afterDate) => {
    setPlayerDateFilters(prev => {
      const next = new Map(prev);
      if (afterDate === null) next.delete(tag); else next.set(tag, afterDate);
      return next;
    });
    setTimeout(() => refetchPlayer(tag), 0);
  }, [refetchPlayer]);

  // Import replays for a player on demand
  const importReplays = useCallback(async (tag) => {
    setImportingTags(prev => { const s = new Set(prev); s.add(tag); return s; });
    setImportMessages(prev => { const m = new Map(prev); m.delete(tag); return m; });
    try {
      const res = await fetch(`${RELAY_URL}/api/fingerprints/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ battleTag: tag }),
      });
      const result = res.ok ? await res.json() : null;
      if (result) {
        let msg;
        if (result.rateLimited) msg = result.queued ? 'Rate limited — queued for next available slot' : (result.discovered > 0 ? 'Replays found on W3C — rate limited, retry in ~1h' : 'Rate limited — retry in ~1h');
        else if (result.imported > 0) msg = null; // success, no message needed
        else if (result.discovered === 0) msg = 'No matches found on W3C';
        else if (result.noReplay >= result.discovered - result.alreadyImported) msg = 'No replays stored on W3C';
        else msg = 'Nothing new to import';
        if (msg) setImportMessages(prev => new Map([...prev, [tag, msg]]));
      }
      refetchPlayer(tag);
    } catch { /* silent */ }
    setImportingTags(prev => { const s = new Set(prev); s.delete(tag); return s; });
  }, [RELAY_URL, refetchPlayer]);

  // Set specific replay IDs for a player and refetch
  const setPlayerReplaySelection = useCallback((tag, replayIds) => {
    const ids = replayIds ? [...replayIds] : null;
    const newSet = ids?.length ? new Set(ids) : null;
    // Update ref immediately so refetchPlayer reads the new value (not after useEffect delay)
    const newMap = new Map(playerReplaySelectionsRef.current);
    if (!newSet) newMap.delete(tag); else newMap.set(tag, newSet);
    playerReplaySelectionsRef.current = newMap;
    setPlayerReplaySelections(newMap);
    refetchPlayer(tag);
  }, [refetchPlayer]);

  // Capture URL candidates before mount so we can restore after query loads
  const urlCandidatesPending = useRef(new URLSearchParams(location.search).getAll("c"));

  // Sync URL → auto-search on mount / back-nav
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const qTag = params.get("q");
    if (qTag && qTag !== selectedTag) selectPlayer(qTag);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Restore URL candidates once query player data loads (runs once, clears ref after)
  useEffect(() => {
    if (!playstyleData || !urlCandidatesPending.current.length) return;
    const tags = [...urlCandidatesPending.current];
    urlCandidatesPending.current = [];
    tags.forEach(tag => addPlayerToList(tag));
  }, [playstyleData]); // eslint-disable-line react-hooks/exhaustive-deps

  // Write manual candidates back to URL whenever they change
  useEffect(() => {
    if (!selectedTag) return;
    const activeCandidates = [...manualCandidates.keys()].filter(t => !removedTags.has(t));
    const params = new URLSearchParams();
    params.set("tab", "identify");
    params.set("q", selectedTag);
    activeCandidates.forEach(t => params.append("c", t));
    history.replace({ search: `?${params}` });
  }, [manualCandidates, removedTags, selectedTag, history]);

  const selectPlayer = useCallback(async (battleTag) => {
    history.replace({ search: `?tab=identify&q=${encodeURIComponent(battleTag)}` });
    setQuery(""); setSearchResults([]); setShowDropdown(false); setIsSearching(false);
    setSelectedTag(battleTag); setPlaystyleData(null); setIdentifyError(null); setLoading(true);
    setCandidateOrder([]); setRemovedTags(new Set()); setManualCandidates(new Map());
    setPlayerReplayLists(new Map()); setPlayerReplaySelections(new Map()); setOpenReplayPicker(null);
    setShowResults(false); setPlayerRaceFilters(new Map()); setPlayerDateFilters(new Map()); setExpandedCards(new Set()); setOpenResultsFilter(null);
    setCountryMates([]); setNewAccounts([]); setCountryMatesLoading(false); countryMatesFetchedRef.current = null;
    fetchedReplayListTagsRef.current = new Set();
    fetch(`${RELAY_URL}/api/fingerprints/profile/${encodeURIComponent(battleTag)}/replays`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.replays) setPlayerReplayLists(prev => new Map([...prev, [battleTag, d.replays]])); })
      .catch(() => {});

    const qs = ''; // new player always loads with no filters
    try {
      const identifyRes = await fetch(`${RELAY_URL}/api/fingerprints/identify/${encodeURIComponent(battleTag)}${qs}`, { headers: { "X-API-Key": apiKey } });
      if (identifyRes.ok) {
        const data = await identifyRes.json();
        setPlaystyleData(data);
        setCandidateOrder([]);
        const tags = (data.similar || []).map(s => s.battleTag).filter(Boolean);
        if (tags.length > 0) {
          getPlayerProfilesBatch([battleTag, ...tags]).then(profileMap => {
            const obj = {};
            for (const [tag, profile] of profileMap) obj[tag] = profile;
            setMatchProfiles(obj);
          });
        }
      } else if (identifyRes.status === 401) {
        window.dispatchEvent(new Event(ADMIN_KEY_401_EVENT));
        setIdentifyError('auth_401');
      } else if (identifyRes.status === 404) {
        setIdentifyError('not_indexed');
      } else {
        setIdentifyError(`server_error:${identifyRes.status}`);
      }
    } catch (err) { console.error("Playstyle fetch failed:", err); }
    setLoading(false);
  }, [apiKey, RELAY_URL, history]);

  const addPlayerToList = useCallback(async (battleTag, ladderMmr, ladderRace) => {
    setAddQuery(""); setAddResults([]); setAddShowDropdown(false); setAddIsSearching(false);
    if (!battleTag) return;
    setAddLoading(true);
    try {
      const ap = new URLSearchParams(); // candidates also load unfiltered initially
      const qs = ap.toString() ? `?${ap}` : '';
      const res = await fetch(`${RELAY_URL}/api/fingerprints/identify/${encodeURIComponent(battleTag)}${qs}`, { headers: { "X-API-Key": apiKey } });
      if (res.ok) {
        const data = await res.json();
        const q = data.query || {};
        const candidate = {
          battleTag,
          playerName: battleTag.split("#")[0],
          score: null, percentile: null,
          apm: q.apm ?? null,
          mmr: q.mmr ?? ladderMmr ?? null,
          race: q.race ?? ladderRace ?? null,
          replayCount: q.replayCount || 0,
          lastSeen: q.lastSeen || null,
          glyph: q.glyph || { transitionPairs: [], groupUsage: [], groupCompositions: {} },
          seasonActivity: q.seasonActivity || [],
          isManual: true,
        };
        setManualCandidates(prev => new Map([...prev, [battleTag, candidate]]));
        setCandidateOrder(prev => prev.includes(battleTag) ? prev : [...prev, battleTag]);
        getPlayerProfilesBatch([battleTag]).then(profileMap => {
          setMatchProfiles(prev => {
            const obj = { ...prev };
            for (const [tag, profile] of profileMap) obj[tag] = profile;
            return obj;
          });
        });
        fetch(`${RELAY_URL}/api/fingerprints/profile/${encodeURIComponent(battleTag)}/replays`)
          .then(r => r.ok ? r.json() : null)
          .then(d => { if (d?.replays) setPlayerReplayLists(prev => new Map([...prev, [battleTag, d.replays]])); })
          .catch(() => {});
      } else if (res.status === 404) {
        // Not indexed yet — add with empty fingerprint so they appear in the comparison
        const candidate = {
          battleTag,
          playerName: battleTag.split("#")[0],
          score: null, percentile: null,
          apm: null,
          mmr: ladderMmr ?? null,
          race: ladderRace ?? null,
          replayCount: 0,
          lastSeen: null,
          glyph: { transitionPairs: [], groupUsage: [], groupCompositions: {} },
          seasonActivity: [],
          isManual: true,
        };
        setManualCandidates(prev => new Map([...prev, [battleTag, candidate]]));
        setCandidateOrder(prev => prev.includes(battleTag) ? prev : [...prev, battleTag]);
        getPlayerProfilesBatch([battleTag]).then(profileMap => {
          setMatchProfiles(prev => {
            const obj = { ...prev };
            for (const [tag, profile] of profileMap) obj[tag] = profile;
            return obj;
          });
        });
      }
    } catch (err) { console.error("Add player failed:", err); }
    setAddLoading(false);
  }, [RELAY_URL, apiKey]);


  const dismiss = useCallback(() => {
    const params = new URLSearchParams(location.search);
    params.delete("q");
    history.replace({ search: params.toString() ? `?${params}` : "" });
    setSelectedTag(null); setPlaystyleData(null); setMatchProfiles({});
    setManualCandidates(new Map()); setCountryMates([]); setNewAccounts([]); setCountryMatesLoading(false);
    countryMatesFetchedRef.current = null;
  }, [history, location.search]);

  const queryGames = playstyleData?.query?.replayCount || 0;
  const queryName = selectedTag ? selectedTag.split("#")[0] : "";

  // Reusable search dropdown renderer; passLadder=true forwards mmr/race to onSelect
  const renderSearchDropdown = (results, onSelect, passLadder = false) => results.length > 0 && (
    <div className="navbar-search-dropdown">
      {results.map((r) => {
        const p = r.player || {};
        const tag = p.playerIds?.[0]?.battleTag || r.player1Id || "";
        const mmr = p.mmr;
        const wins = p.wins || 0;
        const losses = p.losses || 0;
        const [name, hashNum] = (tag || "").split("#");
        const raceIcon = RACE_ICON_MAP[p.race];
        return (
          <button key={tag} className="navbar-search-result" onClick={() => passLadder ? onSelect(tag, mmr, p.race) : onSelect(tag)}>
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
  );

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
          {showDropdown && renderSearchDropdown(searchResults, selectPlayer)}
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
          {identifyError === 'auth_401' && (
            <NoDataText>
              Admin key invalid or expired —{" "}
              <Link to="/admin" style={{ color: "var(--gold)", fontFamily: "var(--font-display)" }}>update it in the Admin panel</Link>.
            </NoDataText>
          )}
          {identifyError === 'not_indexed' && (
            <NoDataText>
              <span style={{ color: "var(--gold)", fontFamily: "var(--font-display)" }}>{queryName}</span> isn't in the index yet.{" "}
              {importingTags.has(selectedTag) ? (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xxxs)', color: 'var(--grey-light)' }}>
                  <PeonLoader size="sm" /> importing…
                </span>
              ) : (
                <button
                  onClick={async () => {
                    setImportingTags(prev => { const s = new Set(prev); s.add(selectedTag); return s; });
                    try {
                      await fetch(`${RELAY_URL}/api/fingerprints/import`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
                        body: JSON.stringify({ battleTag: selectedTag }),
                      });
                      await selectPlayer(selectedTag);
                    } catch { /* silent */ }
                    setImportingTags(prev => { const s = new Set(prev); s.delete(selectedTag); return s; });
                  }}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--gold)', fontFamily: 'var(--font-display)', fontSize: 'inherit', textDecoration: 'underline' }}
                >
                  Import replays
                </button>
              )}
            </NoDataText>
          )}
          {identifyError?.startsWith('server_error') && (
            <NoDataText>
              Error loading <span style={{ color: "var(--gold)", fontFamily: "var(--font-display)" }}>{queryName}</span>
              {identifyError.includes(':') && <span style={{ color: 'var(--grey-light)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xxs)', marginLeft: 6 }}>({identifyError.split(':')[1]})</span>}.{" "}
              <BackLink as="button" onClick={() => selectPlayer(selectedTag)} style={{ display: "inline", fontSize: "inherit" }}>Retry</BackLink>
            </NoDataText>
          )}
          {!identifyError && queryGames === 0 && (
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

                    const rawByTag = new Map([
                      ...playstyleData.similar.slice(0, 5).map(s => [s.battleTag, s]),
                      ...manualCandidates,
                    ]);
                    const candidates = candidateOrder
                      .filter(tag => !removedTags.has(tag) && rawByTag.has(tag))
                      .map(tag => rawByTag.get(tag));
                    // Grid always has the same number of columns regardless of removals
                    const numCols = 1 + candidateOrder.filter(t => rawByTag.has(t)).length;
                    // Renders one grid cell per candidateOrder slot; empty div for removed tags
                    const renderCandidateCells = (fn) => candidateOrder
                      .filter(t => rawByTag.has(t))
                      .map(tag => removedTags.has(tag)
                        ? <div key={tag} />
                        : fn(rawByTag.get(tag))
                      );

                    const renderAvatar = (avatarUrl, raceIcon, size = 44) => (
                      <span style={{ position: "relative", flexShrink: 0, display: 'inline-block', width: size, height: size }}>
                        {avatarUrl
                          ? <img src={avatarUrl} alt="" style={{ width: size, height: size, borderRadius: "var(--radius-sm)", objectFit: 'cover', display: 'block' }} />
                          : raceIcon
                            ? <img src={raceIcon} alt="" style={{ width: size, height: size, borderRadius: "var(--radius-sm)", objectFit: 'cover', display: 'block', padding: size > 36 ? 8 : 4, background: 'rgba(255,255,255,0.06)', opacity: 0.85, boxSizing: 'border-box' }} />
                            : <span style={{ display: 'block', width: size, height: size, borderRadius: "var(--radius-sm)", background: 'rgba(255,255,255,0.06)' }} />}
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
                          : <span key={u.id} title={u.name} style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xxxs)", color: isBuilding ? "var(--amber)" : "var(--grey-light)", padding: "0 2px" }}>{u.name}</span>;
                      });
                    };

                    const fmtDuration = (s) => {
                      if (!s) return '';
                      const m = Math.floor(s / 60), sec = s % 60;
                      return `${m}:${String(sec).padStart(2, '0')}`;
                    };
                    const fmtReplayDate = (r) => {
                      const raw = r.matchDate || r.uploadedAt;
                      if (!raw) return '—';
                      const d = new Date(raw);
                      const diffDays = Math.floor((Date.now() - d.getTime()) / 86400000);
                      if (diffDays === 0) return 'today';
                      if (diffDays === 1) return 'yesterday';
                      if (diffDays < 14) return `${diffDays}d ago`;
                      return d.toLocaleDateString('en', { month: 'short', day: 'numeric', year: diffDays > 365 ? 'numeric' : undefined });
                    };

                    const parseMapName = (rawName) => {
                      if (!rawName) return null;
                      // W3C lobby format: {num}_w3c_{date}_{time}_{MapName}[_{version}]
                      const w3c = rawName.match(/^\d+_w3c_\d+_\d+_(.+?)(?:_v[\d.]+)?$/i);
                      if (w3c) return w3c[1].replace(/_/g, ' ');
                      // Standard: strip (4) prefix, extension, lobby noise
                      return rawName.replace(/^\(4\)\s*/, '').replace(/\.w3x$/i, '').replace(/^4v4[_\s].*/i, '').trim() || null;
                    };
                    const getMapThumb = (rawName) => {
                      const name = parseMapName(rawName);
                      if (!name) return null;
                      // Strip spaces, apostrophes, minor version decimals (v2.1 → v2)
                      const file = name.replace(/\s/g, '').replace(/'/g, '').replace(/\.\d+$/, '');
                      return `/maps/${file}.png`;
                    };
                    const getMapName = parseMapName;

                    const renderReplayPicker = (tag) => {
                      const allReplays = playerReplayLists.get(tag) || [];
                      const raceFilter = playerRaceFilters.get(tag) || null;
                      const dateFilter = playerDateFilters.get(tag) || null;
                      const replays = allReplays.filter(r => {
                        if (raceFilter && r.race !== raceFilter) return false;
                        if (dateFilter) {
                          const d = r.matchDate || r.uploadedAt;
                          if (!d || d < dateFilter) return false;
                        }
                        return true;
                      });
                      const selection = playerReplaySelections.get(tag);
                      const hasSelection = selection && selection.size > 0;
                      const allSelected = !hasSelection;
                      const toggleReplay = (rid) => {
                        const current = playerReplaySelectionsRef.current.get(tag) || new Set();
                        const next = new Set(current);
                        if (next.has(rid)) next.delete(rid); else next.add(rid);
                        setPlayerReplaySelection(tag, next.size === 0 ? null : [...next]);
                      };
                      return (
                        <div onClick={e => e.stopPropagation()} style={{ width: '100%', marginTop: 4 }}>
                          {/* All / selected count header */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, padding: '0 2px' }}>
                            <button
                              onClick={() => setPlayerReplaySelection(tag, null)}
                              style={{ padding: '3px 10px', background: allSelected ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.06)', border: allSelected ? '1px solid rgba(212,175,55,0.5)' : '1px solid rgba(255,255,255,0.12)', borderRadius: 3, cursor: 'pointer', color: allSelected ? 'var(--gold)' : 'var(--grey-light)', fontSize: 'var(--text-xxxs)', fontFamily: 'var(--font-mono)' }}
                            >
                              {replays.length < allReplays.length ? `${replays.length} / ${allReplays.length}` : `All (${replays.length})`}
                            </button>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              {hasSelection && (
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xxxs)', color: 'var(--gold)' }}>
                                  {selection.size} sel
                                </span>
                              )}
                              {/* Prev / Next step-through arrows */}
                              {(() => {
                                const currentIdx = hasSelection
                                  ? replays.findIndex(r => selection.has(r.replayId))
                                  : -1;
                                const step = (dir) => {
                                  const nextIdx = currentIdx === -1
                                    ? (dir > 0 ? 0 : replays.length - 1)
                                    : Math.max(0, Math.min(replays.length - 1, currentIdx + dir));
                                  setPlayerReplaySelection(tag, [replays[nextIdx].replayId]);
                                };
                                const navBtn = (label, dir, disabled) => (
                                  <button
                                    key={label}
                                    onClick={() => step(dir)}
                                    disabled={disabled}
                                    style={{ width: 22, height: 22, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 3, cursor: disabled ? 'default' : 'pointer', color: disabled ? 'rgba(255,255,255,0.2)' : 'var(--grey-light)', fontSize: 14, lineHeight: 1 }}
                                  >{label}</button>
                                );
                                return (
                                  <div style={{ display: 'flex', gap: 2 }}>
                                    {navBtn('‹', -1, currentIdx <= 0)}
                                    {navBtn('›', +1, currentIdx >= replays.length - 1)}
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                          {allReplays.length === 0 && (
                            <div style={{ padding: '12px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                              {importingTags.has(tag) ? (
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xxxs)', color: 'var(--grey-light)' }}>importing…</span>
                              ) : importMessages.has(tag) ? (
                                <>
                                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xxxs)', color: 'var(--grey-light)' }}>{importMessages.get(tag)}</span>
                                  {/* Only show retry if not already queued (queued message handles itself) */}
                                  {!importMessages.get(tag).includes('queued') && (
                                    <button onClick={() => importReplays(tag)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xxxs)', color: 'var(--grey-mid)', textDecoration: 'underline' }}>retry</button>
                                  )}
                                </>
                              ) : (
                                <button onClick={() => importReplays(tag)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-display)', fontSize: 'var(--text-xs)', color: 'var(--gold)' }}>↓ Import replays</button>
                              )}
                            </div>
                          )}
                          <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2, scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.15) transparent' }}>
                            {replays.map(r => {
                              const rid = r.replayId;
                              const checked = allSelected ? false : (selection?.has(rid) ?? false);
                              const ri = RACE_ICON_MAP[r.race];
                              const thumb = getMapThumb(r.mapName);
                              const mapName = getMapName(r.mapName);
                              return (
                                <label
                                  key={rid}
                                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', cursor: 'pointer', borderRadius: 'var(--radius-sm)', background: checked ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${checked ? 'rgba(212,175,55,0.35)' : 'rgba(255,255,255,0.06)'}`, transition: 'background 0.1s' }}
                                >
                                  <input type="checkbox" checked={checked} onChange={() => toggleReplay(rid)} style={{ accentColor: 'var(--gold)', width: 13, height: 13, flexShrink: 0 }} />
                                  {/* Map thumbnail */}
                                  {thumb ? (
                                    <img src={thumb} alt="" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 2, flexShrink: 0, opacity: 0.85 }} onError={e => { e.target.style.display = 'none'; }} />
                                  ) : (
                                    <div style={{ width: 36, height: 36, flexShrink: 0, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }} />
                                  )}
                                  {/* Map name + date */}
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xxs)', color: checked ? 'var(--gold)' : '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.2 }}>
                                      {mapName || '—'}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
                                      {ri && <img src={ri} alt="" style={{ width: 12, height: 12, flexShrink: 0 }} />}
                                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xxxs)', color: 'var(--grey-light)' }}>{fmtReplayDate(r)}</span>
                                    </div>
                                  </div>
                                  {/* Duration */}
                                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xxxs)', color: 'var(--grey-mid)', flexShrink: 0, minWidth: 32, textAlign: 'right' }}>{fmtDuration(r.gameDuration)}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    };

                    // Column header controls: time tabs + single-replay nav strip
                    const renderTHControls = (tag) => {
                      const replays = playerReplayLists.get(tag) || [];
                      const afterDate = playerDateFilters.get(tag) || null;
                      const sel = playerReplaySelections.get(tag);
                      const hasSel = sel && sel.size > 0;
                      const currentIdx = hasSel ? replays.findIndex(r => sel.has(r.replayId)) : -1;
                      const current = currentIdx >= 0 ? replays[currentIdx] : null;

                      // Selecting a date clears replay selection; selecting a replay clears date
                      const selectDate = (val) => {
                        setPlayerDate(tag, val);
                        if (hasSel) setPlayerReplaySelection(tag, null);
                      };
                      const step = (dir) => {
                        setPlayerDate(tag, null); // single replay mode clears date filter
                        const nextIdx = currentIdx === -1
                          ? (dir > 0 ? 0 : replays.length - 1)
                          : Math.max(0, Math.min(replays.length - 1, currentIdx + dir));
                        setPlayerReplaySelection(tag, [replays[nextIdx].replayId]);
                      };
                      const exitSingleMode = () => setPlayerReplaySelection(tag, null);

                      const tabStyle = (active) => ({
                        padding: '4px 9px', fontSize: 'var(--text-xxs)', fontFamily: 'var(--font-mono)',
                        background: active ? 'rgba(212,175,55,0.18)' : 'rgba(255,255,255,0.06)',
                        border: active ? '1px solid rgba(212,175,55,0.5)' : '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 3, cursor: 'pointer',
                        color: active ? 'var(--gold)' : 'rgba(255,255,255,0.55)',
                        opacity: hasSel ? 0.45 : 1,
                        transition: 'opacity 0.15s',
                      });
                      const arrowStyle = (disabled) => ({
                        width: 28, height: 28, padding: 0, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: 4, cursor: disabled ? 'default' : 'pointer',
                        color: disabled ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.7)',
                        fontSize: 16, lineHeight: 1,
                      });

                      const dateLabel = afterDate
                        ? DATE_FILTERS.find(d => d.value === afterDate)?.label
                        : null;
                      // When stepping through single replays, show position counter; otherwise show total
                      const centerLabel = hasSel && currentIdx >= 0
                        ? `${currentIdx + 1} / ${replays.length}`
                        : dateLabel
                          ? `${replays.length} · ${dateLabel}`
                          : `${replays.length || '—'}`;

                      return (
                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }} onClick={e => e.stopPropagation()}>
                          {/* Time tabs */}
                          <div style={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
                            {DATE_FILTERS.map(df => (
                              <button key={df.label} onClick={() => selectDate(df.value)} style={tabStyle(!hasSel && afterDate === df.value)}>
                                {df.label}
                              </button>
                            ))}
                          </div>
                          {/* Single-replay nav */}
                          {replays.length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <button style={arrowStyle(!hasSel || currentIdx <= 0)} onClick={() => step(-1)}>‹</button>
                              <button
                                onClick={hasSel ? exitSingleMode : () => step(+1)}
                                title={hasSel ? 'Back to all replays' : 'Step through replays one by one'}
                                style={{ flex: 1, padding: '4px 6px', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xxs)', background: hasSel ? 'rgba(212,175,55,0.12)' : 'rgba(255,255,255,0.04)', border: hasSel ? '1px solid rgba(212,175,55,0.4)' : '1px solid rgba(255,255,255,0.12)', borderRadius: 4, cursor: 'pointer', textAlign: 'center', color: hasSel ? 'var(--gold)' : 'var(--grey-mid)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                              >
                                {centerLabel}
                              </button>
                              <button style={arrowStyle(hasSel && currentIdx >= replays.length - 1)} onClick={() => step(+1)}>›</button>
                            </div>
                          )}
                        </div>
                      );
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

                    const RACE_FILTERS = [
                      { label: 'All', value: null },
                      { label: 'Orc', value: 'Orc', icon: raceIcons.orc },
                      { label: 'Human', value: 'Human', icon: raceIcons.human },
                      { label: 'NE', value: 'Night Elf', icon: raceIcons.elf },
                      { label: 'UD', value: 'Undead', icon: raceIcons.undead },
                    ];
                    const now = new Date();
                    const daysAgo = d => new Date(now - d * 864e5).toISOString().slice(0, 10);
                    const DATE_FILTERS = [
                      { label: 'All time', value: null },
                      { label: '1d', value: daysAgo(1) },
                      { label: '7d', value: daysAgo(7) },
                      { label: '30d', value: daysAgo(30) },
                    ];

                    // ── Shared per-player config card (used in setup phase) ──
                    const renderSetupCard = (tag, { isQuery = false, similarity = null, percentile = null, replayCount = 0, totalCount = null, race = null, isManual = false } = {}) => {
                      const profile = matchProfiles[tag];
                      const name = tag.split('#')[0];
                      const avatar = profile?.profilePicUrl;
                      const raceIcon = RACE_ICON_MAP[race];
                      const repCount = isQuery ? queryGames : replayCount;
                      const total = isQuery ? playstyleData.query?.totalReplayCount : totalCount;
                      const repColor = repCount >= 100 ? 'var(--green)' : repCount >= 20 ? 'var(--amber)' : 'var(--red)';
                      const included = !removedTags.has(tag);
                      const matchColor = percentile >= 99 ? 'var(--gold)' : percentile >= 95 ? 'var(--green)' : 'var(--grey-light)';
                      return (
                        <div key={tag} style={{ width: 200, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10, padding: '14px 16px', borderRadius: 'var(--radius-lg)', background: isQuery ? 'rgba(212,175,55,0.06)' : 'var(--surface-1)', border: isQuery ? '2px solid rgba(212,175,55,0.35)' : included ? '1px solid rgba(255,255,255,0.1)' : '1px solid var(--panel-border)', opacity: included ? 1 : 0.45 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {renderAvatar(avatar, raceIcon, 40)}
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <a href={`/player/${encodeURIComponent(tag)}`} target="_blank" rel="noreferrer" style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-sm)', color: 'var(--gold)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: 'none', display: 'block', transition: 'opacity 0.1s' }} onMouseEnter={e => e.target.style.opacity = '0.75'} onMouseLeave={e => e.target.style.opacity = '1'}>{name}</a>
                              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xxxs)', color: repColor, marginTop: 2 }}>
                                {repCount} reps{total && total !== repCount ? <span style={{ color: 'var(--grey-light)', opacity: 0.6 }}> / {total}</span> : ''}
                              </div>
                            </div>
                            {!isQuery && (
                              <button title={included ? 'Remove' : 'Add back'} onClick={() => included ? removeCandidate(tag) : (setRemovedTags(prev => { const s = new Set(prev); s.delete(tag); return s; }))} style={{ flexShrink: 0, width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid rgba(255,80,80,0.3)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: 'var(--text-xxs)', color: 'rgba(255,110,110,0.7)', transition: 'all 0.1s' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,60,60,0.15)'; e.currentTarget.style.color = '#f87171'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,110,110,0.7)'; }}>
                                ×
                              </button>
                            )}
                          </div>
                          {!isQuery && similarity != null && (
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xxs)', color: matchColor, borderTop: '1px solid var(--panel-border)', paddingTop: 8 }}>
                              <span style={{ fontSize: 'var(--text-xxs)', fontWeight: 600 }}>{Math.round(similarity * 100)}%</span>
                              <span style={{ color: 'var(--grey-light)', marginLeft: 4 }}>match</span>
                              {percentile != null && <span style={{ marginLeft: 6, color: matchColor, opacity: 0.8 }}>p{Math.round(percentile)}</span>}
                            </div>
                          )}
                          {isManual && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xxxs)', color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>manually added</div>}
                        </div>
                      );
                    };

                    // ── Discovery card: profile-style opt-in card ──
                    const renderDiscoveryCard = (entry) => {
                      const mName = entry.battleTag.split('#')[0];
                      const mProfile = matchProfiles[entry.battleTag];
                      const mRace = entry.race || mProfile?.race;
                      const mRaceIcon = RACE_ICON_MAP[mRace];
                      const mCountry = entry.country || mProfile?.country;
                      const mMmr = entry.mmr;
                      const isNew = (entry.recentGames != null) || (entry.replayCount != null && entry.replayCount < 20 && mMmr == null);
                      const alreadyIn = candidateOrder.includes(entry.battleTag);

                      const handleAdd = () => {
                        if (alreadyIn) return;
                        const optimistic = {
                          battleTag: entry.battleTag,
                          playerName: mName,
                          score: null, percentile: null,
                          apm: null,
                          mmr: mMmr ?? null,
                          race: mRace ?? null,
                          replayCount: 0,
                          lastSeen: null,
                          glyph: { transitionPairs: [], groupUsage: [], groupCompositions: {} },
                          seasonActivity: [],
                          isManual: true,
                        };
                        setManualCandidates(prev => new Map([...prev, [entry.battleTag, optimistic]]));
                        setCandidateOrder(prev => prev.includes(entry.battleTag) ? prev : [...prev, entry.battleTag]);
                        addPlayerToList(entry.battleTag, mMmr, mRace);
                      };

                      return (
                        <div key={entry.battleTag} style={{ width: 210, flexShrink: 0, padding: '14px', borderRadius: 'var(--radius-lg)', border: alreadyIn ? '1px solid rgba(100,200,100,0.3)' : '1px solid rgba(255,255,255,0.1)', background: alreadyIn ? 'rgba(100,200,100,0.04)' : 'var(--surface-1)', display: 'flex', flexDirection: 'column', gap: 12, transition: 'border-color 0.15s, background 0.15s' }}>
                          <div style={{ display: 'flex', gap: 12 }}>
                            {renderAvatar(mProfile?.profilePicUrl, mRaceIcon, 56)}
                            <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6 }}>
                              <a href={`/player/${encodeURIComponent(entry.battleTag)}`} target="_blank" rel="noreferrer" style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-sm)', color: 'var(--gold)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: 'none', display: 'block', lineHeight: 1.1, transition: 'opacity 0.1s' }} onMouseEnter={e => e.target.style.opacity = '0.75'} onMouseLeave={e => e.target.style.opacity = '1'}>{mName}</a>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                {mRaceIcon && <img src={mRaceIcon} alt="" style={{ width: 15, height: 15, opacity: 0.8, flexShrink: 0 }} />}
                                {mCountry && <CountryFlag name={mCountry.toLowerCase()} style={{ width: 16, height: 11, flexShrink: 0 }} />}
                                {isNew && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xxxs)', background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 2, padding: '1px 4px', color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>new</span>}
                              </div>
                              {mMmr != null
                                ? <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 700, color: '#fff', lineHeight: 1 }}>{mMmr} <span style={{ fontWeight: 400, fontSize: 10, color: 'var(--grey-light)' }}>MMR</span></div>
                                : entry.recentGames != null
                                  ? <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xxs)', color: 'var(--amber)' }}>{entry.recentGames}g played</div>
                                  : null
                              }
                            </div>
                          </div>
                          <button
                            disabled={alreadyIn}
                            onClick={handleAdd}
                            style={{ padding: '7px 0', background: alreadyIn ? 'rgba(100,200,100,0.1)' : 'rgba(212,175,55,0.08)', border: alreadyIn ? '1px solid rgba(100,200,100,0.3)' : '1px solid rgba(212,175,55,0.3)', borderRadius: 'var(--radius-sm)', cursor: alreadyIn ? 'default' : 'pointer', color: alreadyIn ? 'var(--green)' : 'var(--gold)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xxxs)', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'center', transition: 'all 0.1s' }}
                            onMouseEnter={e => { if (!alreadyIn) { e.currentTarget.style.background = 'rgba(212,175,55,0.2)'; e.currentTarget.style.borderColor = 'rgba(212,175,55,0.6)'; }}}
                            onMouseLeave={e => { if (!alreadyIn) { e.currentTarget.style.background = 'rgba(212,175,55,0.08)'; e.currentTarget.style.borderColor = 'rgba(212,175,55,0.3)'; }}}
                          >
                            {alreadyIn ? '✓ Added' : '+ Add'}
                          </button>
                        </div>
                      );
                    };

                    // ── SETUP PHASE (shown before running the comparison) ──
                    if (!showResults) {
                      // Players added via any "+ Add" button go into candidateOrder
                      const includedCount = candidateOrder.filter(t => !removedTags.has(t)).length;
                      // "Add manually" section only shows search-added players not already in discovery sections
                      const similarTags = new Set(playstyleData.similar.slice(0, 5).map(s => s.battleTag));
                      const discoveryTags = new Set([...countryMates.map(c => c.battleTag), ...newAccounts.map(n => n.battleTag)]);
                      const manualOnlyAdded = [...manualCandidates.values()].filter(s =>
                        !removedTags.has(s.battleTag) && !similarTags.has(s.battleTag) && !discoveryTags.has(s.battleTag)
                      );
                      // Section label — design system: --text-xxs, --font-mono, --grey-light, uppercase
                      const sectionLabel = (content, extra) => (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--panel-border)' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--grey-light)' }}>{content}</span>
                          {extra}
                        </div>
                      );
                      const getCountryName = (code) => {
                        try { return new Intl.DisplayNames(['en'], { type: 'region' }).of(code.toUpperCase()); }
                        catch { return code; }
                      };
                      return (
                        <div style={{ maxWidth: 960 }}>
                          {/* Section: Player of interest */}
                          {sectionLabel('Player of interest')}
                          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
                            <div style={{ width: 210, flexShrink: 0, padding: '14px', borderRadius: 'var(--radius-lg)', border: '2px solid rgba(212,175,55,0.4)', background: 'rgba(212,175,55,0.05)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                              <div style={{ display: 'flex', gap: 12 }}>
                                {renderAvatar(qAvatar, qRaceIcon, 56)}
                                <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6 }}>
                                  <a href={`/player/${encodeURIComponent(selectedTag)}`} target="_blank" rel="noreferrer" style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-sm)', color: 'var(--gold)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: 'none', display: 'block', lineHeight: 1.1, transition: 'opacity 0.1s' }} onMouseEnter={e => e.target.style.opacity = '0.75'} onMouseLeave={e => e.target.style.opacity = '1'}>{queryName}</a>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                    {qRaceIcon && <img src={qRaceIcon} alt="" style={{ width: 15, height: 15, opacity: 0.8, flexShrink: 0 }} />}
                                    {qCountry && <CountryFlag name={qCountry.toLowerCase()} style={{ width: 16, height: 11, flexShrink: 0 }} />}
                                  </div>
                                  {qMmr != null && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 700, color: '#fff', lineHeight: 1 }}>{Math.round(qMmr)} <span style={{ fontWeight: 400, fontSize: 10, color: 'var(--grey-light)' }}>MMR</span></div>}
                                </div>
                              </div>
                              <div style={{ padding: '7px 0', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 'var(--radius-sm)', color: 'rgba(212,175,55,0.5)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xxxs)', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'center' }}>
                                Query player
                              </div>
                            </div>
                          </div>

                          {/* Section: Top 5 similar */}
                          {sectionLabel('Top 5 similar')}
                          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
                            {playstyleData.similar.slice(0, 5).map(s => renderDiscoveryCard({ battleTag: s.battleTag, mmr: s.mmr, similarity: s.similarity, percentile: s.percentile, recentGames: null, country: null, race: s.race }))}
                          </div>

                          {/* Section: Same country */}
                          {sectionLabel(
                            qCountry
                              ? <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <CountryFlag name={qCountry.toLowerCase()} style={{ width: 18, height: 13, verticalAlign: 'middle', borderRadius: 2 }} />
                                  <span>Same country · {getCountryName(qCountry)}</span>
                                </span>
                              : 'Same country'
                          )}
                          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 28, minHeight: 20 }}>
                            {countryMatesLoading
                              ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
                              : qCountry && countryMates.length === 0
                                ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xxxs)', color: 'var(--grey-mid)', alignSelf: 'center' }}>No players from {getCountryName(qCountry)} found</span>
                                : countryMates.slice(0, 6).map(renderDiscoveryCard)
                            }
                          </div>

                          {/* Section: New accounts (unranked, played in last 5 days) */}
                          {sectionLabel('New accounts · last 5 days')}
                          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 28, minHeight: 20 }}>
                            {countryMatesLoading
                              ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
                              : newAccounts.length === 0
                                ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xxxs)', color: 'var(--grey-mid)', alignSelf: 'center' }}>No new unranked accounts found</span>
                                : newAccounts.slice(0, 10).map(renderDiscoveryCard)
                            }
                          </div>

                          {/* Section: Manually added + add search */}
                          {sectionLabel('Add manually')}
                          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
                            {manualOnlyAdded.map(s => renderDiscoveryCard(s))}
                            <div style={{ width: 200, flexShrink: 0, padding: 14, borderRadius: 'var(--radius-lg)', border: '1px dashed rgba(255,255,255,0.12)', display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
                              <div style={{ position: 'relative', width: '100%' }}>
                                <SearchInputWrap>
                                  <Input value={addQuery} onChange={e => setAddQuery(e.target.value)} onKeyDown={e => e.key === 'Escape' && (setAddQuery(''), setAddShowDropdown(false))} onFocus={() => addResults.length > 0 && setAddShowDropdown(true)} onBlur={() => setTimeout(() => setAddShowDropdown(false), 200)} placeholder="Search player…" style={{ fontSize: 'var(--text-xxs)', padding: '5px 8px' }} />
                                </SearchInputWrap>
                                {addLoading && <PeonLoader size="sm" />}
                                {addShowDropdown && renderSearchDropdown(addResults, addPlayerToList, true)}
                              </div>
                            </div>
                          </div>

                          {/* Compare button */}
                          <button
                            onClick={() => setShowResults(true)}
                            disabled={includedCount === 0}
                            style={{ padding: '10px 28px', background: includedCount > 0 ? 'rgba(212,175,55,0.18)' : 'rgba(255,255,255,0.04)', border: includedCount > 0 ? '1px solid var(--gold)' : '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-md)', cursor: includedCount > 0 ? 'pointer' : 'not-allowed', color: includedCount > 0 ? 'var(--gold)' : 'var(--grey-mid)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', letterSpacing: '0.05em' }}
                          >
                            Compare {includedCount > 0 ? `${includedCount} player${includedCount !== 1 ? 's' : ''}` : '(select players)'} →
                          </button>
                        </div>
                      );
                    }

                    return (
                      <>
                      {/* ── Nav: back + tabs + add player, single row ── */}
                      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        <BackLink as="button" onClick={() => setShowResults(false)} style={{ fontSize: 'var(--text-xxs)', flexShrink: 0 }}>← Setup</BackLink>
                        <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.12)', flexShrink: 0 }} />
                        <div style={{ display: 'flex', gap: 2, background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--radius-md)', padding: 3 }}>
                          {[['replays', 'Replays'], ['fingerprint', 'Fingerprint']].map(([id, label]) => (
                            <button key={id} onClick={() => setResultsTab(id)} style={{ padding: '5px 16px', background: resultsTab === id ? 'rgba(212,175,55,0.18)' : 'transparent', border: resultsTab === id ? '1px solid rgba(212,175,55,0.4)' : '1px solid transparent', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: resultsTab === id ? 'var(--gold)' : 'var(--grey-light)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xxxs)', letterSpacing: '0.06em', textTransform: 'uppercase', transition: 'all 0.15s' }}>
                              {label}
                            </button>
                          ))}
                        </div>
                        <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.12)', flexShrink: 0 }} />
                        <div style={{ position: 'relative', zIndex: 30 }}>
                          <SearchInputWrap style={{ width: 200 }}>
                            <Input
                              value={addQuery}
                              onChange={e => setAddQuery(e.target.value)}
                              onKeyDown={e => e.key === "Escape" && (setAddQuery(""), setAddShowDropdown(false))}
                              onFocus={() => addResults.length > 0 && setAddShowDropdown(true)}
                              onBlur={() => setTimeout(() => setAddShowDropdown(false), 200)}
                              placeholder="+ Add player…"
                              style={{ fontSize: 'var(--text-xxs)', padding: '5px 10px' }}
                            />
                          </SearchInputWrap>
                          {addLoading && <PeonLoader size="sm" />}
                          {addShowDropdown && renderSearchDropdown(addResults, addPlayerToList, true)}
                          {addIsSearching && addQuery.length >= 2 && !addShowDropdown && (
                            <div className="navbar-search-dropdown" style={{ width: 200 }}><div className="navbar-search-loading"><PeonLoader size="sm" /></div></div>
                          )}
                        </div>
                      </div>

                      {/* ── REPLAYS TAB ── */}
                      <div style={{ display: resultsTab === 'replays' ? 'block' : 'none' }}>
                      {(() => {
                        const allPlayers = [
                          { tag: selectedTag, name: queryName, isQuery: true },
                          ...candidates.map(s => ({ tag: s.battleTag, name: (s.playerName || s.battleTag || '').split('#')[0], isQuery: false })),
                        ];
                        return (
                          <>
                          <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                            {allPlayers.map(p => {
                              const replays = playerReplayLists.get(p.tag) || [];
                              const selection = playerReplaySelections.get(p.tag);
                              const hasSelection = selection && selection.size > 0;
                              return (
                                <div key={p.tag} style={{ flex: '0 0 240px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                  {/* Player header */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 8, borderBottom: p.isQuery ? '2px solid rgba(212,175,55,0.4)' : '1px solid rgba(255,255,255,0.1)' }}>
                                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-sm)', color: p.isQuery ? 'var(--gold)' : '#fff' }}>{p.name}</span>
                                    {hasSelection && (
                                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xxxs)', color: 'var(--gold)', marginLeft: 'auto' }}>{selection.size} sel</span>
                                    )}
                                    {hasSelection && (
                                      <button onClick={() => setPlayerReplaySelection(p.tag, null)} style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xxxs)', color: 'var(--grey-mid)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>clear</button>
                                    )}
                                  </div>
                                  {/* Race + date filters */}
                                  <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                                    {RACE_FILTERS.map(rf => {
                                      const active = playerRaceFilters.get(p.tag) === rf.value;
                                      return (
                                        <button key={rf.label} onClick={() => setPlayerRace(p.tag, rf.value)}
                                          style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '2px 6px', background: active ? 'rgba(212,175,55,0.18)' : 'rgba(255,255,255,0.06)', border: active ? '1px solid var(--gold)' : '1px solid rgba(255,255,255,0.1)', borderRadius: 3, cursor: 'pointer', color: active ? 'var(--gold)' : 'var(--grey-light)', fontSize: 'var(--text-xxxs)', fontFamily: 'var(--font-mono)' }}>
                                          {rf.icon && <img src={rf.icon} alt="" style={{ width: 11, height: 11 }} />}{rf.label}
                                        </button>
                                      );
                                    })}
                                  </div>
                                  <div style={{ display: 'flex', gap: 3 }}>
                                    {DATE_FILTERS.map(df => {
                                      const active = playerDateFilters.get(p.tag) === df.value;
                                      return <button key={df.label} onClick={() => setPlayerDate(p.tag, df.value)} style={{ padding: '2px 8px', background: active ? 'rgba(212,175,55,0.18)' : 'rgba(255,255,255,0.06)', border: active ? '1px solid var(--gold)' : '1px solid rgba(255,255,255,0.1)', borderRadius: 3, cursor: 'pointer', color: active ? 'var(--gold)' : 'var(--grey-light)', fontSize: 'var(--text-xxxs)', fontFamily: 'var(--font-mono)' }}>{df.label}</button>;
                                    })}
                                  </div>
                                  {/* Replay list */}
                                  {renderReplayPicker(p.tag)}
                                </div>
                              );
                            })}
                          </div>
                          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--panel-border)' }}>
                            <button
                              onClick={() => setResultsTab('fingerprint')}
                              style={{ padding: '9px 24px', background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.5)', borderRadius: 'var(--radius-md)', cursor: 'pointer', color: 'var(--gold)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', letterSpacing: '0.05em' }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,175,55,0.25)'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(212,175,55,0.15)'; }}
                            >
                              Compare fingerprints →
                            </button>
                          </div>
                          </>
                        );
                      })()}
                      </div>

                      <div style={{ display: resultsTab === 'fingerprint' ? 'block' : 'none' }}>
                      <CompareTable $cols={numCols}>

                        {/* ── Header row: player names (draggable to reorder) ── */}
                        <div />
                        <TH $query>
                          {renderAvatar(qAvatar, qRaceIcon)}
                          <THName>{queryName}</THName>
                          {qCountry && <CountryFlag name={qCountry.toLowerCase()} style={{ width: 16, height: 12 }} />}
                          {(() => {
                            const sel = playerReplaySelections.get(selectedTag);
                            const hasSel = sel && sel.size > 0;
                            return hasSel
                              ? <THLabel style={{ color: 'var(--gold)', opacity: 1 }}>{sel.size} replays selected</THLabel>
                              : <THLabel style={{ color: queryGames >= 100 ? 'var(--green)' : queryGames >= 20 ? 'var(--amber)' : 'var(--red)', opacity: 1 }}>{queryGames} reps</THLabel>;
                          })()}
                        </TH>
                        {renderCandidateCells(s => {
                          const name = (s.playerName || s.battleTag || "").split("#")[0];
                          const mp = matchProfiles[s.battleTag];
                          const repColor = s.replayCount >= 100 ? 'var(--green)' : s.replayCount >= 20 ? 'var(--amber)' : 'var(--red)';
                          return (
                            <TH
                              key={s.battleTag}
                              draggable
                              onDragStart={e => { dragTagRef.current = s.battleTag; e.dataTransfer.effectAllowed = 'move'; }}
                              onDragOver={e => e.preventDefault()}
                              onDrop={e => {
                                e.preventDefault();
                                const from = dragTagRef.current;
                                const to = s.battleTag;
                                if (!from || from === to) return;
                                setCandidateOrder(prev => {
                                  const next = [...prev];
                                  const fi = next.indexOf(from);
                                  const ti = next.indexOf(to);
                                  if (fi < 0 || ti < 0) return prev;
                                  next.splice(fi, 1);
                                  next.splice(ti, 0, from);
                                  return next;
                                });
                              }}
                              style={{ cursor: 'grab' }}
                            >
                              <RemoveBtn title="Remove" onClick={e => { e.stopPropagation(); removeCandidate(s.battleTag); }}>×</RemoveBtn>
                              {renderAvatar(mp?.profilePicUrl, RACE_ICON_MAP[s.race])}
                              <THName>{name}</THName>
                              {mp?.country && <CountryFlag name={mp.country.toLowerCase()} style={{ width: 16, height: 12 }} />}
                              {(() => {
                                const sel = playerReplaySelections.get(s.battleTag);
                                const hasSel = sel && sel.size > 0;
                                return hasSel
                                  ? <THLabel style={{ color: 'var(--gold)', opacity: 1 }}>{sel.size} replays selected</THLabel>
                                  : <THLabel style={{ color: repColor, opacity: 1 }}>{s.replayCount} reps</THLabel>;
                              })()}
                            </TH>
                          );
                        })}

                        {/* ── Fingerprint row ── */}
                        <GlyphRowLabel>Fingerprint</GlyphRowLabel>
                        <GlyphTD $query style={{ position: 'relative' }}>
                          <TransitionGlyph
                            transitionPairs={qGlyph?.transitionPairs || []}
                            groupUsage={qGlyph?.groupUsage || []}
                            groupCompositions={qGlyph?.groupCompositions || {}}
                            segments={qApm ? { apm: [qApm / 300, 0, 0] } : null}
                            playerName={queryName}
                            replayCount={queryGames}
                            mini
                          />
                          {refetchingTags.has(selectedTag) && (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)', borderRadius: 'var(--radius-md)' }}>
                              <PeonLoader size="sm" />
                            </div>
                          )}
                        </GlyphTD>
                        {renderCandidateCells(s => {
                          const name = (s.playerName || s.battleTag || "").split("#")[0];
                          const hasArcs = s.glyph?.transitionPairs?.length > 0;
                          const isRefetching = refetchingTags.has(s.battleTag);
                          const isImporting = importingTags.has(s.battleTag);
                          const hasReplayFilter = !!(playerReplaySelections.get(s.battleTag)?.size);
                          const minReps = hasReplayFilter ? 1 : 3;
                          const needsImport = s.replayCount < minReps && !isImporting && !isRefetching;
                          return (
                            <GlyphTD key={s.battleTag} style={{ position: 'relative' }}>
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
                              </div>
                              {(isRefetching || isImporting) && (
                                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)', borderRadius: 'var(--radius-md)' }}>
                                  <PeonLoader size="sm" />
                                  {isImporting && <span style={{ marginLeft: 6, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xxxs)', color: 'var(--grey-light)' }}>importing…</span>}
                                </div>
                              )}
                              {needsImport && (
                                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.55)', borderRadius: 'var(--radius-md)', gap: 6 }}>
                                  {importMessages.has(s.battleTag) ? (
                                    <>
                                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xxxs)', color: importMessages.get(s.battleTag).includes('queued') ? 'var(--grey-light)' : 'var(--red)', textAlign: 'center', padding: '0 8px' }}>{importMessages.get(s.battleTag)}</span>
                                      {!importMessages.get(s.battleTag).includes('queued') && (
                                        <button onClick={() => importReplays(s.battleTag)} style={{ padding: '4px 10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 'var(--radius-md)', cursor: 'pointer', color: 'var(--grey-light)', fontSize: 'var(--text-xxxs)', fontFamily: 'var(--font-mono)' }}>
                                          retry
                                        </button>
                                      )}
                                    </>
                                  ) : (
                                    <>
                                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xxxs)', color: 'var(--grey-light)' }}>{s.replayCount} rep{s.replayCount !== 1 ? 's' : ''} — not enough</span>
                                      <button onClick={() => importReplays(s.battleTag)} style={{ padding: '4px 10px', background: 'rgba(212,175,55,0.15)', border: '1px solid var(--gold)', borderRadius: 'var(--radius-md)', cursor: 'pointer', color: 'var(--gold)', fontSize: 'var(--text-xxxs)', fontFamily: 'var(--font-mono)' }}>
                                        ↓ Import replays
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </GlyphTD>
                          );
                        })}

                        {/* ── Feature rows ── */}
                        <RowLabel>MMR</RowLabel>
                        <TD $query>{qMmr != null ? Math.round(qMmr) : '—'}</TD>
                        {renderCandidateCells(s => (
                          <TD key={s.battleTag} >{s.mmr != null ? Math.round(s.mmr) : '—'}</TD>
                        ))}

                        <RowLabel>Country</RowLabel>
                        <TD $query>
                          {qCountry ? <CountryFlag name={qCountry.toLowerCase()} style={{ width: 22, height: 16 }} /> : '—'}
                        </TD>
                        {renderCandidateCells(s => {
                          const c = matchProfiles[s.battleTag]?.country;
                          return (
                            <TD key={s.battleTag} >
                              {c ? <CountryFlag name={c.toLowerCase()} style={{ width: 22, height: 16 }} /> : '—'}
                            </TD>
                          );
                        })}

                        <RowLabel>Race</RowLabel>
                        <TD $query>
                          {qRaceIcon ? <img src={qRaceIcon} alt={qRace || ''} style={{ width: 22, height: 22 }} /> : (qRace || '—')}
                        </TD>
                        {renderCandidateCells(s => {
                          const ri = RACE_ICON_MAP[s.race];
                          return (
                            <TD key={s.battleTag} >
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
                            {renderCandidateCells(s => (
                              <TD key={s.battleTag} style={{ gap: 3, flexWrap: "wrap", justifyContent: "center" }}>
                                {renderGroupUnits(s.glyph, groupNum)}
                              </TD>
                            ))}
                          </React.Fragment>
                        ))}

                        <RowLabel>APM</RowLabel>
                        <TD $query>{qApm ?? '—'}</TD>
                        {renderCandidateCells(s => (
                          <TD key={s.battleTag}>{s.apm ?? '—'}</TD>
                        ))}

                        <RowLabel>Loops</RowLabel>
                        <TD $query style={{ flexDirection: 'column', gap: 2, alignItems: 'center' }}>
                          {(qGlyph?.transitionPairs?.slice(0, 3) || []).map((p, i) => (
                            <span key={i} style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xxxs)', opacity: i === 0 ? 1 : 0.55 }}>{p.from}↔{p.to}</span>
                          ))}
                          {!qGlyph?.transitionPairs?.length && '—'}
                        </TD>
                        {renderCandidateCells(s => (
                          <TD key={s.battleTag} style={{ flexDirection: 'column', gap: 2, alignItems: 'center' }}>
                            {(s.glyph?.transitionPairs?.slice(0, 3) || []).map((p, i) => (
                              <span key={i} style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xxxs)', opacity: i === 0 ? 1 : 0.55 }}>{p.from}↔{p.to}</span>
                            ))}
                            {!s.glyph?.transitionPairs?.length && '—'}
                          </TD>
                        ))}

                        <RowLabel>Rebind %</RowLabel>
                        <TD $query>{playstyleData.query?.reassignRatio != null ? `${playstyleData.query.reassignRatio}%` : '—'}</TD>
                        {renderCandidateCells(s => (
                          <TD key={s.battleTag}>{s.reassignRatio != null ? `${s.reassignRatio}%` : '—'}</TD>
                        ))}
                      </CompareTable>

                      {/* ── Played-together matrix (upper triangle only) ── */}
                      {matrixTags.length > 1 && (
                        <div style={{ marginBottom: "var(--space-6)" }}>
                          <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xxxs)", color: "var(--grey-light)", textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.5, marginBottom: "var(--space-2)" }}>Played together</div>
                          <div style={{ display: "grid", gridTemplateColumns: `120px repeat(${matrixTags.length - 1}, 1fr)`, gap: 1 }}>
                            {/* header — skip first col (row labels cover it) */}
                            <div />
                            {matrixNames.slice(1).map((n, i) => (
                              <div key={i} style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-xs)", color: i === 0 ? "var(--gold)" : "var(--grey-light)", padding: "4px 6px", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n}</div>
                            ))}
                            {/* rows — only show i < last row (last row has no upper-triangle cells) */}
                            {matrixTags.slice(0, -1).map((tagA, i) => (
                              <React.Fragment key={tagA}>
                                <div style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-xs)", color: i === 0 ? "var(--gold)" : "var(--grey-light)", padding: "4px 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{matrixNames[i]}</div>
                                {matrixTags.slice(1).map((tagB, jj) => {
                                  const j = jj + 1;
                                  if (j <= i) return <div key={jj} />;
                                  const count = getShared(tagA, tagB);
                                  const involvesQuery = i === 0 || j === 0;
                                  return (
                                    <div key={jj} style={{ textAlign: "center", padding: "4px 6px", fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: count > 0 ? (involvesQuery ? "var(--gold)" : "#fff") : "rgba(255,255,255,0.3)", fontWeight: count > 0 ? 700 : 400 }}>
                                      {count > 0 ? `${count}×` : "0"}
                                    </div>
                                  );
                                })}
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                      )}
                      </div>
                      </>
                    );
                  })()}

                  {/* Activity timeline — results phase only */}
                  {showResults && (() => {
                    const tlMap = new Map([
                      ...playstyleData.similar.slice(0, 5).map(s => [s.battleTag, s]),
                      ...manualCandidates,
                    ]);
                    const tlCandidates = candidateOrder
                      .filter(t => !removedTags.has(t) && tlMap.has(t))
                      .map(t => tlMap.get(t));
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
                    return <ActivityTimeline players={tlPlayers} matchProfiles={matchProfiles} startDate={playerDateFilters.get(selectedTag) || null} />;
                  })()}
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
