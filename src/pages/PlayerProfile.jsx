import React, { useState, useEffect, useReducer, useMemo, useRef } from "react";
import { Link, useHistory, useLocation } from "react-router-dom";
import { CountryFlag, Select, Button, Input, Delta, PageNav, Skeleton, SkeletonCircle } from "../components/ui";
import { findPlayerInOngoingMatches } from "../lib/utils";
import {
  getPlayerProfile,
  getPlayerTimelineMerged,
  getPlayerProfilesBatch,
  getPlayerMatches,
  getMatchMvps,
  getPlayerGameModeStatsRaw,
  pickModeRow,
  toModeStats,
  searchLadder,
  getLadder,
} from "../lib/api";
import { cache } from "../lib/cache";
import { matchIdleGapMs, SESSION_GAP_MINUTES, groupIntoSessions } from "../lib/session";
import useSeasons from "../lib/useSeasons";
import useOngoingMatches from "../lib/useOngoingMatches";
import ClipModal from "../components/ClipModal";
import { isStreamerLive } from "../lib/twitchService";
import { FaTwitch } from "react-icons/fa";
import { GiCrossedSwords } from "react-icons/gi";

import FormDots from "../components/FormDots";
import { gateway, GAME_MODE, GAME_MODE_LABEL } from "../lib/params";
import { GameRow, SessionDivider } from "../components/game/index";
import ActivityGraph from "../components/ActivityGraph";
import ActivityOverTime from "../components/ActivityOverTime";
import SeasonHistoryBars from "../components/SeasonHistoryBars";
import { IssueThumb } from "../components/news/IssueCover";
import { getPlayerAllSeasonActivity } from "../lib/api";
import {
  PROFILE_RULES,
  playerMatchLite,
  activeStreak,
  weeklyMentions,
  featuredIn,
} from "../lib/profile/storyline";
import MmrRangeBar from "../components/MmrRangeBar";
import MmrSparkline from "../components/MmrSparkline";
import OngoingGame from "../components/OngoingGame";
import ScoutTab from "./replay-lab/ScoutTab";
import RecentConversations from "../components/RecentConversations";
import { raceMapping, LEAGUES } from "../lib/constants";
import { parseDigestSections, splitQuotes } from "../lib/digestUtils";

const PROFILE_TABS = [
  { key: "matches", label: "Matches" },
  { key: "stats", label: "Stats" },
  { key: "playstyle", label: "Playstyle" },
  { key: "activity", label: "Activity" },
];

const RELAY_URL = import.meta.env.VITE_CHAT_RELAY_URL || "https://4v4gg-chat-relay.fly.dev";
const GAMES_PER_PAGE = 10;
// Below this, a solo MMR is a coin-flip artefact rather than a reading. Half
// the 4v4 ladder has a 1v1 row and most of those are a handful of games.
const SOLO_MIN_GAMES = 10;
const HISTORY_MODES = [
  { key: GAME_MODE.FOUR_V_FOUR, label: "4v4" },
  { key: GAME_MODE.ONE_V_ONE, label: "1v1" },
  { key: null, label: "All" },
];
// One page of the Stats tab's crawl. The same page is the window the header's
// streak tag and the session detection read, so they come free with it.
const STATS_PAGE_SIZE = 100;
const STATS_MAX = 2000;

const MIN_GAMES_FOR_STATS = 3;

// Wilson score lower bound (95% confidence interval)
// Ranks by "lowest plausible rate" - small samples naturally sort lower
const wilsonLB = (wins, total) => {
  if (total === 0) return 0;
  const z = 1.96;
  const p = wins / total;
  const d = 1 + z * z / total;
  return (p + z * z / (2 * total) - z * Math.sqrt((p * (1 - p) + z * z / (4 * total)) / total)) / d;
};

// Helper to get cached player page data
const getCachedPlayerData = (battleTag, season) => {
  const cacheKey = `playerPage:${battleTag.toLowerCase()}:${season}`;
  return cache.get(cacheKey);
};

const PlayerProfile = () => {
  // Extract battleTag from URL
  const getBattleTag = () => {
    const pageUrl = new URL(window.location.href);
    return decodeURIComponent(pageUrl.pathname.split("/").slice(-1)[0]);
  };

  const battleTag = getBattleTag();
  const battleTagLower = battleTag.toLowerCase();
  const playerName = battleTag.split("#")[0];

  const rrHistory = useHistory();
  const rrLocation = useLocation();

  // Consolidated state - batches updates to avoid multiple re-renders
  const [state, updateState] = useReducer(
    (prev, next) => ({ ...prev, ...next }),
    {
      playerData: null,
      profilePic: null,
      country: null,
      twitchName: null,
      isStreaming: false,
      streamInfo: null,
      homePage: null,
      profileMessage: null,
      totalGames: null,
      mostPlayedRace: null,
      matches: [],
      totalMatches: 0,
      sessionGames: [],
      seasonMmrs: [],
      ongoingGame: null,
      ladderStanding: null,
      isLoading: true,
      allyStats: [],
      worstAllyStats: [],
      mapStats: [],
      worstMapStats: [],
      nemesisStats: [],
      preyStats: [],
      allAllies: [],
      allWorstAllies: [],
      allNemesis: [],
      allPrey: [],
      statsSampleSize: 0,
      selectedSeason: null,
      currentPage: 0,
      playerClips: [],
      playerMentions: [],
      seasonLite: [],
    }
  );

  const {
    playerData, profilePic, country, twitchName, isStreaming, streamInfo,
    homePage, profileMessage, totalGames, mostPlayedRace,
    matches, totalMatches, sessionGames, seasonMmrs, ongoingGame, ladderStanding,
    isLoading, allyStats, worstAllyStats, mapStats, worstMapStats, nemesisStats, preyStats,
    allAllies, allWorstAllies, allNemesis, allPrey, statsSampleSize,
    selectedSeason, currentPage,
    playerClips, playerMentions, seasonLite,
  } = state;

  const prevBattleTagRef = useRef(battleTag);
  const fetchedModeRef = useRef(null);
  const hasLoadedProfileRef = useRef(false);
  const latestReq = useRef(0);
  const [activeClip, setActiveClip] = useState(null);
  const { seasons: availableSeasons, currentSeason } = useSeasons();
  const { data: ongoingData } = useOngoingMatches();

  // Read initial tab from URL, default to 'matches'
  const [activeTab, setActiveTabState] = useState(() => {
    const params = new URLSearchParams(rrLocation.search);
    const tab = params.get('tab');
    return ['matches', 'stats', 'playstyle', 'activity'].includes(tab) ? tab : 'matches';
  });

  // Update URL via React Router so other components (ScoutTab) see the change
  const setActiveTab = (tab) => {
    setActiveTabState(tab);
    const p = new URLSearchParams(window.location.search);
    if (tab === 'matches') p.delete('tab');
    else p.set('tab', tab);
    rrHistory.replace({ search: p.toString() ? `?${p}` : '' });
  };
  const [expandedSections, setExpandedSections] = useState({});
  const [playerFilter, setPlayerFilter] = useState("");
  // The history table's mode. 4v4 by default: this is a 4v4 site, and the
  // other modes are here to inform it rather than to share the billing.
  const [historyMode, setHistoryMode] = useState(GAME_MODE.FOUR_V_FOUR);
  // W3C's own count for the current filter. The header's `totalMatches` comes
  // from 4v4 ladder stats, so it cannot answer for 1v1 or for every mode.
  const [historyCount, setHistoryCount] = useState(null);
  // Last game in ANY mode. Half the 4v4 ladder also plays 1v1, and reading
  // "last seen" off 4v4 alone calls those players dead while they are on daily.
  const [lastPlayedAnyMode, setLastPlayedAnyMode] = useState(null);
  const [statAvatars, setStatAvatars] = useState(new Map());
  // Weekly issues (storyline tags, In the news) and the all-season activity
  const [weeklies, setWeeklies] = useState([]);
  const [seasonActivity, setSeasonActivity] = useState(null);
  // The Stats tab's aggregates load on first open, not on first paint
  const [statsLoading, setStatsLoading] = useState(false);
  const statsTriedRef = useRef(null);
  const toggleSection = (key) => setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));

  // Helper to restore from cache in a single batch
  const restoreFromCache = (cached) => {
    updateState({
      playerData: cached.playerData,
      profilePic: cached.profilePic,
      country: cached.country,
      twitchName: cached.twitchName,
      homePage: cached.homePage || null,
      profileMessage: cached.profileMessage || null,
      totalGames: cached.totalGames || null,
      mostPlayedRace: cached.mostPlayedRace ?? null,
      matches: cached.matches || [],
      totalMatches: cached.totalMatches || 0,
      seasonMmrs: cached.seasonMmrs || [],
      ladderStanding: cached.ladderStanding,
      allyStats: cached.allyStats || [],
      worstAllyStats: cached.worstAllyStats || [],
      mapStats: cached.mapStats || [],
      worstMapStats: cached.worstMapStats || [],
      nemesisStats: cached.nemesisStats || [],
      preyStats: cached.preyStats || [],
      allAllies: cached.allAllies || [],
      allWorstAllies: cached.allWorstAllies || [],
      allNemesis: cached.allNemesis || [],
      allPrey: cached.allPrey || [],
      statsSampleSize: cached.statsSampleSize || 0,
      seasonLite: cached.seasonLite || [],
      isLoading: false,
    });
  };

  // Published weekly issues, once per player
  useEffect(() => {
    let cancelled = false;
    fetch(`${RELAY_URL}/api/admin/weekly-digests`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (!cancelled && Array.isArray(data)) setWeeklies(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [battleTag]);

  // All-season activity (per-day game counts, season peaks) for the Activity tab
  useEffect(() => {
    if (activeTab !== 'activity' || seasonActivity) return;
    let cancelled = false;
    getPlayerAllSeasonActivity(battleTag).then((data) => {
      if (!cancelled) setSeasonActivity(data || []);
    });
    return () => {
      cancelled = true;
    };
  }, [activeTab, battleTag, seasonActivity]);

  useEffect(() => {
    setSeasonActivity(null);
  }, [battleTag]);

  // When the player last played anything, not just 4v4. One request: omitting
  // gameMode makes /matches/search return every mode merged and date-sorted.
  useEffect(() => {
    let cancelled = false;
    setLastPlayedAnyMode(null);
    // The season arrives a tick after mount, and W3C answers 400 to a request
    // without one rather than defaulting to the current season
    if (selectedSeason === null) return;
    getPlayerMatches(battleTag, 1, 0, selectedSeason, null).then(({ matches: any }) => {
      if (!cancelled) setLastPlayedAnyMode(any?.[0] || null);
    });
    return () => {
      cancelled = true;
    };
  }, [battleTag, selectedSeason]);

  // Back to 4v4 whenever the player changes, so a filter does not follow you
  // from one profile to the next
  useEffect(() => {
    setHistoryMode(GAME_MODE.FOUR_V_FOUR);
    fetchedModeRef.current = GAME_MODE.FOUR_V_FOUR;
    setHistoryCount(null);
  }, [battleTag]);

  // Refetch page one when the mode filter changes. The initial load already
  // fetched 4v4, so the ref keeps this from firing on first paint.
  useEffect(() => {
    if (fetchedModeRef.current === historyMode) return;
    fetchedModeRef.current = historyMode;
    if (selectedSeason === null) return;
    updateState({ currentPage: 0 });
    fetchMatches(0, false, latestReq.current, historyMode);
  }, [historyMode, selectedSeason]);

  // Reset to the latest season when the player changes or seasons load
  useEffect(() => {
    if (currentSeason === null) return;
    updateState({ selectedSeason: currentSeason });

    const cached = getCachedPlayerData(battleTag, currentSeason);
    if (cached) restoreFromCache(cached);
  }, [battleTag, currentSeason]);

  // Reset and reload when battleTag or season changes
  useEffect(() => {
    if (selectedSeason === null) return;

    const reqId = ++latestReq.current;
    const isPlayerChange = prevBattleTagRef.current !== battleTag;
    prevBattleTagRef.current = battleTag;
    const needsProfile = isPlayerChange || !hasLoadedProfileRef.current;
    hasLoadedProfileRef.current = true;

    const cached = getCachedPlayerData(battleTag, selectedSeason);
    if (cached) {
      restoreFromCache(cached);
    } else if (isPlayerChange) {
      // New player - full reset with loader
      updateState({
        playerData: null, profilePic: null, country: null, twitchName: null,
        isStreaming: false, streamInfo: null, matches: [], totalMatches: 0,
        sessionGames: [], seasonMmrs: [], ongoingGame: null, ladderStanding: null,
        allyStats: [], worstAllyStats: [], mapStats: [], worstMapStats: [],
        nemesisStats: [], preyStats: [], allAllies: [], allWorstAllies: [], allNemesis: [], allPrey: [],
        statsSampleSize: 0, seasonLite: [], currentPage: 0, isLoading: true,
      });
    } else {
      // Season change - clear season data, keep profile visible
      updateState({
        playerData: null, matches: [], totalMatches: 0,
        sessionGames: [], seasonMmrs: [], ladderStanding: null,
        allyStats: [], worstAllyStats: [], mapStats: [], worstMapStats: [],
        nemesisStats: [], preyStats: [], allAllies: [], allWorstAllies: [], allNemesis: [], allPrey: [],
        statsSampleSize: 0, seasonLite: [], currentPage: 0,
      });
    }

    loadAllData(needsProfile, reqId);

    return () => { latestReq.current++; };
  }, [battleTag, selectedSeason]);

  // Track the player's ongoing game from the shared 30s poll
  useEffect(() => {
    if (!ongoingData) return;
    updateState({ ongoingGame: findPlayerInOngoingMatches(ongoingData, battleTag) });
  }, [ongoingData, battleTag]);

  // Fetch player clips and news mentions from relay server
  useEffect(() => {
    const fetchPlayerMedia = async () => {
      try {
        const [clipsRes, digestsRes, todayRes] = await Promise.all([
          fetch(`${RELAY_URL}/api/clips?player=${encodeURIComponent(battleTag)}&limit=10`),
          fetch(`${RELAY_URL}/api/admin/digests`),
          fetch(`${RELAY_URL}/api/admin/stats/today`),
        ]);
        const clipsData = clipsRes.ok ? await clipsRes.json() : { clips: [] };
        // Client-side filter: only valid Twitch clips (with clip_id, thumbnail) tagged with this player
        const taggedClips = (clipsData.clips || []).filter(c =>
          c.clip_id &&
          c.thumbnail_url &&
          c.twitch_login &&
          c.player_tag &&
          c.player_tag.toLowerCase().includes(battleTag.toLowerCase())
        ).slice(0, 4);

        // Parse digests client-side to find individual items mentioning this player
        const mentions = [];
        const escaped = playerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const nameRe = new RegExp(`\\b${escaped}\\b`, "i");
        const SKIP_SECTIONS = new Set(["MENTIONS", "TOPICS", "SPIKES"]);

        const seenSnippets = new Set();
        const findMentions = (digestText) => {
          const sections = parseDigestSections(digestText);
          const items = [];
          for (const s of sections) {
            if (SKIP_SECTIONS.has(s.key)) continue;
            // Split into individual items (semicolon-separated) and match each
            for (const item of s.content.split(/;\s*/)) {
              if (!item.trim() || !nameRe.test(item)) continue;
              // Strip embedded quotes, use just the narrative summary
              const { summary } = splitQuotes(item.trim());
              if (!summary) continue;
              // For DRAMA headlines, take just the part before the pipe
              let snippet = summary;
              if (s.key === "DRAMA") {
                const pipeParts = summary.split(/\s*\|\s*/);
                snippet = pipeParts.length > 1 ? pipeParts[1] : pipeParts[0];
              }
              snippet = snippet.length > 120 ? snippet.slice(0, 120) + "…" : snippet;
              // Deduplicate identical snippets across digests
              if (seenSnippets.has(snippet)) continue;
              seenSnippets.add(snippet);
              items.push({ key: s.key, snippet });
            }
          }
          return items;
        };

        // Check today's live digest first
        if (todayRes.ok) {
          const todayData = await todayRes.json();
          if (todayData.digest) {
            const items = findMentions(todayData.digest);
            if (items.length > 0) {
              mentions.push({ date: todayData.date || new Date().toISOString().slice(0, 10), sections: items });
            }
          }
        }

        // Then check published digests
        if (digestsRes.ok) {
          const digests = await digestsRes.json();
          for (const row of (Array.isArray(digests) ? digests : [])) {
            if (!row.digest) continue;
            const items = findMentions(row.digest);
            if (items.length > 0) {
              mentions.push({ date: row.date, sections: items });
            }
            if (mentions.length >= 10) break;
          }
        }

        updateState({ playerClips: taggedClips, playerMentions: mentions });
      } catch (e) {
        console.error("Failed to fetch player media:", e);
      }
    };
    fetchPlayerMedia();
  }, [battleTag, playerName]);

  // Fetch avatars for stats tab players (single batch call)
  useEffect(() => {
    if (activeTab !== 'stats') return;
    const tags = [
      ...allyStats, ...worstAllyStats, ...nemesisStats, ...preyStats
    ].map(p => p.battleTag).filter(Boolean);
    if (tags.length === 0) return;
    getPlayerProfilesBatch(tags).then(map => setStatAvatars(map));
  }, [activeTab, allyStats, worstAllyStats, nemesisStats, preyStats]);


  // One leg per slice of the page. Each writes its own state the moment it
  // lands, so the header does not wait on the ladder and the ladder does not
  // wait on the match list. The Twitch check is the only real dependency
  // (it needs the profile's twitch name) and it runs detached, so the avatar
  // paints without it.
  const fetchProfileAndStream = async (reqId) => {
    const profile = await getPlayerProfile(battleTag);
    if (latestReq.current !== reqId) return null;
    updateState({
      profilePic: profile?.profilePicUrl,
      country: profile?.country,
      twitchName: profile?.twitch || null,
      homePage: profile?.homePage || null,
      profileMessage: profile?.profileMessage || null,
      totalGames: profile?.totalGames || null,
      mostPlayedRace: profile?.mostPlayedRace ?? null,
    });
    if (profile?.twitch) {
      isStreamerLive(profile.twitch)
        .then((streamStatus) => {
          if (latestReq.current !== reqId) return;
          updateState({
            isStreaming: streamStatus.isLive,
            streamInfo: streamStatus.isLive ? streamStatus : null,
          });
        })
        .catch(() => {});
    }
    return profile;
  };

  const fetchGameModeStats = async (reqId) => {
    const stats = await getPlayerGameModeStatsRaw(battleTag, {
      seasonOverride: selectedSeason,
    }).catch(() => null);
    const fourVsFourStats = pickModeRow(stats, GAME_MODE.FOUR_V_FOUR);
    if (!fourVsFourStats || latestReq.current !== reqId) return null;
    // 1v1 and 2v2 ride along in the same response, so the header's solo line
    // and the history mode filter cost no extra request. Spread rather than
    // reshape: the raw row carries league and division the header reads.
    const withModes = {
      ...fourVsFourStats,
      solo: toModeStats(pickModeRow(stats, GAME_MODE.ONE_V_ONE)),
      twos: toModeStats(pickModeRow(stats, GAME_MODE.TWO_V_TWO)),
    };
    updateState({
      playerData: withModes,
      totalMatches: (fourVsFourStats.wins || 0) + (fourVsFourStats.losses || 0),
    });
    return withModes;
  };

  // The header's streak tag reads the season from the player's side. One page
  // is deeper than any streak worth a tag, which keeps the Stats tab's full
  // crawl (up to STATS_MAX matches) off the first paint.
  const fetchSeasonLite = async (reqId) => {
    const { matches } = await getPlayerMatches(battleTag, STATS_PAGE_SIZE, 0, selectedSeason);
    if (latestReq.current !== reqId) return [];
    const lite = matches.map((m) => playerMatchLite(m, battleTagLower)).filter(Boolean);
    updateState({ seasonLite: lite });
    // The session needs a wider window than the ten-game page: a long sitting
    // runs past it. This page is that window, so it costs no extra request.
    processMatchData(matches);
    return lite;
  };

  const loadAllData = async (fetchProfile = true, reqId = latestReq.current) => {
    const isStale = () => latestReq.current !== reqId;
    try {
      const [profile, newPlayerData, newMatches, newSeasonMmrs, newLadderStanding, newSeasonLite] =
        await Promise.all([
          fetchProfile ? fetchProfileAndStream(reqId) : Promise.resolve(null),
          fetchGameModeStats(reqId),
          fetchMatches(0, true, reqId),
          fetchMmrTimeline(true, reqId),
          fetchLadderStanding(true, reqId),
          fetchSeasonLite(reqId),
        ]);

      if (isStale()) return;

      // What the page opens with, for an instant second visit. The Stats
      // tab's aggregates keep their own cache entry, written when that tab
      // is first opened.
      cache.set(`playerPage:${battleTagLower}:${selectedSeason}`, {
        playerData: newPlayerData,
        profilePic: fetchProfile ? profile?.profilePicUrl : profilePic,
        country: fetchProfile ? profile?.country : country,
        twitchName: fetchProfile ? profile?.twitch || null : twitchName,
        homePage: fetchProfile ? profile?.homePage || null : homePage,
        profileMessage: fetchProfile ? profile?.profileMessage || null : profileMessage,
        totalGames: fetchProfile ? profile?.totalGames || null : totalGames,
        mostPlayedRace: fetchProfile ? profile?.mostPlayedRace ?? null : mostPlayedRace,
        matches: newMatches || [],
        totalMatches: newPlayerData
          ? (newPlayerData.wins || 0) + (newPlayerData.losses || 0)
          : 0,
        seasonMmrs: newSeasonMmrs || [],
        ladderStanding: newLadderStanding,
        seasonLite: newSeasonLite || [],
      }, 5 * 60 * 1000);
    } catch (error) {
      console.error("Error loading player data:", error);
    } finally {
      if (!isStale()) updateState({ isLoading: false });
    }
  };

  const fetchMatches = async (page, returnData = false, reqId = latestReq.current, mode = historyMode) => {
    const { matches: pageMatches, count } = await getPlayerMatches(
      battleTag,
      GAMES_PER_PAGE,
      page * GAMES_PER_PAGE,
      selectedSeason,
      mode
    );
    if (latestReq.current !== reqId) return returnData ? [] : undefined;
    const matchUpdate = { matches: pageMatches };
    if (page === 0) setHistoryCount(count ?? null);
    updateState(matchUpdate);
    return returnData ? pageMatches : undefined;
  };

  const fetchMmrTimeline = async (returnData = false, reqId = latestReq.current) => {
    const mmrs = await getPlayerTimelineMerged(battleTag, selectedSeason);
    if (latestReq.current !== reqId) return returnData ? [] : undefined;
    updateState({ seasonMmrs: mmrs });
    if (returnData) return mmrs;
  };

  const processMatchData = (matchList) => {
    if (!matchList || matchList.length === 0) return;

    const sessionGapMs = SESSION_GAP_MINUTES * 60 * 1000;
    // the same two hours decide whether the last session is still running
    const sessionMaxAgeMs = sessionGapMs;
    const sessionMatches = [];

    const mostRecentEndTime = new Date(matchList[0]?.endTime);
    const now = new Date();

    if (now - mostRecentEndTime > sessionMaxAgeMs) {
      updateState({ sessionGames: [] });
    } else {
      for (let i = 0; i < matchList.length; i++) {
        const match = matchList[i];
        let playerInMatch = null;
        let playerWon = false;
        for (const team of match.teams) {
          const player = team.players.find(p => p.battleTag.toLowerCase() === battleTagLower);
          if (player) { playerInMatch = player; playerWon = player.won; break; }
        }
        if (!playerInMatch) continue;
        if (i > 0) {
          const gapMs = matchIdleGapMs(matchList[i - 1], match);
          if (gapMs > sessionGapMs) break;
        }
        sessionMatches.push({ ...match, playerData: playerInMatch, won: playerWon });
      }
      updateState({ sessionGames: sessionMatches });
    }
  };

  // Two stages. The search call already carries the rank and the league, so
  // the header's "#123" lands with it; the league table is a separate 80 KB
  // download, needed only for the five neighbour rows, so the card fills in
  // when it arrives. getLadder caches per league, which every player in that
  // league then shares.
  const fetchLadderStanding = async (returnData = false, reqId = latestReq.current) => {
    try {
      const searchResults = await searchLadder(battleTag.split("#")[0], selectedSeason);
      if (!Array.isArray(searchResults) || latestReq.current !== reqId) {
        return returnData ? null : undefined;
      }

      const playerResult = searchResults.find(r => {
        const tag1 = r.playersInfo?.[0]?.battleTag?.toLowerCase();
        const tag2 = r.player?.playerIds?.[0]?.battleTag?.toLowerCase();
        return tag1 === battleTagLower || tag2 === battleTagLower;
      });

      if (!playerResult) return returnData ? null : undefined;

      const leagueId = playerResult.league;
      const league = LEAGUES.find(l => l.id === leagueId);
      const partial = {
        league,
        leagueId,
        playerRank: playerResult.rankNumber,
        playerIndex: null,
        neighbors: null,
        totalInLeague: null,
      };
      updateState({ ladderStanding: partial });

      const ladderData = await getLadder(leagueId, selectedSeason);
      if (!Array.isArray(ladderData) || latestReq.current !== reqId) {
        return returnData ? partial : undefined;
      }

      const playerIndex = ladderData.findIndex(
        r => r.playersInfo?.[0]?.battleTag?.toLowerCase() === battleTagLower
      );
      // /ladder/{league} only returns that league's top 100, so a player
      // ranked below it has no neighbours to show. The card keeps the league
      // and the rank rather than waiting on rows that will never arrive.
      if (playerIndex === -1) {
        const noNeighbors = { ...partial, neighbors: [] };
        updateState({ ladderStanding: noNeighbors });
        return returnData ? noNeighbors : undefined;
      }

      // Two players above and two below
      const startIdx = Math.max(0, playerIndex - 2);
      const endIdx = Math.min(ladderData.length, playerIndex + 3);

      const standing = {
        ...partial,
        playerIndex,
        neighbors: ladderData.slice(startIdx, endIdx),
        totalInLeague: ladderData.length,
      };
      updateState({ ladderStanding: standing });
      if (returnData) return standing;
    } catch (error) {
      console.error("Error fetching ladder standing:", error);
      return returnData ? null : undefined;
    }
  };

  const fetchStatistics = async (returnData = false, reqId = latestReq.current) => {
    try {
      // Check past-season stats cache first (not for "All" or current season)
      const currentSeasonId = availableSeasons[0]?.id;
      const isPastSeason = selectedSeason > 0 && selectedSeason < currentSeasonId;
      const statsCacheKey = `playerStats:${battleTagLower}:${selectedSeason}`;

      if (isPastSeason) {
        const cached = cache.get(statsCacheKey);
        if (cached) {
          if (latestReq.current !== reqId) return returnData ? null : undefined;
          updateState(cached);
          return returnData ? cached : undefined;
        }
      }

      // The first page is the one fetchSeasonLite already pulled, so it comes
      // from cache; the rest go out together.
      const first = await getPlayerMatches(battleTag, STATS_PAGE_SIZE, 0, selectedSeason);
      if (first.matches.length === 0) return returnData ? null : undefined;

      const allMatches = [...first.matches];
      const total = first.count || allMatches.length;

      if (total > STATS_PAGE_SIZE) {
        const pages = await Promise.all(
          Array.from(
            { length: Math.ceil((Math.min(total, STATS_MAX) - STATS_PAGE_SIZE) / STATS_PAGE_SIZE) },
            (_, i) =>
              getPlayerMatches(battleTag, STATS_PAGE_SIZE, (i + 1) * STATS_PAGE_SIZE, selectedSeason)
          )
        );
        for (const page of pages) allMatches.push(...page.matches);
      }

      const sampleSize = allMatches.length;
      // The whole season from the player's side: a longer tail than the single
      // page the header opened with, so the streak tag gets more accurate
      const seasonLite = allMatches.map((m) => playerMatchLite(m, battleTagLower)).filter(Boolean);

      // Calculate ally stats
      const allies = {};
      // Calculate map stats
      const maps = {};
      // Calculate opponent stats (for nemesis)
      const opponents = {};

      for (const match of allMatches) {
        // Find player's team and opponent team
        let playerTeam = null;
        let opponentTeam = null;
        let playerWon = false;

        for (const team of match.teams) {
          const player = team.players.find(p => p.battleTag.toLowerCase() === battleTagLower);
          if (player) {
            playerTeam = team;
            playerWon = player.won;
          } else {
            opponentTeam = team;
          }
        }

        if (!playerTeam) continue;

        // Aggregate ally stats (teammates on player's team)
        for (const teammate of playerTeam.players) {
          if (teammate.battleTag.toLowerCase() === battleTagLower) continue;

          const tag = teammate.battleTag;
          if (!allies[tag]) {
            allies[tag] = { battleTag: tag, name: teammate.name, wins: 0, losses: 0, total: 0 };
          }
          allies[tag].total += 1;
          if (playerWon) {
            allies[tag].wins += 1;
          } else {
            allies[tag].losses += 1;
          }
        }

        // Aggregate opponent stats (for nemesis - who we lose to most)
        if (opponentTeam) {
          for (const opponent of opponentTeam.players) {
            const tag = opponent.battleTag;
            if (!opponents[tag]) {
              opponents[tag] = { battleTag: tag, name: opponent.name, wins: 0, losses: 0, total: 0 };
            }
            opponents[tag].total += 1;
            if (playerWon) {
              opponents[tag].losses += 1; // Our win = their loss
            } else {
              opponents[tag].wins += 1; // Our loss = their win (they beat us)
            }
          }
        }

        // Aggregate map stats - use mapName and clean it
        const rawMapName = match.mapName;
        if (rawMapName) {
          // Clean map name: remove "(4) " prefix
          const cleanMapName = rawMapName.replace(/^\(\d\)\s*/, "");
          if (!maps[cleanMapName]) {
            maps[cleanMapName] = { name: cleanMapName, wins: 0, losses: 0, total: 0 };
          }
          maps[cleanMapName].total += 1;
          if (playerWon) {
            maps[cleanMapName].wins += 1;
          } else {
            maps[cleanMapName].losses += 1;
          }
        }
      }

      // Process allies with win rates
      const alliesWithRates = Object.values(allies)
        .filter(a => a.total >= MIN_GAMES_FOR_STATS)
        .map(a => ({ ...a, winRate: Math.round((a.wins / a.total) * 100) }));

      // Best allies: Wilson-scored win rate (full sorted list + top 3)
      const allAlliesSorted = [...alliesWithRates]
        .sort((a, b) => wilsonLB(b.wins, b.total) - wilsonLB(a.wins, a.total));
      const bestAllies = allAlliesSorted.slice(0, 5);

      // Worst allies: Wilson-scored loss rate (full sorted list + top 3)
      const allWorstAlliesSorted = [...alliesWithRates]
        .filter(a => a.losses > 0)
        .sort((a, b) => wilsonLB(b.losses, b.total) - wilsonLB(a.losses, a.total));
      const worstAllies = allWorstAlliesSorted.slice(0, 5);

      // Process maps with win rates
      const mapsWithRates = Object.values(maps)
        .filter(m => m.total >= MIN_GAMES_FOR_STATS)
        .map(m => ({ ...m, winRate: Math.round((m.wins / m.total) * 100) }));

      // Best maps: Wilson-scored win rate
      const bestMaps = [...mapsWithRates]
        .sort((a, b) => wilsonLB(b.wins, b.total) - wilsonLB(a.wins, a.total))
        .slice(0, 5);

      // Worst maps: Wilson-scored loss rate
      const worstMaps = [...mapsWithRates]
        .filter(m => m.losses > 0)
        .sort((a, b) => wilsonLB(b.losses, b.total) - wilsonLB(a.losses, a.total))
        .slice(0, 3);

      // Nemesis: Wilson-scored opponent win rate against us (full sorted list + top 3)
      const allNemesisSorted = Object.values(opponents)
        .filter(o => o.total >= MIN_GAMES_FOR_STATS && o.wins > 0)
        .map(o => ({ ...o, winRate: Math.round((o.wins / o.total) * 100) }))
        .sort((a, b) => wilsonLB(b.wins, b.total) - wilsonLB(a.wins, a.total));
      const nemesisList = allNemesisSorted.slice(0, 5);

      // Prey: opponents we beat the most (Wilson-scored our win rate against them)
      const allPreySorted = Object.values(opponents)
        .filter(o => o.total >= MIN_GAMES_FOR_STATS && o.losses > 0)
        .map(o => ({ ...o, winRate: Math.round((o.losses / o.total) * 100) }))
        .sort((a, b) => wilsonLB(b.losses, b.total) - wilsonLB(a.losses, a.total));
      const preyList = allPreySorted.slice(0, 5);

      const result = {
        allyStats: bestAllies, worstAllyStats: worstAllies,
        mapStats: bestMaps, worstMapStats: worstMaps, nemesisStats: nemesisList, preyStats: preyList,
        allAllies: allAlliesSorted, allWorstAllies: allWorstAlliesSorted,
        allNemesis: allNemesisSorted, allPrey: allPreySorted,
        statsSampleSize: sampleSize,
        seasonLite,
      };

      // Cache past-season stats for 7 days (data never changes)
      if (isPastSeason) {
        cache.set(statsCacheKey, result, 7 * 24 * 60 * 60 * 1000);
      }

      if (latestReq.current !== reqId) return returnData ? null : undefined;
      updateState(result);

      if (returnData) return result;
    } catch (error) {
      console.error("Error fetching statistics:", error);
      return returnData ? null : undefined;
    }
  };

  // The ally/nemesis/map aggregates: up to STATS_MAX matches, by far the
  // heaviest fetch on the page, and nothing outside this tab renders them.
  // One attempt per player and season.
  useEffect(() => {
    if (activeTab !== 'stats' || selectedSeason === null) return;
    const key = `${battleTagLower}:${selectedSeason}`;
    if (statsTriedRef.current === key) return;
    statsTriedRef.current = key;
    setStatsLoading(true);
    fetchStatistics(true, latestReq.current).finally(() => setStatsLoading(false));
  }, [activeTab, battleTagLower, selectedSeason]);

  const handleSeasonChange = (e) => {
    updateState({ selectedSeason: parseInt(e.target.value, 10) });
  };

  const handlePageChange = async (newPage) => {
    setPlayerFilter("");
    updateState({ currentPage: newPage });
    await fetchMatches(newPage);
    window.scrollTo({ top: document.querySelector('.match-history-section')?.offsetTop - 100 || 0, behavior: 'smooth' });
  };

  // MVP per match on the page, from the relay's stored scores. Looked up after
  // the rows are drawn, so the table never waits on it; a match is asked for
  // once and remembered across pages.
  const [mvpByMatch, setMvpByMatch] = useState({});
  useEffect(() => {
    const ids = matches
      .filter((m) => m.gameMode === GAME_MODE.FOUR_V_FOUR && !(m.id in mvpByMatch))
      .map((m) => m.id);
    if (ids.length === 0) return;
    let cancelled = false;
    getMatchMvps(ids).then((mvp) => {
      if (cancelled) return;
      // Record the misses too, so a match with no stored scores is not re-asked
      const seen = Object.fromEntries(ids.map((id) => [id, mvp[id] ?? null]));
      setMvpByMatch((prev) => ({ ...prev, ...seen }));
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches]);

  // Filter matches by player name (allies + opponents) - must be before early return to preserve hook order
  const filteredMatches = useMemo(() => {
    const q = playerFilter.trim().toLowerCase();
    if (!q) return matches;
    return matches.filter((match) => {
      const allPlayers = (match.teams || []).flatMap((t) => t.players || []);
      return allPlayers.some(
        (p) => p.battleTag?.toLowerCase() !== battleTagLower && p.name?.toLowerCase().includes(q)
      );
    });
  }, [matches, playerFilter, battleTagLower]);

  // The page as sittings, for the dividers between them. A player filter
  // leaves holes in the timeline, so a filtered table is a flat list.
  const sessions = useMemo(
    () => (playerFilter.trim() ? null : groupIntoSessions(filteredMatches, battleTag)),
    [filteredMatches, playerFilter, battleTag]
  );

  // Calculate derived stats
  const sessionWins = sessionGames.filter(g => g.won).length;
  const sessionLosses = sessionGames.length - sessionWins;
  const sessionMmrChange = sessionGames.length > 0
    ? (sessionGames[0].playerData?.currentMmr || 0) - (sessionGames[sessionGames.length - 1].playerData?.oldMmr || 0)
    : 0;
  const winrate = playerData && (playerData.wins + playerData.losses) > 0
    ? Math.round((playerData.wins / (playerData.wins + playerData.losses)) * 100)
    : 0;
  // Solo standing, free in the game-mode-stats response the header already
  // fetched. Under a handful of games the MMR has not converged on anything,
  // so showing it would be worse than showing nothing.
  const soloStats =
    playerData?.solo && playerData.solo.games >= SOLO_MIN_GAMES ? playerData.solo : null;
  // The 1v1 and 4v4 MMR scales differ, so the percentile is the honest
  // cross-mode number. W3C hands it over in the same row.
  const soloPercentile = (() => {
    if (typeof soloStats?.quantile !== 'number') return null;
    const top = Math.max(1, Math.round((1 - soloStats.quantile) * 100));
    return top <= 50 ? `top ${top}%` : null;
  })();

  // Whichever is newer: the loaded page's latest game, or the latest game in
  // any mode. A 4v4-only read calls daily 1v1 players inactive for months.
  const lastSeenMatch = (() => {
    const candidates = [matches[0], lastPlayedAnyMode].filter((m) => m?.endTime);
    if (candidates.length === 0) return null;
    return candidates.sort((a, b) => new Date(b.endTime) - new Date(a.endTime))[0];
  })();
  const lastSeen = (() => {
    if (!lastSeenMatch) return null;
    const diffMs = Date.now() - new Date(lastSeenMatch.endTime);
    const diffDays = Math.floor(diffMs / 86400000);
    const diffHours = Math.floor(diffMs / 3600000);
    if (diffHours < 1) return "< 1h ago";
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  })();
  // Say so when the last game was not 4v4, or the number looks like a 4v4 one
  const lastSeenMode =
    lastSeenMatch?.gameMode && lastSeenMatch.gameMode !== GAME_MODE.FOUR_V_FOUR
      ? GAME_MODE_LABEL[lastSeenMatch.gameMode] || null
      : null;
  // Both sides' heroes need a wider hero column, which only works when every
  // row in the table is 1v1. Under "All" the rows stay their 4v4 shape.
  const isSoloHistory = historyMode === GAME_MODE.ONE_V_ONE;
  // A 4v4-only player should not be shown a filter with nothing behind it
  const hasOtherModes = Boolean(playerData?.solo?.games || playerData?.twos?.games);
  const historyTotal =
    historyMode === GAME_MODE.FOUR_V_FOUR ? totalMatches : historyCount ?? 0;
  const totalPages = Math.ceil(historyTotal / GAMES_PER_PAGE);

  // Storyline: the header tags and the issues that feature this player
  const newestFirst = [...seasonLite].sort((a, b) => new Date(b.endTime) - new Date(a.endTime));
  const streak = activeStreak(newestFirst);
  const seasonPeak = seasonMmrs.length > 0 ? Math.max(...seasonMmrs) : null;
  const atPeak = Boolean(playerData?.mmr && seasonPeak && playerData.mmr >= seasonPeak);
  const featured = featuredIn(weeklies, playerName);
  const issueMentions = weeklyMentions(weeklies, playerName, 5);
  const storyTags = [];
  if (streak.length >= PROFILE_RULES.streakTag) {
    storyTags.push({ key: "streak", tone: streak.won ? "green" : "red", text: `${streak.length}${streak.won ? "W" : "L"} streak`, href: "#match-history" });
  }
  if (atPeak) storyTags.push({ key: "peak", tone: "gold", text: "At season peak", href: "#season-mmr" });
  if (featured) storyTags.push({ key: "featured", tone: "white", text: `Featured in No. ${featured.issueNo}`, href: `/news?week=${featured.week_start}` });
  // Render news snippet, replacing W/L streaks with FormDots
  const WL_RE = /[WL]{4,}/g;
  const renderSnippet = (text) => {
    const parts = [];
    let last = 0;
    for (const m of text.matchAll(WL_RE)) {
      if (m.index > last) parts.push(text.slice(last, m.index));
      const form = [...m[0]].map(c => c === 'W');
      parts.push(<FormDots key={m.index} form={form} size="small" />);
      last = m.index + m[0].length;
    }
    if (last < text.length) parts.push(text.slice(last));
    return parts.length > 1 ? parts : text;
  };

  return (
    <div className="player-page">
        <PageNav backTo="/ladder" backLabel="Ladder" tabs={PROFILE_TABS} activeTab={activeTab} onTab={setActiveTab} />
        <header className="player-header reveal" style={{ "--delay": "0.05s" }}>
          <div className="player-header-left">
            <div className="hd-pic-wrapper">
              {profilePic && <img src={profilePic} alt="" className="hd-pic" />}
              {!profilePic && isLoading && <SkeletonCircle $size="88px" />}
              {country && <CountryFlag name={country.toLowerCase()} className="hd-flag" />}
            </div>
            <div className="hd-info">
              <div className="hd-name-row">
                <span className="hd-name">{playerName}</span>
                {ongoingGame && <GiCrossedSwords className="in-game-icon" title="In Game" />}
                {isStreaming && twitchName && (
                  <a
                    href={`https://twitch.tv/${twitchName}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="twitch-link"
                    title={streamInfo?.title || "Live on Twitch"}
                  >
                    <FaTwitch className="twitch-icon" style={{ fill: 'var(--twitch-purple)' }} />
                  </a>
                )}
              </div>
              {playerData && (
                <>
                  <div className="hd-primary-row">
                    {ladderStanding && (
                      <span className="hd-rank">#{ladderStanding.playerRank}</span>
                    )}
                    <span className="hd-mmr">{playerData.mmr?.toLocaleString('en-US')}</span>
                    <span className="hd-mmr-label">MMR</span>
                  </div>
                  <div className="hd-meta-row">
                    <span className="hd-wins">{playerData.wins}W</span>
                    <span className="hd-losses">– {playerData.losses}L</span>
                    <span className="hd-sep">·</span>
                    <span className="hd-winrate">{winrate}%</span>
                  </div>
                  {totalGames && (
                    <div className="hd-games-row">
                      <span className="hd-games">{totalGames.toLocaleString()} games</span>
                    </div>
                  )}
                  {soloStats && (
                    <div className="hd-solo-row" title="Solo ladder standing this season">
                      <span className="hd-solo-label">Solo</span>
                      <span className="hd-solo-mmr">{soloStats.mmr.toLocaleString('en-US')}</span>
                      {soloPercentile && <span className="hd-solo-pct">{soloPercentile}</span>}
                      <span className="hd-sep">·</span>
                      <span className="hd-solo-games">{soloStats.games} games</span>
                    </div>
                  )}
                  {lastSeen && (
                    <div className="hd-footer-row">
                      <span className="hd-lastseen-inline">
                        Last seen <strong>{lastSeen}</strong>
                        {lastSeenMode && <span className="hd-lastseen-mode"> in {lastSeenMode}</span>}
                      </span>
                    </div>
                  )}
                </>
              )}
              {!playerData && isLoading && (
                <div className="hd-skeleton">
                  <Skeleton $w="140px" $h="34px" />
                  <Skeleton $w="100px" $h="16px" />
                </div>
              )}
              {storyTags.length > 0 && (
                <div className="hd-tags" data-story-tags={storyTags.length}>
                  {storyTags.map((t) =>
                    t.href.startsWith("/") ? (
                      <Link key={t.key} to={t.href} className={`hd-tag hd-tag--${t.tone}`} data-story-tag={t.key}>
                        <span className="hd-tag-dot" />{t.text}
                      </Link>
                    ) : (
                      <a key={t.key} href={t.href} className={`hd-tag hd-tag--${t.tone}`} data-story-tag={t.key}>
                        <span className="hd-tag-dot" />{t.text}
                      </a>
                    )
                  )}
                </div>
              )}
            </div>
          </div>

          {(homePage || profileMessage) && (
            <div className="hd-bio">
              {profileMessage && (
                <p className="hd-quote">{profileMessage}</p>
              )}
              {homePage && (
                <div className="hd-bio-meta">
                  <a href={homePage} target="_blank" rel="noopener noreferrer" className="hd-bio-link">
                    {homePage.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}
            </div>
          )}
          <div className="season-selector hd-season hd-season-corner">
            <Select value={selectedSeason ?? ""} onChange={handleSeasonChange}>
              {availableSeasons.map((s) => (
                <option key={s.id} value={s.id}>S{s.id}</option>
              ))}
            </Select>
          </div>
          <a
            href={`https://www.w3champions.com/player/${encodeURIComponent(battleTag)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hd-w3c-corner"
          >
            <img src="/frames/w3c-logos/small-logo.png" alt="" className="hd-w3c-logo" />
          </a>
        </header>

      {/* Matches Tab Content */}
      {activeTab === 'matches' && (
        <>
      <div className="player-content reveal" style={{ "--delay": "0.10s" }}>
          {/* Main Content */}
          <main className="player-main">
            {/* Live Game Section */}
            {ongoingGame && (
              <section className="live-game-section" id="live">
                <div className="section-header">
                  <h2 className="section-title">Live Game</h2>
                </div>
                <OngoingGame
                  ongoingGameData={ongoingGame}
                  compact={true}
                  streamerTag={battleTag}
                />
              </section>
            )}

            {/* Match History Table */}
            <section className="match-history-section" id="match-history">
              <div className="section-header">
                <h2 className="section-title">Match History</h2>
                <div className="mh-controls">
                  {hasOtherModes && (
                    <div className="mh-modes" role="group" aria-label="Game mode">
                      {HISTORY_MODES.map((m) => (
                        <button
                          key={m.label}
                          type="button"
                          className="mh-mode"
                          data-active={historyMode === m.key ? "true" : undefined}
                          onClick={() => setHistoryMode(m.key)}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  )}
                  <Input
                    type="text"
                    placeholder="Filter by player..."
                    value={playerFilter}
                    onClear={() => setPlayerFilter("")}
                    onChange={(e) => setPlayerFilter(e.target.value)}
                  />
                  <span className="match-count">
                    {playerFilter ? `${filteredMatches.length} / ${matches.length}` : `${historyTotal} games`}
                  </span>
                </div>
              </div>

              <div className={`match-history-table${isSoloHistory ? " mh-solo" : ""}`}>
                <div className="mh-header">
                  <div className="mh-col map">Map</div>
                  <div className="mh-col heroes">Heroes</div>
                  <div className="mh-col team">{isSoloHistory ? "You" : "Your team"}</div>
                  <div className="mh-col avg">Avg</div>
                  <div className="mh-col opponents">{isSoloHistory ? "Opponent" : "Opponents"}</div>
                  {/* The mirrored hero column only exists on a 1v1 table */}
                  {isSoloHistory && <div className="mh-col heroes">Heroes</div>}
                </div>
                {(sessions || [{ matches: filteredMatches }]).map((session, si) => {
                  // A sitting cut by the page edge may continue on the page
                  // before or after, so its record is withheld rather than
                  // shown as a fragment
                  const partial = !sessions ? false
                    : si === 0 && currentPage > 0 ? "prev"
                    : si === sessions.length - 1 && currentPage < totalPages - 1 ? "next"
                    : false;
                  return (
                    <React.Fragment key={session.matches[0]?.id || si}>
                      {sessions && <SessionDivider session={session} partial={partial} />}
                      {session.matches.map((match, idx) => (
                        <GameRow
                          key={match.id}
                          game={match}
                          playerBattleTag={battleTag}
                          striped={idx % 2 === 1}
                          showOpponentHeroes={isSoloHistory}
                          mvpTag={mvpByMatch[match.id]}
                        />
                      ))}
                    </React.Fragment>
                  );
                })}
                {matches.length === 0 && isLoading &&
                  Array.from({ length: GAMES_PER_PAGE }, (_, i) => (
                    <div className="mh-row-skeleton" key={i}>
                      <Skeleton $h="28px" />
                    </div>
                  ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="pagination">
                  <Button
                    $ghost
                    disabled={currentPage === 0}
                    onClick={() => handlePageChange(currentPage - 1)}
                  >
                    Prev
                  </Button>
                  <div className="page-numbers">
                    {[...Array(Math.min(5, totalPages))].map((_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i;
                      } else if (currentPage < 3) {
                        pageNum = i;
                      } else if (currentPage > totalPages - 4) {
                        pageNum = totalPages - 5 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <Button
                          $pill
                          key={pageNum}
                          data-active={currentPage === pageNum ? "true" : undefined}
                          onClick={() => handlePageChange(pageNum)}
                        >
                          {pageNum + 1}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    $ghost
                    disabled={currentPage >= totalPages - 1}
                    onClick={() => handlePageChange(currentPage + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </section>
          </main>

          {/* Sidebar */}
          <aside className="player-sidebar">
            {/* Ladder Standing */}
            {ladderStanding && (
              <div className="ladder-standing">
                <div className="ls-header">
                  <img src={ladderStanding.league?.icon} alt="" className="ls-league-icon" />
                  <span className="ls-league-name">{ladderStanding.league?.name}</span>
                </div>
                <div className="ls-list">
                  {ladderStanding.neighbors === null &&
                    Array.from({ length: 5 }, (_, i) => (
                      <div className="ls-row ls-row--skeleton" key={i}>
                        <Skeleton $h="14px" />
                      </div>
                    ))}
                  {(ladderStanding.neighbors || []).map((n) => {
                    const isMe = n.playersInfo?.[0]?.battleTag?.toLowerCase() === battleTagLower;
                    const nTag = n.playersInfo?.[0]?.battleTag;
                    return (
                      <Link
                        key={n.id}
                        to={isMe ? '#' : `/player/${encodeURIComponent(nTag)}`}
                        className={`ls-row ${isMe ? 'me' : ''}`}
                        onClick={e => isMe && e.preventDefault()}
                      >
                        <span className="ls-rank">#{n.rankNumber}</span>
                        <img src={raceMapping[n.playersInfo?.[0]?.calculatedRace]} alt="" className="ls-race" />
                        <span className="ls-name">{n.player?.name}</span>
                        <span className="ls-mmr">{n.player?.mmr?.toLocaleString('en-US')}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Session Summary Card */}
            {sessionGames.length > 0 && (() => {
              // Calculate session duration (oldest game start to newest game end)
              const oldestGame = sessionGames[sessionGames.length - 1];
              const newestGame = sessionGames[0];
              const sessionStart = oldestGame?.startTime ? new Date(oldestGame.startTime) : null;
              const sessionEnd = newestGame?.endTime ? new Date(newestGame.endTime) : null;

              let sessionDuration = null;
              if (sessionStart && sessionEnd) {
                const durationMs = sessionEnd - sessionStart;
                const hours = Math.floor(durationMs / (1000 * 60 * 60));
                const mins = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
                sessionDuration = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
              }

              return (
                <div className="session-card">
                  <h3 className="sc-title">Session Summary</h3>
                  <div className="sc-stats">
                    <div className="sc-stat">
                      <span className="sc-label">Duration</span>
                      <span className="sc-value">{sessionDuration || `${sessionGames.length} games`}</span>
                    </div>
                    <div className="sc-stat">
                      <span className="sc-label">Record</span>
                      <span className="sc-value">{sessionWins}W-{sessionLosses}L</span>
                    </div>
                    <div className="sc-stat">
                      <span className="sc-label">MMR</span>
                      <Delta value={sessionMmrChange} />
                    </div>
                  </div>
                  <div className="sc-form">
                    <FormDots form={sessionGames.slice().reverse().map(g => g.won)} size="medium" />
                  </div>
                </div>
              );
            })()}

            {/* MMR Thermometer */}
            {seasonMmrs.length > 2 && (() => {
              const peakIdx = seasonMmrs.indexOf(seasonPeak);
              const lo = Math.min(...seasonMmrs);
              const peakX = (peakIdx / (seasonMmrs.length - 1)) * 100;
              const peakY = seasonPeak === lo ? 50 : 0;
              return (
                <div className="mmr-thermometer-card" id="season-mmr">
                  <h3 className="mtc-title">Season {selectedSeason} MMR</h3>
                  <div className="mtc-chart">
                    <MmrSparkline data={seasonMmrs} width="100%" height={36} className="mtc-sparkline" />
                    <span
                      className={`mtc-peak ${atPeak ? "mtc-peak--now" : ""}`}
                      style={{ left: `${peakX}%`, top: `${peakY}%` }}
                      title={`Season peak ${seasonPeak.toLocaleString("en-US")}`}
                      data-peak-marker={seasonPeak}
                    />
                  </div>
                  <MmrRangeBar
                    low={lo}
                    peak={seasonPeak}
                    current={seasonMmrs[seasonMmrs.length - 1]}
                  />
                  {atPeak && <span className="mtc-at-peak" data-at-peak>AT PEAK · SEASON HIGH</span>}
                </div>
              );
            })()}

            {/* Activity Graph */}
            <ActivityGraph
              battleTag={battleTag}
              currentSeason={selectedSeason}
              gateway={gateway}
            />

          </aside>
        </div>
        </>
      )}

      {/* Stats Tab Content */}
      {activeTab === 'stats' && (
        <div className="stats-tab-content reveal" style={{ "--delay": "0.1s" }}>
          {statsLoading && statsSampleSize === 0 && (
            <div className="stats-tab-skeleton">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton $h="180px" $radius="var(--radius-md)" key={i} />
              ))}
            </div>
          )}
          {statsSampleSize > 0 && (
            <p className="stats-sample-header">Based on last {statsSampleSize} games</p>
          )}
          <div className="stats-tab-grid">
            {allyStats.length > 0 && (() => {
              const expanded = expandedSections.bestAllies;
              const displayList = expanded ? allAllies : allyStats;
              return (
                <div className="stat-card stat-card--green">
                  <h3 className="stat-card-title">Best Allies</h3>
                  <p className="stat-card-subtitle">Teammates you win with most</p>
                  <div className="stat-card-list">
                    {displayList.map((ally, idx) => {
                      const pic = statAvatars.get(ally.battleTag)?.profilePicUrl;
                      return (
                        <Link key={ally.battleTag} to={`/player/${encodeURIComponent(ally.battleTag)}`} className="stat-row">
                          <span className="stat-rank">#{idx + 1}</span>
                          {pic ? <img src={pic} alt="" className="stat-avatar-img" /> : <span className="stat-avatar stat-avatar--green">{ally.name[0]}</span>}
                          <span className="stat-name">{ally.name}</span>
                          <span className="stat-rate stat-rate--green">{ally.winRate}%</span>
                          <span className="stat-record">({ally.wins}W-{ally.losses}L)</span>
                        </Link>
                      );
                    })}
                  </div>
                  {allAllies.length > 5 && (
                    <Button $pill className="card-toggle-btn" onClick={() => toggleSection('bestAllies')}>
                      {expanded ? 'Show less' : `Show all (${allAllies.length})`}
                    </Button>
                  )}
                </div>
              );
            })()}

            {worstAllyStats.length > 0 && (() => {
              const expanded = expandedSections.worstAllies;
              const displayList = expanded ? allWorstAllies : worstAllyStats;
              return (
                <div className="stat-card stat-card--red">
                  <h3 className="stat-card-title">Worst Allies</h3>
                  <p className="stat-card-subtitle">Teammates you lose with most</p>
                  <div className="stat-card-list">
                    {displayList.map((ally, idx) => {
                      const pic = statAvatars.get(ally.battleTag)?.profilePicUrl;
                      return (
                        <Link key={ally.battleTag} to={`/player/${encodeURIComponent(ally.battleTag)}`} className="stat-row">
                          <span className="stat-rank">#{idx + 1}</span>
                          {pic ? <img src={pic} alt="" className="stat-avatar-img" /> : <span className="stat-avatar stat-avatar--red">{ally.name[0]}</span>}
                          <span className="stat-name">{ally.name}</span>
                          <span className="stat-rate stat-rate--red">{ally.winRate}%</span>
                          <span className="stat-record">({ally.wins}W-{ally.losses}L)</span>
                        </Link>
                      );
                    })}
                  </div>
                  {allWorstAllies.length > 5 && (
                    <Button $pill className="card-toggle-btn" onClick={() => toggleSection('worstAllies')}>
                      {expanded ? 'Show less' : `Show all (${allWorstAllies.length})`}
                    </Button>
                  )}
                </div>
              );
            })()}

            {nemesisStats.length > 0 && (() => {
              const expanded = expandedSections.nemesis;
              const displayList = expanded ? allNemesis : nemesisStats;
              return (
                <div className="stat-card stat-card--red">
                  <h3 className="stat-card-title">Nemesis</h3>
                  <p className="stat-card-subtitle">Opponents who beat you most</p>
                  <div className="stat-card-list">
                    {displayList.map((enemy, idx) => {
                      const pic = statAvatars.get(enemy.battleTag)?.profilePicUrl;
                      return (
                        <Link key={enemy.battleTag} to={`/player/${encodeURIComponent(enemy.battleTag)}`} className="stat-row">
                          <span className="stat-rank">#{idx + 1}</span>
                          {pic ? <img src={pic} alt="" className="stat-avatar-img" /> : <span className="stat-avatar stat-avatar--red">{enemy.name[0]}</span>}
                          <span className="stat-name">{enemy.name}</span>
                          <span className="stat-rate stat-rate--red">{enemy.winRate}%</span>
                          <span className="stat-record">({enemy.wins}W-{enemy.losses}L)</span>
                        </Link>
                      );
                    })}
                  </div>
                  {allNemesis.length > 5 && (
                    <Button $pill className="card-toggle-btn" onClick={() => toggleSection('nemesis')}>
                      {expanded ? 'Show less' : `Show all (${allNemesis.length})`}
                    </Button>
                  )}
                </div>
              );
            })()}

            {preyStats.length > 0 && (() => {
              const expanded = expandedSections.prey;
              const displayList = expanded ? allPrey : preyStats;
              return (
                <div className="stat-card stat-card--green">
                  <h3 className="stat-card-title">Punching Bag</h3>
                  <p className="stat-card-subtitle">Opponents you beat most</p>
                  <div className="stat-card-list">
                    {displayList.map((enemy, idx) => {
                      const pic = statAvatars.get(enemy.battleTag)?.profilePicUrl;
                      return (
                        <Link key={enemy.battleTag} to={`/player/${encodeURIComponent(enemy.battleTag)}`} className="stat-row">
                          <span className="stat-rank">#{idx + 1}</span>
                          {pic ? <img src={pic} alt="" className="stat-avatar-img" /> : <span className="stat-avatar stat-avatar--green">{enemy.name[0]}</span>}
                          <span className="stat-name">{enemy.name}</span>
                          <span className="stat-rate stat-rate--green">{enemy.winRate}%</span>
                          <span className="stat-record">({enemy.losses}W-{enemy.wins}L)</span>
                        </Link>
                      );
                    })}
                  </div>
                  {allPrey.length > 5 && (
                    <Button $pill className="card-toggle-btn" onClick={() => toggleSection('prey')}>
                      {expanded ? 'Show less' : `Show all (${allPrey.length})`}
                    </Button>
                  )}
                </div>
              );
            })()}

            {mapStats.length > 0 && (
              <div className="stat-card stat-card--green">
                <h3 className="stat-card-title">Best Maps</h3>
                <p className="stat-card-subtitle">Where you dominate</p>
                <div className="stat-card-list">
                  {mapStats.map((map, idx) => (
                    <div key={map.name} className="stat-row">
                      <span className="stat-rank">#{idx + 1}</span>
                      <img src={`/maps/${map.name.replace(/ /g, '').replace(/'/g, '')}.png`} alt="" className="stat-map-img" />
                      <span className="stat-name">{map.name}</span>
                      <span className="stat-rate stat-rate--green">{map.winRate}%</span>
                      <span className="stat-record">({map.wins}W-{map.losses}L)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {worstMapStats.length > 0 && (
              <div className="stat-card stat-card--red">
                <h3 className="stat-card-title">Worst Maps</h3>
                <p className="stat-card-subtitle">Where you struggle</p>
                <div className="stat-card-list">
                  {worstMapStats.map((map, idx) => (
                    <div key={map.name} className="stat-row">
                      <span className="stat-rank">#{idx + 1}</span>
                      <img src={`/maps/${map.name.replace(/ /g, '').replace(/'/g, '')}.png`} alt="" className="stat-map-img" />
                      <span className="stat-name">{map.name}</span>
                      <span className="stat-rate stat-rate--red">{map.winRate}%</span>
                      <span className="stat-record">({map.wins}W-{map.losses}L)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Playstyle Tab Content */}
      {activeTab === 'playstyle' && (
        <div className="playstyle-tab-content reveal" style={{ "--delay": "0.1s" }}>
          <ScoutTab initialPlayer={battleTag} embedded />
        </div>
      )}

      {/* Activity Tab Content */}
      {activeTab === 'activity' && (
        <div className="activity-tab-content reveal" style={{ "--delay": "0.1s" }}>

          {/* Recent activity: the last 3 months, large */}
          <section className="activity-section">
            <ActivityGraph battleTag={battleTag} currentSeason={selectedSeason} gateway={gateway} size="large" title="Recent Activity" />
          </section>

          {/* Activity over time: games per week, inactive stretches shaded */}
          {seasonActivity && seasonActivity.length > 0 && (
            <section className="activity-section">
              <div className="section-header">
                <h2 className="section-title">Activity Over Time</h2>
                <span className="section-hint">games per week · shaded = inactive {PROFILE_RULES.inactiveWeeks}+ weeks</span>
              </div>
              <ActivityOverTime seasonActivity={seasonActivity} />
            </section>
          )}

          {/* Season history: peak MMR per season */}
          {seasonActivity && seasonActivity.length > 0 && (
            <section className="activity-section">
              <div className="section-header">
                <h2 className="section-title">Season History</h2>
                <span className="section-hint">peak MMR by season</span>
              </div>
              <SeasonHistoryBars seasonActivity={seasonActivity} currentSeason={currentSeason} />
            </section>
          )}

          {/* Clips */}
          {playerClips.length > 0 && (
            <section className="activity-section">
              <div className="section-header">
                <h2 className="section-title">Clips</h2>
                <Link to={`/clips?player=${encodeURIComponent(battleTag)}`}><Button $secondary>View All</Button></Link>
              </div>
              <div className="activity-clips-grid">
                {playerClips.map((clip) => (
                  <button
                    key={clip.clip_id}
                    className="ph-clip"
                    onClick={() => setActiveClip(clip)}
                    title={clip.title}
                  >
                    <img src={clip.thumbnail_url} alt="" loading="lazy" />
                    <div className="ph-clip-overlay">
                      <div className="ph-clip-play">&#9654;</div>
                    </div>
                    <span className="ph-clip-title">{clip.title}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* News Mentions: the weekly issues first, then the dailies (limited to 5) */}
          {(issueMentions.length > 0 || playerMentions.length > 0) && (
            <section className="activity-section">
              <div className="section-header">
                <h2 className="section-title">In the News</h2>
                <Link to="/news"><Button $secondary>View All</Button></Link>
              </div>
              {issueMentions.length > 0 && (
                <div className="ph-issue-list" data-issue-mentions={issueMentions.length}>
                  {issueMentions.map((m) => {
                    const weekly = weeklies.find((w) => w.week_start === m.week_start);
                    return (
                      <Link key={`${m.week_start}-${m.section}`} to={`/news?week=${m.week_start}`} className="ph-issue-item">
                        {weekly && <IssueThumb weekly={weekly} issueNo={m.issueNo} />}
                        <span className="ph-issue-body">
                          <span className={`ph-badge ph-badge--${m.section.toLowerCase()}`}>{m.section.replace(/_/g, " ")}</span>
                          <span className="ph-issue-snippet">{renderSnippet(m.snippet)}</span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
              <div className="activity-news-list">
                {playerMentions.flatMap((mention) =>
                  mention.sections.map((sec, i) => ({
                    key: `${mention.date}-${i}`,
                    date: mention.date,
                    sec,
                  }))
                ).slice(0, 5).map(({ key, date, sec }) => {
                  const dateStr = new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  return (
                    <Link key={key} to={`/news?day=${date}#${sec.key.toLowerCase()}`} className="ph-news-item">
                      <span className={`ph-badge ph-badge--${sec.key.toLowerCase()}`}>{sec.key}</span>
                      <span className="ph-news-snippet">{renderSnippet(sec.snippet)}</span>
                      <span className="ph-news-date">{dateStr}</span>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* Recent Conversations */}
          <section className="activity-section">
            <div className="section-header">
              <h2 className="section-title">Recent Conversations</h2>
            </div>
            <RecentConversations battleTag={battleTag} playerName={playerName} />
          </section>

          {/* Empty State - only show if no news and no clips (conversations component handles its own empty state) */}
          {issueMentions.length === 0 && playerMentions.length === 0 && playerClips.length === 0 && (
            <div className="activity-empty">
              <span className="activity-empty-text">No news or clips for this player yet.</span>
            </div>
          )}
        </div>
      )}

      {/* Clip Modal */}
      {activeClip && (
        <ClipModal clip={activeClip} onClose={() => setActiveClip(null)}>
          <div className="clip-modal-meta">
            <span className="clip-modal-streamer">{activeClip.twitch_login}</span>
            <span className="clip-modal-sep">&middot;</span>
            <span className="clip-modal-views">{activeClip.view_count.toLocaleString()} views</span>
          </div>
        </ClipModal>
      )}
    </div>
  );
};

export default PlayerProfile;
