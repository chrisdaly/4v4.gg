import { Router } from 'express';
import config from '../config.js';
import { setToken, getStats, getTopWords, getRecentDigests, deleteDigest } from '../db.js';
import { updateToken, getStatus } from '../signalr.js';
import { getClientCount } from '../sse.js';
import { setBotEnabled, isBotEnabled, testCommand } from '../bot.js';
import { generateDigest } from '../digest.js';

const router = Router();

function requireApiKey(req, res, next) {
  const key = req.headers['x-api-key'];
  if (!config.ADMIN_API_KEY || key !== config.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Invalid or missing API key' });
  }
  next();
}

// Set W3C JWT token
router.post('/token', requireApiKey, (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }
  setToken(token);
  updateToken(token);
  res.json({ ok: true, message: 'Token updated, SignalR reconnecting...' });
});

// Test a bot command — runs it and broadcasts via SSE, never sends to chat (public)
router.post('/bot/test', async (req, res) => {
  const { command } = req.body;
  if (!command || typeof command !== 'string') {
    return res.status(400).json({ error: 'command is required (e.g. "!games")' });
  }
  const result = await testCommand(command.trim());
  if (!result) {
    return res.status(400).json({ error: `Unknown command: ${command}` });
  }
  res.json(result);
});

// Toggle bot enabled/disabled
router.post('/bot', requireApiKey, (req, res) => {
  const { enabled } = req.body;
  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ error: 'enabled (boolean) is required' });
  }
  setBotEnabled(enabled);
  res.json({ ok: true, botEnabled: isBotEnabled() });
});

// Get bot status
router.get('/bot', requireApiKey, (_req, res) => {
  res.json({ botEnabled: isBotEnabled() });
});

// Top words (public)
router.get('/top-words', (req, res) => {
  const days = Math.min(parseInt(req.query.days) || 7, 30);
  res.json(getTopWords(days));
});

// Daily digest — generates if missing, returns cached (public)
router.get('/digest/:date', async (req, res) => {
  const { date } = req.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'Date must be YYYY-MM-DD' });
  }
  try {
    const digest = await generateDigest(date);
    if (!digest) {
      return res.json({ date, digest: null, reason: 'Not enough messages or no API key' });
    }
    res.json({ date, digest });
  } catch (err) {
    console.error('[Digest] Error:', err.message);
    res.status(500).json({ error: 'Failed to generate digest' });
  }
});

// Delete a cached digest (so it can be regenerated)
router.delete('/digest/:date', requireApiKey, (req, res) => {
  const { date } = req.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'Date must be YYYY-MM-DD' });
  }
  deleteDigest(date);
  res.json({ ok: true, message: `Digest for ${date} cleared` });
});

// Recent digests (public)
router.get('/digests', (_req, res) => {
  res.json(getRecentDigests(14));
});

// Analytics bundle (public) — top words + recent digests in one call
router.get('/analytics', (_req, res) => {
  res.json({
    topWords: getTopWords(7),
    digests: getRecentDigests(7),
  });
});

// Health check (public)
router.get('/health', (_req, res) => {
  const signalr = getStatus();
  const dbStats = getStats();
  res.json({
    status: signalr.state === 'Connected' ? 'ok' : signalr.state,
    signalr: signalr,
    sseClients: getClientCount(),
    botEnabled: isBotEnabled(),
    uptime: process.uptime(),
    db: dbStats,
  });
});

export default router;
