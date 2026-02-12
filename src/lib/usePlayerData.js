import { useState, useEffect, useRef, useMemo } from "react";
import { getPlayerStats, getPlayerProfile } from "./api";

const IDLE_MS = 3 * 60 * 60 * 1000;

/**
 * Fetches and caches player stats and profiles for a set of battle tags.
 * Returns derived sets: inGameTags, onlineTags, idleTags, playersWithStats, playerCountries, mapPlayers.
 */
export function usePlayerData({ onlineUsers, matches, isDemo, demoStats, demoProfiles, statsVersion }) {
  const [realStats, setRealStats] = useState(new Map());
  const [realProfiles, setRealProfiles] = useState(new Map());
  const fetchedRef = useRef(new Set());
  const profileFetchedRef = useRef(new Set());
  const gameEndPendingRef = useRef(new Map());
  const [tick, setTick] = useState(0);

  const playerStats = isDemo ? demoStats : realStats;
  const playerProfiles = isDemo ? demoProfiles : realProfiles;

  // Tick for idle recomputation
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  // Derived sets
  const inGameTags = useMemo(() => {
    const tags = new Set();
    if (matches) {
      for (const match of matches) {
        for (const team of match.teams || []) {
          for (const p of team.players || []) {
            if (p.battleTag) tags.add(p.battleTag);
          }
        }
      }
    }
    return tags;
  }, [matches]);

  const onlineTags = useMemo(
    () => new Set(onlineUsers.map((u) => u.battleTag).filter(Boolean)),
    [onlineUsers],
  );

  const idleTags = useMemo(() => {
    const now = Date.now();
    const idle = new Set();
    for (const u of onlineUsers) {
      if (u.joinedAt && now - u.joinedAt > IDLE_MS && !inGameTags.has(u.battleTag)) {
        idle.add(u.battleTag);
      }
    }
    return idle;
  }, [onlineUsers, inGameTags, tick]);

  // Fetch player stats incrementally
  useEffect(() => {
    if (isDemo) return;
    const pendingTags = new Set(gameEndPendingRef.current.keys());
    const batchFetches = [];
    const tagsToCheck = new Set(onlineUsers.map((u) => u.battleTag).filter(Boolean));
    for (const tag of pendingTags) tagsToCheck.add(tag);

    for (const tag of tagsToCheck) {
      if (!tag || fetchedRef.current.has(tag)) continue;
      fetchedRef.current.add(tag);

      if (pendingTags.has(tag)) {
        batchFetches.push(getPlayerStats(tag, { skipCache: true }).then((stats) => [tag, stats]));
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

  // Fetch player profiles incrementally
  useEffect(() => {
    if (isDemo) return;
    const tags = new Set([...onlineTags, ...inGameTags]);
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
  }, [onlineTags, inGameTags, isDemo]);

  // Derived: player countries
  const playerCountries = useMemo(() => {
    const countries = new Map();
    for (const [tag, country] of playerProfiles) {
      if (!country) continue;
      if (!onlineTags.has(tag) && !inGameTags.has(tag)) continue;
      const code = country.toUpperCase();
      if (!countries.has(code)) countries.set(code, { online: 0, inGame: 0 });
      const entry = countries.get(code);
      if (inGameTags.has(tag)) entry.inGame++;
      else entry.online++;
    }
    return countries;
  }, [playerProfiles, onlineTags, inGameTags]);

  // Derived: map players (active, non-idle)
  const mapPlayers = useMemo(() => {
    const result = [];
    for (const [tag, country] of playerProfiles) {
      if (!country) continue;
      if (!onlineTags.has(tag) && !inGameTags.has(tag)) continue;
      if (idleTags.has(tag) && !inGameTags.has(tag)) continue;
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
  }, [playerProfiles, playerStats, onlineTags, inGameTags, idleTags]);

  // Derived: players with stats sorted by MMR
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

  return {
    playerStats,
    playerProfiles,
    inGameTags,
    onlineTags,
    idleTags,
    playerCountries,
    mapPlayers,
    playersWithStats,
    fetchedRef,
    gameEndPendingRef,
    setRealStats,
  };
}
