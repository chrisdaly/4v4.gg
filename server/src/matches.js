import { insertEvent } from './db.js';

const API_BASE = 'https://website-backend.w3champions.com/api';
const POLL_INTERVAL = 30_000; // 30 seconds
const PROFILE_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

let previousMatches = new Map(); // matchId → match data
let profileCache = new Map(); // battleTag → { country, fetchedAt }
let pollTimer = null;

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

async function getPlayerCountry(battleTag) {
  const cached = profileCache.get(battleTag);
  if (cached && Date.now() - cached.fetchedAt < PROFILE_CACHE_TTL) {
    return cached.country;
  }

  try {
    const profile = await fetchJSON(
      `${API_BASE}/personal-settings/${encodeURIComponent(battleTag)}`
    );
    const country = profile?.location || null;
    profileCache.set(battleTag, { country, fetchedAt: Date.now() });
    return country;
  } catch {
    return null;
  }
}

function extractPlayers(match) {
  const players = [];
  for (let ti = 0; ti < (match.teams || []).length; ti++) {
    for (const p of match.teams[ti].players || []) {
      if (p.battleTag) {
        players.push({
          battleTag: p.battleTag,
          name: p.battleTag.split('#')[0],
          race: p.race ?? null,
          oldMmr: p.oldMmr ?? null,
          currentMmr: p.currentMmr ?? null,
          teamIdx: ti,
        });
      }
    }
  }
  return players;
}

async function enrichWithCountries(players) {
  // Fetch countries in parallel (limited concurrency via cache hits)
  const results = await Promise.all(
    players.map(async (p) => {
      const country = await getPlayerCountry(p.battleTag);
      return { ...p, country };
    })
  );
  return results;
}

async function pollMatches() {
  try {
    const data = await fetchJSON(
      `${API_BASE}/matches/ongoing?offset=0&gameMode=4&pageSize=50`
    );

    const currentMatches = new Map();
    for (const match of data.matches || []) {
      currentMatches.set(match.id, match);
    }

    // Detect new matches (game_start)
    for (const [id, match] of currentMatches) {
      if (!previousMatches.has(id)) {
        const players = extractPlayers(match);
        const enriched = await enrichWithCountries(players);
        const mapName = match.mapName || match.map || null;
        const startTime = match.startTime || null;

        insertEvent('game_start', {
          matchId: id,
          map: mapName,
          startTime,
          players: enriched,
        });

        console.log(`[Matches] game_start: ${id} — ${enriched.length} players on ${mapName}`);
      }
    }

    // Detect ended matches (game_end)
    for (const [id, match] of previousMatches) {
      if (!currentMatches.has(id)) {
        const players = extractPlayers(match);
        const enriched = await enrichWithCountries(players);
        const mapName = match.mapName || match.map || null;
        const startTime = match.startTime || null;

        insertEvent('game_end', {
          matchId: id,
          map: mapName,
          startTime,
          players: enriched,
        });

        console.log(`[Matches] game_end: ${id} — ${enriched.length} players`);
      }
    }

    previousMatches = currentMatches;
  } catch (err) {
    console.error('[Matches] Poll error:', err.message);
  }
}

export function startMatchPolling() {
  console.log('[Matches] Starting match polling (30s interval)');
  // Initial poll
  pollMatches();
  pollTimer = setInterval(pollMatches, POLL_INTERVAL);
}

export function stopMatchPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}
