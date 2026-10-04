import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useHistory, useLocation } from "react-router-dom";
import styled from "styled-components";
import { IoSearch } from "react-icons/io5";
import { Button, PlayerSearch, Skeleton, PageLayout, PageHero } from "../components/ui";
import ChatMessage from "../components/chat/ChatMessage";
import { formatTime } from "../lib/useChatMessages";
import { fetchAndCacheProfile, getCachedProfile } from "../lib/profileCache";
import { searchLadder, getPlayerProfile } from "../lib/api";
import { raceMapping } from "../lib/constants";
import { RELAY_URL } from "../lib/relay";

/**
 * /search - the chat archive, searched. The field on /chat filters the live
 * stream you are looking at; this page asks the relay's public
 * GET /api/chat/search for lines nobody has loaded, back to the start of the
 * archive, and every hit links into /chat at that message.
 */

const HISTORY_KEY = "4v4gg_chat_search_history";
const MAX_HISTORY = 12;
const PAGE_SIZE = 50;
// Search results can put the same author hours apart back to back, so a group
// only merges lines that are actually close in time
const GROUP_GAP_MS = 5 * 60 * 1000;

// How many minutes either side a context drawer shows, and how far "wider" goes
const PAD_STEPS = [3, 10, 30];
const DEFAULT_PAD = PAD_STEPS[0];
const contextKey = (msgId, minutes) => `${msgId}:${minutes}`;

const SINCE_OPTIONS = [
  { key: "24h", label: "24h" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "all", label: "All time" },
];
const DEFAULT_SINCE = "7d";
const SINCE_KEYS = new Set(SINCE_OPTIONS.map((o) => o.key));
const sinceLabel = (key) => SINCE_OPTIONS.find((o) => o.key === key)?.label || key;

/**
 * The search a URL asks for: ?q= message text, ?player= battleTag or name
 * prefix, ?since= one of the pills. While this page was folded into /chat the
 * links carried ?q= with ?qmode=player and ?qsince=, so those still land.
 */
export function paramsFromSearch(search) {
  const sp = new URLSearchParams(search);
  const raw = (sp.get("q") || "").trim();
  const legacyPlayer = sp.get("qmode") === "player";
  const sinceRaw = sp.has("since") ? sp.get("since") : sp.get("qsince");
  // the old page's empty qsince meant "all time"
  const since = sp.has("qsince") && sinceRaw === "" ? "all" : sinceRaw;
  return {
    q: legacyPlayer ? "" : raw,
    player: (legacyPlayer ? raw : sp.get("player") || "").trim(),
    since: SINCE_KEYS.has(since) ? since : DEFAULT_SINCE,
  };
}

function searchToUrl({ q, player, since }) {
  const sp = new URLSearchParams();
  if (q) sp.set("q", q);
  if (player) sp.set("player", player);
  if (since && since !== DEFAULT_SINCE) sp.set("since", since);
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

// Relay timestamps are "YYYY-MM-DD HH:MM:SS" UTC
function parseTs(ts) {
  if (!ts) return null;
  const d = new Date(typeof ts === "string" && !ts.includes("T") ? `${ts.replace(" ", "T")}Z` : ts);
  return Number.isNaN(d.getTime()) ? null : d;
}

const toIso = (ts) => parseTs(ts)?.toISOString();

// Local date, so the divider label and the key it groups by agree
function dayKey(ts) {
  const d = parseTs(ts);
  if (!d) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dayLabel(ts) {
  const d = parseTs(ts);
  if (!d) return "";
  const today = dayKey(new Date());
  if (dayKey(d) === today) return "Today";
  return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

function loadHistory() {
  try {
    const raw = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    if (!Array.isArray(raw)) return [];
    // entries used to be bare query strings
    return raw
      .map((h) => (typeof h === "string" ? { q: h, player: "" } : { q: h.q || "", player: h.player || "" }))
      .filter((h) => h.q || h.player)
      .slice(0, MAX_HISTORY);
  } catch {
    return [];
  }
}

function saveHistory(entries) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
  } catch { /* private mode, history is a convenience */ }
}

const historyKeyOf = (h) => `${h.player.toLowerCase()}|${h.q.toLowerCase()}`;

/* Rows come back newest first; day dividers and author groups are built in
   that order so paging just appends. A context window is one stretch of one
   day, so it asks for no dividers and marks the line it was opened from. */
export function buildResultItems(rows, { dividers = true, prefix = "hit", markId = null } = {}) {
  const items = [];
  let day = null;
  let group = null;
  rows.forEach((row, i) => {
    const ts = row.received_at || row.sent_at;
    const key = dayKey(ts);
    if (dividers && key !== day) {
      day = key;
      group = null;
      items.push({ type: "day", key: `day-${key}-${i}`, label: dayLabel(ts) });
    }
    const tag = row.battle_tag || "";
    const line = {
      id: `${prefix}-${row.id ?? i}-${i}`,
      text: row.message || "",
      sentAt: toIso(ts),
      msgId: row.id ?? null,
      receivedAt: row.received_at || null,
      // the relay's stored English for a non-Latin line; ChatMessage renders
      // it under the message
      translation: row.translation || undefined,
      highlight: markId != null && String(row.id) === String(markId),
    };
    const close = group && Math.abs((parseTs(ts) || 0) - (parseTs(group.lastTs) || 0)) <= GROUP_GAP_MS;
    if (group && group.tag === tag && close) {
      group.group.lines.push(line);
      group.lastTs = ts;
      return;
    }
    group = {
      type: "group",
      key: `${prefix}-grp-${row.id ?? i}-${i}`,
      tag,
      lastTs: ts,
      group: {
        author: { battleTag: tag, userName: row.user_name || tag.split("#")[0], clanTag: row.clan_tag || "" },
        lines: [line],
      },
    };
    items.push(group);
  });
  return items;
}

/* ── Layout ──────────────────────────────────────────── */

const Form = styled.form`
  position: relative;
  display: flex;
  gap: var(--space-2);
  align-items: center;
  margin-bottom: var(--space-3);
`;

const QueryWrap = styled.div`
  position: relative;
  flex: 1;
  min-width: 0;
`;

const PlayerChip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: 6px var(--space-3);
  border: 1px solid rgba(var(--gold-muted-rgb), 0.45);
  border-radius: var(--radius-full);
  background: var(--gold-tint-subtle);
  color: var(--gold);
  font-family: var(--font-display);
  font-size: var(--text-xs);
  cursor: pointer;
  flex-shrink: 0;

  &:hover {
    border-color: var(--gold);
  }
`;

const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-bottom: var(--space-3);
`;

const RowLabel = styled.span`
  font: var(--text-xxs) var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--grey-light);
  margin-right: var(--space-1);
`;

const Pill = styled(Button).attrs({ $pill: true, type: "button" })`
  ${(p) => p.$active && `
    border-color: var(--gold);
    color: var(--gold);
    background: var(--gold-tint-subtle);
  `}
`;

const HistoryChip = styled(Pill)`
  text-transform: none;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const HistoryX = styled.span`
  margin-left: var(--space-2);
  opacity: 0.5;

  &:hover {
    opacity: 1;
    color: var(--red);
  }
`;

const Meta = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
  padding: var(--space-3) 0;
  border-top: 1px solid var(--panel-border);
  margin-top: var(--space-4);
`;

const ErrorNote = styled.span`
  color: var(--red);
`;

const Results = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
`;

const DayDivider = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin: var(--space-4) 0 var(--space-2);
  font: var(--text-xxs) var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--grey-light);

  &::after {
    content: "";
    flex: 1;
    height: 1px;
    background: var(--panel-border);
  }
`;

const Hit = styled.div`
  padding: var(--space-2);
  border-radius: var(--radius-sm);

  &:hover {
    background: var(--surface-2);
  }

  mark {
    background: rgba(252, 219, 51, 0.22);
    color: var(--white);
    border-radius: 2px;
  }
`;

/* The hover affordance on a hit: opens the minutes around it in place, so
   the result list never goes anywhere */
const ContextButton = styled.button`
  margin-left: var(--space-2);
  padding: 0;
  border: none;
  background: none;
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  color: var(--gold);
  white-space: nowrap;
  cursor: pointer;
  opacity: ${(p) => (p.$open ? 1 : 0)};
  transition: opacity var(--transition);

  ${Hit}:hover &,
  &:focus-visible {
    opacity: 0.9;
  }

  &:hover {
    opacity: 1;
    text-decoration: underline;
  }
`;

const Drawer = styled.div`
  margin: var(--space-2) 0 var(--space-3);
  padding: var(--space-2) var(--space-3);
  border-left: 2px solid rgba(var(--gold-muted-rgb), 0.5);
  background: var(--surface-1);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
`;

const DrawerHead = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
  padding-bottom: var(--space-2);
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  color: var(--grey-light);
  text-transform: uppercase;
  letter-spacing: 0.08em;
`;

const DrawerAction = styled.button`
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  color: var(--gold);
  cursor: pointer;

  &:hover:not(:disabled) {
    text-decoration: underline;
  }

  &:disabled {
    color: var(--grey-mid);
    cursor: default;
  }
`;

const DrawerLink = styled(Link)`
  font: inherit;
  color: var(--gold);
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;

const DrawerClose = styled(DrawerAction)`
  margin-left: auto;
`;

const DrawerNote = styled.div`
  padding: var(--space-2) 0;
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  color: var(--grey-light);
`;

const Empty = styled.div`
  padding: var(--space-8) var(--space-4);
  text-align: center;
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
`;

const MoreWrap = styled.div`
  display: flex;
  justify-content: center;
  padding: var(--space-4) 0;
`;

const SuggestIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  color: var(--gold);
`;

function Highlight({ text, query }) {
  if (!query || query.length < 2) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = String(text).split(new RegExp(`(${escaped})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? <mark key={i}>{part}</mark> : part
  );
}

export default function ChatSearchPage() {
  const routerHistory = useHistory();
  const location = useLocation();

  const [text, setText] = useState("");
  const [player, setPlayer] = useState("");
  const [since, setSince] = useState(DEFAULT_SINCE);
  const [ran, setRan] = useState(null); // the search the results belong to
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [history, setHistory] = useState(loadHistory);
  const [profiles, setProfiles] = useState(new Map());
  // The hit whose surrounding minutes are open, and what has been fetched
  const [openHit, setOpenHit] = useState(null);
  const [pad, setPad] = useState(DEFAULT_PAD);
  const [contexts, setContexts] = useState(new Map());

  // Player typeahead, same source as the navbar's player search
  const [suggests, setSuggests] = useState([]);
  const [showSuggests, setShowSuggests] = useState(false);
  const [suggProfiles, setSuggProfiles] = useState({});
  const suggProfilesRef = useRef(suggProfiles);
  useEffect(() => { suggProfilesRef.current = suggProfiles; }, [suggProfiles]);
  const formRef = useRef(null);
  // The text we just searched for: keeps the dropdown shut on it
  const lastRanTextRef = useRef("");

  const addToHistory = useCallback((entry) => {
    if (!entry.q && !entry.player) return;
    setHistory((prev) => {
      const next = [entry, ...prev.filter((h) => historyKeyOf(h) !== historyKeyOf(entry))].slice(0, MAX_HISTORY);
      saveHistory(next);
      return next;
    });
  }, []);

  const removeFromHistory = useCallback((entry) => {
    setHistory((prev) => {
      const next = prev.filter((h) => historyKeyOf(h) !== historyKeyOf(entry));
      saveHistory(next);
      return next;
    });
  }, []);

  const runSearch = useCallback(async (search, offset = 0) => {
    const q = (search.q || "").trim();
    const who = (search.player || "").trim();
    if (q.length < 2 && who.length < 2) return;
    const windowKey = SINCE_KEYS.has(search.since) ? search.since : DEFAULT_SINCE;
    const next = { q, player: who, since: windowKey };

    lastRanTextRef.current = q;
    setShowSuggests(false);
    if (offset === 0) {
      setRan(next);
      setLoading(true);
      addToHistory({ q, player: who });
      const url = searchToUrl(next);
      if (url !== location.search) routerHistory.replace({ search: url });
    } else {
      setLoadingMore(true);
    }
    setError(false);

    try {
      const sp = new URLSearchParams({ since: windowKey, limit: String(PAGE_SIZE), offset: String(offset) });
      if (q) sp.set("q", q);
      if (who) sp.set("player", who);
      const res = await fetch(`${RELAY_URL}/api/chat/search?${sp}`);
      if (!res.ok) throw new Error(`relay said ${res.status}`);
      const data = await res.json();
      const page = data.results || [];
      setResults((prev) => (offset === 0 ? page : [...prev, ...page]));
      setTotal(typeof data.total === "number" ? data.total : null);
    } catch {
      // a failed page fetch should not wipe results already on screen
      if (offset === 0) {
        setResults([]);
        setTotal(null);
      }
      setError(true);
    }
    setLoading(false);
    setLoadingMore(false);
  }, [addToHistory, location.search, routerHistory]);

  // The search in the URL on first mount (a shared link, an old /search link)
  const didInitRef = useRef(false);
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    const initial = paramsFromSearch(location.search);
    setText(initial.q);
    setPlayer(initial.player);
    setSince(initial.since);
    if (initial.q.length >= 2 || initial.player.length >= 2) runSearch(initial);
  }, [location.search, runSearch]);

  const submit = (e) => {
    e?.preventDefault();
    runSearch({ q: text, player, since });
  };

  const pickPlayer = (tag) => {
    if (!tag) return;
    setPlayer(tag);
    setText("");
    setSuggests([]);
    runSearch({ q: "", player: tag, since });
  };

  const clearPlayer = () => {
    setPlayer("");
    if (ran) runSearch({ q: ran.q, player: "", since });
  };

  const pickSince = (key) => {
    if (key === since) return;
    setSince(key);
    if (ran) runSearch({ ...ran, since: key });
  };

  const clearAll = () => {
    setText("");
    setPlayer("");
    setRan(null);
    setResults([]);
    setTotal(null);
    setError(false);
    setShowSuggests(false);
    routerHistory.replace({ search: "" });
  };

  // Debounced player suggestions while typing
  useEffect(() => {
    const q = text.trim();
    if (q.length < 3 || q === lastRanTextRef.current) {
      setSuggests([]);
      setShowSuggests(false);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const found = await searchLadder(q);
        if (cancelled) return;
        const seen = new Set();
        const picks = [];
        for (const r of Array.isArray(found) ? found : []) {
          const tag = r.playersInfo?.[0]?.battleTag || r.player?.playerIds?.[0]?.battleTag;
          if (!tag || seen.has(tag)) continue;
          seen.add(tag);
          picks.push({ tag, race: r.player?.race, wins: r.player?.wins || 0, losses: r.player?.losses || 0 });
          if (picks.length === 5) break;
        }
        setSuggests(picks);
        setShowSuggests(true);
        for (const p of picks) {
          if (suggProfilesRef.current[p.tag]) continue;
          getPlayerProfile(p.tag).then((profile) => {
            if (!cancelled) setSuggProfiles((prev) => (prev[p.tag] ? prev : { ...prev, [p.tag]: profile }));
          });
        }
      } catch { /* suggestions are best-effort */ }
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [text]);

  // Close the dropdown on an outside click
  useEffect(() => {
    if (!showSuggests) return;
    const handler = (e) => {
      if (formRef.current && !formRef.current.contains(e.target)) setShowSuggests(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showSuggests]);

  const items = useMemo(() => buildResultItems(results), [results]);

  // Avatars and flags for the authors on screen
  const loadProfiles = useCallback((rows) => {
    const tags = new Set(rows.map((r) => r.battle_tag).filter(Boolean));
    for (const tag of tags) {
      const cached = getCachedProfile(tag);
      if (cached) {
        setProfiles((prev) => (prev.get(tag) ? prev : new Map(prev).set(tag, cached)));
      } else {
        fetchAndCacheProfile(tag).then((p) => {
          if (p) setProfiles((prev) => new Map(prev).set(tag, p));
        });
      }
    }
  }, []);

  useEffect(() => { loadProfiles(results); }, [results, loadProfiles]);

  /* ── Context in place ──────────────────────────────────
     A hit on its own rarely says what it meant. Opening one loads the
     minutes around it under that line: the results keep their scroll, their
     paging and their place, and closing it costs one click. */

  const loadContext = useCallback(async (hit, minutes) => {
    const key = contextKey(hit.msgId, minutes);
    if (contexts.get(key)?.rows) return;
    setContexts((prev) => new Map(prev).set(key, { loading: true, rows: null, error: false }));
    try {
      const sp = new URLSearchParams({ received_at: hit.receivedAt, padding: String(minutes) });
      const res = await fetch(`${RELAY_URL}/api/admin/messages/search/context?${sp}`);
      if (!res.ok) throw new Error(`relay said ${res.status}`);
      const rows = await res.json();
      const list = Array.isArray(rows) ? rows : [];
      setContexts((prev) => new Map(prev).set(key, { loading: false, rows: list, error: false }));
      loadProfiles(list);
    } catch {
      setContexts((prev) => new Map(prev).set(key, { loading: false, rows: [], error: true }));
    }
  }, [contexts, loadProfiles]);

  const toggleContext = useCallback((line) => {
    if (openHit?.msgId === line.msgId) {
      setOpenHit(null);
      return;
    }
    const hit = { msgId: line.msgId, receivedAt: line.receivedAt };
    setOpenHit(hit);
    setPad(DEFAULT_PAD);
    loadContext(hit, DEFAULT_PAD);
  }, [openHit, loadContext]);

  const widenContext = useCallback(() => {
    if (!openHit) return;
    const next = PAD_STEPS[Math.min(PAD_STEPS.indexOf(pad) + 1, PAD_STEPS.length - 1)];
    if (next === pad) return;
    setPad(next);
    loadContext(openHit, next);
  }, [openHit, pad, loadContext]);

  const closeContext = useCallback(() => setOpenHit(null), []);

  // Esc closes the open context, the way it closes the day picker on /chat
  useEffect(() => {
    if (!openHit) return;
    const onKey = (e) => { if (e.key === "Escape") setOpenHit(null); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openHit]);

  const renderLine = useCallback((line) => (
    <>
      <Highlight text={line.text} query={ran?.q || ""} />
      {line.msgId != null && line.receivedAt && (
        <ContextButton
          type="button"
          $open={openHit?.msgId === line.msgId}
          aria-expanded={openHit?.msgId === line.msgId}
          title="Show the minutes around this line, here"
          onClick={() => toggleContext(line)}
        >
          {openHit?.msgId === line.msgId ? "hide context" : "context"}
        </ContextButton>
      )}
    </>
  ), [ran, openHit, toggleContext]);

  const renderAfterLine = useCallback((line) => {
    if (!openHit || openHit.msgId !== line.msgId) return null;
    const entry = contexts.get(contextKey(openHit.msgId, pad));
    const rows = entry?.rows || [];
    return (
      <Drawer data-context-drawer>
        <DrawerHead>
          <span>
            &plusmn;{pad} min &middot; {formatTime(line.sentAt)}
          </span>
          <DrawerAction type="button" disabled={pad >= PAD_STEPS[PAD_STEPS.length - 1]} onClick={widenContext}>
            wider
          </DrawerAction>
          <DrawerLink
            to={`/chat?m=${encodeURIComponent(line.msgId)}&at=${encodeURIComponent(line.receivedAt)}`}
            title="Open this line in the live chat stream"
          >
            open in chat &#8599;
          </DrawerLink>
          <DrawerClose type="button" onClick={closeContext} aria-label="Close context">
            close &times;
          </DrawerClose>
        </DrawerHead>
        {entry?.loading && <DrawerNote>Loading the conversation...</DrawerNote>}
        {entry?.error && <DrawerNote>The relay did not answer. Try that again.</DrawerNote>}
        {!entry?.loading && !entry?.error && rows.length === 0 && <DrawerNote>Nothing else was said around this.</DrawerNote>}
        {buildResultItems(rows, { dividers: false, prefix: `ctx-${openHit.msgId}`, markId: openHit.msgId }).map((item) => (
          <ChatMessage
            key={item.key}
            variant="transcript"
            group={item.group}
            meta={{
              avatarUrl: profiles.get(item.tag)?.pic || null,
              countryCode: profiles.get(item.tag)?.country || null,
            }}
          />
        ))}
      </Drawer>
    );
  }, [openHit, contexts, pad, profiles, widenContext, closeContext]);

  const hasMore = results.length > 0 && (total == null ? results.length % PAGE_SIZE === 0 : results.length < total);

  const metaLine = ran && !loading && (
    <Meta>
      {total != null && total > results.length
        ? `${results.length} of ${total} lines`
        : `${results.length} line${results.length === 1 ? "" : "s"}`}
      {ran.q && ` for "${ran.q}"`}
      {ran.player && ` by ${ran.player}`}
      {` · ${ran.since === "all" ? "whole archive" : `last ${sinceLabel(ran.since)}`}`}
      {error && <ErrorNote> &middot; the search request failed, try again</ErrorNote>}
    </Meta>
  );

  return (
    <PageLayout
      maxWidth="900px"
      header={
        <PageHero
          eyebrow="Chat"
          title="Chat search"
          lead="Search the whole channel archive: what somebody said, who said it, and when. Every hit opens in the stream."
        />
      }
    >
      <Form onSubmit={submit} ref={formRef} role="search">
        {player && (
          <PlayerChip type="button" onClick={clearPlayer} title="Stop filtering by this player">
            {player}
            <HistoryX>&times;</HistoryX>
          </PlayerChip>
        )}
        <QueryWrap>
          <PlayerSearch
            $fullWidth
            value={text}
            onChange={(e) => setText(e.target.value)}
            onClear={() => setText("")}
            onKeyDown={(e) => e.key === "Escape" && setShowSuggests(false)}
            placeholder={player ? `Narrow ${player.split("#")[0]}'s lines` : "Search messages or a player"}
            aria-label="Search chat messages"
            autoFocus
          />
          {showSuggests && (suggests.length > 0 || text.trim().length >= 3) && (
            <div className="navbar-search-dropdown" style={{ left: 0, right: "auto", width: "100%" }}>
              <button type="button" className="navbar-search-result" onClick={submit}>
                <SuggestIcon><IoSearch size={16} /></SuggestIcon>
                <span className="navbar-search-info">
                  <span className="navbar-search-name-row">
                    <span className="navbar-search-meta">messages containing &ldquo;{text.trim()}&rdquo;</span>
                  </span>
                </span>
              </button>
              {suggests.map((p) => {
                const profile = suggProfiles[p.tag];
                const avatarUrl = profile?.profilePicUrl;
                const [name, hashNum] = p.tag.split("#");
                return (
                  <button key={p.tag} type="button" className="navbar-search-result" onClick={() => pickPlayer(p.tag)}>
                    <span className="navbar-search-avatar-wrap">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="" className="navbar-search-avatar" />
                      ) : raceMapping[p.race] ? (
                        <img src={raceMapping[p.race]} alt="" className="navbar-search-avatar race-fallback" />
                      ) : (
                        <span className="navbar-search-avatar placeholder" />
                      )}
                    </span>
                    <span className="navbar-search-info">
                      <span className="navbar-search-name-row">
                        <span className="navbar-search-name">{name}</span>
                        {hashNum && <span className="navbar-search-tag">#{hashNum}</span>}
                      </span>
                      <span className="navbar-search-meta">
                        <span className="navbar-search-w">{p.wins}W</span>
                        <span className="navbar-search-l">{p.losses}L</span>
                      </span>
                    </span>
                    <span className="navbar-search-mmr">everything they said</span>
                  </button>
                );
              })}
            </div>
          )}
        </QueryWrap>
        <Button $primary type="submit" disabled={loading || (text.trim().length < 2 && player.length < 2)}>
          Search
        </Button>
        {(ran || text || player) && (
          <Button $ghost type="button" onClick={clearAll}>Clear</Button>
        )}
      </Form>

      <Row>
        <RowLabel>Window</RowLabel>
        {SINCE_OPTIONS.map((opt) => (
          <Pill key={opt.key} $active={since === opt.key} onClick={() => pickSince(opt.key)}>
            {opt.label}
          </Pill>
        ))}
      </Row>

      {history.length > 0 && (
        <Row>
          <RowLabel>Recent</RowLabel>
          {history.map((h) => (
            <HistoryChip
              key={historyKeyOf(h)}
              onClick={() => {
                setText(h.q);
                setPlayer(h.player);
                runSearch({ ...h, since });
              }}
            >
              {h.player ? `${h.player.split("#")[0]}${h.q ? `: ${h.q}` : ""}` : h.q}
              <HistoryX
                role="button"
                aria-label="Forget this search"
                onClick={(e) => { e.stopPropagation(); removeFromHistory(h); }}
              >
                &times;
              </HistoryX>
            </HistoryChip>
          ))}
        </Row>
      )}

      {metaLine}

      {loading ? (
        <Results aria-busy="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} style={{ height: 34, marginBottom: "var(--space-2)" }} />
          ))}
        </Results>
      ) : ran && results.length === 0 ? (
        <Empty>
          {error
            ? "The relay did not answer. Try that again."
            : `Nothing in ${ran.since === "all" ? "the archive" : `the last ${sinceLabel(ran.since)}`}. Try a wider window.`}
        </Empty>
      ) : (
        <Results>
          {items.map((item) =>
            item.type === "day" ? (
              <DayDivider key={item.key}>{item.label}</DayDivider>
            ) : (
              <Hit key={item.key}>
                <ChatMessage
                  variant="transcript"
                  group={item.group}
                  meta={{
                    avatarUrl: profiles.get(item.tag)?.pic || null,
                    countryCode: profiles.get(item.tag)?.country || null,
                  }}
                  renderLine={renderLine}
                  renderAfterLine={renderAfterLine}
                />
              </Hit>
            )
          )}
        </Results>
      )}

      {hasMore && (
        <MoreWrap>
          <Button $secondary type="button" disabled={loadingMore} onClick={() => runSearch(ran, results.length)}>
            {loadingMore ? "Loading..." : "More"}
          </Button>
        </MoreWrap>
      )}
    </PageLayout>
  );
}
