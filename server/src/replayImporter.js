/**
 * Background Drip Replay Importer
 *
 * Runs on a timer to slowly discover and import W3C replays.
 * Avoids rate limiting by importing only a few replays per cycle.
 *
 * Cycle (every 10 min):
 *   1. If queue is empty, discover new matches from GM/Master/Diamond/Platinum ladder
 *   2. Import up to 5 queued matches (download → parse → fingerprint → embed)
 */

import config from './config.js';
import { writeFileSync } from 'fs';
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
const CYCLE_MS = 10 * 60 * 1000; // 10 minutes
const IMPORTS_PER_CYCLE = 5;
const RATE_LIMIT_MS = 5000; // 5s between W3C API calls

const REPLAY_DIR = config.REPLAY_DIR.startsWith('/')
  ? config.REPLAY_DIR
  : join(process.cwd(), config.REPLAY_DIR);

// In-memory queue (simple — no need for a DB table since it's rebuilt each discover cycle)
let importQueue = [];
let isRunning = false;
let discoverCooldown = 0; // skip discover if we recently filled the queue

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Discover new matches from GM + Master ladder players.
 * Returns array of { matchId, players } not yet in DB.
 */
async function discoverMatches() {
  const battleTags = new Set();

  // Fetch current season
  let season = 24;
  try {
    const res = await fetch(`${W3C_API}/ladder/seasons`);
    if (res.ok) {
      const seasons = await res.json();
      if (seasons?.length > 0) season = seasons[0].id;
    }
  } catch { /* use default */ }

  // Fetch GM (0), Master (1), Diamond (2), Platinum (3) players
  for (const leagueId of [0, 1, 2, 3]) {
    await sleep(RATE_LIMIT_MS);
    try {
      const url = `${W3C_API}/ladder/${leagueId}?gateWay=20&gameMode=4&season=${season}`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const entries = await res.json();
      for (const entry of (Array.isArray(entries) ? entries : []).slice(0, 100)) {
        const tag = entry?.player?.playerIds?.[0]?.battleTag
          || entry?.playersInfo?.[0]?.battleTag;
        if (tag) battleTags.add(tag);
      }
    } catch { /* skip */ }
  }

  if (battleTags.size === 0) {
    console.log('[Importer] No ladder players found');
    return [];
  }

  // Fetch recent matches for each player
  const matchMap = new Map();
  let checked = 0;
  for (const tag of battleTags) {
    if (checked++ > 50) break; // check first 50 players per discover cycle
    await sleep(RATE_LIMIT_MS);
    try {
      const url = `${W3C_API}/matches?playerId=${encodeURIComponent(tag)}&offset=0&gameMode=4&season=${season}&gateway=20&pageSize=10`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      for (const m of (data.matches || [])) {
        if (matchMap.has(m.id)) continue;
        const players = [];
        for (const team of m.teams || []) {
          for (const p of team.players || []) {
            players.push({ name: p.name || p.battleTag?.split('#')[0], battleTag: p.battleTag });
          }
        }
        matchMap.set(m.id, { matchId: m.id, players });
      }
    } catch { /* skip */ }
  }

  // Deduplicate against DB
  const allIds = [...matchMap.keys()];
  if (allIds.length === 0) return [];
  const existing = getExistingW3cMatchIds(allIds);
  const newMatches = allIds.filter(id => !existing.has(id));

  console.log(`[Importer] Discovered ${matchMap.size} matches, ${existing.size} already imported, ${newMatches.length} new`);
  return newMatches.map(id => matchMap.get(id));
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

    // Import up to N matches
    const batch = importQueue.splice(0, IMPORTS_PER_CYCLE);
    let imported = 0, skipped = 0, errors = 0;

    for (const match of batch) {
      await sleep(RATE_LIMIT_MS);
      try {
        const result = await importMatch(match);
        if (result.status === 'imported') imported++;
        else if (result.status === 'rate_limited') {
          // Put it back and stop this cycle
          importQueue.unshift(match);
          console.log('[Importer] Rate limited, will retry next cycle');
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
