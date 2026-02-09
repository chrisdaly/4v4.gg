import express from 'express';
import cors from 'cors';
import config from './config.js';
import { initDb } from './db.js';
import { startHeartbeat } from './sse.js';
import { startSignalR } from './signalr.js';
import { initBot } from './bot.js';
import chatRoutes from './routes/chat.js';
import adminRoutes from './routes/admin.js';

const app = express();

app.use(cors({ origin: config.CORS_ORIGINS }));
app.use(express.json());

app.use('/api/chat', chatRoutes);
app.use('/api/admin', adminRoutes);
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

app.listen(config.PORT, () => {
  console.log(`[Server] Chat relay listening on :${config.PORT}`);
});
