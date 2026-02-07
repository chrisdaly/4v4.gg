import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import styled from "styled-components";
import { HiUsers } from "react-icons/hi";
import useChatStream from "../lib/useChatStream";
import { getPlayerProfile, getPlayerStats, getOngoingMatches } from "../lib/api";
import ChatPanel from "../components/ChatPanel";
import UserListSidebar from "../components/UserListSidebar";

const Page = styled.div`
  padding: var(--space-4) var(--space-4) 0;
  max-width: 1400px;
  margin: 0 auto;

  @media (max-width: 768px) {
    padding: var(--space-2) var(--space-2) 0;
  }
`;

const Layout = styled.div`
  display: flex;
  gap: var(--space-4);
  height: calc(100vh - 80px);
`;

const MobileToggle = styled.button`
  display: none;
  position: fixed;
  bottom: var(--space-4);
  right: var(--space-4);
  z-index: calc(var(--z-overlay) - 1);
  width: 48px;
  height: 48px;
  border-radius: var(--radius-full);
  border: 1px solid var(--gold);
  background: var(--grey-dark);
  color: var(--gold);
  font-size: 20px;
  cursor: pointer;
  align-items: center;
  justify-content: center;

  @media (max-width: 768px) {
    display: flex;
  }
`;

const MobileBackdrop = styled.div`
  display: none;

  @media (max-width: 768px) {
    display: block;
    position: fixed;
    inset: 0;
    z-index: calc(var(--z-overlay) - 1);
    background: rgba(0, 0, 0, 0.6);
  }
`;

/* ── Main component ───────────────────────────────────────────── */

const Chat = () => {
  const { messages, status, onlineUsers } = useChatStream();
  const [avatars, setAvatars] = useState(new Map());
  const [stats, setStats] = useState(new Map());
  const [ongoingMatches, setOngoingMatches] = useState([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const fetchedRef = useRef(new Set());

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

  // Build set of in-game battleTags
  const inGameTags = useMemo(() => {
    const tags = new Set();
    for (const match of ongoingMatches) {
      for (const team of match.teams) {
        for (const player of team.players) {
          if (player.battleTag) tags.add(player.battleTag);
        }
      }
    }
    return tags;
  }, [ongoingMatches]);

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
    }
  }, [allTags]);

  return (
    <Page>
      <Layout>
        <ChatPanel
          messages={messages}
          status={status}
          avatars={avatars}
          stats={stats}
          inGameTags={inGameTags}
        />
        <UserListSidebar
          users={onlineUsers}
          avatars={avatars}
          stats={stats}
          inGameTags={inGameTags}
          inGameMatchMap={inGameMatchMap}
          $mobileVisible={showSidebar}
          onClose={() => setShowSidebar(false)}
        />
      </Layout>
      {showSidebar && <MobileBackdrop onClick={() => setShowSidebar(false)} />}
      <MobileToggle onClick={() => setShowSidebar((v) => !v)}>
        <HiUsers />
      </MobileToggle>
    </Page>
  );
};

export default Chat;
