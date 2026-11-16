/**
 * Builds the suspects list off the main thread (see getSuspectsData in
 * routes/fingerprints.js). Reads the DB through its own read-only connection,
 * posts the result back once, then exits.
 */
import { parentPort } from 'worker_threads';
import { openDbReadOnly } from './db.js';

try {
  openDbReadOnly();
  const { computeSuspectsSnapshot } = await import('./routes/fingerprints.js');
  parentPort.postMessage({ data: computeSuspectsSnapshot() });
} catch (err) {
  parentPort.postMessage({ error: err.stack || err.message });
}
