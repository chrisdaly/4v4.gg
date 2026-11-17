/**
 * Runs one heavy build off the main thread (see runInWorker in
 * routes/fingerprints.js): 'suspects' (the suspects list) or 'gallery' (the
 * Signatures gallery). Reads the DB through its own read-only connection,
 * posts the result back once, then exits.
 */
import { parentPort, workerData } from 'worker_threads';
import { openDbReadOnly } from './db.js';

try {
  openDbReadOnly();
  const fp = await import('./routes/fingerprints.js');
  const build = { suspects: fp.computeSuspectsSnapshot, gallery: fp.computeGallerySnapshot }[workerData.job];
  if (!build) throw new Error(`unknown job ${workerData.job}`);
  parentPort.postMessage({ data: await build() });
} catch (err) {
  parentPort.postMessage({ error: err.stack || err.message });
}
