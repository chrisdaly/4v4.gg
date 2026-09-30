/**
 * Story desk bookkeeping: which candidates got promoted to what, and the
 * digest text a set of picks turns into.
 *
 * Picks are per-viewer working state, so they live in localStorage keyed by
 * week. Nothing here talks to the relay; the desk reads candidates and
 * writes nothing until you copy the sections into the issue.
 */

/**
 * The three places a story can land in the issue. The labels are the names
 * of the sections a reader actually sees, not desk jargon, so promoting
 * something says where it will end up.
 */
export const SLOTS = [
  {
    key: "lead",
    label: "Top story",
    max: 1,
    hint: "The headline on the cover. Full body and quotes. One per issue.",
  },
  {
    key: "brief",
    label: "Also this week",
    max: 3,
    hint: "A short story with its own headline, two or three sentences and a quote. Three at most.",
  },
];

const KEY = (weekStart) => `desk_picks_${weekStart}`;

export function loadPicks(weekStart) {
  try {
    const raw = localStorage.getItem(KEY(weekStart));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function savePicks(weekStart, picks) {
  try {
    localStorage.setItem(KEY(weekStart), JSON.stringify(picks));
  } catch {
    // A private window still works, the picks just do not survive a reload
  }
}

/**
 * Assign a candidate to a slot, or clear it by passing the slot it already
 * has. Only one candidate can hold the lead, so taking it releases the old.
 */
export function assign(picks, id, slot) {
  const next = { ...picks };
  if (next[id] === slot) {
    delete next[id];
    return next;
  }
  // A full slot makes room by dropping whatever went in first
  const cap = SLOTS.find((s) => s.key === slot)?.max;
  if (cap) {
    const held = Object.entries(next).filter(([, v]) => v === slot).map(([k]) => k);
    for (const k of held.slice(0, Math.max(0, held.length - cap + 1))) delete next[k];
  }
  next[id] = slot;
  return next;
}

/** Candidates in a slot, in the order the detectors ranked them. */
export function inSlot(candidates, picks, slot) {
  return candidates.filter((c) => picks[c.id] === slot);
}

/** A candidate's best lines: the ones someone else reacted to, else the first few. */
export function pickQuotes(candidate, max = 4) {
  const lines = candidate.lines || [];
  const laugh = /(lol|lmao|haha|hehe|xd+|\)\)\)|kekw|😂|🤣|rofl)/i;
  const scored = lines.map((l, i) => {
    // A wall of text is not a pull-quote no matter who laughed at it
    if (l.text.length < 12 || l.text.length > 160) return { line: l, score: 0 };
    if (/https?:\/\//.test(l.text)) return { line: l, score: 0 };
    const reacted = lines.slice(i + 1, i + 5).some((n) => n.name !== l.name && laugh.test(n.text));
    const meaty = l.text.length >= 20 && l.text.length <= 120;
    return { line: l, score: (reacted ? 2 : 0) + (meaty ? 1 : 0) };
  });
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((s) => s.line);
}

const quoteStr = (l) => `"${l.name}: ${l.text.replace(/"/g, "")}"`;

/* ── Composing a picked candidate into a story ───────── */

const DRAFT_KEY = (weekStart) => `desk_drafts_${weekStart}`;

export function loadDrafts(weekStart) {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY(weekStart)) || "{}");
  } catch {
    return {};
  }
}

export function saveDrafts(weekStart, drafts) {
  try {
    localStorage.setItem(DRAFT_KEY(weekStart), JSON.stringify(drafts));
  } catch {
    // Private window: the draft just does not survive a reload
  }
}

/**
 * A candidate's starting draft: its own best lines already chosen, so the
 * quote hunting the old editorial mode needed is mostly done. The headline
 * and body are yours to write.
 */
export function startDraft(candidate) {
  return { headline: "", body: "", quotes: pickQuotes(candidate, 3) };
}

export const lineKey = (l) => `${l.at}|${l.name}`;

/** One story as its digest item: "Headline | body "quote" "quote"". */
export function composeItem(candidate, draft) {
  const d = draft || startDraft(candidate);
  const quotes = (d.quotes || []).map(quoteStr);
  const head = (d.headline || "").trim();
  const body = (d.body || "").trim();
  const text = [head, body].filter(Boolean).join(" | ");
  return [text, quotes.join(" ")].filter(Boolean).join(" ").trim();
}

/**
 * Toggle a line in or out of a story's quotes. The whole line is stored, not
 * a reference into the candidate, so a quote found by searching the archive
 * sits alongside one the detector surfaced.
 */
export function toggleQuote(draft, line) {
  const k = lineKey(line);
  const quotes = draft?.quotes || [];
  const found = quotes.some((q) => lineKey(q) === k);
  return {
    ...draft,
    quotes: found
      ? quotes.filter((q) => lineKey(q) !== k)
      : [...quotes, { at: line.at, name: line.name, tag: line.tag, text: line.text }],
  };
}

export function hasQuote(draft, line) {
  const k = lineKey(line);
  return (draft?.quotes || []).some((q) => lineKey(q) === k);
}

/** True once a story has enough to be worth writing into the issue. */
export function isReady(draft) {
  return Boolean(draft?.headline?.trim() && draft?.body?.trim());
}

/**
 * Splice the composed sections into an existing digest, leaving every other
 * section exactly as it was. Sections are one line each, so this replaces
 * the DRAMA and HIGHLIGHTS lines in place and adds them after TOPICS when
 * they are missing.
 */
export function applyToDigest(digestText, sections) {
  const lines = String(digestText || "").split("\n");
  const out = [];
  const written = new Set();
  const keyOf = (line) => (line.match(/^([A-Z_]+):/) || [])[1];

  for (const line of lines) {
    const key = keyOf(line);
    if (key && sections[key] !== undefined) {
      // An empty section is a deletion, not an empty line
      if (sections[key]) out.push(`${key}: ${sections[key]}`);
      written.add(key);
      continue;
    }
    out.push(line);
  }

  const missing = Object.entries(sections).filter(([k, v]) => v && !written.has(k));
  if (missing.length > 0) {
    const at = out.findIndex((l) => keyOf(l) === "TOPICS");
    const block = missing.map(([k, v]) => `${k}: ${v}`);
    out.splice(at >= 0 ? at + 1 : 0, 0, ...block);
  }
  return out.join("\n");
}

/** Every composed story as the two sections they belong in. */
export function composedSections(candidates, picks, drafts) {
  const item = (c) => composeItem(c, drafts[c.id]);
  const drama = [...inSlot(candidates, picks, "lead"), ...inSlot(candidates, picks, "brief")]
    .filter((c) => isReady(drafts[c.id]));
  const sections = {};
  if (drama.length > 0) sections.DRAMA = drama.map(item).join("; ");
  return sections;
}

/**
 * The picks as digest sections, ready to paste. Headlines and bodies are
 * left as placeholders on purpose: the desk finds the story, a person
 * still writes it.
 */
export function toSections(candidates, picks) {
  const item = (c) => {
    const quotes = pickQuotes(c).map(quoteStr).join(" ");
    const subject = c.kind === "theme" ? c.term : c.who?.map((w) => w.name).join(", ");
    return `HEADLINE HERE | Write the story. ${c.why}. Subject: ${subject}. ${quotes}`;
  };

  const lead = inSlot(candidates, picks, "lead");
  const briefs = inSlot(candidates, picks, "brief");
  const highlights = inSlot(candidates, picks, "highlight");

  const out = [];
  const drama = [...lead, ...briefs];
  if (drama.length > 0) out.push(`DRAMA: ${drama.map(item).join("; ")}`);
  if (highlights.length > 0) out.push(`HIGHLIGHTS: ${highlights.map(item).join("; ")}`);
  return out.join("\n");
}

/** Every battleTag a set of picks touches, for the MENTIONS line. */
export function pickedTags(candidates, picks, drafts = {}) {
  const tags = new Set();
  for (const c of candidates) {
    if (!picks[c.id]) continue;
    for (const l of c.lines || []) if (l.tag?.includes("#")) tags.add(l.tag);
    for (const q of drafts[c.id]?.quotes || []) if (q.tag?.includes("#")) tags.add(q.tag);
  }
  return [...tags].sort();
}


/* ── Reading the computed sections back as something drawable ───── */

/** "Name#123[HU] +239 MMR (17W-6L) WLWW" -> the parts a card needs. */
export function readStatLine(line) {
  const m = String(line || "").match(/^(\S+?#\d+)(?:\[(\w+)\])?\s+(.+?)\s+\((\d+)W-(\d+)L\)\s*([WL]*)$/);
  if (!m) return null;
  return {
    battleTag: m[1],
    name: m[1].split("#")[0],
    race: m[2] || null,
    headline: m[3],
    wins: Number(m[4]),
    losses: Number(m[5]),
    form: m[6] || "",
  };
}

/** "W:3=105,4=88|L:3=95" -> { win: [{len,count}], loss: [...] }. */
export function readSpectrum(line) {
  const parse = (part) => (part || "").split(",").map((e) => {
    const [len, count] = e.split("=");
    return len && count ? { len: Number(len), count: Number(count) } : null;
  }).filter(Boolean);
  const [w, l] = String(line || "").split("|");
  const win = parse((w || "").replace(/^W:/, ""));
  const loss = parse((l || "").replace(/^L:/, ""));
  return win.length || loss.length ? { win, loss } : null;
}

/** "1. Name#1 +239 MMR (17W-6L); 2. ..." -> rows. */
export function readRankings(line) {
  return String(line || "").split(/;\s*/).map((entry) => {
    const m = entry.match(/^\d+\.\s*(\S+?#\d+)\s*([+-]?\d+)\s*MMR\s*\((\d+)W-(\d+)L\)/);
    return m ? {
      battleTag: m[1], name: m[1].split("#")[0],
      mmrChange: Number(m[2]), wins: Number(m[3]), losses: Number(m[4]),
    } : null;
  }).filter(Boolean);
}

/** The five spotlight cards, in the order they read in the issue. */
export const SPOTLIGHT_ORDER = [
  { key: "WINNER", label: "Winner", accent: "green" },
  { key: "LOSER", label: "Loser", accent: "red" },
  { key: "GRINDER", label: "Grinder", accent: "gold" },
  { key: "HOTSTREAK", label: "Hot streak", accent: "green" },
  { key: "COLDSTREAK", label: "Cold streak", accent: "red" },
  { key: "HEROSLAYER", label: "Hero slayer", accent: "white" },
];


/** "WINNER=Mon:WLW|Tue:LL;LOSER=..." -> { WINNER: [{day, form}], ... } */
export function readDaily(line) {
  const out = {};
  for (const part of String(line || "").split(";")) {
    const [key, rest] = part.split(/=(.+)/);
    if (!key || !rest) continue;
    out[key.trim()] = rest.split("|").map((d) => {
      const [day, form] = d.split(":");
      return day ? { day, form: form || "" } : null;
    }).filter(Boolean);
  }
  return out;
}

/** "WINNER=1842,LOSER=1520" -> { WINNER: 1842, ... } */
export function readMmr(line) {
  const out = {};
  for (const part of String(line || "").split(",")) {
    const [key, v] = part.split("=");
    if (key && v && Number(v)) out[key.trim()] = Number(v);
  }
  return out;
}

/**
 * Where a run of wins or losses sits inside a week's form, so it can be
 * picked out of the dots. Returns null when there is no run that long.
 */
export function findRun(form, result, length) {
  if (!form || !length || length < 2) return null;
  const needle = String(result).repeat(length);
  const at = String(form).indexOf(needle);
  return at < 0 ? null : { start: at, end: at + length };
}


/* ── Quote of the week ───────────────────────────────── */

const QOTW_KEY = (weekStart) => `desk_quote_${weekStart}`;

export function loadQuote(weekStart) {
  try {
    const raw = localStorage.getItem(QOTW_KEY(weekStart));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveQuote(weekStart, quote) {
  try {
    if (quote) localStorage.setItem(QOTW_KEY(weekStart), JSON.stringify(quote));
    else localStorage.removeItem(QOTW_KEY(weekStart));
  } catch {
    // Private window: the pick just does not survive a reload
  }
}

/** The chosen line as BEST_OF_CHAT, which is what the issue reads. */
export function quoteSection(quote) {
  if (!quote?.text || !quote?.name) return null;
  return `"${quote.name}: ${String(quote.text).replace(/"/g, "")}"`;
}


/**
 * "Longest game: 71 minutes on Ferocity 6ab4...; Biggest day: X +120 MMR"
 * -> one line each, with the match id pulled out so it can be linked.
 */
export function readFeats(line) {
  return String(line || "").split(/;\s*/).map((e) => {
    const text = e.trim();
    if (!text) return null;
    const m = text.match(/\s([a-f0-9]{16,})$/);
    return { text: m ? text.slice(0, m.index) : text, matchId: m ? m[1] : null };
  }).filter(Boolean);
}
