import { useMemo } from "react";

/**
 * Groups consecutive messages from the same user (within 2 min)
 * into message segments for Discord-style rendering.
 */
export function useMessageSegments(messages) {
  return useMemo(() => {
    const segments = [];
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      let isGroupStart = i === 0;
      if (!isGroupStart) {
        const prev = messages[i - 1];
        if (prev.battleTag !== msg.battleTag) {
          isGroupStart = true;
        } else {
          const prevTime = new Date(prev.sentAt).getTime();
          const currTime = new Date(msg.sentAt).getTime();
          if (currTime - prevTime > 2 * 60 * 1000) isGroupStart = true;
        }
      }
      if (isGroupStart) {
        segments.push({ start: msg, continuations: [] });
      } else if (segments.length > 0) {
        segments[segments.length - 1].continuations.push(msg);
      }
    }
    return segments;
  }, [messages]);
}

/**
 * Indexes bot responses by their triggering message ID.
 * Returns { botResponseMap, unmatchedBotResponses }.
 *
 * Single pass over the messages: every "!command" message is indexed by
 * (author, command word) and later messages overwrite earlier ones, so the
 * lookup lands on the newest matching message - the same message the old
 * tail-first scan found. The relay derives `command` from the first word
 * of the message (server/src/bot.js), so a first-word index is exact.
 */
export function indexBotResponses(botResponses, messages) {
  const map = new Map();
  if (botResponses.length === 0) {
    return { botResponseMap: map, unmatchedBotResponses: botResponses };
  }
  const latestCommand = new Map(); // `${tag}\u0000${command}` -> message
  for (const msg of messages) {
    const text = msg.text;
    if (!text || text[0] !== "!") continue;
    const end = text.search(/\s/);
    const command = (end === -1 ? text : text.slice(0, end)).toLowerCase();
    latestCommand.set(`${msg.battleTag}\u0000${command}`, msg);
  }
  const unmatched = [];
  for (const br of botResponses) {
    const msg = latestCommand.get(`${br.triggeredByTag}\u0000${br.command}`);
    if (msg) map.set(msg.id, br);
    else unmatched.push(br);
  }
  return { botResponseMap: map, unmatchedBotResponses: unmatched };
}

export function useBotResponseMap(botResponses, messages) {
  return useMemo(() => indexBotResponses(botResponses, messages), [botResponses, messages]);
}

/* ── Formatting helpers ─────────────────────── */

export function formatDateDivider(isoString) {
  const d = new Date(isoString);
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (isToday) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();
  if (isYesterday) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

export function getDateKey(isoString) {
  const d = new Date(isoString);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function formatTime(isoString) {
  const d = new Date(isoString);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function formatDateTime(isoString) {
  const d = new Date(isoString);
  const now = new Date();
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (isToday) return time;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();
  if (isYesterday) return `Yesterday ${time}`;
  return `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(2)} ${time}`;
}
