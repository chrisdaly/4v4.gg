import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { getOngoingMatches } from "./api";

const EMPTY_MATCHES = [];

/**
 * Poll the W3Champions ongoing-matches endpoint.
 *
 * - Polls every `intervalMs` (default 30s), pausing while the tab is hidden
 * - Drops stale responses (request-id guard) and stops updating after unmount
 *
 * Returns:
 *   data    – raw API response ({ matches, ... }) or null before first load
 *   matches – data.matches (stable empty array fallback)
 *   error   – last fetch error, cleared on success
 *   refresh – manually trigger a fetch
 */
export default function useOngoingMatches(intervalMs = 30000) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const reqIdRef = useRef(0);

  const refresh = useCallback(async () => {
    const id = ++reqIdRef.current;
    try {
      const result = await getOngoingMatches();
      if (reqIdRef.current !== id) return;
      setData(result);
      setError(null);
    } catch (e) {
      if (reqIdRef.current !== id) return;
      setError(e);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(() => {
      if (!document.hidden) refresh();
    }, intervalMs);
    const onVisibility = () => {
      if (!document.hidden) refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      reqIdRef.current++;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [intervalMs, refresh]);

  const matches = useMemo(() => data?.matches || EMPTY_MATCHES, [data]);

  return { data, matches, error, refresh };
}
