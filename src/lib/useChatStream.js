import { useState, useEffect, useRef, useCallback } from "react";
import { RELAY_URL, relayFetch } from "./relay";
import { normalizeMessage, normalizeMessages } from "./chat/normalize";

const MAX_MESSAGES = 500;
// Cap how far back scrollback can page in - keeps the DOM and memory bounded.
// ~2000 messages is days of history; beyond that, use search instead.
const MAX_HISTORY_EXTRA = 1500;
const BACKOFF_DELAYS = [1000, 2000, 4000, 8000, 16000, 30000];
// Relay-side SignalR states (server/src/signalr.js) other than Connected
const RELAY_STATES = new Set(["auth_failed", "banned", "no_token", "error", "Disconnected", "stopped"]);

/**
 * Transport layer for the chat relay: REST history + SSE live stream.
 * Every message crosses the wire boundary through normalizeMessage, so
 * consumers only ever see the camelCase feed shape (see chat/normalize.js).
 */
export default function useChatStream() {
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState("connecting");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [botResponses, setBotResponses] = useState([]);
  const [translations, setTranslations] = useState(new Map());
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
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

  // Append already-normalized messages, deduped by id, trimmed to the cap
  const addMessages = useCallback((newMsgs) => {
    setMessages((prev) => {
      const ids = new Set(prev.map((m) => m.id));
      const unique = newMsgs.filter((m) => !ids.has(m.id));
      if (unique.length === 0) return prev;
      const combined = [...prev, ...unique];
      const cap = MAX_MESSAGES + historyExtraRef.current;
      return combined.length > cap
        ? combined.slice(combined.length - cap)
        : combined;
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
        `/api/chat/messages?limit=100&before=${encodeURIComponent(cursor)}`
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
      if (data.length < 100 || historyExtraRef.current >= MAX_HISTORY_EXTRA) {
        setHasMoreHistory(false);
      }
      return { added, oldestCursor: older[0]?.receivedAt || cursor };
    } catch {
      return { added: 0, oldestCursor: null };
    } finally {
      loadingOlderRef.current = false;
    }
  }, []);

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
    // Fetch initial history
    relayFetch(`/api/chat/messages?limit=100`)
      .then((r) => r.json())
      .then((data) => {
        addMessages(normalizeMessages(data.reverse()));
      })
      .catch(() => {});

    // Open SSE stream
    const es = new EventSource(`${RELAY_URL}/api/chat/stream`);
    eventSourceRef.current = es;

    es.addEventListener("history", (e) => {
      const data = JSON.parse(e.data);
      addMessages(normalizeMessages(data));
    });

    es.addEventListener("message", (e) => {
      const msg = normalizeMessage(JSON.parse(e.data));
      if (msg) addMessages([msg]);
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
  }, [addMessages]);

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

  const sendMessage = useCallback(async (text, apiKey) => {
    const res = await relayFetch(`/api/admin/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({ message: text }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Send failed (${res.status})`);
    }
  }, []);

  return { messages, status, onlineUsers, botResponses, translations, sendMessage, loadOlder, hasMoreHistory };
}
