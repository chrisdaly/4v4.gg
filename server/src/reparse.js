/**
 * Bring stored replays up to the current parser standard (PARSER_VERSION in
 * replayParser.js) by re-parsing the .w3g files kept on the volume. No W3C
 * downloads, so no rate limit; games whose file is gone need the download
 * backfill instead.
 *
 * Parsing runs in reparseWorker.js; writes happen here on the main thread
 * (the worker's DB connection would be read-only, and SQLite wants one writer).
 */
import { Worker } from 'worker_threads';
import { getReplaysBelowParserVersion, updatePlayerActionData } from './db.js';

const state = { running: false, total: 0, done: 0, updated: 0, missing: 0, errors: 0, startedAt: null, finishedAt: null, lastError: null };

export function reparseStatus() {
  return { ...state };
}

// Parsing a game takes about a second of CPU. The relay is a shared-cpu-1x
// machine whose baseline is a small slice of one core: a 1.5 s pause ran it
// flat out for hours, drained its burst credits, and on 19 Nov 2026 the
// throttled machine froze for 15 minutes. 20 s between games stays under the
// baseline (about 7,400 files is then roughly two days).
export function startReparse({ pauseMs = 20000, limit = null } = {}) {
  if (state.running) return reparseStatus();
  let files = getReplaysBelowParserVersion().map((r) => ({ id: r.id, path: r.file_path }));
  if (limit) files = files.slice(0, limit);
  Object.assign(state, { running: true, total: files.length, done: 0, updated: 0, missing: 0, errors: 0, startedAt: new Date().toISOString(), finishedAt: null, lastError: null });
  if (files.length === 0) {
    Object.assign(state, { running: false, finishedAt: new Date().toISOString() });
    return reparseStatus();
  }

  const worker = new Worker(new URL('./reparseWorker.js', import.meta.url), { workerData: { files, pauseMs } });
  const finish = () => {
    state.running = false;
    state.finishedAt = new Date().toISOString();
    console.log(`[Reparse] finished: ${state.updated} games updated, ${state.missing} files missing, ${state.errors} errors`);
  };
  worker.on('message', (msg) => {
    if (msg.done) return finish();
    state.done++;
    if (msg.missing) state.missing++;
    else if (msg.error) { state.errors++; state.lastError = `${msg.replayId}: ${msg.error}`; }
    else {
      try {
        for (const a of msg.actions) updatePlayerActionData(msg.replayId, a.playerId, a);
        state.updated++;
      } catch (err) {
        state.errors++;
        state.lastError = `${msg.replayId}: ${err.message}`;
      }
    }
    if (state.done % 250 === 0) console.log(`[Reparse] ${state.done}/${state.total}`);
  });
  worker.on('error', (err) => { state.lastError = err.message; finish(); });
  worker.on('exit', () => { if (state.running) finish(); });
  console.log(`[Reparse] ${files.length} stored replays below the current parser standard`);
  return reparseStatus();
}
