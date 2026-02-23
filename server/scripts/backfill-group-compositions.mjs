/**
 * Backfill group_compositions for all existing replays.
 * Re-parses the raw .w3g files on disk to extract ObjectID→ItemID mappings
 * and writes the final group compositions to the DB.
 */

import { readFileSync } from 'fs';
import { readdir } from 'fs/promises';
import path from 'path';
import w3gjs from 'w3gjs';
import Database from 'better-sqlite3';

const W3GReplay = w3gjs.default;

function fourCCToString(arr) {
  if (!arr || arr.length !== 4) return null;
  return String.fromCharCode(arr[3], arr[2], arr[1], arr[0]);
}

function netTagKey(tag) {
  return `${tag[0]}:${tag[1]}`;
}

async function extractGroupCompositions(buffer) {
  const parser = new W3GReplay();
  const playerState = {};

  const getPlayer = (id) => {
    if (!playerState[id]) {
      playerState[id] = { objectMap: new Map(), groups: {} };
    }
    return playerState[id];
  };

  let elapsed = 0;
  const onBlock = (block) => {
    if (block.id !== 0x1f && block.id !== 0x1e) return;
    elapsed += block.timeIncrement;
    for (const cmd of block.commandBlocks || []) {
      for (const action of cmd.actions || []) {
        if (action.id === 0x19 && action.itemId && action.object) {
          const ps = getPlayer(cmd.playerId);
          const itemStr = fourCCToString(action.itemId);
          if (itemStr && (action.object[0] !== 0 || action.object[1] !== 0)) {
            ps.objectMap.set(netTagKey(action.object), itemStr);
          }
        }
        if (action.id === 0x17 && action.units) {
          const ps = getPlayer(cmd.playerId);
          const g = (action.groupNumber + 1) % 10;
          ps.groups[g] = action.units.map(u => netTagKey(u));
        }
      }
    }
  };

  parser.on('gamedatablock', onBlock);
  const result = await parser.parse(buffer);
  parser.removeListener('gamedatablock', onBlock);

  // Build resolved compositions per player
  const compositions = {};
  for (const [playerId, ps] of Object.entries(playerState)) {
    compositions[playerId] = {};
    for (const [g, unitKeys] of Object.entries(ps.groups)) {
      compositions[playerId][g] = unitKeys.map(key => ps.objectMap.get(key) || null);
    }
  }

  return { result, compositions };
}

const db = new Database(path.resolve('data/chat.db'));

// Ensure column exists
try {
  db.prepare('SELECT group_compositions FROM replay_player_actions LIMIT 1').get();
} catch {
  db.exec('ALTER TABLE replay_player_actions ADD COLUMN group_compositions TEXT');
  console.log('Added group_compositions column');
}

const updateStmt = db.prepare(`
  UPDATE replay_player_actions SET group_compositions = ? WHERE replay_id = ? AND player_id = ?
`);

const replays = db.prepare(`
  SELECT id, filename, file_path FROM replays WHERE parse_status = 'parsed' ORDER BY id
`).all();

console.log(`Backfilling ${replays.length} replays...\n`);

let success = 0;
let failed = 0;

for (const replay of replays) {
  const filePath = path.resolve('data/replays', replay.filename);
  try {
    const buffer = readFileSync(filePath);
    const { result, compositions } = await extractGroupCompositions(buffer);

    const tx = db.transaction(() => {
      for (const player of result.players || []) {
        const comp = compositions[player.id] || {};
        updateStmt.run(JSON.stringify(comp), replay.id, player.id);
      }
    });
    tx();
    success++;
  } catch (e) {
    failed++;
  }
}

console.log(`Done: ${success} success, ${failed} failed`);

// Verify
const sample = db.prepare(`
  SELECT rp.battle_tag, rpa.group_compositions
  FROM replay_player_actions rpa
  JOIN replay_players rp ON rp.replay_id = rpa.replay_id AND rp.player_id = rpa.player_id
  WHERE rpa.group_compositions IS NOT NULL AND rpa.group_compositions != '{}'
  LIMIT 3
`).all();

console.log('\nSample data:');
for (const row of sample) {
  const comp = JSON.parse(row.group_compositions);
  console.log(`  ${row.battle_tag}:`, Object.entries(comp).map(([g, units]) => `[${g}] ${units.filter(Boolean).length}/${units.length} resolved`).join(', '));
}

db.close();
