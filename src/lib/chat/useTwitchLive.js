import { useState, useEffect, useRef } from "react";
import { getPlayerProfile } from "../api";
import { getLiveStreamers } from "../twitchService";

const EMPTY = new Map();
const POLL_MS = 60_000;

// battleTag -> twitch url | null. Module-level so revisiting /chat does not
// refetch every online user's profile just to learn their twitch handle.
const twitchByTag = new Map();

function sameLive(a, b) {
  if (a.size !== b.size) return false;
  for (const [tag, info] of b) {
    const prev = a.get(tag);
    if (!prev) return false;
    if (prev.twitchName !== info.twitchName || prev.viewerCount !== info.viewerCount || prev.title !== info.title) {
      return false;
    }
  }
  return true;
}

/**
 * Which online users are live on Twitch. Checked once a minute and whenever
 * the roster size changes. Returns a stable Map reference while nothing
 * changed, so the page does not re-render on every poll.
 */
export default function useTwitchLive(onlineUsers) {
  const [liveStreamers, setLiveStreamers] = useState(EMPTY);
  const [tick, setTick] = useState(0);
  const usersRef = useRef(onlineUsers);

  useEffect(() => {
    usersRef.current = onlineUsers;
  }, [onlineUsers]);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), POLL_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const tags = usersRef.current.map((u) => u.battleTag).filter(Boolean);
    if (tags.length === 0) return;
    let cancelled = false;

    const lookups = tags
      .filter((tag) => !twitchByTag.has(tag))
      .map((tag) =>
        getPlayerProfile(tag).then((profile) => {
          twitchByTag.set(tag, profile?.twitch || null);
        })
      );

    Promise.all(lookups).then(() => {
      if (cancelled) return;
      const entries = tags
        .map((tag) => [tag, twitchByTag.get(tag)])
        .filter(([, tw]) => tw);
      if (entries.length === 0) return;
      getLiveStreamers(entries.map(([, tw]) => tw)).then((live) => {
        if (cancelled) return;
        const map = new Map();
        for (const [tag, tw] of entries) {
          const login = tw.replace("https://twitch.tv/", "").toLowerCase();
          const info = live.get(login);
          if (info) map.set(tag, { ...info, twitchName: login });
        }
        setLiveStreamers((prev) => (sameLive(prev, map) ? prev : map));
      });
    });

    return () => {
      cancelled = true;
    };
    // Deliberately keyed on roster size + tick, not the array itself - the
    // roster churns on every join/leave and this only needs a periodic check
  }, [onlineUsers.length, tick]);

  return liveStreamers;
}
