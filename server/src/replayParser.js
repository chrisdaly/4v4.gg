import { readFileSync } from 'fs';
import W3GReplay from 'w3gjs';

/**
 * Version of what a parsed game's action sequence holds, stamped on each
 * replay_player_actions row (parser_version) so we know which games are at
 * the current standard. Bump it whenever the sequence gains information, and
 * add a line here.
 *
 *   NULL  before 2026-11-18. Timing, action type, control group, unit count
 *         on selections. No order/ability ids (read from the wrong field),
 *         no tabbed unit type, no resource sends. Some rows have no sequence.
 *   2     2026-11-18, the gold standard. Adds order/ability ids on every
 *         order (FourCC like "ohun", or hex for built-in orders like
 *         "d0012" = move), the unit type tabbed to (0x19, "u"), and
 *         gold/lumber sent to allies (0x51).
 *
 * Game-client bookkeeping is deliberately not kept: 0x1A (sent after every
 * selection change) and 0x1B (undocumented, arrives in long automatic runs,
 * ~40k per 4v4 game, more than all real actions).
 */
export const PARSER_VERSION = 2;

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
  0x51,                           // Send gold/lumber to an ally
  0x61,                           // ESC pressed
  0x66,                           // Hero skill menu
  0x67,                           // Build menu
  0x68,                           // Minimap ping
]);

// FourCC bytes are stored little-endian in w3gjs - reverse to get standard unit ID
function fourCCToString(arr) {
  if (!arr || arr.length !== 4) return null;
  // Right-click (smart command) uses a non-ASCII numeric order ID 0x000D0003
  if (arr[0] === 0x03 && arr[1] === 0x00 && arr[2] === 0x0D && arr[3] === 0x00) return 'smart';
  const str = String.fromCharCode(arr[3], arr[2], arr[1], arr[0]);
  // Only return printable ASCII - non-printable results are numeric IDs, not FourCCs
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    if (c < 32 || c > 126) return null;
  }
  return str;
}

function netTagKey(tag) {
  return `${tag[0]}:${tag[1]}`;
}

/**
 * Parse a .w3g replay file and return structured data.
 */
export async function parseReplayFile(filePath) {
  return parseReplayBuffer(readFileSync(filePath));
}

/**
 * Parse a .w3g replay buffer and return structured data.
 */
export async function parseReplayBuffer(buffer) {
  const parser = new W3GReplay();

  // Collect early-game hotkey sequences per player from raw blocks
  const earlySeqs = {}; // playerId -> [{ ms, group, type }]
  // Collect full-game action sequences per player for nanoGPT
  const fullSeqs = {}; // playerId -> [{ ms, id, g? }]
  // Control group composition tracking per player
  const groupState = {}; // playerId -> { objectMap, groups }
  let elapsed = 0;

  const getGroupState = (id) => {
    if (!groupState[id]) groupState[id] = { objectMap: new Map(), groups: {} };
    return groupState[id];
  };

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
          // Group number for hotkey actions
          if (action.id === 0x17 || action.id === 0x18) {
            entry.g = (action.groupNumber + 1) % 10;
          }
          // Order/ability ID for targeted actions (move, attack, spells)
          // w3gjs names it orderId (orderId1 on 0x14); reading itemId here
          // silently stored no order ids from June to November 2026.
          const orderId = action.orderId || action.orderId1;
          if ((action.id >= 0x10 && action.id <= 0x14) && orderId) {
            // Built-in orders (move, attack, stop, hold, patrol) are numeric
            // ids like 0x000D0012, not FourCCs: keep them as hex, "d0012"
            const oid = fourCCToString(orderId)
              || (orderId.length === 4 ? ((orderId[3] << 24 | orderId[2] << 16 | orderId[1] << 8 | orderId[0]) >>> 0).toString(16) : null);
            if (oid) entry.oid = oid;
          }
          // Unit count for select actions
          if (action.id === 0x16 && action.units) {
            entry.n = action.units.length;
          }
          // Unit type tabbed to within the selection
          if (action.id === 0x19 && action.itemId) {
            const u = fourCCToString(action.itemId);
            if (u) entry.u = u;
          }
          // Resources sent to an ally: gold and lumber
          if (action.id === 0x51) {
            entry.gold = action.gold || 0;
            entry.lumber = action.lumber || 0;
          }
          fullSeqs[cmd.playerId].push(entry);
        }

        // 0x19: Select Subgroup - reveals ItemID ↔ ObjectID association
        if (action.id === 0x19 && action.itemId && action.object) {
          const gs = getGroupState(cmd.playerId);
          const itemStr = fourCCToString(action.itemId);
          if (itemStr && (action.object[0] !== 0 || action.object[1] !== 0)) {
            gs.objectMap.set(netTagKey(action.object), itemStr);
          }
        }

        // 0x17: Assign Group Hotkey - full unit list for this group
        if (action.id === 0x17 && action.units) {
          const gs = getGroupState(cmd.playerId);
          const g = (action.groupNumber + 1) % 10;
          gs.groups[g] = action.units.map(u => netTagKey(u));
        }
      }
    }
  };

  parser.on('gamedatablock', onBlock);
  let result;
  try {
    result = await parser.parse(buffer);
  } finally {
    parser.removeListener('gamedatablock', onBlock);
  }

  // Build final group compositions with backfilled ObjectID→ItemID
  const groupComps = {}; // playerId -> { g: [itemId, ...] }
  for (const [playerId, gs] of Object.entries(groupState)) {
    groupComps[playerId] = {};
    for (const [g, unitKeys] of Object.entries(gs.groups)) {
      groupComps[playerId][g] = unitKeys.map(key => gs.objectMap.get(key) || null);
    }
  }

  return {
    metadata: extractMetadata(result),
    players: extractPlayers(result),
    chat: extractChatMessages(result),
    actions: extractPlayerActions(result, earlySeqs, fullSeqs, groupComps),
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
function extractPlayerActions(parsed, earlySeqs = {}, fullSeqs = {}, groupComps = {}) {
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
      groupCompositions: groupComps[p.id] || {},
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
