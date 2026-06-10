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

// GET /api/twitch/streams?logins=login1,login2,... — proxy for Helix /streams
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

export default router;
