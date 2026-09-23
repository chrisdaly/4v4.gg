/**
 * Watched-player mentions in message text.
 *
 * The watch list is a Set of lowercased battleTags ("moon#2"). A message
 * mentions a watched player when its text contains the name part (before
 * the "#") as a whole word, case-insensitively. Names shorter than
 * MIN_NAME_LENGTH are ignored: two-letter names match too much chat noise.
 */

const MIN_NAME_LENGTH = 3;

// Compiled matcher per watch-list instance (the Set is replaced on change)
const matcherCache = new WeakMap();

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function watchedNames(watchList) {
  if (!watchList || watchList.size === 0) return [];
  const seen = new Set();
  const names = [];
  for (const tag of watchList) {
    const name = String(tag).split("#")[0].trim();
    const key = name.toLowerCase();
    if (name.length < MIN_NAME_LENGTH || seen.has(key)) continue;
    seen.add(key);
    names.push(name);
  }
  // Longest first so "Moonlight" wins over "Moon" at the same position
  names.sort((a, b) => b.length - a.length);
  return names;
}

function matcherFor(watchList) {
  let re = matcherCache.get(watchList);
  if (re !== undefined) return re;
  const names = watchedNames(watchList);
  re = names.length
    ? new RegExp(`(?<![\\p{L}\\p{N}_])(?:${names.map(escapeRegExp).join("|")})(?![\\p{L}\\p{N}_])`, "giu")
    : null;
  matcherCache.set(watchList, re);
  return re;
}

/**
 * findWatchedMentions(text, watchList) -> [{ start, end, name }]
 * Non-overlapping, in text order. `name` is the matched run as written in
 * the message (original casing).
 */
export function findWatchedMentions(text, watchList) {
  if (!text || !watchList || watchList.size === 0) return [];
  const re = matcherFor(watchList);
  if (!re) return [];
  re.lastIndex = 0;
  const out = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    out.push({ start: m.index, end: m.index + m[0].length, name: m[0] });
    if (m[0].length === 0) re.lastIndex++;
  }
  return out;
}

/**
 * Split text into plain strings and { mention } runs for rendering.
 * "hi Moon gg" -> ["hi ", { mention: "Moon" }, " gg"]
 */
export function splitByMentions(text, watchList) {
  const mentions = findWatchedMentions(text, watchList);
  if (mentions.length === 0) return [text];
  const parts = [];
  let i = 0;
  for (const m of mentions) {
    if (m.start > i) parts.push(text.slice(i, m.start));
    parts.push({ mention: m.name });
    i = m.end;
  }
  if (i < text.length) parts.push(text.slice(i));
  return parts;
}
