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

import { readFileSync } from 'fs';

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

/**
 * Similarity between two embeddings from embed(), 0 to 1. Anything at or
 * below orthogonal is 0: "no resemblance" is all a caller needs to know.
 */
export function identitySimilarity(a, b) {
  if (!a || !b) return null;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : Math.max(0, dot / denom);
}

// ── Verdict ─────────────────────────────────────────
// The raw similarity ranks candidates well but is a poor basis for a verdict:
// some accounts (default hotkeys, few habits) resemble hundreds of others at
// 0.99. What separates a real match is how far it stands above the nearest
// strangers on BOTH sides, the query's and the candidate's. That is adaptive
// symmetric score normalisation; RESULTS.md has the comparison (32% of owners
// caught at the false-match rate where the raw score catches 4%).

// The 100 closest. Leaving the nearest few out, so that a player's other
// alternate accounts do not count as strangers, was tried and made verdicts
// worse on the hidden-half test (26% correctly flagged down to 16%). The cost
// of keeping them: someone with several indexed accounts gets a weaker verdict
// on each one, though the accounts still rank at the top.
const COHORT_SIZE = 100;

/** Mean and standard deviation of the nearest strangers among `values`. */
function nearestStrangers(values) {
  values.sort((a, b) => b - a);
  const top = values.slice(0, COHORT_SIZE);
  if (top.length < 10) return null;
  let sum = 0;
  for (const v of top) sum += v;
  const mean = sum / top.length;
  let sq = 0;
  for (const v of top) sq += (v - mean) ** 2;
  return { mean, std: Math.sqrt(sq / top.length) + 1e-9 };
}

/**
 * Score a query against a pool of accounts.
 * @param {Float64Array} query - the query's embedding
 * @param {Array<Float64Array|null>} pool - candidate embeddings
 * @param {Set<number>} [skip] - pool indices to ignore (the query itself, when it is in the pool)
 * @returns {{ scores: Float64Array, order: number[] }} similarity per pool index (NaN = skipped) and indices best first
 */
export function scorePool(query, pool, skip = null) {
  const scores = new Float64Array(pool.length).fill(NaN);
  const order = [];
  for (let i = 0; i < pool.length; i++) {
    if ((skip && skip.has(i)) || !pool[i]) continue;
    scores[i] = identitySimilarity(query, pool[i]);
    order.push(i);
  }
  order.sort((a, b) => scores[b] - scores[a]);
  return { scores, order };
}

/**
 * How far one candidate stands out, in standard deviations above the nearest
 * strangers, averaged over the query's side and the candidate's side.
 * @param {number} candidate - pool index of the candidate
 * @param {Float64Array} scores - from scorePool for this query
 * @param {Array<Float64Array|null>} pool
 * @param {Set<number>} [skip] - same set passed to scorePool
 */
export function standout(candidate, scores, pool, skip = null) {
  const s = scores[candidate];
  const querySide = [];
  for (let i = 0; i < scores.length; i++) {
    if (i !== candidate && !Number.isNaN(scores[i])) querySide.push(scores[i]);
  }
  const candidateSide = [];
  for (let i = 0; i < pool.length; i++) {
    if (i === candidate || (skip && skip.has(i)) || !pool[i]) continue;
    candidateSide.push(identitySimilarity(pool[candidate], pool[i]));
  }
  const q = nearestStrangers(querySide);
  const c = nearestStrangers(candidateSide);
  if (!q || !c) return null;
  return 0.5 * ((s - q.mean) / q.std + (s - c.mean) / c.std);
}

/**
 * The reference distribution for a verdict: for a sample of accounts in the
 * pool, how far each one's own best match stands out. Most accounts have no
 * alternate account indexed, so this is what a best match looks like when it
 * is a stranger.
 * @returns {number[]} standout values, ascending
 */
export function bestMatchStandouts(pool, sampleIndices) {
  const out = [];
  for (const i of sampleIndices) {
    if (!pool[i]) continue;
    const skip = new Set([i]);
    const { scores, order } = scorePool(pool[i], pool, skip);
    if (order.length < 3) continue;
    const st = standout(order[0], scores, pool, skip);
    if (st != null) out.push(st);
  }
  return out.sort((a, b) => a - b);
}

/**
 * The pairs most likely to be one person, across the whole pool. Each account
 * nominates its closest few matches; every nominated pair is then scored by
 * how far it stands out for both accounts. Ranking on the raw similarity
 * instead fills the list with generic low-game accounts that resemble
 * everyone.
 * @param {Array<Float64Array|number[]>} pool
 * @param {number} [perAccount] - nominations per account
 * @returns {Array<{i: number, j: number, similarity: number, standout: number}>} strongest first
 */
export function standoutPairs(pool, perAccount = 3) {
  const n = pool.length;
  const rows = new Array(n);
  for (let i = 0; i < n; i++) rows[i] = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const s = identitySimilarity(pool[i], pool[j]) ?? 0;
      rows[i][j] = s;
      rows[j][i] = s;
    }
  }

  // Per account: its matches best first (self excluded)
  const ranked = rows.map((row, i) => {
    const idx = [];
    for (let j = 0; j < n; j++) if (j !== i) idx.push(j);
    // Only the head is ever read: the nominations plus one comparison group
    return idx.sort((a, b) => row[b] - row[a]).slice(0, COHORT_SIZE + perAccount + 1);
  });

  /** Nearest strangers of `i`, leaving out its partner in the pair being scored. */
  function strangers(i, partner) {
    const values = [];
    for (const j of ranked[i]) {
      if (j === partner) continue;
      values.push(rows[i][j]);
      if (values.length >= COHORT_SIZE) break;
    }
    return nearestStrangers(values);
  }

  const seen = new Set();
  const pairs = [];
  for (let i = 0; i < n; i++) {
    for (const j of ranked[i].slice(0, perAccount)) {
      const a = Math.min(i, j), b = Math.max(i, j);
      const key = a * n + b;
      if (seen.has(key)) continue;
      seen.add(key);
      const sa = strangers(a, b), sb = strangers(b, a);
      if (!sa || !sb) continue;
      const similarity = rows[a][b];
      pairs.push({
        i: a, j: b, similarity,
        standout: 0.5 * ((similarity - sa.mean) / sa.std + (similarity - sb.mean) / sb.std),
      });
    }
  }
  return pairs.sort((x, y) => y.standout - x.standout);
}

/** Share (0-1) of reference best matches that stand out at least this much. */
export function rarity(value, reference) {
  if (value == null || !reference || reference.length === 0) return null;
  let lo = 0, hi = reference.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (reference[mid] < value) lo = mid + 1;
    else hi = mid;
  }
  return (reference.length - lo) / reference.length;
}

// At most this share of accounts have a best match that stands out as much.
export const CONFIDENT_RARITY = 0.01;
export const POSSIBLE_RARITY = 0.05;

export function verdictFor(rarityValue) {
  if (rarityValue == null) return 'no_match';
  if (rarityValue <= CONFIDENT_RARITY) return 'confident';
  if (rarityValue <= POSSIBLE_RARITY) return 'possible';
  return 'no_match';
}

/** The fitted model that ships with the relay. */
export const identity = createIdentityModel(
  JSON.parse(readFileSync(new URL('./identity-model.json', import.meta.url), 'utf8'))
);
