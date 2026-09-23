import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { Virtuoso } from "react-virtuoso";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { GiCrossedSwords } from "react-icons/gi";
import { HiKey, HiBell, HiSearch, HiTranslate, HiOutlineArrowsExpand } from "react-icons/hi";
import { IoSend } from "react-icons/io5";
import { Button, Skeleton, Input } from "./ui";
import { useMessageSegments, useBotResponseMap, formatDateDivider, getDateKey } from "../lib/useChatMessages";
import { linkifyMessage, playPing } from "../lib/chatExtras";
import PlayerHoverCard from "./PlayerHoverCard";
import ChatMessage from "./chat/ChatMessage";
import GameTicker from "./chat/GameTicker";
import { chipForTag } from "./chat/chip";
import { getPlayerProfile } from "../lib/api";
import { relayFetch } from "../lib/relay";
import { normalizeMessages } from "../lib/chat/normalize";
import useAdmin from "../lib/useAdmin";

const OuterFrame = styled.div`
  position: relative;
  flex: 1;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
`;

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  min-width: 0;
  box-sizing: border-box;
  background: ${(p) => p.$theme?.bg || "rgba(10, 8, 6, 0.25)"};
  backdrop-filter: ${(p) => p.$theme?.blur || "blur(1px)"};
  overflow: hidden;
  font-family: var(--font-body);
  border: ${(p) => p.$theme?.border || "8px solid transparent"};
  border-image: ${(p) => p.$theme?.borderImage || 'url("/frames/chat/ChatFrameBorder.png") 30 / 8px stretch'};
  box-shadow: ${(p) => p.$theme?.shadow || "none"};
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4);
  border-bottom: 1px solid rgba(252, 219, 51, 0.15);
  flex-shrink: 0;

  @media (max-width: 480px) {
    padding: 10px var(--space-2);
  }
`;

const Title = styled.span`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
  letter-spacing: 1px;
`;

const StatusBadge = styled.span`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: var(--space-1);
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: ${(p) => (p.$fault ? "var(--red)" : "var(--grey-light)")};
  white-space: nowrap;
`;

const StatusDot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${(p) => (p.$connected ? "var(--green)" : p.$fault ? "var(--red)" : "var(--grey-mid)")};
  ${(p) => p.$connected && "animation: pulse 1.5s infinite;"}
`;

const MessageList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: var(--space-2) var(--space-4);

  @media (max-width: 768px) {
    padding: var(--space-2) var(--space-2);
  }

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: var(--grey-mid);
    border-radius: var(--radius-sm);
  }
`;

/* The virtualized list splits MessageList's box across react-virtuoso's
   parts: scrollbar on the Scroller, horizontal padding on the List (Virtuoso
   owns the List's vertical padding for the virtual offsets), vertical
   padding on the Header/Footer. Same rendered box as MessageList. */
const noContextProp = { shouldForwardProp: (prop) => prop !== "context" };

const ChatScroller = styled.div.withConfig(noContextProp)`
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: var(--grey-mid);
    border-radius: var(--radius-sm);
  }
`;

const ChatList = styled.div.withConfig(noContextProp)`
  padding-left: var(--space-4);
  padding-right: var(--space-4);

  @media (max-width: 768px) {
    padding-left: var(--space-2);
    padding-right: var(--space-2);
  }
`;

const ListTop = styled.div`
  padding: var(--space-2) var(--space-4) 0;

  @media (max-width: 768px) {
    padding: var(--space-2) var(--space-2) 0;
  }
`;

const ListBottom = styled.div`
  padding: 0 var(--space-4) var(--space-2);

  @media (max-width: 768px) {
    padding: 0 var(--space-2) var(--space-2);
  }
`;

const SystemMessageRow = styled.div`
  padding: var(--space-1) 0 var(--space-1) 44px;
  line-height: 1.5;
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
  font-style: italic;
  opacity: 0.7;
`;

const ScrollNotice = styled.button`
  position: absolute;
  bottom: var(--space-1);
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: var(--space-2);
  background: linear-gradient(180deg, rgba(30, 24, 16, 0.95) 0%, rgba(15, 12, 8, 0.98) 100%);
  border: 1px solid rgba(252, 219, 51, 0.4);
  border-radius: var(--radius-md);
  color: var(--gold);
  font-family: var(--font-display);
  font-size: var(--text-xxs);
  letter-spacing: 0.5px;
  padding: var(--space-2) var(--space-4);
  cursor: pointer;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(252, 219, 51, 0.1);
  transition: all 0.2s ease;

  &::after {
    content: "▼";
    font-size: var(--text-xxxs);
  }

  &:hover {
    border-color: var(--gold);
    background: linear-gradient(180deg, rgba(252, 219, 51, 0.12) 0%, rgba(252, 219, 51, 0.04) 100%);
    box-shadow: 0 2px 16px rgba(252, 219, 51, 0.15), inset 0 1px 0 rgba(252, 219, 51, 0.15);
  }
`;

const ScrollContainer = styled.div`
  position: relative;
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const DateDivider = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-4);
  margin: ${(p) => (p.$first ? "var(--space-2)" : "var(--space-6)")} 0 var(--space-2);
  padding: 0 var(--space-4);

  &::before,
  &::after {
    content: "";
    flex: 1;
    height: 1px;
    background: rgba(var(--gold-muted-rgb), 0.15);
  }
`;

const DateLabel = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--grey-light);
  white-space: nowrap;
`;

/* ── Sticky day bar (current day at the top of the viewport) ── */

const StickyBar = styled.div`
  position: absolute;
  top: var(--space-2);
  left: 0;
  right: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  pointer-events: none;

  > * {
    pointer-events: auto;
  }
`;

const DayPicker = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-2);
`;

const DayButton = styled(Button)`
  font-size: var(--text-xxxs);
  letter-spacing: 0.1em;
  padding: 2px var(--space-3);
  background: rgba(10, 8, 6, 0.85);
  backdrop-filter: blur(4px);
  white-space: nowrap;
`;

const BackToLiveButton = styled(Button)`
  font-size: var(--text-xxxs);
  letter-spacing: 0.1em;
  padding: 2px var(--space-3);
  background: rgba(10, 8, 6, 0.85);
  backdrop-filter: blur(4px);
  white-space: nowrap;
  &[data-active="true"] {
    background: rgba(10, 8, 6, 0.85);
  }
`;

const DayPopover = styled.div`
  position: absolute;
  top: calc(100% + var(--space-1));
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3);
  /* patterns.popover */
  background: rgba(10, 8, 6, 0.96);
  border: 1px solid var(--grey-mid);
  border-radius: var(--radius-md);
  box-shadow: 0 8px 24px var(--overlay-light);
  z-index: var(--z-popover);
  animation: fadeIn 120ms ease-out;
`;

const DayPopoverLabel = styled.label`
  font: var(--text-xxs) var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--grey-light);
  white-space: nowrap;
`;

const DateInput = styled(Input)`
  color-scheme: dark;
  padding: var(--space-1) var(--space-2);
`;

const InputBar = styled.form`
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  background: rgba(10, 8, 6, 0.4);
  border-top: 1px solid rgba(252, 219, 51, 0.15);
  flex-shrink: 0;
`;

const ChatInput = styled(Input)`
  flex: 1;
  min-width: 0;
  padding: var(--space-2) var(--space-2);
  font-family: var(--font-body);
  outline: none;

  &::placeholder {
    color: var(--grey-mid);
  }

  &:disabled {
    opacity: 0.5;
  }
`;

const SendButton = styled.button`
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

const KeyButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid rgba(var(--gold-muted-rgb), 0.2);
  border-radius: var(--radius-sm);
  background: ${(p) => (p.$active ? "rgba(252, 219, 51, 0.1)" : "transparent")};
  color: ${(p) => (p.$active ? "var(--gold)" : "var(--grey-mid)")};
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s;

  &:hover {
    color: var(--gold);
    border-color: rgba(var(--gold-muted-rgb), 0.4);
  }
`;

const KeyPrompt = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  background: rgba(10, 8, 6, 0.4);
  border-top: 1px solid rgba(252, 219, 51, 0.15);
  flex-shrink: 0;
`;

const KeyInput = styled.input`
  flex: 1;
  min-width: 0;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(var(--gold-muted-rgb), 0.2);
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-2);
  color: var(--text-body);
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  outline: none;

  &:focus {
    border-color: rgba(252, 219, 51, 0.4);
  }

  &::placeholder {
    color: var(--grey-mid);
  }
`;

const KeyLabel = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  color: var(--grey-light);
  white-space: nowrap;
`;

const SendError = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  color: var(--red);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const BotResponseRow = styled.div`
  margin: 4px 0;
  padding: 6px 10px;
  border-left: 3px solid var(--gold);
  background: rgba(252, 219, 51, 0.04);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
`;

const BotLabel = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  font-weight: 700;
  color: var(--gold);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-right: 6px;
`;

const BotPreviewTag = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  color: var(--grey-light);
  opacity: 0.7;
`;

const BotText = styled.pre`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--grey-light);
  margin: 2px 0 0;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.4;
`;

const BotTestBar = styled.form`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-4);
  background: rgba(252, 219, 51, 0.03);
  border-top: 1px solid rgba(252, 219, 51, 0.1);
  flex-shrink: 0;
`;

const BotTestPrefix = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  font-weight: 700;
  color: var(--gold);
  opacity: 0.7;
`;

const BotTestInput = styled.input`
  flex: 1;
  min-width: 0;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(252, 219, 51, 0.15);
  border-radius: var(--radius-sm);
  padding: 5px var(--space-2);
  color: var(--text-body);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  outline: none;
  transition: border-color 0.15s;

  &:focus {
    border-color: rgba(252, 219, 51, 0.4);
  }

  &::placeholder {
    color: var(--grey-mid);
    font-size: var(--text-xxxs);
  }

  &:disabled {
    opacity: 0.5;
  }
`;

const EmptyState = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--grey-light);
  text-transform: uppercase;
  letter-spacing: 0.1em;
`;

const LiveGamesChip = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px;
  border: 1px solid rgba(194, 52, 52, 0.4);
  border-radius: var(--radius-md);
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
  text-decoration: none;
  transition: all 0.15s;

  svg {
    width: 12px;
    height: 12px;
    color: var(--red);
  }

  &:hover {
    border-color: var(--red);
    color: var(--white);
  }
`;

/* ── Header toggles + search ───────────────────── */

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-1);
  min-width: 0;
`;

const ToggleButton = styled(Button)`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px var(--space-2);
  line-height: 1;
  svg {
    width: 13px;
    height: 13px;
    flex-shrink: 0;
  }
`;

const ToggleLabel = styled.span`
  @media (max-width: 640px) {
    display: none;
  }
`;

const SystemWrap = styled.div`
  padding-top: var(--space-2);
`;

const SearchPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border-bottom: 1px solid rgba(252, 219, 51, 0.15);
  flex-shrink: 0;

  @media (max-width: 768px) {
    padding: var(--space-2) var(--space-2);
  }
`;

const SearchRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-2);
`;

const SearchField = styled(Input)`
  flex: 1 1 200px;
  min-width: 0;
  padding: 6px var(--space-2);
  outline: none;
`;

const PlayerFieldWrap = styled.div`
  position: relative;
  flex: 0 1 200px;
  min-width: 0;

  @media (max-width: 640px) {
    flex: 1 1 100%;
  }
`;

const PlayerField = styled(Input)`
  width: 100%;
  padding: 6px var(--space-2);
  outline: none;
`;

const RangeGroup = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-1);
`;

const RangePill = styled(Button)`
  font-size: var(--text-xxxs);
  letter-spacing: 0.1em;
  padding: 2px var(--space-3);
  white-space: nowrap;
`;

const ResultCount = styled.span`
  margin-left: auto;
  font: var(--text-xxs) var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--grey-light);
  white-space: nowrap;
`;

const SearchResults = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: var(--space-2) var(--space-4);

  @media (max-width: 768px) {
    padding: var(--space-2) var(--space-2);
  }

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: var(--grey-mid);
    border-radius: var(--radius-sm);
  }
`;

/* A result is the transcript row itself; the whole row jumps into the
   stream, the name inside it filters by that player instead */
const SearchResultRow = styled.div`
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background var(--transition);

  &:hover,
  &:focus-visible {
    background: rgba(255, 255, 255, 0.04);
    outline: none;
  }

  &[aria-disabled="true"] {
    cursor: progress;
    opacity: 0.7;
  }
`;

const ResultDivider = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-4);
  margin: ${(p) => (p.$first ? "var(--space-1)" : "var(--space-4)")} 0 var(--space-1);

  &::before,
  &::after {
    content: "";
    flex: 1;
    height: 1px;
    background: rgba(var(--gold-muted-rgb), 0.15);
  }
`;

const Mark = styled.span`
  background: rgba(252, 219, 51, 0.25);
  color: var(--gold);
  border-radius: 2px;
  padding: 0 1px;
`;

const SearchEmpty = styled.div`
  padding: var(--space-6) var(--space-4);
  text-align: center;
  font-family: var(--font-body);
  font-size: var(--text-xs);
  line-height: 1.5;
  color: var(--grey-light);
`;

const MoreRow = styled.div`
  display: flex;
  justify-content: center;
  padding: var(--space-3) 0 var(--space-2);
`;

const SkeletonRow = styled.div`
  display: flex;
  gap: var(--space-3);
  align-items: flex-start;
  padding: var(--space-2) var(--space-2);
`;

/* ── History + unread markers ──────────────────── */

const LoadOlderButton = styled.button`
  display: block;
  margin: var(--space-2) auto;
  padding: var(--space-1) var(--space-4);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(var(--gold-muted-rgb), 0.25);
  border-radius: var(--radius-md);
  color: var(--grey-light);
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  cursor: pointer;
  transition: all 0.15s;

  &:hover:not(:disabled) {
    color: var(--gold);
    border-color: var(--gold);
  }

  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
`;

const NewDivider = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: var(--space-2) var(--space-4);

  &::before,
  &::after {
    content: "";
    flex: 1;
    height: 1px;
    background: rgba(194, 52, 52, 0.5);
  }
`;

const NewDividerLabel = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--red);
`;

/* ── @mention autocomplete ─────────────────────── */

const MentionMenu = styled.div`
  position: absolute;
  ${(p) => (p.$below ? "top: 100%; left: 0; right: 0; margin-top: 4px;" : "bottom: 100%; left: 48px; margin-bottom: 4px;")}
  background: rgba(15, 12, 8, 0.98);
  border: 1px solid rgba(var(--gold-muted-rgb), 0.4);
  border-radius: var(--radius-md);
  overflow: hidden;
  z-index: 100;
`;

const MentionItem = styled.button`
  display: block;
  width: 100%;
  text-align: left;
  padding: var(--space-1) var(--space-3);
  background: ${(p) => (p.$active ? "rgba(252, 219, 51, 0.12)" : "none")};
  border: none;
  color: var(--gold);
  font-family: var(--font-display);
  font-size: var(--text-xs);
  cursor: pointer;

  &:hover {
    background: rgba(252, 219, 51, 0.12);
  }
`;

// Wrap case-insensitive matches of `query` in a highlight mark
function highlightMatches(text, query) {
  const q = query.trim();
  if (!q || !text) return text;
  const lower = text.toLowerCase();
  const ql = q.toLowerCase();
  const parts = [];
  let i = 0;
  for (;;) {
    const j = lower.indexOf(ql, i);
    if (j === -1) break;
    if (j > i) parts.push(text.slice(i, j));
    parts.push(<Mark key={j}>{text.slice(j, j + q.length)}</Mark>);
    i = j + q.length;
  }
  if (parts.length === 0) return text;
  if (i < text.length) parts.push(text.slice(i));
  return parts;
}

// Online users whose name starts with `prefix`: the composer's @mention
// menu and the search panel's player filter share this
function matchMentionCandidates(prefix, onlineUsers) {
  const q = prefix.toLowerCase();
  return onlineUsers.filter((u) => (u.name || "").toLowerCase().startsWith(q)).slice(0, 6);
}

/* ── Search panel ──────────────────────────────── */

const SEARCH_RANGES = [
  { key: "24h", label: "24h" },
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" },
  { key: "all", label: "All" },
];
const SEARCH_DEFAULT_SINCE = "7d";
const SEARCH_PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 300;
const SEARCH_MIN_CHARS = 2;

// /chat?q=&player=&since= is the shareable form of a search
function readSearchUrl() {
  try {
    const sp = new URLSearchParams(window.location.search);
    const q = sp.get("q") || "";
    const player = sp.get("player") || "";
    const sinceRaw = sp.get("since");
    const since = SEARCH_RANGES.some((r) => r.key === sinceRaw) ? sinceRaw : SEARCH_DEFAULT_SINCE;
    return { q, player, since, open: Boolean(q.trim() || player.trim()) };
  } catch {
    return { q: "", player: "", since: SEARCH_DEFAULT_SINCE, open: false };
  }
}

async function fetchSearchPage({ q, player, since, offset }) {
  const sp = new URLSearchParams();
  if (q) sp.set("q", q);
  if (player) sp.set("player", player);
  sp.set("since", since);
  sp.set("limit", String(SEARCH_PAGE_SIZE));
  sp.set("offset", String(offset));
  const res = await relayFetch(`/api/chat/search?${sp.toString()}`);
  if (!res.ok) throw new Error(`search failed: ${res.status}`);
  const data = await res.json();
  const results = normalizeMessages(data.results || []);
  return { results, total: typeof data.total === "number" ? data.total : results.length };
}

// Relay-side states (server/src/signalr.js) that are not a client reconnect
const RELAY_FAULTS = {
  auth_failed: "relay auth failed",
  banned: "relay banned",
  no_token: "relay needs token",
};
const RELAY_OFFLINE = new Set(["error", "Disconnected", "stopped"]);

function readPref(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v === "1";
  } catch {
    return fallback;
  }
}

function writePref(key, value) {
  try {
    localStorage.setItem(key, value ? "1" : "0");
  } catch {
    // non-persistent is fine
  }
}


// firstItemIndex base for react-virtuoso: prepends (load earlier) decrease
// it by the number of rows added at the head so the viewport stays put
const FIRST_ITEM_BASE = 1_000_000;

// How many pages of older history a jump (search hit, permalink) pages in
// before giving up
const MAX_JUMP_PAGES = 20;

// Local "YYYY-MM-DD" for a native date input
function toInputDate(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// The relay's received_at cursor format: sqlite datetime('now'), UTC
function toRelayCursor(d) {
  return d.toISOString().slice(0, 19).replace("T", " ");
}

// Find the row that holds a message id (a group row holds several lines)
function findRowIndex(rows, id) {
  if (id == null) return -1;
  return rows.findIndex((r) => (r.msgs ? r.msgs.some((m) => m.id === id) : r.msg?.id === id));
}

// Virtuoso renders these outside the virtual window; dynamic state comes in
// through the `context` prop so the component references stay stable
function ListHeader({ context }) {
  const { showLoadOlder, loadingOlder, onLoadOlder } = context;
  return (
    <ListTop>
      {showLoadOlder && (
        <LoadOlderButton onClick={onLoadOlder} disabled={loadingOlder}>
          {loadingOlder ? "Loading..." : "Load earlier messages"}
        </LoadOlderButton>
      )}
    </ListTop>
  );
}

function ListFooter({ context }) {
  return (
    <ListBottom>
      {context.unmatchedBotResponses.map((br, i) => (
        <BotResponseRow key={`bot-${i}`} style={{ marginLeft: "var(--space-4)" }}>
          <BotLabel>BOT</BotLabel>
          {!br.botEnabled && <BotPreviewTag>(preview)</BotPreviewTag>}
          <BotPreviewTag style={{ marginLeft: 6 }}>{br.command}</BotPreviewTag>
          <BotText>{br.response}</BotText>
        </BotResponseRow>
      ))}
    </ListBottom>
  );
}

const listComponents = {
  Scroller: ChatScroller,
  List: ChatList,
  Header: ListHeader,
  Footer: ListFooter,
};

const rowKey = (index, row) => row.key;

export default function ChatPanel({
  messages,
  status,
  avatars,
  stats,
  sessions,
  inGameTags,
  inGameInfoMap,
  recentWinners,
  recentDeltas,
  gameEvents = [],
  ongoingMatchIds,
  liveGameCount = 0,
  liveStreamers,
  watchList,
  onlineUsers = [],
  botResponses = [],
  translations = new Map(),
  borderTheme,
  sendMessage,
  loadOlder,
  hasMoreHistory,
  loadWindow,
  loadLatest,
  windowMode = "live",
  windowId = 0,
  permalinkId = null,
}) {
  const virtuosoRef = useRef(null);
  const inputRef = useRef(null);
  const [showNotice, setShowNotice] = useState(false);
  const { adminKey: apiKey, isAdmin, setAdminKey: setApiKeyHook } = useAdmin();
  const [showKeyPrompt, setShowKeyPrompt] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [botDraft, setBotDraft] = useState("");
  const [botTesting, setBotTesting] = useState(false);
  const [showTranslations, setShowTranslations] = useState(() => readPref("chat:showTranslations", true));
  const [notifyOn, setNotifyOn] = useState(() => readPref("chat:notify", false));
  const [showGames, setShowGames] = useState(() => readPref("chat:showGames", true));
  const [focusOn, setFocusOn] = useState(() => readPref("chat:focus", false));
  // Expanded game tickers, per event id (not persisted)
  const [expandedEvents, setExpandedEvents] = useState(() => new Set());
  // Search panel; the initial state comes from the URL so a shared link
  // opens straight onto its results
  const [initialSearch] = useState(readSearchUrl);
  const [searchOpen, setSearchOpen] = useState(initialSearch.open);
  const [searchQuery, setSearchQuery] = useState(initialSearch.q);
  const [searchPlayer, setSearchPlayer] = useState(initialSearch.player);
  const [searchSince, setSearchSince] = useState(initialSearch.since);
  // null = nothing searched yet; [] = searched, no hits
  const [searchResults, setSearchResults] = useState(null);
  const [searchTotal, setSearchTotal] = useState(0);
  const [searching, setSearching] = useState(false);
  const [searchingMore, setSearchingMore] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [playerFieldFocused, setPlayerFieldFocused] = useState(false);
  // A result outside the loaded window: replace the window, then jump once
  // the new one is in (windowId bumps)
  const [windowJump, setWindowJump] = useState(null);
  const searchReqRef = useRef(0);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [newMarkerTime, setNewMarkerTime] = useState(null);
  const [searchAvatars, setSearchAvatars] = useState(new Map());
  const [flashId, setFlashId] = useState(null);
  const [jumping, setJumping] = useState(false);
  // { id, align } - scroll to this message's row once it exists in `rows`
  const [pendingJump, setPendingJump] = useState(null);
  // Sticky day bar: absolute Virtuoso index of the topmost visible row
  const [topIndex, setTopIndex] = useState(null);
  const [dayPickerOpen, setDayPickerOpen] = useState(false);
  const [archiveMin, setArchiveMin] = useState(null);
  const [loadingWindow, setLoadingWindow] = useState(false);
  const lastNotifiedRef = useRef(null);
  const flashTimerRef = useRef(null);
  const jumpingRef = useRef(false);
  const permalinkDoneRef = useRef(null);
  const dayPickerRef = useRef(null);
  const scrollerElRef = useRef(null);
  const rangeRef = useRef(null);
  const topRowRafRef = useRef(null);
  const messagesRef = useRef(messages);
  // Whether the viewport is pinned to the newest row. Fed by Virtuoso's
  // followOutput decision (which already treats an in-progress programmatic
  // scroll as "at bottom") and by atBottomStateChange.
  const atBottomRef = useRef(true);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Fetch profiles for search-result authors not already known to the page
  useEffect(() => {
    if (!searchResults) return;
    const missing = [...new Set(searchResults.map((r) => r.battleTag))]
      .filter((tag) => tag && !avatars?.get(tag) && !searchAvatars.has(tag));
    for (const tag of missing) {
      getPlayerProfile(tag).then((profile) => {
        setSearchAvatars((prev) => new Map(prev).set(tag, profile));
      });
    }
    // searchAvatars intentionally omitted - it's the accumulator this effect fills
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchResults, avatars]);

  // Jump to a message in the stream (search hit, permalink). The stream
  // holds the newest few hundred messages, so page older history in until
  // the target is loaded (bounded), then let the list scroll to its row
  // once it renders (see the pendingJump effect). `targetTime` (a search
  // hit's receivedAt) stops the paging early once history is older than
  // the target; a permalink has no timestamp and pages until found.
  const jumpToId = useCallback(async (id, targetTime = null) => {
    if (jumpingRef.current || id == null) return false;
    jumpingRef.current = true;
    setJumping(true);
    try {
      let oldest = messagesRef.current[0]?.receivedAt;
      let pages = 0;
      const isLoaded = () => messagesRef.current.some((m) => m.id === id);
      // sqlite datetime strings compare lexicographically
      const pastTarget = () => Boolean(targetTime && oldest && !(targetTime < oldest));
      while (!isLoaded() && loadOlder && !pastTarget() && pages < MAX_JUMP_PAGES) {
        const r = await loadOlder();
        if (!r || r.added === 0) break;
        oldest = r.oldestCursor || oldest;
        pages++;
      }
      if (!isLoaded()) return false;
      setFlashId(id);
      clearTimeout(flashTimerRef.current);
      flashTimerRef.current = setTimeout(() => setFlashId(null), 2500);
      setPendingJump({ id, align: "center" });
      return true;
    } finally {
      jumpingRef.current = false;
      setJumping(false);
    }
  }, [loadOlder]);

  // Search hit -> the stream. A hit whose message is already loaded scrolls
  // straight to it; anything outside the loaded window (older, or newer
  // than an archive window) replaces the window with the 100 messages up
  // to the hit, and the windowJump effect finishes the jump once the new
  // window has rendered.
  const jumpToResult = useCallback(async (result) => {
    if (result.id == null) return;
    setSearchOpen(false);
    const at = result.receivedAt ? new Date(`${String(result.receivedAt).replace(" ", "T")}Z`) : null;
    const canReload = Boolean(loadWindow) && at && !Number.isNaN(at.getTime());
    if (messagesRef.current.some((m) => m.id === result.id) || !canReload) {
      jumpToId(result.id, result.receivedAt);
      return;
    }
    setLoadingWindow(true);
    setWindowJump({ id: result.id, receivedAt: result.receivedAt, fromWindowId: windowId });
    try {
      // `before` is exclusive and received_at has second precision: +1s
      // keeps the hit itself inside the window
      await loadWindow(toRelayCursor(new Date(at.getTime() + 1000)));
    } catch {
      setWindowJump(null);
    } finally {
      setLoadingWindow(false);
    }
  }, [jumpToId, loadWindow, windowId]);

  // messagesRef is refreshed by an earlier effect, so jumpToId sees the
  // replaced window here
  useEffect(() => {
    if (!windowJump || windowId === windowJump.fromWindowId) return;
    setWindowJump(null);
    jumpToId(windowJump.id, windowJump.receivedAt);
  }, [windowJump, windowId, jumpToId]);

  // /chat?m=<id>: resolve once the first window is in, paging back if needed
  useEffect(() => {
    if (!permalinkId || messages.length === 0 || permalinkDoneRef.current === permalinkId) return;
    permalinkDoneRef.current = permalinkId;
    jumpToId(permalinkId);
  }, [permalinkId, messages.length, jumpToId]);

  // Focus mode: body class drives the navbar (Navbar.css), Esc exits
  useEffect(() => {
    if (!focusOn) return;
    document.body.classList.add("chat-focus");
    return () => document.body.classList.remove("chat-focus");
  }, [focusOn]);

  useEffect(() => {
    if (!focusOn && !dayPickerOpen && !searchOpen) return;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (dayPickerOpen) setDayPickerOpen(false);
      else if (searchOpen) setSearchOpen(false);
      else setFocusOn(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusOn, dayPickerOpen, searchOpen]);

  // Close the date popover on an outside click
  useEffect(() => {
    if (!dayPickerOpen) return;
    const onDown = (e) => {
      if (!dayPickerRef.current?.contains(e.target)) setDayPickerOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [dayPickerOpen]);

  // Archive range for the date input, fetched the first time it opens
  useEffect(() => {
    if (!dayPickerOpen || archiveMin) return;
    let cancelled = false;
    relayFetch("/api/chat/stats")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data?.oldestMessage) return;
        const d = new Date(`${String(data.oldestMessage).replace(" ", "T")}Z`);
        if (!Number.isNaN(d.getTime())) setArchiveMin(toInputDate(d));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [dayPickerOpen, archiveMin]);

  // Jump to date: load the window that ends at the start of the next local
  // day and scroll to that day's first message (or the window's last row
  // when the day is empty). Today is the live tail.
  const jumpToDate = useCallback(async (ymd) => {
    if (!ymd || !loadWindow || loadingWindow) return;
    const [y, m, d] = ymd.split("-").map(Number);
    if (!y || !m || !d) return;
    const dayStart = new Date(y, m - 1, d);
    const nextDay = new Date(y, m - 1, d + 1);
    const key = getDateKey(dayStart);
    const isToday = key === getDateKey(Date.now());
    setDayPickerOpen(false);
    setLoadingWindow(true);
    try {
      const loaded = isToday ? await loadLatest() : await loadWindow(toRelayCursor(nextDay));
      const first = loaded.find((msg) => getDateKey(msg.sentAt) === key) || loaded[loaded.length - 1];
      setPendingJump(first ? { id: first.id, align: "start" } : null);
    } catch {
      // relay unreachable; the current window stays
    } finally {
      setLoadingWindow(false);
    }
  }, [loadWindow, loadLatest, loadingWindow]);

  const backToLive = useCallback(async () => {
    if (!loadLatest || loadingWindow) return;
    setLoadingWindow(true);
    setPendingJump(null);
    try {
      await loadLatest();
      setShowNotice(false);
    } catch {
      // relay unreachable; the current window stays
    } finally {
      setLoadingWindow(false);
    }
  }, [loadLatest, loadingWindow]);

  // Sticky day bar: which row is at the top of the viewport. Measured from
  // the rendered rows (Virtuoso stamps data-index on each), falling back to
  // the rendered range's start when nothing has a box yet (first paint,
  // tests). Scroll events are coalesced into one frame.
  const updateTopRow = useCallback(() => {
    const el = scrollerElRef.current;
    let idx = null;
    if (el) {
      const top = el.getBoundingClientRect().top;
      const nodes = el.querySelectorAll("[data-index]");
      for (const n of nodes) {
        const r = n.getBoundingClientRect();
        if (r.height > 0 && r.bottom > top + 1) {
          idx = Number(n.dataset.index);
          break;
        }
      }
    }
    if (idx === null && rangeRef.current) idx = rangeRef.current.startIndex;
    setTopIndex(idx);
  }, []);

  const scheduleTopRow = useCallback(() => {
    cancelAnimationFrame(topRowRafRef.current);
    topRowRafRef.current = requestAnimationFrame(updateTopRow);
  }, [updateTopRow]);

  const handleRangeChanged = useCallback((range) => {
    rangeRef.current = range;
    updateTopRow();
  }, [updateTopRow]);

  const handleScrollerRef = useCallback((el) => {
    const prev = scrollerElRef.current;
    if (prev && prev !== el) prev.removeEventListener("scroll", scheduleTopRow);
    scrollerElRef.current = el;
    if (el && el !== prev) el.addEventListener("scroll", scheduleTopRow, { passive: true });
  }, [scheduleTopRow]);

  useEffect(() => () => cancelAnimationFrame(topRowRafRef.current), []);

  // Notification blip for watched players' messages
  useEffect(() => {
    if (!notifyOn || !watchList || watchList.size === 0 || messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last.id === lastNotifiedRef.current) return;
    lastNotifiedRef.current = last.id;
    if (watchList.has(last.battleTag.toLowerCase())) playPing();
  }, [messages, notifyOn, watchList]);

  // "- new -" marker: remember where you were when the tab went hidden
  useEffect(() => {
    let clearTimer = null;
    const onVisibility = () => {
      if (document.hidden) {
        clearTimeout(clearTimer);
        const last = messages[messages.length - 1];
        if (last) setNewMarkerTime(new Date(last.sentAt).getTime());
      } else {
        clearTimer = setTimeout(() => setNewMarkerTime(null), 120_000);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearTimeout(clearTimer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [messages]);

  const toggleTranslations = () => {
    setShowTranslations((v) => {
      writePref("chat:showTranslations", !v);
      return !v;
    });
  };

  const toggleNotify = () => {
    setNotifyOn((v) => {
      writePref("chat:notify", !v);
      return !v;
    });
  };

  const toggleGames = () => {
    setShowGames((v) => {
      writePref("chat:showGames", !v);
      return !v;
    });
  };

  const toggleFocus = () => {
    setFocusOn((v) => {
      writePref("chat:focus", !v);
      return !v;
    });
  };

  // Focus hides tickers without touching the persisted Games preference
  const showTickers = showGames && !focusOn;

  const toggleEvent = useCallback((id) => {
    setExpandedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // The effective search: each field counts once it has enough characters
  const searchQ = searchQuery.trim().length >= SEARCH_MIN_CHARS ? searchQuery.trim() : "";
  const searchP = searchPlayer.trim().length >= SEARCH_MIN_CHARS ? searchPlayer.trim() : "";
  const searchActive = Boolean(searchQ || searchP);

  // Debounced search against the relay; a stale response never lands
  useEffect(() => {
    if (!searchOpen) return;
    if (!searchActive) {
      setSearchResults(null);
      setSearchTotal(0);
      setSearching(false);
      return;
    }
    const reqId = ++searchReqRef.current;
    setSearching(true);
    setSearchError(false);
    const t = setTimeout(() => {
      fetchSearchPage({ q: searchQ, player: searchP, since: searchSince, offset: 0 })
        .then(({ results, total }) => {
          if (reqId !== searchReqRef.current) return;
          setSearchResults(results);
          setSearchTotal(total);
        })
        .catch(() => {
          if (reqId !== searchReqRef.current) return;
          setSearchResults([]);
          setSearchTotal(0);
          setSearchError(true);
        })
        .finally(() => {
          if (reqId === searchReqRef.current) setSearching(false);
        });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchOpen, searchActive, searchQ, searchP, searchSince]);

  const loadMoreResults = useCallback(async () => {
    if (!searchResults || searchingMore) return;
    const reqId = searchReqRef.current;
    setSearchingMore(true);
    try {
      const { results, total } = await fetchSearchPage({ q: searchQ, player: searchP, since: searchSince, offset: searchResults.length });
      if (reqId !== searchReqRef.current) return;
      setSearchResults((prev) => {
        const ids = new Set(prev.map((r) => r.id));
        return [...prev, ...results.filter((r) => !ids.has(r.id))];
      });
      setSearchTotal(total);
    } catch {
      // keep the page already on screen
    } finally {
      setSearchingMore(false);
    }
  }, [searchResults, searchingMore, searchQ, searchP, searchSince]);

  // Mirror the search into the address bar (?q=&player=&since=) so it can
  // be shared; replaceState keeps the router out of it, like permalinks
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (searchOpen && searchActive) {
      if (searchQ) sp.set("q", searchQ);
      else sp.delete("q");
      if (searchP) sp.set("player", searchP);
      else sp.delete("player");
      sp.set("since", searchSince);
    } else {
      sp.delete("q");
      sp.delete("player");
      sp.delete("since");
    }
    const qs = sp.toString();
    const next = `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`;
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (next !== current) window.history.replaceState(window.history.state, "", next);
  }, [searchOpen, searchActive, searchQ, searchP, searchSince]);

  // Player filter suggestions from the online list, like composer @mentions.
  // A picked suggestion is a full battleTag, which the relay matches exactly.
  const playerSuggestions = useMemo(() => {
    if (!playerFieldFocused) return null;
    const p = searchPlayer.trim();
    if (!p || p.includes("#")) return null;
    const candidates = matchMentionCandidates(p, onlineUsers);
    return candidates.length > 0 ? candidates : null;
  }, [playerFieldFocused, searchPlayer, onlineUsers]);

  const pickPlayer = useCallback((user) => {
    setSearchPlayer(user.battleTag || user.name);
    setPlayerFieldFocused(false);
  }, []);

  // Prepends go through Virtuoso's firstItemIndex (see the memo below), so
  // the viewport stays anchored without any scrollHeight arithmetic here
  const handleLoadOlder = useCallback(async () => {
    if (!loadOlder || loadingOlder) return;
    setLoadingOlder(true);
    try {
      await loadOlder();
    } finally {
      setLoadingOlder(false);
    }
  }, [loadOlder, loadingOlder]);

  // @mention autocomplete state derived from the draft
  const mentionMatch = useMemo(() => {
    const m = draft.match(/@([\w#]*)$/);
    if (!m) return null;
    const candidates = matchMentionCandidates(m[1], onlineUsers);
    return candidates.length > 0 ? { prefix: m[1], candidates } : null;
  }, [draft, onlineUsers]);

  const insertMention = useCallback((name) => {
    setDraft((d) => d.replace(/@([\w#]*)$/, `@${name} `));
    inputRef.current?.focus();
  }, []);

  const handleSend = useCallback(async (e) => {
    e.preventDefault();
    if (!draft.trim() || !apiKey || sending || !sendMessage) return;
    setSending(true);
    setSendError(null);
    try {
      await sendMessage(draft.trim(), apiKey);
      setDraft("");
      inputRef.current?.focus();
    } catch (err) {
      setSendError(err.message);
    } finally {
      setSending(false);
    }
  }, [draft, apiKey, sending, sendMessage]);

  function handleSaveKey(e) {
    e.preventDefault();
    const input = e.target.elements?.apiKeyInput?.value?.trim();
    if (input) {
      setApiKeyHook(input);
    }
    setShowKeyPrompt(false);
  }

  function handleClearKey() {
    setApiKeyHook("");
    setShowKeyPrompt(false);
  }

  const handleBotTest = useCallback(async (e) => {
    e.preventDefault();
    const cmd = botDraft.trim();
    if (!cmd || botTesting) return;
    const command = cmd.startsWith("!") ? cmd : `!${cmd}`;
    setBotTesting(true);
    try {
      const key = apiKey;
      const res = await relayFetch(`/api/admin/bot/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": key },
        body: JSON.stringify({ command }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed (${res.status})`);
      }
      setBotDraft("");
    } catch (err) {
      setSendError(err.message);
    } finally {
      setBotTesting(false);
    }
  }, [botDraft, apiKey, botTesting]);

  const { botResponseMap, unmatchedBotResponses } = useBotResponseMap(botResponses, messages);
  const messageSegments = useMessageSegments(messages);

  // One list row per message group (author + consecutive lines within 2 min)
  // or system message, plus game events woven in by timestamp when the Games
  // toggle is on. A group sorts by its first line, so an event never lands
  // inside a group.
  const renderItems = useMemo(() => {
    const items = [];
    for (const seg of messageSegments) {
      const start = seg.start;
      const time = new Date(start.sentAt).getTime();
      if (start.kind === "system") {
        items.push({ kind: "system", key: start.id, msg: start, time });
      } else {
        items.push({ kind: "group", key: start.id, msg: start, msgs: [start, ...seg.continuations], time });
      }
    }
    if (showTickers) {
      const oldestLoaded = items.length > 0 ? items[0].time : 0;
      for (const ev of gameEvents) {
        const t = new Date(ev.time).getTime();
        if (t >= oldestLoaded) items.push({ kind: "event", key: ev.id, ev, time: t });
      }
    }
    return items.sort((a, b) => a.time - b.time);
  }, [messageSegments, gameEvents, showTickers]);

  // Date divider + "new" marker flags, decided across group-start rows only
  const rows = useMemo(() => {
    let prevSegTime = null;
    let newMarkerShown = false;
    return renderItems.map((item) => {
      if (item.kind !== "group" && item.kind !== "system") return item;
      const msgTime = item.msg.sentAt;
      const showDateDivider = prevSegTime === null || getDateKey(prevSegTime) !== getDateKey(msgTime);
      const showNewMarker = !newMarkerShown && newMarkerTime != null && item.time > newMarkerTime;
      if (showNewMarker) newMarkerShown = true;
      prevSegTime = msgTime;
      return { ...item, showDateDivider, showNewMarker };
    });
  }, [renderItems, newMarkerTime]);

  // Virtuoso keeps the viewport anchored across prepends when firstItemIndex
  // drops by the number of rows added ahead of the previous first row, in
  // the same render as the data change. Removals at the head leave it alone.
  const headRef = useRef({ key: null, time: 0, index: FIRST_ITEM_BASE, windowId });
  const firstItemIndex = useMemo(() => {
    // A replaced window (jump to date, back to live) remounts the list, so
    // its anchor starts over
    if (headRef.current.windowId !== windowId) {
      headRef.current = { key: null, time: 0, index: FIRST_ITEM_BASE, windowId };
    }
    const head = headRef.current;
    const first = rows[0];
    if (!first) return head.index;
    let index = head.index;
    if (head.key !== null && head.key !== first.key) {
      let added = rows.findIndex((r) => r.key === head.key);
      if (added === -1) {
        added = 0;
        while (added < rows.length && rows[added].time < head.time) added++;
      }
      index -= added;
    }
    headRef.current = { key: first.key, time: first.time, index, windowId };
    return index;
  }, [rows, windowId]);

  // Jump (search hit, permalink, date): scroll to the row once it exists.
  // If the list is about to (re)mount (search closing, window replaced),
  // the initial position handles it instead.
  const pendingJumpIndex = pendingJump ? findRowIndex(rows, pendingJump.id) : -1;
  const pendingJumpAlign = pendingJump?.align || "center";
  useEffect(() => {
    if (pendingJumpIndex === -1 || searchOpen) return;
    const raf = requestAnimationFrame(() => {
      virtuosoRef.current?.scrollToIndex({ index: pendingJumpIndex, align: pendingJumpAlign });
      setPendingJump(null);
    });
    return () => cancelAnimationFrame(raf);
  }, [pendingJumpIndex, pendingJumpAlign, searchOpen]);

  // "New messages below" when a new tail arrives while scrolled up. Paging
  // in older history changes `messages` too, so key off the newest id; a
  // replaced window is not a new tail either.
  const lastMsgIdRef = useRef(null);
  const noticeWindowRef = useRef(windowId);
  useEffect(() => {
    const lastId = messages[messages.length - 1]?.id ?? null;
    const isNewTail = lastId !== lastMsgIdRef.current && noticeWindowRef.current === windowId;
    lastMsgIdRef.current = lastId;
    noticeWindowRef.current = windowId;
    if (isNewTail && messages.length > 0 && !atBottomRef.current) setShowNotice(true);
  }, [messages, windowId]);

  const followOutput = useCallback((isAtBottom) => {
    atBottomRef.current = isAtBottom;
    return isAtBottom ? "smooth" : false;
  }, []);

  const handleAtBottomChange = useCallback((atBottom) => {
    atBottomRef.current = atBottom;
    if (atBottom) setShowNotice(false);
  }, []);

  function scrollToBottom() {
    virtuosoRef.current?.scrollToIndex({ index: "LAST", align: "end", behavior: "smooth" });
    setShowNotice(false);
  }

  const showLoadOlder = Boolean(hasMoreHistory && loadOlder);

  // Reaching the top pages older history in automatically; the button stays
  // for keyboard and screen-reader users
  const handleStartReached = useCallback(() => {
    if (showLoadOlder) handleLoadOlder();
  }, [showLoadOlder, handleLoadOlder]);

  // Status chip for a name row, shared with the roster (chat/chip.js)
  const chipCtx = { inGameTags, recentDeltas, recentWinners, startTimes: inGameInfoMap };

  const hoverData = { avatars, stats, sessions, inGameTags, inGameInfoMap };
  const renderLine = (line) => linkifyMessage(line.text);
  const renderSearchLine = (line) => highlightMatches(line.text, searchQ);
  // Name inside a result narrows the search to that player (the row itself
  // jumps into the stream, see SearchResultRow)
  const filterByAuthor = (author) => setSearchPlayer(author.battleTag || author.userName || "");
  const jumpBusy = jumping || loadingWindow;
  const permalinkHref = (line) => `${window.location.origin}/chat?m=${encodeURIComponent(line.id)}`;
  const renderAfterLine = (line) => {
    const br = botResponseMap.get(line.id);
    if (!br) return null;
    return (
      <BotResponseRow>
        <BotLabel>BOT</BotLabel>
        {!br.botEnabled && <BotPreviewTag>(preview)</BotPreviewTag>}
        <BotText>{br.response}</BotText>
      </BotResponseRow>
    );
  };

  const listContext = useMemo(
    () => ({ showLoadOlder, loadingOlder, onLoadOlder: handleLoadOlder, unmatchedBotResponses }),
    [showLoadOlder, loadingOlder, handleLoadOlder, unmatchedBotResponses]
  );

  const renderRow = (index, row) => {
    // Game event woven into the stream: one-line ticker, card on click
    if (row.kind === "event") {
      const ev = row.ev;
      const stillRunning = ev.type !== "game_end" && Boolean(ongoingMatchIds?.has(ev.matchId));
      return (
        <GameTicker
          event={ev}
          expanded={expandedEvents.has(ev.id)}
          onToggle={toggleEvent}
          stillRunning={stillRunning}
          hoverData={hoverData}
          avatars={avatars}
        />
      );
    }

    const msg = row.msg;
    const msgTime = msg.sentAt;
    const isFirstRow = index - firstItemIndex === 0;
    const dividers = (
      <>
        {row.showDateDivider && (
          <DateDivider $first={isFirstRow && !showLoadOlder}>
            <DateLabel>{formatDateDivider(msgTime)}</DateLabel>
          </DateDivider>
        )}
        {row.showNewMarker && (
          <NewDivider><NewDividerLabel>new</NewDividerLabel></NewDivider>
        )}
      </>
    );

    // System message
    if (row.kind === "system") {
      return (
        <>
          {dividers}
          <SystemWrap>
            <SystemMessageRow>{msg.text}</SystemMessageRow>
          </SystemWrap>
        </>
      );
    }

    const tag = msg.battleTag;
    const isWatched = Boolean(tag) && Boolean(watchList?.has(tag.toLowerCase()));
    const profile = avatars?.get(tag);
    const playerStats = stats?.get(tag);
    const live = liveStreamers?.get(tag);
    const gameInfo = inGameTags?.has(tag) ? inGameInfoMap?.get(tag) : null;

    const group = {
      author: { battleTag: tag, userName: msg.userName, clanTag: msg.clanTag },
      lines: row.msgs.map((m) => ({
        id: m.id,
        text: m.text,
        sentAt: m.sentAt,
        kind: m.kind,
        translation: showTranslations ? translations.get(m.id) : undefined,
        highlight: flashId === m.id,
      })),
    };
    const meta = {
      avatarUrl: profile?.profilePicUrl,
      race: playerStats?.race,
      countryCode: profile?.country,
      mmr: playerStats?.mmr,
      chip: chipForTag(tag, chipCtx),
      twitchLogin: live?.twitchName,
      twitchTitle: live?.title,
    };
    const wrapName = (node) => (
      <PlayerHoverCard battleTag={tag} avatars={avatars} stats={stats} sessions={sessions} inGameInfo={gameInfo}>
        {node}
      </PlayerHoverCard>
    );

    return (
      <>
        {dividers}
        <ChatMessage
          variant="feed"
          group={group}
          meta={meta}
          watched={isWatched}
          wrapName={wrapName}
          renderLine={renderLine}
          renderAfterLine={renderAfterLine}
          permalinkHref={permalinkHref}
          $compact={focusOn}
        />
      </>
    );
  };

  // Sticky day bar label: the day of the topmost visible row
  const topRow = topIndex == null ? null : rows[topIndex - firstItemIndex];
  const topDayLabel = topRow ? formatDateDivider(new Date(topRow.time).toISOString()) : null;
  const topDayInput = topRow ? toInputDate(new Date(topRow.time)) : toInputDate(new Date());
  const todayInput = toInputDate(new Date());

  const fault = RELAY_FAULTS[status];
  const statusText =
    status === "connected"
      ? messages.length
      : fault
        ? fault
        : RELAY_OFFLINE.has(status)
          ? "relay offline"
          : status === "reconnecting"
            ? "Reconnecting..."
            : "Connecting...";

  return (
    <OuterFrame>
      <Wrapper $theme={borderTheme}>
        <Header $theme={borderTheme}>
          <Title>4v4 Chat</Title>
          <HeaderActions>
            {liveGameCount > 0 && (
              <LiveGamesChip to="/live" title="Watch live games">
                <GiCrossedSwords />
                {liveGameCount} live
              </LiveGamesChip>
            )}
            <ToggleButton
              type="button"
              $pill
              data-active={showTranslations}
              aria-pressed={showTranslations}
              onClick={toggleTranslations}
              title={showTranslations ? "Hide translations" : "Show translations"}
            >
              <HiTranslate />
              <ToggleLabel>Translate</ToggleLabel>
            </ToggleButton>
            <ToggleButton
              type="button"
              $pill
              data-active={notifyOn}
              aria-pressed={notifyOn}
              onClick={toggleNotify}
              title={notifyOn ? "Mute watched-player pings" : "Ping when watched players chat"}
            >
              <HiBell />
              <ToggleLabel>Ping</ToggleLabel>
            </ToggleButton>
            <ToggleButton
              type="button"
              $pill
              data-active={searchOpen}
              aria-pressed={searchOpen}
              onClick={() => setSearchOpen((v) => !v)}
              title="Search chat history"
            >
              <HiSearch />
              <ToggleLabel>Search</ToggleLabel>
            </ToggleButton>
            <ToggleButton
              type="button"
              $pill
              data-active={showGames}
              aria-pressed={showGames}
              onClick={toggleGames}
              title={showGames ? "Hide game tickers" : "Show game tickers"}
            >
              <GiCrossedSwords />
              <ToggleLabel>Games</ToggleLabel>
            </ToggleButton>
            <ToggleButton
              type="button"
              $pill
              data-active={focusOn}
              aria-pressed={focusOn}
              onClick={toggleFocus}
              title={focusOn ? "Exit focus mode (Esc)" : "Focus mode: hide the navbar and tickers, compact feed"}
            >
              <HiOutlineArrowsExpand />
              <ToggleLabel>Focus</ToggleLabel>
            </ToggleButton>
            <StatusBadge $fault={Boolean(fault)} title={`relay: ${status}`}>
              <StatusDot $connected={status === "connected"} $fault={Boolean(fault)} />
              {statusText}
            </StatusBadge>
          </HeaderActions>
        </Header>
        {searchOpen && (
          <SearchPanel role="search" aria-label="Search chat history">
            <SearchRow>
              <SearchField
                type="text"
                placeholder="Search messages..."
                aria-label="Search messages"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus={!initialSearch.open}
              />
              <PlayerFieldWrap>
                <PlayerField
                  type="text"
                  placeholder="Player"
                  aria-label="Filter by player"
                  value={searchPlayer}
                  onChange={(e) => setSearchPlayer(e.target.value)}
                  onFocus={() => setPlayerFieldFocused(true)}
                  onBlur={() => setPlayerFieldFocused(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Tab" && playerSuggestions) {
                      e.preventDefault();
                      pickPlayer(playerSuggestions[0]);
                    }
                  }}
                />
                {playerSuggestions && (
                  <MentionMenu $below role="listbox" aria-label="Player suggestions">
                    {playerSuggestions.map((u) => (
                      <MentionItem
                        key={u.battleTag}
                        type="button"
                        role="option"
                        aria-selected={false}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => pickPlayer(u)}
                      >
                        {u.name}
                      </MentionItem>
                    ))}
                  </MentionMenu>
                )}
              </PlayerFieldWrap>
            </SearchRow>
            <SearchRow>
              <RangeGroup role="group" aria-label="Search range">
                {SEARCH_RANGES.map((r) => (
                  <RangePill
                    key={r.key}
                    type="button"
                    $pill
                    data-active={searchSince === r.key}
                    aria-pressed={searchSince === r.key}
                    onClick={() => setSearchSince(r.key)}
                  >
                    {r.label}
                  </RangePill>
                ))}
              </RangeGroup>
              {!searching && searchResults && !searchError && (
                <ResultCount aria-live="polite">
                  {searchTotal} {searchTotal === 1 ? "result" : "results"}
                </ResultCount>
              )}
            </SearchRow>
          </SearchPanel>
        )}
        {searchOpen ? (
          <SearchResults>
            {searching &&
              [...Array(5)].map((_, i) => (
                <SkeletonRow key={i} data-testid="search-skeleton">
                  <Skeleton $w="24px" $h="24px" $radius="var(--radius-md)" style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, paddingTop: 2 }}>
                    <Skeleton $w="90px" $h="12px" />
                    <Skeleton $w={`${40 + ((i * 17) % 45)}%`} $h="14px" />
                  </div>
                </SkeletonRow>
              ))}
            {!searching && searchError && (
              <SearchEmpty>Search failed. The relay may be offline, try again in a moment.</SearchEmpty>
            )}
            {!searching && !searchError && !searchResults && (
              <SearchEmpty>
                Search messages, filter by player, or both. At least {SEARCH_MIN_CHARS} characters.
              </SearchEmpty>
            )}
            {!searching && !searchError && searchResults && searchResults.length === 0 && (
              <SearchEmpty>
                No messages match{searchSince !== "all" ? " in this range. Try a wider one." : "."}
              </SearchEmpty>
            )}
            {!searching &&
              searchResults?.map((r, i) => {
                const prev = i > 0 ? searchResults[i - 1] : null;
                const when = r.sentAt || r.receivedAt;
                const showDay = !prev || getDateKey(prev.sentAt || prev.receivedAt) !== getDateKey(when);
                const profile = avatars?.get(r.battleTag) || searchAvatars.get(r.battleTag);
                const playerStats = stats?.get(r.battleTag);
                const group = {
                  author: { battleTag: r.battleTag, userName: r.userName, clanTag: r.clanTag },
                  lines: [{ id: r.id, text: r.text, sentAt: r.sentAt, kind: r.kind }],
                };
                const meta = {
                  avatarUrl: profile?.profilePicUrl,
                  race: playerStats?.race,
                  countryCode: profile?.country,
                  mmr: playerStats?.mmr,
                };
                return (
                  <React.Fragment key={r.id ?? `${r.receivedAt}-${i}`}>
                    {showDay && (
                      <ResultDivider $first={i === 0}>
                        <DateLabel>{formatDateDivider(when)}</DateLabel>
                      </ResultDivider>
                    )}
                    <SearchResultRow
                      role="button"
                      tabIndex={0}
                      title="Jump to message"
                      aria-disabled={jumpBusy}
                      onClick={(e) => {
                        if (jumpBusy || e.target.closest("button, a")) return;
                        jumpToResult(r);
                      }}
                      onKeyDown={(e) => {
                        if (e.target !== e.currentTarget || (e.key !== "Enter" && e.key !== " ")) return;
                        e.preventDefault();
                        if (!jumpBusy) jumpToResult(r);
                      }}
                    >
                      <ChatMessage
                        variant="transcript"
                        group={group}
                        meta={meta}
                        onNameClick={filterByAuthor}
                        renderLine={renderSearchLine}
                      />
                    </SearchResultRow>
                  </React.Fragment>
                );
              })}
            {!searching && searchResults && searchResults.length < searchTotal && (
              <MoreRow>
                <Button type="button" $pill disabled={searchingMore} onClick={loadMoreResults}>
                  {searchingMore ? "Loading..." : "More"}
                </Button>
              </MoreRow>
            )}
          </SearchResults>
        ) : null}
        {searchOpen ? null : messages.length === 0 ? (
          status !== "connected" ? (
            <MessageList>
              {[...Array(6)].map((_, i) => (
                <div key={i} style={{ display: "flex", gap: "var(--space-2)", padding: "var(--space-4) var(--space-4)", alignItems: "flex-start" }}>
                  <Skeleton $w="32px" $h="32px" $radius="var(--radius-md)" style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, paddingTop: 4 }}>
                    <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
                      <Skeleton $w="100px" $h="14px" />
                      <Skeleton $w="50px" $h="10px" />
                    </div>
                    <Skeleton $w={`${50 + Math.random() * 40}%`} $h="14px" />
                    {i % 2 === 0 && <Skeleton $w={`${30 + Math.random() * 30}%`} $h="14px" />}
                  </div>
                </div>
              ))}
            </MessageList>
          ) : (
            <EmptyState>No messages yet</EmptyState>
          )
        ) : (
          <ScrollContainer>
            <Virtuoso
              key={windowId}
              ref={virtuosoRef}
              style={{ flex: 1, height: "100%" }}
              data={rows}
              context={listContext}
              components={listComponents}
              computeItemKey={rowKey}
              itemContent={renderRow}
              firstItemIndex={firstItemIndex}
              initialTopMostItemIndex={
                pendingJumpIndex !== -1 ? { index: pendingJumpIndex, align: pendingJumpAlign } : rows.length - 1
              }
              followOutput={followOutput}
              atBottomStateChange={handleAtBottomChange}
              startReached={handleStartReached}
              rangeChanged={handleRangeChanged}
              scrollerRef={handleScrollerRef}
              atBottomThreshold={40}
              increaseViewportBy={{ top: 400, bottom: 400 }}
            />
            <StickyBar>
              <DayPicker ref={dayPickerRef}>
                {topDayLabel && (
                  <DayButton
                    type="button"
                    $pill
                    data-active={dayPickerOpen}
                    aria-haspopup="dialog"
                    aria-expanded={dayPickerOpen}
                    title="Jump to date"
                    onClick={() => setDayPickerOpen((v) => !v)}
                  >
                    {topDayLabel}
                  </DayButton>
                )}
                {dayPickerOpen && (
                  <DayPopover role="dialog" aria-label="Jump to date">
                    <DayPopoverLabel htmlFor="chat-jump-date">Jump to date</DayPopoverLabel>
                    <DateInput
                      id="chat-jump-date"
                      type="date"
                      defaultValue={topDayInput}
                      min={archiveMin || undefined}
                      max={todayInput}
                      disabled={loadingWindow}
                      onChange={(e) => jumpToDate(e.target.value)}
                      autoFocus
                    />
                  </DayPopover>
                )}
              </DayPicker>
              {windowMode !== "live" && (
                <BackToLiveButton
                  type="button"
                  $pill
                  data-active="true"
                  disabled={loadingWindow}
                  onClick={backToLive}
                  title="Reload the latest messages"
                >
                  {loadingWindow ? "Loading..." : "Back to live"}
                </BackToLiveButton>
              )}
            </StickyBar>
            {showNotice && (
              <ScrollNotice onClick={scrollToBottom}>
                New messages below
              </ScrollNotice>
            )}
          </ScrollContainer>
        )}
      </Wrapper>
      {isAdmin && sendMessage && showKeyPrompt && !apiKey && (
        <KeyPrompt as="form" onSubmit={handleSaveKey}>
          <KeyLabel>API Key:</KeyLabel>
          <KeyInput name="apiKeyInput" type="password" placeholder="Enter admin API key" autoFocus />
          <SendButton type="submit"><IoSend size={14} /></SendButton>
        </KeyPrompt>
      )}
      {isAdmin && sendMessage && (apiKey || !showKeyPrompt) && (
        <InputBar onSubmit={handleSend}>
          <KeyButton
            type="button"
            $active={!!apiKey}
            onClick={() => apiKey ? handleClearKey() : setShowKeyPrompt(true)}
            title={apiKey ? "Clear API key" : "Set API key"}
          >
            <HiKey size={16} />
          </KeyButton>
          {apiKey ? (
            <>
              {mentionMatch && (
                <MentionMenu>
                  {mentionMatch.candidates.map((u) => (
                    <MentionItem
                      key={u.battleTag}
                      type="button"
                      onClick={() => insertMention(u.name)}
                    >
                      {u.name}
                    </MentionItem>
                  ))}
                </MentionMenu>
              )}
              <ChatInput
                ref={inputRef}
                type="text"
                placeholder="Send a message..."
                value={draft}
                onChange={(e) => { setDraft(e.target.value); setSendError(null); }}
                onKeyDown={(e) => {
                  if (e.key === "Tab" && mentionMatch) {
                    e.preventDefault();
                    insertMention(mentionMatch.candidates[0].name);
                  }
                }}
                disabled={sending}
                maxLength={500}
              />
              {sendError && <SendError title={sendError}>!</SendError>}
              <SendButton type="submit" disabled={sending || !draft.trim()}>
                <IoSend size={14} />
              </SendButton>
            </>
          ) : (
            <KeyLabel>Set API key to send messages</KeyLabel>
          )}
        </InputBar>
      )}
      {isAdmin && (
        <BotTestBar onSubmit={handleBotTest}>
          <BotTestPrefix>BOT</BotTestPrefix>
          <BotTestInput
            type="text"
            placeholder="!games, !stats name, !recap topic 50, !help"
            value={botDraft}
            onChange={(e) => setBotDraft(e.target.value)}
            disabled={botTesting}
            maxLength={200}
          />
          <SendButton type="submit" disabled={botTesting || !botDraft.trim()}>
            <IoSend size={14} />
          </SendButton>
        </BotTestBar>
      )}
    </OuterFrame>
  );
}
