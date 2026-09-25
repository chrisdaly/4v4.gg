import { useEffect, useState } from "react";
import { relayFetch } from "../relay";

/**
 * Today's numbers for the home page's "Who's here" card, from the relay's
 * event log (GET /api/chat/events?from&to): games started today, distinct
 * players in them, and the peak of the channel roster. The roster peak is
 * walked back from the current online count through today's join / leave
 * events, so people who were online since before midnight are counted.
 *
 * todayStats(events, onlineNow) -> { games, players, peakOnline }
 */

const REFRESH_MS = 5 * 60 * 1000;

export function todayStats(events, onlineNow = 0) {
  const players = new Set();
  let games = 0;
  const presence = [];
  for (const e of events || []) {
    if (e.type === "game_start") {
      games++;
      for (const p of e.payload?.players || []) if (p.battleTag) players.add(p.battleTag);
    } else if (e.type === "join" || e.type === "leave") {
      presence.push(e);
    }
  }
  // Walk back from now: before a join there was one fewer online, before a
  // leave one more. The peak is the largest count seen.
  let count = onlineNow;
  let peak = onlineNow;
  for (let i = presence.length - 1; i >= 0; i--) {
    count += presence[i].type === "join" ? -1 : 1;
    if (count > peak) peak = count;
  }
  return { games, players: players.size, peakOnline: Math.max(0, peak) };
}

const dayBounds = () => {
  const day = new Date().toISOString().slice(0, 10);
  return { from: `${day}T00:00:00Z`, to: `${day}T23:59:59.999Z` };
};

/** Today's events from the relay, refreshed every five minutes; null until loaded. */
export function useTodayEvents() {
  const [events, setEvents] = useState(null);
  useEffect(() => {
    let cancelled = false;
    let timer = null;
    const load = async () => {
      try {
        const { from, to } = dayBounds();
        const res = await relayFetch(`/api/chat/events?from=${from}&to=${to}`);
        if (!res.ok) throw new Error(`events ${res.status}`);
        const data = await res.json();
        if (!cancelled) setEvents(data.events || []);
      } catch {
        if (!cancelled) setEvents((prev) => prev || []);
      }
      if (!cancelled) timer = setTimeout(load, REFRESH_MS);
    };
    load();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);
  return events;
}
