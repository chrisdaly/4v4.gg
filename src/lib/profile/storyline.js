import { parseDigestSections, splitQuotes } from "../digestUtils";
import { issueNumber } from "../news/issueRules";

/**
 * The player profile's storyline layer (design handoff "Player profile"):
 * pure helpers over the season's matches and the digests. Thresholds live
 * here.
 */
export const PROFILE_RULES = {
  streakTag: 5, // active streak long enough for a header tag
  inactiveWeeks: 3, // shaded stretch on the activity-over-time chart
};

const isWin = (p) => p?.won === true || p?.won === 1;

/** The player's side of a match: { won, delta, endTime } or null when absent. */
export function playerMatchLite(match, battleTagLower) {
  for (const team of match?.teams || []) {
    const p = (team.players || []).find((x) => x.battleTag?.toLowerCase() === battleTagLower);
    if (p) {
      return {
        endTime: match.endTime,
        won: isWin(p),
        delta: (p.currentMmr || 0) - (p.oldMmr || 0),
        mapName: match.mapName,
      };
    }
  }
  return null;
}

/** The run of one result at the head of a newest-first list: { length, won }. */
export function activeStreak(lite) {
  const list = lite || [];
  if (list.length === 0) return { length: 0, won: null };
  const won = list[0].won;
  let n = 0;
  for (const m of list) {
    if (m.won !== won) break;
    n++;
  }
  return { length: n, won };
}

/** The longest run of wins in a list (any order; sorted oldest first inside). */
export function longestWinStreak(lite) {
  const chrono = [...(lite || [])].sort((a, b) => new Date(a.endTime) - new Date(b.endTime));
  let best = 0;
  let cur = 0;
  let bestEnd = null;
  for (const m of chrono) {
    if (m.won) {
      cur++;
      if (cur > best) {
        best = cur;
        bestEnd = m.endTime;
      }
    } else {
      cur = 0;
    }
  }
  return { length: best, endTime: bestEnd };
}

/**
 * Mentions of a player in the weekly issues: [{ week_start, issueNo,
 * section, snippet }], newest first, at most `limit`.
 */
export function weeklyMentions(weeklies, playerName, limit = 5) {
  if (!playerName) return [];
  const escaped = playerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const nameRe = new RegExp(`\\b${escaped}\\b`, "i");
  const skip = new Set(["MENTIONS", "TOPICS", "SPIKES", "POWER_RANKINGS", "STREAK_SPECTRUM"]);
  const out = [];
  for (const w of weeklies || []) {
    if (!w?.digest) continue;
    for (const s of parseDigestSections(w.digest)) {
      if (skip.has(s.key) || s.key.endsWith("_QUOTES") || s.key.endsWith("_BLURB") || s.key.startsWith("HEROSLAYER_")) continue;
      for (const item of s.content.split(/;\s*/)) {
        if (!item.trim() || !nameRe.test(item)) continue;
        const { summary } = splitQuotes(item.trim());
        let snippet = summary;
        if (s.key === "DRAMA") {
          const parts = summary.split(/\s*\|\s*/);
          snippet = parts.length > 1 ? parts[1] : parts[0];
        }
        snippet = snippet.replace(/\s{2,}/g, " ").trim();
        if (!snippet) continue;
        if (snippet.length > 140) snippet = `${snippet.slice(0, 137)}…`;
        out.push({ week_start: w.week_start, issueNo: issueNumber(weeklies, w.week_start), section: s.key, snippet });
        break;
      }
      if (out.length >= limit) return out;
    }
  }
  return out;
}

/** The latest issue that features the player, for the header tag. */
export function featuredIn(weeklies, playerName) {
  const [first] = weeklyMentions(weeklies, playerName, 1);
  return first ? { week_start: first.week_start, issueNo: first.issueNo, section: first.section } : null;
}

/* ── Activity over time ─────────────────────────────── */

const weekStartOf = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const dow = x.getDay() || 7;
  x.setDate(x.getDate() - (dow - 1));
  return x;
};

/**
 * Games per week from a { "YYYY-MM-DD": count } map, one entry per Monday
 * from the first week with games to the week of `now`: [{ start, count }].
 */
export function weeklyCounts(dayCounts, now = new Date()) {
  const days = Object.keys(dayCounts || {}).sort();
  if (days.length === 0) return [];
  const first = weekStartOf(`${days[0]}T12:00:00`);
  const last = weekStartOf(now);
  const weeks = [];
  for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 7)) {
    weeks.push({ start: new Date(d), count: 0 });
  }
  const index = new Map(weeks.map((w, i) => [w.start.getTime(), i]));
  for (const [day, n] of Object.entries(dayCounts)) {
    const i = index.get(weekStartOf(`${day}T12:00:00`).getTime());
    if (i != null) weeks[i].count += n;
  }
  return weeks;
}

/** Stretches of `minWeeks`+ consecutive empty weeks: [{ from, to, weeks }] (indices, inclusive). */
export function inactiveGaps(weeks, minWeeks = PROFILE_RULES.inactiveWeeks) {
  const gaps = [];
  let start = null;
  (weeks || []).forEach((w, i) => {
    if (w.count === 0) {
      if (start === null) start = i;
    } else if (start !== null) {
      if (i - start >= minWeeks) gaps.push({ from: start, to: i - 1, weeks: i - start });
      start = null;
    }
  });
  if (start !== null && weeks.length - start >= minWeeks) gaps.push({ from: start, to: weeks.length - 1, weeks: weeks.length - start });
  return gaps;
}

/** "away 11 weeks" / "away 1 year" for a gap. */
export function gapLabel(weeks) {
  if (weeks >= 52) {
    const years = Math.round(weeks / 52);
    return `away ${years} year${years > 1 ? "s" : ""}`;
  }
  if (weeks >= 9) return `away ${Math.round(weeks / 4.33)} months`;
  return `away ${weeks} weeks`;
}
