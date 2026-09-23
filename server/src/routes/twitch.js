import { Router } from 'express';
import config from '../config.js';
import { twitchGet } from '../clips.js';
import { publicLimiter } from '../middleware/rateLimit.js';

const router = Router();

router.use(publicLimiter);

const LOGIN_RE = /^[a-zA-Z0-9_]{1,25}$/;
const MAX_LOGINS = 100;
const STREAMS_CACHE_TTL = 60_000;
const streamsCache = new Map(); // sorted login key → { data, expires }

function pruneStreamsCache() {
  const now = Date.now();
  for (const [key, entry] of streamsCache) {
    if (entry.expires <= now) streamsCache.delete(key);
  }
}

// GET /api/twitch/streams?logins=login1,login2,... - proxy for Helix /streams
router.get('/streams', async (req, res) => {
  if (!config.TWITCH_CLIENT_ID || !config.TWITCH_CLIENT_SECRET) {
    return res.status(503).json({ error: 'Twitch credentials are not configured' });
  }

  const logins = String(req.query.logins || '')
    .split(',')
    .map(l => l.trim())
    .filter(Boolean)
    .slice(0, MAX_LOGINS);

  if (logins.length === 0) {
    return res.status(400).json({ error: 'logins query parameter is required (comma-separated Twitch logins)' });
  }
  const invalid = logins.find(l => !LOGIN_RE.test(l));
  if (invalid) {
    return res.status(400).json({ error: `Invalid Twitch login: ${invalid}` });
  }

  const cacheKey = [...logins].sort().join(',');
  const cached = streamsCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return res.json({ streams: cached.data });
  }

  try {
    const params = new URLSearchParams();
    for (const login of logins) params.append('user_login', login);
    const data = await twitchGet(`/streams?${params.toString()}`);
    const streams = data.data || [];
    pruneStreamsCache();
    streamsCache.set(cacheKey, { data: streams, expires: Date.now() + STREAMS_CACHE_TTL });
    res.json({ streams });
  } catch (err) {
    console.error('[Twitch] Streams proxy error:', err.message);
    res.status(502).json({ error: 'Failed to fetch streams from Twitch' });
  }
});

// ── Clip metadata (chat unfurls) ────────────────────────

const SLUG_RE = /^[A-Za-z0-9_-]{1,120}$/;
const CLIP_CACHE_TTL = 60 * 60 * 1000;
const clipCache = new Map(); // slug → { data, expires }

function pruneClipCache() {
  const now = Date.now();
  for (const [key, entry] of clipCache) {
    if (entry.expires <= now) clipCache.delete(key);
  }
}

// GET /api/twitch/clip/:slug - title + thumbnail for a clips.twitch.tv slug
// -> { title, thumbnail_url, broadcaster_name, url }, cached for an hour
router.get('/clip/:slug', async (req, res) => {
  if (!config.TWITCH_CLIENT_ID || !config.TWITCH_CLIENT_SECRET) {
    return res.status(503).json({ error: 'Twitch credentials are not configured' });
  }
  const { slug } = req.params;
  if (!SLUG_RE.test(slug)) {
    return res.status(400).json({ error: 'Invalid clip slug' });
  }

  const cached = clipCache.get(slug);
  if (cached && cached.expires > Date.now()) {
    if (!cached.data) return res.status(404).json({ error: 'Clip not found' });
    res.set('Cache-Control', 'public, max-age=3600');
    return res.json(cached.data);
  }

  try {
    const data = await twitchGet(`/clips?id=${encodeURIComponent(slug)}`);
    const c = (data.data || [])[0];
    pruneClipCache();
    if (!c) {
      clipCache.set(slug, { data: null, expires: Date.now() + CLIP_CACHE_TTL });
      return res.status(404).json({ error: 'Clip not found' });
    }
    const clip = {
      title: c.title || '',
      thumbnail_url: c.thumbnail_url || null,
      broadcaster_name: c.broadcaster_name || '',
      url: c.url || `https://clips.twitch.tv/${slug}`,
    };
    clipCache.set(slug, { data: clip, expires: Date.now() + CLIP_CACHE_TTL });
    res.set('Cache-Control', 'public, max-age=3600');
    res.json(clip);
  } catch (err) {
    console.error('[Twitch] Clip proxy error:', err.message);
    res.status(502).json({ error: 'Failed to fetch clip from Twitch' });
  }
});

export default router;
