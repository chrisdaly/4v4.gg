/**
 * Offline evaluation of the smurf-detection scorers.
 *
 * The test needs no smurf labels. Every player with enough replays is split in
 * two by date: the older half stays under their name (the "known account"),
 * the newer half has its name hidden (the "probe"). Each scorer then ranks
 * every known account against each probe, and we count how often the true
 * owner comes first. Players with too few replays to split still sit in the
 * pool as distractors, the same as in production.
 *
 * It scores with the functions production uses (src/fingerprint.js), so the
 * numbers describe what /api/fingerprints/identify actually does.
 *
 * Usage (read-only; point it at a local copy of the relay database):
 *   node scripts/eval-identify.mjs --db /path/to/chat.db
 *   node scripts/eval-identify.mjs --db chat.db --min-replays 8 --max-probes 1000 --out eval.json
 */

import { writeFileSync } from 'fs';
import Database from 'better-sqlite3';
import {
  cosineSegment,
  computeServerSimilarity,
  embeddingSimilarity,
  computeHybridSimilarity,
  averageFingerprints,
  averageEmbeddings,
} from '../src/fingerprint.js';

// ── Arguments ───────────────────────────────────────

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const DB_PATH = arg('db', null);
const MIN_REPLAYS = Number(arg('min-replays', 8)); // needed to split a player in two
const MIN_GALLERY = Number(arg('min-gallery', 3)); // production's candidate floor
const MAX_PROBES = Number(arg('max-probes', 1000));
const SEED = Number(arg('seed', 12345));
const OUT = arg('out', null);
const PROBE_SIZES = [1, 3, 5, 10]; // games in the hidden half, for the "how many games" curve
const FPR_TARGETS = [0.01, 0.05];

if (!DB_PATH) {
  console.error('Usage: node scripts/eval-identify.mjs --db /path/to/chat.db [--min-replays 8] [--max-probes 1000] [--out eval.json]');
  process.exit(1);
}

// ── Scorers ─────────────────────────────────────────
// Each takes two entities { fp, emb } and returns a similarity, or null when
// it cannot score the pair (the embedding scorer, when either side has none).

const seg = (e, k) => e.fp.segments[k];

function weightedCosine(a, b, keys) {
  let sum = 0, n = 0;
  for (const k of keys) {
    const sa = seg(a, k), sb = seg(b, k);
    // An all-zero segment means the replay had no usable action sequence, not
    // that the player has no habits, so the pair cannot be scored on it.
    if (!hasSignal(sa) || !hasSignal(sb)) continue;
    sum += cosineSegment(sa, sb);
    n++;
  }
  return n ? sum / n : null;
}

function hasSignal(v) {
  if (!v?.length) return false;
  for (const x of v) if (x) return true;
  return false;
}

const SCORERS = {
  hotkey: (a, b) => weightedCosine(a, b, ['hotkey']),
  transitions_rhythm: (a, b) => weightedCosine(a, b, ['transitions', 'rhythm']),
  handcrafted: (a, b) => computeServerSimilarity(a.fp, b.fp),
  embedding: (a, b) => embeddingSimilarity(a.emb, b.emb),
  hybrid: (a, b) => computeHybridSimilarity(a.fp, b.fp, a.emb, b.emb).similarity,
};
const SCORER_NAMES = Object.keys(SCORERS);

// ── Helpers ─────────────────────────────────────────

function lcg(seed) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}

function parse(json) {
  if (!json) return null;
  try { return JSON.parse(json); } catch { return null; }
}

function rowToGame(row) {
  return {
    replayId: row.replay_id,
    race: row.race || null,
    fp: {
      vector: parse(row.vector) || [],
      segments: {
        action: parse(row.action_seg) || [],
        apm: parse(row.apm_seg) || [],
        hotkey: parse(row.hotkey_seg) || [],
        tempo: parse(row.tempo_seg) || [],
        intensity: parse(row.intensity_seg) || [],
        transitions: parse(row.transitions_seg) || [],
        rhythm: parse(row.rhythm_seg) || [],
      },
    },
    emb: parse(row.embedding),
  };
}

function entity(games) {
  return {
    fp: averageFingerprints(games.map(g => g.fp)),
    emb: averageEmbeddings(games.map(g => g.emb)),
    n: games.length,
    race: majorityRace(games),
    replayIds: new Set(games.map(g => g.replayId)),
  };
}

function majorityRace(games) {
  const counts = new Map();
  for (const g of games) if (g.race) counts.set(g.race, (counts.get(g.race) || 0) + 1);
  let best = null, bestN = 0;
  for (const [race, n] of counts) if (n > bestN) { best = race; bestN = n; }
  return best;
}

const pct = (x) => (x == null || Number.isNaN(x) ? '   -  ' : `${(x * 100).toFixed(1).padStart(5)}%`);

// ── Load ────────────────────────────────────────────

const db = new Database(DB_PATH, { readonly: true, fileMustExist: true });

// Same identity rule as the tokenizer: bulk-imported replays have no
// battle_tag, only a "Name#1234" player_name.
const rows = db.prepare(`
  SELECT COALESCE(pf.battle_tag, pf.player_name) AS player_key,
         pf.replay_id, pf.race, pf.vector, pf.action_seg, pf.apm_seg, pf.hotkey_seg,
         pf.tempo_seg, pf.intensity_seg, pf.transitions_seg, pf.rhythm_seg, pf.embedding,
         COALESCE(r.match_date, r.uploaded_at) AS played_at
  FROM player_fingerprints pf
  JOIN replays r ON r.id = pf.replay_id
  ORDER BY player_key, played_at, pf.replay_id
`).iterate();

const gallery = [];   // every candidate account: { tag, fp, emb, n, race, replayIds }
const probes = [];    // hidden halves: { tag, ownerIdx, bySize: {k: entity}, full: entity }
const accounts = new Map(); // tag -> whole-account entity, for the real smurf pairs
let totalRows = 0, rowsWithEmbedding = 0, playersSeen = 0;

function flush(tag, games) {
  if (!tag || games.length === 0) return;
  playersSeen++;
  if (games.length >= MIN_GALLERY) accounts.set(tag, entity(games));

  if (games.length >= MIN_REPLAYS) {
    const cut = Math.floor(games.length / 2);
    const known = games.slice(0, cut);
    const hidden = games.slice(cut);
    const ownerIdx = gallery.push({ tag, ...entity(known) }) - 1;
    const bySize = {};
    for (const k of PROBE_SIZES) if (hidden.length >= k) bySize[k] = entity(hidden.slice(0, k));
    probes.push({ tag, ownerIdx, full: entity(hidden), bySize });
  } else if (games.length >= MIN_GALLERY) {
    gallery.push({ tag, ...entity(games) });
  }
}

let currentTag = null, currentGames = [];
for (const row of rows) {
  totalRows++;
  if (row.embedding) rowsWithEmbedding++;
  if (row.player_key !== currentTag) {
    flush(currentTag, currentGames);
    currentTag = row.player_key;
    currentGames = [];
  }
  currentGames.push(rowToGame(row));
}
flush(currentTag, currentGames);

if (probes.length < 20) {
  console.error(`Only ${probes.length} players have ${MIN_REPLAYS}+ replays. Not enough to evaluate; lower --min-replays or use a fuller database.`);
  process.exit(1);
}

// Seeded sample so reruns compare like with like
const rand = lcg(SEED);
const probeOrder = probes.map((_, i) => i);
for (let i = probeOrder.length - 1; i > 0; i--) {
  const j = Math.floor(rand() * (i + 1));
  [probeOrder[i], probeOrder[j]] = [probeOrder[j], probeOrder[i]];
}
const sampled = probeOrder.slice(0, MAX_PROBES).map(i => probes[i]);

console.log(`Database: ${DB_PATH}`);
console.log(`  ${totalRows} fingerprints (${rowsWithEmbedding} with an embedding) from ${playersSeen} players`);
console.log(`  ${gallery.length} candidate accounts (${MIN_GALLERY}+ replays), ${probes.length} splittable (${MIN_REPLAYS}+), ${sampled.length} probes evaluated\n`);

// ── Rank one probe against the gallery ──────────────

function sharesGame(probe, cand) {
  for (const id of probe.replayIds) if (cand.replayIds.has(id)) return true;
  return false;
}

/**
 * Returns, for one scorer: the owner's rank (1 = first), the owner's score,
 * the best score among everyone else (what the detector would report if the
 * owner were not indexed), and the owner's rank once anyone who appeared in
 * the same game as the probe is ruled out.
 */
function rankProbe(probeEntity, ownerIdx, score) {
  const ownerScore = score(probeEntity, gallery[ownerIdx]);
  if (ownerScore == null) return null;

  let better = 0, betterNoCoplay = 0, bestOther = -Infinity;
  for (let i = 0; i < gallery.length; i++) {
    if (i === ownerIdx) continue;
    const s = score(probeEntity, gallery[i]);
    if (s == null) continue;
    if (s > bestOther) bestOther = s;
    if (s > ownerScore) {
      better++;
      if (!sharesGame(probeEntity, gallery[i])) betterNoCoplay++;
    }
  }
  return { rank: better + 1, rankNoCoplay: betterNoCoplay + 1, ownerScore, bestOther };
}

// ── Main table: full hidden half ────────────────────

const results = { meta: {}, scorers: {}, byProbeSize: {}, byRace: {}, production: {}, realPairs: [] };
results.meta = {
  db: DB_PATH, minReplays: MIN_REPLAYS, minGallery: MIN_GALLERY, seed: SEED,
  fingerprints: totalRows, withEmbedding: rowsWithEmbedding, players: playersSeen,
  gallery: gallery.length, splittable: probes.length, probesEvaluated: sampled.length,
};

const perProbe = {}; // scorer -> [{ rank, rankNoCoplay, ownerScore, bestOther, sameRace }]
for (const name of SCORER_NAMES) {
  perProbe[name] = [];
  for (const p of sampled) {
    const r = rankProbe(p.full, p.ownerIdx, SCORERS[name]);
    if (!r) continue;
    const ownerRace = gallery[p.ownerIdx].race;
    r.sameRace = p.full.race && ownerRace ? p.full.race === ownerRace : null;
    perProbe[name].push(r);
  }
}

function summarise(list) {
  const n = list.length;
  if (!n) return { n: 0 };
  const frac = (f) => list.filter(f).length / n;
  return {
    n,
    rank1: frac(r => r.rank === 1),
    top5: frac(r => r.rank <= 5),
    mrr: list.reduce((s, r) => s + 1 / r.rank, 0) / n,
    rank1NoCoplay: frac(r => r.rankNoCoplay === 1),
  };
}

/**
 * Detection rate at a fixed false-alarm rate. The threshold is set on the best
 * non-owner score per probe, which is what the detector reports when the true
 * owner is not in the database. At that threshold, how many true owners are
 * both ranked first and above it?
 */
function detectionAtFpr(list, fpr) {
  if (!list.length) return null;
  const impostor = list.map(r => r.bestOther).sort((a, b) => b - a);
  const idx = Math.min(impostor.length - 1, Math.max(0, Math.floor(impostor.length * fpr)));
  const threshold = impostor[idx];
  const detected = list.filter(r => r.rank === 1 && r.ownerScore > threshold).length / list.length;
  return { threshold, detected };
}

console.log('Re-identification, full hidden half');
console.log('  scorer               probes  rank-1   top-5    MRR   rank-1 (same-game ruled out)   caught at 1% / 5% false alarms');
for (const name of SCORER_NAMES) {
  const s = summarise(perProbe[name]);
  const d = FPR_TARGETS.map(f => detectionAtFpr(perProbe[name], f));
  results.scorers[name] = { ...s, detectionAtFpr: Object.fromEntries(FPR_TARGETS.map((f, i) => [f, d[i]])) };
  console.log(
    `  ${name.padEnd(19)} ${String(s.n).padStart(6)}  ${pct(s.rank1)}  ${pct(s.top5)}  ${(s.mrr ?? 0).toFixed(3)}   ${pct(s.rank1NoCoplay)}` +
    `                        ${pct(d[0]?.detected)} / ${pct(d[1]?.detected)}`
  );
}

// ── Same race versus cross race ─────────────────────

console.log('\nRank-1 when the hidden half is the same race as the known half, versus a different race');
console.log('  scorer               same race (n)        cross race (n)');
for (const name of SCORER_NAMES) {
  const same = summarise(perProbe[name].filter(r => r.sameRace === true));
  const cross = summarise(perProbe[name].filter(r => r.sameRace === false));
  results.byRace[name] = { same, cross };
  console.log(`  ${name.padEnd(19)} ${pct(same.rank1)} (${String(same.n).padStart(4)})       ${pct(cross.rank1)} (${String(cross.n).padStart(4)})`);
}

// ── How many games does a verdict need? ─────────────

console.log('\nRank-1 by number of games in the hidden half');
console.log(`  scorer               ${PROBE_SIZES.map(k => `${k} game${k > 1 ? 's' : ' '}`.padStart(9)).join('  ')}`);
for (const name of SCORER_NAMES) {
  results.byProbeSize[name] = {};
  const cells = [];
  for (const k of PROBE_SIZES) {
    const list = [];
    for (const p of sampled) {
      if (!p.bySize[k]) continue;
      const r = rankProbe(p.bySize[k], p.ownerIdx, SCORERS[name]);
      if (r) list.push(r);
    }
    const s = summarise(list);
    results.byProbeSize[name][k] = s;
    cells.push(`${pct(s.rank1)}`.padStart(9));
  }
  console.log(`  ${name.padEnd(19)} ${cells.join('  ')}`);
}

// ── The production verdict rule ─────────────────────
// /identify calls the top match "confident" when its hybrid score clears the
// 99.5th percentile of scores between random pairs of players. Reproduce that
// threshold, then ask how often it fires when the owner is not in the pool.

{
  const sample = gallery.slice();
  const r2 = lcg(SEED);
  for (let i = sample.length - 1; i > 0; i--) {
    const j = Math.floor(r2() * (i + 1));
    [sample[i], sample[j]] = [sample[j], sample[i]];
  }
  const cal = sample.slice(0, 200);
  const pairScores = [];
  for (let i = 0; i < cal.length; i++) {
    for (let j = i + 1; j < cal.length; j++) pairScores.push(SCORERS.hybrid(cal[i], cal[j]));
  }
  pairScores.sort((a, b) => a - b);
  const at = (q) => pairScores[Math.min(pairScores.length - 1, Math.floor(pairScores.length * q))];
  const p995 = at(0.995), p97 = at(0.97);

  const list = perProbe.hybrid;
  const n = list.length || 1;
  const falseConfident = list.filter(r => r.bestOther >= p995).length / n;
  const falsePossible = list.filter(r => r.bestOther >= p97).length / n;
  const trueConfident = list.filter(r => r.rank === 1 && r.ownerScore >= p995).length / n;
  results.production = { p995, p97, falseConfident, falsePossible, trueConfident };

  console.log('\nThe verdict rule /identify uses today (hybrid score against the pairwise 99.5th percentile)');
  console.log(`  threshold: confident >= ${p995.toFixed(3)}, possible >= ${p97.toFixed(3)}`);
  console.log(`  owner in the pool:      "confident" and correct  ${pct(trueConfident)}`);
  console.log(`  owner NOT in the pool:  still says "confident"   ${pct(falseConfident)}   (every one of these is a false accusation)`);
  console.log(`                          says at least "possible" ${pct(falsePossible)}`);
}

// ── The replacement verdict rule ────────────────────
// Production cannot remove the true owner to measure false alarms, so it
// calibrates on what it can see: for a sample of accounts, the score of each
// one's best match against everyone else. A verdict then asks how unusual the
// top match is among best matches, not among random pairs. Check here that
// thresholds set that way deliver the false-alarm rate they promise.

{
  const order = gallery.map((_, i) => i);
  const r3 = lcg(SEED + 1);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(r3() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const best = [];
  for (const i of order.slice(0, 300)) {
    let top = -Infinity;
    for (let j = 0; j < gallery.length; j++) {
      if (j === i) continue;
      const v = SCORERS.hybrid(gallery[i], gallery[j]);
      if (v > top) top = v;
    }
    best.push(top);
  }
  best.sort((a, b) => a - b);
  const q = (x) => best[Math.min(best.length - 1, Math.floor(best.length * x))];
  const list = perProbe.hybrid, n = list.length || 1;
  results.proposedRule = {};
  console.log('\nReplacement rule (top score against the distribution of best-match scores)');
  console.log('  verdict     threshold   owner in pool: correct   owner NOT in pool: fires anyway');
  for (const [label, quant] of [['confident', 0.99], ['possible', 0.95]]) {
    const t = q(quant);
    const hit = list.filter(r => r.rank === 1 && r.ownerScore >= t).length / n;
    const falseAlarm = list.filter(r => r.bestOther >= t).length / n;
    results.proposedRule[label] = { threshold: t, hit, falseAlarm };
    console.log(`  ${label.padEnd(10)}  ${t.toFixed(4)}      ${pct(hit)}                   ${pct(falseAlarm)}`);
  }
}

// ── Which number should the verdict be based on? ────
// The raw top score is a poor basis: some players look like everyone. Compare
// it with two statistics that ask how far the top match stands out for THIS
// query: the gap to the runner-up, and the top score in standard deviations
// above that query's own spread of scores.

{
  const stats = []; // per probe: { correct, present: {raw,gap,z}, absent: {raw,gap,z} }
  const describe = (top, second, mean, std) => ({ raw: top, gap: top - second, z: std > 0 ? (top - mean) / std : 0 });
  for (const p of sampled) {
    const owner = SCORERS.handcrafted(p.full, gallery[p.ownerIdx]);
    let top = -Infinity, second = -Infinity, sum = 0, sumSq = 0, n = 0;
    for (let i = 0; i < gallery.length; i++) {
      if (i === p.ownerIdx) continue;
      const v = SCORERS.handcrafted(p.full, gallery[i]);
      sum += v; sumSq += v * v; n++;
      if (v > top) { second = top; top = v; } else if (v > second) second = v;
    }
    const mean = sum / n, std = Math.sqrt(Math.max(0, sumSq / n - mean * mean));
    const absent = describe(top, second, mean, std);
    const correct = owner > top;
    const meanP = (sum + owner) / (n + 1);
    const stdP = Math.sqrt(Math.max(0, (sumSq + owner * owner) / (n + 1) - meanP * meanP));
    const present = correct ? describe(owner, top, meanP, stdP) : null;
    stats.push({ correct, present, absent });
  }

  results.verdictStatistics = {};
  console.log('\nBasis for the verdict (handcrafted score): share of true owners caught at a fixed false-alarm rate');
  console.log('  statistic               1% false alarms   5% false alarms   threshold at 1%');
  for (const key of ['raw', 'gap', 'z']) {
    const row = {};
    for (const fpr of FPR_TARGETS) {
      const impostor = stats.map(x => x.absent[key]).sort((a, b) => b - a);
      const threshold = impostor[Math.min(impostor.length - 1, Math.floor(impostor.length * fpr))];
      const detected = stats.filter(x => x.correct && x.present[key] > threshold).length / stats.length;
      row[fpr] = { threshold, detected };
    }
    results.verdictStatistics[key] = row;
    const label = { raw: 'top score', gap: 'gap to runner-up', z: 'std devs above own spread' }[key];
    console.log(`  ${label.padEnd(26)} ${pct(row[0.01].detected)}            ${pct(row[0.05].detected)}           ${row[0.01].threshold.toFixed(4)}`);
  }
}

// ── Real smurf pairs (a final check, never a tuning set) ──

{
  let pairs = [];
  try {
    pairs = db.prepare('SELECT tag_main, tag_smurf FROM validation_pairs').all();
  } catch { /* table absent in older copies */ }

  const pool = [...accounts.entries()].map(([tag, e]) => ({ tag, ...e }));
  console.log(`\nConfirmed smurf pairs (${pairs.length} on file): where the main ranks when you look up the smurf`);
  if (pairs.length) console.log(`  ${'smurf -> main'.padEnd(46)} ${SCORER_NAMES.map(s => s.padStart(11)).join(' ')}`);

  for (const { tag_main: main, tag_smurf: smurf } of pairs) {
    const q = accounts.get(smurf), target = accounts.get(main);
    if (!q || !target) {
      console.log(`  ${`${smurf} -> ${main}`.padEnd(46)} not indexed with ${MIN_GALLERY}+ replays`);
      results.realPairs.push({ main, smurf, indexed: false });
      continue;
    }
    const ranks = {};
    for (const name of SCORER_NAMES) {
      const own = SCORERS[name](q, target);
      if (own == null) { ranks[name] = null; continue; }
      let better = 0;
      for (const c of pool) {
        if (c.tag === smurf || c.tag === main) continue;
        const s = SCORERS[name](q, c);
        if (s != null && s > own) better++;
      }
      ranks[name] = better + 1;
    }
    results.realPairs.push({ main, smurf, indexed: true, ranks, poolSize: pool.length });
    console.log(`  ${`${smurf} -> ${main}`.padEnd(46)} ${SCORER_NAMES.map(s => String(ranks[s] ?? '-').padStart(11)).join(' ')}`);
  }
}

if (OUT) {
  writeFileSync(OUT, JSON.stringify(results, null, 2));
  console.log(`\nWrote ${OUT}`);
}

db.close();
