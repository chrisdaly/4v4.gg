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

    CREATE TABLE IF NOT EXISTS streamers (
      twitch_login  TEXT PRIMARY KEY,
      twitch_id     TEXT,
      display_name  TEXT,
      battle_tag    TEXT,
      active        INTEGER NOT NULL DEFAULT 1,
      added_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS clips (
      clip_id        TEXT PRIMARY KEY,
      twitch_login   TEXT NOT NULL,
      title          TEXT NOT NULL,
      url            TEXT NOT NULL,
      embed_url      TEXT NOT NULL,
      thumbnail_url  TEXT NOT NULL,
      creator_name   TEXT NOT NULL DEFAULT '',
      view_count     INTEGER NOT NULL DEFAULT 0,
      duration       REAL NOT NULL DEFAULT 0,
      created_at     TEXT NOT NULL,
      fetched_at     TEXT NOT NULL DEFAULT (datetime('now')),
      game_id        TEXT DEFAULT '',
      featured       INTEGER NOT NULL DEFAULT 0,
      featured_at    TEXT,
      tag            TEXT,
      relevance_score REAL DEFAULT 0,
      hidden         INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_clips_created ON clips(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_clips_featured ON clips(featured, featured_at DESC);
    CREATE INDEX IF NOT EXISTS idx_clips_streamer ON clips(twitch_login, created_at DESC);

    CREATE TABLE IF NOT EXISTS clip_fetch_log (
      twitch_login TEXT NOT NULL,
      fetched_date TEXT NOT NULL,
      clip_count   INTEGER NOT NULL DEFAULT 0,
      fetched_at   TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (twitch_login, fetched_date)
    );
  `);

  // Migration: add player_tag column to clips
  try {
    db.exec(`ALTER TABLE clips ADD COLUMN player_tag TEXT`);
  } catch {
    // Column already exists — ignore
  }

  // Migration: add draft column to daily_digests
  try {
    db.exec(`ALTER TABLE daily_digests ADD COLUMN draft TEXT`);
  } catch {
    // Column already exists — ignore
  }

  // Migration: add match_context column to daily_digests
  try {
    db.exec(`ALTER TABLE daily_digests ADD COLUMN match_context TEXT`);
  } catch {
    // Column already exists — ignore
  }

  // Migration: add hidden_avatars column to daily_digests
  try {
    db.exec(`ALTER TABLE daily_digests ADD COLUMN hidden_avatars TEXT`);
  } catch {
    // Column already exists — ignore
  }

  // Migration: add clips column to daily_digests (JSON array of clip data)
  try {
    db.exec(`ALTER TABLE daily_digests ADD COLUMN clips TEXT`);
  } catch {
    // Column already exists — ignore
  }

  // Migration: add is_4v4 and match_id columns to clips
  try {
    db.exec(`ALTER TABLE clips ADD COLUMN is_4v4 INTEGER DEFAULT NULL`);
  } catch {
    // Column already exists — ignore
  }
  try {
    db.exec(`ALTER TABLE clips ADD COLUMN match_id TEXT`);
  } catch {
    // Column already exists — ignore
  }

  // Migration: add clips and stats columns to weekly_digests
  try {
    db.exec(`ALTER TABLE weekly_digests ADD COLUMN clips TEXT`);
  } catch {
    // Column already exists — ignore
  }
  try {
    db.exec(`ALTER TABLE weekly_digests ADD COLUMN stats TEXT`);
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
  const b = Math.max(1, Math.floor(bucketMinutes));
  const rows = db.prepare(`
    SELECT
      strftime('%H', received_at) || ':' || printf('%02d', (CAST(strftime('%M', received_at) AS INTEGER) / ${b}) * ${b}) AS bucket,
      COUNT(*) AS count,
      COUNT(DISTINCT battle_tag) AS users,
      GROUP_CONCAT(DISTINCT user_name) AS names
    FROM messages
    WHERE deleted = 0 AND DATE(received_at) = ?
    GROUP BY bucket
    ORDER BY bucket
  `).all(date);
  return rows;
}

export function getGameStats(date) {
  // Count total unique games that started on this date
  const totalRow = db.prepare(`
    SELECT COUNT(*) as total FROM events
    WHERE type = 'game_start' AND DATE(timestamp) = ?
  `).get(date);

  // Get all game_start and game_end events for this date to compute peak concurrent
  const events = db.prepare(`
    SELECT type, timestamp FROM events
    WHERE type IN ('game_start', 'game_end') AND DATE(timestamp) = ?
    ORDER BY timestamp ASC
  `).all(date);

  let concurrent = 0;
  let peak = 0;
  for (const e of events) {
    if (e.type === 'game_start') concurrent++;
    else concurrent = Math.max(0, concurrent - 1);
    if (concurrent > peak) peak = concurrent;
  }

  return { totalGames: totalRow?.total || 0, peakConcurrent: peak };
}

export function getMessagesByDateAndUsers(date, battleTags, limit = 50) {
  const placeholders = battleTags.map(() => '?').join(',');
  return db.prepare(`
    SELECT user_name, message, sent_at, battle_tag
    FROM messages
    WHERE deleted = 0 AND DATE(received_at) = ? AND battle_tag IN (${placeholders})
    ORDER BY received_at ASC
    LIMIT ?
  `).all(date, ...battleTags, limit);
}

// Format JS Date to SQLite datetime format: "YYYY-MM-DD HH:MM:SS"
function toSqliteDatetime(d) {
  return d.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
}

// Return all messages in a padded window around a time range
function getWindowMessages(date, firstMsg, lastMsg, paddingMinutes, limit) {
  const pad = paddingMinutes * 60 * 1000;
  const from = toSqliteDatetime(new Date(new Date(firstMsg + 'Z').getTime() - pad));
  const to = toSqliteDatetime(new Date(new Date(lastMsg + 'Z').getTime() + pad));
  return db.prepare(`
    SELECT user_name, message, sent_at, battle_tag
    FROM messages
    WHERE deleted = 0 AND DATE(received_at) = ? AND received_at >= ? AND received_at <= ?
    ORDER BY received_at ASC
    LIMIT ?
  `).all(date, from, to, limit);
}

// Extract distinctive words (4+ chars, lowercased) from quote strings for fuzzy matching
function extractKeywords(quotes) {
  const stopWords = new Set(['this', 'that', 'with', 'from', 'have', 'been', 'were', 'they', 'them', 'their', 'what', 'when', 'your', 'will', 'just', 'like', 'some', 'very', 'also', 'than']);
  const words = new Set();
  for (const q of quotes) {
    for (const w of q.toLowerCase().split(/\W+/)) {
      if (w.length >= 4 && !stopWords.has(w)) words.add(w);
    }
  }
  return [...words];
}

// Find the 5-min window with the most messages (sliding window)
function findDensestCluster(rows) {
  const WINDOW_MS = 5 * 60 * 1000;
  const times = rows.map(m => new Date(m.received_at + 'Z').getTime());
  let bestStart = 0, bestCount = 0;
  for (let i = 0; i < times.length; i++) {
    const windowEnd = times[i] + WINDOW_MS;
    let j = i;
    while (j < times.length && times[j] <= windowEnd) j++;
    const count = j - i;
    if (count > bestCount) {
      bestCount = count;
      bestStart = i;
    }
  }
  const endIdx = Math.min(bestStart + bestCount - 1, rows.length - 1);
  return { first: rows[bestStart].received_at, last: rows[endIdx].received_at };
}

/**
 * Find the conversation context around drama quotes.
 * Strategy (in order):
 *   1. Exact substring match on quotes → padded time window
 *   2. Keyword match: messages FROM target players containing keywords from quotes → padded window
 *   3. Densest cluster: find where target players chatted most intensely (5-min sliding window)
 */
export function getContextAroundQuotes(date, quotes, battleTags = [], paddingMinutes = 3, limit = 100) {
  // Step 1: Exact quote substring match (any message in the DB)
  if (quotes && quotes.length > 0) {
    const likeConditions = quotes.map(() => 'message LIKE ?').join(' OR ');
    const likeParams = quotes.map(q => `%${q}%`);

    const range = db.prepare(`
      SELECT MIN(received_at) AS first_msg, MAX(received_at) AS last_msg
      FROM messages
      WHERE deleted = 0 AND DATE(received_at) = ? AND (${likeConditions})
    `).get(date, ...likeParams);

    if (range?.first_msg) {
      return getWindowMessages(date, range.first_msg, range.last_msg, paddingMinutes, limit);
    }
  }

  // Step 2: Keyword match — find the densest cluster of keyword-matching messages from target players
  if (quotes && quotes.length > 0 && battleTags && battleTags.length > 0) {
    const keywords = extractKeywords(quotes);
    if (keywords.length > 0) {
      const placeholders = battleTags.map(() => '?').join(',');
      const kwConditions = keywords.map(() => 'LOWER(message) LIKE ?').join(' OR ');
      const kwParams = keywords.map(w => `%${w}%`);

      const kwMsgs = db.prepare(`
        SELECT received_at
        FROM messages
        WHERE deleted = 0 AND DATE(received_at) = ?
          AND battle_tag IN (${placeholders})
          AND (${kwConditions})
        ORDER BY received_at ASC
      `).all(date, ...battleTags, ...kwParams);

      if (kwMsgs.length > 0) {
        const cluster = findDensestCluster(kwMsgs);
        return getWindowMessages(date, cluster.first, cluster.last, paddingMinutes, limit);
      }
    }
  }

  // Step 3: Densest activity cluster — find where target players chatted most intensely
  if (battleTags && battleTags.length > 0) {
    const placeholders = battleTags.map(() => '?').join(',');
    const playerMsgs = db.prepare(`
      SELECT received_at
      FROM messages
      WHERE deleted = 0 AND DATE(received_at) = ? AND battle_tag IN (${placeholders})
      ORDER BY received_at ASC
    `).all(date, ...battleTags);

    if (playerMsgs.length === 0) return [];

    const cluster = findDensestCluster(playerMsgs);
    return getWindowMessages(date, cluster.first, cluster.last, paddingMinutes, limit);
  }

  return [];
}

/**
 * Get ALL messages in a specific time window on a date.
 * fromTime/toTime are "HH:MM" strings.
 */
export function getMessagesByTimeWindow(date, fromTime, toTime, limit = 100) {
  const from = `${date} ${fromTime}:00`;
  const to = `${date} ${toTime}:59`;
  return db.prepare(`
    SELECT user_name, message, sent_at, battle_tag
    FROM messages
    WHERE deleted = 0 AND DATE(received_at) = ? AND received_at >= ? AND received_at <= ?
    ORDER BY received_at ASC
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

export function setDigestWithDraft(date, digest, draft, matchContext = null) {
  db.prepare(`
    INSERT INTO daily_digests (date, digest, draft, match_context) VALUES (?, ?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET digest = excluded.digest, draft = excluded.draft, match_context = COALESCE(excluded.match_context, match_context), created_at = datetime('now')
  `).run(date, digest, draft, matchContext);
}

export function updateDigestOnly(date, digest) {
  db.prepare('UPDATE daily_digests SET digest = ? WHERE date = ?').run(digest, date);
}

export function updateDraftOnly(date, draft) {
  db.prepare('UPDATE daily_digests SET draft = ? WHERE date = ?').run(draft, date);
}

export function getDraftForDate(date) {
  const row = db.prepare('SELECT date, digest, draft, hidden_avatars FROM daily_digests WHERE date = ?').get(date);
  if (!row) return null;
  return { date: row.date, digest: row.digest, draft: row.draft || row.digest, hidden_avatars: row.hidden_avatars || null };
}

export function updateHiddenAvatars(date, hiddenAvatarsJson) {
  db.prepare('UPDATE daily_digests SET hidden_avatars = ? WHERE date = ?').run(hiddenAvatarsJson, date);
}

export function getMatchContext(date) {
  const row = db.prepare('SELECT match_context FROM daily_digests WHERE date = ?').get(date);
  return row?.match_context || null;
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

// ── Clips ──────────────────────────────────────────

export function insertClips(clips) {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO clips (clip_id, twitch_login, title, url, embed_url, thumbnail_url, creator_name, view_count, duration, created_at, game_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const tx = db.transaction((rows) => {
    let inserted = 0;
    for (const c of rows) {
      const r = stmt.run(c.clip_id, c.twitch_login, c.title, c.url, c.embed_url, c.thumbnail_url, c.creator_name || '', c.view_count || 0, c.duration || 0, c.created_at, c.game_id || '');
      if (r.changes > 0) inserted++;
    }
    return inserted;
  });
  return tx(clips);
}

export function getClips({ limit = 20, offset = 0, streamer = null, tag = null, since = null, player = null, includeHidden = false } = {}) {
  let sql = `SELECT * FROM clips WHERE game_id = '12924'`;
  const params = [];

  if (!includeHidden) {
    sql += ' AND hidden = 0';
  }

  if (streamer) {
    sql += ' AND twitch_login = ?';
    params.push(streamer);
  }
  if (tag) {
    sql += ' AND tag = ?';
    params.push(tag);
  }
  if (since) {
    sql += ' AND created_at >= ?';
    params.push(since);
  }
  if (player) {
    sql += ' AND player_tag LIKE ?';
    params.push(`%${player}%`);
  }

  sql += ' ORDER BY featured DESC, featured_at DESC NULLS LAST, view_count DESC, created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  return db.prepare(sql).all(...params);
}

export function getClipById(clipId) {
  return db.prepare('SELECT * FROM clips WHERE clip_id = ?').get(clipId);
}

export function getFeaturedClips(limit = 10) {
  return db.prepare('SELECT * FROM clips WHERE featured = 1 AND hidden = 0 ORDER BY featured_at DESC LIMIT ?').all(limit);
}

export function updateClipCuration(clipId, { featured, tag, hidden, playerTag }) {
  const sets = [];
  const params = [];

  if (featured !== undefined) {
    sets.push('featured = ?');
    params.push(featured ? 1 : 0);
    if (featured) {
      sets.push("featured_at = datetime('now')");
    }
  }
  if (tag !== undefined) {
    sets.push('tag = ?');
    params.push(tag);
  }
  if (hidden !== undefined) {
    sets.push('hidden = ?');
    params.push(hidden ? 1 : 0);
  }
  if (playerTag !== undefined) {
    sets.push('player_tag = ?');
    params.push(playerTag);
  }

  if (sets.length === 0) return;
  params.push(clipId);
  db.prepare(`UPDATE clips SET ${sets.join(', ')} WHERE clip_id = ?`).run(...params);
}

export function getStreamers(activeOnly = true) {
  if (activeOnly) {
    return db.prepare('SELECT * FROM streamers WHERE active = 1 ORDER BY display_name').all();
  }
  return db.prepare('SELECT * FROM streamers ORDER BY display_name').all();
}

export function upsertStreamer({ twitch_login, twitch_id, display_name, battle_tag, active }) {
  db.prepare(`
    INSERT INTO streamers (twitch_login, twitch_id, display_name, battle_tag, active)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(twitch_login) DO UPDATE SET
      twitch_id = COALESCE(excluded.twitch_id, twitch_id),
      display_name = COALESCE(excluded.display_name, display_name),
      battle_tag = COALESCE(excluded.battle_tag, battle_tag),
      active = excluded.active
  `).run(twitch_login, twitch_id || null, display_name || twitch_login, battle_tag || null, active !== undefined ? (active ? 1 : 0) : 1);
}

export function deactivateStreamer(login) {
  db.prepare('UPDATE streamers SET active = 0 WHERE twitch_login = ?').run(login);
}

export function getClipFetchLog(login, date) {
  return db.prepare('SELECT * FROM clip_fetch_log WHERE twitch_login = ? AND fetched_date = ?').get(login, date);
}

export function insertClipFetchLog(login, date, clipCount) {
  db.prepare(`
    INSERT OR REPLACE INTO clip_fetch_log (twitch_login, fetched_date, clip_count)
    VALUES (?, ?, ?)
  `).run(login, date, clipCount);
}

// ── Clip queries for digests ────────────────────────

export function getClipsByDateRange(startDate, endDate) {
  return db.prepare(`
    SELECT * FROM clips
    WHERE game_id = '12924' AND hidden = 0
      AND created_at >= ? AND created_at < ?
    ORDER BY view_count DESC
  `).all(startDate + 'T00:00:00Z', endDate + 'T23:59:59Z');
}

export function updateClip4v4Status(clipId, is4v4, matchId) {
  db.prepare(`
    UPDATE clips SET is_4v4 = ?, match_id = ? WHERE clip_id = ?
  `).run(is4v4 ? 1 : 0, matchId || null, clipId);
}

export function updateDigestClips(date, clipsJson) {
  db.prepare('UPDATE daily_digests SET clips = ? WHERE date = ?').run(clipsJson, date);
}

export function setWeeklyDigestFull(weekStart, weekEnd, digest, clipsJson, statsJson) {
  db.prepare(`
    INSERT INTO weekly_digests (week_start, week_end, digest, clips, stats) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(week_start) DO UPDATE SET
      digest = excluded.digest,
      week_end = excluded.week_end,
      clips = excluded.clips,
      stats = excluded.stats,
      created_at = datetime('now')
  `).run(weekStart, weekEnd, digest, clipsJson || null, statsJson || null);
}
