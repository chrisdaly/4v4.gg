import config from './config.js';
import { getStreamers, upsertStreamer, insertClips, getClipFetchLog, insertClipFetchLog } from './db.js';

const TWITCH_AUTH_URL = 'https://id.twitch.tv/oauth2/token';
const TWITCH_API = 'https://api.twitch.tv/helix';
const WC3_GAME_ID = '12924'; // Warcraft III on Twitch

// Known WC3 streamers — seeded on first run if table is empty
const SEED_STREAMERS = [
  { twitch_login: 'back2warcraft', display_name: 'Back2Warcraft' },
  { twitch_login: 'grubby', display_name: 'Grubby' },
  { twitch_login: 'followgrubby', display_name: 'FollowGrubby' },
  { twitch_login: 'tod', display_name: 'ToD' },
  { twitch_login: 'starbuck', display_name: 'Starbuck' },
  { twitch_login: 'yesitshappy', display_name: 'Happy' },
  { twitch_login: 'foggywc3', display_name: 'Foggy' },
  { twitch_login: 'hitmanstarcraft2', display_name: 'Hitman' },
  { twitch_login: 'sheik242', display_name: 'Sheik' },
  { twitch_login: 'ixixlord', display_name: 'XlorD' },
  { twitch_login: 'cashwc3', display_name: 'Cash' },
  { twitch_login: 'ena1337', display_name: 'Ena1337' },
  { twitch_login: 'soonik', display_name: 'Sonik' },
  { twitch_login: 'lookhawk', display_name: 'Hawk' },
  { twitch_login: 'eer0', display_name: 'Eer0' },
];

// ── Twitch OAuth ────────────────────────────────

let accessToken = null;
let tokenExpiresAt = 0;

async function getAccessToken() {
  if (accessToken && Date.now() < tokenExpiresAt - 60_000) {
    return accessToken;
  }

  if (!config.TWITCH_CLIENT_ID || !config.TWITCH_CLIENT_SECRET) {
    throw new Error('TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET are required');
  }

  const res = await fetch(TWITCH_AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.TWITCH_CLIENT_ID,
      client_secret: config.TWITCH_CLIENT_SECRET,
      grant_type: 'client_credentials',
    }),
  });

  if (!res.ok) {
    throw new Error(`Twitch auth failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  accessToken = data.access_token;
  tokenExpiresAt = Date.now() + data.expires_in * 1000;
  console.log('[Clips] Twitch token acquired');
  return accessToken;
}

async function twitchGet(path) {
  let token = await getAccessToken();
  let res = await fetch(`${TWITCH_API}${path}`, {
    headers: {
      'Client-ID': config.TWITCH_CLIENT_ID,
      'Authorization': `Bearer ${token}`,
    },
  });

  // Retry once on 401 (token expired)
  if (res.status === 401) {
    accessToken = null;
    token = await getAccessToken();
    res = await fetch(`${TWITCH_API}${path}`, {
      headers: {
        'Client-ID': config.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  if (!res.ok) {
    throw new Error(`Twitch API ${res.status}: ${path}`);
  }
  return res.json();
}

// ── Streamer management ─────────────────────────

async function seedStreamers() {
  const existing = getStreamers(false);
  if (existing.length > 0) return;

  console.log(`[Clips] Seeding ${SEED_STREAMERS.length} streamers`);
  for (const s of SEED_STREAMERS) {
    upsertStreamer(s);
  }
}

async function resolveTwitchIds() {
  const streamers = getStreamers();
  const needIds = streamers.filter(s => !s.twitch_id);
  if (needIds.length === 0) return;

  // Twitch /users accepts up to 100 logins at once
  const logins = needIds.map(s => s.twitch_login);
  const batches = [];
  for (let i = 0; i < logins.length; i += 100) {
    batches.push(logins.slice(i, i + 100));
  }

  for (const batch of batches) {
    try {
      const qs = batch.map(l => `login=${encodeURIComponent(l)}`).join('&');
      const data = await twitchGet(`/users?${qs}`);
      for (const user of data.data || []) {
        upsertStreamer({
          twitch_login: user.login,
          twitch_id: user.id,
          display_name: user.display_name,
        });
      }
    } catch (err) {
      console.error('[Clips] Failed to resolve twitch IDs:', err.message);
    }
  }
}

// ── Clip fetching ───────────────────────────────

async function fetchClipsForStreamer(streamer, startedAt, endedAt) {
  if (!streamer.twitch_id) return [];

  const clips = [];
  let cursor = null;

  do {
    let path = `/clips?broadcaster_id=${streamer.twitch_id}&started_at=${startedAt}&ended_at=${endedAt}&first=50`;
    if (cursor) path += `&after=${cursor}`;

    const data = await twitchGet(path);
    for (const c of data.data || []) {
      // Only keep Warcraft III clips
      if (c.game_id !== WC3_GAME_ID) continue;
      clips.push({
        clip_id: c.id,
        twitch_login: streamer.twitch_login,
        title: c.title,
        url: c.url,
        embed_url: c.embed_url,
        thumbnail_url: c.thumbnail_url,
        creator_name: c.creator_name || '',
        view_count: c.view_count || 0,
        duration: c.duration || 0,
        created_at: c.created_at,
        game_id: c.game_id || '',
      });
    }
    cursor = data.pagination?.cursor || null;
  } while (cursor);

  return clips;
}

export async function runClipFetch() {
  if (!config.TWITCH_CLIENT_ID || !config.TWITCH_CLIENT_SECRET) {
    console.log('[Clips] Skipping fetch — no Twitch credentials configured');
    return { fetched: 0, inserted: 0 };
  }

  await seedStreamers();
  await resolveTwitchIds();

  const streamers = getStreamers();
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  // Fetch clips from last 48h to catch late-view clips
  const startedAt = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
  const endedAt = now.toISOString();

  let totalFetched = 0;
  let totalInserted = 0;

  for (const streamer of streamers) {
    // Skip if already fetched today for this streamer
    const log = getClipFetchLog(streamer.twitch_login, todayStr);
    if (log) continue;

    try {
      const clips = await fetchClipsForStreamer(streamer, startedAt, endedAt);
      const inserted = clips.length > 0 ? insertClips(clips) : 0;
      insertClipFetchLog(streamer.twitch_login, todayStr, clips.length);
      totalFetched += clips.length;
      totalInserted += inserted;

      if (clips.length > 0) {
        console.log(`[Clips] ${streamer.display_name}: ${clips.length} clips fetched, ${inserted} new`);
      }
    } catch (err) {
      console.error(`[Clips] Error fetching ${streamer.twitch_login}:`, err.message);
    }
  }

  console.log(`[Clips] Fetch complete: ${totalFetched} clips fetched, ${totalInserted} new`);
  return { fetched: totalFetched, inserted: totalInserted };
}

// ── Scheduler ───────────────────────────────────

let schedulerTimer = null;

export function startClipScheduler() {
  if (!config.TWITCH_CLIENT_ID || !config.TWITCH_CLIENT_SECRET) {
    console.log('[Clips] Scheduler disabled — no Twitch credentials');
    return;
  }

  console.log('[Clips] Clip scheduler started');

  // Initial fetch 60s after startup
  setTimeout(() => {
    runClipFetch().catch(err => console.error('[Clips] Initial fetch error:', err.message));
  }, 60_000);

  // Check every 60s, run daily at 02:00 UTC
  let lastRunDate = null;
  schedulerTimer = setInterval(() => {
    const now = new Date();
    const hour = now.getUTCHours();
    const todayStr = now.toISOString().slice(0, 10);

    if (hour === 2 && lastRunDate !== todayStr) {
      lastRunDate = todayStr;
      runClipFetch().catch(err => console.error('[Clips] Scheduled fetch error:', err.message));
    }
  }, 60_000);
}
