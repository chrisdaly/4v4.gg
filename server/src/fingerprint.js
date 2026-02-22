/**
 * Server-side Player Fingerprinting
 *
 * Fingerprint segments:
 *   action (6d)      — action type distribution
 *   apm (3d)         — mean APM, variability, burstiness
 *   hotkey (20d)     — group select/assign distribution
 *   tempo (7d)       — inter-action time delta histogram
 *   intensity (2d)   — hotkey actions per minute (select + assign rate)
 *   transitions (10d) — top-10 normalized hotkey group transition frequencies
 *   rhythm (15d)     — subconscious micro-routines: trigram patterns, oscillation, cycle lengths
 */

const ACTION_KEYS = [
  'rightclick', 'ability', 'buildtrain', 'item', 'selecthotkey', 'assigngroup',
];

const WEIGHTS = { action: 1.0, apm: 2.0, hotkey: 3.0, tempo: 2.0, intensity: 3.0, transitions: 4.0, rhythm: 4.0 };

// Skip first 2 minutes of action sequences (build order, not player signature)
const EARLY_GAME_CUTOFF_MS = 2 * 60 * 1000; // 120,000 ms

// ── Segment Extractors ──────────────────────────────

export function extractActionDistribution(actions) {
  const counts = ACTION_KEYS.map(k => actions[k] || 0);
  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0) return counts.map(() => 0);
  return counts.map(c => c / total);
}

export function extractApmProfile(timedSegments) {
  if (!timedSegments || timedSegments.length === 0) return [0, 0, 0];
  const n = timedSegments.length;
  const mean = timedSegments.reduce((a, b) => a + b, 0) / n;
  const variance = timedSegments.reduce((sum, v) => sum + (v - mean) ** 2, 0) / n;
  const stddev = Math.sqrt(variance);
  const peak = Math.max(...timedSegments);
  return [
    mean / 300,
    stddev / 100,
    mean > 0 ? peak / mean - 1 : 0,
  ];
}

export function extractHotkeyProfile(groupHotkeys) {
  if (!groupHotkeys) return Array(20).fill(0);
  const used = [];
  const assigned = [];
  for (let i = 0; i <= 9; i++) {
    const g = groupHotkeys[String(i)] || {};
    used.push(g.used || 0);
    assigned.push(g.assigned || 0);
  }
  const totalUsed = used.reduce((a, b) => a + b, 0);
  const totalAssigned = assigned.reduce((a, b) => a + b, 0);
  return [
    ...(totalUsed === 0 ? used.map(() => 0) : used.map(u => u / totalUsed)),
    ...(totalAssigned === 0 ? assigned.map(() => 0) : assigned.map(a => a / totalAssigned)),
  ];
}

// ── New Segment Extractors ─────────────────────────────

/**
 * Extract inter-action tempo histogram from full_action_sequence.
 * 7 buckets: <50ms, 50-100, 100-200, 200-500, 500-1000, 1000-2000, 2000+
 * Returns normalized distribution (sums to 1).
 */
export function extractTempoProfile(fullActionSequence) {
  if (!fullActionSequence || fullActionSequence.length < 2) return Array(7).fill(0);
  // Filter out early game actions (first 2 min is build order, not player signature)
  const filtered = fullActionSequence.filter(a => a.ms >= EARLY_GAME_CUTOFF_MS);
  if (filtered.length < 2) return Array(7).fill(0);
  const bins = Array(7).fill(0);
  let total = 0;
  for (let i = 1; i < filtered.length; i++) {
    const delta = filtered[i].ms - filtered[i - 1].ms;
    if (delta < 0) continue;
    total++;
    if (delta < 50) bins[0]++;
    else if (delta < 100) bins[1]++;
    else if (delta < 200) bins[2]++;
    else if (delta < 500) bins[3]++;
    else if (delta < 1000) bins[4]++;
    else if (delta < 2000) bins[5]++;
    else bins[6]++;
  }
  return total > 0 ? bins.map(b => b / total) : bins;
}

/**
 * Extract hotkey intensity: actions per minute for select and assign hotkeys.
 * Normalized by game duration to make it comparable.
 */
export function extractHotkeyIntensity(actionRow) {
  const selectRate = (actionRow.selecthotkey || 0);
  const assignRate = (actionRow.assigngroup || 0);
  const totalActions = ACTION_KEYS.reduce((sum, k) => sum + (actionRow[k] || 0), 0);
  if (totalActions === 0) return [0, 0];
  // Proportion of all actions that are hotkey-related (not normalized by time)
  return [selectRate / totalActions, assignRate / totalActions];
}

/**
 * Extract hotkey transition profile from full_action_sequence.
 * Tracks top group transitions (e.g. 1→2, 4→6) as a 10-bucket distribution.
 * Uses canonical pair encoding: 10 groups × 10 groups = 100 possible transitions,
 * but we extract top-10 by frequency and normalize.
 */
export function extractTransitionProfile(fullActionSequence) {
  if (!fullActionSequence || fullActionSequence.length < 2) return Array(10).fill(0);
  // Filter out early game actions (first 2 min is build order, not player signature)
  const filtered = fullActionSequence.filter(a => a.ms >= EARLY_GAME_CUTOFF_MS);
  if (filtered.length < 2) return Array(10).fill(0);

  // Count group transitions
  const counts = {};
  let lastGroup = null;
  let total = 0;
  for (const a of filtered) {
    if ((a.id === 0x17 || a.id === 0x18 || a.id === 23 || a.id === 24) && a.g != null) {
      if (lastGroup !== null && lastGroup !== a.g) {
        const key = lastGroup * 10 + a.g; // canonical pair encoding (0-99)
        counts[key] = (counts[key] || 0) + 1;
        total++;
      }
      lastGroup = a.g;
    }
  }

  if (total === 0) return Array(10).fill(0);

  // Get top 10 transitions, sorted by frequency
  const sorted = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // Normalize: each bucket = proportion of total transitions
  const profile = Array(10).fill(0);
  for (let i = 0; i < sorted.length; i++) {
    profile[i] = sorted[i][1] / total;
  }
  return profile;
}

/**
 * Extract rhythm profile from full_action_sequence.
 * Captures subconscious micro-routines: repeating hotkey group patterns.
 *
 * 15 dimensions:
 *   [0-9]   top-5 trigram frequencies (each trigram = 2 values: encoded key + normalized freq)
 *   [10]    oscillation score — proportion of A→B→A patterns among all trigrams
 *   [11-14] cycle length distribution — how many actions before returning to same group
 *           buckets: 2-3 (tight), 4-6 (medium), 7-12 (wide), 13+ (rare)
 */
export function extractRhythmProfile(fullActionSequence) {
  const DIMS = 15;
  if (!fullActionSequence || fullActionSequence.length < 4) return Array(DIMS).fill(0);

  // Filter early game
  const filtered = fullActionSequence.filter(a => a.ms >= EARLY_GAME_CUTOFF_MS);
  if (filtered.length < 4) return Array(DIMS).fill(0);

  // Extract hotkey group sequence (only select/assign group actions)
  const groups = [];
  for (const a of filtered) {
    if ((a.id === 0x17 || a.id === 0x18 || a.id === 23 || a.id === 24) && a.g != null) {
      groups.push(a.g);
    }
  }
  if (groups.length < 3) return Array(DIMS).fill(0);

  // ── Trigrams ──
  const trigramCounts = {};
  let totalTrigrams = 0;
  for (let i = 0; i < groups.length - 2; i++) {
    const key = groups[i] * 100 + groups[i + 1] * 10 + groups[i + 2]; // 0-999
    trigramCounts[key] = (trigramCounts[key] || 0) + 1;
    totalTrigrams++;
  }
  if (totalTrigrams === 0) return Array(DIMS).fill(0);

  // Top 5 trigrams: each encoded as (key/999, freq/total) = 2 values × 5 = 10 dims
  const sorted = Object.entries(trigramCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const profile = Array(DIMS).fill(0);
  for (let i = 0; i < sorted.length; i++) {
    profile[i * 2] = parseInt(sorted[i][0]) / 999;       // normalized trigram key
    profile[i * 2 + 1] = sorted[i][1] / totalTrigrams;   // frequency proportion
  }

  // ── Oscillation score — A→B→A patterns ──
  let oscillations = 0;
  for (let i = 0; i < groups.length - 2; i++) {
    if (groups[i] === groups[i + 2] && groups[i] !== groups[i + 1]) {
      oscillations++;
    }
  }
  profile[10] = oscillations / totalTrigrams;

  // ── Cycle length distribution ──
  // How many actions until a player returns to the same group?
  const cycleBins = [0, 0, 0, 0]; // 2-3, 4-6, 7-12, 13+
  let totalCycles = 0;
  for (let i = 0; i < groups.length; i++) {
    for (let j = i + 1; j < groups.length; j++) {
      if (groups[j] === groups[i]) {
        const len = j - i;
        totalCycles++;
        if (len <= 3) cycleBins[0]++;
        else if (len <= 6) cycleBins[1]++;
        else if (len <= 12) cycleBins[2]++;
        else cycleBins[3]++;
        break; // only count first return
      }
    }
  }
  if (totalCycles > 0) {
    for (let i = 0; i < 4; i++) {
      profile[11 + i] = cycleBins[i] / totalCycles;
    }
  }

  return profile;
}

// ── Similarity Functions ────────────────────────────

export function cosineSegment(a, b) {
  if (a.length !== b.length) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

function l2Distance(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += (a[i] - b[i]) ** 2;
  }
  return Math.sqrt(sum);
}

export function apmSimilarity(a, b) {
  const dist = l2Distance(a, b);
  return Math.max(0, 1 - dist / 1.5);
}

export function intensitySimilarity(a, b) {
  const dist = l2Distance(a, b);
  return Math.max(0, 1 - dist / 0.5);
}

// ── Server-Specific Functions ───────────────────────

/**
 * Build fingerprint from an action row.
 * Input: object with action counts + JSON-parsed timed_segments, group_hotkeys, full_action_sequence.
 */
export function buildServerFingerprint(actionRow) {
  const actionSeg = extractActionDistribution(actionRow);
  const apmSeg = extractApmProfile(actionRow.timed_segments);
  const hotkeySeg = extractHotkeyProfile(actionRow.group_hotkeys);
  const tempoSeg = extractTempoProfile(actionRow.full_action_sequence);
  const intensitySeg = extractHotkeyIntensity(actionRow);
  const transitionSeg = extractTransitionProfile(actionRow.full_action_sequence);
  const rhythmSeg = extractRhythmProfile(actionRow.full_action_sequence);

  const vector = [
    ...actionSeg.map(v => v * WEIGHTS.action),
    ...apmSeg.map(v => v * WEIGHTS.apm),
    ...hotkeySeg.map(v => v * WEIGHTS.hotkey),
    ...tempoSeg.map(v => v * WEIGHTS.tempo),
    ...intensitySeg.map(v => v * WEIGHTS.intensity),
    ...transitionSeg.map(v => v * WEIGHTS.transitions),
    ...rhythmSeg.map(v => v * WEIGHTS.rhythm),
  ];

  return {
    vector,
    segments: {
      action: actionSeg,
      apm: apmSeg,
      hotkey: hotkeySeg,
      tempo: tempoSeg,
      intensity: intensitySeg,
      transitions: transitionSeg,
      rhythm: rhythmSeg,
    },
  };
}

/**
 * Compute similarity between two fingerprints (0-1).
 * Weighted mean across all segments.
 */
export function computeServerSimilarity(fpA, fpB) {
  const bd = computeServerBreakdown(fpA, fpB);

  const segments = [
    { score: bd.action, weight: WEIGHTS.action },
    { score: bd.apm, weight: WEIGHTS.apm },
    { score: bd.hotkey, weight: WEIGHTS.hotkey },
    { score: bd.tempo, weight: WEIGHTS.tempo },
    { score: bd.intensity, weight: WEIGHTS.intensity },
    { score: bd.transitions, weight: WEIGHTS.transitions },
    { score: bd.rhythm, weight: WEIGHTS.rhythm },
  ];

  // Only include segments that have data (non-null score)
  const active = segments.filter(s => s.score !== null && s.score > 0);
  if (active.length === 0) return 0;

  const totalWeight = active.reduce((sum, s) => sum + s.weight, 0);
  return active.reduce((sum, s) => sum + s.score * s.weight, 0) / totalWeight;
}

/**
 * Per-segment breakdown between two fingerprints.
 */
export function computeServerBreakdown(fpA, fpB) {
  const sa = fpA.segments;
  const sb = fpB.segments;
  return {
    action: cosineSegment(sa.action, sb.action),
    apm: apmSimilarity(sa.apm, sb.apm),
    hotkey: cosineSegment(sa.hotkey, sb.hotkey),
    tempo: (sa.tempo && sb.tempo) ? cosineSegment(sa.tempo, sb.tempo) : null,
    intensity: (sa.intensity && sb.intensity) ? intensitySimilarity(sa.intensity, sb.intensity) : null,
    transitions: (sa.transitions && sb.transitions) ? cosineSegment(sa.transitions, sb.transitions) : null,
    rhythm: (sa.rhythm && sb.rhythm) ? cosineSegment(sa.rhythm, sb.rhythm) : null,
  };
}

// ── Embedding Similarity ─────────────────────────────

/**
 * Cosine similarity between two embedding vectors (0-1).
 */
export function embeddingSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return null;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  if (denom === 0) return 0;
  // Clamp to [0,1] — orthogonal or opposite vectors = 0
  return Math.max(0, dot / denom);
}

/**
 * Compute hybrid similarity: weighted combination of handcrafted + neural embedding.
 * Falls back to handcrafted-only if embeddings are unavailable.
 */
export function computeHybridSimilarity(fpA, fpB, embA, embB) {
  const handcrafted = computeServerSimilarity(fpA, fpB);
  const embSim = embeddingSimilarity(embA, embB);

  if (embSim === null) {
    return { similarity: handcrafted, handcrafted, embedding: null, hybrid: false };
  }

  // 50/50 blend
  const similarity = 0.5 * handcrafted + 0.5 * embSim;
  return { similarity, handcrafted, embedding: embSim, hybrid: true };
}

/**
 * Element-wise mean of multiple embedding vectors.
 */
export function averageEmbeddings(embeddings) {
  const valid = embeddings.filter(e => e && e.length > 0);
  if (valid.length === 0) return null;
  if (valid.length === 1) return valid[0];

  const dim = valid[0].length;
  const avg = Array(dim).fill(0);
  for (const emb of valid) {
    for (let i = 0; i < dim; i++) avg[i] += emb[i];
  }
  for (let i = 0; i < dim; i++) avg[i] /= valid.length;
  return avg;
}

/**
 * Element-wise mean of multiple fingerprints.
 * Returns { vector, segments } with averaged values.
 */
export function averageFingerprints(fps) {
  if (fps.length === 0) return null;
  if (fps.length === 1) return fps[0];

  const n = fps.length;
  const vecLen = fps[0].vector.length;
  const avgVector = Array(vecLen).fill(0);
  const avgAction = Array(6).fill(0);
  const avgApm = Array(3).fill(0);
  const avgHotkey = Array(20).fill(0);
  const avgTempo = Array(7).fill(0);
  const avgIntensity = Array(2).fill(0);
  const avgTransitions = Array(10).fill(0);
  const avgRhythm = Array(15).fill(0);

  for (const fp of fps) {
    for (let i = 0; i < vecLen; i++) avgVector[i] += fp.vector[i];
    for (let i = 0; i < 6; i++) avgAction[i] += (fp.segments.action?.[i] || 0);
    for (let i = 0; i < 3; i++) avgApm[i] += (fp.segments.apm?.[i] || 0);
    for (let i = 0; i < 20; i++) avgHotkey[i] += (fp.segments.hotkey?.[i] || 0);
    for (let i = 0; i < 7; i++) avgTempo[i] += (fp.segments.tempo?.[i] || 0);
    for (let i = 0; i < 2; i++) avgIntensity[i] += (fp.segments.intensity?.[i] || 0);
    for (let i = 0; i < 10; i++) avgTransitions[i] += (fp.segments.transitions?.[i] || 0);
    for (let i = 0; i < 15; i++) avgRhythm[i] += (fp.segments.rhythm?.[i] || 0);
  }

  for (let i = 0; i < vecLen; i++) avgVector[i] /= n;
  for (let i = 0; i < 6; i++) avgAction[i] /= n;
  for (let i = 0; i < 3; i++) avgApm[i] /= n;
  for (let i = 0; i < 20; i++) avgHotkey[i] /= n;
  for (let i = 0; i < 7; i++) avgTempo[i] /= n;
  for (let i = 0; i < 2; i++) avgIntensity[i] /= n;
  for (let i = 0; i < 10; i++) avgTransitions[i] /= n;
  for (let i = 0; i < 15; i++) avgRhythm[i] /= n;

  return {
    vector: avgVector,
    segments: {
      action: avgAction,
      apm: avgApm,
      hotkey: avgHotkey,
      tempo: avgTempo,
      intensity: avgIntensity,
      transitions: avgTransitions,
      rhythm: avgRhythm,
    },
  };
}

/**
 * Compute confidence score for a player's fingerprint based on replay count.
 * Linear ramp: 0 replays = 0, 10+ replays = 1.0.
 * Optionally measures self-consistency (pairwise similarity within player's own replays).
 */
export function computeConfidence(fingerprints) {
  const count = fingerprints.length;
  if (count === 0) return { confidence: 0, replayCount: 0, selfConsistency: null };

  const replayConfidence = Math.min(1.0, count / 10);

  // Self-consistency: average pairwise similarity within the player's own replays
  let selfConsistency = null;
  if (count >= 2) {
    const scores = [];
    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        scores.push(computeServerSimilarity(fingerprints[i], fingerprints[j]));
      }
    }
    selfConsistency = scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  return {
    confidence: Math.round(replayConfidence * 1000) / 1000,
    replayCount: count,
    selfConsistency: selfConsistency !== null ? Math.round(selfConsistency * 1000) / 1000 : null,
  };
}
