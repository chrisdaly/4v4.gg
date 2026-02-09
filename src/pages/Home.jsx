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
      {events.map((e, i) => (
        <div key={`${e.type}-${e.time.getTime()}-${i}`} className="event-item">
          <span className={`event-dot event-${e.type}`} />
          <span className="event-text">
            {e.type === "join" && <><span className="event-name">{e.player}</span> joined</>}
            {e.type === "leave" && <><span className="event-name">{e.player}</span> left</>}
            {e.type === "game_start" && (
              <><span className="event-name">{e.players.slice(0, 2).join(", ")}</span>
              {e.players.length > 2 ? ` +${e.players.length - 2}` : ""} started</>
            )}
            {e.type === "game_end" && <>Game ended</>}
          </span>
          <span className="event-time">{formatEventTime(e.time)}</span>
        </div>
      ))}
    </div>
  </div>
);

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
  const isDemo = useMemo(() => new URLSearchParams(window.location.search).has("demo"), []);
  const fake = useFakeData(isDemo);
  const { onlineUsers: chatUsers } = useChatStream();
  const [realMatches, setRealMatches] = useState(getInitialData);
  const [realStats, setRealStats] = useState(new Map());
  const [realProfiles, setRealProfiles] = useState(new Map());
  const [realHistogram, setRealHistogram] = useState(null);
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
  useEffect(() => {
    if (isDemo) return;
    for (const u of onlineUsers) {
      const tag = u.battleTag;
      if (!tag || fetchedRef.current.has(tag)) continue;
      fetchedRef.current.add(tag);
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
  }, [onlineUsers, isDemo]);

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
  const prevOnlineRef = useRef(null); // null = first render
  const prevMatchIdsRef = useRef(new Set());

  useEffect(() => {
    const currentTags = new Set(onlineUsers.map((u) => u.battleTag).filter(Boolean));
    const currentMatchIds = new Set((matches || []).map((m) => m.id));

    // First render: set baseline, no events
    if (prevOnlineRef.current === null) {
      prevOnlineRef.current = currentTags;
      prevMatchIdsRef.current = currentMatchIds;
      return;
    }

    const now = new Date();
    const newEvents = [];

    // Joins
    for (const tag of currentTags) {
      if (!prevOnlineRef.current.has(tag)) {
        newEvents.push({ type: "join", player: tag.split("#")[0], tag, time: now });
      }
    }
    // Leaves
    for (const tag of prevOnlineRef.current) {
      if (!currentTags.has(tag)) {
        newEvents.push({ type: "leave", player: tag.split("#")[0], tag, time: now });
      }
    }
    // New matches
    for (const match of (matches || [])) {
      if (!prevMatchIdsRef.current.has(match.id)) {
        const players = match.teams?.flatMap((t) => t.players?.map((p) => p.battleTag?.split("#")[0]).filter(Boolean) || []) || [];
        newEvents.push({ type: "game_start", players, matchId: match.id, time: now });
      }
    }
    // Ended matches
    for (const id of prevMatchIdsRef.current) {
      if (!currentMatchIds.has(id)) {
        newEvents.push({ type: "game_end", matchId: id, time: now });
      }
    }

    prevOnlineRef.current = currentTags;
    prevMatchIdsRef.current = currentMatchIds;

    if (newEvents.length > 0) {
      setEvents((prev) => [...newEvents, ...prev].slice(0, 100));
    }
  }, [onlineUsers, matches]);

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
      <EventFeed events={events} />
    </div>
  );
};

export default Home;
