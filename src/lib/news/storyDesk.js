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
    hint: "A short story with its own headline, two or three sentences and a quote.",
  },
  {
    key: "highlight",
    label: "Highlight",
    hint: "The lighter stuff. One line and a quote.",
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
  // A slot with a cap releases whatever was holding it
  const cap = SLOTS.find((s) => s.key === slot)?.max;
  if (cap === 1) {
    for (const [k, v] of Object.entries(next)) if (v === slot) delete next[k];
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
    const reacted = lines.slice(i + 1, i + 5).some((n) => n.name !== l.name && laugh.test(n.text));
    const meaty = l.text.length >= 15 && l.text.length <= 140;
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
  const chosen = pickQuotes(candidate, 4);
  return {
    headline: "",
    body: "",
    quoteKeys: chosen.map((l) => `${l.at}|${l.name}`),
  };
}

const lineKey = (l) => `${l.at}|${l.name}`;

/** One story as its digest item: "Headline | body "quote" "quote"". */
export function composeItem(candidate, draft) {
  const d = draft || startDraft(candidate);
  const keys = new Set(d.quoteKeys || []);
  const quotes = (candidate.lines || []).filter((l) => keys.has(lineKey(l))).map(quoteStr);
  const head = (d.headline || "").trim();
  const body = (d.body || "").trim();
  const text = [head, body].filter(Boolean).join(" | ");
  return [text, quotes.join(" ")].filter(Boolean).join(" ").trim();
}

/** Toggle one line in or out of a story's quotes. */
export function toggleQuote(draft, line) {
  const k = lineKey(line);
  const keys = new Set(draft?.quoteKeys || []);
  if (keys.has(k)) keys.delete(k);
  else keys.add(k);
  return { ...draft, quoteKeys: [...keys] };
}

export function hasQuote(draft, line) {
  return (draft?.quoteKeys || []).includes(lineKey(line));
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
  const highlights = inSlot(candidates, picks, "highlight").filter((c) => isReady(drafts[c.id]));
  const sections = {};
  if (drama.length > 0) sections.DRAMA = drama.map(item).join("; ");
  if (highlights.length > 0) sections.HIGHLIGHTS = highlights.map(item).join("; ");
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
export function pickedTags(candidates, picks) {
  const tags = new Set();
  for (const c of candidates) {
    if (!picks[c.id]) continue;
    for (const l of c.lines || []) if (l.tag?.includes("#")) tags.add(l.tag);
  }
  return [...tags].sort();
}
