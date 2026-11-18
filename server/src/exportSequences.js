/**
 * Export every stored click sequence for training the sequence model
 * (server/ml/sequence/). Run on the relay machine, in its own process, at low
 * priority, against a read-only connection:
 *
 *   nice -n 19 node src/exportSequences.js --stats
 *   nice -n 19 node src/exportSequences.js /tmp/sequences.tsv.gz
 *
 * then fetch the file with `fly ssh sftp get` and delete it.
 *
 * Writes gzip TSV, one line per player per replay:
 *   replay_id  player_id  battle_tag  race  team_id  match_date  map_name  duration_s  actions
 * actions are space-separated "dt:id[:g<group>][:n<units>][:o<order>][:u<tabbed unit>][:r<gold>/<lumber>]" with
 * dt the milliseconds since the previous action and id the action id in hex.
 * Stops before the volume holding the output gets close to full.
 */
import Database from 'better-sqlite3';
import { openSync, writeSync, closeSync, statfsSync } from 'fs';
import { dirname } from 'path';
import { gzipSync } from 'zlib';
import config from './config.js';

const MAX_ACTIONS = 6000;     // ~25 minutes for a busy player
const MIN_FREE_BYTES = 1.5e9; // leave this much free on the output volume
const BATCH = 200;

const args = process.argv.slice(2);
const statsOnly = args.includes('--stats');
const outPath = args.find(a => !a.startsWith('--'));
if (!statsOnly && !outPath) {
  console.error('usage: node src/exportSequences.js (--stats | <out.tsv.gz>)');
  process.exit(1);
}

const db = new Database(config.DB_PATH, { readonly: true });
db.pragma('busy_timeout = 5000');

const stats = db.prepare(`
  SELECT COUNT(*) AS rows, SUM(octet_length(full_action_sequence)) AS bytes,
         COUNT(DISTINCT rp.battle_tag) AS players
  FROM replay_player_actions rpa
  JOIN replay_players rp ON rp.replay_id = rpa.replay_id AND rp.player_id = rpa.player_id
  WHERE octet_length(rpa.full_action_sequence) > 2 AND rp.battle_tag IS NOT NULL
`).get();
console.log(`${stats.rows} sequences, ${stats.players} players, ${(stats.bytes / 1e9).toFixed(2)} GB stored as JSON`);
if (statsOnly) process.exit(0);

const freeBytes = () => { const s = statfsSync(dirname(outPath)); return s.bavail * s.bsize; };
console.log(`free on ${dirname(outPath)}: ${(freeBytes() / 1e9).toFixed(2)} GB`);

const rows = db.prepare(`
  SELECT rpa.replay_id, rpa.player_id, rp.battle_tag, rp.race, rp.team_id,
         r.match_date, r.map_name, r.game_duration, rpa.full_action_sequence
  FROM replay_player_actions rpa
  JOIN replay_players rp ON rp.replay_id = rpa.replay_id AND rp.player_id = rpa.player_id
  JOIN replays r ON r.id = rpa.replay_id
  WHERE octet_length(rpa.full_action_sequence) > 2 AND rp.battle_tag IS NOT NULL
  ORDER BY rpa.replay_id, rpa.player_id
`);

const clean = (v) => String(v ?? '').replace(/[\t\n\r]/g, ' ');

function encode(seq) {
  const out = [];
  let last = 0;
  for (let i = 0; i < seq.length && i < MAX_ACTIONS; i++) {
    const a = seq[i];
    let tok = `${Math.max(0, a.ms - last)}:${a.id.toString(16)}`;
    if (a.g != null) tok += `:g${a.g}`;
    if (a.n != null) tok += `:n${a.n}`;
    if (a.oid) tok += `:o${String(a.oid).replace(/[\s:]/g, '')}`;
    if (a.u) tok += `:u${String(a.u).replace(/[\s:]/g, '')}`;
    if (a.gold || a.lumber) tok += `:r${a.gold || 0}/${a.lumber || 0}`;
    out.push(tok);
    last = a.ms;
  }
  return out.join(' ');
}

const fd = openSync(outPath, 'w');
let lines = [], done = 0, written = 0, skipped = 0;
const t0 = Date.now();
const flush = () => {
  if (!lines.length) return;
  const buf = gzipSync(lines.join('\n') + '\n'); // concatenated gzip members
  writeSync(fd, buf);
  written += buf.length;
  lines = [];
};

for (const r of rows.iterate()) {
  let seq;
  try { seq = JSON.parse(r.full_action_sequence); } catch { skipped++; continue; }
  if (!Array.isArray(seq) || !seq.length) { skipped++; continue; }
  lines.push([
    r.replay_id, r.player_id, clean(r.battle_tag), clean(r.race), r.team_id ?? '',
    clean(r.match_date), clean(r.map_name), r.game_duration ?? '', encode(seq),
  ].join('\t'));
  done++;
  if (lines.length >= BATCH) {
    flush();
    if (freeBytes() < MIN_FREE_BYTES) {
      console.error(`stopping: under ${MIN_FREE_BYTES / 1e9} GB free after ${done} rows`);
      break;
    }
  }
  if (done % 5000 === 0) {
    console.log(`${done}/${stats.rows} rows, ${(written / 1e6).toFixed(0)} MB, ${Math.round((Date.now() - t0) / 1000)}s`);
  }
}
flush();
closeSync(fd);
console.log(`done: ${done} rows (${skipped} unreadable), ${(written / 1e6).toFixed(0)} MB in ${Math.round((Date.now() - t0) / 1000)}s -> ${outPath}`);
