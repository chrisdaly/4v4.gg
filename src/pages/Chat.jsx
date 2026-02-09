import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import styled from "styled-components";
import { HiUsers } from "react-icons/hi";
import { GiCrossedSwords } from "react-icons/gi";
import { IoColorPaletteOutline } from "react-icons/io5";
import useChatStream from "../lib/useChatStream";
import { getPlayerProfile, getPlayerStats, getPlayerSessionLight, getOngoingMatches } from "../lib/api";
import { themeList, getTheme, loadThemeId, saveThemeId } from "../lib/borderThemes";
import ChatPanel from "../components/ChatPanel";
import ActiveGamesSidebar from "../components/ActiveGamesSidebar";
import UserListSidebar from "../components/UserListSidebar";

const Page = styled.div`
  padding: var(--space-1) var(--space-2) 0;
  position: relative;

  &::before {
    content: "";
    position: fixed;
    inset: 0;
    background: url("/frames/launcher/Static_Background.png") center / cover no-repeat fixed;
    z-index: -2;
  }

  &::after {
    content: "";
    position: fixed;
    inset: 0;
    background: transparent;
    z-index: -1;
  }

  @media (max-width: 768px) {
    padding: 0;
  }
`;

const Layout = styled.div`
  display: flex;
  gap: var(--space-2);
  height: calc(100vh - var(--space-1));

  @media (max-width: 768px) {
    gap: 0;
    height: 100vh;
  }
`;

const MobileToggle = styled.button`
  display: none;
  position: fixed;
  bottom: var(--space-4);
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
  right: ${(p) => p.$right || "auto"};
  left: ${(p) => p.$left || "auto"};

  @media (max-width: 768px) {
    display: flex;
  }
`;


/* ── Theme Picker ────────────────────────────────────────────── */

const ThemeButton = styled.button`
  position: fixed;
  bottom: var(--space-4);
  left: 50%;
  transform: translateX(-50%);
  z-index: calc(var(--z-overlay) - 1);
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  border: 1px solid rgba(160, 130, 80, 0.3);
  background: rgba(20, 16, 12, 0.8);
  color: var(--grey-light);
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  backdrop-filter: blur(4px);

  &:hover {
    color: var(--gold);
    border-color: var(--gold);
  }
`;

const ThemePanel = styled.div`
  position: fixed;
  bottom: 60px;
  left: 50%;
  transform: translateX(-50%);
  z-index: var(--z-overlay);
  display: flex;
  gap: 6px;
  padding: var(--space-2);
  background: rgba(15, 12, 8, 0.95);
  border: 1px solid rgba(160, 130, 80, 0.3);
  border-radius: var(--radius-md);
  backdrop-filter: blur(8px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
`;

const ThemeOption = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  background: ${(p) => (p.$active ? "rgba(252, 219, 51, 0.1)" : "transparent")};
  border: 1px solid ${(p) => (p.$active ? "var(--gold)" : "rgba(160, 130, 80, 0.15)")};
  border-radius: var(--radius-sm);
  color: ${(p) => (p.$active ? "var(--gold)" : "var(--grey-light)")};
  font-family: var(--font-mono);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;

  &:hover {
    color: var(--gold);
    border-color: rgba(252, 219, 51, 0.3);
    background: rgba(252, 219, 51, 0.05);
  }
`;

const ThemeName = styled.span`
  font-family: var(--font-display);
  font-size: var(--text-xxs);
`;

const ThemeDesc = styled.span`
  font-size: 10px;
  opacity: 0.6;
`;

/* ── Main component ───────────────────────────────────────────── */

const Chat = () => {
  const { messages, status, onlineUsers } = useChatStream();
  const [avatars, setAvatars] = useState(new Map());
  const [stats, setStats] = useState(new Map());
  const [sessions, setSessions] = useState(new Map());
  const [ongoingMatches, setOngoingMatches] = useState([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showGames, setShowGames] = useState(false);
  const [finishedMatches, setFinishedMatches] = useState([]);
  const [recentWinners, setRecentWinners] = useState(new Set());
  const [themeId, setThemeId] = useState(loadThemeId);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const fetchedRef = useRef(new Set());
  const prevInGameRef = useRef(new Set());
  const prevMatchIdsRef = useRef(new Set());

  const borderTheme = useMemo(() => getTheme(themeId), [themeId]);

  function handleThemeChange(id) {
    setThemeId(id);
    saveThemeId(id);
  }

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
      // Direct fetch to bypass cache — the cached version may lack winner data
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

      // If no winner data yet and we haven't retried too many times, wait and retry
      if (winnerTeamIndex < 0 && attempt < 3) {
        setTimeout(() => fetchResult(id, attempt + 1), 5000);
        return;
      }

      // Track winning player battleTags
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
          // Clear after 2 minutes
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
      // Wait 5s before first attempt — give API time to process the result
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
    // If a player sent a message in the last 60s, they're probably not in game
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
          $mobileVisible={showGames}
          onClose={() => setShowGames(false)}
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
          borderTheme={borderTheme}
        />
        <UserListSidebar
          users={onlineUsers}
          avatars={avatars}
          stats={stats}
          inGameTags={inGameTags}
          inGameMatchMap={inGameMatchMap}
          recentWinners={recentWinners}
          $mobileVisible={showSidebar}
          onClose={() => setShowSidebar(false)}
          borderTheme={borderTheme}
        />
      </Layout>
      <ThemeButton onClick={() => setShowThemePicker((v) => !v)} title="Change border theme">
        <IoColorPaletteOutline />
      </ThemeButton>
      {showThemePicker && (
        <ThemePanel>
          {themeList.map((t) => (
            <ThemeOption
              key={t.id}
              $active={t.id === themeId}
              onClick={() => handleThemeChange(t.id)}
            >
              <ThemeName>{t.name}</ThemeName>
              <ThemeDesc>{t.desc}</ThemeDesc>
            </ThemeOption>
          ))}
        </ThemePanel>
      )}
      {!showGames && !showSidebar && (
        <>
          <MobileToggle $left="var(--space-4)" onClick={() => setShowGames(true)}>
            <GiCrossedSwords />
          </MobileToggle>
          <MobileToggle $right="var(--space-4)" onClick={() => setShowSidebar(true)}>
            <HiUsers />
          </MobileToggle>
        </>
      )}
    </Page>
  );
};

export default Chat;
