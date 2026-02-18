import { Router } from 'express';
import multer from 'multer';
import { mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import config from '../config.js';
import { parseReplayFile } from '../replayParser.js';
import { writeFileSync } from 'fs';
import {
  insertReplay, updateReplayParsed, updateReplayError,
  getReplay, listReplays, getReplayCount, deleteReplay,
  insertReplayPlayers, getReplayPlayers,
  insertReplayChat, getReplayChat,
  insertReplayPlayerActions, getReplayPlayerActions,
  getReplayByW3cMatchId, insertReplayWithW3c,
  getExistingW3cMatchIds,
  insertPlayerFingerprints,
} from '../db.js';
import { buildServerFingerprint } from '../fingerprint.js';

const router = Router();

function requireApiKey(req, res, next) {
  const key = req.headers['x-api-key'];
  if (!config.ADMIN_API_KEY || key !== config.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Invalid or missing API key' });
  }
  next();
}

// Set up multer for .w3g file uploads
const REPLAY_DIR = join(process.cwd(), 'data', 'replays');
mkdirSync(REPLAY_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, REPLAY_DIR),
  filename: (_req, file, cb) => {
    const ts = Date.now();
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${ts}-${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB max
  fileFilter: (_req, file, cb) => {
    if (file.originalname.toLowerCase().endsWith('.w3g')) {
      cb(null, true);
    } else {
      cb(new Error('Only .w3g replay files are accepted'));
    }
  },
});

// POST /api/replays/upload — Upload and parse a .w3g file
router.post('/upload', requireApiKey, (req, res, next) => {
  upload.single('replay')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: err.message });
      }
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No replay file provided' });
  }

  const { originalname, path: filePath, size } = req.file;
  const replayId = insertReplay({ filename: originalname, filePath, fileSize: size });

  try {
    const parsed = await parseReplayFile(filePath);

    // Store parsed data
    updateReplayParsed(replayId, {
      gameName: parsed.metadata.gameName,
      gameDuration: parsed.metadata.gameDuration,
      mapName: parsed.metadata.mapName,
      matchType: parsed.metadata.matchType,
      matchDate: parsed.metadata.matchDate,
      rawParsed: JSON.stringify(parsed),
    });

    insertReplayPlayers(replayId, parsed.players);
    insertReplayChat(replayId, parsed.chat);
    insertReplayPlayerActions(replayId, parsed.actions);

    // Compute and store fingerprints
    try {
      const fingerprints = computeFingerprints(parsed.actions, parsed.players);
      if (fingerprints.length > 0) insertPlayerFingerprints(replayId, fingerprints);
    } catch (fpErr) {
      console.error(`[Fingerprint] Error for ${originalname}:`, fpErr.message);
    }

    const replay = getReplay(replayId);
    const players = getReplayPlayers(replayId);

    res.json({
      ok: true,
      replay: {
        id: replay.id,
        filename: replay.filename,
        gameName: replay.game_name,
        gameDuration: replay.game_duration,
        mapName: replay.map_name,
        matchType: replay.match_type,
        parseStatus: replay.parse_status,
        playerCount: players.length,
        chatCount: parsed.chat.length,
      },
    });
  } catch (err) {
    console.error(`[Replay] Parse error for ${originalname}:`, err.message);
    updateReplayError(replayId, err.message);
    res.status(422).json({
      ok: false,
      error: 'Failed to parse replay',
      detail: err.message,
      replayId,
    });
  }
});

// POST /api/replays/import-w3c — Import a replay from W3Champions
router.post('/import-w3c', requireApiKey, async (req, res) => {
  const { matchId, players: w3cPlayers } = req.body;
  if (!matchId) {
    return res.status(400).json({ error: 'matchId is required' });
  }

  // Dedup check
  const existing = getReplayByW3cMatchId(matchId);
  if (existing) {
    return res.json({ ok: true, skipped: true, replayId: existing.id });
  }

  // Download .w3g from W3C
  let replayBuffer;
  try {
    const w3cUrl = `https://website-backend.w3champions.com/api/replays/${encodeURIComponent(matchId)}`;
    const dlRes = await fetch(w3cUrl);
    if (!dlRes.ok) {
      const status = dlRes.status === 404 ? 422 : 502;
      return res.status(status).json({ error: `W3C replay download failed (${dlRes.status})` });
    }
    replayBuffer = Buffer.from(await dlRes.arrayBuffer());
  } catch (err) {
    return res.status(502).json({ error: `Network error downloading replay: ${err.message}` });
  }

  // Save to disk
  const ts = Date.now();
  const safeId = matchId.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filename = `${ts}-w3c-${safeId}.w3g`;
  const filePath = join(REPLAY_DIR, filename);
  writeFileSync(filePath, replayBuffer);

  // Insert DB record
  const replayId = insertReplayWithW3c({
    filename,
    filePath,
    fileSize: replayBuffer.length,
    w3cMatchId: matchId,
  });

  // Parse
  try {
    const parsed = await parseReplayFile(filePath);

    updateReplayParsed(replayId, {
      gameName: parsed.metadata.gameName,
      gameDuration: parsed.metadata.gameDuration,
      mapName: parsed.metadata.mapName,
      matchType: parsed.metadata.matchType,
      matchDate: parsed.metadata.matchDate,
      rawParsed: JSON.stringify(parsed),
    });

    // Match W3C player battletags to replay player names
    // W3C sends name: "FOALS", battleTag: "FOALS#11315"
    // Replay parser returns playerName: "FOALS#11315" (full battletag as name)
    const playerTagMap = {};
    if (Array.isArray(w3cPlayers)) {
      for (const wp of w3cPlayers) {
        if (wp.name && wp.battleTag) {
          playerTagMap[wp.name.toLowerCase()] = wp.battleTag;
          // Also map the full battletag to itself for direct matches
          playerTagMap[wp.battleTag.toLowerCase()] = wp.battleTag;
        }
      }
    }

    const playersWithTags = parsed.players.map(p => {
      const nameKey = p.playerName.toLowerCase();
      const nameOnly = nameKey.split('#')[0];
      return {
        ...p,
        battleTag: playerTagMap[nameKey] || playerTagMap[nameOnly] || null,
      };
    });

    insertReplayPlayers(replayId, playersWithTags);
    insertReplayChat(replayId, parsed.chat);
    insertReplayPlayerActions(replayId, parsed.actions);

    // Compute and store fingerprints (use playersWithTags for battletags)
    try {
      const fingerprints = computeFingerprints(parsed.actions, playersWithTags);
      if (fingerprints.length > 0) insertPlayerFingerprints(replayId, fingerprints);
    } catch (fpErr) {
      console.error(`[Fingerprint] Error for W3C match ${matchId}:`, fpErr.message);
    }

    const replay = getReplay(replayId);
    const players = getReplayPlayers(replayId);

    res.json({
      ok: true,
      replay: {
        id: replay.id,
        filename: replay.filename,
        gameName: replay.game_name,
        gameDuration: replay.game_duration,
        mapName: replay.map_name,
        matchType: replay.match_type,
        parseStatus: replay.parse_status,
        playerCount: players.length,
        chatCount: parsed.chat.length,
      },
    });
  } catch (err) {
    console.error(`[Replay] Parse error for W3C match ${matchId}:`, err.message);
    updateReplayError(replayId, err.message);
    res.status(422).json({
      ok: false,
      error: 'Failed to parse replay',
      detail: err.message,
      replayId,
    });
  }
});

// GET /api/replays — List replays (paginated)
router.get('/', requireApiKey, (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const offset = parseInt(req.query.offset) || 0;
  const replays = listReplays(limit, offset);
  const total = getReplayCount();
  res.json({ replays, total, limit, offset });
});

// GET /api/replays/:id — Single replay with players + actions
router.get('/:id', requireApiKey, (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

  const replay = getReplay(id);
  if (!replay) return res.status(404).json({ error: 'Replay not found' });

  const players = getReplayPlayers(id);
  const actions = getReplayPlayerActions(id);
  const chat = getReplayChat(id);

  // Parse JSON fields in actions
  const enrichedActions = actions.map(a => ({
    ...a,
    timed_segments: tryParse(a.timed_segments),
    group_hotkeys: tryParse(a.group_hotkeys),
    heroes: tryParse(a.heroes),
    units_summary: tryParse(a.units_summary),
    buildings_summary: tryParse(a.buildings_summary),
    early_game_sequence: tryParse(a.early_game_sequence),
  }));

  res.json({
    replay: {
      ...replay,
      raw_parsed: undefined, // Don't send the massive raw blob
    },
    players,
    actions: enrichedActions,
    chat,
  });
});

// GET /api/replays/:id/chat — Chat messages for a replay
router.get('/:id/chat', requireApiKey, (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

  const replay = getReplay(id);
  if (!replay) return res.status(404).json({ error: 'Replay not found' });

  const chat = getReplayChat(id);
  res.json({ replayId: id, chat });
});

// DELETE /api/replays/:id — Delete replay + file
router.delete('/:id', requireApiKey, (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

  const replay = getReplay(id);
  if (!replay) return res.status(404).json({ error: 'Replay not found' });

  // Delete file from disk
  try {
    unlinkSync(replay.file_path);
  } catch {
    // File may already be gone — that's fine
  }

  deleteReplay(id);
  res.json({ ok: true, message: `Replay ${id} deleted` });
});

// POST /api/replays/check-existing — Check which W3C match IDs already exist
router.post('/check-existing', requireApiKey, (req, res) => {
  const { matchIds } = req.body;
  if (!Array.isArray(matchIds)) return res.status(400).json({ error: 'matchIds array required' });
  const existing = getExistingW3cMatchIds(matchIds);
  res.json({ existing: [...existing] });
});

function tryParse(json) {
  if (!json) return null;
  try { return JSON.parse(json); } catch { return null; }
}

/**
 * Compute fingerprints for all players in a parsed replay.
 * @param {Array} actions - parsed action rows (from replayParser)
 * @param {Array} players - player objects with playerId, playerName, battleTag, race
 */
function computeFingerprints(actions, players) {
  return actions.map(a => {
    const fp = buildServerFingerprint({
      rightclick: a.rightclick, ability: a.ability,
      buildtrain: a.buildtrain, item: a.item,
      selecthotkey: a.selecthotkey, assigngroup: a.assigngroup,
      timed_segments: a.timedSegments,
      group_hotkeys: a.groupHotkeys,
    });
    const player = players.find(p => p.playerId === a.playerId);
    return {
      playerId: a.playerId,
      battleTag: player?.battleTag || null,
      playerName: player?.playerName || '',
      race: player?.race || null,
      ...fp,
    };
  });
}

export default router;
