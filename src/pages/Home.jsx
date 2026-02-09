import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useHistory } from "react-router-dom";
import useChatStream from "../lib/useChatStream";
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

/* ── MmrChart (fills remaining space) ─────────────────── */

const MmrChart = ({ players, matches, count, histogram }) => {
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
      <OnlineMmrStrip
        players={players}
        matches={matches}
        histogram={histogram}
        onPlayerClick={handlePlayerClick}
      />
    </div>
  );
};

/* ── Home Page ─────────────────────────────────────────── */

const Home = () => {
  const { onlineUsers } = useChatStream();
  const [matches, setMatches] = useState(getInitialData);
  const [playerStats, setPlayerStats] = useState(new Map());
  const [playerProfiles, setPlayerProfiles] = useState(new Map());
  const [histogram, setHistogram] = useState(null);
  const fetchedRef = useRef(new Set());
  const profileFetchedRef = useRef(new Set());

  // Fetch live games
  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const data = await getOngoingMatches();
        setMatches(sortByMMR(data.matches));
      } catch {}
    };
    fetchMatches();
    const interval = setInterval(fetchMatches, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch ladder histogram (all 7 leagues, runs once)
  useEffect(() => {
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
        setHistogram(bins);
      })
      .catch(() => {});
  }, []);

  // Fetch player stats incrementally
  useEffect(() => {
    for (const u of onlineUsers) {
      const tag = u.battleTag;
      if (!tag || fetchedRef.current.has(tag)) continue;
      fetchedRef.current.add(tag);
      getPlayerStats(tag).then((stats) => {
        if (stats) {
          setPlayerStats((prev) => {
            const next = new Map(prev);
            next.set(tag, stats);
            return next;
          });
        }
      });
    }
  }, [onlineUsers]);

  // Fetch player profiles incrementally (for country data → WorldMap)
  useEffect(() => {
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
          setPlayerProfiles((prev) => {
            const next = new Map(prev);
            next.set(tag, profile.country);
            return next;
          });
        }
      });
    }
  }, [onlineUsers, matches]);

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
      const code = country.toUpperCase();
      if (!countries.has(code)) countries.set(code, { online: 0, inGame: 0 });
      const entry = countries.get(code);
      if (inGameTags.has(tag)) entry.inGame++;
      else if (onlineTags.has(tag)) entry.online++;
    }
    return countries;
  }, [playerProfiles, onlineUsers, matches]);

  // Build per-player list with country + MMR for map labels
  const mapPlayers = useMemo(() => {
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
  }, [playerProfiles, playerStats, matches]);

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

  return (
    <div className="home">
      <div className="home-panel home-world-map">
        <div className="home-section-header">
          <span className="home-section-title">World Map</span>
          <span className="home-section-count">{playerCountries.size} countries</span>
        </div>
        <WorldMap playerCountries={playerCountries} players={mapPlayers} />
      </div>
      {stripPlayers.length > 0 && (
        <MmrChart players={stripPlayers} matches={matches} count={onlineUsers.length} histogram={histogram} />
      )}
    </div>
  );
};

export default Home;
