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
      const tag = msg.battle_tag || msg.battleTag;
      let isGroupStart = i === 0;
      if (!isGroupStart) {
        const prev = messages[i - 1];
        const prevTag = prev.battle_tag || prev.battleTag;
        if (prevTag !== tag) {
          isGroupStart = true;
        } else {
          const prevTime = new Date(prev.sent_at || prev.sentAt).getTime();
          const currTime = new Date(msg.sent_at || msg.sentAt).getTime();
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
 */
export function useBotResponseMap(botResponses, messages) {
  return useMemo(() => {
    const map = new Map();
    const matched = new Set();
    for (const br of botResponses) {
      for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i];
        const tag = msg.battle_tag || msg.battleTag;
        if (
          tag === br.triggeredByTag &&
          msg.message.toLowerCase().startsWith(br.command)
        ) {
          map.set(msg.id, br);
          matched.add(br);
          break;
        }
      }
    }
    const unmatched = botResponses.filter((br) => !matched.has(br));
    return { botResponseMap: map, unmatchedBotResponses: unmatched };
  }, [botResponses, messages]);
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
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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
