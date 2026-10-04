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
import { gateway, season, gameMode, GAME_MODE } from './params';
import { detectSessionGames, filterMatchesByRace } from './session';

const API_BASE = 'https://website-backend.w3champions.com/api';

// Short TTLs for frequently changing data
const SHORT_TTL = 30 * 1000; // 30 seconds for live data
const MEDIUM_TTL = 2 * 60 * 1000; // 2 minutes for match lists

// W3C EAvatarCategory enum values (from w3champions/website src/store/types.ts)
const EAvatarCategory = { RANDOM: 0, HUMAN: 1, ORC: 2, NIGHTELF: 4, UNDEAD: 8, TOTAL: 16, SPECIAL: 32, STARTER: 64 };
const RACE_AVATAR_NAME = { 0: 'RANDOM', 1: 'HUMAN', 2: 'ORC', 4: 'NIGHTELF', 8: 'UNDEAD' };

// Hardcoded country overrides (keyed by lowercase battleTag)
const COUNTRY_OVERRIDES = { "потоп#2562": "RU" };

const W3C_STORAGE = 'https://storage.w3champions.com/prod/integration/icons';

/**
 * Build profile picture URL from profile data.
 * Mirrors W3C frontend getAvatarUrl() from src/helpers/url-functions.ts.
 */
const buildProfilePicUrl = (profileData) => {
  if (!profileData) return null;

  const { profilePicture, specialPictures } = profileData;
  if (!profilePicture?.pictureId) return null;

  const { pictureId, race, isClassic } = profilePicture;
  const classicPrefix = isClassic ? 'classic/' : '';

  // SPECIAL avatars - achievement / premium portraits
  if (race === EAvatarCategory.SPECIAL || specialPictures?.some(d => d.pictureId === pictureId)) {
    return `${W3C_STORAGE}/specialAvatars/SPECIAL_${pictureId}.jpg`;
  }

  // TOTAL (16) - total-wins portraits (e.g. TOTAL_9.jpg)
  if (race === EAvatarCategory.TOTAL) {
    return `${W3C_STORAGE}/raceAvatars/${classicPrefix}TOTAL_${pictureId}.jpg`;
  }

  // STARTER (64) - standard portraits from the starter kit (real images, not placeholders)
  if (race === EAvatarCategory.STARTER) {
    return `${W3C_STORAGE}/raceAvatars/${classicPrefix}STARTER_${pictureId}.jpg`;
  }

  // Regular race avatars (RANDOM, HUMAN, ORC, NIGHTELF, UNDEAD)
  const raceName = RACE_AVATAR_NAME[race] || 'RANDOM';
  return `${W3C_STORAGE}/raceAvatars/${classicPrefix}${raceName}_${pictureId}.jpg`;
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
    const cacheKey = `profile2:${battleTag.toLowerCase()}`;

    const data = await fetchWithCache(url, { cacheKey, ttl: TTL.PERSONAL_SETTINGS });

    const totalGames = Array.isArray(data.winLosses)
      ? data.winLosses.reduce((sum, r) => sum + (r.games || 0), 0)
      : null;

    const mostPlayedRace = Array.isArray(data.winLosses)
      ? (data.winLosses.sort((a, b) => b.games - a.games)[0]?.race ?? null)
      : null;

    return {
      profilePicUrl: buildProfilePicUrl(data),
      twitch: data.twitch || null,
      country: COUNTRY_OVERRIDES[battleTag.toLowerCase()] || data.location || null,
      homePage: (data.homePage && !/localhost|127\.0\.0\.1/.test(data.homePage)) ? data.homePage : null,
      profileMessage: data.profileMessage || null,
      totalGames: totalGames || null,
      mostPlayedRace,
    };
  } catch {
    return { profilePicUrl: null, twitch: null, country: null, homePage: null, profileMessage: null, totalGames: null, mostPlayedRace: null };
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

/**
 * Pick one row for a game mode out of a game-mode-stats response.
 *
 * W3C splits 1v1 into one row per race played, so a solo player can have
 * three. The row with the most games is the one that describes them; the
 * others are a handful of off-race games. 4v4 comes back as a single row.
 *
 * @param {Array} rows - raw game-mode-stats array
 * @param {number} gameMode
 * @returns {object|null}
 */
export const pickModeRow = (rows, gameMode) => {
  if (!Array.isArray(rows)) return null;
  let best = null;
  let bestGames = -1;
  for (const row of rows) {
    if (row?.gameMode !== gameMode) continue;
    const games = (row.wins || 0) + (row.losses || 0);
    if (games > bestGames) {
      best = row;
      bestGames = games;
    }
  }
  return best;
};

export const toModeStats = (row) => {
  if (!row) return null;
  return {
    mmr: row.mmr || 0,
    wins: row.wins || 0,
    losses: row.losses || 0,
    games: (row.wins || 0) + (row.losses || 0),
    rank: row.rank || null,
    race: row.race ?? null,
    // W3C's own percentile for the mode. The 1v1 and 4v4 MMR scales are not
    // the same, so this is what makes the two comparable.
    quantile: typeof row.quantile === 'number' ? row.quantile : null,
  };
};

export const getPlayerStats = async (battleTag, { seasonOverride = season, skipCache = false } = {}) => {
  try {
    const data = await getPlayerGameModeStatsRaw(battleTag, { seasonOverride, skipCache });

    const fourVsFourStats = pickModeRow(data, GAME_MODE.FOUR_V_FOUR);
    if (!fourVsFourStats) return null;

    // 1v1 and 2v2 ride along in the same response, so they cost no extra
    // request. Either can be absent; most 4v4 players have no solo row.
    return {
      ...toModeStats(fourVsFourStats),
      solo: toModeStats(pickModeRow(data, GAME_MODE.ONE_V_ONE)),
      twos: toModeStats(pickModeRow(data, GAME_MODE.TWO_V_TWO)),
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
      // one timeline point per game: per-day counts and the season's peak
      const dayCounts = {};
      let peakMmr = 0;
      for (const e of all) {
        const day = e.date.slice(0, 10);
        dayCounts[day] = (dayCounts[day] || 0) + 1;
        if (e.mmr > peakMmr) peakMmr = e.mmr;
      }
      return { season: id, matchDays: [...daySet].sort(), dayCounts, peakMmr, games: all.length };
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
 * Omitting gameMode (pass `null`) makes W3C return every mode merged and
 * date-sorted in one response, with a combined count. That is the only way to
 * see when a player last actually played: half the 4v4 ladder also plays 1v1,
 * and a 4v4-only history reads as inactive for players who are on every day.
 *
 * @param {string} battleTag
 * @param {number} pageSize - Number of matches to fetch
 * @param {number} offset - Pagination offset
 * @param {number} seasonOverride - Optional season override
 * @param {number|null} modeFilter - A GAME_MODE id, or null for every mode
 * @returns {Promise<{matches: Array, count: number}>}
 */
export const getPlayerMatches = async (
  battleTag,
  pageSize = 50,
  offset = 0,
  seasonOverride = season,
  modeFilter = GAME_MODE.FOUR_V_FOUR
) => {
  try {
    // /matches ignores playerId and hands back the global feed, so the form
    // dots were built from whichever of the last 50 games on the ladder the
    // player happened to be in. /matches/search is the one that filters.
    const modeParam = modeFilter == null ? '' : `&gameMode=${modeFilter}`;
    const url = `${API_BASE}/matches/search?playerId=${encodeURIComponent(battleTag)}&offset=${offset}${modeParam}&season=${seasonOverride}&gateway=${gateway}&pageSize=${pageSize}`;
    const cacheKey = `matches:${battleTag.toLowerCase()}:${offset}:${pageSize}:${seasonOverride}:${modeFilter ?? 'all'}`;

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

  // Early season: no one has played yet - use previous season results directly
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
 * an immediate provisional blurb (game data + pre-game chat), then -
 * ~5 min after the match ends - a rewrite IF the players reacted in the
 * lounge. While provisional, responses carry `pending` + `retryInMs`;
 * only finalized blurbs are cached client-side.
 *
 * @returns {Promise<{blurb: string|null, pending: boolean, retryInMs?: number, badges?: Array}>}
 */
export const getMatchBlurb = async (matchId) => {
  const cacheKey = `blurb:${matchId}`;
  const cached = cache.get(cacheKey);
  if (cached) return { blurb: cached.blurb, parts: cached.parts || null, badges: cached.badges || [], rivals: cached.rivals || [], pending: false };
  try {
    const res = await fetch(`${RELAY_BASE}/api/chat/match-blurb/${encodeURIComponent(matchId)}`);
    if (!res.ok) return { blurb: null, parts: null, badges: [], rivals: [], pending: false };
    const data = await res.json();
    if (data?.blurb && !data.pending) {
      cache.set(cacheKey, { blurb: data.blurb, parts: data.parts || null, badges: data.badges || [], rivals: data.rivals || [] }, 24 * 60 * 60 * 1000);
    }
    return { blurb: data?.blurb || null, parts: data?.parts || null, badges: data?.badges || [], rivals: data?.rivals || [], pending: !!data?.pending, retryInMs: data?.retryInMs };
  } catch {
    return { blurb: null, parts: null, badges: [], rivals: [], pending: false };
  }
};

/**
 * Batch fetch profiles for multiple players via the /many endpoint -
 * one request for a whole match card instead of 8.
 *
 * Note: /many returns only {id, countryCode, location, profilePicture},
 * so unlike getPlayerProfile there is no twitch field here. Match payloads
 * carry their own per-player twitch value for that use case.
 *
 * @param {string[]} battleTags
 * @returns {Promise<Map<string, {profilePicUrl: string|null, country: string|null}>>}
 */
/**
 * MVP per match from the relay's stored score lines: { [matchId]: battleTag | null }.
 * The relay only has yesterday and older, so today's games come back null.
 * A relay failure is an empty map, never an error: the badge is a garnish.
 */
export const getMatchMvps = async (matchIds) => {
  const ids = [...new Set(matchIds)].filter(Boolean);
  if (ids.length === 0) return {};
  try {
    const res = await fetch(`${RELAY_BASE}/api/matches/mvp?ids=${ids.map(encodeURIComponent).join(',')}`);
    if (!res.ok) return {};
    const data = await res.json();
    return data.mvp || {};
  } catch {
    return {};
  }
};

export const getPlayerProfilesBatch = async (battleTags) => {
  const results = new Map();
  const missing = [];

  for (const battleTag of battleTags) {
    const cached = cache.get(`profileLite2:${battleTag.toLowerCase()}`);
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
      // fall through - missing players get null profiles below
    }

    const byTag = new Map(profiles.map(p => [p.id?.toLowerCase(), p]));
    for (const battleTag of chunk) {
      const data = byTag.get(battleTag.toLowerCase());
      const profile = {
        profilePicUrl: buildProfilePicUrl(data),
        country: COUNTRY_OVERRIDES[battleTag.toLowerCase()] || data?.location || null,
      };
      results.set(battleTag, profile);
      if (data) {
        cache.set(`profileLite2:${battleTag.toLowerCase()}`, profile, TTL.PERSONAL_SETTINGS);
      }
    }
  }

  return results;
};

/**
 * 4v4 stats for many players in one request.
 *
 * /chat and the homepage need MMR for everyone in the channel at once, and
 * W3C has no batched form of game-mode-stats, so the relay does the fan-out
 * behind a cache every viewer shares. If the relay is unreachable this falls
 * back to the per-tag endpoint, which is what the page did before.
 *
 * @param {string[]} battleTags
 * @param {number} seasonOverride
 * @returns {Promise<Map<string, {mmr, wins, losses, rank, race}>>}
 */
export const getPlayerStatsBatch = async (battleTags, seasonOverride = season) => {
  const results = new Map();
  const missing = [];

  for (const battleTag of battleTags) {
    const cached = cache.get(`stats4v4v2:${battleTag.toLowerCase()}:${seasonOverride}`);
    if (cached) results.set(battleTag, cached);
    else missing.push(battleTag);
  }
  if (missing.length === 0) return results;

  const remember = (battleTag, stats) => {
    if (!stats) return;
    results.set(battleTag, stats);
    cache.set(`stats4v4v2:${battleTag.toLowerCase()}:${seasonOverride}`, stats, TTL.GAME_MODE_STATS);
  };

  // The relay caps a request at 120 tags
  const CHUNK = 100;
  for (let i = 0; i < missing.length; i += CHUNK) {
    const chunk = missing.slice(i, i + CHUNK);
    try {
      const tags = chunk.map(encodeURIComponent).join(',');
      const res = await fetch(`${RELAY_BASE}/api/w3c/stats?season=${seasonOverride}&tags=${tags}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { stats } = await res.json();
      // A tag the relay could not answer is absent; one it answered for an
      // unknown player is present and null. Only the former needs a retry.
      const unanswered = [];
      for (const battleTag of chunk) {
        if (stats && battleTag in stats) remember(battleTag, stats[battleTag]);
        else unanswered.push(battleTag);
      }
      if (unanswered.length > 0) {
        const perTag = await Promise.all(
          unanswered.map((battleTag) => getPlayerStats(battleTag, { seasonOverride }).catch(() => null))
        );
        unanswered.forEach((battleTag, idx) => remember(battleTag, perTag[idx]));
      }
    } catch {
      // Relay down or rate limited: go straight to W3C, one tag at a time
      const perTag = await Promise.all(
        chunk.map((battleTag) => getPlayerStats(battleTag, { seasonOverride }).catch(() => null))
      );
      chunk.forEach((battleTag, idx) => remember(battleTag, perTag[idx]));
    }
  }

  return results;
};

/**
 * Twitch handles for many players in one request.
 *
 * personal-settings/{tags}/many leaves `twitch` out, so learning who in the
 * channel streams otherwise costs one profile fetch per player. Same relay
 * fan-out as getPlayerStatsBatch, with the same per-tag fallback.
 *
 * @param {string[]} battleTags
 * @returns {Promise<Map<string, string|null>>} battleTag -> handle or null
 */
export const getTwitchNamesBatch = async (battleTags) => {
  const results = new Map();
  const missing = [];

  for (const battleTag of battleTags) {
    const cached = cache.get(`twitchName:${battleTag.toLowerCase()}`);
    if (cached !== null) results.set(battleTag, cached.name);
    else missing.push(battleTag);
  }
  if (missing.length === 0) return results;

  const remember = (battleTag, name) => {
    results.set(battleTag, name || null);
    cache.set(`twitchName:${battleTag.toLowerCase()}`, { name: name || null }, TTL.PERSONAL_SETTINGS);
  };

  const CHUNK = 100;
  for (let i = 0; i < missing.length; i += CHUNK) {
    const chunk = missing.slice(i, i + CHUNK);
    try {
      const tags = chunk.map(encodeURIComponent).join(',');
      const res = await fetch(`${RELAY_BASE}/api/w3c/twitch?tags=${tags}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { twitch } = await res.json();
      const unanswered = [];
      for (const battleTag of chunk) {
        if (twitch && battleTag in twitch) remember(battleTag, twitch[battleTag]);
        else unanswered.push(battleTag);
      }
      if (unanswered.length > 0) {
        const perTag = await Promise.all(
          unanswered.map((battleTag) => getPlayerProfile(battleTag).catch(() => null))
        );
        unanswered.forEach((battleTag, idx) => remember(battleTag, perTag[idx]?.twitch));
      }
    } catch {
      // Relay down: one profile fetch per tag, which is what this replaced
      const perTag = await Promise.all(
        chunk.map((battleTag) => getPlayerProfile(battleTag).catch(() => null))
      );
      chunk.forEach((battleTag, idx) => remember(battleTag, perTag[idx]?.twitch));
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
