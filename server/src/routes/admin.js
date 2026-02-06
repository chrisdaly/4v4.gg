import { Router } from 'express';
import config from '../config.js';
import { setToken } from '../db.js';
import { updateToken, getStatus } from '../signalr.js';
import { getClientCount } from '../sse.js';

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

// Health check (public)
router.get('/health', (_req, res) => {
  const signalr = getStatus();
  res.json({
    status: signalr.state === 'Connected' ? 'ok' : signalr.state,
    signalr: signalr,
    sseClients: getClientCount(),
    uptime: process.uptime(),
  });
});

export default router;
