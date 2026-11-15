import { useState, useEffect, useRef, useCallback } from "react";
import { RELAY_URL, relayFetch } from "./relay";
import { normalizeMessage, normalizeMessages } from "./chat/normalize";
import { isTrimPaused } from "./chat/trimGate";

export const MAX_MESSAGES = 500;
// The live cap trims with hysteresis: the list may grow this far past the
// cap before one trim drops it back to MAX_MESSAGES. Trimming on every
// append would shrink the head row (usually the first author group) on
// each message, and a viewport anchored above the tail would jump by that
// amount every time.
export const TRIM_HYSTERESIS = 100;
// Cap how far back scrollback can page in - keeps the DOM and memory bounded.
// ~2000 messages is days of history; beyond that, use search instead.
const MAX_HISTORY_EXTRA = 1500;
// Messages per page of older history. The relay caps a request at 200, and a
// prepend costs the reader nothing now that the viewport is held against a
// real row (lib/chat/useStreamScroll.js) - so the only thing page size still
// buys is round trips, and fewer is better. The initial window stays at 100:
// that one is first paint.
const HISTORY_PAGE = 200;
const BACKOFF_DELAYS = [1000, 2000, 4000, 8000, 16000, 30000];
// Relay-side SignalR states (server/src/signalr.js) other than Connected
const RELAY_STATES = new Set(["auth_failed", "banned", "no_token", "error", "Disconnected", "stopped"]);

/**
 * Transport layer for the chat relay: REST history + SSE live stream.
 * Every message crosses the wire boundary through normalizeMessage, so
 * consumers only ever see the camelCase feed shape (see chat/normalize.js).
 */
/**
 * The `before` cursor that loads the archive window ending at a permalink's
 * &at= (a received_at, UTC). +1s because `before` is exclusive at second
 * precision. Null when there is no usable time.
 */
export function permalinkBefore(at) {
  if (!at) return null;
  const d = new Date(`${String(at).replace(" ", "T")}${/Z|[+-]\d\d:?\d\d$/.test(at) ? "" : "Z"}`);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getTime() + 1000).toISOString().slice(0, 19).replace("T", " ");
}

/**
 * @param {object} [opts]
 * @param {string} [opts.initialBefore] open on the archive window ending at
 *   this cursor instead of the live tail. A permalink would otherwise paint
 *   the newest messages first and swap them for the linked ones a moment
 *   later.
 */
export default function useChatStream({ initialBefore = null } = {}) {
  // Read once: only the first connect opens on it
  const initialBeforeRef = useRef(initialBefore);
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState("connecting");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [botResponses, setBotResponses] = useState([]);
  const [translations, setTranslations] = useState(new Map());
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  // Which window of the archive is loaded: the live tail (default) or a
  // window ending at some past time (jump to date). Live SSE messages
  // append once the window has caught up to now. windowId changes whenever the window is replaced
  // wholesale so the list can remount instead of diffing a prepend.
  const [windowMode, setWindowMode] = useState(initialBefore ? "archive" : "live");
  // Only an archive window has anything newer to fetch; live is already there
  const [hasNewer, setHasNewerState] = useState(Boolean(initialBefore));
  // Mirrored in a ref so the live stream can read it without re-binding
  const hasNewerRef = useRef(Boolean(initialBefore));
  // Live lines that arrived while an archive window was holding them back,
  // so "back to live" can say how far chat has moved on
  const heldIdsRef = useRef(new Set());
  const [heldLive, setHeldLive] = useState(0);
  const setHasNewer = useCallback((value) => {
    hasNewerRef.current = value;
    setHasNewerState(value);
    // caught up (or a fresh window): whatever was held is loaded or stale
    if (heldIdsRef.current.size > 0) {
      heldIdsRef.current = new Set();
      setHeldLive(0);
    }
  }, []);
  const loadingNewerRef = useRef(false);
  const newestCursorRef = useRef(null);
  const [windowId, setWindowId] = useState(0);
  const eventSourceRef = useRef(null);
  const retriesRef = useRef(0);
  const reconnectTimerRef = useRef(null);
  const loadingOlderRef = useRef(false);
  // Messages the user explicitly paged in - exempt from the live cap so a
  // new message arriving doesn't trim away history they scrolled back to
  const historyExtraRef = useRef(0);
  const messagesRef = useRef([]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Append already-normalized messages, deduped by id, trimmed to the cap.
  // The trim waits until the list is TRIM_HYSTERESIS past the cap and is
  // skipped entirely while the reader is scrolled up (chat/trimGate.js);
  // it catches up on the first append after the gate reopens.
  const addMessages = useCallback((newMsgs) => {
    // An archive window that has not paged forward to now ends in the past.
    // A live line appended to it would sit straight after a message from
    // hours ago, and would move the forward cursor to now, so the lines in
    // between could never be fetched. Paging forward reaches it instead.
    if (hasNewerRef.current) return;
    setMessages((prev) => {
      const ids = new Set(prev.map((m) => m.id));
      const unique = newMsgs.filter((m) => !ids.has(m.id));
      if (unique.length === 0) return prev;
      const combined = [...prev, ...unique];
      const cap = MAX_MESSAGES + historyExtraRef.current;
      if (combined.length <= cap + TRIM_HYSTERESIS || isTrimPaused()) return combined;
      return combined.slice(combined.length - cap);
    });
  }, []);

  // Page in older history (cursor on receivedAt of the oldest loaded message).
  // Returns { added, oldestCursor } so callers can page toward a target time.
  const loadOlder = useCallback(async () => {
    if (loadingOlderRef.current) return { added: 0, oldestCursor: null };
    loadingOlderRef.current = true;
    try {
      const oldest = messagesRef.current[0];
      const cursor = oldest?.receivedAt || oldest?.sentAt;
      if (!cursor) return { added: 0, oldestCursor: null };

      const res = await relayFetch(
        `/api/chat/messages?limit=${HISTORY_PAGE}&before=${encodeURIComponent(cursor)}`
      );
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        setHasMoreHistory(false);
        return { added: 0, oldestCursor: cursor };
      }
      const older = normalizeMessages(data.reverse());
      let added = 0;
      setMessages((prev) => {
        const ids = new Set(prev.map((m) => m.id));
        const unique = older.filter((m) => !ids.has(m.id));
        added = unique.length;
        if (unique.length === 0) return prev;
        historyExtraRef.current += unique.length;
        return [...unique, ...prev];
      });
      if (data.length < HISTORY_PAGE || historyExtraRef.current >= MAX_HISTORY_EXTRA) {
        setHasMoreHistory(false);
      }
      return { added, oldestCursor: older[0]?.receivedAt || cursor };
    } catch {
      return { added: 0, oldestCursor: null };
    } finally {
      loadingOlderRef.current = false;
    }
  }, []);

  // Replace the loaded window with the newest `limit` messages received
  // before `before` (sqlite UTC "YYYY-MM-DD HH:MM:SS", or omitted for the
  // live tail). Resolves to the normalized messages that were loaded.
  const loadWindow = useCallback(async (before = null) => {
    const query = before ? `&before=${encodeURIComponent(before)}` : "";
    const res = await relayFetch(`/api/chat/messages?limit=100${query}`);
    const data = await res.json();
    const loaded = Array.isArray(data) ? normalizeMessages(data.reverse()) : [];
    historyExtraRef.current = 0;
    // Set here, not only in the effect below: a child's effect can ask for
    // the next page before this hook's own effects have run
    newestCursorRef.current = loaded[loaded.length - 1]?.receivedAt || null;
    setHasMoreHistory(loaded.length >= 100);
    setHasNewer(Boolean(before));
    setWindowMode(before ? "archive" : "live");
    setWindowId((id) => id + 1);
    setMessages(loaded);
    return loaded;
  }, [setHasNewer]);

  /**
   * Page forward out of an archive window. Without this you can scroll back
   * from a permalink but never forward, so landing on a message from last
   * Sunday traps you at that moment.
   *
   * Live mode needs nothing: the stream already appends.
   */
  const loadNewer = useCallback(async () => {
    if (loadingNewerRef.current) return { added: 0 };
    loadingNewerRef.current = true;
    try {
      const newest = newestCursorRef.current;
      if (!newest) return { added: 0 };
      const res = await relayFetch(
        `/api/chat/messages?limit=100&after=${encodeURIComponent(newest)}`
      );
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        setHasNewer(false);
        return { added: 0 };
      }
      const newer = normalizeMessages(data.reverse());
      let added = 0;
      setMessages((prev) => {
        const ids = new Set(prev.map((m) => m.id));
        const unique = newer.filter((m) => !ids.has(m.id));
        added = unique.length;
        return unique.length === 0 ? prev : [...prev, ...unique];
      });
      if (data.length < 100) setHasNewer(false);
      return { added };
    } catch {
      return { added: 0 };
    } finally {
      loadingNewerRef.current = false;
    }
  }, [setHasNewer]);

  const loadLatest = useCallback(() => loadWindow(null), [loadWindow]);

  // Where the loaded window currently ends, which is what paging forward
  // reads from. Tracked off the messages themselves so it stays right
  // whether they arrived from a window load, a page or the live stream.
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last?.receivedAt) newestCursorRef.current = last.receivedAt;
  }, [messages]);

  useEffect(() => {
    setTranslations((prev) => {
      if (prev.size === 0) return prev;
      const ids = new Set(messages.map((m) => m.id));
      let changed = false;
      const next = new Map();
      for (const [id, translated] of prev) {
        if (ids.has(id)) next.set(id, translated);
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [messages]);

  const connect = useCallback(() => {
    // Fetch initial history: the live tail, or the window a permalink asked
    // for. A window that fails or comes back empty falls through to live
    // rather than leaving an empty stream that refuses live lines.
    const fetchLive = () => relayFetch(`/api/chat/messages?limit=100`)
      .then((r) => r.json())
      .then((data) => {
        addMessages(normalizeMessages(data.reverse()));
      })
      .catch(() => {});
    const openOn = initialBeforeRef.current;
    initialBeforeRef.current = null;
    if (openOn) {
      loadWindow(openOn)
        .then((loaded) => {
          if (loaded.length === 0) throw new Error("empty window");
        })
        .catch(() => {
          setHasNewer(false);
          setWindowMode("live");
          fetchLive();
        });
    } else {
      fetchLive();
    }

    // Open SSE stream
    const es = new EventSource(`${RELAY_URL}/api/chat/stream`);
    eventSourceRef.current = es;

    es.addEventListener("history", (e) => {
      const data = JSON.parse(e.data);
      addMessages(normalizeMessages(data));
    });

    es.addEventListener("message", (e) => {
      const msg = normalizeMessage(JSON.parse(e.data));
      if (!msg) return;
      if (hasNewerRef.current && !heldIdsRef.current.has(msg.id)) {
        heldIdsRef.current.add(msg.id);
        setHeldLive(heldIdsRef.current.size);
      }
      addMessages([msg]);
    });

    es.addEventListener("delete", (e) => {
      const { id } = JSON.parse(e.data);
      setMessages((prev) => prev.filter((m) => m.id !== id));
    });

    es.addEventListener("bulk_delete", (e) => {
      const { ids } = JSON.parse(e.data);
      const idSet = new Set(ids);
      setMessages((prev) => prev.filter((m) => !idSet.has(m.id)));
    });

    es.addEventListener("users_init", (e) => {
      const serverUsers = JSON.parse(e.data);
      setOnlineUsers((prev) => {
        const prevMap = new Map(prev.map((u) => [u.battleTag, u]));
        return serverUsers.map((u) => ({
          ...u,
          joinedAt: prevMap.get(u.battleTag)?.joinedAt || u.joinedAt || Date.now(),
        }));
      });
    });

    es.addEventListener("user_joined", (e) => {
      const user = JSON.parse(e.data);
      setOnlineUsers((prev) => {
        if (prev.some((u) => u.battleTag === user.battleTag)) return prev;
        return [...prev, user];
      });
    });

    es.addEventListener("user_left", (e) => {
      const { battleTag } = JSON.parse(e.data);
      setOnlineUsers((prev) => prev.filter((u) => u.battleTag !== battleTag));
    });

    es.addEventListener("bot_response", (e) => {
      const data = JSON.parse(e.data);
      setBotResponses((prev) => [...prev.slice(-49), data]);
    });

    es.addEventListener("translation", (e) => {
      const { id, translated } = JSON.parse(e.data);
      setTranslations((prev) => new Map(prev).set(id, translated));
    });

    es.addEventListener("status", (e) => {
      const { state } = JSON.parse(e.data);
      setStatus(state === "Connected" ? "connected" : state);
    });

    // Heartbeats and onopen only prove the SSE pipe is alive; a relay-side
    // fault (auth_failed, banned, ...) stays until the relay reports otherwise
    es.addEventListener("heartbeat", () => {
      setStatus((s) => (RELAY_STATES.has(s) ? s : "connected"));
    });

    es.onopen = () => {
      retriesRef.current = 0;
      setStatus((s) => (RELAY_STATES.has(s) ? s : "connected"));
    };

    es.onerror = () => {
      setStatus("reconnecting");
      es.close();
      eventSourceRef.current = null;

      // Exponential backoff reconnect
      const delay = BACKOFF_DELAYS[Math.min(retriesRef.current, BACKOFF_DELAYS.length - 1)];
      retriesRef.current += 1;
      reconnectTimerRef.current = setTimeout(connect, delay);
    };

    return es;
  }, [addMessages, loadWindow, setHasNewer]);

  useEffect(() => {
    const es = connect();
    return () => {
      clearTimeout(reconnectTimerRef.current);
      es.close();
      if (eventSourceRef.current && eventSourceRef.current !== es) {
        eventSourceRef.current.close();
      }
    };
  }, [connect]);

  return {
    messages,
    status,
    onlineUsers,
    botResponses,
    translations,
    loadOlder,
    hasMoreHistory,
    loadNewer,
    hasNewer,
    heldLive,
    loadWindow,
    loadLatest,
    windowMode,
    windowId,
  };
}
