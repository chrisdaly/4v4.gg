import { Router } from 'express';
import { publicLimiter } from '../middleware/rateLimit.js';

const router = Router();

router.use(publicLimiter);

const API_BASE = 'https://website-backend.w3champions.com/api';
const GATEWAY = 20;
const GAME_MODE = 4;

const MAX_TAGS = 120;
const TAG_RE = /^[^,/?&#]{1,40}#\d{3,8}$/;
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

/** The battleTags a request asked for, validated, or an error string. */
function readTags(req) {
  const tags = String(req.query.tags || '')
    .split(',')
    .map(t => t.trim())
    .filter(Boolean)
    .slice(0, MAX_TAGS);

  if (tags.length === 0) {
    return { error: 'tags query parameter is required (comma-separated battleTags)' };
  }
  const invalid = tags.find(t => !TAG_RE.test(t));
  if (invalid) return { error: `Invalid battleTag: ${invalid}` };
  return { tags };
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

async function fetchStats(tag, season) {
  const url = `${API_BASE}/players/${encodeURIComponent(tag)}/game-mode-stats?gateway=${GATEWAY}&season=${season}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const rows = await res.json();
  const row = Array.isArray(rows) ? rows.find(r => r.gameMode === GAME_MODE) : null;
  if (!row) return null;
  return {
    mmr: row.mmr || 0,
    wins: row.wins || 0,
    losses: row.losses || 0,
    rank: row.rank || null,
    race: row.race ?? null,
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
  const { tags, error } = readTags(req);
  if (error) return res.status(400).json({ error });

  const { out, hits } = await collect(
    tags,
    statsCache,
    STATS_TTL,
    (tag) => fetchStats(tag, season),
    'stats'
  );
  res.set('Cache-Control', 'public, max-age=60');
  res.json({ stats: out, cached: hits });
});

// GET /api/w3c/twitch?tags=a%231,b%232
// -> { twitch: { "a#1": "handle" | null } }
//
// personal-settings/{tags}/many leaves `twitch` out, so learning who streams
// costs one profile fetch per player. Same fan-out, same shared cache, and a
// long TTL because handles effectively never change.
router.get('/twitch', async (req, res) => {
  const { tags, error } = readTags(req);
  if (error) return res.status(400).json({ error });

  const { out, hits } = await collect(tags, twitchCache, TWITCH_TTL, fetchTwitch, 'twitch');
  res.set('Cache-Control', 'public, max-age=300');
  res.json({ twitch: out, cached: hits });
});

export default router;
