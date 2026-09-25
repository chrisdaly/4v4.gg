import { useEffect, useState } from "react";
import { relayFetch } from "../relay";

/**
 * The daily digests inside a week, for the issue's Day by day section:
 * GET /api/admin/digests/range?from&to, falling back to the recent list
 * when the relay does not have the range route yet. null while loading.
 */
export default function useWeekDailies(weekStart, weekEnd) {
  const [dailies, setDailies] = useState(null);
  useEffect(() => {
    if (!weekStart) return undefined;
    let cancelled = false;
    (async () => {
      const inRange = (d) => d?.date >= weekStart && d.date <= (weekEnd || weekStart);
      try {
        const res = await relayFetch(`/api/admin/digests/range?from=${weekStart}&to=${weekEnd || weekStart}`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && Array.isArray(data)) {
            setDailies(data.filter(inRange));
            return;
          }
        }
      } catch {
        // fall through to the recent list
      }
      try {
        const res = await relayFetch("/api/admin/digests");
        const data = res.ok ? await res.json() : [];
        if (!cancelled) setDailies(Array.isArray(data) ? data.filter(inRange) : []);
      } catch {
        if (!cancelled) setDailies([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [weekStart, weekEnd]);
  return dailies;
}
