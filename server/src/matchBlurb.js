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
- The story, in order of preference: post-game reactions (blame, gloating, debate), pre-game trash-talk that aged well or badly, win/loss streaks, repeat encounters between players, economy (who expanded vs who was suppressed, hero kill disparity), a genuinely extreme individual stat.
- Post-game beef in the lounge is the best story there is. When players are clearly going at each other after the match — insults, blame, gloating, denial — write it. You don't have to quote the messages literally; name the people involved and describe the friction drily ("X and Y traded words after the whistle", "X celebrated loudly; Y disagreed"). "Never cruel" means don't pile on or editorialize — not that you must ignore drama.
- A stat is only quotable if it's an outlier — far ahead of everyone else in this lobby, or absurdly large. NEVER write a zero or a small number as a stat. Do not write "0 hero kills", "scoreless", "went 0-66", or any phrasing built around a low count, even as contrast against something else. If a player's number is low, pretend you never saw it — pick a different player or a different angle.
- Never mention or compare MMR values of any kind: no gains, no losses, no "+7", no "highest MMR player", no "3rd-lowest MMR on her team". The scoreboard shows MMR — treat it as if the numbers don't exist.
- Do not mention team balance, "even teams", or "close match" unless one team's average MMR exceeds the other's by at least 200. A near-even game is the norm, not a story.
- The scoreboard already shows each player's race. Never make race composition the story. "Ran 3 humans", "went orc", "Human-heavy team", "the only Orc" — these are not blurbs.
- When you name players from both teams in the same sentence, make the sides legible. Use "winner X" / "loser Y", or group by side: "X and Y (winners) out-mined Z and W". Never list players from opposite teams as if they're peers with no side context — the reader can't tell who's who without the scoreboard.
- Do not invent game events the fact sheet doesn't state: who killed whom, which units or spells did it, what happened on the map. The sheet has per-player totals only — anything more specific is fiction.
- Chat lines come from the community lounge, NOT from inside the game. Only describe when something was said if the timestamps prove it (match start/end times are given); otherwise say "in the lounge" or leave the timing out. Messages timestamped AFTER the match ended are reactions to this game.
- "Aged well/poorly" only applies to chat sent clearly BEFORE the match ended — a prediction or trash-talk that the result then confirmed or contradicted. To use "aged", the message must be from at least a few minutes before match end, must make a claim about the future (e.g. "we're winning this", "these guys are trash"), and the result must contradict or confirm it. A message sent at the whistle or after is a reaction to an outcome already known — it cannot age well or poorly, even if it sounds like a complaint or boast. Never write "aged poorly" or "aged well" about any message sent at or after match end.
- Refer to players by name only (no battle tag numbers).
- When your line mentions a Warcraft unit or hero — including slang ("frosties" = frostwyrm, "dks" = deathknight, "bm" = blademaster, "tanks" = siegeengine) — write the markup INSTEAD of the plain word: [[frostwyrm|frosties]]. Do NOT write the word first and then tag it — that doubles the text. The format is [[id|words]] where "words" is exactly what you want displayed. Never write [[id]] without a pipe. Markup does not count toward the 90-character limit.
  Allowed unit ids: footman, rifleman, knight, priest, sorceress, spellbreaker, gryphon, mortarteam, siegeengine, dragonhawk, gyrocopter, waterelemental, peasant, grunt, headhunter, raider, shaman, witchdoctor, kodo, tauren, windrider, batrider, demolisher, peon, ghoul, cryptfiend, gargoyle, abomination, necromancer, banshee, meatwagon, frostwyrm, destroyer, obsidianstatue, acolyte, archer, huntress, dryad, druidoftheclaw, druidofthetalon, hippogryph, chimaera, mountaingiant, faeriedragon, wisp.
  Allowed hero ids: archmage, mountainking, paladin, sorceror, blademaster, farseer, shadowhunter, taurenchieftain, deathknight, lich, dreadlord, cryptlord, demonhunter, keeperofthegrove, priestessofthemoon, warden, alchemist, avatarofflame, bansheeranger, beastmaster, pandarenbrewmaster, pitlord, seawitch, tinker.
- PASS is a good outcome and most games deserve it. If the best you can do is restate the result, describe an ordinary stat, or pad with the map name, your ENTIRE response must be exactly the four characters: PASS — no sentence, no preamble, nothing else before or after.`;

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

const STREAK_BADGE_MIN = 5;
const MILESTONE_MMRS = [1000, 1500, 1800, 2000, 2200, 2400, 2600];

function computeBadges(allPlayers, histories, matchId) {
  const badges = [];
  const winStreaks = [];
  const lossStreaks = [];

  for (const p of allPlayers) {
    const streak = streakFromHistory(histories.get(p.battleTag) || [], p.battleTag, matchId);
    if (streak && streak.length >= STREAK_BADGE_MIN) {
      const entry = { type: 'streak', won: streak.won, length: streak.length, name: p.name || p.battleTag?.split('#')[0], tag: p.battleTag, mmrGain: p.mmrGain ?? null };
      if (streak.won) winStreaks.push(entry);
      else lossStreaks.push(entry);
    }

    const oldMmr = p.oldMmr ?? 0;
    const newMmr = oldMmr + (p.mmrGain ?? 0);

    // Compute season low/high from recent match history so we can:
    // (a) only fire PEAK when it's genuinely a new high in recent games, and
    // (b) pass range data to the badge widget for the visual thermometer.
    const playerHistory = (histories.get(p.battleTag) || []).filter(m => m.id !== matchId);
    let histPeak = 0;
    let histLow = oldMmr;
    for (const hm of playerHistory) {
      const hp = (hm.teams || []).flatMap(t => t.players || [])
        .find(pl => pl.battleTag?.toLowerCase() === p.battleTag?.toLowerCase());
      if (!hp) continue;
      const mmrAfter = (hp.oldMmr ?? 0) + (hp.mmrGain ?? 0);
      if (mmrAfter > histPeak) histPeak = mmrAfter;
      const hpOld = hp.oldMmr ?? 0;
      if (hpOld > 0 && hpOld < histLow) histLow = hpOld;
    }

    for (const m of MILESTONE_MMRS) {
      if (oldMmr < m && newMmr >= m && newMmr > histPeak) {
        // Only fire if this is genuinely the highest MMR seen in recent history
        badges.push({
          type: 'milestone',
          name: p.name || p.battleTag?.split('#')[0],
          tag: p.battleTag,
          milestone: m,
          currentMmr: Math.round(newMmr),
          seasonLow: Math.round(histLow),
          seasonPeak: Math.round(newMmr),
        });
      }
    }
  }

  // Best HOT and COLD only
  winStreaks.sort((a, b) => b.length - a.length);
  lossStreaks.sort((a, b) => b.length - a.length);
  if (winStreaks[0]) badges.unshift(winStreaks[0]);
  if (lossStreaks[0]) badges.push(lossStreaks[0]);

  return badges;
}

// Returns { factSheet, endTimeMs } or null.
// phase 'instant' excludes post-match-end chat; 'full' (default) includes it.
export async function buildFactSheet(matchId, phase = 'full') {
  const key = `${matchId}:${phase}`;
  const cached = sheetCache.get(key);
  if (cached && Date.now() - cached.ts < SHEET_TTL_MS) return cached.sheet;
  const sheet = await buildFactSheetUncached(matchId, phase);
  sheetCache.set(key, { sheet, ts: Date.now() });
  if (sheetCache.size > 100) {
    const oldest = [...sheetCache.keys()][0];
    sheetCache.delete(oldest);
  }
  return sheet;
}

async function buildFactSheetUncached(matchId, phase = 'full') {
  const detail = await fetchJson(`${W3C_API}/matches/${encodeURIComponent(matchId)}`);
  const match = detail?.match;
  if (!match?.teams || !match.endTime) return null;

  const winnerIdx = match.teams.findIndex((t) => t.players?.some((p) => p.won));
  if (winnerIdx < 0) return null;

  const allPlayers = match.teams.flatMap((t, ti) =>
    (t.players || []).map((p) => ({ ...p, teamIndex: ti }))
  );
  const tags = allPlayers.map((p) => p.battleTag).filter(Boolean);

  // Derive the current season from the match end date.
  // Season 25 started 2026-06-16; try it first then fall back one season.
  const endDate = new Date(match.endTime);
  const season25Start = new Date('2026-06-16T00:00:00Z');
  const currentSeason = endDate >= season25Start ? 25 : 24;

  // Recent history per player (newest-first) — feeds streaks + head-to-heads.
  // Must use /matches/search — the /matches global feed ignores playerId.
  async function fetchPlayerHistory(tag) {
    for (const season of [currentSeason, currentSeason - 1]) {
      try {
        const data = await fetchJson(
          `${W3C_API}/matches/search?playerId=${encodeURIComponent(tag)}&gameMode=4&season=${season}&gateway=20&pageSize=12`
        );
        const matches = data.matches || [];
        if (matches.length > 0) return matches;
      } catch { /* try next */ }
    }
    return [];
  }

  const histories = new Map();
  await Promise.all(
    tags.map(async (tag) => {
      histories.set(tag, await fetchPlayerHistory(tag));
    })
  );

  const lines = [];
  lines.push(
    `Map: ${match.mapName}, duration ${Math.round(match.durationInSeconds / 60)} min, ` +
    `started ${match.startTime} (UTC), ended ${match.endTime} (UTC).`
  );

  // 1-base gold baseline: ~10g/sec. Above 1.3x = expanded to a second base.
  // Below 0.8x = suppressed/harassed. Gives the LLM a macro-vs-rush angle.
  const goldBaseline = (match.durationInSeconds || 900) * 10;

  let winnersHeroKills = 0;
  let losersHeroKills = 0;

  for (const ti of [winnerIdx, 1 - winnerIdx]) {
    const label = ti === winnerIdx ? 'WINNERS' : 'LOSERS';
    const teamPlayers = match.teams[ti].players || [];

    for (const p of teamPlayers) {
      const ps = (detail.playerScores || []).find((s) => s.battleTag === p.battleTag);
      const heroes = (p.heroes || [])
        .map((h) => `${h.name} lvl${h.level}`)
        .join('/');
      const bits = [
        `${label}: ${p.name} (${p.oldMmr} MMR)`,
      ];
      if (heroes) bits.push(`heroes ${heroes}`);
      if (ps) {
        const stats = [];
        const hk  = ps.heroScore?.heroesKilled ?? 0;
        const uk  = ps.unitScore?.unitsKilled ?? 0;
        const army = ps.unitScore?.largestArmy ?? 0;
        const gold = ps.resourceScore?.goldCollected ?? 0;
        const upkeep = ps.resourceScore?.goldUpkeepLost ?? 0;

        if (ti === winnerIdx) winnersHeroKills += hk;
        else losersHeroKills += hk;

        // Economy: classify vs 1-base baseline
        if (gold > goldBaseline * 1.3) {
          stats.push(`expanded (${Math.round(gold / 1000)}k gold)`);
        } else if (gold > 0 && gold < goldBaseline * 0.8) {
          stats.push(`suppressed (${Math.round(gold / 1000)}k gold)`);
        }
        if (upkeep > 500) stats.push(`${upkeep}g to upkeep`);
        if (hk >= 2) stats.push(`${hk} hero kills`);
        if (uk >= 60) stats.push(`${uk} units killed`);
        if (army >= 80) stats.push(`${army} largest army`);
        if (stats.length) bits.push(stats.join(', '));
      }
      const streak = streakFromHistory(histories.get(p.battleTag) || [], p.battleTag, matchId);
      if (streak && streak.length >= STREAK_BADGE_MIN) {
        bits.push(`now on a ${streak.length}-game ${streak.won ? 'WIN' : 'LOSS'} streak`);
      }
      lines.push('- ' + bits.join('; '));
    }
  }

  lines.push(`Hero kills: WINNERS ${winnersHeroKills}, LOSERS ${losersHeroKills}`);

  // Head-to-head: cross-team pairs that met recently.
  // rivalriesText → fed to LLM fact sheet.
  // rivalsData    → stored in DB for widget rendering (structured, no LLM needed).
  const rivalriesText = [];
  const rivalsData = [];
  for (const a of match.teams[winnerIdx].players || []) {
    for (const b of match.teams[1 - winnerIdx].players || []) {
      if (!a.battleTag || !b.battleTag) continue;
      const { meetings, wins } = recentMeetings(
        histories.get(a.battleTag) || [],
        a.battleTag,
        b.battleTag,
        matchId
      );
      if (meetings >= 5) {
        rivalriesText.push(
          `${a.name} vs ${b.name}: faced each other ${meetings}x recently before this, ${a.name} won ${wins}`
        );
        // playerA = winner-team player so their wins read left-to-right in the widget
        rivalsData.push({ playerA: a.name, playerATag: a.battleTag, playerB: b.name, playerBTag: b.battleTag, playerAWins: wins, playerBWins: meetings - wins, meetings });
      }
    }
  }
  if (rivalriesText.length > 0) {
    lines.push('Recent head-to-heads (before this game): ' + rivalriesText.slice(0, 4).join(' | '));
  }

  // Recent chat from these players (the relay's chat archive). Only include
  // messages in a tight window around the match: up to 30 min before end
  // (banter during the game) plus up to 10 min of post-game reactions.
  // The "instant" phase cuts off at match end; "full" allows the +10 min tail.
  try {
    let msgs = getRecentMessagesByTags(tags, 12, 20);
    const endMs = new Date(match.endTime).getTime();
    const PRE_WINDOW_MS  = 30 * 60 * 1000;  // 30 min before match end
    const POST_WINDOW_MS = 10 * 60 * 1000;  // 10 min of reactions
    msgs = msgs.filter((m) => {
      const t = new Date(m.received_at + ' UTC').getTime();
      if (phase === 'instant') return t <= endMs && t >= endMs - PRE_WINDOW_MS;
      return t <= endMs + POST_WINDOW_MS && t >= endMs - PRE_WINDOW_MS;
    });
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
    badges: computeBadges(allPlayers, histories, matchId),
    rivals: rivalsData,
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

const DONE = (blurb, badges = [], rivals = []) => ({ blurb, pending: false, badges, rivals });

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
        setMatchBlurb(matchId, blurb, { finalized: !fresh, endTimeMs: data.endTimeMs, rivals: data.rivals });
        return fresh
          ? { blurb, pending: true, badges: data.badges, rivals: data.rivals, retryInMs: data.endTimeMs + REACTION_WAIT_MS - now + 15_000 }
          : DONE(blurb, data.badges, data.rivals);
      }

      // Phase 2: did anyone in the lobby react since the game ended?
      sheetCache.delete(matchId);
      const data = await buildFactSheet(matchId);
      if (!data) {
        setMatchBlurb(matchId, row.blurb, { finalized: 1 });
        return DONE(row.blurb, [], row.rivals);
      }
      let blurb = row.blurb;
      const reactions = countMessagesByTagsSince(data.tags, row.end_time_ms);
      if (reactions >= MIN_REACTIONS) {
        const rewritten = await generateWithPrompt(
          `${data.factSheet}\n\nNote: lounge messages timestamped after the match end are the players' reactions to THIS game — prioritize them if they carry any drama.`
        );
        if (rewritten) blurb = rewritten;
      }
      setMatchBlurb(matchId, blurb, { finalized: 1, rivals: data.rivals });
      return DONE(blurb, data.badges, data.rivals);
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
