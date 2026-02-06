import { Router } from 'express';
import { getMessages, getStats } from '../db.js';
import { addClient } from '../sse.js';

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
  const payload = `event: history\ndata: ${JSON.stringify(history.reverse())}\n\n`;
  res.write(payload);
});

// Chat stats
router.get('/stats', (_req, res) => {
  const stats = getStats();
  res.json(stats);
});

export default router;
