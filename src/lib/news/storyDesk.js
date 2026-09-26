/**
 * Story desk bookkeeping: which candidates got promoted to what, and the
 * digest text a set of picks turns into.
 *
 * Picks are per-viewer working state, so they live in localStorage keyed by
 * week. Nothing here talks to the relay; the desk reads candidates and
 * writes nothing until you copy the sections into the issue.
 */

export const SLOTS = [
  { key: "lead", label: "Lead", hint: "The top story. One only." },
  { key: "brief", label: "Brief", hint: "A sub-story in Also This Week." },
  { key: "highlight", label: "Highlight", hint: "Lighter, one line and a quote." },
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
  if (slot === "lead") {
    for (const [k, v] of Object.entries(next)) if (v === "lead") delete next[k];
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
