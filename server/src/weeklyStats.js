/**
 * Every numeric section of a weekly issue, computed from data the relay
 * already stores. No model is involved: these are counts and sorts, and the
 * same week gives the same answer every time.
 *
 * The story half of an issue comes from storyCandidates.js and a person.
 * This is the other half, and it was the part with no path at all: the
 * Sep 2026 issues were built by hand with throwaway scripts because nothing
 * exposed this.
 *
 * Sections produced, all in the line-based `KEY: value` format that every
 * digest in the database already uses:
 *   WINNER LOSER GRINDER HOTSTREAK COLDSTREAK
 *   STREAK_SPECTRUM POWER_RANKINGS NEW_BLOOD AT_SPOTLIGHT
 *   HEROSLAYER (+ _HEROES _MAX _DISTRIBUTION)
 *   WEEK_TREND MENTIONS
 */

import {
  computeWeeklyMatchStats, computeStreakSpectrum,
  computeNewBlood, formatNewBloodLine,
  formatMmrLine, formatGrinderLine, formatWinStreakLine, formatLossStreakLine,
} from './digest.js';
import { getMatchPlayerScoresRange, getDailyMatchesRange, getMessagesInRange, getDailyPlayerStatsRange } from './db.js';

/** Rankings and spotlights need enough games to mean anything. */
export const RULES = {
  spotlightGames: 20,   // a week's net MMR on fewer is noise, same floor as the rankings
  rankingGames: 20,     // power rankings: +89 on ten games is not a rise
  streakFloor: 3,       // the spectrum only plots runs this long
  newBloodGames: 20,
  stackGames: 6,
};

const addDays = (day, n) => {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

const longestRun = (form, want) => {
  let best = 0;
  let cur = 0;
  for (const ch of String(form || '')) {
    cur = ch === want ? cur + 1 : 0;
    if (cur > best) best = cur;
  }
  return best;
};

/** The week's players, with their streaks worked out, ready to sort. */
function playersFrom(weeklyPlayerMap) {
  return [...weeklyPlayerMap.values()].map((p) => ({
    ...p,
    games: p.wins + p.losses,
    winStreak: longestRun(p.form, 'W'),
    lossStreak: longestRun(p.form, 'L'),
  }));
}

/**
 * The most hero kills anyone managed in a single game.
 *
 * This used to rank on the weekly total, which mostly measures who played
 * the most: Solana's 280 came from 162 games. A single-game number is a
 * feat, so there is no games floor and no skipping someone who already has
 * a card. The record is the record.
 */
export function heroSlayerFrom(weekStart, weekEnd, weeklyPlayerMap) {
  const rows = getMatchPlayerScoresRange(weekStart, weekEnd);
  if (rows.length === 0) return null;

  const kills = new Map();
  const games = new Map();
  const best = new Map();
  const all = new Map();      // kills per player-game, across everyone
  const mine = new Map();     // and for the leader alone

  for (const r of rows) {
    const k = r.heroes_killed || 0;
    kills.set(r.battle_tag, (kills.get(r.battle_tag) || 0) + k);
    games.set(r.battle_tag, (games.get(r.battle_tag) || 0) + 1);
    best.set(r.battle_tag, Math.max(best.get(r.battle_tag) || 0, k));
    all.set(k, (all.get(k) || 0) + 1);
  }

  // Ranked on the best single game, with the weekly total breaking ties
  const ranked = [...best.entries()]
    .filter(([, mx]) => mx > 0)
    .sort((a, b) => b[1] - a[1] || (kills.get(b[0]) || 0) - (kills.get(a[0]) || 0));
  if (ranked.length === 0) return null;
  const [tag] = ranked[0];
  const total = kills.get(tag) || 0;

  for (const r of rows) {
    if (r.battle_tag !== tag) continue;
    const k = r.heroes_killed || 0;
    mine.set(k, (mine.get(k) || 0) + 1);
  }

  // Which heroes they actually played, most used first
  const heroCount = new Map();
  for (const r of rows) {
    if (r.battle_tag !== tag || !r.heroes) continue;
    try {
      for (const h of JSON.parse(r.heroes) || []) {
        if (h?.icon) heroCount.set(h.icon, (heroCount.get(h.icon) || 0) + 1);
      }
    } catch { /* a row with unparseable heroes is not worth failing over */ }
  }

  // The game itself, which is the only context a single-game record needs
  let bestGame = null;
  for (const r of rows) {
    if (r.battle_tag !== tag || (r.heroes_killed || 0) !== best.get(tag)) continue;
    bestGame = { matchId: r.match_id, date: r.date, units: r.units_killed || 0 };
    break;
  }
  if (bestGame) {
    const match = getDailyMatchesRange(bestGame.date, bestGame.date)
      .find((m) => m.match_id === bestGame.matchId);
    if (match) {
      bestGame.map = (match.map_name || '').replace(/^\(\d+\)/, '').trim();
      const onTeamOne = String(match.team1_tags || '').split(',').includes(tag);
      bestGame.won = Boolean(match.team1_won) === onTeamOne;
      const theirs = onTeamOne ? match.team2_tags : match.team1_tags;
      bestGame.against = String(theirs || '').split(',').filter(Boolean);
    }
  }

  const wp = weeklyPlayerMap.get(tag);
  const hist = (m) => [...m.entries()].sort((a, b) => a[0] - b[0]).map(([k, n]) => `${k}=${n}`).join(',');

  return {
    battleTag: tag,
    kills: total,
    games: games.get(tag),
    max: best.get(tag),
    heroes: [...heroCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([icon]) => icon),
    wins: wp?.wins ?? 0,
    losses: wp?.losses ?? 0,
    race: wp?.race ?? null,
    distribution: `${hist(all)}|player:${hist(mine)}`,
    game: bestGame,
  };
}

/**
 * Games per day this week, and the player count of every week before it that
 * the archive covers, up to weeksBack. Five weeks showed a fall; four months
 * shows whether it is a fall or a slide, which is a different story. Weeks
 * with no data are skipped rather than drawn as zero.
 */
export function weekTrendFrom(weekStart, weekEnd, { weeksBack = 16 } = {}) {
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const rows = getDailyMatchesRange(addDays(weekStart, -7 * (weeksBack - 1)), weekEnd);
  if (rows.length === 0) return null;

  const perDay = new Map();
  for (const r of rows) perDay.set(r.date, (perDay.get(r.date) || 0) + 1);

  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(weekStart, i);
    days.push(`${DOW[new Date(`${d}T12:00:00Z`).getUTCDay()]}:${perDay.get(d) || 0}`);
  }

  const weeks = [];
  for (let w = weeksBack - 1; w >= 0; w--) {
    const start = addDays(weekStart, -7 * w);
    const end = addDays(start, 6);
    let games = 0;
    const players = new Set();
    for (const r of rows) {
      if (r.date < start || r.date > end) continue;
      games++;
      for (const key of ['team1_tags', 'team2_tags']) {
        for (const tag of String(r[key] || '').split(',')) {
          if (tag.trim()) players.add(tag.trim());
        }
      }
    }
    if (games > 0) weeks.push(`${start}:${games}/${players.size}`);
  }
  if (weeks.length === 0) return null;
  return `days=${days.join(',')}|weeks=${weeks.join(',')}`;
}

/**
 * A card's week, day by day, so the dots can be grouped and a streak can be
 * seen inside them. A flat run of 187 dots says nothing; the same games
 * split across seven days show when the week turned.
 *
 *   WINNER=Mon:WLW|Tue:LL|Wed:WWW
 */
function dailyFormLines(weekStart, weekEnd, cards) {
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const rows = getDailyPlayerStatsRange(weekStart, weekEnd);
  if (rows.length === 0) return {};
  const byTag = new Map();
  for (const r of rows) {
    if (!r.form) continue;
    if (!byTag.has(r.battle_tag)) byTag.set(r.battle_tag, []);
    byTag.get(r.battle_tag).push(r);
  }
  const daily = [];
  const mmr = [];
  for (const [key, stat] of Object.entries(cards)) {
    if (!stat?.battleTag) continue;
    const days = (byTag.get(stat.battleTag) || []).sort((a, b) => a.date.localeCompare(b.date));
    if (days.length > 0) {
      daily.push(`${key}=${days.map((d) => `${DOW[new Date(`${d.date}T12:00:00Z`).getUTCDay()]}:${d.form}`).join('|')}`);
      const last = days[days.length - 1];
      if (last.current_mmr > 0) mmr.push(`${key}=${last.current_mmr}`);
    }
  }
  const out = {};
  if (daily.length > 0) out.SPOTLIGHT_DAILY = daily.join(';');
  if (mmr.length > 0) out.SPOTLIGHT_MMR = mmr.join(',');
  return out;
}

/**
 * What the trend line actually says, in a sentence. A chart of five bars
 * shows a fall; it does not say how steep, how long, or whether anyone who
 * turns up is playing more to make up for it. That last number is the one
 * that separates "the ladder is quieter" from "the ladder is smaller".
 */
export function trendBlurb(trendLine) {
  const weeks = String(trendLine).split('|').find((p) => p.startsWith('weeks='));
  if (!weeks) return null;
  const rows = weeks.replace('weeks=', '').split(',').map((e) => {
    const [start, rest] = e.split(':');
    const [games, players] = String(rest || '').split('/');
    return { start, games: Number(games), players: Number(players) };
  }).filter((r) => r.players > 0);
  if (rows.length < 3) return null;

  const first = rows[0];
  const last = rows[rows.length - 1];
  const change = last.players - first.players;
  const pct = Math.round((change / first.players) * 100);
  const when = new Date(`${first.start}T12:00:00Z`)
    .toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

  // A run of consecutive falls reads differently from one bad week
  let falls = 0;
  for (let i = rows.length - 1; i > 0; i--) {
    if (rows[i].players < rows[i - 1].players) falls++;
    else break;
  }

  const perPlayer = (r) => (r.players > 0 ? (r.games * 8) / r.players : 0);
  const thenRate = perPlayer(first);
  const nowRate = perPlayer(last);

  const parts = [];
  parts.push(change < 0
    ? `${Math.abs(change)} fewer players than ${when}, down ${Math.abs(pct)}%.`
    : `${change} more players than ${when}, up ${pct}%.`);
  if (falls >= 2) parts.push(`${falls} weekly falls in a row.`);
  if (thenRate > 0 && Math.abs(nowRate - thenRate) / thenRate < 0.12) {
    parts.push(`Everyone who turns up still plays about ${Math.round(nowRate)} games a week, so the ladder is not getting keener, it is getting smaller.`);
  } else if (nowRate > thenRate) {
    parts.push(`The ones left are playing more, ${Math.round(thenRate)} games a week then against ${Math.round(nowRate)} now.`);
  }
  return parts.join(' ');
}

/**
 * Every numeric section for a week, as digest lines. Sections with nothing
 * to say are simply absent, which is what every reader of a digest already
 * expects.
 */
export async function weeklyStatSections(weekStart, weekEnd) {
  const { weeklyPlayerMap, uniquePlayers } = await computeWeeklyMatchStats(weekStart, weekEnd);
  // Its totalGames counts team rows, so it reads four times the real number
  const totalGames = getDailyMatchesRange(weekStart, weekEnd).length;
  const players = playersFrom(weeklyPlayerMap);
  const sections = {};
  const mentions = new Set();
  const note = (p) => { if (p?.battleTag) mentions.add(p.battleTag); };

  const active = players.filter((p) => p.games >= RULES.spotlightGames);
  let spoken = new Set();
  const cardPlayers = {};
  const line = (fn, p) => fn(p).replace(/^[A-Z_]+:\s*/, '').trim();

  if (active.length > 0) {
    const winner = active.reduce((a, b) => (b.mmrChange > a.mmrChange ? b : a));
    const loser = active.reduce((a, b) => (b.mmrChange < a.mmrChange ? b : a));
    const hot = active.reduce((a, b) => (b.winStreak > a.winStreak ? b : a));
    const cold = active.reduce((a, b) => (b.lossStreak > a.lossStreak ? b : a));
    // One player, one card. Without this the same name can take the winner,
    // the grinder and the hero slayer in the same issue.
    const taken = new Set([winner.battleTag, loser.battleTag, hot.battleTag, cold.battleTag]);
    const grinder = players
      .filter((p) => !taken.has(p.battleTag))
      .reduce((a, b) => (!a || b.games > a.games ? b : a), null);
    if (grinder) taken.add(grinder.battleTag);
    spoken = taken;

    sections.WINNER = line(formatMmrLine.bind(null, 'WINNER'), winner);
    sections.LOSER = line(formatMmrLine.bind(null, 'LOSER'), loser);
    if (grinder) sections.GRINDER = line(formatGrinderLine, grinder);
    if (hot.winStreak >= RULES.streakFloor) sections.HOTSTREAK = line(formatWinStreakLine, hot);
    if (cold.lossStreak >= RULES.streakFloor) sections.COLDSTREAK = line(formatLossStreakLine, cold);
    [winner, loser, grinder, hot, cold].filter(Boolean).forEach(note);
    Object.assign(cardPlayers, { WINNER: winner, LOSER: loser, GRINDER: grinder, HOTSTREAK: hot, COLDSTREAK: cold });

    const ranked = players.filter((p) => p.games >= RULES.rankingGames).sort((a, b) => b.mmrChange - a.mmrChange);
    if (ranked.length >= 4) {
      const top = ranked.slice(0, 5);
      const bottom = ranked.slice(-5).reverse();
      const rows = [...top, ...bottom];
      rows.forEach(note);
      sections.POWER_RANKINGS = rows
        .map((p, i) => `${i + 1}. ${p.battleTag} ${p.mmrChange > 0 ? '+' : ''}${Math.round(p.mmrChange)} MMR (${p.wins}W-${p.losses}L)`)
        .join('; ');
    }
  }

  const spectrum = computeStreakSpectrum(weeklyPlayerMap);
  if (spectrum) sections.STREAK_SPECTRUM = String(spectrum).replace(/^STREAK_SPECTRUM:\s*/, '').trim();

  try {
    const all = await computeNewBlood(weekStart, weekEnd);
    // computeNewBlood lets anyone through on 5 games or 2k MMR, which prints
    // "debuted at 0 MMR (2 games)". A debut is only a story with a week behind it.
    const fresh = (all || [])
      .filter((p) => (p.totalGames || 0) >= RULES.newBloodGames && (p.maxMmr || 0) > 0)
      .slice(0, 5);
    const nb = fresh.length > 0 && formatNewBloodLine(fresh);
    if (nb) {
      sections.NEW_BLOOD = String(nb).replace(/^NEW_BLOOD:\s*/, '').trim();
      for (const p of fresh) note(p);
    }
  } catch (err) {
    console.warn('[WeeklyStats] New blood failed:', err.message);
  }

  const slayer = heroSlayerFrom(weekStart, weekEnd, weeklyPlayerMap);
  if (slayer) {
    const RACES = { 0: 'RND', 1: 'HU', 2: 'ORC', 4: 'NE', 8: 'UD' };
    const race = RACES[slayer.race] ? `[${RACES[slayer.race]}]` : '';
    sections.HEROSLAYER = `${slayer.battleTag}${race} ${slayer.max} hero kills in a game (${slayer.wins}W-${slayer.losses}L)`;
    if (slayer.heroes.length > 0) sections.HEROSLAYER_HEROES = slayer.heroes.join(',');
    // The week's total, now the supporting fact rather than the headline
    sections.HEROSLAYER_TOTAL = `${slayer.kills} across ${slayer.games} games`;
    if (slayer.game?.map) {
      const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const day = DOW[new Date(`${slayer.game.date}T12:00:00Z`).getUTCDay()];
      const parts = [
        `${slayer.game.won ? 'won' : 'lost'} on ${slayer.game.map}`,
        day.toLowerCase(),
      ];
      if (slayer.game.units) parts.push(`${slayer.game.units} units killed`);
      sections.HEROSLAYER_GAME = `${parts.join(', ')}|${slayer.game.matchId}`;
    }
    cardPlayers.HEROSLAYER = { battleTag: slayer.battleTag };
    sections.HEROSLAYER_DISTRIBUTION = slayer.distribution;
    mentions.add(slayer.battleTag);
  }

  // After every card is chosen, the hero slayer included
  Object.assign(sections, dailyFormLines(weekStart, weekEnd, cardPlayers));

  const trend = weekTrendFrom(weekStart, weekEnd);
  if (trend) {
    sections.WEEK_TREND = trend;
    const blurb = trendBlurb(trend);
    if (blurb) sections.WEEK_TREND_BLURB = blurb;
  }

  if (mentions.size > 0) sections.MENTIONS = [...mentions].sort().join(',');

  const messages = getMessagesInRange(weekStart, weekEnd).length;
  const busiest = trend
    ? trend.split('|')[0].replace('days=', '').split(',')
      .map((d) => d.split(':')).reduce((a, b) => (Number(b[1]) > Number(a[1]) ? b : a))
    : null;

  return {
    sections,
    stats: {
      totalGames,
      totalPlayers: uniquePlayers,
      totalMessages: messages,
      ...(busiest ? { busiestDay: busiest[0], busiestDayGames: Number(busiest[1]) } : {}),
    },
  };
}
