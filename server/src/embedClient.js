/**
 * Client for the Python embed sidecar.
 * Tokenizes action sequences and calls POST /embed to get 128-dim embeddings.
 */

import config from './config.js';
import { tokenize } from '../ml/tokenizer.js';

const EMBED_URL = config.EMBED_URL;

let sidecarAvailable = null; // null = unknown, true/false after first check

/**
 * Check if the embed sidecar is running.
 */
export async function checkSidecar() {
  try {
    const res = await fetch(`${EMBED_URL}/health`, { signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      const data = await res.json();
      sidecarAvailable = data.model_loaded === true;
      return sidecarAvailable;
    }
  } catch {
    sidecarAvailable = false;
  }
  return false;
}

/**
 * Get embedding for a single action sequence.
 * @param {Array} actions - Raw action sequence [{ms, id, g?}, ...]
 * @returns {number[]|null} 128-dim embedding or null if sidecar unavailable
 */
export async function getEmbedding(actions) {
  if (sidecarAvailable === false) return null;
  if (sidecarAvailable === null) {
    await checkSidecar();
    if (!sidecarAvailable) return null;
  }

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
 * Get embeddings for multiple action sequences in one call.
 * @param {Array<Array>} actionSequences - Array of raw action sequences
 * @returns {Array<number[]|null>} Array of embeddings (null for failed ones)
 */
export async function getEmbeddingBatch(actionSequences) {
  if (sidecarAvailable === false) return actionSequences.map(() => null);
  if (sidecarAvailable === null) {
    await checkSidecar();
    if (!sidecarAvailable) return actionSequences.map(() => null);
  }

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
