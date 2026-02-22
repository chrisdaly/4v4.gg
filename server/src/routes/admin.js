import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import config from '../config.js';
import { setToken, getStats, getTopWords, getRecentDigests, deleteDigest, getDigest, getRecentWeeklyDigests, deleteWeeklyDigest, getWeeklyDigest, getWeeklyCoverImage, setWeeklyCoverImage, getDraftForDate, updateDigestOnly, updateDraftOnly, updateHiddenAvatars, getContextAroundQuotes, getMessagesByTimeWindow, getMessagesByDateAndUsers, getMessageBuckets, getGameStats, getMatchContext, getClipsByDateRange, saveCoverGeneration, getCoverGenerations, getCoverGenerationImage, deleteCoverGeneration, getWeeklyDraftForWeek, updateWeeklyDraftOnly, updateWeeklyDigestOnly, createGenJob, getActiveGenJob, getLatestGenJob, getVariantsForJob, searchMessages, searchMessagesByPlayer, getMessagesAroundTime, countMessagesByDateRange, updateWeeklyDigestJson, getDigestsByDateRange, saveStyleThumbnail, getStyleThumbnail } from '../db.js';
import { updateToken, getStatus } from '../signalr.js';
import { getClientCount } from '../sse.js';
import { setBotEnabled, isBotEnabled, testCommand } from '../bot.js';
import { generateDigest, fetchDailyStats, generateLiveDigest, todayDigestCache, setTodayDigestCache, generateWeeklyDigest, curateDigest, fetchDailyStatCandidates, analyzeSpike, generateMoreItems, appendItemsToDraft, backfillDailyStats, backfillMatchScores, backfillMatchMmrs, generateWeeklyVariants, regenerateSection, regenerateSpotlights, regeneratePlayerQuotes, regenerateMatchStatBlurbs, getPlayerMessageCandidates, computeNewBlood, formatNewBloodLine, digestToJSON } from '../digest.js';
import { generateCoverImage, buildImagePrompt, extractHeadline, buildImagePromptWithPlayers, generateImageFromPrompt, WC3_STYLE_SUFFIX, suggestScenes } from '../coverImage.js';
import { runFeedbackScan, getRecentFeedback } from '../feedback.js';

const router = Router();

// Rate limiters — three tiers based on cost
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many AI requests, try again in a minute' },
});

const contextLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many context requests, try again in a minute' },
});

const imageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many image generation requests, try again in a minute' },
});

const publicLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, try again in a minute' },
});

function requireApiKey(req, res, next) {
  const key = req.headers['x-api-key'];
  if (!config.ADMIN_API_KEY || key !== config.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Invalid or missing API key' });
  }
  next();
}

// Verify API key is valid (used by frontend to show key status)
router.get('/verify', requireApiKey, (_req, res) => {
  res.json({ valid: true });
});

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

// Test a bot command — runs it and broadcasts via SSE, never sends to chat
router.post('/bot/test', requireApiKey, async (req, res) => {
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
router.get('/top-words', publicLimiter, (req, res) => {
  const days = Math.min(parseInt(req.query.days) || 7, 30);
  res.json(getTopWords(days));
});

// Daily digest — returns cached only (public)
router.get('/digest/:date', publicLimiter, (req, res) => {
  const { date } = req.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'Date must be YYYY-MM-DD' });
  }
  const existing = getDigest(date);
  if (!existing) {
    return res.json({ date, digest: null, reason: 'No cached digest for this date' });
  }
  const result = { date, digest: existing.digest };
  if (existing.clips) {
    try { result.clips = JSON.parse(existing.clips); } catch { /* ignore */ }
  }
  res.json(result);
});

// Generate a digest (admin, triggers AI) — generates if missing, returns result
router.post('/digest/:date/generate', requireApiKey, aiLimiter, async (req, res) => {
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
  } catch (err) {
    console.warn('[Admin] Failed to parse match context:', err.message);
    res.json({ date, matchContext: null });
  }
});

// Analyze a chat spike — returns suggested items per section (protected)
router.post('/digest/:date/analyze-spike', requireApiKey, aiLimiter, async (req, res) => {
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
router.post('/digest/:date/more-items', requireApiKey, aiLimiter, async (req, res) => {
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

// Recent digests (public) — parse clips JSON
router.get('/digests', publicLimiter, (_req, res) => {
  const digests = getRecentDigests(14).map(d => {
    const result = { ...d };
    if (d.clips) {
      try { result.clips = JSON.parse(d.clips); } catch { result.clips = null; }
    }
    return result;
  });
  res.json(digests);
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

// Today's live digest (public read from cache, admin-only generation)
// Cache is warmed by scheduler. Pass ?refresh=1 with API key to bust cache.
// Public requests get cached data only — never trigger Claude.
router.get('/stats/today', aiLimiter, async (req, res) => {
  const isAdmin = req.headers['x-api-key'] === config.ADMIN_API_KEY;
  const forceRefresh = req.query.refresh === '1' && isAdmin;
  const now = Date.now();
  if (!forceRefresh && todayDigestCache.data && todayDigestCache.expires > now) {
    return res.json(todayDigestCache.data);
  }
  // Public requests: return stale cache or empty — never trigger AI generation
  if (!isAdmin) {
    if (todayDigestCache.data) return res.json(todayDigestCache.data);
    return res.json({ date: new Date().toISOString().slice(0, 10), digest: null });
  }
  try {
    const today = new Date().toISOString().slice(0, 10);
    const digest = await generateLiveDigest(today);
    const result = { date: today, digest };
    // Include today's clips
    try {
      const clips = getClipsByDateRange(today, today)
        .filter(c => c.is_4v4 === 1)
        .slice(0, 3)
        .map(c => ({
          clip_id: c.clip_id, title: c.title, url: c.url,
          thumbnail_url: c.thumbnail_url, twitch_login: c.twitch_login,
          view_count: c.view_count, duration: c.duration, match_id: c.match_id,
        }));
      if (clips.length > 0) result.clips = clips;
    } catch { /* clips are optional */ }
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
router.get('/analytics', publicLimiter, (_req, res) => {
  res.json({
    topWords: getTopWords(7),
    digests: getRecentDigests(7),
  });
});

// Recent weekly digests (public) — parse clips + stats + digest_json, backfill message count
router.get('/weekly-digests', publicLimiter, (_req, res) => {
  const weeklies = getRecentWeeklyDigests(8).map(w => {
    const result = { ...w };
    if (w.clips) {
      try { result.clips = JSON.parse(w.clips); } catch { result.clips = null; }
    }
    if (w.stats) {
      try { result.stats = JSON.parse(w.stats); } catch { result.stats = null; }
    }
    if (w.digest_json) {
      try { result.digestJson = JSON.parse(w.digest_json); } catch { result.digestJson = null; }
    }
    delete result.digest_json;
    // Backfill totalMessages if missing from stored stats
    if (!result.stats?.totalMessages && w.week_start && w.week_end) {
      const count = countMessagesByDateRange(w.week_start, w.week_end);
      if (count > 0) {
        result.stats = { ...(result.stats || {}), totalMessages: count };
      }
    }
    return result;
  });
  res.json(weeklies);
});

// Single weekly digest — generates if missing (public)
// Pass ?format=json to get the structured JSON version
router.get('/weekly-digest/:weekStart', aiLimiter, async (req, res) => {
  const { weekStart } = req.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return res.status(400).json({ error: 'weekStart must be YYYY-MM-DD (a Monday)' });
  }

  // If format=json requested, return stored digest_json (no generation)
  if (req.query.format === 'json') {
    const existing = getWeeklyDigest(weekStart);
    if (!existing) {
      return res.json({ weekStart, digestJson: null, reason: 'No weekly digest found' });
    }
    if (existing.digest_json) {
      try {
        return res.json({ weekStart, digestJson: JSON.parse(existing.digest_json) });
      } catch {
        return res.json({ weekStart, digestJson: null, reason: 'Failed to parse stored JSON' });
      }
    }
    return res.json({ weekStart, digestJson: null, reason: 'No JSON version available (run backfill)' });
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
  // Safety: check if there's a draft with editorial work before deleting
  const existing = getWeeklyDraftForWeek(weekStart);
  if (existing?.draft && existing.draft !== existing.digest && !req.query.force) {
    return res.status(409).json({
      error: 'This weekly has an editorial draft with unsaved changes. Add ?force=true to delete anyway.',
      hasDraft: true,
    });
  }
  deleteWeeklyDigest(weekStart);
  res.json({ ok: true, message: `Weekly digest for ${weekStart} cleared` });
});

// Get weekly draft for editorial mode (protected)
router.get('/weekly-digest/:weekStart/draft', requireApiKey, (req, res) => {
  const { weekStart } = req.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return res.status(400).json({ error: 'weekStart must be YYYY-MM-DD' });
  }
  const result = getWeeklyDraftForWeek(weekStart);
  if (!result) {
    return res.json({ weekStart, draft: null, digest: null });
  }
  res.json(result);
});

// Save weekly draft text (protected)
router.put('/weekly-digest/:weekStart/draft', requireApiKey, (req, res) => {
  const { weekStart } = req.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return res.status(400).json({ error: 'weekStart must be YYYY-MM-DD' });
  }
  const { draft } = req.body;
  if (!draft || typeof draft !== 'string') {
    return res.status(400).json({ error: 'draft (string) is required' });
  }
  updateWeeklyDraftOnly(weekStart, draft);
  res.json({ ok: true, weekStart });
});

// Curate weekly digest — apply item selections + overrides → publish (protected)
router.put('/weekly-digest/:weekStart/curate', requireApiKey, (req, res) => {
  const { weekStart } = req.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return res.status(400).json({ error: 'weekStart must be YYYY-MM-DD' });
  }
  const { selectedItems, selectedStats, itemOverrides, hiddenSections } = req.body;
  const items = selectedItems || {};
  if (typeof items !== 'object') {
    return res.status(400).json({ error: 'selectedItems (object) is required' });
  }
  const draft = getWeeklyDraftForWeek(weekStart);
  const sourceText = draft?.draft || draft?.digest;
  if (!sourceText) {
    return res.status(404).json({ error: 'No draft or digest found for this week' });
  }
  let curated = curateDigest(sourceText, items, selectedStats || null, itemOverrides || null);
  // Remove hidden sections entirely
  if (hiddenSections && Array.isArray(hiddenSections) && hiddenSections.length > 0) {
    const hiddenSet = new Set(hiddenSections);
    const lines = curated.split('\n');
    const sectionKeyRe = /^([A-Z_]+)\s*:\s*/;
    const filtered = lines.filter(line => {
      const m = line.match(sectionKeyRe);
      return !m || !hiddenSet.has(m[1]);
    });
    curated = filtered.join('\n').trim();
  }
  updateWeeklyDigestOnly(weekStart, curated);
  res.json({ ok: true, weekStart, digest: curated });
});

// Regenerate a single narrative section of a weekly digest (admin, AI)
router.post('/weekly-digest/:weekStart/regen-section', requireApiKey, aiLimiter, async (req, res) => {
  const { weekStart } = req.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return res.status(400).json({ error: 'weekStart must be YYYY-MM-DD' });
  }
  const { section } = req.body;
  if (!section) {
    return res.status(400).json({ error: 'Missing section key' });
  }
  try {
    const content = await regenerateSection(weekStart, section);
    res.json({ ok: true, section, content });
  } catch (err) {
    console.error(`[Regen] ${section} error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// Regenerate spotlight blurbs + chat quotes for all stat-card players (admin)
router.post('/weekly-digest/:weekStart/regen-spotlights', requireApiKey, aiLimiter, async (req, res) => {
  const { weekStart } = req.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return res.status(400).json({ error: 'weekStart must be YYYY-MM-DD' });
  }
  try {
    const blurbs = await regenerateSpotlights(weekStart);
    res.json({ ok: true, blurbs });
  } catch (err) {
    console.error('[Regen] Spotlights error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Regenerate match stat blurbs + quotes (Hero Slayer, Unit Killer, etc.)
router.post('/weekly-digest/:weekStart/regen-match-stats', requireApiKey, aiLimiter, (req, res) => {
  const { weekStart } = req.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return res.status(400).json({ error: 'weekStart must be YYYY-MM-DD' });
  }
  try {
    const blurbs = regenerateMatchStatBlurbs(weekStart);
    res.json({ ok: true, blurbs });
  } catch (err) {
    console.error('[Regen] Match stats error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Regenerate quotes for a single spotlight player (admin)
router.post('/weekly-digest/:weekStart/regen-quotes', requireApiKey, aiLimiter, (req, res) => {
  const { weekStart } = req.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return res.status(400).json({ error: 'weekStart must be YYYY-MM-DD' });
  }
  const { statKey, battleTag } = req.body;
  if (!statKey || !battleTag) {
    return res.status(400).json({ error: 'Missing statKey or battleTag' });
  }
  try {
    const result = regeneratePlayerQuotes(weekStart, statKey, battleTag);
    res.json({ ok: true, quotes: result });
  } catch (err) {
    console.error('[Regen] Quotes error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Recompute NEW_BLOOD data and splice into existing draft (admin, no AI needed)
router.post('/weekly-digest/:weekStart/regen-newblood', requireApiKey, async (req, res) => {
  const { weekStart } = req.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return res.status(400).json({ error: 'weekStart must be YYYY-MM-DD' });
  }
  try {
    const weekly = getWeeklyDigest(weekStart);
    if (!weekly) {
      return res.status(404).json({ error: 'Weekly digest not found' });
    }
    const weekEnd = new Date(new Date(weekStart + 'T12:00:00Z').getTime() + 6 * 86400000)
      .toISOString().split('T')[0];

    const newBlood = await computeNewBlood(weekStart, weekEnd);
    const newLine = formatNewBloodLine(newBlood);

    // Splice into both digest and draft (if it exists)
    function spliceNewBlood(text) {
      const lines = text.split('\n');
      const idx = lines.findIndex(l => l.startsWith('NEW_BLOOD:'));
      if (newLine) {
        if (idx >= 0) lines[idx] = newLine;
        else lines.push(newLine);
      } else if (idx >= 0) {
        lines.splice(idx, 1);
      }
      return lines.join('\n');
    }

    updateWeeklyDigestOnly(weekStart, spliceNewBlood(weekly.digest));
    if (weekly.draft) {
      updateWeeklyDraftOnly(weekStart, spliceNewBlood(weekly.draft));
    }

    res.json({ ok: true, newBlood, line: newLine });
  } catch (err) {
    console.error('[Regen] NewBlood error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Browse all scored message candidates for a spotlight player (admin)
router.get('/weekly-digest/:weekStart/player-messages', requireApiKey, (req, res) => {
  const { weekStart } = req.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return res.status(400).json({ error: 'weekStart must be YYYY-MM-DD' });
  }
  const { statKey, battleTag } = req.query;
  if (!statKey || !battleTag) {
    return res.status(400).json({ error: 'Missing statKey or battleTag query params' });
  }
  try {
    const candidates = getPlayerMessageCandidates(weekStart, statKey, battleTag);
    res.json({ ok: true, messages: candidates });
  } catch (err) {
    console.error('[Browse] Messages error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Variant Generation Endpoints ──────────────────────

// Start variant generation (admin, fire-and-forget)
router.post('/weekly-digest/:weekStart/generate-variants', requireApiKey, (req, res) => {
  const { weekStart } = req.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return res.status(400).json({ error: 'weekStart must be YYYY-MM-DD' });
  }
  // Require base digest to exist
  const weekly = getWeeklyDigest(weekStart);
  if (!weekly) {
    return res.status(404).json({ error: 'Weekly digest must exist before generating variants' });
  }
  // Dedup: return existing active job
  const active = getActiveGenJob(weekStart);
  if (active) {
    return res.json({ ok: true, jobId: active.id, existing: true });
  }
  const jobId = createGenJob(weekStart, 3);
  // Fire and forget — don't await
  generateWeeklyVariants(weekStart, jobId).catch(err => {
    console.error(`[Variants] Unhandled error for job ${jobId}:`, err.message);
  });
  res.json({ ok: true, jobId });
});

// Poll variant generation status (admin)
router.get('/weekly-digest/:weekStart/gen-status', requireApiKey, (req, res) => {
  const { weekStart } = req.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return res.status(400).json({ error: 'weekStart must be YYYY-MM-DD' });
  }
  const job = getLatestGenJob(weekStart);
  if (!job) {
    return res.json({ status: null });
  }
  res.json({
    jobId: job.id,
    status: job.status,
    total: job.total,
    completed: job.completed,
    error: job.error,
    createdAt: job.created_at,
  });
});

// Get parsed variants from latest completed job (admin)
router.get('/weekly-digest/:weekStart/variants', requireApiKey, (req, res) => {
  const { weekStart } = req.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return res.status(400).json({ error: 'weekStart must be YYYY-MM-DD' });
  }
  const job = getLatestGenJob(weekStart);
  if (!job || job.status !== 'done') {
    return res.json({ jobId: job?.id || null, variants: [] });
  }
  const rows = getVariantsForJob(job.id);
  // Parse each variant's narrative into sections
  const NARRATIVE_KEYS = new Set(['TOPICS', 'DRAMA', 'BANS', 'HIGHLIGHTS', 'RECAP']);
  const SECTION_RE = /^([A-Z_]+)\s*:\s*/gm;
  const variants = rows.map(r => {
    const sections = {};
    const matches = [...r.narrative.matchAll(SECTION_RE)];
    for (let i = 0; i < matches.length; i++) {
      const m = matches[i];
      const key = m[1];
      if (!NARRATIVE_KEYS.has(key)) continue;
      const start = m.index + m[0].length;
      const end = i + 1 < matches.length ? matches[i + 1].index : r.narrative.length;
      sections[key] = r.narrative.slice(start, end).trim();
    }
    return { idx: r.variant_idx, sections };
  });
  res.json({ jobId: job.id, variants });
});

// Apply variant picks — mix-and-match sections from different variants (admin)
router.put('/weekly-digest/:weekStart/apply-variants', requireApiKey, (req, res) => {
  const { weekStart } = req.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return res.status(400).json({ error: 'weekStart must be YYYY-MM-DD' });
  }
  const { picks, jobId } = req.body;
  if (!picks || typeof picks !== 'object' || !jobId) {
    return res.status(400).json({ error: 'picks (object) and jobId (number) are required' });
  }
  // Get the existing digest for deterministic sections
  const weekly = getWeeklyDigest(weekStart);
  if (!weekly) {
    return res.status(404).json({ error: 'Weekly digest not found' });
  }
  // Get variants
  const rows = getVariantsForJob(jobId);
  if (rows.length === 0) {
    return res.status(404).json({ error: 'No variants found for this job' });
  }
  // Parse variant narratives into sections
  const NARRATIVE_KEYS = new Set(['TOPICS', 'DRAMA', 'BANS', 'HIGHLIGHTS', 'RECAP']);
  const SECTION_RE = /^([A-Z_]+)\s*:\s*/gm;
  const variantSections = {};
  for (const r of rows) {
    const sections = {};
    const matches = [...r.narrative.matchAll(SECTION_RE)];
    for (let i = 0; i < matches.length; i++) {
      const m = matches[i];
      const key = m[1];
      if (!NARRATIVE_KEYS.has(key)) continue;
      const start = m.index + m[0].length;
      const end = i + 1 < matches.length ? matches[i + 1].index : r.narrative.length;
      sections[key] = r.narrative.slice(start, end).trim();
    }
    variantSections[r.variant_idx] = sections;
  }
  // Parse existing digest into sections
  const existingText = weekly.draft || weekly.digest;
  const existingSections = [];
  const existingMatches = [...existingText.matchAll(/^([A-Z_]+)\s*:\s*/gm)];
  for (let i = 0; i < existingMatches.length; i++) {
    const m = existingMatches[i];
    const start = m.index + m[0].length;
    const end = i + 1 < existingMatches.length ? existingMatches[i + 1].index : existingText.length;
    existingSections.push({ key: m[1], content: existingText.slice(start, end).trim() });
  }
  // Replace narrative sections with picked variants
  for (const [key, variantIdx] of Object.entries(picks)) {
    if (!NARRATIVE_KEYS.has(key)) continue;
    const pickedContent = variantSections[variantIdx]?.[key];
    if (!pickedContent) continue;
    const existing = existingSections.find(s => s.key === key);
    if (existing) {
      existing.content = pickedContent;
    } else {
      // Insert narrative section at the appropriate position
      existingSections.unshift({ key, content: pickedContent });
    }
  }
  // Reassemble and save as draft
  const newDraft = existingSections.map(s => `${s.key}: ${s.content}`).join('\n');
  updateWeeklyDraftOnly(weekStart, newDraft);
  res.json({ ok: true, draft: newDraft });
});

// Serve weekly digest cover image (public)
router.get('/weekly-digest/:weekStart/cover.jpg', (req, res) => {
  const { weekStart } = req.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return res.status(400).send('Invalid date');
  }
  const imageBuffer = getWeeklyCoverImage(weekStart);
  if (!imageBuffer) {
    return res.status(404).send('No cover image');
  }
  res.set('Content-Type', 'image/png');
  res.set('Cache-Control', 'public, max-age=604800');
  res.send(imageBuffer);
});

// Generate cover image for a weekly digest (admin)
router.post('/weekly-digest/:weekStart/cover', requireApiKey, imageLimiter, async (req, res) => {
  const { weekStart } = req.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return res.status(400).json({ error: 'weekStart must be YYYY-MM-DD' });
  }
  const weekly = getWeeklyDigest(weekStart);
  if (!weekly) {
    return res.status(404).json({ error: 'Weekly digest not found' });
  }
  try {
    console.log(`[CoverImage] Generating cover for ${weekStart}...`);
    const imageBuffer = await generateCoverImage(weekly.digest);
    setWeeklyCoverImage(weekStart, imageBuffer);
    console.log(`[CoverImage] Saved cover for ${weekStart} (${imageBuffer.length} bytes)`);
    res.json({ ok: true, size: imageBuffer.length });
  } catch (err) {
    console.error('[CoverImage] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Extract headline + key players from digest (admin)
router.post('/weekly-digest/:weekStart/headline', requireApiKey, aiLimiter, async (req, res) => {
  const { weekStart } = req.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return res.status(400).json({ error: 'weekStart must be YYYY-MM-DD' });
  }
  const weekly = getWeeklyDigest(weekStart);
  if (!weekly) {
    return res.status(404).json({ error: 'Weekly digest not found' });
  }
  try {
    const digestText = req.body?.digest || weekly.digest;
    const result = await extractHeadline(digestText);
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error('[CoverImage] Headline error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Suggest visual scene ideas from daily digests (for cover art inspiration)
router.post('/weekly-digest/:weekStart/suggest-scenes', requireApiKey, aiLimiter, async (req, res) => {
  const { weekStart } = req.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return res.status(400).json({ error: 'weekStart must be YYYY-MM-DD' });
  }
  // Compute week end (weekStart + 6 days), cap at today
  const start = new Date(weekStart + 'T12:00:00Z');
  const weekEnd = new Date(start.getTime() + 6 * 86400000).toISOString().split('T')[0];
  const today = new Date().toISOString().split('T')[0];
  const endDate = weekEnd < today ? weekEnd : today;

  // Use weekly digest if available, otherwise combine dailies
  const weekly = getWeeklyDigest(weekStart);
  let combined;
  let dailyCount = 0;
  if (weekly?.digest) {
    combined = weekly.digest;
  } else {
    const dailies = getDigestsByDateRange(weekStart, endDate);
    if (dailies.length === 0) {
      return res.json({ scenes: [], reason: 'No digests found for this date range' });
    }
    dailyCount = dailies.length;
    combined = dailies.map(d => d.digest).filter(Boolean).join('\n\n');
  }
  if (!combined) {
    return res.json({ scenes: [], reason: 'No digest content' });
  }
  try {
    const result = await suggestScenes(combined);
    res.json({ ok: true, scenes: result.scenes || [], dailyCount, dateRange: `${weekStart} to ${endDate}` });
  } catch (err) {
    console.error('[CoverImage] Suggest scenes error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Generate prompt only (admin) — returns Claude's visual prompt without generating image
// Accepts optional headline + playerContext for enhanced prompts
// Auto-enriches players with recent digest mentions for character depth
router.post('/weekly-digest/:weekStart/prompt', requireApiKey, aiLimiter, async (req, res) => {
  const { weekStart } = req.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return res.status(400).json({ error: 'weekStart must be YYYY-MM-DD' });
  }
  const weekly = getWeeklyDigest(weekStart);
  if (!weekly) {
    return res.status(404).json({ error: 'Weekly digest not found' });
  }
  try {
    const digestText = req.body?.digest || weekly.digest;
    const { headline, playerContext } = req.body || {};
    let prompt;
    if (headline && playerContext?.length > 0) {
      // Enrich players with recent digest mentions
      const enriched = playerContext.map(p => {
        const enrichedPlayer = { ...p };
        if (p.name && !p.digestMentions) {
          const mentions = getPlayerDigestMentions(p.name);
          if (mentions) enrichedPlayer.digestMentions = mentions;
        }
        return enrichedPlayer;
      });
      prompt = await buildImagePromptWithPlayers(digestText, headline, enriched);
    } else {
      prompt = await buildImagePrompt(digestText);
    }
    res.json({ ok: true, prompt, styleSuffix: WC3_STYLE_SUFFIX });
  } catch (err) {
    console.error('[CoverImage] Prompt error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Generate image from a prompt string — downloads, stores in DB, returns local URL
router.post('/generate-image', requireApiKey, imageLimiter, async (req, res) => {
  const { prompt, weekStart, headline, scene, style } = req.body || {};
  if (!prompt) {
    return res.status(400).json({ error: 'prompt is required' });
  }
  try {
    const replicateUrl = await generateImageFromPrompt(prompt);
    // Download the image from Replicate
    const imgRes = await fetch(replicateUrl);
    if (!imgRes.ok) throw new Error(`Failed to download image (${imgRes.status})`);
    const imageBuffer = Buffer.from(await imgRes.arrayBuffer());
    // Save to DB
    const id = saveCoverGeneration(weekStart || null, headline || null, scene || null, style || null, prompt, imageBuffer);
    console.log(`[CoverImage] Saved generation #${id} (${imageBuffer.length} bytes)`);
    res.json({ ok: true, id, imageUrl: `/api/admin/cover-generation/${id}/image` });
  } catch (err) {
    console.error('[CoverImage] Generate image error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// List saved cover generations for a week (or all)
router.get('/cover-generations', requireApiKey, (req, res) => {
  const { weekStart } = req.query;
  const generations = weekStart ? getCoverGenerations(weekStart) : getCoverGenerations(req.query.weekStart);
  res.json(generations || []);
});

router.get('/cover-generations/:weekStart', requireApiKey, (req, res) => {
  const generations = getCoverGenerations(req.params.weekStart);
  res.json(generations || []);
});

// Serve a saved cover generation image (public — no API key needed for <img> tags)
router.get('/cover-generation/:id/image', (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).send('Invalid ID');
  const imageBuffer = getCoverGenerationImage(id);
  if (!imageBuffer) return res.status(404).send('Not found');
  res.set('Content-Type', 'image/png');
  res.set('Cache-Control', 'public, max-age=604800');
  res.send(imageBuffer);
});

// Set a saved generation as the official weekly cover
router.post('/weekly-digest/:weekStart/cover-from-generation', requireApiKey, (req, res) => {
  const { weekStart } = req.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return res.status(400).json({ error: 'weekStart must be YYYY-MM-DD' });
  }
  const { generationId } = req.body;
  if (!generationId) {
    return res.status(400).json({ error: 'generationId is required' });
  }
  const imageBuffer = getCoverGenerationImage(generationId);
  if (!imageBuffer) {
    return res.status(404).json({ error: 'Generation not found' });
  }
  setWeeklyCoverImage(weekStart, imageBuffer);
  console.log(`[CoverImage] Set generation #${generationId} as cover for ${weekStart}`);
  res.json({ ok: true });
});

// Delete a saved cover generation
router.delete('/cover-generation/:id', requireApiKey, (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
  deleteCoverGeneration(id);
  res.json({ ok: true });
});

// Helper: scan recent digests for mentions of a player name
function getPlayerDigestMentions(playerName) {
  const SECTION_KEYS = ['DRAMA', 'HIGHLIGHTS', 'BANS', 'WINNER', 'LOSER', 'GRINDER'];
  const SECTION_RE = new RegExp(`^(${SECTION_KEYS.join('|')})\\s*:\\s*`, 'gm');
  const escaped = playerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const nameRe = new RegExp(`\\b${escaped}\\b`, 'i');

  const digests = getRecentDigests(14);
  const snippets = [];

  for (const row of digests) {
    if (!row.digest) continue;
    const text = row.digest;
    const matches = [...text.matchAll(SECTION_RE)];

    for (let i = 0; i < matches.length; i++) {
      const m = matches[i];
      const start = m.index + m[0].length;
      const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
      const content = text.slice(start, end).trim();
      if (!nameRe.test(content)) continue;

      const snippet = content.length > 100 ? content.slice(0, 100) + '…' : content;
      snippets.push(`[${m[1]}] ${snippet}`);
    }
    if (snippets.length >= 4) break;
  }

  return snippets.length > 0 ? snippets.slice(0, 4).join('; ') : null;
}

// Backfill daily player stats for a date range (fetches from W3C API)
router.post('/backfill-stats', requireApiKey, async (req, res) => {
  const { startDate, endDate } = req.body;
  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'startDate and endDate required (YYYY-MM-DD)' });
  }
  try {
    const results = await backfillDailyStats(startDate, endDate);
    res.json({ ok: true, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Backfill match detail scores for a date range (fetches from W3C API)
router.post('/backfill-scores', requireApiKey, async (req, res) => {
  const { startDate, endDate } = req.body;
  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'startDate and endDate required (YYYY-MM-DD)' });
  }
  try {
    const results = await backfillMatchScores(startDate, endDate);
    res.json({ ok: true, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Backfill individual player MMRs for daily_matches missing them
router.post('/backfill-mmrs', requireApiKey, async (req, res) => {
  const { startDate, endDate } = req.body;
  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'startDate and endDate required (YYYY-MM-DD)' });
  }
  try {
    const results = await backfillMatchMmrs(startDate, endDate);
    res.json({ ok: true, ...results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Backfill digest_json for all weekly digests missing it (admin)
router.post('/backfill-digest-json', requireApiKey, (req, res) => {
  const weeklies = getRecentWeeklyDigests(100);
  let converted = 0;
  let failed = 0;
  const errors = [];

  for (const w of weeklies) {
    if (w.digest_json) continue; // already has JSON
    if (!w.digest) continue;     // no flat text to convert

    try {
      let stats = null;
      if (w.stats) {
        try { stats = JSON.parse(w.stats); } catch { /* ignore */ }
      }
      let clips = [];
      if (w.clips) {
        try { clips = JSON.parse(w.clips); } catch { /* ignore */ }
      }

      const jsonObj = digestToJSON(w.digest, {
        weekStart: w.week_start,
        weekEnd: w.week_end,
        stats,
        clips,
      });
      updateWeeklyDigestJson(w.week_start, JSON.stringify(jsonObj));
      converted++;
    } catch (err) {
      failed++;
      errors.push({ weekStart: w.week_start, error: err.message });
    }
  }

  res.json({ ok: true, converted, failed, errors: errors.slice(0, 10) });
});

// Chat context — surrounding messages for drama items or time windows (public)
// Mode 1 (drama): ?date=...&players=Tag1,Tag2&quotes=["q1","q2"]
//   Uses quotes to find the exact conversation, falls back to player activity window
// Mode 2 (spikes): ?date=...&from=HH:MM&to=HH:MM
//   All messages in that time window
router.get('/messages/context', contextLimiter, (req, res) => {
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
    } catch (err) { console.warn('[Admin] Failed to parse quotes param:', err.message); quotes = []; }
  }

  const messages = getContextAroundQuotes(date, quotes, battleTags, 3, maxLimit);
  res.json(messages);
});

// ── Full-text message search ──────────────────────────
router.get('/messages/search', contextLimiter, (req, res) => {
  const { q, player, limit = 50, offset = 0 } = req.query;
  const lim = Math.min(Number(limit), 200);
  const off = Number(offset);

  if (!q && !player) return res.status(400).json({ error: 'Query (q) or player param is required' });
  if (q && q.length < 2) return res.status(400).json({ error: 'Query must be at least 2 characters' });
  if (player && player.length < 2) return res.status(400).json({ error: 'Player query must be at least 2 characters' });

  let results;
  if (player && q) {
    // Combined: messages by player matching text
    const playerResults = searchMessagesByPlayer(player, 500, 0);
    const lower = q.toLowerCase();
    results = playerResults.filter(r => r.message.toLowerCase().includes(lower)).slice(off, off + lim);
  } else if (player) {
    results = searchMessagesByPlayer(player, lim, off);
  } else {
    results = searchMessages(q, lim, off);
  }

  res.json({ query: q || null, player: player || null, count: results.length, results });
});

router.get('/messages/search/context', contextLimiter, (req, res) => {
  const { received_at, padding = 3 } = req.query;
  if (!received_at) return res.status(400).json({ error: 'received_at is required' });
  const messages = getMessagesAroundTime(received_at, Number(padding), 60);
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
  } catch (err) {
    console.warn('[Admin] Image proxy failed:', err.message);
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

// ── Feedback scan ────────────────────────────────────

router.post('/feedback/scan', requireApiKey, aiLimiter, async (req, res) => {
  try {
    const result = await runFeedbackScan();
    res.json(result);
  } catch (err) {
    console.error('[Admin] Feedback scan error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/feedback/recent', requireApiKey, (req, res) => {
  const limit = parseInt(req.query.limit || '20', 10);
  const issues = getRecentFeedback(limit);
  res.json(issues);
});

// ── Image Upload ──────────────────────────────────────

const imageUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Upload an image file or fetch from URL, save to cover_generations gallery
router.post('/upload-image', requireApiKey, imageUpload.single('image'), async (req, res) => {
  try {
    let imageBuffer;
    if (req.file) {
      imageBuffer = req.file.buffer;
    } else if (req.body?.url) {
      const imgRes = await fetch(req.body.url);
      if (!imgRes.ok) throw new Error(`Failed to fetch image (${imgRes.status})`);
      imageBuffer = Buffer.from(await imgRes.arrayBuffer());
    } else {
      return res.status(400).json({ error: 'Provide an image file or url' });
    }
    const { weekStart, headline, scene, style } = req.body || {};
    const id = saveCoverGeneration(weekStart || null, headline || null, scene || null, style || null, null, imageBuffer);
    console.log(`[Upload] Saved uploaded image #${id} (${imageBuffer.length} bytes)`);
    res.json({ ok: true, id, imageUrl: `/api/admin/cover-generation/${id}/image` });
  } catch (err) {
    console.error('[Upload] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Style Thumbnails ──────────────────────────────────

// Generate and save a style thumbnail preview image (admin)
router.post('/style-thumbnail', requireApiKey, imageLimiter, async (req, res) => {
  const { prompt, styleId, style } = req.body;
  if (!prompt || !styleId || !style) {
    return res.status(400).json({ error: 'prompt, styleId, and style are required' });
  }
  try {
    const fullPrompt = `${prompt}, ${style}`;
    const replicateUrl = await generateImageFromPrompt(fullPrompt);
    const imgRes = await fetch(replicateUrl);
    if (!imgRes.ok) throw new Error(`Failed to download image (${imgRes.status})`);
    const imageBuffer = Buffer.from(await imgRes.arrayBuffer());
    saveStyleThumbnail(styleId, fullPrompt, imageBuffer);
    console.log(`[StyleThumb] Saved thumbnail for ${styleId} (${imageBuffer.length} bytes)`);
    res.json({ ok: true, styleId });
  } catch (err) {
    console.error('[StyleThumb] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Serve a style thumbnail image (public — for <img> tags)
router.get('/style-thumbnail/:styleId', (req, res) => {
  const { styleId } = req.params;
  const imageBuffer = getStyleThumbnail(styleId);
  if (!imageBuffer) return res.status(404).send('Not found');
  res.set('Content-Type', 'image/png');
  res.set('Cache-Control', 'public, max-age=604800');
  res.send(imageBuffer);
});

export default router;
