import React, { useState, useEffect, useCallback, useRef } from "react";
import { useHistory, useLocation } from "react-router-dom";
import styled from "styled-components";
import PeonLoader from "../../components/PeonLoader";
import TransitionGlyph from "../../components/replay-lab/TransitionGlyph";
import EmbeddingScatter from "../../components/replay-lab/EmbeddingScatter";
import PlaystyleReport from "../../components/replay-lab/PlaystyleReport";
import PersonaSplit from "../../components/replay-lab/PersonaSplit";

const RELAY_URL =
  import.meta.env.VITE_CHAT_RELAY_URL || "https://4v4gg-chat-relay.fly.dev";

export default function ExploreTab({ initialPlayer = null }) {
  const history = useHistory();
  const location = useLocation();
  const [embeddingMap, setEmbeddingMap] = useState(null);
  const [suspects, setSuspects] = useState(null);
  const [scatterLoading, setScatterLoading] = useState(true);
  const [projectionMethod, setProjectionMethod] = useState("pca");
  const [projectionLoading, setProjectionLoading] = useState(false);

  const [selectedTag, setSelectedTag] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [personaData, setPersonaData] = useState(null);
  const [personaLoading, setPersonaLoading] = useState(false);
  const [replayList, setReplayList] = useState(null);
  const [selectedReplayId, setSelectedReplayId] = useState(null);
  const [replayProfileData, setReplayProfileData] = useState(null);
  const replayCache = useRef(new Map()); // replayId → profile (persists across clicks)
  const didAutoSelect = useRef(false);

  // Sync player selection → URL
  const pushPlayerParam = useCallback((tag) => {
    const p = new URLSearchParams(location.search);
    if (tag) p.set("player", tag); else p.delete("player");
    history.replace({ search: p.toString() ? `?${p}` : "" });
  }, [history, location.search]);

  const [allPlayers, setAllPlayers] = useState(null);

  // Fetch scatter data + full player directory on mount
  useEffect(() => {
    Promise.all([
      fetch(`${RELAY_URL}/api/fingerprints/embedding-map`).then(r => r.ok ? r.json() : null),
      fetch(`${RELAY_URL}/api/fingerprints/suspects?limit=50`).then(r => r.ok ? r.json() : null),
      fetch(`${RELAY_URL}/api/fingerprints/explore/players`).then(r => r.ok ? r.json() : null),
    ]).then(([map, sus, dir]) => {
      setEmbeddingMap(map);
      setSuspects(sus);
      setAllPlayers(dir?.players || null);
      setScatterLoading(false);
    }).catch(() => setScatterLoading(false));
  }, []);

  const handleMethodChange = useCallback(async (method) => {
    if (method === projectionMethod) return;
    setProjectionMethod(method);
    setProjectionLoading(true);
    try {
      const res = await fetch(`${RELAY_URL}/api/fingerprints/embedding-map?method=${method}`);
      if (res.ok) {
        setEmbeddingMap(await res.json());
      }
    } catch (err) {
      console.error("Projection fetch failed:", err);
    }
    setProjectionLoading(false);
  }, [projectionMethod]);

  // Auto-select player from URL param on mount
  useEffect(() => {
    if (initialPlayer && !didAutoSelect.current) {
      didAutoSelect.current = true;
      selectPlayer(initialPlayer);
    }
  }, [initialPlayer]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectPlayer = useCallback(async (battleTag) => {
    if (battleTag === selectedTag) return;
    setSelectedTag(battleTag);
    setProfileData(null);
    setPersonaData(null);
    setReplayList(null);
    setSelectedReplayId(null);
    setReplayProfileData(null);
    replayCache.current = new Map();
    setProfileLoading(true);
    pushPlayerParam(battleTag);

    const tag = encodeURIComponent(battleTag);

    // Show profile immediately — don't wait for personas/replays
    try {
      const profileRes = await fetch(`${RELAY_URL}/api/fingerprints/profile/${tag}`);
      if (profileRes.ok) setProfileData(await profileRes.json());
    } catch (err) {
      console.error("Profile fetch failed:", err);
    }
    setProfileLoading(false);

    // Load replay list in background (non-blocking)
    fetch(`${RELAY_URL}/api/fingerprints/profile/${tag}/replays`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.replays) setReplayList(data.replays); })
      .catch(() => {});
  }, [selectedTag, pushPlayerParam]);

  const loadPersonas = useCallback(async () => {
    if (!selectedTag || personaData || personaLoading) return;
    setPersonaLoading(true);
    try {
      const res = await fetch(
        `${RELAY_URL}/api/fingerprints/profile/${encodeURIComponent(selectedTag)}/personas`
      );
      if (res.ok) setPersonaData(await res.json());
    } catch (err) {
      console.error("Personas fetch failed:", err);
    }
    setPersonaLoading(false);
  }, [selectedTag, personaData, personaLoading]);

  // Fetch a replay profile into cache (used by both hover and click)
  // Stores the Promise so concurrent callers can await the same in-flight request
  const fetchReplayProfile = useCallback(async (replayId) => {
    if (!selectedTag) return null;
    const cached = replayCache.current.get(replayId);
    if (cached instanceof Promise) return cached;  // already in-flight
    if (cached) return cached;                      // already resolved

    const promise = fetch(
      `${RELAY_URL}/api/fingerprints/profile/${encodeURIComponent(selectedTag)}/replays/${replayId}`
    ).then(res => res.ok ? res.json() : null).catch(() => null);

    replayCache.current.set(replayId, promise); // store promise so hover + click share it
    const data = await promise;
    replayCache.current.set(replayId, data || false); // replace promise with result (false = failed)
    return data;
  }, [selectedTag]);

  const prefetchReplay = useCallback((replayId) => {
    fetchReplayProfile(replayId);
  }, [fetchReplayProfile]);

  const selectReplay = useCallback(async (replayId) => {
    if (replayId === selectedReplayId) return;
    setSelectedReplayId(replayId);
    setReplayProfileData(null);
    const data = await fetchReplayProfile(replayId);
    if (data) setReplayProfileData(data);
  }, [selectedReplayId, fetchReplayProfile]);

  const dismiss = useCallback(() => {
    setSelectedTag(null);
    setProfileData(null);
    setPersonaData(null);
    setPersonaLoading(false);
    setReplayList(null);
    setSelectedReplayId(null);
    setReplayProfileData(null);
    replayCache.current = new Map();
    pushPlayerParam(null);
  }, [pushPlayerParam]);

  const queryName = selectedTag ? selectedTag.split("#")[0] : "";
  const activeData = selectedReplayId && replayProfileData ? replayProfileData : profileData;

  const fmtDuration = (s) => {
    if (!s) return "—";
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  const fmtDate = (d) => {
    if (!d) return "—";
    return d.slice(0, 10);
  };

  return (
    <>
      {/* Scatter — always visible as the hero */}
      {scatterLoading ? (
        <div className="page-loader" style={{ minHeight: "60vh" }}>
          <PeonLoader />
        </div>
      ) : (
        <EmbeddingScatter
          mapData={embeddingMap}
          highlightTags={selectedTag ? [selectedTag] : []}
          suspects={suspects}
          onSelectPlayer={selectPlayer}
          allPlayers={allPlayers}
          hideSuspects
          projectionMethod={projectionMethod}
          onMethodChange={handleMethodChange}
          projectionLoading={projectionLoading}
        />
      )}

      {/* Player profile panel — slides in below scatter when selected */}
      {selectedTag && (
        <ProfilePanel>
          <ProfileHeader>
            <ProfileTitle>{queryName}</ProfileTitle>
            <DismissBtn onClick={dismiss}>×</DismissBtn>
          </ProfileHeader>

          {profileLoading && (
            <div style={{ textAlign: "center", padding: "var(--space-6) 0" }}>
              <PeonLoader size="sm" subject={queryName} />
            </div>
          )}

          {!profileLoading && activeData && (
            <>
              {/* Transition glyph + scouting report — side by side */}
              {activeData.averaged?.segments ? (
                <>
                  <ProfileGrid>
                    <ArtCard>
                      <TransitionGlyph
                        transitionPairs={activeData.transitionPairs}
                        groupUsage={activeData.groupUsage}
                        groupCompositions={activeData.groupCompositions}
                        segments={activeData.averaged.segments}
                        playerName={selectedTag}
                        replayCount={activeData.replayCount}
                      />
                    </ArtCard>
                    <PlaystyleReport profileData={activeData} />
                  </ProfileGrid>
                  {!selectedReplayId && (
                    personaData?.split ? (
                      <PersonaSplit personaData={personaData} />
                    ) : !personaData && (
                      <PersonaBtn onClick={loadPersonas} disabled={personaLoading}>
                        {personaLoading ? "Analyzing..." : "Detect account sharing"}
                      </PersonaBtn>
                    )
                  )}
                </>
              ) : selectedReplayId && !replayProfileData ? (
                <div style={{ textAlign: "center", padding: "var(--space-6) 0" }}>
                  <PeonLoader size="sm" />
                </div>
              ) : null}

              {/* Replay list */}
              {replayList && replayList.length > 0 && (
                <ReplayListSection>
                  <ReplayListHeader>Replays</ReplayListHeader>
                  <ReplayListScroll>
                    <ReplayRow
                      $active={!selectedReplayId}
                      onClick={() => { setSelectedReplayId(null); setReplayProfileData(null); }}
                    >
                      <ReplayAll>All ({replayList.length} games)</ReplayAll>
                    </ReplayRow>
                    {replayList.map((r) => (
                      <ReplayRow
                        key={r.replayId}
                        $active={selectedReplayId === r.replayId}
                        onClick={() => selectReplay(r.replayId)}
                        onMouseEnter={() => prefetchReplay(r.replayId)}
                      >
                        <ReplayDate>{fmtDate(r.matchDate)}</ReplayDate>
                        <ReplayMap>{r.mapName || "—"}</ReplayMap>
                        <ReplayDuration>{fmtDuration(r.gameDuration)}</ReplayDuration>
                        <ReplayRace>{r.race || "—"}</ReplayRace>
                      </ReplayRow>
                    ))}
                  </ReplayListScroll>
                </ReplayListSection>
              )}
            </>
          )}

          {!profileLoading && !profileData && selectedTag && (
            <NoData>No fingerprint data found for {queryName}.</NoData>
          )}
        </ProfilePanel>
      )}
    </>
  );
}

// ── Styled Components ──────────────────────────────────

const PersonaBtn = styled.button`
  display: block;
  margin: var(--space-4) auto 0;
  padding: var(--space-2) var(--space-6);
  font: var(--text-xxs) var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--grey-light);
  background: transparent;
  border: var(--border-thin) solid var(--grey-mid);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    color: var(--gold);
    border-color: var(--gold);
  }

  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`;

const ProfilePanel = styled.div`
  margin-top: var(--space-6);
  padding: var(--space-6) 0;
  border-top: var(--border-thin) solid var(--grey-mid);
  animation: reveal-up 600ms cubic-bezier(0.17, 0.76, 0.28, 1) both;
  animation-delay: 0.1s;

  @keyframes reveal-up {
    from {
      opacity: 0;
      transform: translateY(18px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const ProfileGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
  gap: var(--space-6);
  align-items: start;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    gap: var(--space-4);
  }
`;

const ProfileHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-6);
  padding-bottom: var(--space-2);
  border-bottom: var(--border-thin) solid rgba(255, 255, 255, 0.06);
`;

const ProfileTitle = styled.div`
  font-family: var(--font-display);
  font-size: var(--text-xl);
  color: var(--gold);
  text-shadow: 0 2px 16px rgba(0, 0, 0, 0.8);
`;

const DismissBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  font-family: var(--font-mono);
  font-size: var(--text-lg);
  color: var(--grey-light);
  background: rgba(255, 255, 255, 0.04);
  border: var(--border-thin) solid var(--grey-mid);
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: all 0.2s ease;
  line-height: 1;

  &:hover {
    color: var(--red);
    background: var(--red-tint);
    border-color: var(--red);
    transform: scale(1.05);
  }
`;

const ArtCard = styled.div`
  background: var(--surface-1);
  border: var(--border-thin) solid var(--grey-mid);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: border-color 0.2s ease;

  &:hover {
    border-color: var(--gold);
  }

  svg {
    width: 100%;
    height: auto;
    max-width: 480px;
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

const ReplayListSection = styled.div`
  margin-top: var(--space-6);
`;

const ReplayListHeader = styled.div`
  font: var(--text-xs) var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--grey-light);
  margin-bottom: var(--space-2);
`;

const ReplayListScroll = styled.div`
  max-height: 280px;
  overflow-y: auto;
  border: var(--border-thin) solid var(--grey-mid);
  border-radius: var(--radius-md);
  background: var(--surface-1);
`;

const ReplayRow = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-2) var(--space-4);
  cursor: pointer;
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: ${(p) => (p.$active ? "var(--gold)" : "#ccc")};
  background: ${(p) => (p.$active ? "var(--gold-tint)" : "transparent")};
  border-left: 2px solid ${(p) => (p.$active ? "var(--gold)" : "transparent")};
  transition: all 0.15s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.04);
    color: #fff;
  }

  & + & {
    border-top: 1px solid rgba(255, 255, 255, 0.04);
  }
`;

const ReplayAll = styled.span`
  font-family: var(--font-display);
  font-size: var(--text-xs);
`;

const ReplayDate = styled.span`
  min-width: 80px;
`;

const ReplayMap = styled.span`
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ReplayDuration = styled.span`
  min-width: 48px;
  text-align: right;
`;

const ReplayRace = styled.span`
  min-width: 48px;
  text-transform: capitalize;
`;
