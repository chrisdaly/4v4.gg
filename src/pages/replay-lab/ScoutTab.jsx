import React, { useState, useEffect, useCallback, useRef } from "react";
import { useHistory, useLocation } from "react-router-dom";
import styled from "styled-components";
import { Input, CountryFlag } from "../../components/ui";
import PeonLoader from "../../components/PeonLoader";
import TransitionGlyph from "../../components/replay-lab/TransitionGlyph";
import PlaystyleReport from "../../components/replay-lab/PlaystyleReport";
import PersonaSplit from "../../components/replay-lab/PersonaSplit";
import { raceIcons } from "../../lib/constants";
import { getPlayerProfile } from "../../lib/api";

const RELAY_URL =
  import.meta.env.VITE_CHAT_RELAY_URL || "https://4v4gg-chat-relay.fly.dev";

const RACE_ICON_MAP = {
  Human: raceIcons.human,
  Orc: raceIcons.orc,
  "Night Elf": raceIcons.elf,
  Undead: raceIcons.undead,
  Random: raceIcons.random,
};

/** Extract clean map name from replay filename like "w3c_s12.2_Deadlock_LV" → "DeadlockLV" */
const cleanMapName = (raw) => {
  if (!raw) return null;
  // Strip w3c_ prefix, version suffixes, and season/date segments
  const name = raw
    .replace(/^w3c_/, "")
    .replace(/_v\d+(\.\d+)?$/, "")
    .replace(/^(s\d+(\.\d+)?|\d{6})_(\d+_)?/, "");
  return name.replace(/[_ ]/g, "");
};

export default function ScoutTab({ initialPlayer = null }) {
  const history = useHistory();
  const location = useLocation();

  const [allPlayers, setAllPlayers] = useState(null);
  const [selectedTag, setSelectedTag] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [personaData, setPersonaData] = useState(null);
  const [personaLoading, setPersonaLoading] = useState(false);
  const [replayList, setReplayList] = useState(null);
  const [selectedReplayId, setSelectedReplayId] = useState(null);
  const [replayProfileData, setReplayProfileData] = useState(null);
  const replayCache = useRef(new Map());
  const didAutoSelect = useRef(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [profiles, setProfiles] = useState({});
  const searchRef = useRef(null);

  // Close dropdown on outside click (same pattern as Navbar)
  useEffect(() => {
    if (!showDropdown) return;
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showDropdown]);

  // Fetch lightweight player directory on mount
  useEffect(() => {
    fetch(`${RELAY_URL}/api/fingerprints/explore/players`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.players) setAllPlayers(data.players);
      })
      .catch(() => {});
  }, []);

  // Sync player selection → URL
  const pushPlayerParam = useCallback(
    (tag) => {
      const p = new URLSearchParams(location.search);
      if (tag) p.set("player", tag);
      else p.delete("player");
      history.replace({ search: p.toString() ? `?${p}` : "" });
    },
    [history, location.search]
  );

  const selectPlayer = useCallback(
    async (battleTag) => {
      if (battleTag === selectedTag) return;
      setSelectedTag(battleTag);
      setProfileData(null);
      setPersonaData(null);
      setReplayList(null);
      setSelectedReplayId(null);
      setReplayProfileData(null);
      replayCache.current = new Map();
      setProfileLoading(true);
      setSearchQuery("");
      pushPlayerParam(battleTag);

      const tag = encodeURIComponent(battleTag);

      try {
        const profileRes = await fetch(
          `${RELAY_URL}/api/fingerprints/profile/${tag}`
        );
        if (profileRes.ok) setProfileData(await profileRes.json());
      } catch (err) {
        console.error("Profile fetch failed:", err);
      }
      setProfileLoading(false);

      // Load replay list in background
      fetch(`${RELAY_URL}/api/fingerprints/profile/${tag}/replays`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.replays) setReplayList(data.replays);
        })
        .catch(() => {});
    },
    [selectedTag, pushPlayerParam]
  );

  // Auto-select player from URL param on mount
  useEffect(() => {
    if (initialPlayer && !didAutoSelect.current) {
      didAutoSelect.current = true;
      selectPlayer(initialPlayer);
    }
  }, [initialPlayer]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const fetchReplayProfile = useCallback(
    async (replayId) => {
      if (!selectedTag) return null;
      const cached = replayCache.current.get(replayId);
      if (cached instanceof Promise) return cached;
      if (cached) return cached;

      const promise = fetch(
        `${RELAY_URL}/api/fingerprints/profile/${encodeURIComponent(selectedTag)}/replays/${replayId}`
      )
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null);

      replayCache.current.set(replayId, promise);
      const data = await promise;
      replayCache.current.set(replayId, data || false);
      return data;
    },
    [selectedTag]
  );

  const prefetchReplay = useCallback(
    (replayId) => {
      fetchReplayProfile(replayId);
    },
    [fetchReplayProfile]
  );

  const selectReplay = useCallback(
    async (replayId) => {
      if (replayId === selectedReplayId) return;
      setSelectedReplayId(replayId);
      setReplayProfileData(null);
      const data = await fetchReplayProfile(replayId);
      if (data) setReplayProfileData(data);
    },
    [selectedReplayId, fetchReplayProfile]
  );

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

  // Search suggestions
  const searchSuggestions =
    searchQuery.length >= 2 && allPlayers
      ? allPlayers
          .filter((p) => {
            const tag = p.battleTag || p.battle_tag;
            return (
              tag.toLowerCase().includes(searchQuery.toLowerCase()) &&
              tag !== selectedTag
            );
          })
          .slice(0, 8)
          .map((p) => ({
            battleTag: p.battleTag || p.battle_tag,
            race: p.race,
            replayCount: p.replayCount || p.replay_count,
          }))
      : [];

  // Show/hide dropdown based on suggestions
  useEffect(() => {
    setShowDropdown(searchSuggestions.length > 0);
  }, [searchSuggestions.length]);

  // Fire-and-forget profile fetches for search suggestions (cached in api.js)
  useEffect(() => {
    for (const p of searchSuggestions) {
      if (!profiles[p.battleTag]) {
        getPlayerProfile(p.battleTag).then((prof) => {
          setProfiles((prev) => ({ ...prev, [p.battleTag]: prof }));
        });
      }
    }
  }, [searchSuggestions.map((p) => p.battleTag).join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  const queryName = selectedTag ? selectedTag.split("#")[0] : "";
  const activeData =
    selectedReplayId && replayProfileData ? replayProfileData : profileData;

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
      {/* Search bar */}
      <SearchSection>
        <SearchInputWrap ref={searchRef}>
          <Input
            $fullWidth
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setSearchQuery("")}
            onFocus={() => searchSuggestions.length > 0 && setShowDropdown(true)}
            placeholder="Search players…"
            autoFocus={!initialPlayer}
          />
          {showDropdown && searchSuggestions.length > 0 && (
            <div className="navbar-search-dropdown">
              {searchSuggestions.map((p) => {
                const profile = profiles[p.battleTag];
                const avatarUrl = profile?.profilePicUrl;
                const country = profile?.country;
                const [name, hashNum] = p.battleTag.split("#");
                return (
                  <button
                    key={p.battleTag}
                    className="navbar-search-result"
                    onClick={() => { setShowDropdown(false); selectPlayer(p.battleTag); }}
                  >
                    <span className="navbar-search-avatar-wrap">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="" className="navbar-search-avatar" />
                      ) : RACE_ICON_MAP[p.race] ? (
                        <img src={RACE_ICON_MAP[p.race]} alt="" className="navbar-search-avatar race-fallback" />
                      ) : (
                        <span className="navbar-search-avatar placeholder" />
                      )}
                      {country && (
                        <span className="navbar-search-flag">
                          <CountryFlag name={country.toLowerCase()} style={{ width: 12, height: 9 }} />
                        </span>
                      )}
                    </span>
                    {RACE_ICON_MAP[p.race] && avatarUrl && (
                      <img src={RACE_ICON_MAP[p.race]} alt="" className="navbar-search-race" />
                    )}
                    <span className="navbar-search-info">
                      <span className="navbar-search-name-row">
                        <span className="navbar-search-name">{name}</span>
                        {hashNum && <span className="navbar-search-tag">#{hashNum}</span>}
                      </span>
                      <span className="navbar-search-meta">
                        {p.replayCount} replays
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </SearchInputWrap>
        {allPlayers && (
          <PlayerCount>{allPlayers.length} players indexed</PlayerCount>
        )}
      </SearchSection>

      {/* Player profile panel */}
      {selectedTag && (
        <ProfilePanel>
          <ProfileHeader>
            <ProfileTitle>{queryName}</ProfileTitle>
            <DismissBtn onClick={dismiss}>×</DismissBtn>
          </ProfileHeader>

          {profileLoading && (
            <div
              style={{ textAlign: "center", padding: "var(--space-6) 0" }}
            >
              <PeonLoader size="sm" subject={queryName} />
            </div>
          )}

          {!profileLoading && activeData && (
            <>
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
                  {!selectedReplayId &&
                    (personaData?.split ? (
                      <PersonaSplit personaData={personaData} />
                    ) : (
                      !personaData && (
                        <PersonaBtn
                          onClick={loadPersonas}
                          disabled={personaLoading}
                        >
                          {personaLoading
                            ? "Analyzing..."
                            : "Detect account sharing"}
                        </PersonaBtn>
                      )
                    ))}
                </>
              ) : selectedReplayId && !replayProfileData ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "var(--space-6) 0",
                  }}
                >
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
                      onClick={() => {
                        setSelectedReplayId(null);
                        setReplayProfileData(null);
                      }}
                    >
                      <ReplayAll>
                        All ({replayList.length} games)
                      </ReplayAll>
                    </ReplayRow>
                    {replayList.map((r) => {
                      const mapClean = cleanMapName(r.mapName);
                      return (
                        <ReplayRow
                          key={r.replayId}
                          $active={selectedReplayId === r.replayId}
                          onClick={() => selectReplay(r.replayId)}
                          onMouseEnter={() => prefetchReplay(r.replayId)}
                        >
                          {RACE_ICON_MAP[r.race] && (
                            <ReplayRaceIcon src={RACE_ICON_MAP[r.race]} alt={r.race} />
                          )}
                          {mapClean && (
                            <ReplayMapThumb
                              src={`/maps/${mapClean}.png`}
                              alt={mapClean}
                              onError={(e) => { e.target.style.display = "none"; }}
                            />
                          )}
                          <ReplayMapName>{mapClean || r.mapName || "—"}</ReplayMapName>
                          <ReplayDate>{fmtDate(r.matchDate)}</ReplayDate>
                          <ReplayDuration>
                            {fmtDuration(r.gameDuration)}
                          </ReplayDuration>
                        </ReplayRow>
                      );
                    })}
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

const SearchSection = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-4);
  margin-bottom: var(--space-4);
  position: relative;
  z-index: 200;
`;

const SearchInputWrap = styled.div`
  position: relative;
  flex: 1;
  max-width: 400px;
`;

const PlayerCount = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-mid);
  white-space: nowrap;
`;

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
  margin-top: var(--space-4);
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
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  cursor: pointer;
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: ${(p) => (p.$active ? "var(--gold)" : "#ccc")};
  background: ${(p) => (p.$active ? "var(--gold-tint)" : "transparent")};
  border-left: 2px solid
    ${(p) => (p.$active ? "var(--gold)" : "transparent")};
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

const ReplayRaceIcon = styled.img`
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  opacity: 0.85;
`;

const ReplayMapThumb = styled.img`
  width: 28px;
  height: 28px;
  border-radius: 3px;
  object-fit: cover;
  flex-shrink: 0;
  opacity: 0.7;
`;

const ReplayMapName = styled.span`
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ReplayDate = styled.span`
  min-width: 72px;
  color: var(--grey-mid);
`;

const ReplayDuration = styled.span`
  min-width: 44px;
  text-align: right;
`;
