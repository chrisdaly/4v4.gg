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
import { getMatchBlurb, setMatchBlurb, getRecentMessagesByTags, countMessagesByTagsSince } from './db.js';

const W3C_API = 'https://website-backend.w3champions.com/api';
const MODEL = 'claude-haiku-4-5-20251001';
const RACE_NAMES = { 0: 'Random', 1: 'Human', 2: 'Orc', 4: 'Night Elf', 8: 'Undead' };

// Dedupe concurrent generations per match
const inFlight = new Map();

// Fact sheets are expensive (~9 W3C calls) — memoized for the blurb lab
const sheetCache = new Map();
const SHEET_TTL_MS = 15 * 60 * 1000;

export const SYSTEM_PROMPT = `You write one-line tickers for finished Warcraft 3 4v4 matches on a community site. Voice: dry sports-desk, a little wry, never cruel.

The line appears NEXT TO a scoreboard that already shows the map, duration, end time, rosters, and who won. Never repeat any of that — your line must add something the scoreboard cannot show.

Rules:
- ONE line, max 90 characters, plain text, no quotes around the whole line, no emoji, no markdown.
- Use ONLY facts from the fact sheet. Quote numbers and names exactly as given.
- The story, in order of preference: post-game reactions (blame, gloating, debate), trash-talk that aged well or badly, win/loss streaks, repeat encounters between players, a genuinely extreme stat.
- A stat is only quotable if it's an outlier — far ahead of everyone else in this lobby, or absurdly large. NEVER write a zero or a small number as a stat. Do not write "0 hero kills", "scoreless", "went 0-66", or any phrasing built around a low count, even as contrast against something else. If a player's number is low, pretend you never saw it — pick a different player or a different angle.
- Do not invent game events the fact sheet doesn't state: who killed whom, which units or spells did it, what happened on the map. The sheet has per-player totals only — anything more specific is fiction.
- Chat lines come from the community lounge, NOT from inside the game. Only describe when something was said if the timestamps prove it (match start/end times are given); otherwise say "in the lounge" or leave the timing out. Messages timestamped AFTER the match ended are reactions to this game.
- Refer to players by name only (no battle tag numbers).
- When your line mentions a Warcraft unit or hero — including slang ("frosties" = frostwyrm, "dks" = deathknight, "bm" = blademaster, "tanks" = siegeengine) — tag the words like [[frostwyrm|frosties]] so the site can show its icon. The format is ALWAYS [[id|the exact words you wrote]] — the id, then a pipe, then the visible words. Never write [[id]] without a pipe and words. Tag only words you already wrote; never add words just to tag them. Markup does not count toward the 90-character limit.
  Allowed unit ids: footman, rifleman, knight, priest, sorceress, spellbreaker, gryphon, mortarteam, siegeengine, dragonhawk, gyrocopter, waterelemental, peasant, grunt, headhunter, raider, shaman, witchdoctor, kodo, tauren, windrider, batrider, demolisher, peon, ghoul, cryptfiend, gargoyle, abomination, necromancer, banshee, meatwagon, frostwyrm, destroyer, obsidianstatue, acolyte, archer, huntress, dryad, druidoftheclaw, druidofthetalon, hippogryph, chimaera, mountaingiant, faeriedragon, wisp.
  Allowed hero ids: archmage, mountainking, paladin, sorceror, blademaster, farseer, shadowhunter, taurenchieftain, deathknight, lich, dreadlord, cryptlord, demonhunter, keeperofthegrove, priestessofthemoon, warden, alchemist, avatarofflame, bansheeranger, beastmaster, pandarenbrewmaster, pitlord, seawitch, tinker.
- PASS is a good outcome and most games deserve it. If the best you can do is restate the result, describe an ordinary stat, or pad with the map name, reply with exactly: PASS`;

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

// Returns { factSheet, endTimeMs } or null
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
        // Only surface stats worth talking about — low values are omitted
        // entirely so the model can't build a "0 kills" line. Labels are
        // plain English so the model never quotes a raw field name.
        const stats = [];
        const hk = ps.heroScore?.heroesKilled ?? 0;
        const uk = ps.unitScore?.unitsKilled ?? 0;
        const army = ps.unitScore?.largestArmy ?? 0;
        const gold = ps.resourceScore?.goldCollected ?? 0;
        if (hk >= 4) stats.push(`${hk} hero kills`);
        if (uk >= 60) stats.push(`${uk} units killed`);
        if (army >= 80) stats.push(`${army} largest army`);
        if (gold >= 15000) stats.push(`${gold} gold mined`);
        if (stats.length) bits.push(stats.join(', '));
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

  return {
    factSheet: lines.join('\n'),
    endTimeMs: new Date(match.endTime).getTime(),
    tags,
  };
}

// Run the model over a fact sheet with an arbitrary system prompt —
// used by both production generation and the blurb lab. Never persists.
export async function generateWithPrompt(factSheet, systemPrompt = SYSTEM_PROMPT) {
  if (!config.ANTHROPIC_API_KEY) return '';
  const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 200,
    system: systemPrompt,
    messages: [{ role: 'user', content: `Fact sheet:\n${factSheet}\n\nWrite the ticker line.` }],
  });
  let blurb = msg.content[0]?.text?.trim() || '';
  // Length check on the rendered text — [[id|words]] markup is free
  const rendered = blurb.replace(/\[\[\w+\|([^\]]+)\]\]/g, '$1');
  if (blurb === 'PASS' || rendered.length > 140) blurb = '';
  return blurb;
}

/* Two-phase blurbs:
   Phase 1 — immediately on first request: ticker from game data, streaks,
   rivalries, and pre-game chat. Stored provisional if the match is fresh.
   Phase 2 — once REACTION_WAIT_MS has passed since the match ended: if the
   players actually said anything in the lounge since, rebuild the sheet
   (now containing their reactions) and rewrite; otherwise keep phase 1.
   Either way the blurb is then finalized. */

const REACTION_WAIT_MS = 5 * 60 * 1000;
const MIN_REACTIONS = 2;

const DONE = (blurb) => ({ blurb, pending: false });

export async function generateMatchBlurb(matchId) {
  if (!config.ANTHROPIC_API_KEY) return DONE('');
  if (inFlight.has(matchId)) return inFlight.get(matchId);

  const row = getMatchBlurb(matchId);
  const now = Date.now();

  if (row?.finalized) return DONE(row.blurb);

  if (row && !row.finalized) {
    const due = (row.end_time_ms || 0) + REACTION_WAIT_MS;
    if (now < due) {
      // Provisional blurb is live; phase 2 isn't due yet
      return { blurb: row.blurb, pending: true, retryInMs: due - now + 15_000 };
    }
  }

  const promise = (async () => {
    try {
      if (!row) {
        // Phase 1: write the ticker now, from what's known at the whistle
        const data = await buildFactSheet(matchId);
        if (!data) return DONE('');
        const blurb = await generateWithPrompt(data.factSheet);
        const fresh = data.endTimeMs && now - data.endTimeMs < REACTION_WAIT_MS;
        setMatchBlurb(matchId, blurb, { finalized: !fresh, endTimeMs: data.endTimeMs });
        return fresh
          ? { blurb, pending: true, retryInMs: data.endTimeMs + REACTION_WAIT_MS - now + 15_000 }
          : DONE(blurb);
      }

      // Phase 2: did anyone in the lobby react since the game ended?
      sheetCache.delete(matchId);
      const data = await buildFactSheet(matchId);
      if (!data) {
        setMatchBlurb(matchId, row.blurb, { finalized: 1 });
        return DONE(row.blurb);
      }
      let blurb = row.blurb;
      const reactions = countMessagesByTagsSince(data.tags, row.end_time_ms);
      if (reactions >= MIN_REACTIONS) {
        const rewritten = await generateWithPrompt(
          `${data.factSheet}\n\nNote: lounge messages timestamped after the match end are the players' reactions to THIS game — prioritize them if they carry any drama.`
        );
        if (rewritten) blurb = rewritten;
      }
      setMatchBlurb(matchId, blurb, { finalized: 1 });
      return DONE(blurb);
    } catch (err) {
      console.warn(`[Blurb] Generation failed for ${matchId}: ${err.message}`);
      // Don't cache failures — a later request can retry
      return row ? DONE(row.blurb) : DONE('');
    } finally {
      inFlight.delete(matchId);
    }
  })();

  inFlight.set(matchId, promise);
  return promise;
}
