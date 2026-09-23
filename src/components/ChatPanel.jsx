import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { Virtuoso } from "react-virtuoso";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { GiCrossedSwords } from "react-icons/gi";
import { HiKey, HiBell, HiSearch, HiTranslate } from "react-icons/hi";
import { IoSend } from "react-icons/io5";
import { raceIcons } from "../lib/constants";
import { Button, Skeleton, Input } from "./ui";
import { useMessageSegments, useBotResponseMap, formatDateDivider, getDateKey, formatDateTime } from "../lib/useChatMessages";
import { linkifyMessage, playPing } from "../lib/chatExtras";
import PlayerHoverCard from "./PlayerHoverCard";
import ChatMessage, { FeedText } from "./chat/ChatMessage";
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

const SearchBar = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border-bottom: 1px solid rgba(252, 219, 51, 0.15);
  flex-shrink: 0;
`;

const SearchField = styled(Input)`
  flex: 1;
  min-width: 0;
  padding: 6px var(--space-2);
  outline: none;
`;

const SearchResults = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: var(--space-2) var(--space-4);
`;

const SearchResultRow = styled.button`
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  padding: var(--space-2) var(--space-1);
  font-size: var(--text-xs);
  cursor: pointer;
  border-radius: var(--radius-sm);

  &:hover {
    background: rgba(255, 255, 255, 0.04);
  }
`;

const SearchAvatar = styled.img`
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
  ${(p) => p.$placeholder && "padding: 4px; background: rgba(255,255,255,0.06); opacity: 0.5; box-sizing: border-box;"}
`;

const SearchResultBody = styled.div`
  min-width: 0;
`;

const Mark = styled.span`
  background: rgba(252, 219, 51, 0.25);
  color: var(--gold);
  border-radius: 2px;
  padding: 0 1px;
`;

const SearchResultMeta = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  color: var(--grey-light);
  margin-bottom: 2px;

  a {
    color: var(--gold);
    text-decoration: none;
    &:hover {
      text-decoration: underline;
    }
  }
`;

const SearchEmpty = styled.div`
  padding: var(--space-4);
  text-align: center;
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
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
  bottom: 100%;
  left: 48px;
  margin-bottom: 4px;
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
  // Expanded game tickers, per event id (not persisted)
  const [expandedEvents, setExpandedEvents] = useState(() => new Set());
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [newMarkerTime, setNewMarkerTime] = useState(null);
  const [searchAvatars, setSearchAvatars] = useState(new Map());
  const [flashId, setFlashId] = useState(null);
  const [jumping, setJumping] = useState(false);
  const [pendingJumpId, setPendingJumpId] = useState(null);
  const lastNotifiedRef = useRef(null);
  const flashTimerRef = useRef(null);
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

  // Jump from a search result to the message in the stream. Search covers
  // 24h while the stream holds the newest few hundred messages, so page
  // older history in until the target is loaded (bounded), then let the
  // list scroll to its row once it renders (see the pendingJumpId effect).
  const jumpToMessage = useCallback(async (result) => {
    if (jumping) return;
    setJumping(true);
    try {
      const target = result.receivedAt;
      let oldest = messagesRef.current[0]?.receivedAt;
      let pages = 0;
      const isLoaded = () => messagesRef.current.some((m) => m.id === result.id);
      // sqlite datetime strings compare lexicographically
      while (!isLoaded() && loadOlder && oldest && target < oldest && pages < 20) {
        const r = await loadOlder();
        if (!r || r.added === 0) break;
        oldest = r.oldestCursor || oldest;
        pages++;
      }
      setSearchOpen(false);
      setFlashId(result.id);
      clearTimeout(flashTimerRef.current);
      flashTimerRef.current = setTimeout(() => setFlashId(null), 2500);
      setPendingJumpId(result.id);
    } finally {
      setJumping(false);
    }
  }, [jumping, loadOlder]);

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

  const toggleEvent = useCallback((id) => {
    setExpandedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Debounced public search against the relay
  useEffect(() => {
    if (!searchOpen) return;
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    const t = setTimeout(() => {
      relayFetch(`/api/chat/search?q=${encodeURIComponent(q)}&limit=50`)
        .then((r) => r.json())
        .then((data) => setSearchResults(normalizeMessages(data.results || [])))
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, 350);
    return () => clearTimeout(t);
  }, [searchQuery, searchOpen]);

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
    const q = m[1].toLowerCase();
    const candidates = onlineUsers
      .filter((u) => (u.name || "").toLowerCase().startsWith(q))
      .slice(0, 6);
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
    if (showGames) {
      const oldestLoaded = items.length > 0 ? items[0].time : 0;
      for (const ev of gameEvents) {
        const t = new Date(ev.time).getTime();
        if (t >= oldestLoaded) items.push({ kind: "event", key: ev.id, ev, time: t });
      }
    }
    return items.sort((a, b) => a.time - b.time);
  }, [messageSegments, gameEvents, showGames]);

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
  const headRef = useRef({ key: null, time: 0, index: FIRST_ITEM_BASE });
  const firstItemIndex = useMemo(() => {
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
    headRef.current = { key: first.key, time: first.time, index };
    return index;
  }, [rows]);

  // Search jump: scroll to the row once it exists. If the list is about to
  // (re)mount (search closing), the initial position handles it instead.
  const pendingJumpIndex =
    pendingJumpId == null
      ? -1
      : rows.findIndex((r) => (r.msgs ? r.msgs.some((m) => m.id === pendingJumpId) : r.msg?.id === pendingJumpId));
  useEffect(() => {
    if (pendingJumpId == null || pendingJumpIndex === -1 || searchOpen) return;
    const raf = requestAnimationFrame(() => {
      virtuosoRef.current?.scrollToIndex({ index: pendingJumpIndex, align: "center" });
      setPendingJumpId(null);
    });
    return () => cancelAnimationFrame(raf);
  }, [pendingJumpId, pendingJumpIndex, searchOpen]);

  // "New messages below" when a new tail arrives while scrolled up. Paging
  // in older history changes `messages` too, so key off the newest id.
  const lastMsgIdRef = useRef(null);
  useEffect(() => {
    const lastId = messages[messages.length - 1]?.id ?? null;
    const isNewTail = lastId !== lastMsgIdRef.current;
    lastMsgIdRef.current = lastId;
    if (isNewTail && messages.length > 0 && !atBottomRef.current) setShowNotice(true);
  }, [messages]);

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
        />
      </>
    );
  };

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
            <StatusBadge $fault={Boolean(fault)} title={`relay: ${status}`}>
              <StatusDot $connected={status === "connected"} $fault={Boolean(fault)} />
              {statusText}
            </StatusBadge>
          </HeaderActions>
        </Header>
        {searchOpen && (
          <SearchBar>
            <SearchField
              type="text"
              placeholder="Search the last 24 hours..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </SearchBar>
        )}
        {searchOpen ? (
          <SearchResults>
            {searching && <SearchEmpty>Searching...</SearchEmpty>}
            {!searching && searchResults && searchResults.length === 0 && (
              <SearchEmpty>No messages found</SearchEmpty>
            )}
            {!searching && !searchResults && (
              <SearchEmpty>Type at least 2 characters to search the last 24 hours</SearchEmpty>
            )}
            {!searching &&
              searchResults?.map((r, i) => {
                const profile = avatars?.get(r.battleTag) || searchAvatars.get(r.battleTag);
                return (
                  <SearchResultRow
                    key={`${r.id ?? r.receivedAt}-${i}`}
                    type="button"
                    title="Jump to message"
                    disabled={jumping}
                    onClick={() => jumpToMessage(r)}
                  >
                    {profile?.profilePicUrl ? (
                      <SearchAvatar src={profile.profilePicUrl} alt="" />
                    ) : (
                      <SearchAvatar src={raceIcons.random} alt="" $placeholder />
                    )}
                    <SearchResultBody>
                      <SearchResultMeta>
                        <Link
                          to={`/player/${encodeURIComponent(r.battleTag)}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {highlightMatches(r.userName, searchQuery)}
                        </Link>
                        {" · "}
                        {formatDateTime(r.sentAt || r.receivedAt)}
                      </SearchResultMeta>
                      <FeedText>{highlightMatches(r.text, searchQuery)}</FeedText>
                    </SearchResultBody>
                  </SearchResultRow>
                );
              })}
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
              ref={virtuosoRef}
              style={{ flex: 1, height: "100%" }}
              data={rows}
              context={listContext}
              components={listComponents}
              computeItemKey={rowKey}
              itemContent={renderRow}
              firstItemIndex={firstItemIndex}
              initialTopMostItemIndex={
                pendingJumpIndex !== -1 ? { index: pendingJumpIndex, align: "center" } : rows.length - 1
              }
              followOutput={followOutput}
              atBottomStateChange={handleAtBottomChange}
              startReached={handleStartReached}
              atBottomThreshold={40}
              increaseViewportBy={{ top: 400, bottom: 400 }}
            />
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
