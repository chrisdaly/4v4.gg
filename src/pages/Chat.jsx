import React, { useState, useEffect, useMemo, useRef } from "react";
import styled from "styled-components";
import { useLocation } from "react-router-dom";
import { HiUsers, HiChat } from "react-icons/hi";
import useChatFeed from "../lib/chat/useChatFeed";
import { useWatchList } from "../lib/chatExtras";
import { useTheme } from "../lib/ThemeContext";
import ChatPanel from "../components/ChatPanel";
import UserListSidebar from "../components/UserListSidebar";

const Page = styled.div`
  padding: var(--space-1) var(--space-2) 0;
  position: relative;

  @media (max-width: 768px) {
    padding: 0;
  }
`;

const Layout = styled.div`
  display: flex;
  gap: var(--space-2);
  /* --nav-height is 0px while body.chat-focus hides the navbar (Navbar.css) */
  height: calc(100vh - var(--nav-height) - var(--space-1));

  @media (max-width: 768px) {
    gap: 0;
    height: calc(100dvh - var(--nav-height) - 48px); /* dvh handles mobile address bar; 48px tab bar */
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
  height: 48px;
  background: rgba(10, 8, 6, 0.95);
  backdrop-filter: blur(8px);
  border-top: 1px solid rgba(252, 219, 51, 0.15);

  @media (max-width: 768px) {
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

/* ── Main component ───────────────────────────────────────────── */

const Chat = () => {
  const {
    messages,
    status,
    onlineUsers,
    botResponses,
    translations,
    sendMessage,
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
    recentChatters,
    gameEvents,
    recentWinners,
    recentDeltas,
    liveStreamers,
  } = useChatFeed();
  const { borderTheme } = useTheme();
  const { watchList, toggleWatch } = useWatchList();
  const [mobileTab, setMobileTab] = useState("chat"); // "chat" | "users"
  // /chat?m=<messageId> permalink; read once per navigation, the copy-link
  // button updates the URL with replaceState so the router never sees it
  const { search } = useLocation();
  const permalinkId = useMemo(() => new URLSearchParams(search).get("m"), [search]);

  // Unread badge for the mobile Chat tab: everything newer than the last
  // message that was on screen when the user left the chat tab
  const lastSeenIdRef = useRef(null);
  const newestId = messages.length > 0 ? messages[messages.length - 1].id : null;
  useEffect(() => {
    if (mobileTab === "chat") lastSeenIdRef.current = newestId;
  }, [mobileTab, newestId]);
  const unreadCount = useMemo(() => {
    if (mobileTab === "chat") return 0;
    const lastSeen = lastSeenIdRef.current;
    let count = 0;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].id === lastSeen) break;
      count++;
    }
    return count;
  }, [messages, mobileTab]);

  return (
    <Page>
      <Layout>
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
          sendMessage={sendMessage}
          loadOlder={loadOlder}
          hasMoreHistory={hasMoreHistory}
          loadWindow={loadWindow}
          loadLatest={loadLatest}
          windowMode={windowMode}
          windowId={windowId}
          permalinkId={permalinkId}
        />
        <UserListSidebar
          users={onlineUsers}
          avatars={avatars}
          stats={stats}
          sessions={sessions}
          inGameTags={inGameTags}
          inGameInfoMap={inGameInfoMap}
          inGameMatchMap={inGameMatchMap}
          recentWinners={recentWinners}
          recentDeltas={recentDeltas}
          liveStreamers={liveStreamers}
          watchList={watchList}
          onToggleWatch={toggleWatch}
          recentChatters={recentChatters}
          $mobileVisible={mobileTab === "users"}
          onClose={() => setMobileTab("chat")}
          borderTheme={borderTheme}
        />
      </Layout>
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
