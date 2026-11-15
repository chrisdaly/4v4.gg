/**
 * Per-game connection countries.
 *
 * Every W3Champions match record carries, for each player, the country
 * matchmaking saw for their connection in that game (`location`). The profile
 * only keeps the latest one, so a single game from abroad or on a VPN hides an
 * account's usual country. Recording it per game gives the history instead.
 * Verified Nov 2026: of 30 active accounts, four switch countries game to game
 * (AgentHunt HK/CN daily, Lynfan HK/CN, ToD AT/BG, po1nt LV then NO).
 *
 * Two sources:
 *  - recordMatchCountries(): called with match payloads the relay already
 *    fetches (the importer reads the latest 200 ladder games every ~15 min).
 *  - startCountryBackfill(): one history request per account per season, for
 *    accounts indexed before recording started. Slow on purpose.
 */

import {
  insertGameCountries,
  getGameCountries,
  getTagsWithGameCountries,
} from './db.js';

const W3C_API = 'https://website-backend.w3champions.com/api';
const BACKFILL_GAP_MS = 1500;
// An account with this many recorded games is not looked up again
const ENOUGH_GAMES = 20;
// A usual country needs at least this many games behind it
export const MIN_GAMES_FOR_USUAL = 3;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Store the connection country of every player in these match payloads.
 * Safe to call with anything: matches without the field are skipped.
 * @returns {number} rows added
 */
export function recordMatchCountries(matches) {
  const rows = [];
  for (const m of matches || []) {
    if (!m?.id) continue;
    for (const team of m.teams || []) {
      for (const p of team.players || []) {
        if (p?.battleTag && p.location) {
          rows.push({ battleTag: p.battleTag, matchId: String(m.id), playedAt: m.endTime || m.startTime || null, country: p.location });
        }
      }
    }
  }
  try {
    return insertGameCountries(rows);
  } catch (err) {
    console.warn('[ConnCountries] store failed:', err.message);
    return 0;
  }
}

/**
 * An account's usual connection country from its recorded games.
 * @returns {{country: string, share: number, games: number, countries: Record<string, number>}|null}
 */
export function usualCountry(summary) {
  if (!summary || summary.total < MIN_GAMES_FOR_USUAL) return null;
  let best = null, bestN = 0;
  for (const [country, n] of Object.entries(summary.counts)) {
    if (n > bestN) { best = country; bestN = n; }
  }
  return { country: best, share: bestN / summary.total, games: summary.total, countries: summary.counts };
}

/** Usual countries for a set of accounts: Map<tag, usualCountry result>. */
export function usualCountries(battleTags) {
  const out = new Map();
  for (const [tag, summary] of getGameCountries(battleTags)) {
    const usual = usualCountry(summary);
    if (usual) out.set(tag, usual);
  }
  return out;
}

// ── Backfill ─────────────────────────────────────────

const state = { running: false, total: 0, done: 0, requests: 0, rowsAdded: 0, stoppedReason: null, startedAt: null, finishedAt: null };

export function countryBackfillStatus() {
  return { ...state };
}

async function recentSeasons(n) {
  try {
    const res = await fetch(`${W3C_API}/ladder/seasons`, { signal: AbortSignal.timeout(10000) });
    if (res.ok) {
      const seasons = await res.json();
      const ids = (seasons || []).map(s => s.id).filter(id => Number.isFinite(id)).sort((a, b) => b - a);
      if (ids.length > 0) return ids.slice(0, n);
    }
  } catch { /* fall through */ }
  return [];
}

/**
 * Record connection-country history for accounts that do not have enough yet.
 * Each request returns up to 100 games with all eight players in each, so the
 * accounts run later in the list are often already covered and skipped.
 * One request every 1.5s; stops at the first 429 and can be restarted.
 */
export function startCountryBackfill(battleTags, { seasons: seasonCount = 2 } = {}) {
  if (state.running) return { started: false, status: countryBackfillStatus() };
  Object.assign(state, {
    running: true, total: battleTags.length, done: 0, requests: 0, rowsAdded: 0,
    stoppedReason: null, startedAt: new Date().toISOString(), finishedAt: null,
  });

  (async () => {
    try {
      const seasons = await recentSeasons(seasonCount);
      if (seasons.length === 0) { state.stoppedReason = 'could not read the season list'; return; }
      for (const tag of battleTags) {
        state.done++;
        // Re-read each time: earlier requests fill in other accounts too
        if (getTagsWithGameCountries(ENOUGH_GAMES).has(tag)) continue;
        for (const season of seasons) {
          const url = `${W3C_API}/matches/search?playerId=${encodeURIComponent(tag)}&offset=0&gameMode=4&season=${season}&gateway=20&pageSize=100`;
          let res;
          try {
            res = await fetch(url, { signal: AbortSignal.timeout(20000) });
          } catch {
            await sleep(BACKFILL_GAP_MS);
            continue;
          }
          state.requests++;
          if (res.status === 429) { state.stoppedReason = 'rate limited (429)'; return; }
          if (res.ok) {
            const data = await res.json().catch(() => ({}));
            state.rowsAdded += recordMatchCountries(data.matches);
          }
          await sleep(BACKFILL_GAP_MS);
        }
      }
      state.stoppedReason = 'finished';
    } catch (err) {
      state.stoppedReason = `error: ${err.message}`;
    } finally {
      state.running = false;
      state.finishedAt = new Date().toISOString();
      console.log(`[ConnCountries] backfill ${state.stoppedReason}: ${state.done}/${state.total} accounts, ${state.requests} requests, ${state.rowsAdded} rows`);
    }
  })();

  return { started: true, status: countryBackfillStatus() };
}
