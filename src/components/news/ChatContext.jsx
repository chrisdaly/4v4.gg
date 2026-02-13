import React, { useState, useEffect, useRef } from "react";
import "./ChatContext.css";

const RELAY_URL =
  import.meta.env.VITE_CHAT_RELAY_URL || "https://4v4gg-chat-relay.fly.dev";

/**
 * Expandable chat transcript.
 * Mode 1 (drama): pass battleTags — fetches surrounding context around those players
 * Mode 2 (spikes): pass fromTime + toTime (HH:MM) — fetches all messages in that window
 * Both modes require date (YYYY-MM-DD).
 */
const ChatContext = ({ date, battleTags, quotes, fromTime, toTime, expanded }) => {
  const [messages, setMessages] = useState(null);
  const [loading, setLoading] = useState(false);
  const cacheRef = useRef(new Map());

  // Build a set of target player battle_tags for highlighting
  const targetTags = useRef(new Set());
  useEffect(() => {
    targetTags.current = new Set(battleTags || []);
  }, [battleTags]);

  useEffect(() => {
    if (!expanded || !date) return;

    // Build query params based on mode
    const params = new URLSearchParams({ date, limit: "100" });
    let cacheKey;

    if (fromTime && toTime) {
      // Spike mode: time window
      params.set("from", fromTime);
      params.set("to", toTime);
      cacheKey = `${date}:${fromTime}-${toTime}`;
    } else if (battleTags && battleTags.length > 0) {
      // Drama mode: quote-based context
      params.set("players", battleTags.join(","));
      if (quotes && quotes.length > 0) {
        params.set("quotes", JSON.stringify(quotes));
      }
      cacheKey = `${date}:${[...battleTags].sort().join(",")}:${(quotes || []).join("|")}`;
    } else {
      return;
    }

    if (cacheRef.current.has(cacheKey)) {
      setMessages(cacheRef.current.get(cacheKey));
      return;
    }

    setLoading(true);
    fetch(`${RELAY_URL}/api/admin/messages/context?${params}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        cacheRef.current.set(cacheKey, data);
        setMessages(data);
      })
      .catch(() => setMessages([]))
      .finally(() => setLoading(false));
  }, [expanded, date, battleTags, quotes, fromTime, toTime]);

  if (!expanded) return null;

  if (loading) {
    return (
      <div className="chat-context">
        <div className="chat-context-loading">Loading chat...</div>
      </div>
    );
  }

  if (!messages || messages.length === 0) {
    return (
      <div className="chat-context">
        <div className="chat-context-empty">No messages found</div>
      </div>
    );
  }

  return (
    <div className="chat-context" onClick={(e) => e.stopPropagation()}>
      <div className="chat-context-scroll">
        {messages.map((m, i) => {
          const time = m.sent_at
            ? new Date(m.sent_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "";
          const isTarget = targetTags.current.has(m.battle_tag);
          return (
            <div key={i} className={`chat-context-msg${isTarget ? " chat-context-msg--target" : ""}`}>
              <span className="chat-context-time">{time}</span>
              <span className={`chat-context-name${isTarget ? " chat-context-name--target" : ""}`}>
                {m.user_name}
              </span>
              <span className="chat-context-text">{m.message}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ChatContext;
