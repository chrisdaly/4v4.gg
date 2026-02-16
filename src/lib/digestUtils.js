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
  { key: "BEST_OF_CHAT", label: "Best of Chat", cls: "chat-best" },
  { key: "POWER_RANKINGS", label: "Power Rankings", cls: "rankings", rankings: true },
  { key: "META", label: "Meta Report", cls: "meta", meta: true },
  { key: "AWARDS", label: "Awards", cls: "awards", awards: true },
  { key: "CLIPS", label: "Clips", cls: "clips", clips: true },
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
  const headline = m[3];
  const mmrMatch = headline.match(/([+-]?\d+)\s*MMR/);
  return {
    battleTag: m[1],
    name: m[1].split("#")[0],
    race: m[2] || null,
    headline,
    mmrChange: mmrMatch ? parseInt(mmrMatch[1]) : null,
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

/**
 * Parse speaker-attributed quotes ("Name: message") and group consecutive
 * quotes by the same speaker. Returns array of { name, messages } groups.
 * Quotes without a "Name: " prefix get name = null.
 */
export const groupQuotesBySpeaker = (quotes) => {
  const groups = [];
  for (const q of quotes) {
    const m = q.match(/^(\w[\w\d!ǃ]*?):\s+(.+)$/);
    const name = m ? m[1] : null;
    const text = m ? m[2] : q;
    const last = groups[groups.length - 1];
    if (last && last.name === name) {
      last.messages.push(text);
    } else {
      groups.push({ name, messages: [text] });
    }
  }
  return groups;
};

/**
 * Parse POWER_RANKINGS: "1. Name#123[HU] +120 MMR (8W-2L) WWWLWWWW; 2. ..."
 */
export const parsePowerRankings = (content) => {
  return content.split(/;\s*/).map((entry) => {
    const m = entry.trim().match(
      /^(\d+)\.\s*(.+?#\d+)(?:\[(\w+)\])?\s+([+-]?\d+)\s*MMR\s+\((\d+)W-(\d+)L\)\s*([WL]*)$/
    );
    if (!m) return null;
    return {
      rank: parseInt(m[1]),
      battleTag: m[2],
      name: m[2].split("#")[0],
      race: m[3] || null,
      mmrChange: parseInt(m[4]),
      wins: parseInt(m[5]),
      losses: parseInt(m[6]),
      form: m[7] || "",
    };
  }).filter(Boolean);
};

/**
 * Parse META: "HU 42% (55% WR), ORC 28% (48% WR) | Maps: Ferocity 9, Snowblind 7"
 */
export const parseMetaReport = (content) => {
  const [racePart, mapPart] = content.split(/\s*\|\s*Maps:\s*/i);
  const races = (racePart || "").split(/,\s*/).map((entry) => {
    const m = entry.trim().match(/^(\w+)\s+(\d+)%\s*\((\d+)%\s*WR\)$/);
    if (!m) return null;
    return { race: m[1], pickPct: parseInt(m[2]), winPct: parseInt(m[3]) };
  }).filter(Boolean);

  const maps = (mapPart || "").split(/,\s*/).map((entry) => {
    const m = entry.trim().match(/^(.+?)\s+(\d+)$/);
    if (!m) return null;
    return { name: m[1], games: parseInt(m[2]) };
  }).filter(Boolean);

  return { races, maps };
};

/**
 * Parse AWARDS: "MVP Name#123 1850 MMR 75% WR | Iron Man Name#456 32 games | ..."
 */
export const parseAwards = (content) => {
  return content.split(/\s*\|\s*/).map((entry) => {
    const m = entry.trim().match(/^(.+?)\s+(\S+#\d+)\s+(.+)$/);
    if (!m) return null;
    return { category: m[1], battleTag: m[2], name: m[2].split("#")[0], detail: m[3] };
  }).filter(Boolean);
};
