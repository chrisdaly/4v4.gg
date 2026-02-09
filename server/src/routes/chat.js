import { Router } from 'express';
import { getMessages, getStats, getEvents, getEventsSummary } from '../db.js';
import { addClient } from '../sse.js';
import { getOnlineUsers } from '../signalr.js';

const router = Router();

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

// Chat stats
router.get('/stats', (_req, res) => {
  const stats = getStats();
  res.json(stats);
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
