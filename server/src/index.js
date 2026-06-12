import express from 'express';
import cors from 'cors';
import config from './config.js';
import { initDb, deleteOldEvents } from './db.js';
import { startHeartbeat } from './sse.js';
import { startSignalR } from './signalr.js';
import { initBot } from './bot.js';
import { startScheduler } from './digest.js';
import { startMatchPolling } from './matches.js';
import chatRoutes from './routes/chat.js';
import adminRoutes from './routes/admin.js';
import clipRoutes from './routes/clips.js';
import replayRoutes from './routes/replays.js';
import fingerprintRoutes, { warmCaches } from './routes/fingerprints.js';
import blogRoutes from './routes/blog.js';
import ogRoutes from './routes/og.js';
import twitchRoutes from './routes/twitch.js';
import { startClipScheduler } from './clips.js';
import { startFeedbackScheduler } from './feedback.js';
import { startReplayImporter } from './replayImporter.js';
import { startGameAnnouncer } from './gameAnnouncer.js';
import { startTokenMonitor, getTokenHealth } from './tokenMonitor.js';

const app = express();
app.set('trust proxy', 1);

app.use(cors({ origin: config.CORS_ORIGINS }));
app.use(express.json());

app.use('/api/chat', chatRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/clips', clipRoutes);
app.use('/api/replays', replayRoutes);
app.use('/api/fingerprints', fingerprintRoutes);
app.use('/api/blog', blogRoutes);
app.use('/api/twitch', twitchRoutes);
app.use('/og', ogRoutes);
// Lightweight health check for Fly proxy (must respond fast)
app.get('/api/health', (_req, res) => {
  let token = {};
  try { token = getTokenHealth(); } catch { /* keep health fast and infallible */ }
  res.json({ status: 'ok', uptime: process.uptime(), ...token });
});

initDb();
console.log(`[DB] Initialized at ${config.DB_PATH}`);

if (!config.ADMIN_API_KEY) {
  console.warn('[SECURITY] ADMIN_API_KEY is empty — admin endpoints will reject all requests.');
}

startHeartbeat();

initBot().catch(err => {
  console.error('[Bot] Init error:', err.message);
});

startSignalR().catch(err => {
  console.error('[SignalR] Startup error:', err.message);
});

startScheduler();

// Match polling — detects game_start/game_end events
startMatchPolling();

// Clips — fetch Twitch clips from WC3 streamers
startClipScheduler();

// Feedback — scan chat for site feedback, create GitHub issues
startFeedbackScheduler();

// Replay importer — drip-import replays from W3C ladder players
startReplayImporter();
startGameAnnouncer();

// Token monitor — warn + file GitHub issue before the weekly W3C JWT expires
startTokenMonitor();

// Event cleanup — delete events older than 14 days, run every 6 hours
const runCleanup = () => {
  try {
    const deleted = deleteOldEvents(14);
    if (deleted > 0) console.log(`[Cleanup] Removed ${deleted} old events`);
  } catch (err) {
    console.error('[Cleanup] Error:', err.message);
  }
};
runCleanup();
setInterval(runCleanup, 6 * 60 * 60 * 1000);

// WAL checkpoint — flush WAL data into main DB file every 30 minutes
// so volume snapshots capture a consistent database and the WAL stays small
import { walCheckpoint, closeDb } from './db.js';
const runCheckpoint = () => {
  try {
    const result = walCheckpoint();
    console.log(`[Checkpoint] WAL flushed (busy: ${result.busy}, log: ${result.log}, checkpointed: ${result.checkpointed})`);
  } catch (err) {
    console.error('[Checkpoint] Error:', err.message);
  }
};
// When Litestream is replicating (BUCKET_NAME set), it owns WAL
// checkpointing — a competing TRUNCATE checkpoint would only ever report busy.
if (!process.env.BUCKET_NAME) {
  setInterval(runCheckpoint, 30 * 60 * 1000);
}

// Graceful shutdown — checkpoint + close the DB so deploys never leave a
// mid-write WAL behind
let shuttingDown = false;
const shutdown = (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[Server] ${signal} received, closing DB and exiting...`);
  closeDb();
  process.exit(0);
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

app.listen(config.PORT, () => {
  console.log(`[Server] Chat relay listening on :${config.PORT}`);

  // Warm heavy caches after a delay so health check passes first
  setTimeout(() => {
    warmCaches().catch(err => console.error('[Cache] Warmup error:', err.message));
  }, 3000);
});
