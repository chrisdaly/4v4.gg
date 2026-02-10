import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useHistory } from "react-router-dom";
import useChatStream from "../lib/useChatStream";
import useFakeData from "../lib/useFakeData";
import { getOngoingMatches, getOngoingMatchesCached, getPlayerStats, getPlayerProfile, getLadder } from "../lib/api";
import { calculateTeamMMR } from "../lib/utils";
import OnlineMmrStrip from "../components/OnlineMmrStrip";
import WorldMap from "../components/WorldMap";

// Sort matches by team MMR (highest first)
const sortByMMR = (matches) => {
  if (!matches) return [];
  return matches.slice().sort((a, b) => {
    return calculateTeamMMR(b.teams) - calculateTeamMMR(a.teams);
  });
};

const getInitialData = () => {
  const cached = getOngoingMatchesCached();
  if (cached?.matches) return sortByMMR(cached.matches);
  return null;
};

/* ── EventFeed (activity log) ─────────────────────────── */

const toFlag = (code) => {
  if (!code || code.length !== 2) return "";
  return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
};

const formatEventTime = (time) => {
  const h = time.getHours();
  const m = time.getMinutes();
  return `${h}:${m < 10 ? "0" + m : m}`;
};

const EventFeed = ({ events }) => (
  <div className="home-panel home-events">
    <div className="home-section-header">
      <span className="home-section-title">Activity</span>
    </div>
    <div className="event-feed-list">
      {events.length === 0 && (
        <div className="home-empty">Waiting for activity...</div>
      )}
      {events.map((e, i) => (
        <div key={`${e.type}-${e.time.getTime()}-${i}`} className="event-item">
          <span className={`event-dot event-${e.type}`} />
          <div className="event-body">
            <div className="event-main">
              {e.country && <span className="event-flag">{toFlag(e.country)}</span>}
              <span className="event-name">
                {e.type === "game_start"
                  ? `Game started${e.avgMmr ? ` (${e.avgMmr.toLocaleString()} MMR)` : ""}`
                  : e.type === "game_end"
                    ? `Game ended${e.avgMmr ? ` (${e.avgMmr.toLocaleString()} MMR)` : ""}`
                    : e.player}
              </span>
              <span className="event-time">{formatEventTime(e.time)}</span>
            </div>
            <div className="event-detail">
              {e.type === "join" && "joined"}
              {e.type === "leave" && "left"}
              {e.type === "game_start" && (
                <div className="event-game-results">
                  {e.gamePlayers?.map((p, j) => (
                    <div key={j} className="event-game-row">
                      <span className="event-game-name">{p.name}</span>
                      {p.mmr > 0 && <span className="event-mmr">{p.mmr.toLocaleString()}</span>}
                    </div>
                  ))}
                </div>
              )}
              {e.type === "game_end" && (
                <div className="event-game-results">
                  {(e.results?.length > 0 ? e.results : (e.gamePlayers || []).map((p) => ({ name: p.name, mmr: p.mmr, delta: null })))
                    .sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0))
                    .map((r, j) => (
                      <div key={j} className="event-game-row">
                        <span className="event-game-name">{r.name}</span>
                        <span className="event-game-stats">
                          {r.mmr > 0 && <span className="event-mmr">{r.mmr.toLocaleString()}</span>}
                          {r.delta != null && (
                            <span className={r.delta > 0 ? "event-delta-gain" : "event-delta-loss"}>
                              {r.delta > 0 ? "+" : ""}{r.delta}
                            </span>
                          )}
                        </span>
                      </div>
                    ))}
                </div>
              )}
              {e.type === "mmr_gain" && <><span className="event-delta-gain">+{e.delta}</span> MMR</>}
              {e.type === "mmr_loss" && <><span className="event-delta-loss">{e.delta}</span> MMR</>}
              {(e.type === "join" || e.type === "leave") && e.mmr != null && (
                <span className="event-mmr"> · {Math.round(e.mmr).toLocaleString()} MMR</span>
              )}
              {(e.type === "mmr_gain" || e.type === "mmr_loss") && (
                <span className="event-mmr"> ({Math.round(e.prevMmr).toLocaleString()} → {Math.round(e.mmr).toLocaleString()})</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

/* ── MmrChart (fills remaining space) ─────────────────── */

const MmrChart = ({ players, matches, count, histogram, mmrFilter, onMmrFilter, mmrSteps }) => {
  const history = useHistory();
  const handlePlayerClick = useCallback((battleTag) => {
    if (battleTag) history.push(`/player/${encodeURIComponent(battleTag)}`);
  }, [history]);

  return (
    <div className="home-panel home-mmr-chart">
      <div className="home-section-header">
        <span className="home-section-title">MMR Distribution</span>
        <span className="home-section-count">{count} online</span>
        {matches && matches.length > 0 && (
          <span className="home-section-count">
            {matches.reduce((sum, m) => sum + (m.teams || []).reduce((s, t) => s + (t.players?.length || 0), 0), 0)} live
          </span>
        )}
      </div>
      {mmrSteps.length > 0 && (
        <div className="flag-badges mmr-filter-badges">
          {mmrSteps.map((v) => (
            <span
              key={v}
              className={`flag-badge${mmrFilter === v ? " flag-badge-active" : ""}`}
              onClick={() => onMmrFilter(v)}
            >
              <span className="flag-badge-count">{v}+</span>
            </span>
          ))}
          {mmrFilter != null && (
            <span
              className="flag-badge flag-badge-clear"
              onClick={() => onMmrFilter(mmrFilter)}
            >
              <span className="flag-badge-count">clear</span>
            </span>
          )}
        </div>
      )}
      <OnlineMmrStrip
        players={players}
        matches={matches}
        histogram={histogram}
        onPlayerClick={handlePlayerClick}
        mmrFilter={mmrFilter}
        onMmrFilter={onMmrFilter}
      />
    </div>
  );
};

/* ── Home Page ─────────────────────────────────────────── */

const Home = () => {
  const isDemo = useMemo(() => new URLSearchParams(window.location.search).has("demo"), []);
  const fake = useFakeData(isDemo);
  const { onlineUsers: chatUsers } = useChatStream();
  const [realMatches, setRealMatches] = useState(getInitialData);
  const [realStats, setRealStats] = useState(new Map());
  const [realProfiles, setRealProfiles] = useState(new Map());
  const [realHistogram, setRealHistogram] = useState(null);
  const [statsVersion, setStatsVersion] = useState(0);
  const [mmrFilter, setMmrFilter] = useState(null);
  const [countryFilter, setCountryFilter] = useState(null);
  const fetchedRef = useRef(new Set());
  const profileFetchedRef = useRef(new Set());

  // Demo mode overrides real data sources
  const onlineUsers = isDemo ? fake.onlineUsers : chatUsers;
  const matches = isDemo ? fake.matches : realMatches;
  const playerStats = isDemo ? fake.playerStats : realStats;
  const playerProfiles = isDemo ? fake.playerProfiles : realProfiles;
  const histogram = isDemo ? fake.histogram : realHistogram;

  // Fetch live games (skip in demo mode)
  useEffect(() => {
    if (isDemo) return;
    const fetchMatches = async () => {
      try {
        const data = await getOngoingMatches();
        setRealMatches(sortByMMR(data.matches));
      } catch {}
    };
    fetchMatches();
    const interval = setInterval(fetchMatches, 30000);
    return () => clearInterval(interval);
  }, [isDemo]);

  // Fetch ladder histogram (skip in demo mode)
  useEffect(() => {
    if (isDemo) return;
    Promise.all([0, 1, 2, 3, 4, 5, 6].map((id) => getLadder(id)))
      .then((results) => {
        const allMmrs = results.flat().map((e) => e?.player?.mmr).filter((m) => m != null && m > 0);
        if (allMmrs.length === 0) return;
        const min = Math.floor(Math.min(...allMmrs) / 50) * 50;
        const max = Math.ceil(Math.max(...allMmrs) / 50) * 50;
        const bucketSize = Math.max(1, Math.round((max - min) / 50));
        const bins = [];
        for (let v = min; v < max; v += bucketSize) {
          const count = allMmrs.filter((m) => m >= v && m < v + bucketSize).length;
          bins.push({ mmr: v + bucketSize / 2, count });
        }
        setRealHistogram(bins);
      })
      .catch(() => {});
  }, [isDemo]);

  // Fetch player stats incrementally (skip in demo mode)
  // Game-end players are batched so chart shows all pulse rings at once
  useEffect(() => {
    if (isDemo) return;
    const pendingTags = new Set(gameEndPendingRef.current.keys());
    const batchFetches = [];

    // Also check game-end players who might not be in onlineUsers
    const tagsToCheck = new Set(onlineUsers.map((u) => u.battleTag).filter(Boolean));
    for (const tag of pendingTags) tagsToCheck.add(tag);

    for (const tag of tagsToCheck) {
      if (!tag || fetchedRef.current.has(tag)) continue;
      fetchedRef.current.add(tag);

      if (pendingTags.has(tag)) {
        batchFetches.push(getPlayerStats(tag).then((stats) => [tag, stats]));
      } else {
        getPlayerStats(tag).then((stats) => {
          if (stats) {
            setRealStats((prev) => {
              const next = new Map(prev);
              next.set(tag, stats);
              return next;
            });
          }
        });
      }
    }

    if (batchFetches.length > 0) {
      Promise.all(batchFetches).then((results) => {
        setRealStats((prev) => {
          const next = new Map(prev);
          for (const [tag, stats] of results) {
            if (stats) next.set(tag, stats);
          }
          return next;
        });
      });
    }
  }, [onlineUsers, isDemo, statsVersion]);

  // Fetch player profiles incrementally (skip in demo mode)
  useEffect(() => {
    if (isDemo) return;
    const tags = new Set();
    for (const u of onlineUsers) {
      if (u.battleTag) tags.add(u.battleTag);
    }
    if (matches) {
      for (const match of matches) {
        for (const team of match.teams || []) {
          for (const p of team.players || []) {
            if (p.battleTag) tags.add(p.battleTag);
          }
        }
      }
    }
    for (const tag of tags) {
      if (profileFetchedRef.current.has(tag)) continue;
      profileFetchedRef.current.add(tag);
      getPlayerProfile(tag).then((profile) => {
        if (profile?.country) {
          setRealProfiles((prev) => {
            const next = new Map(prev);
            next.set(tag, profile.country);
            return next;
          });
        }
      });
    }
  }, [onlineUsers, matches, isDemo]);

  // Derive playerCountries: Map<countryCode, { online, inGame }>
  const playerCountries = useMemo(() => {
    const inGameTags = new Set();
    if (matches) {
      for (const match of matches) {
        for (const team of match.teams || []) {
          for (const p of team.players || []) {
            if (p.battleTag) inGameTags.add(p.battleTag);
          }
        }
      }
    }
    const onlineTags = new Set(onlineUsers.map((u) => u.battleTag).filter(Boolean));
    const countries = new Map();
    for (const [tag, country] of playerProfiles) {
      if (!country) continue;
      if (!onlineTags.has(tag) && !inGameTags.has(tag)) continue; // skip offline
      const code = country.toUpperCase();
      if (!countries.has(code)) countries.set(code, { online: 0, inGame: 0 });
      const entry = countries.get(code);
      if (inGameTags.has(tag)) entry.inGame++;
      else entry.online++;
    }
    return countries;
  }, [playerProfiles, onlineUsers, matches]);

  // Build per-player list with country + MMR for map labels (active players only)
  const mapPlayers = useMemo(() => {
    const onlineTags = new Set(onlineUsers.map((u) => u.battleTag).filter(Boolean));
    const inGameTags = new Set();
    if (matches) {
      for (const match of matches) {
        for (const team of match.teams || []) {
          for (const p of team.players || []) {
            if (p.battleTag) inGameTags.add(p.battleTag);
          }
        }
      }
    }
    const result = [];
    for (const [tag, country] of playerProfiles) {
      if (!country) continue;
      if (!onlineTags.has(tag) && !inGameTags.has(tag)) continue; // skip offline
      const stats = playerStats.get(tag);
      const mmr = stats?.mmr ?? null;
      result.push({
        battleTag: tag,
        name: tag.split("#")[0],
        country: country.toUpperCase(),
        mmr,
        inGame: inGameTags.has(tag),
      });
    }
    return result;
  }, [playerProfiles, playerStats, matches, onlineUsers]);

  // Derive players with stats (sorted by MMR)
  const playersWithStats = useMemo(() => {
    return onlineUsers
      .map((u) => {
        const stats = playerStats.get(u.battleTag);
        return {
          battleTag: u.battleTag,
          name: u.battleTag?.split("#")[0],
          mmr: stats?.mmr ?? null,
          race: stats?.race ?? null,
          wins: stats?.wins ?? 0,
          losses: stats?.losses ?? 0,
          rank: stats?.rank ?? null,
        };
      })
      .sort((a, b) => (b.mmr ?? 0) - (a.mmr ?? 0));
  }, [onlineUsers, playerStats]);

  // ── Event tracking: diff onlineUsers + matches to detect join/leave/game events ──
  const [events, setEvents] = useState([]);
  const prevOnlineRef = useRef(new Set());
  const prevMatchesRef = useRef([]);
  const settledRef = useRef(false);
  const prevMmrRef = useRef(new Map());
  const playerStatsRef = useRef(playerStats);
  playerStatsRef.current = playerStats;
  const playerProfilesRef = useRef(playerProfiles);
  playerProfilesRef.current = playerProfiles;
  const gameEndPendingRef = useRef(new Map()); // tag → { eventId, name, teamIdx }
  const nextEventIdRef = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => { settledRef.current = true; }, 8000);
    return () => clearTimeout(timer);
  }, []);

  // Event tracking: join/leave/game_start/game_end (runs BEFORE mmr detection)
  useEffect(() => {
    const currentTags = new Set(onlineUsers.map((u) => u.battleTag).filter(Boolean));
    const currentMatchIds = new Set((matches || []).map((m) => m.id));

    // Keep updating baseline until settled (suppress initial load events)
    if (!settledRef.current) {
      prevOnlineRef.current = currentTags;
      prevMatchesRef.current = matches || [];
      return;
    }

    const now = new Date();
    const newEvents = [];

    // Joins
    for (const tag of currentTags) {
      if (!prevOnlineRef.current.has(tag)) {
        const stats = playerStatsRef.current.get(tag);
        const country = playerProfilesRef.current.get(tag);
        newEvents.push({
          type: "join", player: tag.split("#")[0], tag,
          mmr: stats?.mmr ?? null,
          country: country ? country.toUpperCase() : null,
          time: now,
        });
      }
    }
    // Leaves
    for (const tag of prevOnlineRef.current) {
      if (!currentTags.has(tag)) {
        const stats = playerStatsRef.current.get(tag);
        const country = playerProfilesRef.current.get(tag);
        newEvents.push({
          type: "leave", player: tag.split("#")[0], tag,
          mmr: stats?.mmr ?? null,
          country: country ? country.toUpperCase() : null,
          time: now,
        });
      }
    }
    // New matches
    const prevIds = new Set(prevMatchesRef.current.map((m) => m.id));
    for (const match of (matches || [])) {
      if (!prevIds.has(match.id)) {
        const gamePlayers = match.teams?.flatMap((t) =>
          t.players?.map((p) => ({
            name: p.battleTag?.split("#")[0],
            battleTag: p.battleTag,
            mmr: p.currentMmr || p.oldMmr || 0,
          })).filter((p) => p.battleTag) || []
        ) || [];
        const mmrs = gamePlayers.map((p) => p.mmr).filter((m) => m > 0);
        const avgMmr = mmrs.length > 0 ? Math.round(mmrs.reduce((a, b) => a + b, 0) / mmrs.length) : null;
        newEvents.push({ type: "game_start", gamePlayers, avgMmr, matchId: match.id, time: now });
      }
    }
    // Ended matches — include player data, trigger stat refresh
    const prevMatchMap = new Map(prevMatchesRef.current.map((m) => [m.id, m]));
    for (const [id, match] of prevMatchMap) {
      if (!currentMatchIds.has(id)) {
        const gamePlayers = match.teams?.flatMap((t, ti) =>
          t.players?.map((p) => ({
            name: p.battleTag?.split("#")[0],
            battleTag: p.battleTag,
            mmr: p.currentMmr || p.oldMmr,
            teamIdx: ti,
          })).filter((p) => p.battleTag) || []
        ) || [];
        for (const p of gamePlayers) {
          if (p.battleTag) fetchedRef.current.delete(p.battleTag);
        }
        // Track pending game-end players for MMR folding
        const eventId = nextEventIdRef.current++;
        for (const p of gamePlayers) {
          if (p.battleTag) {
            gameEndPendingRef.current.set(p.battleTag, { eventId, name: p.name, teamIdx: p.teamIdx });
            // Seed prevMmrRef so the delta can be detected after stat refetch
            if (p.mmr != null) prevMmrRef.current.set(p.battleTag, p.mmr);
          }
        }
        const endMmrs = gamePlayers.map((p) => p.mmr).filter((m) => m > 0);
        const avgMmr = endMmrs.length > 0 ? Math.round(endMmrs.reduce((a, b) => a + b, 0) / endMmrs.length) : null;
        const initialResults = gamePlayers.map((p) => ({
          name: p.name, tag: p.battleTag, delta: null, mmr: p.mmr, teamIdx: p.teamIdx,
        }));
        newEvents.push({ type: "game_end", gamePlayers, avgMmr, matchId: id, time: now, results: initialResults, eventId });
      }
    }

    prevOnlineRef.current = currentTags;
    prevMatchesRef.current = matches || [];

    if (newEvents.length > 0) {
      setEvents((prev) => [...newEvents, ...prev].slice(0, 100));
      if (newEvents.some((e) => e.type === "game_end")) {
        setStatsVersion((v) => v + 1);
      }
    }
  }, [onlineUsers, matches]);

  // MMR change tracking — fold game-end deltas into game_end events
  useEffect(() => {
    const now = new Date();
    const newEvents = [];
    const gameEndUpdates = new Map(); // eventId → [{ name, tag, delta, mmr, teamIdx }]

    for (const [tag, stats] of playerStats) {
      if (stats?.mmr == null) continue;
      const prev = prevMmrRef.current.get(tag);
      if (prev != null && prev !== stats.mmr) {
        const delta = stats.mmr - prev;
        const pending = gameEndPendingRef.current.get(tag);
        if (pending) {
          // Fold into the game_end event instead of creating a separate event
          if (!gameEndUpdates.has(pending.eventId)) gameEndUpdates.set(pending.eventId, []);
          gameEndUpdates.get(pending.eventId).push({
            name: pending.name, tag, delta, mmr: stats.mmr, teamIdx: pending.teamIdx,
          });
          gameEndPendingRef.current.delete(tag);
        } else {
          const country = playerProfilesRef.current.get(tag);
          newEvents.push({
            type: delta > 0 ? "mmr_gain" : "mmr_loss",
            player: tag.split("#")[0], tag,
            mmr: stats.mmr, prevMmr: prev, delta,
            country: country ? country.toUpperCase() : null,
            time: now,
          });
        }
      }
      prevMmrRef.current.set(tag, stats.mmr);
    }

    if (gameEndUpdates.size > 0 || newEvents.length > 0) {
      setEvents((prev) => {
        let updated = prev;
        if (gameEndUpdates.size > 0) {
          updated = updated.map((e) => {
            if (e.eventId != null && gameEndUpdates.has(e.eventId)) {
              const updates = new Map(gameEndUpdates.get(e.eventId).map((u) => [u.tag, u]));
              return { ...e, results: (e.results || []).map((r) => updates.has(r.tag) ? { ...r, ...updates.get(r.tag) } : r) };
            }
            return e;
          });
        }
        if (newEvents.length > 0) {
          updated = [...newEvents, ...updated];
        }
        return updated.slice(0, 100);
      });
    }
  }, [playerStats]);

  const stripPlayers = useMemo(() => {
    const online = playersWithStats.filter((p) => p.mmr != null);
    const onlineTags = new Set(online.map((p) => p.battleTag));
    if (matches) {
      for (const match of matches) {
        for (const team of match.teams || []) {
          for (const p of team.players || []) {
            const mmr = p.oldMmr || p.currentMmr || 0;
            if (p.battleTag && !onlineTags.has(p.battleTag) && mmr > 0) {
              onlineTags.add(p.battleTag);
              online.push({
                battleTag: p.battleTag,
                name: p.battleTag.split("#")[0],
                mmr,
                race: p.race ?? null,
                wins: 0,
                losses: 0,
                rank: null,
              });
            }
          }
        }
      }
    }
    return online;
  }, [playersWithStats, matches]);

  // ── MMR filter badges ──
  const mmrSteps = useMemo(() => {
    if (stripPlayers.length === 0) return [];
    const mmrs = stripPlayers.map((p) => p.mmr).filter((m) => m != null);
    if (mmrs.length === 0) return [];
    const min = Math.floor(Math.min(...mmrs) / 200) * 200;
    const max = Math.ceil(Math.max(...mmrs) / 200) * 200;
    const steps = [];
    for (let v = min; v <= max; v += 200) steps.push(v);
    return steps;
  }, [stripPlayers]);

  // ── Filtering ──
  const handleMmrFilter = useCallback((mmr) => {
    setMmrFilter((prev) => (prev === mmr ? null : mmr));
  }, []);

  const handleCountryFilter = useCallback((code) => {
    setCountryFilter((prev) => (prev === code ? null : code));
  }, []);

  const filteredStripPlayers = useMemo(() => {
    let result = stripPlayers;
    if (mmrFilter != null) result = result.filter((p) => (p.mmr ?? 0) >= mmrFilter);
    if (countryFilter) {
      result = result.filter((p) => {
        const country = playerProfiles.get(p.battleTag);
        return country && country.toUpperCase() === countryFilter;
      });
    }
    return result;
  }, [stripPlayers, mmrFilter, countryFilter, playerProfiles]);

  const filteredMapPlayers = useMemo(() => {
    let result = mapPlayers;
    if (mmrFilter != null) result = result.filter((p) => (p.mmr ?? 0) >= mmrFilter);
    if (countryFilter) result = result.filter((p) => p.country === countryFilter);
    return result;
  }, [mapPlayers, mmrFilter, countryFilter]);

  const filteredPlayerCountries = useMemo(() => {
    if (mmrFilter == null && !countryFilter) return playerCountries;
    const countries = new Map();
    for (const p of filteredMapPlayers) {
      const code = p.country;
      if (!code) continue;
      if (!countries.has(code)) countries.set(code, { online: 0, inGame: 0 });
      const entry = countries.get(code);
      if (p.inGame) entry.inGame++;
      else entry.online++;
    }
    return countries;
  }, [mmrFilter, countryFilter, playerCountries, filteredMapPlayers]);

  const isLoading = onlineUsers.length === 0 && (!matches || matches.length === 0);

  return (
    <div className="home">
      <div className="home-panel home-world-map">
        <div className="home-section-header">
          <span className="home-section-title">World Map</span>
          {!isLoading && <span className="home-section-count">{filteredPlayerCountries.size} countries</span>}
        </div>
        {isLoading ? (
          <div className="home-skeleton-map">
            <div className="loader-skeleton" style={{ width: "100%", height: "100%", borderRadius: "var(--radius-md)" }} />
          </div>
        ) : (
          <>
            <div className="flag-badges">
              {[...filteredPlayerCountries.entries()]
                .map(([code, c]) => ({ code, count: c.online + c.inGame }))
                .sort((a, b) => b.count - a.count)
                .map(({ code, count }) => (
                  <span
                    key={code}
                    className={`flag-badge${countryFilter === code ? " flag-badge-active" : ""}`}
                    onClick={() => handleCountryFilter(code)}
                  >
                    <span className="flag-badge-flag">{toFlag(code)}</span>
                    <span className="flag-badge-code">{code}</span>
                    <span className="flag-badge-count">{count}</span>
                  </span>
                ))}
              {(mmrFilter != null || countryFilter) && (
                <span
                  className="flag-badge flag-badge-clear"
                  onClick={() => { setMmrFilter(null); setCountryFilter(null); }}
                >
                  <span className="flag-badge-count">clear</span>
                </span>
              )}
            </div>
            <WorldMap playerCountries={filteredPlayerCountries} players={filteredMapPlayers} />
          </>
        )}
      </div>
      {isLoading ? (
        <div className="home-panel home-mmr-chart">
          <div className="home-section-header">
            <span className="home-section-title">MMR Distribution</span>
          </div>
          <div className="home-skeleton-chart">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="loader-skeleton" style={{
                width: `${20 + Math.random() * 40}%`,
                height: 6,
                marginBottom: 12,
                alignSelf: i % 2 === 0 ? "flex-start" : "flex-end",
              }} />
            ))}
          </div>
        </div>
      ) : (
        <MmrChart
          players={filteredStripPlayers}
          matches={matches}
          count={onlineUsers.length}
          histogram={histogram}
          mmrFilter={mmrFilter}
          onMmrFilter={handleMmrFilter}
          mmrSteps={mmrSteps}
        />
      )}
      <EventFeed events={events} />
    </div>
  );
};

export default Home;
