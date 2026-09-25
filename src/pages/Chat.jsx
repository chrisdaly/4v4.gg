import React, { useState, useMemo, useCallback, useEffect } from "react";
import styled, { createGlobalStyle } from "styled-components";
import { Link, useLocation } from "react-router-dom";
import { HiOutlineSearch } from "react-icons/hi";
import useChatFeed from "../lib/chat/useChatFeed";
import { useWatchList } from "../lib/chatExtras";
import { useTheme } from "../lib/ThemeContext";
import useIsMobile, { CHAT_MOBILE_PX } from "../lib/useIsMobile";
import ChatPanel from "../components/ChatPanel";
import UserListSidebar from "../components/UserListSidebar";
import MapPanel from "../components/chat/MapPanel";
import RegionsPanel from "../components/chat/RegionsPanel";
import GameModal from "../components/chat/GameModal";
import GameSheet from "../components/chat/GameSheet";
import PlayerSheet from "../components/chat/PlayerSheet";
import MapModal from "../components/chat/MapModal";
import { regionSummary } from "../lib/chat/regions";

/**
 * /chat (Chat v3): the full viewport, no navbar (Router.jsx renders this
 * route outside the Navbar branch), as a CSS grid of four panels. Layout D
 * from 1200px (chat | map over regions | roster), layout C below (chat |
 * map, regions, roster stacked), and at 768px and under the chat alone
 * under a 52px top bar (logo, online pill, search button); the roster is a
 * sheet that drops from the bar, a name opens the player card and a game
 * the full-screen game sheet.
 */

const WIDE = 1200; // px, layout D from here
const MOBILE = CHAT_MOBILE_PX; // px, top bar at and below this
const TOP_BAR = 52; // px
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
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: ${TOP_BAR}px minmax(0, 1fr);
    grid-template-areas:
      "bar"
      "chat";
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

/* ── Mobile top bar ─────────────────────────────── */

const TopBar = styled.header`
  grid-area: bar;
  display: none;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  background: rgba(10, 8, 6, 0.9);
  border-bottom: 1px solid rgba(var(--gold-muted-rgb), 0.25);
  position: relative;
  z-index: calc(var(--z-overlay) + 1); /* above the roster sheet */

  @media (max-width: ${MOBILE}px) {
    display: flex;
  }
`;

const Logo = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  flex-shrink: 0;
  font-family: var(--font-display);
  font-size: 19px;
  color: var(--gold);
  text-decoration: none;
  &:hover {
    color: var(--white);
  }
`;

/* "{n} online · ● {k} in game ⌄": toggles the roster sheet */
const OnlinePill = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 10px;
  min-width: 0;
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
  background: ${(p) => (p.$open ? "var(--gold-tint)" : "transparent")};
  border: 1px solid ${(p) => (p.$open ? "rgba(252, 219, 51, 0.5)" : "rgba(255, 255, 255, 0.12)")};
  border-radius: 16px;
  cursor: pointer;
  white-space: nowrap;
  transition: background var(--transition), border-color var(--transition);
  strong {
    font-weight: normal;
    color: var(--white);
  }
  svg {
    width: 10px;
    height: 10px;
    transform: ${(p) => (p.$open ? "rotate(180deg)" : "none")};
    transition: transform 0.2s;
  }
`;

const LiveDot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: var(--radius-full);
  background: var(--red);
  animation: pulse 1.5s infinite;
`;

const SearchButton = styled.button`
  margin-left: auto;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: ${(p) => (p.$open ? "var(--gold)" : "var(--text-body)")};
  background: ${(p) => (p.$open ? "var(--gold-tint)" : "none")};
  border: 1px solid ${(p) => (p.$open ? "rgba(252, 219, 51, 0.5)" : "rgba(255, 255, 255, 0.12)")};
  border-radius: var(--radius-md);
  cursor: pointer;
  svg {
    width: 16px;
    height: 16px;
  }
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
  const isMobile = useIsMobile();
  // Mobile: the roster sheet, from the top bar's online pill
  const [rosterOpen, setRosterOpen] = useState(false);
  // One scope at a time: a region (a regionOf name, from a region row or a
  // map dot) or a country (an ISO code, from the fullscreen map's rail or
  // dots). Narrows the roster, its strip and the map dimming, never the
  // chat. Setting one clears the other; null from either clears both.
  const [region, setRegionState] = useState(null);
  const [country, setCountryState] = useState(null);
  const setRegion = useCallback((r) => {
    setRegionState(r);
    setCountryState(null);
  }, []);
  const setCountry = useCallback((c) => {
    setCountryState(c);
    setRegionState(null);
  }, []);
  // Chat panel modes: the mobile search row from the top bar's search
  // button (opening it closes the roster), stats and games from the map
  // header's icon buttons
  const [searchOpen, setSearchOpenState] = useState(false);
  const setSearchOpen = useCallback((v) => {
    setSearchOpenState(v);
    if (v) setRosterOpen(false);
  }, []);
  const toggleRoster = useCallback(() => {
    setRosterOpen((v) => !v);
    setSearchOpenState(false);
  }, []);
  const [statsOpen, setStatsOpen] = useState(false);
  // The fullscreen map (MapModal), from the map body or its expand button
  const [mapOpen, setMapOpen] = useState(false);
  const openMap = useCallback(() => setMapOpen(true), []);
  const closeMap = useCallback(() => setMapOpen(false), []);
  const [showGames, setShowGames] = useState(readShowGames);
  const changeShowGames = useCallback((v) => {
    writeShowGames(v);
    setShowGames(v);
  }, []);
  // The ongoing game opened from an in-game marker, roster row or player
  // card: an inGameInfoMap entry { matchId, mapName, startTime }, null when
  // closed. Mobile shows it as the full-screen game sheet.
  const [openGame, setOpenGame] = useState(null);
  // The player card (mobile): a battleTag, from a name in the stream or a
  // roster row
  const [openPlayer, setOpenPlayer] = useState(null);
  const openGameModal = useCallback((info) => {
    if (!info) return;
    setOpenPlayer(null);
    setRosterOpen(false);
    setOpenGame(info);
  }, []);
  const closeGameModal = useCallback(() => setOpenGame(null), []);
  const openPlayerCard = useCallback((tag) => {
    if (!tag) return;
    setRosterOpen(false);
    setOpenPlayer(tag);
  }, []);
  const closePlayerCard = useCallback(() => setOpenPlayer(null), []);
  // /chat?m=<messageId> permalink; read once per navigation, the copy-link
  // button updates the URL with replaceState so the router never sees it
  const { search } = useLocation();
  const permalinkId = useMemo(() => new URLSearchParams(search).get("m"), [search]);
  // &at=<received_at>: where in the archive the message sits, so a link to
  // something older than the loaded window can reload around it
  const permalinkAt = useMemo(() => new URLSearchParams(search).get("at"), [search]);

  // Once-a-minute clock for the region rows' local times
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), CLOCK_TICK_MS);
    return () => clearInterval(id);
  }, []);
  const regions = useMemo(() => regionSummary(onlineUsers, { stats, avatars }, now), [onlineUsers, stats, avatars, now]);

  const inGameCount = useMemo(() => onlineUsers.filter((u) => inGameTags?.has(u.battleTag)).length, [onlineUsers, inGameTags]);
  const gameProps = {
    game: openGame,
    gameEvents,
    ongoingMatches,
    ongoingMatchIds,
    onlineUsers,
    inGameInfoMap,
    stats,
    avatars,
    onClose: closeGameModal,
  };

  return (
    <Page data-chat-page>
      <ChatBackground />
      <TopBar data-chat-top-bar>
        <Logo to="/" title={`4v4.GG home · relay ${status || "connecting"}`} data-relay-status={status || "connecting"}>
          4v4.GG
        </Logo>
        <OnlinePill
          type="button"
          $open={rosterOpen}
          aria-expanded={rosterOpen}
          aria-controls="chat-roster"
          aria-label={`${onlineUsers.length} online, ${inGameCount} in game. ${rosterOpen ? "Hide" : "Show"} roster`}
          data-online-pill
          onClick={toggleRoster}
        >
          <strong>{onlineUsers.length}</strong>
          <span>online</span>
          <LiveDot aria-hidden="true" />
          <strong>{inGameCount}</strong>
          <span>in game</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </OnlinePill>
        <SearchButton
          type="button"
          $open={searchOpen}
          aria-pressed={searchOpen}
          aria-label="Search"
          title={searchOpen ? "Close search" : "Search messages"}
          onClick={() => setSearchOpen(!searchOpen)}
        >
          <HiOutlineSearch />
        </SearchButton>
      </TopBar>
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
          permalinkAt={permalinkAt}
          onOpenGame={openGameModal}
          onOpenPlayer={openPlayerCard}
          isMobile={isMobile}
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
        region={region}
        country={country}
        onRegionChange={setRegion}
        statsOpen={statsOpen}
        onStatsOpenChange={setStatsOpen}
        showGames={showGames}
        onShowGamesChange={changeShowGames}
        onExpand={openMap}
      />
      <RegionsArea rows={regions.rows} region={region} country={country} onRegionChange={setRegion} />
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
        onOpenPlayer={openPlayerCard}
        isMobile={isMobile}
        region={region}
        country={country}
        $mobileVisible={rosterOpen}
        id="chat-roster"
      />
      {mapOpen && (
        <MapModal
          users={onlineUsers}
          avatars={avatars}
          stats={stats}
          inGameTags={inGameTags}
          inGameInfoMap={inGameInfoMap}
          regions={regions.rows}
          region={region}
          country={country}
          onRegionChange={setRegion}
          onCountryChange={setCountry}
          onOpenGame={openGameModal}
          onClose={closeMap}
        />
      )}
      {openPlayer && isMobile && (
        <PlayerSheet
          battleTag={openPlayer}
          onlineUsers={onlineUsers}
          avatars={avatars}
          stats={stats}
          sessions={sessions}
          inGameTags={inGameTags}
          inGameInfoMap={inGameInfoMap}
          onWatchGame={openGameModal}
          onClose={closePlayerCard}
        />
      )}
      {openGame &&
        (isMobile ? (
          <GameSheet {...gameProps} />
        ) : (
          <GameModal {...gameProps} hoverData={{ avatars, stats, sessions, inGameTags, inGameInfoMap }} />
        ))}
    </Page>
  );
};

export default Chat;
