import { useState, useEffect, useMemo } from "react";

const IDLE_MS = 3 * 60 * 60 * 1000; // 3 hours
const TICK_MS = 60_000;

/**
 * Users who joined more than 3 hours ago and are not in a game. Owns its
 * own once-a-minute tick so only the roster re-renders for idle recompute.
 */
export default function useIdleTags(users, inGameTags) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), TICK_MS);
    return () => clearInterval(id);
  }, []);

  return useMemo(() => {
    const now = Date.now();
    const idle = new Set();
    for (const u of users) {
      if (u.joinedAt && now - u.joinedAt > IDLE_MS && !inGameTags?.has(u.battleTag)) {
        idle.add(u.battleTag);
      }
    }
    return idle;
    // tick is the clock that makes "now" move
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users, inGameTags, tick]);
}
