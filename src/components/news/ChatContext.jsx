import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import "./ChatContext.css";

const RELAY_URL =
  import.meta.env.VITE_CHAT_RELAY_URL || "https://4v4gg-chat-relay.fly.dev";

/**
 * Expandable chat transcript.
 * Modes:
 *   - quotes: pass battleTags + quotes — finds exact conversation via quote matching
 *   - time:   pass fromTime + toTime (HH:MM) — all messages in that window
 *   - player: pass battleTags + playerOnly — just that player's messages for the day
 * All modes require date (YYYY-MM-DD).
 *
 * When selectable=true (edit mode), messages can be clicked to select as quotes.
 * onSaveQuotes(quotes) is called when the user saves their selection.
 */
const ChatContext = ({ date, battleTags, quotes, fromTime, toTime, playerOnly, expanded, selectable, onSaveQuotes }) => {
  const [messages, setMessages] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const cacheRef = useRef(new Map());

  // Build a set of target player battle_tags for highlighting
  const targetTags = useRef(new Set());
  useEffect(() => {
    targetTags.current = new Set(battleTags || []);
  }, [battleTags]);

  // Reset selection when transcript changes
  useEffect(() => { setSelected(new Set()); }, [expanded, date]);

  // Derive a stable cache key string to avoid re-fetching on every render
  const cacheKey = useMemo(() => {
    if (!date) return null;
    if (fromTime && toTime) return `${date}:t:${fromTime}-${toTime}`;
    if (battleTags && battleTags.length > 0) {
      const mode = playerOnly ? "p" : "q";
      const tags = [...battleTags].sort().join(",");
      const q = (quotes || []).join("|");
      return `${date}:${mode}:${tags}:${q}`;
    }
    return null;
  }, [date, fromTime, toTime, battleTags, quotes, playerOnly]);

  useEffect(() => {
    if (!expanded || !cacheKey) return;

    if (cacheRef.current.has(cacheKey)) {
      setMessages(cacheRef.current.get(cacheKey));
      return;
    }

    // Build query params based on mode
    const params = new URLSearchParams({ date, limit: "100" });

    if (fromTime && toTime) {
      params.set("from", fromTime);
      params.set("to", toTime);
    } else if (battleTags && battleTags.length > 0) {
      params.set("players", battleTags.join(","));
      if (playerOnly) {
        params.set("mode", "player");
      } else if (quotes && quotes.length > 0) {
        params.set("quotes", JSON.stringify(quotes));
      }
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
  }, [expanded, cacheKey]);

  const toggleSelect = useCallback((idx) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, []);

  const handleSave = useCallback(() => {
    if (!messages || selected.size === 0 || !onSaveQuotes) return;
    setSaving(true);
    const selectedQuotes = [...selected]
      .sort((a, b) => a - b)
      .map((i) => messages[i].message);
    onSaveQuotes(selectedQuotes);
    setTimeout(() => setSaving(false), 1500);
  }, [messages, selected, onSaveQuotes]);

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
          const isSelected = selected.has(i);
          return (
            <div
              key={i}
              className={`chat-context-msg${isTarget ? " chat-context-msg--target" : ""}${isSelected ? " chat-context-msg--selected" : ""}${selectable ? " chat-context-msg--selectable" : ""}`}
              onClick={selectable ? () => toggleSelect(i) : undefined}
            >
              {selectable && (
                <span className="chat-context-check">{isSelected ? "\u2713" : ""}</span>
              )}
              <span className="chat-context-time">{time}</span>
              <span className={`chat-context-name${isTarget ? " chat-context-name--target" : ""}`}>
                {m.user_name}
              </span>
              <span className="chat-context-text">{m.message}</span>
            </div>
          );
        })}
      </div>
      {selectable && selected.size > 0 && (
        <button className="chat-context-save" onClick={handleSave} disabled={saving}>
          {saving ? "\u2713 Saved" : `Use ${selected.size} quote${selected.size !== 1 ? "s" : ""}`}
        </button>
      )}
    </div>
  );
};

export default ChatContext;
