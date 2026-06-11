import { Router } from 'express';
import { getMessages, getStats, getEvents, getEventsSummary, searchMessages } from '../db.js';
import { addClient } from '../sse.js';
import { getOnlineUsers } from '../signalr.js';
import { publicLimiter } from '../middleware/rateLimit.js';
import { generateMatchBlurb } from '../matchBlurb.js';

const router = Router();

router.use(publicLimiter);

// Paginated message history (cursor-based)
router.get('/messages', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
  const before = req.query.before || null;
  const messages = getMessages({ limit, before });
  res.json(messages);
});

// SSE stream — sends last 50 messages as initial history event, then live updates
router.get('/stream', (req, res) => {
  addClient(res);

  const history = getMessages({ limit: 50 });
  res.write(`event: history\ndata: ${JSON.stringify(history.reverse())}\n\n`);
  res.write(`event: users_init\ndata: ${JSON.stringify(getOnlineUsers())}\n\n`);
});

// Public message search, limited to the last 24h (the admin variant under
// /api/admin searches the full archive with player filters)
const PUBLIC_SEARCH_WINDOW_HOURS = 24;

router.get('/search', (req, res) => {
  const q = (req.query.q || '').trim();
  if (q.length < 2) {
    return res.status(400).json({ error: 'q must be at least 2 characters' });
  }
  const limit = Math.min(parseInt(req.query.limit || '50', 10) || 50, 100);
  const offset = parseInt(req.query.offset || '0', 10) || 0;
  res.json({
    query: q,
    windowHours: PUBLIC_SEARCH_WINDOW_HOURS,
    results: searchMessages(q, limit, offset, PUBLIC_SEARCH_WINDOW_HOURS),
  });
});

// LLM one-liner for a finished match — generated once, cached forever
router.get('/match-blurb/:matchId', async (req, res) => {
  const { matchId } = req.params;
  if (!/^[a-f0-9]{24}$/i.test(matchId)) {
    return res.status(400).json({ error: 'Invalid match id' });
  }
  const blurb = await generateMatchBlurb(matchId);
  res.json({ matchId, blurb: blurb || null });
});

// Chat stats — cached for 60s (runs ~12 aggregate queries)
const STATS_CACHE_TTL = 60_000;
let statsCache = { data: null, expires: 0 };

router.get('/stats', (_req, res) => {
  const now = Date.now();
  if (!statsCache.data || statsCache.expires <= now) {
    statsCache = { data: getStats(), expires: now + STATS_CACHE_TTL };
  }
  res.json(statsCache.data);
});

// ── Replay API ──────────────────────────────────────────

// GET /api/chat/events?from=ISO&to=ISO&types=join,leave,game_start,game_end
router.get('/events', (req, res) => {
  const { from, to, types } = req.query;
  if (!from || !to) {
    return res.status(400).json({ error: 'from and to query parameters required (ISO dates)' });
  }

  const typeList = types ? types.split(',').map(t => t.trim()).filter(Boolean) : null;
  const events = getEvents({ from, to, types: typeList });

  // Parse payload JSON for each event
  const parsed = events.map(e => ({
    id: e.id,
    type: e.type,
    timestamp: e.timestamp,
    payload: JSON.parse(e.payload),
  }));

  res.json({ events: parsed });
});

// GET /api/chat/events/summary — available date ranges and event counts
router.get('/events/summary', (_req, res) => {
  const summary = getEventsSummary();
  res.json(summary);
});

export default router;
