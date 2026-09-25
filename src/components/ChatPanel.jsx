import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { Virtuoso } from "react-virtuoso";
import styled from "styled-components";
import { Link } from "react-router-dom";
import { IoSend } from "react-icons/io5";
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
import { relayFetch } from "../lib/relay";
import useAdmin from "../lib/useAdmin";
import { setTrimPaused } from "../lib/chat/trimGate";
import { Panel } from "./chat/panel";
import { CHAT_MOBILE_PX } from "../lib/useIsMobile";

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
  @media (max-width: ${CHAT_MOBILE_PX}px) {
    border: 0;
    border-radius: 0;
    background: transparent;
    backdrop-filter: none;
  }
`;

/* Everything under the header and the stats strip: the list (or an empty
   state) */
const Body = styled.div`
  position: relative;
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
`;

/* ── Header: home link, relay dot, the filter field ── */

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 14px 10px ${LIST_PAD_X};
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
  @media (max-width: ${CHAT_MOBILE_PX}px) {
    display: none;
  }
`;

const Home = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  font-family: var(--font-display);
  font-size: 20px;
  letter-spacing: 0.02em;
  color: var(--gold);
  text-decoration: none;
  white-space: nowrap;
  &:hover {
    color: var(--white);
  }
`;

/* The always-visible search field, the navbar's player search look
   (shared Input, magnifier inside on the left, × inside on the right):
   "N found" sits after it while a query is set and the border stays gold */
const SearchBox = styled.div`
  flex: 1;
  max-width: 420px;
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
`;

const SearchWrap = styled.div`
  position: relative;
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  color: var(--grey-light);
  &:focus-within {
    color: rgba(var(--gold-dark-rgb), 0.7);
  }
`;

const SearchIcon = styled.svg`
  position: absolute;
  left: 11px;
  pointer-events: none;
  flex-shrink: 0;
  transition: color var(--transition);
`;

const SearchInput = styled(Input)`
  width: 100%;
  padding-left: 32px;
  padding-right: ${(p) => (p.$active ? "32px" : "var(--space-4)")};
  ${(p) => p.$active && "border-color: var(--gold);"}
`;

const FoundCount = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
  white-space: nowrap;
`;

const ClearButton = styled(Button)`
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
`;

const searchGlyph = (
  <SearchIcon width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.5" />
    <line x1="8.7" y1="8.7" x2="13" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </SearchIcon>
);

/* Mobile: the search row under the page's top bar, shown while searchOpen */
const MobileSearchRow = styled.div`
  display: none;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(10, 8, 6, 0.8);
  flex-shrink: 0;
  @media (max-width: ${CHAT_MOBILE_PX}px) {
    display: flex;
  }
`;

const MobileSearchInput = styled(Input)`
  width: 100%;
  height: 36px;
  padding-left: 32px;
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

/* The gold "↓ Latest" / "↓ N new" pill, centred 16px above the bottom of
   the list while the viewport is off the bottom */
const LatestPill = styled.button`
  position: absolute;
  left: 50%;
  bottom: 16px;
  transform: translateX(-50%);
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 16px;
  font-family: var(--font-mono);
  font-size: 13px;
  color: #0a0806;
  background: var(--gold);
  border: 0;
  border-radius: 18px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.5);
  cursor: pointer;
  white-space: nowrap;
  &:hover {
    filter: brightness(1.08);
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
  padding: 0 var(--space-4);
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

const SystemWrap = styled.div`
  padding-top: var(--space-2);
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

const NoMatch = styled.div`
  padding: var(--space-6) var(--space-4);
  text-align: center;
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--grey-light);
`;

// /chat?q= (the old /search redirect, shared links) seeds the filter field
function readQueryUrl() {
  try {
    const sp = new URLSearchParams(window.location.search);
    return sp.get("q") || sp.get("player") || "";
  } catch {
    return "";
  }
}

// Whether a message group (author + lines) matches the filter query, by
// display name or text, case-insensitive
function groupMatches(row, q) {
  const name = (row.msg.userName || row.msg.battleTag?.split("#")[0] || "").toLowerCase();
  if (name.includes(q)) return true;
  return row.msgs.some((m) => (m.text || "").toLowerCase().includes(q));
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
 * The /chat message stream (Chat v3). Its header holds the 4v4.GG home link
 * with the relay dot and an always-visible search field that filters the
 * loaded stream by author name or text ("N found", clear ×); game rows and
 * system lines hide while a query is set. The Stats and Games toggles live
 * in the map panel header and come in as controlled props.
 *
 * At and below 768px the header is gone (the page's top bar has the logo
 * and a search button): `searchOpen` shows the search row under the bar
 * and the panel closes it itself on Esc through onSearchOpenChange. The
 * gold "↓ Latest" / "↓ N new" pill sits over the list while the viewport
 * is off the bottom (always on mobile, only with new lines on desktop).
 *
 * Props (data): messages, status, avatars, stats, sessions, inGameTags,
 *   inGameInfoMap, recentWinners, recentDeltas, gameEvents, ongoingMatchIds,
 *   liveStreamers, watchList, botResponses, translations
 * Props (history): loadOlder, hasMoreHistory, loadWindow, loadLatest,
 *   windowMode, windowId, permalinkId, permalinkAt (the message's
 *   received_at: a permalink outside the loaded window reloads the window
 *   around it instead of paging back)
 * Props (controls): searchOpen / onSearchOpenChange(bool), statsOpen /
 *   onStatsOpenChange(bool), showGames, showTranslations, onOpenGame,
 *   onOpenPlayer(battleTag) (mobile: a name opens the player card instead
 *   of linking to /player), isMobile. It never closes the stats, so
 *   onStatsOpenChange is accepted for symmetry and left unread.
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
  botResponses = [],
  translations = new Map(),
  loadOlder,
  hasMoreHistory,
  loadWindow,
  loadLatest,
  windowMode = "live",
  windowId = 0,
  permalinkId = null,
  permalinkAt = null,
  onOpenGame,
  onOpenPlayer,
  isMobile = false,
  searchOpen = false,
  onSearchOpenChange,
  statsOpen = false,
  showGames = true,
  showTranslations = true,
}) {
  const virtuosoRef = useRef(null);
  // Whether the viewport sits at the newest row (state for the pill, ref
  // for the scroll callbacks below)
  const [atBottom, setAtBottom] = useState(true);
  const unseen = useUnreadCount(messages, atBottom);
  const { adminKey: apiKey, isAdmin } = useAdmin();
  const [botDraft, setBotDraft] = useState("");
  const [botError, setBotError] = useState(null);
  const [botTesting, setBotTesting] = useState(false);
  // Browser tab badge: unread while the document is hidden
  const visible = useDocumentVisible();
  const hiddenUnread = useUnreadCount(messages, visible);
  // Expanded game rows, per event id (not persisted)
  const [expandedEvents, setExpandedEvents] = useState(() => new Set());
  // The filter query; seeded from /chat?q= so the old /search links land
  // on a filtered stream
  const [query, setQuery] = useState(readQueryUrl);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [newMarkerTime, setNewMarkerTime] = useState(null);
  const [flashId, setFlashId] = useState(null);
  // A permalink outside the loaded window: replace the window, then jump
  // once the new one is in (windowId bumps)
  const [windowJump, setWindowJump] = useState(null);
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

  // Jump to a message in the stream (a permalink). The stream
  // holds the newest few hundred messages, so page older history in until
  // the target is loaded (bounded), then let the list scroll to its row
  // once it renders (see the pendingJump effect). `targetTime` (a search
  // hit's receivedAt) stops the paging early once history is older than
  // the target; a permalink has no timestamp and pages until found.
  const jumpToId = useCallback(async (id, targetTime = null) => {
    if (jumpingRef.current || id == null) return false;
    jumpingRef.current = true;
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
    }
  }, [loadOlder]);

  // /chat?m=<id>: resolve once the first window is in. A loaded message
  // scrolls straight into view; with &at= the window is reloaded around
  // that time first (+1s: `before` is exclusive at second precision), else
  // history pages back until the message is found.
  useEffect(() => {
    if (!permalinkId || messages.length === 0 || permalinkDoneRef.current === permalinkId) return;
    permalinkDoneRef.current = permalinkId;
    const at = permalinkAt ? new Date(`${String(permalinkAt).replace(" ", "T")}${/Z|[+-]\d\d:?\d\d$/.test(permalinkAt) ? "" : "Z"}`) : null;
    const canReload = Boolean(loadWindow) && at && !Number.isNaN(at.getTime());
    if (messages.some((m) => m.id === permalinkId) || !canReload) {
      jumpToId(permalinkId);
      return;
    }
    setLoadingWindow(true);
    setWindowJump({ id: permalinkId, fromWindowId: windowId });
    loadWindow(toRelayCursor(new Date(at.getTime() + 1000)))
      .catch(() => setWindowJump(null))
      .finally(() => setLoadingWindow(false));
  }, [permalinkId, permalinkAt, messages, jumpToId, loadWindow, windowId]);

  // messagesRef is refreshed by an earlier effect, so jumpToId sees the
  // replaced window here
  useEffect(() => {
    if (!windowJump || windowId === windowJump.fromWindowId) return;
    setWindowJump(null);
    jumpToId(windowJump.id);
  }, [windowJump, windowId, jumpToId]);

  const filterQ = query.trim().toLowerCase();
  const filterActive = filterQ.length > 0;

  const clearQuery = useCallback(() => {
    setQuery("");
    onSearchOpenChange?.(false);
  }, [onSearchOpenChange]);

  // Esc closes the date popover first, then clears the filter (and closes
  // the mobile search row)
  useEffect(() => {
    if (!dayPickerOpen && !filterActive && !searchOpen) return;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (dayPickerOpen) setDayPickerOpen(false);
      else clearQuery();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dayPickerOpen, filterActive, searchOpen, clearQuery]);

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

  // Once a /chat?q= link has seeded the field the address bar drops it, so
  // the URL never carries a stale query (replaceState keeps the router out
  // of it, like permalinks)
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (!sp.has("q") && !sp.has("player") && !sp.has("since")) return;
    sp.delete("q");
    sp.delete("player");
    sp.delete("since");
    const qs = sp.toString();
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`);
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

  // The filter: message groups whose author or text matches the query;
  // game rows and system lines drop out while it is set
  const filteredItems = useMemo(() => {
    if (!filterActive) return renderItems;
    return renderItems.filter((item) => item.kind === "group" && groupMatches(item, filterQ));
  }, [renderItems, filterActive, filterQ]);
  const foundCount = filterActive ? filteredItems.length : 0;

  // Day dividers are rows of their own (keyed by day) ahead of the first
  // message or system row of each day, so paging in older history from the
  // same day never changes an existing row's height. The "new" marker is a
  // flag on the first message row past newMarkerTime.
  const rows = useMemo(() => {
    const out = [];
    let prevDay = null;
    let newMarkerShown = false;
    filteredItems.forEach((item) => {
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
  }, [filteredItems, newMarkerTime]);

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

  // Jump (permalink, date): scroll to the row once it exists. If the list
  // is about to remount (window replaced), the initial position handles it
  // instead.
  const pendingJumpIndex = pendingJump ? findRowIndex(rows, pendingJump.id) : -1;
  const pendingJumpAlign = pendingJump?.align || "center";
  useEffect(() => {
    if (pendingJumpIndex === -1) return;
    const raf = requestAnimationFrame(() => {
      virtuosoRef.current?.scrollToIndex({ index: pendingJumpIndex, align: pendingJumpAlign });
      setPendingJump(null);
    });
    return () => cancelAnimationFrame(raf);
  }, [pendingJumpIndex, pendingJumpAlign]);

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

  const handleAtBottomChange = useCallback((isAtBottom) => {
    atBottomRef.current = isAtBottom;
    setAtBottom(isAtBottom);
    setTrimPaused(!isAtBottom);
    if (isAtBottom) followingRef.current = false;
  }, []);

  function scrollToBottom() {
    virtuosoRef.current?.scrollToIndex({ index: "LAST", align: "end", behavior: "smooth" });
  }

  const showLoadOlder = Boolean(hasMoreHistory && loadOlder);

  // Reaching the top pages older history in automatically; the button stays
  // for keyboard and screen-reader users. A filtered list is often short,
  // so it pages from the button only.
  const handleStartReached = useCallback(() => {
    if (showLoadOlder && !filterActive) handleLoadOlder();
  }, [showLoadOlder, filterActive, handleLoadOlder]);

  // Status chip for a name row, shared with the roster (chat/chip.js)
  const chipCtx = { inGameTags, recentDeltas, recentWinners, startTimes: inGameInfoMap };

  const hoverData = { avatars, stats, sessions, inGameTags, inGameInfoMap };
  const renderLine = (line) => markMentions(linkifyMessage(line.text), watchList);
  // Mobile: a name opens the player card
  const openPlayerCard = isMobile && onOpenPlayer ? (author) => onOpenPlayer(author.battleTag) : undefined;
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
          compact={isMobile}
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
          onNameClick={openPlayerCard}
          wrapName={isMobile ? undefined : wrapName}
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

  const showPill = !atBottom && (unseen > 0 || isMobile);
  const pillLabel = unseen > 0 ? `${unseen > 99 ? "99+" : unseen} new` : "Latest";
  const noMatch = filterActive && messages.length > 0 && foundCount === 0;

  return (
    <OuterFrame data-chat-panel>
      <Wrapper>
        <Header data-chat-header>
          <Home to="/" title={`4v4.GG home · relay ${status || "connecting"}`} data-relay-status={status || "connecting"}>
            4v4.GG
          </Home>
          <SearchBox role="search" aria-label="Filter messages" data-search-active={filterActive}>
            <SearchWrap>
              {searchGlyph}
              <SearchInput
                type="text"
                placeholder="Search messages or players"
                aria-label="Search messages or players"
                value={query}
                $active={filterActive}
                onChange={(e) => setQuery(e.target.value)}
              />
              {filterActive && (
                <ClearButton type="button" $icon aria-label="Clear search" onClick={clearQuery}>
                  &times;
                </ClearButton>
              )}
            </SearchWrap>
            {filterActive && <FoundCount data-found-count aria-live="polite">{foundCount} found</FoundCount>}
          </SearchBox>
        </Header>
        {searchOpen && (
          <MobileSearchRow role="search" aria-label="Filter messages" data-mobile-search>
            <SearchWrap>
              {searchGlyph}
              <MobileSearchInput
                type="text"
                placeholder="Search messages or players"
                aria-label="Search messages or players"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
              />
            </SearchWrap>
            {filterActive && <FoundCount data-found-count>{foundCount} found</FoundCount>}
          </MobileSearchRow>
        )}
        <StatsStrip open={statsOpen} />
        <Body>
          {noMatch ? (
            <NoMatch data-no-match>No messages match</NoMatch>
          ) : messages.length === 0 ? (
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
                atBottomThreshold={60}
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
              {showPill && (
                <LatestPill type="button" data-latest-pill={unseen > 0 ? "new" : "latest"} onClick={scrollToBottom}>
                  ↓ {pillLabel}
                </LatestPill>
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
