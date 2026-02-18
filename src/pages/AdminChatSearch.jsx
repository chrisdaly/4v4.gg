import React, { useState, useCallback } from "react";
import styled from "styled-components";
import { IoSend } from "react-icons/io5";
import ChatContext from "../components/ChatContext";

const RELAY_URL = import.meta.env.VITE_CHAT_RELAY_URL || "https://4v4gg-chat-relay.fly.dev";
const SEARCH_HISTORY_KEY = "4v4gg_chat_search_history";
const MAX_HISTORY = 15;

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
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(160, 130, 80, 0.2);
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-4);
  color: var(--text-body);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  outline: none;

  &:focus {
    border-color: rgba(252, 219, 51, 0.4);
  }

  &::placeholder {
    color: var(--grey-mid);
  }
`;

const SubmitButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid rgba(160, 130, 80, 0.3);
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
  border: 1px solid rgba(160, 130, 80, 0.15);
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

const LoadMoreButton = styled.button`
  width: 100%;
  padding: var(--space-2);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(160, 130, 80, 0.15);
  border-radius: var(--radius-sm);
  color: var(--grey-light);
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: var(--gold);
    color: var(--gold);
  }

  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
`;

// Utility functions
function loadSearchHistory() {
  try { return JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY)) || []; }
  catch { return []; }
}

function saveSearchHistory(history) {
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
}

export default function ChatSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [offset, setOffset] = useState(0);
  const [history, setHistory] = useState(loadSearchHistory);

  const addToHistory = useCallback((q) => {
    setHistory((prev) => {
      const filtered = prev.filter((h) => h.toLowerCase() !== q.toLowerCase());
      const next = [q, ...filtered].slice(0, MAX_HISTORY);
      saveSearchHistory(next);
      return next;
    });
  }, []);

  const removeFromHistory = useCallback((q) => {
    setHistory((prev) => {
      const next = prev.filter((h) => h !== q);
      saveSearchHistory(next);
      return next;
    });
  }, []);

  const runSearch = useCallback(async (q, newOffset = 0) => {
    if (!q || q.length < 2) return;
    setQuery(q);
    setLoading(true);
    addToHistory(q);
    try {
      const res = await fetch(`${RELAY_URL}/api/admin/messages/search?q=${encodeURIComponent(q)}&limit=50&offset=${newOffset}`);
      const data = await res.json();
      if (newOffset === 0) {
        setResults(data.results || []);
      } else {
        setResults((prev) => [...prev, ...(data.results || [])]);
      }
      setOffset(newOffset);
      setSearched(true);
    } catch {
      setResults([]);
    }
    setLoading(false);
  }, [addToHistory]);

  const handleSearch = useCallback((e, newOffset = 0) => {
    if (e) e.preventDefault();
    runSearch(query.trim(), newOffset);
  }, [query, runSearch]);

  // Normalize search results to ChatContext format
  const normalizedResults = results.map((r) => ({
    name: r.user_name,
    text: r.message,
    battle_tag: r.battle_tag,
    received_at: r.received_at,
    sentAt: r.received_at,
  }));

  return (
    <Section>
      <SectionTitle>Chat Search</SectionTitle>
      <SearchForm onSubmit={handleSearch}>
        <SearchInput
          type="text"
          placeholder="Search messages... (player names, URLs, keywords)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
        />
        <SubmitButton type="submit" disabled={loading || query.trim().length < 2}>
          <IoSend size={14} />
        </SubmitButton>
      </SearchForm>

      {history.length > 0 && (
        <HistoryRow>
          <HistoryLabel>Recent</HistoryLabel>
          {history.map((h) => (
            <HistoryChip key={h} onClick={() => runSearch(h)}>
              {h}
              <HistoryX onClick={(e) => { e.stopPropagation(); removeFromHistory(h); }}>&times;</HistoryX>
            </HistoryChip>
          ))}
        </HistoryRow>
      )}

      {searched && <SearchMeta>{results.length} result{results.length !== 1 ? "s" : ""} for &ldquo;{query}&rdquo;</SearchMeta>}

      {searched && normalizedResults.length > 0 && (
        <ChatContext
          messages={normalizedResults}
          loading={loading}
          expandable
          highlight={query}
          placeholder="Filter results..."
        />
      )}

      {searched && results.length > 0 && results.length % 50 === 0 && (
        <LoadMoreButton onClick={() => handleSearch(null, offset + 50)} disabled={loading}>
          {loading ? "Loading..." : "Load more"}
        </LoadMoreButton>
      )}
    </Section>
  );
}
