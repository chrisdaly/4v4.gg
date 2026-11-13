/**
 * Player mentions in message text.
 *
 * `tags` is a Set of battleTags: the watch list (lowercased, "moon#2"), the
 * channel roster (as cased, "Moon#2"), or both. A message mentions a player
 * when its text contains the name part (before the "#") as a whole word,
 * case-insensitively. Names shorter than MIN_NAME_LENGTH are ignored:
 * two-letter names match too much chat noise.
 */

const MIN_NAME_LENGTH = 3;

// Compiled matcher and name index per Set instance (the Set is replaced on
// change, never mutated)
const matcherCache = new WeakMap();
const indexCache = new WeakMap();

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
 * nameIndex(tags) -> Map of lowercased name -> battleTag as it appears in
 * `tags`, so a matched run can be traced back to a player. The first tag
 * with a name wins.
 */
export function nameIndex(tags) {
  if (!tags) return new Map();
  let index = indexCache.get(tags);
  if (index) return index;
  index = new Map();
  for (const tag of tags) {
    const key = String(tag).split("#")[0].trim().toLowerCase();
    if (key && !index.has(key)) index.set(key, tag);
  }
  indexCache.set(tags, index);
  return index;
}

/**
 * findMentions(text, tags) -> [{ start, end, name, battleTag }]
 * Non-overlapping, in text order. `name` is the matched run as written in
 * the message (original casing); `battleTag` the tag it names.
 */
export function findMentions(text, tags) {
  if (!text || !tags || tags.size === 0) return [];
  const re = matcherFor(tags);
  if (!re) return [];
  const index = nameIndex(tags);
  re.lastIndex = 0;
  const out = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    out.push({ start: m.index, end: m.index + m[0].length, name: m[0], battleTag: index.get(m[0].toLowerCase()) });
    if (m[0].length === 0) re.lastIndex++;
  }
  return out;
}

/** The watch-list form of findMentions: [{ start, end, name }] */
export function findWatchedMentions(text, watchList) {
  return findMentions(text, watchList).map(({ start, end, name }) => ({ start, end, name }));
}

/**
 * Split text into plain strings and { mention, battleTag } runs for rendering.
 * "hi Moon gg" -> ["hi ", { mention: "Moon", battleTag: "Moon#2" }, " gg"]
 */
export function splitByMentions(text, tags) {
  const mentions = findMentions(text, tags);
  if (mentions.length === 0) return [text];
  const parts = [];
  let i = 0;
  for (const m of mentions) {
    if (m.start > i) parts.push(text.slice(i, m.start));
    parts.push({ mention: m.name, battleTag: m.battleTag });
    i = m.end;
  }
  if (i < text.length) parts.push(text.slice(i));
  return parts;
}
