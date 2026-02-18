/**
 * Replay Lab — Player Identity Fingerprinting
 *
 * Pure functions for extracting behavioral fingerprints from replay action data
 * and computing cross-replay player similarity.
 *
 * Similarity is computed per-segment then combined via weighted arithmetic mean.
 * Segments with zero signal are excluded so missing data doesn't drag scores.
 *
 * Segments:
 *   Action distribution (6 dims, weight 1.0) — playstyle ratios
 *   APM profile (3 dims, weight 1.5) — speed + burstiness (L2 distance)
 *   Hotkey profile (20 dims, weight 5.0) — muscle memory (used + assigned)
 *   Early-game n-grams (20 dims, weight 1.0) — opening habits
 */

// ── Action Distribution (6 dims) ────────────────────

const ACTION_KEYS = [
  "rightclick",
  "ability",
  "buildtrain",
  "item",
  "selecthotkey",
  "assigngroup",
];

export function extractActionDistribution(actions) {
  const counts = ACTION_KEYS.map((k) => actions[k] || 0);
  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0) return counts.map(() => 0);
  return counts.map((c) => c / total);
}

// ── APM Profile (3 dims) ────────────────────────────

export function extractApmProfile(timedSegments) {
  if (!timedSegments || timedSegments.length === 0) return [0, 0, 0];
  const n = timedSegments.length;
  const mean = timedSegments.reduce((a, b) => a + b, 0) / n;
  const variance =
    timedSegments.reduce((sum, v) => sum + (v - mean) ** 2, 0) / n;
  const stddev = Math.sqrt(variance);
  const peak = Math.max(...timedSegments);
  return [
    mean / 300, // normalized mean
    stddev / 100, // normalized stddev
    mean > 0 ? peak / mean - 1 : 0, // burstiness
  ];
}

// ── Hotkey Profile (20 dims: 10 used + 10 assigned) ─

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
    ...(totalUsed === 0 ? used.map(() => 0) : used.map((u) => u / totalUsed)),
    ...(totalAssigned === 0 ? assigned.map(() => 0) : assigned.map((a) => a / totalAssigned)),
  ];
}

// ── Early-Game N-Grams (20 dims) ────────────────────

export function computeBigramBasis(allSequences) {
  // Count bigram frequencies across all players
  const counts = {};
  for (const seq of allSequences) {
    if (!seq || seq.length < 2) continue;
    for (let i = 0; i < seq.length - 1; i++) {
      const key = `${seq[i].group}${seq[i].type}-${seq[i + 1].group}${seq[i + 1].type}`;
      counts[key] = (counts[key] || 0) + 1;
    }
  }
  // Return top 20 bigram keys sorted by frequency
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([key]) => key);
}

export function extractNgramSignature(sequence, bigramKeys) {
  if (!sequence || sequence.length < 2 || !bigramKeys.length) {
    return Array(20).fill(0);
  }
  const counts = {};
  for (let i = 0; i < sequence.length - 1; i++) {
    const key = `${sequence[i].group}${sequence[i].type}-${sequence[i + 1].group}${sequence[i + 1].type}`;
    counts[key] = (counts[key] || 0) + 1;
  }
  const total = sequence.length - 1;
  const vec = bigramKeys.map((k) => (counts[k] || 0) / total);
  // Pad to 20 if fewer basis keys
  while (vec.length < 20) vec.push(0);
  return vec;
}

// ── Fingerprint Builder ─────────────────────────────

// Weights tuned for cross-game identity detection:
// Control groups are the strongest identity signal (muscle memory doesn't change)
// APM shape is secondary, action mix and n-grams are supporting evidence
const WEIGHTS = {
  action: 1.0,
  apm: 1.5,
  hotkey: 5.0,
  ngram: 1.0,
};

export function buildFingerprint(actions, bigramKeys) {
  const actionDist = extractActionDistribution(actions);
  const apmProfile = extractApmProfile(actions.timed_segments);
  const hotkeyProfile = extractHotkeyProfile(actions.group_hotkeys);
  const ngramSig = extractNgramSignature(
    actions.early_game_sequence,
    bigramKeys
  );

  // Keep the concatenated vector for consistency score
  const vector = [
    ...actionDist.map((v) => v * WEIGHTS.action),
    ...apmProfile.map((v) => v * WEIGHTS.apm),
    ...hotkeyProfile.map((v) => v * WEIGHTS.hotkey),
    ...ngramSig.map((v) => v * WEIGHTS.ngram),
  ];

  return {
    vector,
    raw: { actionDist, apmProfile, hotkeyProfile, ngramSig },
  };
}

// ── Per-Segment Similarity Functions ────────────────

function cosineSegment(a, b) {
  if (a.length !== b.length) return 0;
  let dot = 0,
    magA = 0,
    magB = 0;
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

// L2-based similarity for APM profile (magnitude matters, not just direction)
function apmSimilarity(a, b) {
  // Max possible L2 distance for 3 normalized APM dims is ~sqrt(3) ≈ 1.73
  const dist = l2Distance(a, b);
  return Math.max(0, 1 - dist / 1.5);
}

// ── Combined Similarity (per-segment weighted arithmetic mean) ─

export function computeBreakdown(fpA, fpB) {
  return {
    action: cosineSegment(fpA.raw.actionDist, fpB.raw.actionDist),
    apm: apmSimilarity(fpA.raw.apmProfile, fpB.raw.apmProfile),
    hotkey: cosineSegment(fpA.raw.hotkeyProfile, fpB.raw.hotkeyProfile),
    ngram: cosineSegment(fpA.raw.ngramSig, fpB.raw.ngramSig),
  };
}

function combinedSimilarity(fpA, fpB, sameRace) {
  const bd = computeBreakdown(fpA, fpB);

  // Only include segments that have actual signal — if both players have
  // zero data for a segment (e.g. no early-game sequence → ngram 0%),
  // exclude it so it doesn't drag the score down as dead weight.
  const segments = [
    { score: bd.action, weight: WEIGHTS.action },
    { score: bd.apm, weight: WEIGHTS.apm },
    { score: bd.hotkey, weight: WEIGHTS.hotkey },
    { score: bd.ngram, weight: WEIGHTS.ngram },
  ];
  const active = segments.filter((s) => s.score > 0);
  if (active.length === 0) return 0;

  const totalWeight = active.reduce((sum, s) => sum + s.weight, 0);
  let sim = active.reduce((sum, s) => sum + s.score * s.weight, 0) / totalWeight;

  // Race bonus
  if (sameRace) sim = Math.min(1.0, sim + 0.03);

  return sim;
}

// ── Public Similarity API ───────────────────────────

export function cosineSimilarity(a, b) {
  return cosineSegment(a, b);
}

export function playerSimilarity(playerA, playerB) {
  const sameRace = playerA.race && playerA.race === playerB.race;
  return combinedSimilarity(playerA.fingerprint, playerB.fingerprint, sameRace);
}

export function computeSimilarityMatrix(players) {
  const n = players.length;
  const matrix = Array.from({ length: n }, () => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    matrix[i][i] = 1;
    for (let j = i + 1; j < n; j++) {
      const sim = playerSimilarity(players[i], players[j]);
      matrix[i][j] = sim;
      matrix[j][i] = sim;
    }
  }
  return matrix;
}

export function findSuggestedMatches(players, threshold = 0.60) {
  const matches = [];
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      // Skip same-replay pairs
      if (players[i].replayId === players[j].replayId) continue;

      const sim = playerSimilarity(players[i], players[j]);
      if (sim >= threshold) {
        matches.push({
          uidA: players[i].uid,
          uidB: players[j].uid,
          playerA: players[i],
          playerB: players[j],
          similarity: sim,
          breakdown: computeBreakdown(
            players[i].fingerprint,
            players[j].fingerprint
          ),
        });
      }
    }
  }
  return matches.sort((a, b) => b.similarity - a.similarity);
}

// ── Consistency Score ───────────────────────────────

export function consistencyScore(fingerprints) {
  if (fingerprints.length < 2) return 1;
  let total = 0,
    count = 0;
  for (let i = 0; i < fingerprints.length; i++) {
    for (let j = i + 1; j < fingerprints.length; j++) {
      total += cosineSimilarity(fingerprints[i].vector, fingerprints[j].vector);
      count++;
    }
  }
  return count > 0 ? total / count : 1;
}
