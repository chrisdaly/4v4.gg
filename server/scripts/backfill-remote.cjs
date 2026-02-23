/**
 * Remote-friendly backfill (CommonJS, resolves from /app).
 * Run from /app: node /tmp/backfill-remote.cjs
 */
const { readFileSync, readdirSync } = require('fs');
const path = require('path');
const w3gjs = require('w3gjs');
const Database = require('better-sqlite3');

const W3GReplay = w3gjs.default;

function fourCCToString(arr) {
  if (!arr || arr.length !== 4) return null;
  return String.fromCharCode(arr[3], arr[2], arr[1], arr[0]);
}
function netTagKey(tag) { return `${tag[0]}:${tag[1]}`; }

async function extractGroupCompositions(buffer) {
  const parser = new W3GReplay();
  const playerState = {};
  const getPlayer = (id) => {
    if (!playerState[id]) playerState[id] = { objectMap: new Map(), groups: {} };
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
          if (itemStr && (action.object[0] !== 0 || action.object[1] !== 0))
            ps.objectMap.set(netTagKey(action.object), itemStr);
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
  const compositions = {};
  for (const [playerId, ps] of Object.entries(playerState)) {
    compositions[playerId] = {};
    for (const [g, unitKeys] of Object.entries(ps.groups))
      compositions[playerId][g] = unitKeys.map(key => ps.objectMap.get(key) || null);
  }
  return { result, compositions };
}

async function main() {
  const dbPath = process.env.DB_PATH || '/data/chat.db';
  const replayDir = process.env.REPLAY_DIR || '/data/replays';
  const db = new Database(dbPath);

  try { db.prepare('SELECT group_compositions FROM replay_player_actions LIMIT 1').get(); }
  catch(e) { db.exec('ALTER TABLE replay_player_actions ADD COLUMN group_compositions TEXT'); console.log('Added column'); }

  const updateStmt = db.prepare('UPDATE replay_player_actions SET group_compositions = ? WHERE replay_id = ? AND player_id = ?');
  const replays = db.prepare("SELECT id, filename FROM replays WHERE parse_status = 'parsed' ORDER BY id").all();
  console.log(`Backfilling ${replays.length} replays...`);

  let success = 0, failed = 0;
  for (const replay of replays) {
    const filePath = path.join(replayDir, replay.filename);
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
    } catch(e) { failed++; }
  }
  console.log(`Done: ${success} success, ${failed} failed`);
  db.close();
}

main().catch(e => { console.error(e); process.exit(1); });
