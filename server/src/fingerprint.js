/**
 * Server-side Player Fingerprinting
 *
 * Pure functions ported from client src/lib/fingerprint.js
 * 29-dimensional fingerprint: action (6d) + APM (3d) + hotkey (20d)
 * N-grams dropped (corpus-dependent basis changes as replays are added)
 */

const ACTION_KEYS = [
  'rightclick', 'ability', 'buildtrain', 'item', 'selecthotkey', 'assigngroup',
];

const WEIGHTS = { action: 1.0, apm: 1.5, hotkey: 5.0 };

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

// ── Server-Specific Functions ───────────────────────

/**
 * Build a 29-dimensional fingerprint from an action row.
 * Input: object with action counts + JSON-parsed timed_segments and group_hotkeys.
 */
export function buildServerFingerprint(actionRow) {
  const actionSeg = extractActionDistribution(actionRow);
  const apmSeg = extractApmProfile(actionRow.timed_segments);
  const hotkeySeg = extractHotkeyProfile(actionRow.group_hotkeys);

  const vector = [
    ...actionSeg.map(v => v * WEIGHTS.action),
    ...apmSeg.map(v => v * WEIGHTS.apm),
    ...hotkeySeg.map(v => v * WEIGHTS.hotkey),
  ];

  return {
    vector,
    segments: { action: actionSeg, apm: apmSeg, hotkey: hotkeySeg },
  };
}

/**
 * Compute similarity between two fingerprints (0-1).
 * 3-segment weighted mean: action (1.0), APM (1.5), hotkey (5.0).
 */
export function computeServerSimilarity(fpA, fpB, sameRace = false) {
  const bd = computeServerBreakdown(fpA, fpB);

  const segments = [
    { score: bd.action, weight: WEIGHTS.action },
    { score: bd.apm, weight: WEIGHTS.apm },
    { score: bd.hotkey, weight: WEIGHTS.hotkey },
  ];
  const active = segments.filter(s => s.score > 0);
  if (active.length === 0) return 0;

  const totalWeight = active.reduce((sum, s) => sum + s.weight, 0);
  let sim = active.reduce((sum, s) => sum + s.score * s.weight, 0) / totalWeight;

  if (sameRace) sim = Math.min(1.0, sim + 0.03);
  return sim;
}

/**
 * Per-segment breakdown between two fingerprints.
 */
export function computeServerBreakdown(fpA, fpB) {
  return {
    action: cosineSegment(fpA.segments.action, fpB.segments.action),
    apm: apmSimilarity(fpA.segments.apm, fpB.segments.apm),
    hotkey: cosineSegment(fpA.segments.hotkey, fpB.segments.hotkey),
  };
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

  for (const fp of fps) {
    for (let i = 0; i < vecLen; i++) avgVector[i] += fp.vector[i];
    for (let i = 0; i < 6; i++) avgAction[i] += fp.segments.action[i];
    for (let i = 0; i < 3; i++) avgApm[i] += fp.segments.apm[i];
    for (let i = 0; i < 20; i++) avgHotkey[i] += fp.segments.hotkey[i];
  }

  for (let i = 0; i < vecLen; i++) avgVector[i] /= n;
  for (let i = 0; i < 6; i++) avgAction[i] /= n;
  for (let i = 0; i < 3; i++) avgApm[i] /= n;
  for (let i = 0; i < 20; i++) avgHotkey[i] /= n;

  return {
    vector: avgVector,
    segments: { action: avgAction, apm: avgApm, hotkey: avgHotkey },
  };
}
