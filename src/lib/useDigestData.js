import { useMemo } from "react";
import {
  parseDigestSections,
  parseMentions,
  parseStatLine,
  splitQuotes,
  getSpotlightExtras,
  buildStatBlurb,
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
function parseDramaFromText(sections) {
  const sec = sections.find((s) => s.key === "DRAMA");
  if (!sec) return [];
  const { summary, quotes: leadQuotes } = splitQuotes(sec.content);
  const cleaned = cleanSummary(summary);
  if (!cleaned) return [];
  return cleaned.split(/;\s*/).filter(Boolean).map((raw, idx) => {
    const trimmed = raw.trim();
    const item = { summary: trimmed, quotes: [] };
    if (idx === 0) {
      // Lead item quotes come from DRAMA_QUOTES or inline extraction
      const pipeSplit = trimmed.split(/\s*\|\s*/);
      if (pipeSplit.length > 1) {
        item.headline = pipeSplit[0];
        item.summary = pipeSplit.slice(1).join(" | ");
      }
      // Attach quotes: prefer DRAMA_QUOTES section, fall back to inline
      const quotesSec = sections.find((s) => s.key === "DRAMA_QUOTES");
      if (quotesSec) {
        item.quotes = [...quotesSec.content.matchAll(/"([^"]+)"/g)].map((m) => {
          const qm = m[1].match(/^(\w[\w\d!ǃ]*?):\s+(.+)$/);
          return qm ? { speaker: qm[1], text: qm[2] } : { speaker: null, text: m[1] };
        });
      } else {
        item.quotes = leadQuotes.map((q) => {
          const qm = q.match(/^(\w[\w\d!ǃ]*?):\s+(.+)$/);
          return qm ? { speaker: qm[1], text: qm[2] } : { speaker: null, text: q };
        });
      }
    }
    return item;
  });
}

/** Parse highlights from text into structured items */
function parseHighlightsFromText(sections) {
  const sec = sections.find((s) => s.key === "HIGHLIGHTS");
  if (!sec) return [];
  return sec.content.split(/;\s*/).filter(Boolean).map((raw) => {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const { summary, quotes: rawQuotes } = splitQuotes(trimmed);
    return {
      summary: cleanSummary(summary),
      quotes: rawQuotes.map((q) => {
        const qm = q.match(/^(\w[\w\d!ǃ]*?):\s+(.+)$/);
        return qm ? { speaker: qm[1], text: qm[2] } : { speaker: null, text: q };
      }),
    };
  }).filter(Boolean);
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
 * useDigestData — dual-path hook that returns normalized digest data.
 *
 * - Reader mode + `digestJson` available → use JSON directly (no parsing)
 * - Editorial mode OR no JSON → fall back to text parsing (existing behavior)
 *
 * @param {{ weekly: object, isEditorial: boolean, draft: string }} opts
 * @returns {object} Normalized digest data
 */
export default function useDigestData({ weekly, isEditorial, draft }) {
  // Text-path sections — always computed for editorial panel UI
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
      atSpotlight: parseATSpotlightFromText(sections),
      mentions: parseMentionsFromText(sections),
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

    // Mentions (overrides — most authoritative source)
    for (const [name, tag] of Object.entries(d.mentions)) {
      names.set(name, tag);
    }

    return names;
  }, [digestData]);

  return { digestData, knownNames, sections, hasJSON };
}
