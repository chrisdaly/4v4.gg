import { useState, useEffect, useRef, useCallback } from "react";

const RELAY_URL =
  import.meta.env.VITE_CHAT_RELAY_URL || "https://4v4gg-chat-relay.fly.dev";
const MAX_MESSAGES = 500;
const BACKOFF_DELAYS = [1000, 2000, 4000, 8000, 16000, 30000];

export default function useChatStream() {
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState("connecting");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [botResponses, setBotResponses] = useState([]);
  const [translations, setTranslations] = useState(new Map());
  const eventSourceRef = useRef(null);
  const retriesRef = useRef(0);
  const reconnectTimerRef = useRef(null);

  const addMessages = useCallback((newMsgs) => {
    setMessages((prev) => {
      const ids = new Set(prev.map((m) => m.id));
      const unique = newMsgs.filter((m) => !ids.has(m.id));
      if (unique.length === 0) return prev;
      const combined = [...prev, ...unique];
      return combined.length > MAX_MESSAGES
        ? combined.slice(combined.length - MAX_MESSAGES)
        : combined;
    });
  }, []);

  const connect = useCallback(() => {
    // Fetch initial history
    fetch(`${RELAY_URL}/api/chat/messages?limit=100`)
      .then((r) => r.json())
      .then((data) => {
        addMessages(data.reverse());
      })
      .catch(() => {});

    // Open SSE stream
    const es = new EventSource(`${RELAY_URL}/api/chat/stream`);
    eventSourceRef.current = es;

    es.addEventListener("history", (e) => {
      const data = JSON.parse(e.data);
      addMessages(data);
    });

    es.addEventListener("message", (e) => {
      const msg = JSON.parse(e.data);
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

    es.addEventListener("heartbeat", () => {
      setStatus("connected");
    });

    es.onopen = () => {
      retriesRef.current = 0;
      setStatus("connected");
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
    const res = await fetch(`${RELAY_URL}/api/admin/send`, {
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

  return { messages, status, onlineUsers, botResponses, translations, sendMessage };
}
