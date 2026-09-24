import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { Virtuoso } from "react-virtuoso";
import styled from "styled-components";
import { IoSend } from "react-icons/io5";
import { HiOutlineSearch } from "react-icons/hi";
import { Button, Skeleton, Input } from "./ui";
import { useMessageSegments, useBotResponseMap, formatDateDivider, getDateKey } from "../lib/useChatMessages";
import { linkifyMessage } from "../lib/chatExtras";
import PlayerHoverCard from "./PlayerHoverCard";
import ChatMessage from "./chat/ChatMessage";
import GameRow from "./chat/GameRow";
import StatsStrip from "./chat/StatsStrip";
import UnfurlCard from "./chat/UnfurlCard";
import { findWatchedMentions, splitByMentions } from "../lib/chat/mentions";
import { detectUnfurl } from "../lib/chat/unfurl";
import { notifyChat } from "../lib/chat/notify";
import { applyTabBadge } from "../lib/chat/tabBadge";
import { useUnreadCount, useDocumentVisible } from "../lib/chat/useUnread";
import { chipForTag } from "./chat/chip";
import { getPlayerProfile } from "../lib/api";
import { relayFetch } from "../lib/relay";
import { normalizeMessages } from "../lib/chat/normalize";
import useAdmin from "../lib/useAdmin";
import { setTrimPaused } from "../lib/chat/trimGate";
import { Panel } from "./chat/panel";

/* The list's box is padding 6px 18px 12px (Chat v2 handoff); the panel
   frame is the one all four /chat panels share (chat/panel.js) */
const LIST_PAD_X = "18px";
const LIST_PAD_TOP = "6px";
const LIST_PAD_BOTTOM = "12px";

const OuterFrame = styled.div`
  position: relative;
  flex: 1;
  height: 100%;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  font-family: var(--font-body);
`;

/* Every level from the grid cell down to the Virtuoso scroller takes its
   height from flex (basis 0, min-height 0), never from a percentage: a
   percentage height inside a flex-sized item resolves to auto in some
   engines, and the scroller would then grow to its content and push the
   panel past the viewport. */
const Wrapper = styled(Panel).attrs({ as: "div" })`
  flex: 1 1 0;
  min-height: 0;
`;

/* Everything under the stats strip: the list (or the search panel and its
   results, or an empty state) with the search toggle pinned in its corner */
const Body = styled.div`
  position: relative;
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
`;

/* Corner control inset: the icon box plus its gutters, so the sticky day
   bar and the search fields stop short of it while the list itself keeps
   its own padding (the per-line copy-link icons and timestamps sit under
   the icon only above the fold, where the day bar already floats) */
const CORNER_TOP = "8px";
const CORNER_RIGHT = "14px";
const CORNER_SIZE = 24; // px
const CORNER_INSET = `calc(${CORNER_RIGHT} + ${CORNER_SIZE}px + var(--space-2))`;

const SearchToggle = styled(Button)`
  position: absolute;
  top: ${CORNER_TOP};
  right: ${CORNER_RIGHT};
  z-index: 3;
  width: ${CORNER_SIZE}px;
  height: ${CORNER_SIZE}px;
  padding: 0;
  border-radius: var(--radius-sm);
  background: rgba(10, 8, 6, 0.85);
  border-color: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(4px);
  svg {
    width: 14px;
    height: 14px;
  }
  &[data-active="true"] {
    color: var(--gold);
    background: var(--gold-tint);
    border-color: rgba(var(--gold-muted-rgb), 0.5);
  }
`;

const MessageList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${LIST_PAD_TOP} ${LIST_PAD_X} ${LIST_PAD_BOTTOM};

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
  padding-left: ${LIST_PAD_X};
  padding-right: ${LIST_PAD_X};
`;

const ListTop = styled.div`
  padding: ${LIST_PAD_TOP} ${LIST_PAD_X} 0;
`;

const ListBottom = styled.div`
  padding: 0 ${LIST_PAD_X} ${LIST_PAD_BOTTOM};
`;

/* Indented to the message text column: 38px avatar + 12px gap */
const SystemMessageRow = styled.div`
  padding: var(--space-1) 0 var(--space-1) 50px;
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
  flex: 1 1 0;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

// Virtuoso's scroller: flex-sized by ScrollContainer (see Wrapper). Its own
// default is height: 100%, which is what the flex basis replaces. The scroll
// never chains to the document when the list hits either end.
const virtuosoStyle = { flex: "1 1 0", minHeight: 0, height: "auto", overscrollBehavior: "contain" };

const DateDivider = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-4);
  margin: ${(p) => (p.$first ? "var(--space-2)" : "var(--space-6)")} 0 var(--space-2);

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
  /* the corner search icon sits in the right inset; mirrored on the left
     so the day label stays centred on the list */
  padding: 0 ${CORNER_INSET};
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

/* Panel-ish pills over the list: mono 11px on the panel background */
const DayButton = styled(Button)`
  font-size: var(--text-xxxs);
  letter-spacing: 0.1em;
  padding: 2px 10px;
  background: rgba(10, 8, 6, 0.85);
  border-color: rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-sm);
  backdrop-filter: blur(4px);
  white-space: nowrap;
`;

const BackToLiveButton = styled(DayButton)`
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
  padding: var(--space-1) ${LIST_PAD_X};
  background: rgba(252, 219, 51, 0.03);
  border-top: 1px solid rgba(255, 255, 255, 0.06);
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

/* ── Search ────────────────────────────────────── */

const SystemWrap = styled.div`
  padding-top: var(--space-2);
`;

const SearchPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: 10px ${CORNER_INSET} 10px ${LIST_PAD_X};
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
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
  padding: ${LIST_PAD_TOP} ${LIST_PAD_X} ${LIST_PAD_BOTTOM};

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

/* A watched player's name inside someone else's line */
const MentionMark = styled(Mark).attrs({ "data-mention": "true" })`
  font-family: var(--font-display);
  background: rgba(252, 219, 51, 0.16);
`;

// Wrap watched-player names in a line (already linkified: a string or an
// array of strings and anchors) in a gold mark
function markMentions(node, watchList) {
  if (!watchList || watchList.size === 0) return node;
  const markString = (text, keyBase) => {
    const parts = splitByMentions(text, watchList);
    if (parts.length === 1 && typeof parts[0] === "string") return text;
    return parts.map((part, i) =>
      typeof part === "string" ? part : <MentionMark key={`${keyBase}-${i}`}>{part.mention}</MentionMark>
    );
  };
  if (typeof node === "string") return markString(node, "m");
  if (Array.isArray(node)) return node.flatMap((part, i) => (typeof part === "string" ? markString(part, `m${i}`) : part));
  return node;
}

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
  margin: var(--space-2) 0;

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

// Online users whose name starts with `prefix`: the search panel's player
// filter suggestions
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

/**
 * The /chat message stream (Chat v2). No header of its own: the Search,
 * Stats and Games toggles live in the map panel header and come in as
 * controlled props; the relay status shows there too.
 *
 * Props (data): messages, status, avatars, stats, sessions, inGameTags,
 *   inGameInfoMap, recentWinners, recentDeltas, gameEvents, ongoingMatchIds,
 *   liveStreamers, watchList, onlineUsers, botResponses, translations
 * Props (history): loadOlder, hasMoreHistory, loadWindow, loadLatest,
 *   windowMode, windowId, permalinkId
 * Props (controls): searchOpen / onSearchOpenChange(bool), statsOpen /
 *   onStatsOpenChange(bool), showGames, showTranslations, onOpenGame.
 *   The search icon in the panel's top-right corner toggles searchOpen
 *   through onSearchOpenChange; the panel also closes the search itself
 *   (Esc, a jump to a hit) and asks for it open on a shared /chat?q= link.
 *   It never closes the stats, so onStatsOpenChange is accepted for
 *   symmetry and left unread.
 */
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
  liveStreamers,
  watchList,
  onlineUsers = [],
  botResponses = [],
  translations = new Map(),
  loadOlder,
  hasMoreHistory,
  loadWindow,
  loadLatest,
  windowMode = "live",
  windowId = 0,
  permalinkId = null,
  onOpenGame,
  searchOpen = false,
  onSearchOpenChange,
  statsOpen = false,
  showGames = true,
  showTranslations = true,
}) {
  const virtuosoRef = useRef(null);
  const [showNotice, setShowNotice] = useState(false);
  const { adminKey: apiKey, isAdmin } = useAdmin();
  const [botDraft, setBotDraft] = useState("");
  const [botError, setBotError] = useState(null);
  const [botTesting, setBotTesting] = useState(false);
  // Browser tab badge: unread while the document is hidden
  const visible = useDocumentVisible();
  const hiddenUnread = useUnreadCount(messages, visible);
  // Expanded game rows, per event id (not persisted)
  const [expandedEvents, setExpandedEvents] = useState(() => new Set());
  // Search panel; the fields' initial state comes from the URL so a shared
  // link opens straight onto its results (the open flag is asked of the
  // owner below)
  const [initialSearch] = useState(readSearchUrl);
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
  const topIndexRef = useRef(null);
  const messagesRef = useRef(messages);
  // Whether the viewport is pinned to the newest row, from Virtuoso's
  // atBottomStateChange. It also gates the live cap: no head trim while the
  // reader is scrolled up (lib/chat/trimGate.js).
  const atBottomRef = useRef(true);
  // A followOutput scroll is in flight: the viewport left the bottom only
  // because the list grew, not because the reader scrolled up
  const followingRef = useRef(false);

  useEffect(() => () => setTrimPaused(false), []);

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
    onSearchOpenChange?.(false);
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
  }, [jumpToId, loadWindow, windowId, onSearchOpenChange]);

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

  // A shared /chat?q=... link opens the search panel on load
  useEffect(() => {
    if (initialSearch.open) onSearchOpenChange?.(true);
    // once, on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Esc closes the date popover first, then the search panel
  useEffect(() => {
    if (!dayPickerOpen && !searchOpen) return;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (dayPickerOpen) setDayPickerOpen(false);
      else onSearchOpenChange?.(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dayPickerOpen, searchOpen, onSearchOpenChange]);

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
    // Scroll ticks mostly land on the same row: no state update, no render
    if (idx === topIndexRef.current) return;
    topIndexRef.current = idx;
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

  // "(N) 4v4 Chat" + red-dot favicon while hidden; restored on return
  useEffect(() => {
    applyTabBadge(hiddenUnread);
  }, [hiddenUnread]);
  useEffect(() => () => applyTabBadge(0), []);

  // Watched players' lines (by them, or naming them): a desktop notification
  // while the tab is hidden, if the user granted permission (asked when they
  // starred their first player, see useWatchList). Click brings the tab back
  // and jumps to the line the same way a permalink does.
  useEffect(() => {
    if (!watchList || watchList.size === 0 || messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last.id === lastNotifiedRef.current) return;
    lastNotifiedRef.current = last.id;
    if (last.kind === "system" || !last.battleTag) return;
    const byWatched = watchList.has(last.battleTag.toLowerCase());
    const mentionsWatched = !byWatched && findWatchedMentions(last.text, watchList).length > 0;
    if (!byWatched && !mentionsWatched) return;
    if (!document.hidden) return;
    const id = last.id;
    notifyChat({
      name: last.userName || last.battleTag.split("#")[0],
      text: last.text,
      icon: avatars?.get(last.battleTag)?.profilePicUrl || "/favicon.svg",
      onClick: () => jumpToId(id),
    });
  }, [messages, watchList, avatars, jumpToId]);

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

  // Player filter suggestions from the online list.
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
  // the viewport stays anchored without any scrollHeight arithmetic here.
  // The ref guard is synchronous: startReached and the button can both fire
  // before the loading state has rendered.
  const olderInFlightRef = useRef(false);
  const handleLoadOlder = useCallback(async () => {
    if (!loadOlder || olderInFlightRef.current) return;
    olderInFlightRef.current = true;
    setLoadingOlder(true);
    try {
      await loadOlder();
    } finally {
      olderInFlightRef.current = false;
      setLoadingOlder(false);
    }
  }, [loadOlder]);

  const handleBotTest = useCallback(async (e) => {
    e.preventDefault();
    const cmd = botDraft.trim();
    if (!cmd || botTesting) return;
    const command = cmd.startsWith("!") ? cmd : `!${cmd}`;
    setBotTesting(true);
    setBotError(null);
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
      setBotError(err.message);
    } finally {
      setBotTesting(false);
    }
  }, [botDraft, apiKey, botTesting]);

  const { botResponseMap, unmatchedBotResponses } = useBotResponseMap(botResponses, messages);
  // Prepend boundaries: the id of the earliest message before each page of
  // older history. Grouping never merges across one, so the row that was
  // first before the prepend keeps its key and its lines; Virtuoso anchors
  // the viewport to that row by index (see the firstItemIndex memo). A
  // prepend is recognised by the previous first message still being loaded
  // but no longer first; a replaced window resets.
  const boundaryRef = useRef({ windowId, firstId: null, ids: new Set() });
  const boundaryIds = useMemo(() => {
    const firstId = messages[0]?.id ?? null;
    if (boundaryRef.current.windowId !== windowId) {
      boundaryRef.current = { windowId, firstId, ids: new Set() };
      return boundaryRef.current.ids;
    }
    const b = boundaryRef.current;
    if (b.firstId !== null && firstId !== b.firstId && messages.some((m) => m.id === b.firstId)) {
      b.ids = new Set(b.ids).add(b.firstId);
    }
    b.firstId = firstId;
    return b.ids;
  }, [messages, windowId]);
  const messageSegments = useMessageSegments(messages, boundaryIds);

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
    if (showGames) {
      const oldestLoaded = items.length > 0 ? items[0].time : 0;
      for (const ev of gameEvents) {
        const t = new Date(ev.time).getTime();
        if (t >= oldestLoaded) items.push({ kind: "event", key: ev.id, ev, time: t });
      }
    }
    return items.sort((a, b) => a.time - b.time);
  }, [messageSegments, gameEvents, showGames]);

  // Day dividers are rows of their own (keyed by day) ahead of the first
  // message or system row of each day, so paging in older history from the
  // same day never changes an existing row's height. The "new" marker is a
  // flag on the first message row past newMarkerTime.
  const rows = useMemo(() => {
    const out = [];
    let prevDay = null;
    let newMarkerShown = false;
    renderItems.forEach((item) => {
      if (item.kind !== "group" && item.kind !== "system") {
        out.push(item);
        return;
      }
      const day = getDateKey(item.msg.sentAt);
      if (day !== prevDay) {
        out.push({ kind: "divider", key: `day:${day}`, time: item.time, sentAt: item.msg.sentAt });
        prevDay = day;
      }
      const showNewMarker = !newMarkerShown && newMarkerTime != null && item.time > newMarkerTime;
      if (showNewMarker) newMarkerShown = true;
      out.push({ ...item, showNewMarker });
    });
    return out;
  }, [renderItems, newMarkerTime]);

  // Virtuoso keeps the viewport still across changes at the head of the
  // list as long as firstItemIndex moves, in the same render as the data,
  // by exactly the number of rows added ahead of (or removed from ahead
  // of) a row that survives the change. The anchor is the first message or
  // event row of the new list that was already in the previous one; day
  // divider rows are skipped because a divider moves ahead of older rows
  // from its own day. Prepends decrease the index, head trims (live cap,
  // deletions) increase it, appends leave it alone.
  const headRef = useRef({ keys: null, index: FIRST_ITEM_BASE, windowId });
  const firstItemIndex = useMemo(() => {
    // A replaced window (jump to date, back to live) remounts the list, so
    // its anchor starts over
    if (headRef.current.windowId !== windowId) {
      headRef.current = { keys: null, index: FIRST_ITEM_BASE, windowId };
    }
    const head = headRef.current;
    let index = head.index;
    if (head.keys) {
      const at = rows.findIndex((r) => r.kind !== "divider" && head.keys.has(r.key));
      if (at !== -1) index += head.keys.get(rows[at].key) - at;
    }
    const keys = new Map();
    rows.forEach((r, i) => keys.set(r.key, i));
    headRef.current = { keys, index, windowId };
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
    if (isNewTail && messages.length > 0 && !atBottomRef.current && !followingRef.current) setShowNotice(true);
  }, [messages, windowId]);

  // Virtuoso asks on every append. Its isAtBottom is true both when the
  // viewport sits at the bottom and while one of its own scrolls is still
  // in flight. Only the former (atBottomRef, the state before this append)
  // gets a smooth scroll; a follow that has not landed yet catches up
  // instantly instead of stacking smooth scrolls, and a jump to a search
  // hit or permalink is never hijacked.
  const followOutput = useCallback((isAtBottom) => {
    if (!isAtBottom || jumpingRef.current) {
      followingRef.current = false;
      return false;
    }
    const behavior = atBottomRef.current ? "smooth" : "auto";
    followingRef.current = true;
    return behavior;
  }, []);

  const handleAtBottomChange = useCallback((atBottom) => {
    atBottomRef.current = atBottom;
    setTrimPaused(!atBottom);
    if (atBottom) {
      followingRef.current = false;
      setShowNotice(false);
    }
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
  const renderLine = (line) => markMentions(linkifyMessage(line.text), watchList);
  const renderSearchLine = (line) => highlightMatches(line.text, searchQ);
  // Name inside a result narrows the search to that player (the row itself
  // jumps into the stream, see SearchResultRow)
  const filterByAuthor = (author) => setSearchPlayer(author.battleTag || author.userName || "");
  const jumpBusy = jumping || loadingWindow;
  const permalinkHref = (line) => `${window.location.origin}/chat?m=${encodeURIComponent(line.id)}`;
  const renderAfterLine = (line) => {
    const unfurl = detectUnfurl(line.text);
    const br = botResponseMap.get(line.id);
    if (!unfurl && !br) return null;
    return (
      <>
        {unfurl && <UnfurlCard target={unfurl} />}
        {br && (
          <BotResponseRow>
            <BotLabel>BOT</BotLabel>
            {!br.botEnabled && <BotPreviewTag>(preview)</BotPreviewTag>}
            <BotText>{br.response}</BotText>
          </BotResponseRow>
        )}
      </>
    );
  };

  const listContext = useMemo(
    () => ({ showLoadOlder, loadingOlder, onLoadOlder: handleLoadOlder, unmatchedBotResponses }),
    [showLoadOlder, loadingOlder, handleLoadOlder, unmatchedBotResponses]
  );

  const renderRow = (index, row) => {
    // Game event woven into the stream: one quiet row, the card on click
    if (row.kind === "event") {
      const ev = row.ev;
      const stillRunning = ev.type !== "game_end" && Boolean(ongoingMatchIds?.has(ev.matchId));
      return (
        <GameRow
          event={ev}
          expanded={expandedEvents.has(ev.id)}
          onToggle={toggleEvent}
          stillRunning={stillRunning}
          hoverData={hoverData}
        />
      );
    }

    if (row.kind === "divider") {
      const isFirstRow = index - firstItemIndex === 0;
      return (
        <DateDivider $first={isFirstRow && !showLoadOlder}>
          <DateLabel>{formatDateDivider(row.sentAt)}</DateLabel>
        </DateDivider>
      );
    }

    const msg = row.msg;
    const dividers = row.showNewMarker ? (
      <NewDivider><NewDividerLabel>new</NewDividerLabel></NewDivider>
    ) : null;

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
    const isWatched =
      (Boolean(tag) && Boolean(watchList?.has(tag.toLowerCase()))) ||
      row.msgs.some((m) => findWatchedMentions(m.text, watchList).length > 0);
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
    const chip = chipForTag(tag, chipCtx);
    if (chip?.kind === "ingame" && gameInfo && onOpenGame) chip.onClick = () => onOpenGame(gameInfo);
    const meta = {
      avatarUrl: profile?.profilePicUrl,
      race: playerStats?.race,
      countryCode: profile?.country,
      mmr: playerStats?.mmr,
      chip,
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
        />
      </>
    );
  };

  // Sticky day bar label: the day of the topmost visible row
  const topRow = topIndex == null ? null : rows[topIndex - firstItemIndex];
  const topDayLabel = topRow ? formatDateDivider(new Date(topRow.time).toISOString()) : null;
  const topDayInput = topRow ? toInputDate(new Date(topRow.time)) : toInputDate(new Date());
  const todayInput = toInputDate(new Date());

  return (
    <OuterFrame data-chat-panel>
      <Wrapper>
        <StatsStrip open={statsOpen} />
        <Body>
          <SearchToggle
            type="button"
            $icon
            data-active={searchOpen}
            aria-pressed={searchOpen}
            aria-label="Search"
            title={searchOpen ? "Close search" : "Search chat history"}
            onClick={() => onSearchOpenChange?.(!searchOpen)}
          >
            <HiOutlineSearch />
          </SearchToggle>
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
                  <div key={i} style={{ display: "flex", gap: 12, padding: "10px 0", alignItems: "flex-start" }}>
                    <Skeleton $w="38px" $h="38px" $radius="3px" style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, paddingTop: 2 }}>
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
                style={virtuosoStyle}
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
        </Body>
      </Wrapper>
      {isAdmin && (
        <BotTestBar onSubmit={handleBotTest}>
          <BotTestPrefix>BOT</BotTestPrefix>
          <BotTestInput
            type="text"
            placeholder="!games, !stats name, !recap topic 50, !help"
            value={botDraft}
            onChange={(e) => { setBotDraft(e.target.value); setBotError(null); }}
            disabled={botTesting}
            maxLength={200}
          />
          {botError && <SendError title={botError}>!</SendError>}
          <SendButton type="submit" disabled={botTesting || !botDraft.trim()}>
            <IoSend size={14} />
          </SendButton>
        </BotTestBar>
      )}
    </OuterFrame>
  );
}
