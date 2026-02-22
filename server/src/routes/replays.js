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
  getReplaysNeedingActionSequences,
  updatePlayerActionSequence,
  getActionSequencesForExport,
  updateFingerprintEmbedding,
} from '../db.js';
import { buildServerFingerprint } from '../fingerprint.js';
import { getEmbeddingBatch } from '../embedClient.js';

const router = Router();

function requireApiKey(req, res, next) {
  const key = req.headers['x-api-key'];
  if (!config.ADMIN_API_KEY || key !== config.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Invalid or missing API key' });
  }
  next();
}

// Set up multer for .w3g file uploads — use persistent volume in production
const REPLAY_DIR = config.REPLAY_DIR.startsWith('/') ? config.REPLAY_DIR : join(process.cwd(), config.REPLAY_DIR);
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
      // Fire-and-forget: compute neural embeddings if sidecar is up
      computeEmbeddingsAsync(replayId, parsed.actions);
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
      computeEmbeddingsAsync(replayId, parsed.actions);
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

// GET /api/replays/action-sequences — Export action sequences for ML training
router.get('/action-sequences', requireApiKey, (req, res) => {
  const rows = getActionSequencesForExport();
  const result = rows.map(r => ({
    replayId: r.replay_id,
    playerId: r.player_id,
    battleTag: r.battle_tag,
    playerName: r.player_name,
    race: r.race,
    actions: tryParse(r.full_action_sequence) || [],
  }));
  res.json({ count: result.length, sequences: result });
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
    full_action_sequence: tryParse(a.full_action_sequence),
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

// POST /api/replays/batch-import — Bulk import replays from top W3C ladder players
router.post('/batch-import', requireApiKey, async (req, res) => {
  const W3C_API = 'https://website-backend.w3champions.com/api';
  const RATE_LIMIT_MS = 500;
  const season = req.body.season || 24;
  const maxMatchesPerPlayer = req.body.maxMatches || 20;

  // SSE setup
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  try {
    // Step 1: Fetch current season
    send({ phase: 'init', message: `Fetching season info...` });
    let currentSeason = season;
    try {
      const seasonsRes = await fetch(`${W3C_API}/ladder/seasons`);
      if (seasonsRes.ok) {
        const seasons = await seasonsRes.json();
        if (seasons?.length > 0) currentSeason = seasons[0].id;
      }
    } catch { /* use provided season */ }
    send({ phase: 'init', message: `Using season ${currentSeason}` });

    // Step 2: Fetch top GM (league 0) and top Master (league 1) players
    const battleTags = new Set();
    for (const leagueId of [0, 1]) {
      const leagueName = leagueId === 0 ? 'GM' : 'Master';
      send({ phase: 'ladder', message: `Fetching ${leagueName} ladder...` });
      await sleep(RATE_LIMIT_MS);

      try {
        const url = `${W3C_API}/ladder/${leagueId}?gateWay=20&gameMode=4&season=${currentSeason}`;
        const ladderRes = await fetch(url);
        if (!ladderRes.ok) {
          send({ phase: 'ladder', message: `${leagueName} ladder fetch failed (${ladderRes.status})` });
          continue;
        }
        const entries = await ladderRes.json();
        const players = (Array.isArray(entries) ? entries : []).slice(0, 50);
        for (const entry of players) {
          const tag = entry?.player?.playerIds?.[0]?.battleTag
            || entry?.playersInfo?.[0]?.battleTag;
          if (tag) battleTags.add(tag);
        }
        send({ phase: 'ladder', message: `${leagueName}: found ${players.length} players` });
      } catch (err) {
        send({ phase: 'ladder', message: `${leagueName} error: ${err.message}` });
      }
    }

    send({ phase: 'players', message: `Total unique players: ${battleTags.size}` });

    // Step 3: For each player, fetch recent matches and collect unique match IDs
    const matchMap = new Map(); // matchId -> { matchId, players }
    let playerIdx = 0;
    for (const tag of battleTags) {
      playerIdx++;
      send({ phase: 'matches', message: `[${playerIdx}/${battleTags.size}] Fetching matches for ${tag}...` });
      await sleep(RATE_LIMIT_MS);

      try {
        const url = `${W3C_API}/matches?playerId=${encodeURIComponent(tag)}&offset=0&gameMode=4&season=${currentSeason}&gateway=20&pageSize=${maxMatchesPerPlayer}`;
        const matchRes = await fetch(url);
        if (!matchRes.ok) continue;
        const data = await matchRes.json();
        const matches = data.matches || [];

        for (const m of matches) {
          if (matchMap.has(m.id)) continue;
          const players = [];
          for (const team of m.teams || []) {
            for (const p of team.players || []) {
              players.push({ name: p.name || p.battleTag?.split('#')[0], battleTag: p.battleTag });
            }
          }
          matchMap.set(m.id, { matchId: m.id, players });
        }
      } catch { /* skip this player */ }
    }

    send({ phase: 'matches', message: `Collected ${matchMap.size} unique matches` });

    // Step 4: Deduplicate against existing DB
    const allMatchIds = [...matchMap.keys()];
    const existingIds = getExistingW3cMatchIds(allMatchIds);
    const newMatches = allMatchIds.filter(id => !existingIds.has(id));
    send({ phase: 'dedup', message: `${existingIds.size} already imported, ${newMatches.length} new to import` });

    // Step 5: Import each new match
    let imported = 0, failed = 0, skipped = 0;
    for (let i = 0; i < newMatches.length; i++) {
      const matchId = newMatches[i];
      const matchInfo = matchMap.get(matchId);
      send({ phase: 'import', progress: `${i + 1}/${newMatches.length}`, matchId, imported, failed });
      await sleep(RATE_LIMIT_MS);

      try {
        // Download .w3g from W3C
        const w3cUrl = `${W3C_API}/replays/${encodeURIComponent(matchId)}`;
        const dlRes = await fetch(w3cUrl);
        if (!dlRes.ok) {
          if (dlRes.status === 404) { skipped++; continue; }
          failed++;
          continue;
        }
        const replayBuffer = Buffer.from(await dlRes.arrayBuffer());

        // Save to disk
        const ts = Date.now();
        const safeId = matchId.replace(/[^a-zA-Z0-9._-]/g, '_');
        const filename = `${ts}-w3c-${safeId}.w3g`;
        const filePath = join(REPLAY_DIR, filename);
        writeFileSync(filePath, replayBuffer);

        // Insert DB record
        const replayId = insertReplayWithW3c({ filename, filePath, fileSize: replayBuffer.length, w3cMatchId: matchId });

        // Parse
        const parsed = await parseReplayFile(filePath);
        updateReplayParsed(replayId, {
          gameName: parsed.metadata.gameName,
          gameDuration: parsed.metadata.gameDuration,
          mapName: parsed.metadata.mapName,
          matchType: parsed.metadata.matchType,
          matchDate: parsed.metadata.matchDate,
          rawParsed: JSON.stringify(parsed),
        });

        // Match battletags
        const playerTagMap = {};
        if (matchInfo?.players) {
          for (const wp of matchInfo.players) {
            if (wp.name && wp.battleTag) {
              playerTagMap[wp.name.toLowerCase()] = wp.battleTag;
              playerTagMap[wp.battleTag.toLowerCase()] = wp.battleTag;
            }
          }
        }

        const playersWithTags = parsed.players.map(p => {
          const nameKey = p.playerName.toLowerCase();
          const nameOnly = nameKey.split('#')[0];
          return { ...p, battleTag: playerTagMap[nameKey] || playerTagMap[nameOnly] || null };
        });

        insertReplayPlayers(replayId, playersWithTags);
        insertReplayChat(replayId, parsed.chat);
        insertReplayPlayerActions(replayId, parsed.actions);

        // Compute fingerprints
        try {
          const fingerprints = computeFingerprints(parsed.actions, playersWithTags);
          if (fingerprints.length > 0) insertPlayerFingerprints(replayId, fingerprints);
        } catch { /* fingerprint error is non-fatal */ }

        imported++;
      } catch (err) {
        failed++;
        send({ phase: 'import', error: `Match ${matchId}: ${err.message}` });
      }
    }

    send({
      phase: 'done',
      imported,
      failed,
      skipped,
      totalMatches: newMatches.length,
      alreadyExisted: existingIds.size,
    });
  } catch (err) {
    send({ phase: 'error', message: err.message });
  }

  res.end();
});

// POST /api/replays/backfill-actions — Re-parse existing replays for full action sequences
router.post('/backfill-actions', requireApiKey, async (req, res) => {
  const { parseReplayFile: reparse } = await import('../replayParser.js');
  const missing = getReplaysNeedingActionSequences();

  if (missing.length === 0) {
    return res.json({ ok: true, message: 'All replays already have action sequences', processed: 0 });
  }

  let processed = 0, errors = 0;
  for (const { id: replayId, file_path: filePath } of missing) {
    try {
      const parsed = await reparse(filePath);
      for (const a of parsed.actions) {
        if (a.fullActionSequence && a.fullActionSequence.length > 0) {
          updatePlayerActionSequence(replayId, a.playerId, a.fullActionSequence);
        }
      }
      processed++;
    } catch (err) {
      console.error(`[Backfill Actions] Replay ${replayId}: ${err.message}`);
      errors++;
    }
  }

  res.json({ ok: true, processed, errors, total: missing.length });
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
      full_action_sequence: a.fullActionSequence,
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

/**
 * Fire-and-forget: compute embeddings for a just-imported replay via the sidecar.
 */
async function computeEmbeddingsAsync(replayId, actions) {
  try {
    const sequences = actions
      .filter(a => a.fullActionSequence && a.fullActionSequence.length > 10)
      .map(a => a.fullActionSequence);
    if (sequences.length === 0) return;

    const embeddings = await getEmbeddingBatch(sequences);
    let idx = 0;
    for (const a of actions) {
      if (a.fullActionSequence && a.fullActionSequence.length > 10) {
        if (embeddings[idx]) {
          updateFingerprintEmbedding(replayId, a.playerId, embeddings[idx]);
        }
        idx++;
      }
    }
  } catch (err) {
    console.error(`[Embed] Error for replay ${replayId}:`, err.message);
  }
}

export default router;
