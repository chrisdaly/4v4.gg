import { useEffect, useRef, useState } from "react";

const DURATION_MS = 1400;
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

/**
 * Counts from 0 up to `target` over 1.4s (ease-out cubic) the first time a
 * real value arrives; later changes snap straight to the new value.
 */
export default function useCountUp(target, { duration = DURATION_MS } = {}) {
  const [value, setValue] = useState(0);
  const playedRef = useRef(false);
  const rafRef = useRef(null);
  useEffect(() => {
    if (target == null) return undefined;
    if (playedRef.current || target === 0 || typeof window === "undefined" || !window.requestAnimationFrame) {
      playedRef.current = playedRef.current || target > 0;
      setValue(target);
      return undefined;
    }
    playedRef.current = true;
    const start = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - start) / duration);
      setValue(Math.round(target * easeOutCubic(p)));
      if (p < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);
  return value;
}
