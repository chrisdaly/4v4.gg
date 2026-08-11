/**
 * WC3 Reforged control group visualizer — cg-watcher.mjs
 *
 * Reads TempReplay.w3g incrementally during gameplay and extracts control
 * group assignments (action 0x17) and selections (action 0x18).
 * Serves a browser UI at http://localhost:3456 and pushes live state via
 * WebSocket.
 *
 * Usage (Windows):
 *   npm start
 *   Then open http://localhost:3456 on your second monitor.
 *
 * Env vars:
 *   PORT              WebSocket/HTTP port (default: 3456)
 *   PLAYER_ID         Filter to one player ID 1–12 (default: all players)
 *   TEMP_REPLAY_PATH  Override the TempReplay.w3g path
 *
 * Default TempReplay.w3g path (Windows):
 *   C:\Program Files (x86)\Warcraft III\TempReplay.w3g
 *   (Set TEMP_REPLAY_PATH if yours is elsewhere — try Documents\Warcraft III\)
 */

import chokidar from 'chokidar';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { readFileSync, existsSync } from 'fs';
import { inflateSync, inflateRawSync } from 'zlib';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT        = parseInt(process.env.PORT || '3456', 10);
const PLAYER_ID   = process.env.PLAYER_ID ? parseInt(process.env.PLAYER_ID, 10) : null;
const DEBUG       = process.env.DEBUG === '1';

// TempReplay.w3g is written continuously while WC3 is running.
// Classic WC3 / Reforged write it to the game installation directory.
const DEFAULT_PATH = process.platform === 'win32'
  ? path.join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'Warcraft III', 'TempReplay.w3g')
  : path.join(os.homedir(), 'Documents', 'Warcraft III', 'TempReplay.w3g');

const TEMP_REPLAY_PATH = process.env.TEMP_REPLAY_PATH || DEFAULT_PATH;

// ── Action sizes (bytes after the action ID byte) ────────────────────────────
// When an unknown action ID is hit we can no longer advance within that
// player's block — but we still move on to the next player using the
// declared action_data_length, so we only miss 0x17 actions that come
// after an unknown action in the same 100ms timeslot (rare in practice).
//
// Sizes sourced from: gamedevs.org w3g spec, w3gjs, community parsers.
const ACTION_SIZES = {
  0x01: 0,    // Pause game
  0x02: 0,    // Resume game
  0x03: 4,    // Obsolete set game speed
  0x04: 1,    // Increase game speed
  0x05: 1,    // Decrease game speed
  0x06: 5,    // Save game
  0x07: 4,    // Save game finished
  0x10: 1,    // Set game speed
  0x11: 0,    // Increase game speed
  0x12: 0,    // Decrease game speed
  0x14: 0,    // Save game finished (2)
  // 0x17: handled separately (variable: group_num + unit_count + n*8 bytes)
  0x18: 2,    // Select group (group_num + flags)
  0x19: 9,    // Select subgroup
  0x1A: 0,
  0x1B: 0,
  0x1C: 8,
  0x1D: 0,
  0x1E: 0,
  0x1F: 8,    // Use item
  0x20: 0,
  0x21: 20,   // Ability — no target (flags:2 + abilityId:4 + abilityId2:4 + unk:4 + unk:4 + unk:2)
  0x22: 0,
  0x23: 0,
  0x24: 4,
  0x25: 4,
  0x26: 24,   // Ability — ground target (no-target + 4 + 4 for coords)
  0x27: 0,
  0x28: 4,
  0x29: 4,
  0x2A: 4,
  0x2B: 4,
  0x2C: 44,   // Ability — two targets / item drop
  0x2D: 0,
  0x2E: 4,
  0x2F: 16,   // Give/drop item
  0x30: 16,
  0x31: 8,
  0x32: 5,    // Change selection (Shift+click add/remove)
  0x50: 1,    // ESC pressed
  0x51: 4,
  0x60: 1,
  0x61: 4,    // Transfer resources to ally
  0x66: 1,    // Reforged: selection sync?
  0x68: 4,
  0x75: 1,
};

// ── State ─────────────────────────────────────────────────────────────────────

const createState = () => ({
  groups: Array.from({ length: 10 }, () => ({
    count: 0,
    units: [],      // [[id1,id2], ...] raw ObjectID pairs — type not decodable from replay alone
    assignedAt: null, // game time in ms when last assigned
  })),
  selectedGroup: null, // index 0–9 of currently selected group (from 0x18)
  gameTime: 0,         // ms into the game, from accumulated timeslot increments
  gameRunning: false,
});

let state = createState();

// ── W3G parser ────────────────────────────────────────────────────────────────

function parseW3G(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf.slice(0, 4).toString('ascii') !== 'HM3W') return null;

  if (DEBUG) {
    console.log('[debug] Header bytes:', buf.slice(0, 32).toString('hex'));
  }

  // Offset 0x04 = byte offset of the first compressed block (header end).
  // Try several candidate offsets in case of version differences.
  let firstBlock = buf.readUInt32LE(0x04);
  if (firstBlock < 28 || firstBlock > 4096 || firstBlock >= buf.length) {
    firstBlock = buf.readUInt32LE(0x08);
  }
  if (firstBlock < 28 || firstBlock > 4096 || firstBlock >= buf.length) {
    firstBlock = 0x44; // Reforged default fallback
  }

  if (DEBUG) {
    console.log('[debug] firstBlock offset:', firstBlock, '(0x' + firstBlock.toString(16) + ')');
  }

  const s = createState();
  s.gameRunning = true;

  let offset = firstBlock;

  while (offset + 8 <= buf.length) {
    const compLen   = buf.readUInt16LE(offset);
    // buf.readUInt16LE(offset + 2) is decompressedLen — not needed since inflate tells us
    const dataStart = offset + 8; // 2+2+4 = 8 byte block header

    if (dataStart + compLen > buf.length) break; // incomplete block — stop

    const compressed = buf.slice(dataStart, dataStart + compLen);
    offset = dataStart + compLen;

    let decompressed;
    try {
      decompressed = inflateSync(compressed); // zlib-wrapped deflate
    } catch {
      try {
        decompressed = inflateRawSync(compressed); // raw deflate fallback
      } catch {
        continue; // skip bad block
      }
    }

    parseBlock(decompressed, s);
  }

  return s;
}

// Parse decompressed block data — a sequence of records.
// Returns false if an unknown record is hit (caller may choose to skip block).
function parseBlock(buf, s) {
  let pos = 0;

  while (pos < buf.length) {
    const rt = buf[pos];
    if (rt === 0x00) break; // end-of-block marker

    // Timeslot record (2-byte time increment) — the main one we care about
    if (rt === 0x17) {
      pos++;
      if (pos + 4 > buf.length) break;
      const timeInc       = buf.readUInt16LE(pos); pos += 2;
      const actionBlockLen = buf.readUInt16LE(pos); pos += 2;
      s.gameTime += timeInc;
      if (pos + actionBlockLen > buf.length) break;
      parseActionBlock(buf, pos, actionBlockLen, s);
      pos += actionBlockLen;
      continue;
    }

    // Timeslot record (1-byte time increment) — used in some versions
    if (rt === 0x1A) {
      pos++;
      if (pos + 3 > buf.length) break;
      const timeInc       = buf[pos++];
      const actionBlockLen = buf.readUInt16LE(pos); pos += 2;
      s.gameTime += timeInc;
      if (pos + actionBlockLen > buf.length) break;
      parseActionBlock(buf, pos, actionBlockLen, s);
      pos += actionBlockLen;
      continue;
    }

    // Player left record
    if (rt === 0x1E) { pos += 14; continue; }

    // CountDown pause / resume
    if (rt === 0x22 || rt === 0x23) { pos += 9; continue; }

    // Forced game start / countdown end
    if (rt === 0x2F) { pos += 5; continue; }

    // Unknown record (game start block 0x20, player slot 0x32, etc.)
    // We can't determine the size, so stop parsing this block.
    // The next compressed block will likely be all timeslots.
    if (DEBUG) console.log('[debug] Unknown record type:', '0x' + rt.toString(16), 'at pos', pos);
    return;
  }
}

function parseActionBlock(buf, start, length, s) {
  let pos = start;
  const end = start + length;

  while (pos + 3 <= end) {
    const playerId     = buf[pos++];
    const actionDataLen = buf.readUInt16LE(pos); pos += 2;
    const actionEnd    = pos + actionDataLen;

    if (actionEnd > end) break;

    // Filter to specific player if configured
    if (PLAYER_ID === null || playerId === PLAYER_ID) {
      parsePlayerActions(buf, pos, actionDataLen, s, playerId);
    }

    pos = actionEnd; // always advance by declared length, even on unknown actions
  }
}

function parsePlayerActions(buf, start, length, s, playerId) {
  let pos = start;
  const end = start + length;

  while (pos < end) {
    if (pos >= buf.length) break;
    const actionId = buf[pos];

    // ── Action 0x17: Assign Group ─────────────────────────────────────────────
    if (actionId === 0x17) {
      pos++;
      if (pos + 3 > end) break;
      const groupNum  = buf[pos++];
      const unitCount = buf.readUInt16LE(pos); pos += 2;

      if (unitCount > 200) { break; } // sanity check — bail if clearly corrupted

      const units = [];
      for (let i = 0; i < unitCount; i++) {
        if (pos + 8 > end) break;
        const id1 = buf.readUInt32LE(pos); pos += 4;
        const id2 = buf.readUInt32LE(pos); pos += 4;
        units.push([id1, id2]);
      }

      if (groupNum <= 9) {
        s.groups[groupNum] = { count: units.length, units, assignedAt: s.gameTime };
        if (DEBUG) {
          const key = groupNum === 9 ? '0' : String(groupNum + 1);
          console.log(`[action] P${playerId} assigned ${units.length}u to group ${key} @ ${formatMs(s.gameTime)}`);
        }
      }
      continue;
    }

    // ── Action 0x18: Select Group ─────────────────────────────────────────────
    if (actionId === 0x18) {
      pos++;
      if (pos + 2 > end) break;
      const groupNum = buf[pos++];
      pos++; // flags byte (usually 0x03)
      if (groupNum <= 9) {
        s.selectedGroup = groupNum;
      }
      continue;
    }

    // ── Action 0x19: Select Subgroup ──────────────────────────────────────────
    if (actionId === 0x19) { pos += 1 + 9; continue; }

    // ── Fixed-size action — skip ──────────────────────────────────────────────
    pos++;
    const size = ACTION_SIZES[actionId];
    if (size === undefined) {
      // Unknown action size — can't continue within this player block.
      // Any 0x17 actions after this point in the same timeslot are missed.
      if (DEBUG) console.log('[debug] Unknown action:', '0x' + actionId.toString(16), 'for P' + playerId);
      break;
    }
    pos += size;
  }
}

// ── File watcher ──────────────────────────────────────────────────────────────
//
// TempReplay.w3g is written continuously (~every 100ms timeslot) so we cannot
// use awaitWriteFinish — the file never "settles". Instead we watch for the
// file's appearance / removal (game start / end) and poll at 1s intervals
// while the game is running. Partial last-block reads are safe: parseW3G()
// skips any incomplete compressed block at the end of the file.

let lastStateJson = '';
let pollInterval  = null;
let activePath    = null;

function processReplay(filePath) {
  if (!existsSync(filePath)) return;
  try {
    const buf      = readFileSync(filePath);
    const newState = parseW3G(buf);
    if (!newState) return;

    const json = JSON.stringify(newState);
    if (json === lastStateJson) return;
    lastStateJson = json;
    state = newState;

    broadcast({ type: 'state', ...newState });

    const filled = newState.groups
      .map((g, i) => g.count ? `${i === 9 ? '0' : i + 1}:${g.count}u` : null)
      .filter(Boolean);
    const sel = newState.selectedGroup !== null
      ? (newState.selectedGroup === 9 ? '0' : newState.selectedGroup + 1)
      : '—';
    console.log(`[cg] ${formatMs(newState.gameTime)} | ${filled.join(' ') || 'all empty'} | sel: ${sel}`);
  } catch (e) {
    console.error('[cg] Error reading/parsing replay:', e.message);
  }
}

function startPolling(filePath) {
  activePath = filePath;
  clearInterval(pollInterval);
  processReplay(filePath); // parse immediately
  pollInterval = setInterval(() => processReplay(filePath), 1000);
  console.log('[cg] Game started — polling every 1s');
}

function stopPolling() {
  clearInterval(pollInterval);
  pollInterval  = null;
  activePath    = null;
  lastStateJson = '';
  state = createState();
  broadcast({ type: 'state', ...state });
  console.log('[cg] TempReplay.w3g removed — game ended or crashed');
}

chokidar.watch(TEMP_REPLAY_PATH, {
  usePolling: false,
  ignoreInitial: false,   // fire 'add' if the file already exists at startup (mid-game)
})
  .on('add',    startPolling)
  .on('unlink', stopPolling)
  .on('error',  err => console.error('[cg] Watch error:', err));

console.log('[cg] Watching:', TEMP_REPLAY_PATH);
if (PLAYER_ID !== null) console.log('[cg] Player ID filter:', PLAYER_ID);
if (DEBUG) console.log('[cg] Debug mode ON');

// ── WebSocket + HTTP server ───────────────────────────────────────────────────

const viewerHtml = readFileSync(path.join(__dirname, 'viewer.html'), 'utf8');

const httpServer = createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, replayPath: TEMP_REPLAY_PATH, gameRunning: state.gameRunning }));
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(viewerHtml);
});

const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', (ws) => {
  console.log('[cg] Browser connected');
  ws.send(JSON.stringify({ type: 'state', ...state }));
  ws.on('close', () => console.log('[cg] Browser disconnected'));
});

function broadcast(data) {
  const msg = JSON.stringify(data);
  for (const ws of wss.clients) {
    if (ws.readyState === 1 /* OPEN */) ws.send(msg);
  }
}

httpServer.listen(PORT, '127.0.0.1', () => {
  console.log(`[cg] Open in browser → http://localhost:${PORT}`);
  console.log(`[cg] Health check    → http://localhost:${PORT}/health`);
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatMs(ms) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
