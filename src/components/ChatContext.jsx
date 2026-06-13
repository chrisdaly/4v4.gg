import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from "react";
import { FiChevronUp, FiChevronDown, FiPlus, FiCheck } from "react-icons/fi";
import { fetchAndCacheProfile, getCachedProfile } from "../lib/profileCache";
import { Button } from "./ui";
import PeonLoader from "./PeonLoader";
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

// Consecutive same-author messages merge into one group, but only when close
// in time — search results can put the same author hours apart back to back,
// and a single group header timestamp would misrepresent them.
const GROUP_GAP_MS = 5 * 60 * 1000;

function groupMessages(messages, gapMs = GROUP_GAP_MS) {
  const groups = [];
  for (const msg of messages) {
    const tag = msg.battle_tag || "";
    const ts = msg.sentAt || msg.received_at || msg.sent_at || "";
    const last = groups[groups.length - 1];
    let merge = false;
    if (gapMs > 0 && last && last.battle_tag === tag) {
      const prev = parseTimestamp(last.lastTime);
      const cur = parseTimestamp(ts);
      merge = !prev || !cur || Math.abs(cur - prev) <= gapMs;
    }
    if (merge) {
      last.lines.push(msg);
      last.lastTime = ts;
    } else {
      groups.push({
        battle_tag: tag,
        name: msg.name || msg.user_name || tag.split("#")[0],
        time: ts,
        lastTime: ts,
        lines: [msg],
      });
    }
  }
  return groups;
}

// Identity key for context messages — received_at alone collides when two
// users post in the same second, so include author and text.
function ctxMsgKey(m) {
  return `${m.received_at}|${m.battle_tag || ""}|${m.message || m.text || ""}`;
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
  // Use local date components — toISOString() returns UTC which disagrees with
  // the local date shown in the separator label, causing duplicate headings.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/* ── ChatContext ────────────────────────────────────── */

/**
 * Unified chat context component.
 *
 * @param {Array}    messages          - [{ name, text, score?, sentAt?, battle_tag?, received_at? }]
 * @param {boolean}  loading           - Show loading state
 * @param {Function} onApply           - (selectedItems) => void — multi-select apply button callback
 * @param {Function} onSelectionChange - (selectedItems) => void — fires on every selection toggle
 * @param {Object}   clearSelectionRef - Ref object; will be assigned a function to clear selection
 * @param {boolean}  selectable        - Enable multi-select checkboxes
 * @param {boolean}  expandable        - Enable context expansion on message click
 * @param {boolean}  showScores        - Show score column
 * @param {Function} applyLabel        - (count) => string — custom apply button label
 * @param {string}   placeholder       - Filter input placeholder
 * @param {string}   highlight         - Text to highlight in messages
 * @param {Array}    targetTags        - battle_tags to highlight as gold (target players)
 * @param {boolean}  compact           - Minimal mode: no filter input, no panel border
 * @param {boolean}  showDates         - Show full dates in timestamps (auto-enabled when messages span multiple days)
 * @param {Function} onLoadMore        - Callback to fetch older messages (scroll down)
 * @param {boolean}  hasMore           - Whether older messages are available
 * @param {boolean}  loadingMore       - Whether loading older messages
 * @param {Function} onLoadNewer       - Callback to fetch newer messages (scroll up)
 * @param {boolean}  hasNewer          - Whether newer messages are available
 * @param {boolean}  loadingNewer      - Whether loading newer messages
 * @param {any}      resetKey          - When this changes, expansion/selection state resets.
 *                                       Pass a stable per-search key so pagination appends
 *                                       don't collapse an open context panel.
 */
const ChatContext = ({
  messages,
  loading = false,
  onApply,
  onSelectionChange,
  clearSelectionRef,
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
  dateRange,
  onLoadMore,
  hasMore = false,
  loadingMore = false,
  onLoadNewer,
  hasNewer = false,
  loadingNewer = false,
  resetKey,
  existingQuotes = [],
  // Instant-add mode props
  instantAddMode = false,
  onInstantAdd,
  isQuoteAdded,
  // External expand handler (alternative to internal splitView)
  onExpand,
  expandedTimestamp,
  leftHeader = null,
  groupGapMs,
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
  const [loadingCtxEarlier, setLoadingCtxEarlier] = useState(false);
  const [loadingCtxLater, setLoadingCtxLater] = useState(false);
  const [ctxHasEarlier, setCtxHasEarlier] = useState(true);
  const [ctxHasLater, setCtxHasLater] = useState(true);
  // Sentinels stay disarmed until the origin message has been centered —
  // otherwise the top sentinel is visible on first paint and immediately
  // prepends earlier history, scrolling the origin out of view.
  const [ctxCentered, setCtxCentered] = useState(false);
  const pendingPrependRef = useRef(null);
  const matchRef = useRef(null);
  const sentinelRef = useRef(null);
  const topSentinelRef = useRef(null);
  const listRef = useRef(null);
  const contextScrollRef = useRef(null);
  const ctxTopSentinelRef = useRef(null);
  const ctxBottomSentinelRef = useRef(null);
  const ctxLoadCooldownRef = useRef(false);
  const ctxEarlierAttempts = useRef(0);
  const ctxLaterAttempts = useRef(0);
  const lastExpandedRef = useRef(null);

  // Infinite scroll — observe sentinel at bottom of list (older messages)
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

  // Infinite scroll — observe sentinel at top of list (newer messages)
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

  // Collapse the context panel when the underlying dataset changes — otherwise
  // a new search leaves the panel showing the previous conversation and the
  // expanded highlight lands on whatever row now sits at the stale index.
  // resetKey (when provided) keeps the panel open across pagination appends.
  const expansionKey = resetKey !== undefined ? resetKey : messages;
  const prevExpansionKeyRef = useRef(expansionKey);
  useEffect(() => {
    if (prevExpansionKeyRef.current === expansionKey) return;
    prevExpansionKeyRef.current = expansionKey;
    setExpandedMsg(null);
    setContextMessages([]);
    setSelectedCtx(new Set());
    setCtxCentered(false);
    lastExpandedRef.current = null;
  }, [expansionKey]);

  // Expose clear selection function via ref
  useEffect(() => {
    if (clearSelectionRef) {
      clearSelectionRef.current = () => {
        setSelected(new Set());
        setSelectedCtx(new Set());
        if (onSelectionChange) onSelectionChange([]);
      };
    }
  }, [clearSelectionRef, onSelectionChange]);

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
        return ta > tb ? -1 : ta < tb ? 1 : 0;
      });
    }
    return result;
  }, [messages, filter, sortBy, msgFilter]);

  // Toggle selection (only used in non-split view)
  const toggle = useCallback((origIdx) => {
    const next = new Set(selected);
    if (next.has(origIdx)) next.delete(origIdx);
    else next.add(origIdx);
    setSelected(next);
    // Fire onSelectionChange with selected items
    if (onSelectionChange && messages) {
      const items = [...next].sort((a, b) => a - b).map((i) => messages[i]);
      onSelectionChange(items);
    }
  }, [selected, onSelectionChange, messages]);

  // Toggle context selection (by index into contextMessages) - used in split view
  const toggleCtx = useCallback((idx) => {
    const next = new Set(selectedCtx);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setSelectedCtx(next);
    // Fire onSelectionChange with context selections
    if (onSelectionChange) {
      const items = [...next].sort((a, b) => a - b).map((i) => {
        const cm = contextMessages[i];
        return { name: cm.user_name || cm.name, text: cm.message || cm.text, received_at: cm.received_at };
      });
      onSelectionChange(items);
    }
  }, [selectedCtx, onSelectionChange, contextMessages]);

  // Total selection count (main + context)
  const totalSelected = selected.size + selectedCtx.size;

  // Message → original index lookup (avoids O(n²) indexOf in the render loop)
  const messageIndex = useMemo(() => {
    const map = new Map();
    (messages || []).forEach((m, i) => map.set(m, i));
    return map;
  }, [messages]);

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
    const origMsg = messages?.[origIdx];
    setExpandedMsg({
      idx: origIdx,
      receivedAt,
      text: origMsg ? (origMsg.text || origMsg.message || "") : "",
    });
    setContextPadding(5);
    setSelectedCtx(new Set());
    setCtxHasEarlier(true);
    setCtxHasLater(true);
    setCtxCentered(false);
    ctxLoadCooldownRef.current = false;
    // Reset infinite scroll attempt counters
    ctxEarlierAttempts.current = 0;
    ctxLaterAttempts.current = 0;
    fetchContext(receivedAt, 5);
  }, [expandedMsg, messages, fetchContext]);

  // Load earlier context messages (infinite scroll up)
  const loadCtxEarlier = useCallback(async () => {
    if (loadingCtxEarlier || loadingCtxLater || !ctxHasEarlier || ctxLoadCooldownRef.current || contextMessages.length === 0 || !contextWindow.start) return;
    ctxLoadCooldownRef.current = true;
    setLoadingCtxEarlier(true);
    try {
      // Increase shift based on attempts (15min, 30min, 60min, etc.)
      const shiftMinutes = 15 * (ctxEarlierAttempts.current + 1);
      const refDate = new Date(contextWindow.start.endsWith?.("Z") ? contextWindow.start : contextWindow.start + "Z");
      const shifted = new Date(refDate.getTime() - shiftMinutes * 60000);
      const shiftedStr = shifted.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "");
      const res = await fetch(
        `${RELAY_URL}/api/admin/messages/search/context?received_at=${encodeURIComponent(shiftedStr)}&padding=${Math.max(contextPadding, 10)}`
      );
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      if (data && data.length > 0) {
        const existingKeys = new Set(contextMessages.map(ctxMsgKey));
        const newMsgs = data.filter(m => !existingKeys.has(ctxMsgKey(m)));
        if (newMsgs.length > 0) {
          // Reset attempts on success
          ctxEarlierAttempts.current = 0;
          // Snapshot scroll metrics so the layout effect can keep the
          // viewport anchored after content is prepended above it
          const root = contextScrollRef.current;
          if (root) pendingPrependRef.current = { prevHeight: root.scrollHeight, prevTop: root.scrollTop };
          setContextMessages(prev => [...newMsgs, ...prev]);
          setContextWindow(prev => ({ ...prev, start: data[0].received_at }));
          const tags = [...new Set(newMsgs.map(m => m.battle_tag).filter(Boolean))];
          for (const tag of tags.filter(t => !contextAvatars.has(t))) {
            fetchAndCacheProfile(tag).then(profile => {
              setContextAvatars(prev => new Map(prev).set(tag, profile?.pic || null));
            });
          }
        } else {
          // No new messages, try shifting further next time (up to 3 attempts)
          ctxEarlierAttempts.current++;
          if (ctxEarlierAttempts.current >= 3) {
            setCtxHasEarlier(false);
          }
        }
      } else {
        // Empty response, try once more with larger shift
        ctxEarlierAttempts.current++;
        if (ctxEarlierAttempts.current >= 3) {
          setCtxHasEarlier(false);
        }
      }
    } catch {
      setCtxHasEarlier(false);
    }
    setLoadingCtxEarlier(false);
    setTimeout(() => { ctxLoadCooldownRef.current = false; }, 500); // 500ms cooldown
  }, [loadingCtxEarlier, loadingCtxLater, ctxHasEarlier, contextMessages, contextWindow, contextPadding, contextAvatars]);

  // Load later context messages (infinite scroll down)
  const loadCtxLater = useCallback(async () => {
    if (loadingCtxLater || loadingCtxEarlier || !ctxHasLater || ctxLoadCooldownRef.current || contextMessages.length === 0 || !contextWindow.end) return;
    ctxLoadCooldownRef.current = true;
    setLoadingCtxLater(true);
    try {
      // Increase shift based on attempts (15min, 30min, 60min, etc.)
      const shiftMinutes = 15 * (ctxLaterAttempts.current + 1);
      const refDate = new Date(contextWindow.end.endsWith?.("Z") ? contextWindow.end : contextWindow.end + "Z");
      const shifted = new Date(refDate.getTime() + shiftMinutes * 60000);
      const shiftedStr = shifted.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "");
      const res = await fetch(
        `${RELAY_URL}/api/admin/messages/search/context?received_at=${encodeURIComponent(shiftedStr)}&padding=${Math.max(contextPadding, 10)}`
      );
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      if (data && data.length > 0) {
        const existingKeys = new Set(contextMessages.map(ctxMsgKey));
        const newMsgs = data.filter(m => !existingKeys.has(ctxMsgKey(m)));
        if (newMsgs.length > 0) {
          // Reset attempts on success
          ctxLaterAttempts.current = 0;
          setContextMessages(prev => [...prev, ...newMsgs]);
          setContextWindow(prev => ({ ...prev, end: data[data.length - 1].received_at }));
          const tags = [...new Set(newMsgs.map(m => m.battle_tag).filter(Boolean))];
          for (const tag of tags.filter(t => !contextAvatars.has(t))) {
            fetchAndCacheProfile(tag).then(profile => {
              setContextAvatars(prev => new Map(prev).set(tag, profile?.pic || null));
            });
          }
        } else {
          // No new messages, try shifting further next time (up to 3 attempts)
          ctxLaterAttempts.current++;
          if (ctxLaterAttempts.current >= 3) {
            setCtxHasLater(false);
          }
        }
      } else {
        // Empty response, try once more with larger shift
        ctxLaterAttempts.current++;
        if (ctxLaterAttempts.current >= 3) {
          setCtxHasLater(false);
        }
      }
    } catch {
      setCtxHasLater(false);
    }
    setLoadingCtxLater(false);
    setTimeout(() => { ctxLoadCooldownRef.current = false; }, 500); // 500ms cooldown
  }, [loadingCtxLater, loadingCtxEarlier, ctxHasLater, contextMessages, contextWindow, contextPadding, contextAvatars]);

  // Keep the viewport anchored when earlier messages are prepended
  useLayoutEffect(() => {
    const pending = pendingPrependRef.current;
    if (!pending) return;
    pendingPrependRef.current = null;
    const root = contextScrollRef.current;
    if (!root) return;
    root.scrollTop = pending.prevTop + (root.scrollHeight - pending.prevHeight);
  }, [contextMessages]);

  // Legacy shiftContext for manual buttons (still available as fallback)
  const shiftContext = useCallback((direction) => {
    if (direction === "earlier") loadCtxEarlier();
    else loadCtxLater();
  }, [loadCtxEarlier, loadCtxLater]);

  // Infinite scroll for context panel — earlier (top)
  useEffect(() => {
    if (!expandedMsg || !ctxCentered || loadingCtxEarlier || contextLoading || !ctxHasEarlier) return;
    const el = ctxTopSentinelRef.current;
    const root = contextScrollRef.current;
    if (!el || !root) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadCtxEarlier(); },
      { root, rootMargin: "20px", threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [expandedMsg, ctxCentered, loadingCtxEarlier, contextLoading, ctxHasEarlier, loadCtxEarlier]);

  // Infinite scroll for context panel — later (bottom)
  useEffect(() => {
    if (!expandedMsg || !ctxCentered || loadingCtxLater || contextLoading || !ctxHasLater) return;
    const el = ctxBottomSentinelRef.current;
    const root = contextScrollRef.current;
    if (!el || !root) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadCtxLater(); },
      { root, rootMargin: "20px", threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [expandedMsg, ctxCentered, loadingCtxLater, contextLoading, ctxHasLater, loadCtxLater]);

  const handlePaddingChange = useCallback((delta) => {
    if (!expandedMsg) return;
    const next = Math.max(1, Math.min(60, contextPadding + delta));
    if (next === contextPadding) return;
    setContextPadding(next);
    setCtxHasEarlier(true);
    setCtxHasLater(true);
    setCtxCentered(false);
    ctxEarlierAttempts.current = 0;
    ctxLaterAttempts.current = 0;
    lastExpandedRef.current = null; // re-center on the refetched window
    fetchContext(expandedMsg.receivedAt, next);
  }, [expandedMsg, contextPadding, fetchContext]);

  // Center the origin message when context initially loads (not during
  // infinite scroll). Must be instant and must finish BEFORE the sentinels
  // arm (ctxCentered) — a smooth scroll leaves the top sentinel visible long
  // enough to prepend earlier history and lose the origin off-screen.
  useLayoutEffect(() => {
    if (contextMessages.length === 0 || contextLoading || !expandedMsg) return;
    const expandKey = `${expandedMsg.idx}-${expandedMsg.receivedAt}`;
    if (lastExpandedRef.current === expandKey) return;
    lastExpandedRef.current = expandKey;
    const root = contextScrollRef.current;
    const target = matchRef.current;
    if (root && target) {
      // Scroll within the panel only — scrollIntoView would also scroll the page
      const rootRect = root.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      root.scrollTop += (targetRect.top - rootRect.top) - (root.clientHeight - targetRect.height) / 2;
    } else if (target) {
      // Inline (non-split) mode has no panel ref
      target.scrollIntoView({ behavior: "auto", block: "center" });
    } else if (root) {
      // Origin missing from the window (e.g. deleted) — show the middle,
      // which is the closest content to the clicked timestamp
      root.scrollTop = (root.scrollHeight - root.clientHeight) / 2;
    }
    setCtxCentered(true);
  }, [contextMessages, contextLoading, expandedMsg]);

  // Determine the highlight query — use `highlight` prop, or fall back to filter
  const highlightQuery = highlight || filter;

  // Apply button label
  const label = applyLabel
    ? applyLabel(totalSelected)
    : `Use ${totalSelected} item${totalSelected !== 1 ? "s" : ""}`;

  // Match check for context origin highlighting — compares against the stored
  // center point (not messages[idx]) so re-centering on a context message works
  const isOriginMsg = useCallback((cm) => {
    if (!expandedMsg) return false;
    return cm.received_at === expandedMsg.receivedAt &&
           (cm.message || cm.text || "") === (expandedMsg.text || "");
  }, [expandedMsg]);

  // Build set of selected message timestamps for highlighting in context panel
  const selectedTimestamps = useMemo(() => {
    if (!messages || selected.size === 0) return new Set();
    const ts = new Set();
    for (const idx of selected) {
      const m = messages[idx];
      if (m) ts.add(m.received_at || m.sentAt || m.sent_at || "");
    }
    return ts;
  }, [messages, selected]);

  // Build set of already-added quote timestamps
  const existingTimestamps = useMemo(() => {
    if (!existingQuotes || existingQuotes.length === 0) return new Set();
    return new Set(existingQuotes.map((q) => q.received_at || "").filter(Boolean));
  }, [existingQuotes]);

  const isSelectedInContext = useCallback((cm) => {
    if (selectedTimestamps.size === 0) return false;
    return selectedTimestamps.has(cm.received_at || "");
  }, [selectedTimestamps]);

  const isAlreadyAdded = useCallback((cm) => {
    if (existingTimestamps.size === 0) return false;
    return existingTimestamps.has(cm.received_at || "");
  }, [existingTimestamps]);

  /* ── Render helpers ──────────────────────────────── */

  // Context messages are only clickable when a selection consumer exists
  // (quote picking); otherwise they're inert \u2014 scrolling loads more history,
  // same as the chat page.
  const ctxSelectable = !!(onApply || onSelectionChange);

  const contextPanel = expandable && expandedMsg && (
    <div className="cc-context-side">
      {contextLoading ? (
        <div className="cc-loading"><PeonLoader size="sm" /></div>
      ) : (
        <div className="cc-context-scroll" ref={contextScrollRef}>
          {/* Top sentinel for infinite scroll (earlier) */}
          <div ref={ctxTopSentinelRef} className="cc-ctx-sentinel">
            {loadingCtxEarlier && <span className="cc-status">Loading earlier...</span>}
          </div>
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
                    const alreadyAdded = isAlreadyAdded(cl);
                    const isOrigin = isOriginMsg(cl);
                    return (
                      <div
                        key={cli}
                        className={`cc-msg ${ctxSelectable ? "cc-msg--selectable" : ""} ${isOrigin ? "cc-msg--origin" : ""} ${isCtxSelected ? "cc-msg--selected" : ""} ${alreadyAdded ? "cc-msg--in-quotes" : ""}`}
                        onClick={ctxSelectable ? (e) => { e.stopPropagation(); toggleCtx(ctxIdx); } : undefined}
                      >
                        {ctxSelectable && (
                          <span className={`cc-check${isCtxSelected ? " cc-check--active" : ""}`}>{alreadyAdded && !isCtxSelected ? "\u2713" : ""}</span>
                        )}
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
          {/* Bottom sentinel for infinite scroll (later) */}
          <div ref={ctxBottomSentinelRef} className="cc-ctx-sentinel">
            {loadingCtxLater && <span className="cc-status">Loading later...</span>}
          </div>
        </div>
      )}
    </div>
  );

  const messageList = (
    <>
      {/* Loading */}
      {loading && !compact && messages == null && <div className="cc-loading"><PeonLoader size="sm" /></div>}
      {loading && (compact || messages != null) && <span className="cc-status">Loading...</span>}

      {/* Empty */}
      {!loading && messages && messages.length === 0 && (
        <span className="cc-status">No messages found</span>
      )}

      {/* Message list */}
      {filtered.length > 0 && (
        <div className="cc-list" ref={listRef}>
          {/* Top sentinel for loading newer messages */}
          {hasNewer && (
            <div ref={topSentinelRef} className="cc-load-more cc-load-more--top">
              {loadingNewer && <span className="cc-status">Loading newer...</span>}
            </div>
          )}
          {(() => {
            const groups = groupMessages(filtered, groupGapMs);
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
                    const origIdx = messageIndex.get(line) ?? -1;
                    const text = line.text || line.message || "";
                    const isSelected = selected.has(origIdx);
                    const isExpanded = expandedMsg?.idx === origIdx;
                    const receivedAt = line.received_at || line.sentAt || line.sent_at || "";
                    const alreadyAdded = isAlreadyAdded(line);

                    // In instant-add mode, check if this message is already added
                    const isInstantAdded = instantAddMode && isQuoteAdded ? isQuoteAdded(line) : false;
                    // Check if this message matches the external expandedTimestamp
                    const isExternalExpanded = expandedTimestamp && receivedAt === expandedTimestamp;

                    return (
                      <React.Fragment key={origIdx}>
                        <div
                          className={[
                            "cc-msg",
                            (selectable && !splitView || instantAddMode) && "cc-msg--selectable",
                            isSelected && "cc-msg--selected",
                            (expandable || onExpand) && !instantAddMode && "cc-msg--expandable",
                            (isExpanded || isExternalExpanded) && "cc-msg--expanded",
                            line.isMention && "cc-msg--mention",
                            (alreadyAdded || isInstantAdded) && "cc-msg--in-quotes",
                          ].filter(Boolean).join(" ")}
                          onClick={() => {
                            if (instantAddMode && onInstantAdd) {
                              // Instant-add mode: click to toggle quote
                              onInstantAdd(line);
                            } else if (onExpand && receivedAt) {
                              // External expand handler
                              onExpand(line);
                            } else if (expandable && splitView && receivedAt) {
                              handleExpand(origIdx, receivedAt);
                            } else if (selectable && !splitView) {
                              toggle(origIdx);
                            }
                          }}
                        >
                          {/* Show checkmark for instant-add mode or selection mode */}
                          {instantAddMode ? (
                            <span className={`cc-check${isInstantAdded ? " cc-check--active" : ""}`} />
                          ) : selectable && !splitView ? (
                            <span className={`cc-check${isSelected ? " cc-check--active" : ""}`} />
                          ) : null}
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
                          {/* Add button when onInstantAdd is provided but not in instantAddMode */}
                          {!instantAddMode && onInstantAdd && (
                            <button
                              className={`cc-add-btn${isInstantAdded ? " cc-add-btn--added" : ""}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                onInstantAdd(line);
                              }}
                              title={isInstantAdded ? "Remove quote" : "Add quote"}
                            >
                              {isInstantAdded ? <FiCheck size={12} /> : <FiPlus size={12} />}
                            </button>
                          )}
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

          {/* Infinite scroll sentinel (bottom - older messages) */}
          {hasMore && (
            <div ref={sentinelRef} className="cc-load-more">
              {loadingMore && <span className="cc-status">Loading more...</span>}
            </div>
          )}
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
              {sortBy === "score" ? "Sort: relevance" : "Sort: newest"}
            </button>
          )}
          {hasMentions && (
            <span className="cc-filter-tabs">
              {[
                { key: "all", label: "all" },
                { key: "player", label: "from" },
                { key: "mentions", label: "about" },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  className={`cc-filter-tab${msgFilter === key ? " cc-filter-tab--active" : ""}`}
                  onClick={() => setMsgFilter(key)}
                >
                  {label}
                </button>
              ))}
            </span>
          )}
          {dateRange && (
            <span className="cc-date-range">{dateRange}</span>
          )}
        </div>
      )}

      {splitView ? (
        // The right column only takes space while a conversation is open;
        // the DOM stays stable either way so the list keeps its scroll position
        <div className={`cc-split-layout${expandedMsg ? "" : " cc-split-layout--collapsed"}`}>
          <div className="cc-split-col-header cc-split-col-header--left">
            {leftHeader && (
              <>
                <span className="cc-col-label">Results</span>
                {leftHeader}
              </>
            )}
          </div>
          <div className="cc-split-col-header cc-split-col-header--right">
            <span className={`cc-col-label${expandedMsg ? " cc-col-label--conversation" : " cc-col-label--ghost"}`}>
              {expandedMsg ? "Conversation" : "Context"}
            </span>
            {expandedMsg && (
              <button
                className="cc-col-close"
                title="Close conversation"
                onClick={() => {
                  setExpandedMsg(null);
                  setContextMessages([]);
                  setSelectedCtx(new Set());
                  setCtxCentered(false);
                }}
              >×</button>
            )}
          </div>
          <div className="cc-split-left">{messageList}</div>
          <div className={`cc-split-right${expandedMsg ? " cc-split-right--active" : ""}`}>
            {contextPanel}
          </div>
        </div>
      ) : messageList}
    </div>
  );
};

export default ChatContext;
