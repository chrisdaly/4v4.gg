import Anthropic from '@anthropic-ai/sdk';
import { broadcast } from './sse.js';
import { sendMessage } from './signalr.js';
import { getMessages } from './db.js';
import config from './config.js';

const API_BASE = 'https://website-backend.w3champions.com/api';
const GATEWAY = 20;
const GAME_MODE = 4;
const COOLDOWN_MS = 5000;
const MAX_RESPONSE_LENGTH = 600;

let botEnabled = false;
let currentSeason = 24;
let lastCommandTime = 0;

const RACE_NAMES = { 0: 'Random', 1: 'Human', 2: 'Orc', 4: 'Night Elf', 8: 'Undead', 16: 'All', 64: 'Starter' };
const ALLOWED_USERS = new Set(['FOALS#11315']);

// ── Init ──────────────────────────────────────────────────────

export async function initBot() {
  botEnabled = config.BOT_ENABLED;
  console.log(`[Bot] Initialized (enabled: ${botEnabled})`);

  try {
    const res = await fetch(`${API_BASE}/ladder/seasons`);
    const seasons = await res.json();
    if (seasons?.length > 0) {
      currentSeason = seasons[0].id;
      console.log(`[Bot] Current season: ${currentSeason}`);
    }
  } catch (err) {
    console.warn('[Bot] Failed to fetch season, using default:', currentSeason);
  }
}

// ── Toggle ────────────────────────────────────────────────────

export function setBotEnabled(enabled) {
  botEnabled = !!enabled;
  console.log(`[Bot] ${botEnabled ? 'Enabled' : 'Disabled'}`);
}

export function isBotEnabled() {
  return botEnabled;
}

// ── Command handling ──────────────────────────────────────────

export function handleCommand(text, battleTag, userName) {
  if (!text.startsWith('!')) return false;

  const parts = text.trim().split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1);

  const handler = COMMANDS[cmd];
  if (!handler) return false;

  // Allowlist check
  if (!ALLOWED_USERS.has(battleTag)) {
    console.log(`[Bot] Ignored ${cmd} from ${userName} (${battleTag}) — not in allowlist`);
    return true;
  }

  // Rate limiting
  const now = Date.now();
  if (now - lastCommandTime < COOLDOWN_MS) {
    console.log(`[Bot] Rate limited: ${cmd} from ${userName}`);
    return true;
  }
  lastCommandTime = now;

  // Run async — don't block ReceiveMessage
  runCommand(handler, args, battleTag, userName, cmd).catch(err => {
    console.error(`[Bot] Error running ${cmd}:`, err.message);
  });

  return true;
}

async function runCommand(handler, args, battleTag, userName, cmd) {
  let response;
  try {
    response = await handler(args, battleTag, userName);
  } catch (err) {
    response = `Error: ${err.message}`;
  }

  if (response.length > MAX_RESPONSE_LENGTH) {
    response = response.substring(0, MAX_RESPONSE_LENGTH - 3) + '...';
  }

  // Always broadcast to frontend via SSE
  broadcast('bot_response', {
    command: cmd,
    response,
    triggeredBy: userName,
    triggeredByTag: battleTag,
    botEnabled,
    time: new Date().toISOString(),
  });

  console.log(`[Bot] ${cmd} → ${response.substring(0, 80)}`);

  // Only send to actual chat when enabled
  if (botEnabled) {
    try {
      await sendMessage(response);
    } catch (err) {
      console.error(`[Bot] Failed to send to chat:`, err.message);
    }
  }
}

// ── Test mode — run a command without sending to chat ─────────

export async function testCommand(text) {
  if (!text.startsWith('!')) return null;

  const parts = text.trim().split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1);

  const handler = COMMANDS[cmd];
  if (!handler) return null;

  let response;
  try {
    response = await handler(args, 'test#0000', 'test');
  } catch (err) {
    response = `Error: ${err.message}`;
  }

  if (response.length > MAX_RESPONSE_LENGTH) {
    response = response.substring(0, MAX_RESPONSE_LENGTH - 3) + '...';
  }

  const payload = {
    command: cmd,
    response,
    triggeredBy: 'test',
    triggeredByTag: 'test#0000',
    botEnabled: false,
    time: new Date().toISOString(),
  };

  // Broadcast to frontend so it shows in the chat UI
  broadcast('bot_response', payload);

  return payload;
}

// ── API helpers ───────────────────────────────────────────────

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

function formatDuration(startTime) {
  const ms = Date.now() - new Date(startTime).getTime();
  const mins = Math.floor(ms / 60000);
  return `${mins}m`;
}

function formatBattleTag(tag) {
  return tag ? tag.split('#')[0] : '?';
}

// ── Command handlers ──────────────────────────────────────────

async function cmdGames() {
  const data = await fetchJSON(
    `${API_BASE}/matches/ongoing?offset=0&pageSize=20&gameMode=${GAME_MODE}&gateway=${GATEWAY}&map=Overall&sort=startTimeDescending`
  );

  const matches = data.matches || [];
  if (matches.length === 0) return 'No 4v4 games in progress.';

  const lines = matches.slice(0, 5).map((m) => {
    const map = m.mapName || m.gameMode?.mapName || '?';
    const duration = m.startTime ? formatDuration(m.startTime) : '?';
    const allPlayers = m.teams?.flatMap(t => t.players) || [];
    const mmrs = allPlayers.map(p => p.oldMmr).filter(Boolean);
    const avgMmr = mmrs.length > 0 ? Math.round(mmrs.reduce((a, b) => a + b, 0) / mmrs.length) : '?';
    return `${map} | ${duration} | ~${avgMmr} MMR`;
  });

  return `${matches.length} game(s) live:\n${lines.join('\n')}`;
}

async function cmdStats(args, battleTag) {
  let searchTag = battleTag;
  if (args.length > 0) {
    // Search by name
    const searchTerm = args.join(' ');
    const results = await fetchJSON(
      `${API_BASE}/ladder/search?gateWay=${GATEWAY}&searchFor=${encodeURIComponent(searchTerm)}&gameMode=${GAME_MODE}&season=${currentSeason}`
    );
    if (!results || results.length === 0) return `No player found: "${searchTerm}"`;
    searchTag = results[0].player?.playerIds?.[0]?.battleTag || results[0].battleTag;
    if (!searchTag) return `No player found: "${searchTerm}"`;
  }

  const statsUrl = `${API_BASE}/players/${encodeURIComponent(searchTag)}/game-mode-stats?gateway=${GATEWAY}&season=${currentSeason}`;
  const allStats = await fetchJSON(statsUrl);
  const stats = allStats.find(s => s.gameMode === GAME_MODE);

  if (!stats) return `${formatBattleTag(searchTag)}: No 4v4 stats this season.`;

  const name = formatBattleTag(searchTag);
  const race = RACE_NAMES[stats.race] || '?';
  const total = stats.wins + stats.losses;
  const winRate = total > 0 ? ((stats.wins / total) * 100).toFixed(0) : 0;

  return `${name} | ${Math.round(stats.mmr)} MMR | #${stats.rank || '?'} | ${race} | ${stats.wins}W-${stats.losses}L (${winRate}%)`;
}

async function cmdLastGame() {
  const data = await fetchJSON(
    `${API_BASE}/matches?offset=0&gateway=${GATEWAY}&pageSize=1&gameMode=${GAME_MODE}&map=Overall`
  );

  const matches = data.matches || [];
  if (matches.length === 0) return 'No recent 4v4 games found.';

  const match = matches[0];
  const map = match.mapName || '?';
  const duration = match.durationInSeconds ? `${Math.floor(match.durationInSeconds / 60)}m` : '?';

  const teams = match.teams || [];
  const winnerIdx = teams.findIndex(t => t.players?.some(p => p.won));
  const loserIdx = winnerIdx === 0 ? 1 : 0;

  const formatTeam = (team) =>
    (team?.players || []).map(p => formatBattleTag(p.battleTag)).join(', ');

  const winners = winnerIdx >= 0 ? formatTeam(teams[winnerIdx]) : '?';
  const losers = teams[loserIdx] ? formatTeam(teams[loserIdx]) : '?';

  return `Last game: ${map} (${duration}) - WIN: ${winners} | LOSS: ${losers}`;
}

async function cmdRecap(args) {
  if (!config.ANTHROPIC_API_KEY) return 'Recap not available (no API key configured).';

  // Parse args: !recap [topic] [count]
  // Last arg that's a number = count, rest = topic
  let count = 50;
  const topicParts = [];
  for (const arg of args) {
    if (/^\d+$/.test(arg)) {
      count = Math.min(Math.max(parseInt(arg, 10), 10), 200);
    } else {
      topicParts.push(arg);
    }
  }
  const topic = topicParts.join(' ');

  const rows = getMessages({ limit: count });
  if (rows.length === 0) return 'No messages to recap.';

  // Format chat log (oldest first)
  const log = rows.reverse().map(m =>
    `[${m.user_name}]: ${m.message}`
  ).join('\n');

  const topicPrompt = topic
    ? `Focus on discussion about "${topic}". Ignore unrelated messages.`
    : '';

  const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: `You are the recap bot for a Warcraft III 4v4 chat room. These players trash-talk, banter, and argue about strats all day.

Rules:
- Summarize each distinct conversation/topic as a separate short line
- Separate lines with a blank line between them
- Be casual and witty, match gamer banter energy
- Use player names
- Just state what happened factually, no opinions or commentary (no "brutal", "classic", "chaos", "wp", etc)
- ASCII only, no emojis or special unicode
- Keep total output under 500 chars
${topicPrompt}

Chat log (${rows.length} messages):
${log}`
    }],
  });

  return msg.content[0]?.text || 'Could not generate recap.';
}

async function cmdHelp() {
  return '!games - Live 4v4 matches | !stats [name] - Player stats | !lastgame - Last finished game | !recap [topic] [count] - AI chat recap | !help - This list';
}

const COMMANDS = {
  '!games': cmdGames,
  '!stats': cmdStats,
  '!lastgame': cmdLastGame,
  '!recap': cmdRecap,
  '!help': cmdHelp,
};
