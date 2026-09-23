import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { getMessages, getStats, getEvents, getEventsSummary, queryMessages, countMessages } from '../db.js';
import { addClient } from '../sse.js';
import { getOnlineUsers, getStatus } from '../signalr.js';
import { publicLimiter } from '../middleware/rateLimit.js';
import { generateMatchBlurb } from '../matchBlurb.js';

const router = Router();

// ── Public message search ───────────────────────────────
// Registered ahead of the router-wide publicLimiter: the /chat search panel
// fires a request per (debounced) keystroke, so it gets its own budget
// instead of eating the one shared with /messages and /stream.

const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many search requests, try again in a minute' },
});

const SEARCH_SINCE_HOURS = { '24h': 24, '7d': 168, '30d': 720, all: null };
const SEARCH_MAX_LIMIT = 50;

// ISO date -> received_at cursor (sqlite datetime('now') format, UTC).
// null when absent, undefined when unparseable.
function toCursor(value) {
  if (!value) return null;
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

// GET /api/chat/search?q=&player=&since=24h|7d|30d|all&before=&after=&offset=&limit=
//   q       message text substring (optional when player is given)
//   player  battleTag (exact) or name prefix
//   since   lookback, default 7d
//   before/after  ISO bounds on received_at (optional)
// -> { query, player, since, windowHours, results, total, offset, limit }
router.get('/search', searchLimiter, (req, res) => {
  const q = String(req.query.q || '').trim();
  const player = String(req.query.player || '').trim();
  if (!q && !player) {
    return res.status(400).json({ error: 'q or player is required' });
  }
  if (q && q.length < 2) {
    return res.status(400).json({ error: 'q must be at least 2 characters' });
  }
  if (player && player.length < 2) {
    return res.status(400).json({ error: 'player must be at least 2 characters' });
  }
  const since = req.query.since === undefined ? '7d' : String(req.query.since);
  if (!(since in SEARCH_SINCE_HOURS)) {
    return res.status(400).json({ error: 'since must be one of 24h, 7d, 30d, all' });
  }
  const before = toCursor(req.query.before);
  const after = toCursor(req.query.after);
  if (before === undefined || after === undefined) {
    return res.status(400).json({ error: 'before/after must be ISO dates' });
  }
  const limit = Math.min(Math.max(parseInt(req.query.limit || '50', 10) || 50, 1), SEARCH_MAX_LIMIT);
  const offset = Math.max(parseInt(req.query.offset || '0', 10) || 0, 0);

  const windowHours = SEARCH_SINCE_HOURS[since];
  const filters = {
    q: q || null,
    fields: 'message',
    player: player || null,
    playerMatch: 'prefix',
    sinceHours: windowHours,
    before,
    after,
  };
  res.json({
    query: q || null,
    player: player || null,
    since,
    windowHours,
    results: queryMessages(filters, limit, offset),
    total: countMessages(filters),
    offset,
    limit,
  });
});

router.use(publicLimiter);

// Paginated message history (cursor-based)
router.get('/messages', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
  const before = req.query.before || null;
  const messages = getMessages({ limit, before });
  res.json(messages);
});

// SSE stream - sends last 50 messages as initial history event, then live updates
router.get('/stream', (req, res) => {
  addClient(res);

  const history = getMessages({ limit: 50 });
  res.write(`event: history\ndata: ${JSON.stringify(history.reverse())}\n\n`);
  res.write(`event: users_init\ndata: ${JSON.stringify(getOnlineUsers())}\n\n`);
  // Current relay state so a fresh client sees auth_failed / banned at once
  res.write(`event: status\ndata: ${JSON.stringify({ state: getStatus().state })}\n\n`);
});

// LLM one-liner for a finished match - generated once, cached forever
router.get('/match-blurb/:matchId', async (req, res) => {
  const { matchId } = req.params;
  if (!/^[a-f0-9]{24}$/i.test(matchId)) {
    return res.status(400).json({ error: 'Invalid match id' });
  }
  const result = await generateMatchBlurb(matchId);
  res.json({
    matchId,
    blurb: result.blurb || null,
    parts: result.parts || null,
    pending: result.pending || false,
    retryInMs: result.retryInMs,
    badges: result.badges || [],
    rivals: result.rivals || [],
  });
});

// Chat stats - cached for 60s (runs ~12 aggregate queries)
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

// GET /api/chat/events/summary - available date ranges and event counts
router.get('/events/summary', (_req, res) => {
  const summary = getEventsSummary();
  res.json(summary);
});

export default router;
