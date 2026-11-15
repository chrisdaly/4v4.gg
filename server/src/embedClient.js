/**
 * Client for the Python sidecar's 2D projection (UMAP), used by the True Sight
 * map. The sidecar also serves chat text embeddings; see textEmbed.js.
 */

import config from './config.js';

const EMBED_URL = config.EMBED_URL;

let sidecarAvailable = null; // null = unknown, true/false after a check
let lastSidecarCheck = 0;
const SIDECAR_RECHECK_MS = 30000;

/**
 * Check if the sidecar is running.
 */
export async function checkSidecar() {
  lastSidecarCheck = Date.now();
  try {
    const res = await fetch(`${EMBED_URL}/health`, { signal: AbortSignal.timeout(2000) });
    sidecarAvailable = res.ok;
  } catch {
    sidecarAvailable = false;
  }
  return sidecarAvailable;
}

/**
 * Re-check at most every 30s, whichever way the last check went: a sidecar
 * that was up can go down.
 */
async function ensureSidecar() {
  if (sidecarAvailable !== null && (Date.now() - lastSidecarCheck) < SIDECAR_RECHECK_MS) return sidecarAvailable;
  return checkSidecar();
}

/**
 * Fit UMAP on a matrix of embeddings and return 2D projections.
 * @param {number[][]} embeddings
 * @param {object} options - { n_neighbors, min_dist }
 * @returns {{ points: {x: number, y: number}[] } | null}
 */
export async function getUmapProjection(embeddings, options = {}) {
  if (!(await ensureSidecar())) return null;

  try {
    console.log(`[UMAP] Fitting ${embeddings.length} embeddings...`);
    const start = Date.now();
    const res = await fetch(`${EMBED_URL}/umap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeddings,
        n_neighbors: options.n_neighbors || 15,
        min_dist: options.min_dist || 0.1,
      }),
      signal: AbortSignal.timeout(120000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error(`[UMAP] Sidecar returned ${res.status}: ${text}`);
      return null;
    }
    const data = await res.json();
    console.log(`[UMAP] Fit complete in ${((Date.now() - start) / 1000).toFixed(1)}s - ${data.points?.length} points`);
    return data;
  } catch (err) {
    console.error(`[UMAP] Fit failed:`, err.message || err);
    return null;
  }
}

/**
 * Project new embeddings using the cached fitted UMAP model.
 * @param {number[][]} embeddings
 * @returns {{ points: {x: number, y: number}[] } | null}
 */
export async function getUmapTransform(embeddings) {
  if (!(await ensureSidecar())) return null;

  try {
    const res = await fetch(`${EMBED_URL}/umap-transform`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeddings }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
