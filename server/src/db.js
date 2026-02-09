import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { dirname } from 'path';
import config from './config.js';

let db;

export function initDb() {
  mkdirSync(dirname(config.DB_PATH), { recursive: true });

  db = new Database(config.DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');

  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id          TEXT PRIMARY KEY,
      battle_tag  TEXT NOT NULL,
      user_name   TEXT NOT NULL,
      clan_tag    TEXT DEFAULT '',
      message     TEXT NOT NULL,
      sent_at     TEXT NOT NULL,
      received_at TEXT NOT NULL DEFAULT (datetime('now')),
      room        TEXT NOT NULL DEFAULT '4 vs 4',
      deleted     INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_messages_sent_at ON messages(sent_at DESC);

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS daily_digests (
      date       TEXT PRIMARY KEY,
      digest     TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  return db;
}

export function insertMessage(msg) {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO messages (id, battle_tag, user_name, clan_tag, message, sent_at, room)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  return stmt.run(
    msg.id,
    msg.battleTag,
    msg.userName,
    msg.clanTag || '',
    msg.message,
    msg.sentAt,
    msg.room || '4 vs 4'
  );
}

export function insertMessages(msgs) {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO messages (id, battle_tag, user_name, clan_tag, message, sent_at, room)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const tx = db.transaction((messages) => {
    for (const msg of messages) {
      stmt.run(
        msg.id,
        msg.battleTag,
        msg.userName,
        msg.clanTag || '',
        msg.message,
        msg.sentAt,
        msg.room || '4 vs 4'
      );
    }
  });
  tx(msgs);
}

export function getMessages({ limit = 50, before = null } = {}) {
  if (before) {
    return db.prepare(`
      SELECT * FROM messages
      WHERE deleted = 0 AND sent_at < ?
      ORDER BY sent_at DESC
      LIMIT ?
    `).all(before, limit);
  }
  return db.prepare(`
    SELECT * FROM messages
    WHERE deleted = 0
    ORDER BY sent_at DESC
    LIMIT ?
  `).all(limit);
}

export function markDeleted(messageId) {
  return db.prepare('UPDATE messages SET deleted = 1 WHERE id = ?').run(messageId);
}

export function markBulkDeleted(messageIds) {
  const tx = db.transaction((ids) => {
    const stmt = db.prepare('UPDATE messages SET deleted = 1 WHERE id = ?');
    for (const id of ids) {
      stmt.run(id);
    }
  });
  tx(messageIds);
}

export function getStats() {
  const total = db.prepare('SELECT COUNT(*) as count FROM messages WHERE deleted = 0').get();
  const deleted = db.prepare('SELECT COUNT(*) as count FROM messages WHERE deleted = 1').get();
  const users = db.prepare('SELECT COUNT(DISTINCT battle_tag) as count FROM messages WHERE deleted = 0').get();
  const last24h = db.prepare(`
    SELECT COUNT(*) as count FROM messages
    WHERE deleted = 0 AND received_at > datetime('now', '-1 day')
  `).get();
  const last7d = db.prepare(`
    SELECT COUNT(*) as count FROM messages
    WHERE deleted = 0 AND received_at > datetime('now', '-7 days')
  `).get();
  const oldest = db.prepare('SELECT MIN(received_at) as ts FROM messages WHERE deleted = 0').get();
  const newest = db.prepare('SELECT MAX(received_at) as ts FROM messages WHERE deleted = 0').get();
  const topChatters = db.prepare(`
    SELECT user_name, battle_tag, COUNT(*) as count
    FROM messages WHERE deleted = 0
    GROUP BY battle_tag
    ORDER BY count DESC
    LIMIT 10
  `).all();
  const avgLength = db.prepare('SELECT AVG(LENGTH(message)) as avg FROM messages WHERE deleted = 0').get();
  const busiestDay = db.prepare(`
    SELECT DATE(received_at) as day, COUNT(*) as count
    FROM messages WHERE deleted = 0
    GROUP BY day ORDER BY count DESC LIMIT 1
  `).get();
  const byHour = db.prepare(`
    SELECT CAST(strftime('%H', received_at) AS INTEGER) as hour, COUNT(*) as count
    FROM messages WHERE deleted = 0
    GROUP BY hour ORDER BY hour
  `).all();
  const perDay = db.prepare(`
    SELECT DATE(received_at) as day, COUNT(*) as count
    FROM messages WHERE deleted = 0 AND received_at > datetime('now', '-14 days')
    GROUP BY day ORDER BY day
  `).all();
  const dbSize = db.prepare("SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()").get();

  return {
    totalMessages: total.count,
    deletedMessages: deleted.count,
    uniqueUsers: users.count,
    messagesLast24h: last24h.count,
    messagesLast7d: last7d.count,
    oldestMessage: oldest.ts,
    newestMessage: newest.ts,
    topChatters,
    avgMessageLength: avgLength?.avg ? Math.round(avgLength.avg) : 0,
    busiestDay: busiestDay || null,
    byHour,
    perDay,
    dbSizeBytes: dbSize?.size || 0,
  };
}

const STOP_WORDS = new Set([
  // Common English
  'the','a','an','is','it','in','to','of','and','or','for','on','at','by','no','so',
  'be','do','if','my','up','me','he','we','am','as','go','im','oh','ok','ya','ye',
  'are','was','has','had','but','not','you','all','can','her','his','its','our','she',
  'who','how','did','get','got','let','may','new','now','old','see','way','ur',
  'day','too','use','been','does','dont','each','even','from','have','here','just',
  'like','made','make','many','more','most','much','must','only','over','said','some',
  'such','take','than','that','them','then','they','this','very','what','when','will',
  'with','your','also','back','come','could','into','know','look','never','cant','didnt',
  'other','same','should','still','their','there','these','think','those','doesnt','isnt',
  'time','want','well','were','where','which','while','would','about','wont','wasnt',
  'after','again','being','every','going','gonna','great','might','really','right',
  'shall','thats','thing','until','yeah','why','one','two','out','own','put',
  // Chat slang
  'lol','xd','haha','lmao','idk','btw','imo','tbh','nah','yea','yes','nope','thx','pls',
  'gg','wp','ez','rn','af','omg','wtf','smh','rofl','bruh','bro','dude','man','lmfao',
  // Gaming generic
  'game','games','play','player','players','played','playing','team','teams','vs',
  'win','wins','won','lost','lose','losing','bad','good','best','map','maps',
  'always','never','every','still','pretty','much','tho','though','way','lot',
  // WC3 common (too generic to be interesting)
  'mmr','tp','base','units','orc','human','elf','undead','race',
  // Non-English fragments
  'le','la','de','el','il','en','et','un','une','les','des','que','est','pas',
  'der','die','das','und','ich','ist','ein','nie','mit','von',
]);

export function getTopWords(days = 7) {
  const rows = db.prepare(`
    SELECT message FROM messages
    WHERE deleted = 0 AND received_at > datetime('now', '-' || ? || ' days')
  `).all(days);

  const counts = new Map();
  for (const row of rows) {
    const words = row.message.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
    for (const w of words) {
      if (w.length < 3 || STOP_WORDS.has(w)) continue;
      counts.set(w, (counts.get(w) || 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([word, count]) => ({ word, count }));
}

export function getMessagesByDate(date) {
  return db.prepare(`
    SELECT user_name, message FROM messages
    WHERE deleted = 0 AND DATE(received_at) = ?
    ORDER BY received_at ASC
  `).all(date);
}

export function getDigest(date) {
  return db.prepare('SELECT * FROM daily_digests WHERE date = ?').get(date);
}

export function setDigest(date, digest) {
  db.prepare(`
    INSERT INTO daily_digests (date, digest) VALUES (?, ?)
    ON CONFLICT(date) DO UPDATE SET digest = excluded.digest, created_at = datetime('now')
  `).run(date, digest);
}

export function deleteDigest(date) {
  db.prepare('DELETE FROM daily_digests WHERE date = ?').run(date);
}

export function getRecentDigests(limit = 7) {
  return db.prepare('SELECT * FROM daily_digests ORDER BY date DESC LIMIT ?').all(limit);
}

export function getToken() {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'w3c_jwt'").get();
  return row?.value || null;
}

export function setToken(token) {
  db.prepare(`
    INSERT INTO settings (key, value) VALUES ('w3c_jwt', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(token);
}
