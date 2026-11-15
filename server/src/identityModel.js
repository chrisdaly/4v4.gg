/**
 * Whitened identity model: the same per-game fingerprint segments as
 * fingerprint.js, re-weighted by how stable each habit is within one player.
 *
 * The handcrafted score treats every dimension as equally telling. This model
 * was fitted on labelled games (ml/identity/) to learn, for each habit, how
 * much one player varies from game to game, and scales that variation away.
 * A habit a player keeps in every game then counts for a lot; one that drifts
 * with the map or the match counts for little.
 *
 * On the Nov 2026 data (ml/identity/RESULTS.md) it ranks the right account
 * first for 78% of hidden half-accounts, against 51% for the handcrafted score.
 */

const SEGMENT_KEYS = ['action', 'apm', 'hotkey', 'tempo', 'intensity', 'transitions', 'rhythm'];

/**
 * @param {object} model - parsed identity-model JSON (see ml/identity/fit_export.py)
 */
export function createIdentityModel(model) {
  const dims = model.segments.map(s => s.dims);
  const names = model.segments.map(s => s.name);
  const offsets = [];
  let total = 0;
  for (const d of dims) { offsets.push(total); total += d; }

  const sqrt = new Set(model.sqrtSegments);
  const sequence = new Set(model.sequenceSegments);
  const keep = model.keep;
  const mean = model.mean;
  const W = model.whiten;
  const k = keep.length;

  /**
   * One game's segments -> centred feature vector (length k) with missing
   * entries set to 0, plus a 0/1 mask saying which entries were observed.
   */
  function gameVector(segments) {
    const full = new Float64Array(total);
    const observed = new Uint8Array(total).fill(1);
    for (let s = 0; s < names.length; s++) {
      const seg = segments[names[s]];
      const off = offsets[s];
      let any = false;
      if (seg && seg.length === dims[s]) {
        for (let i = 0; i < dims[s]; i++) {
          const v = Number(seg[i]) || 0;
          if (v !== 0) any = true;
          full[off + i] = sqrt.has(names[s]) ? Math.sqrt(Math.max(v, 0)) : v;
        }
      }
      if (sequence.has(names[s]) && !any) {
        for (let i = 0; i < dims[s]; i++) observed[off + i] = 0;
      }
    }
    const z = new Float64Array(k);
    const m = new Uint8Array(k);
    for (let j = 0; j < k; j++) {
      const i = keep[j];
      m[j] = observed[i];
      z[j] = observed[i] ? full[i] - mean[j] : 0;
    }
    return { z, m };
  }

  /**
   * An account's embedding from its games' segments. Missing entries count as
   * the population mean, which is what the model was fitted with.
   * @param {Array<object>} games - each { action, apm, hotkey, tempo, intensity, transitions, rhythm }
   * @returns {Float64Array|null}
   */
  function embed(games) {
    if (!games || games.length === 0) return null;
    const avg = new Float64Array(k);
    for (const segments of games) {
      const { z } = gameVector(segments);
      for (let j = 0; j < k; j++) avg[j] += z[j];
    }
    for (let j = 0; j < k; j++) avg[j] /= games.length;

    const out = new Float64Array(k);
    for (let c = 0; c < k; c++) {
      let sum = 0;
      for (let r = 0; r < k; r++) sum += avg[r] * W[r][c];
      out[c] = sum;
    }
    return out;
  }

  return { embed, dims: k, segmentKeys: SEGMENT_KEYS };
}

/** Cosine similarity between two embeddings from embed(). */
export function identitySimilarity(a, b) {
  if (!a || !b) return null;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}
