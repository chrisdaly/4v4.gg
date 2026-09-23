import { useEffect, useState } from "react";
import { relayFetch } from "../relay";

const REFRESH_MS = 5 * 60 * 1000;

/**
 * GET /api/chat/stats while `open`: fetched on open and every 5 minutes.
 * Returns { stats, loading, error }. `stats` keeps the last good payload
 * across refreshes (and across close/open) so the strip never flashes.
 */
export default function useChatStats(open) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let timer = null;
    const load = async () => {
      setLoading(true);
      try {
        const res = await relayFetch("/api/chat/stats");
        if (!res.ok) throw new Error(`stats ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        setStats(data);
        setError(false);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
      if (!cancelled) timer = setTimeout(load, REFRESH_MS);
    };
    load();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open]);

  return { stats, loading, error };
}

// Relay hours are UTC; shift a 24-slot histogram into the viewer's local
// hours. Half-hour zones round to the nearest hour.
export function toLocalHours(rows) {
  const out = new Array(24).fill(0);
  if (!Array.isArray(rows)) return out;
  const shift = Math.round(-new Date().getTimezoneOffset() / 60);
  for (const r of rows) {
    const h = Number(r?.hour);
    if (!Number.isInteger(h) || h < 0 || h > 23) continue;
    out[(((h + shift) % 24) + 24) % 24] += Number(r.count) || 0;
  }
  return out;
}

export function busiestHour(localHours) {
  let best = -1;
  let bestCount = 0;
  localHours.forEach((c, h) => {
    if (c > bestCount) {
      bestCount = c;
      best = h;
    }
  });
  return best === -1 ? null : { hour: best, count: bestCount };
}

export function formatHour(h) {
  return `${String(h).padStart(2, "0")}:00`;
}
