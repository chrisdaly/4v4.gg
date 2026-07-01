import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { createHash } from 'crypto';
import { readFileSync, mkdirSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import config from '../config.js';
import {
  getPlayerFingerprints,
  getPlayerFingerprintsByName,
  getPlayerFingerprintsFiltered,
  getAllAveragedFingerprintsWithEmbeddings,
  getAllAveragedFingerprints,
  getFingerprintCount,
  getIndexedPlayers,
  getReplaysWithoutFingerprints,
  getReplayPlayerActions,
  getReplayPlayers,
  insertPlayerFingerprints,
  getFingerprintsWithoutEmbeddings,
  countFingerprintsWithoutEmbeddings,
  updateFingerprintEmbedding,
  getPlayerActionData,
  getPlayerActionDataTop,
  getPlayerActionDataTopFiltered,
  getPlayerActionDataByName,
  getPlayerActionDataForReplay,
  getPlayerActionDataByReplayIds,
  deleteReplayFingerprints,
  deleteAllFingerprints,
  getAllReplayIds,
  getValidationPairs,
  insertValidationPair,
  deleteValidationPair,
  updateValidationPairNotes,
  insertReplay,
  updateReplayParsed,
  updateReplayError,
  getReplay,
  insertReplayPlayers,
  insertReplayChat,
  getReplayChat,
  insertReplayPlayerActions,
  getReplayByFileHash,
  getReplayByW3cMatchId,
  updatePlayerActionData,
  getPlayersWithoutSequences,
  getReplayMatchesForPlayers,
  getPlayerMessages,
  getPlayerAvgApm,
  getPlayerMostPlayedRace,
  getSharedReplayCount,
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
import { parseReplayFile } from '../replayParser.js';
import { getEmbedding, getEmbeddingBatch, checkSidecar, getUmapProjection, getUmapTransform } from '../embedClient.js';
import { importPlayerMatches, importPlayerMatchesBulk, enqueueImport } from '../replayImporter.js';
import { requireApiKey } from '../middleware/auth.js';

const router = Router();

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
function parseAveragedRow(row) {
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

  return averageFingerprints(fps);
}

function parseAveragedRowWithEmbedding(row) {
  const fp = parseAveragedRow(row);

  let avgEmb = null;
  if (row.embeddings) {
    const embeddings = row.embeddings.split('|||').map(v => tryParse(v)).filter(Boolean);
    avgEmb = averageEmbeddings(embeddings);
  }

  return { fp, embedding: avgEmb };
}

// ── Shared Parsed Players Cache ──────────────────
// Single cache for all parsed player objects — avoids redundant JSON.parse
// across concurrent requests to /embedding-map, /suspects, /explore etc.
let parsedPlayersCache = null;
let parsedPlayersAge = 0;
const PARSED_PLAYERS_TTL = 5 * 60 * 1000; // 5 min

function getParsedPlayers() {
  const now = Date.now();
  if (parsedPlayersCache && (now - parsedPlayersAge) < PARSED_PLAYERS_TTL) {
    return parsedPlayersCache;
  }
  const allRows = getAllAveragedFingerprintsWithEmbeddings();
  const players = allRows.map(row => {
    const { fp, embedding } = parseAveragedRowWithEmbedding(row);
    return { battleTag: row.battle_tag, playerName: row.player_name, race: row.race, replayCount: row.replay_count, fp, embedding };
  }).filter(p => p.fp);
  parsedPlayersCache = players;
  parsedPlayersAge = now;
  return parsedPlayersCache;
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

  let players = getParsedPlayers();
  if (players.length < 5) return null; // need enough players

  // Sample up to 200 players to keep O(n²) manageable (~20K pairs vs 1.6M)
  const MAX_SAMPLE = 200;
  const totalPlayerCount = players.length;
  if (players.length > MAX_SAMPLE) {
    // Deterministic shuffle (seeded) for reproducible calibration
    const rand = seededLCG(12345);
    for (let i = players.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [players[i], players[j]] = [players[j], players[i]];
    }
    players = players.slice(0, MAX_SAMPLE);
  }

  // Compute all pairwise similarities within sample
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

  calibrationCache = { mean, stddev, scores, playerCount: totalPlayerCount, sampleCount: players.length, pairCount: n };
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

  if (actionRows.length === 0) return { transitionPairs, groupUsage, groupCompositions, actionCounts, heroBuilds: {} };

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
    let prevId = null;
    for (const a of seq) {
      if (a.ms < 120000) continue;
      // Rhythm: gaps between any consecutive actions
      if (prevMs !== null) {
        const gap = a.ms - prevMs;
        if (gap > 0 && gap < 5000) allGaps.push(gap); // cap at 5s to exclude AFK
      }
      const id = a.id;
      // Count action types from sequence (more reliable than DB columns)
      if ((id === 0x17 || id === 23) && a.g != null) totalAssigns++;
      if ((id === 0x18 || id === 24) && a.g != null) totalSelects++;
      // 0x19 (SelectSubgroup/Tab) — the game auto-generates one after every
      // group select (0x18) at the same tick. Only count genuine Tab presses.
      // See w3g_actions.txt: "nearly all Select Subgroup actions are autogenerated"
      if (id === 0x19 || id === 25) {
        const autoGenerated = (prevId === 0x18 || prevId === 24) && a.ms === prevMs;
        if (!autoGenerated) totalTab++;
      }
      prevMs = a.ms;
      prevId = id;
    }
  }

  // Surround burst detection: 3+ point/unit-target ability actions (0x11 or 0x12) within 400ms
  // 0x11 = point-target move (terrain click), 0x12 = unit-target move (clicking enemy unit)
  // Both appear in M-key surrounding; real spell-cast bursts are rare at this cadence
  let surroundBursts = 0, surroundTotalClicks = 0;
  for (const seq of allSeqs) {
    const moves = seq.filter(a => a.ms >= 120000 && (a.id === 0x11 || a.id === 0x12));
    for (let i = 0; i < moves.length; i++) {
      const windowEnd = moves[i].ms + 400;
      let count = 1;
      for (let j = i + 1; j < moves.length && moves[j].ms <= windowEnd; j++) count++;
      if (count >= 3) {
        surroundBursts++;
        surroundTotalClicks += count;
        i += count - 1;
      }
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
    surroundPerMin: +(surroundBursts / avgMins).toFixed(1),
    surroundAvgSize: surroundBursts > 0 ? +(surroundTotalClicks / surroundBursts).toFixed(1) : 0,
    replayCount: actionRows.length,
  };

  // Hero ability build order — extracted from stored abilityOrder sequences
  // Groups by hero ID; each entry: { mostCommon, consistency, games, medianFirstLevelMs }
  const heroBuilds = {};
  const heroBuildRaw = {}; // heroId -> { paths, firstLevelTimes }
  for (const r of actionRows) {
    const heroes = tryParse(r.heroes);
    if (!Array.isArray(heroes)) continue;
    for (const hero of heroes) {
      if (!hero?.id || !Array.isArray(hero.abilityOrder)) continue;
      const levelUps = hero.abilityOrder.filter(ao => ao.type === 'ability' && ao.value);
      if (levelUps.length === 0) continue;
      const path = levelUps.map(ao => ao.value).join('-');
      if (!heroBuildRaw[hero.id]) heroBuildRaw[hero.id] = { paths: [], firstLevelTimes: [] };
      heroBuildRaw[hero.id].paths.push(path);
      heroBuildRaw[hero.id].firstLevelTimes.push(levelUps[0].time);
    }
  }
  for (const [heroId, raw] of Object.entries(heroBuildRaw)) {
    if (raw.paths.length === 0) continue;
    const pathCounts = {};
    for (const p of raw.paths) pathCounts[p] = (pathCounts[p] || 0) + 1;
    const [topPath, topCount] = Object.entries(pathCounts).sort((a, b) => b[1] - a[1])[0];
    const sortedTimes = [...raw.firstLevelTimes].sort((a, b) => a - b);
    heroBuilds[heroId] = {
      mostCommon: topPath,
      consistency: Math.round((topCount / raw.paths.length) * 100),
      games: raw.paths.length,
      medianFirstLevelMs: sortedTimes[Math.floor(sortedTimes.length / 2)],
    };
  }

  return { transitionPairs, groupUsage, groupCompositions, actionCounts, heroBuilds };
}

/**
 * Bin a player's full_action_sequence into fixed time windows for timeline display.
 * Returns { bins, binSizeMs } where each bin has counts by action category.
 */
function computeActionTimeline(actionRow, binSizeMs = 5000) {
  const seq = tryParse(actionRow.full_action_sequence);
  if (!seq || seq.length === 0) return { bins: [], binSizeMs };

  const lastMs = seq[seq.length - 1]?.ms ?? 0;
  if (lastMs === 0) return { bins: [], binSizeMs };

  const numBins = Math.ceil(lastMs / binSizeMs) + 1;
  const bins = Array.from({ length: numBins }, (_, i) => ({
    t: i * binSizeMs, cmd: 0, instant: 0, hotkey: 0, assign: 0, select: 0, other: 0,
  }));

  for (const a of seq) {
    const binIdx = Math.floor(a.ms / binSizeMs);
    if (binIdx < 0 || binIdx >= numBins) continue;
    // 0x19 (Tab): nearly all are auto-generated by the game immediately after 0x18 group selects
    // at the same timestamp — not real player actions. 0x68 (ping): not counted by w3gjs APM.
    if (a.id === 0x19 || a.id === 0x68) continue;
    const b = bins[binIdx];
    // cmd: right-click move/attack (point or unit target)
    if (a.id === 0x11 || a.id === 0x12) b.cmd++;
    // instant: no-target / complex abilities (stop, hold, instant spells)
    else if (a.id === 0x10 || a.id === 0x13 || a.id === 0x14) b.instant++;
    // hotkey: select group (press number key)
    else if (a.id === 0x18) b.hotkey++;
    // assign: assign group (ctrl+number)
    else if (a.id === 0x17) b.assign++;
    // select: selection box / click select
    else if (a.id === 0x16) b.select++;
    // other: esc, menus, cancel queue
    else b.other++;
  }

  return { bins, binSizeMs };
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

  const allPlayers = getParsedPlayers();
  const results = [];

  for (const p of allPlayers) {
    if (p.battleTag === battleTag) continue;

    const hybrid = computeHybridSimilarity(queryAvg, p.fp, queryAvgEmb, p.embedding);
    const breakdown = computeServerBreakdown(queryAvg, p.fp);

    results.push({
      battleTag: p.battleTag,
      playerName: p.playerName,
      race: p.race,
      replayCount: p.replayCount,
      similarity: Math.round(hybrid.similarity * 1000) / 1000,
      hybrid: hybrid.hybrid,
      breakdown: formatBreakdown(breakdown, hybrid),
      _segments: p.fp.segments, // keep for glyph enrichment, stripped before response
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
    const allActionRows = getPlayerActionData(r.battleTag);
    const actionRows = allActionRows.slice(0, 10);
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

  // Try battle_tag first, then fall back to player_name (for uploaded replays without full battleTag)
  let rows = minDuration > 0
    ? getPlayerFingerprintsFiltered(battleTag, { minDuration })
    : getPlayerFingerprints(battleTag);

  let lookupByName = false;
  const playerName = battleTag.split('#')[0];

  if (rows.length === 0 && playerName) {
    rows = getPlayerFingerprintsByName(playerName);
    lookupByName = true;
  }

  if (rows.length === 0) {
    return res.status(404).json({ error: 'No fingerprints found', battleTag });
  }

  const fingerprints = rows.map(parseDbFingerprint);
  const avgFp = averageFingerprints(fingerprints);
  const embeddings = rows.map(r => tryParse(r.embedding)).filter(Boolean);
  const avgEmb = averageEmbeddings(embeddings);
  const confidence = computeConfidence(fingerprints);

  // Build action profile from most-recent 300 replays (sequences-first, then by recency).
  // Using a DB-level LIMIT avoids fetching thousands of large JSON blobs.
  const actionRows = lookupByName
    ? getPlayerActionDataByName(playerName).slice(0, 300)
    : getPlayerActionDataTop(battleTag, 300);
  const { transitionPairs, groupUsage, groupCompositions, actionCounts, heroBuilds } = computeActionProfile(actionRows);

  res.json({
    battleTag,
    replayCount: rows.length,
    sampleCount: actionRows.length,
    embeddingCount: embeddings.length,
    confidence,
    averaged: avgFp,
    averagedEmbedding: avgEmb,
    transitionPairs,
    groupUsage,
    groupCompositions,
    actionCounts,
    heroBuilds,
  });
});

// GET /api/fingerprints/profile/:battleTag/replays — Lightweight replay list (public)
router.get('/profile/:battleTag/replays', (req, res) => {
  const { battleTag } = req.params;
  let rows = getPlayerFingerprints(battleTag);

  // Fallback: lookup by player_name if battle_tag lookup fails
  const playerName = battleTag.split('#')[0];
  if (rows.length === 0 && playerName) {
    rows = getPlayerFingerprintsByName(playerName);
  }

  if (rows.length === 0) {
    return res.status(404).json({ error: 'No fingerprints found', battleTag });
  }

  const replays = rows.map(r => ({
    replayId: r.replay_id,
    matchDate: r.match_date,
    uploadedAt: r.uploaded_at,
    mapName: r.map_name,
    gameDuration: r.game_duration,
    race: r.race,
    playerName: r.player_name,
  }));

  res.json({ battleTag, replays });
});

// GET /api/fingerprints/profile/:battleTag/replays/:replayId — Single-replay profile (public)
router.get('/profile/:battleTag/replays/:replayId', (req, res) => {
  const { battleTag, replayId } = req.params;
  const rid = parseInt(replayId);

  let rows = getPlayerFingerprints(battleTag);
  let lookupByName = false;
  const playerName = battleTag.split('#')[0];

  // Fallback: lookup by player_name if battle_tag lookup fails
  if (rows.length === 0 && playerName) {
    rows = getPlayerFingerprintsByName(playerName);
    lookupByName = true;
  }

  const row = rows.find(r => r.replay_id === rid);
  if (!row) {
    return res.status(404).json({ error: 'No fingerprint found for this replay', battleTag, replayId: rid });
  }

  const fp = parseDbFingerprint(row);
  // Use the actual player_name from the row for action data lookup
  const actionRows = lookupByName
    ? getPlayerActionDataByName(playerName, rid)
    : getPlayerActionDataForReplay(battleTag, rid);
  const { transitionPairs, groupUsage, groupCompositions, actionCounts, heroBuilds } = computeActionProfile(actionRows);

  res.json({
    battleTag,
    replayCount: 1,
    averaged: fp,
    transitionPairs,
    groupUsage,
    groupCompositions,
    actionCounts,
    heroBuilds,
    replay: {
      replayId: rid,
      matchDate: row.match_date,
      mapName: row.map_name,
      gameDuration: row.game_duration,
      race: row.race,
    },
  });
});

// GET /api/fingerprints/replay/:replayId/profiles — All player profiles for a replay (public)
router.get('/replay/:replayId/profiles', (req, res) => {
  const replayId = parseInt(req.params.replayId);
  const replay = getReplay(replayId);
  if (!replay) {
    return res.status(404).json({ error: 'Replay not found', replayId });
  }

  const players = getReplayPlayers(replayId);
  const actionRows = getReplayPlayerActions(replayId);
  if (players.length === 0 || actionRows.length === 0) {
    return res.json({ profiles: [] });
  }

  // Match players to action rows 1:1 by index. Both are ordered by player_id,
  // and some replays have duplicate player_ids (e.g. 2v2 where both slots share id=1).
  // Consuming rows in order ensures each player gets their own action data.
  const usedActionIdx = new Set();
  const profiles = [];
  for (const player of players) {
    // Find the first unused action row matching this player_id
    const idx = actionRows.findIndex((a, i) => !usedActionIdx.has(i) && a.player_id === player.player_id);
    if (idx === -1) continue;
    usedActionIdx.add(idx);
    const actionRow = actionRows[idx];

    // Build fingerprint segments from raw action data
    const parsed = {
      rightclick: actionRow.rightclick,
      ability: actionRow.ability,
      buildtrain: actionRow.buildtrain,
      item: actionRow.item,
      selecthotkey: actionRow.selecthotkey,
      assigngroup: actionRow.assigngroup,
      timed_segments: tryParse(actionRow.timed_segments),
      group_hotkeys: tryParse(actionRow.group_hotkeys),
      full_action_sequence: tryParse(actionRow.full_action_sequence),
    };
    const fp = buildServerFingerprint(parsed);

    // Build action profile (transitions, groups, compositions, action counts)
    const { transitionPairs, groupUsage, groupCompositions, actionCounts, heroBuilds } = computeActionProfile([actionRow]);
    const timeline = computeActionTimeline(actionRow);

    profiles.push({
      playerId: player.player_id,
      playerName: player.player_name,
      race: player.race,
      teamId: player.team_id,
      profileData: {
        replayCount: 1,
        averaged: fp,
        transitionPairs,
        groupUsage,
        groupCompositions,
        actionCounts,
        heroBuilds,
        timeline,
      },
    });
  }

  res.json({
    replay: {
      id: replay.id,
      mapName: replay.map_name,
      gameDuration: replay.game_duration,
      matchType: replay.match_type,
      matchDate: replay.match_date,
      filename: replay.filename,
    },
    profiles,
  });
});

// GET /api/fingerprints/match/:matchId — Per-game profiles looked up by W3C match ID
router.get('/match/:matchId', (req, res) => {
  const replay = getReplayByW3cMatchId(req.params.matchId);
  if (!replay) return res.status(404).json({ error: 'No replay for this match' });

  const players = getReplayPlayers(replay.id);
  const actionRows = getReplayPlayerActions(replay.id);
  if (players.length === 0 || actionRows.length === 0) {
    return res.status(404).json({ error: 'Replay has no parsed player data' });
  }

  const usedActionIdx = new Set();
  const profiles = [];
  for (const player of players) {
    const idx = actionRows.findIndex((a, i) => !usedActionIdx.has(i) && a.player_id === player.player_id);
    if (idx === -1) continue;
    usedActionIdx.add(idx);
    const actionRow = actionRows[idx];

    const parsed = {
      rightclick: actionRow.rightclick,
      ability: actionRow.ability,
      buildtrain: actionRow.buildtrain,
      item: actionRow.item,
      selecthotkey: actionRow.selecthotkey,
      assigngroup: actionRow.assigngroup,
      timed_segments: tryParse(actionRow.timed_segments),
      group_hotkeys: tryParse(actionRow.group_hotkeys),
      full_action_sequence: tryParse(actionRow.full_action_sequence),
    };
    const fp = buildServerFingerprint(parsed);
    const { transitionPairs, groupUsage, groupCompositions, actionCounts, heroBuilds } = computeActionProfile([actionRow]);
    const timeline = computeActionTimeline(actionRow);

    profiles.push({
      playerId: player.player_id,
      playerName: player.player_name,
      battleTag: player.battle_tag,
      race: player.race,
      teamId: player.team_id,
      profileData: {
        replayCount: 1,
        averaged: fp,
        transitionPairs,
        groupUsage,
        groupCompositions,
        actionCounts,
        heroBuilds,
        timeline,
      },
    });
  }

  res.json({ replayId: replay.id, profiles });
});

// GET /api/fingerprints/replay/:replayId/chat — Chat log for a replay (public)
router.get('/replay/:replayId/chat', (req, res) => {
  const replayId = parseInt(req.params.replayId);
  if (!getReplay(replayId)) return res.status(404).json({ error: 'Replay not found' });
  const messages = getReplayChat(replayId);
  res.json({ messages: messages.map(m => ({
    playerId: m.player_id,
    playerName: m.player_name,
    message: m.message,
    timeMs: m.time_ms,
    mode: m.mode,
  })) });
});

// GET /api/fingerprints/replay/:replayId/sequence?playerId=N — Raw action sequence (public)
router.get('/replay/:replayId/sequence', (req, res) => {
  const replayId = parseInt(req.params.replayId);
  if (!getReplay(replayId)) return res.status(404).json({ error: 'Replay not found' });

  const filterPlayerId = req.query.playerId != null ? parseInt(req.query.playerId) : null;
  const actionRows = getReplayPlayerActions(replayId);
  const players = getReplayPlayers(replayId);

  // Common WC3 order IDs → human-readable labels
  const ORDER_NAMES = {
    move: 'Move', smart: 'Move', ssto: 'Move',
    amov: 'Atk-Move', Amov: 'Atk-Move',
    satt: 'Attack', Aatk: 'Attack',
    stop: 'Stop', hold: 'Hold', spat: 'Patrol',
    Abun: 'Burrow', Auns: 'Unburrow',
    Abof: 'Blink',
    // Hero abilities — resolved client-side via ABILITY_NAMES map
  };

  const sequences = [];
  for (const row of actionRows) {
    if (filterPlayerId !== null && row.player_id !== filterPlayerId) continue;
    const player = players.find(p => p.player_id === row.player_id);
    const seq = tryParse(row.full_action_sequence) || [];
    sequences.push({
      playerId: row.player_id,
      playerName: player?.player_name || `Player ${row.player_id}`,
      race: player?.race,
      actions: seq.map(a => {
        const entry = { ms: a.ms, id: a.id };
        if (a.g != null) entry.group = a.g;
        // Only expose oid if it's printable ASCII (old replays may have stored non-printable bytes)
        const oid = a.oid && /^[\x20-\x7E]+$/.test(a.oid) ? a.oid : null;
        if (oid) entry.oid = oid;
        if (a.n != null) entry.n = a.n;
        // Build a readable label
        if (a.id === 0x17) entry.label = `Assign Grp ${a.g ?? ''}`;
        else if (a.id === 0x18) entry.label = `Hotkey ${a.g ?? ''}`;
        else if (a.id === 0x16) entry.label = a.n != null ? `Select (${a.n})` : 'Select';
        else if (oid) entry.label = ORDER_NAMES[oid] || oid;
        else if (a.id === 0x19) entry.label = 'Tab';
        else if (a.id === 0x61) entry.label = 'ESC';
        else if (a.id === 0x68) entry.label = 'Ping';
        else if (a.id === 0x66) entry.label = 'Skill Menu';
        else if (a.id === 0x67) entry.label = 'Build Menu';
        else if (a.id === 0x1E) entry.label = 'Cancel';
        else if (a.id === 0x10) entry.label = 'Instant';
        else if (a.id === 0x11 || a.id === 0x13) entry.label = 'Move';     // point-targeted
        else if (a.id === 0x12 || a.id === 0x14) entry.label = 'Attack';   // unit-targeted
        else entry.label = `0x${a.id.toString(16)}`;
        return entry;
      }),
    });
  }

  res.json({ sequences });
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

// ── Gallery Cache ──────────────────────────────────
let galleryCache = null;
let galleryAge = 0;
let galleryBuilding = false;
const GALLERY_TTL = 60 * 60 * 1000; // 1 hour (expensive to compute)

// Fetch W3C 4v4 ladder for MMR lookup
async function fetchLadderMmr() {
  const W3C_API = 'https://website-backend.w3champions.com/api';
  const mmrMap = new Map();
  try {
    // Get current season (10s timeout)
    const sRes = await fetch(`${W3C_API}/ladder/seasons`, { signal: AbortSignal.timeout(10000) });
    if (!sRes.ok) return mmrMap;
    const seasons = await sRes.json();
    const season = seasons?.[0]?.id || 21;

    // Fetch all leagues (0-6) for 4v4 mode in parallel (10s timeout each)
    const leagues = [0, 1, 2, 3, 4, 5, 6];
    const leagueResults = await Promise.all(leagues.map(async (league) => {
      try {
        const url = `${W3C_API}/ladder/${league}?gateway=20&season=${season}&gameMode=4&pageSize=200`;
        const lRes = await fetch(url, { signal: AbortSignal.timeout(10000) });
        if (!lRes.ok) return [];
        return await lRes.json();
      } catch (e) {
        return [];
      }
    }));

    for (const data of leagueResults) {
      for (const entry of (data || [])) {
        const tag = entry.player?.playerIds?.[0]?.battleTag;
        if (tag && entry.player?.mmr) {
          mmrMap.set(tag.toLowerCase(), entry.player.mmr);
        }
      }
    }
  } catch (e) {
    console.error('Failed to fetch ladder MMR:', e.message);
  }
  return mmrMap;
}

// Fetch the most recent match info for a player across seasons (for inactive players).
// Tries seasons in parallel and returns the highest season with any 4v4 data.
async function fetchPlayerSeasonTimeline(battleTag, season) {
  const W3C_API = 'https://website-backend.w3champions.com/api';
  const races = [0, 1, 2, 4, 8];
  const raceResults = await Promise.all(races.map(async (race) => {
    try {
      const url = `${W3C_API}/players/${encodeURIComponent(battleTag)}/mmr-rp-timeline?season=${season}&gateWay=20&gameMode=4&race=${race}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) return [];
      const data = await res.json();
      return data?.mmrRpAtDates || [];
    } catch { return []; }
  }));
  const all = raceResults.flat();
  if (all.length === 0) return null;
  // Sort descending, deduplicate by day, return last MMR
  all.sort((a, b) => new Date(b.date) - new Date(a.date));
  const daySet = new Set();
  const matchDays = [];
  for (const entry of all) {
    const day = entry.date.slice(0, 10);
    if (!daySet.has(day)) { daySet.add(day); matchDays.push(day); }
  }
  return { lastPlayed: all[0].date, mmr: all[0].mmr, matchDays };
}

async function fetchPlayerRecentInfo(battleTag) {
  let currentSeason = 25;
  try {
    const res = await fetch('https://website-backend.w3champions.com/api/ladder/seasons', { signal: AbortSignal.timeout(4000) });
    if (res.ok) { const s = await res.json(); if (s?.[0]?.id) currentSeason = s[0].id; }
  } catch { /* use default */ }
  const seasons = Array.from({ length: 9 }, (_, i) => currentSeason - i);
  const results = await Promise.all(seasons.map(async (season) => {
    try {
      const tl = await fetchPlayerSeasonTimeline(battleTag, season);
      if (!tl) return null;
      return { season, lastPlayed: tl.lastPlayed, mmr: tl.mmr, matchDays: tl.matchDays };
    } catch (_e) { return null; }
  }));
  const seasonActivity = results.filter(r => r != null);
  const mostRecent = seasonActivity[0] || null;
  return {
    lastPlayed: mostRecent?.lastPlayed || null,
    season: mostRecent?.season || null,
    mmr: mostRecent?.mmr || null,
    seasonActivity,
  };
}

function yieldToEventLoop() {
  return new Promise(resolve => setImmediate(resolve));
}

// Lightweight alternative to computeActionProfile for gallery builds.
// Derives groupUsage and groupCompositions from pre-aggregated columns only —
// skips full_action_sequence iteration which is O(millions of actions) across
// all players and makes the gallery build take 10+ minutes.
function computeActionProfileLight(actionRows) {
  const groupStats = {};
  const groupUnitCounts = {};
  const groupTransitions = {};
  const ACTION_CAP = 5000;

  for (const row of actionRows) {
    const hk = tryParse(row.group_hotkeys);
    if (hk) {
      for (const [g, stats] of Object.entries(hk)) {
        const gi = parseInt(g);
        if (!groupStats[gi]) groupStats[gi] = { used: 0, assigned: 0 };
        groupStats[gi].used += stats.used || 0;
        groupStats[gi].assigned += stats.assigned || 0;
      }
    }
    const gc = tryParse(row.group_compositions);
    if (gc) {
      for (const [g, units] of Object.entries(gc)) {
        if (!Array.isArray(units)) continue;
        if (!groupUnitCounts[g]) groupUnitCounts[g] = {};
        for (const unitId of units) {
          if (!unitId) continue;
          groupUnitCounts[g][unitId] = (groupUnitCounts[g][unitId] || 0) + 1;
        }
      }
    }
  }

  // Compute transitions across all rows with sequences (capped per-row to avoid bias from longer games).
  const perRowCap = Math.max(1000, Math.floor(ACTION_CAP / Math.max(1, actionRows.length)));
  for (const row of actionRows) {
    if (!row.full_action_sequence || row.full_action_sequence === '[]') continue;
    const seq = tryParse(row.full_action_sequence);
    if (!seq) continue;
    let lastGroup = null;
    const cap = Math.min(seq.length, perRowCap);
    for (let i = 0; i < cap; i++) {
      const a = seq[i];
      if (a.ms < 120000) continue;
      const isHotkey = (a.id === 0x17 || a.id === 0x18 || a.id === 23 || a.id === 24) && a.g != null;
      if (isHotkey && lastGroup !== null && lastGroup !== a.g) {
        const key = `${lastGroup}->${a.g}`;
        groupTransitions[key] = (groupTransitions[key] || 0) + 1;
      }
      if (isHotkey) lastGroup = a.g;
    }
  }

  const transitionPairs = Object.entries(groupTransitions)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([k, v]) => ({ from: parseInt(k), to: parseInt(k.split('->')[1]), count: v }));

  const groupUsage = Object.entries(groupStats)
    .map(([g, s]) => ({ group: parseInt(g), used: s.used, assigned: s.assigned }))
    .filter(g => g.used + g.assigned > 0)
    .sort((a, b) => a.group - b.group);

  const groupCompositions = {};
  for (const [g, counts] of Object.entries(groupUnitCounts)) {
    const sorted = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([unitId, count]) => ({ id: unitId, count }));
    if (sorted.length > 0) groupCompositions[g] = sorted;
  }

  const totalAssigns = groupUsage.reduce((s, g) => s + g.assigned, 0);
  const totalGroup = groupUsage.reduce((s, g) => s + g.used + g.assigned, 0);
  const reassignRatio = totalGroup > 0 ? Math.min(100, Math.round((totalAssigns / totalGroup) * 100)) : null;

  const topPair = transitionPairs[0] || null;
  const dominantLoop = topPair ? `${topPair.from}↔${topPair.to}` : null;

  return { transitionPairs, groupUsage, groupCompositions, reassignRatio, dominantLoop };
}

async function buildGalleryCache() {
  if (galleryBuilding) return;
  galleryBuilding = true;
  try {
    console.log('[gallery] Building cache...');
    // Use the no-embedding query — gallery never uses embeddings, and the
    // embedding GROUP_CONCAT pulls 300MB+ blocking the event loop for 20s.
    const allRows = getAllAveragedFingerprints();
    const allParsed = allRows.map(row => ({
      battleTag: row.battle_tag,
      playerName: row.player_name,
      race: row.race,
      replayCount: row.replay_count,
      fp: parseAveragedRow(row),
    })).filter(p => p.fp);
    console.log(`[gallery] loaded ${allParsed.length} players (no-embedding query)`);
    if (allParsed.length === 0) {
      galleryCache = { players: [] };
      galleryAge = Date.now();
      return;
    }

    const mmrMap = await fetchLadderMmr();
    console.log(`[gallery] fetchLadderMmr returned ${mmrMap.size} entries`);

    const players = [];
    for (const p of allParsed) {
      if (p.replayCount < 2) continue;

      const fp = p.fp;

      // Extract metrics from fingerprint segments
      const apmSeg = fp.segments.apm || []; // [meanNorm, stdNorm, burstiness]
      const meanApm = Math.round((apmSeg[0] || 0) * 300); // denormalize

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

      const buildPct = Math.round(((actionSeg[2] || 0) / totalAction) * 100);
      const assignPct = Math.round(((actionSeg[5] || 0) / totalAction) * 100);

      const sortedHk = [...hotkeySeg.slice(0, 10)].sort((a, b) => b - a);
      const topGroupPct = Math.round((sortedHk[0] || 0) * 100);

      const r2 = v => Math.round(v * 100) / 100;

      // Extract tempo and intensity for visualization
      const tempoSeg = fp.segments.tempo || [];
      const intensitySeg = fp.segments.intensity || [];

      // Derive action profile from pre-aggregated columns — avoids iterating
      // full_action_sequence (can be millions of actions across 2500+ players).
      const actionRows = getPlayerActionDataTop(p.battleTag, 10);
      const { transitionPairs, groupUsage, groupCompositions } = computeActionProfileLight(actionRows);

      // Lookup MMR from W3C ladder
      const mmr = mmrMap.get(p.battleTag.toLowerCase()) || 0;

      players.push({
        battleTag: p.battleTag,
        race: p.race,
        replayCount: p.replayCount,
        mmr,
        glyph: {
          hotkey: hotkeySeg.slice(0, 10).map(r2),
          apm: r2(apmSeg[0] || 0),
          action: actionSeg.slice(0, 6).map(r2),
        },
        segments: {
          action: actionSeg.slice(0, 6).map(r2),
          apm: apmSeg.slice(0, 3).map(r2),
          hotkey: hotkeySeg.slice(0, 20).map(r2),
          tempo: tempoSeg.slice(0, 7).map(r2),
          intensity: intensitySeg.slice(0, 2).map(r2),
        },
        transitionPairs,
        groupUsage,
        groupCompositions,
        metrics: {
          meanApm,
          activeGroups,
          selectPct,
          abilityPct,
          rightclickPct,
          buildPct,
          assignPct,
          topGroupPct,
          buildingsOnHotkey,
        },
      });

      // Yield every 5 players so the event loop stays responsive during the build
      if (players.length % 5 === 0) await yieldToEventLoop();
    }

    galleryCache = { players };
    galleryAge = Date.now();
    console.log(`[gallery] Cache built: ${players.length} players`);
  } finally {
    galleryBuilding = false;
  }
}

// GET /api/fingerprints/gallery — Public gallery of player extremes (no auth)
// Stale-while-revalidate: serve cached data immediately, rebuild in background when stale.
router.get('/gallery', async (req, res) => {
  const now = Date.now();
  const isStale = !galleryCache || (now - galleryAge) >= GALLERY_TTL;

  if (isStale) {
    // Kick off rebuild without awaiting — caller gets whatever is cached (possibly empty)
    buildGalleryCache().catch(e => console.error('[gallery] build error:', e.message));
  }

  res.json(galleryCache || { players: [] });
});

// ── Rate limiters for public endpoints ──────────────
const searchW3cLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  message: { error: 'Too many search requests, try again in a minute' },
});

const importLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  standardHeaders: true,
  message: { error: 'Too many import requests, try again in a minute' },
});

// ── Multer for public .w3g uploads ──────────────
const REPLAY_DIR = config.REPLAY_DIR.startsWith('/') ? config.REPLAY_DIR : join(process.cwd(), config.REPLAY_DIR);
mkdirSync(REPLAY_DIR, { recursive: true });

const uploadStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, REPLAY_DIR),
  filename: (_req, file, cb) => {
    const ts = Date.now();
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${ts}-${safe}`);
  },
});

const uploadMulter = multer({
  storage: uploadStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.originalname.toLowerCase().endsWith('.w3g')) cb(null, true);
    else cb(new Error('Only .w3g replay files are accepted'));
  },
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  standardHeaders: true,
  message: { error: 'Too many upload requests, try again in a minute' },
});

/**
 * Compute fingerprints for all players in a parsed replay.
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
 * Fire-and-forget: compute embeddings for a just-uploaded replay via the sidecar.
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

// POST /api/fingerprints/upload — Public replay upload (rate-limited; API key bypasses limit)
router.post('/upload', (req, res, next) => {
  const key = req.headers['x-api-key'];
  if (key && key === process.env.ADMIN_API_KEY) return next(); // admin bypass
  uploadLimiter(req, res, next);
}, (req, res, next) => {
  uploadMulter.single('replay')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) return res.status(400).json({ error: err.message });
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No replay file provided' });
  }

  const { originalname, path: filePath, size } = req.file;

  // SHA-256 dedup
  const fileBuffer = readFileSync(filePath);
  const fileHash = createHash('sha256').update(fileBuffer).digest('hex');

  const existing = getReplayByFileHash(fileHash);
  if (existing) {
    const players = getReplayPlayers(existing.id);
    return res.json({
      ok: true,
      duplicate: true,
      replay: {
        id: existing.id,
        mapName: existing.map_name,
        gameDuration: existing.game_duration,
        matchType: existing.match_type,
        playerCount: players.length,
      },
      players: players.map(p => ({ playerName: p.player_name, race: p.race, battleTag: p.battle_tag })),
    });
  }

  const w3cMatchId = req.body?.w3cMatchId || null;
  const hintBattleTag = req.body?.battleTag || null;
  const replayId = insertReplay({ filename: originalname, filePath, fileSize: size, fileHash, w3cMatchId });

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

    // If a battleTag hint was provided, match it to the parsed player by name
    const playersWithTags = parsed.players.map(p => {
      if (hintBattleTag) {
        const hintName = hintBattleTag.split('#')[0].toLowerCase();
        if (p.playerName.toLowerCase() === hintName) return { ...p, battleTag: hintBattleTag };
      }
      return p;
    });

    insertReplayPlayers(replayId, playersWithTags);
    insertReplayChat(replayId, parsed.chat);
    insertReplayPlayerActions(replayId, parsed.actions);

    // Compute and store fingerprints (use enriched player list for battle tag matching)
    try {
      const fingerprints = computeFingerprints(parsed.actions, playersWithTags);
      if (fingerprints.length > 0) insertPlayerFingerprints(replayId, fingerprints);
      computeEmbeddingsAsync(replayId, parsed.actions);
    } catch (fpErr) {
      console.error(`[Fingerprint] Error for ${originalname}:`, fpErr.message);
    }

    // Invalidate caches
    parsedPlayersCache = null;
    galleryAge = 0; // mark stale, keep old data serving

    const replay = getReplay(replayId);
    const players = getReplayPlayers(replayId);

    res.json({
      ok: true,
      replay: {
        id: replay.id,
        mapName: replay.map_name,
        gameDuration: replay.game_duration,
        matchType: replay.match_type,
        playerCount: players.length,
      },
      players: players.map(p => ({ playerName: p.player_name, race: p.race, battleTag: p.battle_tag })),
    });
  } catch (err) {
    console.error(`[Upload] Parse error for ${originalname}:`, err.message);
    updateReplayError(replayId, err.message);
    res.status(422).json({
      ok: false,
      error: 'Failed to parse replay',
      detail: err.message,
      replayId,
    });
  }
});

const W3C_API = 'https://website-backend.w3champions.com/api';

// GET /api/fingerprints/search-w3c?q=BAKA — Proxy W3C ladder search (public)
router.get('/search-w3c', searchW3cLimiter, async (req, res) => {
  const q = (req.query.q || '').trim();
  if (q.length < 2) {
    return res.json({ players: [] });
  }

  // Resolve current season
  let season = 24;
  try {
    const sRes = await fetch(`${W3C_API}/ladder/seasons`);
    if (sRes.ok) {
      const seasons = await sRes.json();
      if (seasons?.length > 0) season = seasons[0].id;
    }
  } catch { /* use default */ }

  try {
    const url = `${W3C_API}/ladder/search?searchFor=${encodeURIComponent(q)}&season=${season}&gateway=20&gameMode=4`;
    const apiRes = await fetch(url);
    if (!apiRes.ok) {
      return res.json({ players: [] });
    }
    const data = await apiRes.json();

    // Map W3C ladder entries to simplified player objects
    const RACE_MAP = { 0: 'Random', 1: 'Human', 2: 'Orc', 4: 'Night Elf', 8: 'Undead' };
    const players = (Array.isArray(data) ? data : []).slice(0, 10).map(entry => {
      const id = entry.player?.playerIds?.[0];
      return {
        battleTag: id?.battleTag || entry.player?.name || '',
        name: id?.name || entry.player?.name?.split('#')[0] || '',
        mmr: entry.player?.mmr ?? null,
        games: entry.player?.games ?? 0,
        race: RACE_MAP[entry.race] || 'Random',
        league: entry.league ?? null,
      };
    }).filter(p => p.battleTag);

    res.json({ players });
  } catch (err) {
    console.error('[search-w3c] Error:', err.message);
    res.json({ players: [] });
  }
});

// POST /api/fingerprints/import — Import replays for a player (public, rate-limited)
router.post('/import', importLimiter, async (req, res) => {
  const { battleTag } = req.body;
  if (!battleTag || typeof battleTag !== 'string') {
    return res.status(400).json({ error: 'battleTag is required' });
  }

  try {
    const result = await importPlayerMatches(battleTag, 3);
    // Invalidate caches so new data shows up immediately
    parsedPlayersCache = null;
    galleryAge = 0; // mark stale, keep old data serving
    // If rate limited, queue the tag so the drip retries it next available slot
    if (result.rateLimited) {
      enqueueImport(battleTag);
      result.queued = true;
    }
    res.json(result);
  } catch (err) {
    console.error('[import] Error:', err.message);
    res.status(500).json({ error: 'Import failed: ' + err.message });
  }
});

// POST /api/fingerprints/import-bulk — Import all recent matches for a player (admin, rate-limited)
router.post('/import-bulk', requireApiKey, async (req, res) => {
  const { battleTag, daysBack = 7, maxImports = 50 } = req.body;
  if (!battleTag || typeof battleTag !== 'string') {
    return res.status(400).json({ error: 'battleTag is required' });
  }
  try {
    const result = await importPlayerMatchesBulk(battleTag, { daysBack, maxImports });
    parsedPlayersCache = null;
    galleryAge = 0;
    res.json(result);
  } catch (err) {
    console.error('[import-bulk] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
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

  // Get all players from shared cache
  const allPlayers = getParsedPlayers();
  const results = [];

  for (const p of allPlayers) {
    if (p.battleTag === battleTag) continue;
    // Race filter: skip candidates with different race
    if (sameRace && queryRace && p.race !== queryRace) continue;

    const hybrid = computeHybridSimilarity(queryAvg, p.fp, queryAvgEmb, p.embedding);
    const breakdown = computeServerBreakdown(queryAvg, p.fp);

    results.push({
      battleTag: p.battleTag,
      playerName: p.playerName,
      race: p.race,
      replayCount: p.replayCount,
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
    const allRows = getPlayerActionData(battleTag);
    if (allRows.length === 0) return null;
    const rows = allRows.slice(0, 10);

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
  parsedPlayersCache = null; // invalidate shared cache
  suspectsCache = null;
  pcaCache = null;
  umapCache = null;
  galleryAge = 0; // mark stale, keep old data serving
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

// POST /api/fingerprints/backfill-sequences — Re-download replays to populate missing full_action_sequence
// Uses greedy set cover so one 4v4 replay can fix up to 8 players at once.
router.post('/backfill-sequences', requireApiKey, async (req, res) => {
  const uncovered = getPlayersWithoutSequences();
  if (uncovered.length === 0) {
    return res.json({ message: 'All players already have sequence data', uncovered: 0, replaysNeeded: 0 });
  }

  const replayMatches = getReplayMatchesForPlayers(uncovered);

  // Greedy set cover: each iteration picks the replay covering the most uncovered players
  const remaining = new Set(uncovered);
  const selected = [];
  const available = [...replayMatches];
  while (remaining.size > 0 && available.length > 0) {
    let bestIdx = -1, bestCount = 0;
    for (let i = 0; i < available.length; i++) {
      const count = available[i].players.filter(p => remaining.has(p)).length;
      if (count > bestCount) { bestCount = count; bestIdx = i; }
    }
    if (bestIdx === -1 || bestCount === 0) break;
    const pick = available.splice(bestIdx, 1)[0];
    selected.push(pick);
    for (const p of pick.players) remaining.delete(p);
  }

  const uncoverableTags = [...remaining];

  res.json({
    uncoveredPlayers: uncovered.length,
    replaysToDownload: selected.length,
    willCover: uncovered.length - remaining.size,
    notCoverable: uncoverableTags.length,
    searchBackfill: uncoverableTags.length, // phase 2 via W3C search API
  });

  // Phase 1: re-download replays already in DB (set-cover)
  // Phase 2: search W3C API for a fresh replay for each uncoverable player
  (async () => {
    await sequenceBackfill(selected);
    if (uncoverableTags.length > 0) await backfillViaSearch(uncoverableTags);
  })().catch(err => console.error('[Backfill]', err.message));
});

const W3C_REPLAY_API = 'https://website-backend.w3champions.com/api/replays';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function sequenceBackfill(selected) {
  let done = 0, failed = 0;
  for (const match of selected) {
    await sleep(3000);
    try {
      const res = await fetch(`${W3C_REPLAY_API}/${encodeURIComponent(match.w3cMatchId)}`);
      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get('Retry-After') || '0', 10);
        console.log(`[Backfill] 429 rate limited — aborting (${done} done, ${failed} failed). Retry-After: ${retryAfter}s`);
        galleryAge = 0; // mark stale, keep old data serving
        return;
      }
      if (!res.ok) {
        console.log(`[Backfill] ${match.w3cMatchId} HTTP ${res.status} — skipping`);
        failed++;
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      const tmpPath = join(REPLAY_DIR, `backfill-${Date.now()}.w3g`);
      writeFileSync(tmpPath, buf);
      try {
        const parsed = await parseReplayFile(tmpPath);
        for (const action of parsed.actions) {
          updatePlayerActionData(match.replayId, action.playerId, action);
        }
        done++;
        console.log(`[Backfill] ${match.w3cMatchId} — updated ${parsed.actions.length} players (${done}/${selected.length})`);
      } finally {
        try { unlinkSync(tmpPath); } catch {}
      }
    } catch (err) {
      console.error(`[Backfill] ${match.w3cMatchId}:`, err.message);
      failed++;
    }
  }
  // Expire gallery so it rebuilds with fresh sequence data
  galleryAge = 0; // mark stale, keep old data serving
  console.log(`[Backfill] Done — ${done} succeeded, ${failed} failed`);
}

// Phase 2: for players with no usable replay in DB, search W3C API for a fresh one.
// Uses importPlayerMatches() which handles download → parse → fingerprint → embed.
async function backfillViaSearch(battleTags) {
  let done = 0, noReplay = 0, failed = 0;
  console.log(`[Backfill-Search] Starting phase 2 — ${battleTags.length} players to search`);
  for (const battleTag of battleTags) {
    await sleep(3000);
    try {
      const result = await importPlayerMatches(battleTag, 1);
      if (result.rateLimited) {
        console.log(`[Backfill-Search] 429 rate limited — aborting (${done} done, ${failed} failed)`);
        galleryAge = 0; // mark stale, keep old data serving
        return;
      }
      if (result.imported > 0) {
        done++;
        console.log(`[Backfill-Search] ${battleTag} — imported (${done}/${battleTags.length})`);
      } else if (result.noReplay > 0 || result.discovered === 0) {
        noReplay++;
      } else {
        failed++;
      }
    } catch (err) {
      console.error(`[Backfill-Search] ${battleTag}:`, err.message);
      failed++;
    }
  }
  galleryAge = 0; // mark stale, keep old data serving
  console.log(`[Backfill-Search] Done — ${done} imported, ${noReplay} no replay, ${failed} failed`);
}

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
  const allPlayers = getParsedPlayers();
  const results = [];

  for (const p of allPlayers) {
    // Skip the test player entirely (both halves should be excluded)
    if (p.battleTag === battleTag) continue;

    const hybrid = computeHybridSimilarity(avgB, p.fp, avgEmbB, p.embedding);
    const breakdown = computeServerBreakdown(avgB, p.fp);

    results.push({
      battleTag: p.battleTag,
      race: p.race,
      replayCount: p.replayCount,
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

// ── Embedding map caches ────────────────────────
let umapCache = null;
let umapAge = 0;
const UMAP_TTL = 45 * 60 * 1000; // 45 min

let pcaCache = null;
let pcaAge = 0;
const PCA_TTL = 45 * 60 * 1000; // 45 min

// ── Extracted embedding-map computation (for coalescing) ──
async function computeEmbeddingMapResult(method) {
  const allPlayers = getParsedPlayers();
  const players = allPlayers.filter(p => p.embedding && p.embedding.length > 0);

  if (players.length < 3) {
    return { players: [], pca: null, projection: { method } };
  }

  const dim = players[0].embedding.length;
  const n = players.length;

  // Build a lookup from battleTag → fp for glyph data
  const fpLookup = {};
  for (const p of allPlayers) {
    if (p.fp) fpLookup[p.battleTag] = p.fp;
  }

  const r2 = v => Math.round(v * 100) / 100;

  function buildGlyph(battleTag) {
    const fp = fpLookup[battleTag];
    return fp ? {
      hotkey: fp.segments.hotkey.slice(0, 10).map(r2),
      apm: r2(fp.segments.apm[0] || 0),
      action: fp.segments.action.slice(0, 6).map(r2),
    } : null;
  }

  // ── UMAP path ──
  if (method === 'umap') {
    const now = Date.now();
    if (umapCache && (now - umapAge) < UMAP_TTL && umapCache.playerCount === n) {
      return umapCache.data;
    }

    const embeddings = players.map(p => p.embedding);
    const result = await getUmapProjection(embeddings);
    if (!result || !result.points) {
      throw new Error('UMAP sidecar unavailable or failed');
    }

    const points = players.map((p, i) => ({
      battleTag: p.battleTag,
      race: p.race,
      replayCount: p.replayCount,
      x: result.points[i].x,
      y: result.points[i].y,
      glyph: buildGlyph(p.battleTag),
    }));

    const responseData = {
      players: points,
      pca: null,
      projection: { method: 'umap', playerCount: n, supportsTransform: true },
    };

    umapCache = { data: responseData, playerCount: n };
    umapAge = now;
    return responseData;
  }

  // ── PCA path (default) ──
  const now2 = Date.now();
  if (pcaCache && (now2 - pcaAge) < PCA_TTL && pcaCache.playerCount === n) {
    return pcaCache.data;
  }

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
      let vec = new Array(dim).fill(0).map(() => rand() - 0.5);
      let norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
      vec = vec.map(v => v / norm);

      for (let iter = 0; iter < 100; iter++) {
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

  const points = players.map((p, i) => {
    const x = centered[i].reduce((s, v, d) => s + v * pcs[0][d], 0);
    const y = centered[i].reduce((s, v, d) => s + v * pcs[1][d], 0);
    return {
      battleTag: p.battleTag,
      race: p.race,
      replayCount: p.replayCount,
      x: Math.round(x * 1000) / 1000,
      y: Math.round(y * 1000) / 1000,
      glyph: buildGlyph(p.battleTag),
    };
  });

  const totalVar = centered.reduce((s, row) => s + row.reduce((ss, v) => ss + v * v, 0), 0);
  const pc1Var = points.reduce((s, p) => s + p.x * p.x, 0);
  const pc2Var = points.reduce((s, p) => s + p.y * p.y, 0);

  const r6 = v => Math.round(v * 1e6) / 1e6;

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

  const axisCorrelations = { pc1: [], pc2: [] };
  const pcXs = points.map(p => p.x);
  const pcYs = points.map(p => p.y);

  for (const seg of SEGMENT_NAMES) {
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

  axisCorrelations.pc1.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
  axisCorrelations.pc2.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));

  const responseData = {
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
    projection: { method: 'pca' },
  };

  pcaCache = { data: responseData, playerCount: n };
  pcaAge = Date.now();
  return responseData;
}

// ── Request coalescing for embedding-map ──
let embeddingMapInflight = null; // { method, promise }

// GET /api/fingerprints/embedding-map — 2D projection of all player embeddings (no auth)
// ?method=pca (default) or ?method=umap
router.get('/embedding-map', async (req, res) => {
  const method = (req.query.method || 'pca').toLowerCase();

  // Coalesce: if same computation is already in-flight, share the result
  if (embeddingMapInflight?.method === method) {
    try {
      return res.json(await embeddingMapInflight.promise);
    } catch (err) {
      return res.status(503).json({ error: err.message });
    }
  }

  const promise = computeEmbeddingMapResult(method);
  embeddingMapInflight = { method, promise };
  try {
    const result = await promise;
    res.json(result);
  } catch (err) {
    res.status(503).json({ error: err.message });
  } finally {
    embeddingMapInflight = null;
  }
});

// ── Suspects Cache ──────────────────────────────────
let suspectsCache = null;
let suspectsAge = 0;

function getSuspectsData() {
  const now = Date.now();
  if (suspectsCache && (now - suspectsAge) < CALIBRATION_TTL) {
    return suspectsCache;
  }

  const players = getParsedPlayers();
  if (players.length < 5) return null;

  // Two-phase approach: fast embedding pre-filter, then full hybrid on top candidates
  // Phase 1: For players with embeddings, compute cheap cosine similarity to find top candidates
  const playersWithEmb = players.map((p, idx) => ({ ...p, idx })).filter(p => p.embedding);
  const candidatePairs = new Set(); // store as "i,j" strings

  if (playersWithEmb.length > 50) {
    // Fast embedding-only pass: keep top ~500 pairs by embedding similarity
    const embPairs = [];
    for (let a = 0; a < playersWithEmb.length; a++) {
      for (let b = a + 1; b < playersWithEmb.length; b++) {
        const sim = embeddingSimilarity(playersWithEmb[a].embedding, playersWithEmb[b].embedding);
        if (sim !== null) {
          embPairs.push({ i: playersWithEmb[a].idx, j: playersWithEmb[b].idx, embSim: sim });
        }
      }
    }
    embPairs.sort((a, b) => b.embSim - a.embSim);
    for (const p of embPairs.slice(0, 500)) {
      candidatePairs.add(`${p.i},${p.j}`);
    }
  }

  // Phase 2: For players without embeddings, or if few have embeddings, do full comparison
  // Also always include pairs from a random sample to ensure coverage
  const MAX_BRUTE = 300;
  if (players.length <= MAX_BRUTE) {
    // Small enough for full O(n²)
    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        candidatePairs.add(`${i},${j}`);
      }
    }
  } else {
    // Add all pairs involving players without embeddings (compare against sample)
    const noEmbIdxs = players.map((p, idx) => ({ ...p, idx })).filter(p => !p.embedding).map(p => p.idx);
    const sampleSize = Math.min(100, players.length);
    const rand = seededLCG(54321);
    const sampleIdxs = new Set();
    while (sampleIdxs.size < sampleSize) {
      sampleIdxs.add(Math.floor(rand() * players.length));
    }
    for (const i of noEmbIdxs) {
      for (const j of sampleIdxs) {
        if (i !== j) {
          const [a, b] = i < j ? [i, j] : [j, i];
          candidatePairs.add(`${a},${b}`);
        }
      }
    }
  }

  // Compute full hybrid similarity for all candidate pairs
  const scoredPairs = [];
  for (const key of candidatePairs) {
    const [i, j] = key.split(',').map(Number);
    const hybrid = computeHybridSimilarity(
      players[i].fp, players[j].fp,
      players[i].embedding, players[j].embedding
    );
    scoredPairs.push({ i, j, ...hybrid });
  }
  scoredPairs.sort((a, b) => b.similarity - a.similarity);

  suspectsCache = { players, scoredPairs };
  suspectsAge = now;
  return suspectsCache;
}

// GET /api/fingerprints/identify/:battleTag — Smurf verdict for one account
// Returns the top similar account with a confidence verdict.
// Thresholds calibrated against 14 ground-truth validation pairs (all score p99.8+).
//   confident  → percentile >= 99.5 (all known smurfs land here)
//   possible   → percentile >= 97
//   no_match   → below that
router.get('/identify/:battleTag', requireApiKey, async (req, res) => {
  const { battleTag } = req.params;
  const filterRace = req.query.race || null;
  const filterAfter = req.query.after || null;
  const filterReplayIds = req.query.replayIds
    ? req.query.replayIds.split(',').map(Number).filter(n => n > 0)
    : null;
  const hasFilter = !!(filterRace || filterAfter || filterReplayIds?.length);

  const allPlayers = getParsedPlayers();
  const cal = getCalibration();

  const suspect = allPlayers.find(p => p.battleTag === battleTag);
  if (!suspect) {
    return res.status(404).json({ error: 'Player not indexed', battleTag });
  }

  // Re-compute fingerprint from filtered data when filters are active
  let suspectFp = suspect.fp;
  let suspectEmbedding = suspect.embedding;
  let suspectReplayCount = suspect.replayCount;
  const suspectTotalCount = suspect.replayCount;

  if (hasFilter) {
    const filteredRows = getPlayerFingerprintsFiltered(battleTag, { race: filterRace, after: filterAfter, replayIds: filterReplayIds });
    suspectReplayCount = filteredRows.length;
    if (suspectReplayCount < 1) {
      return res.json({
        battleTag, verdict: 'insufficient_data',
        reason: `Only ${suspectReplayCount} filtered replay(s) — need at least 1`,
        replayCount: suspectReplayCount,
        totalReplayCount: suspectTotalCount,
        filters: { race: filterRace, after: filterAfter, replayIds: filterReplayIds },
        topMatches: [],
      });
    }
    suspectFp = averageFingerprints(filteredRows.map(parseDbFingerprint));
    suspectEmbedding = null; // no pre-computed embedding for filtered subset
  } else if (suspect.replayCount < 3) {
    return res.json({
      battleTag, verdict: 'insufficient_data',
      reason: `Only ${suspect.replayCount} replay(s) indexed — need at least 3 for a reliable fingerprint`,
      replayCount: suspect.replayCount,
      topMatches: [],
    });
  }

  const results = [];
  for (const p of allPlayers) {
    if (p.battleTag === battleTag) continue;
    if (p.replayCount < 3) continue;
    const hybrid = computeHybridSimilarity(suspectFp, p.fp, suspectEmbedding, p.embedding);
    const percentile = cal ? scoreToPercentile(hybrid.similarity, cal) : null;
    const zScore = cal ? scoreToZScore(hybrid.similarity, cal) : null;
    const breakdown = computeServerBreakdown(suspectFp, p.fp);
    results.push({
      battleTag: p.battleTag,
      playerName: p.playerName,
      race: p.race,
      replayCount: p.replayCount,
      similarity: r3(hybrid.similarity),
      handcrafted: r3(hybrid.handcrafted),
      embedding: r3(hybrid.embedding),
      hybrid: hybrid.hybrid,
      percentile,
      zScore,
      breakdown: formatBreakdown(breakdown, hybrid),
    });
  }

  results.sort((a, b) => b.similarity - a.similarity);
  const similar = results.slice(0, 5);

  const top = similar[0];
  let verdict = 'no_match';
  if (top) {
    if (top.percentile != null && top.percentile >= 99.5) verdict = 'confident';
    else if (top.percentile != null && top.percentile >= 97) verdict = 'possible';
  }

  // Enrich query player with glyph + APM (filtered if filters active)
  let queryGlyph = null;
  let queryReassignRatio = null;
  let queryDominantLoop = null;
  const queryActionRows = filterReplayIds?.length
    ? getPlayerActionDataByReplayIds(battleTag, filterReplayIds)
    : hasFilter
      ? getPlayerActionDataTopFiltered(battleTag, 10, { race: filterRace, after: filterAfter })
      : getPlayerActionDataTop(battleTag, 10);
  if (queryActionRows.length > 0) {
    const { transitionPairs, groupUsage, groupCompositions, reassignRatio, dominantLoop } = computeActionProfileLight(queryActionRows);
    queryGlyph = { transitionPairs, groupUsage, groupCompositions };
    queryReassignRatio = reassignRatio;
    queryDominantLoop = dominantLoop;
  }
  const queryApm = getPlayerAvgApm(battleTag, filterReplayIds?.length ? filterReplayIds : null);
  const queryApmSeg = suspect.fp?.segments?.apm || [];

  // Enrich top matches with glyph, APM, race, shared replays
  const mmrMap = await fetchLadderMmr();
  for (const s of similar) {
    s.race = getPlayerMostPlayedRace(s.battleTag);
    s.sharedReplays = getSharedReplayCount(battleTag, s.battleTag);
    const actionRows = getPlayerActionDataTop(s.battleTag, 10);
    if (actionRows.length > 0) {
      const { transitionPairs, groupUsage, groupCompositions, reassignRatio, dominantLoop } = computeActionProfileLight(actionRows);
      s.glyph = { transitionPairs, groupUsage, groupCompositions };
      s.reassignRatio = reassignRatio;
      s.dominantLoop = dominantLoop;
    }
    s.apm = getPlayerAvgApm(s.battleTag);
    const sPlayer = allPlayers.find(p => p.battleTag === s.battleTag);
    if (sPlayer) {
      const apmSeg = sPlayer.fp?.segments?.apm || [];
      s.variability = apmSeg[1] != null ? Math.round(apmSeg[1] * 100) : null;
      s.burstiness = apmSeg[2] != null ? +apmSeg[2].toFixed(2) : null;
      s.actionDist = sPlayer.fp?.segments?.action || null;
    }
    const msgs = getPlayerMessages(s.battleTag, 8);
    s.recentChat = msgs.map(m => ({ message: m.message, receivedAt: m.received_at }));
  }

  // Fetch season history for all players (ranked + unranked) — needed for lastSeen + timeline
  const allTags = [battleTag, ...similar.map(s => s.battleTag)];
  const enrichmentResults = await Promise.all(allTags.map(async tag => ({
    tag, info: await fetchPlayerRecentInfo(tag),
  })));
  const enrichmentMap = new Map(enrichmentResults.map(({ tag, info }) => [tag, info]));

  // Apply MMR + lastSeen to candidates (ladder MMR takes priority for ranked players)
  const queryLadderMmr = mmrMap.get(battleTag.toLowerCase()) || null;
  for (const s of similar) {
    const ladderMmr = mmrMap.get(s.battleTag.toLowerCase()) || null;
    const enriched = enrichmentMap.get(s.battleTag);
    s.mmr = ladderMmr ?? enriched?.mmr ?? null;
    s.lastSeen = enriched?.lastPlayed || null;
    s.lastSeasonActive = enriched?.season || null;
    s.seasonActivity = enriched?.seasonActivity || [];
  }

  // Played-together matrix across all 4 players (query + top 3 candidates)
  const topTags = [battleTag, ...similar.slice(0, 5).map(s => s.battleTag)];
  const matrix = {};
  for (let i = 0; i < topTags.length; i++) {
    for (let j = i + 1; j < topTags.length; j++) {
      const key = `${topTags[i]}|${topTags[j]}`;
      matrix[key] = getSharedReplayCount(topTags[i], topTags[j]);
    }
  }

  const queryEnriched = enrichmentMap.get(battleTag);
  res.json({
    battleTag,
    verdict,
    filters: hasFilter ? { race: filterRace, after: filterAfter, replayIds: filterReplayIds } : null,
    query: {
      replayCount: suspectReplayCount,
      totalReplayCount: suspectTotalCount,
      hasEmbedding: !!suspect.embedding,
      glyph: queryGlyph,
      apm: queryApm,
      race: getPlayerMostPlayedRace(battleTag),
      mmr: queryLadderMmr ?? queryEnriched?.mmr ?? null,
      lastSeen: queryEnriched?.lastPlayed || null,
      lastSeasonActive: queryEnriched?.season || null,
      seasonActivity: queryEnriched?.seasonActivity || [],
      reassignRatio: queryReassignRatio,
      dominantLoop: queryDominantLoop,
      variability: queryApmSeg[1] != null ? Math.round(queryApmSeg[1] * 100) : null,
      burstiness: queryApmSeg[2] != null ? +queryApmSeg[2].toFixed(2) : null,
      actionDist: suspectFp?.segments?.action || null,
    },
    similar,
    matrix,
    calibration: cal ? { mean: r3(cal.mean), stddev: r3(cal.stddev), playerCount: allPlayers.length } : null,
  });

  // Background: pull 1 replay for any player (query or candidate) missing glyph arc data
  const queryNeedsSequence = !queryGlyph || queryGlyph.transitionPairs.length === 0;
  const candidatesNeedSequence = similar.filter(s => !s.glyph || s.glyph.transitionPairs.length === 0);
  const tagsToFetch = [
    ...(queryNeedsSequence ? [battleTag] : []),
    ...candidatesNeedSequence.map(s => s.battleTag),
  ];
  const newTags = tagsToFetch.filter(t => !sequenceFetchingTags.has(t));
  if (newTags.length > 0) {
    newTags.forEach(t => sequenceFetchingTags.add(t));
    setImmediate(async () => {
      try {
        // Players already in DB (old parse, no sequence) → re-download one existing replay each
        const replayMatches = getReplayMatchesForPlayers(newTags);
        const coveredTags = new Set(replayMatches.flatMap(m => m.players));
        const needNewDownload = newTags.filter(t => !coveredTags.has(t));

        if (replayMatches.length > 0) {
          // Pick the most recent replay covering each uncovered tag (replayMatches is desc by id)
          const selected = [];
          const seen = new Set();
          for (const match of replayMatches) {
            const fresh = match.players.filter(p => !seen.has(p));
            if (fresh.length > 0) {
              selected.push(match);
              for (const p of fresh) seen.add(p);
            }
          }
          console.log(`[identify-backfill] re-parsing ${selected.length} existing replays for ${coveredTags.size} players`);
          await sequenceBackfill(selected);
          for (const tag of coveredTags) sequenceFetchingTags.delete(tag);
        }

        // Players with no replay in DB → search W3C for a new one
        for (const tag of needNewDownload) {
          try {
            const result = await importPlayerMatches(tag, 1);
            console.log(`[identify-backfill] ${tag}: imported=${result.imported} rateLimited=${result.rateLimited}`);
            if (result.rateLimited) break;
          } catch (e) {
            console.error(`[identify-backfill] ${tag}: ${e.message}`);
          } finally {
            sequenceFetchingTags.delete(tag);
          }
        }
      } catch (e) {
        console.error('[identify-backfill]', e.message);
        for (const tag of newTags) sequenceFetchingTags.delete(tag);
      }
    });
  }
});

// ── Request coalescing for suspects ──
const sequenceFetchingTags = new Set(); // dedup concurrent identify-triggered backfills

let suspectsInflight = null; // Promise

// GET /api/fingerprints/suspects — Top similar player pairs (public, no auth)
router.get('/suspects', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);

  let data;
  if (suspectsInflight) {
    data = await suspectsInflight;
  } else {
    const promise = new Promise(resolve => resolve(getSuspectsData()));
    suspectsInflight = promise;
    try {
      data = await promise;
    } finally {
      suspectsInflight = null;
    }
  }

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
// ?project=umap — return pre-projected 2D coords via sidecar (no raw embeddings)
router.get('/embeddings/:battleTag', async (req, res) => {
  const { battleTag } = req.params;
  const projectMethod = req.query.project;
  const rows = getPlayerFingerprints(battleTag);

  if (rows.length === 0) {
    return res.status(404).json({ error: 'No fingerprints found', battleTag });
  }

  const replays = [];
  const embeddings = [];
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
    embeddings.push(emb);
  }

  if (projectMethod === 'umap') {
    if (embeddings.length === 0) {
      return res.json({ battleTag, replays: [] });
    }
    const result = await getUmapTransform(embeddings);
    if (!result || !result.points) {
      return res.status(503).json({ error: 'UMAP transform unavailable — fit model first' });
    }
    const projected = replays.map((r, i) => ({
      replayId: r.replayId,
      matchDate: r.matchDate,
      mapName: r.mapName,
      gameDuration: r.gameDuration,
      x: result.points[i].x,
      y: result.points[i].y,
    }));
    return res.json({ battleTag, replays: projected, projected: 'umap' });
  }

  res.json({ battleTag, replays });
});

// GET /api/fingerprints/stats
router.get('/stats', requireApiKey, async (req, res) => {
  const dbStats = getFingerprintCount();
  const missing = getReplaysWithoutFingerprints();
  const missingEmbeddingCount = countFingerprintsWithoutEmbeddings();
  const sidecarUp = await checkSidecar();
  const cal = getCalibration();
  res.json({
    ...dbStats,
    replaysWithoutFingerprints: missing.length,
    fingerprintsWithoutEmbeddings: missingEmbeddingCount,
    embedSidecar: sidecarUp ? 'available' : 'unavailable',
    calibration: cal ? {
      mean: r3(cal.mean),
      stddev: r3(cal.stddev),
      playerCount: cal.playerCount,
      pairCount: cal.pairCount,
    } : null,
  });
});

// ── Validation pairs (known smurf-main ground truth) ──────────────

// GET /api/fingerprints/validation — Public list with live-computed similarity
router.get('/validation', (req, res) => {
  const pairs = getValidationPairs();
  if (pairs.length === 0) {
    return res.json({ pairs: [], summary: { total: 0, indexed: 0, aboveP90: 0, aboveP95: 0, aboveP99: 0, meanPercentile: 0 } });
  }

  const allPlayers = getParsedPlayers();
  const playerLookup = {};
  for (const p of allPlayers) {
    playerLookup[p.battleTag] = p;
  }

  const cal = getCalibration();
  const enriched = [];

  for (const pair of pairs) {
    const pMain = playerLookup[pair.tag_main];
    const pSmurf = playerLookup[pair.tag_smurf];

    if (!pMain || !pSmurf) {
      enriched.push({
        id: pair.id, tagMain: pair.tag_main, tagSmurf: pair.tag_smurf,
        notes: pair.notes, createdAt: pair.created_at,
        similarity: null, percentile: null, handcrafted: null, embedding: null,
        breakdown: null, replaysMain: pMain?.replayCount || 0, replaysSmurf: pSmurf?.replayCount || 0,
        raceMain: pMain?.race || null, raceSmurf: pSmurf?.race || null,
        missing: true,
      });
      continue;
    }

    const hybrid = computeHybridSimilarity(pMain.fp, pSmurf.fp, pMain.embedding, pSmurf.embedding);
    const breakdown = computeServerBreakdown(pMain.fp, pSmurf.fp);
    const percentile = cal ? scoreToPercentile(hybrid.similarity, cal) : null;

    enriched.push({
      id: pair.id, tagMain: pair.tag_main, tagSmurf: pair.tag_smurf,
      notes: pair.notes, createdAt: pair.created_at,
      similarity: r3(hybrid.similarity), percentile,
      handcrafted: r3(hybrid.handcrafted), embedding: r3(hybrid.embedding),
      breakdown: formatBreakdown(breakdown, hybrid),
      replaysMain: pMain.replayCount, replaysSmurf: pSmurf.replayCount,
      raceMain: pMain.race, raceSmurf: pSmurf.race,
      missing: false,
    });
  }

  // Summary stats
  const indexed = enriched.filter(p => !p.missing);
  const withPercentile = indexed.filter(p => p.percentile != null);
  const summary = {
    total: enriched.length,
    indexed: indexed.length,
    aboveP90: withPercentile.filter(p => p.percentile >= 90).length,
    aboveP95: withPercentile.filter(p => p.percentile >= 95).length,
    aboveP99: withPercentile.filter(p => p.percentile >= 99).length,
    meanPercentile: withPercentile.length > 0
      ? Math.round((withPercentile.reduce((s, p) => s + p.percentile, 0) / withPercentile.length) * 10) / 10
      : 0,
  };

  res.json({ pairs: enriched, summary });
});

// POST /api/fingerprints/validation — Admin: add pair
router.post('/validation', requireApiKey, (req, res) => {
  const { tagMain, tagSmurf, notes } = req.body;
  if (!tagMain || !tagSmurf) {
    return res.status(400).json({ error: 'tagMain and tagSmurf are required' });
  }
  try {
    const result = insertValidationPair(tagMain, tagSmurf, notes || '');
    res.json({ ok: true, id: Number(result.lastInsertRowid) });
  } catch (err) {
    if (err.message?.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Pair already exists' });
    }
    throw err;
  }
});

// DELETE /api/fingerprints/validation/:id — Admin: remove pair
router.delete('/validation/:id', requireApiKey, (req, res) => {
  const id = parseInt(req.params.id);
  deleteValidationPair(id);
  res.json({ ok: true });
});

// PATCH /api/fingerprints/validation/:id — Admin: update notes
router.patch('/validation/:id', requireApiKey, (req, res) => {
  const id = parseInt(req.params.id);
  const { notes } = req.body;
  if (notes === undefined) {
    return res.status(400).json({ error: 'notes field is required' });
  }
  updateValidationPairNotes(id, notes);
  res.json({ ok: true });
});

export async function warmCaches() {
  // getParsedPlayers() and getCalibration() are synchronous better-sqlite3
  // calls that block the event loop for 30-40s when the DB is large — long
  // enough to fail the Fly.io health check and crash the machine.
  // All caches warm lazily on first request instead.
  console.log('[Cache] Deferred — parsed players, calibration, and PCA will warm on first request');
}

export default router;
