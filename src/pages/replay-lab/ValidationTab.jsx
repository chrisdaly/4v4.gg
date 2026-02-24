import React, { useState, useEffect, useCallback } from "react";
import styled from "styled-components";
import PeonLoader from "../../components/PeonLoader";
import useAdmin from "../../lib/useAdmin";

const RELAY_URL =
  import.meta.env.VITE_CHAT_RELAY_URL || "https://4v4gg-chat-relay.fly.dev";

const RED = "#f87171";
const GOLD = "#fcdb33";
const GREEN = "#4ade80";
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

export default function ValidationTab() {
  const { adminKey, isAdmin } = useAdmin();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedIdx, setExpandedIdx] = useState(null);

  // Add-form state
  const [players, setPlayers] = useState([]);
  const [mainTag, setMainTag] = useState("");
  const [smurfTag, setSmurfTag] = useState("");
  const [notes, setNotes] = useState("");
  const [mainSearch, setMainSearch] = useState("");
  const [smurfSearch, setSmurfSearch] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchData = useCallback(() => {
    fetch(`${RELAY_URL}/api/fingerprints/validation`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!isAdmin) return;
    fetch(`${RELAY_URL}/api/fingerprints/explore/players`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.players) setPlayers(d.players); })
      .catch(() => {});
  }, [isAdmin]);

  const handleAdd = useCallback(async () => {
    if (!mainTag || !smurfTag || adding) return;
    setAdding(true);
    try {
      const res = await fetch(`${RELAY_URL}/api/fingerprints/validation`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": adminKey },
        body: JSON.stringify({ tagMain: mainTag, tagSmurf: smurfTag, notes }),
      });
      if (res.ok) {
        setMainTag(""); setSmurfTag(""); setNotes("");
        setMainSearch(""); setSmurfSearch("");
        fetchData();
      }
    } catch { /* ignore */ }
    setAdding(false);
  }, [mainTag, smurfTag, notes, adminKey, adding, fetchData]);

  const handleDelete = useCallback(async (id) => {
    await fetch(`${RELAY_URL}/api/fingerprints/validation/${id}`, {
      method: "DELETE",
      headers: { "x-api-key": adminKey },
    });
    fetchData();
  }, [adminKey, fetchData]);

  if (loading) {
    return (
      <div className="page-loader" style={{ minHeight: "40vh" }}>
        <PeonLoader />
      </div>
    );
  }

  const pairs = data?.pairs || [];
  const summary = data?.summary || {};
  const indexed = pairs.filter(p => !p.missing);
  const filteredMain = mainSearch.length >= 2
    ? players.filter(p => p.battle_tag.toLowerCase().includes(mainSearch.toLowerCase())).slice(0, 8)
    : [];
  const filteredSmurf = smurfSearch.length >= 2
    ? players.filter(p => p.battle_tag.toLowerCase().includes(smurfSearch.toLowerCase())).slice(0, 8)
    : [];

  return (
    <>
      {/* Summary banner */}
      <SummaryBanner>
        <SummaryMain>
          {summary.indexed > 0 ? (
            <>
              <Big>{summary.aboveP95}</Big>
              <span>/ {summary.indexed} pairs above 95th percentile</span>
            </>
          ) : (
            <span>No indexed pairs yet</span>
          )}
        </SummaryMain>
        <StatsRow>
          <StatChip>{summary.total} <span>total pairs</span></StatChip>
          <StatChip>{summary.indexed} <span>indexed</span></StatChip>
          {summary.meanPercentile > 0 && (
            <StatChip>p{Math.round(summary.meanPercentile)} <span>mean percentile</span></StatChip>
          )}
          <StatChip>{summary.aboveP90} <span>&ge; p90</span></StatChip>
          <StatChip>{summary.aboveP99} <span>&ge; p99</span></StatChip>
        </StatsRow>
      </SummaryBanner>

      {/* Admin add form */}
      {isAdmin && (
        <AddForm>
          <FormLabel>Add known pair</FormLabel>
          <FormRow>
            <PickerWrap>
              <FormInput
                placeholder="Main account tag..."
                value={mainSearch}
                onChange={e => { setMainSearch(e.target.value); setMainTag(""); }}
              />
              {mainTag && <SelectedTag>{mainTag.split("#")[0]}</SelectedTag>}
              {filteredMain.length > 0 && !mainTag && (
                <Dropdown>
                  {filteredMain.map(p => (
                    <DropdownItem key={p.battle_tag} onClick={() => { setMainTag(p.battle_tag); setMainSearch(p.battle_tag); }}>
                      {p.battle_tag} <small>({p.replay_count} replays)</small>
                    </DropdownItem>
                  ))}
                </Dropdown>
              )}
            </PickerWrap>
            <PickerWrap>
              <FormInput
                placeholder="Smurf account tag..."
                value={smurfSearch}
                onChange={e => { setSmurfSearch(e.target.value); setSmurfTag(""); }}
              />
              {smurfTag && <SelectedTag>{smurfTag.split("#")[0]}</SelectedTag>}
              {filteredSmurf.length > 0 && !smurfTag && (
                <Dropdown>
                  {filteredSmurf.map(p => (
                    <DropdownItem key={p.battle_tag} onClick={() => { setSmurfTag(p.battle_tag); setSmurfSearch(p.battle_tag); }}>
                      {p.battle_tag} <small>({p.replay_count} replays)</small>
                    </DropdownItem>
                  ))}
                </Dropdown>
              )}
            </PickerWrap>
            <FormInput
              placeholder="Notes (optional)..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              style={{ flex: 2 }}
            />
            <AddButton onClick={handleAdd} disabled={!mainTag || !smurfTag || adding}>
              {adding ? "Adding..." : "Add"}
            </AddButton>
          </FormRow>
        </AddForm>
      )}

      {/* Pair list */}
      {pairs.length === 0 ? (
        <NoData>No validation pairs added yet. Add known smurf-main pairs to test model accuracy.</NoData>
      ) : (
        <PairsList>
          {pairs.map((pair, i) => {
            const isMissing = pair.missing;
            const verdict = !isMissing ? getVerdict(pair.similarity, pair.percentile) : null;
            const isPass = !isMissing && pair.percentile != null && pair.percentile >= 90;
            const isExpanded = expandedIdx === i;
            const bd = pair.breakdown || {};
            const displayScore = isMissing
              ? "—"
              : pair.percentile != null
                ? `p${Math.round(pair.percentile)}`
                : `${Math.round(pair.similarity * 100)}%`;

            return (
              <PairCard
                key={pair.id}
                $missing={isMissing}
                onClick={() => !isMissing && setExpandedIdx(isExpanded ? null : i)}
              >
                <PassIndicator $pass={isPass} $missing={isMissing}>
                  {isMissing ? "?" : isPass ? "\u2713" : "\u2717"}
                </PassIndicator>
                <PairPlayers>
                  <PlayerName $missing={isMissing}>{pair.tagMain.split("#")[0]}</PlayerName>
                  <Arrow>\u2194</Arrow>
                  <PlayerName $missing={isMissing}>{pair.tagSmurf.split("#")[0]}</PlayerName>
                  {pair.notes && <Notes>{pair.notes}</Notes>}
                  {isMissing && <MissingBadge>needs data</MissingBadge>}
                </PairPlayers>
                <PairScore>
                  <ScoreValue $color={verdict?.color}>{displayScore}</ScoreValue>
                  {verdict && <VerdictLabel $color={verdict.color}>{verdict.label}</VerdictLabel>}
                </PairScore>

                {isExpanded && !isMissing && Object.keys(bd).length > 0 && (
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
                    <MetaRow>
                      <MetaItem>Main: {pair.replaysMain} replays ({pair.raceMain || "?"})</MetaItem>
                      <MetaItem>Smurf: {pair.replaysSmurf} replays ({pair.raceSmurf || "?"})</MetaItem>
                    </MetaRow>
                    {isAdmin && (
                      <DeleteButton onClick={() => handleDelete(pair.id)}>Remove pair</DeleteButton>
                    )}
                  </BreakdownGrid>
                )}
              </PairCard>
            );
          })}
        </PairsList>
      )}
    </>
  );
}

// ── Styled Components ──────────────────────────────────

const SummaryBanner = styled.div`
  margin-bottom: var(--space-6);
  padding-bottom: var(--space-4);
  border-bottom: var(--border-thin) solid rgba(255, 255, 255, 0.06);
`;

const SummaryMain = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--grey-light);
  margin-bottom: var(--space-3);

  span {
    color: var(--grey-light);
  }
`;

const Big = styled.span`
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--gold);
  margin-right: var(--space-2);
`;

const StatsRow = styled.div`
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
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

  span {
    color: var(--grey-light);
    font-weight: 400;
    margin-left: 4px;
  }
`;

const AddForm = styled.div`
  background: var(--surface-1);
  border: var(--border-thin) solid var(--grey-mid);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  margin-bottom: var(--space-6);
`;

const FormLabel = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: var(--space-3);
`;

const FormRow = styled.div`
  display: flex;
  gap: var(--space-3);
  align-items: flex-start;
  flex-wrap: wrap;
`;

const PickerWrap = styled.div`
  position: relative;
  flex: 1;
  min-width: 180px;
`;

const FormInput = styled.input`
  width: 100%;
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--white);
  background: var(--surface-2);
  border: var(--border-thin) solid var(--grey-mid);
  border-radius: var(--radius-sm);
  padding: 8px 12px;
  outline: none;
  box-sizing: border-box;

  &:focus {
    border-color: var(--gold);
  }

  &::placeholder {
    color: var(--grey-mid);
  }
`;

const SelectedTag = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  color: var(--green);
  margin-top: 4px;
`;

const Dropdown = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 10;
  background: var(--surface-2);
  border: var(--border-thin) solid var(--grey-mid);
  border-radius: var(--radius-sm);
  max-height: 200px;
  overflow-y: auto;
  margin-top: 2px;
`;

const DropdownItem = styled.div`
  padding: 8px 12px;
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--white);
  cursor: pointer;

  &:hover {
    background: rgba(252, 219, 51, 0.08);
    color: var(--gold);
  }

  small {
    color: var(--grey-mid);
    margin-left: 4px;
  }
`;

const AddButton = styled.button`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--gold);
  background: var(--gold-tint);
  border: var(--border-thin) solid rgba(252, 219, 51, 0.25);
  border-radius: var(--radius-sm);
  padding: 8px 20px;
  cursor: pointer;
  white-space: nowrap;

  &:hover:not(:disabled) {
    background: rgba(252, 219, 51, 0.15);
    border-color: var(--gold);
  }

  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
`;

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
  cursor: ${p => p.$missing ? "default" : "pointer"};
  opacity: ${p => p.$missing ? 0.5 : 1};
  background: var(--theme-bg, var(--surface-1));
  backdrop-filter: var(--theme-blur, none);
  border: var(--theme-border, var(--border-thin) solid var(--grey-mid));
  border-image: var(--theme-border-image, none);
  border-radius: var(--radius-md);
  box-shadow: var(--theme-shadow, none);
  padding: var(--space-4);
  transition: all 0.2s ease;

  &:hover {
    border-color: ${p => p.$missing ? "var(--grey-mid)" : "var(--gold)"};
  }
`;

const PassIndicator = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: 700;
  color: ${p => p.$missing ? "var(--grey-mid)" : p.$pass ? GREEN : RED};
  background: rgba(255, 255, 255, 0.04);
  border: var(--border-thin) solid ${p => p.$missing ? "var(--grey-mid)" : p.$pass ? GREEN : RED}40;
  border-radius: var(--radius-full);
`;

const PairPlayers = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
  flex-wrap: wrap;
`;

const PlayerName = styled.span`
  font-family: var(--font-display);
  font-size: var(--text-base);
  color: ${p => p.$missing ? "var(--grey-mid)" : "var(--gold)"};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: 0 1px 8px rgba(0, 0, 0, 0.6);
`;

const Arrow = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-mid);
  flex-shrink: 0;
`;

const Notes = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  color: var(--grey-mid);
  font-style: italic;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
`;

const MissingBadge = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  color: var(--grey-mid);
  background: rgba(255, 255, 255, 0.04);
  border: var(--border-thin) solid rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-sm);
  padding: 2px 8px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
`;

const PairScore = styled.div`
  text-align: center;
  flex-shrink: 0;
  min-width: 80px;
`;

const ScoreValue = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-lg);
  color: ${p => p.$color || "var(--grey-mid)"};
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
  padding: var(--space-3);
  margin-top: var(--space-3);
  border-top: var(--border-thin) solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.02);
  border-radius: var(--radius-sm);
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

const MetaRow = styled.div`
  grid-column: 1 / -1;
  display: flex;
  gap: var(--space-4);
  padding-top: var(--space-2);
  border-top: var(--border-thin) solid rgba(255, 255, 255, 0.04);
`;

const MetaItem = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  color: var(--grey-mid);
`;

const DeleteButton = styled.button`
  grid-column: 1 / -1;
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  color: ${RED};
  background: rgba(248, 113, 113, 0.08);
  border: var(--border-thin) solid rgba(248, 113, 113, 0.2);
  border-radius: var(--radius-sm);
  padding: 6px 12px;
  cursor: pointer;
  justify-self: start;

  &:hover {
    background: rgba(248, 113, 113, 0.15);
    border-color: ${RED};
  }
`;
