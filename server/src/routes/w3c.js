import { Router } from 'express';
import { publicLimiter } from '../middleware/rateLimit.js';

const router = Router();

router.use(publicLimiter);

const API_BASE = 'https://website-backend.w3champions.com/api';
const GATEWAY = 20;
const GAME_MODE = 4;
const GAME_MODE_1V1 = 1;
const GAME_MODE_2V2 = 2;

const MAX_TAGS = 120;
// Discriminators run longer than they look: Adventurer#127632598 is a real tag
const TAG_RE = /^[^,/?&#]{1,40}#\d{1,12}$/;
const STATS_TTL = 5 * 60 * 1000;
// A player changes their Twitch handle about never
const TWITCH_TTL = 6 * 60 * 60 * 1000;
// W3C has no batched game-mode-stats endpoint, so the fan-out happens here
// once and is then shared by every viewer rather than repeated per browser
const CONCURRENCY = 8;

const statsCache = new Map(); // `${tagLower}:${season}` -> { data, expires }
const twitchCache = new Map(); // tagLower -> { data, expires }

function prune(store) {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.expires <= now) store.delete(key);
  }
}

/**
 * The battleTags a request asked for.
 *
 * A tag that does not parse is dropped, not fatal. These batches carry a
 * whole chat roster, and rejecting all of them over one odd tag sends the
 * client back to fetching every player one at a time - which is the entire
 * thing this endpoint exists to avoid.
 */
function readTags(req) {
  const asked = String(req.query.tags || '')
    .split(',')
    .map(t => t.trim())
    .filter(Boolean)
    .slice(0, MAX_TAGS);

  if (asked.length === 0) {
    return { error: 'tags query parameter is required (comma-separated battleTags)' };
  }
  const tags = asked.filter(t => TAG_RE.test(t));
  if (tags.length === 0) {
    return { error: `No valid battleTag in: ${asked.slice(0, 3).join(', ')}` };
  }
  return { tags, skipped: asked.length - tags.length };
}

/**
 * Serve `tags` from `store`, fetch the misses through `fetchOne`, cache them
 * for `ttl` and hand back everything found.
 */
async function collect(tags, store, ttl, fetchOne, label) {
  prune(store);
  const now = Date.now();
  const out = {};
  const misses = [];

  for (const tag of tags) {
    const entry = store.get(tag.toLowerCase());
    if (entry && entry.expires > now) out[tag] = entry.data;
    else misses.push(tag);
  }

  await pool(misses, async (tag) => {
    try {
      const data = await fetchOne(tag);
      store.set(tag.toLowerCase(), { data, expires: Date.now() + ttl });
      out[tag] = data;
    } catch (err) {
      // A tag that fails is simply absent; the client falls back for it
      console.error(`[W3C] ${label} for ${tag}:`, err.message);
    }
  });

  return { out, hits: tags.length - misses.length };
}

/**
 * One row per game mode, out of a response that holds several.
 *
 * W3C splits 1v1 into one row per race played, so a solo player can have
 * three. The row with the most games is the one that describes them.
 */
function pickModeRow(rows, gameMode) {
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
}

function toModeStats(row) {
  if (!row) return null;
  return {
    mmr: row.mmr || 0,
    wins: row.wins || 0,
    losses: row.losses || 0,
    games: (row.wins || 0) + (row.losses || 0),
    rank: row.rank || null,
    race: row.race ?? null,
    // W3C's own percentile for the mode. The 1v1 and 4v4 MMR scales differ,
    // so this is what makes the two comparable.
    quantile: typeof row.quantile === 'number' ? row.quantile : null,
  };
}

async function fetchStats(tag, season) {
  const url = `${API_BASE}/players/${encodeURIComponent(tag)}/game-mode-stats?gateway=${GATEWAY}&season=${season}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const rows = await res.json();
  const row = pickModeRow(rows, GAME_MODE);
  if (!row) return null;
  // 1v1 and 2v2 are in the same response, so they cost no extra request.
  // Either can be absent; most 4v4 players have no solo row at all.
  return {
    ...toModeStats(row),
    solo: toModeStats(pickModeRow(rows, GAME_MODE_1V1)),
    twos: toModeStats(pickModeRow(rows, GAME_MODE_2V2)),
  };
}

async function fetchTwitch(tag) {
  const res = await fetch(`${API_BASE}/personal-settings/${encodeURIComponent(tag)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data?.twitch || null;
}

/** Run `work` over `items`, at most CONCURRENCY in flight. */
async function pool(items, work) {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
    while (cursor < items.length) {
      const item = items[cursor++];
      await work(item);
    }
  });
  await Promise.all(runners);
}

// GET /api/w3c/stats?tags=a%231,b%232&season=25
// -> { stats: { "a#1": { mmr, wins, losses, rank, race } | null } }
//
// One request in place of one per player. /chat and the homepage need 4v4
// stats for everyone in the channel at once, and W3C offers no batch form of
// game-mode-stats, so the per-tag fan-out lives here behind a shared cache.
router.get('/stats', async (req, res) => {
  const season = Number.parseInt(req.query.season, 10);
  if (!Number.isInteger(season) || season < 1 || season > 999) {
    return res.status(400).json({ error: 'season query parameter is required' });
  }
  const { tags, skipped, error } = readTags(req);
  if (error) return res.status(400).json({ error });

  const { out, hits } = await collect(
    tags,
    statsCache,
    STATS_TTL,
    (tag) => fetchStats(tag, season),
    'stats'
  );
  res.set('Cache-Control', 'public, max-age=60');
  res.json({ stats: out, cached: hits, skipped });
});

// GET /api/w3c/twitch?tags=a%231,b%232
// -> { twitch: { "a#1": "handle" | null } }
//
// personal-settings/{tags}/many leaves `twitch` out, so learning who streams
// costs one profile fetch per player. Same fan-out, same shared cache, and a
// long TTL because handles effectively never change.
router.get('/twitch', async (req, res) => {
  const { tags, skipped, error } = readTags(req);
  if (error) return res.status(400).json({ error });

  const { out, hits } = await collect(tags, twitchCache, TWITCH_TTL, fetchTwitch, 'twitch');
  res.set('Cache-Control', 'public, max-age=300');
  res.json({ twitch: out, cached: hits, skipped });
});

export default router;
