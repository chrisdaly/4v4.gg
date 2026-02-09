import { useState, useEffect, useRef, useCallback } from "react";

const RELAY_URL =
  import.meta.env.VITE_CHAT_RELAY_URL || "https://4v4gg-chat-relay.fly.dev";
const MAX_MESSAGES = 500;

export default function useChatStream() {
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState("connecting");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const eventSourceRef = useRef(null);

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

  useEffect(() => {
    let cancelled = false;

    // 1) Fetch initial history
    fetch(`${RELAY_URL}/api/chat/messages?limit=100`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        // API returns newest-first, reverse for chronological display
        addMessages(data.reverse());
      })
      .catch(() => {});

    // 2) Open SSE stream
    const es = new EventSource(`${RELAY_URL}/api/chat/stream`);
    eventSourceRef.current = es;

    es.addEventListener("history", (e) => {
      if (cancelled) return;
      const data = JSON.parse(e.data);
      addMessages(data);
    });

    es.addEventListener("message", (e) => {
      if (cancelled) return;
      const msg = JSON.parse(e.data);
      addMessages([msg]);
    });

    es.addEventListener("delete", (e) => {
      if (cancelled) return;
      const { id } = JSON.parse(e.data);
      setMessages((prev) => prev.filter((m) => m.id !== id));
    });

    es.addEventListener("bulk_delete", (e) => {
      if (cancelled) return;
      const { ids } = JSON.parse(e.data);
      const idSet = new Set(ids);
      setMessages((prev) => prev.filter((m) => !idSet.has(m.id)));
    });

    es.addEventListener("users_init", (e) => {
      if (cancelled) return;
      setOnlineUsers(JSON.parse(e.data));
    });

    es.addEventListener("user_joined", (e) => {
      if (cancelled) return;
      const user = JSON.parse(e.data);
      setOnlineUsers((prev) => {
        if (prev.some((u) => u.battleTag === user.battleTag)) return prev;
        return [...prev, user];
      });
    });

    es.addEventListener("user_left", (e) => {
      if (cancelled) return;
      const { battleTag } = JSON.parse(e.data);
      setOnlineUsers((prev) => prev.filter((u) => u.battleTag !== battleTag));
    });

    es.addEventListener("status", (e) => {
      if (cancelled) return;
      const { state } = JSON.parse(e.data);
      setStatus(state === "Connected" ? "connected" : state);
    });

    es.addEventListener("heartbeat", () => {
      if (cancelled) return;
      setStatus("connected");
    });

    es.onopen = () => {
      if (!cancelled) setStatus("connected");
    };

    es.onerror = () => {
      if (!cancelled) setStatus("reconnecting");
    };

    return () => {
      cancelled = true;
      es.close();
    };
  }, [addMessages]);

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

  return { messages, status, onlineUsers, sendMessage };
}
