import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Message-id based unread count: everything newer than the last message
 * that was on screen while `viewing` was true. Shared by the mobile Chat
 * tab badge (viewing = chat tab active) and the browser tab title/favicon
 * badge (viewing = document visible).
 */
export function useUnreadCount(messages, viewing) {
  const lastSeenIdRef = useRef(null);
  const newestId = messages.length > 0 ? messages[messages.length - 1].id : null;
  useEffect(() => {
    if (viewing) lastSeenIdRef.current = newestId;
  }, [viewing, newestId]);
  return useMemo(() => {
    if (viewing) return 0;
    const lastSeen = lastSeenIdRef.current;
    let count = 0;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].id === lastSeen) break;
      if (messages[i].kind !== "system") count++;
    }
    return count;
  }, [messages, viewing]);
}

/** Whether the document is visible (Page Visibility API), live. */
export function useDocumentVisible() {
  const [visible, setVisible] = useState(() => (typeof document === "undefined" ? true : !document.hidden));
  useEffect(() => {
    const onVisibility = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);
  return visible;
}
