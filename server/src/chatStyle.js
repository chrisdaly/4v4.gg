/**
 * Lobby chat style: who writes like whom. A third line of evidence beside
 * clicks (identityModel.js) and country (sideEvidence.js).
 *
 * Each account's lobby messages become one document, scored two ways and
 * averaged: word 1-2 grams (lowercased; slang, misspellings, catchphrases) and
 * character 1-3 grams (case, punctuation, emoticons). TF-IDF with sublinear
 * term frequency, terms in at least two documents, cosine similarity. This
 * reproduces scikit-learn's TfidfVectorizer as tested in
 * ml/identity/RESULTS.md: with 100 messages per side, the right account came
 * first 87% of the time among 684 chatters.
 *
 * Built from the messages table on demand and cached; about 700 accounts and
 * 3 million weights, a few seconds to build.
 */

export const MIN_CHAT_MESSAGES = 20;
const MAX_MESSAGES = 3000; // per account, most recent

// ── Tokenising (matches scikit-learn's analyzers) ───────────

/** Word unigrams and bigrams: lowercase, split on whitespace. */
function wordTerms(text) {
  const tokens = text.toLowerCase().split(/\s+/).filter(Boolean);
  const out = tokens.slice();
  for (let i = 0; i + 1 < tokens.length; i++) out.push(`${tokens[i]} ${tokens[i + 1]}`);
  return out;
}

/** Character 1-3 grams over the text with whitespace runs collapsed to one space. */
function charTerms(text) {
  const s = text.replace(/\s\s+/g, ' ');
  const chars = Array.from(s); // code points, as Python strings index
  const out = [];
  for (let n = 1; n <= 3; n++) {
    for (let i = 0; i + n <= chars.length; i++) out.push(chars.slice(i, i + n).join(''));
  }
  return out;
}

/**
 * TF-IDF vectors for a set of documents, as sorted term ids and weights.
 * @param {string[]} docs
 * @param {(text: string) => string[]} analyse
 */
function tfidf(docs, analyse) {
  const counts = docs.map((d) => {
    const m = new Map();
    for (const t of analyse(d)) m.set(t, (m.get(t) || 0) + 1);
    return m;
  });
  const df = new Map();
  for (const m of counts) for (const t of m.keys()) df.set(t, (df.get(t) || 0) + 1);
  const vocab = new Map();
  const n = docs.length;
  const idf = [];
  for (const [t, d] of df) {
    if (d < 2) continue;
    vocab.set(t, vocab.size);
    idf.push(Math.log((1 + n) / (1 + d)) + 1);
  }
  return counts.map((m) => {
    const entries = [];
    for (const [t, c] of m) {
      const id = vocab.get(t);
      if (id !== undefined) entries.push([id, (1 + Math.log(c)) * idf[id]]);
    }
    entries.sort((a, b) => a[0] - b[0]);
    const ids = new Int32Array(entries.length);
    const w = new Float32Array(entries.length);
    let norm = 0;
    entries.forEach(([id, x], i) => { ids[i] = id; w[i] = x; norm += x * x; });
    norm = Math.sqrt(norm) || 1;
    for (let i = 0; i < w.length; i++) w[i] /= norm;
    return { ids, w };
  });
}

/**
 * Term -> (document, weight) postings, so one document's similarity to all
 * others costs the length of its terms' postings, not a merge per document.
 */
function postings(vectors, vocabSize) {
  const start = new Int32Array(vocabSize + 1);
  for (const v of vectors) for (const id of v.ids) start[id + 1]++;
  for (let t = 0; t < vocabSize; t++) start[t + 1] += start[t];
  const fill = start.slice(0, vocabSize);
  const doc = new Int32Array(start[vocabSize]);
  const w = new Float32Array(start[vocabSize]);
  vectors.forEach((v, d) => {
    for (let k = 0; k < v.ids.length; k++) {
      const at = fill[v.ids[k]]++;
      doc[at] = d;
      w[at] = v.w[k];
    }
  });
  return { start, doc, w };
}

/** Add `scale` times one vector's dot product with every document into acc. */
function accumulate(acc, v, post, scale) {
  for (let k = 0; k < v.ids.length; k++) {
    const id = v.ids[k], x = v.w[k] * scale;
    for (let p = post.start[id]; p < post.start[id + 1]; p++) acc[post.doc[p]] += x * post.w[p];
  }
}

function maxId(vectors) {
  let m = 0;
  for (const v of vectors) if (v.ids.length) m = Math.max(m, v.ids[v.ids.length - 1] + 1);
  return m;
}

function sparseDot(a, b) {
  let i = 0, j = 0, s = 0;
  while (i < a.ids.length && j < b.ids.length) {
    const x = a.ids[i], y = b.ids[j];
    if (x === y) { s += a.w[i++] * b.w[j++]; }
    else if (x < y) i++;
    else j++;
  }
  return s;
}

// ── Index ───────────────────────────────────────────────────

/**
 * Build a chat-style index.
 * @param {Map<string, string[]>} messagesByTag - each account's messages, oldest first
 * @returns {{
 *   tags: string[], messageCount: Map<string, number>,
 *   has: (tag: string) => boolean,
 *   similarity: (a: string, b: string) => number|null,
 *   ranked: (tag: string, exclude?: Set<string>) => Array<{tag: string, similarity: number}>,
 * }}
 */
export function buildChatIndex(messagesByTag) {
  const tags = [];
  const docs = [];
  const messageCount = new Map();
  for (const [tag, msgs] of messagesByTag) {
    if (!tag || msgs.length < MIN_CHAT_MESSAGES) continue;
    tags.push(tag);
    docs.push(msgs.slice(-MAX_MESSAGES).join('\n'));
    messageCount.set(tag, msgs.length);
  }
  const words = tfidf(docs, wordTerms);
  const chars = tfidf(docs, charTerms);
  const pos = new Map(tags.map((t, i) => [t, i]));
  const sim = (i, j) => 0.5 * sparseDot(words[i], words[j]) + 0.5 * sparseDot(chars[i], chars[j]);
  // One account against every other, kept: 700 floats per account asked about
  const wordPost = postings(words, maxId(words));
  const charPost = postings(chars, maxId(chars));
  const rows = new Map();
  const row = (i) => {
    if (!rows.has(i)) {
      const acc = new Float64Array(tags.length);
      accumulate(acc, words[i], wordPost, 0.5);
      accumulate(acc, chars[i], charPost, 0.5);
      acc[i] = 0;
      rows.set(i, Float32Array.from(acc));
    }
    return rows.get(i);
  };

  return {
    tags,
    messageCount,
    has: (tag) => pos.has(tag),
    similarity(a, b) {
      const i = pos.get(a), j = pos.get(b);
      return i === undefined || j === undefined ? null : sim(i, j);
    },
    /** Every other indexed account by chat similarity to `tag`, closest first. */
    ranked(tag, exclude) {
      const i = pos.get(tag);
      if (i === undefined) return [];
      const r = row(i);
      const out = [];
      for (let j = 0; j < tags.length; j++) {
        if (j === i || exclude?.has(tags[j])) continue;
        out.push({ tag: tags[j], similarity: r[j] });
      }
      return out.sort((x, y) => y.similarity - x.similarity);
    },
  };
}

/**
 * Chat evidence for one click candidate: does the candidate write more like the
 * query than every other chatter does?
 * @param {ReturnType<typeof buildChatIndex>|null} index
 * @param {string} query
 * @param {string} candidate
 * @param {Set<string>} [exclude] - accounts to leave out of the comparison
 * @returns {{ indexed: boolean, rank: number|null, similarity: number|null, supports: boolean }}
 */
export function chatEvidence(index, query, candidate, exclude) {
  if (!index || !index.has(query) || !index.has(candidate)) {
    return { indexed: false, rank: null, similarity: null, supports: false };
  }
  const list = index.ranked(query, exclude);
  const at = list.findIndex((x) => x.tag === candidate);
  const rank = at === -1 ? null : at + 1;
  return { indexed: true, rank, similarity: at === -1 ? null : list[at].similarity, supports: rank === 1 };
}
