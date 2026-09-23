import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { FiPlus, FiCheck } from "react-icons/fi";
import { fetchAndCacheProfile, getCachedProfile } from "../lib/profileCache";
import { Button } from "./ui";
import PeonLoader from "./PeonLoader";
import ChatMessage from "./chat/ChatMessage";
import "./ChatContext.css";

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

// Consecutive same-author messages merge into one group, but only when close
// in time - search results can put the same author hours apart back to back,
// and a single group would misrepresent them.
const GROUP_GAP_MS = 5 * 60 * 1000;

function parseTimestamp(ts) {
  if (!ts) return null;
  return new Date(ts.endsWith?.("Z") ? ts : typeof ts === "string" && !ts.includes("T") && !ts.includes("Z") ? ts + "Z" : ts);
}

// Relay timestamps are "YYYY-MM-DD HH:MM:SS" UTC; ChatMessage wants ISO
function toIso(ts) {
  const d = parseTimestamp(ts);
  return d && !Number.isNaN(d.getTime()) ? d.toISOString() : undefined;
}

function msgTime(m) {
  return m.received_at || m.sentAt || m.sent_at || "";
}

function formatTimeShort(ts) {
  const d = parseTimestamp(ts);
  if (!d) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getDateKey(ts) {
  const d = parseTimestamp(ts);
  if (!d) return "";
  // Use local date components - toISOString() returns UTC which disagrees with
  // the local date shown in the separator label, causing duplicate headings.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// -> [{ author, lines: [{ id, text, sentAt, msg }] }] for ChatMessage; `msg`
// keeps the original row so click handlers can hand it back
function groupMessages(messages, gapMs = GROUP_GAP_MS) {
  const groups = [];
  messages.forEach((msg, i) => {
    const tag = msg.battle_tag || "";
    const ts = msgTime(msg);
    const line = { id: `cc-${i}`, text: msg.text || msg.message || "", sentAt: toIso(ts), msg };
    const last = groups[groups.length - 1];
    let merge = false;
    if (gapMs > 0 && last && last.author.battleTag === tag) {
      const prev = parseTimestamp(last.lastTime);
      const cur = parseTimestamp(ts);
      merge = !prev || !cur || Math.abs(cur - prev) <= gapMs;
    }
    if (merge) {
      last.lines.push(line);
      last.lastTime = ts;
    } else {
      groups.push({
        author: { battleTag: tag, userName: msg.name || msg.user_name || tag.split("#")[0] },
        time: ts,
        lastTime: ts,
        lines: [line],
      });
    }
  });
  return groups;
}

/* ── ChatContext ────────────────────────────────────── */

/**
 * Chat message picker for the news digest and weekly magazine editors: a
 * filterable message list whose rows render through the ChatMessage
 * transcript variant, with per-line select / add / open-context affordances.
 *
 * @param {Array}    messages          - [{ name, text, score?, sentAt?, battle_tag?, received_at?, isMention? }]
 * @param {boolean}  loading           - Show loading state
 * @param {Function} onSelectionChange - (selectedItems) => void - fires on every selection toggle
 * @param {boolean}  selectable        - Enable multi-select checkboxes
 * @param {boolean}  expandable        - Rows open their surrounding context via onExpand
 * @param {Function} onExpand          - (message) => void
 * @param {string}   expandedTimestamp - received_at of the row currently open in the context pane
 * @param {boolean}  showScores        - Show relevance score column and the sort toggle
 * @param {string}   placeholder       - Filter input placeholder
 * @param {string}   highlight         - Text to highlight in messages
 * @param {Array}    targetTags        - battle_tags to tint as target players
 * @param {boolean}  compact           - Minimal mode: no filter input, no panel border
 * @param {boolean}  showDates         - Show date separators (auto-enabled when messages span multiple days)
 * @param {string}   dateRange         - Label shown at the end of the toolbar
 * @param {Function} onLoadMore        - Callback to fetch older messages (scroll down)
 * @param {boolean}  hasMore           - Whether older messages are available
 * @param {boolean}  loadingMore       - Whether loading older messages
 * @param {Function} onLoadNewer       - Callback to fetch newer messages (scroll up)
 * @param {boolean}  hasNewer          - Whether newer messages are available
 * @param {boolean}  loadingNewer      - Whether loading newer messages
 * @param {Array}    existingQuotes    - Quotes already in the digest ({ received_at }) - marked as added
 * @param {Function} onInstantAdd      - (message) => void - per-row add/remove button
 * @param {Function} isQuoteAdded      - (message) => boolean - state of that button
 */
const ChatContext = ({
  messages,
  loading = false,
  onSelectionChange,
  selectable = false,
  expandable = false,
  onExpand,
  expandedTimestamp,
  showScores = false,
  placeholder = "Filter messages...",
  highlight = "",
  targetTags,
  compact = false,
  showDates = false,
  dateRange,
  onLoadMore,
  hasMore = false,
  loadingMore = false,
  onLoadNewer,
  hasNewer = false,
  loadingNewer = false,
  existingQuotes = [],
  onInstantAdd,
  isQuoteAdded,
}) => {
  const [filter, setFilter] = useState("");
  const [sortBy, setSortBy] = useState("score"); // "score" or "date"
  const [msgFilter, setMsgFilter] = useState("all"); // "all" | "player" | "mentions"
  const [selected, setSelected] = useState(new Set());
  const [profiles, setProfiles] = useState(new Map());
  const targetSet = useMemo(() => new Set(targetTags || []), [targetTags]);
  const sentinelRef = useRef(null);
  const topSentinelRef = useRef(null);
  const listRef = useRef(null);

  // Detect whether messages span multiple days
  const spansMultipleDays = useMemo(() => {
    if (!messages || messages.length < 2) return false;
    const dates = new Set();
    for (const m of messages) {
      const dk = getDateKey(msgTime(m));
      if (dk) dates.add(dk);
      if (dates.size > 1) return true;
    }
    return false;
  }, [messages]);
  const useDates = showDates || spansMultipleDays;

  // Infinite scroll - observe sentinel at bottom of list (older messages)
  useEffect(() => {
    if (!onLoadMore || !hasMore || loadingMore) return;
    const el = sentinelRef.current;
    const root = listRef.current;
    if (!el || !root) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) onLoadMore(); },
      { root, rootMargin: "100px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [onLoadMore, hasMore, loadingMore]);

  // Infinite scroll - observe sentinel at top of list (newer messages)
  useEffect(() => {
    if (!onLoadNewer || !hasNewer || loadingNewer) return;
    const el = topSentinelRef.current;
    const root = listRef.current;
    if (!el || !root) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) onLoadNewer(); },
      { root, rootMargin: "100px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [onLoadNewer, hasNewer, loadingNewer]);

  // Reset selection when messages change
  useEffect(() => { setSelected(new Set()); }, [messages]);

  // Fetch profiles (avatars) for every author
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
        const ta = msgTime(a);
        const tb = msgTime(b);
        return ta > tb ? -1 : ta < tb ? 1 : 0;
      });
    }
    return result;
  }, [messages, filter, sortBy, msgFilter]);

  // Message -> original index lookup (avoids O(n^2) indexOf in the render loop)
  const messageIndex = useMemo(() => {
    const map = new Map();
    (messages || []).forEach((m, i) => map.set(m, i));
    return map;
  }, [messages]);

  const toggle = useCallback((origIdx) => {
    const next = new Set(selected);
    if (next.has(origIdx)) next.delete(origIdx);
    else next.add(origIdx);
    setSelected(next);
    if (onSelectionChange && messages) {
      const items = [...next].sort((a, b) => a - b).map((i) => messages[i]);
      onSelectionChange(items);
    }
  }, [selected, onSelectionChange, messages]);

  // Already-added quote timestamps
  const existingTimestamps = useMemo(() => {
    if (!existingQuotes || existingQuotes.length === 0) return new Set();
    return new Set(existingQuotes.map((q) => q.received_at || "").filter(Boolean));
  }, [existingQuotes]);

  const highlightQuery = highlight || filter;
  const groups = useMemo(() => groupMessages(filtered), [filtered]);

  /* ── Row rendering ─────────────────────────────── */

  const renderLine = (line) => {
    const msg = line.msg;
    const origIdx = messageIndex.get(msg) ?? -1;
    const isSelected = selected.has(origIdx);
    const receivedAt = msgTime(msg);
    const isExpanded = Boolean(expandedTimestamp) && receivedAt === expandedTimestamp;
    const isAdded = isQuoteAdded ? isQuoteAdded(msg) : existingTimestamps.has(receivedAt);
    const canExpand = (expandable || onExpand) && Boolean(onExpand) && Boolean(receivedAt);
    const clickable = canExpand || selectable;
    const onClick = clickable
      ? () => {
          if (canExpand) onExpand(msg);
          else if (selectable) toggle(origIdx);
        }
      : undefined;

    return (
      <span
        className={[
          "cc-row",
          clickable && "cc-row--clickable",
          isSelected && "cc-row--selected",
          isExpanded && "cc-row--expanded",
          isAdded && "cc-row--in-quotes",
          msg.isMention && "cc-row--mention",
        ].filter(Boolean).join(" ")}
        onClick={onClick}
        onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
      >
        {selectable && (
          <span className={`cc-check${isSelected ? " cc-check--active" : ""}`} />
        )}
        {showScores && (
          sortBy === "date" ? (
            <span className="cc-score cc-score--date">{formatTimeShort(receivedAt)}</span>
          ) : msg.score != null ? (
            <span className="cc-score">{msg.score}</span>
          ) : null
        )}
        {msg.isMention && <span className="cc-mention-tag">@</span>}
        <span className="cc-text">
          <HighlightText text={line.text} query={highlightQuery} />
        </span>
        {canExpand && !onInstantAdd && (
          <span className="cc-expand-icon">{isExpanded ? "▸ open" : "▸ context"}</span>
        )}
        {onInstantAdd && (
          <button
            type="button"
            className={`cc-add-btn${isAdded ? " cc-add-btn--added" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              onInstantAdd(msg);
            }}
            title={isAdded ? "Remove quote" : "Add quote"}
          >
            {isAdded ? <FiCheck size={12} /> : <FiPlus size={12} />}
          </button>
        )}
      </span>
    );
  };

  /* ── Render ─────────────────────────────────────── */

  let lastDateKey = null;

  return (
    <div className={compact ? "cc-panel cc-panel--compact" : "cc-panel"} onClick={compact ? (e) => e.stopPropagation() : undefined}>
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
            <Button
              $pill
              data-active={sortBy === "date" ? "true" : undefined}
              onClick={() => setSortBy((s) => s === "score" ? "date" : "score")}
              title={sortBy === "score" ? "Click to sort chronologically" : "Click to sort by relevance"}
            >
              {sortBy === "score" ? "Sort: relevance" : "Sort: newest"}
            </Button>
          )}
          {hasMentions && (
            <span className="cc-filter-tabs">
              {[
                { key: "all", label: "all" },
                { key: "player", label: "from" },
                { key: "mentions", label: "about" },
              ].map(({ key, label }) => (
                <Button
                  $pill
                  key={key}
                  data-active={msgFilter === key ? "true" : undefined}
                  onClick={() => setMsgFilter(key)}
                >
                  {label}
                </Button>
              ))}
            </span>
          )}
          {dateRange && (
            <span className="cc-date-range">{dateRange}</span>
          )}
        </div>
      )}

      {/* Loading */}
      {loading && !compact && messages == null && <div className="cc-loading"><PeonLoader size="sm" /></div>}
      {loading && (compact || messages != null) && <span className="cc-status">Loading...</span>}

      {/* Empty */}
      {!loading && messages && messages.length === 0 && (
        <span className="cc-status">No messages found</span>
      )}

      {/* Message list */}
      {groups.length > 0 && (
        <div className="cc-list" ref={listRef}>
          {hasNewer && (
            <div ref={topSentinelRef} className="cc-load-more cc-load-more--top">
              {loadingNewer && <span className="cc-status">Loading newer...</span>}
            </div>
          )}
          {groups.map((group, gi) => {
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
                <ChatMessage
                  variant="transcript"
                  group={group}
                  meta={{ avatarUrl: profiles.get(group.author.battleTag)?.pic }}
                  target={targetSet.size > 0 && targetSet.has(group.author.battleTag)}
                  renderLine={renderLine}
                />
              </React.Fragment>
            );
          })}
          {hasMore && (
            <div ref={sentinelRef} className="cc-load-more">
              {loadingMore && <span className="cc-status">Loading more...</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatContext;
