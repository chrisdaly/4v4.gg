import { relayFetch } from "../relay";

/**
 * Is there a daily digest for today? One cheap public call to
 * /api/admin/stats/today (the same one /news uses), cached in module scope
 * for 10 minutes so every ChatPanel mount does not re-ask.
 *
 * fetchTodayDigest() -> Promise<{ date, href } | null>
 *   href is the /news route for that day (News.jsx reads ?day=YYYY-MM-DD)
 */

const TTL_MS = 10 * 60 * 1000;
let cached = { value: undefined, expires: 0, promise: null };

export function digestHref(date) {
  return `/news?day=${date}`;
}

export function fetchTodayDigest() {
  const now = Date.now();
  if (cached.value !== undefined && cached.expires > now) return Promise.resolve(cached.value);
  if (cached.promise) return cached.promise;
  cached.promise = relayFetch("/api/admin/stats/today", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      const ok = data && data.digest && /^\d{4}-\d{2}-\d{2}$/.test(String(data.date || ""));
      return ok ? { date: data.date, href: digestHref(data.date) } : null;
    })
    .catch(() => null)
    .then((value) => {
      cached = { value, expires: Date.now() + TTL_MS, promise: null };
      return value;
    });
  return cached.promise;
}

export function resetTodayDigestCache() {
  cached = { value: undefined, expires: 0, promise: null };
}
