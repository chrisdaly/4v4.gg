/**
 * Offline evaluation of smurf detection.
 *
 * The test needs no smurf labels. Every player with enough replays is split in
 * two by date: the older half stays under their name (the "known account"),
 * the newer half has its name hidden (the "probe"). The scorer then ranks
 * every known account against each probe, and we count how often the true
 * owner comes first. Players with too few replays to split still sit in the
 * pool as distractors, the same as in production.
 *
 * It scores and judges with the functions the relay uses (src/identityModel.js),
 * so the numbers describe what /api/fingerprints/identify actually does.
 *
 * Usage (read-only; point it at a local copy of the relay database):
 *   node scripts/eval-identify.mjs --db /path/to/chat.db
 *   node scripts/eval-identify.mjs --db chat.db --min-replays 8 --max-probes 1000 --out eval.json
 *
 * The scorer that ships was fitted on every player, including the ones tested
 * here, so its numbers from this script run a little high. For an honest
 * number, fit on one fold of players (ml/identity/fit_export.py --fold 0) and
 * pass that file: only the players it never saw are then used as probes.
 *   node scripts/eval-identify.mjs --db chat.db --identity-model model-fold0.json
 */

import { readFileSync, writeFileSync } from 'fs';
import Database from 'better-sqlite3';
import { cosineSegment, computeServerSimilarity, averageFingerprints } from '../src/fingerprint.js';
import {
  createIdentityModel,
  identity as shippedModel,
  identitySimilarity,
  scorePool,
  standout,
  bestMatchStandouts,
  rarity,
  verdictFor,
} from '../src/identityModel.js';

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
const IDENTITY_MODEL_PATH = arg('identity-model', null);
const PROBE_SIZES = [1, 3, 5, 10]; // games in the hidden half, for the "how many games" curve
const CALIBRATION_SAMPLE = 300; // same as the relay

if (!DB_PATH) {
  console.error('Usage: node scripts/eval-identify.mjs --db /path/to/chat.db [--identity-model model.json] [--min-replays 8] [--max-probes 1000] [--out eval.json]');
  process.exit(1);
}

let model = shippedModel;
let heldOut = null; // players the model never saw; null = no restriction
if (IDENTITY_MODEL_PATH) {
  const json = JSON.parse(readFileSync(IDENTITY_MODEL_PATH, 'utf8'));
  model = createIdentityModel(json);
  if (json.heldOutPlayers) heldOut = new Set(json.heldOutPlayers);
}

// ── Scorers ─────────────────────────────────────────
// Each takes two entities and returns a similarity, or null when it cannot
// score the pair. `scorer` is what the relay uses. The rest are reference
// points: the hand-weighted score it replaced, and two parts of it on their own.

const seg = (e, k) => e.fp.segments[k];

function hasSignal(v) {
  if (!v?.length) return false;
  for (const x of v) if (x) return true;
  return false;
}

function meanCosine(a, b, keys) {
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

const SCORERS = {
  scorer: (a, b) => identitySimilarity(a.emb, b.emb),
  old_hand_weighted: (a, b) => computeServerSimilarity(a.fp, b.fp),
  hotkey_only: (a, b) => meanCosine(a, b, ['hotkey']),
  transitions_rhythm_only: (a, b) => meanCosine(a, b, ['transitions', 'rhythm']),
};
const SCORER_NAMES = Object.keys(SCORERS);
const COL = 26;

// ── Helpers ─────────────────────────────────────────

function lcg(seed) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}

function shuffled(n, seed) {
  const order = Array.from({ length: n }, (_, i) => i);
  const rand = lcg(seed);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
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
  };
}

function entity(games) {
  return {
    fp: averageFingerprints(games.map(g => g.fp)),
    emb: model.embed(games.map(g => g.fp.segments)),
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

// Bulk-imported replays have no battle_tag, only a "Name#1234" player_name.
const rows = db.prepare(`
  SELECT COALESCE(pf.battle_tag, pf.player_name) AS player_key,
         pf.replay_id, pf.race, pf.vector, pf.action_seg, pf.apm_seg, pf.hotkey_seg,
         pf.tempo_seg, pf.intensity_seg, pf.transitions_seg, pf.rhythm_seg,
         COALESCE(r.match_date, r.uploaded_at) AS played_at
  FROM player_fingerprints pf
  JOIN replays r ON r.id = pf.replay_id
  ORDER BY player_key, played_at, pf.replay_id
`).iterate();

const gallery = [];   // every candidate account: { tag, fp, emb, n, race, replayIds }
const probes = [];    // hidden halves: { tag, ownerIdx, bySize: {k: entity}, full: entity }
const accounts = new Map(); // tag -> whole-account entity, for the real smurf pairs
let totalRows = 0, playersSeen = 0;

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
const sampled = shuffled(probes.length, SEED)
  .map(i => probes[i])
  .filter(p => !heldOut || heldOut.has(p.tag))
  .slice(0, MAX_PROBES);

console.log(`Database: ${DB_PATH}`);
console.log(`  ${totalRows} fingerprints from ${playersSeen} players`);
console.log(`  ${gallery.length} candidate accounts (${MIN_GALLERY}+ replays), ${probes.length} splittable (${MIN_REPLAYS}+), ${sampled.length} probes evaluated`);
console.log(heldOut
  ? '  Scorer was fitted on one fold of players; probes are only players it never saw.\n'
  : '  Scorer is the shipped one, fitted on all players including these: its numbers run a little high.\n');

// ── Rank one probe against the gallery ──────────────

function sharesGame(probe, cand) {
  for (const id of probe.replayIds) if (cand.replayIds.has(id)) return true;
  return false;
}

/**
 * For one scorer: the owner's rank (1 = first), and the owner's rank once
 * anyone who appeared in the same game as the probe is ruled out.
 */
function rankProbe(probeEntity, ownerIdx, score) {
  const ownerScore = score(probeEntity, gallery[ownerIdx]);
  if (ownerScore == null) return null;

  let better = 0, betterNoCoplay = 0;
  for (let i = 0; i < gallery.length; i++) {
    if (i === ownerIdx) continue;
    const s = score(probeEntity, gallery[i]);
    if (s == null) continue;
    if (s > ownerScore) {
      better++;
      if (!sharesGame(probeEntity, gallery[i])) betterNoCoplay++;
    }
  }
  return { rank: better + 1, rankNoCoplay: betterNoCoplay + 1 };
}

// ── Main table: full hidden half ────────────────────

const results = { meta: {}, scorers: {}, byProbeSize: {}, byRace: {}, verdict: {}, realPairs: [] };
results.meta = {
  db: DB_PATH, minReplays: MIN_REPLAYS, minGallery: MIN_GALLERY, seed: SEED,
  fingerprints: totalRows, players: playersSeen, gallery: gallery.length,
  splittable: probes.length, probesEvaluated: sampled.length, heldOutOnly: !!heldOut,
};

const perProbe = {};
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

console.log('Re-identification, full hidden half');
console.log(`  ${'scorer'.padEnd(COL)} probes  first    top 5    MRR   first (same-game players ruled out)`);
for (const name of SCORER_NAMES) {
  const s = summarise(perProbe[name]);
  results.scorers[name] = s;
  console.log(`  ${name.padEnd(COL)} ${String(s.n).padStart(6)}  ${pct(s.rank1)}  ${pct(s.top5)}  ${(s.mrr ?? 0).toFixed(3)}   ${pct(s.rank1NoCoplay)}`);
}

// ── Same race versus cross race ─────────────────────

console.log('\nFirst place when the hidden half is the same race as the known half, versus a different race');
console.log(`  ${'scorer'.padEnd(COL)} same race (n)        cross race (n)`);
for (const name of SCORER_NAMES) {
  const same = summarise(perProbe[name].filter(r => r.sameRace === true));
  const cross = summarise(perProbe[name].filter(r => r.sameRace === false));
  results.byRace[name] = { same, cross };
  console.log(`  ${name.padEnd(COL)} ${pct(same.rank1)} (${String(same.n).padStart(4)})       ${pct(cross.rank1)} (${String(cross.n).padStart(4)})`);
}

// ── How many games does a lookup need? ──────────────

console.log('\nFirst place by number of games in the hidden half');
console.log(`  ${'scorer'.padEnd(COL)} ${PROBE_SIZES.map(k => `${k} game${k > 1 ? 's' : ' '}`.padStart(9)).join('  ')}`);
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
  console.log(`  ${name.padEnd(COL)} ${cells.join('  ')}`);
}

// ── The verdict /identify gives ─────────────────────
// Same functions as the relay. The reference is how far a best match stands
// out for a sample of accounts; a lookup is "confident" when its top match
// stands out more than 99% of those, "possible" above 95%. Each probe is
// looked up twice: with its owner in the pool, and with the owner removed, in
// which case any verdict other than no_match is a false accusation.

{
  const pool = gallery.map(g => g.emb);
  const reference = bestMatchStandouts(pool, shuffled(pool.length, SEED + 1).slice(0, CALIBRATION_SAMPLE));

  function lookup(probeEmb, skip) {
    const { scores, order } = scorePool(probeEmb, pool, skip);
    const top = order[0];
    return { top, verdict: verdictFor(rarity(standout(top, scores, pool, skip), reference)) };
  }

  const tally = { n: 0, confidentRight: 0, possibleRight: 0, confidentWrong: 0, possibleWrong: 0, falseConfident: 0, falsePossible: 0 };
  for (const p of sampled) {
    tally.n++;
    const present = lookup(p.full.emb, null);
    const right = present.top === p.ownerIdx;
    if (present.verdict === 'confident') right ? tally.confidentRight++ : tally.confidentWrong++;
    if (present.verdict !== 'no_match') right ? tally.possibleRight++ : tally.possibleWrong++;

    const absent = lookup(p.full.emb, new Set([p.ownerIdx]));
    if (absent.verdict === 'confident') tally.falseConfident++;
    if (absent.verdict !== 'no_match') tally.falsePossible++;
  }
  const share = (k) => tally[k] / tally.n;
  results.verdict = Object.fromEntries(Object.keys(tally).filter(k => k !== 'n').map(k => [k, share(k)]));
  results.verdict.n = tally.n;

  console.log('\nThe verdict /identify gives');
  console.log('                                    confident    possible or better');
  console.log(`  owner in the pool, names them      ${pct(share('confidentRight'))}       ${pct(share('possibleRight'))}`);
  console.log(`  owner in the pool, names another   ${pct(share('confidentWrong'))}       ${pct(share('possibleWrong'))}`);
  console.log(`  owner NOT in the pool (all wrong)  ${pct(share('falseConfident'))}       ${pct(share('falsePossible'))}`);
}

// ── Real smurf pairs (a final check, never a tuning set) ──

{
  let pairs = [];
  try {
    pairs = db.prepare('SELECT tag_main, tag_smurf FROM validation_pairs').all();
  } catch { /* table absent in older copies */ }

  const pool = [...accounts.entries()].map(([tag, e]) => ({ tag, ...e }));
  const siblings = new Map(); // main -> its confirmed smurfs: the same person, so not wrong answers
  for (const { tag_main: main, tag_smurf: smurf } of pairs) {
    if (!siblings.has(main)) siblings.set(main, new Set());
    siblings.get(main).add(smurf);
  }

  console.log(`\nConfirmed smurf pairs (${pairs.length} on file): where the main ranks among ${pool.length} accounts when you look up the smurf`);
  if (pairs.length) console.log(`  ${'smurf -> main'.padEnd(46)} ${SCORER_NAMES.map(s => s.padStart(COL)).join(' ')}`);

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
        if (c.tag === smurf || c.tag === main || siblings.get(main).has(c.tag)) continue;
        const s = SCORERS[name](q, c);
        if (s != null && s > own) better++;
      }
      ranks[name] = better + 1;
    }
    results.realPairs.push({ main, smurf, indexed: true, ranks, poolSize: pool.length });
    console.log(`  ${`${smurf} -> ${main}`.padEnd(46)} ${SCORER_NAMES.map(s => String(ranks[s] ?? '-').padStart(COL)).join(' ')}`);
  }
}

if (OUT) {
  writeFileSync(OUT, JSON.stringify(results, null, 2));
  console.log(`\nWrote ${OUT}`);
}

db.close();
