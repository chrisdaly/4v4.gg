import Anthropic from '@anthropic-ai/sdk';
import { getMessagesByDate, getMessageBuckets, getDigest, setDigest, getRecentDigests, getWeeklyDigest, setWeeklyDigest, deleteDigest, setDigestWithDraft, updateDigestOnly, getDraftForDate, getMessagesByTimeWindow, getClipsByDateRange, updateClip4v4Status, updateDigestClips, setWeeklyDigestFull, getStreamers } from './db.js';
import { runClipFetch } from './clips.js';
import config from './config.js';

const API_BASE = 'https://website-backend.w3champions.com/api';
const GATEWAY = 20;
const GAME_MODE = 4;

const SYSTEM_PROMPT = 'You are the tabloid reporter for 4v4.gg, a Warcraft III 4v4 community site. Write punchy, factual daily digests. Plain verbs only. No flowery language, em-dashes, or AI-speak.';

// Named constants
const MIN_MESSAGES_FOR_DIGEST = 10;
const MIN_GAMES_TO_QUALIFY = 3;
const MIN_STREAK_LENGTH = 4;
const MAX_MATCH_OFFSET = 500;

/**
 * Fetch all finished 4v4 matches for a given date and compute per-player stats.
 */
const RACE_NAMES = { 0: 'RND', 1: 'HU', 2: 'ORC', 4: 'NE', 8: 'UD' };

/**
 * Tag clips as 4v4 by matching streamer battle_tags against player stats.
 * A clip is 4v4 if its streamer played a match within ±10 min of clip creation.
 */
function tagClipsAs4v4(clips, playerStats) {
  const streamers = getStreamers();
  const streamerMap = new Map(); // twitch_login → battle_tag
  for (const s of streamers) {
    if (s.battle_tag) streamerMap.set(s.twitch_login, s.battle_tag);
  }

  const tagged = [];
  for (const clip of clips) {
    const battleTag = streamerMap.get(clip.twitch_login);
    if (!battleTag) {
      updateClip4v4Status(clip.clip_id, false, null);
      continue;
    }

    const stats = playerStats.get(battleTag);
    if (!stats || stats.results.length === 0) {
      updateClip4v4Status(clip.clip_id, false, null);
      continue;
    }

    // Check if any match was within ±10 min of clip creation
    const clipTime = new Date(clip.created_at).getTime();
    const TEN_MIN = 10 * 60 * 1000;
    let matchId = null;
    for (let i = 0; i < stats.results.length; i++) {
      if (Math.abs(stats.results[i].time - clipTime) <= TEN_MIN) {
        matchId = stats.matchIds?.[i] || null;
        break;
      }
    }

    if (matchId !== null || stats.results.some(r => Math.abs(r.time - clipTime) <= TEN_MIN)) {
      updateClip4v4Status(clip.clip_id, true, matchId);
      tagged.push({ ...clip, is_4v4: true, match_id: matchId });
    } else {
      updateClip4v4Status(clip.clip_id, false, null);
    }
  }

  return tagged;
}

/**
 * Shared core: fetch matches for a date and compute per-player stats.
 * Returns { playerStats, rawMatches, playerMmrs, qualified, totalGames } or null.
 */
async function computePlayerStats(date, chatterTags = null) {
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
    } catch (err) {
      console.warn('[Digest] Match fetch failed:', err.message);
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
              race: null, matchIds: [],
            });
          }
          const stats = playerStats.get(tag);
          stats.mmrChange += change;
          stats.currentMmr = Math.max(stats.currentMmr, player.currentMmr || 0);
          stats.race = stats.race ?? player.race;
          if (match.id) stats.matchIds.push(match.id);
          if (player.won) stats.wins++;
          else stats.losses++;
          stats.results.push({ won: !!player.won, time: endTime.getTime() });
        }
      }
    }

    offset += pageSize;
    if (offset > MAX_MATCH_OFFSET) break;
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

  const qualified = [...playerStats.values()].filter(p => p.wins + p.losses >= MIN_GAMES_TO_QUALIFY);

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

  // Build playerMatches map (battleTag → matchId[])
  const playerMatches = {};
  for (const [tag, stats] of playerStats) {
    if (stats.matchIds.length > 0) playerMatches[tag] = stats.matchIds;
  }

  return { playerStats, rawMatches, playerMmrs, qualified, totalGames, matchSummaries, playerMatches };
}

async function fetchDailyStats(date, chatterTags = null) {
  const result = await computePlayerStats(date, chatterTags);
  if (!result) return null;
  const { qualified, totalGames, matchSummaries, playerMmrs, playerMatches } = result;
  if (qualified.length === 0) return null;

  // Biggest MMR winner/loser
  const byMmr = [...qualified].sort((a, b) => b.mmrChange - a.mmrChange);
  const winner = byMmr[0]?.mmrChange > 0 ? byMmr[0] : null;
  const loser = byMmr[byMmr.length - 1]?.mmrChange < 0 ? byMmr[byMmr.length - 1] : null;

  // Most games played
  const byGames = [...qualified].sort((a, b) => (b.wins + b.losses) - (a.wins + a.losses));
  const grinder = byGames[0];

  // Longest win streak
  const byWinStreak = [...qualified].filter(p => p.winStreak >= MIN_STREAK_LENGTH).sort((a, b) => b.winStreak - a.winStreak);
  const hotStreak = byWinStreak[0] || null;

  // Longest loss streak
  const byLossStreak = [...qualified].filter(p => p.lossStreak >= MIN_STREAK_LENGTH).sort((a, b) => b.lossStreak - a.lossStreak);
  const coldStreak = byLossStreak[0] || null;

  // Don't show grinder if it's the same as winner
  const grinderDeduped = grinder && grinder.battleTag !== winner?.battleTag && grinder.battleTag !== loser?.battleTag
    ? grinder : null;

  // Deduplicate streaks
  const usedTags = new Set([winner?.battleTag, loser?.battleTag, grinderDeduped?.battleTag].filter(Boolean));
  const hotDeduped = hotStreak && !usedTags.has(hotStreak.battleTag) ? hotStreak : null;
  const coldDeduped = coldStreak && !usedTags.has(coldStreak.battleTag) ? coldStreak : null;

  return { winner, loser, grinder: grinderDeduped, hotStreak: hotDeduped, coldStreak: coldDeduped, totalGames, matchSummaries, playerMmrs, playerMatches };
}

/**
 * Format: "LABEL: Tag#1234 HEADLINE (XW-YL) FORM"
 */
function raceTag(player) {
  const r = RACE_NAMES[player.race];
  return r ? `[${r}]` : '';
}

function formatMmrLine(label, player) {
  const sign = player.mmrChange > 0 ? '+' : '';
  return `${label}: ${player.battleTag}${raceTag(player)} ${sign}${Math.round(player.mmrChange)} MMR (${player.wins}W-${player.losses}L) ${player.form}`;
}

function formatGrinderLine(player) {
  const total = player.wins + player.losses;
  return `GRINDER: ${player.battleTag}${raceTag(player)} ${total} games (${player.wins}W-${player.losses}L) ${player.form}`;
}

function formatWinStreakLine(player) {
  return `HOTSTREAK: ${player.battleTag}${raceTag(player)} ${player.winStreak}W streak (${player.wins}W-${player.losses}L) ${player.form}`;
}

function formatLossStreakLine(player) {
  return `COLDSTREAK: ${player.battleTag}${raceTag(player)} ${player.lossStreak}L streak (${player.wins}W-${player.losses}L) ${player.form}`;
}

/**
 * Return top 3 candidates per stat category (no dedup — admin picks).
 */
function buildCandidate(player, formatted) {
  const c = {
    battleTag: player.battleTag,
    name: player.name,
    race: player.race,
    wins: player.wins,
    losses: player.losses,
    form: player.form,
    formatted,
  };
  if (player.mmrChange != null) c.mmrChange = Math.round(player.mmrChange);
  if (player.winStreak) c.winStreak = player.winStreak;
  if (player.lossStreak) c.lossStreak = player.lossStreak;
  return c;
}

export async function fetchDailyStatCandidates(date) {
  const result = await computePlayerStats(date);
  if (!result) return null;
  const { qualified } = result;
  if (qualified.length === 0) return null;

  const categories = {};

  // WINNER: top 3 by mmrChange (positive only)
  const winners = [...qualified].filter(p => p.mmrChange > 0).sort((a, b) => b.mmrChange - a.mmrChange).slice(0, 3);
  categories.WINNER = winners.map(p => buildCandidate(p, formatMmrLine('WINNER', p)));

  // LOSER: bottom 3 by mmrChange (negative only)
  const losers = [...qualified].filter(p => p.mmrChange < 0).sort((a, b) => a.mmrChange - b.mmrChange).slice(0, 3);
  categories.LOSER = losers.map(p => buildCandidate(p, formatMmrLine('LOSER', p)));

  // GRINDER: top 3 by total games
  const grinders = [...qualified].sort((a, b) => (b.wins + b.losses) - (a.wins + a.losses)).slice(0, 3);
  categories.GRINDER = grinders.map(p => buildCandidate(p, formatGrinderLine(p)));

  // HOTSTREAK: top 3 by winStreak
  const hotStreaks = [...qualified].filter(p => p.winStreak >= MIN_STREAK_LENGTH).sort((a, b) => b.winStreak - a.winStreak).slice(0, 3);
  categories.HOTSTREAK = hotStreaks.map(p => buildCandidate(p, formatWinStreakLine(p)));

  // COLDSTREAK: top 3 by lossStreak
  const coldStreaks = [...qualified].filter(p => p.lossStreak >= MIN_STREAK_LENGTH).sort((a, b) => b.lossStreak - a.lossStreak).slice(0, 3);
  categories.COLDSTREAK = coldStreaks.map(p => buildCandidate(p, formatLossStreakLine(p)));

  return categories;
}

export { fetchDailyStats, formatMmrLine, formatGrinderLine, formatWinStreakLine, formatLossStreakLine };

/**
 * Parse a full digest text into its raw section blocks.
 * Returns array of { key, content } for each section found.
 */
const ALL_SECTION_KEYS_RE = /^(TOPICS|DRAMA|BANS|HIGHLIGHTS|RECAP|SPIKES|WINNER|LOSER|GRINDER|HOTSTREAK|COLDSTREAK|MENTIONS)\s*:\s*/gm;

function parseDigestSections(text) {
  const sections = [];
  const matches = [...text.matchAll(ALL_SECTION_KEYS_RE)];
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const start = m.index + m[0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    const content = text.slice(start, end).trim();
    if (content) sections.push({ key: m[1], content });
  }
  return sections;
}

function reassembleSections(sections) {
  return sections.map(s => `${s.key}: ${s.content}`).join('\n');
}

/**
 * Auto-publish: keep only the first N drama items from a full digest.
 */
function autoPublishDigest(fullText, maxDrama = 5) {
  const sections = parseDigestSections(fullText);
  const result = sections.map(s => {
    if (s.key !== 'DRAMA') return s;
    const items = s.content.split(/;\s*/).map(i => i.trim()).filter(Boolean);
    const kept = items.slice(0, maxDrama);
    if (kept.length === 0) return null;
    return { key: 'DRAMA', content: kept.join('; ') };
  }).filter(Boolean);
  return reassembleSections(result);
}

/**
 * Curate: filter items in semicolon-separated sections from a draft digest.
 *
 * selectedItems: object mapping section keys to index arrays, e.g.
 *   { DRAMA: [0, 1, 3], BANS: [0], HIGHLIGHTS: [1] }
 *   Sections not present are kept unchanged.
 *   Backward compat: if an array is passed, treated as { DRAMA: array }.
 *
 * selectedStats: object like { WINNER: "formatted line" | null, ... }
 *   - string value replaces/adds that stat line
 *   - null value removes that stat line
 *   - omitted keys are left unchanged
 */
const SEMICOLON_SECTIONS = new Set(['DRAMA', 'BANS', 'HIGHLIGHTS', 'SPIKES']);

export function curateDigest(draftText, selectedItems, selectedStats = null, itemOverrides = null) {
  // Backward compat: array → { DRAMA: array }
  const itemMap = Array.isArray(selectedItems) ? { DRAMA: selectedItems } : (selectedItems || {});
  const overrides = itemOverrides || {};

  const sections = parseDigestSections(draftText);
  let result = sections.map(s => {
    if (!SEMICOLON_SECTIONS.has(s.key) || !(s.key in itemMap)) return s;
    const items = s.content.split(/;\s*/).map(i => i.trim()).filter(Boolean);
    const indices = itemMap[s.key];
    const sectionOverrides = overrides[s.key] || {};
    const kept = indices.map(i => {
      // Use override text if admin edited this item, otherwise use original
      const override = sectionOverrides[String(i)];
      return override != null ? override : items[i];
    }).filter(Boolean);
    if (kept.length === 0) return null;
    return { key: s.key, content: kept.join('; ') };
  }).filter(Boolean);

  if (selectedStats) {
    const STAT_KEYS = ['WINNER', 'LOSER', 'GRINDER', 'HOTSTREAK', 'COLDSTREAK'];
    for (const key of STAT_KEYS) {
      if (!(key in selectedStats)) continue;
      const value = selectedStats[key];
      // Remove existing line for this key
      result = result.filter(s => s.key !== key);
      // Add replacement if non-null (strip the "KEY: " prefix if present since reassemble adds it)
      if (value) {
        const content = value.replace(new RegExp(`^${key}:\\s*`), '');
        result.push({ key, content });
      }
    }
  }

  return reassembleSections(result);
}

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

  return `Summarize this Warcraft III 4v4 chat room's day${soFar ? ' SO FAR' : ''}. Write a digest with these sections (skip if nothing fits):

TOPICS: 2-5 comma-separated tags capturing what people actually talked about. Be SPECIFIC — "tower rush debate", "undead nerf rage", "ToD vs Boyzinho beef" are good. "meta", "player beef", "balance" alone are too vague.
DRAMA: BIG accusations, threats, heated personal attacks, AND juicy back-and-forth exchanges. Max 10 items separated by semicolons. CRITICAL FORMAT: each item is ONE unit — summary followed by quotes with NO semicolon between them. A semicolon ONLY separates one complete item from the next. Each item = short summary (max 8 words, NO quotes in it) then 2-4 direct quotes. Every quote MUST have speaker attribution "Name: text". Example: PlayerA flamed PlayerB all game "PlayerA: you are garbage" "PlayerB: cry more" "PlayerA: uninstall"; PlayerC accused PlayerD of maphack "PlayerC: nice maphack" "PlayerD: cope"
BANS: Who got banned, duration, reason (skip if none); semicolon-separated. Include the match ID if mentioned.
HIGHLIGHTS: Lighthearted, funny, or wholesome moments (3-5 items, semicolon-separated). Good examples: jokes that landed well, friendly banter between rivals, absurd in-game stories, self-deprecating humor, unexpected kindness, running gags, silly arguments that aren't actually hostile. Each item needs 1-2 direct quotes with speaker attribution ("Name: quote").
RECAP: 1-2 sentences summarizing the day's overall vibe. Write like a sports columnist.

Rules:
1. No title, no date header, jump straight into TOPICS:
2. TOPICS must be specific and flavorful, not generic buckets. Name players, strategies, or events. Max 4 words per tag.
3. CRITICAL: Use EXACT player names as they appear in the chat log. Never shorten or abbreviate names. The player list is: ${names.join(', ')}
4. Prioritize high-MMR players (1800+), their drama is more interesting.
5. DRAMA: aim for 10 items. Include minor beefs and trash talk too, not just the biggest blowups. Every item needs 2-4 direct quotes from the chat log.
6. DRAMA summaries must be under 8 words with NO quoted text in them. All "quoted text" goes at the END of the item only.
7. CRITICAL: Every direct quote MUST be attributed with "SpeakerName: quote text" format. Example: "ToD: you are garbage" not just "you are garbage".
8. DRAMA summaries use PLAIN verbs only: "flamed", "went off on", "called out", "blamed", "mocked", "accused". NEVER use: "unleashed", "eviscerated", "ripped into", "devolving", "decimated", "obliterated", "destroyed", "dismantled", "torched" or any dramatic/flowery synonyms.
9. No filler like "engaged in", "exchanged", "calling him", "told him", "repeatedly calling". The quotes speak for themselves.
10. Write like a tabloid reporter. Short punchy sentences. No em-dashes. No AI-speak.
11. Foreign language drama is GOLD. If someone posts threats or insults in Chinese/Korean/etc and another player translates it, that is top-tier content. Always include it. Use the English translation as the quote. If no translation exists in chat, translate it yourself. Always quote in English.
12. BANS and DRAMA must not overlap — if someone got banned, put it in BANS only, not in DRAMA.
13. State facts only, no commentary (no "classic", "brutal", "chaos", etc).
14. ASCII only.
15. DRAMA max 10 items, HIGHLIGHTS max 5 items, BANS max 2 items.
16. Total under 3000 chars.
${mmrContext}${matchContext}
Chat log (${messages.length} messages):
${log}`;
}

/**
 * Core digest assembly: AI summary + stat lines + mentions.
 */
async function assembleDigest(date, messages, soFar = false) {
  if (!config.ANTHROPIC_API_KEY) return null;
  if (messages.length < MIN_MESSAGES_FOR_DIGEST) return null;

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
          max_tokens: 1800,
          system: SYSTEM_PROMPT,
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

  // Detect chat volume spikes (3x average AND 10+ messages in a 5-min window)
  try {
    const buckets = getMessageBuckets(date, 5);
    if (buckets.length > 0) {
      const avg = buckets.reduce((s, b) => s + b.count, 0) / buckets.length;
      const spikes = buckets
        .filter(b => b.count >= 10 && b.count >= avg * 3)
        .map(b => {
          const topNames = (b.names || '').split(',').slice(0, 3).join(', ');
          return `${b.bucket} (${b.count} msgs, ${topNames})`;
        });
      if (spikes.length > 0) {
        parts.push(`SPIKES: ${spikes.join('; ')}`);
      }
    }
  } catch (err) {
    console.warn('[Digest] Spike detection failed:', err.message);
  }

  if (dailyStats?.winner) parts.push(formatMmrLine('WINNER', dailyStats.winner));
  if (dailyStats?.loser) parts.push(formatMmrLine('LOSER', dailyStats.loser));
  if (dailyStats?.grinder) parts.push(formatGrinderLine(dailyStats.grinder));
  if (dailyStats?.hotStreak) parts.push(formatWinStreakLine(dailyStats.hotStreak));
  if (dailyStats?.coldStreak) parts.push(formatLossStreakLine(dailyStats.coldStreak));
  if (chatTags.length > 0) parts.push(`MENTIONS: ${chatTags.join(',')}`);

  // Tag and collect 4v4 clips for this date
  let digestClips = [];
  try {
    const allClips = getClipsByDateRange(date, date);
    if (allClips.length > 0 && dailyStats) {
      const result = await computePlayerStats(date);
      const tagged = result ? tagClipsAs4v4(allClips, result.playerStats) : [];
      digestClips = tagged.slice(0, 3).map(c => ({
        clip_id: c.clip_id, title: c.title, url: c.url,
        thumbnail_url: c.thumbnail_url, twitch_login: c.twitch_login,
        view_count: c.view_count, duration: c.duration, match_id: c.match_id,
      }));
    }
  } catch (err) {
    console.warn('[Digest] Clip tagging failed:', err.message);
  }

  return { digest: parts.join('\n'), totalGames: dailyStats?.totalGames || 0, messageCount: messages.length, playerMatches: dailyStats?.playerMatches || null, clips: digestClips };
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

  const fullDraft = result.digest;
  const published = autoPublishDigest(fullDraft, 5);
  const matchContext = result.playerMatches ? JSON.stringify(result.playerMatches) : null;
  setDigestWithDraft(date, published, fullDraft, matchContext);

  // Store clips on the digest
  if (result.clips && result.clips.length > 0) {
    updateDigestClips(date, JSON.stringify(result.clips));
  }

  console.log(`[Digest] Generated for ${date} (${result.messageCount} messages, ${result.totalGames} games, ${result.clips?.length || 0} clips)`);
  return published;
}

/* ── Spike analysis ──────────────────────────────── */

/**
 * Analyze a chat time window and return suggested items for each section.
 * Returns { DRAMA: string[], HIGHLIGHTS: string[], BANS: string[] }
 */
export async function analyzeSpike(date, fromTime, toTime) {
  if (!config.ANTHROPIC_API_KEY) return null;

  const messages = getMessagesByTimeWindow(date, fromTime, toTime, 200);
  if (messages.length < 3) return null;

  const log = messages.map(m => `[${m.user_name}]: ${m.message}`).join('\n');
  const names = [...new Set(messages.map(m => m.user_name).filter(Boolean))];

  const prompt = `Analyze this Warcraft III 4v4 chat excerpt (${fromTime}-${toTime} UTC) and extract items for a daily digest.

Return JSON only, no other text. Format:
{"DRAMA":["item1","item2"],"HIGHLIGHTS":["item1"],"BANS":["item1"]}

Rules for each item:
- DRAMA: accusations, flame wars, heated exchanges. Format: short summary (max 8 words, NO quotes in it), then 2-3 direct quotes at the end. Every quote must have speaker attribution. Example: "PlayerA flamed PlayerB over tower rush \\"PlayerA: you are garbage\\" \\"PlayerB: cry more\\""
- HIGHLIGHTS: funny, wholesome, absurd moments. Same format: short summary + 1-2 quotes with speaker attribution ("Name: quote").
- BANS: bans or mutes mentioned. Who, duration, reason.
- Use EXACT player names from the log: ${names.join(', ')}
- Skip empty categories (use empty array [])
- Max 3 items per category
- ASCII only, no em-dashes

Chat log (${messages.length} messages):
${log}`;

  const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });
    const text = msg.content[0]?.text?.trim();
    if (!text) return null;
    // Extract JSON from response (may have markdown fences)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      DRAMA: Array.isArray(parsed.DRAMA) ? parsed.DRAMA : [],
      HIGHLIGHTS: Array.isArray(parsed.HIGHLIGHTS) ? parsed.HIGHLIGHTS : [],
      BANS: Array.isArray(parsed.BANS) ? parsed.BANS : [],
    };
  } catch (err) {
    console.warn(`[Spike] Analysis failed for ${date} ${fromTime}-${toTime}:`, err.message);
    return null;
  }
}

/* ── Generate more items for a section ───────────── */

const SECTION_LABELS = {
  DRAMA: 'accusations, flame wars, heated personal attacks, trash talk',
  HIGHLIGHTS: 'funny, wholesome, absurd, or lighthearted moments',
  BANS: 'bans, mutes, or moderation actions mentioned',
};

/**
 * Generate additional items for a specific section, avoiding duplicates.
 * Returns string[] of new items.
 */
export async function generateMoreItems(date, section, existingItems = []) {
  if (!config.ANTHROPIC_API_KEY) return null;
  if (!SECTION_LABELS[section]) return null;

  const messages = getMessagesByDate(date);
  if (messages.length < 5) return null;

  const log = messages.map(m => `[${m.user_name}]: ${m.message}`).join('\n');
  const names = [...new Set(messages.map(m => m.user_name).filter(Boolean))];

  const existingContext = existingItems.length > 0
    ? `\n\nALREADY COVERED (do NOT repeat these — find DIFFERENT moments):\n${existingItems.map((item, i) => `${i + 1}. ${item}`).join('\n')}\n`
    : '';

  const prompt = `You are analyzing a Warcraft III 4v4 chat room for a daily digest. Find items for the ${section} section.

${section} covers: ${SECTION_LABELS[section]}
${existingContext}
Return JSON only, no other text. Format:
{"items":["item1","item2","item3"]}

Rules:
- Format each item: short summary (max 8 words, plain verbs only), then 1-3 direct quotes with speaker attribution. Example: "PlayerA flamed PlayerB over tower rush \\"PlayerA: you are garbage\\" \\"PlayerB: cry more\\""
- Every quote MUST start with "SpeakerName: " so readers know who said what
- Use EXACT player names from the log: ${names.join(', ')}
- Find 3-5 NEW items not covered above
- ASCII only, no em-dashes
- State facts only, no commentary

Chat log (${messages.length} messages):
${log}`;

  const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });
    const text = msg.content[0]?.text?.trim();
    if (!text) return null;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);
    return Array.isArray(parsed.items) ? parsed.items : [];
  } catch (err) {
    console.warn(`[MoreItems] Failed for ${date} ${section}:`, err.message);
    return null;
  }
}

/**
 * Append new items to a section in draft text. Returns updated draft string.
 */
export function appendItemsToDraft(draftText, sectionKey, newItems) {
  const sections = parseDigestSections(draftText);
  const sec = sections.find(s => s.key === sectionKey);
  if (sec) {
    sec.content = sec.content + '; ' + newItems.join('; ');
  } else {
    sections.push({ key: sectionKey, content: newItems.join('; ') });
  }
  return reassembleSections(sections);
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

/**
 * Compute aggregate match stats across a week by calling computePlayerStats for each day.
 */
async function computeWeeklyMatchStats(weekStart, weekEnd) {
  const startDate = new Date(weekStart + 'T12:00:00Z');
  const endDate = new Date(weekEnd + 'T12:00:00Z');
  const weeklyPlayerMap = new Map();
  const raceStats = {}; // HU/ORC/NE/UD → { picks, wins }
  const mapCounts = new Map(); // mapName → count
  let totalGames = 0;
  let mmrSum = 0;
  let mmrCount = 0;

  for (let d = new Date(startDate); d <= endDate; d.setUTCDate(d.getUTCDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10);
    let result;
    try {
      result = await computePlayerStats(dateStr);
    } catch (err) {
      console.warn(`[Weekly] Stats fetch failed for ${dateStr}:`, err.message);
      continue;
    }
    if (!result) continue;

    // Count games from raw matches
    for (const match of result.rawMatches || []) {
      const mapName = match.mapName || match.map || 'Unknown';
      mapCounts.set(mapName, (mapCounts.get(mapName) || 0) + 1);
    }

    // Aggregate per-player stats
    for (const [tag, stats] of result.playerStats) {
      if (!weeklyPlayerMap.has(tag)) {
        weeklyPlayerMap.set(tag, {
          battleTag: tag, name: stats.name, race: stats.race,
          mmrChange: 0, wins: 0, losses: 0, currentMmr: 0,
          form: '',
        });
      }
      const wp = weeklyPlayerMap.get(tag);
      wp.mmrChange += stats.mmrChange;
      wp.wins += stats.wins;
      wp.losses += stats.losses;
      wp.currentMmr = Math.max(wp.currentMmr, stats.currentMmr);
      wp.form += stats.form;
      if (!wp.race && stats.race) wp.race = stats.race;

      // Track race stats
      const raceName = RACE_NAMES[stats.race];
      if (raceName && raceName !== 'RND') {
        if (!raceStats[raceName]) raceStats[raceName] = { picks: 0, wins: 0 };
        raceStats[raceName].picks += stats.wins + stats.losses;
        raceStats[raceName].wins += stats.wins;
      }

      if (stats.currentMmr > 0) {
        mmrSum += stats.currentMmr;
        mmrCount++;
      }
    }

    totalGames += result.totalGames || 0;
  }

  const uniquePlayers = weeklyPlayerMap.size;
  const averageMmr = mmrCount > 0 ? Math.round(mmrSum / mmrCount) : 0;
  const topMaps = [...mapCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, games]) => ({ name, games }));

  return { weeklyPlayerMap, raceStats, topMaps, totalGames, uniquePlayers, averageMmr };
}

/**
 * Compute weekly awards from aggregated player stats.
 */
function computeWeeklyAwards(weeklyPlayerMap) {
  const MIN_GAMES_WEEKLY = 3;
  const MIN_GAMES_MVP = 5;
  const qualified = [...weeklyPlayerMap.values()].filter(p => p.wins + p.losses >= MIN_GAMES_WEEKLY);

  // POWER_RANKINGS: top 10 by mmrChange
  const powerRankings = [...qualified]
    .sort((a, b) => b.mmrChange - a.mmrChange)
    .slice(0, 10)
    .map(p => {
      const race = RACE_NAMES[p.race] || '';
      const sign = p.mmrChange > 0 ? '+' : '';
      return `${p.battleTag}${race ? '[' + race + ']' : ''} ${sign}${Math.round(p.mmrChange)} MMR (${p.wins}W-${p.losses}L) ${p.form}`;
    });

  // MVP: highest weighted score, 5+ games
  const mvpQualified = qualified.filter(p => p.wins + p.losses >= MIN_GAMES_MVP);
  const mvp = mvpQualified.length > 0
    ? mvpQualified
      .map(p => ({
        ...p,
        score: p.currentMmr * 0.5 + (p.wins / (p.wins + p.losses)) * 1000 + p.mmrChange,
      }))
      .sort((a, b) => b.score - a.score)[0]
    : null;

  // IRON_MAN: most games
  const ironMan = [...qualified].sort((a, b) => (b.wins + b.losses) - (a.wins + a.losses))[0] || null;

  // MOST_IMPROVED: biggest MMR gain
  const mostImproved = [...qualified].filter(p => p.mmrChange > 0).sort((a, b) => b.mmrChange - a.mmrChange)[0] || null;

  // BIGGEST_TILT: worst MMR loss
  const biggestTilt = [...qualified].filter(p => p.mmrChange < 0).sort((a, b) => a.mmrChange - b.mmrChange)[0] || null;

  return { powerRankings, mvp, ironMan, mostImproved, biggestTilt };
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
DRAMA: The BIGGEST 2-3 drama stories of the week, semicolon-separated. Combine related daily items into one story. FORMAT: short summary (max 10 words, no quoted text), then quotes with speaker attribution at the END only ("Name: quote").
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

  // Compute rich aggregate stats from actual match data
  let weeklyMatchStats = null;
  let weeklyAwards = null;
  try {
    weeklyMatchStats = await computeWeeklyMatchStats(weekStart, weekEnd);
    weeklyAwards = computeWeeklyAwards(weeklyMatchStats.weeklyPlayerMap);
  } catch (err) {
    console.warn('[Weekly] Match stats computation failed:', err.message);
  }

  // Fall back to parsing stat lines from daily digests if match fetch fails
  const digestTexts = dailyDigests.map(d => d.digest);
  const playerMap = weeklyMatchStats?.weeklyPlayerMap || parseWeeklyStatLines(digestTexts);

  // Pick weekly winners
  const qualified = [...playerMap.values()].filter(p => (p.wins + p.losses) >= 3);
  const byMmr = [...qualified].sort((a, b) => b.mmrChange - a.mmrChange);
  const weeklyWinner = byMmr[0]?.mmrChange > 0 ? byMmr[0] : null;
  const weeklyLoser = byMmr[byMmr.length - 1]?.mmrChange < 0 ? byMmr[byMmr.length - 1] : null;
  const byGames = [...qualified].sort((a, b) => (b.wins + b.losses) - (a.wins + a.losses));
  const usedTags = new Set([weeklyWinner?.battleTag, weeklyLoser?.battleTag].filter(Boolean));
  const weeklyGrinder = byGames[0] && !usedTags.has(byGames[0].battleTag) ? byGames[0] : null;

  let aggregateText = `\nAggregate stats for the week (${dailyDigests.length} days):`;
  if (weeklyWinner) aggregateText += `\nTop MMR gainer: ${weeklyWinner.name} (+${Math.round(weeklyWinner.mmrChange)} MMR, ${weeklyWinner.wins + weeklyWinner.losses} games)`;
  if (weeklyLoser) aggregateText += `\nBiggest MMR loss: ${weeklyLoser.name} (${Math.round(weeklyLoser.mmrChange)} MMR, ${weeklyLoser.wins + weeklyLoser.losses} games)`;
  if (weeklyGrinder) aggregateText += `\nMost active: ${weeklyGrinder.name} (${weeklyGrinder.wins + weeklyGrinder.losses} games)`;

  // Race/map context for AI
  if (weeklyMatchStats?.raceStats) {
    const raceLines = Object.entries(weeklyMatchStats.raceStats)
      .sort((a, b) => b[1].picks - a[1].picks)
      .map(([race, s]) => {
        const wr = s.picks > 0 ? Math.round(s.wins / s.picks * 100) : 0;
        return `${race} ${s.picks} picks (${wr}% WR)`;
      });
    if (raceLines.length > 0) aggregateText += `\nRace breakdown: ${raceLines.join(', ')}`;
  }
  if (weeklyMatchStats?.topMaps?.length > 0) {
    aggregateText += `\nTop maps: ${weeklyMatchStats.topMaps.map(m => `${m.name} (${m.games})`).join(', ')}`;
  }

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
          system: SYSTEM_PROMPT,
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
    parts.push(`GRINDER: ${weeklyGrinder.battleTag} ${weeklyGrinder.wins + weeklyGrinder.losses} games (${weeklyGrinder.wins}W-${weeklyGrinder.losses}L)`);
  }

  // Append power rankings, meta, and awards sections
  if (weeklyAwards?.powerRankings?.length > 0) {
    parts.push(`POWER_RANKINGS: ${weeklyAwards.powerRankings.map((p, i) => `${i + 1}. ${p}`).join('; ')}`);
  }

  if (weeklyMatchStats?.raceStats) {
    const totalPicks = Object.values(weeklyMatchStats.raceStats).reduce((s, r) => s + r.picks, 0);
    const raceParts = Object.entries(weeklyMatchStats.raceStats)
      .sort((a, b) => b[1].picks - a[1].picks)
      .map(([race, s]) => {
        const pct = totalPicks > 0 ? Math.round(s.picks / totalPicks * 100) : 0;
        const wr = s.picks > 0 ? Math.round(s.wins / s.picks * 100) : 0;
        return `${race} ${pct}% (${wr}% WR)`;
      });
    const mapParts = (weeklyMatchStats.topMaps || []).map(m => `${m.name} ${m.games}`);
    parts.push(`META: ${raceParts.join(', ')}${mapParts.length > 0 ? ' | Maps: ' + mapParts.join(', ') : ''}`);
  }

  if (weeklyAwards) {
    const awards = [];
    if (weeklyAwards.mvp) {
      const wr = Math.round(weeklyAwards.mvp.wins / (weeklyAwards.mvp.wins + weeklyAwards.mvp.losses) * 100);
      awards.push(`MVP ${weeklyAwards.mvp.battleTag} ${weeklyAwards.mvp.currentMmr} MMR ${wr}% WR`);
    }
    if (weeklyAwards.ironMan) awards.push(`Iron Man ${weeklyAwards.ironMan.battleTag} ${weeklyAwards.ironMan.wins + weeklyAwards.ironMan.losses} games`);
    if (weeklyAwards.mostImproved) awards.push(`Most Improved ${weeklyAwards.mostImproved.battleTag} +${Math.round(weeklyAwards.mostImproved.mmrChange)} MMR`);
    if (weeklyAwards.biggestTilt) awards.push(`Biggest Tilt ${weeklyAwards.biggestTilt.battleTag} ${Math.round(weeklyAwards.biggestTilt.mmrChange)} MMR`);
    if (awards.length > 0) parts.push(`AWARDS: ${awards.join(' | ')}`);
  }

  const digest = parts.join('\n');

  // Collect weekly clips: top 5 4v4 clips by views
  let weeklyClips = [];
  try {
    const allClips = getClipsByDateRange(weekStart, weekEnd);
    weeklyClips = allClips
      .filter(c => c.is_4v4 === 1)
      .slice(0, 5)
      .map(c => ({
        clip_id: c.clip_id, title: c.title, url: c.url,
        thumbnail_url: c.thumbnail_url, twitch_login: c.twitch_login,
        view_count: c.view_count, duration: c.duration, match_id: c.match_id,
      }));
  } catch (err) {
    console.warn('[Weekly] Clip collection failed:', err.message);
  }

  // Build stats JSON
  const statsJson = weeklyMatchStats ? JSON.stringify({
    totalGames: weeklyMatchStats.totalGames,
    uniquePlayers: weeklyMatchStats.uniquePlayers,
    averageMmr: weeklyMatchStats.averageMmr,
    raceStats: weeklyMatchStats.raceStats,
    topMaps: weeklyMatchStats.topMaps,
  }) : null;

  setWeeklyDigestFull(weekStart, weekEnd, digest,
    weeklyClips.length > 0 ? JSON.stringify(weeklyClips) : null,
    statsJson
  );
  console.log(`[Weekly] Generated for ${weekStart} to ${weekEnd} (${dailyDigests.length} daily digests, ${weeklyClips.length} clips)`);
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
    // Fetch clips before generating the digest so they can be tagged
    try {
      await runClipFetch();
    } catch (err) {
      console.warn('[Scheduler] Pre-digest clip fetch failed:', err.message);
    }

    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const existing = getDigest(yesterday);
    if (existing) {
      // Delete and regenerate to get final version with fresh draft
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
