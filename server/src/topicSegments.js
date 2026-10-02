/**
 * Where one conversation stops and the next begins, and which of them are
 * about the same thing.
 *
 * The theme detector counts a term's lift against a four week baseline, which
 * finds subjects but not conversations: the pause dispute of the week of
 * Sep 21 ran across four days in several separate arguments, and lift flattens
 * all of it into the single word "pause". The burst detector finds stretches of
 * traffic but cannot tell a subject change from a quiet moment, so one
 * gap-separated run often holds three unrelated conversations.
 *
 * This splits a stream where its subject actually changes, then groups the
 * pieces that share one. Segmentation is TextTiling (Hearst, 1997): slide a
 * window, compare what was said before a point against what was said after,
 * and cut at the dips. What differs is only how a turn becomes a vector, which
 * is why `vectorise` is an argument. The lexical vectoriser here needs nothing
 * installed and is the default; a sentence-embedding model reads paraphrase and
 * crosses languages, which matters because about a fifth of this chat is not
 * English, and plugs in at the same seam.
 */

/* ── Sparse vectors ──────────────────────────────────── */

// Tokens that carry no subject.
//
// Function words in every language the chat actually uses, not only English.
// With an English-only list the lexical backend groups French with French and
// German with German: on the real week of Sep 21 two of the top five "subjects"
// came back as "est, pas, que, toi" and "ich, das, der, auf", which is a
// language and not a story. Roughly a fifth of this chat is not English.
const NOISE = new Set(`
the a an and or but if then is are was were be been am do does did have has had
to of in on at for with you your he she it they we me my him her them us this
that these those so not no yes just like get got can will would what why how who
all one out up now too very xd lol gg dont didnt thats

le la les un une des du de et ou mais si est sont etait ete pour avec dans sur
que qui quoi pas ne plus moi toi lui nous vous ils elles ce cette ces mon ton
son ma ta sa tres bien tout tous rien alors donc comme quand jai cest

der die das den dem ein eine einer und oder aber wenn ist sind war waren sein
hab habe hat hatte fur mit auf bei von zu nicht nein doch auch nur noch schon
sehr ich du er sie wir ihr mich dich sich mein dein wie wer warum

los las una unos unas por para con sin pero muy todo nada como cuando donde
porque eso esto ese este mucho poco

nao sim uma uns umas isso esse

eto kak chto gde kogda nado tozhe tolko ochen tak vot
не на что как это тот быть весь этот один мы вы они она оно для или
`.split(/\s+/).filter(Boolean));

/**
 * Chat-client furniture, not anybody's words. People paste it along with what
 * they quoted, and on the real week of Sep 21 it became a "subject" of its own:
 * "message, hidden, sep, from, blocked, player". The second pattern is the
 * timestamp header the client puts above a quoted line, which is why "sep"
 * turned up as a topic word in a week that began on a Monday in September.
 */
const CHROME_SOURCE = 'message hidden from blocked player|show message|click to show';
// Two regexes from one source: the global one strips every occurrence in a
// multi-line paste, and the plain one is for `test`, where a global flag carries
// lastIndex between calls and would skip every other match.
export const CLIENT_CHROME = new RegExp(CHROME_SOURCE, 'i');
const CHROME_ALL = new RegExp(CHROME_SOURCE, 'gi');
const QUOTE_HEADER = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{1,2}\s*-\s*\d{1,2}:\d{2}/gi;

export function tokenise(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(CHROME_ALL, ' ')
    .replace(QUOTE_HEADER, ' ')
    .replace(/[^\p{L}\p{N}#]+/gu, ' ')
    .split(' ')
    .filter((w) => w.length >= 3 && w.length <= 24 && !NOISE.has(w));
}

const norm = (v) => {
  let sum = 0;
  for (const w of v.values()) sum += w * w;
  const len = Math.sqrt(sum);
  if (!(len > 0)) return v;
  for (const [k, w] of v) v.set(k, w / len);
  return v;
};

/**
 * TF-IDF over the window being segmented, L2 normalised. IDF is computed from
 * the same turns rather than a global corpus, so a word everyone in this stream
 * uses carries no weight here even if it is rare overall.
 */
export function lexicalVectors(texts) {
  const docs = texts.map(tokenise);
  const seen = new Map();
  for (const d of docs) for (const w of new Set(d)) seen.set(w, (seen.get(w) || 0) + 1);
  const n = docs.length || 1;
  return docs.map((d) => {
    const tf = new Map();
    for (const w of d) tf.set(w, (tf.get(w) || 0) + 1);
    const v = new Map();
    for (const [w, c] of tf) {
      const idf = Math.log(1 + n / (seen.get(w) || 1));
      v.set(w, (1 + Math.log(c)) * idf);
    }
    return norm(v);
  });
}

// A sentence model returns a dense vector, the lexical vectoriser a sparse one.
// Both are L2 normalised, so cosine is a dot product either way; only the walk
// over the entries differs.
const isDense = (v) => Array.isArray(v) || v instanceof Float32Array || v instanceof Float64Array;

// Each vectoriser carries the thresholds its own similarity scale needs, so a
// caller never has to know which backend it got. Measured on 40 chat lines
// across four subjects: lexically a real subject change dips 0.58 to 0.69 and
// noise inside one subject reaches 0.17, while with centred sentence vectors the
// same boundaries dip 1.19 to 1.53 and no false dip appears at all.
lexicalVectors.minDepth = 0.25;
lexicalVectors.groupThreshold = 0.3;

export function cosine(a, b) {
  if (!a || !b) return 0;
  if (isDense(a) || isDense(b)) {
    if (!isDense(a) || !isDense(b) || a.length !== b.length) return 0;
    let dot = 0;
    for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
    return dot;
  }
  if (a.size === 0 || b.size === 0) return 0;
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  let dot = 0;
  for (const [k, w] of small) {
    const o = large.get(k);
    if (o !== undefined) dot += w * o;
  }
  return dot;
}

export function centroid(vectors) {
  if (!vectors || vectors.length === 0) return new Map();
  if (isDense(vectors[0])) {
    const n = vectors[0].length;
    const out = new Float32Array(n);
    for (const v of vectors) for (let i = 0; i < n; i++) out[i] += v[i];
    let sum = 0;
    for (let i = 0; i < n; i++) { out[i] /= vectors.length; sum += out[i] * out[i]; }
    const len = Math.sqrt(sum);
    if (len > 0) for (let i = 0; i < n; i++) out[i] /= len;
    return out;
  }
  const out = new Map();
  for (const v of vectors) for (const [k, w] of v) out.set(k, (out.get(k) || 0) + w);
  for (const [k, w] of out) out.set(k, w / vectors.length);
  return norm(out);
}

// A dense centroid has no words in it, so a segment's label comes from its text
// rather than its vector whenever the vectoriser is a model.
const labelFrom = (texts, limit = 6) => {
  const [v] = lexicalVectors([texts.join(' ')]);
  return [...v.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([w]) => w);
};

/* ── Segmentation ────────────────────────────────────── */

/**
 * Cut a stream of turns where its subject changes.
 *
 * `window` is how many turns on each side of a candidate point are compared, so
 * it sets the smallest subject change worth noticing.
 *
 * A dip counts when it clears `minDepth`, which defaults to whatever the
 * vectoriser says its own scale needs, because a sentence model and a bag of
 * words do not produce comparable numbers.
 *
 * Hearst's relative cutoff, mean - sd/2, is deliberately not used. It assumes
 * many candidate dips of which most are shallow, and a chat stream gives the
 * opposite: few dips, nearly all real. On four subjects with dips of 1.51, 1.53
 * and 1.19 it computes a bar of 1.33 and throws away the third boundary, and on
 * one subject held throughout it cuts the deepest dip there is, because there
 * always is one. An absolute floor does the whole job: measured across backends,
 * a real subject change sits in open space above anything noise produces.
 */
export function segmentTopics(turns, { window = 6, minTurns = 4, minDepth, vectorise = lexicalVectors } = {}) {
  const floor = minDepth ?? vectorise.minDepth ?? lexicalVectors.minDepth;
  if (!turns || turns.length === 0) return [];
  const textOf = (t) => t.message ?? t.text ?? '';
  if (turns.length < Math.max(minTurns * 2, window * 2)) {
    return [makeSegment(turns, 0, turns.length, vectorise)];
  }

  const vectors = vectorise(turns.map(textOf));

  // Coherence across every point that could be a boundary
  const coherence = [];
  for (let i = window; i <= turns.length - window; i++) {
    const before = centroid(vectors.slice(i - window, i));
    const after = centroid(vectors.slice(i, i + window));
    coherence.push({ at: i, value: cosine(before, after) });
  }
  if (coherence.length < 3) return [makeSegment(turns, 0, turns.length, vectorise)];

  // A dip is only a boundary if the subject recovers on both sides of it, so
  // score each local minimum by how far it sits below its neighbouring peaks
  const dips = [];
  for (let i = 1; i < coherence.length - 1; i++) {
    const v = coherence[i].value;
    if (v > coherence[i - 1].value || v > coherence[i + 1].value) continue;
    let left = v;
    for (let j = i - 1; j >= 0 && coherence[j].value >= left; j--) left = coherence[j].value;
    let right = v;
    for (let j = i + 1; j < coherence.length && coherence[j].value >= right; j++) right = coherence[j].value;
    dips.push({ at: coherence[i].at, depth: (left - v) + (right - v) });
  }
  if (dips.length === 0) return [makeSegment(turns, 0, turns.length, vectorise)];

  const cuts = [];
  for (const d of dips.sort((a, b) => a.at - b.at)) {
    if (d.depth < floor) continue;
    const last = cuts.length ? cuts[cuts.length - 1] : 0;
    if (d.at - last < minTurns || turns.length - d.at < minTurns) continue;
    cuts.push(d.at);
  }

  const bounds = [0, ...cuts, turns.length];
  const segments = [];
  for (let i = 0; i < bounds.length - 1; i++) {
    segments.push(makeSegment(turns, bounds[i], bounds[i + 1], vectorise));
  }
  return segments;
}

function makeSegment(turns, from, to, vectorise) {
  const slice = turns.slice(from, to);
  const textOf = (t) => t.message ?? t.text ?? '';
  const vectors = vectorise(slice.map(textOf));
  const mid = centroid(vectors);
  const speakers = new Set(slice.map((t) => t.user_name).filter(Boolean));
  return {
    from,
    to,
    turns: slice.length,
    speakers: speakers.size,
    cast: [...speakers].slice(0, 8),
    startedAt: slice[0]?.received_at ?? null,
    endedAt: slice[slice.length - 1]?.received_at ?? null,
    // The words that make this stretch itself and not its neighbours
    terms: labelFrom(slice.map(textOf)),
    centroid: mid,
    lines: slice.map((t) => ({
      at: t.received_at, name: t.user_name, tag: t.battle_tag, text: textOf(t),
    })),
  };
}

/* ── Grouping ────────────────────────────────────────── */

/**
 * Put the segments that share a subject together, however far apart they ran.
 *
 * Greedy and single pass against each group's running centroid, which is enough
 * because segments arrive in time order and a subject that comes back is
 * usually recognisable from the first time it appeared. A group that spans
 * several days with a different cast each time is the interesting shape: one
 * argument is an argument, the same argument on four days is a story.
 */
export function groupSegments(segments, { threshold, minSegments = 2, maxSegments = 12 } = {}) {
  const floor = threshold ?? lexicalVectors.groupThreshold;
  const groups = [];
  for (const seg of segments || []) {
    let best = null;
    let bestSim = 0;
    for (const g of groups) {
      const sim = cosine(g.centroid, seg.centroid);
      if (sim > bestSim) { bestSim = sim; best = g; }
    }
    if (best && bestSim >= floor) {
      best.members.push(seg);
      best.centroid = centroid(best.members.map((m) => m.centroid));
    } else {
      groups.push({ centroid: seg.centroid, members: [seg] });
    }
  }

  return groups
    // A group that swallows most of the week is the background, not a subject.
    // On the real week of Sep 21 the largest came back as 37 conversations,
    // 124 people and all 7 days, labelled "game, mmr, dont, base, side, play":
    // that is people talking, which is true of every week and worth no column.
    .filter((g) => g.members.length >= minSegments && g.members.length <= maxSegments)
    .map((g) => {
      const speakers = new Set(g.members.flatMap((m) => m.cast));
      const days = new Set(g.members.map((m) => String(m.startedAt || '').slice(0, 10)).filter(Boolean));
      return {
        kind: 'topic',
        id: `g:${g.members[0].startedAt || g.members[0].from}`,
        terms: labelFrom(g.members.flatMap((m) => m.lines.map((l) => l.text))),
        conversations: g.members.length,
        turns: g.members.reduce((a, m) => a + m.turns, 0),
        speakers: speakers.size,
        days: days.size,
        score: Math.round((days.size * 3 + speakers.size + g.members.length * 2) * 10) / 10,
        why: `${g.members.length} separate conversations · ${speakers.size} people · ${days.size} days`,
        // The centroid is working state, not something a reader of the API wants
        members: g.members.map((m) => {
          const copy = { ...m };
          delete copy.centroid;
          return copy;
        }),
      };
    })
    .sort((a, b) => b.score - a.score);
}
