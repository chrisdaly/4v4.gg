/**
 * End-to-end evaluation of the Identify verdict: clicks, country and lobby chat
 * together, judged the way /api/fingerprints/identify judges them.
 *
 * Same hidden-half idea as eval-identify.mjs. Every account with 8+ ladder
 * games is split by date: the older half stays in the pool under its name, the
 * newer half is looked up as if it were an unknown smurf. Lobby chat is split
 * the same way (older messages known, newer with the probe). Each probe is
 * looked up twice:
 *   owner present  - did the verdict name the owner, someone else, or nobody?
 *   owner removed  - any verdict other than "no match" is a false accusation.
 *
 * Country and ladder meetings come from the owner's whole account, which is
 * what a real smurf shares with its main. One adjustment: a split account
 * always "shares" its own country, while real pairs do not, so the owner
 * counts as same-country only at the rate measured on confirmed pairs.
 *
 * Usage (read-only; a local copy of the relay database with the tables
 * player_fingerprints, replays, replay_players, player_countries,
 * player_game_countries, validation_pairs, messages):
 *   node scripts/eval-combined.mjs --db e2e.db [--identity-model model-fold0.json] [--max-probes 1500]
 */

import { readFileSync } from 'fs';
import Database from 'better-sqlite3';
import {
  createIdentityModel, identity as shippedModel,
  scorePool, standout, bestMatchStandouts, rarity, verdictFor,
} from '../src/identityModel.js';
import { sideEvidence, countryShares } from '../src/sideEvidence.js';
import { usualCountry } from '../src/connectionCountries.js';
import { buildChatIndex, chatEvidence, MIN_CHAT_MESSAGES } from '../src/chatStyle.js';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
const DB_PATH = arg('db', null);
const MIN_REPLAYS = 8;
const MIN_GALLERY = 3;
const MAX_PROBES = Number(arg('max-probes', 1500));
const SEED = 12345;
const MODEL_PATH = arg('identity-model', null);
if (!DB_PATH) {
  console.error('Usage: node scripts/eval-combined.mjs --db e2e.db [--identity-model fold.json]');
  process.exit(1);
}

let model = shippedModel;
let heldOut = null;
if (MODEL_PATH) {
  const json = JSON.parse(readFileSync(MODEL_PATH, 'utf8'));
  model = createIdentityModel(json);
  if (json.heldOutPlayers) heldOut = new Set(json.heldOutPlayers);
}

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
const parse = (j) => { try { return JSON.parse(j); } catch { return []; } };
const pct = (x) => `${(x * 100).toFixed(1).padStart(5)}%`;

const db = new Database(DB_PATH, { readonly: true, fileMustExist: true });

// ── Fingerprints: ladder 4v4 only, as the relay ─────────────

const games = new Map(); // tag -> [segments]
for (const r of db.prepare(`
  SELECT pf.battle_tag AS tag, pf.action_seg, pf.apm_seg, pf.hotkey_seg, pf.tempo_seg,
         pf.intensity_seg, pf.transitions_seg, pf.rhythm_seg
  FROM player_fingerprints pf JOIN replays r ON r.id = pf.replay_id
  WHERE pf.battle_tag IS NOT NULL AND r.match_type = '4on4'
  ORDER BY pf.battle_tag, COALESCE(r.match_date, r.uploaded_at), pf.replay_id
`).iterate()) {
  if (!games.has(r.tag)) games.set(r.tag, []);
  games.get(r.tag).push({
    action: parse(r.action_seg), apm: parse(r.apm_seg), hotkey: parse(r.hotkey_seg),
    tempo: parse(r.tempo_seg || '[]'), intensity: parse(r.intensity_seg || '[]'),
    transitions: parse(r.transitions_seg || '[]'), rhythm: parse(r.rhythm_seg || '[]'),
  });
}

const gallery = []; // { tag, emb }
const probes = [];  // { tag, ownerIdx, emb }
for (const [tag, g] of games) {
  if (g.length < MIN_GALLERY) continue;
  if (g.length >= MIN_REPLAYS) {
    const cut = Math.floor(g.length / 2);
    const ownerIdx = gallery.push({ tag, emb: model.embed(g.slice(0, cut)) }) - 1;
    probes.push({ tag, ownerIdx, emb: model.embed(g.slice(cut)) });
  } else {
    gallery.push({ tag, emb: model.embed(g) });
  }
}
const pool = gallery.map(g => g.emb);
const reference = bestMatchStandouts(pool, shuffled(pool.length, SEED + 1).slice(0, 300));

// ── Ladder meetings ─────────────────────────────────────────
// Two sources: replays the relay holds, and W3C match records (every player
// of every match the country history fetched). The relay checks replays only.

const metReplays = new Map();
const metAll = new Map();
function addMeetings(map, groups) {
  for (const players of groups.values()) {
    for (const a of players) {
      if (!map.has(a)) map.set(a, new Set());
      for (const b of players) if (b !== a) map.get(a).add(b);
    }
  }
}
{
  const byReplay = new Map();
  for (const r of db.prepare(`SELECT rp.replay_id, rp.battle_tag FROM replay_players rp JOIN replays r ON r.id = rp.replay_id WHERE r.match_type = '4on4'`).iterate()) {
    if (!byReplay.has(r.replay_id)) byReplay.set(r.replay_id, []);
    byReplay.get(r.replay_id).push(r.battle_tag);
  }
  addMeetings(metReplays, byReplay);
  addMeetings(metAll, byReplay);
  const byMatch = new Map();
  for (const r of db.prepare('SELECT match_id, battle_tag FROM player_game_countries').iterate()) {
    if (!byMatch.has(r.match_id)) byMatch.set(r.match_id, []);
    byMatch.get(r.match_id).push(r.battle_tag);
  }
  addMeetings(metAll, byMatch);
}

// ── Countries, as the relay: usual connection country, else profile ──

const summaries = new Map();
for (const r of db.prepare('SELECT battle_tag, country, COUNT(*) AS n FROM player_game_countries GROUP BY battle_tag, country').iterate()) {
  if (!summaries.has(r.battle_tag)) summaries.set(r.battle_tag, { total: 0, counts: {} });
  const s = summaries.get(r.battle_tag);
  s.counts[r.country] = r.n;
  s.total += r.n;
}
const profile = new Map(db.prepare('SELECT battle_tag, country FROM player_countries WHERE country IS NOT NULL').all().map(r => [r.battle_tag, r.country]));
const shareOf = countryShares(db.prepare('SELECT country, COUNT(*) AS n FROM player_countries WHERE country IS NOT NULL GROUP BY country').all());
const countryOf = (tag) => (summaries.has(tag) ? usualCountry(summaries.get(tag))?.country : null) || profile.get(tag) || null;

// How often a real main and smurf share a country
const pairs = db.prepare('SELECT tag_main, tag_smurf FROM validation_pairs').all();
const pairCountry = pairs.map(p => [countryOf(p.tag_main), countryOf(p.tag_smurf)]).filter(([a, b]) => a && b);
const SAME_COUNTRY_RATE = pairCountry.filter(([a, b]) => a === b).length / Math.max(1, pairCountry.length);

// ── Lobby chat: older half with the owner, newer half with the probe ──

function when(s) {
  if (!s) return 0;
  const m = /^(\d\d)\/(\d\d)\/(\d{4}) (\d\d:\d\d:\d\d)/.exec(s);
  const t = Date.parse(m ? `${m[3]}-${m[1]}-${m[2]}T${m[4]}Z` : s);
  return Number.isNaN(t) ? 0 : t;
}
const chatRows = new Map();
for (const r of db.prepare('SELECT battle_tag, message, sent_at FROM messages').iterate()) {
  const m = r.message?.trim();
  if (!r.battle_tag || !m) continue;
  if (!chatRows.has(r.battle_tag)) chatRows.set(r.battle_tag, []);
  chatRows.get(r.battle_tag).push([when(r.sent_at), m]);
}
const probeTags = new Set(probes.map(p => p.tag));
const chatDocs = new Map();
const PROBE = (tag) => `probe:${tag}`;
for (const [tag, rows] of chatRows) {
  rows.sort((a, b) => a[0] - b[0]);
  const msgs = rows.map(r => r[1]);
  if (probeTags.has(tag) && msgs.length >= 2 * MIN_CHAT_MESSAGES) {
    const cut = Math.floor(msgs.length / 2);
    chatDocs.set(tag, msgs.slice(0, cut));
    chatDocs.set(PROBE(tag), msgs.slice(cut));
  } else {
    chatDocs.set(tag, msgs);
  }
}
const chat = buildChatIndex(chatDocs);
const probeKeys = new Set(chat.tags.filter(t => t.startsWith('probe:')));

console.log(`Database: ${DB_PATH}`);
console.log(`  ${gallery.length} accounts in the pool (${MIN_GALLERY}+ ladder games), ${probes.length} split in two (${MIN_REPLAYS}+)`);
console.log(`  connection history for ${summaries.size} accounts, profile country for ${profile.size}`);
console.log(`  lobby chat indexed for ${chat.tags.length - probeKeys.size} accounts, ${probeKeys.size} of the split accounts chat enough to split too`);
console.log(`  confirmed pairs sharing a country: ${pairCountry.filter(([a, b]) => a === b).length} of ${pairCountry.length} (${pct(SAME_COUNTRY_RATE)}), applied to the owner`);
console.log(MODEL_PATH ? '  scorer fitted on one fold; probes are players it never saw\n' : '  shipped scorer (fitted on everyone): click numbers run a little high\n');

// ── Rules ───────────────────────────────────────────────────
// Each takes the click verdict and the top five with evidence, and returns
// { verdict, named: [tags] } - who the page would say it is.

const RULES = {
  'clicks only': (click, top) => click === 'no_match' ? none() : { verdict: click, named: [top[0].tag] },
  'clicks + country (live)': (click, top) => raise(click, top, c => c.country.supports),
  'clicks + country + chat': (click, top) => raise(click, top, c => c.country.supports || c.chat.supports),
  'clicks + chat': (click, top) => raise(click, top, c => c.chat.supports),
  'clicks + rare country': (click, top) => raise(click, top, c => c.country.supports && c.country.tier === 'rare'),
  'clicks + chat or rare ctry': (click, top) => raise(click, top, c => c.chat.supports || (c.country.supports && c.country.tier === 'rare')),
  'clicks + chat and country': (click, top) => raise(click, top, c => c.chat.supports && c.country.supports),
  'chat only in top 1': (click, top) => raise(click, top.slice(0, 1), c => c.chat.supports),
};
function none() { return { verdict: 'no_match', named: [] }; }
function raise(click, top, supports) {
  if (click !== 'no_match') return { verdict: click, named: [top[0].tag] };
  const named = top.filter(supports).map(c => c.tag);
  return named.length ? { verdict: 'possible', named } : none();
}

// ── Look up every probe ─────────────────────────────────────

const rand = lcg(SEED + 2);
const sampled = shuffled(probes.length, SEED).map(i => probes[i]).filter(p => !heldOut || heldOut.has(p.tag)).slice(0, MAX_PROBES);

function lookup(p, ownerPresent, met) {
  const skip = ownerPresent ? null : new Set([p.ownerIdx]);
  const { scores, order } = scorePool(p.emb, pool, skip);
  const click = verdictFor(rarity(standout(order[0], scores, pool, skip), reference));
  const qCountry = countryOf(p.tag);
  const ownerSameCountry = rand() < SAME_COUNTRY_RATE;
  const chatExclude = new Set([...probeKeys, ...(ownerPresent ? [] : [p.tag])]);
  const top = order.slice(0, 5).map(i => {
    const tag = gallery[i].tag;
    const isOwner = i === p.ownerIdx;
    const met_ = !isOwner && !!met.get(p.tag)?.has(tag);
    const cCountry = isOwner ? (ownerSameCountry ? qCountry : null) : countryOf(tag);
    return {
      tag, isOwner,
      country: sideEvidence({ queryCountry: qCountry, candidateCountry: cCountry, countryShare: shareOf(qCountry), sharedLadderGames: met_ ? 1 : 0 }),
      chat: met_ ? { supports: false } : chatEvidence(chat, PROBE(p.tag), tag, chatExclude),
    };
  });
  return { click, top };
}

function tally(meetings, subset) {
  const out = {};
  for (const name of Object.keys(RULES)) out[name] = { n: 0, confRight: 0, confWrong: 0, possRight: 0, possWrong: 0, falseConf: 0, falsePoss: 0 };
  for (const p of sampled) {
    if (subset && !subset(p)) continue;
    const present = lookup(p, true, meetings);
    const absent = lookup(p, false, meetings);
    for (const [name, rule] of Object.entries(RULES)) {
      const t = out[name];
      t.n++;
      const a = rule(present.click, present.top);
      const right = a.named.includes(p.tag);
      if (a.verdict === 'confident') right ? t.confRight++ : t.confWrong++;
      else if (a.verdict === 'possible') right ? t.possRight++ : t.possWrong++;
      const b = rule(absent.click, absent.top);
      if (b.verdict === 'confident') t.falseConf++;
      else if (b.verdict === 'possible') t.falsePoss++;
    }
  }
  return out;
}

function print(title, out) {
  const n = Object.values(out)[0].n;
  console.log(`${title} (${n} lookups)`);
  console.log(`  ${'rule'.padEnd(26)}  owner present: says "likely"  "possible"   (right / wrong)    owner removed: false "likely"  "possible"`);
  for (const [name, t] of Object.entries(out)) {
    const f = (k) => pct(t[k] / t.n);
    console.log(`  ${name.padEnd(26)}  ${f('confRight')} / ${f('confWrong')}   ${f('possRight')} / ${f('possWrong')}             ${f('falseConf')}         ${f('falsePoss')}`);
  }
  console.log();
}

// (replays-only meetings give the same numbers within half a point)
print('All split accounts, meetings from replays + W3C match records', tally(metAll));
const chats = (p) => probeKeys.has(PROBE(p.tag));
print('Accounts that chat (both halves 20+ lobby messages), meetings from replays + match records', tally(metAll, chats));
db.close();
