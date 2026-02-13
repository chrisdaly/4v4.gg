/* ── Digest parsing utilities ──────────────────────── */

export const DIGEST_SECTIONS = [
  { key: "TOPICS", label: "Topics", cls: "topics", tags: true },
  { key: "DRAMA", label: "Drama", cls: "drama" },
  { key: "BANS", label: "Bans", cls: "bans" },
  { key: "HIGHLIGHTS", label: "Highlights", cls: "highlights" },
  { key: "SPIKES", label: "Spikes", cls: "spikes" },
  { key: "RECAP", label: "Recap", cls: "recap" },
  { key: "WINNER", label: "Winner", cls: "winner", stat: true },
  { key: "LOSER", label: "Loser", cls: "loser", stat: true },
  { key: "GRINDER", label: "Grinder", cls: "grinder", stat: true },
  { key: "HOTSTREAK", label: "Hot", cls: "hotstreak", stat: true },
  { key: "COLDSTREAK", label: "Cold", cls: "coldstreak", stat: true },
];

export const ALL_SECTION_KEYS = [...DIGEST_SECTIONS.map((s) => s.key), "MENTIONS"];
export const SECTION_RE = new RegExp(`^(${ALL_SECTION_KEYS.join("|")})\\s*:\\s*`, "gm");

export const parseDigestSections = (text) => {
  const sections = [];
  const matches = [...text.matchAll(SECTION_RE)];
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const start = m.index + m[0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    const content = text.slice(start, end).trim();
    if (content) sections.push({ key: m[1], content });
  }
  return sections;
};

export const parseMentions = (sections) => {
  const mentionsSection = sections.find((s) => s.key === "MENTIONS");
  if (!mentionsSection) return new Map();
  const map = new Map();
  for (const tag of mentionsSection.content.split(",")) {
    const trimmed = tag.trim();
    if (!trimmed) continue;
    const name = trimmed.split("#")[0];
    if (name) map.set(name, trimmed);
  }
  return map;
};

export const parseStatLine = (content) => {
  const m = content.match(/^(.+?#\d+)(?:\[(\w+)\])?\s+(.+?)\s+\((\d+)W-(\d+)L\)\s*([WL]*)$/);
  if (!m) return null;
  return {
    battleTag: m[1],
    name: m[1].split("#")[0],
    race: m[2] || null,
    headline: m[3],
    wins: parseInt(m[4]),
    losses: parseInt(m[5]),
    form: m[6] || "",
  };
};

export const extractMentionedTags = (text, nameToTag) => {
  const tags = new Set();
  const lower = text.toLowerCase();
  for (const [name, tag] of nameToTag) {
    if (name.length < 2) continue;
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`\\b${escaped}\\b`, "i");
    if (re.test(text)) {
      tags.add(tag);
    } else if (name.length >= 7) {
      const nameLower = name.toLowerCase();
      for (const word of lower.split(/\W+/)) {
        if (word.length >= 6 && nameLower.startsWith(word)) {
          tags.add(tag);
          break;
        }
      }
    }
  }
  return [...tags];
};

const QUOTE_RE = /"([^"]+)"/g;

export const splitQuotes = (text) => {
  const quotes = [];
  let summary = text;
  for (const m of text.matchAll(QUOTE_RE)) {
    quotes.push(m[1]);
  }
  if (quotes.length > 0) {
    summary = text
      .replace(QUOTE_RE, "")
      .replace(/\btold him to\s*and\b/gi, "")
      .replace(/\bwhere \w+ told him\s*and\b/gi, "")
      .replace(/\bcalling him\s*$/gi, "")
      .replace(/\bcalling him\s+and\b/gi, "")
      .replace(/'\s+of\b/g, "'s")
      .replace(/\s*[—:,]\s*$/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  }
  return { summary, quotes };
};
