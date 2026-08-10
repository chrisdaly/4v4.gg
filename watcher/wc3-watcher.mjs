/**
 * WC3 replay watcher — local SSE server for the 4v4.gg overlay.
 *
 * Watches LastReplay.w3g for modification (fires ~5s after a game ends),
 * parses it with w3gjs, and broadcasts a `game_end` event to connected
 * browser sources.
 *
 * Usage:
 *   STREAMER_NAME=FOALS npm start
 *
 * Env vars:
 *   STREAMER_NAME   Your in-game name (not battle tag) — used for logging
 *   REPLAY_PATH     Override the default LastReplay.w3g path
 *   PORT            SSE server port (default: 3456)
 *
 * Default replay path (Windows):
 *   %USERPROFILE%\Documents\Warcraft III\BattleNet\**\Replays\LastReplay.w3g
 *
 * In OBS, add &watcher=http://localhost:3456 to your Screens source URL.
 */

import chokidar from 'chokidar';
import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const PORT = parseInt(process.env.PORT || '3456', 10);
const STREAMER_NAME = process.env.STREAMER_NAME || '';
const REPLAY_PATH = process.env.REPLAY_PATH || path.join(
  os.homedir(), 'Documents', 'Warcraft III', 'BattleNet', '**', 'Replays', 'LastReplay.w3g'
);

// ── SSE client registry ───────────────────────────────────────────────────────

const clients = new Set();

function broadcast(data) {
  const msg = `data: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) {
    try { res.write(msg); } catch { clients.delete(res); }
  }
  console.log('[broadcast]', data);
}

// ── Replay parsing ────────────────────────────────────────────────────────────

async function parseReplay(filePath) {
  try {
    const { parse } = require('w3gjs');
    const buffer = fs.readFileSync(filePath);
    const replay = parse(buffer);

    const duration = Math.round((replay.header?.replayLength ?? 0) / 1000);

    const players = (replay.players || []).map(p => ({
      name: p.name,
      teamId: p.teamId,
      race: p.raceDetected || p.race || null,
    }));

    // Best-effort winner detection: look for a winnerId or winning team
    // w3gjs doesn't expose `won` directly — we rely on the W3C API for
    // authoritative result; this is just for logging.
    const streamerPlayer = STREAMER_NAME
      ? players.find(p => p.name?.toLowerCase().includes(STREAMER_NAME.toLowerCase()))
      : null;

    return { players, duration, streamerTeamId: streamerPlayer?.teamId ?? null };
  } catch (e) {
    console.error('[watcher] Parse failed:', e.message);
    return { players: [], duration: null, streamerTeamId: null };
  }
}

// ── File watcher ──────────────────────────────────────────────────────────────

chokidar.watch(REPLAY_PATH, {
  usePolling: false,
  awaitWriteFinish: { stabilityThreshold: 3000, pollInterval: 500 },
  ignoreInitial: true,
}).on('change', async (filePath) => {
  console.log('[watcher] LastReplay.w3g updated:', filePath);
  const { players, duration, streamerTeamId } = await parseReplay(filePath);
  broadcast({ type: 'game_end', players, duration, streamerTeamId });
}).on('error', err => {
  console.error('[watcher] Chokidar error:', err);
});

console.log('[watcher] Watching:', REPLAY_PATH);
if (STREAMER_NAME) console.log('[watcher] Streamer name:', STREAMER_NAME);

// ── HTTP / SSE server ─────────────────────────────────────────────────────────

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });
    res.write(':connected\n\n');
    clients.add(res);
    console.log(`[watcher] SSE client connected (${clients.size} total)`);

    const heartbeat = setInterval(() => {
      try { res.write(':ping\n\n'); } catch { clients.delete(res); clearInterval(heartbeat); }
    }, 25000);

    req.on('close', () => {
      clients.delete(res);
      clearInterval(heartbeat);
      console.log(`[watcher] SSE client disconnected (${clients.size} remaining)`);
    });
    return;
  }

  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, clients: clients.size, replayPath: REPLAY_PATH }));
    return;
  }

  res.writeHead(404);
  res.end();
}).listen(PORT, '127.0.0.1', () => {
  console.log(`[watcher] Ready — http://localhost:${PORT}`);
  console.log(`[watcher] SSE endpoint  — http://localhost:${PORT}/events`);
  console.log(`[watcher] Health check  — http://localhost:${PORT}/health`);
  console.log(`[watcher] Add to Screens source URL: &watcher=http://localhost:${PORT}`);
});
