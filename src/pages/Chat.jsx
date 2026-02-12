import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import styled from "styled-components";
import { HiUsers, HiChat } from "react-icons/hi";
import { GiCrossedSwords } from "react-icons/gi";
import useChatStream from "../lib/useChatStream";
import { getPlayerProfile, getPlayerStats, getPlayerSessionLight, getOngoingMatches } from "../lib/api";
import { useTheme } from "../lib/ThemeContext";
import ChatPanel from "../components/ChatPanel";
import ActiveGamesSidebar from "../components/ActiveGamesSidebar";
import UserListSidebar from "../components/UserListSidebar";

const IDLE_MS = 3 * 60 * 60 * 1000; // 3 hours

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
  height: calc(100vh - 52px);

  @media (max-width: 768px) {
    gap: 0;
    height: calc(100dvh - 46px - 48px); /* dvh handles mobile address bar */
  }
`;

/* ── Mobile Tab Bar ──────────────────────────── */

const MobileTabBar = styled.div`
  display: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 10000;
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
  font-size: 10px;
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
  border-radius: 8px;
  background: var(--red);
  color: #fff;
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
`;

/* ── Main component ───────────────────────────────────────────── */

const Chat = () => {
  const { messages, status, onlineUsers, botResponses, translations, sendMessage } = useChatStream();
  const { borderTheme } = useTheme();
  const [avatars, setAvatars] = useState(new Map());
  const [stats, setStats] = useState(new Map());
  const [sessions, setSessions] = useState(new Map());
  const [ongoingMatches, setOngoingMatches] = useState([]);
  const [mobileTab, setMobileTab] = useState("chat"); // "games" | "chat" | "users"
  const [unreadCount, setUnreadCount] = useState(0);
  const [finishedMatches, setFinishedMatches] = useState([]);
  const [recentWinners, setRecentWinners] = useState(new Set());
  const [tick, setTick] = useState(0);
  const fetchedRef = useRef(new Set());
  const prevInGameRef = useRef(new Set());
  const prevMatchIdsRef = useRef(new Set());
  const prevMsgCountRef = useRef(0);

  // Track unread messages when not on chat tab
  useEffect(() => {
    if (mobileTab === "chat") {
      setUnreadCount(0);
      prevMsgCountRef.current = messages.length;
    } else {
      const newCount = messages.length - prevMsgCountRef.current;
      if (newCount > 0) setUnreadCount(newCount);
    }
  }, [messages.length, mobileTab]);

  // Poll ongoing matches every 30s
  const fetchOngoing = useCallback(async () => {
    try {
      const data = await getOngoingMatches();
      setOngoingMatches(data.matches || []);
    } catch {}
  }, []);

  useEffect(() => {
    fetchOngoing();
    const interval = setInterval(fetchOngoing, 30000);
    return () => clearInterval(interval);
  }, [fetchOngoing]);

  // Tick for idle recomputation (once per minute)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  // Detect matches that just ended, fetch results with retry, show briefly then remove
  useEffect(() => {
    const currentIds = new Set(ongoingMatches.map((m) => m.id || m.match?.id));
    const prevIds = prevMatchIdsRef.current;
    const endedIds = [...prevIds].filter((id) => id && !currentIds.has(id));
    prevMatchIdsRef.current = currentIds;

    if (endedIds.length === 0) return;
    console.log("[GameEnd] Detected ended matches:", endedIds);

    async function fetchResult(id, attempt = 0) {
      console.log(`[GameEnd] Fetching result for ${id}, attempt ${attempt}`);
      let match;
      try {
        const res = await fetch(`https://website-backend.w3champions.com/api/matches/${encodeURIComponent(id)}`);
        if (!res.ok) return;
        const result = await res.json();
        match = result?.match;
      } catch { return; }
      if (!match) return;

      const winnerTeamIndex = match.teams?.findIndex(
        (t) => t.players?.some((p) => p.won === true || p.won === 1)
      );

      if (winnerTeamIndex < 0 && attempt < 3) {
        setTimeout(() => fetchResult(id, attempt + 1), 5000);
        return;
      }

      if (winnerTeamIndex >= 0) {
        const winnerTags = match.teams[winnerTeamIndex].players
          ?.map((p) => p.battleTag)
          .filter(Boolean) || [];
        if (winnerTags.length > 0) {
          setRecentWinners((prev) => {
            const next = new Set(prev);
            winnerTags.forEach((t) => next.add(t));
            return next;
          });
          setTimeout(() => {
            setRecentWinners((prev) => {
              const next = new Set(prev);
              winnerTags.forEach((t) => next.delete(t));
              return next;
            });
          }, 120_000);
        }
      }

      setFinishedMatches((prev) => [
        ...prev,
        { ...match, id, _winnerTeam: winnerTeamIndex >= 0 ? winnerTeamIndex : null, _finishedAt: Date.now() },
      ]);
      setTimeout(() => {
        setFinishedMatches((prev) => prev.filter((m) => m.id !== id));
      }, 8000);
    }

    for (const id of endedIds) {
      setTimeout(() => fetchResult(id), 5000);
    }
  }, [ongoingMatches]);

  // Build set of in-game battleTags, suppressing players who chatted recently
  const inGameTags = useMemo(() => {
    const tags = new Set();
    for (const match of ongoingMatches) {
      for (const team of match.teams) {
        for (const player of team.players) {
          if (player.battleTag) tags.add(player.battleTag);
        }
      }
    }
    const now = Date.now();
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      const msgTime = new Date(msg.sent_at || msg.sentAt).getTime();
      if (now - msgTime > 60_000) break;
      const tag = msg.battle_tag || msg.battleTag;
      if (tag) tags.delete(tag);
    }
    return tags;
  }, [ongoingMatches, messages]);

  // Compute idle tags
  const idleTags = useMemo(() => {
    const now = Date.now();
    const idle = new Set();
    for (const u of onlineUsers) {
      if (u.joinedAt && now - u.joinedAt > IDLE_MS && !inGameTags.has(u.battleTag)) {
        idle.add(u.battleTag);
      }
    }
    return idle;
  }, [onlineUsers, inGameTags, tick]);

  // Build map of in-game battleTag → player page URL
  const inGameMatchMap = useMemo(() => {
    const map = new Map();
    for (const match of ongoingMatches) {
      for (const team of match.teams) {
        for (const player of team.players) {
          if (player.battleTag) {
            map.set(
              player.battleTag,
              `/player/${encodeURIComponent(player.battleTag)}`
            );
          }
        }
      }
    }
    return map;
  }, [ongoingMatches]);

  // Re-fetch sessions for players who just left a game
  useEffect(() => {
    const prev = prevInGameRef.current;
    const leftGame = [...prev].filter((tag) => !inGameTags.has(tag));
    prevInGameRef.current = new Set(inGameTags);
    for (const tag of leftGame) {
      getPlayerSessionLight(tag).then((data) => {
        if (data?.session?.form) {
          setSessions((p) => {
            const next = new Map(p);
            next.set(tag, data.session.form);
            return next;
          });
        }
      });
    }
  }, [inGameTags]);

  // Collect all unique battleTags
  const allTags = useMemo(() => {
    const tags = new Set();
    for (const m of messages) {
      const tag = m.battle_tag || m.battleTag;
      if (tag) tags.add(tag);
    }
    for (const u of onlineUsers) {
      if (u.battleTag) tags.add(u.battleTag);
    }
    return tags;
  }, [messages, onlineUsers]);

  // Fetch avatars + stats incrementally
  useEffect(() => {
    const newTags = [];
    for (const tag of allTags) {
      if (!fetchedRef.current.has(tag)) {
        fetchedRef.current.add(tag);
        newTags.push(tag);
      }
    }
    if (newTags.length === 0) return;

    for (const tag of newTags) {
      getPlayerProfile(tag).then((profile) => {
        setAvatars((prev) => {
          const next = new Map(prev);
          next.set(tag, profile);
          return next;
        });
      });
      getPlayerStats(tag).then((playerStats) => {
        if (playerStats) {
          setStats((prev) => {
            const next = new Map(prev);
            next.set(tag, playerStats);
            return next;
          });
        }
      });
      getPlayerSessionLight(tag).then((data) => {
        if (data?.session?.form) {
          setSessions((prev) => {
            const next = new Map(prev);
            next.set(tag, data.session.form);
            return next;
          });
        }
      });
    }
  }, [allTags]);

  return (
    <Page>
      <Layout>
        <ActiveGamesSidebar
          matches={ongoingMatches}
          finishedMatches={finishedMatches}
          $mobileVisible={mobileTab === "games"}
          onClose={() => setMobileTab("chat")}
          borderTheme={borderTheme}
        />
        <ChatPanel
          messages={messages}
          status={status}
          avatars={avatars}
          stats={stats}
          sessions={sessions}
          inGameTags={inGameTags}
          recentWinners={recentWinners}
          botResponses={botResponses}
          translations={translations}
          borderTheme={borderTheme}
          sendMessage={sendMessage}
        />
        <UserListSidebar
          users={onlineUsers}
          avatars={avatars}
          stats={stats}
          inGameTags={inGameTags}
          idleTags={idleTags}
          inGameMatchMap={inGameMatchMap}
          recentWinners={recentWinners}
          $mobileVisible={mobileTab === "users"}
          onClose={() => setMobileTab("chat")}
          borderTheme={borderTheme}
        />
      </Layout>
      <MobileTabBar>
        <Tab $active={mobileTab === "games"} onClick={() => setMobileTab("games")}>
          <GiCrossedSwords />
          <span>Games{ongoingMatches.length > 0 ? ` (${ongoingMatches.length})` : ""}</span>
        </Tab>
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
