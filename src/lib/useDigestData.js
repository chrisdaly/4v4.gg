import { useMemo } from "react";
import {
  parseDigestSections,
  parseMentions,
  parseStatLine,
  splitQuotes,
  getSpotlightExtras,
  parsePowerRankings,
  parseUpsets,
  parseATSpotlight,
  parseMatchStats,
  parseNewBlood,
  parseStreakDaily,
  parseStreakSpectrum,
} from "./digestUtils";

/* ── Text-path helpers ─────────────────────────────────── */

/** Clean up summary text after quote extraction */
const cleanSummary = (text) =>
  text
    .replace(/\([;,\s]*\)/g, "")
    .replace(/\n+/g, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,;])/g, "$1")
    .replace(/[.,;]+\s*$/, "")
    .trim();

/** Parse drama section from text into structured items */
export function parseDramaFromText(sections) {
  const sec = sections.find((s) => s.key === "DRAMA");
  if (!sec) return [];
  // Split by semicolons first (preserving quotes), then extract quotes per item
  const rawItems = sec.content.split(/;\s*/).filter(Boolean);
  return rawItems.map((raw, idx) => {
    const { summary: cleanedRaw, quotes: inlineQuotes } = splitQuotes(raw.trim());
    const trimmed = cleanSummary(cleanedRaw) || "";
    if (!trimmed) return null;
    const item = { summary: trimmed, quotes: [] };
    const parseQuote = (q) => {
      const qm = q.match(/^(\w[\w\d!ǃ]*?):\s+(.+)$/);
      return qm ? { speaker: qm[1], text: qm[2] } : { speaker: null, text: q };
    };
    // Every item can carry "Headline | body", not just the lead: the
    // sub-stories read as briefs rather than loose paragraphs.
    const pipeSplit = trimmed.split(/\s*\|\s*/);
    if (pipeSplit.length > 1) {
      item.headline = pipeSplit[0];
      item.summary = pipeSplit.slice(1).join(" | ");
    }
    if (idx === 0) {
      // Attach quotes: prefer DRAMA_QUOTES section, fall back to inline
      const quotesSec = sections.find((s) => s.key === "DRAMA_QUOTES");
      if (quotesSec) {
        item.quotes = [...quotesSec.content.matchAll(/"([^"]+)"/g)].map((m) => parseQuote(m[1]));
      } else {
        item.quotes = inlineQuotes.map(parseQuote);
      }
    } else {
      // Non-lead items: use inline quotes
      item.quotes = inlineQuotes.map(parseQuote);
    }
    return item;
  }).filter(Boolean);
}

/** Parse highlights from text into structured items */
export function parseHighlightsFromText(sections) {
  const sec = sections.find((s) => s.key === "HIGHLIGHTS");
  if (!sec) return [];
  return sec.content.split(/;\s*/).filter(Boolean).map((raw) => {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const { summary, quotes: rawQuotes } = splitQuotes(trimmed);
    const cleaned = cleanSummary(summary);
    const pipeSplit = cleaned.split(/\s*\|\s*/);
    return {
      headline: pipeSplit.length > 1 ? pipeSplit[0] : undefined,
      summary: pipeSplit.length > 1 ? pipeSplit.slice(1).join(" | ") : cleaned,
      quotes: rawQuotes.map((q) => {
        const qm = q.match(/^(\w[\w\d!ǃ]*?):\s+(.+)$/);
        return qm ? { speaker: qm[1], text: qm[2] } : { speaker: null, text: q };
      }),
    };
  }).filter(Boolean);
}

/**
 * WEEK_TREND: the daily game counts and the last few weeks' totals.
 *   days=Mon:130,Tue:144,...|weeks=2026-09-07:1123/592,2026-09-14:1215/569
 * The last week listed is this issue's own, so the chart can mark it.
 */
export function parseWeekTrendFromText(sections) {
  const sec = sections.find((s) => s.key === "WEEK_TREND");
  if (!sec) return null;
  const parts = {};
  for (const chunk of sec.content.split("|")) {
    const [k, v] = chunk.split(/=(.+)/);
    if (k && v) parts[k.trim()] = v.trim();
  }
  const days = (parts.days || "").split(",").map((e) => {
    const [day, games] = e.split(":");
    return day && games != null ? { day: day.trim(), games: parseInt(games, 10) || 0 } : null;
  }).filter(Boolean);
  const weeks = (parts.weeks || "").split(",").map((e) => {
    const [weekStart, rest] = e.split(":");
    const [games, players] = String(rest || "").split("/");
    return weekStart && games ? {
      weekStart: weekStart.trim(),
      games: parseInt(games, 10) || 0,
      players: parseInt(players, 10) || 0,
    } : null;
  }).filter(Boolean);
  if (days.length === 0 && weeks.length === 0) return null;
  return { days, weeks, blurb: sections.find((s) => s.key === "WEEK_TREND_BLURB")?.content || null };
}

/**
 * MOST_TALKED_ABOUT: "Name#1234 25 messages, 16 people, 7 days" plus its
 * own blurb and the lines other people said about them.
 */
export function parseMostTalkedAboutFromText(sections) {
  const sec = sections.find((s) => s.key === "MOST_TALKED_ABOUT");
  if (!sec) return null;
  const m = sec.content.match(/^(\S+#\d+)\s+(\d+)\s+messages?,\s*(\d+)\s+(?:people|players?),\s*(\d+)\s+days?/i);
  if (!m) return null;
  const quotesSec = sections.find((s) => s.key === "MOST_TALKED_ABOUT_QUOTES");
  const quotes = quotesSec
    ? [...quotesSec.content.matchAll(/"([^"]+)"/g)].map((q) => {
        const qm = q[1].match(/^(\w[\w\d!ǃ]*?):\s+(.+)$/);
        return qm ? { speaker: qm[1], text: qm[2] } : { speaker: null, text: q[1] };
      })
    : [];
  return {
    battleTag: m[1],
    name: m[1].split("#")[0],
    messages: parseInt(m[2], 10),
    people: parseInt(m[3], 10),
    days: parseInt(m[4], 10),
    blurb: sections.find((s) => s.key === "MOST_TALKED_ABOUT_BLURB")?.content || null,
    quotes,
  };
}

/** Parse bans from text into structured items */
function parseBansFromText(sections) {
  const sec = sections.find((s) => s.key === "BANS");
  if (!sec) return [];
  return sec.content.split(/;\s*/).filter(Boolean).map((raw) => {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const m = trimmed.match(/^(\S+)\s+(?:got\s+|banned\s+)?(\d+d|perm(?:a(?:nent)?)?)\s+(?:for\s+)?(.+?)(?:\s+([a-f0-9]{20,}))?$/i);
    if (m) {
      return { name: m[1], duration: m[2], reason: m[3].replace(/\s+$/, ""), matchId: m[4] || null };
    }
    return { name: null, duration: null, reason: trimmed, matchId: null };
  }).filter(Boolean);
}

/** Parse spotlight card from text sections */
function parseSpotlightFromText(key, sections) {
  const sec = sections.find((s) => s.key === key);
  const stat = sec ? parseStatLine(sec.content) : null;
  if (!stat) return null;

  const extras = getSpotlightExtras(key, sections);
  const blurb = extras.blurb || null;
  const quotes = extras.quotes.map((q) => {
    const qm = q.match(/^(\w[\w\d!ǃ]*?):\s+(.+)$/);
    return qm ? { speaker: qm[1], text: qm[2] } : { speaker: null, text: q };
  });

  const card = {
    battleTag: stat.battleTag,
    race: stat.race,
    headline: stat.headline,
    mmrChange: stat.mmrChange,
    streakLength: stat.streakLen || null,
    wins: stat.wins,
    losses: stat.losses,
    form: stat.form,
    blurb,
    quotes,
  };

  // Streak daily data
  if (key === "HOTSTREAK" || key === "COLDSTREAK") {
    const dailySec = sections.find((s) => s.key === `${key}_DAILY`);
    if (dailySec) {
      const parsed = parseStreakDaily(dailySec.content);
      if (parsed) {
        card.dailyBreakdown = parsed.days;
        card.streakIdx = parsed.streakIdx;
        card.streakLen = parsed.streakLen;
      }
    }
  }

  // Streak spectrum (only on HOTSTREAK to avoid duplication)
  if (key === "HOTSTREAK") {
    const specSec = sections.find((s) => s.key === "STREAK_SPECTRUM");
    if (specSec) {
      const parsed = parseStreakSpectrum(specSec.content);
      card.streakSpectrum = {
        wins: Object.fromEntries(parsed.win.map((e) => [e.len, e.count])),
        losses: Object.fromEntries(parsed.loss.map((e) => [e.len, e.count])),
      };
    }
  }

  // Hero slayer extended data
  if (key === "HEROSLAYER") {
    const find = (k) => sections.find((s) => s.key === k)?.content || null;
    const heroesContent = find("HEROSLAYER_HEROES");
    if (heroesContent) card.playerHeroes = heroesContent.split(",").map((h) => h.trim()).filter(Boolean);
    const victimsContent = find("HEROSLAYER_VICTIMS");
    if (victimsContent) card.victimHeroes = victimsContent.split(",").map((h) => h.trim()).filter(Boolean);
    const killboardContent = find("HEROSLAYER_KILLBOARD");
    if (killboardContent) {
      card.killboard = {};
      for (const entry of killboardContent.split(",")) {
        const [hero, count] = entry.trim().split(":");
        if (hero && count) card.killboard[hero.trim()] = parseInt(count) || 0;
      }
    }
    const maxContent = find("HEROSLAYER_MAX");
    if (maxContent) card.maxKillsInGame = parseInt(maxContent) || 0;
    const distContent = find("HEROSLAYER_DISTRIBUTION");
    if (distContent) {
      const parseHist = (str) => {
        const result = {};
        if (!str) return result;
        for (const e of str.split(",")) {
          const [k, v] = e.split("=");
          if (!isNaN(parseInt(k)) && !isNaN(parseInt(v))) result[parseInt(k)] = parseInt(v);
        }
        return result;
      };
      const parts = distContent.split("|");
      const allPart = parts[0] || "";
      const playerPart = (parts.find((p) => p.startsWith("player:")) || "").replace("player:", "");
      card.killsDistribution = { all: parseHist(allPart), player: parseHist(playerPart) };
    }
  }

  return card;
}

/** Parse upsets from text, normalizing to JSON shape */
function parseUpsetsFromText(sections) {
  const sec = sections.find((s) => s.key === "UPSET");
  if (!sec) return [];
  return parseUpsets(sec.content).map((u) => ({
    matchId: u.matchId,
    map: u.map,
    mmrGap: u.mmrGap,
    underdogs: u.underdogTags.map((tag, i) => ({ battleTag: tag, mmr: u.underdogMmrs[i] || 0 })),
    favorites: u.favoriteTags.map((tag, i) => ({ battleTag: tag, mmr: u.favoriteMmrs[i] || 0 })),
  }));
}

/** Parse power rankings from text, normalizing to JSON shape */
function parseRankingsFromText(sections) {
  const sec = sections.find((s) => s.key === "POWER_RANKINGS");
  if (!sec) return [];
  return parsePowerRankings(sec.content);
}

/** Parse match stats from text, normalizing to JSON shape */
function parseMatchStatsFromText(sections, key) {
  const sec = sections.find((s) => s.key === key);
  if (!sec) return [];
  return parseMatchStats(sec.content).map((s) => ({
    category: s.category,
    battleTag: s.battleTag,
    stat: s.detail,
    combo: s.combo,
    runnersUp: s.runnersUp,
    blurb: null,
    quotes: [],
  }));
}

/** Parse new blood from text, normalizing to JSON shape */
function parseNewBloodFromText(sections) {
  const sec = sections.find((s) => s.key === "NEW_BLOOD");
  if (!sec) return [];
  return parseNewBlood(sec.content).map((p) => ({
    battleTag: p.battleTag,
    mmr: p.mmr,
    games: p.games,
    winRate: p.winPct,
    isReturning: p.returning,
    lastSeen: p.lastActive,
    firstSeen: p.firstDate,
  }));
}

/** Parse AT spotlight from text, normalizing to JSON shape */
function parseATSpotlightFromText(sections) {
  const sec = sections.find((s) => s.key === "AT_SPOTLIGHT");
  if (!sec) return [];
  return parseATSpotlight(sec.content).map((s) => ({
    players: s.players.map((name) => ({ name, battleTag: null, mmr: null })),
    stackSize: s.stackSize,
    avgMmr: s.avgMmr,
    wins: s.wins,
    losses: s.losses,
    winRate: s.winPct,
  }));
}

/** Parse mentions from text sections into a plain object */
function parseMentionsFromText(sections) {
  const map = parseMentions(sections);
  const obj = {};
  for (const [name, tag] of map) obj[name] = tag;
  return obj;
}

/* ── Normalization from JSON ───────────────────────────── */

/** Normalize JSON spotlight quotes to consistent shape */
function normalizeQuotes(quotes) {
  if (!quotes) return [];
  return quotes.map((q) =>
    typeof q === "string"
      ? { speaker: null, text: q }
      : { speaker: q.speaker || null, text: q.text || q }
  );
}

/* ── Main hook ──────────────────────────────────────────── */

/**
 * useDigestData - dual-path hook that returns normalized digest data.
 *
 * - Reader mode + `digestJson` available → use JSON directly (no parsing)
 * - Editorial mode OR no JSON → fall back to text parsing (existing behavior)
 *
 * @param {{ weekly: object, isEditorial: boolean, draft: string }} opts
 * @returns {object} Normalized digest data
 */
export default function useDigestData({ weekly, isEditorial, draft }) {
  // Text-path sections - always computed for editorial panel UI
  const sections = useMemo(() => {
    const source = isEditorial && draft ? draft : weekly?.digest;
    if (!source) return [];
    return parseDigestSections(source);
  }, [weekly, isEditorial, draft]);

  const hasJSON = !isEditorial && weekly?.digestJson?.version === 1;

  const digestData = useMemo(() => {
    if (hasJSON) {
      const json = weekly.digestJson;
      return {
        narrative: {
          topics: json.narrative?.topics || [],
          drama: (json.narrative?.drama || []).map((d) => ({
            ...d,
            quotes: normalizeQuotes(d.quotes),
          })),
          bans: json.narrative?.bans || [],
          highlights: (json.narrative?.highlights || []).map((h) => ({
            ...h,
            quotes: normalizeQuotes(h.quotes),
          })),
          recap: json.narrative?.recap || null,
          bestOfChat: json.narrative?.bestOfChat || null,
        },
        spotlights: {
          winner: json.spotlights?.winner ? { ...json.spotlights.winner, quotes: normalizeQuotes(json.spotlights.winner.quotes) } : null,
          loser: json.spotlights?.loser ? { ...json.spotlights.loser, quotes: normalizeQuotes(json.spotlights.loser.quotes) } : null,
          grinder: json.spotlights?.grinder ? { ...json.spotlights.grinder, quotes: normalizeQuotes(json.spotlights.grinder.quotes) } : null,
          hotStreak: json.spotlights?.hotStreak ? { ...json.spotlights.hotStreak, quotes: normalizeQuotes(json.spotlights.hotStreak.quotes) } : null,
          coldStreak: json.spotlights?.coldStreak ? { ...json.spotlights.coldStreak, quotes: normalizeQuotes(json.spotlights.coldStreak.quotes) } : null,
          heroSlayer: json.spotlights?.heroSlayer ? { ...json.spotlights.heroSlayer, quotes: normalizeQuotes(json.spotlights.heroSlayer.quotes) } : null,
        },
        powerRankings: (json.powerRankings || []).map((r) => ({ ...r, name: r.name || r.battleTag?.split("#")[0] })),
        matchStats: (json.matchStats || []).map((s) => ({ ...s, name: s.name || s.battleTag?.split("#")[0] })),
        heroMeta: (json.heroMeta || []).map((s) => ({ ...s, name: s.name || s.battleTag?.split("#")[0] })),
        newBlood: json.newBlood || [],
        upsets: json.upsets || [],
        atSpotlight: json.atSpotlight || [],
        mentions: json.mentions || {},
        // These two have no JSON shape yet, so they come from the text either way
        weekTrend: parseWeekTrendFromText(sections),
        mostTalkedAbout: parseMostTalkedAboutFromText(sections),
      };
    }

    // Text fallback path
    if (sections.length === 0) {
      return {
        narrative: { topics: [], drama: [], bans: [], highlights: [], recap: null, bestOfChat: null },
        spotlights: { winner: null, loser: null, grinder: null, hotStreak: null, coldStreak: null, heroSlayer: null },
        powerRankings: [],
        matchStats: [],
        heroMeta: [],
        newBlood: [],
        upsets: [],
        atSpotlight: [],
        mentions: {},
        weekTrend: null,
        mostTalkedAbout: null,
      };
    }

    const find = (key) => sections.find((s) => s.key === key);

    return {
      narrative: {
        topics: find("TOPICS")?.content?.split(/,\s*/).map((t) => t.trim()).filter(Boolean) || [],
        drama: parseDramaFromText(sections),
        bans: parseBansFromText(sections),
        highlights: parseHighlightsFromText(sections),
        recap: find("RECAP")?.content || null,
        bestOfChat: find("BEST_OF_CHAT")?.content || null,
      },
      spotlights: {
        winner: parseSpotlightFromText("WINNER", sections),
        loser: parseSpotlightFromText("LOSER", sections),
        grinder: parseSpotlightFromText("GRINDER", sections),
        hotStreak: parseSpotlightFromText("HOTSTREAK", sections),
        coldStreak: parseSpotlightFromText("COLDSTREAK", sections),
        heroSlayer: parseSpotlightFromText("HEROSLAYER", sections),
      },
      powerRankings: parseRankingsFromText(sections),
      matchStats: parseMatchStatsFromText(sections, "MATCH_STATS"),
      heroMeta: parseMatchStatsFromText(sections, "HEROES"),
      newBlood: parseNewBloodFromText(sections),
      upsets: parseUpsetsFromText(sections),
      // Prefer JSON atSpotlight in editorial mode - text format lacks individual MMR/battleTags
      atSpotlight: weekly?.digestJson?.atSpotlight?.length
        ? weekly.digestJson.atSpotlight
        : parseATSpotlightFromText(sections),
      mentions: parseMentionsFromText(sections),
      weekTrend: parseWeekTrendFromText(sections),
      mostTalkedAbout: parseMostTalkedAboutFromText(sections),
    };
  }, [hasJSON, weekly, sections]);

  // Build knownNames Map from digestData
  const knownNames = useMemo(() => {
    const names = new Map();
    const d = digestData;

    // Spotlight battleTags
    for (const card of Object.values(d.spotlights)) {
      if (card?.battleTag) names.set(card.battleTag.split("#")[0], card.battleTag);
    }

    // Power rankings
    for (const r of d.powerRankings) {
      names.set(r.battleTag?.split("#")[0] || r.name, r.battleTag);
    }

    // New blood
    for (const p of d.newBlood) {
      names.set(p.battleTag.split("#")[0], p.battleTag);
    }

    // Match stats + hero meta
    for (const s of [...d.matchStats, ...d.heroMeta]) {
      names.set(s.battleTag.split("#")[0], s.battleTag);
    }

    // Upsets
    for (const u of d.upsets) {
      for (const p of [...u.underdogs, ...u.favorites]) {
        names.set(p.battleTag.split("#")[0], p.battleTag);
      }
    }

    // Drama quote speakers
    for (const item of d.narrative.drama) {
      for (const q of item.quotes || []) {
        if (q.speaker && q.speaker.length >= 2) names.set(q.speaker, q.speaker);
      }
    }

    // Mentions (overrides - most authoritative source)
    for (const [name, tag] of Object.entries(d.mentions)) {
      names.set(name, tag);
    }

    return names;
  }, [digestData]);

  return { digestData, knownNames, sections, hasJSON };
}
