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
import { detectSessionGames, filterMatchesByRace } from './session';

const API_BASE = 'https://website-backend.w3champions.com/api';

// Short TTLs for frequently changing data
const SHORT_TTL = 30 * 1000; // 30 seconds for live data
const MEDIUM_TTL = 2 * 60 * 1000; // 2 minutes for match lists

// Race ID to name mapping for avatar URLs
const RACE_AVATAR_MAP = { 64: 'starter', 16: 'total', 8: 'undead', 0: 'random', 4: 'nightelf', 2: 'orc', 1: 'human' };

// W3C EAvatarCategory.SPECIAL — profilePicture.race for special avatars
const AVATAR_CATEGORY_SPECIAL = 32;

/**
 * Build profile picture URL from profile data
 */
const buildProfilePicUrl = (profileData) => {
  if (!profileData) return null;

  const { profilePicture, specialPictures } = profileData;
  if (!profilePicture?.pictureId) return null;

  const { pictureId, race } = profilePicture;

  // Check if it's a special avatar. The race field is authoritative; the
  // specialPictures membership check covers responses that predate it
  // (the /many batch endpoint omits specialPictures entirely).
  if (race === AVATAR_CATEGORY_SPECIAL || specialPictures?.map(d => d.pictureId).includes(pictureId)) {
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
  } catch {
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
export const getPlayerGameModeStatsRaw = async (battleTag, { seasonOverride = season, skipCache = false } = {}) => {
  const url = `${API_BASE}/players/${encodeURIComponent(battleTag)}/game-mode-stats?gateway=${gateway}&season=${seasonOverride}`;
  const cacheKey = `stats:${battleTag.toLowerCase()}:${seasonOverride}`;

  return fetchWithCache(url, { cacheKey, ttl: TTL.GAME_MODE_STATS, skipCache });
};

export const getPlayerStats = async (battleTag, { seasonOverride = season, skipCache = false } = {}) => {
  try {
    const data = await getPlayerGameModeStatsRaw(battleTag, { seasonOverride, skipCache });

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
 * Get a player's ALL-TIME MMR timeline: getPlayerTimelineMerged across every
 * season, concatenated chronologically. Per-race/per-season calls are cached,
 * so refreshes (e.g. the OBS overlay's 30s poll) are cheap.
 *
 * @param {string} battleTag
 * @returns {Promise<number[]>} - MMR values, oldest season first
 */
export const getPlayerTimelineAllTime = async (battleTag) => {
  try {
    let seasons = await getSeasons();
    if (!seasons || seasons.length === 0) seasons = [{ id: season }];

    const sortedSeasons = [...seasons].sort((a, b) => a.id - b.id);
    const perSeason = await Promise.all(
      sortedSeasons.map((s) => getPlayerTimelineMerged(battleTag, s.id))
    );
    return perSeason.flat();
  } catch (error) {
    console.error(`Error fetching all-time timeline for ${battleTag}:`, error);
    return [];
  }
};

/**
 * Get per-day activity across all seasons for a player.
 * Returns [{season, matchDays: ['2025-01-01', ...]}, ...] sorted oldest-first.
 */
export const getPlayerAllSeasonActivity = async (battleTag) => {
  try {
    let seasons = await getSeasons();
    if (!seasons || seasons.length === 0) seasons = [{ id: season }];
    const races = [0, 1, 2, 4, 8];
    const sortedSeasons = [...seasons].sort((a, b) => a.id - b.id);

    const perSeason = await Promise.all(sortedSeasons.map(async ({ id }) => {
      const raceResults = await Promise.all(races.map(async (race) => {
        try {
          const url = `${API_BASE}/players/${encodeURIComponent(battleTag)}/mmr-rp-timeline?gateway=${gateway}&season=${id}&race=${race}&gameMode=4`;
          const cacheKey = `timeline-days:${battleTag.toLowerCase()}:${race}:${id}`;
          const data = await fetchWithCache(url, { cacheKey, ttl: TTL.MMR_TIMELINE });
          return data?.mmrRpAtDates || [];
        } catch { return []; }
      }));
      const all = raceResults.flat();
      if (all.length === 0) return null;
      const daySet = new Set(all.map(e => e.date.slice(0, 10)));
      return { season: id, matchDays: [...daySet].sort() };
    }));

    return perSeason.filter(Boolean);
  } catch (error) {
    console.error(`Error fetching all-season activity for ${battleTag}:`, error);
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
export const searchLadder = async (searchTerm, seasonOverride = season, gameMode = 4) => {
  try {
    const url = `${API_BASE}/ladder/search?gateWay=${gateway}&searchFor=${encodeURIComponent(searchTerm)}&gameMode=${gameMode}&season=${seasonOverride}`;
    const cacheKey = `ladder-search:${searchTerm.toLowerCase()}:${seasonOverride}:${gameMode}`;

    return await fetchWithCache(url, { cacheKey, ttl: TTL.LADDER });
  } catch (error) {
    console.error(`Error searching ladder for ${searchTerm}:`, error);
    return [];
  }
};

// Search current season, falling back to previous season when current is empty/all-zero.
// Handles the early-season window where nobody has played yet.
export const searchLadderWithFallback = async (searchTerm, gameMode = 4) => {
  const [current, prev] = await Promise.all([
    searchLadder(searchTerm, season, gameMode),
    searchLadder(searchTerm, season - 1, gameMode),
  ]);

  const totalCurrentGames = (current || []).reduce(
    (sum, r) => sum + (r.player?.wins || 0) + (r.player?.losses || 0), 0
  );

  // Early season: no one has played yet — use previous season results directly
  if (totalCurrentGames === 0 && (prev || []).length > 0) return prev;

  // Mid season: enrich any 0-game players with their previous season stats
  const prevByTag = new Map();
  for (const r of (prev || [])) {
    const tag = r.player?.playerIds?.[0]?.battleTag || r.playersInfo?.[0]?.battleTag;
    if (tag) prevByTag.set(tag.toLowerCase(), r);
  }

  return (current || []).map(r => {
    const tag = r.player?.playerIds?.[0]?.battleTag || r.playersInfo?.[0]?.battleTag;
    const games = (r.player?.wins || 0) + (r.player?.losses || 0);
    if (games > 0 || !tag) return r;
    const fallback = prevByTag.get(tag.toLowerCase());
    if (!fallback) return r;
    return { ...r, player: { ...r.player, wins: fallback.player?.wins, losses: fallback.player?.losses, mmr: fallback.player?.mmr } };
  });
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

const RELAY_BASE =
  import.meta.env.VITE_CHAT_RELAY_URL || 'https://4v4gg-chat-relay.fly.dev';

/**
 * LLM-generated one-liner for a finished match. Two-phase on the relay:
 * an immediate provisional blurb (game data + pre-game chat), then —
 * ~5 min after the match ends — a rewrite IF the players reacted in the
 * lounge. While provisional, responses carry `pending` + `retryInMs`;
 * only finalized blurbs are cached client-side.
 *
 * @returns {Promise<{blurb: string|null, pending: boolean, retryInMs?: number, badges?: Array}>}
 */
export const getMatchBlurb = async (matchId) => {
  const cacheKey = `blurb:${matchId}`;
  const cached = cache.get(cacheKey);
  if (cached) return { blurb: cached.blurb, badges: cached.badges || [], pending: false };
  try {
    const res = await fetch(`${RELAY_BASE}/api/chat/match-blurb/${encodeURIComponent(matchId)}`);
    if (!res.ok) return { blurb: null, badges: [], pending: false };
    const data = await res.json();
    if (data?.blurb && !data.pending) {
      cache.set(cacheKey, { blurb: data.blurb, badges: data.badges || [] }, 24 * 60 * 60 * 1000);
    }
    return { blurb: data?.blurb || null, badges: data?.badges || [], pending: !!data?.pending, retryInMs: data?.retryInMs };
  } catch {
    return { blurb: null, badges: [], pending: false };
  }
};

/**
 * Batch fetch profiles for multiple players via the /many endpoint —
 * one request for a whole match card instead of 8.
 *
 * Note: /many returns only {id, countryCode, location, profilePicture},
 * so unlike getPlayerProfile there is no twitch field here. Match payloads
 * carry their own per-player twitch value for that use case.
 *
 * @param {string[]} battleTags
 * @returns {Promise<Map<string, {profilePicUrl: string|null, country: string|null}>>}
 */
export const getPlayerProfilesBatch = async (battleTags) => {
  const results = new Map();
  const missing = [];

  for (const battleTag of battleTags) {
    const cached = cache.get(`profileLite:${battleTag.toLowerCase()}`);
    if (cached) {
      results.set(battleTag, cached);
    } else {
      missing.push(battleTag);
    }
  }

  // /many takes comma-separated battleTags; chunk to keep URLs sane
  const CHUNK = 40;
  for (let i = 0; i < missing.length; i += CHUNK) {
    const chunk = missing.slice(i, i + CHUNK);
    let profiles = [];
    try {
      const tags = chunk.map(encodeURIComponent).join(',');
      const res = await fetch(`${API_BASE}/personal-settings/${tags}/many`);
      if (res.ok) profiles = await res.json();
    } catch {
      // fall through — missing players get null profiles below
    }

    const byTag = new Map(profiles.map(p => [p.id?.toLowerCase(), p]));
    for (const battleTag of chunk) {
      const data = byTag.get(battleTag.toLowerCase());
      const profile = {
        profilePicUrl: buildProfilePicUrl(data),
        country: data?.location || null,
      };
      results.set(battleTag, profile);
      if (data) {
        cache.set(`profileLite:${battleTag.toLowerCase()}`, profile, TTL.PERSONAL_SETTINGS);
      }
    }
  }

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
  const battleTagLower = battleTag.toLowerCase();

  try {
    // Fetch matches (cached, deduplicated)
    const { matches: allMatches } = await getPlayerMatches(battleTag, 50);

    if (!allMatches || allMatches.length === 0) {
      return { session: null, seasonMmrs: [], currentMmrFallback: null, rank: null, lastPlayed: null };
    }

    const matches = raceOverride != null ? filterMatchesByRace(allMatches, battleTag, raceOverride) : allMatches;

    // Detect session from matches
    const sessionMatches = detectSessionGames(matches, battleTag);

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
