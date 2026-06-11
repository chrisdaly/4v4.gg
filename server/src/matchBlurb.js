/**
 * LLM match blurbs — one dramatic line per finished match, generated on
 * demand and cached forever (matches are immutable).
 *
 * The model only sees a structured fact sheet (stats, streaks, recent
 * head-to-heads, the players' recent chat lines) and is told to quote
 * numbers verbatim or stay silent, so it can't invent results.
 */

import Anthropic from '@anthropic-ai/sdk';
import config from './config.js';
import { getMatchBlurb, setMatchBlurb, getRecentMessagesByTags } from './db.js';

const W3C_API = 'https://website-backend.w3champions.com/api';
const MODEL = 'claude-haiku-4-5-20251001';
const RACE_NAMES = { 0: 'Random', 1: 'Human', 2: 'Orc', 4: 'Night Elf', 8: 'Undead' };

// Dedupe concurrent generations per match
const inFlight = new Map();

// Fact sheets are expensive (~9 W3C calls) — memoized for the blurb lab
const sheetCache = new Map();
const SHEET_TTL_MS = 15 * 60 * 1000;

export const SYSTEM_PROMPT = `You write one-line tickers for finished Warcraft 3 4v4 matches on a community site. Voice: dry sports-desk, a little wry, never cruel.

Rules:
- ONE line, max 90 characters, plain text, no quotes around the whole line, no emoji, no markdown.
- Use ONLY facts from the fact sheet. Quote numbers and names exactly as given.
- Chat lines come from the community lounge, NOT from inside the game. Only describe when something was said if the timestamps prove it (match start/end times are given); otherwise say "in the lounge" or leave the timing out.
- Prefer drama: win/loss streaks, repeat encounters between players, chat trash-talk that aged well or badly, big stat gaps. Plain stat trivia is the last resort.
- Refer to players by name only (no battle tag numbers).
- If genuinely nothing is notable, reply with exactly: PASS`;

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

function streakFromHistory(matches, battleTag, currentMatchId) {
  // matches come newest-first; the streak runs through the current match
  const tagLower = battleTag.toLowerCase();
  let started = false;
  let result = null;
  let streak = 0;
  for (const m of matches) {
    if (!started) {
      if (m.id === currentMatchId) started = true;
      else continue;
    }
    const player = (m.teams || [])
      .flatMap((t) => t.players || [])
      .find((p) => p.battleTag?.toLowerCase() === tagLower);
    if (!player) break;
    const won = player.won === true || player.won === 1;
    if (result === null) result = won;
    if (won !== result) break;
    streak++;
  }
  return started && streak >= 3 ? { won: result, length: streak } : null;
}

function recentMeetings(history, battleTag, opponentTag, currentMatchId) {
  const tagLower = battleTag.toLowerCase();
  const oppLower = opponentTag.toLowerCase();
  let meetings = 0;
  let wins = 0;
  for (const m of history) {
    if (m.id === currentMatchId) continue;
    const teams = m.teams || [];
    const myTeam = teams.findIndex((t) =>
      t.players?.some((p) => p.battleTag?.toLowerCase() === tagLower)
    );
    const oppTeam = teams.findIndex((t) =>
      t.players?.some((p) => p.battleTag?.toLowerCase() === oppLower)
    );
    if (myTeam < 0 || oppTeam < 0 || myTeam === oppTeam) continue;
    meetings++;
    if (teams[myTeam].players.some((p) => p.battleTag?.toLowerCase() === tagLower && p.won)) {
      wins++;
    }
  }
  return { meetings, wins };
}

export async function buildFactSheet(matchId) {
  const cached = sheetCache.get(matchId);
  if (cached && Date.now() - cached.ts < SHEET_TTL_MS) return cached.sheet;
  const sheet = await buildFactSheetUncached(matchId);
  sheetCache.set(matchId, { sheet, ts: Date.now() });
  if (sheetCache.size > 100) {
    const oldest = [...sheetCache.keys()][0];
    sheetCache.delete(oldest);
  }
  return sheet;
}

async function buildFactSheetUncached(matchId) {
  const detail = await fetchJson(`${W3C_API}/matches/${encodeURIComponent(matchId)}`);
  const match = detail?.match;
  if (!match?.teams || !match.endTime) return null;

  const winnerIdx = match.teams.findIndex((t) => t.players?.some((p) => p.won));
  if (winnerIdx < 0) return null;

  const allPlayers = match.teams.flatMap((t, ti) =>
    (t.players || []).map((p) => ({ ...p, teamIndex: ti }))
  );
  const tags = allPlayers.map((p) => p.battleTag).filter(Boolean);

  // Recent history per player (newest-first) — feeds streaks + head-to-heads
  const histories = new Map();
  await Promise.all(
    tags.map(async (tag) => {
      try {
        const data = await fetchJson(
          `${W3C_API}/matches?playerId=${encodeURIComponent(tag)}&offset=0&gameMode=4&gateway=20&pageSize=12`
        );
        histories.set(tag, data.matches || []);
      } catch {
        histories.set(tag, []);
      }
    })
  );

  const lines = [];
  lines.push(
    `Map: ${match.mapName}, duration ${Math.round(match.durationInSeconds / 60)} min, ` +
    `started ${match.startTime} (UTC), ended ${match.endTime} (UTC).`
  );

  for (const ti of [winnerIdx, 1 - winnerIdx]) {
    const label = ti === winnerIdx ? 'WINNERS' : 'LOSERS';
    for (const p of match.teams[ti].players || []) {
      const ps = (detail.playerScores || []).find((s) => s.battleTag === p.battleTag);
      const heroes = (p.heroes || [])
        .map((h) => `${h.name} lvl${h.level}`)
        .join('/');
      const bits = [
        `${label}: ${p.name} (${RACE_NAMES[p.rndRace ?? p.race] || '?'}, ${p.oldMmr} MMR, ${p.mmrGain >= 0 ? '+' : ''}${p.mmrGain})`,
      ];
      if (heroes) bits.push(`heroes ${heroes}`);
      if (ps) {
        bits.push(
          `heroKills ${ps.heroScore?.heroesKilled ?? 0}, unitsKilled ${ps.unitScore?.unitsKilled ?? 0}, largestArmy ${ps.unitScore?.largestArmy ?? 0}, gold ${ps.resourceScore?.goldCollected ?? 0}`
        );
      }
      const streak = streakFromHistory(histories.get(p.battleTag) || [], p.battleTag, matchId);
      if (streak) {
        bits.push(`now on a ${streak.length}-game ${streak.won ? 'WIN' : 'LOSS'} streak`);
      }
      lines.push('- ' + bits.join('; '));
    }
  }

  // Head-to-head: cross-team pairs that met recently
  const rivalries = [];
  for (const a of match.teams[winnerIdx].players || []) {
    for (const b of match.teams[1 - winnerIdx].players || []) {
      if (!a.battleTag || !b.battleTag) continue;
      const { meetings, wins } = recentMeetings(
        histories.get(a.battleTag) || [],
        a.battleTag,
        b.battleTag,
        matchId
      );
      if (meetings >= 2) {
        rivalries.push(
          `${a.name} vs ${b.name}: faced each other ${meetings}x recently before this, ${a.name} won ${wins}`
        );
      }
    }
  }
  if (rivalries.length > 0) {
    lines.push('Recent head-to-heads (before this game): ' + rivalries.slice(0, 4).join(' | '));
  }

  // Recent chat from these players (the relay's chat archive)
  try {
    const msgs = getRecentMessagesByTags(tags, 12, 20);
    if (msgs.length > 0) {
      lines.push('Recent LOUNGE chat from these players (newest first, times UTC):');
      for (const m of msgs.slice(0, 12)) {
        lines.push(`  [${m.received_at}] ${m.user_name}: "${m.message.slice(0, 120)}"`);
      }
    }
  } catch {
    // chat context is a bonus, never a blocker
  }

  return lines.join('\n');
}

// Run the model over a fact sheet with an arbitrary system prompt —
// used by both production generation and the blurb lab. Never persists.
export async function generateWithPrompt(factSheet, systemPrompt = SYSTEM_PROMPT) {
  if (!config.ANTHROPIC_API_KEY) return '';
  const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 120,
    system: systemPrompt,
    messages: [{ role: 'user', content: `Fact sheet:\n${factSheet}\n\nWrite the ticker line.` }],
  });
  let blurb = msg.content[0]?.text?.trim() || '';
  if (blurb === 'PASS' || blurb.length > 140) blurb = '';
  return blurb;
}

export async function generateMatchBlurb(matchId) {
  const cached = getMatchBlurb(matchId);
  if (cached) return cached.blurb;

  if (!config.ANTHROPIC_API_KEY) return '';

  if (inFlight.has(matchId)) return inFlight.get(matchId);

  const promise = (async () => {
    try {
      const factSheet = await buildFactSheet(matchId);
      if (!factSheet) return '';
      const blurb = await generateWithPrompt(factSheet);
      setMatchBlurb(matchId, blurb);
      return blurb;
    } catch (err) {
      console.warn(`[Blurb] Generation failed for ${matchId}: ${err.message}`);
      // Don't cache failures — a later request can retry
      return '';
    } finally {
      inFlight.delete(matchId);
    }
  })();

  inFlight.set(matchId, promise);
  return promise;
}
