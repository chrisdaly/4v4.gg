import Anthropic from '@anthropic-ai/sdk';
import { getMessagesByDate, getMessageBuckets, getDigest, setDigest, getRecentDigests, getWeeklyDigest, setWeeklyDigest, deleteDigest, setDigestWithDraft, updateDigestOnly, getDraftForDate, getMessagesByTimeWindow, getClipsByDateRange, updateClip4v4Status, updateDigestClips, setWeeklyDigestFull, getStreamers, saveDailyPlayerStats, getDailyPlayerStatsRange, hasDailyPlayerStats, saveDailyMatches, getDailyMatchesRange, getNewPlayersForWeek, saveMatchPlayerScores, hasMatchScores, getMatchPlayerScoresRange, getMatchIdsForDateRange, getDailyMatchesMissingMmrs, updateDailyMatchMmrs, getMessagesByDateRangeAndUser, getMessagesByDateRangeMentioning, getFirstAppearanceDate, getLastActiveDateBefore, getMessagesByDateAndUsers, updateGenJobStatus, updateGenJobProgress, saveWeeklyVariant, countMessagesByDateRange, updateWeeklyDigestOnly, updateWeeklyDraftOnly, getAllMessagesByDateRange } from './db.js';
import { runClipFetch } from './clips.js';
import config from './config.js';

const API_BASE = 'https://website-backend.w3champions.com/api';
const GATEWAY = 20;
const GAME_MODE = 4;

const SYSTEM_PROMPT = 'You are the voice of 4v4.gg, a Warcraft III 4v4 community zine. Your digests are published on a magazine-style frontend where the first DRAMA item is the featured "Top Story" with pull quotes. Write like a punk gaming zine — raw, punchy, factual, deadpan funny. Short sentences. Fragments OK. Plain verbs only. No flowery language, em-dashes, or AI-speak. State facts and let the absurdity speak for itself.';

// Named constants
const MIN_MESSAGES_FOR_DIGEST = 10;
const MIN_GAMES_TO_QUALIFY = 3;
const MIN_STREAK_LENGTH = 4;
const MAX_MATCH_OFFSET = 2000;

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
  const matchDataForDb = [];
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

      // Collect match-level data for daily_matches table (upset detection)
      if (match.id && (match.teams || []).length === 2) {
        const teams = match.teams;
        const t1players = (teams[0].players || []);
        const t2players = (teams[1].players || []);
        if (t1players.length > 0 && t2players.length > 0) {
          const t1mmrs = t1players.map(p => p.currentMmr || p.oldMmr || 0).filter(m => m > 0);
          const t2mmrs = t2players.map(p => p.currentMmr || p.oldMmr || 0).filter(m => m > 0);
          matchDataForDb.push({
            match_id: match.id,
            map_name: match.mapName || match.map || null,
            team1_avg_mmr: t1mmrs.length > 0 ? t1mmrs.reduce((a, b) => a + b, 0) / t1mmrs.length : 0,
            team2_avg_mmr: t2mmrs.length > 0 ? t2mmrs.reduce((a, b) => a + b, 0) / t2mmrs.length : 0,
            team1_races: t1players.map(p => RACE_NAMES[p.race] || '?').join(','),
            team2_races: t2players.map(p => RACE_NAMES[p.race] || '?').join(','),
            team1_won: !!t1players[0]?.won,
            team1_tags: t1players.map(p => p.battleTag).filter(Boolean).join(','),
            team2_tags: t2players.map(p => p.battleTag).filter(Boolean).join(','),
            team1_mmrs: t1players.map(p => p.oldMmr || 0).join(','),
            team2_mmrs: t2players.map(p => p.oldMmr || 0).join(','),
          });
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

  // Persist player stats to DB for weekly aggregation
  try {
    saveDailyPlayerStats(date, playerStats);
  } catch (err) {
    console.warn(`[Digest] Failed to persist daily stats for ${date}:`, err.message);
  }

  // Persist match-level data for weekly upset detection
  try {
    if (matchDataForDb.length > 0) {
      saveDailyMatches(date, matchDataForDb);
    }
  } catch (err) {
    console.warn(`[Digest] Failed to persist daily matches for ${date}:`, err.message);
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
  const sign = player.mmrChange > 0 ? '+' : '';
  const mmrPart = player.mmrChange != null ? ` ${sign}${Math.round(player.mmrChange)} MMR` : '';
  return `HOTSTREAK: ${player.battleTag}${raceTag(player)} ${player.winStreak}W streak${mmrPart} (${player.wins}W-${player.losses}L) ${player.form}`;
}

function formatLossStreakLine(player) {
  const sign = player.mmrChange > 0 ? '+' : '';
  const mmrPart = player.mmrChange != null ? ` ${sign}${Math.round(player.mmrChange)} MMR` : '';
  return `COLDSTREAK: ${player.battleTag}${raceTag(player)} ${player.lossStreak}L streak${mmrPart} (${player.wins}W-${player.losses}L) ${player.form}`;
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
const ALL_SECTION_KEYS_RE = /^(TOPICS|DRAMA|BANS|HIGHLIGHTS|RECAP|SPIKES|WINNER|LOSER|GRINDER|HOTSTREAK|COLDSTREAK|HEROSLAYER|HOTSTREAK_DAILY|COLDSTREAK_DAILY|STREAK_SPECTRUM|WINNER_BLURB|LOSER_BLURB|GRINDER_BLURB|HOTSTREAK_BLURB|COLDSTREAK_BLURB|HEROSLAYER_BLURB|HEROSLAYER_HEROES|HEROSLAYER_VICTIMS|HEROSLAYER_KILLBOARD|HEROSLAYER_MAX|WINNER_QUOTES|LOSER_QUOTES|GRINDER_QUOTES|HOTSTREAK_QUOTES|COLDSTREAK_QUOTES|HEROSLAYER_QUOTES|Hero Slayer_BLURB|Unit Killer_BLURB|Hero Slayer_QUOTES|Unit Killer_QUOTES|NEW_BLOOD|UPSET|AT_SPOTLIGHT|BEST_OF_CHAT|POWER_RANKINGS|MATCH_STATS|HEROES|AWARDS|CLIPS|MENTIONS)\s*:\s*/gm;

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

// ── digestToJSON: flat-text → structured JSON converter ──────────────

/**
 * Extract all quoted strings from text. Returns array of raw quote strings.
 */
function extractQuotedStrings(text) {
  const quotes = [];
  for (const m of text.matchAll(/"([^"]+)"/g)) {
    quotes.push(m[1]);
  }
  return quotes;
}

/**
 * Parse a raw "Name: message" quote string into { speaker, text }.
 */
function parseQuoteString(raw) {
  const m = raw.match(/^(\w[\w\d!ǃ]*?):\s+(.+)$/);
  return m ? { speaker: m[1], text: m[2] } : { speaker: null, text: raw };
}

/**
 * Split text into summary (non-quoted part) and parsed quotes.
 * Returns { summary, quotes: Quote[] }
 */
function splitQuotesFromText(text) {
  const rawQuotes = extractQuotedStrings(text);
  const quotes = rawQuotes.map(parseQuoteString);
  let summary = text
    .replace(/"[^"]+"/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s*[—:,]\s*$/g, '')
    .trim();
  return { summary, quotes };
}

/**
 * Parse TOPICS content into an array of topic strings.
 */
function parseTopicsJSON(content) {
  if (!content) return [];
  return content.split(/,\s*/).map(t => t.trim()).filter(Boolean);
}

/**
 * Parse DRAMA/HIGHLIGHTS items with per-item quote extraction.
 * Key: split on semicolons FIRST, then extract quotes per-item.
 * Lead item (index 0) checks for | pipe headline separator.
 */
function parseDramaItems(content) {
  if (!content) return [];
  return content.split(/;\s*/).map((raw, idx) => {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const { summary, quotes } = splitQuotesFromText(trimmed);
    const item = { summary, quotes };
    // Lead item may have a headline separated by |
    if (idx === 0) {
      const pipeIdx = summary.indexOf('|');
      if (pipeIdx > 0) {
        item.headline = summary.slice(0, pipeIdx).trim();
        item.summary = summary.slice(pipeIdx + 1).trim();
      }
    }
    return item;
  }).filter(Boolean);
}

/**
 * Parse BANS items. Format: "Name got Xd for reason matchId123; ..."
 */
function parseBanItems(content) {
  if (!content) return [];
  return content.split(/;\s*/).map(raw => {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    // Try structured regex: "Name banned/got Xd/perm for reason [matchId]"
    const m = trimmed.match(/^(\S+)\s+(?:got\s+|banned\s+)?(\d+d|perm(?:a(?:nent)?)?)\s+(?:for\s+)?(.+?)(?:\s+([a-f0-9]{20,}))?$/i);
    if (m) {
      return {
        name: m[1],
        duration: m[2],
        reason: m[3].replace(/\s+$/, ''),
        matchId: m[4] || null,
      };
    }
    // Fallback: extract what we can from the { summary, quotes } approach
    const { summary, quotes } = splitQuotesFromText(trimmed);
    return { name: null, duration: null, reason: summary, matchId: null, quotes };
  }).filter(Boolean);
}

/**
 * Parse highlight items — same per-item approach as drama.
 */
function parseHighlightItems(content) {
  return parseDramaItems(content);  // Same structure as drama items
}

/**
 * Parse a stat line. Port of digestUtils.js parseStatLine.
 * Format: "Name#123[RACE] headline (XW-YL) FORM"
 */
function parseStatLineJSON(content) {
  if (!content) return null;
  const m = content.match(/^(.+?#\d+)(?:\[(\w+)\])?\s+(.+?)\s+\((\d+)W-(\d+)L\)\s*([WL]*)$/);
  if (!m) return null;
  const headline = m[3];
  const mmrMatch = headline.match(/([+-]?\d+)\s*MMR/);
  const streakMatch = headline.match(/(\d+)([WL])\s*streak/);
  return {
    battleTag: m[1],
    race: m[2] || null,
    headline,
    mmrChange: mmrMatch ? parseInt(mmrMatch[1]) : null,
    streakLength: streakMatch ? parseInt(streakMatch[1]) : null,
    wins: parseInt(m[4]),
    losses: parseInt(m[5]),
    form: m[6] || '',
  };
}

/**
 * Parse a spotlight card: stat line + blurb + quotes.
 */
function parseSpotlightCard(key, sections) {
  const find = k => sections.find(s => s.key === k)?.content || null;
  const statContent = find(key);
  if (!statContent) return null;

  const stat = parseStatLineJSON(statContent);
  if (!stat) return null;

  const blurb = find(`${key}_BLURB`) || null;
  const quotesRaw = find(`${key}_QUOTES`);
  const quotes = quotesRaw ? extractQuotedStrings(quotesRaw).map(parseQuoteString) : [];

  return { ...stat, blurb, quotes };
}

/**
 * Parse a streak spotlight card: extends spotlight with daily breakdown + spectrum.
 */
function parseStreakCard(key, sections) {
  const card = parseSpotlightCard(key, sections);
  if (!card) return null;

  const find = k => sections.find(s => s.key === k)?.content || null;

  // Parse daily breakdown
  const dailyContent = find(`${key}_DAILY`);
  if (dailyContent) {
    const [daysPart, metaPart] = dailyContent.split('|');
    if (daysPart && metaPart) {
      card.dailyBreakdown = daysPart.split(';').map(entry => {
        const [dayForm, ...rest] = entry.split(',');
        const colonIdx = dayForm.indexOf(':');
        if (colonIdx < 0) return null;
        return {
          day: dayForm.slice(0, colonIdx),
          form: dayForm.slice(colonIdx + 1),
          streakGames: parseInt(rest[0]) || 0,
          mmrChange: parseInt(rest[1]) || 0,
        };
      }).filter(Boolean);

      for (const pair of metaPart.split(',')) {
        const [k, v] = pair.split(':');
        if (k === 'streakIdx') card.streakIdx = parseInt(v) || 0;
        if (k === 'streakLen') card.streakLen = parseInt(v) || 0;
      }
    }
  }

  // Parse streak spectrum
  const spectrumContent = find('STREAK_SPECTRUM');
  if (spectrumContent && key === 'HOTSTREAK') {
    const parseHalf = (str) => {
      if (!str) return {};
      const data = str.includes(':') ? str.split(':')[1] : str;
      if (!data) return {};
      const result = {};
      for (const e of data.split(',')) {
        const [len, count] = e.split('=');
        if (!isNaN(parseInt(len)) && !isNaN(parseInt(count))) {
          result[parseInt(len)] = parseInt(count);
        }
      }
      return result;
    };
    const parts = spectrumContent.split('|');
    const winPart = parts.find(p => p.startsWith('W:'));
    const lossPart = parts.find(p => p.startsWith('L:'));
    card.streakSpectrum = { wins: parseHalf(winPart), losses: parseHalf(lossPart) };
  }

  return card;
}

/**
 * Parse the Hero Slayer spotlight card with extended data.
 */
function parseHeroSlayerCard(sections) {
  const card = parseSpotlightCard('HEROSLAYER', sections);
  if (!card) return null;

  const find = k => sections.find(s => s.key === k)?.content || null;

  const heroesContent = find('HEROSLAYER_HEROES');
  if (heroesContent) card.playerHeroes = heroesContent.split(',').map(h => h.trim()).filter(Boolean);

  const victimsContent = find('HEROSLAYER_VICTIMS');
  if (victimsContent) card.victimHeroes = victimsContent.split(',').map(h => h.trim()).filter(Boolean);

  const killboardContent = find('HEROSLAYER_KILLBOARD');
  if (killboardContent) {
    card.killboard = {};
    for (const entry of killboardContent.split(',')) {
      const [hero, count] = entry.split(':');
      if (hero && count) card.killboard[hero.trim()] = parseInt(count) || 0;
    }
  }

  const maxContent = find('HEROSLAYER_MAX');
  if (maxContent) card.maxKillsInGame = parseInt(maxContent) || 0;

  return card;
}

/**
 * Parse POWER_RANKINGS into structured entries.
 */
function parsePowerRankingsJSON(content) {
  if (!content) return [];
  return content.split(/;\s*/).map(entry => {
    const m = entry.trim().match(
      /^(\d+)\.\s*(.+?#\d+)(?:\[(\w+)\])?\s+([+-]?\d+)\s*MMR\s+\((\d+)W-(\d+)L\)\s*([WL]*)$/
    );
    if (!m) return null;
    return {
      rank: parseInt(m[1]),
      battleTag: m[2],
      race: m[3] || null,
      mmrChange: parseInt(m[4]),
      wins: parseInt(m[5]),
      losses: parseInt(m[6]),
      form: m[7] || '',
    };
  }).filter(Boolean);
}

/**
 * Parse MATCH_STATS or HEROES into structured award cards.
 * Format: "Category Name#123 detail (Runner1, Runner2) | ..."
 * Also attaches blurbs/quotes from companion sections like "Hero Slayer_BLURB".
 */
function parseAwardCardsJSON(content, sections) {
  if (!content) return [];
  return content.split(/\s*\|\s*/).map(entry => {
    const m = entry.trim().match(
      /^(.+?)\s+(\S+#\d+)\s+(.+?)(?:\s+\((.+)\))?$/
    );
    if (!m) return null;

    let detail = m[3];
    let combo = null;
    const comboMatch = detail.match(/\s+\[([^\]]+)\]$/);
    if (comboMatch) {
      combo = comboMatch[1];
      detail = detail.slice(0, comboMatch.index);
    }

    const runnersUp = m[4]
      ? m[4].split(/,\s*/).map(r => r.trim()).filter(Boolean)
      : [];

    const category = m[1];
    // Look for companion blurb/quotes sections
    const blurbSec = sections.find(s => s.key === `${category}_BLURB`);
    const quotesSec = sections.find(s => s.key === `${category}_QUOTES`);
    const blurb = blurbSec?.content?.trim() || null;
    const quotes = quotesSec
      ? extractQuotedStrings(quotesSec.content).map(parseQuoteString)
      : [];

    return {
      category,
      battleTag: m[2],
      stat: detail,
      combo,
      runnersUp,
      blurb,
      quotes,
    };
  }).filter(Boolean);
}

/**
 * Parse NEW_BLOOD entries.
 */
function parseNewBloodJSON(content) {
  if (!content) return [];
  return content.split(/;\s*/).map(entry => {
    const m = entry.trim().match(
      /^(\S+#\d+)\s+debuted\s+at\s+(\d+)\s*MMR\s+\((\d+)\s+games?,\s*(\d+)%\s*WR\)(?:\s+\[returning(?::(\d{4}-\d{2}-\d{2}|\d+))?\])?(?:\s+first:(\d{4}-\d{2}-\d{2}))?$/
    );
    if (!m) return null;
    return {
      battleTag: m[1],
      mmr: parseInt(m[2]),
      games: parseInt(m[3]),
      winRate: parseInt(m[4]),
      isReturning: entry.includes('[returning'),
      lastSeen: m[5] && m[5].includes('-') ? m[5] : null,
      firstSeen: m[6] || null,
    };
  }).filter(Boolean);
}

/**
 * Parse UPSET entries.
 */
function parseUpsetsJSON(content) {
  if (!content) return [];
  return content.split(/;\s*/).map(entry => {
    const e = entry.trim();
    if (!e) return null;
    const m = e.match(
      /^(.+?)\s+\(avg\s+(\d+)\s*MMR\)\s+beat\s+favorites?\s+\(avg\s+(\d+)\s*MMR\)\s+on\s+(.+?)\s+[—-]\s+(\d+)\s*MMR\s*gap\s+([a-f0-9]+)\s+\[([^\]]+)\]/i
    );
    if (!m) return null;
    const parts = m[7].split('|');
    if (parts.length < 4) return null;
    const underdogMmrs = parts[0].split(',').map(Number);
    const favoriteMmrs = parts[1].split(',').map(Number);
    const underdogTags = parts[2].split(',');
    const favoriteTags = parts[3].split(',');
    return {
      matchId: m[6],
      map: m[4],
      mmrGap: parseInt(m[5]),
      underdogs: underdogTags.map((tag, i) => ({ battleTag: tag, mmr: underdogMmrs[i] || 0 })),
      favorites: favoriteTags.map((tag, i) => ({ battleTag: tag, mmr: favoriteMmrs[i] || 0 })),
    };
  }).filter(Boolean);
}

/**
 * Parse AT_SPOTLIGHT entries with optional bracket data.
 */
function parseATSpotlightJSON(content) {
  if (!content) return [];
  return content.split(/;\s*/).map(entry => {
    const m = entry.trim().match(
      /^(.+?)\s+\((\d)-stack,\s*avg\s+(\d+)\s*MMR\)\s+(\d+)W-(\d+)L\s+(\d+)%(?:\s+\[([^\]]+)\])?$/
    );
    if (!m) return null;
    const playerNames = m[1].split(/\s*\+\s*/);
    const wins = parseInt(m[4]);
    const losses = parseInt(m[5]);

    // Parse bracket data [tags|mmrs]
    let players = playerNames.map(name => ({ name, battleTag: null, mmr: null }));
    if (m[7]) {
      const bParts = m[7].split('|');
      if (bParts.length >= 2) {
        const tags = bParts[0].split(',');
        const mmrs = bParts[1].split(',').map(Number);
        players = tags.map((tag, i) => ({
          name: tag.split('#')[0],
          battleTag: tag,
          mmr: mmrs[i] || null,
        }));
      }
    }

    return {
      players,
      stackSize: parseInt(m[2]),
      avgMmr: parseInt(m[3]),
      wins,
      losses,
      winRate: parseInt(m[6]),
    };
  }).filter(Boolean);
}

/**
 * Parse MENTIONS into { name: battleTag } mapping.
 */
function parseMentionsJSON(content) {
  if (!content) return {};
  const result = {};
  for (const tag of content.split(',')) {
    const trimmed = tag.trim();
    if (!trimmed) continue;
    const name = trimmed.split('#')[0];
    if (name) result[name] = trimmed;
  }
  return result;
}

/**
 * Convert flat-text weekly digest into structured JSON.
 * @param {string} digestText - The flat "KEY: content\n" text
 * @param {object} opts - Optional metadata: { weekStart, weekEnd, stats, clips }
 * @returns {object} Structured digest JSON per DIGEST_DATA_STANDARD.md
 */
export function digestToJSON(digestText, { weekStart, weekEnd, stats, clips } = {}) {
  const sections = parseDigestSections(digestText);
  const find = (key) => sections.find(s => s.key === key)?.content || null;

  return {
    version: 1,
    weekStart: weekStart || null,
    weekEnd: weekEnd || null,
    narrative: {
      topics: parseTopicsJSON(find('TOPICS')),
      drama: parseDramaItems(find('DRAMA')),
      bans: parseBanItems(find('BANS')),
      highlights: parseHighlightItems(find('HIGHLIGHTS')),
      recap: find('RECAP') || null,
      bestOfChat: find('BEST_OF_CHAT') || null,
    },
    spotlights: {
      winner: parseSpotlightCard('WINNER', sections),
      loser: parseSpotlightCard('LOSER', sections),
      grinder: parseSpotlightCard('GRINDER', sections),
      hotStreak: parseStreakCard('HOTSTREAK', sections),
      coldStreak: parseStreakCard('COLDSTREAK', sections),
      heroSlayer: parseHeroSlayerCard(sections),
    },
    powerRankings: parsePowerRankingsJSON(find('POWER_RANKINGS')),
    matchStats: parseAwardCardsJSON(find('MATCH_STATS'), sections),
    heroMeta: parseAwardCardsJSON(find('HEROES'), sections),
    newBlood: parseNewBloodJSON(find('NEW_BLOOD')),
    upsets: parseUpsetsJSON(find('UPSET')),
    atSpotlight: parseATSpotlightJSON(find('AT_SPOTLIGHT')),
    mentions: parseMentionsJSON(find('MENTIONS')),
    stats: stats || null,
    clips: clips || [],
  };
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
const SEMICOLON_SECTIONS = new Set(['DRAMA', 'BANS', 'HIGHLIGHTS', 'SPIKES', 'NEW_BLOOD', 'UPSET', 'AT_SPOTLIGHT']);

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
DRAMA: Accusations, threats, heated personal attacks, AND juicy back-and-forth exchanges. Max 10 items separated by semicolons. CRITICAL FORMAT: each item is ONE unit — narrative text followed by quotes with NO semicolon between them. A semicolon ONLY separates one complete item from the next.

  LEAD ITEM (first item): Write a 2-3 sentence mini-story about the day's biggest drama. Set the scene — what sparked it, who was involved, how it escalated or resolved. This becomes the "Top Story" headline on the site. Follow with 3-4 of the spiciest direct quotes. Example: "ToD and GhostGGGL went at it for hours after GhostGGGL accused ToD of building towers instead of fighting. The beef started when ToD lost a game and blamed his teammates, then GhostGGGL piled on. It ended with ToD threatening to report GhostGGGL for griefing. "ToD: you built zero towers all game" "GhostGGGL: Tod no eyes blocked by the nose" "ToD: enjoy your ban" "GhostGGGL: cry more""

  REMAINING ITEMS (items 2-10): Short summary (max 10 words, NO quotes in it) then 2-3 direct quotes. Example: "PlayerA accused PlayerB of maphack "PlayerA: nice maphack" "PlayerB: cope""

  Every quote MUST have speaker attribution "Name: text".

BANS: Who got banned, duration, reason (skip if none); semicolon-separated. Include the match ID if mentioned.
HIGHLIGHTS: Funny, wholesome, or absurd moments (3-5 items, semicolon-separated). Each item MUST include 1-2 direct quotes with speaker attribution. Don't just describe what happened — show it with the actual quote that made it funny. Good: "Classic4 toasted nonamee mid-game "Classic4: cheers nonamee! micro and apm is faster" "Classic4: ( *u*)d". Bad: "Classic4 made a joke about drinking".
RECAP: 1-2 sentences summarizing the day's overall vibe. Deadpan zine voice — state the facts, let the absurdity land.

Rules:
1. No title, no date header, jump straight into TOPICS:
2. CRITICAL FORMAT: PLAIN TEXT ONLY. No markdown (no **, no ##, no *). No blank lines within a section. Each section is one line: "KEY: content". DRAMA items separated by semicolons on that one line.
3. TOPICS must be specific and flavorful, not generic buckets. Name players, strategies, or events. Max 4 words per tag.
4. CRITICAL: Use EXACT player names as they appear in the chat log. Never shorten or abbreviate names. The player list is: ${names.join(', ')}
5. Prioritize high-MMR players (1800+), their drama is more interesting.
6. DRAMA: aim for 10 items. Include minor beefs and trash talk too, not just the biggest blowups. Every item needs 2-4 direct quotes from the chat log.
7. DRAMA lead item (first): 2-3 sentence narrative, NO quoted text mixed in — all "quoted text" goes at the END only. Remaining items: summary under 10 words with NO quoted text in it — all "quoted text" goes at the END. NO semicolons between quotes within the same item.
8. CRITICAL: Every direct quote MUST be attributed with "SpeakerName: quote text" format. Example: "ToD: you are garbage" not just "you are garbage".
9. DRAMA summaries use PLAIN verbs only: "flamed", "went off on", "called out", "blamed", "mocked", "accused". NEVER use: "unleashed", "eviscerated", "ripped into", "devolving", "decimated", "obliterated", "destroyed", "dismantled", "torched" or any dramatic/flowery synonyms.
10. No filler like "engaged in", "exchanged", "calling him", "told him", "repeatedly calling". The quotes speak for themselves.
11. Write like a punk gaming zine. Short punchy sentences. Fragments OK. Deadpan. No em-dashes. No AI-speak.
12. Foreign language drama is GOLD. If someone posts threats or insults in Chinese/Korean/etc and another player translates it, that is top-tier content. Always include it. Use the English translation as the quote. If no translation exists in chat, translate it yourself. Always quote in English.
13. BANS and DRAMA must not overlap — if someone got banned, put it in BANS only, not in DRAMA.
14. State facts only, no commentary (no "classic", "brutal", "chaos", etc).
15. ASCII only.
16. DRAMA max 10 items, HIGHLIGHTS max 5 items, BANS max 2 items.
17. Pick the SPICIEST quotes — insults, threats, trash talk, rage. Skip bland quotes like "ok" or "whatever". The best quotes make you laugh or gasp.
18. Total under 4000 chars.
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
          max_tokens: 2400,
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
  const published = autoPublishDigest(fullDraft, 7);
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
- DRAMA: accusations, flame wars, heated exchanges. Format: short summary (max 10 words, NO quotes in it), then 2-3 direct quotes at the end. Every quote must have speaker attribution. Example: "PlayerA flamed PlayerB over tower rush \\"PlayerA: you are garbage\\" \\"PlayerB: cry more\\""
- HIGHLIGHTS: funny, wholesome, absurd moments. Same format: short summary + 1-2 quotes with speaker attribution ("Name: quote"). Show the humor with actual quotes.
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
- Format each item: short summary (max 10 words, plain verbs only), then 1-3 direct quotes with speaker attribution. Example: "PlayerA flamed PlayerB over tower rush \\"PlayerA: you are garbage\\" \\"PlayerB: cry more\\""
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

/* ── Top weekly chat moments (for richer weekly context) ── */

const BORING_MSG_RE = /^(gg|go|gl hf|gogo|lol|lmao|haha|yes|no|ok|\.+|!+|\?+|wb|ty|thx|np|brb|afk)$/i;
const COMMAND_RE = /^[!/\\]/;
const DRAMA_KEYWORDS = /\b(ban|grief|cheat|report|kick|toxic|maphack|smurf|hack|exploit)\b/i;
const TRASH_TALK_RE = /\b(you always|you never|your fault|blame|carried|useless|trash|noob|idiot)\b/i;

function scoreChatMessage(msg) {
  const text = msg.message;
  if (!text || text.length < 5) return -1;
  if (BORING_MSG_RE.test(text.trim())) return -1;
  if (COMMAND_RE.test(text.trim())) return -50;

  let score = Math.min(text.length, 60);

  if (DRAMA_KEYWORDS.test(text)) score += 50;
  if (TRASH_TALK_RE.test(text)) score += 40;

  // Emotional intensity
  if (/!!/.test(text)) score += 15;
  if (/\?\?/.test(text)) score += 15;
  const upper = text.replace(/[^A-Z]/g, '').length;
  const alpha = text.replace(/[^a-zA-Z]/g, '').length;
  if (alpha > 5 && upper / alpha > 0.6) score += 15;
  if (/\b(lmao|omg|wtf|bruh)\b/i.test(text)) score += 15;

  // First person — personal stakes
  if (/\b(I |my |im |i'm )\b/i.test(text)) score += 20;

  // Non-English bonus (CJK, Cyrillic, Arabic)
  if (/[\u4e00-\u9fff\u0400-\u04ff\u0600-\u06ff]/.test(text)) score += 25;

  return score;
}

function deduplicateMessages(msgs) {
  const result = [];
  for (const msg of msgs) {
    const isDupe = result.some(existing => {
      const a = existing.message.toLowerCase();
      const b = msg.message.toLowerCase();
      if (a.length === 0 || b.length === 0) return false;
      const shorter = a.length <= b.length ? a : b;
      const longer = a.length > b.length ? a : b;
      return longer.includes(shorter) || (shorter.length > 10 && longer.includes(shorter.slice(0, Math.floor(shorter.length * 0.8))));
    });
    if (!isDupe) result.push(msg);
  }
  return result;
}

export function getTopWeeklyMessages(weekStart, weekEnd, limit = 25) {
  const messages = getAllMessagesByDateRange(weekStart, weekEnd, 2000);
  if (messages.length === 0) return [];

  const scored = messages
    .map(m => ({ ...m, _score: scoreChatMessage(m) }))
    .filter(m => m._score > 0)
    .sort((a, b) => b._score - a._score);

  const deduped = deduplicateMessages(scored);

  return deduped
    .slice(0, limit)
    .map(m => ({ userName: m.user_name, message: m.message, battleTag: m.battle_tag }));
}

/* ── Weekly digest generation ────────────────────── */

const STAT_LINE_RE = /^(WINNER|LOSER|GRINDER|HOTSTREAK|COLDSTREAK|HEROSLAYER):\s*(.+)$/gm;

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
 * Compute aggregate match stats across a week.
 * Reads from stored daily_player_stats in DB first; falls back to API for missing days.
 */
async function computeWeeklyMatchStats(weekStart, weekEnd) {
  const startDate = new Date(weekStart + 'T12:00:00Z');
  const endDate = new Date(weekEnd + 'T12:00:00Z');
  const weeklyPlayerMap = new Map();
  const raceStats = {};
  let totalGames = 0;
  let mmrSum = 0;
  let mmrCount = 0;
  let daysLoaded = 0;

  // Try bulk read from DB first
  const storedRows = getDailyPlayerStatsRange(weekStart, weekEnd);
  const storedByDate = new Map();
  for (const row of storedRows) {
    if (!storedByDate.has(row.date)) storedByDate.set(row.date, []);
    storedByDate.get(row.date).push(row);
  }

  for (let d = new Date(startDate); d <= endDate; d.setUTCDate(d.getUTCDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10);

    // Use stored DB stats if available
    const dbRows = storedByDate.get(dateStr);
    if (dbRows && dbRows.length > 0) {
      for (const row of dbRows) {
        if (!weeklyPlayerMap.has(row.battle_tag)) {
          weeklyPlayerMap.set(row.battle_tag, {
            battleTag: row.battle_tag, name: row.name, race: row.race,
            mmrChange: 0, wins: 0, losses: 0, currentMmr: 0, form: '',
          });
        }
        const wp = weeklyPlayerMap.get(row.battle_tag);
        wp.mmrChange += row.mmr_change;
        wp.wins += row.wins;
        wp.losses += row.losses;
        wp.currentMmr = Math.max(wp.currentMmr, row.current_mmr);
        wp.form += row.form;
        if (!wp.race && row.race) wp.race = row.race;

        const raceName = RACE_NAMES[row.race];
        if (raceName && raceName !== 'RND') {
          if (!raceStats[raceName]) raceStats[raceName] = { picks: 0, wins: 0 };
          raceStats[raceName].picks += row.wins + row.losses;
          raceStats[raceName].wins += row.wins;
        }
        if (row.current_mmr > 0) { mmrSum += row.current_mmr; mmrCount++; }
      }
      totalGames += dbRows.reduce((s, r) => s + r.wins, 0);
      daysLoaded++;
      continue;
    }

    // Fall back to API fetch (also saves to DB for next time)
    let result;
    try {
      result = await computePlayerStats(dateStr);
    } catch (err) {
      console.warn(`[Weekly] Stats fetch failed for ${dateStr}:`, err.message);
      continue;
    }
    if (!result) continue;

    for (const [tag, stats] of result.playerStats) {
      if (!weeklyPlayerMap.has(tag)) {
        weeklyPlayerMap.set(tag, {
          battleTag: tag, name: stats.name, race: stats.race,
          mmrChange: 0, wins: 0, losses: 0, currentMmr: 0, form: '',
        });
      }
      const wp = weeklyPlayerMap.get(tag);
      wp.mmrChange += stats.mmrChange;
      wp.wins += stats.wins;
      wp.losses += stats.losses;
      wp.currentMmr = Math.max(wp.currentMmr, stats.currentMmr);
      wp.form += stats.form;
      if (!wp.race && stats.race) wp.race = stats.race;

      const raceName = RACE_NAMES[stats.race];
      if (raceName && raceName !== 'RND') {
        if (!raceStats[raceName]) raceStats[raceName] = { picks: 0, wins: 0 };
        raceStats[raceName].picks += stats.wins + stats.losses;
        raceStats[raceName].wins += stats.wins;
      }
      if (stats.currentMmr > 0) { mmrSum += stats.currentMmr; mmrCount++; }
    }
    totalGames += result.totalGames || 0;
    daysLoaded++;
  }

  console.log(`[Weekly] Loaded stats for ${daysLoaded}/7 days (${weeklyPlayerMap.size} unique players)`);

  const uniquePlayers = weeklyPlayerMap.size;
  const averageMmr = mmrCount > 0 ? Math.round(mmrSum / mmrCount) : 0;

  return { weeklyPlayerMap, raceStats, topMaps: [], totalGames, uniquePlayers, averageMmr };
}

/**
 * Compute weekly awards from aggregated player stats.
 */
function computeWeeklyAwards(weeklyPlayerMap) {
  const MIN_GAMES_WEEKLY = 3;
  const MIN_GAMES_MVP = 5;
  const qualified = [...weeklyPlayerMap.values()].filter(p => p.wins + p.losses >= MIN_GAMES_WEEKLY);

  // POWER_RANKINGS: top 5 + bottom 5 by mmrChange (regardless of sign)
  const byMmrChange = [...qualified].sort((a, b) => b.mmrChange - a.mmrChange);
  const top5 = byMmrChange.slice(0, 5);
  const bot5 = byMmrChange.slice(-5).reverse();
  const seen = new Set(top5.map(p => p.battleTag));
  const deduped = [...top5, ...bot5.filter(p => !seen.has(p.battleTag))];
  const powerRankings = deduped
    .map((p, i) => {
      const race = RACE_NAMES[p.race] || '';
      const sign = p.mmrChange > 0 ? '+' : '';
      return `${p.battleTag}${race ? '[' + race + ']' : ''} ${sign}${Math.round(p.mmrChange)} MMR (${p.wins}W-${p.losses}L) ${p.form}`;
    });

  return { powerRankings };
}

/**
 * Compute weekly streaks from concatenated daily form strings.
 * Returns { hotStreak, coldStreak } players with cross-day streaks.
 */
function computeWeeklyStreaks(weeklyPlayerMap) {
  const MIN_WEEKLY_STREAK = 5;
  const results = [];

  for (const p of weeklyPlayerMap.values()) {
    if (!p.form || p.form.length < MIN_WEEKLY_STREAK) continue;
    let winStreak = 0, maxWin = 0, lossStreak = 0, maxLoss = 0;
    for (const ch of p.form) {
      if (ch === 'W') { winStreak++; lossStreak = 0; if (winStreak > maxWin) maxWin = winStreak; }
      else { lossStreak++; winStreak = 0; if (lossStreak > maxLoss) maxLoss = lossStreak; }
    }
    results.push({ ...p, weeklyWinStreak: maxWin, weeklyLossStreak: maxLoss });
  }

  const byWin = results.filter(p => p.weeklyWinStreak >= MIN_WEEKLY_STREAK).sort((a, b) => b.weeklyWinStreak - a.weeklyWinStreak);
  const byLoss = results.filter(p => p.weeklyLossStreak >= MIN_WEEKLY_STREAK).sort((a, b) => b.weeklyLossStreak - a.weeklyLossStreak);

  return { hotStreak: byWin[0] || null, coldStreak: byLoss[0] || null };
}

/**
 * Build a one-liner blurb for a spotlight player based on daily stats breakdown.
 * @param {"WINNER"|"LOSER"|"GRINDER"|"HOTSTREAK"|"COLDSTREAK"} type
 * @param {object} player - weekly aggregated player stats
 * @param {Array} dailyRows - daily_player_stats rows for this player during the week
 * @returns {string|null}
 */
function buildSpotlightBlurb(type, player, dailyRows) {
  if (!player) return null;
  const total = player.wins + player.losses;
  if (total === 0) return null;
  const wr = Math.round(player.wins / total * 100);
  const raceName = RACE_NAMES[player.race] || null;
  const raceStr = raceName ? ` on ${raceName}` : '';
  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const NOTABLE_DAYS = {
    '02-14': "Valentine's Day", '03-17': "St. Patrick's Day",
    '10-31': 'Halloween', '12-24': 'Christmas Eve', '12-25': 'Christmas',
    '12-31': "New Year's Eve", '01-01': "New Year's Day",
  };

  // Find the day with the most relevant games
  const dayBreakdown = dailyRows
    .filter(r => r.battle_tag === player.battleTag)
    .map(r => {
      const d = new Date(r.date + 'T12:00:00Z');
      const notable = NOTABLE_DAYS[r.date.slice(5)]; // MM-DD lookup
      return { date: r.date, day: notable || DAY_NAMES[d.getUTCDay()], wins: r.wins, losses: r.losses, form: r.form || '' };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const daysPlayed = dayBreakdown.length;
  const peakDay = [...dayBreakdown].sort((a, b) => (b.wins + b.losses) - (a.wins + a.losses))[0];
  const peakDayGames = peakDay ? peakDay.wins + peakDay.losses : 0;

  // Session duration from match timestamps (first game → last game per day)
  const playerResults = (player.results || []).slice().sort((a, b) => a.time - b.time);
  const sessionHours = playerResults.length >= 2
    ? Math.round((playerResults[playerResults.length - 1].time - playerResults[0].time) / (1000 * 60 * 60))
    : null;

  if (type === 'WINNER') {
    const mmr = player.mmrChange ? `+${Math.abs(Math.round(player.mmrChange))} MMR` : null;
    const best = [...dayBreakdown].sort((a, b) => b.wins - a.wins)[0];
    let line = mmr
      ? `Climbed ${mmr} across ${total} games${raceStr} — ${wr}% win rate.`
      : `Went ${player.wins}-${player.losses}${raceStr} across ${total} games — ${wr}% win rate.`;
    if (best && best.wins >= 5 && dayBreakdown.length > 1) {
      line += ` Best day: ${best.day}, going ${best.wins}-${best.losses}.`;
    }
    if (daysPlayed === 7) {
      line += ' Played every single day.';
    }
    return line;
  }

  if (type === 'LOSER') {
    const mmr = player.mmrChange ? Math.abs(Math.round(player.mmrChange)) : null;
    const worst = [...dayBreakdown].sort((a, b) => b.losses - a.losses)[0];
    let line;
    // Single-session loser: all games on one day
    if (daysPlayed === 1 && dayBreakdown[0]) {
      const dayName = dayBreakdown[0].day;
      if (total <= 6) {
        line = `Played ${total} games on ${dayName}, lost ${player.losses === total ? 'all' : player.losses} of them${raceStr}.`;
      } else {
        line = `Crammed ${total} games into a single ${dayName} session${raceStr} — went ${player.wins}-${player.losses}.`;
      }
    } else if (total <= 6) {
      line = `A brutal ${player.wins}-${player.losses} week${raceStr}.`;
    } else {
      line = `Went ${player.wins}-${player.losses}${raceStr} across ${total} games — just ${wr}% win rate.`;
    }
    if (mmr) {
      const perGame = total > 0 ? Math.round(mmr / total) : 0;
      line += ` Lost ${mmr} MMR`;
      // Show per-game average when losses are few but expensive
      if (total <= 10 && perGame >= 30) {
        line += ` (~${perGame} per game).`;
      } else {
        line += '.';
      }
    }
    if (worst && worst.losses >= 5 && daysPlayed > 1) {
      line = line.replace(/\.$/, '') + ` — worst day: ${worst.day} (${worst.wins}-${worst.losses}).`;
    }
    return line;
  }

  if (type === 'GRINDER') {
    const parts = [];
    parts.push(`${total} games.`);
    if (daysPlayed === 7) {
      parts.push('Every single day.');
    } else if (daysPlayed >= 5) {
      parts.push(`${daysPlayed} of 7 days.`);
    }
    if (peakDay && peakDayGames >= 15 && daysPlayed > 1) {
      parts.push(`${peakDayGames} in one sitting on ${peakDay.day} alone.`);
    }
    parts.push(`Went ${player.wins}-${player.losses} (${wr}% WR)${raceStr}`);
    // Add net MMR and notable streak for grinder
    const netMmr = player.mmrChange ? Math.round(player.mmrChange) : 0;
    const streakType = (player.lossStreak || 0) > (player.winStreak || 0) ? 'loss' : 'win';
    const streakLen = streakType === 'loss' ? player.lossStreak : player.winStreak;
    if (netMmr && streakLen >= 6) {
      parts[parts.length - 1] += ` and ${netMmr > 0 ? 'gained' : 'bled'} ${Math.abs(netMmr)} MMR across a ${streakLen}-game ${streakType} streak.`;
    } else if (netMmr) {
      const sign = netMmr > 0 ? '+' : '';
      parts[parts.length - 1] += `. Net ${sign}${netMmr} MMR.`;
    } else {
      parts[parts.length - 1] += '.';
    }
    return parts.join(' ');
  }

  if (type === 'HOTSTREAK' || type === 'COLDSTREAK') {
    const isHot = type === 'HOTSTREAK';
    const streakLen = isHot ? player.weeklyWinStreak : player.weeklyLossStreak;
    const char = isHot ? 'W' : 'L';
    const verb = isHot ? 'Won' : 'Dropped';

    // Find which days the streak games fell on
    let streakDays = [];
    let remaining = streakLen;
    // Find the streak in the weekly form to locate it
    const weeklyForm = player.form || '';
    const streakStr = char.repeat(streakLen);
    const streakIdx = weeklyForm.indexOf(streakStr);

    if (streakIdx >= 0 && dayBreakdown.length > 0) {
      // Map form index → day by walking through daily forms
      let formOffset = 0;
      for (const day of dayBreakdown) {
        const dayLen = day.form.length;
        const dayStart = formOffset;
        const dayEnd = formOffset + dayLen;
        // How many streak chars overlap with this day?
        const overlapStart = Math.max(streakIdx, dayStart);
        const overlapEnd = Math.min(streakIdx + streakLen, dayEnd);
        if (overlapEnd > overlapStart) {
          streakDays.push({ day: day.day, count: overlapEnd - overlapStart });
        }
        formOffset += dayLen;
      }
    }

    let line = `${verb} ${streakLen} in a row`;
    if (streakDays.length === 1) {
      line += ` — all in a single ${streakDays[0].day} session.`;
    } else if (streakDays.length > 1) {
      const biggest = streakDays.reduce((a, b) => b.count > a.count ? b : a);
      if (biggest.count >= streakLen * 0.6) {
        line += ` — ${biggest.count} of them on ${biggest.day}.`;
      } else {
        line += ` — spanning ${streakDays[0].day} through ${streakDays[streakDays.length - 1].day}.`;
      }
    } else {
      line += '.';
    }
    return line;
  }

  return null;
}

/**
 * Compute per-day breakdown for a streak player, with streak overlap info.
 * Output format: "Mon:WWLW,0,+32;Tue:WWWWWWW,7,+48;Wed:WWWW,4,+14|streakIdx:3,streakLen:11"
 * @param {"HOTSTREAK"|"COLDSTREAK"} type
 * @param {object} player - weekly aggregated player stats (must have .form, .weeklyWinStreak/.weeklyLossStreak)
 * @param {Array} dailyRows - daily_player_stats rows for all players during the week
 * @returns {string|null}
 */
function computeStreakDailyBreakdown(type, player, dailyRows) {
  if (!player) return null;
  const isHot = type === 'HOTSTREAK';
  const streakLen = isHot ? player.weeklyWinStreak : player.weeklyLossStreak;
  if (!streakLen || streakLen < 3) return null;

  const char = isHot ? 'W' : 'L';
  const weeklyForm = player.form || '';
  const streakStr = char.repeat(streakLen);
  const streakIdx = weeklyForm.indexOf(streakStr);
  if (streakIdx < 0) return null;

  const DAY_ABBREV = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const dayBreakdown = dailyRows
    .filter(r => r.battle_tag === player.battleTag)
    .map(r => {
      const d = new Date(r.date + 'T12:00:00Z');
      return { date: r.date, day: DAY_ABBREV[d.getUTCDay()], form: r.form || '', mmrChange: r.mmr_change || 0 };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  if (dayBreakdown.length === 0) return null;

  // Build day entries with streak overlap count
  let formOffset = 0;
  const dayEntries = [];
  for (const day of dayBreakdown) {
    const dayLen = day.form.length;
    if (dayLen === 0) { formOffset += dayLen; continue; }
    const dayStart = formOffset;
    const dayEnd = formOffset + dayLen;
    // Count how many streak chars overlap this day
    const overlapStart = Math.max(streakIdx, dayStart);
    const overlapEnd = Math.min(streakIdx + streakLen, dayEnd);
    const streakGames = Math.max(0, overlapEnd - overlapStart);
    const mmrSign = day.mmrChange >= 0 ? '+' : '';
    dayEntries.push(`${day.day}:${day.form},${streakGames},${mmrSign}${day.mmrChange}`);
    formOffset += dayLen;
  }

  return `${dayEntries.join(';')}|streakIdx:${streakIdx},streakLen:${streakLen}`;
}

/**
 * Compute streak spectrum: all players' max win/loss streaks for the week.
 * Output format: "W:3=12,4=8,5=3,11=1|L:3=10,4=5,16=1"
 * @param {Map} weeklyPlayerMap
 * @returns {string|null}
 */
function computeStreakSpectrum(weeklyPlayerMap) {
  const winHist = {};
  const lossHist = {};

  for (const p of weeklyPlayerMap.values()) {
    if (!p.form || p.form.length < 3) continue;
    let winStreak = 0, maxWin = 0, lossStreak = 0, maxLoss = 0;
    for (const ch of p.form) {
      if (ch === 'W') { winStreak++; lossStreak = 0; if (winStreak > maxWin) maxWin = winStreak; }
      else { lossStreak++; winStreak = 0; if (lossStreak > maxLoss) maxLoss = lossStreak; }
    }
    if (maxWin >= 3) winHist[maxWin] = (winHist[maxWin] || 0) + 1;
    if (maxLoss >= 3) lossHist[maxLoss] = (lossHist[maxLoss] || 0) + 1;
  }

  const fmtHist = (h) => Object.entries(h).sort((a, b) => Number(a[0]) - Number(b[0])).map(([len, count]) => `${len}=${count}`).join(',');
  const wStr = fmtHist(winHist);
  const lStr = fmtHist(lossHist);
  if (!wStr && !lStr) return null;
  return `W:${wStr}|L:${lStr}`;
}

/**
 * Pick the best chat quotes from a player's messages during the week.
 * Filters out short/boring messages and scores by relevance to the spotlight type.
 * @param {string} battleTag
 * @param {string} weekStart
 * @param {string} weekEnd
 * @param {number} max
 * @param {string} spotlightType - e.g. "WINNER", "COLDSTREAK" etc. for context-aware scoring
 */
/**
 * Score chat messages for a player, returning scored candidates.
 * Used by both pickPlayerQuotes (auto) and the browse-messages endpoint.
 */
function scorePlayerMessages(battleTag, weekStart, weekEnd, spotlightType = null) {
  let messages;
  try {
    messages = getMessagesByDateRangeAndUser(weekStart, weekEnd, battleTag, 500);
  } catch (err) {
    console.warn(`[Blurb] Chat query failed for ${battleTag}:`, err.message);
    return [];
  }
  if (!messages || messages.length === 0) return [];

  const BORING = /^(gg|go|gl hf|gogo|lol|lmao|haha|yes|no|ok|\.+|!+|\?+)$/i;
  const MIN_LEN = 10;

  // Tiered keywords: strong signals (+50) vs weak signals (+15)
  const KEYWORDS_BY_TYPE = {
    WINNER: {
      strong: /\b(win\s*streak|on\s*a\s*roll|lets?\s*go+|carry|carried|mvp|im\s*(so\s*)?good|ez\s*game|pogchamp|climbing|i\s*am\s*(the|a)\s*\w+|grandmaster|top\s*\d+|imba|progamer|fear\s*me)\b/i,
      weak: /\b(mmr|win|won|climb|rank|ez|easy)\b/i,
    },
    LOSER: {
      strong: /\b(i\s*(keep\s*)?los|lost\s*(so|every)|drop(ped|ping)|derank|im\s*done|tilt(ed)?|uninstall|cant\s*win|this\s*is\s*unfair)\b/i,
      weak: /\b(mmr|lost|bad|blame|grief|throw|quit)\b/i,
    },
    GRINDER: {
      strong: /\b(one\s*more|cant\s*stop|all\s*(day|night)|addicted|again|another\s*one|keep\s*going|hours?|sleep|no\s*life|pyjamas|pajamas|bed|coffee|food\s*and|holiday\s*is|non.?stop|marathon|progamer|i\s*am\s*(the|a)\s*\w+|grandmaster)\b/i,
      weak: /\b(game|games|grind|playing|queue|lifestyle|home|work)\b/i,
    },
    HOTSTREAK: {
      strong: /\b(win\s*streak|on\s*a\s*roll|unstoppable|on\s*fire|cant\s*lose|lets?\s*go+|carry|carried|climbing|i\s*am\s*(the|a)\s*\w+|grandmaster|top\s*\d+|imba|progamer|fear\s*me)\b/i,
      weak: /\b(mmr|win|won|streak|row|ez)\b/i,
    },
    COLDSTREAK: {
      strong: /\b(i\s*(keep\s*)?los|lost\s*(so|every|again)|losing\s*streak|cant\s*win|drop(ped|ping)\s*mmr|im\s*done|tilt(ed)?|uninstall|derank|give\s*up|this\s*game\s*is|so\s*(un)?lucky|rigged|why\s*(do\s*)?i|what\s*is\s*wrong|how\s*(do|did)\s*i\s*lose)\b/i,
      weak: /\b(los[est]|lost|streak|row|mmr|drop|tilt|bad|unlucky|unfair|done)\b/i,
    },
  };

  const tiers = spotlightType && KEYWORDS_BY_TYPE[spotlightType] ? KEYWORDS_BY_TYPE[spotlightType] : null;

  // Detect non-ASCII (CJK, Arabic, Cyrillic, etc.) — these are distinctive and carry
  // more meaning per character than English, so use a lower min length
  const NON_ASCII_RE = /[^\x00-\x7F]/;
  const MIN_LEN_NON_ASCII = 4;

  const candidates = messages
    .filter(m => {
      if (!m.message) return false;
      const t = m.message.trim();
      if (BORING.test(t)) return false;
      const hasNonAscii = NON_ASCII_RE.test(t);
      return t.length >= (hasNonAscii ? MIN_LEN_NON_ASCII : MIN_LEN);
    })
    .map(m => {
      const text = m.message.trim();
      const lower = text.toLowerCase();
      const hasNonAscii = NON_ASCII_RE.test(text);
      // Base score: moderate length bonus (cap at 60 so keywords dominate)
      let score = Math.min(text.length, 60);
      // Non-English bonus: distinctive flavor, stands out in a spotlight card (+25)
      if (hasNonAscii && text.length >= 6) score += 25;
      // Strong keyword matches (+50 each)
      if (tiers?.strong) {
        const strongMatches = lower.match(new RegExp(tiers.strong.source, 'gi'));
        if (strongMatches) score += strongMatches.length * 50;
      }
      // Weak keyword matches (+15 each)
      if (tiers?.weak) {
        const weakMatches = lower.match(new RegExp(tiers.weak.source, 'gi'));
        if (weakMatches) score += weakMatches.length * 15;
      }
      // First person = player expressing feelings (+20)
      if (/\b(i|im|i'm|i've|my|me)\b/i.test(lower)) score += 20;
      // Emotional emphasis (+10)
      if (/[!?]{2,}/.test(text) || /\b(lmao|omg|wtf|bruh|smh|fml)\b/i.test(lower)) score += 10;
      // Penalty for commands, @mentions, or talking about other players (not self)
      if (text.startsWith('!') || text.startsWith('/')) score -= 50;
      // Penalty for messages that are mostly about other players
      if (/\b(tod|happy|grubby|lyn|foggy|moon)\b/i.test(lower) && !/\b(i|im|i'm|my|me)\b/i.test(lower)) score -= 20;
      return {
        name: m.user_name || battleTag.split('#')[0],
        text,
        score,
        sentAt: m.sent_at,
        received_at: m.received_at,
      };
    });

  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score);
  return candidates;
}

function pickPlayerQuotes(battleTag, weekStart, weekEnd, max = 3, spotlightType = null) {
  const candidates = scorePlayerMessages(battleTag, weekStart, weekEnd, spotlightType);
  if (candidates.length === 0) return [];

  // Deduplicate similar messages (skip if >80% overlap with already picked)
  const picked = [];
  for (const c of candidates) {
    if (picked.length >= max) break;
    const isDupe = picked.some(p => {
      const shorter = Math.min(p.text.length, c.text.length);
      const common = [...c.text.toLowerCase()].filter((ch, i) => i < p.text.length && p.text[i]?.toLowerCase() === ch).length;
      return common / shorter > 0.8;
    });
    if (!isDupe) picked.push(c);
  }

  return picked.map(p => `${p.name}: ${p.text}`);
}

/**
 * Return all scored message candidates for a player (for the admin message browser).
 * Includes both messages BY the player and messages ABOUT the player (mentions from others).
 */
export function getPlayerMessageCandidates(weekStart, statKey, battleTag) {
  const startDate = new Date(weekStart + 'T12:00:00Z');
  const endDate = new Date(startDate);
  endDate.setUTCDate(endDate.getUTCDate() + 6);
  const weekEnd = endDate.toISOString().slice(0, 10);

  // Messages BY the player
  const byPlayer = scorePlayerMessages(battleTag, weekStart, weekEnd, statKey);

  // Messages ABOUT the player (from other people)
  const playerName = battleTag.split('#')[0];
  const searchTerms = [playerName.toLowerCase()];
  // Add common shortened forms (3+ chars from the start)
  if (playerName.length > 5) {
    // Try first 4-5 chars as a short form (e.g., "KODOFORSAKEN" → "kodo")
    for (let len = 4; len <= Math.min(6, playerName.length - 1); len++) {
      const short = playerName.slice(0, len).toLowerCase();
      if (!searchTerms.includes(short)) searchTerms.push(short);
    }
  }

  let mentions = [];
  try {
    const raw = getMessagesByDateRangeMentioning(weekStart, weekEnd, searchTerms, battleTag, 200);
    if (raw && raw.length > 0) {
      const MIN_LEN = 8;
      mentions = raw
        .filter(m => m.message && m.message.trim().length >= MIN_LEN)
        .map(m => {
          const text = m.message.trim();
          let score = Math.min(text.length, 40);
          // Boost messages that directly name the player
          const lower = text.toLowerCase();
          if (lower.includes(playerName.toLowerCase())) score += 30;
          // Boost if talking about the player in context
          if (/\b(he|his|him|they|their|that\s*guy)\b/i.test(lower)) score += 10;
          return {
            name: m.user_name || m.battle_tag?.split('#')[0] || '?',
            text,
            score,
            sentAt: m.sent_at,
            received_at: m.received_at,
            battle_tag: m.battle_tag,
            isMention: true,
          };
        })
        .sort((a, b) => b.score - a.score);
    }
  } catch (err) {
    console.warn(`[Browse] Mentions query failed for ${battleTag}:`, err.message);
  }

  // Return both lists, player messages first, then mentions
  return [...byPlayer, ...mentions];
}

/**
 * Generate BLURB and QUOTES lines for all spotlight stat types.
 * Returns array of strings like ["WINNER_BLURB: ...", "WINNER_QUOTES: ...", ...]
 */
function generateSpotlightBlurbs(spotlights, dailyRows, weekStart, weekEnd) {
  const lines = [];
  for (const { key, player } of spotlights) {
    if (!player) continue;
    const blurb = buildSpotlightBlurb(key, player, dailyRows);
    if (blurb) lines.push(`${key}_BLURB: ${blurb}`);
    const quotes = pickPlayerQuotes(player.battleTag, weekStart, weekEnd, 3, key);
    if (quotes.length > 0) lines.push(`${key}_QUOTES: ${quotes.map(q => `"${q}"`).join('; ')}`);
  }
  return lines;
}

/**
 * Regenerate quotes for a single spotlight key.
 * Returns { KEY_QUOTES: "..." } or empty if no quotes found.
 */
export function regeneratePlayerQuotes(weekStart, statKey, battleTag) {
  const startDate = new Date(weekStart + 'T12:00:00Z');
  const endDate = new Date(startDate);
  endDate.setUTCDate(endDate.getUTCDate() + 6);
  const weekEnd = endDate.toISOString().slice(0, 10);
  const quotes = pickPlayerQuotes(battleTag, weekStart, weekEnd, 3, statKey);
  const result = {};
  if (quotes.length > 0) {
    result[`${statKey}_QUOTES`] = quotes.map(q => `"${q}"`).join('; ');
  }
  return result;
}

/**
 * Find new players this week (first-ever appearance in daily_player_stats).
 */
async function computeNewBlood(weekStart, weekEnd) {
  const MIN_MMR_NEW_BLOOD = 1500;
  const MIN_GAMES_NEW_BLOOD = 3;

  // Dynamically fetch current season
  let currentSeason = 24; // fallback
  try {
    const seasonsRes = await fetch(`${API_BASE}/ladder/seasons`);
    if (seasonsRes.ok) {
      const seasons = await seasonsRes.json();
      if (seasons?.[0]?.id) currentSeason = seasons[0].id;
    }
  } catch {}
  // Check all seasons before the current one (up to 6 back)
  const seasonsToCheck = [];
  for (let s = currentSeason - 1; s >= Math.max(1, currentSeason - 6); s--) {
    seasonsToCheck.push(s);
  }

  let newPlayers;
  try {
    newPlayers = getNewPlayersForWeek(weekStart, weekEnd);
  } catch (err) {
    console.warn('[Weekly] New player query failed:', err.message);
    return [];
  }

  if (!newPlayers || newPlayers.length === 0) return [];

  // Filter: 2k+ MMR, or 5+ games
  const filtered = newPlayers.filter(p =>
    p.max_mmr >= MIN_MMR_NEW_BLOOD || p.total_games >= MIN_GAMES_NEW_BLOOD
  );

  // Enrich a larger pool first, then pick the best mix
  const pool = filtered.slice(0, 25);

  // Check previous seasons — returns { lastSeason, lastActive (YYYY-MM-DD) } or null
  async function checkHistory(battleTag) {
    for (const season of seasonsToCheck) {
      try {
        const url = `${API_BASE}/players/${encodeURIComponent(battleTag)}/game-mode-stats?season=${season}&gateway=${GATEWAY}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const prev4v4 = (Array.isArray(data) ? data : []).find(
            s => s.gameMode === GAME_MODE && (s.wins + s.losses) > 0
          );
          if (prev4v4) {
            // Fetch their most recent match date from that season
            let lastActive = null;
            try {
              const mUrl = `${API_BASE}/matches/search?playerId=${encodeURIComponent(battleTag)}&season=${season}&gateway=${GATEWAY}&gameMode=${GAME_MODE}&pageSize=1&offset=0`;
              const mRes = await fetch(mUrl);
              if (mRes.ok) {
                const mData = await mRes.json();
                if (mData.matches?.[0]?.startTime) {
                  lastActive = mData.matches[0].startTime.split('T')[0];
                }
              }
            } catch {}
            return { lastSeason: season, lastActive };
          }
        }
      } catch {}
    }
    return null;
  }

  // Check if a player was already active this season before the target week.
  // Catches false positives from local DB not having earlier data (e.g. after rebuild).
  async function wasActiveThisSeasonBeforeWeek(battleTag, weeklyGames) {
    try {
      const url = `${API_BASE}/players/${encodeURIComponent(battleTag)}/game-mode-stats?season=${currentSeason}&gateway=${GATEWAY}`;
      const res = await fetch(url);
      if (!res.ok) return false;
      const data = await res.json();
      const stats = (Array.isArray(data) ? data : []).find(s => s.gameMode === GAME_MODE);
      if (!stats) return false;
      const apiTotal = (stats.wins || 0) + (stats.losses || 0);
      // If API shows more games this season than they played this week,
      // they were active before this week — not actually new/returning
      return apiTotal > weeklyGames;
    } catch {}
    return false;
  }

  // Enrich with first appearance date + returning player detection
  const MIN_RETURN_GAP_DAYS = 14;
  const enriched = (await Promise.all(pool.map(async (p) => {
    const wasActiveBefore = await wasActiveThisSeasonBeforeWeek(p.battle_tag, p.total_games);

    const entry = {
      battleTag: p.battle_tag,
      name: p.name,
      maxMmr: p.max_mmr,
      totalGames: p.total_games,
      totalWins: p.total_wins,
      returning: false,
      lastActive: null,
      firstDate: null,
    };

    try {
      entry.firstDate = getFirstAppearanceDate(p.battle_tag);
    } catch {}

    if (wasActiveBefore) {
      // They were active earlier this season — check local DB for a gap
      const lastDate = getLastActiveDateBefore(p.battle_tag, weekStart);
      if (lastDate) {
        const gapMs = new Date(weekStart).getTime() - new Date(lastDate).getTime();
        const gapDays = Math.round(gapMs / 86400000);
        if (gapDays >= MIN_RETURN_GAP_DAYS) {
          entry.returning = true;
          entry.lastActive = lastDate;
          return entry;
        }
      }
      return null; // Active recently, not a meaningful return
    }

    // Not active this season before — check previous seasons
    const history = await checkHistory(p.battle_tag);
    if (history) {
      entry.returning = true;
      entry.lastActive = history.lastActive;
    }
    return entry;
  }))).filter(Boolean);

  // Pick a mix: prioritize truly new players, fill remaining with returning
  const trulyNew = enriched.filter(p => !p.returning);
  const returning = enriched.filter(p => p.returning);
  const result = [...trulyNew.slice(0, 8), ...returning.slice(0, 8)];

  return result;
}

function formatNewBloodLine(newBlood) {
  if (!newBlood || newBlood.length === 0) return null;
  const entries = newBlood.map(p => {
    const wr = p.totalGames > 0 ? Math.round(p.totalWins / p.totalGames * 100) : 0;
    let line = `${p.battleTag} debuted at ${p.maxMmr} MMR (${p.totalGames} games, ${wr}% WR)`;
    if (p.returning) {
      line += p.lastActive ? ` [returning:${p.lastActive}]` : ' [returning]';
    }
    if (p.firstDate) line += ` first:${p.firstDate}`;
    return line;
  });
  return `NEW_BLOOD: ${entries.join('; ')}`;
}

export { computeNewBlood, formatNewBloodLine };

/**
 * Find biggest upsets of the week (lower-MMR team winning with biggest gap).
 */
function computeWeeklyUpsets(weekStart, weekEnd) {
  let matches;
  try {
    matches = getDailyMatchesRange(weekStart, weekEnd);
  } catch (err) {
    console.warn('[Weekly] Match range query failed:', err.message);
    return [];
  }

  if (!matches || matches.length === 0) return [];

  const upsets = [];
  for (const m of matches) {
    if (!m.team1_avg_mmr || !m.team2_avg_mmr) continue;
    const gap = Math.abs(m.team1_avg_mmr - m.team2_avg_mmr);
    if (gap < 100) continue; // Only care about significant gaps

    const team1Favored = m.team1_avg_mmr > m.team2_avg_mmr;
    const underdogWon = (team1Favored && !m.team1_won) || (!team1Favored && m.team1_won);

    if (underdogWon) {
      const winnerMmr = m.team1_won ? m.team1_avg_mmr : m.team2_avg_mmr;
      const loserMmr = m.team1_won ? m.team2_avg_mmr : m.team1_avg_mmr;
      const winnerTags = m.team1_won ? m.team1_tags : m.team2_tags;
      const loserTags = m.team1_won ? m.team2_tags : m.team1_tags;
      const winnerMmrs = m.team1_won ? m.team1_mmrs : m.team2_mmrs;
      const loserMmrs = m.team1_won ? m.team2_mmrs : m.team1_mmrs;
      upsets.push({
        match_id: m.match_id,
        map: m.map_name,
        winnerAvgMmr: Math.round(winnerMmr),
        loserAvgMmr: Math.round(loserMmr),
        gap: Math.round(gap),
        winnerTags: winnerTags || '',
        loserTags: loserTags || '',
        winnerMmrs: winnerMmrs || '',
        loserMmrs: loserMmrs || '',
      });
    }
  }

  // Filter out upsets where any player has 0/missing MMR (unranked)
  const valid = upsets.filter(u => {
    const wMmrs = u.winnerMmrs ? u.winnerMmrs.split(',').map(Number) : [];
    const lMmrs = u.loserMmrs ? u.loserMmrs.split(',').map(Number) : [];
    return wMmrs.length >= 2 && lMmrs.length >= 2
      && wMmrs.every(n => n > 0) && lMmrs.every(n => n > 0);
  });

  // Sort by biggest gap
  valid.sort((a, b) => b.gap - a.gap);
  return valid.slice(0, 3);
}

/**
 * Find top-performing Arranged Team stacks of the week.
 * AT detection: players on the same team with identical oldMmr = AT group.
 */
function computeWeeklyATSpotlight(weekStart, weekEnd) {
  let matches;
  try {
    matches = getDailyMatchesRange(weekStart, weekEnd);
  } catch (err) {
    console.warn('[Weekly] AT spotlight match query failed:', err.message);
    return [];
  }

  if (!matches || matches.length === 0) return [];

  // Track AT groups: composite key (sorted battle tags) → { wins, losses, avgMmr, tags, size }
  const atGroups = new Map();

  for (const m of matches) {
    if (!m.team1_mmrs || !m.team2_mmrs || !m.team1_tags || !m.team2_tags) continue;

    const teams = [
      { mmrs: m.team1_mmrs.split(',').map(Number), tags: m.team1_tags.split(','), won: !!m.team1_won },
      { mmrs: m.team2_mmrs.split(',').map(Number), tags: m.team2_tags.split(','), won: !m.team1_won },
    ];

    for (const team of teams) {
      if (team.mmrs.length !== team.tags.length) continue;

      // Group players by matching oldMmr (2+ players with same MMR = AT)
      const mmrGroups = new Map();
      for (let i = 0; i < team.mmrs.length; i++) {
        const mmr = team.mmrs[i];
        if (mmr <= 0) continue;
        if (!mmrGroups.has(mmr)) mmrGroups.set(mmr, []);
        mmrGroups.get(mmr).push(team.tags[i]);
      }

      for (const [mmr, tags] of mmrGroups) {
        if (tags.length < 2) continue; // Solo players, not AT

        const key = [...tags].sort().join('+');
        if (!atGroups.has(key)) {
          atGroups.set(key, { tags: [...tags].sort(), size: tags.length, wins: 0, losses: 0, totalMmr: 0, games: 0 });
        }
        const group = atGroups.get(key);
        if (team.won) group.wins++;
        else group.losses++;
        group.totalMmr += mmr;
        group.games++;
      }
    }
  }

  // Filter: minimum 3 games played
  const qualified = [...atGroups.values()].filter(g => g.games >= 3);

  // Compute average MMR
  for (const g of qualified) {
    g.avgMmr = Math.round(g.totalMmr / g.games);
  }

  // Sort by stack size (descending), then win rate, then games played
  // Larger stacks (3+, 4+) are rare and always interesting
  qualified.sort((a, b) => {
    if (b.size !== a.size) return b.size - a.size;
    const wrA = a.wins / (a.wins + a.losses);
    const wrB = b.wins / (b.wins + b.losses);
    if (wrB !== wrA) return wrB - wrA;
    return (b.wins + b.losses) - (a.wins + a.losses);
  });

  const top = qualified.slice(0, 5);

  // Enrich with individual player MMRs from daily_player_stats
  try {
    const allStats = getDailyPlayerStatsRange(weekStart, weekEnd);
    // Build map: battleTag → latest current_mmr within the week
    const latestMmr = new Map();
    for (const row of allStats) {
      const existing = latestMmr.get(row.battle_tag);
      if (!existing || row.date > existing.date) {
        latestMmr.set(row.battle_tag, { mmr: row.current_mmr, date: row.date });
      }
    }
    for (const g of top) {
      g.individualMmrs = g.tags.map(tag => latestMmr.get(tag)?.mmr || 0);
    }
  } catch (err) {
    console.warn('[Weekly] AT spotlight MMR enrichment failed:', err.message);
  }

  return top;
}

function buildWeeklyPrompt(dailyDigests, aggregateStats, topChatMessages = []) {
  const dailyTexts = dailyDigests.map((d, i) => {
    const dayLabel = new Date(d.date + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'long' });
    // Strip stat lines for AI (they get re-aggregated)
    const textOnly = d.digest.replace(STAT_LINE_RE, '').replace(/^MENTIONS:.*$/gm, '').trim();
    return `--- ${dayLabel} (${d.date}) ---\n${textOnly}`;
  }).join('\n\n');

  // Build raw chat highlights section (capped at 500 chars)
  let chatHighlightsSection = '';
  if (topChatMessages.length > 0) {
    let lines = [];
    let totalLen = 0;
    for (const m of topChatMessages) {
      const line = `"${m.userName}: ${m.message}"`;
      if (totalLen + line.length > 500) break;
      lines.push(line);
      totalLen += line.length + 1;
    }
    if (lines.length > 0) {
      chatHighlightsSection = `\nRaw chat highlights (use these for authentic quotes in DRAMA and HIGHLIGHTS):\n${lines.join('\n')}\n`;
    }
  }

  return `Summarize this week's Warcraft III 4v4 activity from ${dailyDigests.length} daily digests into a WEEKLY magazine recap. The first DRAMA item becomes the "Top Story" on the site with featured pull quotes, so make it count. Write a digest with these sections (skip if nothing fits):

TOPICS: 3-6 comma-separated keywords capturing the week's themes. Be specific — name players and events.
DRAMA: The week's biggest drama stories. Combine related daily items into story arcs. Max 5 items separated by semicolons. CRITICAL FORMAT: everything goes on ONE line after "DRAMA: ". Each item is narrative text followed by quotes, then a semicolon before the next item. NO line breaks, NO markdown, NO headers like "LEAD STORY". A semicolon ONLY separates one complete item from the next. NO semicolons between quotes within the same item. The FIRST item MUST start with a punchy zine-style headline (3-8 words, fragments OK, periods between phrases) followed by " | " (pipe with spaces), then a 3-4 sentence narrative about the week's biggest drama arc, followed by 3-4 of the best quotes. Headline examples: "ToD vs GhostGGGL. Towers. No Eyes." / "Napo Banned. Again. And Again." / "Three Griefers, One Ladder, Zero Chill". Remaining items: short summary (max 12 words, no quoted text in it) then 2-3 direct quotes. Example format: DRAMA: ToD vs GhostGGGL. Towers. Nose Jokes. War. | ToD and GhostGGGL feuded all week over tower building. It started Monday when GhostGGGL mocked ToD after a loss and escalated through Wednesday when ToD accused him of never building towers. By Friday both were threatening reports. "ToD: lynfan no spikes ghost no towers" "GhostGGGL: Tod no eyes blocked by the nose" "ToD: enjoy your ban"; Napo got banned twice for leaving with 1 worker "Napo: i COACHED MY SELF" "Napo: unfair ban"; GhostGGGL accused grimfoLf of streamcheating "GhostGGGL: you ALWAYS grief me"
BANS: Notable bans this week (skip if none); semicolon-separated. Max 3 items.
HIGHLIGHTS: Best 3-5 funny, wholesome, or absurd moments of the week, semicolon-separated. Include the funniest standalone quotes too. Each item MUST include 1-2 direct quotes with speaker attribution. Show the humor with actual quotes. Good: "Classic4 toasted nonamee mid-game "Classic4: cheers nonamee! micro and apm is faster"". Bad: "Classic4 made a joke about drinking".
RECAP: 2-3 sentence narrative summary of the week's overall vibe. Deadpan zine voice — state the facts, name specific players, let the absurdity land on its own.

Rules:
- CRITICAL: Output must be PLAIN TEXT ONLY. No markdown (no **, no ##, no *). No blank lines within a section. Each section is one line: "KEY: content".
- No title, no date header, jump straight into TOPICS:
- TOPICS must be short comma-separated tags, not sentences
- Use EXACT player names from the daily digests. Never abbreviate.
- Write like a punk gaming zine. Short punchy sentences. Fragments OK. Deadpan funny. No em-dashes. No AI-speak.
- Every direct quote MUST be attributed: "SpeakerName: quote text"
- Pick the SPICIEST, funniest, most memorable quotes. Skip bland ones.
- ASCII only
- DRAMA max 5 items, HIGHLIGHTS max 5 items, BANS max 3 items
- Total under 3000 chars

${aggregateStats}
${chatHighlightsSection}
Daily digests (${dailyDigests.length} days):
${dailyTexts}`;
}

/**
 * Gather all context needed for a weekly digest or variant generation.
 * Returns null if insufficient data (not a Monday or <3 daily digests).
 */
export async function gatherWeeklyContext(weekStart) {
  // weekStart must be a Monday YYYY-MM-DD
  const startDate = new Date(weekStart + 'T12:00:00Z');
  if (startDate.getUTCDay() !== 1) return null;

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

  // Fetch top chat moments for richer weekly narrative
  let topChatMessages = [];
  try {
    topChatMessages = getTopWeeklyMessages(weekStart, weekEnd, 25);
    if (topChatMessages.length > 0) {
      console.log(`[Weekly] Found ${topChatMessages.length} top chat moments for ${weekStart}`);
    }
  } catch (err) {
    console.warn('[Weekly] Top chat messages fetch failed:', err.message);
  }

  return {
    dailyDigests, aggregateText, weekEnd, weeklyMatchStats, weeklyAwards,
    playerMap, qualified, weeklyWinner, weeklyLoser, weeklyGrinder, topChatMessages,
  };
}

export async function generateWeeklyDigest(weekStart) {
  // Return cached if exists
  const existing = getWeeklyDigest(weekStart);
  if (existing) return existing.digest;

  if (!config.ANTHROPIC_API_KEY) return null;

  const ctx = await gatherWeeklyContext(weekStart);
  if (!ctx) return null;

  const { dailyDigests, aggregateText, weekEnd, weeklyMatchStats, weeklyAwards,
          playerMap, qualified, weeklyWinner, weeklyLoser, weeklyGrinder, topChatMessages } = ctx;

  const prompt = buildWeeklyPrompt(dailyDigests, aggregateText, topChatMessages);

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
          max_tokens: 2000,
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

  // Weekly streaks (from concatenated daily form strings — can be longer than any single daily streak)
  let weeklyHotStreak = null, weeklyColdStreak = null;
  if (weeklyMatchStats?.weeklyPlayerMap) {
    const usedStatTags = new Set([weeklyWinner?.battleTag, weeklyLoser?.battleTag, weeklyGrinder?.battleTag].filter(Boolean));
    const streaks = computeWeeklyStreaks(weeklyMatchStats.weeklyPlayerMap);
    if (streaks.hotStreak && !usedStatTags.has(streaks.hotStreak.battleTag)) {
      weeklyHotStreak = streaks.hotStreak;
      const p = weeklyHotStreak;
      const hSign = p.mmrChange > 0 ? '+' : '';
      const hMmr = p.mmrChange != null ? ` ${hSign}${Math.round(p.mmrChange)} MMR` : '';
      parts.push(`HOTSTREAK: ${p.battleTag}${raceTag(p)} ${p.weeklyWinStreak}W streak${hMmr} (${p.wins}W-${p.losses}L) ${p.form}`);
    }
    if (streaks.coldStreak && !usedStatTags.has(streaks.coldStreak.battleTag)) {
      weeklyColdStreak = streaks.coldStreak;
      const p = weeklyColdStreak;
      const cSign = p.mmrChange > 0 ? '+' : '';
      const cMmr = p.mmrChange != null ? ` ${cSign}${Math.round(p.mmrChange)} MMR` : '';
      parts.push(`COLDSTREAK: ${p.battleTag}${raceTag(p)} ${p.weeklyLossStreak}L streak${cMmr} (${p.wins}W-${p.losses}L) ${p.form}`);
    }
  }

  // Spotlight blurbs + chat quotes for all stat card players
  try {
    const dailyRows = getDailyPlayerStatsRange(weekStart, weekEnd);
    const spotlights = [
      { key: 'WINNER', player: weeklyWinner },
      { key: 'LOSER', player: weeklyLoser },
      { key: 'GRINDER', player: weeklyGrinder },
      { key: 'HOTSTREAK', player: weeklyHotStreak },
      { key: 'COLDSTREAK', player: weeklyColdStreak },
    ];
    const blurbLines = generateSpotlightBlurbs(spotlights, dailyRows, weekStart, weekEnd);
    parts.push(...blurbLines);

    // Streak daily breakdowns (reuse dailyRows)
    const hotDaily = computeStreakDailyBreakdown('HOTSTREAK', weeklyHotStreak, dailyRows);
    if (hotDaily) parts.push(`HOTSTREAK_DAILY: ${hotDaily}`);
    const coldDaily = computeStreakDailyBreakdown('COLDSTREAK', weeklyColdStreak, dailyRows);
    if (coldDaily) parts.push(`COLDSTREAK_DAILY: ${coldDaily}`);
  } catch (err) {
    console.warn('[Weekly] Spotlight blurb generation failed:', err.message);
  }

  // Streak spectrum (all players)
  if (weeklyMatchStats?.weeklyPlayerMap) {
    const spectrum = computeStreakSpectrum(weeklyMatchStats.weeklyPlayerMap);
    if (spectrum) parts.push(`STREAK_SPECTRUM: ${spectrum}`);
  }

  // NEW_BLOOD: first-time players this week
  try {
    const newBlood = await computeNewBlood(weekStart, weekEnd);
    const nbLine = formatNewBloodLine(newBlood);
    if (nbLine) parts.push(nbLine);
  } catch (err) {
    console.warn('[Weekly] New blood computation failed:', err.message);
  }

  // UPSET: biggest MMR gap upsets of the week
  try {
    const upsets = computeWeeklyUpsets(weekStart, weekEnd);
    if (upsets.length > 0) {
      const entries = upsets.map(u => {
        const winnerNames = u.winnerTags.split(',').map(t => t.split('#')[0]).join(', ');
        const mapStr = u.map ? ` on ${u.map}` : '';
        const mmrData = u.winnerMmrs && u.loserMmrs ? ` [${u.winnerMmrs}|${u.loserMmrs}|${u.winnerTags}|${u.loserTags}]` : '';
        return `${winnerNames} (avg ${u.winnerAvgMmr} MMR) beat favorites (avg ${u.loserAvgMmr} MMR)${mapStr} — ${u.gap} MMR gap ${u.match_id}${mmrData}`;
      });
      parts.push(`UPSET: ${entries.join('; ')}`);
    }
  } catch (err) {
    console.warn('[Weekly] Upset computation failed:', err.message);
  }

  // AT_SPOTLIGHT: top-performing arranged team stacks
  try {
    const atSpotlight = computeWeeklyATSpotlight(weekStart, weekEnd);
    if (atSpotlight.length > 0) {
      const entries = atSpotlight.map(at => {
        const names = at.tags.map(t => t.split('#')[0]).join(' + ');
        const wr = Math.round(at.wins / (at.wins + at.losses) * 100);
        const mmrs = at.individualMmrs ? at.individualMmrs.join(',') : '';
        const bracketData = mmrs ? ` [${at.tags.join(',')}|${mmrs}]` : '';
        return `${names} (${at.size}-stack, avg ${at.avgMmr} MMR) ${at.wins}W-${at.losses}L ${wr}%${bracketData}`;
      });
      parts.push(`AT_SPOTLIGHT: ${entries.join('; ')}`);
    }
  } catch (err) {
    console.warn('[Weekly] AT spotlight computation failed:', err.message);
  }

  // MATCH_STATS + HEROES: per-match detail awards split into performance and hero meta
  try {
    const { matchStats: matchStatsLine, heroes: heroesLine, blurbs: msBlurbs, awardWinnerTags, heroSlayer: hsPlayer } =
      computeWeeklyMatchScoreAwards(weekStart, weekEnd);

    // Hero Slayer → promoted to full spotlight stat line
    if (hsPlayer && weeklyMatchStats?.weeklyPlayerMap) {
      const wp = weeklyMatchStats.weeklyPlayerMap.get(hsPlayer.battleTag);
      if (wp) {
        const race = raceTag(wp);
        const form = wp.form || '';
        parts.push(`HEROSLAYER: ${hsPlayer.battleTag}${race} ${hsPlayer.rate.toFixed(1)} hero kills/game (${wp.wins}W-${wp.losses}L) ${form}`);
      }
    }

    if (matchStatsLine) {
      parts.push(`MATCH_STATS: ${matchStatsLine}`);
    }
    if (heroesLine) {
      parts.push(`HEROES: ${heroesLine}`);
    }
    // Append match stat blurbs (e.g. "HEROSLAYER_BLURB: ...")
    if (msBlurbs?.length > 0) {
      parts.push(...msBlurbs);
    }
    // Append chat quotes for match stat award winners
    if (awardWinnerTags?.length > 0) {
      for (const { category, battleTag } of awardWinnerTags) {
        const quotes = pickPlayerQuotes(battleTag, weekStart, weekEnd, 3, null);
        if (quotes.length > 0) {
          parts.push(`${category}_QUOTES: ${quotes.map(q => `"${q}"`).join('; ')}`);
        }
      }
    }
  } catch (err) {
    console.warn('[Weekly] Match score awards failed:', err.message);
  }

  // Append power rankings and awards sections
  if (weeklyAwards?.powerRankings?.length > 0) {
    parts.push(`POWER_RANKINGS: ${weeklyAwards.powerRankings.map((p, i) => `${i + 1}. ${p}`).join('; ')}`);
  }

  // Aggregate MENTIONS from all daily digests
  const allMentions = new Set();
  for (const d of dailyDigests) {
    const mentionMatch = d.digest.match(/^MENTIONS:\s*(.+)$/m);
    if (mentionMatch) {
      for (const tag of mentionMatch[1].split(',')) {
        const trimmed = tag.trim();
        if (trimmed) allMentions.add(trimmed);
      }
    }
  }
  if (allMentions.size > 0) {
    parts.push(`MENTIONS: ${[...allMentions].join(',')}`);
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
  const totalMessages = countMessagesByDateRange(weekStart, weekEnd);
  const statsJson = weeklyMatchStats ? JSON.stringify({
    totalGames: weeklyMatchStats.totalGames,
    uniquePlayers: weeklyMatchStats.uniquePlayers,
    averageMmr: weeklyMatchStats.averageMmr,
    raceStats: weeklyMatchStats.raceStats,
    topMaps: weeklyMatchStats.topMaps,
    totalMessages,
  }) : JSON.stringify({ totalMessages });

  // Convert flat text → structured JSON
  let digestJson = null;
  try {
    const parsedStats = weeklyMatchStats ? {
      totalGames: weeklyMatchStats.totalGames,
      uniquePlayers: weeklyMatchStats.uniquePlayers,
      averageMmr: weeklyMatchStats.averageMmr,
      raceStats: weeklyMatchStats.raceStats,
      topMaps: weeklyMatchStats.topMaps,
      totalMessages: countMessagesByDateRange(weekStart, weekEnd),
    } : { totalMessages: countMessagesByDateRange(weekStart, weekEnd) };
    const jsonObj = digestToJSON(digest, { weekStart, weekEnd, stats: parsedStats, clips: weeklyClips });
    digestJson = JSON.stringify(jsonObj);
  } catch (err) {
    console.warn('[Weekly] digestToJSON conversion failed:', err.message);
  }

  setWeeklyDigestFull(weekStart, weekEnd, digest,
    weeklyClips.length > 0 ? JSON.stringify(weeklyClips) : null,
    statsJson,
    digestJson
  );
  console.log(`[Weekly] Generated for ${weekStart} to ${weekEnd} (${dailyDigests.length} daily digests, ${weeklyClips.length} clips)`);
  return digest;
}

/**
 * Regenerate a single narrative section of a weekly digest.
 * Re-gathers context and asks AI to produce a fresh take on just that section.
 */
const REGEN_SECTIONS = new Set(['TOPICS', 'DRAMA', 'BANS', 'HIGHLIGHTS', 'RECAP']);

export async function regenerateSection(weekStart, sectionKey) {
  if (!REGEN_SECTIONS.has(sectionKey)) throw new Error(`Cannot regenerate ${sectionKey}`);
  if (!config.ANTHROPIC_API_KEY) throw new Error('No API key configured');

  const ctx = await gatherWeeklyContext(weekStart);
  if (!ctx) throw new Error('Insufficient weekly data');

  const { dailyDigests, aggregateText, topChatMessages } = ctx;
  const basePrompt = buildWeeklyPrompt(dailyDigests, aggregateText, topChatMessages);

  const sectionPrompt = `${basePrompt}

IMPORTANT: You previously generated a weekly digest. Now regenerate ONLY the ${sectionKey} section. Write a completely different version with fresh angles and different quote selections. Output ONLY one line in the format "${sectionKey}: content". No other sections.`;

  const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
  const models = ['claude-haiku-4-5-20251001', 'claude-sonnet-4-5-20250929'];
  let aiText = null;

  for (const model of models) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const msg = await client.messages.create({
          model, max_tokens: 1000, system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: sectionPrompt }],
        });
        aiText = msg.content[0]?.text?.trim() || null;
        if (aiText) break;
      } catch (err) {
        const status = err?.status || err?.error?.status || '';
        console.warn(`[Regen] ${model} attempt ${attempt}/3 failed (${status}): ${err.message}`);
        if (attempt < 3) await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
      }
    }
    if (aiText) break;
    console.warn(`[Regen] All retries exhausted for ${model}, trying next model`);
  }

  if (!aiText) throw new Error('AI call failed after all retries');

  const parsed = parseDigestSections(aiText);
  const target = parsed.find(s => s.key === sectionKey);
  if (!target) throw new Error(`AI did not return ${sectionKey} section`);

  console.log(`[Regen] Regenerated ${sectionKey} for ${weekStart} (${target.content.length} chars)`);
  return target.content;
}

/**
 * Regenerate spotlight blurbs + chat quotes for all stat-card players.
 * Returns an object like { WINNER_BLURB: "...", WINNER_QUOTES: "...", ... }
 * that can be injected into the draft.
 */
export async function regenerateSpotlights(weekStart) {
  const ctx = await gatherWeeklyContext(weekStart);
  if (!ctx) throw new Error('Insufficient weekly data');

  const { weeklyWinner, weeklyLoser, weeklyGrinder, weekEnd } = ctx;

  // Compute streaks (same as generateWeeklyDigest)
  let weeklyHotStreak = null, weeklyColdStreak = null;
  if (ctx.weeklyMatchStats?.weeklyPlayerMap) {
    const usedStatTags = new Set([weeklyWinner?.battleTag, weeklyLoser?.battleTag, weeklyGrinder?.battleTag].filter(Boolean));
    const streaks = computeWeeklyStreaks(ctx.weeklyMatchStats.weeklyPlayerMap);
    if (streaks.hotStreak && !usedStatTags.has(streaks.hotStreak.battleTag)) weeklyHotStreak = streaks.hotStreak;
    if (streaks.coldStreak && !usedStatTags.has(streaks.coldStreak.battleTag)) weeklyColdStreak = streaks.coldStreak;
  }

  const dailyRows = getDailyPlayerStatsRange(weekStart, weekEnd);
  const spotlights = [
    { key: 'WINNER', player: weeklyWinner },
    { key: 'LOSER', player: weeklyLoser },
    { key: 'GRINDER', player: weeklyGrinder },
    { key: 'HOTSTREAK', player: weeklyHotStreak },
    { key: 'COLDSTREAK', player: weeklyColdStreak },
  ];

  const blurbLines = generateSpotlightBlurbs(spotlights, dailyRows, weekStart, weekEnd);
  // Parse into key→content map
  const result = {};
  for (const line of blurbLines) {
    const m = line.match(/^([A-Z_]+):\s*(.+)$/);
    if (m) result[m[1]] = m[2];
  }

  // Hero Slayer — promoted to spotlight: inject stat line + blurb + quotes
  try {
    const awards = computeWeeklyMatchScoreAwards(weekStart, weekEnd);
    if (awards?.heroSlayer && ctx.weeklyMatchStats?.weeklyPlayerMap) {
      const hs = awards.heroSlayer;
      const wp = ctx.weeklyMatchStats.weeklyPlayerMap.get(hs.battleTag);
      if (wp) {
        const race = raceTag(wp);
        const form = wp.form || '';
        result['HEROSLAYER'] = `${hs.battleTag}${race} ${hs.rate.toFixed(1)} hero kills/game (${wp.wins}W-${wp.losses}L) ${form}`;
      }
    }
    if (awards?.blurbs?.length > 0) {
      for (const line of awards.blurbs) {
        const m = line.match(/^(HEROSLAYER_BLURB|HEROSLAYER_HEROES|HEROSLAYER_VICTIMS|HEROSLAYER_KILLBOARD|HEROSLAYER_MAX):\s*(.+)$/);
        if (m) result[m[1]] = m[2];
      }
    }
    if (awards?.awardWinnerTags?.length > 0) {
      for (const { category, battleTag } of awards.awardWinnerTags) {
        if (category !== 'HEROSLAYER') continue;
        const quotes = pickPlayerQuotes(battleTag, weekStart, weekEnd, 3, null);
        if (quotes.length > 0) {
          result[`${category}_QUOTES`] = quotes.map(q => `"${q}"`).join('; ');
        }
      }
    }
  } catch (err) {
    console.warn('[Regen] Hero Slayer spotlight failed:', err.message);
  }

  // Streak daily breakdowns
  const hotDaily = computeStreakDailyBreakdown('HOTSTREAK', weeklyHotStreak, dailyRows);
  if (hotDaily) result['HOTSTREAK_DAILY'] = hotDaily;
  const coldDaily = computeStreakDailyBreakdown('COLDSTREAK', weeklyColdStreak, dailyRows);
  if (coldDaily) result['COLDSTREAK_DAILY'] = coldDaily;

  // Streak spectrum
  if (ctx.weeklyMatchStats?.weeklyPlayerMap) {
    const spectrum = computeStreakSpectrum(ctx.weeklyMatchStats.weeklyPlayerMap);
    if (spectrum) result['STREAK_SPECTRUM'] = spectrum;
  }

  console.log(`[Regen] Regenerated spotlights for ${weekStart}: ${Object.keys(result).join(', ')}`);
  return result;
}

/**
 * Regenerate match stat blurbs + quotes (Unit Killer, etc. — Hero Slayer is now a spotlight).
 * Returns an object like { "Unit Killer_BLURB": "...", ... }
 */
export function regenerateMatchStatBlurbs(weekStart) {
  const startDate = new Date(weekStart + 'T12:00:00Z');
  const endDate = new Date(startDate);
  endDate.setUTCDate(endDate.getUTCDate() + 6);
  const weekEnd = endDate.toISOString().slice(0, 10);

  const awards = computeWeeklyMatchScoreAwards(weekStart, weekEnd);
  if (!awards) return {};

  const result = {};

  // Parse blurb lines: "Hero Slayer_BLURB: ..."
  if (awards.blurbs?.length > 0) {
    for (const line of awards.blurbs) {
      const m = line.match(/^(.+?):\s*(.+)$/);
      if (m) result[m[1]] = m[2];
    }
  }

  // Generate quotes for award winners
  if (awards.awardWinnerTags?.length > 0) {
    for (const { category, battleTag } of awards.awardWinnerTags) {
      const quotes = pickPlayerQuotes(battleTag, weekStart, weekEnd, 3, null);
      if (quotes.length > 0) {
        result[`${category}_QUOTES`] = quotes.map(q => `"${q}"`).join('; ');
      }
    }
  }

  // Splice updated MATCH_STATS and HEROES lines into stored digest + draft
  const weekly = getWeeklyDigest(weekStart);
  if (weekly) {
    const spliceAwardLine = (text, key, newLine) => {
      if (!text || !newLine) return text;
      const re = new RegExp(`${key}:\\s*[^\\n]+`);
      if (re.test(text)) return text.replace(re, `${key}: ${newLine}`);
      return text + `\n${key}: ${newLine}`;
    };
    for (const field of ['digest', 'draft']) {
      let txt = weekly[field];
      if (!txt) continue;
      if (awards.matchStats) txt = spliceAwardLine(txt, 'MATCH_STATS', awards.matchStats);
      if (awards.heroes) txt = spliceAwardLine(txt, 'HEROES', awards.heroes);
      if (field === 'digest') updateWeeklyDigestOnly(weekStart, txt);
      else updateWeeklyDraftOnly(weekStart, txt);
    }
    result._splicedSections = ['MATCH_STATS', 'HEROES'].filter(k => awards[k === 'MATCH_STATS' ? 'matchStats' : 'heroes']);
  }

  console.log(`[Regen] Regenerated match stat blurbs for ${weekStart}: ${Object.keys(result).join(', ')}`);
  return result;
}

/**
 * Generate 3 editorial variants (different AI angles on the same week data).
 * Each gets a different editorial angle instruction appended to the base prompt.
 * Runs sequentially with DB-backed progress; caller should fire-and-forget.
 */
export async function generateWeeklyVariants(weekStart, jobId) {
  updateGenJobStatus(jobId, 'running');
  try {
    const ctx = await gatherWeeklyContext(weekStart);
    if (!ctx) {
      updateGenJobStatus(jobId, 'error', 'Not enough data (need 3+ daily digests and a Monday date)');
      return;
    }

    const angles = [
      'EDITORIAL ANGLE: Lead with the spiciest drama and interpersonal beef. Make the headline provocative. Emphasize conflict, rivalries, and trash talk.',
      'EDITORIAL ANGLE: Lead with the funniest, most absurd moment of the week. Deadpan humor. Emphasize the ridiculous, the unexpected, the unhinged.',
      'EDITORIAL ANGLE: Lead with the biggest competitive upset or performance story. Who rose, who fell. Emphasize rankings shifts, streaks, and clutch plays.',
    ];

    const basePrompt = buildWeeklyPrompt(ctx.dailyDigests, ctx.aggregateText, ctx.topChatMessages);
    const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });

    for (let i = 0; i < angles.length; i++) {
      try {
        const prompt = `${basePrompt}\n\n${angles[i]}`;
        const msg = await client.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 2000,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: prompt }],
        });
        const text = msg.content[0]?.text?.trim() || null;
        if (text) {
          saveWeeklyVariant(jobId, weekStart, i, text);
        }
      } catch (err) {
        console.warn(`[Variants] Variant ${i} failed:`, err.message);
      }
      updateGenJobProgress(jobId, i + 1);
    }

    updateGenJobStatus(jobId, 'done');
    console.log(`[Variants] Completed job ${jobId} for ${weekStart}`);
  } catch (err) {
    console.error(`[Variants] Job ${jobId} failed:`, err.message);
    updateGenJobStatus(jobId, 'error', err.message);
  }
}

/**
 * Backfill daily player stats for a date range by fetching from the W3C API.
 * Uses a higher offset limit to reach older matches.
 */
export async function backfillDailyStats(startDate, endDate) {
  const origLimit = MAX_MATCH_OFFSET;
  // Temporarily increase offset limit for backfill
  // MAX_MATCH_OFFSET is a const, so we'll just directly use a high limit in the loop
  const results = [];
  const start = new Date(startDate + 'T12:00:00Z');
  const end = new Date(endDate + 'T12:00:00Z');

  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10);
    if (hasDailyPlayerStats(dateStr)) {
      results.push({ date: dateStr, status: 'already_stored' });
      continue;
    }
    try {
      // computePlayerStats auto-saves to DB on success
      const result = await computePlayerStats(dateStr);
      if (result) {
        results.push({ date: dateStr, status: 'ok', players: result.playerStats.size });
      } else {
        results.push({ date: dateStr, status: 'no_data' });
      }
    } catch (err) {
      results.push({ date: dateStr, status: 'error', message: err.message });
    }
  }
  return results;
}

/**
 * Backfill team1_mmrs/team2_mmrs for daily_matches that are missing them.
 * Fetches each match by ID from the W3C API.
 */
export async function backfillMatchMmrs(startDate, endDate) {
  const missing = getDailyMatchesMissingMmrs(startDate, endDate);
  if (missing.length === 0) return { updated: 0, total: 0 };

  let updated = 0;
  for (const { match_id } of missing) {
    try {
      const res = await fetch(`${API_BASE}/matches/${match_id}`);
      if (!res.ok) continue;
      const data = await res.json();
      const teams = data.match?.teams || data.teams || [];
      if (teams.length !== 2) continue;
      const t1mmrs = (teams[0].players || []).map(p => p.oldMmr || 0).join(',');
      const t2mmrs = (teams[1].players || []).map(p => p.oldMmr || 0).join(',');
      updateDailyMatchMmrs(match_id, t1mmrs, t2mmrs);
      updated++;
    } catch {
      // skip failures
    }
    // Throttle: 100ms between requests
    await new Promise(r => setTimeout(r, 100));
  }
  console.log(`[Backfill] Updated ${updated}/${missing.length} matches with individual MMRs`);
  return { updated, total: missing.length };
}

/* ── Match score fetching and aggregation ────────── */

/**
 * Fetch detailed match scores for a list of match IDs.
 * Calls GET /api/matches/{id}, extracts playerScores, saves to DB.
 * 100ms throttle between requests. Skips already-fetched matches.
 */
async function fetchMatchScores(matchIds, date) {
  let fetched = 0, skipped = 0, errors = 0;

  for (const matchId of matchIds) {
    if (hasMatchScores(matchId)) {
      skipped++;
      continue;
    }

    try {
      let data;
      const res = await fetch(`${API_BASE}/matches/${encodeURIComponent(matchId)}`);
      if (res.status === 429) {
        // Rate limited — back off and retry once
        await new Promise(r => setTimeout(r, 2000));
        const retry = await fetch(`${API_BASE}/matches/${encodeURIComponent(matchId)}`);
        if (!retry.ok) { errors++; continue; }
        data = await retry.json();
      } else if (!res.ok) {
        errors++;
        continue;
      } else {
        data = await res.json();
      }

      const playerScores = data.playerScores || [];
      if (playerScores.length === 0) { skipped++; continue; }

      // Compute match duration from startTime/endTime
      let durationSeconds = 0;
      if (data.match?.startTime && data.match?.endTime) {
        durationSeconds = Math.round((new Date(data.match.endTime) - new Date(data.match.startTime)) / 1000);
      } else if (data.startTime && data.endTime) {
        durationSeconds = Math.round((new Date(data.endTime) - new Date(data.startTime)) / 1000);
      }

      const scores = playerScores.map(ps => ({
        battleTag: ps.battleTag,
        heroesKilled: ps.heroScore?.heroesKilled || 0,
        itemsObtained: ps.heroScore?.itemsObtained || 0,
        mercsHired: ps.heroScore?.mercsHired || 0,
        expGained: ps.heroScore?.expGained || 0,
        unitsProduced: ps.unitScore?.unitsProduced || 0,
        unitsKilled: ps.unitScore?.unitsKilled || 0,
        largestArmy: ps.unitScore?.largestArmy || 0,
        goldCollected: ps.resourceScore?.goldCollected || 0,
        lumberCollected: ps.resourceScore?.lumberCollected || 0,
        goldUpkeepLost: ps.resourceScore?.goldUpkeepLost || 0,
        durationSeconds,
        heroes: ps.heroes || null,
      }));

      saveMatchPlayerScores(date, matchId, scores);
      fetched++;
    } catch (err) {
      if (errors < 3) console.warn(`[MatchScores] Error fetching ${matchId}:`, err.message);
      errors++;
    }

    // Throttle: 100ms between requests
    await new Promise(r => setTimeout(r, 100));
  }

  return { fetched, skipped, errors };
}

/**
 * Collect match IDs for a date. Uses daily_matches if available, otherwise
 * paginates the match list API (same as computePlayerStats).
 */
async function collectMatchIdsForDate(date) {
  // Check daily_matches first
  const existing = getMatchIdsForDateRange(date, date);
  if (existing.length > 0) return existing;

  // Paginate the match list API to collect IDs and save to daily_matches
  const result = await computePlayerStats(date);
  if (!result) return [];

  // computePlayerStats already saves to daily_matches — read them back
  return getMatchIdsForDateRange(date, date);
}

/**
 * Fetch match detail scores for all matches on a given date.
 */
export async function fetchDailyMatchScores(date) {
  const matchIds = await collectMatchIdsForDate(date);
  if (matchIds.length === 0) return { date, matchIds: 0, fetched: 0, skipped: 0, errors: 0 };

  const result = await fetchMatchScores(matchIds, date);
  console.log(`[MatchScores] ${date}: ${matchIds.length} matches, ${result.fetched} fetched, ${result.skipped} skipped, ${result.errors} errors`);
  return { date, matchIds: matchIds.length, ...result };
}

/**
 * Backfill match scores for a date range. Loops each day, collects IDs, fetches details.
 */
export async function backfillMatchScores(startDate, endDate) {
  const results = [];
  const start = new Date(startDate + 'T12:00:00Z');
  const end = new Date(endDate + 'T12:00:00Z');

  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10);
    try {
      const result = await fetchDailyMatchScores(dateStr);
      results.push(result);
    } catch (err) {
      results.push({ date: dateStr, error: err.message });
    }
  }
  return results;
}

/**
 * Compute weekly match score awards from stored per-player match data.
 * Returns pipe-separated formatted string for MATCH_STATS section.
 */
const HERO_DISPLAY_NAMES = {
  shadowhunter: 'Shadow Hunter', deathknight: 'Death Knight', archmage: 'Archmage',
  taurenchieftain: 'Tauren Chieftain', lich: 'Lich', blademaster: 'Blademaster',
  mountainking: 'Mountain King', paladin: 'Paladin', farseer: 'Far Seer',
  keeperofthegrove: 'Keeper', cryptlord: 'Crypt Lord', priestessofthemoon: 'Priestess',
  dreadlord: 'Dreadlord', sorceror: 'Naga', seawitch: 'Sea Witch', pitlord: 'Pit Lord',
  pandarenbrewmaster: 'Panda', bansheeranger: 'Dark Ranger', demonhunter: 'Demon Hunter',
  tinker: 'Tinker', beastmaster: 'Beastmaster', alchemist: 'Alchemist',
  avatarofflame: 'Firelord', goblinbountyhunter: 'Goblin',
};

function computeWeeklyMatchScoreAwards(weekStart, weekEnd) {
  const rows = getMatchPlayerScoresRange(weekStart, weekEnd);
  if (rows.length === 0) return null;

  // Build win lookup from daily_matches
  const matchRows = getDailyMatchesRange(weekStart, weekEnd);
  const matchWins = new Map(); // matchId → Set of winning battle_tags
  for (const m of matchRows) {
    const winnerTags = m.team1_won ? m.team1_tags : m.team2_tags;
    if (winnerTags) matchWins.set(m.match_id, new Set(winnerTags.split(',')));
  }

  // Build per-match heroes lookup: matchId+battleTag → hero names
  const matchHeroLookup = new Map(); // "matchId|battleTag" → [heroName, ...]
  for (const row of rows) {
    if (row.heroes) {
      try {
        const heroes = JSON.parse(row.heroes);
        matchHeroLookup.set(`${row.match_id}|${row.battle_tag}`, heroes.map(h => h.name));
      } catch {}
    }
  }

  // Build opponent team lookup from daily_matches: for each match+player, find opposing team's tags
  const matchTeams = new Map(); // matchId → { team1: Set<tag>, team2: Set<tag> }
  for (const m of matchRows) {
    const t1 = m.team1_tags ? new Set(m.team1_tags.split(',')) : new Set();
    const t2 = m.team2_tags ? new Set(m.team2_tags.split(',')) : new Set();
    matchTeams.set(m.match_id, { team1: t1, team2: t2 });
  }

  // Aggregate per-player stats + track longest game + hero data
  const players = new Map();
  let longestGame = { matchId: null, durationSeconds: 0, battleTags: [] };
  const heroCounts = new Map(); // heroName → total picks
  const comboCounts = new Map(); // combo string → { count, wins, players[] }
  const playerHeroData = new Map(); // battleTag → { uniqueHeroes: Set, combos: Map<combo, count>, games }
  const playerOpponentHeroes = new Map(); // battleTag → Map<heroName, count> (heroes they faced)

  for (const row of rows) {
    if (!players.has(row.battle_tag)) {
      players.set(row.battle_tag, {
        battleTag: row.battle_tag,
        name: row.battle_tag.split('#')[0],
        totalHeroesKilled: 0,
        maxHeroKillsInGame: 0,
        totalUnitsKilled: 0,
        totalDurationSeconds: 0,
        games: 0,
        wins: 0,
      });
    }
    const p = players.get(row.battle_tag);
    const gameHeroKills = row.heroes_killed || 0;
    p.totalHeroesKilled += gameHeroKills;
    if (gameHeroKills > p.maxHeroKillsInGame) p.maxHeroKillsInGame = gameHeroKills;
    p.totalUnitsKilled += row.units_killed || 0;
    p.totalDurationSeconds += row.duration_seconds || 0;
    p.games++;
    const winners = matchWins.get(row.match_id);
    if (winners && winners.has(row.battle_tag)) p.wins++;

    // Track opponent heroes faced
    const teams = matchTeams.get(row.match_id);
    if (teams) {
      const isTeam1 = teams.team1.has(row.battle_tag);
      const opponentTags = isTeam1 ? teams.team2 : teams.team1;
      if (!playerOpponentHeroes.has(row.battle_tag)) {
        playerOpponentHeroes.set(row.battle_tag, new Map());
      }
      const oppHeroes = playerOpponentHeroes.get(row.battle_tag);
      for (const oppTag of opponentTags) {
        const heroNames = matchHeroLookup.get(`${row.match_id}|${oppTag}`);
        if (heroNames) {
          for (const h of heroNames) oppHeroes.set(h, (oppHeroes.get(h) || 0) + 1);
        }
      }
    }

    // Track longest game
    const dur = row.duration_seconds || 0;
    if (dur > longestGame.durationSeconds) {
      longestGame = { matchId: row.match_id, durationSeconds: dur, battleTags: [row.battle_tag] };
    } else if (dur > 0 && dur === longestGame.durationSeconds && row.match_id === longestGame.matchId) {
      longestGame.battleTags.push(row.battle_tag);
    }

    // Parse heroes
    if (row.heroes) {
      try {
        const heroes = JSON.parse(row.heroes);
        const combo = heroes.map(h => h.name).sort().join('+');

        // Global hero counts
        for (const h of heroes) heroCounts.set(h.name, (heroCounts.get(h.name) || 0) + 1);

        // Global combo counts (for Spicy Combo)
        if (combo) {
          if (!comboCounts.has(combo)) comboCounts.set(combo, { count: 0, wins: 0, players: [] });
          const c = comboCounts.get(combo);
          c.count++;
          if (winners && winners.has(row.battle_tag)) c.wins++;
          if (c.players.length < 3) c.players.push(row.battle_tag);
        }

        // Per-player hero data (for One Trick + Wildcard)
        if (!playerHeroData.has(row.battle_tag)) {
          playerHeroData.set(row.battle_tag, { uniqueHeroes: new Set(), combos: new Map(), games: 0 });
        }
        const phd = playerHeroData.get(row.battle_tag);
        phd.games++;
        for (const h of heroes) phd.uniqueHeroes.add(h.name);
        if (combo) phd.combos.set(combo, (phd.combos.get(combo) || 0) + 1);
      } catch {}
    }
  }

  // Filter to 10+ games, 4+ min avg duration for rate-based awards
  const rateQualified = [...players.values()].filter(p =>
    p.games >= 10 && (p.totalDurationSeconds / p.games) >= 240
  );
  if (rateQualified.length === 0) return { matchStats: null, heroes: null };

  const matchStatsAwards = [];
  const heroAwards = [];
  const matchStatBlurbs = []; // blurb lines for award winners

  // Helper: get top combo display name for a player
  function getTopComboDisplay(battleTag) {
    const phd = playerHeroData.get(battleTag);
    if (!phd || phd.combos.size === 0) return null;
    const [topCombo] = [...phd.combos.entries()].sort((a, b) => b[1] - a[1])[0];
    if (!topCombo) return null;
    return topCombo.split('+').map(h => HERO_DISPLAY_NAMES[h] || h).join(' + ');
  }

  // Helper: get top N opponent heroes for a player (by frequency)
  function getTopOpponentHeroes(battleTag, n = 3) {
    const oppHeroes = playerOpponentHeroes.get(battleTag);
    if (!oppHeroes || oppHeroes.size === 0) return [];
    return [...oppHeroes.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([name, count]) => ({ name, displayName: HERO_DISPLAY_NAMES[name] || name, count }));
  }

  // ── MATCH_STATS (performance awards) ──

  // 1. Hero Slayer — top 3 hero kills per game (rate)
  const heroSlayers = rateQualified
    .map(p => ({ ...p, rate: p.totalHeroesKilled / p.games }))
    .filter(p => p.rate > 0)
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 3);
  if (heroSlayers.length > 0) {
    const top = heroSlayers[0];

    // Build Hero Slayer blurb with opponent hero context
    const wr = top.games > 0 ? Math.round(top.wins / top.games * 100) : 0;
    const topOpp = getTopOpponentHeroes(top.battleTag, 3);
    const maxNote = top.maxHeroKillsInGame > 0 ? `, best ${top.maxHeroKillsInGame} in one game` : '';
    let blurb = `${top.totalHeroesKilled} hero kills across ${top.games} games (${top.rate.toFixed(1)}/game${maxNote}, ${wr}% WR).`;
    if (topOpp.length > 0) {
      const heroNames = topOpp.map(h => h.displayName);
      if (heroNames.length === 1) {
        blurb += ` Spent the week hunting ${heroNames[0]}s.`;
      } else if (heroNames.length === 2) {
        blurb += ` Most frequent prey: ${heroNames[0]}s and ${heroNames[1]}s.`;
      } else {
        blurb += ` Most frequent prey: ${heroNames.slice(0, -1).join(', ')}, and ${heroNames[heroNames.length - 1]}.`;
      }
    }
    matchStatBlurbs.push(`HEROSLAYER_BLURB: ${blurb}`);

    // Output hero combo icons (raw icon names for frontend rendering)
    const phd = playerHeroData.get(top.battleTag);
    if (phd?.combos?.size > 0) {
      const [topCombo] = [...phd.combos.entries()].sort((a, b) => b[1] - a[1])[0];
      if (topCombo) matchStatBlurbs.push(`HEROSLAYER_HEROES: ${topCombo.split('+').join(',')}`);
    }

    // Output victim hero icons (most-killed opponent heroes, top 3)
    if (topOpp.length > 0) {
      matchStatBlurbs.push(`HEROSLAYER_VICTIMS: ${topOpp.map(h => h.name).join(',')}`);
    }

    // Output max hero kills in a single game
    if (top.maxHeroKillsInGame > 0) {
      matchStatBlurbs.push(`HEROSLAYER_MAX: ${top.maxHeroKillsInGame}`);
    }

    // Output full killboard — all opponent heroes with counts (compact: name:count,name:count)
    const allOpp = getTopOpponentHeroes(top.battleTag, 100);
    if (allOpp.length > 0) {
      matchStatBlurbs.push(`HEROSLAYER_KILLBOARD: ${allOpp.map(h => `${h.name}:${h.count}`).join(',')}`);
    }
  }

  // 2. Unit Killer — top 3 unit kills per game (rate)
  const unitKillers = rateQualified
    .map(p => ({ ...p, rate: p.totalUnitsKilled / p.games }))
    .filter(p => p.rate > 0)
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 3);
  if (unitKillers.length > 0) {
    const top = unitKillers[0];
    const runnersUp = unitKillers.slice(1).map(p => `${p.name} ${p.rate.toFixed(1)}`).join(', ');
    let detail = runnersUp ? `${top.rate.toFixed(1)} units killed/game in ${top.games} games (${runnersUp})` : `${top.rate.toFixed(1)} units killed/game in ${top.games} games`;
    const combo = getTopComboDisplay(top.battleTag);
    if (combo) detail += ` [${combo}]`;
    matchStatsAwards.push(`Unit Killer ${top.battleTag} ${detail}`);

    // Build Unit Killer blurb
    const wr = top.games > 0 ? Math.round(top.wins / top.games * 100) : 0;
    const blurb = `${top.totalUnitsKilled} units destroyed across ${top.games} games (${top.rate.toFixed(1)}/game, ${wr}% WR).`;
    matchStatBlurbs.push(`Unit Killer_BLURB: ${blurb}`);
  }

  // 3. Longest Game — only include if match players chatted that day (community interest proxy)
  if (longestGame.durationSeconds > 0 && longestGame.matchId) {
    const matchRow = rows.find(r => r.match_id === longestGame.matchId);
    const matchDate = matchRow?.date;
    let hasChatters = false;
    if (matchDate) {
      try {
        const msgs = getMessagesByDateAndUsers(matchDate, longestGame.battleTags, 5);
        hasChatters = msgs.length > 0;
      } catch {}
    }
    if (hasChatters) {
      const mins = Math.round(longestGame.durationSeconds / 60);
      const names = longestGame.battleTags.slice(0, 2).map(t => t.split('#')[0]).join(', ');
      const others = Math.max(0, longestGame.battleTags.length - 2);
      matchStatsAwards.push(`Longest Game ${longestGame.battleTags[0]} ${mins} minutes (${names}${others > 0 ? ` + ${others} others` : ''})`);
    }
  }

  // ── HEROES (hero meta awards) ──

  // 4. Fan Favorite — most picked hero overall
  if (heroCounts.size > 0) {
    const [topHero, topCount] = [...heroCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    const totalPicks = [...heroCounts.values()].reduce((s, v) => s + v, 0);
    const pct = Math.round(topCount / totalPicks * 100);
    const displayName = HERO_DISPLAY_NAMES[topHero] || topHero;
    const heroPlayerCounts = new Map();
    for (const row of rows) {
      if (!row.heroes) continue;
      try {
        const heroes = JSON.parse(row.heroes);
        if (heroes.some(h => h.name === topHero)) {
          heroPlayerCounts.set(row.battle_tag, (heroPlayerCounts.get(row.battle_tag) || 0) + 1);
        }
      } catch {}
    }
    const topPicker = [...heroPlayerCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (topPicker) {
      heroAwards.push(`Fan Favorite ${topPicker[0]} ${displayName} ${topCount} times`);
    }
  }

  // 5. Spicy Combo — rarest hero combo that won at least once
  if (comboCounts.size > 0) {
    const rareWinners = [...comboCounts.entries()]
      .filter(([_, c]) => c.wins > 0 && c.count <= 2)
      .sort((a, b) => a[1].count - b[1].count || a[0].length - b[0].length);
    if (rareWinners.length > 0) {
      const [comboKey, comboData] = rareWinners[0];
      const displayCombo = comboKey.split('+').map(h => HERO_DISPLAY_NAMES[h] || h).join(' + ');
      const player = comboData.players[0];
      heroAwards.push(`Spicy Combo ${player} won with ${displayCombo} ${comboData.wins} times`);
    }
  }

  // 6. One Trick — most committed to a single hero combo (80%+ same combo, 10+ games)
  const oneTricks = [...playerHeroData.entries()]
    .filter(([_, d]) => d.games >= 10)
    .map(([tag, d]) => {
      const [topCombo, topCount] = [...d.combos.entries()].sort((a, b) => b[1] - a[1])[0] || [null, 0];
      const pct = d.games > 0 ? topCount / d.games : 0;
      return { battleTag: tag, name: tag.split('#')[0], topCombo, topCount, pct, games: d.games };
    })
    .filter(p => p.pct >= 0.8 && p.topCombo)
    .sort((a, b) => b.pct - a.pct || b.games - a.games);
  if (oneTricks.length > 0) {
    const ot = oneTricks[0];
    const displayCombo = ot.topCombo.split('+').map(h => HERO_DISPLAY_NAMES[h] || h).join(' + ');
    heroAwards.push(`One Trick ${ot.battleTag} ${displayCombo} ${ot.topCount} times in ${ot.games} games`);
  }

  // 7. Wildcard — most unique heroes picked (10+ games)
  const wildcards = [...playerHeroData.entries()]
    .filter(([_, d]) => d.games >= 10)
    .map(([tag, d]) => ({
      battleTag: tag, name: tag.split('#')[0],
      uniqueHeroes: d.uniqueHeroes.size, uniqueCombos: d.combos.size, games: d.games,
    }))
    .sort((a, b) => b.uniqueHeroes - a.uniqueHeroes || b.uniqueCombos - a.uniqueCombos);
  if (wildcards.length > 0) {
    const wc = wildcards[0];
    heroAwards.push(`Wildcard ${wc.battleTag} ${wc.uniqueHeroes} unique heroes in ${wc.games} games`);
  }

  // Collect award winner battletags for quote lookup
  const awardWinnerTags = [];
  if (heroSlayers.length > 0) awardWinnerTags.push({ category: 'HEROSLAYER', battleTag: heroSlayers[0].battleTag });
  if (unitKillers.length > 0) awardWinnerTags.push({ category: 'Unit Killer', battleTag: unitKillers[0].battleTag });

  return {
    matchStats: matchStatsAwards.length > 0 ? matchStatsAwards.join(' | ') : null,
    heroes: heroAwards.length > 0 ? heroAwards.join(' | ') : null,
    blurbs: matchStatBlurbs,
    awardWinnerTags,
    heroSlayer: heroSlayers.length > 0 ? heroSlayers[0] : null,
  };
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

    // Fetch detailed match scores for yesterday (for weekly MATCH_STATS)
    try {
      await fetchDailyMatchScores(yesterday);
    } catch (err) {
      console.warn('[Scheduler] Match score fetch failed:', err.message);
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
