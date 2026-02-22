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

  // Migration: daily_player_stats table for weekly aggregation
  db.exec(`
    CREATE TABLE IF NOT EXISTS daily_player_stats (
      date        TEXT NOT NULL,
      battle_tag  TEXT NOT NULL,
      name        TEXT NOT NULL,
      race        INTEGER,
      wins        INTEGER NOT NULL DEFAULT 0,
      losses      INTEGER NOT NULL DEFAULT 0,
      mmr_change  REAL NOT NULL DEFAULT 0,
      current_mmr INTEGER NOT NULL DEFAULT 0,
      form        TEXT NOT NULL DEFAULT '',
      win_streak  INTEGER NOT NULL DEFAULT 0,
      loss_streak INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (date, battle_tag)
    );
  `);

  // Migration: daily_matches table for weekly upset detection
  db.exec(`
    CREATE TABLE IF NOT EXISTS daily_matches (
      match_id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      map_name TEXT,
      team1_avg_mmr REAL,
      team2_avg_mmr REAL,
      team1_races TEXT,
      team2_races TEXT,
      team1_won INTEGER,
      team1_tags TEXT,
      team2_tags TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_daily_matches_date ON daily_matches(date);
  `);

  // Migration: add individual MMR columns to daily_matches
  try {
    db.exec(`ALTER TABLE daily_matches ADD COLUMN team1_mmrs TEXT`);
  } catch {
    // Column already exists — ignore
  }
  try {
    db.exec(`ALTER TABLE daily_matches ADD COLUMN team2_mmrs TEXT`);
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

  // Migration: add cover_image BLOB column to weekly_digests
  try {
    db.exec(`ALTER TABLE weekly_digests ADD COLUMN cover_image BLOB`);
  } catch {
    // Column already exists — ignore
  }

  // Migration: add draft column to weekly_digests (editorial mode)
  try {
    db.exec(`ALTER TABLE weekly_digests ADD COLUMN draft TEXT`);
  } catch {
    // Column already exists — ignore
  }

  // Migration: add digest_json column to weekly_digests (structured JSON format)
  try {
    db.exec(`ALTER TABLE weekly_digests ADD COLUMN digest_json TEXT`);
  } catch {
    // Column already exists — ignore
  }

  // Migration: match_player_scores table for per-match detail stats
  db.exec(`
    CREATE TABLE IF NOT EXISTS match_player_scores (
      match_id TEXT NOT NULL,
      battle_tag TEXT NOT NULL,
      date TEXT NOT NULL,
      heroes_killed INTEGER DEFAULT 0,
      items_obtained INTEGER DEFAULT 0,
      mercs_hired INTEGER DEFAULT 0,
      exp_gained INTEGER DEFAULT 0,
      units_produced INTEGER DEFAULT 0,
      units_killed INTEGER DEFAULT 0,
      largest_army INTEGER DEFAULT 0,
      gold_collected INTEGER DEFAULT 0,
      lumber_collected INTEGER DEFAULT 0,
      gold_upkeep_lost INTEGER DEFAULT 0,
      duration_seconds INTEGER DEFAULT 0,
      heroes TEXT,
      PRIMARY KEY (match_id, battle_tag)
    );
    CREATE INDEX IF NOT EXISTS idx_mps_date ON match_player_scores(date);
  `);

  // Migration: add duration_seconds column to match_player_scores
  try {
    db.exec(`ALTER TABLE match_player_scores ADD COLUMN duration_seconds INTEGER DEFAULT 0`);
  } catch {
    // Column already exists — ignore
  }

  // Cover image generations — stores every generated image with metadata
  db.exec(`
    CREATE TABLE IF NOT EXISTS cover_generations (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      week_start  TEXT NOT NULL,
      headline    TEXT,
      scene       TEXT,
      style       TEXT,
      full_prompt TEXT,
      image       BLOB NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_cover_gen_week ON cover_generations(week_start, created_at DESC);
  `);

  // Variant generation tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS weekly_gen_jobs (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      week_start  TEXT NOT NULL,
      status      TEXT NOT NULL DEFAULT 'pending',
      total       INTEGER NOT NULL DEFAULT 3,
      completed   INTEGER NOT NULL DEFAULT 0,
      error       TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS weekly_variants (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id      INTEGER NOT NULL REFERENCES weekly_gen_jobs(id),
      week_start  TEXT NOT NULL,
      variant_idx INTEGER NOT NULL,
      narrative   TEXT NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(job_id, variant_idx)
    );
  `);

  // ── Replay tables ──────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS replays (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      filename        TEXT NOT NULL,
      file_path       TEXT NOT NULL,
      file_size       INTEGER NOT NULL,
      uploaded_at     TEXT NOT NULL DEFAULT (datetime('now')),
      game_name       TEXT,
      game_duration   INTEGER,
      map_name        TEXT,
      match_type      TEXT,
      w3c_match_id    TEXT,
      match_date      TEXT,
      parse_status    TEXT NOT NULL DEFAULT 'pending',
      parse_error     TEXT,
      raw_parsed      TEXT
    );

    CREATE TABLE IF NOT EXISTS replay_players (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      replay_id   INTEGER NOT NULL REFERENCES replays(id),
      player_id   INTEGER NOT NULL,
      player_name TEXT NOT NULL,
      team_id     INTEGER,
      race        TEXT,
      apm         REAL,
      battle_tag  TEXT,
      UNIQUE(replay_id, player_id)
    );

    CREATE TABLE IF NOT EXISTS replay_chat (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      replay_id   INTEGER NOT NULL REFERENCES replays(id),
      player_id   INTEGER NOT NULL,
      player_name TEXT NOT NULL,
      message     TEXT NOT NULL,
      time_ms     INTEGER NOT NULL,
      mode        TEXT NOT NULL DEFAULT 'All'
    );

    CREATE TABLE IF NOT EXISTS replay_player_actions (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      replay_id       INTEGER NOT NULL REFERENCES replays(id),
      player_id       INTEGER NOT NULL,
      assigngroup     INTEGER DEFAULT 0,
      rightclick      INTEGER DEFAULT 0,
      basic           INTEGER DEFAULT 0,
      buildtrain      INTEGER DEFAULT 0,
      ability         INTEGER DEFAULT 0,
      item            INTEGER DEFAULT 0,
      select_count    INTEGER DEFAULT 0,
      removeunit      INTEGER DEFAULT 0,
      subgroup        INTEGER DEFAULT 0,
      selecthotkey    INTEGER DEFAULT 0,
      esc             INTEGER DEFAULT 0,
      timed_segments  TEXT,
      group_hotkeys   TEXT,
      heroes          TEXT,
      units_summary   TEXT,
      buildings_summary TEXT,
      early_game_sequence TEXT,
      UNIQUE(replay_id, player_id)
    );
  `);

  // ── Player fingerprints table ─────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS player_fingerprints (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      replay_id    INTEGER NOT NULL REFERENCES replays(id),
      player_id    INTEGER NOT NULL,
      battle_tag   TEXT,
      player_name  TEXT NOT NULL,
      race         TEXT,
      vector       TEXT NOT NULL,
      action_seg   TEXT NOT NULL,
      apm_seg      TEXT NOT NULL,
      hotkey_seg   TEXT NOT NULL,
      created_at   TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(replay_id, player_id)
    );
    CREATE INDEX IF NOT EXISTS idx_fp_battle_tag ON player_fingerprints(battle_tag);
  `);

  // ── Feedback issues table ─────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS feedback_issues (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      trigger_msg_ids     TEXT NOT NULL,
      github_issue_number INTEGER,
      github_issue_url    TEXT,
      ai_type             TEXT,
      ai_title            TEXT,
      ai_priority         TEXT,
      actionable          INTEGER NOT NULL DEFAULT 0,
      created_at          TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Migration: add early_game_sequence column to replay_player_actions
  try {
    db.exec(`ALTER TABLE replay_player_actions ADD COLUMN early_game_sequence TEXT`);
  } catch (_) { /* column already exists */ }

  // Migration: add full_action_sequence column for nanoGPT training data
  try {
    db.exec(`ALTER TABLE replay_player_actions ADD COLUMN full_action_sequence TEXT`);
  } catch (_) { /* column already exists */ }

  // Migration: add embedding column for nanoGPT embeddings
  try {
    db.exec(`ALTER TABLE player_fingerprints ADD COLUMN embedding TEXT`);
  } catch (_) { /* column already exists */ }

  // Migration: add new fingerprint segment columns (tempo, intensity, transitions, rhythm)
  for (const col of ['tempo_seg', 'intensity_seg', 'transitions_seg', 'rhythm_seg']) {
    try {
      db.exec(`ALTER TABLE player_fingerprints ADD COLUMN ${col} TEXT`);
    } catch (_) { /* column already exists */ }
  }

  // Blog posts — markdown content with publish/draft workflow
  db.exec(`
    CREATE TABLE IF NOT EXISTS blog_posts (
      slug        TEXT PRIMARY KEY,
      title       TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      date        TEXT NOT NULL,
      tags        TEXT NOT NULL DEFAULT '[]',
      content     TEXT NOT NULL DEFAULT '',
      published   INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Migration: add cover_image column to blog_posts
  try {
    db.exec(`ALTER TABLE blog_posts ADD COLUMN cover_image TEXT`);
  } catch {
    // Column already exists — ignore
  }

  // Style thumbnails — preview images for style presets
  db.exec(`
    CREATE TABLE IF NOT EXISTS style_thumbnails (
      style_id    TEXT PRIMARY KEY,
      image       BLOB NOT NULL,
      prompt      TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Startup recovery: mark any running jobs as error
  db.prepare(`
    UPDATE weekly_gen_jobs SET status = 'error', error = 'Server restarted', updated_at = datetime('now')
    WHERE status IN ('pending', 'running')
  `).run();

  return db;
}

// ── Variant generation CRUD ──────────────────────────

export function createGenJob(weekStart, total = 3) {
  const result = db.prepare(`
    INSERT INTO weekly_gen_jobs (week_start, total) VALUES (?, ?)
  `).run(weekStart, total);
  return result.lastInsertRowid;
}

export function updateGenJobStatus(id, status, error = null) {
  db.prepare(`
    UPDATE weekly_gen_jobs SET status = ?, error = ?, updated_at = datetime('now') WHERE id = ?
  `).run(status, error, id);
}

export function updateGenJobProgress(id, completed) {
  db.prepare(`
    UPDATE weekly_gen_jobs SET completed = ?, updated_at = datetime('now') WHERE id = ?
  `).run(completed, id);
}

export function getLatestGenJob(weekStart) {
  return db.prepare(`
    SELECT * FROM weekly_gen_jobs WHERE week_start = ? ORDER BY created_at DESC LIMIT 1
  `).get(weekStart);
}

export function getActiveGenJob(weekStart) {
  return db.prepare(`
    SELECT * FROM weekly_gen_jobs WHERE week_start = ? AND status IN ('pending', 'running') ORDER BY created_at DESC LIMIT 1
  `).get(weekStart);
}

export function saveWeeklyVariant(jobId, weekStart, variantIdx, narrative) {
  db.prepare(`
    INSERT OR REPLACE INTO weekly_variants (job_id, week_start, variant_idx, narrative) VALUES (?, ?, ?, ?)
  `).run(jobId, weekStart, variantIdx, narrative);
}

export function getVariantsForJob(jobId) {
  return db.prepare(`
    SELECT * FROM weekly_variants WHERE job_id = ? ORDER BY variant_idx
  `).all(jobId);
}

export function deleteVariantsForWeek(weekStart) {
  db.prepare('DELETE FROM weekly_variants WHERE week_start = ?').run(weekStart);
  db.prepare('DELETE FROM weekly_gen_jobs WHERE week_start = ?').run(weekStart);
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

export function getAllMessagesByDateRange(startDate, endDate, limit = 2000) {
  return db.prepare(`
    SELECT user_name, message, sent_at, received_at, battle_tag
    FROM messages
    WHERE deleted = 0 AND DATE(received_at) >= ? AND DATE(received_at) <= ?
    ORDER BY received_at ASC
    LIMIT ?
  `).all(startDate, endDate, limit);
}

export function getMessagesByDateRangeAndUser(startDate, endDate, battleTag, limit = 200) {
  return db.prepare(`
    SELECT user_name, message, sent_at, received_at, battle_tag
    FROM messages
    WHERE deleted = 0 AND DATE(received_at) >= ? AND DATE(received_at) <= ? AND battle_tag = ?
    ORDER BY received_at ASC
    LIMIT ?
  `).all(startDate, endDate, battleTag, limit);
}

export function getMessagesByDateRangeMentioning(startDate, endDate, searchTerms, excludeBattleTag, limit = 200) {
  const likeConditions = searchTerms.map(() => 'LOWER(message) LIKE ?').join(' OR ');
  const likeParams = searchTerms.map(t => `%${t.toLowerCase()}%`);
  return db.prepare(`
    SELECT user_name, message, sent_at, received_at, battle_tag
    FROM messages
    WHERE deleted = 0 AND DATE(received_at) >= ? AND DATE(received_at) <= ?
      AND battle_tag != ?
      AND (${likeConditions})
    ORDER BY received_at ASC
    LIMIT ?
  `).all(startDate, endDate, excludeBattleTag, ...likeParams, limit);
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

export function countMessagesByDateRange(startDate, endDate) {
  return db.prepare(
    `SELECT COUNT(*) as count FROM messages
     WHERE received_at >= ? AND received_at < ?
     AND deleted = 0`
  ).get(startDate + ' 00:00:00', endDate + ' 23:59:59')?.count || 0;
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

export function getDigestsByDateRange(startDate, endDate) {
  return db.prepare('SELECT * FROM daily_digests WHERE date >= ? AND date <= ? ORDER BY date ASC').all(startDate, endDate);
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
    sql += ' AND hidden = 0 AND featured = 1';
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

// ── Daily player stats (for weekly aggregation) ─────

export function saveDailyPlayerStats(date, playerStatsMap) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO daily_player_stats (date, battle_tag, name, race, wins, losses, mmr_change, current_mmr, form, win_streak, loss_streak)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const tx = db.transaction(() => {
    for (const [tag, stats] of playerStatsMap) {
      stmt.run(date, tag, stats.name, stats.race ?? null, stats.wins, stats.losses,
        Math.round(stats.mmrChange * 100) / 100, stats.currentMmr, stats.form || '',
        stats.winStreak || 0, stats.lossStreak || 0);
    }
  });
  tx();
}

export function getDailyPlayerStatsForDate(date) {
  return db.prepare('SELECT * FROM daily_player_stats WHERE date = ?').all(date);
}

export function hasDailyPlayerStats(date) {
  const row = db.prepare('SELECT COUNT(*) as count FROM daily_player_stats WHERE date = ?').get(date);
  return row.count > 0;
}

export function getDailyPlayerStatsRange(startDate, endDate) {
  return db.prepare('SELECT * FROM daily_player_stats WHERE date >= ? AND date <= ?').all(startDate, endDate);
}

// ── Daily matches (for weekly upset detection) ──────

export function saveDailyMatches(date, matches) {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO daily_matches (match_id, date, map_name, team1_avg_mmr, team2_avg_mmr, team1_races, team2_races, team1_won, team1_tags, team2_tags, team1_mmrs, team2_mmrs)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const tx = db.transaction(() => {
    for (const m of matches) {
      stmt.run(m.match_id, date, m.map_name || null,
        m.team1_avg_mmr, m.team2_avg_mmr,
        m.team1_races, m.team2_races,
        m.team1_won ? 1 : 0, m.team1_tags, m.team2_tags,
        m.team1_mmrs || null, m.team2_mmrs || null);
    }
  });
  tx();
}

export function getDailyMatchesRange(startDate, endDate) {
  return db.prepare('SELECT * FROM daily_matches WHERE date >= ? AND date <= ?').all(startDate, endDate);
}

export function getDailyMatchesMissingMmrs(startDate, endDate) {
  return db.prepare('SELECT match_id FROM daily_matches WHERE date >= ? AND date <= ? AND team1_mmrs IS NULL').all(startDate, endDate);
}

export function updateDailyMatchMmrs(matchId, team1Mmrs, team2Mmrs) {
  db.prepare('UPDATE daily_matches SET team1_mmrs = ?, team2_mmrs = ? WHERE match_id = ?').run(team1Mmrs, team2Mmrs, matchId);
}

// ── New player detection (for weekly NEW_BLOOD) ─────

export function getNewPlayersForWeek(weekStart, weekEnd) {
  return db.prepare(`
    SELECT dps.battle_tag, dps.name, MAX(dps.current_mmr) as max_mmr,
           SUM(dps.wins + dps.losses) as total_games, SUM(dps.wins) as total_wins
    FROM daily_player_stats dps
    WHERE dps.date >= ? AND dps.date <= ?
      AND dps.battle_tag NOT IN (
        SELECT DISTINCT battle_tag FROM daily_player_stats WHERE date < ?
      )
    GROUP BY dps.battle_tag
    ORDER BY max_mmr DESC
  `).all(weekStart, weekEnd, weekStart);
}

export function getFirstAppearanceDate(battleTag) {
  const row = db.prepare('SELECT MIN(date) as first_date FROM daily_player_stats WHERE battle_tag = ?').get(battleTag);
  return row?.first_date || null;
}

export function getLastActiveDateBefore(battleTag, beforeDate) {
  const row = db.prepare('SELECT MAX(date) as last_date FROM daily_player_stats WHERE battle_tag = ? AND date < ?').get(battleTag, beforeDate);
  return row?.last_date || null;
}

export function getWeeklyCoverImage(weekStart) {
  const row = db.prepare('SELECT cover_image FROM weekly_digests WHERE week_start = ?').get(weekStart);
  return row?.cover_image || null;
}

export function setWeeklyCoverImage(weekStart, imageBuffer) {
  db.prepare('UPDATE weekly_digests SET cover_image = ? WHERE week_start = ?').run(imageBuffer, weekStart);
}

export function getWeeklyDraftForWeek(weekStart) {
  const row = db.prepare('SELECT week_start, digest, draft FROM weekly_digests WHERE week_start = ?').get(weekStart);
  if (!row) return null;
  return { weekStart: row.week_start, digest: row.digest, draft: row.draft || row.digest };
}

export function updateWeeklyDraftOnly(weekStart, draft) {
  db.prepare('UPDATE weekly_digests SET draft = ? WHERE week_start = ?').run(draft, weekStart);
}

export function updateWeeklyDigestOnly(weekStart, digest) {
  db.prepare('UPDATE weekly_digests SET digest = ? WHERE week_start = ?').run(digest, weekStart);
}

export function setWeeklyDigestFull(weekStart, weekEnd, digest, clipsJson, statsJson, digestJson = null) {
  db.prepare(`
    INSERT INTO weekly_digests (week_start, week_end, digest, clips, stats, digest_json) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(week_start) DO UPDATE SET
      digest = excluded.digest,
      week_end = excluded.week_end,
      clips = excluded.clips,
      stats = excluded.stats,
      digest_json = excluded.digest_json,
      created_at = datetime('now')
  `).run(weekStart, weekEnd, digest, clipsJson || null, statsJson || null, digestJson || null);
}

export function updateWeeklyDigestJson(weekStart, digestJson) {
  db.prepare('UPDATE weekly_digests SET digest_json = ? WHERE week_start = ?').run(digestJson, weekStart);
}

// ── Match player scores (per-match detail stats) ─────

export function saveMatchPlayerScores(date, matchId, scores) {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO match_player_scores
      (match_id, battle_tag, date, heroes_killed, items_obtained, mercs_hired, exp_gained,
       units_produced, units_killed, largest_army, gold_collected, lumber_collected, gold_upkeep_lost, duration_seconds, heroes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const tx = db.transaction(() => {
    for (const s of scores) {
      stmt.run(matchId, s.battleTag, date,
        s.heroesKilled || 0, s.itemsObtained || 0, s.mercsHired || 0, s.expGained || 0,
        s.unitsProduced || 0, s.unitsKilled || 0, s.largestArmy || 0,
        s.goldCollected || 0, s.lumberCollected || 0, s.goldUpkeepLost || 0,
        s.durationSeconds || 0,
        s.heroes ? JSON.stringify(s.heroes) : null);
    }
  });
  tx();
}

export function hasMatchScores(matchId) {
  const row = db.prepare('SELECT COUNT(*) as count FROM match_player_scores WHERE match_id = ?').get(matchId);
  return row.count > 0;
}

export function getMatchPlayerScoresRange(startDate, endDate) {
  return db.prepare('SELECT * FROM match_player_scores WHERE date >= ? AND date <= ?').all(startDate, endDate);
}

export function getMatchIdsForDateRange(startDate, endDate) {
  return db.prepare('SELECT match_id FROM daily_matches WHERE date >= ? AND date <= ?').all(startDate, endDate).map(r => r.match_id);
}

// ── Cover Generations ─────────────────────────────────────────────

export function saveCoverGeneration(weekStart, headline, scene, style, fullPrompt, imageBuffer) {
  const result = db.prepare(`
    INSERT INTO cover_generations (week_start, headline, scene, style, full_prompt, image)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(weekStart, headline || null, scene || null, style || null, fullPrompt || null, imageBuffer);
  return result.lastInsertRowid;
}

export function getCoverGenerations(weekStart) {
  return db.prepare(`
    SELECT id, week_start, headline, scene, style, full_prompt, created_at
    FROM cover_generations WHERE week_start = ? ORDER BY created_at DESC
  `).all(weekStart);
}

export function getAllCoverGenerations(limit = 50) {
  return db.prepare(`
    SELECT id, week_start, headline, scene, style, full_prompt, created_at
    FROM cover_generations ORDER BY created_at DESC LIMIT ?
  `).all(limit);
}

export function getCoverGenerationImage(id) {
  const row = db.prepare('SELECT image FROM cover_generations WHERE id = ?').get(id);
  return row?.image || null;
}

export function deleteCoverGeneration(id) {
  db.prepare('DELETE FROM cover_generations WHERE id = ?').run(id);
}

// ── Full-text message search ──────────────────────────

export function searchMessages(query, limit = 50, offset = 0) {
  return db.prepare(`
    SELECT user_name, message, sent_at, battle_tag, received_at
    FROM messages
    WHERE deleted = 0 AND message LIKE ?
    ORDER BY received_at DESC
    LIMIT ? OFFSET ?
  `).all(`%${query}%`, Math.min(limit, 200), offset);
}

export function searchMessagesByPlayer(playerQuery, limit = 50, offset = 0) {
  const like = `%${playerQuery}%`;
  return db.prepare(`
    SELECT user_name, message, sent_at, battle_tag, received_at
    FROM messages
    WHERE deleted = 0 AND (user_name LIKE ? OR battle_tag LIKE ?)
    ORDER BY received_at DESC
    LIMIT ? OFFSET ?
  `).all(like, like, Math.min(limit, 200), offset);
}

export function getMessagesAroundTime(receivedAt, minutesPadding = 3, limit = 60) {
  return db.prepare(`
    SELECT user_name, message, sent_at, battle_tag, received_at
    FROM messages
    WHERE deleted = 0
      AND received_at >= datetime(?, '-' || ? || ' minutes')
      AND received_at <= datetime(?, '+' || ? || ' minutes')
    ORDER BY received_at ASC
    LIMIT ?
  `).all(receivedAt, minutesPadding, receivedAt, minutesPadding, limit);
}

// ── Replays ──────────────────────────────────────────

export function insertReplay({ filename, filePath, fileSize }) {
  const result = db.prepare(`
    INSERT INTO replays (filename, file_path, file_size) VALUES (?, ?, ?)
  `).run(filename, filePath, fileSize);
  return result.lastInsertRowid;
}

export function getReplayByW3cMatchId(w3cMatchId) {
  return db.prepare('SELECT * FROM replays WHERE w3c_match_id = ?').get(w3cMatchId);
}

export function getExistingW3cMatchIds(matchIds) {
  if (!matchIds.length) return new Set();
  const placeholders = matchIds.map(() => '?').join(',');
  const rows = db.prepare(`SELECT w3c_match_id FROM replays WHERE w3c_match_id IN (${placeholders})`).all(...matchIds);
  return new Set(rows.map(r => r.w3c_match_id));
}

export function insertReplayWithW3c({ filename, filePath, fileSize, w3cMatchId }) {
  const result = db.prepare(`
    INSERT INTO replays (filename, file_path, file_size, w3c_match_id) VALUES (?, ?, ?, ?)
  `).run(filename, filePath, fileSize, w3cMatchId);
  return result.lastInsertRowid;
}

export function updateReplayParsed(id, { gameName, gameDuration, mapName, matchType, matchDate, rawParsed }) {
  db.prepare(`
    UPDATE replays SET
      game_name = ?, game_duration = ?, map_name = ?, match_type = ?,
      match_date = ?, parse_status = 'parsed', raw_parsed = ?
    WHERE id = ?
  `).run(gameName, gameDuration, mapName, matchType, matchDate, rawParsed, id);
}

export function updateReplayError(id, errorMessage) {
  db.prepare(`
    UPDATE replays SET parse_status = 'error', parse_error = ? WHERE id = ?
  `).run(errorMessage, id);
}

export function getReplay(id) {
  return db.prepare('SELECT * FROM replays WHERE id = ?').get(id);
}

export function listReplays(limit = 50, offset = 0) {
  return db.prepare(`
    SELECT id, filename, file_size, uploaded_at, game_name, game_duration,
           map_name, match_type, w3c_match_id, match_date, parse_status, parse_error
    FROM replays ORDER BY uploaded_at DESC LIMIT ? OFFSET ?
  `).all(limit, offset);
}

export function getReplayCount() {
  return db.prepare('SELECT COUNT(*) as count FROM replays').get().count;
}

export function deleteReplay(id) {
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM player_fingerprints WHERE replay_id = ?').run(id);
    db.prepare('DELETE FROM replay_player_actions WHERE replay_id = ?').run(id);
    db.prepare('DELETE FROM replay_chat WHERE replay_id = ?').run(id);
    db.prepare('DELETE FROM replay_players WHERE replay_id = ?').run(id);
    db.prepare('DELETE FROM replays WHERE id = ?').run(id);
  });
  tx();
}

export function insertReplayPlayers(replayId, players) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO replay_players (replay_id, player_id, player_name, team_id, race, apm, battle_tag)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const tx = db.transaction(() => {
    for (const p of players) {
      stmt.run(replayId, p.playerId, p.playerName, p.teamId, p.race, p.apm, p.battleTag || null);
    }
  });
  tx();
}

export function getReplayPlayers(replayId) {
  return db.prepare('SELECT * FROM replay_players WHERE replay_id = ? ORDER BY team_id, player_id').all(replayId);
}

export function insertReplayChat(replayId, messages) {
  const stmt = db.prepare(`
    INSERT INTO replay_chat (replay_id, player_id, player_name, message, time_ms, mode)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const tx = db.transaction(() => {
    for (const m of messages) {
      stmt.run(replayId, m.playerId, m.playerName, m.message, m.timeMs, m.mode || 'All');
    }
  });
  tx();
}

export function getReplayChat(replayId) {
  return db.prepare('SELECT * FROM replay_chat WHERE replay_id = ? ORDER BY time_ms ASC').all(replayId);
}

export function insertReplayPlayerActions(replayId, actions) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO replay_player_actions
      (replay_id, player_id, assigngroup, rightclick, basic, buildtrain, ability, item,
       select_count, removeunit, subgroup, selecthotkey, esc, timed_segments, group_hotkeys,
       heroes, units_summary, buildings_summary, early_game_sequence, full_action_sequence)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const tx = db.transaction(() => {
    for (const a of actions) {
      stmt.run(
        replayId, a.playerId,
        a.assigngroup, a.rightclick, a.basic, a.buildtrain, a.ability, a.item,
        a.selectCount, a.removeunit, a.subgroup, a.selecthotkey, a.esc,
        JSON.stringify(a.timedSegments),
        JSON.stringify(a.groupHotkeys),
        JSON.stringify(a.heroes),
        JSON.stringify(a.unitsSummary),
        JSON.stringify(a.buildingsSummary),
        JSON.stringify(a.earlyGameSequence),
        JSON.stringify(a.fullActionSequence || [])
      );
    }
  });
  tx();
}

export function getReplayPlayerActions(replayId) {
  return db.prepare('SELECT * FROM replay_player_actions WHERE replay_id = ? ORDER BY player_id').all(replayId);
}

export function getReplaysNeedingActionSequences() {
  return db.prepare(`
    SELECT DISTINCT r.id, r.file_path FROM replays r
    JOIN replay_player_actions rpa ON rpa.replay_id = r.id
    WHERE r.parse_status = 'parsed'
      AND (rpa.full_action_sequence IS NULL OR rpa.full_action_sequence = '[]')
  `).all();
}

export function updatePlayerActionSequence(replayId, playerId, fullActionSequence) {
  db.prepare(`
    UPDATE replay_player_actions SET full_action_sequence = ? WHERE replay_id = ? AND player_id = ?
  `).run(JSON.stringify(fullActionSequence), replayId, playerId);
}

export function getActionSequencesForExport() {
  return db.prepare(`
    SELECT rpa.replay_id, rpa.player_id, rpa.full_action_sequence,
           rp.battle_tag, rp.player_name, rp.race
    FROM replay_player_actions rpa
    JOIN replay_players rp ON rp.replay_id = rpa.replay_id AND rp.player_id = rpa.player_id
    WHERE rpa.full_action_sequence IS NOT NULL
      AND rpa.full_action_sequence != '[]'
      AND rp.battle_tag IS NOT NULL
    ORDER BY rp.battle_tag, rpa.replay_id
  `).all();
}

export function getPlayerActionData(battleTag) {
  return db.prepare(`
    SELECT rpa.timed_segments, rpa.full_action_sequence, rpa.group_hotkeys
    FROM replay_player_actions rpa
    JOIN replay_players rp ON rp.replay_id = rpa.replay_id AND rp.player_id = rpa.player_id
    WHERE rp.battle_tag = ?
  `).all(battleTag);
}

// ── Player Fingerprints ─────────────────────────────

export function insertPlayerFingerprints(replayId, fingerprints) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO player_fingerprints
      (replay_id, player_id, battle_tag, player_name, race, vector,
       action_seg, apm_seg, hotkey_seg, tempo_seg, intensity_seg, transitions_seg, rhythm_seg)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const tx = db.transaction(() => {
    for (const fp of fingerprints) {
      stmt.run(
        replayId, fp.playerId, fp.battleTag || null, fp.playerName, fp.race || null,
        JSON.stringify(fp.vector), JSON.stringify(fp.segments.action),
        JSON.stringify(fp.segments.apm), JSON.stringify(fp.segments.hotkey),
        JSON.stringify(fp.segments.tempo || []),
        JSON.stringify(fp.segments.intensity || []),
        JSON.stringify(fp.segments.transitions || []),
        JSON.stringify(fp.segments.rhythm || [])
      );
    }
  });
  tx();
}

export function getPlayerFingerprints(battleTag) {
  return db.prepare(`
    SELECT pf.*, r.map_name, r.match_date, r.game_duration
    FROM player_fingerprints pf
    JOIN replays r ON r.id = pf.replay_id
    WHERE pf.battle_tag = ?
    ORDER BY r.match_date DESC
  `).all(battleTag);
}

export function getPlayerFingerprintsFiltered(battleTag, { minDuration = 0 } = {}) {
  if (minDuration > 0) {
    return db.prepare(`
      SELECT pf.*, r.map_name, r.match_date, r.game_duration
      FROM player_fingerprints pf
      JOIN replays r ON r.id = pf.replay_id
      WHERE pf.battle_tag = ? AND r.game_duration >= ?
      ORDER BY r.match_date DESC
    `).all(battleTag, minDuration);
  }
  return getPlayerFingerprints(battleTag);
}

export function getAllAveragedFingerprints() {
  return db.prepare(`
    SELECT battle_tag, player_name, race,
           COUNT(*) as replay_count,
           GROUP_CONCAT(vector, '|||') as vectors,
           GROUP_CONCAT(action_seg, '|||') as action_segs,
           GROUP_CONCAT(apm_seg, '|||') as apm_segs,
           GROUP_CONCAT(hotkey_seg, '|||') as hotkey_segs,
           GROUP_CONCAT(COALESCE(tempo_seg, '[]'), '|||') as tempo_segs,
           GROUP_CONCAT(COALESCE(intensity_seg, '[]'), '|||') as intensity_segs,
           GROUP_CONCAT(COALESCE(transitions_seg, '[]'), '|||') as transitions_segs,
           GROUP_CONCAT(COALESCE(rhythm_seg, '[]'), '|||') as rhythm_segs
    FROM player_fingerprints
    WHERE battle_tag IS NOT NULL
    GROUP BY battle_tag
  `).all();
}

export function getFingerprintCount() {
  const players = db.prepare('SELECT COUNT(DISTINCT battle_tag) as count FROM player_fingerprints WHERE battle_tag IS NOT NULL').get();
  const total = db.prepare('SELECT COUNT(*) as count FROM player_fingerprints').get();
  return { totalPlayers: players.count, totalFingerprints: total.count };
}

export function getIndexedPlayers() {
  return db.prepare(`
    SELECT battle_tag, player_name, race, COUNT(*) as replay_count
    FROM player_fingerprints
    WHERE battle_tag IS NOT NULL
    GROUP BY battle_tag
    ORDER BY replay_count DESC
  `).all();
}

export function getReplaysWithoutFingerprints() {
  return db.prepare(`
    SELECT r.id FROM replays r
    WHERE r.parse_status = 'parsed'
      AND r.id NOT IN (SELECT DISTINCT replay_id FROM player_fingerprints)
  `).all();
}

export function deleteReplayFingerprints(replayId) {
  db.prepare('DELETE FROM player_fingerprints WHERE replay_id = ?').run(replayId);
}

export function deleteAllFingerprints() {
  const result = db.prepare('DELETE FROM player_fingerprints').run();
  return result.changes;
}

export function getAllReplayIds() {
  return db.prepare("SELECT id FROM replays WHERE parse_status = 'parsed'").all();
}

export function updateFingerprintEmbedding(replayId, playerId, embedding) {
  db.prepare(`
    UPDATE player_fingerprints SET embedding = ? WHERE replay_id = ? AND player_id = ?
  `).run(JSON.stringify(embedding), replayId, playerId);
}

export function getFingerprintsWithoutEmbeddings() {
  return db.prepare(`
    SELECT pf.replay_id, pf.player_id, rpa.full_action_sequence
    FROM player_fingerprints pf
    JOIN replay_player_actions rpa ON rpa.replay_id = pf.replay_id AND rpa.player_id = pf.player_id
    WHERE pf.embedding IS NULL
      AND rpa.full_action_sequence IS NOT NULL
      AND rpa.full_action_sequence != '[]'
  `).all();
}

export function getAllAveragedFingerprintsWithEmbeddings() {
  return db.prepare(`
    SELECT battle_tag, player_name, race,
           COUNT(*) as replay_count,
           GROUP_CONCAT(vector, '|||') as vectors,
           GROUP_CONCAT(action_seg, '|||') as action_segs,
           GROUP_CONCAT(apm_seg, '|||') as apm_segs,
           GROUP_CONCAT(hotkey_seg, '|||') as hotkey_segs,
           GROUP_CONCAT(COALESCE(tempo_seg, '[]'), '|||') as tempo_segs,
           GROUP_CONCAT(COALESCE(intensity_seg, '[]'), '|||') as intensity_segs,
           GROUP_CONCAT(COALESCE(transitions_seg, '[]'), '|||') as transitions_segs,
           GROUP_CONCAT(COALESCE(rhythm_seg, '[]'), '|||') as rhythm_segs,
           GROUP_CONCAT(COALESCE(embedding, ''), '|||') as embeddings
    FROM player_fingerprints
    WHERE battle_tag IS NOT NULL
    GROUP BY battle_tag
  `).all();
}

// ── Feedback issues ──────────────────────────────────

export function searchMessagesByKeywords(keywords, sinceHours = 24) {
  const conditions = keywords.map(() => 'LOWER(message) LIKE ?').join(' OR ');
  const params = keywords.map(k => `%${k.toLowerCase()}%`);
  return db.prepare(`
    SELECT id, battle_tag, user_name, clan_tag, message, sent_at, received_at
    FROM messages
    WHERE deleted = 0 AND received_at > datetime('now', '-' || ? || ' hours')
      AND (${conditions})
    ORDER BY received_at ASC
  `).all(sinceHours, ...params);
}

export function getMessagesInTimeRange(from, to) {
  return db.prepare(`
    SELECT id, battle_tag, user_name, clan_tag, message, sent_at, received_at
    FROM messages
    WHERE deleted = 0 AND received_at >= ? AND received_at <= ?
    ORDER BY received_at ASC
  `).all(from, to);
}

export function insertFeedbackIssue(record) {
  return db.prepare(`
    INSERT INTO feedback_issues (trigger_msg_ids, github_issue_number, github_issue_url, ai_type, ai_title, ai_priority, actionable)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    JSON.stringify(record.triggerMsgIds),
    record.githubIssueNumber || null,
    record.githubIssueUrl || null,
    record.aiType || null,
    record.aiTitle || null,
    record.aiPriority || null,
    record.actionable ? 1 : 0
  );
}

export function getFeedbackIssueTriggerIds(sinceHours = 48) {
  const rows = db.prepare(`
    SELECT trigger_msg_ids FROM feedback_issues
    WHERE created_at > datetime('now', '-' || ? || ' hours')
  `).all(sinceHours);
  const ids = new Set();
  for (const row of rows) {
    for (const id of JSON.parse(row.trigger_msg_ids)) {
      ids.add(id);
    }
  }
  return ids;
}

export function getRecentFeedbackIssues(limit = 20) {
  return db.prepare(`
    SELECT * FROM feedback_issues ORDER BY created_at DESC LIMIT ?
  `).all(limit);
}

// ── Style Thumbnails ──────────────────────────────────

export function saveStyleThumbnail(styleId, prompt, imageBuffer) {
  db.prepare(`
    INSERT INTO style_thumbnails (style_id, image, prompt) VALUES (?, ?, ?)
    ON CONFLICT(style_id) DO UPDATE SET image = excluded.image, prompt = excluded.prompt, created_at = datetime('now')
  `).run(styleId, imageBuffer, prompt);
}

export function getStyleThumbnail(styleId) {
  const row = db.prepare('SELECT image FROM style_thumbnails WHERE style_id = ?').get(styleId);
  return row?.image || null;
}

// ── Blog posts ──────────────────────────────────────

export function getBlogPosts(includeUnpublished = false) {
  if (includeUnpublished) {
    return db.prepare('SELECT slug, title, description, date, tags, published, cover_image, created_at, updated_at FROM blog_posts ORDER BY created_at DESC').all();
  }
  return db.prepare('SELECT slug, title, description, date, tags, published, cover_image, created_at, updated_at FROM blog_posts WHERE published = 1 ORDER BY created_at DESC').all();
}

export function getBlogPost(slug, includeUnpublished = false) {
  if (includeUnpublished) {
    return db.prepare('SELECT * FROM blog_posts WHERE slug = ?').get(slug);
  }
  return db.prepare('SELECT * FROM blog_posts WHERE slug = ? AND published = 1').get(slug);
}

export function createBlogPost({ slug, title, description, date, tags, content, published, coverImage }) {
  db.prepare(`
    INSERT INTO blog_posts (slug, title, description, date, tags, content, published, cover_image)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(slug, title, description || '', date, JSON.stringify(tags || []), content || '', published ? 1 : 0, coverImage || null);
}

export function updateBlogPost(slug, fields) {
  const sets = [];
  const params = [];
  for (const [key, value] of Object.entries(fields)) {
    if (['title', 'description', 'date', 'content'].includes(key)) {
      sets.push(`${key} = ?`);
      params.push(value);
    } else if (key === 'coverImage') {
      sets.push('cover_image = ?');
      params.push(value);
    } else if (key === 'tags') {
      sets.push('tags = ?');
      params.push(JSON.stringify(value));
    } else if (key === 'published') {
      sets.push('published = ?');
      params.push(value ? 1 : 0);
    }
  }
  if (sets.length === 0) return;
  sets.push("updated_at = datetime('now')");
  params.push(slug);
  db.prepare(`UPDATE blog_posts SET ${sets.join(', ')} WHERE slug = ?`).run(...params);
}

export function toggleBlogPostPublished(slug) {
  db.prepare('UPDATE blog_posts SET published = 1 - published, updated_at = datetime(\'now\') WHERE slug = ?').run(slug);
  return db.prepare('SELECT published FROM blog_posts WHERE slug = ?').get(slug);
}

export function deleteBlogPost(slug) {
  db.prepare('DELETE FROM blog_posts WHERE slug = ?').run(slug);
}
