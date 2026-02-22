import React, { useState, useCallback, useReducer, useMemo } from "react";
import { FiX } from "react-icons/fi";
import { useReplayLabStore, useReplayUpload } from "../../lib/useReplayLabStore";
import { Button } from "../../components/ui";
import SimilarityMatrix from "../../components/replay-lab/SimilarityMatrix";
import ComparisonPanel from "../../components/replay-lab/ComparisonPanel";
import { EarlyGameSequence } from "../../components/replay/PlayerFingerprint";
import OverlaySparkline from "../../components/replay-lab/OverlaySparkline";
import OverlayRadar from "../../components/replay-lab/OverlayRadar";
import {
  buildFingerprint,
  computeBigramBasis,
  computeSimilarityMatrix,
  findSuggestedMatches,
  computeBreakdown,
  playerSimilarity,
} from "../../lib/fingerprint";
import {
  Section,
  SectionTitle,
  DropZone,
  DropLabel,
  DropIcon,
  ReplayStrip,
  ReplayChip,
  ChipText,
  ChipName,
  ChipRemove,
  StatusText,
  EmptyState,
  ThresholdRow,
  ThresholdLabel,
  ThresholdValue,
  CandidateTable,
  CandidateHeader,
  CandidateRow,
  CandidateName,
  CandidateTag,
  CandidateScore,
  CandidateScoreBar,
  CandidateScoreFill,
  LinkBtn,
  DetailPanel,
  DetailHeader,
  DetailName,
  DetailScore,
  DetailBars,
  DetailBar,
  DetailBarLabel,
  DetailBarTrack,
  DetailBarFill,
  DetailSectionLabel,
  OverlayRow,
  HotkeyTable,
  HkCell,
  HkHeader,
  HkBar,
  HkBarFill,
  HkRole,
  CompareGrid,
  CompareColumn,
  CompareLabel,
  MergedGrid,
  getGroupData,
} from "./shared-styles";

// ── Identity merge reducer ──────────────────────

function identityReducer(state, action) {
  switch (action.type) {
    case "LINK": {
      const { uidA, uidB } = action;
      const groupA = state.find((g) => g.includes(uidA));
      const groupB = state.find((g) => g.includes(uidB));
      if (groupA && groupB) {
        if (groupA === groupB) return state;
        const merged = [...new Set([...groupA, ...groupB])];
        return [
          ...state.filter((g) => g !== groupA && g !== groupB),
          merged,
        ];
      }
      if (groupA) return state.map((g) => (g === groupA ? [...g, uidB] : g));
      if (groupB) return state.map((g) => (g === groupB ? [...g, uidA] : g));
      return [...state, [uidA, uidB]];
    }
    case "UNLINK_GROUP":
      return state.filter((g) => !g.includes(action.uid));
    case "RESET":
      return [];
    default:
      return state;
  }
}

export default function CompareTab() {
  const { replays, setReplays, replayLabels, clearSession } = useReplayLabStore();
  const {
    fileRef,
    dragActive,
    setDragActive,
    uploadProgress,
    uploading,
    handleDrop,
    handleFileSelect,
  } = useReplayUpload();

  const [threshold, setThreshold] = useState(0.60);
  const [selectedCell, setSelectedCell] = useState(null);
  const [mergedIdentities, dispatchMerge] = useReducer(identityReducer, []);

  const removeReplay = useCallback(
    (replayId) => {
      setReplays((prev) => prev.filter((r) => r.id !== replayId));
      setSelectedCell(null);
    },
    [setReplays]
  );

  // ── Build all players with fingerprints ─────────

  const allPlayers = useMemo(() => {
    if (replays.length === 0) return [];

    const allSequences = [];
    for (const r of replays) {
      for (const a of r.actions) {
        if (a.early_game_sequence) allSequences.push(a.early_game_sequence);
      }
    }
    const bigramKeys = computeBigramBasis(allSequences);

    const players = [];
    for (const r of replays) {
      const actionsByPlayer = {};
      for (const a of r.actions) {
        actionsByPlayer[a.player_id] = a;
      }
      for (const p of r.players) {
        const actions = actionsByPlayer[p.player_id];
        if (!actions) continue;
        const fingerprint = buildFingerprint(actions, bigramKeys);
        players.push({
          uid: `${r.id}-${p.player_id}`,
          replayId: r.id,
          playerId: p.player_id,
          playerName: p.player_name,
          race: p.race,
          fingerprint,
          actions,
        });
      }
    }
    return players;
  }, [replays]);

  // ── Similarity matrix ───────────────────────────

  const matrix = useMemo(() => {
    if (allPlayers.length < 2) return null;
    return computeSimilarityMatrix(allPlayers);
  }, [allPlayers]);

  // ── Suggested matches ───────────────────────────

  const suggestedMatches = useMemo(() => {
    if (allPlayers.length < 2) return [];
    return findSuggestedMatches(allPlayers, threshold);
  }, [allPlayers, threshold]);

  const topCandidates = useMemo(() => {
    return suggestedMatches.slice(0, 20).map((m) => ({
      player: m.playerA,
      bestMatch: m.playerB,
      similarity: m.similarity,
      breakdown: m.breakdown,
      uidA: m.uidA,
      uidB: m.uidB,
      nameMatch:
        m.playerA.playerName.split("#")[0].toLowerCase() ===
        m.playerB.playerName.split("#")[0].toLowerCase(),
    }));
  }, [suggestedMatches]);

  // ── Cell click detail ───────────────────────────

  const cellDetail = useMemo(() => {
    if (!selectedCell) return null;
    const pA = allPlayers.find((p) => p.uid === selectedCell.uidA);
    const pB = allPlayers.find((p) => p.uid === selectedCell.uidB);
    if (!pA || !pB) return null;
    const sim = playerSimilarity(pA, pB);
    const breakdown = computeBreakdown(pA.fingerprint, pB.fingerprint);
    return { pA, pB, sim, breakdown };
  }, [selectedCell, allPlayers]);

  // ── Handlers ────────────────────────────────────

  const handleCellClick = useCallback((uidA, uidB) => {
    setSelectedCell((prev) =>
      prev && prev.uidA === uidA && prev.uidB === uidB
        ? null
        : { uidA, uidB }
    );
  }, []);

  const handleLink = useCallback((match) => {
    dispatchMerge({ type: "LINK", uidA: match.uidA, uidB: match.uidB });
  }, []);

  const handleUnlinkGroup = useCallback((uid) => {
    dispatchMerge({ type: "UNLINK_GROUP", uid });
  }, []);

  const mergedGroups = useMemo(() => {
    return mergedIdentities
      .map((group) =>
        group.map((uid) => allPlayers.find((p) => p.uid === uid)).filter(Boolean)
      );
  }, [mergedIdentities, allPlayers]);

  // ── Render ──────────────────────────────────────

  return (
    <>
      {/* Drop zone */}
      <Section>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-4)" }}>
          <SectionTitle style={{ marginBottom: 0 }}>Upload Replays</SectionTitle>
          {replays.length > 0 && (
            <Button $secondary onClick={() => { clearSession(); dispatchMerge({ type: "RESET" }); setSelectedCell(null); }} style={{ fontSize: "10px", padding: "3px 10px" }}>
              Clear All
            </Button>
          )}
        </div>

        <DropZone
          $active={dragActive}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onClick={() => fileRef.current?.click()}
        >
          <DropIcon size={24} $active={dragActive} />
          <DropLabel $active={dragActive}>
            {uploading
              ? "Uploading..."
              : dragActive
                ? "Drop .w3g files here"
                : "Drop .w3g files or click to browse"}
          </DropLabel>
          <input
            ref={fileRef}
            type="file"
            accept=".w3g"
            multiple
            style={{ display: "none" }}
            onChange={handleFileSelect}
          />
        </DropZone>

        {Object.entries(uploadProgress).map(([name, p]) =>
          p.status === "error" ? (
            <StatusText key={name} $color="var(--red)">
              {name}: {p.error}
            </StatusText>
          ) : null
        )}

        {replays.length > 0 && (
          <ReplayStrip>
            {replays.map((r) => (
              <ReplayChip key={r.id}>
                <ChipName>{replayLabels[r.id]}</ChipName>
                <ChipText>{r.filename}</ChipText>
                <ChipText>{r.mapName || "?"}</ChipText>
                <ChipText>{r.playerCount}p</ChipText>
                <ChipRemove onClick={() => removeReplay(r.id)}>
                  <FiX size={12} />
                </ChipRemove>
              </ReplayChip>
            ))}
          </ReplayStrip>
        )}
      </Section>

      {/* Similarity matrix */}
      {allPlayers.length >= 2 && matrix && (
        <Section>
          <SectionTitle>Similarity Matrix</SectionTitle>
          <SimilarityMatrix
            players={allPlayers}
            matrix={matrix}
            replayLabels={replayLabels}
            onCellClick={handleCellClick}
            selectedCell={selectedCell}
          />

          {cellDetail && (
            <DetailPanel>
              <DetailHeader>
                <DetailName>
                  {cellDetail.pA.playerName} ({replayLabels[cellDetail.pA.replayId]})
                </DetailName>
                <DetailScore>
                  {Math.round(cellDetail.sim * 100)}%
                </DetailScore>
                <DetailName>
                  {cellDetail.pB.playerName} ({replayLabels[cellDetail.pB.replayId]})
                </DetailName>
              </DetailHeader>
              <DetailBars>
                {Object.entries(cellDetail.breakdown).map(([key, val]) => (
                  <DetailBar key={key}>
                    <DetailBarLabel>
                      {key} {Math.round(val * 100)}%
                    </DetailBarLabel>
                    <DetailBarTrack>
                      <DetailBarFill style={{ width: `${Math.round(val * 100)}%` }} />
                    </DetailBarTrack>
                  </DetailBar>
                ))}
              </DetailBars>

              <DetailSectionLabel>APM Over Time (overlaid)</DetailSectionLabel>
              <OverlaySparkline
                series={[
                  {
                    label: `${cellDetail.pA.playerName} (${replayLabels[cellDetail.pA.replayId]})`,
                    timedSegments: cellDetail.pA.actions?.timed_segments || [],
                  },
                  {
                    label: `${cellDetail.pB.playerName} (${replayLabels[cellDetail.pB.replayId]})`,
                    timedSegments: cellDetail.pB.actions?.timed_segments || [],
                  },
                ]}
              />

              <OverlayRow>
                <div>
                  <DetailSectionLabel>Actions (overlaid)</DetailSectionLabel>
                  <OverlayRadar
                    series={[
                      { label: cellDetail.pA.playerName, actions: cellDetail.pA.actions || {} },
                      { label: cellDetail.pB.playerName, actions: cellDetail.pB.actions || {} },
                    ]}
                  />
                </div>

                <div style={{ flex: 1 }}>
                  <DetailSectionLabel>Control Groups</DetailSectionLabel>
                  <HotkeyTable>
                    <HkHeader>Grp</HkHeader>
                    <HkHeader>
                      {cellDetail.pA.playerName.split("#")[0]} ({replayLabels[cellDetail.pA.replayId]})
                    </HkHeader>
                    <HkHeader>
                      {cellDetail.pB.playerName.split("#")[0]} ({replayLabels[cellDetail.pB.replayId]})
                    </HkHeader>
                    {Array.from({ length: 10 }, (_, i) => {
                      const gA = getGroupData(cellDetail.pA.actions?.group_hotkeys)[i] || {};
                      const gB = getGroupData(cellDetail.pB.actions?.group_hotkeys)[i] || {};
                      const maxVal = Math.max(
                        gA.used || 0, gB.used || 0, gA.assigned || 0, gB.assigned || 0, 1
                      );
                      const inactive =
                        (gA.assigned || 0) === 0 &&
                        (gA.used || 0) === 0 &&
                        (gB.assigned || 0) === 0 &&
                        (gB.used || 0) === 0;
                      if (inactive) return null;
                      return (
                        <React.Fragment key={i}>
                          <HkCell $color="rgba(255,255,255,0.5)">{i}</HkCell>
                          <HkCell>
                            <HkBar>
                              <HkBarFill $color="#00bcd4" style={{ width: `${((gA.assigned || 0) / maxVal) * 100}%` }} />
                            </HkBar>
                            <HkBar>
                              <HkBarFill $color="var(--gold)" style={{ width: `${((gA.used || 0) / maxVal) * 100}%` }} />
                            </HkBar>
                            <HkRole $color="#00bcd4">{gA.assigned || ""}</HkRole>
                            <HkRole $color="var(--gold)">{gA.used || ""}</HkRole>
                          </HkCell>
                          <HkCell>
                            <HkBar>
                              <HkBarFill $color="#00bcd4" style={{ width: `${((gB.assigned || 0) / maxVal) * 100}%` }} />
                            </HkBar>
                            <HkBar>
                              <HkBarFill $color="var(--gold)" style={{ width: `${((gB.used || 0) / maxVal) * 100}%` }} />
                            </HkBar>
                            <HkRole $color="#00bcd4">{gB.assigned || ""}</HkRole>
                            <HkRole $color="var(--gold)">{gB.used || ""}</HkRole>
                          </HkCell>
                        </React.Fragment>
                      );
                    })}
                  </HotkeyTable>
                </div>
              </OverlayRow>

              <DetailSectionLabel>Early Game Sequences</DetailSectionLabel>
              <CompareGrid>
                <CompareColumn>
                  <CompareLabel>
                    {cellDetail.pA.playerName} ({replayLabels[cellDetail.pA.replayId]})
                  </CompareLabel>
                  <EarlyGameSequence sequence={cellDetail.pA.actions?.early_game_sequence} />
                </CompareColumn>
                <CompareColumn>
                  <CompareLabel>
                    {cellDetail.pB.playerName} ({replayLabels[cellDetail.pB.replayId]})
                  </CompareLabel>
                  <EarlyGameSequence sequence={cellDetail.pB.actions?.early_game_sequence} />
                </CompareColumn>
              </CompareGrid>
            </DetailPanel>
          )}
        </Section>
      )}

      {/* Top candidates */}
      {allPlayers.length >= 2 && (
        <Section>
          <SectionTitle>Top Candidates</SectionTitle>
          <ThresholdRow>
            <ThresholdLabel>Min similarity</ThresholdLabel>
            <input
              type="range"
              min="0.30"
              max="0.90"
              step="0.01"
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              style={{ flex: 1, maxWidth: 200 }}
            />
            <ThresholdValue>{Math.round(threshold * 100)}%</ThresholdValue>
          </ThresholdRow>

          {topCandidates.length > 0 ? (
            <CandidateTable>
              <CandidateHeader>
                <span>Player</span>
                <span></span>
                <span>Best Match</span>
                <span>Score</span>
                <span></span>
              </CandidateHeader>
              {topCandidates.map((c) => {
                const pairKey = [c.uidA, c.uidB].sort().join("-");
                return (
                  <CandidateRow
                    key={pairKey}
                    onClick={() => handleCellClick(c.player.uid, c.bestMatch.uid)}
                    style={c.nameMatch ? { background: "rgba(76, 175, 80, 0.06)" } : undefined}
                  >
                    <div>
                      <CandidateName $color="var(--gold)">
                        {c.player.playerName.split("#")[0]}
                      </CandidateName>
                      <CandidateTag> {replayLabels[c.player.replayId]}</CandidateTag>
                    </div>
                    <CandidateTag style={{ textAlign: "center" }}>
                      {c.nameMatch ? "=" : "→"}
                    </CandidateTag>
                    <div>
                      <CandidateName $color={c.nameMatch ? "var(--green)" : "#fff"}>
                        {c.bestMatch.playerName.split("#")[0]}
                      </CandidateName>
                      <CandidateTag> {replayLabels[c.bestMatch.replayId]}</CandidateTag>
                    </div>
                    <div>
                      <CandidateScore $val={c.similarity}>
                        {Math.round(c.similarity * 100)}%
                      </CandidateScore>
                      <CandidateScoreBar>
                        <CandidateScoreFill
                          $val={c.similarity}
                          style={{ width: `${Math.round(c.similarity * 100)}%` }}
                        />
                      </CandidateScoreBar>
                    </div>
                    <LinkBtn
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLink({ uidA: c.uidA, uidB: c.uidB });
                      }}
                    >
                      Link
                    </LinkBtn>
                  </CandidateRow>
                );
              })}
            </CandidateTable>
          ) : (
            <EmptyState>
              {replays.length < 2
                ? "Upload at least 2 replays to see matches"
                : "No matches above threshold — try lowering it"}
            </EmptyState>
          )}
        </Section>
      )}

      {/* Merged identities */}
      {mergedGroups.length > 0 && (
        <Section>
          <SectionTitle>Merged Identities</SectionTitle>
          <MergedGrid>
            {mergedGroups.map((members, i) => (
              <ComparisonPanel
                key={mergedIdentities[i].join("-")}
                members={members}
                replayLabels={replayLabels}
                onUnlink={() => handleUnlinkGroup(members[0].uid)}
              />
            ))}
          </MergedGrid>
        </Section>
      )}

      {replays.length === 0 && (
        <EmptyState>
          Upload .w3g files to compare player fingerprints across replays.
        </EmptyState>
      )}
    </>
  );
}
