import React, { useState, useCallback } from "react";

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

export function useWatchList() {
  const [watchList, setWatchList] = useState(readWatchList);

  const toggleWatch = useCallback((battleTag) => {
    if (!battleTag) return;
    const key = battleTag.toLowerCase();
    setWatchList((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      try {
        localStorage.setItem(WATCH_KEY, JSON.stringify([...next]));
      } catch {
        // storage full/unavailable — watch list just won't persist
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

/* ── Notification blip (WebAudio, no asset needed) ─── */

let audioCtx = null;
let lastPing = 0;

export function playPing() {
  const now = Date.now();
  if (now - lastPing < 5000) return; // throttle
  lastPing = now;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
  } catch {
    // audio blocked until user interaction — fine, stay silent
  }
}
