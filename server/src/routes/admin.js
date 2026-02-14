import { Router } from 'express';
import config from '../config.js';
import { setToken, getStats, getTopWords, getRecentDigests, deleteDigest, getRecentWeeklyDigests, deleteWeeklyDigest, getDraftForDate, updateDigestOnly, updateDraftOnly, updateHiddenAvatars, getContextAroundQuotes, getMessagesByTimeWindow, getMessagesByDateAndUsers, getMessageBuckets, getGameStats, getMatchContext } from '../db.js';
import { updateToken, getStatus } from '../signalr.js';
import { getClientCount } from '../sse.js';
import { setBotEnabled, isBotEnabled, testCommand } from '../bot.js';
import { generateDigest, fetchDailyStats, generateLiveDigest, todayDigestCache, setTodayDigestCache, generateWeeklyDigest, curateDigest, fetchDailyStatCandidates, analyzeSpike, generateMoreItems, appendItemsToDraft } from '../digest.js';

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

// Get draft for a date (protected — editorial mode)
router.get('/digest/:date/draft', requireApiKey, (req, res) => {
  const { date } = req.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'Date must be YYYY-MM-DD' });
  }
  const result = getDraftForDate(date);
  if (!result) {
    return res.json({ date, draft: null, digest: null });
  }
  res.json(result);
});

// Update draft text (protected) — persists text edits, reorders, quote changes
router.put('/digest/:date/draft', requireApiKey, (req, res) => {
  const { date } = req.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'Date must be YYYY-MM-DD' });
  }
  const { draft } = req.body;
  if (!draft || typeof draft !== 'string') {
    return res.status(400).json({ error: 'draft (string) is required' });
  }
  updateDraftOnly(date, draft);
  res.json({ ok: true, date });
});

// Stat candidates for editorial picking (protected)
router.get('/digest/:date/stat-candidates', requireApiKey, async (req, res) => {
  const { date } = req.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'Date must be YYYY-MM-DD' });
  }
  try {
    const candidates = await fetchDailyStatCandidates(date);
    if (!candidates) {
      return res.json({ date, candidates: null });
    }
    res.json({ date, candidates });
  } catch (err) {
    console.error('[Digest] Stat candidates error:', err.message);
    res.status(500).json({ error: 'Failed to fetch stat candidates' });
  }
});

// Curate a digest — select which drama items to publish (protected)
router.put('/digest/:date/curate', requireApiKey, async (req, res) => {
  const { date } = req.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'Date must be YYYY-MM-DD' });
  }
  const { selectedIndices, selectedItems, selectedStats, itemOverrides, hiddenAvatars } = req.body;
  // Accept either selectedItems (new: per-section) or selectedIndices (legacy: drama-only)
  const items = selectedItems || selectedIndices;
  if (!items || (Array.isArray(items) && items.length === undefined) || (!Array.isArray(items) && typeof items !== 'object')) {
    return res.status(400).json({ error: 'selectedItems (object) or selectedIndices (array) is required' });
  }
  const draft = getDraftForDate(date);
  // Fall back to published digest if no draft exists (stats-only edit)
  const sourceText = draft?.draft || draft?.digest;
  if (!sourceText) {
    return res.status(404).json({ error: 'No draft or digest found for this date' });
  }
  const curated = curateDigest(sourceText, items, selectedStats || null, itemOverrides || null);
  updateDigestOnly(date, curated);
  if (hiddenAvatars && Array.isArray(hiddenAvatars)) {
    updateHiddenAvatars(date, JSON.stringify(hiddenAvatars));
  }
  res.json({ ok: true, date, digest: curated });
});

// Update quotes for a specific item in a digest section (protected)
router.put('/digest/:date/quotes', requireApiKey, (req, res) => {
  const { date } = req.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'Date must be YYYY-MM-DD' });
  }
  const { section, itemIndex, newQuotes } = req.body;
  if (!section || typeof itemIndex !== 'number' || !Array.isArray(newQuotes)) {
    return res.status(400).json({ error: 'section (string), itemIndex (number), newQuotes (string[]) required' });
  }

  const row = getDraftForDate(date);
  const text = row?.digest;
  if (!text) {
    return res.status(404).json({ error: 'No digest found for this date' });
  }

  // Parse sections, find the target, split items, replace quotes in the target item
  const sectionRe = new RegExp(`^(${section})\\s*:\\s*`, 'gm');
  const allKeysRe = /^(TOPICS|DRAMA|BANS|HIGHLIGHTS|RECAP|SPIKES|WINNER|LOSER|GRINDER|HOTSTREAK|COLDSTREAK|MENTIONS)\s*:\s*/gm;
  const matches = [...text.matchAll(allKeysRe)];
  const secMatch = matches.find(m => m[1] === section);
  if (!secMatch) {
    return res.status(404).json({ error: `Section ${section} not found` });
  }

  const secStart = secMatch.index + secMatch[0].length;
  const nextMatch = matches.find(m => m.index > secMatch.index);
  const secEnd = nextMatch ? nextMatch.index : text.length;
  const secContent = text.slice(secStart, secEnd).trim();

  const items = secContent.split(/;\s*/);
  if (itemIndex < 0 || itemIndex >= items.length) {
    return res.status(400).json({ error: `Item index ${itemIndex} out of range (0-${items.length - 1})` });
  }

  // Strip existing quotes from the item, keep the summary
  const oldItem = items[itemIndex];
  const summary = oldItem.replace(/"[^"]+"/g, '').replace(/\s{2,}/g, ' ').trim()
    .replace(/\s*[—:,]\s*$/, '').trim();

  // Rebuild item: summary + new quotes
  const quoteParts = newQuotes.map(q => `"${q}"`).join(' ');
  items[itemIndex] = `${summary} ${quoteParts}`;

  // Reconstruct digest text
  const updated = text.slice(0, secStart) + items.join('; ') + '\n' + text.slice(secEnd);
  updateDigestOnly(date, updated.trim());
  res.json({ ok: true, date, digest: updated.trim() });
});

// Match context for a digest date (public)
router.get('/digest/:date/matches', (req, res) => {
  const { date } = req.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'Date must be YYYY-MM-DD' });
  }
  const raw = getMatchContext(date);
  if (!raw) return res.json({ date, matchContext: null });
  try {
    res.json({ date, matchContext: JSON.parse(raw) });
  } catch {
    res.json({ date, matchContext: null });
  }
});

// Analyze a chat spike — returns suggested items per section (protected)
router.post('/digest/:date/analyze-spike', requireApiKey, async (req, res) => {
  const { date } = req.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'Date must be YYYY-MM-DD' });
  }
  const { from, to } = req.body;
  if (!from || !to || !/^\d{2}:\d{2}$/.test(from) || !/^\d{2}:\d{2}$/.test(to)) {
    return res.status(400).json({ error: 'from/to must be HH:MM format' });
  }
  try {
    const suggestions = await analyzeSpike(date, from, to);
    if (!suggestions) {
      return res.json({ date, from, to, suggestions: null });
    }
    res.json({ date, from, to, suggestions });
  } catch (err) {
    console.error('[Spike] Analysis error:', err.message);
    res.status(500).json({ error: 'Failed to analyze spike' });
  }
});

// Generate more items for a specific section (protected)
router.post('/digest/:date/more-items', requireApiKey, async (req, res) => {
  const { date } = req.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'Date must be YYYY-MM-DD' });
  }
  const { section, existingItems } = req.body;
  if (!section || !['DRAMA', 'HIGHLIGHTS', 'BANS'].includes(section)) {
    return res.status(400).json({ error: 'section must be DRAMA, HIGHLIGHTS, or BANS' });
  }
  try {
    const items = await generateMoreItems(date, section, existingItems || []);
    // Persist new items to the server-side draft
    if (items && items.length > 0) {
      const draft = getDraftForDate(date);
      if (draft?.draft) {
        const updatedDraft = appendItemsToDraft(draft.draft, section, items);
        updateDraftOnly(date, updatedDraft);
      }
    }
    res.json({ date, section, items: items || [] });
  } catch (err) {
    console.error('[MoreItems] Error:', err.message);
    res.status(500).json({ error: 'Failed to generate more items' });
  }
});

// Recent digests (public)
router.get('/digests', (_req, res) => {
  res.json(getRecentDigests(14));
});

// Player digest mentions (public) — find which digests mention a player
router.get('/digests/by-player/:tag', (req, res) => {
  const tag = decodeURIComponent(req.params.tag);
  const playerName = tag.split('#')[0].toLowerCase();
  if (!playerName || playerName.length < 2) {
    return res.json([]);
  }

  const SECTION_KEYS = ['TOPICS', 'DRAMA', 'BANS', 'HIGHLIGHTS', 'RECAP', 'SPIKES', 'WINNER', 'LOSER', 'GRINDER', 'HOTSTREAK', 'COLDSTREAK', 'MENTIONS'];
  const SECTION_RE = new RegExp(`^(${SECTION_KEYS.join('|')})\\s*:\\s*`, 'gm');

  const digests = getRecentDigests(30);
  const results = [];

  for (const row of digests) {
    if (!row.digest) continue;
    const text = row.digest;

    // Parse sections
    const matches = [...text.matchAll(SECTION_RE)];
    const matchingSections = [];

    for (let i = 0; i < matches.length; i++) {
      const m = matches[i];
      const key = m[1];
      if (key === 'MENTIONS') continue;
      const start = m.index + m[0].length;
      const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
      const content = text.slice(start, end).trim();
      if (!content) continue;

      // Check if player name appears in this section (case-insensitive word boundary)
      const escaped = playerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const nameRe = new RegExp(`\\b${escaped}\\b`, 'i');
      if (!nameRe.test(content)) continue;

      const snippet = content.length > 120 ? content.slice(0, 120) + '…' : content;
      matchingSections.push({ key, snippet });
    }

    if (matchingSections.length > 0) {
      results.push({ date: row.date, sections: matchingSections });
    }
    if (results.length >= 10) break;
  }

  res.json(results);
});

// Today's live digest (public, served from shared cache warmed by scheduler)
// Pass ?refresh=1 with API key to bust cache and regenerate
router.get('/stats/today', async (req, res) => {
  const forceRefresh = req.query.refresh === '1' && req.headers['x-api-key'] === config.ADMIN_API_KEY;
  const now = Date.now();
  if (!forceRefresh && todayDigestCache.data && todayDigestCache.expires > now) {
    return res.json(todayDigestCache.data);
  }
  try {
    const today = new Date().toISOString().slice(0, 10);
    const digest = await generateLiveDigest(today);
    const result = { date: today, digest };
    setTodayDigestCache(result);
    res.json(result);
  } catch (err) {
    console.error('[Stats] Error generating today digest:', err.message);
    res.status(500).json({ error: 'Failed to generate digest' });
  }
});

// Message volume timeline for a date (public)
router.get('/messages/timeline/:date', (req, res) => {
  const { date } = req.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'Date must be YYYY-MM-DD' });
  }
  const buckets = getMessageBuckets(date, 5);
  const games = getGameStats(date);
  res.json({ buckets, games });
});

// Analytics bundle (public) — top words + recent digests in one call
router.get('/analytics', (_req, res) => {
  res.json({
    topWords: getTopWords(7),
    digests: getRecentDigests(7),
  });
});

// Recent weekly digests (public)
router.get('/weekly-digests', (_req, res) => {
  res.json(getRecentWeeklyDigests(8));
});

// Single weekly digest — generates if missing (public)
router.get('/weekly-digest/:weekStart', async (req, res) => {
  const { weekStart } = req.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return res.status(400).json({ error: 'weekStart must be YYYY-MM-DD (a Monday)' });
  }
  try {
    const digest = await generateWeeklyDigest(weekStart);
    if (!digest) {
      return res.json({ weekStart, digest: null, reason: 'Not enough daily digests (need 3+) or not a Monday' });
    }
    res.json({ weekStart, digest });
  } catch (err) {
    console.error('[Weekly] Error:', err.message);
    res.status(500).json({ error: 'Failed to generate weekly digest' });
  }
});

// Delete a cached weekly digest (admin, for regeneration)
router.delete('/weekly-digest/:weekStart', requireApiKey, (req, res) => {
  const { weekStart } = req.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return res.status(400).json({ error: 'weekStart must be YYYY-MM-DD' });
  }
  deleteWeeklyDigest(weekStart);
  res.json({ ok: true, message: `Weekly digest for ${weekStart} cleared` });
});

// Chat context — surrounding messages for drama items or time windows (public)
// Mode 1 (drama): ?date=...&players=Tag1,Tag2&quotes=["q1","q2"]
//   Uses quotes to find the exact conversation, falls back to player activity window
// Mode 2 (spikes): ?date=...&from=HH:MM&to=HH:MM
//   All messages in that time window
router.get('/messages/context', (req, res) => {
  const { date, players, from, to, limit, mode } = req.query;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'date (YYYY-MM-DD) is required' });
  }
  const maxLimit = Math.min(parseInt(limit) || 100, 200);

  // Time window mode (for spikes)
  if (from && to) {
    if (!/^\d{2}:\d{2}$/.test(from) || !/^\d{2}:\d{2}$/.test(to)) {
      return res.status(400).json({ error: 'from/to must be HH:MM format' });
    }
    const messages = getMessagesByTimeWindow(date, from, to, maxLimit);
    return res.json(messages);
  }

  if (!players) {
    return res.status(400).json({ error: 'players or from/to time range is required' });
  }
  const battleTags = players.split(',').map(t => t.trim()).filter(Boolean);
  if (battleTags.length === 0) {
    return res.status(400).json({ error: 'At least one player required' });
  }

  // Player-only mode (for stat lines — just their messages, no surrounding context)
  if (mode === 'player') {
    const messages = getMessagesByDateAndUsers(date, battleTags, maxLimit);
    return res.json(messages);
  }

  // Quote-based context mode (for drama/highlights/bans)
  let quotes = [];
  if (req.query.quotes) {
    try {
      quotes = JSON.parse(req.query.quotes);
      if (!Array.isArray(quotes)) quotes = [];
    } catch { quotes = []; }
  }

  const messages = getContextAroundQuotes(date, quotes, battleTags, 3, maxLimit);
  res.json(messages);
});

// Image proxy for cross-origin avatar screenshots (public)
const ALLOWED_IMAGE_HOSTS = ['w3champions.wc3.tools', 'w3champions.com'];
router.get('/image-proxy', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).send('Missing url');
  try {
    const parsed = new URL(url);
    if (!ALLOWED_IMAGE_HOSTS.some(h => parsed.hostname === h || parsed.hostname.endsWith('.' + h))) {
      return res.status(403).send('Host not allowed');
    }
    const resp = await fetch(url);
    if (!resp.ok) return res.status(resp.status).send('Upstream error');
    const contentType = resp.headers.get('content-type') || 'image/jpeg';
    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=86400');
    res.set('Access-Control-Allow-Origin', '*');
    const buffer = Buffer.from(await resp.arrayBuffer());
    res.send(buffer);
  } catch {
    res.status(502).send('Failed to fetch image');
  }
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
