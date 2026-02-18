import { Router } from 'express';
import config from '../config.js';
import {
  getPlayerFingerprints,
  getAllAveragedFingerprints,
  getFingerprintCount,
  getIndexedPlayers,
  getReplaysWithoutFingerprints,
  getReplayPlayerActions,
  getReplayPlayers,
  insertPlayerFingerprints,
} from '../db.js';
import {
  buildServerFingerprint,
  averageFingerprints,
  computeServerSimilarity,
  computeServerBreakdown,
} from '../fingerprint.js';

const router = Router();

function requireApiKey(req, res, next) {
  const key = req.headers['x-api-key'];
  if (!config.ADMIN_API_KEY || key !== config.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Invalid or missing API key' });
  }
  next();
}

function tryParse(json) {
  if (!json) return null;
  try { return JSON.parse(json); } catch { return null; }
}

/**
 * Parse a DB fingerprint row into { vector, segments } format.
 */
function parseDbFingerprint(row) {
  return {
    vector: tryParse(row.vector) || [],
    segments: {
      action: tryParse(row.action_seg) || [],
      apm: tryParse(row.apm_seg) || [],
      hotkey: tryParse(row.hotkey_seg) || [],
    },
  };
}

/**
 * Parse grouped fingerprint rows (from getAllAveragedFingerprints) into averaged fingerprint.
 */
function parseAveragedRow(row) {
  const vectors = row.vectors.split('|||').map(v => tryParse(v)).filter(Boolean);
  const actionSegs = row.action_segs.split('|||').map(v => tryParse(v)).filter(Boolean);
  const apmSegs = row.apm_segs.split('|||').map(v => tryParse(v)).filter(Boolean);
  const hotkeySegs = row.hotkey_segs.split('|||').map(v => tryParse(v)).filter(Boolean);

  const fps = vectors.map((vec, i) => ({
    vector: vec,
    segments: {
      action: actionSegs[i] || [],
      apm: apmSegs[i] || [],
      hotkey: hotkeySegs[i] || [],
    },
  }));

  return averageFingerprints(fps);
}

// GET /api/fingerprints/players — List all indexed players
router.get('/players', requireApiKey, (req, res) => {
  const players = getIndexedPlayers();
  const dbStats = getFingerprintCount();
  res.json({ players, ...dbStats });
});

// GET /api/fingerprints/similar/:battleTag?limit=10
router.get('/similar/:battleTag', requireApiKey, (req, res) => {
  const { battleTag } = req.params;
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);

  // Get query player's fingerprints
  const queryRows = getPlayerFingerprints(battleTag);
  if (queryRows.length === 0) {
    return res.status(404).json({ error: 'No fingerprints found for player', battleTag });
  }

  const queryFps = queryRows.map(parseDbFingerprint);
  const queryAvg = averageFingerprints(queryFps);
  const queryRace = queryRows[0].race;

  // Get all players' averaged fingerprints
  const allRows = getAllAveragedFingerprints();
  const results = [];

  for (const row of allRows) {
    if (row.battle_tag === battleTag) continue; // skip self

    const avgFp = parseAveragedRow(row);
    if (!avgFp) continue;

    const sameRace = queryRace && queryRace === row.race;
    const similarity = computeServerSimilarity(queryAvg, avgFp, sameRace);
    const breakdown = computeServerBreakdown(queryAvg, avgFp);

    results.push({
      battleTag: row.battle_tag,
      playerName: row.player_name,
      race: row.race,
      replayCount: row.replay_count,
      similarity: Math.round(similarity * 1000) / 1000,
      breakdown: {
        action: Math.round(breakdown.action * 1000) / 1000,
        apm: Math.round(breakdown.apm * 1000) / 1000,
        hotkey: Math.round(breakdown.hotkey * 1000) / 1000,
      },
    });
  }

  results.sort((a, b) => b.similarity - a.similarity);

  const dbStats = getFingerprintCount();

  res.json({
    query: { battleTag, replayCount: queryRows.length },
    similar: results.slice(0, limit),
    dbStats,
  });
});

// GET /api/fingerprints/player/:battleTag
router.get('/player/:battleTag', requireApiKey, (req, res) => {
  const { battleTag } = req.params;
  const rows = getPlayerFingerprints(battleTag);

  if (rows.length === 0) {
    return res.status(404).json({ error: 'No fingerprints found', battleTag });
  }

  const fingerprints = rows.map(r => ({
    replayId: r.replay_id,
    playerId: r.player_id,
    playerName: r.player_name,
    race: r.race,
    mapName: r.map_name,
    matchDate: r.match_date,
    gameDuration: r.game_duration,
    ...parseDbFingerprint(r),
  }));

  const avgFp = averageFingerprints(fingerprints.map(f => ({
    vector: f.vector,
    segments: f.segments,
  })));

  res.json({
    battleTag,
    replayCount: rows.length,
    fingerprints,
    averaged: avgFp,
  });
});

// POST /api/fingerprints/backfill
router.post('/backfill', requireApiKey, (req, res) => {
  const missing = getReplaysWithoutFingerprints();

  let processed = 0;
  let errors = 0;

  for (const { id: replayId } of missing) {
    try {
      const actions = getReplayPlayerActions(replayId);
      const players = getReplayPlayers(replayId);

      const fingerprints = actions.map(a => {
        const fp = buildServerFingerprint({
          rightclick: a.rightclick, ability: a.ability,
          buildtrain: a.buildtrain, item: a.item,
          selecthotkey: a.selecthotkey, assigngroup: a.assigngroup,
          timed_segments: tryParse(a.timed_segments),
          group_hotkeys: tryParse(a.group_hotkeys),
        });
        const player = players.find(p => p.player_id === a.player_id);
        return {
          playerId: a.player_id,
          battleTag: player?.battle_tag || null,
          playerName: player?.player_name || '',
          race: player?.race || null,
          ...fp,
        };
      });

      if (fingerprints.length > 0) {
        insertPlayerFingerprints(replayId, fingerprints);
        processed++;
      }
    } catch (err) {
      console.error(`[Fingerprint Backfill] Error for replay ${replayId}:`, err.message);
      errors++;
    }
  }

  const dbStats = getFingerprintCount();
  res.json({ ok: true, replaysProcessed: processed, errors, missing: missing.length, dbStats });
});

// GET /api/fingerprints/stats
router.get('/stats', requireApiKey, (req, res) => {
  const dbStats = getFingerprintCount();
  const missing = getReplaysWithoutFingerprints();
  res.json({
    ...dbStats,
    replaysWithoutFingerprints: missing.length,
  });
});

export default router;
