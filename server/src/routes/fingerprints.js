import { Router } from 'express';
import config from '../config.js';
import {
  getPlayerFingerprints,
  getPlayerFingerprintsFiltered,
  getAllAveragedFingerprints,
  getAllAveragedFingerprintsWithEmbeddings,
  getFingerprintCount,
  getIndexedPlayers,
  getReplaysWithoutFingerprints,
  getReplayPlayerActions,
  getReplayPlayers,
  insertPlayerFingerprints,
  getFingerprintsWithoutEmbeddings,
  updateFingerprintEmbedding,
  getPlayerActionData,
  deleteReplayFingerprints,
  deleteAllFingerprints,
  getAllReplayIds,
} from '../db.js';
import {
  buildServerFingerprint,
  averageFingerprints,
  computeServerSimilarity,
  computeServerBreakdown,
  computeHybridSimilarity,
  averageEmbeddings,
  embeddingSimilarity,
  computeConfidence,
} from '../fingerprint.js';
import { getEmbedding, getEmbeddingBatch, checkSidecar } from '../embedClient.js';

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

function r3(v) { return v !== null && v !== undefined ? Math.round(v * 1000) / 1000 : null; }

function formatBreakdown(breakdown, hybrid) {
  return {
    action: r3(breakdown.action),
    apm: r3(breakdown.apm),
    hotkey: r3(breakdown.hotkey),
    tempo: r3(breakdown.tempo),
    intensity: r3(breakdown.intensity),
    transitions: r3(breakdown.transitions),
    rhythm: r3(breakdown.rhythm),
    handcrafted: r3(hybrid.handcrafted),
    embedding: r3(hybrid.embedding),
  };
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
      tempo: tryParse(row.tempo_seg) || [],
      intensity: tryParse(row.intensity_seg) || [],
      transitions: tryParse(row.transitions_seg) || [],
      rhythm: tryParse(row.rhythm_seg) || [],
    },
  };
}

/**
 * Parse grouped fingerprint rows into averaged fingerprint + averaged embedding.
 */
function parseAveragedRowWithEmbedding(row) {
  const vectors = row.vectors.split('|||').map(v => tryParse(v)).filter(Boolean);
  const actionSegs = row.action_segs.split('|||').map(v => tryParse(v)).filter(Boolean);
  const apmSegs = row.apm_segs.split('|||').map(v => tryParse(v)).filter(Boolean);
  const hotkeySegs = row.hotkey_segs.split('|||').map(v => tryParse(v)).filter(Boolean);
  const tempoSegs = (row.tempo_segs || '').split('|||').map(v => tryParse(v)).filter(Boolean);
  const intensitySegs = (row.intensity_segs || '').split('|||').map(v => tryParse(v)).filter(Boolean);
  const transitionsSegs = (row.transitions_segs || '').split('|||').map(v => tryParse(v)).filter(Boolean);
  const rhythmSegs = (row.rhythm_segs || '').split('|||').map(v => tryParse(v)).filter(Boolean);

  const fps = vectors.map((vec, i) => ({
    vector: vec,
    segments: {
      action: actionSegs[i] || [],
      apm: apmSegs[i] || [],
      hotkey: hotkeySegs[i] || [],
      tempo: tempoSegs[i] || [],
      intensity: intensitySegs[i] || [],
      transitions: transitionsSegs[i] || [],
      rhythm: rhythmSegs[i] || [],
    },
  }));

  const avgFp = averageFingerprints(fps);

  // Parse embeddings
  let avgEmb = null;
  if (row.embeddings) {
    const embeddings = row.embeddings.split('|||').map(v => tryParse(v)).filter(Boolean);
    avgEmb = averageEmbeddings(embeddings);
  }

  return { fp: avgFp, embedding: avgEmb };
}

// ── Population Calibration Cache ─────────────────
// Caches the pairwise similarity distribution across all players.
// Rebuilt on demand (invalidated every 30 min or when rebuild is called).

let calibrationCache = null;
let calibrationAge = 0;
const CALIBRATION_TTL = 30 * 60 * 1000; // 30 min

function getCalibration() {
  const now = Date.now();
  if (calibrationCache && (now - calibrationAge) < CALIBRATION_TTL) {
    return calibrationCache;
  }

  const allRows = getAllAveragedFingerprintsWithEmbeddings();
  if (allRows.length < 5) return null; // need enough players

  // Parse all players
  const players = allRows.map(row => {
    const { fp, embedding } = parseAveragedRowWithEmbedding(row);
    return { battleTag: row.battle_tag, race: row.race, fp, embedding };
  }).filter(p => p.fp);

  // Compute all pairwise similarities
  const scores = [];
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const hybrid = computeHybridSimilarity(
        players[i].fp, players[j].fp,
        players[i].embedding, players[j].embedding
      );
      scores.push(hybrid.similarity);
    }
  }

  if (scores.length < 10) return null;

  scores.sort((a, b) => a - b);
  const n = scores.length;
  const mean = scores.reduce((a, b) => a + b, 0) / n;
  const variance = scores.reduce((sum, v) => sum + (v - mean) ** 2, 0) / n;
  const stddev = Math.sqrt(variance);

  calibrationCache = { mean, stddev, scores, playerCount: players.length, pairCount: n };
  calibrationAge = now;
  return calibrationCache;
}

/**
 * Convert a raw similarity score to a percentile rank (0-100).
 * Uses the cached population distribution.
 */
function scoreToPercentile(rawScore, cal) {
  if (!cal) return null;
  // Binary search in sorted scores array
  const arr = cal.scores;
  let lo = 0, hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid] < rawScore) lo = mid + 1;
    else hi = mid;
  }
  return Math.round((lo / arr.length) * 1000) / 10; // one decimal place
}

/**
 * Convert raw similarity to a z-score.
 */
function scoreToZScore(rawScore, cal) {
  if (!cal || cal.stddev === 0) return null;
  return Math.round(((rawScore - cal.mean) / cal.stddev) * 100) / 100;
}

// GET /api/fingerprints/profile/:battleTag — Public profile (no auth)
// Returns averaged fingerprint data only (no raw per-replay fingerprints)
router.get('/profile/:battleTag', (req, res) => {
  const { battleTag } = req.params;
  const minDuration = parseInt(req.query.minDuration) || 0;
  const rows = minDuration > 0
    ? getPlayerFingerprintsFiltered(battleTag, { minDuration })
    : getPlayerFingerprints(battleTag);

  if (rows.length === 0) {
    return res.status(404).json({ error: 'No fingerprints found', battleTag });
  }

  const fingerprints = rows.map(parseDbFingerprint);
  const avgFp = averageFingerprints(fingerprints);
  const embeddings = rows.map(r => tryParse(r.embedding)).filter(Boolean);
  const avgEmb = averageEmbeddings(embeddings);
  const confidence = computeConfidence(fingerprints);

  res.json({
    battleTag,
    replayCount: rows.length,
    embeddingCount: embeddings.length,
    confidence,
    averaged: avgFp,
    averagedEmbedding: avgEmb,
  });
});

// GET /api/fingerprints/players — List all indexed players
router.get('/players', requireApiKey, (req, res) => {
  const players = getIndexedPlayers();
  const dbStats = getFingerprintCount();
  res.json({ players, ...dbStats });
});

// GET /api/fingerprints/similar/:battleTag?limit=10&sameRace=true&minDuration=300
router.get('/similar/:battleTag', requireApiKey, (req, res) => {
  const { battleTag } = req.params;
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);
  const sameRace = req.query.sameRace === 'true';
  const minDuration = parseInt(req.query.minDuration) || 0;

  // Get query player's fingerprints (with optional duration filter)
  const queryRows = minDuration > 0
    ? getPlayerFingerprintsFiltered(battleTag, { minDuration })
    : getPlayerFingerprints(battleTag);
  if (queryRows.length === 0) {
    return res.status(404).json({ error: 'No fingerprints found for player', battleTag });
  }

  const queryFps = queryRows.map(parseDbFingerprint);
  const queryAvg = averageFingerprints(queryFps);
  const queryRace = queryRows[0].race;
  const queryConfidence = computeConfidence(queryFps);

  // Get query player's embeddings
  const queryEmbeddings = queryRows.map(r => tryParse(r.embedding)).filter(Boolean);
  const queryAvgEmb = averageEmbeddings(queryEmbeddings);

  // Get all players' averaged fingerprints with embeddings
  const allRows = getAllAveragedFingerprintsWithEmbeddings();
  const results = [];

  for (const row of allRows) {
    if (row.battle_tag === battleTag) continue;
    // Race filter: skip candidates with different race
    if (sameRace && queryRace && row.race !== queryRace) continue;

    const { fp: avgFp, embedding: avgEmb } = parseAveragedRowWithEmbedding(row);
    if (!avgFp) continue;

    const hybrid = computeHybridSimilarity(queryAvg, avgFp, queryAvgEmb, avgEmb);
    const breakdown = computeServerBreakdown(queryAvg, avgFp);

    results.push({
      battleTag: row.battle_tag,
      playerName: row.player_name,
      race: row.race,
      replayCount: row.replay_count,
      similarity: Math.round(hybrid.similarity * 1000) / 1000,
      hybrid: hybrid.hybrid,
      breakdown: formatBreakdown(breakdown, hybrid),
    });
  }

  results.sort((a, b) => b.similarity - a.similarity);

  // Population-calibrated scoring (race-filtered if sameRace)
  const cal = getCalibration();
  if (cal) {
    for (const r of results) {
      r.percentile = scoreToPercentile(r.similarity, cal);
      r.zScore = scoreToZScore(r.similarity, cal);
    }
  }

  const dbStats = getFingerprintCount();

  res.json({
    query: {
      battleTag,
      race: queryRace,
      replayCount: queryRows.length,
      hasEmbedding: queryAvgEmb !== null,
      confidence: queryConfidence,
    },
    filters: { sameRace, minDuration: minDuration || null },
    similar: results.slice(0, limit),
    calibration: cal ? {
      populationMean: r3(cal.mean),
      populationStddev: r3(cal.stddev),
      playerCount: cal.playerCount,
      pairCount: cal.pairCount,
    } : null,
    dbStats,
  });
});

// GET /api/fingerprints/player/:battleTag?minDuration=300
router.get('/player/:battleTag', requireApiKey, (req, res) => {
  const { battleTag } = req.params;
  const minDuration = parseInt(req.query.minDuration) || 0;
  const rows = minDuration > 0
    ? getPlayerFingerprintsFiltered(battleTag, { minDuration })
    : getPlayerFingerprints(battleTag);

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
    hasEmbedding: !!r.embedding,
    ...parseDbFingerprint(r),
  }));

  const fpObjs = fingerprints.map(f => ({
    vector: f.vector,
    segments: f.segments,
  }));
  const avgFp = averageFingerprints(fpObjs);
  const confidence = computeConfidence(fpObjs);

  const embeddings = rows.map(r => tryParse(r.embedding)).filter(Boolean);
  const avgEmb = averageEmbeddings(embeddings);

  res.json({
    battleTag,
    replayCount: rows.length,
    embeddingCount: embeddings.length,
    confidence,
    fingerprints,
    averaged: avgFp,
    averagedEmbedding: avgEmb,
  });
});

// GET /api/fingerprints/compare/:tagA/:tagB — Deep comparison data
router.get('/compare/:tagA/:tagB', requireApiKey, (req, res) => {
  const { tagA, tagB } = req.params;

  function buildProfile(battleTag) {
    const rows = getPlayerActionData(battleTag);
    if (rows.length === 0) return null;

    // Average timed_segments across replays (APM curve)
    const allTs = rows.map(r => tryParse(r.timed_segments)).filter(Boolean);
    let apmCurve = [];
    if (allTs.length > 0) {
      const maxLen = Math.max(...allTs.map(t => t.length));
      apmCurve = Array(maxLen).fill(0);
      const counts = Array(maxLen).fill(0);
      for (const ts of allTs) {
        for (let i = 0; i < ts.length; i++) {
          apmCurve[i] += ts[i];
          counts[i]++;
        }
      }
      for (let i = 0; i < maxLen; i++) {
        apmCurve[i] = counts[i] > 0 ? Math.round(apmCurve[i] / counts[i]) : 0;
      }
    }

    // Compute action tempo from full_action_sequence (inter-action time deltas)
    const tempoHist = Array(8).fill(0); // buckets: <50, 50-100, 100-200, 200-500, 500-1000, 1000-2000, 2000-5000, 5000+
    let totalDeltas = 0;
    const allSeqs = rows.map(r => tryParse(r.full_action_sequence)).filter(a => a && a.length > 1);
    for (const seq of allSeqs) {
      for (let i = 1; i < seq.length; i++) {
        const delta = seq[i].ms - seq[i - 1].ms;
        if (delta < 0) continue;
        totalDeltas++;
        if (delta < 50) tempoHist[0]++;
        else if (delta < 100) tempoHist[1]++;
        else if (delta < 200) tempoHist[2]++;
        else if (delta < 500) tempoHist[3]++;
        else if (delta < 1000) tempoHist[4]++;
        else if (delta < 2000) tempoHist[5]++;
        else if (delta < 5000) tempoHist[6]++;
        else tempoHist[7]++;
      }
    }
    // Normalize to percentages
    const tempoPct = totalDeltas > 0
      ? tempoHist.map(v => Math.round((v / totalDeltas) * 1000) / 10)
      : tempoHist;

    // Hotkey switching patterns from full_action_sequence
    // Count transitions between hotkey groups (which group follows which)
    const groupTransitions = {};
    for (const seq of allSeqs) {
      let lastGroup = null;
      for (const a of seq) {
        if ((a.id === 0x17 || a.id === 0x18 || a.id === 23 || a.id === 24) && a.g != null) {
          if (lastGroup !== null && lastGroup !== a.g) {
            const key = `${lastGroup}→${a.g}`;
            groupTransitions[key] = (groupTransitions[key] || 0) + 1;
          }
          lastGroup = a.g;
        }
      }
    }
    // Top 8 transitions
    const topTransitions = Object.entries(groupTransitions)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([k, v]) => ({ from: parseInt(k), to: parseInt(k.split('→')[1]), count: v }));

    // Early game actions (first 60s) — action type sequence
    const earlyActions = [];
    for (const seq of allSeqs) {
      const early = seq.filter(a => a.ms <= 60000).map(a => ({ ms: a.ms, id: a.id, g: a.g }));
      if (early.length > 0) earlyActions.push(early);
    }
    // Average early game (take the longest one as representative)
    const earlyGame = earlyActions.sort((a, b) => b.length - a.length)[0] || [];

    return {
      apmCurve,
      tempo: tempoPct,
      topTransitions,
      earlyGame: earlyGame.slice(0, 80), // cap at 80 actions
      replayCount: rows.length,
    };
  }

  const profileA = buildProfile(tagA);
  const profileB = buildProfile(tagB);

  if (!profileA || !profileB) {
    return res.status(404).json({ error: 'Missing action data for one or both players' });
  }

  res.json({ tagA, tagB, profileA, profileB });
});

// POST /api/fingerprints/backfill — Backfill handcrafted fingerprints
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
          full_action_sequence: tryParse(a.full_action_sequence),
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

// POST /api/fingerprints/rebuild — Delete all fingerprints and recompute from action data
router.post('/rebuild', requireApiKey, (req, res) => {
  calibrationCache = null; // invalidate calibration
  const deleted = deleteAllFingerprints();
  const allReplays = getAllReplayIds();

  let processed = 0, errors = 0;
  for (const { id: replayId } of allReplays) {
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
          full_action_sequence: tryParse(a.full_action_sequence),
        });
        const player = players.find(p => p.player_id === a.player_id);
        return {
          playerId: a.player_id, battleTag: player?.battle_tag || null,
          playerName: player?.player_name || '', race: player?.race || null,
          ...fp,
        };
      });

      if (fingerprints.length > 0) {
        insertPlayerFingerprints(replayId, fingerprints);
        processed++;
      }
    } catch (err) {
      console.error(`[Rebuild] Error for replay ${replayId}:`, err.message);
      errors++;
    }
  }

  const dbStats = getFingerprintCount();
  res.json({ ok: true, deleted, replaysProcessed: processed, errors, total: allReplays.length, dbStats });
});

// POST /api/fingerprints/backfill-embeddings — Compute embeddings via sidecar
router.post('/backfill-embeddings', requireApiKey, async (req, res) => {
  const available = await checkSidecar();
  if (!available) {
    return res.status(503).json({ error: 'Embed sidecar not available', url: config.EMBED_URL });
  }

  const missing = getFingerprintsWithoutEmbeddings();
  if (missing.length === 0) {
    return res.json({ ok: true, message: 'All fingerprints already have embeddings', processed: 0 });
  }

  // Process in small batches to avoid OOM on sidecar
  const BATCH_SIZE = 4;
  let processed = 0, errors = 0;

  for (let i = 0; i < missing.length; i += BATCH_SIZE) {
    const batch = missing.slice(i, i + BATCH_SIZE);
    const actionSequences = batch.map(row => tryParse(row.full_action_sequence) || []);

    try {
      const embeddings = await getEmbeddingBatch(actionSequences);
      for (let j = 0; j < batch.length; j++) {
        if (embeddings[j]) {
          updateFingerprintEmbedding(batch[j].replay_id, batch[j].player_id, embeddings[j]);
          processed++;
        }
      }
    } catch (err) {
      console.error(`[Embed Backfill] Batch error:`, err.message);
      errors += batch.length;
    }
  }

  res.json({ ok: true, processed, errors, total: missing.length });
});

// POST /api/fingerprints/blind-test — Split a player's data and test if system can re-identify
router.post('/blind-test', requireApiKey, (req, res) => {
  const { battleTag } = req.body;
  if (!battleTag) return res.status(400).json({ error: 'battleTag required' });

  const rows = getPlayerFingerprints(battleTag);
  const minGames = parseInt(req.body.minGames) || 8;
  if (rows.length < minGames) {
    return res.status(400).json({ error: `Need at least ${minGames} fingerprints, found ${rows.length}`, battleTag });
  }

  // Shuffle and split into two halves
  const shuffled = [...rows].sort(() => Math.random() - 0.5);
  const half = Math.floor(shuffled.length / 2);
  const groupA = shuffled.slice(0, half); // stays as real tag
  const groupB = shuffled.slice(half);    // becomes "Mystery#99999"

  // Compute everything in-memory — no DB mutations needed

  // Parse all fingerprints for groupA (the "known" set)
  const groupAFps = groupA.map(parseDbFingerprint);
  const avgA = averageFingerprints(groupAFps);
  const groupAEmbs = groupA.map(r => tryParse(r.embedding)).filter(Boolean);
  const avgEmbA = averageEmbeddings(groupAEmbs);
  const raceA = groupA[0]?.race;

  // Parse all fingerprints for groupB (the "mystery" set)
  const groupBFps = groupB.map(parseDbFingerprint);
  const avgB = averageFingerprints(groupBFps);
  const groupBEmbs = groupB.map(r => tryParse(r.embedding)).filter(Boolean);
  const avgEmbB = averageEmbeddings(groupBEmbs);

  // Compute similarity between groupA and groupB (should be high if system works)
  const selfSim = computeHybridSimilarity(avgA, avgB, avgEmbA, avgEmbB);
  const selfBreakdown = computeServerBreakdown(avgA, avgB);

  // Now compare groupB against ALL other players
  const allRows = getAllAveragedFingerprintsWithEmbeddings();
  const results = [];

  for (const row of allRows) {
    // Skip the test player entirely (both halves should be excluded)
    if (row.battle_tag === battleTag) continue;

    const { fp: avgFp, embedding: avgEmb } = parseAveragedRowWithEmbedding(row);
    if (!avgFp) continue;

    const hybrid = computeHybridSimilarity(avgB, avgFp, avgEmbB, avgEmb);
    const breakdown = computeServerBreakdown(avgB, avgFp);

    results.push({
      battleTag: row.battle_tag,
      race: row.race,
      replayCount: row.replay_count,
      similarity: Math.round(hybrid.similarity * 1000) / 1000,
      hybrid: hybrid.hybrid,
      breakdown: formatBreakdown(breakdown, hybrid),
    });
  }

  results.sort((a, b) => b.similarity - a.similarity);

  // Insert the "self" match result
  const selfResult = {
    battleTag: `${battleTag} (other half)`,
    race: raceA,
    replayCount: groupA.length,
    similarity: Math.round(selfSim.similarity * 1000) / 1000,
    hybrid: selfSim.hybrid,
    breakdown: formatBreakdown(selfBreakdown, selfSim),
  };

  // Find where the self-match would rank
  let rank = 1;
  for (const r of results) {
    if (selfResult.similarity >= r.similarity) break;
    rank++;
  }

  // Insert self into ranked list
  results.splice(rank - 1, 0, selfResult);

  res.json({
    test: {
      battleTag,
      totalFingerprints: rows.length,
      groupASize: groupA.length,
      groupBSize: groupB.length,
      groupAEmbeddings: groupAEmbs.length,
      groupBEmbeddings: groupBEmbs.length,
    },
    selfMatch: {
      rank,
      outOf: results.length,
      similarity: selfResult.similarity,
      breakdown: selfResult.breakdown,
    },
    verdict: rank === 1 ? 'PASS — Correctly identified as #1 match'
      : rank <= 3 ? `PARTIAL — Ranked #${rank} (top 3)`
      : `FAIL — Ranked #${rank} out of ${results.length}`,
    topResults: results.slice(0, 10),
  });
});

// GET /api/fingerprints/calibration — Population similarity distribution stats
router.get('/calibration', requireApiKey, (req, res) => {
  const cal = getCalibration();
  if (!cal) {
    return res.json({ available: false, reason: 'Not enough players (need 5+)' });
  }

  // Compute histogram buckets for the frontend
  const buckets = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
  const histogram = Array(buckets.length - 1).fill(0);
  for (const s of cal.scores) {
    const idx = Math.min(Math.floor(s * 10), 9);
    histogram[idx]++;
  }

  res.json({
    available: true,
    mean: r3(cal.mean),
    stddev: r3(cal.stddev),
    playerCount: cal.playerCount,
    pairCount: cal.pairCount,
    min: r3(cal.scores[0]),
    max: r3(cal.scores[cal.scores.length - 1]),
    p25: r3(cal.scores[Math.floor(cal.pairCount * 0.25)]),
    p50: r3(cal.scores[Math.floor(cal.pairCount * 0.50)]),
    p75: r3(cal.scores[Math.floor(cal.pairCount * 0.75)]),
    p90: r3(cal.scores[Math.floor(cal.pairCount * 0.90)]),
    p95: r3(cal.scores[Math.floor(cal.pairCount * 0.95)]),
    p99: r3(cal.scores[Math.floor(cal.pairCount * 0.99)]),
    histogram: histogram.map((count, i) => ({
      range: `${(buckets[i] * 100).toFixed(0)}-${(buckets[i + 1] * 100).toFixed(0)}%`,
      count,
    })),
  });
});

// GET /api/fingerprints/embedding-map — 2D PCA projection of all player embeddings (no auth)
router.get('/embedding-map', (req, res) => {
  const allRows = getAllAveragedFingerprintsWithEmbeddings();
  if (allRows.length < 3) {
    return res.json({ players: [], pca: null });
  }

  // Parse all players with embeddings
  const players = [];
  for (const row of allRows) {
    const { fp, embedding } = parseAveragedRowWithEmbedding(row);
    if (!embedding || embedding.length === 0) continue;
    players.push({
      battleTag: row.battle_tag,
      race: row.race,
      replayCount: row.replay_count,
      embedding,
    });
  }

  if (players.length < 3) {
    return res.json({ players: [], pca: null });
  }

  const dim = players[0].embedding.length;
  const n = players.length;

  // Center the data (subtract mean per dimension)
  const mean = new Array(dim).fill(0);
  for (const p of players) {
    for (let d = 0; d < dim; d++) mean[d] += p.embedding[d];
  }
  for (let d = 0; d < dim; d++) mean[d] /= n;

  const centered = players.map(p =>
    p.embedding.map((v, d) => v - mean[d])
  );

  // Power iteration to find top 2 principal components
  function powerIteration(data, numComponents) {
    const components = [];
    const residual = data.map(row => [...row]);

    for (let c = 0; c < numComponents; c++) {
      // Random init
      let vec = new Array(dim).fill(0).map(() => Math.random() - 0.5);
      let norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
      vec = vec.map(v => v / norm);

      for (let iter = 0; iter < 100; iter++) {
        // Multiply: A^T * A * vec
        const proj = residual.map(row => row.reduce((s, v, d) => s + v * vec[d], 0));
        const newVec = new Array(dim).fill(0);
        for (let i = 0; i < n; i++) {
          for (let d = 0; d < dim; d++) {
            newVec[d] += residual[i][d] * proj[i];
          }
        }
        norm = Math.sqrt(newVec.reduce((s, v) => s + v * v, 0)) || 1;
        vec = newVec.map(v => v / norm);
      }

      components.push(vec);

      // Deflate: remove this component from residual
      const scores = residual.map(row => row.reduce((s, v, d) => s + v * vec[d], 0));
      for (let i = 0; i < n; i++) {
        for (let d = 0; d < dim; d++) {
          residual[i][d] -= scores[i] * vec[d];
        }
      }
    }

    return components;
  }

  const pcs = powerIteration(centered, 2);

  // Project each player onto the 2 PCs
  const points = players.map((p, i) => {
    const x = centered[i].reduce((s, v, d) => s + v * pcs[0][d], 0);
    const y = centered[i].reduce((s, v, d) => s + v * pcs[1][d], 0);
    return {
      battleTag: p.battleTag,
      race: p.race,
      replayCount: p.replayCount,
      x: Math.round(x * 1000) / 1000,
      y: Math.round(y * 1000) / 1000,
    };
  });

  // Compute variance explained (approximate)
  const totalVar = centered.reduce((s, row) => s + row.reduce((ss, v) => ss + v * v, 0), 0);
  const pc1Var = points.reduce((s, p) => s + p.x * p.x, 0);
  const pc2Var = points.reduce((s, p) => s + p.y * p.y, 0);

  res.json({
    players: points,
    pca: {
      varianceExplained: [
        Math.round((pc1Var / totalVar) * 1000) / 10,
        Math.round((pc2Var / totalVar) * 1000) / 10,
      ],
      playerCount: n,
    },
  });
});

// GET /api/fingerprints/stats
router.get('/stats', requireApiKey, async (req, res) => {
  const dbStats = getFingerprintCount();
  const missing = getReplaysWithoutFingerprints();
  const missingEmbeddings = getFingerprintsWithoutEmbeddings();
  const sidecarUp = await checkSidecar();
  const cal = getCalibration();
  res.json({
    ...dbStats,
    replaysWithoutFingerprints: missing.length,
    fingerprintsWithoutEmbeddings: missingEmbeddings.length,
    embedSidecar: sidecarUp ? 'available' : 'unavailable',
    calibration: cal ? {
      mean: r3(cal.mean),
      stddev: r3(cal.stddev),
      playerCount: cal.playerCount,
      pairCount: cal.pairCount,
    } : null,
  });
});

export default router;
