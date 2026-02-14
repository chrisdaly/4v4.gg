import { getPlayerProfile } from "./api";

/**
 * Shared in-memory profile cache.
 * Used by DigestBanner and ChatContext to avoid redundant API calls.
 */
const cache = new Map();
const pending = new Map();

export function getCachedProfile(battleTag) {
  return cache.get(battleTag) || null;
}

export async function fetchAndCacheProfile(battleTag) {
  if (cache.has(battleTag)) return cache.get(battleTag);
  if (pending.has(battleTag)) return pending.get(battleTag);

  const promise = getPlayerProfile(battleTag).then((p) => {
    const data = { pic: p?.profilePicUrl || null, country: p?.country || null };
    cache.set(battleTag, data);
    pending.delete(battleTag);
    return data;
  }).catch(() => {
    const data = { pic: null, country: null };
    cache.set(battleTag, data);
    pending.delete(battleTag);
    return data;
  });

  pending.set(battleTag, promise);
  return promise;
}
