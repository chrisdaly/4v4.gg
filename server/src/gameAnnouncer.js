/**
 * Game Announcer — posts a plain-text ticker to the 4v4 chat room when a
 * game starts and finishes. Default OFF; toggle via /api/admin/announce.
 *
 *   🟢 GAME START · 1994 MMR · Ferocity · A, B, C, D vs E, F, G, H
 *   🏆 GAME OVER · 1994 MMR · Ferocity · A, B, C, D won (18min)
 *
 * Posts go to W3Champions' own "4 vs 4" room via the same bot connection
 * we use for chat capture — keep this conservative. The connection is our
 * capture lifeline; a mute/ban would cost us the chat feed.
 */

import config from './config.js';
import { sendMessage, getStatus } from './signalr.js';

const W3C_API = 'https://website-backend.w3champions.com/api';
const POLL_MS = 45 * 1000;
// Floor between any two posts, so a burst of simultaneous games can't stack
const MIN_GAP_MS = 20 * 1000;

let enabled = config.ANNOUNCE_ENABLED === true;
let timer = null;
let lastPostAt = 0;

// matchId → { mapName, avgMmr, players: [names...] } for games we've START'd
const liveGames = new Map();
// matchIds we've already announced a finish for (avoid double-posting)
const finishedSeen = new Set();
let firstPoll = true;

export function setAnnounceEnabled(on) {
  enabled = !!on;
  console.log(`[Announce] ${enabled ? 'Enabled' : 'Disabled'}`);
}
export function isAnnounceEnabled() {
  return enabled;
}

function cleanMap(name) {
  return (name || 'Unknown').replace(/^\(\d\)\s*/, '');
}

function avgMmr(match) {
  const mmrs = (match.teams || []).flatMap(
    (t) => (t.players || []).map((p) => p.oldMmr).filter((m) => m > 0)
  );
  return mmrs.length ? Math.round(mmrs.reduce((a, b) => a + b, 0) / mmrs.length) : null;
}

function teamNames(team) {
  return (team?.players || []).map((p) => p.name || p.battleTag?.split('#')[0]).join(', ');
}

async function post(text) {
  const now = Date.now();
  if (now - lastPostAt < MIN_GAP_MS) return; // throttle
  // Only post on a healthy connection. If the account is banned/auth-failed,
  // stay silent — never hammer a dead or muted connection.
  if (getStatus().state !== 'Connected') return;
  try {
    await sendMessage(text);
    lastPostAt = now;
    console.log(`[Announce] ${text}`);
  } catch (err) {
    console.warn(`[Announce] send failed: ${err.message}`);
  }
}

async function poll() {
  if (!enabled) return;
  let matches;
  try {
    const res = await fetch(
      `${W3C_API}/matches/ongoing?offset=0&pageSize=50&gameMode=4&gateway=20&map=Overall&sort=startTimeDescending`
    );
    if (!res.ok) return;
    matches = (await res.json()).matches || [];
  } catch {
    return;
  }

  const currentIds = new Set();
  for (const m of matches) {
    const id = m.id;
    if (!id) continue;
    currentIds.add(id);
    if (!liveGames.has(id) && !finishedSeen.has(id)) {
      const mmr = avgMmr(m);
      const map = cleanMap(m.mapName);
      const t1 = teamNames(m.teams?.[0]);
      const t2 = teamNames(m.teams?.[1]);
      liveGames.set(id, { mapName: map, avgMmr: mmr, t1, t2 });
      // Don't announce starts for games already running when the relay
      // (re)started — only genuinely new ones.
      if (!firstPoll) {
        await post(`🟢 GAME START · ${mmr ?? '?'} MMR · ${map} · ${t1} vs ${t2}`);
      }
    }
  }

  // Games that left the ongoing list since last poll → fetch result, post finish
  for (const [id, info] of liveGames) {
    if (currentIds.has(id)) continue;
    liveGames.delete(id);
    if (finishedSeen.has(id)) continue;
    finishedSeen.add(id);
    if (finishedSeen.size > 500) finishedSeen.delete(finishedSeen.values().next().value);
    if (firstPoll) continue; // skip finishes for pre-existing games on boot
    try {
      const res = await fetch(`${W3C_API}/matches/${encodeURIComponent(id)}`);
      if (!res.ok) continue;
      const detail = await res.json();
      const match = detail?.match;
      if (!match) continue;
      const winIdx = (match.teams || []).findIndex((t) => t.players?.some((p) => p.won));
      if (winIdx < 0) continue;
      const winners = teamNames(match.teams[winIdx]);
      const mins = match.durationInSeconds ? Math.round(match.durationInSeconds / 60) : null;
      const dur = mins != null ? ` (${mins}min)` : '';
      await post(`🏆 GAME OVER · ${info.avgMmr ?? '?'} MMR · ${info.mapName} · ${winners} won${dur}`);
    } catch {
      // skip
    }
  }

  firstPoll = false;
}

export function startGameAnnouncer() {
  // Stagger after startup so the chat connection is up first
  setTimeout(() => {
    poll();
    timer = setInterval(poll, POLL_MS);
  }, 60 * 1000);
  console.log(`[Announce] Scheduled (enabled: ${enabled})`);
}
