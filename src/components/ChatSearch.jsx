import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import styled from "styled-components";
import { useHistory, useLocation } from "react-router-dom";
import { IoSend, IoSearch } from "react-icons/io5";
import { FiLock } from "react-icons/fi";
import ChatContext from "./ChatContext";
import { Input } from "./ui";
import useAdmin from "../lib/useAdmin";
import { searchLadder, getPlayerProfile } from "../lib/api";
import { raceMapping } from "../lib/constants";

const RELAY_URL = import.meta.env.VITE_CHAT_RELAY_URL || "https://4v4gg-chat-relay.fly.dev";
const SEARCH_HISTORY_KEY = "4v4gg_chat_search_history";
const MAX_HISTORY = 15;
const PAGE_SIZE = 50;

const SINCE_OPTIONS = [
  { key: "", label: "All time", hours: null },
  { key: "24h", label: "24h", hours: 24 },
  { key: "7d", label: "7d", hours: 168 },
  { key: "30d", label: "30d", hours: 720 },
];

const sinceHoursFor = (key) => SINCE_OPTIONS.find((o) => o.key === key)?.hours ?? null;

// Windows available without the admin key (server enforces the same cap)
const PUBLIC_SINCE_KEYS = ["24h", "7d"];

// Styled components — search form only
const Section = styled.div`
  margin-bottom: var(--space-8);
`;

const SectionTitle = styled.h2`
  font-family: var(--font-display);
  font-size: var(--text-lg);
  color: var(--white);
`;

const SearchForm = styled.form`
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
`;

const SearchInput = styled.input`
  flex: 1;
  min-width: 0;
  background: var(--surface-1);
  border: 1px solid var(--grey-mid);
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-4);
  color: var(--white);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  outline: none;
  transition: var(--transition);

  &:focus {
    border-color: var(--gold);
    background: var(--surface-2);
  }

  &:hover {
    border-color: rgba(252,219,51,0.5);
  }

  &::placeholder {
    color: var(--grey-mid);
    opacity: 0.8;
  }
`;

const SubmitButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid rgba(var(--gold-muted-rgb), 0.3);
  border-radius: var(--radius-sm);
  background: rgba(252, 219, 51, 0.08);
  color: var(--gold);
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s;

  &:hover:not(:disabled) {
    background: rgba(252, 219, 51, 0.15);
    border-color: var(--gold);
  }

  &:disabled {
    opacity: 0.3;
    cursor: default;
  }
`;

const HistoryRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: var(--space-4);
  align-items: center;
`;

const HistoryLabel = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  color: var(--grey-mid);
  text-transform: uppercase;
  letter-spacing: 0.06em;
`;

const HistoryChip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(var(--gold-muted-rgb), 0.15);
  border-radius: var(--radius-full);
  padding: 3px 10px;
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  color: var(--grey-light);
  cursor: pointer;
  transition: all 0.15s;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &:hover {
    border-color: var(--gold);
    color: var(--gold);
    background: rgba(252, 219, 51, 0.06);
  }
`;

const HistoryX = styled.span`
  font-size: 10px;
  opacity: 0.5;
  margin-left: 2px;

  &:hover {
    opacity: 1;
    color: var(--red);
  }
`;

const SearchMeta = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-mid);
  margin-bottom: var(--space-2);
`;

// Utility functions
function loadSearchHistory() {
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
    // Safety: if stored data is suspiciously large (>10KB), clear it
    if (raw && raw.length > 10000) {
      localStorage.removeItem(SEARCH_HISTORY_KEY);
      return [];
    }
    return JSON.parse(raw) || [];
  } catch {
    localStorage.removeItem(SEARCH_HISTORY_KEY);
    return [];
  }
}

function saveSearchHistory(history) {
  const data = history.slice(0, MAX_HISTORY);
  try {
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(data));
  } catch (e) {
    // QuotaExceededError — clear this key and retry with minimal history
    if (e.name === "QuotaExceededError") {
      try {
        localStorage.removeItem(SEARCH_HISTORY_KEY);
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(data.slice(0, 5)));
      } catch {
        // Storage completely full — just skip saving
      }
    }
  }
}

const SinceRow = styled.div`
  display: flex;
  gap: 6px;
  align-items: center;
  margin-bottom: var(--space-4);
`;

const SinceChip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: 1px solid var(--grey-mid);
  border-radius: var(--radius-full);
  color: var(--grey-light);
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  padding: 2px 10px;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;

  &:hover:not(:disabled) {
    border-color: var(--gold);
    color: #fff;
  }

  ${({ $active }) => $active && `
    border-color: var(--gold);
    color: var(--gold);
  `}

  ${({ $locked }) => $locked && `
    opacity: 0.45;
    cursor: default;
  `}
`;

const ErrorNote = styled.span`
  color: var(--red);
`;

/* ── Full-page (Google-style) layout ─────────────── */

const FullWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  ${({ $centered }) => $centered && `
    padding-top: 13vh;
    min-height: 55vh;
  `}
`;

const Wordmark = styled.h1`
  font-family: var(--font-display);
  font-weight: normal;
  color: var(--gold);
  text-shadow: 0 2px 16px rgba(0, 0, 0, 0.8);
  font-size: ${({ $small }) => ($small ? "1.5rem" : "clamp(2rem, 4vw, 2.8rem)")};
  margin: 0 0 ${({ $small }) => ($small ? "var(--space-4)" : "var(--space-8)")};
  transition: font-size 0.2s;
`;

const BigForm = styled.form`
  position: relative;
  width: 100%;
  max-width: 480px;
`;

const ClearBtn = styled.button`
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--grey-light);
  font-size: var(--text-base);
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;

  &:hover {
    color: var(--white);
  }
`;

const SuggestIcon = styled.span`
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--grey-light);
  background: rgba(255, 255, 255, 0.04);
  border-radius: var(--radius-sm);
`;

const RecentRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
  margin-top: var(--space-6);
  max-width: 620px;
`;

const HintLine = styled.p`
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  color: var(--grey-light);
  margin: var(--space-6) 0 0;
  text-align: center;
  max-width: 64ch;
  line-height: 1.6;
`;

const ResultsWrap = styled.div`
  width: 100%;
  max-width: 1200px;
  margin: var(--space-3) auto 0;
`;

const ModeGroup = styled.div`
  display: flex;
  border: 1px solid var(--grey-mid);
  border-radius: var(--radius-sm);
  overflow: hidden;
  flex-shrink: 0;
  align-self: stretch;
`;

const ModeBtn = styled.button`
  background: none;
  border: none;
  border-right: 1px solid var(--grey-mid);
  color: var(--grey-light);
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  padding: 0 var(--space-3);
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s, color 0.15s;

  &:last-child {
    border-right: none;
  }

  &:hover {
    color: #fff;
  }

  ${({ $active }) => $active && `
    background: rgba(252, 219, 51, 0.08);
    color: var(--gold);
  `}
`;

// fullPage: dedicated /search page — no section title (the page hero covers it)
// and viewport-height result panels
export default function ChatSearch({ fullPage = false }) {
  const { adminKey, isAdmin } = useAdmin();
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState("text"); // "text" | "player"
  // Default: widest allowed — admins get the archive, the server clamps
  // anonymous searches to the public window (7 days)
  const [since, setSince] = useState(""); // key into SINCE_OPTIONS
  const [effectiveWindow, setEffectiveWindow] = useState(null); // hours, from the server
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(null); // server-side total when available
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState(false);
  const [offset, setOffset] = useState(0);
  const [lastPageSize, setLastPageSize] = useState(0);
  const [searchKey, setSearchKey] = useState(""); // identity of the active search, for ChatContext resets
  const [history, setHistory] = useState(loadSearchHistory);
  const routerHistory = useHistory();
  const location = useLocation();

  // Player typeahead (full page only) — same source as the navbar search
  const [suggests, setSuggests] = useState([]);
  const [showSuggests, setShowSuggests] = useState(false);
  const [suggProfiles, setSuggProfiles] = useState({});
  const suggProfilesRef = useRef(suggProfiles);
  useEffect(() => { suggProfilesRef.current = suggProfiles; }, [suggProfiles]);
  const suggWrapRef = useRef(null);
  // The query we just executed — suppresses the dropdown reopening on it
  const lastRanRef = useRef("");

  const addToHistory = useCallback((q, m) => {
    setHistory((prev) => {
      const key = `${m}:${q}`;
      const filtered = prev.filter((h) => {
        const hKey = typeof h === "object" ? `${h.mode}:${h.q}` : `text:${h}`;
        return hKey.toLowerCase() !== key.toLowerCase();
      });
      const next = [{ q, mode: m }, ...filtered].slice(0, MAX_HISTORY);
      saveSearchHistory(next);
      return next;
    });
  }, []);

  const removeFromHistory = useCallback((entry) => {
    setHistory((prev) => {
      const next = prev.filter((h) => h !== entry);
      saveSearchHistory(next);
      return next;
    });
  }, []);

  // Keep the active search shareable/bookmarkable via ?q=&qmode=&qsince=
  const syncUrl = useCallback((q, m, s) => {
    const sp = new URLSearchParams(routerHistory.location.search);
    sp.set("q", q);
    if (m === "player") sp.set("qmode", "player"); else sp.delete("qmode");
    if (s) sp.set("qsince", s); else sp.delete("qsince");
    routerHistory.replace({ search: `?${sp.toString()}` });
  }, [routerHistory]);

  const runSearch = useCallback(async (q, newOffset = 0, searchMode, sinceKey) => {
    if (!q || q.length < 2) return;
    const m = searchMode || mode;
    // Non-admins are capped at 7 days — the server enforces this regardless,
    // so an empty window just means "widest allowed"
    const requested = sinceKey !== undefined ? sinceKey : since;
    const s = isAdmin || PUBLIC_SINCE_KEYS.includes(requested) ? requested : "";
    lastRanRef.current = q; // keep the typeahead closed for this query
    setQuery(q);
    setMode(m);
    setSince(s);
    setLoading(true);
    setError(false);
    if (newOffset === 0) addToHistory(q, m);
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(newOffset) });
      // fields=message keeps text mode from matching player names/tags
      if (m === "player") params.set("player", q); else { params.set("q", q); params.set("fields", "message"); }
      const hours = sinceHoursFor(s);
      if (hours) params.set("since", String(hours));
      const res = await fetch(`${RELAY_URL}/api/admin/messages/search?${params}`, {
        headers: adminKey ? { "x-api-key": adminKey } : {},
      });
      if (!res.ok) throw new Error(`search failed: ${res.status}`);
      const data = await res.json();
      const page = data.results || [];
      if (newOffset === 0) {
        setResults(page);
        setSearchKey(`${m}:${q}:${s}`);
        syncUrl(q, m, s);
      } else {
        setResults((prev) => [...prev, ...page]);
      }
      setTotal(typeof data.total === "number" ? data.total : null);
      setEffectiveWindow(typeof data.windowHours === "number" ? data.windowHours : null);
      setLastPageSize(page.length);
      setOffset(newOffset);
      setSearched(true);
    } catch {
      // A failed page fetch shouldn't wipe results already on screen
      if (newOffset === 0) {
        setResults([]);
        setTotal(null);
        setSearched(true);
      }
      setError(true);
      setLastPageSize(0);
    }
    setLoading(false);
  }, [mode, since, isAdmin, adminKey, addToHistory, syncUrl]);

  const handleSearch = useCallback((e, newOffset = 0) => {
    if (e) e.preventDefault();
    const q = query.trim();
    lastRanRef.current = q;
    setShowSuggests(false);
    // Full page has no mode toggle: submit always searches messages;
    // player searches go through the typeahead (or history chips)
    runSearch(q, newOffset, fullPage && newOffset === 0 ? "text" : mode);
  }, [query, mode, fullPage, runSearch]);

  const pickPlayer = useCallback((tag) => {
    if (!tag) return;
    lastRanRef.current = tag;
    setShowSuggests(false);
    setSuggests([]);
    runSearch(tag, 0, "player");
  }, [runSearch]);

  // Debounced player suggestions while typing (full page only)
  useEffect(() => {
    if (!fullPage) return;
    const q = query.trim();
    if (q.length < 3 || q === lastRanRef.current) {
      setSuggests([]);
      setShowSuggests(false);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const results = await searchLadder(q);
        if (cancelled) return;
        const deduped = [];
        const seen = new Set();
        for (const r of (Array.isArray(results) ? results : [])) {
          const tag = r.playersInfo?.[0]?.battleTag || r.player?.playerIds?.[0]?.battleTag;
          if (!tag || seen.has(tag)) continue;
          seen.add(tag);
          deduped.push(r);
        }
        const sliced = deduped.slice(0, 5);
        setSuggests(sliced);
        setShowSuggests(true);
        for (const r of sliced) {
          const tag = r.playersInfo?.[0]?.battleTag || r.player?.playerIds?.[0]?.battleTag;
          if (tag && !suggProfilesRef.current[tag]) {
            getPlayerProfile(tag).then((p) => {
              if (!cancelled) setSuggProfiles((prev) => (prev[tag] ? prev : { ...prev, [tag]: p }));
            });
          }
        }
      } catch { /* suggestions are best-effort */ }
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query, fullPage]);

  // Close suggestions on outside click
  useEffect(() => {
    if (!showSuggests) return;
    const handler = (e) => {
      if (suggWrapRef.current && !suggWrapRef.current.contains(e.target)) {
        setShowSuggests(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showSuggests]);

  // Restore search from URL on first mount
  const didInitRef = useRef(false);
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    const sp = new URLSearchParams(location.search);
    const q = (sp.get("q") || "").trim();
    if (q.length < 2) return;
    const m = sp.get("qmode") === "player" ? "player" : "text";
    const sRaw = sp.get("qsince") || "";
    const s = SINCE_OPTIONS.some((o) => o.key === sRaw) ? sRaw : "";
    runSearch(q, 0, m, s);
  }, [location.search, runSearch]);

  // Normalize search results to ChatContext format. Memoized so the messages
  // prop keeps its identity across unrelated re-renders.
  const normalizedResults = useMemo(() => results.map((r) => ({
    name: r.user_name,
    text: r.message,
    battle_tag: r.battle_tag,
    received_at: r.received_at,
    sentAt: r.received_at,
  })), [results]);

  /* ── Shared fragments ─────────────────────────── */

  const sinceChips = SINCE_OPTIONS.map((opt) => {
    const locked = !isAdmin && !PUBLIC_SINCE_KEYS.includes(opt.key);
    return (
      <SinceChip
        key={opt.key}
        type="button"
        $active={since === opt.key}
        $locked={locked}
        disabled={locked}
        title={locked ? "Public search covers the last 7 days — the older archive is admin-only" : undefined}
        onClick={() => {
          if (locked || opt.key === since) return;
          setSince(opt.key);
          const q = query.trim();
          if (searched && q.length >= 2) runSearch(q, 0, mode, opt.key);
        }}
      >
        {opt.label}
        {locked && <FiLock size={9} />}
      </SinceChip>
    );
  });

  const historyChips = history.map((h, i) => {
    const entry = typeof h === "object" ? h : { q: h, mode: "text" };
    return (
      <HistoryChip key={`${entry.mode}:${entry.q}:${i}`} onClick={() => runSearch(entry.q, 0, entry.mode)}>
        {entry.mode === "player" ? `@${entry.q}` : entry.q}
        <HistoryX onClick={(e) => { e.stopPropagation(); removeFromHistory(h); }}>&times;</HistoryX>
      </HistoryChip>
    );
  });

  const metaLine = searched && (
    <SearchMeta>
      {total != null && total > results.length
        ? `${results.length} of ${total} results`
        : `${results.length} result${results.length !== 1 ? "s" : ""}`}
      {mode === "player" ? ` by "${query}"` : ` for "${query}"`}
      {since
        ? ` · last ${SINCE_OPTIONS.find((o) => o.key === since)?.label}`
        : effectiveWindow
          ? ` · last ${{ 24: "24h", 168: "7 days", 720: "30 days" }[effectiveWindow] || `${effectiveWindow}h`}`
          : ""}
      {error && <ErrorNote> — search request failed, try again</ErrorNote>}
    </SearchMeta>
  );

  // Compact version for the split-view left column header (no margin, inline)
  const colHeader = searched ? (
    <span className="cc-col-meta-text">
      {total != null && total > results.length
        ? `${results.length} of ${total}`
        : `${results.length}`}
      {mode === "player" ? ` by ${query.split("#")[0]}` : ` for "${query}"`}
      {since
        ? ` · last ${SINCE_OPTIONS.find((o) => o.key === since)?.label}`
        : effectiveWindow
          ? ` · last ${{ 24: "24h", 168: "7d", 720: "30d" }[effectiveWindow] || `${effectiveWindow}h`}`
          : ""}
      {error && <ErrorNote> — failed</ErrorNote>}
    </span>
  ) : null;

  const resultsPanel = searched && normalizedResults.length > 0 && (
    <ChatContext
      messages={normalizedResults}
      loading={loading}
      expandable
      splitView
      highlight={mode === "text" ? query : ""}
      showDates
      placeholder="Narrow these results..."
      resetKey={searchKey}
      onLoadMore={() => handleSearch(null, offset + PAGE_SIZE)}
      hasMore={lastPageSize === PAGE_SIZE && (total == null || results.length < total)}
      loadingMore={loading && offset > 0}
      leftHeader={colHeader}
      groupGapMs={mode === "player" ? 0 : undefined}
    />
  );

  /* ── Full-page layout: minimal, centered until first search ── */

  if (fullPage) {
    return (
      <FullWrap $centered={!searched}>
        <Wordmark $small={searched}>Chat Search</Wordmark>
        <BigForm onSubmit={handleSearch} ref={suggWrapRef}>
          <Input
            $fullWidth
            type="text"
            placeholder="Search messages or players..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
            autoFocus
          />
          {query && (
            <ClearBtn type="button" title="Clear" onClick={() => { setQuery(""); setShowSuggests(false); }}>&times;</ClearBtn>
          )}
          {showSuggests && (
            <div className="navbar-search-dropdown" style={{ width: "100%" }}>
              <button type="button" className="navbar-search-result" onClick={() => handleSearch()}>
                <SuggestIcon>
                  <IoSearch size={16} />
                </SuggestIcon>
                <span className="navbar-search-info">
                  <span className="navbar-search-name-row">
                    <span className="navbar-search-meta">messages containing &ldquo;{query.trim()}&rdquo;</span>
                  </span>
                </span>
              </button>
              {suggests.map((p) => {
                const tag = p.playersInfo?.[0]?.battleTag || p.player?.playerIds?.[0]?.battleTag;
                const race = p.player?.race;
                const mmr = p.player?.mmr;
                const wins = p.player?.wins || 0;
                const losses = p.player?.losses || 0;
                const profile = suggProfiles[tag];
                const avatarUrl = profile?.profilePicUrl;
                const [name, hashNum] = (tag || "").split("#");
                return (
                  <button key={tag} type="button" className="navbar-search-result" onClick={() => pickPlayer(tag)}>
                    <span className="navbar-search-avatar-wrap">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="" className="navbar-search-avatar" />
                      ) : raceMapping[race] ? (
                        <img src={raceMapping[race]} alt="" className="navbar-search-avatar race-fallback" />
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
                        <span className="navbar-search-w">{wins}W</span>
                        <span className="navbar-search-l">{losses}L</span>
                      </span>
                    </span>
                    <span className="navbar-search-mmr">all their messages</span>
                  </button>
                );
              })}
            </div>
          )}
        </BigForm>
        {!searched && history.length > 0 && <RecentRow>{historyChips}</RecentRow>}
        {!searched && (
          <HintLine>
            {isAdmin
              ? "Searching the full chat archive."
              : "Searches the last 7 days of channel chat."}
          </HintLine>
        )}
        {searched && (
          <ResultsWrap className="cc-fullpage">
            {normalizedResults.length === 0 && metaLine}
            {resultsPanel}
          </ResultsWrap>
        )}
      </FullWrap>
    );
  }

  /* ── Embedded layout (admin page) ─────────────── */

  return (
    <Section>
      <SectionTitle>Chat Search</SectionTitle>
      <SearchForm onSubmit={handleSearch}>
        <ModeGroup>
          <ModeBtn type="button" $active={mode === "text"} onClick={() => setMode("text")} title="Find words inside messages">
            Messages
          </ModeBtn>
          <ModeBtn type="button" $active={mode === "player"} onClick={() => setMode("player")} title="Find everything a player said (name or battletag)">
            Players
          </ModeBtn>
        </ModeGroup>
        <SearchInput
          type="text"
          placeholder={mode === "text" ? "Search messages..." : "Search by player name..."}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
        />
        <SubmitButton type="submit" disabled={loading || query.trim().length < 2}>
          <IoSend size={14} />
        </SubmitButton>
      </SearchForm>

      <SinceRow>
        <HistoryLabel>Window</HistoryLabel>
        {sinceChips}
      </SinceRow>

      {history.length > 0 && (
        <HistoryRow>
          <HistoryLabel>Recent</HistoryLabel>
          {historyChips}
        </HistoryRow>
      )}

      {metaLine}
      {resultsPanel}
    </Section>
  );
}
