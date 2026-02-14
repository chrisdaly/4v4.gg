import { Router } from 'express';
import config from '../config.js';
import { getClips, getClipById, getFeaturedClips, updateClipCuration, getStreamers, upsertStreamer, deactivateStreamer } from '../db.js';
import { runClipFetch } from '../clips.js';

const router = Router();

function requireApiKey(req, res, next) {
  const key = req.headers['x-api-key'];
  if (!config.ADMIN_API_KEY || key !== config.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Invalid or missing API key' });
  }
  next();
}

// ── Public routes ───────────────────────────────

// GET /api/clips — paginated clip feed
router.get('/', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const offset = parseInt(req.query.offset) || 0;
  const streamer = req.query.streamer || null;
  const tag = req.query.tag || null;
  const since = req.query.since || null;
  const player = req.query.player || null;

  const clips = getClips({ limit, offset, streamer, tag, since, player });
  res.json({ clips, count: clips.length, offset });
});

// GET /api/clips/streamers — active streamers for filter dropdown
router.get('/streamers', (req, res) => {
  const streamers = getStreamers();
  res.json({ streamers: streamers.map(s => ({ twitch_login: s.twitch_login, display_name: s.display_name })) });
});

// GET /api/clips/:clipId — single clip
router.get('/:clipId', (req, res) => {
  const clip = getClipById(req.params.clipId);
  if (!clip) return res.status(404).json({ error: 'Clip not found' });
  res.json(clip);
});

// ── Admin routes ────────────────────────────────

// GET /api/clips/admin/all — all clips including hidden (for admin triage)
router.get('/admin/all', requireApiKey, (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const offset = parseInt(req.query.offset) || 0;
  const clips = getClips({ limit, offset, includeHidden: true });
  res.json({ clips, count: clips.length, offset });
});

// POST /api/clips/admin/feature — feature a clip
router.post('/admin/feature', requireApiKey, (req, res) => {
  const { clipId, tag, playerTag } = req.body;
  if (!clipId) return res.status(400).json({ error: 'clipId is required' });

  const clip = getClipById(clipId);
  if (!clip) return res.status(404).json({ error: 'Clip not found' });

  const updates = { featured: true, tag: tag || null };
  if (playerTag !== undefined) updates.playerTag = playerTag || null;
  updateClipCuration(clipId, updates);
  res.json({ ok: true, message: `Clip ${clipId} featured` });
});

// POST /api/clips/admin/hide — hide a clip from feed
router.post('/admin/hide', requireApiKey, (req, res) => {
  const { clipId } = req.body;
  if (!clipId) return res.status(400).json({ error: 'clipId is required' });

  updateClipCuration(clipId, { hidden: true });
  res.json({ ok: true, message: `Clip ${clipId} hidden` });
});

// POST /api/clips/admin/unhide — restore a hidden clip
router.post('/admin/unhide', requireApiKey, (req, res) => {
  const { clipId } = req.body;
  if (!clipId) return res.status(400).json({ error: 'clipId is required' });

  updateClipCuration(clipId, { hidden: false });
  res.json({ ok: true, message: `Clip ${clipId} restored` });
});

// POST /api/clips/admin/tag-player — set player tag on a clip
router.post('/admin/tag-player', requireApiKey, (req, res) => {
  const { clipId, playerTag } = req.body;
  if (!clipId) return res.status(400).json({ error: 'clipId is required' });

  const clip = getClipById(clipId);
  if (!clip) return res.status(404).json({ error: 'Clip not found' });

  updateClipCuration(clipId, { playerTag: playerTag || null });
  res.json({ ok: true, message: `Clip ${clipId} player tagged as ${playerTag || 'none'}` });
});

// POST /api/clips/admin/streamers — add/update a streamer
router.post('/admin/streamers', requireApiKey, (req, res) => {
  const { twitch_login, display_name, battle_tag } = req.body;
  if (!twitch_login) return res.status(400).json({ error: 'twitch_login is required' });

  upsertStreamer({ twitch_login, display_name, battle_tag });
  res.json({ ok: true, message: `Streamer ${twitch_login} upserted` });
});

// DELETE /api/clips/admin/streamers/:login — deactivate a streamer
router.delete('/admin/streamers/:login', requireApiKey, (req, res) => {
  deactivateStreamer(req.params.login);
  res.json({ ok: true, message: `Streamer ${req.params.login} deactivated` });
});

// POST /api/clips/admin/fetch — trigger manual fetch
router.post('/admin/fetch', requireApiKey, async (req, res) => {
  try {
    const result = await runClipFetch();
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
