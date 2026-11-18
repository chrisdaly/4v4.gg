/**
 * Worker thread for reparse.js: parses stored replay files one at a time and
 * posts each game's per-player sequence data back. Parsing a 4v4 replay takes
 * seconds of CPU, which on the main thread would stall every request.
 */
import { parentPort, workerData } from 'worker_threads';
import { existsSync } from 'fs';
import { parseReplayFile } from './replayParser.js';

const { files, pauseMs } = workerData;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

for (const { id, path } of files) {
  if (!existsSync(path)) {
    parentPort.postMessage({ replayId: id, missing: true });
    continue;
  }
  try {
    const parsed = await parseReplayFile(path);
    parentPort.postMessage({
      replayId: id,
      actions: parsed.actions.map((a) => ({
        playerId: a.playerId,
        fullActionSequence: a.fullActionSequence,
        groupHotkeys: a.groupHotkeys,
        groupCompositions: a.groupCompositions,
        timedSegments: a.timedSegments,
        earlyGameSequence: a.earlyGameSequence,
      })),
    });
  } catch (err) {
    parentPort.postMessage({ replayId: id, error: err.message });
  }
  await sleep(pauseMs); // leave the single CPU to the relay between games
}
parentPort.postMessage({ done: true });
