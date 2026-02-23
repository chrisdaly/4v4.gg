#!/usr/bin/env node
/**
 * Re-parse old importer replays that have stale action data.
 * Deletes old player_actions/fingerprints and re-runs through the new parser.
 *
 * Usage: cd server && node scripts/reparse-old-replays.mjs
 */

import { statSync } from 'fs';
import { resolve } from 'path';
import Database from 'better-sqlite3';
import { parseReplayFile } from '../src/replayParser.js';
import { buildServerFingerprint } from '../src/fingerprint.js';

const DB_PATH = resolve(import.meta.dirname, '..', 'data', 'chat.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Find all replays stored by old importer (server/data/replays/)
const replays = db.prepare(`
  SELECT id, filename, file_path FROM replays
  WHERE file_path LIKE '%server/data/replays%' AND parse_status = 'parsed'
  ORDER BY id
`).all();

console.log(`Found ${replays.length} old-importer replays to re-parse`);

const deleteActions = db.prepare('DELETE FROM replay_player_actions WHERE replay_id = ?');
const deleteFingerprints = db.prepare('DELETE FROM player_fingerprints WHERE replay_id = ?');
const deletePlayers = db.prepare('DELETE FROM replay_players WHERE replay_id = ?');
const deleteChat = db.prepare('DELETE FROM replay_chat WHERE replay_id = ?');

const updateParsed = db.prepare(`
  UPDATE replays SET game_name = ?, game_duration = ?, map_name = ?, match_type = ?,
    match_date = ?, parse_status = 'parsed', raw_parsed = ?
  WHERE id = ?
`);

const insertPlayer = db.prepare(`
  INSERT OR REPLACE INTO replay_players (replay_id, player_id, player_name, team_id, race, apm, battle_tag)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const insertChat = db.prepare(`
  INSERT INTO replay_chat (replay_id, player_id, player_name, message, time_ms, mode)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const insertAction = db.prepare(`
  INSERT OR REPLACE INTO replay_player_actions
    (replay_id, player_id, assigngroup, rightclick, basic, buildtrain, ability, item,
     select_count, removeunit, subgroup, selecthotkey, esc, timed_segments, group_hotkeys,
     heroes, units_summary, buildings_summary, early_game_sequence, full_action_sequence,
     group_compositions)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertFingerprint = db.prepare(`
  INSERT OR REPLACE INTO player_fingerprints
    (replay_id, player_id, battle_tag, player_name, race, vector,
     action_seg, apm_seg, hotkey_seg, tempo_seg, intensity_seg, transitions_seg, rhythm_seg)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const reimportTx = db.transaction((replayId, filePath, parsed) => {
  // Clear old data
  deleteActions.run(replayId);
  deleteFingerprints.run(replayId);
  deletePlayers.run(replayId);
  deleteChat.run(replayId);

  // Update metadata
  updateParsed.run(
    parsed.metadata.gameName, parsed.metadata.gameDuration,
    parsed.metadata.mapName, parsed.metadata.matchType,
    parsed.metadata.matchDate, JSON.stringify(parsed), replayId
  );

  // Insert players
  for (const p of parsed.players) {
    const battleTag = p.playerName?.includes('#') ? p.playerName : null;
    insertPlayer.run(replayId, p.playerId, p.playerName, p.teamId, p.race, p.apm, battleTag);
  }

  // Insert chat
  for (const m of parsed.chat) {
    insertChat.run(replayId, m.playerId, m.playerName, m.message, m.timeMs, m.mode || 'All');
  }

  // Insert actions
  for (const a of parsed.actions) {
    insertAction.run(
      replayId, a.playerId,
      a.assigngroup, a.rightclick, a.basic, a.buildtrain, a.ability, a.item,
      a.selectCount, a.removeunit, a.subgroup, a.selecthotkey, a.esc,
      JSON.stringify(a.timedSegments), JSON.stringify(a.groupHotkeys),
      JSON.stringify(a.heroes), JSON.stringify(a.unitsSummary),
      JSON.stringify(a.buildingsSummary), JSON.stringify(a.earlyGameSequence),
      JSON.stringify(a.fullActionSequence || []),
      JSON.stringify(a.groupCompositions || {})
    );
  }

  // Insert fingerprints
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
    insertFingerprint.run(
      replayId, a.playerId, battleTag, player?.playerName || '', player?.race || null,
      JSON.stringify(fp.vector), JSON.stringify(fp.segments.action),
      JSON.stringify(fp.segments.apm), JSON.stringify(fp.segments.hotkey),
      JSON.stringify(fp.segments.tempo || []),
      JSON.stringify(fp.segments.intensity || []),
      JSON.stringify(fp.segments.transitions || []),
      JSON.stringify(fp.segments.rhythm || [])
    );
  }
});

let success = 0, failed = 0;
for (const replay of replays) {
  try {
    const parsed = await parseReplayFile(replay.file_path);
    reimportTx(replay.id, replay.file_path, parsed);
    success++;
  } catch (err) {
    failed++;
  }
}

console.log(`Done: ${success} re-parsed, ${failed} failed`);
db.close();
