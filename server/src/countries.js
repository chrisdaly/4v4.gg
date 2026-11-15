/**
 * Player countries, cached in SQLite. W3Champions holds the flag each player
 * set on their profile; the batch endpoint returns 40 profiles per request.
 */

import { getPlayerCountries, upsertPlayerCountries } from './db.js';

const API_BASE = 'https://website-backend.w3champions.com/api';
const CHUNK = 40;
const GAP_MS = 1000; // one request a second: the whole pool is about 60 requests

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function fetchChunk(tags, timeoutMs) {
  const url = `${API_BASE}/personal-settings/${tags.map(encodeURIComponent).join(',')}/many`;
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`W3C profiles ${res.status}`);
  const profiles = await res.json();
  const byTag = new Map(profiles.map(p => [String(p.id || '').toLowerCase(), p]));
  // A tag the API did not return is stored as unknown, so it is not asked for again every lookup
  return tags.map(tag => ({ battleTag: tag, country: byTag.get(tag.toLowerCase())?.location || null }));
}

/**
 * Countries for a handful of accounts, fetching any that are not stored.
 * Meant for one lookup (the query and its top matches): at most one request.
 * A failed fetch is not an error: the caller gets what is stored.
 * @returns {Promise<Map<string, string|null>>}
 */
export async function ensureCountries(battleTags, timeoutMs = 4000) {
  const known = getPlayerCountries(battleTags);
  const missing = battleTags.filter(t => !known.has(t)).slice(0, CHUNK);
  if (missing.length > 0) {
    try {
      const rows = await fetchChunk(missing, timeoutMs);
      upsertPlayerCountries(rows);
      for (const { battleTag, country } of rows) known.set(battleTag, country);
    } catch (err) {
      console.warn('[Countries] lookup failed:', err.message);
    }
  }
  return known;
}

let filling = false;

/**
 * Fill in countries for every account in the pool, in the background. How rare
 * a country is can only be judged once most of the pool is known. Safe to call
 * on every lookup: one fill runs at a time and it only fetches what is missing.
 */
export function fillCountriesInBackground(battleTags) {
  if (filling) return;
  const known = getPlayerCountries(battleTags);
  const missing = battleTags.filter(t => !known.has(t));
  if (missing.length === 0) return;
  filling = true;
  (async () => {
    let stored = 0;
    try {
      for (let i = 0; i < missing.length; i += CHUNK) {
        const rows = await fetchChunk(missing.slice(i, i + CHUNK), 15000);
        upsertPlayerCountries(rows);
        stored += rows.length;
        await sleep(GAP_MS);
      }
      console.log(`[Countries] stored ${stored} player countries`);
    } catch (err) {
      // Stops at the first failure (a 429 above all) and resumes on a later lookup
      console.warn(`[Countries] background fill stopped after ${stored}: ${err.message}`);
    } finally {
      filling = false;
    }
  })();
}
