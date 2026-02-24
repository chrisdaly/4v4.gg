import React, { useState, useEffect } from "react";
import styled from "styled-components";
import PeonLoader from "../../components/PeonLoader";

const RELAY_URL =
  import.meta.env.VITE_CHAT_RELAY_URL || "https://4v4gg-chat-relay.fly.dev";

const RED = "#f87171";
const GOLD = "#fcdb33";
const GREY = "var(--grey-light)";

function getVerdict(similarity, percentile) {
  if (percentile != null) {
    if (percentile >= 99) return { label: "Very strong", color: RED };
    if (percentile >= 95) return { label: "Strong", color: RED };
    if (percentile >= 90) return { label: "Possible", color: GOLD };
    if (percentile >= 80) return { label: "Weak", color: GREY };
    return { label: "Unlikely", color: "var(--grey-mid)" };
  }
  if (similarity >= 0.90) return { label: "Strong", color: RED };
  if (similarity >= 0.80) return { label: "Possible", color: GOLD };
  return { label: "Weak", color: GREY };
}

export default function SmurfsTab() {
  const [suspects, setSuspects] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedIdx, setExpandedIdx] = useState(null);

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
          const verdict = getVerdict(pair.similarity, pair.percentile);
          const isExpanded = expandedIdx === i;
          const bd = pair.breakdown || {};
          const displayScore = pair.percentile != null
            ? `p${Math.round(pair.percentile)}`
            : `${Math.round(pair.similarity * 100)}%`;

          return (
            <PairCard key={i} onClick={() => setExpandedIdx(isExpanded ? null : i)}>
              <PairRank $color={verdict.color}>{i + 1}</PairRank>
              <PairPlayers>
                <PlayerName>{pair.tagA.split("#")[0]}</PlayerName>
                <Vs>vs</Vs>
                <PlayerName>{pair.tagB.split("#")[0]}</PlayerName>
              </PairPlayers>
              <PairScore>
                <ScoreValue $color={verdict.color}>{displayScore}</ScoreValue>
                <VerdictLabel $color={verdict.color}>{verdict.label}</VerdictLabel>
              </PairScore>

              {isExpanded && Object.keys(bd).length > 0 && (
                <BreakdownGrid onClick={e => e.stopPropagation()}>
                  {[
                    { key: "action", label: "Actions", val: bd.action },
                    { key: "apm", label: "APM", val: bd.apm },
                    { key: "hotkey", label: "Hotkeys", val: bd.hotkey },
                    { key: "tempo", label: "Tempo", val: bd.tempo },
                    { key: "intensity", label: "Intensity", val: bd.intensity },
                    { key: "trans", label: "Switching", val: bd.transitions },
                    ...(bd.embedding != null ? [{ key: "embedding", label: "Neural", val: bd.embedding }] : []),
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

const PairPlayers = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
`;

const PlayerName = styled.span`
  font-family: var(--font-display);
  font-size: var(--text-base);
  color: var(--gold);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: 0 1px 8px rgba(0, 0, 0, 0.6);
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
