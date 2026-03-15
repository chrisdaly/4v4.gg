import React, { useState, useEffect, useCallback, useRef } from "react";
import { useHistory, useLocation } from "react-router-dom";
import styled from "styled-components";
import { Input, CountryFlag } from "../../components/ui";
import PeonLoader from "../../components/PeonLoader";
import TransitionGlyph from "../../components/replay-lab/TransitionGlyph";
import PlaystyleReport from "../../components/replay-lab/PlaystyleReport";
import PersonaSplit from "../../components/replay-lab/PersonaSplit";
import { DropZone, DropLabel, DropIcon } from "./shared-styles";
import { raceIcons } from "../../lib/constants";
import { getPlayerProfile } from "../../lib/api";

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

export default function ScoutTab({ initialPlayer = null, initialProfileData = null, embedded = false }) {
  const history = useHistory();
  const location = useLocation();

  const [allPlayers, setAllPlayers] = useState(null);
  const [selectedTag, setSelectedTag] = useState(initialPlayer);
  const [profileData, setProfileData] = useState(initialProfileData);
  const [profileLoading, setProfileLoading] = useState(false);
  const [personaData, setPersonaData] = useState(null);
  const [personaLoading, setPersonaLoading] = useState(false);
  const [replayList, setReplayList] = useState(null);
  const [selectedReplayId, setSelectedReplayId] = useState(null);
  const [replayProfileData, setReplayProfileData] = useState(null);
  const [cacheVersion, setCacheVersion] = useState(0); // trigger re-render when cache updates
  const replayCache = useRef(new Map());
  const didAutoSelect = useRef(false);
  const replayListRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [profiles, setProfiles] = useState({});
  const searchRef = useRef(null);

  // W3C fallback search
  const [w3cResults, setW3cResults] = useState([]);
  const [w3cSearching, setW3cSearching] = useState(false);
  const w3cDebounce = useRef(null);

  // Import state
  const [importStatus, setImportStatus] = useState(null); // null | 'importing' | 'done' | 'error'
  const [importResult, setImportResult] = useState(null);

  // Upload state
  const [uploadStatus, setUploadStatus] = useState(null); // null | 'uploading' | 'done' | 'error'
  const [uploadResult, setUploadResult] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileRef = useRef(null);

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
      setImportStatus(null);
      setImportResult(null);
      setUploadStatus(null);
      setUploadResult(null);
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
      // If we have pre-fetched profile data, just load the replay list
      if (initialProfileData) {
        const tag = encodeURIComponent(initialPlayer);
        fetch(`${RELAY_URL}/api/fingerprints/profile/${tag}/replays`)
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            if (data?.replays) setReplayList(data.replays);
          })
          .catch(() => {});
      } else {
        selectPlayer(initialPlayer);
      }
    }
  }, [initialPlayer, initialProfileData]); // eslint-disable-line react-hooks/exhaustive-deps

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
      setCacheVersion(v => v + 1); // trigger re-render to show stats
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

      // Check cache first - if we have data, set it immediately without clearing
      const cached = replayCache.current.get(replayId);
      if (cached && !(cached instanceof Promise)) {
        setSelectedReplayId(replayId);
        setReplayProfileData(cached);
        return;
      }

      // Not cached - need to fetch
      setSelectedReplayId(replayId);
      setReplayProfileData(null);
      const data = await fetchReplayProfile(replayId);
      if (data) setReplayProfileData(data);
    },
    [selectedReplayId, fetchReplayProfile]
  );

  const handleImport = useCallback(async () => {
    if (!selectedTag || importStatus === 'importing') return;
    const tag = selectedTag;
    setImportStatus('importing');
    setImportResult(null);
    try {
      const res = await fetch(`${RELAY_URL}/api/fingerprints/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ battleTag: tag }),
      });
      const data = await res.json();
      if (!res.ok) {
        setImportStatus('error');
        setImportResult(data.error || 'Import failed');
        return;
      }
      setImportResult(data);
      setImportStatus('done');
      if (data.imported > 0) {
        // Re-fetch profile now that data exists
        setSelectedTag(null); // force selectPlayer to re-run
        setTimeout(() => selectPlayer(tag), 300);
      }
    } catch (err) {
      setImportStatus('error');
      setImportResult(err.message);
    }
  }, [selectedTag, importStatus, selectPlayer]);

  const handleUpload = useCallback(async (file) => {
    if (!file || uploadStatus === 'uploading') return;
    setUploadStatus('uploading');
    setUploadResult(null);
    try {
      const form = new FormData();
      form.append('replay', file);
      const res = await fetch(`${RELAY_URL}/api/fingerprints/upload`, {
        method: 'POST',
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        setUploadStatus('error');
        setUploadResult(data.error || data.detail || 'Upload failed');
        return;
      }
      setUploadResult(data);
      setUploadStatus('done');
      // If a player is selected and they're in this replay, refresh their profile
      if (selectedTag && data.players) {
        const match = data.players.find(p => p.battleTag === selectedTag);
        if (match) {
          setSelectedTag(null);
          setTimeout(() => selectPlayer(selectedTag), 300);
        }
      }
    } catch (err) {
      setUploadStatus('error');
      setUploadResult(err.message);
    }
  }, [uploadStatus, selectedTag, selectPlayer]);

  const handleFileDrop = useCallback((e) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleUpload(file);
  }, [handleUpload]);

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = '';
  }, [handleUpload]);

  const dismiss = useCallback(() => {
    setSelectedTag(null);
    setProfileData(null);
    setPersonaData(null);
    setPersonaLoading(false);
    setReplayList(null);
    setSelectedReplayId(null);
    setReplayProfileData(null);
    setImportStatus(null);
    setImportResult(null);
    setUploadStatus(null);
    setUploadResult(null);
    replayCache.current = new Map();
    pushPlayerParam(null);
  }, [pushPlayerParam]);

  // W3C fallback search when local results are sparse
  useEffect(() => {
    clearTimeout(w3cDebounce.current);
    setW3cResults([]);
    setW3cSearching(false);
    if (searchQuery.length < 3) return;

    // Count local matches to decide if we need W3C fallback
    const localCount = allPlayers
      ? allPlayers.filter((p) => {
          const tag = p.battleTag || p.battle_tag;
          return tag.toLowerCase().includes(searchQuery.toLowerCase()) && tag !== selectedTag;
        }).length
      : 0;

    if (localCount >= 2) return;

    w3cDebounce.current = setTimeout(async () => {
      setW3cSearching(true);
      try {
        const res = await fetch(
          `${RELAY_URL}/api/fingerprints/search-w3c?q=${encodeURIComponent(searchQuery)}`
        );
        if (res.ok) {
          const data = await res.json();
          // Filter out players already in local index
          const localTags = new Set((allPlayers || []).map((p) => p.battleTag || p.battle_tag));
          setW3cResults(
            (data.players || []).filter((p) => !localTags.has(p.battleTag))
          );
        }
      } catch { /* ignore */ }
      setW3cSearching(false);
    }, 500);

    return () => clearTimeout(w3cDebounce.current);
  }, [searchQuery, allPlayers, selectedTag]);

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

  // Show/hide dropdown based on suggestions + W3C results
  useEffect(() => {
    setShowDropdown(searchSuggestions.length > 0 || w3cResults.length > 0 || w3cSearching);
  }, [searchSuggestions.length, w3cResults.length, w3cSearching]);

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

  // Get cached stats for a replay (APM, groups count, actual race)
  const getCachedStats = (replayId) => {
    const cached = replayCache.current.get(replayId);
    if (!cached || cached instanceof Promise) return null;

    // APM: segments.apm[0] * 300
    const segments = cached.averaged?.segments;
    const apmRaw = segments?.apm?.[0];
    const apm = apmRaw != null ? Math.round(apmRaw * 300) : null;

    // Groups: count active groups from groupUsage
    const groupUsage = cached.groupUsage || [];
    const activeGroups = groupUsage.filter(g => (g.used + g.assigned) > 0);
    const groupsUsed = activeGroups.length > 0 ? activeGroups.length : null;

    // Actual race played (for random players) - race is nested in replay object from API
    const actualRace = cached.replay?.race || null;

    return { apm, groupsUsed, actualRace };
  };

  // Keyboard navigation for replay list
  useEffect(() => {
    if (!replayList || replayList.length === 0) return;

    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;

      e.preventDefault();
      const currentIdx = selectedReplayId
        ? replayList.findIndex(r => r.replayId === selectedReplayId)
        : -1;

      let newIdx;
      if (e.key === 'ArrowDown') {
        newIdx = currentIdx < replayList.length - 1 ? currentIdx + 1 : 0;
      } else {
        newIdx = currentIdx > 0 ? currentIdx - 1 : replayList.length - 1;
      }

      const newReplay = replayList[newIdx];
      if (newReplay) {
        selectReplay(newReplay.replayId);
        // Scroll into view
        const row = replayListRef.current?.querySelector(`[data-replay-id="${newReplay.replayId}"]`);
        row?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [replayList, selectedReplayId, selectReplay]);

  return (
    <>
      {/* Search bar - hidden in embedded mode */}
      {!embedded && (
      <SearchSection>
        <SearchInputWrap ref={searchRef}>
          <Input
            $fullWidth
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setSearchQuery("")}
            onFocus={() => (searchSuggestions.length > 0 || w3cResults.length > 0) && setShowDropdown(true)}
            placeholder="Search players…"
            autoFocus={!initialPlayer}
          />
          {showDropdown && (searchSuggestions.length > 0 || w3cResults.length > 0 || w3cSearching) && (
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
              {/* W3C fallback results */}
              {w3cResults.length > 0 && (
                <>
                  {searchSuggestions.length > 0 && <DropdownDivider />}
                  {w3cResults.map((p) => {
                    const [name, hashNum] = p.battleTag.split("#");
                    return (
                      <button
                        key={`w3c-${p.battleTag}`}
                        className="navbar-search-result"
                        onClick={() => { setShowDropdown(false); selectPlayer(p.battleTag); }}
                      >
                        <span className="navbar-search-avatar-wrap">
                          {RACE_ICON_MAP[p.race] ? (
                            <img src={RACE_ICON_MAP[p.race]} alt="" className="navbar-search-avatar race-fallback" />
                          ) : (
                            <span className="navbar-search-avatar placeholder" />
                          )}
                        </span>
                        <span className="navbar-search-info">
                          <span className="navbar-search-name-row">
                            <span className="navbar-search-name">{name}</span>
                            {hashNum && <span className="navbar-search-tag">#{hashNum}</span>}
                            <W3cBadge>not indexed</W3cBadge>
                          </span>
                          <span className="navbar-search-meta">
                            {p.games} games{p.mmr ? ` · ${p.mmr} MMR` : ''}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </>
              )}
              {w3cSearching && (
                <SearchingHint>Searching W3Champions...</SearchingHint>
              )}
            </div>
          )}
        </SearchInputWrap>
        {allPlayers && (
          <PlayerCount>{allPlayers.length} players indexed</PlayerCount>
        )}
      </SearchSection>
      )}

      {/* Player profile panel */}
      {selectedTag && (
        <ProfilePanel $embedded={embedded}>
          {!embedded && (
            <ProfileHeader>
              <ProfileTitle>{queryName}</ProfileTitle>
              <DismissBtn onClick={dismiss}>×</DismissBtn>
            </ProfileHeader>
          )}

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
                  {!embedded && !selectedReplayId &&
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

              {/* Replay list - cacheVersion={cacheVersion} triggers re-render for stats */}
              {replayList && replayList.length > 0 && (
                <ReplayListSection>
                  <ReplayListHeader>Replays</ReplayListHeader>
                  <ReplayListScroll ref={replayListRef}>
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
                      const stats = getCachedStats(r.replayId);
                      // Show actual race with random badge if they queued random
                      const isRandom = r.race?.toLowerCase() === 'random';
                      const actualRace = stats?.actualRace;
                      const displayRace = actualRace || r.race;
                      return (
                        <ReplayRow
                          key={r.replayId}
                          data-replay-id={r.replayId}
                          $active={selectedReplayId === r.replayId}
                          onClick={() => selectReplay(r.replayId)}
                          onMouseEnter={() => prefetchReplay(r.replayId)}
                        >
                          {isRandom && actualRace && RACE_ICON_MAP[actualRace] ? (
                            <span className="rnd-race-wrapper">
                              <ReplayRaceIcon src={RACE_ICON_MAP[actualRace]} alt={actualRace} />
                              <img src={RACE_ICON_MAP.Random} alt="random" className="rnd-badge-icon" />
                            </span>
                          ) : RACE_ICON_MAP[displayRace] ? (
                            <ReplayRaceIcon src={RACE_ICON_MAP[displayRace]} alt={displayRace} />
                          ) : RACE_ICON_MAP[r.race] && (
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
                          <ReplayStat $dim={!stats}>
                            {stats?.apm ?? "—"}
                            <span className="label">APM</span>
                          </ReplayStat>
                          <ReplayStat $dim={!stats}>
                            {stats?.groupsUsed ?? "—"}
                            <span className="label">GRP</span>
                          </ReplayStat>
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
            <NoData>
              {importStatus === 'importing' ? (
                <PeonLoader size="sm" subject={queryName} />
              ) : importStatus === 'done' && importResult ? (
                importResult.imported > 0 ? (
                  <span>Imported {importResult.imported} replays — loading profile...</span>
                ) : importResult.discovered === 0 ? (
                  <span>No 4v4 matches found for this player.</span>
                ) : importResult.noReplay > 0 ? (
                  <span>
                    Searched {importResult.discovered} matches — replay files not available on W3C. This is normal.
                    {importResult.filteredShort > 0 && ` (${importResult.filteredShort} short games skipped)`}
                  </span>
                ) : importResult.alreadyImported > 0 ? (
                  <span>
                    All {importResult.alreadyImported} recent matches already imported.
                    {importResult.filteredShort > 0 && ` (${importResult.filteredShort} short games skipped)`}
                  </span>
                ) : (
                  <span>
                    No new replays could be processed.
                    {importResult.filteredShort > 0 && ` (${importResult.filteredShort} short games skipped)`}
                  </span>
                )
              ) : importStatus === 'error' ? (
                <>
                  <span>Import failed: {typeof importResult === 'string' ? importResult : 'Unknown error'}</span>
                  <ImportBtn onClick={handleImport} style={{ marginTop: 'var(--space-2)' }}>
                    Retry import
                  </ImportBtn>
                </>
              ) : (
                <>
                  <span>No data yet for {queryName}</span>
                  <ImportBtn onClick={handleImport}>
                    Import replays
                  </ImportBtn>
                </>
              )}

              {/* Upload drop zone — always visible as fallback */}
              <UploadSection>
                {uploadStatus === 'uploading' ? (
                  <PeonLoader size="sm" />
                ) : uploadStatus === 'done' && uploadResult ? (
                  <UploadResultBox>
                    {uploadResult.duplicate ? (
                      <span>Replay already imported.</span>
                    ) : (
                      <span>Replay processed!</span>
                    )}
                    {uploadResult.players && uploadResult.players.length > 0 && (
                      <UploadPlayerList>
                        {uploadResult.players.map((p, i) => (
                          <UploadPlayerBtn
                            key={i}
                            onClick={() => { if (p.battleTag) selectPlayer(p.battleTag); }}
                            $clickable={!!p.battleTag}
                          >
                            {p.playerName}{p.race ? ` (${p.race})` : ''}
                          </UploadPlayerBtn>
                        ))}
                      </UploadPlayerList>
                    )}
                  </UploadResultBox>
                ) : uploadStatus === 'error' ? (
                  <UploadResultBox>
                    <span style={{ color: 'var(--red)' }}>
                      Upload failed: {typeof uploadResult === 'string' ? uploadResult : 'Unknown error'}
                    </span>
                  </UploadResultBox>
                ) : null}

                {uploadStatus !== 'uploading' && (
                  <CompactDropZone
                    $active={dragActive}
                    onDrop={handleFileDrop}
                    onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                    onDragLeave={() => setDragActive(false)}
                    onClick={() => fileRef.current?.click()}
                  >
                    <DropIcon size={18} $active={dragActive} />
                    <DropLabel $active={dragActive} style={{ marginTop: 'var(--space-1)' }}>
                      {dragActive ? 'Drop .w3g file here' : 'or drop a .w3g file'}
                    </DropLabel>
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".w3g"
                      style={{ display: 'none' }}
                      onChange={handleFileSelect}
                    />
                  </CompactDropZone>
                )}
              </UploadSection>
            </NoData>
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
  margin-top: ${(p) => p.$embedded ? '0' : 'var(--space-4)'};
  padding: ${(p) => p.$embedded ? '0' : 'var(--space-6) 0'};
  border-top: ${(p) => p.$embedded ? 'none' : 'var(--border-thin) solid var(--grey-mid)'};
  animation: ${(p) => p.$embedded ? 'none' : 'reveal-up 600ms cubic-bezier(0.17, 0.76, 0.28, 1) both'};
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

const ReplayStat = styled.span`
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 40px;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: ${(p) => p.$dim ? 'var(--grey-mid)' : 'var(--white)'};
  transition: color 0.2s ease;

  .label {
    font-size: 9px;
    color: var(--grey-mid);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
`;

const W3cBadge = styled.span`
  font-family: var(--font-mono);
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--grey-mid);
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--grey-mid);
  border-radius: var(--radius-sm);
  padding: 1px 5px;
  margin-left: 6px;
  vertical-align: middle;
`;

const DropdownDivider = styled.div`
  height: 1px;
  background: var(--grey-mid);
  margin: 2px 12px;
  opacity: 0.4;
`;

const SearchingHint = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-mid);
  padding: 8px 14px;
  text-align: center;
`;

const ImportBtn = styled.button`
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

  &:hover {
    color: var(--gold);
    border-color: var(--gold);
  }
`;

const UploadSection = styled.div`
  margin-top: var(--space-4);
  padding-top: var(--space-4);
  border-top: 1px solid rgba(255, 255, 255, 0.06);
`;

const CompactDropZone = styled(DropZone)`
  padding: var(--space-4) var(--space-4);
`;

const UploadResultBox = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
  margin-bottom: var(--space-3);
`;

const UploadPlayerList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-2);
  justify-content: center;
`;

const UploadPlayerBtn = styled.button`
  font: var(--text-xxs) var(--font-mono);
  color: ${(p) => (p.$clickable ? "var(--gold)" : "var(--grey-light)")};
  background: rgba(255, 255, 255, 0.04);
  border: var(--border-thin) solid ${(p) => (p.$clickable ? "rgba(252, 219, 51, 0.3)" : "var(--grey-mid)")};
  border-radius: var(--radius-sm);
  padding: 3px 10px;
  cursor: ${(p) => (p.$clickable ? "pointer" : "default")};
  transition: all 0.2s ease;

  ${(p) =>
    p.$clickable &&
    `&:hover {
      background: var(--gold-tint);
      border-color: var(--gold);
    }`}
`;
