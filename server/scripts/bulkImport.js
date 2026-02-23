#!/usr/bin/env node
/**
 * Bulk Import Local Replays
 *
 * Recursively finds .w3g files in a directory and imports them into the local
 * SQLite DB with parsing, chat extraction, and fingerprinting.
 *
 * Usage:
 *   cd server
 *   node scripts/bulkImport.js ~/Desktop/BattleNet
 *   node scripts/bulkImport.js ~/Desktop/BattleNet --min-size 200
 *   node scripts/bulkImport.js ~/Desktop/BattleNet --dry-run
 */

import { readFileSync, statSync } from 'fs';
import { resolve, basename, relative } from 'path';
import { readdir } from 'fs/promises';
import Database from 'better-sqlite3';
import { parseReplayFile } from '../src/replayParser.js';
import { buildServerFingerprint } from '../src/fingerprint.js';

// ── Args ──────────────────────────────────────────────
const args = process.argv.slice(2);
const dir = args.find(a => !a.startsWith('--'));
if (!dir) {
  console.error('Usage: node scripts/bulkImport.js <directory> [--min-size <KB>] [--dry-run]');
  process.exit(1);
}

const minSizeKB = (() => {
  const idx = args.indexOf('--min-size');
  return idx !== -1 && args[idx + 1] ? parseInt(args[idx + 1], 10) : 200;
})();
const dryRun = args.includes('--dry-run');
const minSizeBytes = minSizeKB * 1024;
const rootDir = resolve(dir);

// ── DB setup (direct, no server) ──────────────────────
const DB_PATH = resolve(import.meta.dirname, '..', 'data', 'chat.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 5000');
db.pragma('cache_size = -20000');

// ── Ensure tables exist (mirrors db.js initDb) ──────
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
    full_action_sequence TEXT,
    group_compositions TEXT,
    UNIQUE(replay_id, player_id)
  );
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
    tempo_seg    TEXT,
    intensity_seg TEXT,
    transitions_seg TEXT,
    rhythm_seg   TEXT,
    embedding    TEXT,
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(replay_id, player_id)
  );
  CREATE INDEX IF NOT EXISTS idx_fp_battle_tag ON player_fingerprints(battle_tag);
`);

// ── Prepared statements ───────────────────────────────
const stmts = {
  getByFilename: db.prepare('SELECT id FROM replays WHERE filename = ?'),
  getByW3cMatchId: db.prepare('SELECT id FROM replays WHERE w3c_match_id = ?'),
  insertReplay: db.prepare(`
    INSERT INTO replays (filename, file_path, file_size, w3c_match_id)
    VALUES (?, ?, ?, ?)
  `),
  updateParsed: db.prepare(`
    UPDATE replays SET
      game_name = ?, game_duration = ?, map_name = ?, match_type = ?,
      match_date = ?, parse_status = 'parsed', raw_parsed = ?
    WHERE id = ?
  `),
  updateError: db.prepare(`
    UPDATE replays SET parse_status = 'error', parse_error = ? WHERE id = ?
  `),
  insertPlayer: db.prepare(`
    INSERT OR REPLACE INTO replay_players (replay_id, player_id, player_name, team_id, race, apm, battle_tag)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `),
  insertChat: db.prepare(`
    INSERT INTO replay_chat (replay_id, player_id, player_name, message, time_ms, mode)
    VALUES (?, ?, ?, ?, ?, ?)
  `),
  insertAction: db.prepare(`
    INSERT OR REPLACE INTO replay_player_actions
      (replay_id, player_id, assigngroup, rightclick, basic, buildtrain, ability, item,
       select_count, removeunit, subgroup, selecthotkey, esc, timed_segments, group_hotkeys,
       heroes, units_summary, buildings_summary, early_game_sequence, full_action_sequence,
       group_compositions)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
  insertFingerprint: db.prepare(`
    INSERT OR REPLACE INTO player_fingerprints
      (replay_id, player_id, battle_tag, player_name, race, vector,
       action_seg, apm_seg, hotkey_seg, tempo_seg, intensity_seg, transitions_seg, rhythm_seg)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
};

// ── Find all .w3g files recursively ───────────────────
async function findW3gFiles(dir) {
  const files = [];
  async function walk(d) {
    let entries;
    try { entries = await readdir(d, { withFileTypes: true }); }
    catch { return; } // skip unreadable dirs
    for (const entry of entries) {
      const full = resolve(d, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile() && entry.name.endsWith('.w3g')) {
        files.push(full);
      }
    }
  }
  await walk(dir);
  return files;
}

// ── Extract W3C match ID from game name ───────────────
function extractW3cMatchId(gameName) {
  if (!gameName) return null;
  // W3C game names look like "w3c-..." or start with the match ID pattern
  if (gameName.startsWith('w3c-')) return gameName;
  return null;
}

// ── Import a single replay ────────────────────────────
function importReplay(filePath, parsed) {
  const filename = basename(filePath);
  const fileSize = statSync(filePath).size;
  const w3cMatchId = extractW3cMatchId(parsed.metadata.gameName);

  // Insert replay record
  const result = stmts.insertReplay.run(filename, filePath, fileSize, w3cMatchId);
  const replayId = Number(result.lastInsertRowid);

  // Update parsed metadata
  stmts.updateParsed.run(
    parsed.metadata.gameName,
    parsed.metadata.gameDuration,
    parsed.metadata.mapName,
    parsed.metadata.matchType,
    parsed.metadata.matchDate,
    JSON.stringify(parsed),
    replayId
  );

  // Insert players — derive battle_tag from playerName if it contains '#'
  for (const p of parsed.players) {
    const battleTag = p.playerName?.includes('#') ? p.playerName : null;
    stmts.insertPlayer.run(replayId, p.playerId, p.playerName, p.teamId, p.race, p.apm, battleTag);
  }

  // Insert chat
  for (const m of parsed.chat) {
    stmts.insertChat.run(replayId, m.playerId, m.playerName, m.message, m.timeMs, m.mode || 'All');
  }

  // Insert actions
  for (const a of parsed.actions) {
    stmts.insertAction.run(
      replayId, a.playerId,
      a.assigngroup, a.rightclick, a.basic, a.buildtrain, a.ability, a.item,
      a.selectCount, a.removeunit, a.subgroup, a.selecthotkey, a.esc,
      JSON.stringify(a.timedSegments),
      JSON.stringify(a.groupHotkeys),
      JSON.stringify(a.heroes),
      JSON.stringify(a.unitsSummary),
      JSON.stringify(a.buildingsSummary),
      JSON.stringify(a.earlyGameSequence),
      JSON.stringify(a.fullActionSequence || []),
      JSON.stringify(a.groupCompositions || {})
    );
  }

  // Compute & insert fingerprints
  for (const a of parsed.actions) {
    const fp = buildServerFingerprint({
      rightclick: a.rightclick, ability: a.ability,
      buildtrain: a.buildtrain, item: a.item,
      selecthotkey: a.selecthotkey, assigngroup: a.assigngroup,
      timed_segments: a.timedSegments,
      group_hotkeys: a.groupHotkeys,
      full_action_sequence: a.fullActionSequence,
    });
    const player = parsed.players.find(p => p.playerId === a.playerId);
    const battleTag = player?.playerName?.includes('#') ? player.playerName : null;
    stmts.insertFingerprint.run(
      replayId, a.playerId, battleTag, player?.playerName || '', player?.race || null,
      JSON.stringify(fp.vector), JSON.stringify(fp.segments.action),
      JSON.stringify(fp.segments.apm), JSON.stringify(fp.segments.hotkey),
      JSON.stringify(fp.segments.tempo || []),
      JSON.stringify(fp.segments.intensity || []),
      JSON.stringify(fp.segments.transitions || []),
      JSON.stringify(fp.segments.rhythm || [])
    );
  }

  return replayId;
}

// Wrap the full import of one replay in a transaction for atomicity + speed
const importReplayTx = db.transaction(importReplay);

// ── Main ──────────────────────────────────────────────
async function main() {
  console.log(`Scanning ${rootDir} for .w3g files...`);
  const allFiles = await findW3gFiles(rootDir);
  console.log(`Found ${allFiles.length} .w3g files`);

  // Filter by size
  const files = allFiles.filter(f => {
    try { return statSync(f).size >= minSizeBytes; } catch { return false; }
  });
  console.log(`${files.length} files >= ${minSizeKB} KB (filtered out ${allFiles.length - files.length})`);

  if (dryRun) {
    console.log('\n[DRY RUN] Would import these files:');
    for (const f of files.slice(0, 20)) {
      const size = Math.round(statSync(f).size / 1024);
      console.log(`  ${relative(rootDir, f)} (${size} KB)`);
    }
    if (files.length > 20) console.log(`  ... and ${files.length - 20} more`);
    db.close();
    return;
  }

  // Pre-check: count existing replays
  const beforeCount = db.prepare('SELECT COUNT(*) as count FROM replays').get().count;
  console.log(`\nDB has ${beforeCount} replays before import`);
  console.log(`Importing ${files.length} files...\n`);

  let imported = 0, skipped = 0, errors = 0;
  const startTime = Date.now();

  for (let i = 0; i < files.length; i++) {
    const filePath = files[i];
    const filename = basename(filePath);

    // Dedup: check by filename
    if (stmts.getByFilename.get(filename)) {
      skipped++;
      continue;
    }

    try {
      // Parse first (outside transaction — can be slow, don't hold lock)
      const parsed = await parseReplayFile(filePath);

      // Dedup: check W3C match ID if present
      const w3cMatchId = extractW3cMatchId(parsed.metadata.gameName);
      if (w3cMatchId && stmts.getByW3cMatchId.get(w3cMatchId)) {
        skipped++;
        continue;
      }

      // Import in a transaction
      importReplayTx(filePath, parsed);
      imported++;
    } catch (err) {
      // Log parse error, insert error record, continue
      try {
        const fileSize = statSync(filePath).size;
        const result = stmts.insertReplay.run(filename, filePath, fileSize, null);
        stmts.updateError.run(err.message?.slice(0, 500) || 'Unknown error', Number(result.lastInsertRowid));
      } catch { /* double-fault: skip silently */ }
      errors++;
    }

    // Progress report
    const total = imported + skipped + errors;
    if (total % 50 === 0 && total > 0) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const rate = (imported / (elapsed / 60)).toFixed(1);
      console.log(`  [${total}/${files.length}] ${imported} imported, ${skipped} skipped, ${errors} errors (${elapsed}s, ${rate}/min)`);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const afterCount = db.prepare('SELECT COUNT(*) as count FROM replays').get().count;
  const chatCount = db.prepare('SELECT COUNT(*) as count FROM replay_chat').get().count;
  const fpCount = db.prepare('SELECT COUNT(*) as count FROM player_fingerprints').get().count;

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`Done in ${elapsed}s`);
  console.log(`  Imported:  ${imported}`);
  console.log(`  Skipped:   ${skipped} (already in DB)`);
  console.log(`  Errors:    ${errors}`);
  console.log(`  Replays:   ${beforeCount} → ${afterCount}`);
  console.log(`  Chat msgs: ${chatCount}`);
  console.log(`  Fingerprints: ${fpCount}`);
  console.log(`${'═'.repeat(50)}`);

  db.close();
}

main().catch(err => {
  console.error('Fatal error:', err);
  db.close();
  process.exit(1);
});
