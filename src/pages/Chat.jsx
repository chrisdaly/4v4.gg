import React, { useState, useMemo, useCallback, useEffect } from "react";
import styled, { createGlobalStyle } from "styled-components";
import { useLocation } from "react-router-dom";
import { HiUsers, HiChat } from "react-icons/hi";
import useChatFeed from "../lib/chat/useChatFeed";
import { useWatchList } from "../lib/chatExtras";
import { useUnreadCount } from "../lib/chat/useUnread";
import { useTheme } from "../lib/ThemeContext";
import ChatPanel from "../components/ChatPanel";
import UserListSidebar from "../components/UserListSidebar";
import MapPanel from "../components/chat/MapPanel";
import RegionsPanel from "../components/chat/RegionsPanel";
import GameModal from "../components/chat/GameModal";
import { regionSummary } from "../lib/chat/regions";

/**
 * /chat (Chat v2): the full viewport, no navbar (Router.jsx renders this
 * route outside the Navbar branch), as a CSS grid of four panels. Layout D
 * from 1200px (chat | map over regions | roster), layout C below (chat |
 * map, regions, roster stacked), and under 768px the chat alone with the
 * roster as a sheet behind the mobile tab bar.
 */

const WIDE = 1200; // px, layout D from here
const MOBILE = 768; // px, tab bar below this
const TAB_BAR = 48; // px
const SHOW_GAMES_KEY = "chat:showGames";
const CLOCK_TICK_MS = 60_000; // region local-time refresh

/* The theme paints the body background (App.css body::before); on /chat the
   design fixes it to the night elf art under a darker overlay.
   The page is exactly the viewport and the only scrolling is inside the
   panels, so the document never scrolls while /chat is mounted: App.css
   gives html a permanent scrollbar (overflow-y: scroll), and any document
   overflow, or scroll chaining from a list that has hit its end, would
   move the whole page under the reader. Unmounting removes the rule. */
const ChatBackground = createGlobalStyle`
  html,
  body {
    overflow: hidden;
    overscroll-behavior: none;
  }
  body::before {
    background-image: linear-gradient(rgba(8, 6, 5, 0.74), rgba(8, 6, 5, 0.86)), url("/backgrounds/nightelf.jpg");
  }
`;

/* Exactly the viewport: dvh (where supported) tracks a mobile or tablet
   browser's collapsing toolbar, vh is the fallback. Panels scroll inside. */
const Page = styled.div`
  height: 100vh;
  height: 100dvh;
  box-sizing: border-box;
  padding: var(--space-2);
  display: grid;
  gap: var(--space-2);
  grid-template-columns: minmax(0, 1fr) minmax(280px, 340px);
  grid-template-rows: auto auto minmax(0, 1fr);
  grid-template-areas:
    "chat map"
    "chat regions"
    "chat roster";

  @media (min-width: ${WIDE}px) {
    grid-template-columns: minmax(380px, 1fr) minmax(220px, 300px) minmax(240px, 320px);
    grid-template-rows: auto minmax(0, 1fr);
    grid-template-areas:
      "chat map roster"
      "chat regions roster";
  }

  @media (max-width: ${MOBILE}px) {
    padding: 0;
    gap: 0;
    height: calc(100vh - ${TAB_BAR}px);
    height: calc(100dvh - ${TAB_BAR}px); /* dvh handles the mobile address bar */
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr);
    grid-template-areas: "chat";
  }
`;

const ChatArea = styled.div`
  grid-area: chat;
  display: flex;
  min-width: 0;
  min-height: 0;
  > * {
    flex: 1;
    min-width: 0;
  }
`;

const MapArea = styled(MapPanel)`
  grid-area: map;
  @media (max-width: ${MOBILE}px) {
    display: none;
  }
`;

const RegionsArea = styled(RegionsPanel)`
  grid-area: regions;
  @media (max-width: ${MOBILE}px) {
    display: none;
  }
`;

/* ── Mobile Tab Bar ──────────────────────────── */

const MobileTabBar = styled.div`
  display: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: var(--z-nav);
  height: ${TAB_BAR}px;
  background: rgba(10, 8, 6, 0.95);
  backdrop-filter: blur(8px);
  border-top: 1px solid rgba(252, 219, 51, 0.15);

  @media (max-width: ${MOBILE}px) {
    display: flex;
  }
`;

const Tab = styled.button`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  background: none;
  border: none;
  color: ${(p) => (p.$active ? "var(--gold)" : "var(--grey-light)")};
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  cursor: pointer;
  position: relative;
  transition: color 0.15s;

  svg {
    width: 20px;
    height: 20px;
  }

  &::after {
    content: "";
    position: absolute;
    top: 0;
    left: 20%;
    right: 20%;
    height: 2px;
    background: ${(p) => (p.$active ? "var(--gold)" : "transparent")};
    transition: background 0.15s;
  }
`;

const TabBadge = styled.span`
  position: absolute;
  top: 4px;
  right: calc(50% - 18px);
  min-width: 16px;
  height: 16px;
  border-radius: var(--radius-lg);
  background: var(--red);
  color: var(--white);
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
`;

/* ── Preferences ─────────────────────────────── */

function readShowGames() {
  try {
    const v = localStorage.getItem(SHOW_GAMES_KEY);
    return v === null ? true : v === "1";
  } catch {
    return true;
  }
}

function writeShowGames(value) {
  try {
    localStorage.setItem(SHOW_GAMES_KEY, value ? "1" : "0");
  } catch {
    // non-persistent is fine
  }
}

/* ── Main component ───────────────────────────────────────────── */

const Chat = () => {
  const {
    messages,
    status,
    onlineUsers,
    botResponses,
    translations,
    loadOlder,
    hasMoreHistory,
    loadWindow,
    loadLatest,
    windowMode,
    windowId,
    ongoingMatches,
    avatars,
    stats,
    sessions,
    inGameTags,
    inGameInfoMap,
    inGameMatchMap,
    ongoingMatchIds,
    gameEvents,
    recentWinners,
    recentDeltas,
    liveStreamers,
  } = useChatFeed();
  const { borderTheme } = useTheme();
  const { watchList, toggleWatch } = useWatchList();
  const [mobileTab, setMobileTab] = useState("chat"); // "chat" | "users"
  // Region filter (a regionOf name, or null): set from a region row or a map
  // dot; narrows the roster, its histogram and the map dimming, never the chat
  const [region, setRegion] = useState(null);
  // Chat panel modes, driven from the map header's icon buttons
  const [searchOpen, setSearchOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [showGames, setShowGames] = useState(readShowGames);
  const changeShowGames = useCallback((v) => {
    writeShowGames(v);
    setShowGames(v);
  }, []);
  // The ongoing game opened from an in-game chip or roster row: an
  // inGameInfoMap entry { matchId, mapName, startTime }, null when closed
  const [openGame, setOpenGame] = useState(null);
  const openGameModal = useCallback((info) => {
    if (info) setOpenGame(info);
  }, []);
  const closeGameModal = useCallback(() => setOpenGame(null), []);
  // /chat?m=<messageId> permalink; read once per navigation, the copy-link
  // button updates the URL with replaceState so the router never sees it
  const { search } = useLocation();
  const permalinkId = useMemo(() => new URLSearchParams(search).get("m"), [search]);

  // Once-a-minute clock for the region rows' local times
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), CLOCK_TICK_MS);
    return () => clearInterval(id);
  }, []);
  const regions = useMemo(() => regionSummary(onlineUsers, { stats, avatars }, now), [onlineUsers, stats, avatars, now]);

  // Unread badge for the mobile Chat tab: everything newer than the last
  // message that was on screen when the user left the chat tab (the panel
  // uses the same hook for the browser tab title while hidden)
  const unreadCount = useUnreadCount(messages, mobileTab === "chat");

  return (
    <Page data-chat-page>
      <ChatBackground />
      <ChatArea>
        <ChatPanel
          liveGameCount={ongoingMatches.length}
          messages={messages}
          status={status}
          avatars={avatars}
          stats={stats}
          sessions={sessions}
          inGameTags={inGameTags}
          inGameInfoMap={inGameInfoMap}
          recentWinners={recentWinners}
          recentDeltas={recentDeltas}
          gameEvents={gameEvents}
          ongoingMatchIds={ongoingMatchIds}
          liveStreamers={liveStreamers}
          watchList={watchList}
          onlineUsers={onlineUsers}
          botResponses={botResponses}
          translations={translations}
          borderTheme={borderTheme}
          loadOlder={loadOlder}
          hasMoreHistory={hasMoreHistory}
          loadWindow={loadWindow}
          loadLatest={loadLatest}
          windowMode={windowMode}
          windowId={windowId}
          permalinkId={permalinkId}
          onOpenGame={openGameModal}
          searchOpen={searchOpen}
          onSearchOpenChange={setSearchOpen}
          statsOpen={statsOpen}
          onStatsOpenChange={setStatsOpen}
          showGames={showGames}
        />
      </ChatArea>
      <MapArea
        users={onlineUsers}
        avatars={avatars}
        stats={stats}
        inGameTags={inGameTags}
        status={status}
        region={region}
        onRegionChange={setRegion}
        searchOpen={searchOpen}
        onSearchOpenChange={setSearchOpen}
        statsOpen={statsOpen}
        onStatsOpenChange={setStatsOpen}
        showGames={showGames}
        onShowGamesChange={changeShowGames}
      />
      <RegionsArea rows={regions.rows} region={region} onRegionChange={setRegion} />
      <UserListSidebar
        users={onlineUsers}
        avatars={avatars}
        stats={stats}
        sessions={sessions}
        inGameTags={inGameTags}
        inGameInfoMap={inGameInfoMap}
        inGameMatchMap={inGameMatchMap}
        recentDeltas={recentDeltas}
        liveStreamers={liveStreamers}
        watchList={watchList}
        onToggleWatch={toggleWatch}
        onOpenGame={openGameModal}
        region={region}
        $mobileVisible={mobileTab === "users"}
        onClose={() => setMobileTab("chat")}
      />
      {openGame && (
        <GameModal
          game={openGame}
          gameEvents={gameEvents}
          ongoingMatches={ongoingMatches}
          ongoingMatchIds={ongoingMatchIds}
          onlineUsers={onlineUsers}
          inGameInfoMap={inGameInfoMap}
          stats={stats}
          avatars={avatars}
          hoverData={{ avatars, stats, sessions, inGameTags, inGameInfoMap }}
          onClose={closeGameModal}
        />
      )}
      <MobileTabBar>
        <Tab $active={mobileTab === "chat"} onClick={() => setMobileTab("chat")}>
          <HiChat />
          <span>Chat</span>
          {unreadCount > 0 && <TabBadge>{unreadCount > 99 ? "99+" : unreadCount}</TabBadge>}
        </Tab>
        <Tab $active={mobileTab === "users"} onClick={() => setMobileTab("users")}>
          <HiUsers />
          <span>Online ({onlineUsers.length})</span>
        </Tab>
      </MobileTabBar>
    </Page>
  );
};

export default Chat;
