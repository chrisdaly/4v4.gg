/**
 * Centralized API layer for W3Champions data
 *
 * This module provides:
 * - Request deduplication (concurrent requests for same data share a single fetch)
 * - Smart caching with appropriate TTLs per data type
 * - Consolidated fetch functions (single source of truth per endpoint)
 * - Synchronous cache reads for instant UI on navigation
 */

import { fetchWithCache, TTL, cache, createCacheKey } from './cache';
import { gateway, season, gameMode } from './params';

const API_BASE = 'https://website-backend.w3champions.com/api';

// Short TTLs for frequently changing data
const SHORT_TTL = 30 * 1000; // 30 seconds for live data
const MEDIUM_TTL = 2 * 60 * 1000; // 2 minutes for match lists

// Race ID to name mapping for avatar URLs
const RACE_AVATAR_MAP = { 64: 'starter', 16: 'total', 8: 'undead', 0: 'random', 4: 'nightelf', 2: 'orc', 1: 'human' };

/**
 * Build profile picture URL from profile data
 */
const buildProfilePicUrl = (profileData) => {
  if (!profileData) return null;

  const { profilePicture, specialPictures } = profileData;
  if (!profilePicture?.pictureId) return null;

  const { pictureId, race } = profilePicture;

  // Check if it's a special avatar
  if (specialPictures?.map(d => d.pictureId).includes(pictureId)) {
    return `https://w3champions.wc3.tools/prod/integration/icons/specialAvatars/SPECIAL_${pictureId}.jpg`;
  }

  // Regular race avatar
  const raceName = RACE_AVATAR_MAP[race] || 'random';
  return `https://w3champions.wc3.tools/prod/integration/icons/raceAvatars/classic/${raceName.toUpperCase()}_${pictureId}.jpg`;
};

/**
 * Get player profile (personal settings) - includes profile pic, twitch, country
 * This consolidates getPlayerProfilePicUrl, getPlayerProfileInfo, and getPlayerCountry
 *
 * @param {string} battleTag
 * @returns {Promise<{profilePicUrl: string|null, twitch: string|null, country: string|null}>}
 */
export const getPlayerProfile = async (battleTag) => {
  try {
    const url = `${API_BASE}/personal-settings/${encodeURIComponent(battleTag)}`;
    const cacheKey = `profile:${battleTag.toLowerCase()}`;

    const data = await fetchWithCache(url, { cacheKey, ttl: TTL.PERSONAL_SETTINGS });

    return {
      profilePicUrl: buildProfilePicUrl(data),
      twitch: data.twitch || null,
      country: data.location || null,
    };
  } catch (error) {
    console.error(`Error fetching profile for ${battleTag}:`, error);
    return { profilePicUrl: null, twitch: null, country: null };
  }
};

/**
 * Get player game mode stats for 4v4
 *
 * @param {string} battleTag
 * @param {number} seasonOverride - Optional season override
 * @returns {Promise<{mmr: number, wins: number, losses: number, rank: number, race: number}|null>}
 */
export const getPlayerStats = async (battleTag, { seasonOverride = season, skipCache = false } = {}) => {
  try {
    const url = `${API_BASE}/players/${encodeURIComponent(battleTag)}/game-mode-stats?gateway=${gateway}&season=${seasonOverride}`;
    const cacheKey = `stats:${battleTag.toLowerCase()}:${seasonOverride}`;

    const data = await fetchWithCache(url, { cacheKey, ttl: TTL.GAME_MODE_STATS, skipCache });

    const fourVsFourStats = data.find(s => s.gameMode === 4);
    if (!fourVsFourStats) return null;

    return {
      mmr: fourVsFourStats.mmr || 0,
      wins: fourVsFourStats.wins || 0,
      losses: fourVsFourStats.losses || 0,
      rank: fourVsFourStats.rank || null,
      race: fourVsFourStats.race ?? null,
    };
  } catch (error) {
    console.error(`Error fetching stats for ${battleTag}:`, error);
    return null;
  }
};

/**
 * Get player MMR timeline for a specific race
 *
 * @param {string} battleTag
 * @param {number} race - Race ID (0=Random, 1=Human, 2=Orc, 4=NE, 8=UD)
 * @param {number} seasonOverride - Optional season override
 * @returns {Promise<number[]>} - Array of MMR values
 */
export const getPlayerTimeline = async (battleTag, race, seasonOverride = season) => {
  try {
    const url = `${API_BASE}/players/${encodeURIComponent(battleTag)}/mmr-rp-timeline?gateway=${gateway}&season=${seasonOverride}&race=${race}&gameMode=4`;
    const cacheKey = `timeline:${battleTag.toLowerCase()}:${race}:${seasonOverride}`;

    const data = await fetchWithCache(url, { cacheKey, ttl: TTL.MMR_TIMELINE });

    if (!data?.mmrRpAtDates || data.mmrRpAtDates.length === 0) {
      return [];
    }

    return data.mmrRpAtDates.map(d => d.mmr);
  } catch (error) {
    return [];
  }
};

/**
 * Get merged MMR timeline across all races
 * In 4v4, MMR is unified but data may be stored per-race, so we merge and dedupe
 *
 * @param {string} battleTag
 * @param {number} seasonOverride - Optional season override
 * @returns {Promise<number[]>} - Array of MMR values sorted chronologically
 */
export const getPlayerTimelineMerged = async (battleTag, seasonOverride = season) => {
  const races = [0, 1, 2, 4, 8]; // Random, Human, Orc, NE, UD

  try {
    // Fetch all races in parallel (each call is individually cached)
    const results = await Promise.all(
      races.map(async (race) => {
        try {
          const url = `${API_BASE}/players/${encodeURIComponent(battleTag)}/mmr-rp-timeline?gateway=${gateway}&season=${seasonOverride}&race=${race}&gameMode=4`;
          const cacheKey = `timeline:${battleTag.toLowerCase()}:${race}:${seasonOverride}`;

          const data = await fetchWithCache(url, { cacheKey, ttl: TTL.MMR_TIMELINE });
          return data?.mmrRpAtDates || [];
        } catch (e) {
          return [];
        }
      })
    );

    // Merge all timeline points
    const allPoints = results.flat();

    if (allPoints.length === 0) return [];

    // Dedupe by date (same date = same game)
    const uniqueByDate = {};
    for (const point of allPoints) {
      uniqueByDate[point.date] = point;
    }

    // Sort chronologically and extract MMRs
    const sorted = Object.values(uniqueByDate).sort((a, b) => new Date(a.date) - new Date(b.date));
    return sorted.map(d => d.mmr);
  } catch (error) {
    console.error(`Error fetching merged timeline for ${battleTag}:`, error);
    return [];
  }
};

/**
 * Get player's recent matches
 *
 * @param {string} battleTag
 * @param {number} pageSize - Number of matches to fetch
 * @param {number} offset - Pagination offset
 * @param {number} seasonOverride - Optional season override
 * @returns {Promise<{matches: Array, count: number}>}
 */
export const getPlayerMatches = async (battleTag, pageSize = 50, offset = 0, seasonOverride = season) => {
  try {
    const url = `${API_BASE}/matches?playerId=${encodeURIComponent(battleTag)}&offset=${offset}&gameMode=4&season=${seasonOverride}&gateway=${gateway}&pageSize=${pageSize}`;
    const cacheKey = `matches:${battleTag.toLowerCase()}:${offset}:${pageSize}:${seasonOverride}`;

    const data = await fetchWithCache(url, { cacheKey, ttl: TTL.MATCHES });

    return {
      matches: data.matches || [],
      count: data.count || 0,
    };
  } catch (error) {
    console.error(`Error fetching matches for ${battleTag}:`, error);
    return { matches: [], count: 0 };
  }
};

/**
 * Get a single match by ID
 *
 * @param {string} matchId
 * @returns {Promise<object|null>}
 */
export const getMatch = async (matchId) => {
  try {
    const url = `${API_BASE}/matches/${matchId}`;
    const cacheKey = `match:${matchId}`;

    // Match data is immutable, cache for 30 minutes
    return await fetchWithCache(url, { cacheKey, ttl: 30 * 60 * 1000 });
  } catch (error) {
    console.error(`Error fetching match ${matchId}:`, error);
    return null;
  }
};

/**
 * Get match from cache synchronously
 */
export const getMatchCached = (matchId) => {
  const cacheKey = `match:${matchId}`;
  return cache.get(cacheKey);
};

/**
 * Get ongoing matches (cached for 30 seconds for snappy navigation)
 *
 * @param {number} offset
 * @param {number} pageSize
 * @returns {Promise<{matches: Array}>}
 */
export const getOngoingMatches = async (offset = 0, pageSize = 50) => {
  try {
    const url = `${API_BASE}/matches/ongoing?offset=${offset}&pageSize=${pageSize}&gameMode=${gameMode}&gateway=${gateway}&map=Overall&sort=startTimeDescending`;
    const cacheKey = `ongoing:${offset}:${pageSize}`;

    return await fetchWithCache(url, { cacheKey, ttl: SHORT_TTL });
  } catch (error) {
    console.error('Error fetching ongoing matches:', error);
    return { matches: [] };
  }
};

/**
 * Get ongoing matches from cache synchronously (for instant UI)
 * Returns null if not cached
 */
export const getOngoingMatchesCached = () => {
  const cacheKey = `ongoing:0:50`;
  return cache.get(cacheKey);
};

/**
 * Get finished matches
 *
 * @param {number} pageSize
 * @param {number} offset
 * @returns {Promise<{matches: Array, count: number}>}
 */
export const getFinishedMatches = async (pageSize = 50, offset = 0) => {
  try {
    const url = `${API_BASE}/matches?offset=${offset}&gateway=${gateway}&pageSize=${pageSize}&gameMode=${gameMode}&map=Overall`;
    const cacheKey = `finished:${offset}:${pageSize}`;

    return await fetchWithCache(url, { cacheKey, ttl: MEDIUM_TTL });
  } catch (error) {
    console.error('Error fetching finished matches:', error);
    return { matches: [], count: 0 };
  }
};

/**
 * Get finished matches from cache synchronously
 */
export const getFinishedMatchesCached = (pageSize = 50, offset = 0) => {
  const cacheKey = `finished:${offset}:${pageSize}`;
  return cache.get(cacheKey);
};

/**
 * Search ladder for a player
 *
 * @param {string} searchTerm
 * @param {number} seasonOverride
 * @returns {Promise<Array>}
 */
export const searchLadder = async (searchTerm, seasonOverride = season) => {
  try {
    const url = `${API_BASE}/ladder/search?gateWay=${gateway}&searchFor=${encodeURIComponent(searchTerm)}&gameMode=4&season=${seasonOverride}`;
    const cacheKey = `ladder-search:${searchTerm.toLowerCase()}:${seasonOverride}`;

    return await fetchWithCache(url, { cacheKey, ttl: TTL.LADDER });
  } catch (error) {
    console.error(`Error searching ladder for ${searchTerm}:`, error);
    return [];
  }
};

/**
 * Get ladder by league
 *
 * @param {number} leagueId - 0=GM, 1=Master, 2=Diamond, etc.
 * @param {number} seasonOverride
 * @returns {Promise<Array>}
 */
export const getLadder = async (leagueId, seasonOverride = season) => {
  try {
    const url = `${API_BASE}/ladder/${leagueId}?gateWay=${gateway}&gameMode=4&season=${seasonOverride}`;
    const cacheKey = `ladder:${leagueId}:${seasonOverride}`;

    return await fetchWithCache(url, { cacheKey, ttl: TTL.LADDER });
  } catch (error) {
    console.error(`Error fetching ladder ${leagueId}:`, error);
    return [];
  }
};

/**
 * Get ladder from cache synchronously
 */
export const getLadderCached = (leagueId, seasonOverride = season) => {
  const cacheKey = `ladder:${leagueId}:${seasonOverride}`;
  return cache.get(cacheKey);
};

/**
 * Get available seasons
 *
 * @returns {Promise<Array>}
 */
export const getSeasons = async () => {
  try {
    const url = `${API_BASE}/ladder/seasons`;
    const cacheKey = 'seasons';

    // Seasons rarely change, cache for 1 hour
    return await fetchWithCache(url, { cacheKey, ttl: 60 * 60 * 1000 });
  } catch (error) {
    console.error('Error fetching seasons:', error);
    return [];
  }
};

/**
 * Get seasons from cache synchronously
 */
export const getSeasonsCached = () => {
  return cache.get('seasons');
};

/**
 * Batch fetch profiles for multiple players
 * Useful for match cards with 8 players
 *
 * @param {string[]} battleTags
 * @returns {Promise<Map<string, {profilePicUrl, twitch, country}>>}
 */
export const getPlayerProfilesBatch = async (battleTags) => {
  const results = new Map();

  // Fetch all in parallel (deduplication handles concurrent calls)
  await Promise.all(
    battleTags.map(async (battleTag) => {
      const profile = await getPlayerProfile(battleTag);
      results.set(battleTag, profile);
    })
  );

  return results;
};

/**
 * Lightweight session data fetch - skips full timeline for faster loading
 * Used for match cards where we just need session/form data
 *
 * @param {string} battleTag
 * @param {number} raceOverride - Optional race to filter by
 * @returns {Promise<{session, seasonMmrs, currentMmrFallback, rank, lastPlayed}>}
 */
export const getPlayerSessionLight = async (battleTag, raceOverride = null) => {
  const SESSION_GAP_MINUTES = 60;
  const battleTagLower = battleTag.toLowerCase();

  try {
    // Fetch matches (cached, deduplicated)
    const { matches } = await getPlayerMatches(battleTag, 50);

    if (!matches || matches.length === 0) {
      return { session: null, seasonMmrs: [], currentMmrFallback: null, rank: null, lastPlayed: null };
    }

    // Detect session from matches
    const sessionGapMs = SESSION_GAP_MINUTES * 60 * 1000;
    const sessionMatches = [];

    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];

      // Find player in match
      let playerData = null;
      for (const team of match.teams) {
        const player = team.players.find(p => p.battleTag.toLowerCase() === battleTagLower);
        if (player) {
          playerData = player;
          break;
        }
      }
      if (!playerData) continue;

      // Check time gap
      if (i > 0) {
        const prevEndTime = new Date(matches[i - 1].endTime);
        const thisEndTime = new Date(match.endTime);
        const gapMs = prevEndTime - thisEndTime;
        if (gapMs > sessionGapMs) break;
      }

      sessionMatches.push({
        won: playerData.won,
        oldMmr: playerData.oldMmr,
        currentMmr: playerData.currentMmr,
        mmrGain: playerData.currentMmr - playerData.oldMmr,
        endTime: match.endTime,
      });
    }

    // Build session object
    let session = null;
    if (sessionMatches.length > 0) {
      session = {
        games: sessionMatches,
        form: sessionMatches.map(g => g.won).reverse(),
        wins: sessionMatches.filter(g => g.won).length,
        losses: sessionMatches.filter(g => !g.won).length,
        mmrChange: sessionMatches[0].currentMmr - sessionMatches[sessionMatches.length - 1].oldMmr,
        startMmr: sessionMatches[sessionMatches.length - 1].oldMmr,
        currentMmr: sessionMatches[0].currentMmr,
      };
    }

    // Build simple timeline from matches (avoids 5 race calls)
    const seasonMmrs = matches
      .map(match => {
        for (const team of match.teams) {
          const player = team.players.find(p => p.battleTag.toLowerCase() === battleTagLower);
          if (player && player.currentMmr != null) return player.currentMmr;
        }
        return null;
      })
      .filter(mmr => mmr !== null)
      .reverse();

    // Get stats for rank and MMR fallback
    const stats = await getPlayerStats(battleTag);

    // Calculate last played
    let lastPlayed = null;
    if (matches.length > 0) {
      const lastPlayedDate = new Date(matches[0].endTime);
      const now = new Date();
      const diffMs = now - lastPlayedDate;
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);

      if (diffHours < 1) {
        lastPlayed = "< 1 hour ago";
      } else if (diffHours < 24) {
        lastPlayed = `${diffHours}h ago`;
      } else {
        lastPlayed = `${diffDays}d ago`;
      }
    }

    return {
      session,
      seasonMmrs,
      currentMmrFallback: stats?.mmr || null,
      rank: stats?.rank || null,
      lastPlayed,
    };
  } catch (error) {
    console.error(`Error fetching session data for ${battleTag}:`, error);
    return { session: null, seasonMmrs: [], currentMmrFallback: null, rank: null, lastPlayed: null };
  }
};
