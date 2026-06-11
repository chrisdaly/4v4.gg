/**
 * Background Drip Replay Importer
 *
 * Runs on a timer to slowly discover and import W3C replays.
 * Avoids rate limiting by importing only a few replays per cycle.
 *
 * Cycle (every 15 min):
 *   1. If queue is empty, discover new matches from GM/Master/Diamond/Platinum ladder
 *   2. Wait 30s cooldown after discovery
 *   3. Import up to 3 queued matches (download → parse → fingerprint → embed)
 */

import config from './config.js';
import { writeFileSync, unlinkSync, statfsSync } from 'fs';
import { join } from 'path';
import { parseReplayFile } from './replayParser.js';
import {
  getReplayByW3cMatchId,
  insertReplayWithW3c,
  updateReplayParsed,
  insertReplayPlayers,
  insertReplayChat,
  insertReplayPlayerActions,
  insertPlayerFingerprints,
  updateFingerprintEmbedding,
  getExistingW3cMatchIds,
} from './db.js';
import { buildServerFingerprint } from './fingerprint.js';
import { getEmbeddingBatch } from './embedClient.js';

const W3C_API = 'https://website-backend.w3champions.com/api';
// W3C replay downloads are rate-limited to ~30/hr and ~70/day for matches
// under 7 days old. 2 imports per 5-minute cycle stays under the hourly cap;
// the daily cap surfaces as a 429, which pauses imports for an hour.
const CYCLE_MS = 5 * 60 * 1000;
const IMPORTS_PER_CYCLE = 2;
const RATE_LIMIT_MS = 3000; // 3s between W3C API calls
const RATE_LIMIT_PAUSE_CYCLES = 12; // ~1 hour

const REPLAY_DIR = config.REPLAY_DIR.startsWith('/')
  ? config.REPLAY_DIR
  : join(process.cwd(), config.REPLAY_DIR);

// In-memory queue (simple — no need for a DB table since it's rebuilt each discover cycle)
let importQueue = [];
let isRunning = false;
let discoverCooldown = 0; // skip discover if we recently filled the queue
let rateLimitCooldown = 0; // cycles to skip entirely after a 429

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// The importer must never starve the database of disk (a full volume is what
// corrupted the DB in June 2026). Pause imports when free space drops below 15%.
const MIN_FREE_RATIO = 0.15;

function diskHasHeadroom() {
  try {
    const s = statfsSync(REPLAY_DIR);
    const free = s.bavail / s.blocks;
    if (free < MIN_FREE_RATIO) {
      console.warn(`[Importer] Low disk space (${Math.round(free * 100)}% free) — pausing imports until space is freed`);
      return false;
    }
    return true;
  } catch {
    return true; // guard failure shouldn't block imports
  }
}

/**
 * Discover new matches from the recent finished-matches feed.
 * Two pages of 100 cover the last ~200 4v4 games in 2 API calls — the old
 * approach (4 ladder pages + a match-search per player) needed ~65 calls and
 * only saw games involving top-league players.
 *
 * Short games are skipped (too little action data to fingerprint), and
 * candidates are sorted by average match MMR so the tight replay-download
 * budget (W3C allows ~70/day for fresh matches) goes to the games whose
 * players matter most for smurf detection.
 */
async function discoverMatches() {
  const matchMap = new Map();

  for (const offset of [0, 100]) {
    if (offset > 0) await sleep(RATE_LIMIT_MS);
    try {
      const url = `${W3C_API}/matches?offset=${offset}&gateway=20&pageSize=100&gameMode=4&map=Overall`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      for (const m of (data.matches || [])) {
        if (matchMap.has(m.id)) continue;
        if (m.durationInSeconds != null && m.durationInSeconds < 300) continue;
        const players = [];
        const mmrs = [];
        for (const team of m.teams || []) {
          for (const p of team.players || []) {
            players.push({ name: p.name || p.battleTag?.split('#')[0], battleTag: p.battleTag });
            if (p.oldMmr > 0) mmrs.push(p.oldMmr);
          }
        }
        const avgMmr = mmrs.length ? mmrs.reduce((a, b) => a + b, 0) / mmrs.length : 0;
        matchMap.set(m.id, { matchId: m.id, players, avgMmr });
      }
    } catch { /* skip */ }
  }

  // Deduplicate against DB
  const allIds = [...matchMap.keys()];
  if (allIds.length === 0) return [];
  const existing = getExistingW3cMatchIds(allIds);
  const newMatches = allIds
    .filter(id => !existing.has(id))
    .map(id => matchMap.get(id))
    .sort((a, b) => b.avgMmr - a.avgMmr);

  console.log(`[Importer] Discovered ${matchMap.size} matches, ${existing.size} already imported, ${newMatches.length} new`);
  return newMatches;
}

/**
 * Import a single W3C match: download → parse → store → fingerprint → embed.
 */
async function importMatch({ matchId, players: w3cPlayers }) {
  // Double-check dedup
  if (getReplayByW3cMatchId(matchId)) return { status: 'skipped' };

  // Download .w3g
  const w3cUrl = `${W3C_API}/replays/${encodeURIComponent(matchId)}`;
  const dlRes = await fetch(w3cUrl);
  if (!dlRes.ok) {
    if (dlRes.status === 404) return { status: 'no_replay' };
    if (dlRes.status === 429) return { status: 'rate_limited' };
    return { status: 'download_error', code: dlRes.status };
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

  // Parse. raw_parsed is intentionally not stored — nothing reads it, and at
  // ~1MB per replay it was the main driver of DB bloat. W3C can re-serve any
  // replay by match ID if a re-parse is ever needed.
  const parsed = await parseReplayFile(filePath);
  updateReplayParsed(replayId, {
    gameName: parsed.metadata.gameName,
    gameDuration: parsed.metadata.gameDuration,
    mapName: parsed.metadata.mapName,
    matchType: parsed.metadata.matchType,
    matchDate: parsed.metadata.matchDate,
    rawParsed: null,
  });

  // Match battletags
  const playerTagMap = {};
  if (Array.isArray(w3cPlayers)) {
    for (const wp of w3cPlayers) {
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
    const fingerprints = parsed.actions.map(a => {
      const fp = buildServerFingerprint({
        rightclick: a.rightclick, ability: a.ability,
        buildtrain: a.buildtrain, item: a.item,
        selecthotkey: a.selecthotkey, assigngroup: a.assigngroup,
        timed_segments: a.timedSegments,
        group_hotkeys: a.groupHotkeys,
        full_action_sequence: a.fullActionSequence,
      });
      const player = playersWithTags.find(p => p.playerId === a.playerId);
      return {
        playerId: a.playerId, battleTag: player?.battleTag || null,
        playerName: player?.playerName || '', race: player?.race || null,
        ...fp,
      };
    });
    if (fingerprints.length > 0) insertPlayerFingerprints(replayId, fingerprints);

    // Neural embeddings (fire-and-forget)
    computeEmbeddingsAsync(replayId, parsed.actions).catch(() => {});
  } catch { /* fingerprint error is non-fatal */ }

  // Everything useful is extracted — drop the .w3g to keep the volume from
  // filling up (root cause of the June 2026 corruption). Only delete the file
  // THIS import wrote; orphaned files from older imports are left alone.
  try { unlinkSync(filePath); } catch { /* already gone */ }

  return { status: 'imported', replayId, playerCount: playersWithTags.length };
}

async function computeEmbeddingsAsync(replayId, actions) {
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
}

/**
 * Run one import cycle: discover if needed, then import up to IMPORTS_PER_CYCLE.
 */
async function runCycle() {
  if (isRunning) return;
  if (!diskHasHeadroom()) return;
  if (rateLimitCooldown > 0) {
    rateLimitCooldown--;
    return;
  }
  isRunning = true;

  try {
    // Discover new matches if queue is low
    if (importQueue.length < IMPORTS_PER_CYCLE) {
      if (discoverCooldown <= 0) {
        const newMatches = await discoverMatches();
        importQueue.push(...newMatches);
        // Don't discover again for 3 cycles even if queue empties
        discoverCooldown = 3;
      } else {
        discoverCooldown--;
      }
    }

    if (importQueue.length === 0) {
      isRunning = false;
      return;
    }

    // Cool down after discovery before starting downloads
    await sleep(30_000);

    // Import up to N matches
    const batch = importQueue.splice(0, IMPORTS_PER_CYCLE);
    let imported = 0, skipped = 0, errors = 0;

    for (const match of batch) {
      await sleep(RATE_LIMIT_MS);
      try {
        const result = await importMatch(match);
        if (result.status === 'imported') imported++;
        else if (result.status === 'rate_limited') {
          // Keep the (MMR-sorted) queue and pause; the W3C daily budget
          // resets on its own. Put the failed match back at the front.
          importQueue.unshift(match, ...batch.slice(batch.indexOf(match) + 1));
          rateLimitCooldown = RATE_LIMIT_PAUSE_CYCLES;
          console.log(`[Importer] Rate limited — pausing imports for ${RATE_LIMIT_PAUSE_CYCLES} cycles (~1h), ${importQueue.length} queued`);
          break;
        } else {
          skipped++;
        }
      } catch (err) {
        console.error(`[Importer] Error importing ${match.matchId}:`, err.message);
        errors++;
      }
    }

    if (imported > 0 || errors > 0) {
      console.log(`[Importer] Cycle done: ${imported} imported, ${skipped} skipped, ${errors} errors, ${importQueue.length} queued`);
    }
  } catch (err) {
    console.error('[Importer] Cycle error:', err.message);
  }

  isRunning = false;
}

/**
 * Import recent matches for a specific player (on-demand).
 * Fetches 25 matches, filters short games, tries up to 10 downloads to hit targetImports.
 * Returns { discovered, alreadyImported, imported, errors, noReplay, filteredShort }.
 */
export async function importPlayerMatches(battleTag, targetImports = 3, seasonOverride = null) {
  if (!diskHasHeadroom()) throw new Error('Disk space low — imports are paused');
  let season = seasonOverride;
  if (!season) {
    season = 24;
    try {
      const res = await fetch(`${W3C_API}/ladder/seasons`);
      if (res.ok) {
        const seasons = await res.json();
        if (seasons?.length > 0) season = seasons[0].id;
      }
    } catch { /* use default */ }
  }

  const fetchSize = 25;
  const maxAttempts = 10;
  const url = `${W3C_API}/matches/search?playerId=${encodeURIComponent(battleTag)}&offset=0&gameMode=4&season=${season}&gateway=20&pageSize=${fetchSize}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`W3C API returned ${res.status}`);
  const data = await res.json();

  let filteredShort = 0;
  const candidates = [];
  for (const m of (data.matches || [])) {
    if (m.durationInSeconds != null && m.durationInSeconds < 300) {
      filteredShort++;
      continue;
    }
    const players = [];
    for (const team of m.teams || []) {
      for (const p of team.players || []) {
        players.push({ name: p.name || p.battleTag?.split('#')[0], battleTag: p.battleTag });
      }
    }
    candidates.push({ matchId: m.id, players });
  }

  const allIds = candidates.map(c => c.matchId);
  const existing = getExistingW3cMatchIds(allIds);
  const newMatches = candidates.filter(c => !existing.has(c.matchId));

  let imported = 0, errors = 0, noReplay = 0, attempts = 0;
  for (const match of newMatches) {
    if (imported >= targetImports || attempts >= maxAttempts) break;
    await sleep(RATE_LIMIT_MS);
    attempts++;
    try {
      const result = await importMatch(match);
      if (result.status === 'imported') imported++;
      else if (result.status === 'no_replay') noReplay++;
    } catch (err) {
      console.error(`[Importer] Manual import error ${match.matchId}:`, err.message);
      errors++;
    }
  }

  console.log(`[Importer] Manual import for ${battleTag}: ${candidates.length} candidates, ${filteredShort} short filtered, ${existing.size} existing, ${imported} imported, ${noReplay} no replay, ${errors} errors`);
  return { discovered: candidates.length, alreadyImported: existing.size, imported, errors, noReplay, filteredShort };
}

/**
 * Start the background importer. Call once at server startup.
 */
export function startReplayImporter() {
  // First cycle after 30s delay (let server finish starting up)
  setTimeout(() => {
    runCycle();
    setInterval(runCycle, CYCLE_MS);
  }, 30_000);

  console.log(`[Importer] Scheduled: ${IMPORTS_PER_CYCLE} replays every ${CYCLE_MS / 60000} min`);
}
