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
  getPlayerActionDataByReplayIds,
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
  detectPersonas,
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

/**
 * Build action profile (transition pairs, group usage, compositions, action counts)
 * from raw action rows. Extracted from the profile endpoint for reuse.
 */
function computeActionProfile(actionRows) {
  let transitionPairs = [];
  let groupUsage = [];
  let groupCompositions = {};
  let actionCounts = null;

  if (actionRows.length === 0) return { transitionPairs, groupUsage, groupCompositions, actionCounts };

  const allSeqs = actionRows.map(r => tryParse(r.full_action_sequence)).filter(a => a && a.length > 1);
  const groupTransitions = {};
  const groupStats = {};
  // Track rapid vs functional switches: rapid = <500ms with no real actions between
  const RAPID_MS = 500;
  const switchTiming = {}; // key -> { rapid: n, functional: n, gaps: number[] }

  for (const seq of allSeqs) {
    let lastGroup = null;
    let lastSwitchMs = null;
    let actionsBetween = 0; // non-hotkey actions since last group switch
    for (const a of seq) {
      if (a.ms < 120000) continue;
      const isHotkey = (a.id === 0x17 || a.id === 0x18 || a.id === 23 || a.id === 24) && a.g != null;
      if (isHotkey) {
        const isAssign = (a.id === 0x17 || a.id === 23);
        if (!groupStats[a.g]) groupStats[a.g] = { used: 0, assigned: 0 };
        if (isAssign) groupStats[a.g].assigned++;
        else groupStats[a.g].used++;
        if (lastGroup !== null && lastGroup !== a.g) {
          const key = `${lastGroup}->${a.g}`;
          groupTransitions[key] = (groupTransitions[key] || 0) + 1;
          // Classify as rapid tick or functional switch
          if (lastSwitchMs !== null) {
            const gap = a.ms - lastSwitchMs;
            if (!switchTiming[key]) switchTiming[key] = { rapid: 0, functional: 0, gaps: [] };
            if (gap < RAPID_MS && actionsBetween === 0) {
              switchTiming[key].rapid++;
            } else {
              switchTiming[key].functional++;
            }
            switchTiming[key].gaps.push(gap);
          }
        }
        lastGroup = a.g;
        lastSwitchMs = a.ms;
        actionsBetween = 0;
      } else {
        actionsBetween++;
      }
    }
  }

  transitionPairs = Object.entries(groupTransitions)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([k, v]) => {
      const pair = { from: parseInt(k), to: parseInt(k.split('->')[1]), count: v };
      const timing = switchTiming[k];
      if (timing && (timing.rapid + timing.functional) > 0) {
        const total = timing.rapid + timing.functional;
        pair.rapidPct = Math.round((timing.rapid / total) * 100);
        pair.medianGapMs = timing.gaps.length > 0
          ? timing.gaps.sort((a, b) => a - b)[Math.floor(timing.gaps.length / 2)]
          : null;
      }
      return pair;
    });

  groupUsage = Object.entries(groupStats)
    .map(([g, s]) => ({ group: parseInt(g), used: s.used, assigned: s.assigned }))
    .sort((a, b) => (b.used + b.assigned) - (a.used + a.assigned));

  // Aggregate group compositions
  const groupUnitCounts = {};
  for (const r of actionRows) {
    const comp = tryParse(r.group_compositions);
    if (!comp) continue;
    for (const [g, units] of Object.entries(comp)) {
      if (!groupUnitCounts[g]) groupUnitCounts[g] = {};
      for (const unitId of units) {
        if (!unitId) continue;
        groupUnitCounts[g][unitId] = (groupUnitCounts[g][unitId] || 0) + 1;
      }
    }
  }
  for (const [g, counts] of Object.entries(groupUnitCounts)) {
    const sorted = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([unitId, count]) => ({ id: unitId, count }));
    if (sorted.length > 0) groupCompositions[g] = sorted;
  }

  // ── Compute high-signal metrics from action sequences ──
  let totalAssigns = 0, totalSelects = 0, totalTab = 0;
  const allGaps = [];  // inter-action intervals for rhythm

  for (const seq of allSeqs) {
    let prevMs = null;
    for (const a of seq) {
      if (a.ms < 120000) continue;
      // Rhythm: gaps between any consecutive actions
      if (prevMs !== null) {
        const gap = a.ms - prevMs;
        if (gap > 0 && gap < 5000) allGaps.push(gap); // cap at 5s to exclude AFK
      }
      prevMs = a.ms;
      // Count action types from sequence (more reliable than DB columns)
      const id = a.id;
      if ((id === 0x17 || id === 23) && a.g != null) totalAssigns++;
      if ((id === 0x18 || id === 24) && a.g != null) totalSelects++;
      if (id === 0x19 || id === 25) totalTab++;
    }
  }

  // Action counts (per-minute averages)
  const totals = { removeunit: 0, basic: 0, totalDuration: 0 };
  for (const r of actionRows) {
    totals.removeunit += r.removeunit || 0;
    totals.basic += r.basic || 0;
    totals.totalDuration += r.game_duration || 0;
  }
  const avgMins = totals.totalDuration > 0 ? totals.totalDuration / 60 : 1;

  // Rhythm stats
  let rhythmMeanMs = null, rhythmMedianMs = null, rhythmStdMs = null;
  if (allGaps.length > 10) {
    allGaps.sort((a, b) => a - b);
    rhythmMeanMs = Math.round(allGaps.reduce((s, g) => s + g, 0) / allGaps.length);
    rhythmMedianMs = allGaps[Math.floor(allGaps.length / 2)];
    const variance = allGaps.reduce((s, g) => s + (g - rhythmMeanMs) ** 2, 0) / allGaps.length;
    rhythmStdMs = Math.round(Math.sqrt(variance));
  }

  // Reassign ratio: what % of group actions are reassigns vs selects
  const totalGroupActions = totalAssigns + totalSelects;
  const reassignRatio = totalGroupActions > 0 ? Math.round((totalAssigns / totalGroupActions) * 100) : 0;

  actionCounts = {
    // Tier 1 signal
    assignPerMin: +(totalAssigns / avgMins).toFixed(1),
    selectPerMin: +(totalSelects / avgMins).toFixed(1),
    reassignRatio,
    tabPerMin: +(totalTab / avgMins).toFixed(1),
    rhythmMeanMs,
    rhythmMedianMs,
    rhythmStdMs,
    // Tier 2
    attackMovePerMin: +(totals.basic / avgMins).toFixed(1),
    cancelPerMin: +(totals.removeunit / avgMins).toFixed(1),
    replayCount: actionRows.length,
  };

  return { transitionPairs, groupUsage, groupCompositions, actionCounts };
}

// GET /api/fingerprints/explore/players — Public player directory (no auth)
router.get('/explore/players', (req, res) => {
  const players = getIndexedPlayers();
  res.json({ players });
});

// GET /api/fingerprints/explore/similar/:battleTag?limit=5 — Public nearest neighbors (no auth)
router.get('/explore/similar/:battleTag', (req, res) => {
  const { battleTag } = req.params;
  const limit = Math.min(parseInt(req.query.limit) || 5, 5);

  const queryRows = getPlayerFingerprints(battleTag);
  if (queryRows.length === 0) {
    return res.status(404).json({ error: 'No fingerprints found for player', battleTag });
  }

  const queryFps = queryRows.map(parseDbFingerprint);
  const queryAvg = averageFingerprints(queryFps);
  const queryRace = queryRows[0].race;

  const queryEmbeddings = queryRows.map(r => tryParse(r.embedding)).filter(Boolean);
  const queryAvgEmb = averageEmbeddings(queryEmbeddings);

  const allRows = getAllAveragedFingerprintsWithEmbeddings();
  const results = [];

  for (const row of allRows) {
    if (row.battle_tag === battleTag) continue;

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
      _segments: avgFp.segments, // keep for glyph enrichment, stripped before response
    });
  }

  results.sort((a, b) => b.similarity - a.similarity);

  const cal = getCalibration();
  const topResults = results.slice(0, limit);

  if (cal) {
    for (const r of topResults) {
      r.percentile = scoreToPercentile(r.similarity, cal);
    }
  }

  // Enrich top results with glyph data (transition pairs, group usage, compositions, APM)
  for (const r of topResults) {
    const actionRows = getPlayerActionData(r.battleTag);
    if (actionRows.length > 0) {
      const { transitionPairs, groupUsage, groupCompositions } = computeActionProfile(actionRows);
      r.glyph = { transitionPairs, groupUsage, groupCompositions };
    }
    // Include APM segment for mini glyph center display
    if (r._segments?.apm) {
      r.segments = { apm: r._segments.apm };
    }
    delete r._segments;
  }

  res.json({
    query: { battleTag, race: queryRace, replayCount: queryRows.length },
    similar: topResults,
  });
});

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

  // Build action profile from raw action sequences
  const actionRows = getPlayerActionData(battleTag);
  const { transitionPairs, groupUsage, groupCompositions, actionCounts } = computeActionProfile(actionRows);

  res.json({
    battleTag,
    replayCount: rows.length,
    embeddingCount: embeddings.length,
    confidence,
    averaged: avgFp,
    averagedEmbedding: avgEmb,
    transitionPairs,
    groupUsage,
    groupCompositions,
    actionCounts,
  });
});

// GET /api/fingerprints/profile/:battleTag/personas — Detect account sharing (public)
router.get('/profile/:battleTag/personas', (req, res) => {
  const { battleTag } = req.params;

  const rows = getPlayerFingerprints(battleTag);
  if (rows.length === 0) {
    return res.status(404).json({ error: 'No fingerprints found', battleTag });
  }

  const fingerprints = rows.map(parseDbFingerprint);
  const confidence = computeConfidence(fingerprints);

  const result = detectPersonas(fingerprints);
  if (!result) {
    return res.json({
      split: false,
      reason: fingerprints.length < 4 ? 'Too few replays' : 'No meaningful split detected',
      replayCount: rows.length,
      selfConsistency: confidence.selfConsistency,
    });
  }

  const { labels, silhouette, clusterSizes, interClusterSimilarity, interClusterBreakdown } = result;

  // Partition replay IDs by cluster
  const clusterReplayIds = [[], []];
  const clusterDates = [[], []];
  for (let i = 0; i < rows.length; i++) {
    const c = labels[i];
    clusterReplayIds[c].push(rows[i].replay_id);
    if (rows[i].match_date) clusterDates[c].push(rows[i].match_date);
  }

  // Build per-cluster averaged fingerprints
  const clusterFps = [
    fingerprints.filter((_, i) => labels[i] === 0),
    fingerprints.filter((_, i) => labels[i] === 1),
  ];
  const avgFps = clusterFps.map(fps => averageFingerprints(fps));

  // Build per-cluster embeddings
  const clusterEmbs = [
    rows.filter((_, i) => labels[i] === 0).map(r => tryParse(r.embedding)).filter(Boolean),
    rows.filter((_, i) => labels[i] === 1).map(r => tryParse(r.embedding)).filter(Boolean),
  ];
  const avgEmbs = clusterEmbs.map(embs => averageEmbeddings(embs));

  // Build per-cluster action profiles
  const clusterActionRows = [
    getPlayerActionDataByReplayIds(battleTag, clusterReplayIds[0]),
    getPlayerActionDataByReplayIds(battleTag, clusterReplayIds[1]),
  ];
  const clusterProfiles = clusterActionRows.map(rows => computeActionProfile(rows));

  // Top divergences — segments where the two personas differ most
  const SEGMENT_NAMES = ['action', 'apm', 'hotkey', 'tempo', 'intensity', 'transitions', 'rhythm'];
  const topDivergences = [];
  if (interClusterBreakdown) {
    for (const seg of SEGMENT_NAMES) {
      const sim = interClusterBreakdown[seg];
      if (sim != null) {
        topDivergences.push({ segment: seg, similarity: r3(sim), divergence: r3(1 - sim) });
      }
    }
    topDivergences.sort((a, b) => b.divergence - a.divergence);
  }

  // Date ranges per cluster
  const dateRanges = clusterDates.map(dates => {
    if (dates.length === 0) return null;
    const sorted = [...dates].sort();
    return { earliest: sorted[0], latest: sorted[sorted.length - 1] };
  });

  // Build persona response objects (same shape as profile endpoint)
  const personas = [0, 1].map(c => ({
    battleTag,
    replayCount: clusterSizes[c],
    embeddingCount: clusterEmbs[c].length,
    confidence: computeConfidence(clusterFps[c]),
    averaged: avgFps[c],
    averagedEmbedding: avgEmbs[c],
    ...clusterProfiles[c],
    dateRange: dateRanges[c],
  }));

  res.json({
    split: true,
    silhouette: r3(silhouette),
    clusterSizes,
    interClusterSimilarity: r3(interClusterSimilarity),
    topDivergences: topDivergences.slice(0, 5),
    personas,
  });
});

// GET /api/fingerprints/gallery — Public gallery of player extremes (no auth)
router.get('/gallery', (req, res) => {
  const allRows = getAllAveragedFingerprintsWithEmbeddings();
  if (allRows.length === 0) {
    return res.json({ players: [] });
  }

  const players = [];
  for (const row of allRows) {
    if (row.replay_count < 2) continue;

    const { fp } = parseAveragedRowWithEmbedding(row);
    if (!fp) continue;

    // Extract metrics from fingerprint segments
    const apmSeg = fp.segments.apm || []; // [meanNorm, stdNorm, burstiness]
    const meanApm = Math.round((apmSeg[0] || 0) * 300); // denormalize
    const burstiness = r3(apmSeg[2] || 0);

    const actionSeg = fp.segments.action || []; // [rc, ability, build, item, selecthk, assigngrp]
    const totalAction = actionSeg.reduce((a, b) => a + b, 0) || 1;
    const selectPct = Math.round(((actionSeg[4] || 0) / totalAction) * 100);
    const abilityPct = Math.round(((actionSeg[1] || 0) / totalAction) * 100);
    const rightclickPct = Math.round(((actionSeg[0] || 0) / totalAction) * 100);

    const hotkeySeg = fp.segments.hotkey || []; // [used0-9, assigned0-9]
    let activeGroups = 0;
    for (let i = 0; i < 10; i++) {
      if ((hotkeySeg[i] || 0) > 0.02 || (hotkeySeg[i + 10] || 0) > 0.02) activeGroups++;
    }

    // Check if buildings are on hotkeys (assign activity on groups 6-9 suggests buildings)
    const buildingsOnHotkey = [6, 7, 8, 9].some(g => (hotkeySeg[g + 10] || 0) > 0.05);

    // Rhythm segment: oscillation and rapid switching
    const rhythmSeg = fp.segments.rhythm || [];
    const oscillation = r3(rhythmSeg[10] || 0); // oscillation index
    const rapidSwitchPct = Math.round((rhythmSeg[12] || 0) * 100); // rapid switch ratio

    // Get action counts from raw data
    const actionRows = getPlayerActionData(row.battle_tag);
    let escPerMin = 0, tabPerMin = 0, attackMovePerMin = 0, cancelPerMin = 0;
    let selfConsistency = null;

    if (actionRows.length > 0) {
      const { actionCounts } = computeActionProfile(actionRows);
      if (actionCounts) {
        tabPerMin = actionCounts.tabPerMin || 0;
        attackMovePerMin = actionCounts.attackMovePerMin || 0;
        cancelPerMin = actionCounts.cancelPerMin || 0;
      }
      // ESC per min from raw esc counts
      let totalEsc = 0, totalDuration = 0;
      for (const r of actionRows) {
        totalEsc += r.esc || 0;
        totalDuration += r.game_duration || 0;
      }
      const avgMins = totalDuration > 0 ? totalDuration / 60 : 1;
      escPerMin = +(totalEsc / avgMins).toFixed(1);
    }

    // Self-consistency from transitions segment (mean of segment = smoothness)
    const transSeg = fp.segments.transitions || [];
    if (transSeg.length > 0) {
      selfConsistency = r3(transSeg.reduce((a, b) => a + b, 0) / transSeg.length);
    }

    players.push({
      battleTag: row.battle_tag,
      race: row.race,
      replayCount: row.replay_count,
      metrics: {
        meanApm,
        burstiness,
        activeGroups,
        escPerMin,
        tabPerMin,
        attackMovePerMin,
        cancelPerMin,
        selectPct,
        abilityPct,
        rightclickPct,
        rapidSwitchPct,
        buildingsOnHotkey,
        oscillation,
      },
    });
  }

  res.json({ players });
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

// Seeded LCG PRNG for deterministic PCA
function seededLCG(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xFFFFFFFF;
    return (s >>> 0) / 0xFFFFFFFF;
  };
}

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

  // Power iteration to find top 2 principal components (seeded for determinism)
  function powerIteration(data, numComponents) {
    const rand = seededLCG(42);
    const components = [];
    const residual = data.map(row => [...row]);

    for (let c = 0; c < numComponents; c++) {
      // Seeded random init
      let vec = new Array(dim).fill(0).map(() => rand() - 0.5);
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

  // Build a map from battleTag → averaged fingerprint for glyph data
  const glyphFpLookup = {};
  for (const row of allRows) {
    const { fp } = parseAveragedRowWithEmbedding(row);
    if (fp) glyphFpLookup[row.battle_tag] = fp;
  }

  // Project each player onto the 2 PCs
  const r2 = v => Math.round(v * 100) / 100;
  const points = players.map((p, i) => {
    const x = centered[i].reduce((s, v, d) => s + v * pcs[0][d], 0);
    const y = centered[i].reduce((s, v, d) => s + v * pcs[1][d], 0);
    const fp = glyphFpLookup[p.battleTag];
    const glyph = fp ? {
      hotkey: fp.segments.hotkey.slice(0, 10).map(r2),
      apm: r2(fp.segments.apm[0] || 0),
      action: fp.segments.action.slice(0, 6).map(r2),
    } : null;
    return {
      battleTag: p.battleTag,
      race: p.race,
      replayCount: p.replayCount,
      x: Math.round(x * 1000) / 1000,
      y: Math.round(y * 1000) / 1000,
      glyph,
    };
  });

  // Compute variance explained (approximate)
  const totalVar = centered.reduce((s, row) => s + row.reduce((ss, v) => ss + v * v, 0), 0);
  const pc1Var = points.reduce((s, p) => s + p.x * p.x, 0);
  const pc2Var = points.reduce((s, p) => s + p.y * p.y, 0);

  // Round PCA basis for transport (6 decimal places)
  const r6 = v => Math.round(v * 1e6) / 1e6;

  // ── Axis interpretation: correlate PC coordinates with fingerprint segments ──
  // For each player, get their averaged handcrafted fingerprint segments,
  // then compute Pearson correlation of x/y with each segment's mean value.
  const SEGMENT_NAMES = ['action', 'apm', 'hotkey', 'tempo', 'intensity', 'transitions', 'rhythm'];
  const SEGMENT_LABELS = {
    action: 'Actions',
    apm: 'APM',
    hotkey: 'Hotkeys',
    tempo: 'Tempo',
    intensity: 'Intensity',
    transitions: 'Switching',
    rhythm: 'Rhythm',
  };

  // Build a lookup from battleTag → averaged fingerprint
  const fpLookup = {};
  for (const row of allRows) {
    const { fp } = parseAveragedRowWithEmbedding(row);
    if (fp) fpLookup[row.battle_tag] = fp;
  }

  function pearson(xs_, ys_) {
    const n_ = xs_.length;
    if (n_ < 3) return 0;
    const mx = xs_.reduce((a, b) => a + b, 0) / n_;
    const my = ys_.reduce((a, b) => a + b, 0) / n_;
    let num = 0, dx2 = 0, dy2 = 0;
    for (let i = 0; i < n_; i++) {
      const dx = xs_[i] - mx;
      const dy = ys_[i] - my;
      num += dx * dy;
      dx2 += dx * dx;
      dy2 += dy * dy;
    }
    const denom = Math.sqrt(dx2 * dy2);
    return denom > 0 ? num / denom : 0;
  }

  // For each segment, compute mean value per player, then correlate with x and y
  const axisCorrelations = { pc1: [], pc2: [] };
  const pcXs = points.map(p => p.x);
  const pcYs = points.map(p => p.y);

  for (const seg of SEGMENT_NAMES) {
    // Mean of this segment across its dimensions for each player
    const segMeans = points.map(p => {
      const fp = fpLookup[p.battleTag];
      if (!fp?.segments?.[seg]) return 0;
      const arr = fp.segments[seg];
      return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    });
    const corrX = pearson(pcXs, segMeans);
    const corrY = pearson(pcYs, segMeans);
    axisCorrelations.pc1.push({ segment: seg, label: SEGMENT_LABELS[seg], r: r3(corrX) });
    axisCorrelations.pc2.push({ segment: seg, label: SEGMENT_LABELS[seg], r: r3(corrY) });
  }

  // Sort by absolute correlation strength
  axisCorrelations.pc1.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
  axisCorrelations.pc2.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));

  res.json({
    players: points,
    pca: {
      varianceExplained: [
        Math.round((pc1Var / totalVar) * 1000) / 10,
        Math.round((pc2Var / totalVar) * 1000) / 10,
      ],
      playerCount: n,
      mean: mean.map(r6),
      components: pcs.map(pc => pc.map(r6)),
      axisCorrelations,
    },
  });
});

// ── Suspects Cache ──────────────────────────────────
let suspectsCache = null;
let suspectsAge = 0;

function getSuspectsData() {
  const now = Date.now();
  if (suspectsCache && (now - suspectsAge) < CALIBRATION_TTL) {
    return suspectsCache;
  }

  const allRows = getAllAveragedFingerprintsWithEmbeddings();
  if (allRows.length < 5) return null;

  const players = allRows.map(row => {
    const { fp, embedding } = parseAveragedRowWithEmbedding(row);
    return { battleTag: row.battle_tag, race: row.race, replayCount: row.replay_count, fp, embedding };
  }).filter(p => p.fp);

  const scoredPairs = [];
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const hybrid = computeHybridSimilarity(
        players[i].fp, players[j].fp,
        players[i].embedding, players[j].embedding
      );
      scoredPairs.push({ i, j, ...hybrid });
    }
  }
  scoredPairs.sort((a, b) => b.similarity - a.similarity);

  suspectsCache = { players, scoredPairs };
  suspectsAge = now;
  return suspectsCache;
}

// GET /api/fingerprints/suspects — Top similar player pairs (public, no auth)
router.get('/suspects', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);

  const data = getSuspectsData();
  if (!data) {
    return res.json({ pairs: [], playerCount: 0 });
  }

  const { players, scoredPairs } = data;
  const cal = getCalibration();

  const pairs = scoredPairs.slice(0, limit).map(p => {
    const pA = players[p.i], pB = players[p.j];
    const breakdown = computeServerBreakdown(pA.fp, pB.fp);
    return {
      tagA: pA.battleTag,
      tagB: pB.battleTag,
      raceA: pA.race,
      raceB: pB.race,
      replaysA: pA.replayCount,
      replaysB: pB.replayCount,
      similarity: r3(p.similarity),
      handcrafted: r3(p.handcrafted),
      embedding: r3(p.embedding),
      percentile: cal ? scoreToPercentile(p.similarity, cal) : null,
      breakdown: formatBreakdown(breakdown, p),
    };
  });

  res.json({
    pairs,
    playerCount: players.length,
    totalPairs: scoredPairs.length,
    calibration: cal ? { mean: r3(cal.mean), stddev: r3(cal.stddev) } : null,
  });
});

// GET /api/fingerprints/embeddings/:battleTag — Per-replay raw embeddings (no auth)
router.get('/embeddings/:battleTag', (req, res) => {
  const { battleTag } = req.params;
  const rows = getPlayerFingerprints(battleTag);

  if (rows.length === 0) {
    return res.status(404).json({ error: 'No fingerprints found', battleTag });
  }

  const replays = [];
  for (const row of rows) {
    const emb = tryParse(row.embedding);
    if (!emb || emb.length === 0) continue;
    replays.push({
      replayId: row.replay_id,
      matchDate: row.match_date,
      mapName: row.map_name,
      gameDuration: row.game_duration,
      embedding: emb,
    });
  }

  res.json({ battleTag, replays });
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
