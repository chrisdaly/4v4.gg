import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import PeonLoader from "../../components/PeonLoader";
import { CountryFlag } from "../../components/ui";
import { chartColors } from "../../lib/design-tokens";
import { raceIcons } from "../../lib/constants";
import useAdmin from "../../lib/useAdmin";
import usePlayerMeta from "../../lib/usePlayerMeta";

const RELAY_URL =
  import.meta.env.VITE_CHAT_RELAY_URL || "https://4v4gg-chat-relay.fly.dev";

const RED = chartColors.red;
const GOLD = chartColors.gold;
const GREY = "var(--grey-light)";

// The relay's verdict for a pair: how far it stands out on playstyle, raised
// to "possible" by side evidence (a rare shared country or the closest lobby chat, never in the same
// ladder game). Pairs where both agree rank first.
function getVerdict(pair) {
  if (pair.verdict === "confident") return { label: "Likely same player", color: RED };
  if (pair.verdict === "possible") return { label: "Possible", color: GOLD };
  return { label: "Lookalike", color: GREY };
}

const pct = (share) => `${(share * 100).toFixed(share < 0.01 ? 1 : 0)}%`;

/** Why the relay flagged a pair, as short reasons. */
function getReasons(pair) {
  const reasons = [];
  if (pair.clickVerdict === "confident") reasons.push("Playstyle stands out more than 99% of best matches");
  else if (pair.clickVerdict === "possible") reasons.push("Playstyle stands out more than 95% of best matches");
  const ev = pair.evidence || {};
  if (ev.sameCountry && ev.country) {
    const share = ev.countryShare != null ? `, ${pct(ev.countryShare)} of players` : "";
    reasons.push(`Both ${ev.country}${share}${ev.supports ? "" : " (too common to count)"}`);
  }
  if (pair.chat?.supports) reasons.push("Closest lobby chat style");
  reasons.push("Never in the same ladder game");
  return reasons;
}

/** "AE 52/52" style connection summary for one account, or null. */
function connectionLabel(conn) {
  if (!conn) return null;
  const others = Object.entries(conn.countries || {})
    .filter(([c]) => c !== conn.country)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([c, n]) => `${c} ${n}`);
  const main = `${conn.country} ${Math.round(conn.share * conn.games)}/${conn.games}`;
  return others.length ? `${main} (${others.join(", ")})` : main;
}

const pairKey = (pair) => `${pair.tagA}|${pair.tagB}`;

const RACE_ICON = { Human: raceIcons.human, Orc: raceIcons.orc, "Night Elf": raceIcons.elf, Undead: raceIcons.undead, Random: raceIcons.random };
const GROUP_ORDER = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0]; // keyboard order

/** One account of a pair: who they are, where they connect from, and their
 *  habits, with control-group bars to compare against the other account. */
function Account({ tag, race, games, conn, habits, other, meta }) {
  const profile = meta.avatars.get(tag);
  const stats = meta.stats.get(tag);
  const country = conn?.country || profile?.country;
  const max = Math.max(0.001, ...(habits?.groups || []), ...(other?.groups || []));
  return (
    <AccountBox>
      <AccountHead>
        <Avatar src={profile?.profilePicUrl || RACE_ICON[race] || raceIcons.random} alt="" />
        <div style={{ minWidth: 0 }}>
          <PlayerName as={Link} to={`/player/${encodeURIComponent(tag)}`} onClick={e => e.stopPropagation()}>
            {tag.split("#")[0]}
          </PlayerName>
          <AccountFacts>
            {country && <CountryFlag name={country.toLowerCase()} />}
            {RACE_ICON[race] && <img src={RACE_ICON[race]} alt={race} />}
            <span>{stats?.mmr != null ? `${Math.round(stats.mmr)} MMR` : "MMR ?"}</span>
            <span>{games} games</span>
            {habits?.apm > 0 && <span>{habits.apm} APM</span>}
          </AccountFacts>
        </div>
      </AccountHead>
      {habits?.groups && (
        <Groups title="Share of control-group selections, groups 1-9 and 0">
          {GROUP_ORDER.map(g => (
            <GroupCol key={g}>
              <GroupBar style={{ height: `${Math.round((habits.groups[g] / max) * 100)}%` }} />
              <GroupNum>{g}</GroupNum>
            </GroupCol>
          ))}
        </Groups>
      )}
    </AccountBox>
  );
}

export default function SmurfsTab() {
  const [suspects, setSuspects] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedIdx, setExpandedIdx] = useState(null);
  const { adminKey, isAdmin } = useAdmin();
  const [labelError, setLabelError] = useState(null);

  // Your verdict on a pair: test cases for the end-to-end eval. Clicking the
  // current label again clears it.
  async function setLabel(pair, label) {
    const next = pair.label === label ? null : label;
    let failure = null;
    const res = await fetch(`${RELAY_URL}/api/fingerprints/pair-label`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": adminKey.trim() },
      body: JSON.stringify({ tagA: pair.tagA, tagB: pair.tagB, label: next }),
    }).catch(err => { failure = err; return null; });
    if (!res?.ok) {
      // Say what went wrong, so a failure can be traced
      const text = res?.status === 401 ? "Admin key rejected"
        : res ? `Couldn't save (HTTP ${res.status})`
        : `Couldn't reach the relay (${failure?.message || "network error"}). An ad blocker can cause this.`;
      console.error("[pair-label]", res?.status, failure);
      setLabelError({ key: pairKey(pair), text });
      return;
    }
    setLabelError(null);
    setSuspects(s => ({
      ...s,
      pairs: s.pairs.map(p => (p.tagA === pair.tagA && p.tagB === pair.tagB ? { ...p, label: next } : p)),
    }));
  }

  const tags = useMemo(
    () => (suspects?.pairs || []).flatMap(p => [p.tagA, p.tagB]),
    [suspects?.pairs],
  );
  const meta = usePlayerMeta(tags);

  useEffect(() => {
    fetch(`${RELAY_URL}/api/fingerprints/suspects?limit=50`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { setSuspects(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="page-loader" style={{ minHeight: "40vh" }}>
        <PeonLoader />
      </div>
    );
  }

  if (!suspects?.pairs?.length) {
    return <NoData>No suspect pairs found yet. More replays needed to build the similarity graph.</NoData>;
  }

  return (
    <>
      <StatsRow>
        <StatChip>{suspects.pairs.length} <span>suspect pairs</span></StatChip>
        {suspects.totalPairs != null && (
          <StatChip>{suspects.totalPairs} <span>total pairs analyzed</span></StatChip>
        )}
        {suspects.playerCount != null && (
          <StatChip>{suspects.playerCount} <span>players indexed</span></StatChip>
        )}
      </StatsRow>

      <PairsList>
        {suspects.pairs.map((pair, i) => {
          const verdict = getVerdict(pair);
          const isExpanded = expandedIdx === i;
          const bd = pair.breakdown || {};
          const displayScore = `${Math.round(pair.similarity * 100)}%`;

          return (
            <PairCard key={i} onClick={() => setExpandedIdx(isExpanded ? null : i)}>
              <PairRank $color={verdict.color}>{i + 1}</PairRank>
              <PairMain>
                <PairPlayers>
                  <Account tag={pair.tagA} race={pair.raceA} games={pair.replaysA} conn={pair.connectionA}
                    habits={pair.habitsA} other={pair.habitsB} meta={meta} />
                  <Vs>vs</Vs>
                  <Account tag={pair.tagB} race={pair.raceB} games={pair.replaysB} conn={pair.connectionB}
                    habits={pair.habitsB} other={pair.habitsA} meta={meta} />
                </PairPlayers>
                <Reasons>{getReasons(pair).join(" · ")}</Reasons>
                {isAdmin && <LabelRow onClick={e => e.stopPropagation()}>
                  <LabelPrompt>Your call</LabelPrompt>
                  <LabelButton $active={pair.label === "same"} $color="var(--red)" onClick={() => setLabel(pair, "same")}>
                    ✓ Same player
                  </LabelButton>
                  <LabelButton $active={pair.label === "different"} $color="var(--green)" onClick={() => setLabel(pair, "different")}>
                    ✗ Different players
                  </LabelButton>
                  {labelError?.key === pairKey(pair) && <LabelError>{labelError.text}</LabelError>}
                </LabelRow>}
              </PairMain>
              <PairScore>
                <ScoreValue $color={verdict.color}>{displayScore}</ScoreValue>
                <VerdictLabel $color={verdict.color}>{verdict.label}</VerdictLabel>
              </PairScore>

              {isExpanded && (pair.connectionA || pair.connectionB) && (
                <Connections onClick={e => e.stopPropagation()}>
                  <span>Connected from, by game:</span>
                  <span>{pair.tagA.split("#")[0]} {connectionLabel(pair.connectionA) || "no history"}</span>
                  <span>{pair.tagB.split("#")[0]} {connectionLabel(pair.connectionB) || "no history"}</span>
                </Connections>
              )}

              {isExpanded && Object.keys(bd).length > 0 && (
                <BreakdownGrid onClick={e => e.stopPropagation()}>
                  {[
                    { key: "action", label: "Actions", val: bd.action },
                    { key: "apm", label: "APM", val: bd.apm },
                    { key: "hotkey", label: "Hotkeys", val: bd.hotkey },
                    { key: "tempo", label: "Tempo", val: bd.tempo },
                    { key: "intensity", label: "Intensity", val: bd.intensity },
                    { key: "trans", label: "Switching", val: bd.transitions },
                    { key: "rhythm", label: "Rhythm", val: bd.rhythm },
                  ].filter(({ val }) => val != null && val > 0).map(({ key, label, val }) => (
                    <BreakdownItem key={key}>
                      <BreakdownLabel>{label}</BreakdownLabel>
                      <BreakdownTrack>
                        <BreakdownFill $val={val} style={{ width: `${Math.round(val * 100)}%` }} />
                      </BreakdownTrack>
                      <BreakdownVal>{Math.round(val * 100)}%</BreakdownVal>
                    </BreakdownItem>
                  ))}
                </BreakdownGrid>
              )}
            </PairCard>
          );
        })}
      </PairsList>
    </>
  );
}

// ── Styled Components ──────────────────────────────────

const NoData = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--grey-light);
  text-align: center;
  padding: var(--space-8) var(--space-4);
  background: var(--surface-1);
  border: var(--border-thin) solid var(--grey-mid);
  border-radius: var(--radius-md);
`;

const StatsRow = styled.div`
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
  margin-bottom: var(--space-6);
  padding-bottom: var(--space-4);
  border-bottom: var(--border-thin) solid rgba(255, 255, 255, 0.06);
`;

const StatChip = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--gold);
  background: var(--gold-tint);
  border: var(--border-thin) solid rgba(252, 219, 51, 0.25);
  border-radius: var(--radius-sm);
  padding: 6px 12px;
  font-weight: 600;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(252, 219, 51, 0.12);
    border-color: var(--gold);
  }

  span {
    color: var(--grey-light);
    font-weight: 400;
    margin-left: 4px;
  }
`;

const PairsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
`;

const PairCard = styled.div`
  display: grid;
  grid-template-columns: 40px 1fr auto;
  gap: var(--space-4);
  align-items: center;
  cursor: pointer;
  background: var(--theme-bg, var(--surface-1));
  backdrop-filter: var(--theme-blur, none);
  border: var(--theme-border, var(--border-thin) solid var(--grey-mid));
  border-image: var(--theme-border-image, none);
  border-radius: var(--radius-md);
  box-shadow: var(--theme-shadow, none);
  padding: var(--space-4);
  transition: all 0.2s ease;

  &:hover {
    border-color: var(--gold);
    background: var(--theme-bg, rgba(252, 219, 51, 0.02));
  }
`;

const PairRank = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: ${p => p.$color || "var(--gold)"};
  background: rgba(255, 255, 255, 0.04);
  border: var(--border-thin) solid ${p => p.$color || "var(--gold)"}40;
  border-radius: var(--radius-full);
  font-weight: 600;
  transition: all 0.2s ease;
`;

const PairMain = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
`;

const LabelRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
  margin-top: var(--space-3);
  padding-top: var(--space-3);
  border-top: var(--border-thin) solid rgba(255, 255, 255, 0.06);
`;

const LabelPrompt = styled.span`
  font: var(--text-xxs) var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--grey-light);
`;

const LabelButton = styled.button`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  cursor: pointer;
  border: 2px solid ${p => p.$color};
  background: ${p => (p.$active ? p.$color : "transparent")};
  color: ${p => (p.$active ? "#000" : p.$color)};
  transition: background 0.15s ease, color 0.15s ease;

  &:hover { background: ${p => p.$color}; color: #000; }
`;

const LabelError = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--red);
`;

const AccountBox = styled.div`
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
`;

const AccountHead = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
`;

const Avatar = styled.img`
  width: 44px;
  height: 44px;
  border-radius: var(--radius-full);
  object-fit: cover;
  flex-shrink: 0;
  border: var(--border-thin) solid var(--grey-mid);
`;

const AccountFacts = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px var(--space-2);
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);

  img { width: 16px; height: 16px; }
`;

const Groups = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 40px;
  max-width: 220px;
`;

const GroupCol = styled.div`
  flex: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
`;

const GroupBar = styled.div`
  width: 100%;
  min-height: 1px;
  background: var(--gold);
  border-radius: 1px;
  opacity: 0.85;
`;

const GroupNum = styled.span`
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--grey-mid);
  line-height: 1.2;
`;

const Reasons = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
`;

const Connections = styled.div`
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2) var(--space-4);
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--white);

  > span:first-child {
    color: var(--grey-light);
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }
`;

const PairPlayers = styled.div`
  display: flex;
  align-items: flex-start;
  gap: var(--space-4);
  min-width: 0;
  margin-bottom: var(--space-2);

  > span { margin-top: 12px; }

  @media (max-width: 640px) {
    flex-direction: column;
    > span { margin-top: 0; }
  }
`;

const PlayerName = styled.span`
  font-family: var(--font-display);
  font-size: var(--text-base);
  color: var(--gold);
  display: block;
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: 0 1px 8px rgba(0, 0, 0, 0.6);

  &:hover { text-decoration: underline; }
`;

const Vs = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-mid);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  flex-shrink: 0;
  padding: 2px 6px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: var(--radius-sm);
`;

const PairScore = styled.div`
  text-align: center;
  flex-shrink: 0;
  min-width: 80px;
`;

const ScoreValue = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-lg);
  color: ${p => p.$color || "var(--white)"};
  font-weight: 700;
  margin-bottom: var(--space-1);
`;

const VerdictLabel = styled.div`
  display: inline-block;
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  color: ${p => p.$color || "var(--grey-light)"};
  background: rgba(255, 255, 255, 0.04);
  border: var(--border-thin) solid rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-sm);
  padding: 4px 8px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  text-align: center;
  min-width: 60px;
`;

const BreakdownGrid = styled.div`
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: var(--space-2) var(--space-4);
  padding: var(--space-4) 0 0;
  margin-top: var(--space-3);
  border-top: var(--border-thin) solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.02);
  border-radius: var(--radius-sm);
  padding: var(--space-3);
`;

const BreakdownItem = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
`;

const BreakdownLabel = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  color: var(--grey-light);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  width: 64px;
  flex-shrink: 0;
`;

const BreakdownTrack = styled.div`
  flex: 1;
  height: 6px;
  background: var(--surface-2);
  border-radius: var(--radius-sm);
  overflow: hidden;
  border: var(--border-thin) solid rgba(255, 255, 255, 0.08);
`;

const BreakdownFill = styled.div`
  height: 100%;
  border-radius: var(--radius-sm);
  background: ${p =>
    p.$val >= 0.8 ? "var(--green)" :
    p.$val >= 0.6 ? "var(--gold)" :
    "var(--grey-light)"};
  transition: width 0.3s ease;
`;

const BreakdownVal = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  color: var(--grey-mid);
  width: 32px;
  text-align: right;
  flex-shrink: 0;
  font-weight: 500;
`;
