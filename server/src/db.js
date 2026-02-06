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
  const users = db.prepare('SELECT COUNT(DISTINCT battle_tag) as count FROM messages WHERE deleted = 0').get();
  const last24h = db.prepare(`
    SELECT COUNT(*) as count FROM messages
    WHERE deleted = 0 AND sent_at > datetime('now', '-1 day')
  `).get();
  return {
    totalMessages: total.count,
    uniqueUsers: users.count,
    messagesLast24h: last24h.count,
  };
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
