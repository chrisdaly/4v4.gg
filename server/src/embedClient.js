/**
 * Client for the Python embed sidecar.
 * Tokenizes action sequences and calls POST /embed to get 128-dim embeddings.
 */

import config from './config.js';
import { tokenize } from '../ml/tokenizer.js';

const EMBED_URL = config.EMBED_URL;

let sidecarAvailable = null; // null = unknown, true/false after first check
let lastSidecarCheck = 0;
const SIDECAR_RECHECK_MS = 30000; // re-check every 30s if unavailable

/**
 * Check if the embed sidecar is running.
 */
export async function checkSidecar() {
  try {
    const res = await fetch(`${EMBED_URL}/health`, { signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      const data = await res.json();
      sidecarAvailable = data.model_loaded === true;
      lastSidecarCheck = Date.now();
      return sidecarAvailable;
    }
  } catch {
    sidecarAvailable = false;
    lastSidecarCheck = Date.now();
  }
  return false;
}

/**
 * Ensure sidecar is available, re-checking periodically if previously unavailable.
 */
async function ensureSidecar() {
  if (sidecarAvailable === true) return true;
  if (sidecarAvailable === false && (Date.now() - lastSidecarCheck) < SIDECAR_RECHECK_MS) return false;
  return checkSidecar();
}

/**
 * Get embedding for a single action sequence.
 * @param {Array} actions - Raw action sequence [{ms, id, g?}, ...]
 * @returns {number[]|null} 128-dim embedding or null if sidecar unavailable
 */
export async function getEmbedding(actions) {
  if (!(await ensureSidecar())) return null;

  const tokens = tokenize(actions);
  if (tokens.length < 5) return null;

  try {
    const res = await fetch(`${EMBED_URL}/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokens }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.embedding || null;
  } catch {
    return null;
  }
}

/**
 * Fit UMAP on a matrix of embeddings and return 2D projections.
 * @param {number[][]} embeddings - Array of 128-dim embeddings
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
    console.log(`[UMAP] Fit complete in ${((Date.now() - start) / 1000).toFixed(1)}s — ${data.points?.length} points`);
    return data;
  } catch (err) {
    console.error(`[UMAP] Fit failed:`, err.message || err);
    return null;
  }
}

/**
 * Project new embeddings using the cached fitted UMAP model.
 * @param {number[][]} embeddings - Array of 128-dim embeddings
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

/**
 * Get embeddings for multiple action sequences in one call.
 * @param {Array<Array>} actionSequences - Array of raw action sequences
 * @returns {Array<number[]|null>} Array of embeddings (null for failed ones)
 */
export async function getEmbeddingBatch(actionSequences) {
  if (!(await ensureSidecar())) return actionSequences.map(() => null);

  const tokenized = actionSequences.map(actions => tokenize(actions));
  const valid = tokenized.map(t => t.length >= 5);

  // Only send valid sequences
  const validTokens = tokenized.filter((_, i) => valid[i]);
  if (validTokens.length === 0) return actionSequences.map(() => null);

  try {
    const res = await fetch(`${EMBED_URL}/embed-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sequences: validTokens }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return actionSequences.map(() => null);
    const data = await res.json();
    const embeddings = data.embeddings || [];

    // Map back to original indices
    const result = [];
    let embIdx = 0;
    for (let i = 0; i < actionSequences.length; i++) {
      if (valid[i] && embIdx < embeddings.length) {
        result.push(embeddings[embIdx++]);
      } else {
        result.push(null);
      }
    }
    return result;
  } catch {
    return actionSequences.map(() => null);
  }
}
