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

    CREATE TABLE IF NOT EXISTS weekly_digests (
      week_start TEXT PRIMARY KEY,
      week_end   TEXT NOT NULL,
      digest     TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS events (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      type      TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      payload   TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
    CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
  `);

  // Migration: add draft column to daily_digests
  try {
    db.exec(`ALTER TABLE daily_digests ADD COLUMN draft TEXT`);
  } catch {
    // Column already exists — ignore
  }

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

export function getMessageBuckets(date, bucketMinutes = 5) {
  const rows = db.prepare(`
    SELECT
      strftime('%H', received_at) || ':' || printf('%02d', (CAST(strftime('%M', received_at) AS INTEGER) / ?) * ?) AS bucket,
      COUNT(*) AS count,
      COUNT(DISTINCT battle_tag) AS users,
      GROUP_CONCAT(DISTINCT user_name) AS names
    FROM messages
    WHERE deleted = 0 AND DATE(received_at) = ?
    GROUP BY bucket
    ORDER BY bucket
  `).all(bucketMinutes, bucketMinutes, date);
  return rows;
}

export function getMessagesByDateAndUsers(date, battleTags, limit = 50) {
  const placeholders = battleTags.map(() => '?').join(',');
  return db.prepare(`
    SELECT user_name, message, sent_at, battle_tag
    FROM messages
    WHERE deleted = 0 AND DATE(received_at) = ? AND battle_tag IN (${placeholders})
    ORDER BY sent_at ASC
    LIMIT ?
  `).all(date, ...battleTags, limit);
}

/**
 * Search for messages matching quoted text, then return ALL messages
 * in a padded time window around those matches. This finds the specific
 * conversation where the drama happened, not just "any messages from those players".
 * Falls back to player-based lookup if no quotes match.
 */
export function getContextAroundQuotes(date, quotes, battleTags = [], paddingMinutes = 3, limit = 100) {
  // Step 1: Try to find messages matching the quoted text
  if (quotes && quotes.length > 0) {
    const likeConditions = quotes.map(() => 'message LIKE ?').join(' OR ');
    const likeParams = quotes.map(q => `%${q}%`);

    const range = db.prepare(`
      SELECT MIN(sent_at) AS first_msg, MAX(sent_at) AS last_msg
      FROM messages
      WHERE deleted = 0 AND DATE(received_at) = ? AND (${likeConditions})
    `).get(date, ...likeParams);

    if (range?.first_msg) {
      const pad = paddingMinutes * 60 * 1000;
      const from = new Date(new Date(range.first_msg).getTime() - pad).toISOString();
      const to = new Date(new Date(range.last_msg).getTime() + pad).toISOString();

      return db.prepare(`
        SELECT user_name, message, sent_at, battle_tag
        FROM messages
        WHERE deleted = 0 AND DATE(received_at) = ? AND sent_at >= ? AND sent_at <= ?
        ORDER BY sent_at ASC
        LIMIT ?
      `).all(date, from, to, limit);
    }
  }

  // Step 2: Fallback — find time window around target players' messages
  if (battleTags && battleTags.length > 0) {
    const placeholders = battleTags.map(() => '?').join(',');
    const range = db.prepare(`
      SELECT MIN(sent_at) AS first_msg, MAX(sent_at) AS last_msg
      FROM messages
      WHERE deleted = 0 AND DATE(received_at) = ? AND battle_tag IN (${placeholders})
    `).get(date, ...battleTags);

    if (range?.first_msg) {
      const pad = paddingMinutes * 60 * 1000;
      const from = new Date(new Date(range.first_msg).getTime() - pad).toISOString();
      const to = new Date(new Date(range.last_msg).getTime() + pad).toISOString();

      return db.prepare(`
        SELECT user_name, message, sent_at, battle_tag
        FROM messages
        WHERE deleted = 0 AND DATE(received_at) = ? AND sent_at >= ? AND sent_at <= ?
        ORDER BY sent_at ASC
        LIMIT ?
      `).all(date, from, to, limit);
    }
  }

  return [];
}

/**
 * Get ALL messages in a specific time window on a date.
 * fromTime/toTime are "HH:MM" strings.
 */
export function getMessagesByTimeWindow(date, fromTime, toTime, limit = 100) {
  const from = `${date}T${fromTime}:00.000Z`;
  const to = `${date}T${toTime}:59.999Z`;
  return db.prepare(`
    SELECT user_name, message, sent_at, battle_tag
    FROM messages
    WHERE deleted = 0 AND DATE(received_at) = ? AND sent_at >= ? AND sent_at <= ?
    ORDER BY sent_at ASC
    LIMIT ?
  `).all(date, from, to, limit);
}

export function getMessagesByDate(date) {
  return db.prepare(`
    SELECT battle_tag, user_name, message FROM messages
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

export function setDigestWithDraft(date, digest, draft) {
  db.prepare(`
    INSERT INTO daily_digests (date, digest, draft) VALUES (?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET digest = excluded.digest, draft = excluded.draft, created_at = datetime('now')
  `).run(date, digest, draft);
}

export function updateDigestOnly(date, digest) {
  db.prepare('UPDATE daily_digests SET digest = ? WHERE date = ?').run(digest, date);
}

export function getDraftForDate(date) {
  const row = db.prepare('SELECT date, digest, draft FROM daily_digests WHERE date = ?').get(date);
  if (!row) return null;
  return { date: row.date, digest: row.digest, draft: row.draft || row.digest };
}

export function getRecentDigests(limit = 7) {
  return db.prepare('SELECT * FROM daily_digests ORDER BY date DESC LIMIT ?').all(limit);
}

// ── Weekly digests ──────────────────────────────────

export function getWeeklyDigest(weekStart) {
  return db.prepare('SELECT * FROM weekly_digests WHERE week_start = ?').get(weekStart);
}

export function setWeeklyDigest(weekStart, weekEnd, digest) {
  db.prepare(`
    INSERT INTO weekly_digests (week_start, week_end, digest) VALUES (?, ?, ?)
    ON CONFLICT(week_start) DO UPDATE SET digest = excluded.digest, week_end = excluded.week_end, created_at = datetime('now')
  `).run(weekStart, weekEnd, digest);
}

export function deleteWeeklyDigest(weekStart) {
  db.prepare('DELETE FROM weekly_digests WHERE week_start = ?').run(weekStart);
}

export function getRecentWeeklyDigests(limit = 4) {
  return db.prepare('SELECT * FROM weekly_digests ORDER BY week_start DESC LIMIT ?').all(limit);
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

// ── Events (replay system) ──────────────────────────────

export function insertEvent(type, payload) {
  const stmt = db.prepare(`
    INSERT INTO events (type, timestamp, payload) VALUES (?, ?, ?)
  `);
  return stmt.run(type, new Date().toISOString(), JSON.stringify(payload));
}

export function getEvents({ from, to, types = null, limit = 50000 } = {}) {
  let sql = 'SELECT * FROM events WHERE timestamp >= ? AND timestamp <= ?';
  const params = [from, to];

  if (types && types.length > 0) {
    sql += ` AND type IN (${types.map(() => '?').join(',')})`;
    params.push(...types);
  }

  sql += ' ORDER BY timestamp ASC LIMIT ?';
  params.push(limit);

  return db.prepare(sql).all(params);
}

export function getEventsSummary() {
  const range = db.prepare(`
    SELECT MIN(timestamp) as earliest, MAX(timestamp) as latest, COUNT(*) as total
    FROM events
  `).get();

  const perDay = db.prepare(`
    SELECT DATE(timestamp) as day, type, COUNT(*) as count
    FROM events
    GROUP BY day, type
    ORDER BY day DESC
    LIMIT 500
  `).all();

  // Group by day
  const days = {};
  for (const row of perDay) {
    if (!days[row.day]) days[row.day] = { date: row.day, total: 0, byType: {} };
    days[row.day].byType[row.type] = row.count;
    days[row.day].total += row.count;
  }

  return {
    earliest: range.earliest,
    latest: range.latest,
    totalEvents: range.total,
    days: Object.values(days),
  };
}

export function deleteOldEvents(daysToKeep = 14) {
  const result = db.prepare(`
    DELETE FROM events WHERE timestamp < datetime('now', '-' || ? || ' days')
  `).run(daysToKeep);
  return result.changes;
}
