import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import SharedChatContext from "../ChatContext";
import PeonLoader from "../PeonLoader";

const RELAY_URL =
  import.meta.env.VITE_CHAT_RELAY_URL || "https://4v4gg-chat-relay.fly.dev";

/**
 * Digest ChatContext — thin wrapper around the shared ChatContext.
 * Handles date-based message fetching, caching, quote pre-selection,
 * and auto-save. Renders nothing when collapsed.
 */
const DigestChatContext = ({ date, battleTags, quotes, fromTime, toTime, playerOnly, expanded, selectable, onSaveQuotes, existingQuotes }) => {
  const [messages, setMessages] = useState(null);
  const [loading, setLoading] = useState(false);
  const cacheRef = useRef(new Map());
  const initializedRef = useRef(false);
  const skipNextChangeRef = useRef(false);

  // Reset when transcript changes
  useEffect(() => { initializedRef.current = false; }, [expanded, date]);

  // Derive a stable cache key — lock it once expanded so quote edits don't re-fetch
  const lockedKeyRef = useRef(null);
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
    if (expanded && cacheKey && !lockedKeyRef.current) {
      lockedKeyRef.current = cacheKey;
    }
    if (!expanded) lockedKeyRef.current = null;
  }, [expanded, cacheKey]);

  const activeCacheKey = lockedKeyRef.current || cacheKey;

  // Fetch messages when expanded
  useEffect(() => {
    if (!expanded || !activeCacheKey) return;

    if (cacheRef.current.has(activeCacheKey)) {
      setMessages(cacheRef.current.get(activeCacheKey));
      return;
    }

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
        cacheRef.current.set(activeCacheKey, data);
        setMessages(data);
      })
      .catch(() => setMessages([]))
      .finally(() => setLoading(false));
  }, [expanded, activeCacheKey]);

  // Normalize messages for the shared ChatContext
  const normalized = useMemo(() => {
    if (!messages) return null;
    return messages.map((m) => ({
      name: m.user_name,
      text: m.message,
      battle_tag: m.battle_tag,
      sentAt: m.sent_at || m.received_at,
      received_at: m.received_at,
      // Keep raw reference for quote formatting
      _raw: m,
    }));
  }, [messages]);

  // Handle selection changes — format as quotes and auto-save
  const handleSelectionChange = useCallback((selectedItems) => {
    if (skipNextChangeRef.current) {
      skipNextChangeRef.current = false;
      return;
    }
    if (!onSaveQuotes || selectedItems.length === 0) return;
    const formatted = selectedItems.map((item) => {
      const raw = item._raw || item;
      return `${raw.user_name || item.name}: ${raw.message || item.text}`;
    });
    onSaveQuotes(formatted);
  }, [onSaveQuotes]);

  if (!expanded) return null;

  if (loading) {
    return (
      <div className="cc-panel cc-panel--compact">
        <PeonLoader size="sm" />
      </div>
    );
  }

  return (
    <SharedChatContext
      messages={normalized}
      loading={false}
      selectable={selectable}
      onSelectionChange={handleSelectionChange}
      targetTags={battleTags}
      compact
    />
  );
};

export default DigestChatContext;
