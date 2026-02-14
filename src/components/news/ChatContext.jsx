import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { getPlayerProfile } from "../../lib/api";
import "./ChatContext.css";

const RELAY_URL =
  import.meta.env.VITE_CHAT_RELAY_URL || "https://4v4gg-chat-relay.fly.dev";

/**
 * Expandable chat transcript with grouped messages and avatars.
 * Modes:
 *   - quotes: pass battleTags + quotes — finds exact conversation via quote matching
 *   - time:   pass fromTime + toTime (HH:MM) — all messages in that window
 *   - player: pass battleTags + playerOnly — just that player's messages for the day
 * All modes require date (YYYY-MM-DD).
 *
 * When selectable=true (edit mode), messages can be clicked to select as quotes.
 * onSaveQuotes(quotes) is called when the user saves their selection.
 */

// Shared profile cache across all ChatContext instances
const profileCache = new Map();

const ChatContext = ({ date, battleTags, quotes, fromTime, toTime, playerOnly, expanded, selectable, onSaveQuotes, existingQuotes }) => {
  const [messages, setMessages] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [profiles, setProfiles] = useState(new Map());
  const cacheRef = useRef(new Map());
  const initializedRef = useRef(false);

  // Build a set of target player battle_tags for highlighting
  const targetTags = useRef(new Set());
  useEffect(() => {
    targetTags.current = new Set(battleTags || []);
  }, [battleTags]);

  // Reset selection when transcript changes
  useEffect(() => { setSelected(new Set()); initializedRef.current = false; }, [expanded, date]);

  // Pre-select messages that match existing quotes
  useEffect(() => {
    if (!messages || !existingQuotes || existingQuotes.length === 0 || initializedRef.current) return;
    initializedRef.current = true;
    const quoteSet = new Set(existingQuotes.map(q => q.toLowerCase().trim()));
    const matched = new Set();
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      const candidate = `${m.user_name}: ${m.message}`.toLowerCase().trim();
      if (quoteSet.has(candidate)) matched.add(i);
    }
    if (matched.size > 0) setSelected(matched);
  }, [messages, existingQuotes]);

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

  // Lock the key on first expansion; reset when collapsed
  useEffect(() => {
    if (expanded && cacheKey && !lockedKeyRef.current) {
      lockedKeyRef.current = cacheKey;
    }
    if (!expanded) lockedKeyRef.current = null;
  }, [expanded, cacheKey]);

  const activeCacheKey = lockedKeyRef.current || cacheKey;

  useEffect(() => {
    if (!expanded || !activeCacheKey) return;

    if (cacheRef.current.has(activeCacheKey)) {
      setMessages(cacheRef.current.get(activeCacheKey));
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
        cacheRef.current.set(activeCacheKey, data);
        setMessages(data);
      })
      .catch(() => setMessages([]))
      .finally(() => setLoading(false));
  }, [expanded, activeCacheKey]);

  // Fetch profiles for unique battle tags in messages
  useEffect(() => {
    if (!messages || messages.length === 0) return;
    const tags = new Set(messages.map((m) => m.battle_tag).filter(Boolean));
    for (const tag of tags) {
      if (profileCache.has(tag)) {
        setProfiles((prev) => {
          if (prev.has(tag)) return prev;
          const next = new Map(prev);
          next.set(tag, profileCache.get(tag));
          return next;
        });
        continue;
      }
      getPlayerProfile(tag).then((p) => {
        const data = { pic: p?.profilePicUrl || null };
        profileCache.set(tag, data);
        setProfiles((prev) => {
          const next = new Map(prev);
          next.set(tag, data);
          return next;
        });
      });
    }
  }, [messages]);

  const toggleSelect = useCallback((idx) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, []);

  // Auto-save quotes when selection changes (runs after render, not during)
  const selectionRef = useRef(0);
  const onSaveQuotesRef = useRef(onSaveQuotes);
  onSaveQuotesRef.current = onSaveQuotes;

  useEffect(() => {
    if (!messages || selected.size === 0) return;
    // Skip the initial render — only fire on user-driven changes
    selectionRef.current++;
    if (selectionRef.current <= 1) return;
    const selectedQuotes = [...selected]
      .sort((a, b) => a - b)
      .map((i) => `${messages[i].user_name}: ${messages[i].message}`);
    if (onSaveQuotesRef.current) onSaveQuotesRef.current(selectedQuotes);
  }, [selected, messages]);

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

  // Group consecutive messages by the same user
  const groups = [];
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    const prev = i > 0 ? messages[i - 1] : null;
    if (prev && prev.battle_tag === m.battle_tag) {
      groups[groups.length - 1].msgs.push({ ...m, idx: i });
    } else {
      groups.push({
        battle_tag: m.battle_tag,
        user_name: m.user_name,
        isTarget: targetTags.current.has(m.battle_tag),
        msgs: [{ ...m, idx: i }],
      });
    }
  }

  return (
    <div className="chat-context" onClick={(e) => e.stopPropagation()}>
      <div className="chat-context-scroll">
        {groups.map((group, gi) => {
          const profile = profiles.get(group.battle_tag);
          const pic = profile?.pic;
          return (
            <div key={gi} className={`chat-context-group${group.isTarget ? " chat-context-group--target" : ""}`}>
              <div className="chat-context-group-avatar">
                {pic ? (
                  <img
                    src={pic}
                    alt=""
                    className="chat-context-avatar"
                    onError={(e) => { e.target.style.display = "none"; }}
                  />
                ) : (
                  <span className="chat-context-avatar-placeholder" />
                )}
              </div>
              <div className="chat-context-group-body">
                <div className="chat-context-group-header">
                  <span className={`chat-context-name${group.isTarget ? " chat-context-name--target" : ""}`}>
                    {group.user_name}
                  </span>
                  <span className="chat-context-time">
                    {group.msgs[0].sent_at
                      ? new Date(group.msgs[0].sent_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : ""}
                  </span>
                </div>
                {group.msgs.map((m) => {
                  const isSelected = selected.has(m.idx);
                  return (
                    <div
                      key={m.idx}
                      className={`chat-context-msg${isSelected ? " chat-context-msg--selected" : ""}${selectable ? " chat-context-msg--selectable" : ""}`}
                      onClick={selectable ? (e) => { e.stopPropagation(); toggleSelect(m.idx); } : undefined}
                    >
                      {selectable && (
                        <span className="chat-context-check">{isSelected ? "\u2713" : ""}</span>
                      )}
                      <span className="chat-context-text">{m.message}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ChatContext;
