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

  const [selectedTag, setSelectedTag] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [personaData, setPersonaData] = useState(null);
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
    setProfileLoading(true);
    pushPlayerParam(battleTag);
    try {
      const [profileRes, personasRes] = await Promise.all([
        fetch(`${RELAY_URL}/api/fingerprints/profile/${encodeURIComponent(battleTag)}`),
        fetch(`${RELAY_URL}/api/fingerprints/profile/${encodeURIComponent(battleTag)}/personas`),
      ]);
      if (profileRes.ok) setProfileData(await profileRes.json());
      if (personasRes.ok) setPersonaData(await personasRes.json());
    } catch (err) {
      console.error("Explore fetch failed:", err);
    }
    setProfileLoading(false);
  }, [selectedTag, pushPlayerParam]);

  const dismiss = useCallback(() => {
    setSelectedTag(null);
    setProfileData(null);
    setPersonaData(null);
    pushPlayerParam(null);
  }, [pushPlayerParam]);

  const queryName = selectedTag ? selectedTag.split("#")[0] : "";

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

          {!profileLoading && profileData && (
            <>
              {/* Transition glyph + scouting report — side by side */}
              {profileData.averaged?.segments && (
                <>
                  <ProfileGrid>
                    <ArtCard>
                      <TransitionGlyph
                        transitionPairs={profileData.transitionPairs}
                        groupUsage={profileData.groupUsage}
                        groupCompositions={profileData.groupCompositions}
                        segments={profileData.averaged.segments}
                        playerName={selectedTag}
                        replayCount={profileData.confidence?.replayCount}
                      />
                    </ArtCard>
                    <PlaystyleReport profileData={profileData} />
                  </ProfileGrid>
                  {personaData?.split && <PersonaSplit personaData={personaData} />}
                </>
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
  grid-template-columns: 1fr 1fr;
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
    max-width: 320px;
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
