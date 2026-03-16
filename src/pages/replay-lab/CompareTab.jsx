import React, { useState, useCallback, useReducer, useMemo, useEffect } from "react";
import styled from "styled-components";
import { FiX } from "react-icons/fi";
import { useReplayLabStore, useReplayUpload } from "../../lib/useReplayLabStore";
import { Button } from "../../components/ui";
import SimilarityMatrix from "../../components/replay-lab/SimilarityMatrix";
import ComparisonPanel from "../../components/replay-lab/ComparisonPanel";
import TransitionGlyph from "../../components/replay-lab/TransitionGlyph";
import PlaystyleReport from "../../components/replay-lab/PlaystyleReport";
import PeonLoader from "../../components/PeonLoader";
import { raceIcons } from "../../lib/constants";
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
  MergedGrid,
} from "./shared-styles";

const RELAY_URL =
  import.meta.env.VITE_CHAT_RELAY_URL || "https://4v4gg-chat-relay.fly.dev";

const RACE_ICON_MAP = {
  Human: raceIcons.human,
  human: raceIcons.human,
  Orc: raceIcons.orc,
  orc: raceIcons.orc,
  "Night Elf": raceIcons.elf,
  "night elf": raceIcons.elf,
  NightElf: raceIcons.elf,
  nightelf: raceIcons.elf,
  Undead: raceIcons.undead,
  undead: raceIcons.undead,
  Random: raceIcons.random,
  random: raceIcons.random,
};

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
  const [replayProfiles, setReplayProfiles] = useState({});
  const [profilesLoading, setProfilesLoading] = useState({});

  // ── Fetch replay profiles from server ─────────
  useEffect(() => {
    for (const r of replays) {
      if (replayProfiles[r.id] || profilesLoading[r.id]) continue;
      setProfilesLoading((prev) => ({ ...prev, [r.id]: true }));
      fetch(`${RELAY_URL}/api/fingerprints/replay/${r.id}/profiles`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.profiles) {
            setReplayProfiles((prev) => ({ ...prev, [r.id]: data.profiles }));
          }
        })
        .catch(() => {})
        .finally(() => {
          setProfilesLoading((prev) => ({ ...prev, [r.id]: false }));
        });
    }
  }, [replays]);

  const removeReplay = useCallback(
    (replayId) => {
      setReplays((prev) => prev.filter((r) => r.id !== replayId));
      setSelectedCell(null);
      setReplayProfiles((prev) => {
        const next = { ...prev };
        delete next[replayId];
        return next;
      });
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

    // Find server-side profiles for the two players
    const profilesA = replayProfiles[pA.replayId];
    const profilesB = replayProfiles[pB.replayId];
    const profileA = profilesA?.find((p) => p.playerId === pA.playerId);
    const profileB = profilesB?.find((p) => p.playerId === pB.playerId);

    return { pA, pB, sim, breakdown, profileA, profileB };
  }, [selectedCell, allPlayers, replayProfiles]);

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

  const hasAnyProfiles = replays.some((r) => replayProfiles[r.id]?.length > 0);
  const anyLoading = replays.some((r) => profilesLoading[r.id]);

  return (
    <>
      {/* Drop zone */}
      <Section>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-4)" }}>
          <SectionTitle style={{ marginBottom: 0 }}>Upload Replays</SectionTitle>
          {replays.length > 0 && (
            <Button $secondary onClick={() => { clearSession(); dispatchMerge({ type: "RESET" }); setSelectedCell(null); setReplayProfiles({}); }} style={{ fontSize: "10px", padding: "3px 10px" }}>
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

      {/* Replay Signatures */}
      {replays.length > 0 && (hasAnyProfiles || anyLoading) && (
        <Section>
          <SectionTitle>Replay Signatures</SectionTitle>
          {replays.map((r) => {
            const profiles = replayProfiles[r.id];
            const loading = profilesLoading[r.id];
            if (!profiles && !loading) return null;

            // Split into teams
            const team1 = profiles?.filter((p) => p.teamId === 0) || [];
            const team2 = profiles?.filter((p) => p.teamId === 1) || [];

            return (
              <ReplaySignatureBlock key={r.id}>
                <ReplaySignatureTitle>
                  {replayLabels[r.id]}: {r.filename}
                </ReplaySignatureTitle>
                {loading && !profiles ? (
                  <PeonLoader size="sm" />
                ) : (
                  <>
                    {[team1, team2].map((team, teamIdx) => (
                      team.length > 0 && (
                        <PlayerGrid key={teamIdx} $count={team.length}>
                          {team.map((p) => (
                            <PlayerCard key={p.playerId}>
                              <PlayerCardHeader>
                                {RACE_ICON_MAP[p.race] && (
                                  <RaceImg src={RACE_ICON_MAP[p.race]} alt={p.race} />
                                )}
                                <PlayerCardName>
                                  {p.playerName?.split("#")[0] || `Player ${p.playerId}`}
                                </PlayerCardName>
                              </PlayerCardHeader>
                              <GlyphWrap>
                                <TransitionGlyph
                                  mini
                                  transitionPairs={p.profileData.transitionPairs}
                                  groupUsage={p.profileData.groupUsage}
                                  groupCompositions={p.profileData.groupCompositions}
                                  segments={p.profileData.averaged?.segments}
                                />
                              </GlyphWrap>
                              <PlaystyleReport profileData={p.profileData} />
                            </PlayerCard>
                          ))}
                        </PlayerGrid>
                      )
                    ))}
                  </>
                )}
              </ReplaySignatureBlock>
            );
          })}
        </Section>
      )}

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

              {/* Side-by-side signature comparison */}
              {(cellDetail.profileA || cellDetail.profileB) && (
                <CompareSignatures>
                  {[
                    { profile: cellDetail.profileA, player: cellDetail.pA },
                    { profile: cellDetail.profileB, player: cellDetail.pB },
                  ].map(({ profile, player }) => (
                    <CompareColumn key={player.uid}>
                      <CompareColumnLabel>
                        {player.playerName?.split("#")[0]} ({replayLabels[player.replayId]})
                      </CompareColumnLabel>
                      {profile ? (
                        <>
                          <GlyphWrap>
                            <TransitionGlyph
                              mini
                              transitionPairs={profile.profileData.transitionPairs}
                              groupUsage={profile.profileData.groupUsage}
                              groupCompositions={profile.profileData.groupCompositions}
                              segments={profile.profileData.averaged?.segments}
                            />
                          </GlyphWrap>
                          <PlaystyleReport profileData={profile.profileData} />
                        </>
                      ) : (
                        <EmptyState style={{ padding: "var(--space-4)" }}>
                          No profile data
                        </EmptyState>
                      )}
                    </CompareColumn>
                  ))}
                </CompareSignatures>
              )}
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

// ── Styled Components ────────────────────────────

const ReplaySignatureBlock = styled.div`
  margin-bottom: var(--space-6);
  padding: var(--space-4);
  border: 1px solid var(--grey-mid);
  border-radius: var(--radius-md);
  background: var(--surface-1);
`;

const ReplaySignatureTitle = styled.div`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
  margin-bottom: var(--space-4);
`;

const PlayerGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(${(p) => Math.min(p.$count, 4)}, 1fr);
  gap: var(--space-4);
  margin-bottom: var(--space-4);

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 500px) {
    grid-template-columns: 1fr;
  }
`;

const PlayerCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
`;

const PlayerCardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding-bottom: var(--space-1);
`;

const RaceImg = styled.img`
  width: 20px;
  height: 20px;
  object-fit: contain;
`;

const PlayerCardName = styled.span`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
`;

const GlyphWrap = styled.div`
  max-width: 240px;
  margin: 0 auto;
`;

const CompareSignatures = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-6);
  margin-top: var(--space-4);

  @media (max-width: 700px) {
    grid-template-columns: 1fr;
  }
`;

const CompareColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
`;

const CompareColumnLabel = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--grey-light);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: var(--space-1);
`;
