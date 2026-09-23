import { useEffect, useRef, useSyncExternalStore } from "react";
import { getPlayerProfilesBatch, getPlayerStats, getPlayerSessionLight } from "./api";

/**
 * Player metadata for chat surfaces: avatar/country, 4v4 stats, session form.
 *
 * Module-level store, so the Maps survive navigating away from /chat and
 * back. Profile lookups are batched through the /many endpoint (flushed
 * every ~100ms or 20 tags); stats and session are fetched per tag as
 * before. The api layer's own caches decide whether a request hits the
 * network, so revisiting the page behaves like it did with per-page state.
 *
 *   usePlayerMeta(tags) -> { avatars, stats, sessions }   (three Maps)
 */

const BATCH_MAX = 20;
const BATCH_DELAY_MS = 100;

const profiles = new Map(); // battleTag -> { profilePicUrl, country }
const playerStats = new Map(); // battleTag -> { mmr, wins, losses, rank, race }
const sessionForms = new Map(); // battleTag -> boolean[] (recent form)

const pendingProfiles = new Set(); // queued or in flight for /many
const sessionInflight = new Set();
let batchQueue = [];
let flushTimer = null;

// Snapshot handed to React: rebuilt (copy-on-write) at most once per task
let snapshot = { avatars: new Map(), stats: new Map(), sessions: new Map() };
const listeners = new Set();
let commitTimer = null;

function commit() {
  commitTimer = null;
  snapshot = {
    avatars: new Map(profiles),
    stats: new Map(playerStats),
    sessions: new Map(sessionForms),
  };
  for (const l of listeners) l();
}

function scheduleCommit() {
  if (commitTimer) return;
  commitTimer = setTimeout(commit, 0);
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return snapshot;
}

function flushProfiles() {
  clearTimeout(flushTimer);
  flushTimer = null;
  const batch = batchQueue;
  batchQueue = [];
  if (batch.length === 0) return;
  getPlayerProfilesBatch(batch)
    .then((results) => {
      for (const [tag, profile] of results) profiles.set(tag, profile);
      scheduleCommit();
    })
    .catch(() => {})
    .finally(() => {
      for (const tag of batch) pendingProfiles.delete(tag);
    });
}

function queueProfile(tag) {
  if (pendingProfiles.has(tag)) return;
  pendingProfiles.add(tag);
  batchQueue.push(tag);
  if (batchQueue.length >= BATCH_MAX) flushProfiles();
  else if (!flushTimer) flushTimer = setTimeout(flushProfiles, BATCH_DELAY_MS);
}

function fetchStats(tag) {
  getPlayerStats(tag).then((s) => {
    if (s) {
      playerStats.set(tag, s);
      scheduleCommit();
    }
  });
}

function fetchSession(tag) {
  if (sessionInflight.has(tag)) return;
  sessionInflight.add(tag);
  getPlayerSessionLight(tag)
    .then((data) => {
      if (data?.session?.form) {
        sessionForms.set(tag, data.session.form);
        scheduleCommit();
      }
    })
    .finally(() => sessionInflight.delete(tag));
}

/** Kick off all three lookups for a tag (deduped against in-flight work). */
export function requestPlayerMeta(tag) {
  if (!tag) return;
  queueProfile(tag);
  fetchStats(tag);
  fetchSession(tag);
}

/** Re-fetch just the session form (used when a player leaves a game). */
export function refreshPlayerSession(tag) {
  if (tag) fetchSession(tag);
}

export default function usePlayerMeta(tags) {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  // Once per hook instance per tag, like the old per-page fetchedRef
  const requestedRef = useRef(new Set());

  useEffect(() => {
    if (!tags) return;
    for (const tag of tags) {
      if (requestedRef.current.has(tag)) continue;
      requestedRef.current.add(tag);
      requestPlayerMeta(tag);
    }
  }, [tags]);

  return snap;
}
