import { useEffect, useState } from "react";

/** The /chat mobile breakpoint: the chat alone under a top bar at and below this width. */
export const CHAT_MOBILE_PX = 768;

const query = () => (typeof window !== "undefined" && window.matchMedia ? window.matchMedia(`(max-width: ${CHAT_MOBILE_PX}px)`) : null);

/** Whether the viewport is at or below the /chat mobile breakpoint, live. */
export default function useIsMobile() {
  const [mobile, setMobile] = useState(() => Boolean(query()?.matches));
  useEffect(() => {
    const mq = query();
    if (!mq) return undefined;
    const onChange = (e) => setMobile(e.matches);
    setMobile(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return mobile;
}
