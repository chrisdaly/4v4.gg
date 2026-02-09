import Anthropic from '@anthropic-ai/sdk';
import { getMessagesByDate, getDigest, setDigest } from './db.js';
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

  return { winner, loser, grinder: grinderDeduped, hotStreak: hotDeduped, coldStreak: coldDeduped, totalGames, matchSummaries };
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
function buildDigestPrompt(messages, matchSummaries, soFar = false) {
  const log = messages.map(m => `[${m.user_name}]: ${m.message}`).join('\n');
  const names = [...new Set(messages.map(m => m.user_name).filter(Boolean))];

  let matchContext = '';
  if (matchSummaries && matchSummaries.length > 0) {
    matchContext = `\n\nRecent 4v4 games involving these chatters (use to add context to drama — who was on whose team, who won/lost):\n${matchSummaries.join('\n')}\n`;
  }

  return `Summarize this Warcraft III 4v4 chat room's day${soFar ? ' SO FAR' : ''}. Write a SHORT digest with these sections (skip if nothing fits):

TOPICS: 2-5 comma-separated keywords (e.g., "balance patch, undead meta, map pool, tower rush")
DRAMA: Only BIG accusations, threats, or heated personal attacks (cheating, boosting, griefing, flaming). Max 2 items separated by semicolons. For each item: start with a one-line summary, then on the SAME line include 1-2 direct quotes from the chat log in double quotes showing the worst/most heated things said. Example format: "PlayerA made threats toward PlayerB — \"I will destroy your account\" \"you are garbage and should uninstall\""
BANS: Who got banned, duration, reason (skip if none); semicolon-separated. Include the match ID if mentioned.
HIGHLIGHTS: Funniest moments or best burns (1-2 items, semicolon-separated)

Rules:
- No title, no date header, jump straight into TOPICS:
- TOPICS must be short comma-separated tags, not sentences
- CRITICAL: Use EXACT player names as they appear in the chat log. Never shorten or abbreviate names. The player list is: ${names.join(', ')}
- Prioritize high-MMR players (1800+) — their drama and interactions are more interesting
- DRAMA: Include actual quotes from the chat log to show what was said. The juicier the better — we want to see exactly what people said. Do NOT sanitize or soften the language.
- BANS and DRAMA must not overlap — if someone got banned, put it in BANS only, not in DRAMA
- State facts only, no commentary (no "classic", "brutal", "chaos", etc)
- ASCII only
- DRAMA max 2 items, HIGHLIGHTS max 2 items, BANS max 2 items
- Total under 700 chars
${matchContext}
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

  // Generate AI digest with match context
  const prompt = buildDigestPrompt(messages, dailyStats?.matchSummaries || [], soFar);
  const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }],
  });
  const aiText = msg.content[0]?.text?.trim() || null;

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

export function startScheduler() {
  if (!config.ANTHROPIC_API_KEY) {
    console.log('[Scheduler] No API key, skipping digest scheduler');
    return;
  }

  // Refresh today's digest every 2 hours
  setInterval(refreshTodayDigest, TWO_HOURS);

  // Check for midnight every minute, finalize yesterday once
  let lastFinalizedDate = '';
  setInterval(() => {
    const now = new Date();
    const hour = now.getUTCHours();
    const todayStr = now.toISOString().slice(0, 10);
    // Run between 00:00-00:05 UTC, once per day
    if (hour === 0 && todayStr !== lastFinalizedDate) {
      lastFinalizedDate = todayStr;
      finalizeYesterday();
    }
  }, 60 * 1000);

  // Initial refresh after 30s startup delay
  setTimeout(refreshTodayDigest, 30 * 1000);

  console.log('[Scheduler] Digest scheduler started (every 2h + midnight finalize)');
}
