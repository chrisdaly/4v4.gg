import Anthropic from '@anthropic-ai/sdk';
import { getMessagesByDate, getDigest, setDigest, getRecentDigests, getWeeklyDigest, setWeeklyDigest, deleteDigest } from './db.js';
import config from './config.js';

const API_BASE = 'https://website-backend.w3champions.com/api';
const GATEWAY = 20;
const GAME_MODE = 4;

/**
 * Fetch all finished 4v4 matches for a given date and compute per-player stats.
 * Returns { winner, loser, grinder, streak, totalGames } or null.
 */
const RACE_NAMES = { 0: 'RND', 1: 'HU', 2: 'ORC', 4: 'NE', 8: 'UD' };

async function fetchDailyStats(date, chatterTags = null) {
  const dateStart = new Date(`${date}T00:00:00Z`);
  const dateEnd = new Date(`${date}T23:59:59.999Z`);
  const chatterSet = chatterTags ? new Set(chatterTags.map(t => t.toLowerCase())) : null;

  const playerStats = new Map();
  const rawMatches = [];
  let offset = 0;
  const pageSize = 100;
  let done = false;

  while (!done) {
    let data;
    try {
      const url = `${API_BASE}/matches?offset=${offset}&gateway=${GATEWAY}&pageSize=${pageSize}&gameMode=${GAME_MODE}&map=Overall`;
      const res = await fetch(url);
      if (!res.ok) break;
      data = await res.json();
    } catch {
      break;
    }

    const matches = data.matches || [];
    if (matches.length === 0) break;

    for (const match of matches) {
      const endTime = new Date(match.endTime);

      if (endTime > dateEnd) continue;
      if (endTime < dateStart) {
        done = true;
        break;
      }

      // Collect raw match for context
      if (chatterSet) {
        const allPlayers = (match.teams || []).flatMap(t => t.players || []);
        const hasChatters = allPlayers.some(p => p.battleTag && chatterSet.has(p.battleTag.toLowerCase()));
        if (hasChatters && rawMatches.length < 30) {
          rawMatches.push(match);
        }
      }

      for (const team of match.teams || []) {
        for (const player of team.players || []) {
          if (!player.battleTag) continue;
          const tag = player.battleTag;
          const change = (player.currentMmr || 0) - (player.oldMmr || 0);

          if (!playerStats.has(tag)) {
            playerStats.set(tag, {
              mmrChange: 0, wins: 0, losses: 0,
              name: tag.split('#')[0], battleTag: tag,
              results: [], currentMmr: 0,
            });
          }
          const stats = playerStats.get(tag);
          stats.mmrChange += change;
          stats.currentMmr = Math.max(stats.currentMmr, player.currentMmr || 0);
          if (player.won) stats.wins++;
          else stats.losses++;
          stats.results.push({ won: !!player.won, time: endTime.getTime() });
        }
      }
    }

    offset += pageSize;
    if (offset > 500) break;
  }

  if (playerStats.size === 0) return null;

  // Sort each player's results chronologically and compute form + streak
  for (const stats of playerStats.values()) {
    stats.results.sort((a, b) => a.time - b.time);
    stats.form = stats.results.map(r => r.won ? 'W' : 'L').join('');

    // Track win and loss streaks separately
    let winStreak = 0, maxWinStreak = 0;
    let lossStreak = 0, maxLossStreak = 0;
    for (const r of stats.results) {
      if (r.won) {
        winStreak++;
        lossStreak = 0;
        if (winStreak > maxWinStreak) maxWinStreak = winStreak;
      } else {
        lossStreak++;
        winStreak = 0;
        if (lossStreak > maxLossStreak) maxLossStreak = lossStreak;
      }
    }
    stats.winStreak = maxWinStreak;
    stats.lossStreak = maxLossStreak;
  }

  // Require at least 3 games to qualify
  const qualified = [...playerStats.values()].filter(p => p.wins + p.losses >= 3);
  if (qualified.length === 0) return null;

  // Biggest MMR winner/loser
  const byMmr = [...qualified].sort((a, b) => b.mmrChange - a.mmrChange);
  const winner = byMmr[0]?.mmrChange > 0 ? byMmr[0] : null;
  const loser = byMmr[byMmr.length - 1]?.mmrChange < 0 ? byMmr[byMmr.length - 1] : null;

  // Most games played
  const byGames = [...qualified].sort((a, b) => (b.wins + b.losses) - (a.wins + a.losses));
  const grinder = byGames[0];

  // Longest win streak (min 4)
  const byWinStreak = [...qualified].filter(p => p.winStreak >= 4).sort((a, b) => b.winStreak - a.winStreak);
  const hotStreak = byWinStreak[0] || null;

  // Longest loss streak (min 4)
  const byLossStreak = [...qualified].filter(p => p.lossStreak >= 4).sort((a, b) => b.lossStreak - a.lossStreak);
  const coldStreak = byLossStreak[0] || null;

  // Don't show grinder if it's the same as winner
  const grinderDeduped = grinder && grinder.battleTag !== winner?.battleTag && grinder.battleTag !== loser?.battleTag
    ? grinder : null;

  // Deduplicate streaks
  const usedTags = new Set([winner?.battleTag, loser?.battleTag, grinderDeduped?.battleTag].filter(Boolean));
  const hotDeduped = hotStreak && !usedTags.has(hotStreak.battleTag) ? hotStreak : null;
  const coldDeduped = coldStreak && !usedTags.has(coldStreak.battleTag) ? coldStreak : null;

  const totalGames = [...playerStats.values()].reduce((sum, p) => sum + p.wins, 0);

  // Format match summaries for AI context
  const matchSummaries = rawMatches.slice(0, 20).map(m => {
    const teams = (m.teams || []).map(t => {
      const players = (t.players || []).map(p => {
        const race = RACE_NAMES[p.race] || '?';
        const name = p.battleTag?.split('#')[0] || '?';
        const mmr = p.currentMmr || p.oldMmr || 0;
        return `${name}(${race}${mmr > 0 ? ',' + mmr : ''})`;
      });
      return { players, won: t.players?.[0]?.won };
    });
    const mapName = m.mapName || m.map || '?';
    if (teams.length === 2) {
      const w = teams[0].won ? 'W' : 'L';
      return `${teams[0].players.join(',')} vs ${teams[1].players.join(',')} on ${mapName} [Team1:${w}]`;
    }
    return null;
  }).filter(Boolean);

  // Build name→MMR lookup for all players seen today
  const playerMmrs = new Map();
  for (const p of playerStats.values()) {
    if (p.currentMmr > 0) playerMmrs.set(p.name, p.currentMmr);
  }

  return { winner, loser, grinder: grinderDeduped, hotStreak: hotDeduped, coldStreak: coldDeduped, totalGames, matchSummaries, playerMmrs };
}

/**
 * Format: "LABEL: Tag#1234 HEADLINE (XW-YL) FORM"
 */
function formatMmrLine(label, player) {
  const sign = player.mmrChange > 0 ? '+' : '';
  return `${label}: ${player.battleTag} ${sign}${Math.round(player.mmrChange)} MMR (${player.wins}W-${player.losses}L) ${player.form}`;
}

function formatGrinderLine(player) {
  const total = player.wins + player.losses;
  return `GRINDER: ${player.battleTag} ${total} games (${player.wins}W-${player.losses}L) ${player.form}`;
}

function formatWinStreakLine(player) {
  return `HOTSTREAK: ${player.battleTag} ${player.winStreak}W streak (${player.wins}W-${player.losses}L) ${player.form}`;
}

function formatLossStreakLine(player) {
  return `COLDSTREAK: ${player.battleTag} ${player.lossStreak}L streak (${player.wins}W-${player.losses}L) ${player.form}`;
}

export { fetchDailyStats };

/**
 * Build the AI prompt with chat log + optional match context.
 */
function buildDigestPrompt(messages, matchSummaries, soFar = false, playerMmrs = null) {
  const log = messages.map(m => `[${m.user_name}]: ${m.message}`).join('\n');
  const names = [...new Set(messages.map(m => m.user_name).filter(Boolean))];

  // Build high-MMR chatter list: chatters who played today sorted by MMR
  let mmrContext = '';
  if (playerMmrs && playerMmrs.size > 0) {
    const chatterMmrs = names
      .map(n => ({ name: n, mmr: playerMmrs.get(n) || 0 }))
      .filter(p => p.mmr >= 1500)
      .sort((a, b) => b.mmr - a.mmr);
    if (chatterMmrs.length > 0) {
      mmrContext = `\n\nPlayer MMR rankings (higher = more notable, prioritize these players in DRAMA):\n${chatterMmrs.map(p => `${p.name}: ${p.mmr} MMR`).join(', ')}\n`;
    }
  }

  let matchContext = '';
  if (matchSummaries && matchSummaries.length > 0) {
    matchContext = `\n\nRecent 4v4 games involving these chatters (use to add context to drama — who was on whose team, who won/lost):\n${matchSummaries.join('\n')}\n`;
  }

  return `Summarize this Warcraft III 4v4 chat room's day${soFar ? ' SO FAR' : ''}. Write a SHORT digest with these sections (skip if nothing fits):

TOPICS: 2-5 comma-separated keywords (e.g., "balance patch, undead meta, map pool, tower rush")
DRAMA: Only BIG accusations, threats, or heated personal attacks. Max 4 items separated by semicolons. FORMAT IS CRITICAL: first a short summary (max 10 words, NO quoted text anywhere in it), then the direct quotes at the END. The summary must make perfect grammatical sense with zero quotes. NEVER put a "quoted phrase" in the middle of a sentence. WRONG: "PlayerA's \"trash\" strategy of expos". RIGHT: "PlayerA went all-in on expos \"trash strat\" \"absolute garbage\"". Example: "PlayerA ripped into PlayerB all game \"you are garbage\" \"uninstall\""
BANS: Who got banned, duration, reason (skip if none); semicolon-separated. Include the match ID if mentioned.
HIGHLIGHTS: Funniest in-game moments, best burns, or absurd chat moments (1-2 items, semicolon-separated). Must be about gameplay or player interactions. No hardware, IRL equipment, queue times, or mundane stuff.

Rules:
- No title, no date header, jump straight into TOPICS:
- TOPICS must be short comma-separated tags, not sentences
- CRITICAL: Use EXACT player names as they appear in the chat log. Never shorten or abbreviate names. The player list is: ${names.join(', ')}
- Prioritize high-MMR players (1800+), their drama is more interesting
- DRAMA summaries must be under 10 words with NO quoted text in them. All "quoted text" goes at the END of the item only. No filler like "engaged in", "exchanged", "calling him", "told him". The quotes speak for themselves.
- Write like a tabloid reporter. Short punchy sentences. No em-dashes. No AI-speak.
- Foreign language drama is GOLD. If someone posts threats or insults in Chinese/Korean/etc and another player translates it, that is top-tier content. Always include it. Use the English translation as the quote. If no translation exists in chat, translate it yourself. Always quote in English.
- BANS and DRAMA must not overlap — if someone got banned, put it in BANS only, not in DRAMA
- State facts only, no commentary (no "classic", "brutal", "chaos", etc)
- ASCII only
- DRAMA max 4 items, HIGHLIGHTS max 2 items, BANS max 2 items
- Total under 900 chars
${mmrContext}${matchContext}
Chat log (${messages.length} messages):
${log}`;
}

/**
 * Core digest assembly: AI summary + stat lines + mentions.
 */
async function assembleDigest(date, messages, soFar = false) {
  if (!config.ANTHROPIC_API_KEY) return null;
  if (messages.length < 10) return null;

  const chatTags = [...new Set(messages.map(m => m.battle_tag).filter(Boolean))];

  // Fetch game stats first (need match context for AI prompt)
  const dailyStats = await fetchDailyStats(date, chatTags).catch(err => {
    console.warn(`[Digest] Failed to fetch daily stats for ${date}:`, err.message);
    return null;
  });

  // Generate AI digest with match context (retry with fallback models)
  const prompt = buildDigestPrompt(messages, dailyStats?.matchSummaries || [], soFar, dailyStats?.playerMmrs || null);
  const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
  const models = ['claude-haiku-4-5-20251001', 'claude-sonnet-4-5-20250929'];
  const maxRetries = 3;
  let aiText = null;

  for (const model of models) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const msg = await client.messages.create({
          model,
          max_tokens: 700,
          messages: [{ role: 'user', content: prompt }],
        });
        aiText = msg.content[0]?.text?.trim() || null;
        if (aiText) break;
      } catch (err) {
        const status = err?.status || err?.error?.status || '';
        console.warn(`[Digest] ${model} attempt ${attempt}/${maxRetries} failed (${status}): ${err.message}`);
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
        }
      }
    }
    if (aiText) break;
    console.warn(`[Digest] All retries exhausted for ${model}, trying next model`);
  }

  if (!aiText) return null;

  const parts = [aiText];
  if (dailyStats?.winner) parts.push(formatMmrLine('WINNER', dailyStats.winner));
  if (dailyStats?.loser) parts.push(formatMmrLine('LOSER', dailyStats.loser));
  if (dailyStats?.grinder) parts.push(formatGrinderLine(dailyStats.grinder));
  if (dailyStats?.hotStreak) parts.push(formatWinStreakLine(dailyStats.hotStreak));
  if (dailyStats?.coldStreak) parts.push(formatLossStreakLine(dailyStats.coldStreak));
  if (chatTags.length > 0) parts.push(`MENTIONS: ${chatTags.join(',')}`);

  return { digest: parts.join('\n'), totalGames: dailyStats?.totalGames || 0, messageCount: messages.length };
}

/**
 * Generate a live digest for a date (no DB caching). Used for "today so far".
 */
export async function generateLiveDigest(date) {
  const messages = getMessagesByDate(date);
  const result = await assembleDigest(date, messages, true);
  if (!result) return null;
  console.log(`[Digest] Live digest for ${date} (${result.messageCount} messages, ${result.totalGames} games)`);
  return result.digest;
}

export async function generateDigest(date) {
  // Return cached if exists
  const existing = getDigest(date);
  if (existing) return existing.digest;

  const messages = getMessagesByDate(date);
  const result = await assembleDigest(date, messages, false);
  if (!result) return null;

  setDigest(date, result.digest);
  console.log(`[Digest] Generated for ${date} (${result.messageCount} messages, ${result.totalGames} games)`);
  return result.digest;
}

/* ── Weekly digest generation ────────────────────── */

const STAT_LINE_RE = /^(WINNER|LOSER|GRINDER|HOTSTREAK|COLDSTREAK):\s*(.+)$/gm;

function parseWeeklyStatLines(digestTexts) {
  // Accumulate per-player stats across all daily digests
  const players = new Map();

  for (const text of digestTexts) {
    for (const match of text.matchAll(STAT_LINE_RE)) {
      const type = match[1];
      const content = match[2];
      // Parse "Tag#1234 +42 MMR (5W-2L) WWLWW" or "Tag#1234 8 games (5W-3L) WLWLWLWW"
      const statMatch = content.match(/^(.+?#\d+)\s+(.+?)\s+\((\d+)W-(\d+)L\)/);
      if (!statMatch) continue;
      const tag = statMatch[1];
      const headline = statMatch[2];
      const wins = parseInt(statMatch[3]);
      const losses = parseInt(statMatch[4]);

      if (!players.has(tag)) {
        players.set(tag, { battleTag: tag, name: tag.split('#')[0], mmrChange: 0, wins: 0, losses: 0, games: 0, bestWinStreak: 0, worstLossStreak: 0 });
      }
      const p = players.get(tag);
      p.wins += wins;
      p.losses += losses;
      p.games += wins + losses;

      if (type === 'WINNER' || type === 'LOSER') {
        const mmrMatch = headline.match(/([+-]?\d+)\s*MMR/);
        if (mmrMatch) p.mmrChange += parseInt(mmrMatch[1]);
      }
      if (type === 'HOTSTREAK') {
        const streakMatch = headline.match(/(\d+)W/);
        if (streakMatch) p.bestWinStreak = Math.max(p.bestWinStreak, parseInt(streakMatch[1]));
      }
      if (type === 'COLDSTREAK') {
        const streakMatch = headline.match(/(\d+)L/);
        if (streakMatch) p.worstLossStreak = Math.max(p.worstLossStreak, parseInt(streakMatch[1]));
      }
    }
  }

  return players;
}

function buildWeeklyPrompt(dailyDigests, aggregateStats) {
  const dailyTexts = dailyDigests.map((d, i) => {
    const dayLabel = new Date(d.date + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'long' });
    // Strip stat lines for AI (they get re-aggregated)
    const textOnly = d.digest.replace(STAT_LINE_RE, '').replace(/^MENTIONS:.*$/gm, '').trim();
    return `--- ${dayLabel} (${d.date}) ---\n${textOnly}`;
  }).join('\n\n');

  return `Summarize this week's Warcraft III 4v4 activity from ${dailyDigests.length} daily digests into a WEEKLY recap. Write a SHORT digest with these sections (skip if nothing fits):

TOPICS: 3-6 comma-separated keywords capturing the week's themes
DRAMA: The BIGGEST 2-3 drama stories of the week, semicolon-separated. Combine related daily items into one story. FORMAT: short summary (max 10 words, no quoted text), then quotes at the END only.
BANS: Notable bans this week (skip if none); semicolon-separated
HIGHLIGHTS: Best 1-2 moments of the entire week, semicolon-separated
RECAP: 2-3 sentence narrative summary of the week's overall vibe and notable trends

Rules:
- No title, no date header, jump straight into TOPICS:
- TOPICS must be short comma-separated tags, not sentences
- Use EXACT player names from the daily digests. Never abbreviate.
- RECAP should read like a sports columnist wrapping up the week
- Write like a tabloid reporter. Short punchy sentences. No em-dashes. No AI-speak.
- ASCII only
- DRAMA max 3 items, HIGHLIGHTS max 2 items, BANS max 2 items
- Total under 1200 chars

${aggregateStats}

Daily digests (${dailyDigests.length} days):
${dailyTexts}`;
}

export async function generateWeeklyDigest(weekStart) {
  // Return cached if exists
  const existing = getWeeklyDigest(weekStart);
  if (existing) return existing.digest;

  if (!config.ANTHROPIC_API_KEY) return null;

  // weekStart must be a Monday YYYY-MM-DD
  const startDate = new Date(weekStart + 'T12:00:00Z');
  if (startDate.getUTCDay() !== 1) return null; // Not a Monday

  // Compute week end (Sunday)
  const endDate = new Date(startDate);
  endDate.setUTCDate(endDate.getUTCDate() + 6);
  const weekEnd = endDate.toISOString().slice(0, 10);

  // Collect daily digests for this week
  const dailyDigests = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate);
    d.setUTCDate(d.getUTCDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    const digest = getDigest(dateStr);
    if (digest) dailyDigests.push(digest);
  }

  // Require minimum 3 daily digests
  if (dailyDigests.length < 3) {
    console.log(`[Weekly] Only ${dailyDigests.length} daily digests for week of ${weekStart}, need 3+`);
    return null;
  }

  // Parse aggregate stats from daily stat lines
  const digestTexts = dailyDigests.map(d => d.digest);
  const playerMap = parseWeeklyStatLines(digestTexts);

  // Pick weekly winners
  const qualified = [...playerMap.values()].filter(p => p.games >= 3);
  const byMmr = [...qualified].sort((a, b) => b.mmrChange - a.mmrChange);
  const weeklyWinner = byMmr[0]?.mmrChange > 0 ? byMmr[0] : null;
  const weeklyLoser = byMmr[byMmr.length - 1]?.mmrChange < 0 ? byMmr[byMmr.length - 1] : null;
  const byGames = [...qualified].sort((a, b) => b.games - a.games);
  const usedTags = new Set([weeklyWinner?.battleTag, weeklyLoser?.battleTag].filter(Boolean));
  const weeklyGrinder = byGames[0] && !usedTags.has(byGames[0].battleTag) ? byGames[0] : null;

  let aggregateText = `\nAggregate stats for the week (${dailyDigests.length} days):`;
  if (weeklyWinner) aggregateText += `\nTop MMR gainer: ${weeklyWinner.name} (+${weeklyWinner.mmrChange} MMR, ${weeklyWinner.games} games)`;
  if (weeklyLoser) aggregateText += `\nBiggest MMR loss: ${weeklyLoser.name} (${weeklyLoser.mmrChange} MMR, ${weeklyLoser.games} games)`;
  if (weeklyGrinder) aggregateText += `\nMost active: ${weeklyGrinder.name} (${weeklyGrinder.games} games)`;

  // Busiest day
  const dayCounts = dailyDigests.map(d => {
    const text = d.digest;
    const gamesMatch = text.match(/(\d+)\s*games/i);
    return { date: d.date, games: gamesMatch ? parseInt(gamesMatch[1]) : 0 };
  }).sort((a, b) => b.games - a.games);
  if (dayCounts[0]?.games > 0) {
    const dayName = new Date(dayCounts[0].date + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'long' });
    aggregateText += `\nBusiest day: ${dayName} (${dayCounts[0].games} games)`;
  }

  const prompt = buildWeeklyPrompt(dailyDigests, aggregateText);

  // Call AI (same retry pattern as daily)
  const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
  const models = ['claude-haiku-4-5-20251001', 'claude-sonnet-4-5-20250929'];
  const maxRetries = 3;
  let aiText = null;

  for (const model of models) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const msg = await client.messages.create({
          model,
          max_tokens: 900,
          messages: [{ role: 'user', content: prompt }],
        });
        aiText = msg.content[0]?.text?.trim() || null;
        if (aiText) break;
      } catch (err) {
        const status = err?.status || err?.error?.status || '';
        console.warn(`[Weekly] ${model} attempt ${attempt}/${maxRetries} failed (${status}): ${err.message}`);
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
        }
      }
    }
    if (aiText) break;
    console.warn(`[Weekly] All retries exhausted for ${model}, trying next model`);
  }

  if (!aiText) return null;

  // Append weekly stat lines (same format as daily, reuses parseStatLine on frontend)
  const parts = [aiText];
  if (weeklyWinner) {
    const sign = weeklyWinner.mmrChange > 0 ? '+' : '';
    parts.push(`WINNER: ${weeklyWinner.battleTag} ${sign}${Math.round(weeklyWinner.mmrChange)} MMR (${weeklyWinner.wins}W-${weeklyWinner.losses}L)`);
  }
  if (weeklyLoser) {
    const sign = weeklyLoser.mmrChange > 0 ? '+' : '';
    parts.push(`LOSER: ${weeklyLoser.battleTag} ${sign}${Math.round(weeklyLoser.mmrChange)} MMR (${weeklyLoser.wins}W-${weeklyLoser.losses}L)`);
  }
  if (weeklyGrinder) {
    parts.push(`GRINDER: ${weeklyGrinder.battleTag} ${weeklyGrinder.games} games (${weeklyGrinder.wins}W-${weeklyGrinder.losses}L)`);
  }

  const digest = parts.join('\n');
  setWeeklyDigest(weekStart, weekEnd, digest);
  console.log(`[Weekly] Generated for ${weekStart} to ${weekEnd} (${dailyDigests.length} daily digests)`);
  return digest;
}

/* ── Scheduled digest generation ─────────────────── */

// Shared cache for today's live digest (used by both scheduler and route)
// Using a container object so mutations are visible across ES module imports
export const todayDigestCache = { data: null, expires: 0 };

export function setTodayDigestCache(data, ttlMs = 5 * 60 * 1000) {
  todayDigestCache.data = data;
  todayDigestCache.expires = Date.now() + ttlMs;
}

const TWO_HOURS = 2 * 60 * 60 * 1000;

async function refreshTodayDigest() {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const digest = await generateLiveDigest(today);
    if (digest) {
      setTodayDigestCache({ date: today, digest }, TWO_HOURS);
      console.log(`[Scheduler] Refreshed today's digest`);
    }
  } catch (err) {
    console.error('[Scheduler] Failed to refresh today digest:', err.message);
  }
}

async function finalizeYesterday() {
  try {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const existing = getDigest(yesterday);
    if (existing) {
      // Delete and regenerate to get final version
      deleteDigest(yesterday);
    }
    const digest = await generateDigest(yesterday);
    if (digest) {
      console.log(`[Scheduler] Finalized yesterday's digest (${yesterday})`);
    }
  } catch (err) {
    console.error('[Scheduler] Failed to finalize yesterday:', err.message);
  }
}

async function finalizeLastWeek() {
  try {
    // Find last Monday: go back from today until we hit a Monday
    const now = new Date();
    const today = now.getUTCDay(); // 0=Sun, 1=Mon
    // Days since last Monday (if today is Monday, go back 7 days to get LAST week's Monday)
    const daysSinceMonday = today === 1 ? 7 : ((today + 6) % 7);
    const lastMonday = new Date(now);
    lastMonday.setUTCDate(lastMonday.getUTCDate() - daysSinceMonday);
    const weekStart = lastMonday.toISOString().slice(0, 10);

    const existing = getWeeklyDigest(weekStart);
    if (existing) return; // Already finalized

    const digest = await generateWeeklyDigest(weekStart);
    if (digest) {
      console.log(`[Scheduler] Finalized weekly digest for week of ${weekStart}`);
    }
  } catch (err) {
    console.error('[Scheduler] Failed to finalize weekly digest:', err.message);
  }
}

export function startScheduler() {
  if (!config.ANTHROPIC_API_KEY) {
    console.log('[Scheduler] No API key, skipping digest scheduler');
    return;
  }

  // Refresh today's digest every 2 hours
  setInterval(refreshTodayDigest, TWO_HOURS);

  // Check for midnight every minute, finalize yesterday once
  // Check for 01:00 UTC on Monday, finalize last week once
  let lastFinalizedDate = '';
  let lastFinalizedWeek = '';
  setInterval(() => {
    const now = new Date();
    const hour = now.getUTCHours();
    const todayStr = now.toISOString().slice(0, 10);
    // Run between 00:00-00:05 UTC, once per day
    if (hour === 0 && todayStr !== lastFinalizedDate) {
      lastFinalizedDate = todayStr;
      finalizeYesterday();
    }
    // Run at 01:00 UTC on Mondays, once per week
    if (hour === 1 && now.getUTCDay() === 1 && todayStr !== lastFinalizedWeek) {
      lastFinalizedWeek = todayStr;
      finalizeLastWeek();
    }
  }, 60 * 1000);

  // Initial refresh after 30s startup delay
  setTimeout(refreshTodayDigest, 30 * 1000);

  console.log('[Scheduler] Digest scheduler started (every 2h + midnight finalize + Monday weekly)');
}
