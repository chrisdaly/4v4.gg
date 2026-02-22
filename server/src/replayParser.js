import { readFileSync } from 'fs';
import w3gjs from 'w3gjs';

// w3gjs.default is the high-level W3GReplay class that aggregates
// players, actions, chat, and metadata from raw replay blocks.
const W3GReplay = w3gjs.default;
const parser = new W3GReplay();

// Capture early-game (first 60s) hotkey sequences from raw gamedatablock events.
// Actions 0x17 = assign group, 0x18 = select group. groupNumber is mapped via (n+1)%10.
const EARLY_GAME_MS = 60000;

// Full-game action IDs to capture for nanoGPT sequences
const TRACKED_ACTION_IDS = new Set([
  0x10, 0x11, 0x12, 0x13, 0x14, // Abilities (no target, point, unit, double, pos+obj)
  0x16,                           // Selection change
  0x17,                           // Assign group hotkey
  0x18,                           // Select group hotkey
  0x19,                           // Select subgroup (Tab)
  0x1E,                           // Remove from build queue
  0x61,                           // ESC pressed
  0x66,                           // Hero skill menu
  0x67,                           // Build menu
  0x68,                           // Minimap ping
]);

/**
 * Parse a .w3g replay file and return structured data.
 */
export async function parseReplayFile(filePath) {
  const buffer = readFileSync(filePath);

  // Collect early-game hotkey sequences per player from raw blocks
  const earlySeqs = {}; // playerId -> [{ ms, group, type }]
  // Collect full-game action sequences per player for nanoGPT
  const fullSeqs = {}; // playerId -> [{ ms, id, g? }]
  let elapsed = 0;

  const onBlock = (block) => {
    if (block.id !== 0x1f && block.id !== 0x1e) return;
    elapsed += block.timeIncrement;

    for (const cmd of block.commandBlocks || []) {
      for (const action of cmd.actions || []) {
        // Early-game hotkey capture (first 60s only)
        if (elapsed <= EARLY_GAME_MS && (action.id === 0x17 || action.id === 0x18)) {
          if (!earlySeqs[cmd.playerId]) earlySeqs[cmd.playerId] = [];
          earlySeqs[cmd.playerId].push({
            ms: elapsed,
            group: (action.groupNumber + 1) % 10,
            type: action.id === 0x17 ? 'a' : 's',
          });
        }

        // Full-game action capture (all tracked actions, entire duration)
        if (TRACKED_ACTION_IDS.has(action.id)) {
          if (!fullSeqs[cmd.playerId]) fullSeqs[cmd.playerId] = [];
          const entry = { ms: elapsed, id: action.id };
          // Include group number for hotkey actions
          if (action.id === 0x17 || action.id === 0x18) {
            entry.g = (action.groupNumber + 1) % 10;
          }
          fullSeqs[cmd.playerId].push(entry);
        }
      }
    }
  };

  parser.on('gamedatablock', onBlock);
  const result = await parser.parse(buffer);
  parser.removeListener('gamedatablock', onBlock);

  return {
    metadata: extractMetadata(result),
    players: extractPlayers(result),
    chat: extractChatMessages(result),
    actions: extractPlayerActions(result, earlySeqs, fullSeqs),
  };
}

/**
 * Extract game metadata from parsed replay.
 */
function extractMetadata(parsed) {
  const durationMs = parsed.duration || 0;
  const mapPath = parsed.map?.file || parsed.map?.path || '';
  // Strip path prefix, keep just the map name
  const mapName = mapPath.replace(/^.*[/\\]/, '').replace(/\.w3x$/i, '');

  // Determine match type from player count per team
  const teams = new Map();
  for (const p of parsed.players || []) {
    const t = p.teamid;
    teams.set(t, (teams.get(t) || 0) + 1);
  }
  const sizes = [...teams.values()].sort((a, b) => b - a);
  const matchType = sizes.length === 2 ? `${sizes[0]}on${sizes[1]}` : `${parsed.players?.length || 0}p`;

  return {
    gameName: parsed.gamename || null,
    gameDuration: Math.round(durationMs / 1000),
    mapName,
    matchType,
    matchDate: null, // w3gjs doesn't expose replay date reliably
    version: parsed.version || null,
    buildNumber: parsed.buildNumber || null,
    expansion: parsed.expansion ?? true,
    winningTeamId: parsed.winningTeamId ?? null,
  };
}

/**
 * Extract player info from parsed replay.
 */
function extractPlayers(parsed) {
  return (parsed.players || []).map(p => ({
    playerId: p.id,
    playerName: p.name,
    teamId: p.teamid,
    race: mapRace(p.raceDetected || p.race),
    apm: p.apm || 0,
    color: p.color || null,
  }));
}

/**
 * Extract chat messages from parsed replay.
 */
function extractChatMessages(parsed) {
  return (parsed.chat || []).map(msg => ({
    playerId: msg.playerId,
    playerName: msg.playerName,
    message: msg.message,
    timeMs: msg.timeMS || 0,
    mode: msg.mode || 'All',
  }));
}

/**
 * Extract per-player action summaries from parsed replay.
 */
function extractPlayerActions(parsed, earlySeqs = {}, fullSeqs = {}) {
  const durationMs = parsed.duration || 1;

  return (parsed.players || []).map(p => {
    const a = p.actions || {};

    // a.timed is already an array of per-minute action counts from w3gjs
    const timedSegments = Array.isArray(a.timed) ? a.timed : [];

    // Group hotkeys
    const groupHotkeys = {};
    if (p.groupHotkeys) {
      for (const [key, val] of Object.entries(p.groupHotkeys)) {
        groupHotkeys[key] = {
          assigned: val.assigned || 0,
          used: val.used || 0,
        };
      }
    }

    // Heroes
    const heroes = (p.heroes || []).map(h => ({
      id: h.id,
      level: h.level,
      abilities: h.abilities || {},
      abilityOrder: (h.abilityOrder || []).map(ao => ({
        type: ao.type,
        time: ao.time,
        value: ao.type === 'ability' ? ao.value : null,
      })),
    }));

    return {
      playerId: p.id,
      assigngroup: a.assigngroup || 0,
      rightclick: a.rightclick || 0,
      basic: a.basic || 0,
      buildtrain: a.buildtrain || 0,
      ability: a.ability || 0,
      item: a.item || 0,
      selectCount: a.select || 0,
      removeunit: a.removeunit || 0,
      subgroup: a.subgroup || 0,
      selecthotkey: a.selecthotkey || 0,
      esc: a.esc || 0,
      timedSegments,
      groupHotkeys,
      heroes,
      unitsSummary: p.units?.summary || {},
      buildingsSummary: p.buildings?.summary || {},
      earlyGameSequence: earlySeqs[p.id] || [],
      fullActionSequence: fullSeqs[p.id] || [],
    };
  });
}

/**
 * Map w3gjs race code to readable name.
 */
function mapRace(code) {
  const races = { H: 'Human', O: 'Orc', N: 'Night Elf', U: 'Undead', R: 'Random' };
  return races[code] || code || 'Unknown';
}
