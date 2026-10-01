/**
 * Sentence vectors for chat lines, from the ml sidecar.
 *
 * Optional on purpose. Topic segmentation works on the lexical vectoriser with
 * nothing installed, and this replaces it when EMBED_URL points at a sidecar
 * that has the text model. The gain is paraphrase and language: two people objecting
 * to the same thing in different words, or in German and French, land near each
 * other here and nowhere near each other lexically.
 *
 * A failure falls back rather than throws. A weekly issue being built with the
 * cheaper vectoriser is a slightly worse issue; a weekly issue that cannot be
 * built because a sidecar is asleep is a broken desk.
 */

// The relay already points at the sidecar for player embeddings, so the text
// model needs no new configuration: same service, different endpoint.
const ML_URL = process.env.EMBED_URL || process.env.ML_URL || '';
const BATCH = 128;          // short lines, so the cost is per-request not per-token
const TIMEOUT_MS = 20000;

let warned = false;

export function textEmbedAvailable() {
  return Boolean(ML_URL);
}

/**
 * One L2-normalised Float32Array per text, or null if the sidecar cannot
 * answer. Callers treat null as "use the lexical vectoriser".
 */
export async function embedTexts(texts) {
  if (!ML_URL || !texts || texts.length === 0) return null;

  const out = [];
  for (let i = 0; i < texts.length; i += BATCH) {
    const slice = texts.slice(i, i + BATCH);
    let body;
    try {
      const res = await fetch(`${ML_URL.replace(/\/$/, '')}/embed-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts: slice }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 120)}`);
      body = await res.json();
    } catch (err) {
      if (!warned) {
        console.warn('[TextEmbed] sidecar unavailable, falling back to lexical:', err.message);
        warned = true;
      }
      return null;
    }
    const vectors = body?.vectors;
    if (!Array.isArray(vectors) || vectors.length !== slice.length) {
      console.warn('[TextEmbed] sidecar returned %d vectors for %d texts', vectors?.length, slice.length);
      return null;
    }
    for (const v of vectors) out.push(Float32Array.from(v));
  }
  return out;
}

/**
 * A `vectorise` for segmentTopics, pre-resolved. The segmenter is synchronous
 * and calls its vectoriser several times over subsets of the same turns, so the
 * embeddings are fetched once here and then served from the map by exact text.
 * An unseen text (it should not happen) gets a zero vector, which is simply
 * dissimilar to everything rather than an error.
 */
export async function makeVectoriser(texts) {
  const raw = await embedTexts(texts);
  if (!raw) return null;
  const vectors = centreVectors(raw);
  const dims = vectors[0]?.length || 0;
  const byText = new Map();
  texts.forEach((t, i) => { if (!byText.has(t)) byText.set(t, vectors[i]); });
  const zero = new Float32Array(dims);

  const vectorise = (wanted) => wanted.map((t) => byText.get(t) || zero);
  // This scale, not the lexical one. Measured on 40 chat lines over four
  // subjects: a real subject change dips 1.19 to 1.53 here against 0.58 to 0.69
  // lexically, and same-subject pairs average 0.157 against a cross-subject
  // -0.080 with a 0.090 spread, so 0.12 is two standard deviations clear.
  vectorise.minDepth = 0.5;
  vectorise.groupThreshold = 0.12;
  return vectorise;
}

/**
 * Subtract the mean vector, then renormalise.
 *
 * Every sentence this model produces shares a large common component: raw, two
 * unrelated chat lines still score 0.79 together and two about one subject only
 * 0.84, a gap of 0.04 that no threshold can sit inside. Removing the component
 * they all share widens that gap to 0.24 and pushes unrelated pairs negative,
 * which is the difference between the grouping working and merging the whole
 * week into one blob. The mean has to come from the whole corpus, so this
 * happens here where every text is in hand rather than per batch.
 */
function centreVectors(vectors) {
  const n = vectors.length;
  const dims = vectors[0]?.length || 0;
  if (n === 0 || dims === 0) return vectors;
  const mean = new Float64Array(dims);
  for (const v of vectors) for (let i = 0; i < dims; i++) mean[i] += v[i];
  for (let i = 0; i < dims; i++) mean[i] /= n;
  return vectors.map((v) => {
    const out = new Float32Array(dims);
    let sum = 0;
    for (let i = 0; i < dims; i++) { out[i] = v[i] - mean[i]; sum += out[i] * out[i]; }
    const len = Math.sqrt(sum);
    if (len > 0) for (let i = 0; i < dims; i++) out[i] /= len;
    return out;
  });
}
