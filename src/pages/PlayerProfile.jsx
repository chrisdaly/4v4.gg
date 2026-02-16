import React, { useState, useEffect, useReducer, useMemo, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { CountryFlag, Select, Button } from "../components/ui";
import { findPlayerInOngoingMatches } from "../lib/utils";
import { getPlayerProfile, getPlayerTimelineMerged, getPlayerStats, getSeasons } from "../lib/api";
import { cache } from "../lib/cache";
import { isStreamerLive } from "../lib/twitchService";
import { FaTwitch } from "react-icons/fa";
import { GiCrossedSwords } from "react-icons/gi";

import FormDots from "../components/FormDots";
import PeonLoader from "../components/PeonLoader";
import { gateway } from "../lib/params";
import { GameRow } from "../components/game/index";
import ActivityGraph from "../components/ActivityGraph";
import OngoingGame from "../components/OngoingGame";
import { raceMapping, LEAGUES } from "../lib/constants";
import { parseDigestSections } from "../lib/digestUtils";

const RELAY_URL = import.meta.env.VITE_CHAT_RELAY_URL || "https://4v4gg-chat-relay.fly.dev";
const GAMES_PER_PAGE = 20;

const MIN_GAMES_FOR_STATS = 3;

// Helper to get cached player page data
const getCachedPlayerData = (battleTag, season) => {
  const cacheKey = `playerPage:${battleTag.toLowerCase()}:${season}`;
  return cache.get(cacheKey);
};

function ClipModal({ clip, onClose }) {
  const backdropRef = useRef(null);
  const embedSrc = clip.embed_url
    ? `${clip.embed_url}&parent=4v4.gg&parent=localhost&autoplay=true`
    : `https://clips.twitch.tv/embed?clip=${clip.clip_id}&parent=4v4.gg&parent=localhost&autoplay=true`;

  useEffect(() => {
    backdropRef.current?.focus();
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [onClose]);

  return (
    <div className="clip-modal-backdrop" ref={backdropRef} tabIndex={-1} onClick={onClose}>
      <div className="clip-modal" onClick={(e) => e.stopPropagation()}>
        <button className="clip-modal-close" onClick={onClose}>&times;</button>
        <iframe
          className="clip-modal-embed"
          src={embedSrc}
          allowFullScreen
          title={clip.title}
        />
        <div className="clip-modal-info">
          <h2 className="clip-modal-title">{clip.title}</h2>
          <div className="clip-modal-meta">
            <span className="clip-modal-streamer">{clip.twitch_login}</span>
            <span className="clip-modal-sep">&middot;</span>
            <span className="clip-modal-views">{clip.view_count.toLocaleString()} views</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const PlayerProfile = () => {
  // Extract battleTag from URL
  const getBattleTag = () => {
    const pageUrl = new URL(window.location.href);
    return decodeURIComponent(pageUrl.pathname.split("/").slice(-1)[0]);
  };

  const battleTag = getBattleTag();
  const battleTagLower = battleTag.toLowerCase();
  const playerName = battleTag.split("#")[0];

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
      selectedSeason: null,
      availableSeasons: [],
      currentPage: 0,
      playerClips: [],
      playerMentions: [],
    }
  );

  const {
    playerData, profilePic, country, twitchName, isStreaming, streamInfo,
    matches, totalMatches, sessionGames, seasonMmrs, ongoingGame, ladderStanding,
    isLoading, allyStats, worstAllyStats, mapStats, worstMapStats, nemesisStats,
    selectedSeason, availableSeasons, currentPage,
    playerClips, playerMentions,
  } = state;

  const [activeClip, setActiveClip] = useState(null);

  const SESSION_GAP_MINUTES = 60;

  // Helper to restore from cache in a single batch
  const restoreFromCache = (cached) => {
    updateState({
      playerData: cached.playerData,
      profilePic: cached.profilePic,
      country: cached.country,
      twitchName: cached.twitchName,
      matches: cached.matches || [],
      totalMatches: cached.totalMatches || 0,
      seasonMmrs: cached.seasonMmrs || [],
      ladderStanding: cached.ladderStanding,
      allyStats: cached.allyStats || [],
      worstAllyStats: cached.worstAllyStats || [],
      mapStats: cached.mapStats || [],
      worstMapStats: cached.worstMapStats || [],
      nemesisStats: cached.nemesisStats || [],
      isLoading: false,
    });
  };

  // Fetch available seasons on mount
  useEffect(() => {
    const fetchSeasonsData = async () => {
      try {
        const seasons = await getSeasons();
        if (seasons && seasons.length > 0) {
          const latestSeason = seasons[0].id;
          updateState({ availableSeasons: seasons, selectedSeason: latestSeason });

          const cached = getCachedPlayerData(battleTag, latestSeason);
          if (cached) restoreFromCache(cached);
        }
      } catch (e) {
        console.error("Failed to fetch seasons:", e);
        updateState({ selectedSeason: 24 });
      }
    };
    fetchSeasonsData();
  }, [battleTag]);

  // Reset and reload when battleTag or season changes
  useEffect(() => {
    if (selectedSeason === null) return;

    const cached = getCachedPlayerData(battleTag, selectedSeason);
    if (cached) {
      restoreFromCache(cached);
    } else {
      // No cache - reset all data in single batch
      updateState({
        playerData: null, profilePic: null, country: null, twitchName: null,
        isStreaming: false, streamInfo: null, matches: [], totalMatches: 0,
        sessionGames: [], seasonMmrs: [], ongoingGame: null, ladderStanding: null,
        allyStats: [], worstAllyStats: [], mapStats: [], worstMapStats: [],
        nemesisStats: [], currentPage: 0, isLoading: true,
      });
    }

    loadAllData();
    fetchOngoingGames();

    const interval = setInterval(fetchOngoingGames, 30000);
    return () => clearInterval(interval);
  }, [battleTag, selectedSeason]);

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
        // Client-side filter: only clips actually tagged with this player
        const taggedClips = (clipsData.clips || []).filter(c =>
          c.player_tag && c.player_tag.toLowerCase().includes(battleTag.toLowerCase())
        ).slice(0, 4);

        // Parse digests client-side to find individual items mentioning this player
        const mentions = [];
        const escaped = playerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const nameRe = new RegExp(`\\b${escaped}\\b`, "i");
        const SKIP_SECTIONS = new Set(["MENTIONS", "TOPICS"]);

        const findMentions = (digestText) => {
          const sections = parseDigestSections(digestText);
          const items = [];
          for (const s of sections) {
            if (SKIP_SECTIONS.has(s.key)) continue;
            // Split into individual items (semicolon-separated) and match each
            for (const item of s.content.split(/;\s*/)) {
              if (!item.trim() || !nameRe.test(item)) continue;
              const snippet = item.trim();
              items.push({
                key: s.key,
                snippet: snippet.length > 120 ? snippet.slice(0, 120) + "…" : snippet,
              });
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
  }, [battleTag]);

  const loadAllData = async () => {
    updateState({ isLoading: true });
    try {
      const profile = await getPlayerProfile(battleTag);
      const newProfilePic = profile?.profilePicUrl;
      const newCountry = profile?.country;
      const newTwitchName = profile?.twitch || null;

      // Batch profile update
      const profileUpdate = { profilePic: newProfilePic, country: newCountry, twitchName: newTwitchName };

      // Check if streaming
      if (newTwitchName) {
        const streamStatus = await isStreamerLive(newTwitchName);
        profileUpdate.isStreaming = streamStatus.isLive;
        profileUpdate.streamInfo = streamStatus.isLive ? streamStatus : null;
      }
      updateState(profileUpdate);

      // Fetch player stats
      let newPlayerData = null;
      let newTotalMatches = 0;
      const statsUrl = `https://website-backend.w3champions.com/api/players/${encodeURIComponent(battleTag)}/game-mode-stats?gateway=${gateway}&season=${selectedSeason}`;
      const statsResponse = await fetch(statsUrl);
      if (statsResponse.ok) {
        const stats = await statsResponse.json();
        const fourVsFourStats = stats.find(s => s.gameMode === 4);
        if (fourVsFourStats) {
          newPlayerData = fourVsFourStats;
          newTotalMatches = (fourVsFourStats.wins || 0) + (fourVsFourStats.losses || 0);
          updateState({ playerData: newPlayerData, totalMatches: newTotalMatches });
        }
      }

      const newMatches = await fetchMatches(0, true);
      const newSeasonMmrs = await fetchMmrTimeline(true);
      const newLadderStanding = await fetchLadderStanding(true);
      const statsResult = await fetchStatistics(true);

      // Cache all player data for instant display on next visit (5 min TTL)
      cache.set(`playerPage:${battleTagLower}:${selectedSeason}`, {
        playerData: newPlayerData, profilePic: newProfilePic, country: newCountry,
        twitchName: newTwitchName, matches: newMatches || [], totalMatches: newTotalMatches,
        seasonMmrs: newSeasonMmrs || [], ladderStanding: newLadderStanding,
        allyStats: statsResult?.allyStats || [], worstAllyStats: statsResult?.worstAllyStats || [],
        mapStats: statsResult?.mapStats || [], worstMapStats: statsResult?.worstMapStats || [],
        nemesisStats: statsResult?.nemesisStats || [],
      }, 5 * 60 * 1000);
    } catch (error) {
      console.error("Error loading player data:", error);
    } finally {
      updateState({ isLoading: false });
    }
  };

  const fetchMatches = async (page, returnData = false) => {
    const offset = page * GAMES_PER_PAGE;
    const matchesUrl = `https://website-backend.w3champions.com/api/matches/search?playerId=${encodeURIComponent(battleTag)}&offset=${offset}&gameMode=4&season=${selectedSeason}&gateway=${gateway}&pageSize=${GAMES_PER_PAGE}`;
    const matchesResponse = await fetch(matchesUrl);
    if (matchesResponse.ok) {
      const matchesData = await matchesResponse.json();
      if (matchesData.matches) {
        updateState({ matches: matchesData.matches });
        if (page === 0) processMatchData(matchesData.matches);
        if (returnData) return matchesData.matches;
      }
    }
    return returnData ? [] : undefined;
  };

  const fetchMmrTimeline = async (returnData = false) => {
    const mmrs = await getPlayerTimelineMerged(battleTag, selectedSeason);
    updateState({ seasonMmrs: mmrs });
    if (returnData) return mmrs;
  };

  const processMatchData = (matchList) => {
    if (!matchList || matchList.length === 0) return;

    const sessionGapMs = SESSION_GAP_MINUTES * 60 * 1000;
    const sessionMaxAgeMs = 2 * 60 * 60 * 1000;
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
          const gapMs = new Date(matchList[i - 1].endTime) - new Date(match.endTime);
          if (gapMs > sessionGapMs) break;
        }
        sessionMatches.push({ ...match, playerData: playerInMatch, won: playerWon });
      }
      updateState({ sessionGames: sessionMatches });
    }
  };

  const fetchOngoingGames = async () => {
    try {
      const ongoingResponse = await fetch("https://website-backend.w3champions.com/api/matches/ongoing");
      const ongoingResult = await ongoingResponse.json();
      const game = findPlayerInOngoingMatches(ongoingResult, battleTag);
      updateState({ ongoingGame: game });
    } catch (error) {
      console.error("Error fetching ongoing games:", error);
    }
  };

  const fetchLadderStanding = async (returnData = false) => {
    try {
      const searchUrl = `https://website-backend.w3champions.com/api/ladder/search?gateWay=${gateway}&searchFor=${encodeURIComponent(battleTag.split("#")[0])}&gameMode=4&season=${selectedSeason}`;
      const searchResponse = await fetch(searchUrl);
      if (!searchResponse.ok) return returnData ? null : undefined;

      const searchResults = await searchResponse.json();
      const playerResult = searchResults.find(r => {
        const tag1 = r.playersInfo?.[0]?.battleTag?.toLowerCase();
        const tag2 = r.player?.playerIds?.[0]?.battleTag?.toLowerCase();
        return tag1 === battleTagLower || tag2 === battleTagLower;
      });

      if (!playerResult) return returnData ? null : undefined;

      const leagueId = playerResult.league;
      const league = LEAGUES.find(l => l.id === leagueId);

      const ladderUrl = `https://website-backend.w3champions.com/api/ladder/${leagueId}?gateWay=${gateway}&gameMode=4&season=${selectedSeason}`;
      const ladderResponse = await fetch(ladderUrl);
      if (!ladderResponse.ok) return returnData ? null : undefined;

      const ladderData = await ladderResponse.json();
      const playerIndex = ladderData.findIndex(
        r => r.playersInfo?.[0]?.battleTag?.toLowerCase() === battleTagLower
      );

      if (playerIndex === -1) return returnData ? null : undefined;

      // Get 2 players above and 2 below
      const startIdx = Math.max(0, playerIndex - 2);
      const endIdx = Math.min(ladderData.length, playerIndex + 3);
      const neighbors = ladderData.slice(startIdx, endIdx);

      const standing = {
        league,
        leagueId,
        playerRank: playerResult.rankNumber,
        playerIndex,
        neighbors,
        totalInLeague: ladderData.length,
      };
      updateState({ ladderStanding: standing });
      if (returnData) return standing;
    } catch (error) {
      console.error("Error fetching ladder standing:", error);
      return returnData ? null : undefined;
    }
  };

  const fetchStatistics = async (returnData = false) => {
    try {
      // Fetch 100 matches for statistics calculation
      const statsUrl = `https://website-backend.w3champions.com/api/matches/search?playerId=${encodeURIComponent(battleTag)}&offset=0&gameMode=4&season=${selectedSeason}&gateway=${gateway}&pageSize=100`;
      const response = await fetch(statsUrl);
      if (!response.ok) return returnData ? null : undefined;

      const data = await response.json();
      if (!data.matches || data.matches.length === 0) return returnData ? null : undefined;

      // Calculate ally stats
      const allies = {};
      // Calculate map stats
      const maps = {};
      // Calculate opponent stats (for nemesis)
      const opponents = {};

      for (const match of data.matches) {
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

      // Best allies: highest win rate
      const bestAllies = [...alliesWithRates]
        .sort((a, b) => b.winRate - a.winRate || b.total - a.total)
        .slice(0, 3);

      // Worst allies: lowest win rate (with at least some losses)
      const worstAllies = [...alliesWithRates]
        .filter(a => a.losses > 0)
        .sort((a, b) => a.winRate - b.winRate || b.total - a.total)
        .slice(0, 3);

      // Process maps with win rates
      const mapsWithRates = Object.values(maps)
        .filter(m => m.total >= MIN_GAMES_FOR_STATS)
        .map(m => ({ ...m, winRate: Math.round((m.wins / m.total) * 100) }));

      // Best maps: highest win rate
      const bestMaps = [...mapsWithRates]
        .sort((a, b) => b.winRate - a.winRate || b.total - a.total)
        .slice(0, 5);

      // Worst maps: lowest win rate
      const worstMaps = [...mapsWithRates]
        .filter(m => m.losses > 0)
        .sort((a, b) => a.winRate - b.winRate || b.total - a.total)
        .slice(0, 3);

      // Nemesis: opponents who beat us most (sort by their wins against us)
      const nemesisList = Object.values(opponents)
        .filter(o => o.total >= MIN_GAMES_FOR_STATS && o.wins > 0)
        .map(o => ({ ...o, winRate: Math.round((o.wins / o.total) * 100) }))
        .sort((a, b) => b.wins - a.wins || b.winRate - a.winRate)
        .slice(0, 3);

      updateState({
        allyStats: bestAllies, worstAllyStats: worstAllies,
        mapStats: bestMaps, worstMapStats: worstMaps, nemesisStats: nemesisList,
      });

      if (returnData) {
        return {
          allyStats: bestAllies,
          worstAllyStats: worstAllies,
          mapStats: bestMaps,
          worstMapStats: worstMaps,
          nemesisStats: nemesisList,
        };
      }
    } catch (error) {
      console.error("Error fetching statistics:", error);
      return returnData ? null : undefined;
    }
  };

  const handleSeasonChange = (e) => {
    updateState({ selectedSeason: parseInt(e.target.value, 10) });
  };

  const handlePageChange = async (newPage) => {
    updateState({ currentPage: newPage });
    await fetchMatches(newPage);
    window.scrollTo({ top: document.querySelector('.match-history-section')?.offsetTop - 100 || 0, behavior: 'smooth' });
  };

  if (isLoading) {
    return (
      <div className="player-page">
        <div className="page-loader">
          <PeonLoader />
        </div>
      </div>
    );
  }

  // Calculate derived stats
  const sessionWins = sessionGames.filter(g => g.won).length;
  const sessionLosses = sessionGames.length - sessionWins;
  const sessionMmrChange = sessionGames.length > 0
    ? (sessionGames[0].playerData?.currentMmr || 0) - (sessionGames[sessionGames.length - 1].playerData?.oldMmr || 0)
    : 0;
  const winrate = playerData && (playerData.wins + playerData.losses) > 0
    ? Math.round((playerData.wins / (playerData.wins + playerData.losses)) * 100)
    : 0;
  const totalPages = Math.ceil(totalMatches / GAMES_PER_PAGE);

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
        <header className="player-header">
          <div className="player-header-left">
            <div className="hd-pic-wrapper">
              {profilePic && <img src={profilePic} alt="" className="hd-pic" />}
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
                    <FaTwitch className="twitch-icon" style={{ fill: '#9146ff' }} />
                  </a>
                )}
              </div>
              {playerData && (
                <>
                  <div className="hd-stats-row">
                    {ladderStanding && (
                      <span className="hd-rank">#{ladderStanding.playerRank}</span>
                    )}
                    <span className="hd-mmr">{playerData.mmr}</span>
                    <span className="hd-mmr-label">MMR</span>
                  </div>
                  <div className="hd-record-row">
                    <span className="hd-wins">{playerData.wins}W</span>
                    <span className="hd-losses">-{playerData.losses}L</span>
                    <span className="hd-sep">·</span>
                    <span className="hd-winrate">{winrate}%</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="player-header-right">
            <div className="season-selector">
              <Select value={selectedSeason || ""} onChange={handleSeasonChange}>
                {availableSeasons.map((s) => (
                  <option key={s.id} value={s.id}>
                    S{s.id}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </header>

      {/* Highlights Strip */}
      {(playerClips.length > 0 || playerMentions.length > 0) && (
        <div className="player-highlights">
          {playerMentions.length > 0 && (
            <div className="ph-group ph-group--news">
              <div className="section-header">
                <h2 className="section-title">In the News</h2>
                <Link to={`/news?player=${encodeURIComponent(battleTag)}`}><Button $secondary>More</Button></Link>
              </div>
              <div className="ph-news-list">
                {playerMentions.flatMap((mention) =>
                  mention.sections.map((sec, i) => ({
                    key: `${mention.date}-${i}`,
                    date: mention.date,
                    sec,
                  }))
                ).slice(0, 4).map(({ key, date, sec }) => {
                  const dateStr = new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  return (
                    <Link key={key} to={`/news?date=${date}`} className="ph-news-item">
                      <span className={`ph-badge ph-badge--${sec.key.toLowerCase()}`}>{sec.key}</span>
                      <span className="ph-news-snippet">{renderSnippet(sec.snippet)}</span>
                      <span className="ph-news-date">{dateStr}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
          {playerClips.length > 0 && (
            <div className="ph-group ph-group--clips">
              <div className="section-header">
                <h2 className="section-title">Clips</h2>
                <Link to={`/clips?player=${encodeURIComponent(battleTag)}`}><Button $secondary>More</Button></Link>
              </div>
              <div className="ph-clips">
                {playerClips.slice(0, 4).map((clip) => (
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
            </div>
          )}
        </div>
      )}

      <div className="player-content">
          {/* Main Content */}
          <main className="player-main">
            {/* Live Game Section */}
            {ongoingGame && (
              <section className="live-game-section">
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
            <section className="match-history-section">
              <div className="section-header">
                <h2 className="section-title">Match History</h2>
                <span className="match-count">{totalMatches} games</span>
              </div>

              <div className="match-history-table">
                <div className="mh-header">
                  <div className="mh-col result">Result</div>
                  <div className="mh-col map">Map</div>
                  <div className="mh-col avg-mmr">Avg MMR</div>
                  <div className="mh-col mmr">+/-</div>
                  <div className="mh-col allies">Allies</div>
                  <div className="mh-col opponents">Opponents</div>
                  <div className="mh-col duration">Duration</div>
                  <div className="mh-col time">Time</div>
                </div>
                {matches.map((match, idx) => (
                  <GameRow
                    key={match.id}
                    game={match}
                    playerBattleTag={battleTag}
                    striped={idx % 2 === 1}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="pagination">
                  <button
                    className="page-btn"
                    disabled={currentPage === 0}
                    onClick={() => handlePageChange(currentPage - 1)}
                  >
                    Prev
                  </button>
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
                        <button
                          key={pageNum}
                          className={`page-num ${currentPage === pageNum ? 'active' : ''}`}
                          onClick={() => handlePageChange(pageNum)}
                        >
                          {pageNum + 1}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    className="page-btn"
                    disabled={currentPage >= totalPages - 1}
                    onClick={() => handlePageChange(currentPage + 1)}
                  >
                    Next
                  </button>
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
                  {ladderStanding.neighbors.map((n) => {
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
                        <span className="ls-mmr">{n.player?.mmr}</span>
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
                      <span className={`sc-value ${sessionMmrChange >= 0 ? 'positive' : 'negative'}`}>
                        {sessionMmrChange >= 0 ? '+' : ''}{sessionMmrChange}
                      </span>
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
              const low = Math.min(...seasonMmrs);
              const peak = Math.max(...seasonMmrs);
              const current = seasonMmrs[seasonMmrs.length - 1];
              const range = peak - low;
              const position = range > 0 ? ((current - low) / range) * 100 : 50;
              return (
                <div className="mmr-thermometer-card">
                  <h3 className="mtc-title">Season {selectedSeason} MMR</h3>
                  <div className="mtc-bar">
                    <div className="mtc-bar-track">
                      <div className="mtc-bar-marker" style={{ left: `${position}%` }} />
                    </div>
                    <div className="mtc-bar-labels">
                      <div className="mtc-label-group">
                        <span className="mtc-value low">{low}</span>
                        <span className="mtc-label">LOW</span>
                      </div>
                      <div className="mtc-label-group current">
                        <span className="mtc-value">{current}</span>
                        <span className="mtc-label">CURRENT</span>
                      </div>
                      <div className="mtc-label-group">
                        <span className="mtc-value high">{peak}</span>
                        <span className="mtc-label">PEAK</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Activity Graph */}
            <ActivityGraph
              battleTag={battleTag}
              currentSeason={selectedSeason}
              gateway={gateway}
            />

            {/* Best Allies */}
            {allyStats.length > 0 && (
              <div className="best-allies-card">
                <h3 className="bac-title">Best Allies</h3>
                <div className="bac-list">
                  {allyStats.map((ally, idx) => (
                    <Link
                      key={ally.battleTag}
                      to={`/player/${encodeURIComponent(ally.battleTag)}`}
                      className="bac-row"
                    >
                      <span className="bac-rank">#{idx + 1}</span>
                      <span className="bac-name">{ally.name}</span>
                      <span className="bac-stats">
                        <span className="bac-winrate">{ally.winRate}%</span>
                        <span className="bac-record">({ally.wins}W-{ally.losses}L)</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Best Maps */}
            {mapStats.length > 0 && (
              <div className="best-maps-card">
                <h3 className="bmc-title">Best Maps</h3>
                <div className="bmc-list">
                  {mapStats.map((map, idx) => (
                    <div key={map.name} className="bmc-row">
                      <span className="bmc-rank">#{idx + 1}</span>
                      <span className="bmc-name">{map.name}</span>
                      <span className="bmc-stats">
                        <span className="bmc-winrate">{map.winRate}%</span>
                        <span className="bmc-record">({map.wins}W-{map.losses}L)</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Worst Allies */}
            {worstAllyStats.length > 0 && (
              <div className="worst-allies-card">
                <h3 className="wac-title">Worst Allies</h3>
                <div className="wac-list">
                  {worstAllyStats.map((ally, idx) => (
                    <Link
                      key={ally.battleTag}
                      to={`/player/${encodeURIComponent(ally.battleTag)}`}
                      className="wac-row"
                    >
                      <span className="wac-rank">#{idx + 1}</span>
                      <span className="wac-name">{ally.name}</span>
                      <span className="wac-stats">
                        <span className="wac-winrate">{ally.winRate}%</span>
                        <span className="wac-record">({ally.wins}W-{ally.losses}L)</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Worst Maps */}
            {worstMapStats.length > 0 && (
              <div className="worst-maps-card">
                <h3 className="wmc-title">Worst Maps</h3>
                <div className="wmc-list">
                  {worstMapStats.map((map, idx) => (
                    <div key={map.name} className="wmc-row">
                      <span className="wmc-rank">#{idx + 1}</span>
                      <span className="wmc-name">{map.name}</span>
                      <span className="wmc-stats">
                        <span className="wmc-winrate">{map.winRate}%</span>
                        <span className="wmc-record">({map.wins}W-{map.losses}L)</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Nemesis */}
            {nemesisStats.length > 0 && (
              <div className="nemesis-card">
                <h3 className="nc-title">Nemesis</h3>
                <div className="nc-list">
                  {nemesisStats.map((enemy, idx) => {
                    // Calculate YOUR win rate against them (inverse of their wins against you)
                    const yourWinRate = enemy.total > 0 ? Math.round((enemy.losses / enemy.total) * 100) : 0;
                    return (
                      <Link
                        key={enemy.battleTag}
                        to={`/player/${encodeURIComponent(enemy.battleTag)}`}
                        className="nc-row"
                      >
                        <span className="nc-rank">#{idx + 1}</span>
                        <span className="nc-name">{enemy.name}</span>
                        <span className="nc-stats">
                          <span className="nc-winrate">{yourWinRate}%</span>
                          <span className="nc-record">({enemy.losses}W-{enemy.wins}L)</span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

          </aside>
        </div>

      {/* Clip Modal */}
      {activeClip && (
        <ClipModal clip={activeClip} onClose={() => setActiveClip(null)} />
      )}
    </div>
  );
};

export default PlayerProfile;
