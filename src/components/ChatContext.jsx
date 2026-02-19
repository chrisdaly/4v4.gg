import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { FiChevronUp, FiChevronDown } from "react-icons/fi";
import { fetchAndCacheProfile, getCachedProfile } from "../lib/profileCache";
import { Button } from "./ui";
import "./ChatContext.css";

const RELAY_URL =
  import.meta.env.VITE_CHAT_RELAY_URL || "https://4v4gg-chat-relay.fly.dev";

/* ── Utilities ─────────────────────────────────────── */

function HighlightText({ text, query }) {
  if (!query || query.length < 2) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? <mark key={i} className="cc-highlight">{part}</mark>
      : part
  );
}

function groupMessages(messages) {
  const groups = [];
  for (const msg of messages) {
    const tag = msg.battle_tag || "";
    const last = groups[groups.length - 1];
    if (last && last.battle_tag === tag) {
      last.lines.push(msg);
    } else {
      groups.push({
        battle_tag: tag,
        name: msg.name || msg.user_name || tag.split("#")[0],
        time: msg.sentAt || msg.received_at || msg.sent_at || "",
        lines: [msg],
      });
    }
  }
  return groups;
}

function parseTimestamp(ts) {
  if (!ts) return null;
  return new Date(ts.endsWith?.("Z") ? ts : typeof ts === "string" && !ts.includes("T") && !ts.includes("Z") ? ts + "Z" : ts);
}

function formatTimeShort(ts) {
  const d = parseTimestamp(ts);
  if (!d) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDateShort(ts) {
  const d = parseTimestamp(ts);
  if (!d) return "";
  return d.toLocaleDateString([], { month: "short", day: "numeric" }) + " " +
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getDateKey(ts) {
  const d = parseTimestamp(ts);
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

/* ── ChatContext ────────────────────────────────────── */

/**
 * Unified chat context component.
 *
 * @param {Array}    messages          - [{ name, text, score?, sentAt?, battle_tag?, received_at? }]
 * @param {boolean}  loading           - Show loading state
 * @param {Function} onApply           - (selectedItems) => void — multi-select apply button callback
 * @param {Function} onSelectionChange - (selectedItems) => void — fires on every selection toggle
 * @param {boolean}  selectable        - Enable multi-select checkboxes
 * @param {boolean}  expandable        - Enable context expansion on message click
 * @param {boolean}  showScores        - Show score column
 * @param {Function} applyLabel        - (count) => string — custom apply button label
 * @param {string}   placeholder       - Filter input placeholder
 * @param {string}   highlight         - Text to highlight in messages
 * @param {Array}    targetTags        - battle_tags to highlight as gold (target players)
 * @param {boolean}  compact           - Minimal mode: no filter input, no panel border
 * @param {boolean}  showDates         - Show full dates in timestamps (auto-enabled when messages span multiple days)
 */
const ChatContext = ({
  messages,
  loading = false,
  onApply,
  onSelectionChange,
  selectable = false,
  expandable = false,
  showScores = false,
  splitView = false,
  applyLabel,
  placeholder = "Filter messages...",
  highlight = "",
  targetTags,
  compact = false,
  showDates = false,
}) => {
  const [filter, setFilter] = useState("");
  const [sortBy, setSortBy] = useState("score"); // "score" or "date"
  const [msgFilter, setMsgFilter] = useState("all"); // "all" | "player" | "mentions"
  const [selected, setSelected] = useState(new Set());
  const [selectedCtx, setSelectedCtx] = useState(new Set()); // context panel selections (by received_at)
  const [profiles, setProfiles] = useState(new Map());
  const targetSet = useMemo(() => new Set(targetTags || []), [targetTags]);

  // Detect whether messages span multiple days
  const spansMultipleDays = useMemo(() => {
    if (!messages || messages.length < 2) return false;
    const dates = new Set();
    for (const m of messages) {
      const dk = getDateKey(m.received_at || m.sentAt || m.sent_at);
      if (dk) dates.add(dk);
      if (dates.size > 1) return true;
    }
    return false;
  }, [messages]);

  const useDates = showDates || spansMultipleDays;
  const formatTime = useCallback((ts) => useDates ? formatDateShort(ts) : formatTimeShort(ts), [useDates]);

  // Context expansion state
  const [expandedMsg, setExpandedMsg] = useState(null); // { idx, receivedAt }
  const [contextMessages, setContextMessages] = useState([]);
  const [contextLoading, setContextLoading] = useState(false);
  const [contextPadding, setContextPadding] = useState(5);
  const [contextWindow, setContextWindow] = useState({ start: null, end: null });
  const [contextAvatars, setContextAvatars] = useState(new Map());
  const matchRef = useRef(null);

  // Reset selection when messages change
  useEffect(() => { setSelected(new Set()); }, [messages]);

  // Fetch profiles for top-level messages
  useEffect(() => {
    if (!messages || messages.length === 0) return;
    const tags = new Set(messages.map((m) => m.battle_tag).filter(Boolean));
    for (const tag of tags) {
      const cached = getCachedProfile(tag);
      if (cached) {
        setProfiles((prev) => {
          if (prev.has(tag)) return prev;
          const next = new Map(prev);
          next.set(tag, cached);
          return next;
        });
        continue;
      }
      fetchAndCacheProfile(tag).then((data) => {
        setProfiles((prev) => {
          const next = new Map(prev);
          next.set(tag, data);
          return next;
        });
      });
    }
  }, [messages]);

  // Check if messages include any mentions
  const hasMentions = useMemo(() => messages?.some((m) => m.isMention) || false, [messages]);

  // Filter and sort messages
  const filtered = useMemo(() => {
    if (!messages) return [];
    let result = messages;
    // Apply type filter (all / player only / mentions only)
    if (msgFilter === "player") result = result.filter((m) => !m.isMention);
    else if (msgFilter === "mentions") result = result.filter((m) => m.isMention);
    if (filter.trim()) {
      const lower = filter.toLowerCase();
      result = result.filter(
        (m) =>
          (m.text || m.message || "").toLowerCase().includes(lower) ||
          (m.name || m.user_name || "").toLowerCase().includes(lower)
      );
    }
    if (sortBy === "date") {
      result = [...result].sort((a, b) => {
        const ta = a.received_at || a.sentAt || a.sent_at || "";
        const tb = b.received_at || b.sentAt || b.sent_at || "";
        return ta < tb ? -1 : ta > tb ? 1 : 0;
      });
    }
    return result;
  }, [messages, filter, sortBy, msgFilter]);

  // Toggle selection
  const toggle = useCallback((origIdx) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(origIdx)) next.delete(origIdx);
      else next.add(origIdx);
      // Fire onSelectionChange with selected items
      if (onSelectionChange && messages) {
        const items = [...next].sort((a, b) => a - b).map((i) => messages[i]);
        onSelectionChange(items);
      }
      return next;
    });
  }, [onSelectionChange, messages]);

  // Toggle context selection (by index into contextMessages)
  const toggleCtx = useCallback((idx) => {
    setSelectedCtx((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, []);

  // Total selection count (main + context)
  const totalSelected = selected.size + selectedCtx.size;

  // Apply selection — merge main list picks + context picks
  const handleApply = useCallback(() => {
    if (totalSelected === 0 || !onApply) return;
    const mainPicked = messages ? [...selected].sort((a, b) => a - b).map((i) => messages[i]) : [];
    const ctxPicked = [...selectedCtx].sort((a, b) => a - b).map((i) => {
      const cm = contextMessages[i];
      return { name: cm.user_name || cm.name, text: cm.message || cm.text, received_at: cm.received_at };
    });
    onApply([...mainPicked, ...ctxPicked]);
    setSelected(new Set());
    setSelectedCtx(new Set());
  }, [messages, selected, selectedCtx, contextMessages, totalSelected, onApply]);

  // Context expansion — fetch surrounding messages
  const fetchContext = useCallback(async (receivedAt, padding) => {
    setContextLoading(true);
    try {
      const res = await fetch(
        `${RELAY_URL}/api/admin/messages/search/context?received_at=${encodeURIComponent(receivedAt)}&padding=${padding}`
      );
      const data = await res.json();
      setContextMessages(data || []);
      if (data && data.length > 0) {
        setContextWindow({ start: data[0].received_at, end: data[data.length - 1].received_at });
      }
      // Fetch avatars for context users
      const tags = [...new Set((data || []).map((m) => m.battle_tag).filter(Boolean))];
      const newTags = tags.filter((t) => !contextAvatars.has(t));
      if (newTags.length > 0) {
        for (const tag of newTags) {
          fetchAndCacheProfile(tag).then((profile) => {
            setContextAvatars((prev) => {
              const next = new Map(prev);
              next.set(tag, profile?.pic || null);
              return next;
            });
          });
        }
      }
    } catch {
      setContextMessages([]);
    }
    setContextLoading(false);
  }, [contextAvatars]);

  const handleExpand = useCallback((origIdx, receivedAt) => {
    if (expandedMsg?.idx === origIdx) {
      setExpandedMsg(null);
      setContextMessages([]);
      setSelectedCtx(new Set());
      return;
    }
    setExpandedMsg({ idx: origIdx, receivedAt });
    setContextPadding(5);
    setSelectedCtx(new Set());
    fetchContext(receivedAt, 5);
  }, [expandedMsg, fetchContext]);

  const shiftContext = useCallback((direction) => {
    if (contextMessages.length === 0 || !contextWindow.start || !contextWindow.end) return;
    const referenceTime = direction === "earlier" ? contextWindow.start : contextWindow.end;
    const refDate = new Date(referenceTime.endsWith?.("Z") ? referenceTime : referenceTime + "Z");
    const shifted = new Date(refDate.getTime() + (direction === "earlier" ? -5 * 60000 : 5 * 60000));
    const shiftedStr = shifted.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "");
    fetchContext(shiftedStr, contextPadding);
  }, [contextMessages, contextPadding, contextWindow, fetchContext]);

  const handlePaddingChange = useCallback((delta) => {
    if (!expandedMsg) return;
    setContextPadding((prev) => {
      const next = Math.max(1, Math.min(60, prev + delta));
      fetchContext(expandedMsg.receivedAt, next);
      return next;
    });
  }, [expandedMsg, fetchContext]);

  // Scroll to match when context loads
  useEffect(() => {
    if (matchRef.current && contextMessages.length > 0 && !contextLoading) {
      matchRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [contextMessages, contextLoading]);

  // Determine the highlight query — use `highlight` prop, or fall back to filter
  const highlightQuery = highlight || filter;

  // Apply button label
  const label = applyLabel
    ? applyLabel(totalSelected)
    : `Use ${totalSelected} item${totalSelected !== 1 ? "s" : ""}`;

  // Match check for context origin highlighting
  const isOriginMsg = useCallback((cm) => {
    if (!expandedMsg) return false;
    const origMsg = messages?.[expandedMsg.idx];
    if (!origMsg) return false;
    return cm.received_at === (origMsg.received_at || origMsg.sentAt) &&
           (cm.message || cm.text) === (origMsg.text || origMsg.message);
  }, [expandedMsg, messages]);

  /* ── Render helpers ──────────────────────────────── */

  const contextPanel = expandable && expandedMsg && (
    <div className="cc-context-side">
      <div className="cc-context-toolbar">
        <button className="cc-context-btn" onClick={(e) => { e.stopPropagation(); handlePaddingChange(-2); }} disabled={contextPadding <= 1}>-</button>
        <span className="cc-context-padding">{contextPadding}m</span>
        <button className="cc-context-btn" onClick={(e) => { e.stopPropagation(); handlePaddingChange(2); }} disabled={contextPadding >= 60}>+</button>
      </div>
      {contextLoading ? (
        <div className="cc-status" style={{ padding: "var(--space-4)" }}>Loading...</div>
      ) : (
        <div className="cc-context-scroll">
          <button className="cc-edge-btn" onClick={(e) => { e.stopPropagation(); shiftContext("earlier"); }}>
            <FiChevronUp size={12} /> Earlier
          </button>
          {groupMessages(contextMessages.map((cm, i) => ({
            ...cm,
            _ctxIdx: i,
            name: cm.user_name,
            text: cm.message,
          }))).map((cGroup, cgi) => {
            const groupHasOrigin = cGroup.lines.some(isOriginMsg);
            const avatarUrl = contextAvatars.get(cGroup.battle_tag);
            return (
              <div
                key={cgi}
                className={`cc-group ${groupHasOrigin ? "cc-group--origin" : ""}`}
                ref={groupHasOrigin ? matchRef : undefined}
              >
                <div className="cc-group-avatar">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="cc-avatar" />
                  ) : (
                    <span className="cc-avatar-placeholder" />
                  )}
                </div>
                <div className="cc-group-body">
                  <div className="cc-group-header">
                    <span className={`cc-name ${groupHasOrigin ? "cc-name--origin" : ""}`}>
                      {cGroup.name}
                    </span>
                    <span className="cc-time">{formatTimeShort(cGroup.time)}</span>
                  </div>
                  {cGroup.lines.map((cl, cli) => {
                    const ctxIdx = cl._ctxIdx;
                    const isCtxSelected = selectedCtx.has(ctxIdx);
                    return (
                      <div
                        key={cli}
                        className={`cc-msg cc-msg--selectable ${isOriginMsg(cl) ? "cc-msg--origin" : ""} ${isCtxSelected ? "cc-msg--selected" : ""}`}
                        onClick={(e) => { e.stopPropagation(); toggleCtx(ctxIdx); }}
                      >
                        <span className="cc-check">{isCtxSelected ? "\u2713" : ""}</span>
                        <span className="cc-text">
                          <HighlightText text={cl.message || cl.text || ""} query={highlightQuery} />
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <button className="cc-edge-btn" onClick={(e) => { e.stopPropagation(); shiftContext("later"); }}>
            <FiChevronDown size={12} /> Later
          </button>
        </div>
      )}
    </div>
  );

  const messageList = (
    <>
      {/* Loading */}
      {loading && <span className="cc-status">Loading...</span>}

      {/* Empty */}
      {!loading && messages && messages.length === 0 && (
        <span className="cc-status">No messages found</span>
      )}

      {/* Message list */}
      {filtered.length > 0 && (
        <div className="cc-list">
          {(() => {
            const groups = groupMessages(filtered);
            let lastDateKey = null;
            return groups.map((group, gi) => {
            const profile = profiles.get(group.battle_tag);
            const pic = profile?.pic;
            const isTarget = targetSet.size > 0 && targetSet.has(group.battle_tag);
            const isMentionGroup = group.lines[0]?.isMention;
            const dateKey = useDates ? getDateKey(group.time) : null;
            const showDateSep = useDates && dateKey && dateKey !== lastDateKey;
            if (dateKey) lastDateKey = dateKey;
            return (
              <React.Fragment key={gi}>
                {showDateSep && (
                  <div className="cc-date-separator">
                    {parseTimestamp(group.time)?.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }) || dateKey}
                  </div>
                )}
              <div className={`cc-group${isTarget ? " cc-group--target" : ""}${isMentionGroup ? " cc-group--mention" : ""}`}>
                <div className="cc-group-avatar">
                  {pic ? (
                    <img src={pic} alt="" className="cc-avatar" />
                  ) : (
                    <span className="cc-avatar-placeholder" />
                  )}
                </div>
                <div className="cc-group-body">
                  <div className="cc-group-header">
                    <span className={`cc-name${isTarget ? " cc-name--target" : ""}`}>{group.name}</span>
                    {isMentionGroup && <span className="cc-mention-badge">mention</span>}
                    <span className="cc-time">{formatTime(group.time)}</span>
                  </div>
                  {group.lines.map((line) => {
                    const origIdx = messages.indexOf(line);
                    const text = line.text || line.message || "";
                    const isSelected = selected.has(origIdx);
                    const isExpanded = expandedMsg?.idx === origIdx;
                    const receivedAt = line.received_at || line.sentAt || "";

                    return (
                      <React.Fragment key={origIdx}>
                        <div
                          className={[
                            "cc-msg",
                            selectable && "cc-msg--selectable",
                            isSelected && "cc-msg--selected",
                            expandable && "cc-msg--expandable",
                            isExpanded && "cc-msg--expanded",
                            line.isMention && "cc-msg--mention",
                          ].filter(Boolean).join(" ")}
                          onClick={() => {
                            if (selectable) toggle(origIdx);
                            if (expandable && receivedAt) handleExpand(origIdx, receivedAt);
                          }}
                        >
                          {selectable && (
                            <span className="cc-check">{isSelected ? "\u2713" : ""}</span>
                          )}
                          {showScores && (
                            sortBy === "date" ? (
                              <span className="cc-score cc-score--date">{formatTimeShort(receivedAt)}</span>
                            ) : line.score != null ? (
                              <span className="cc-score">{line.score}</span>
                            ) : null
                          )}
                          {line.isMention && <span className="cc-mention-tag">@</span>}
                          <span className="cc-text">
                            <HighlightText text={text} query={highlightQuery} />
                          </span>
                        </div>

                        {/* Inline context (non-split mode only) */}
                        {expandable && !splitView && isExpanded && (
                          <div className="cc-context">
                            <div className="cc-context-toolbar">
                              <button className="cc-context-btn" onClick={(e) => { e.stopPropagation(); handlePaddingChange(-2); }} disabled={contextPadding <= 1}>-</button>
                              <span className="cc-context-padding">{contextPadding}m</span>
                              <button className="cc-context-btn" onClick={(e) => { e.stopPropagation(); handlePaddingChange(2); }} disabled={contextPadding >= 60}>+</button>
                            </div>
                            {contextLoading ? (
                              <div className="cc-status" style={{ padding: "var(--space-4)" }}>Loading...</div>
                            ) : (
                              <div className="cc-context-scroll">
                                <button className="cc-edge-btn" onClick={(e) => { e.stopPropagation(); shiftContext("earlier"); }}>
                                  <FiChevronUp size={12} /> Earlier
                                </button>
                                {groupMessages(contextMessages.map((cm) => ({
                                  ...cm,
                                  name: cm.user_name,
                                  text: cm.message,
                                }))).map((cGroup, cgi) => {
                                  const groupHasOrigin = cGroup.lines.some(isOriginMsg);
                                  const avatarUrl = contextAvatars.get(cGroup.battle_tag);
                                  return (
                                    <div
                                      key={cgi}
                                      className={`cc-group ${groupHasOrigin ? "cc-group--origin" : ""}`}
                                      ref={groupHasOrigin ? matchRef : undefined}
                                    >
                                      <div className="cc-group-avatar">
                                        {avatarUrl ? (
                                          <img src={avatarUrl} alt="" className="cc-avatar" />
                                        ) : (
                                          <span className="cc-avatar-placeholder" />
                                        )}
                                      </div>
                                      <div className="cc-group-body">
                                        <div className="cc-group-header">
                                          <span className={`cc-name ${groupHasOrigin ? "cc-name--origin" : ""}`}>
                                            {cGroup.name}
                                          </span>
                                          <span className="cc-time">{formatTimeShort(cGroup.time)}</span>
                                        </div>
                                        {cGroup.lines.map((cl, cli) => (
                                          <div key={cli} className={`cc-msg ${isOriginMsg(cl) ? "cc-msg--origin" : ""}`}>
                                            <span className="cc-text">
                                              <HighlightText text={cl.message || cl.text || ""} query={highlightQuery} />
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })}
                                <button className="cc-edge-btn" onClick={(e) => { e.stopPropagation(); shiftContext("later"); }}>
                                  <FiChevronDown size={12} /> Later
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
              </React.Fragment>
            );
          });
          })()}
        </div>
      )}

      {/* Apply button */}
      {selectable && totalSelected > 0 && onApply && (
        <Button $primary onClick={handleApply} className="cc-apply">
          {label}
        </Button>
      )}
    </>
  );

  /* ── Render ─────────────────────────────────────── */

  return (
    <div className={compact ? "cc-panel cc-panel--compact" : splitView ? "cc-panel cc-panel--split" : "cc-panel"} onClick={compact ? (e) => e.stopPropagation() : undefined}>
      {/* Filter + sort */}
      {!compact && (
        <div className="cc-toolbar">
          <input
            type="text"
            className="cc-filter"
            placeholder={placeholder}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          {showScores && (
            <button
              className={`cc-sort-toggle${sortBy === "date" ? " cc-sort-toggle--active" : ""}`}
              onClick={() => setSortBy((s) => s === "score" ? "date" : "score")}
              title={sortBy === "score" ? "Click to sort chronologically" : "Click to sort by relevance"}
            >
              {sortBy === "score" ? "Sort: relevance" : "Sort: date"}
            </button>
          )}
          {hasMentions && (
            <button
              className={`cc-sort-toggle${msgFilter !== "all" ? " cc-sort-toggle--active" : ""}`}
              onClick={() => setMsgFilter((f) => f === "all" ? "mentions" : f === "mentions" ? "player" : "all")}
              title="Cycle: all → mentions only → player only"
            >
              {msgFilter === "all" ? "Show: all" : msgFilter === "mentions" ? "Show: @mentions" : "Show: player"}
            </button>
          )}
        </div>
      )}

      {splitView ? (
        <div className="cc-split-layout">
          <div className="cc-split-left">{messageList}</div>
          <div className="cc-split-right">
            {contextPanel || <span className="cc-status">Click a message to see context</span>}
          </div>
        </div>
      ) : messageList}
    </div>
  );
};

export default ChatContext;
