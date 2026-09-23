import React, { useState, useCallback, useRef } from "react";
import { requestNotifyPermission } from "./chat/notify";

/* ── Watch list (starred players, persisted) ───────── */

const WATCH_KEY = "chat:watchList";

function readWatchList() {
  try {
    const raw = localStorage.getItem(WATCH_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr.map((t) => t.toLowerCase()) : []);
  } catch {
    return new Set();
  }
}

/**
 * Starred players. Starring one is the only place the page asks for browser
 * Notification permission (never on load): watched players' lines notify
 * while the tab is hidden. A denied permission is left alone.
 */
export function useWatchList() {
  const [watchList, setWatchList] = useState(readWatchList);
  const listRef = useRef(watchList);
  listRef.current = watchList;

  const toggleWatch = useCallback((battleTag) => {
    if (!battleTag) return;
    const key = battleTag.toLowerCase();
    // no-op once the permission is granted or denied (notify.js)
    if (!listRef.current.has(key)) requestNotifyPermission();
    setWatchList((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      try {
        localStorage.setItem(WATCH_KEY, JSON.stringify([...next]));
      } catch {
        // storage full/unavailable - watch list just won't persist
      }
      return next;
    });
  }, []);

  return { watchList, toggleWatch };
}

/* ── Linkify message text ──────────────────────────── */

const URL_RE = /(https?:\/\/[^\s<>"']+)/g;

export function linkifyMessage(text) {
  if (!text || !text.includes("http")) return text;
  const parts = text.split(URL_RE);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: "var(--cyan)", wordBreak: "break-all" }}
      >
        {part}
      </a>
    ) : (
      part
    )
  );
}
