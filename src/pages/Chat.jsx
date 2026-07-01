import React, { useState, useEffect, useMemo, useRef } from "react";
import styled from "styled-components";
import { HiUsers, HiChat } from "react-icons/hi";
import useChatStream from "../lib/useChatStream";
import { getPlayerProfile, getPlayerStats, getPlayerSessionLight, getFinishedMatches, getMatch, getMatchBlurb } from "../lib/api";
import { computeMvp, computeNote } from "../lib/matchNotes";
import { getLiveStreamers } from "../lib/twitchService";
import { geometricMean } from "../lib/formatters";
import { useWatchList } from "../lib/chatExtras";
import useOngoingMatches from "../lib/useOngoingMatches";
import { useTheme } from "../lib/ThemeContext";
import ChatPanel from "../components/ChatPanel";
import UserListSidebar from "../components/UserListSidebar";

const IDLE_MS = 3 * 60 * 60 * 1000; // 3 hours

/* ── Game-event builders ──────────────────────────────
   Events show the full lobby (all 8 players); `inChannel` marks the ones
   in the chat room so the renderer can highlight them. Events are only
   emitted when at least one player is in the channel. */

const buildEventPlayers = (team, relevant) =>
  (team.players || []).map((p) => ({
    battleTag: p.battleTag,
    name: p.name || p.battleTag?.split("#")[0],
    // effective race — finished games resolve what Random rolled
    race: p.rndRace ?? p.race ?? null,
    mmr: p.oldMmr ?? null,
    mmrGain: p.mmrGain ?? null,
    inChannel: relevant.has(p.battleTag?.toLowerCase()),
  }));

// Same metric as the big match card's team header
const teamMmr = (team) => {
  const mmrs = team?.players?.map((p) => p.oldMmr).filter((m) => m > 0) || [];
  return mmrs.length > 0 ? Math.round(geometricMean(mmrs)) : null;
};

// computeMvp / computeNote live in lib/matchNotes.js, shared with the
// finished-match page.

function buildStartEvent(match, relevant) {
  const id = match.id || match.match?.id;
  if (!id) return null;
  const teams = (match.teams || []).map((t) => buildEventPlayers(t, relevant));
  return {
    id: `gs-${id}`,
    type: "game_start",
    time: match.startTime,
    matchId: id,
    mapName: match.mapName,
    teamMmrs: [teamMmr(match.teams?.[0]), teamMmr(match.teams?.[1])],
    teams,
  };
}

function buildEndEvent(match, id, relevant) {
  const winnerIdx = match.teams?.findIndex(
    (t) => t.players?.some((p) => p.won === true || p.won === 1)
  );
  if (winnerIdx == null || winnerIdx < 0) return null;
  const teams = (match.teams || []).map((t) => buildEventPlayers(t, relevant));
  const ev = {
    id: `ge-${id}`,
    type: "game_end",
    time: match.endTime || new Date().toISOString(),
    matchId: id,
    mapName: match.mapName,
    durationInSeconds: match.durationInSeconds ?? null,
    winners: teams[winnerIdx] || [],
    losers: teams[1 - winnerIdx] || [],
    winnersMmr: teamMmr(match.teams?.[winnerIdx]),
    losersMmr: teamMmr(match.teams?.[1 - winnerIdx]),
  };
  ev.note = computeNote(ev);
  return ev;
}

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
  height: calc(100vh - 52px - var(--space-1));

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
  const { messages, status, onlineUsers, botResponses, translations, sendMessage, loadOlder, hasMoreHistory } = useChatStream();
  const { borderTheme } = useTheme();
  const [avatars, setAvatars] = useState(new Map());
  const [stats, setStats] = useState(new Map());
  const [sessions, setSessions] = useState(new Map());
  const { matches: ongoingMatches } = useOngoingMatches();
  const [mobileTab, setMobileTab] = useState("chat"); // "chat" | "users"
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentWinners, setRecentWinners] = useState(new Set());
  const [gameEvents, setGameEvents] = useState([]);
  const [recentDeltas, setRecentDeltas] = useState(new Map());
  const [liveStreamers, setLiveStreamers] = useState(new Map());
  const { watchList, toggleWatch } = useWatchList();
  const [tick, setTick] = useState(0);
  const fetchedRef = useRef(new Set());
  const prevInGameRef = useRef(new Set());
  const prevMatchIdsRef = useRef(new Set());
  const prevMsgCountRef = useRef(0);
  const matchTimersRef = useRef([]);
  const channelTagsRef = useRef(new Set());
  const startedMatchPlayersRef = useRef(new Map());
  const avatarsRef = useRef(avatars);

  // Lowercased battleTags of everyone in the channel — used to decide which
  // game events are relevant enough to show inline in the chat
  useEffect(() => {
    channelTagsRef.current = new Set(
      onlineUsers.map((u) => u.battleTag?.toLowerCase()).filter(Boolean)
    );
  }, [onlineUsers]);

  useEffect(() => {
    avatarsRef.current = avatars;
  }, [avatars]);

  const addGameEvent = (event) => {
    setGameEvents((prev) => {
      if (prev.some((e) => e.id === event.id)) return prev;
      return [...prev.slice(-99), event];
    });
  };

  // When heuristics found nothing, ask the relay's LLM ticker for a drama
  // angle. The relay answers immediately with a provisional blurb, then may
  // rewrite it once post-game reactions land — so keep polling while
  // pending and swap the text in place (only blurb notes get replaced).
  const fillBlurb = (eventId, matchId, attempt = 0) => {
    getMatchBlurb(matchId).then(({ blurb, parts, badges, rivals, pending, retryInMs }) => {
      setGameEvents((prev) =>
        prev.map((e) => {
          if (e.id !== eventId) return e;
          const next = { ...e };
          // Chat shows all parts: headline + h2h + streaks + drama
          const chatText = parts
            ? [parts.headline, parts.h2h, parts.streaks, parts.drama].filter(Boolean).join(' · ')
            : blurb;
          if (chatText) next.note = { text: chatText, tag: null, blurb: true };
          if (badges?.length) next.badges = badges;
          if (rivals?.length) next.rivals = rivals;
          return next;
        })
      );
      if (pending && attempt < 3) {
        addMatchTimer(() => fillBlurb(eventId, matchId, attempt + 1), retryInMs || 5 * 60 * 1000);
      }
    });
  };

  // Backfill game events retroactively on page load: recently finished games
  // (real endTime) and currently running games (real startTime) involving
  // channel members or recent chatters get injected into the stream, so the
  // chat shows game context from before you opened the page.
  const backfillContext = () => {
    const relevant = new Set(channelTagsRef.current);
    for (const m of messages) {
      const tag = (m.battle_tag || m.battleTag || "")?.toLowerCase();
      if (tag) relevant.add(tag);
    }
    const oldestMsgTime = new Date(messages[0].sent_at || messages[0].sentAt).getTime();
    const cutoff = Math.max(oldestMsgTime, Date.now() - 3 * 60 * 60 * 1000);
    return { cutoff, relevant };
  };

  const backfilledEndsRef = useRef(false);
  useEffect(() => {
    if (backfilledEndsRef.current) return;
    if (messages.length === 0 || onlineUsers.length === 0) return;
    backfilledEndsRef.current = true;

    const { cutoff, relevant } = backfillContext();
    getFinishedMatches(100).then(({ matches: finished }) => {
      for (const match of finished || []) {
        const endTime = new Date(match.endTime).getTime();
        if (!endTime || endTime < cutoff) continue;
        const ev = buildEndEvent(match, match.id, relevant);
        if (!ev) continue;
        addGameEvent(ev);
        // MVP + analytics notes need the match detail (cached 30 min);
        // only fetched for the handful of events that actually render
        getMatch(match.id).then((detail) => {
          if (!detail?.playerScores) return;
          const matchPlayers = (detail.match?.teams || []).flatMap((t) => t.players || []);
          const mvp = computeMvp(detail.playerScores);
          const note = computeNote(ev, { playerScores: detail.playerScores, matchPlayers });
          setGameEvents((prev) =>
            prev.map((e) => (e.id === ev.id ? { ...e, mvp, note } : e))
          );
          fillBlurb(ev.id, match.id);
        });
      }
    });
    // runs once when messages + users are first available
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, onlineUsers]);

  const backfilledStartsRef = useRef(false);
  useEffect(() => {
    if (backfilledStartsRef.current) return;
    if (messages.length === 0 || onlineUsers.length === 0 || ongoingMatches.length === 0) return;
    backfilledStartsRef.current = true;

    const { cutoff, relevant } = backfillContext();
    for (const match of ongoingMatches) {
      const startTime = new Date(match.startTime).getTime();
      if (!startTime || startTime < cutoff) continue;
      const ev = buildStartEvent(match, relevant);
      if (ev) {
        addGameEvent(ev);
        const id = match.id || match.match?.id;
        startedMatchPlayersRef.current.set(
          id,
          new Set(ev.teams.flat().map((p) => p.battleTag?.toLowerCase()).filter(Boolean))
        );
      }
    }
    // runs once when messages + users + first ongoing poll are all available
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, onlineUsers, ongoingMatches]);

  const addMatchTimer = (fn, ms) => {
    const id = setTimeout(() => {
      matchTimersRef.current = matchTimersRef.current.filter((t) => t !== id);
      fn();
    }, ms);
    matchTimersRef.current.push(id);
  };

  // Clear pending match-end timers on unmount
  useEffect(() => {
    return () => {
      for (const id of matchTimersRef.current) clearTimeout(id);
    };
  }, []);

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

  // Tick for idle recomputation (once per minute)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  // Detect matches that just started/ended. Started games with channel members
  // become inline chat events; ended games fetch results with retry.
  useEffect(() => {
    const currentIds = new Set(ongoingMatches.map((m) => m.id || m.match?.id));
    const prevIds = prevMatchIdsRef.current;
    const endedIds = [...prevIds].filter((id) => id && !currentIds.has(id));
    const isFirstLoad = prevIds.size === 0;
    prevMatchIdsRef.current = currentIds;

    // Game-start events for matches involving channel members
    if (!isFirstLoad) {
      for (const match of ongoingMatches) {
        const id = match.id || match.match?.id;
        if (!id || prevIds.has(id)) continue;
        const ev = buildStartEvent(match, channelTagsRef.current);
        if (ev) {
          addGameEvent({ ...ev, live: true });
          startedMatchPlayersRef.current.set(
            id,
            new Set(ev.teams.flat().map((p) => p.battleTag?.toLowerCase()).filter(Boolean))
          );
        }
      }
    }

    if (endedIds.length === 0) return;

    async function fetchResult(id, attempt = 0) {
      let match;
      let playerScores;
      try {
        const res = await fetch(`https://website-backend.w3champions.com/api/matches/${encodeURIComponent(id)}`);
        if (!res.ok) return;
        const result = await res.json();
        match = result?.match;
        playerScores = result?.playerScores;
      } catch { return; }
      if (!match) return;

      const winnerTeamIndex = match.teams?.findIndex(
        (t) => t.players?.some((p) => p.won === true || p.won === 1)
      );

      if (winnerTeamIndex < 0 && attempt < 3) {
        addMatchTimer(() => fetchResult(id, attempt + 1), 5000);
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
          addMatchTimer(() => {
            setRecentWinners((prev) => {
              const next = new Set(prev);
              winnerTags.forEach((t) => next.delete(t));
              return next;
            });
          }, 120_000);
        }

        // Inline chat event + transient MMR-delta pills for channel members.
        // Include tracked start-event players so the end card shows even if
        // they left the channel mid-game.
        const tracked = startedMatchPlayersRef.current.get(id);
        const effectiveRelevant = tracked
          ? new Set([...channelTagsRef.current, ...tracked])
          : channelTagsRef.current;
        const ev = buildEndEvent(match, id, effectiveRelevant);
        if (ev) {
          const matchPlayers = (match.teams || []).flatMap((t) => t.players || []);
          const note = computeNote(ev, { playerScores, matchPlayers });
          addGameEvent({
            ...ev,
            live: true,
            mvp: computeMvp(playerScores),
            note,
          });
          fillBlurb(ev.id, id);
          startedMatchPlayersRef.current.delete(id);
          const withDelta = [...ev.winners, ...ev.losers].filter(
            (p) => p.inChannel && p.mmrGain != null
          );
          if (withDelta.length > 0) {
            setRecentDeltas((prev) => {
              const next = new Map(prev);
              withDelta.forEach((p) => next.set(p.battleTag, p.mmrGain));
              return next;
            });
            addMatchTimer(() => {
              setRecentDeltas((prev) => {
                const next = new Map(prev);
                withDelta.forEach((p) => next.delete(p.battleTag));
                return next;
              });
            }, 120_000);
          }
        }
      }

    }

    for (const id of endedIds) {
      addMatchTimer(() => fetchResult(id), 5000);
    }
  }, [ongoingMatches]);

  // Derive set of battleTags who chatted in the last 10 minutes
  const recentChatters = useMemo(() => {
    const tags = new Set();
    const cutoff = Date.now() - 10 * 60 * 1000;
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      const msgTime = new Date(msg.sent_at || msg.sentAt).getTime();
      if (msgTime < cutoff) break;
      const tag = msg.battle_tag || msg.battleTag;
      if (tag) tags.add(tag);
    }
    return tags;
  }, [messages]);

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

  // Ids of currently running matches (lets event cards show live progress)
  const ongoingMatchIds = useMemo(
    () => new Set(ongoingMatches.map((m) => m.id || m.match?.id).filter(Boolean)),
    [ongoingMatches]
  );

  // In-game battleTag → match context (for chips and hover cards)
  const inGameInfoMap = useMemo(() => {
    const map = new Map();
    for (const match of ongoingMatches) {
      for (const team of match.teams) {
        for (const player of team.players) {
          if (player.battleTag) {
            map.set(player.battleTag, {
              mapName: match.mapName,
              startTime: match.startTime,
              matchId: match.id,
            });
          }
        }
      }
    }
    return map;
  }, [ongoingMatches]);

  // Check which online users are live on Twitch (once a minute via tick;
  // twitch names come from the profiles we already fetch per chatter)
  useEffect(() => {
    const entries = onlineUsers
      .map((u) => [u.battleTag, avatarsRef.current.get(u.battleTag)?.twitch])
      .filter(([, tw]) => tw);
    if (entries.length === 0) return;

    let cancelled = false;
    getLiveStreamers(entries.map(([, tw]) => tw)).then((live) => {
      if (cancelled) return;
      const map = new Map();
      for (const [tag, tw] of entries) {
        const login = tw.replace("https://twitch.tv/", "").toLowerCase();
        const info = live.get(login);
        if (info) map.set(tag, { ...info, twitchName: login });
      }
      setLiveStreamers(map);
    });
    return () => {
      cancelled = true;
    };
    // Deliberately keyed on count + tick, not the arrays themselves — avatars
    // and onlineUsers churn on every profile fetch during initial load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlineUsers.length, tick]);

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
        />
        <UserListSidebar
          users={onlineUsers}
          avatars={avatars}
          stats={stats}
          sessions={sessions}
          inGameTags={inGameTags}
          inGameInfoMap={inGameInfoMap}
          idleTags={idleTags}
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
