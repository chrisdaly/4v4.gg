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
import { startClipScheduler } from './clips.js';

const app = express();

app.use(cors({ origin: config.CORS_ORIGINS }));
app.use(express.json());

app.use('/api/chat', chatRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/clips', clipRoutes);
// Mount health at top level too for convenience
app.get('/api/health', (req, res, next) => {
  req.url = '/health';
  adminRoutes(req, res, next);
});

initDb();
console.log(`[DB] Initialized at ${config.DB_PATH}`);

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

app.listen(config.PORT, () => {
  console.log(`[Server] Chat relay listening on :${config.PORT}`);
});
