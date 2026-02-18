/* ── Digest shared helpers ─────────────────────────── */

export const COVER_BACKGROUNDS = [
  "/backgrounds/themes/frozen-throne-chronicle.jpg",
  "/backgrounds/themes/arena-reforged.jpg",
  "/backgrounds/themes/blackrock-firelands.jpg",
  "/backgrounds/themes/blight-undead-4k.jpg",
  "/backgrounds/themes/dalaran.jpg",
  "/backgrounds/themes/ashenvale.jpg",
  "/backgrounds/themes/lordaeron.jpg",
  "/backgrounds/themes/outland.jpg",
  "/backgrounds/themes/holy-light.jpg",
  "/backgrounds/themes/culling-clean.jpg",
  "/backgrounds/themes/frozen-throne-lichking.jpg",
  "/backgrounds/themes/arena-tyrande-illidan.jpg",
];

export const hashDate = (dateStr) => {
  let h = 0;
  for (let i = 0; i < dateStr.length; i++) {
    h = (h * 31 + dateStr.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
};

export const formatWeekRange = (weekStart, weekEnd) => {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const s = new Date(weekStart + "T12:00:00");
  const e = new Date(weekEnd + "T12:00:00");
  const sMonth = months[s.getMonth()];
  const eMonth = months[e.getMonth()];
  if (sMonth === eMonth) return `${sMonth} ${s.getDate()} \u2013 ${e.getDate()}, ${s.getFullYear()}`;
  return `${sMonth} ${s.getDate()} \u2013 ${eMonth} ${e.getDate()}, ${s.getFullYear()}`;
};

export const formatDigestLabel = (dateStr) => {
  const d = new Date(dateStr + "T12:00:00");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const today = new Date().toISOString().slice(0, 10);
  if (dateStr === today) return "Today";
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (dateStr === yesterday) return "Yesterday";
  return `${months[d.getMonth()]} ${d.getDate()}`;
};

export const formatDigestDay = (dateStr) => {
  const d = new Date(dateStr + "T12:00:00");
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days[d.getDay()];
};

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
  { key: "HEROSLAYER", label: "Hero Slayer", cls: "heroslayer", stat: true },
  { key: "NEW_BLOOD", label: "New Blood", cls: "new-blood" },
  { key: "UPSET", label: "Upset", cls: "upset" },
  { key: "AT_SPOTLIGHT", label: "AT Stacks", cls: "at-spotlight" },
  { key: "BEST_OF_CHAT", label: "Best of Chat", cls: "chat-best" },
  { key: "POWER_RANKINGS", label: "Power Rankings", cls: "rankings", rankings: true },
  { key: "MATCH_STATS", label: "Match Stats", cls: "match-stats", awards: true },
  { key: "HEROES", label: "Heroes", cls: "heroes", awards: true },
  { key: "AWARDS", label: "Awards", cls: "awards", awards: true },
  { key: "CLIPS", label: "Clips", cls: "clips", clips: true },
];

const HEROSLAYER_DATA_KEYS = ["HEROSLAYER_HEROES", "HEROSLAYER_VICTIMS", "HEROSLAYER_KILLBOARD", "HEROSLAYER_MAX"];
const BLURB_KEYS = ["WINNER_BLURB", "LOSER_BLURB", "GRINDER_BLURB", "HOTSTREAK_BLURB", "COLDSTREAK_BLURB", "HEROSLAYER_BLURB", "Hero Slayer_BLURB", "Unit Killer_BLURB"];
const QUOTE_KEYS = ["WINNER_QUOTES", "LOSER_QUOTES", "GRINDER_QUOTES", "HOTSTREAK_QUOTES", "COLDSTREAK_QUOTES", "HEROSLAYER_QUOTES", "Hero Slayer_QUOTES", "Unit Killer_QUOTES"];
const STREAK_DATA_KEYS = ["HOTSTREAK_DAILY", "COLDSTREAK_DAILY", "STREAK_SPECTRUM"];
export const ALL_SECTION_KEYS = [...DIGEST_SECTIONS.map((s) => s.key), ...BLURB_KEYS, ...QUOTE_KEYS, ...STREAK_DATA_KEYS, ...HEROSLAYER_DATA_KEYS, "MENTIONS"];
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
  const streakMatch = headline.match(/(\d+)([WL])\s*streak/);
  return {
    battleTag: m[1],
    name: m[1].split("#")[0],
    race: m[2] || null,
    headline,
    mmrChange: mmrMatch ? parseInt(mmrMatch[1]) : null,
    streakLen: streakMatch ? parseInt(streakMatch[1]) : null,
    streakType: streakMatch ? streakMatch[2] : null,
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
 * Parse AWARDS: "MVP Name#123 1850 MMR 75% WR | Iron Man Name#456 32 games | ..."
 */
export const parseAwards = (content) => {
  return content.split(/\s*\|\s*/).map((entry) => {
    const m = entry.trim().match(/^(.+?)\s+(\S+#\d+)\s+(.+)$/);
    if (!m) return null;
    return { category: m[1], battleTag: m[2], name: m[2].split("#")[0], detail: m[3] };
  }).filter(Boolean);
};

/**
 * Parse UPSET: semicolon-delimited upset entries.
 * Format: "Names (avg X MMR) beat favorites (avg Y MMR) on Map — Z MMR gap matchId [u1mmr,...|f1mmr,...|uTag1,...|fTag1,...]"
 */
export const parseUpsets = (content) => {
  return content.split(/;\s*/).map((entry) => {
    const e = entry.trim();
    if (!e) return null;
    const m = e.match(
      /^(.+?)\s+\(avg\s+(\d+)\s*MMR\)\s+beat\s+favorites?\s+\(avg\s+(\d+)\s*MMR\)\s+on\s+(.+?)\s+[—-]\s+(\d+)\s*MMR\s*gap\s+([a-f0-9]+)\s+\[([^\]]+)\]/i
    );
    if (!m) return null;
    const parts = m[7].split("|");
    if (parts.length < 4) return null;
    const underdogMmrs = parts[0].split(",").map(Number);
    const favoriteMmrs = parts[1].split(",").map(Number);
    const underdogTags = parts[2].split(",");
    const favoriteTags = parts[3].split(",");
    return {
      underdogNames: m[1].split(/,\s*/),
      underdogAvg: parseInt(m[2]),
      favoriteAvg: parseInt(m[3]),
      map: m[4],
      mmrGap: parseInt(m[5]),
      matchId: m[6],
      underdogMmrs,
      favoriteMmrs,
      underdogTags,
      favoriteTags,
    };
  }).filter(Boolean);
};

/**
 * Parse AT_SPOTLIGHT: semicolon-delimited team stack entries.
 * Format: "Name1 + Name2 (2-stack, avg 1809 MMR) 7W-0L 100%"
 */
export const parseATSpotlight = (content) => {
  return content.split(/;\s*/).map((entry) => {
    const m = entry.trim().match(
      /^(.+?)\s+\((\d)-stack,\s*avg\s+(\d+)\s*MMR\)\s+(\d+)W-(\d+)L\s+(\d+)%$/
    );
    if (!m) return null;
    const players = m[1].split(/\s*\+\s*/);
    return {
      players,
      stackSize: parseInt(m[2]),
      avgMmr: parseInt(m[3]),
      wins: parseInt(m[4]),
      losses: parseInt(m[5]),
      winPct: parseInt(m[6]),
    };
  }).filter(Boolean);
};

/**
 * Parse MATCH_STATS: pipe-delimited superlative entries.
 * Format: "Hero Slayer Name#123 4.6 hero kills/game in 11 games (Runner1 4.5, Runner2 3.5)"
 */
export const parseMatchStats = (content) => {
  return content.split(/\s*\|\s*/).map((entry) => {
    const m = entry.trim().match(
      /^(.+?)\s+(\S+#\d+)\s+(.+?)(?:\s+\((.+)\))?$/
    );
    if (!m) return null;
    // Extract optional [combo] suffix from detail
    let detail = m[3];
    let combo = null;
    const comboMatch = detail.match(/\s+\[([^\]]+)\]$/);
    if (comboMatch) {
      combo = comboMatch[1];
      detail = detail.slice(0, comboMatch.index);
    }
    const runnersUp = m[4]
      ? m[4].split(/,\s*/).map((r) => r.trim()).filter(Boolean)
      : [];
    return {
      category: m[1],
      battleTag: m[2],
      name: m[2].split("#")[0],
      detail,
      combo,
      runnersUp,
    };
  }).filter(Boolean);
};

/**
 * Parse NEW_BLOOD: semicolon-delimited debut entries.
 * Format: "Name#123 debuted at 2554 MMR (7 games, 71% WR)"
 */
const RACE_NAMES = { HU: "Human", ORC: "Orc", NE: "Night Elf", UD: "Undead" };

/** Detect longest consecutive run of a character in a form string (e.g. "WWWLWW" → { char: "W", len: 3 }) */
const longestRun = (form) => {
  let bestChar = "", bestLen = 0, curChar = "", curLen = 0;
  for (const c of form) {
    if (c === curChar) { curLen++; } else { curChar = c; curLen = 1; }
    if (curLen > bestLen) { bestLen = curLen; bestChar = curChar; }
  }
  return { char: bestChar, len: bestLen };
};

/**
 * Build a stat-based narrative blurb for a spotlight card when no DRAMA/HIGHLIGHTS context exists.
 * @param {object} stat - Parsed stat line from parseStatLine()
 * @param {"green"|"red"|"gold"} accent - Spotlight type
 * @returns {string[]} Array of 1-2 sentences
 */
export const buildStatBlurb = (stat, accent) => {
  if (!stat) return [];
  const totalGames = stat.wins + stat.losses;
  if (totalGames === 0) return [];
  const winRate = Math.round((stat.wins / totalGames) * 100);
  const raceName = RACE_NAMES[stat.race] || stat.race || "their race";
  const run = stat.form ? longestRun(stat.form) : { char: "", len: 0 };
  const lines = [];

  if (accent === "green") {
    const mmrPart = stat.mmrChange != null ? `Climbed +${Math.abs(stat.mmrChange)} MMR across ${totalGames} games on ${raceName}` : `Went ${stat.wins}-${stat.losses} on ${raceName} across ${totalGames} games`;
    lines.push(`${mmrPart} \u2014 a ${winRate}% win rate.`);
    if (run.char === "W" && run.len >= 4) {
      lines.push(`Closed the week on a ${run.len}-game win streak.`);
    }
  } else if (accent === "red") {
    if (totalGames <= 6) {
      lines.push(`A brutal ${stat.wins}-${stat.losses} week on ${raceName}.`);
    } else {
      lines.push(`Went ${stat.wins}-${stat.losses} on ${raceName} across ${totalGames} games \u2014 just ${winRate}% win rate.`);
    }
    if (stat.mmrChange != null) {
      lines.push(`${Math.abs(stat.mmrChange)} MMR wiped in the process.`);
    }
    if (run.char === "L" && run.len >= 4) {
      lines[lines.length - 1] = `${run.len} straight losses cost ${stat.mmrChange != null ? Math.abs(stat.mmrChange) + " MMR" : "dearly"}.`;
    }
  } else if (accent === "gold") {
    lines.push(`Logged ${totalGames} games on ${raceName} this week \u2014 more than anyone else. Went ${stat.wins}-${stat.losses} (${winRate}% WR).`);
  }

  return lines;
};

/**
 * Extract narrative sentences and quotes mentioning a player from DRAMA + HIGHLIGHTS.
 * @param {string} playerName - Player name (e.g. "Grubby")
 * @param {Array} sections - Parsed digest sections from parseDigestSections()
 * @returns {{ sentences: string[], quotes: string[] }}
 */
export const extractPlayerContext = (playerName, sections) => {
  if (!playerName || !sections?.length) return { sentences: [], quotes: [] };

  const escaped = playerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const nameRe = new RegExp(`\\b${escaped}\\b`, "i");
  const sentences = [];
  const quotes = [];

  for (const s of sections) {
    if (s.key !== "DRAMA" && s.key !== "HIGHLIGHTS") continue;
    const { summary, quotes: rawQuotes } = splitQuotes(s.content);

    // Scan semicolon-delimited items for name mentions
    for (const item of summary.split(/;\s*/)) {
      const trimmed = item.trim();
      if (trimmed && nameRe.test(trimmed) && sentences.length < 2) {
        sentences.push(trimmed);
      }
    }

    // Scan quotes for name mentions or speaker match
    for (const q of rawQuotes) {
      const speakerMatch = q.match(/^(\w[\w\d!ǃ]*?):\s+(.+)$/);
      const speaker = speakerMatch ? speakerMatch[1] : null;
      if (
        (speaker && nameRe.test(speaker)) ||
        nameRe.test(q)
      ) {
        if (quotes.length < 3) quotes.push(q);
      }
    }
  }

  return { sentences, quotes };
};

/**
 * Get blurb + chat quotes for a spotlight key from parsed sections.
 * @param {string} statKey - e.g. "WINNER", "COLDSTREAK"
 * @param {Array} sections - Parsed digest sections
 * @returns {{ blurb: string|null, quotes: string[] }}
 */
export const getSpotlightExtras = (statKey, sections) => {
  const blurbSec = sections.find((s) => s.key === `${statKey}_BLURB`);
  const quotesSec = sections.find((s) => s.key === `${statKey}_QUOTES`);
  const blurb = blurbSec?.content?.trim() || null;
  const quotes = [];
  if (quotesSec) {
    for (const m of quotesSec.content.matchAll(/"([^"]+)"/g)) {
      quotes.push(m[1]);
    }
  }
  return { blurb, quotes };
};

/**
 * Parse HOTSTREAK_DAILY / COLDSTREAK_DAILY section.
 * Format: "Mon:WWLW,0,+32;Tue:WWWWWWW,7,+48|streakIdx:3,streakLen:11"
 * Returns { days: [{ day, form, streakGames, mmrChange }], streakIdx, streakLen }
 */
export const parseStreakDaily = (content) => {
  const [daysPart, metaPart] = content.split("|");
  if (!daysPart || !metaPart) return null;
  const days = daysPart.split(";").map((entry) => {
    const [dayForm, ...rest] = entry.split(",");
    const colonIdx = dayForm.indexOf(":");
    if (colonIdx < 0) return null;
    const day = dayForm.slice(0, colonIdx);
    const form = dayForm.slice(colonIdx + 1);
    const streakGames = parseInt(rest[0]) || 0;
    const mmrChange = parseInt(rest[1]) || 0;
    return { day, form, streakGames, mmrChange };
  }).filter(Boolean);

  let streakIdx = 0, streakLen = 0;
  for (const pair of metaPart.split(",")) {
    const [k, v] = pair.split(":");
    if (k === "streakIdx") streakIdx = parseInt(v) || 0;
    if (k === "streakLen") streakLen = parseInt(v) || 0;
  }
  return { days, streakIdx, streakLen };
};

/**
 * Parse STREAK_SPECTRUM section.
 * Format: "W:3=12,4=8,5=3,11=1|L:3=10,4=5,16=1"
 * Returns { win: [{ len, count }], loss: [{ len, count }] }
 */
export const parseStreakSpectrum = (content) => {
  const parseHalf = (str) => {
    if (!str) return [];
    // Strip the "W:" or "L:" prefix
    const data = str.includes(":") ? str.split(":")[1] : str;
    if (!data) return [];
    return data.split(",").map((e) => {
      const [len, count] = e.split("=");
      return { len: parseInt(len), count: parseInt(count) };
    }).filter((e) => !isNaN(e.len) && !isNaN(e.count));
  };
  const parts = content.split("|");
  const winPart = parts.find((p) => p.startsWith("W:"));
  const lossPart = parts.find((p) => p.startsWith("L:"));
  return { win: parseHalf(winPart), loss: parseHalf(lossPart) };
};

export const parseNewBlood = (content) => {
  return content.split(/;\s*/).map((entry) => {
    const m = entry.trim().match(
      /^(\S+#\d+)\s+debuted\s+at\s+(\d+)\s*MMR\s+\((\d+)\s+games?,\s*(\d+)%\s*WR\)(?:\s+\[returning(?::(\d{4}-\d{2}-\d{2}|\d+))?\])?(?:\s+first:(\d{4}-\d{2}-\d{2}))?$/
    );
    if (!m) return null;
    return {
      battleTag: m[1],
      name: m[1].split("#")[0],
      mmr: parseInt(m[2]),
      games: parseInt(m[3]),
      winPct: parseInt(m[4]),
      returning: entry.includes("[returning"),
      lastActive: m[5] && m[5].includes("-") ? m[5] : null,
      firstDate: m[6] || null,
    };
  }).filter(Boolean);
};
