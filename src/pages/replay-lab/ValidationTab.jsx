import React, { useState, useEffect, useCallback, useMemo } from "react";
import styled from "styled-components";
import PeonLoader from "../../components/PeonLoader";
import useAdmin from "../../lib/useAdmin";
import usePlayerMeta from "../../lib/usePlayerMeta";
import { PairRow } from "./SmurfsTab";
import { chartColors } from "../../lib/design-tokens";

const RELAY_URL =
  import.meta.env.VITE_CHAT_RELAY_URL || "https://4v4gg-chat-relay.fly.dev";

const RED = chartColors.red;
const GOLD = chartColors.gold;
const GREEN = chartColors.green;
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

/** part="list": the confirmed pairs. part="add": the manual add form (admin). */
export default function ValidationTab({ part = "list", onAdded }) {
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
  // A "same player" click in the suspects list below adds a confirmed pair
  useEffect(() => {
    window.addEventListener("pair-labelled", fetchData);
    return () => window.removeEventListener("pair-labelled", fetchData);
  }, [fetchData]);

  const pairs = data?.pairs || [];
  const tags = useMemo(() => pairs.flatMap(p => [p.tagMain, p.tagSmurf]), [data]); // eslint-disable-line react-hooks/exhaustive-deps
  const meta = usePlayerMeta(tags);

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
        onAdded?.();
      }
    } catch { /* ignore */ }
    setAdding(false);
  }, [mainTag, smurfTag, notes, adminKey, adding, fetchData, onAdded]);

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

  const summary = data?.summary || {};
  const filteredMain = mainSearch.length >= 2
    ? players.filter(p => p.battle_tag.toLowerCase().includes(mainSearch.toLowerCase())).slice(0, 8)
    : [];
  const filteredSmurf = smurfSearch.length >= 2
    ? players.filter(p => p.battle_tag.toLowerCase().includes(smurfSearch.toLowerCase())).slice(0, 8)
    : [];

  if (part === "add") {
    if (!isAdmin) return <NoData>Turn on admin view to add pairs.</NoData>;
    return (
      <>
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
        <FormHint>
          Use this for accounts you know are the same person from outside the
          site. Pairs from To review get added automatically when you mark
          them Same player.
        </FormHint>
      </>
    );
  }

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

      {/* Pair list */}
      {pairs.length === 0 ? (
        <NoData>No validation pairs added yet. Add known smurf-main pairs to test model accuracy.</NoData>
      ) : (
        <PairsList>
          {pairs.map((pair, i) => {
            const isMissing = pair.missing;
            const verdict = isMissing
              ? { label: "Needs data", color: "var(--grey-mid)" }
              : getVerdict(pair.similarity, pair.percentile);
            const scoreText = isMissing
              ? "-"
              : pair.percentile != null
                ? `p${Math.round(pair.percentile)}`
                : `${Math.round(pair.similarity * 100)}%`;
            // Same shape as a suspect pair, so it gets the same row and drawer
            const row = {
              tagA: pair.tagMain, tagB: pair.tagSmurf,
              raceA: pair.raceMain, raceB: pair.raceSmurf,
              replaysA: pair.replaysMain, replaysB: pair.replaysSmurf,
              similarity: pair.similarity,
              connectionA: pair.connectionMain, connectionB: pair.connectionSmurf,
              notes: pair.notes || "Confirmed pair",
            };
            return (
              <PairRow
                key={pair.id}
                pair={row}
                index={i}
                open={expandedIdx === i}
                onToggle={() => setExpandedIdx(expandedIdx === i ? null : i)}
                meta={meta}
                verdict={verdict}
                scoreText={scoreText}
                footer={isAdmin && (
                  <DeleteButton onClick={() => handleDelete(pair.id)}>Remove pair</DeleteButton>
                )}
              />
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

const FormHint = styled.p`
  font: var(--text-xs) var(--font-mono);
  color: var(--grey-light);
  max-width: 640px;
  line-height: 1.6;
`;

const SectionTitle = styled.h2`
  font-family: var(--font-display);
  font-size: var(--text-lg);
  color: var(--gold);
  margin: 0 0 var(--space-4);
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
