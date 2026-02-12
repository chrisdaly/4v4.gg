import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useHistory } from "react-router-dom";
import useChatStream from "../lib/useChatStream";
import useFakeData from "../lib/useFakeData";
import { getOngoingMatches, getOngoingMatchesCached, getLadder } from "../lib/api";
import { usePlayerData } from "../lib/usePlayerData";
import { calculateTeamMMR, toFlag } from "../lib/utils";
import OnlineMmrStrip from "../components/OnlineMmrStrip";
import WorldMap from "../components/WorldMap";
import EventFeed from "../components/EventFeed";

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

/* ── MmrChart (fills remaining space) ─────────────────── */

const MmrChart = ({ players, matches, count, histogram, mmrFilter, onMmrFilter, mmrSteps, pendingDeltas }) => {
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
        pendingDeltas={pendingDeltas}
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
  const [realHistogram, setRealHistogram] = useState(null);
  const [statsVersion, setStatsVersion] = useState(0);
  const [mmrFilter, setMmrFilter] = useState(null);
  const [countryFilter, setCountryFilter] = useState(null);
  const [contentReady, setContentReady] = useState(false);
  const nextEventIdRef = useRef(0);
  const retryTimersRef = useRef([]);

  const onlineUsers = isDemo ? fake.onlineUsers : chatUsers;
  const matches = isDemo ? fake.matches : realMatches;
  const histogram = isDemo ? fake.histogram : realHistogram;

  const {
    playerStats, playerProfiles,
    inGameTags, onlineTags, idleTags,
    playerCountries, mapPlayers, playersWithStats,
    fetchedRef, gameEndPendingRef, setRealStats,
  } = usePlayerData({
    onlineUsers, matches, isDemo,
    demoStats: fake.playerStats,
    demoProfiles: fake.playerProfiles,
    statsVersion,
  });

  // Fetch live games (skip in demo mode)
  useEffect(() => {
    if (isDemo) return;
    const fetchMatches = async () => {
      try {
        const data = await getOngoingMatches();
        setRealMatches(sortByMMR(data.matches));
      } catch (err) {
        console.warn("[Home] Failed to fetch ongoing matches:", err.message);
      }
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
      .catch((err) => console.warn("[Home] Failed to fetch ladder histogram:", err.message));
  }, [isDemo]);

  // Content settle timer — wait for profiles/stats to accumulate before revealing panels
  const hasAnyData = onlineUsers.length > 0 || (matches !== null && matches.length > 0);
  useEffect(() => {
    if (contentReady || !hasAnyData) return;
    const timer = setTimeout(() => setContentReady(true), 2500);
    return () => clearTimeout(timer);
  }, [hasAnyData, contentReady]);

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
  const didSeedRef = useRef(false);
  useEffect(() => {
    const timer = setTimeout(() => { settledRef.current = true; }, 8000);
    return () => clearTimeout(timer);
  }, []);

  // Clean up retry timers on unmount
  useEffect(() => {
    return () => {
      for (const id of retryTimersRef.current) clearTimeout(id);
    };
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

    // Seed activity feed with existing live games on first settled run
    if (!didSeedRef.current) {
      didSeedRef.current = true;
      for (const match of (matches || [])) {
        const gamePlayers = match.teams?.flatMap((t, ti) =>
          t.players?.map((p) => ({
            name: p.battleTag?.split("#")[0],
            battleTag: p.battleTag,
            mmr: p.currentMmr || p.oldMmr || 0,
            teamIdx: ti,
          })).filter((p) => p.battleTag) || []
        ) || [];
        const mmrs = gamePlayers.map((p) => p.mmr).filter((m) => m > 0);
        const avgMmr = mmrs.length > 0 ? Math.round(mmrs.reduce((a, b) => a + b, 0) / mmrs.length) : null;
        const startTime = match.startTime ? new Date(match.startTime) : now;
        newEvents.push({ type: "game_start", gamePlayers, avgMmr, matchId: match.id, time: startTime });
      }
    }

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
        const gamePlayers = match.teams?.flatMap((t, ti) =>
          t.players?.map((p) => ({
            name: p.battleTag?.split("#")[0],
            battleTag: p.battleTag,
            mmr: p.currentMmr || p.oldMmr || 0,
            teamIdx: ti,
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
            gameEndPendingRef.current.set(p.battleTag, { eventId, name: p.name, teamIdx: p.teamIdx, createdAt: Date.now() });
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
        // Immediate re-fetch (may get stale data if API hasn't processed yet)
        setStatsVersion((v) => v + 1);
        // Delayed retry — W3C API typically updates within 15-30s after game end
        const gameEndTags = newEvents
          .filter((e) => e.type === "game_end")
          .flatMap((e) => e.gamePlayers?.map((p) => p.battleTag).filter(Boolean) || []);
        const timerId = setTimeout(() => {
          for (const tag of gameEndTags) fetchedRef.current.delete(tag);
          setStatsVersion((v) => v + 1);
          retryTimersRef.current = retryTimersRef.current.filter((id) => id !== timerId);
        }, 20_000);
        retryTimersRef.current.push(timerId);
      }
    }
  }, [onlineUsers, matches]);

  // MMR change tracking — fold game-end deltas into game_end events
  useEffect(() => {
    const now = new Date();
    const newEvents = [];
    const gameEndUpdates = new Map(); // eventId → [{ name, tag, delta, mmr, teamIdx }]

    // Expire stale pending entries (>2 min — API should have updated by now)
    const expiryCutoff = Date.now() - 2 * 60 * 1000;
    for (const [tag, entry] of gameEndPendingRef.current) {
      if (entry.createdAt < expiryCutoff) gameEndPendingRef.current.delete(tag);
    }

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
    const online = playersWithStats.filter((p) => p.mmr != null && !idleTags.has(p.battleTag));
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
  }, [playersWithStats, matches, idleTags]);

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

  // ── Event replay ──
  const [replayMods, setReplayMods] = useState(null);
  const isReplayingRef = useRef(false);

  const handleEventReplay = useCallback((event) => {
    if (isReplayingRef.current) return;
    isReplayingRef.current = true;

    const unlock = () => { isReplayingRef.current = false; };

    switch (event.type) {
      case "join": {
        const stats = playerStats.get(event.tag);
        const mmr = event.mmr ?? stats?.mmr ?? 1500;
        const isOnStrip = filteredStripPlayers.some((p) => p.battleTag === event.tag);
        if (isOnStrip) {
          // Player visible on strip — suppress then restore to trigger enter anim
          setReplayMods({ suppressTags: new Set([event.tag]) });
          setTimeout(() => {
            setReplayMods(null);
            setTimeout(unlock, 3000);
          }, 150);
        } else {
          // Player not on strip (no MMR yet) — inject with fallback MMR
          setReplayMods({
            injectPlayers: [{
              battleTag: event.tag,
              name: event.player || event.tag.split("#")[0],
              mmr,
              race: stats?.race ?? null,
              wins: stats?.wins ?? 0,
              losses: stats?.losses ?? 0,
              rank: null,
            }],
          });
          // Clear after enter animation settles
          setTimeout(() => {
            setReplayMods(null);
            setTimeout(unlock, 3000);
          }, 3000);
        }
        break;
      }
      case "leave": {
        const stats = playerStats.get(event.tag);
        const mmr = event.mmr ?? stats?.mmr ?? 1500;
        setReplayMods({
          injectPlayers: [{
            battleTag: event.tag,
            name: event.player || event.tag.split("#")[0],
            mmr,
            race: stats?.race ?? null,
            wins: stats?.wins ?? 0,
            losses: stats?.losses ?? 0,
            rank: null,
          }],
        });
        // Wait for enter to mostly complete, then remove for exit anim
        setTimeout(() => {
          setReplayMods(null);
          setTimeout(unlock, 3000);
        }, 2500);
        break;
      }
      case "game_start": {
        // Phase 1: suppress all game players (dots disappear)
        const tags = new Set((event.gamePlayers || []).map((p) => p.battleTag).filter(Boolean));
        setReplayMods({ suppressTags: tags });
        // Phase 2: restore (enter animation triggers for all)
        setTimeout(() => {
          setReplayMods(null);
          setTimeout(unlock, 3000);
        }, 150);
        break;
      }
      case "game_end": {
        // Phase 1: inject a fake match so players appear in-game with arcs
        const results = event.results || [];
        const team0 = results.filter((r) => r.teamIdx === 0).map((r) => ({
          battleTag: r.tag, currentMmr: r.mmr, oldMmr: r.mmr, race: null,
        }));
        const team1 = results.filter((r) => r.teamIdx === 1).map((r) => ({
          battleTag: r.tag, currentMmr: r.mmr, oldMmr: r.mmr, race: null,
        }));
        const fakeMatch = {
          id: `replay-${event.matchId || Date.now()}`,
          teams: [{ players: team0 }, { players: team1 }],
        };
        setReplayMods({ injectMatch: fakeMatch });
        // Phase 2: remove match + fire deltas
        setTimeout(() => {
          const deltas = results.filter((r) => r.delta != null).map((r) => ({ tag: r.tag, delta: r.delta }));
          setReplayMods(deltas.length > 0 ? { pendingDeltas: deltas } : null);
          // Phase 3: clear pendingDeltas
          setTimeout(() => {
            setReplayMods(null);
            setTimeout(unlock, 3000);
          }, 50);
        }, 150);
        break;
      }
      case "mmr_gain":
      case "mmr_loss": {
        // Direct delta fire — no phase 1 needed
        setReplayMods({
          pendingDeltas: [{ tag: event.tag, delta: event.delta }],
        });
        setTimeout(() => {
          setReplayMods(null);
          setTimeout(unlock, 3000);
        }, 50);
        break;
      }
      default:
        unlock();
    }
  }, [playerStats, filteredStripPlayers]);

  // Derive "effective" data that applies replayMods
  const effectiveStripPlayers = useMemo(() => {
    let result = filteredStripPlayers;
    if (replayMods?.suppressTags) {
      result = result.filter((p) => !replayMods.suppressTags.has(p.battleTag));
    }
    if (replayMods?.injectPlayers) {
      const existingTags = new Set(result.map((p) => p.battleTag));
      const toInject = replayMods.injectPlayers.filter((p) => !existingTags.has(p.battleTag));
      if (toInject.length > 0) result = [...result, ...toInject];
    }
    return result;
  }, [filteredStripPlayers, replayMods]);

  const effectiveMatches = useMemo(() => {
    let result = matches || [];
    if (replayMods?.injectMatch) {
      result = [...result, replayMods.injectMatch];
    }
    return result;
  }, [matches, replayMods]);

  const effectiveMapPlayers = useMemo(() => {
    let result = filteredMapPlayers;
    if (replayMods?.suppressTags) {
      result = result.filter((p) => !replayMods.suppressTags.has(p.battleTag));
    }
    if (replayMods?.injectPlayers) {
      const existingTags = new Set(result.map((p) => p.battleTag));
      for (const ip of replayMods.injectPlayers) {
        if (existingTags.has(ip.battleTag)) continue;
        const country = playerProfiles.get(ip.battleTag);
        if (country) {
          result = [...result, {
            battleTag: ip.battleTag,
            name: ip.name,
            country: country.toUpperCase(),
            mmr: ip.mmr,
            inGame: false,
          }];
        }
      }
    }
    return result;
  }, [filteredMapPlayers, replayMods, playerProfiles]);

  const effectivePlayerCountries = useMemo(() => {
    if (!replayMods) return filteredPlayerCountries;
    // Recompute from effectiveMapPlayers
    const countries = new Map();
    for (const p of effectiveMapPlayers) {
      const code = p.country;
      if (!code) continue;
      if (!countries.has(code)) countries.set(code, { online: 0, inGame: 0 });
      const entry = countries.get(code);
      if (p.inGame) entry.inGame++;
      else entry.online++;
    }
    return countries;
  }, [filteredPlayerCountries, replayMods, effectiveMapPlayers]);

  // Status events — loading milestones for activity feed
  const statusMilestonesRef = useRef({ online: false, games: false, countries: false });
  useEffect(() => {
    const m = statusMilestonesRef.current;
    const now = new Date();
    const newStatus = [];

    if (!m.online && onlineUsers.length > 0) {
      m.online = true;
      newStatus.push({ type: "status", text: `${onlineUsers.length} players online`, time: now });
    }

    if (!m.games && matches && matches.length > 0) {
      m.games = true;
      const inGame = matches.reduce((sum, match) =>
        sum + (match.teams || []).reduce((s, t) => s + (t.players?.length || 0), 0), 0);
      newStatus.push({ type: "status", text: `${matches.length} live ${matches.length === 1 ? "game" : "games"} · ${inGame} in-game`, time: now });
    }

    if (!m.countries && playerCountries.size >= 3) {
      m.countries = true;
      newStatus.push({ type: "status", text: `Players from ${playerCountries.size} countries`, time: now });
    }

    if (newStatus.length > 0) {
      setEvents((prev) => [...newStatus, ...prev].slice(0, 100));
    }
  }, [onlineUsers, matches, playerCountries]);

  return (
    <div className="home">
      <div className="home-panel home-world-map">
        <div className="home-section-header">
          <span className="home-section-title">World Map</span>
          {contentReady && <span className="home-section-count">{filteredPlayerCountries.size} countries</span>}
        </div>
        {!contentReady ? (
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
            <WorldMap playerCountries={effectivePlayerCountries} players={effectiveMapPlayers} instant />
          </>
        )}
      </div>
      {!contentReady ? (
        <div className="home-panel home-mmr-chart">
          <div className="home-section-header">
            <span className="home-section-title">MMR Distribution</span>
          </div>
          <div className="home-skeleton-chart">
            {[52, 38, 45, 28, 55, 33, 48, 40].map((w, i) => (
              <div key={i} className="loader-skeleton" style={{
                width: `${w}%`,
                height: 6,
                marginBottom: 12,
                alignSelf: i % 2 === 0 ? "flex-start" : "flex-end",
              }} />
            ))}
          </div>
        </div>
      ) : (
        <MmrChart
          players={effectiveStripPlayers}
          matches={effectiveMatches}
          count={onlineUsers.length - idleTags.size}
          histogram={histogram}
          mmrFilter={mmrFilter}
          onMmrFilter={handleMmrFilter}
          mmrSteps={mmrSteps}
          pendingDeltas={replayMods?.pendingDeltas || null}
        />
      )}
      <EventFeed events={events} onEventClick={handleEventReplay} />
    </div>
  );
};

export default Home;
