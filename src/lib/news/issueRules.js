import { extractHeadline, extractTeaser, formatWeekRange } from "../digestUtils";

/**
 * A weekly issue shows a section only when there is a story (design handoff
 * "News pages"): every threshold lives here. A section below its line is
 * left out entirely; the editorial view lists what was left out and why.
 */
export const SECTION_RULES = {
  spotlightStreak: 10, // longest run of wins or losses in the week
  spotlightNet: 120, // |net MMR| over the week
  spotlightGames: 150, // games played in the week
  streakDistributionMax: 8, // longest streak of anyone, for the distribution
  newBloodGames: 20, // first-week players
  stackGames: 6, // arranged teams: games together
  returningMonths: 3, // back after a break
};

/** The longest run of one result in a form string ("WWLW..."): { length, result }. */
export function longestRun(form) {
  const f = String(form || "");
  let best = { length: 0, result: null };
  let i = 0;
  while (i < f.length) {
    let j = i;
    while (j < f.length && f[j] === f[i]) j++;
    if (j - i > best.length) best = { length: j - i, result: f[i] };
    i = j;
  }
  return best;
}

const sign = (v) => `${v > 0 ? "+" : v < 0 ? "-" : ""}${Math.abs(Math.round(v))}`;

/**
 * Whether a spotlight card (winner, loser, grinder, streaks, hero slayer)
 * has a story: a streak of 10+, ±120 MMR, or 150+ games. The hero slayer
 * is a kill count, not a form, so it always passes. Returns { pass, reason }.
 */
export function spotlightVerdict(card, key) {
  if (!card) return { pass: false, reason: "no data" };
  if (key === "HEROSLAYER") return { pass: true, reason: "hero kills" };
  const streak = Math.max(card.streakLength || card.streakLen || 0, longestRun(card.form).length);
  const net = card.mmrChange ?? 0;
  const games = (card.wins || 0) + (card.losses || 0);
  const pass =
    streak >= SECTION_RULES.spotlightStreak ||
    Math.abs(net) >= SECTION_RULES.spotlightNet ||
    games >= SECTION_RULES.spotlightGames;
  const reason = `longest ${streak}, ${sign(net)} MMR, ${games} games (needs ${SECTION_RULES.spotlightStreak}+ streak, ±${SECTION_RULES.spotlightNet} MMR or ${SECTION_RULES.spotlightGames}+ games)`;
  return { pass, reason };
}

/** The streak distribution shows once someone's longest streak reaches 8. */
export function streakDistributionVerdict(spectrum) {
  if (!spectrum) return { pass: false, reason: "no streak data" };
  const lens = [...(spectrum.win || []), ...(spectrum.loss || [])].map((e) => e.len).filter((n) => Number.isFinite(n));
  const longest = lens.length ? Math.max(...lens) : 0;
  const pass = longest >= SECTION_RULES.streakDistributionMax;
  return { pass, reason: pass ? `longest streak ${longest}` : `longest streak only ${longest} (needs ${SECTION_RULES.streakDistributionMax})` };
}

export const newBloodPasses = (p) => (p?.games || 0) >= SECTION_RULES.newBloodGames;
export const stackPasses = (s) => ((s?.wins || 0) + (s?.losses || 0)) >= SECTION_RULES.stackGames;

/* ── Issues ───────────────────────────────────────────── */

/** Issue number for a week: 1 for the oldest published week, counting up. */
export function issueNumber(weeklies, weekStart) {
  const list = (weeklies || []).map((w) => w.week_start).sort();
  const idx = list.indexOf(weekStart);
  return idx === -1 ? null : idx + 1;
}

/** The issue's title: the DRAMA headline, else the week range. */
export function issueTitle(weekly) {
  const headline = weekly?.digest ? extractHeadline(weekly.digest) : "";
  return headline || (weekly ? formatWeekRange(weekly.week_start, weekly.week_end) : "");
}

/** "MAR 23 – 29, 2026" style date range for covers. */
export function issueDateRange(weekly) {
  if (!weekly?.week_start) return "";
  const s = new Date(`${weekly.week_start}T12:00:00`);
  const e = new Date(`${weekly.week_end || weekly.week_start}T12:00:00`);
  const mon = (d) => d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  const range = s.getMonth() === e.getMonth() ? `${mon(s)} ${s.getDate()} – ${e.getDate()}` : `${mon(s)} ${s.getDate()} – ${mon(e)} ${e.getDate()}`;
  return `${range}, ${e.getFullYear()}`;
}

/** The older and newer issue around `weekStart` in a newest-first list. */
export function neighbourIssues(weeklies, weekStart) {
  const list = weeklies || [];
  const idx = list.findIndex((w) => w.week_start === weekStart);
  if (idx === -1) return { prev: null, next: null };
  return { prev: list[idx + 1] || null, next: list[idx - 1] || null };
}

/* ── Day by day ───────────────────────────────────────── */

/** The week's daily digests as one-liners: [{ date, dow, label, text }], oldest first. */
export function dayByDay(dailies, weekStart, weekEnd) {
  if (!weekStart) return [];
  return (dailies || [])
    .filter((d) => d?.date && d.date >= weekStart && d.date <= (weekEnd || weekStart) && d.digest)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => {
      const day = new Date(`${d.date}T12:00:00`);
      return {
        date: d.date,
        dow: day.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase(),
        label: day.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        text: extractTeaser(d.digest),
      };
    })
    .filter((d) => d.text);
}

/* ── Key numbers ──────────────────────────────────────── */

/**
 * The lede's key numbers: the week at a glance. Deliberately not the
 * streak lengths or the upset count, which already have their own cards
 * further down the issue. Needs at least two to be worth showing.
 */
export function keyNumbers({ weekly }) {
  const stats = typeof weekly?.stats === "string" ? safeJson(weekly.stats) : weekly?.stats;
  if (!stats) return [];
  const n = (v) => Number(v) || 0;
  const out = [];
  if (n(stats.totalGames)) out.push({ value: n(stats.totalGames).toLocaleString("en-US"), label: "GAMES PLAYED", tone: "white" });
  if (n(stats.totalPlayers)) out.push({ value: n(stats.totalPlayers).toLocaleString("en-US"), label: "PLAYERS", tone: "white" });
  if (n(stats.totalMessages)) out.push({ value: n(stats.totalMessages).toLocaleString("en-US"), label: "CHAT MESSAGES", tone: "white" });
  if (n(stats.busiestDayGames)) out.push({ value: n(stats.busiestDayGames).toLocaleString("en-US"), label: `BUSIEST DAY, ${String(stats.busiestDay || "").toUpperCase()}`, tone: "gold" });
  return out.slice(0, 4);
}

function safeJson(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
