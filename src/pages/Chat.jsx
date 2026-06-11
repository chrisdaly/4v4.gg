import React, { useState, useEffect, useMemo, useRef } from "react";
import styled from "styled-components";
import { HiUsers, HiChat } from "react-icons/hi";
import useChatStream from "../lib/useChatStream";
import { getPlayerProfile, getPlayerStats, getPlayerSessionLight, getFinishedMatches, getMatch } from "../lib/api";
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

// MVP: highest summed rank across the five headline stats — the same five
// the big match card uses for its MVP badge
const MVP_KEYS = [
  ["heroScore", "heroesKilled"],
  ["heroScore", "expGained"],
  ["resourceScore", "goldCollected"],
  ["unitScore", "unitsKilled"],
  ["unitScore", "largestArmy"],
];

function mvpRankSum(ps, playerScores) {
  let sum = 0;
  for (const [group, key] of MVP_KEYS) {
    const v = ps[group]?.[key] ?? 0;
    sum += playerScores.filter((o) => (o[group]?.[key] ?? 0) <= v).length;
  }
  return sum;
}

function computeMvp(playerScores) {
  if (!Array.isArray(playerScores) || playerScores.length === 0) return null;
  let best = null;
  let bestScore = -Infinity;
  for (const ps of playerScores) {
    const sum = mvpRankSum(ps, playerScores);
    if (sum > bestScore) {
      bestScore = sum;
      best = ps.battleTag;
    }
  }
  return best;
}

const RACE_NAMES = { 1: "Human", 2: "Orc", 4: "Night Elf", 8: "Undead" };

// One-liner for finishes worth remarking on; null for ordinary games.
// Called once at event build (match data only) and again when the match
// detail arrives (playerScores/heroes unlock the analytics checks).
function computeNote(ev, { playerScores = null, matchPlayers = null } = {}) {
  const dur = ev.durationInSeconds;
  const { winnersMmr: w, losersMmr: l } = ev;
  const all = [...(ev.winners || []), ...(ev.losers || [])];
  const nameOf = (tag) =>
    all.find((p) => p.battleTag === tag)?.name || tag?.split("#")[0] || "someone";

  // Race-stack victories (effective race, random rolls resolved)
  const raceCounts = {};
  for (const p of ev.winners || []) {
    if (RACE_NAMES[p.race]) raceCounts[p.race] = (raceCounts[p.race] || 0) + 1;
  }
  for (const [race, n] of Object.entries(raceCounts)) {
    if (n === 4) return `all-${RACE_NAMES[race]} victory`;
  }

  if (w != null && l != null && w <= l - 15) {
    return `upset — the ${l} MMR favorites fell`;
  }

  const hasScores = Array.isArray(playerScores) && playerScores.length >= 4;

  if (hasScores) {
    // Scoreboard dominance: clear gap between best and second-best
    const sums = playerScores
      .map((ps) => ({ tag: ps.battleTag, sum: mvpRankSum(ps, playerScores) }))
      .sort((a, b) => b.sum - a.sum);
    if (sums[0].sum - sums[1].sum >= 8) {
      return `${nameOf(sums[0].tag)} dominated the scoreboard`;
    }
  }

  for (const [race, n] of Object.entries(raceCounts)) {
    if (n === 3) return `triple ${RACE_NAMES[race]} win`;
  }

  if (hasScores) {
    const top = (group, key) =>
      playerScores.reduce(
        (acc, ps) => {
          const v = ps[group]?.[key] ?? 0;
          return v > acc.v ? { tag: ps.battleTag, v } : acc;
        },
        { tag: null, v: 0 }
      );

    const army = top("unitScore", "largestArmy");
    if (army.v >= 90) return `${nameOf(army.tag)} fielded a ${army.v}-supply army`;

    const hunter = top("heroScore", "heroesKilled");
    if (hunter.v >= 6) return `${nameOf(hunter.tag)} took down ${hunter.v} heroes`;
  }

  // Stunted heroes: in a long game, someone's heroes barely leveled
  if (Array.isArray(matchPlayers) && dur != null && dur >= 18 * 60) {
    const levels = matchPlayers
      .filter((p) => Array.isArray(p.heroes) && p.heroes.length > 0)
      .map((p) => ({
        tag: p.battleTag,
        total: p.heroes.reduce((s, h) => s + (h.level || 0), 0),
      }));
    if (levels.length >= 6) {
      const sorted = [...levels].sort((a, b) => a.total - b.total);
      const lowest = sorted[0];
      const avgOthers =
        sorted.slice(1).reduce((s, p) => s + p.total, 0) / (sorted.length - 1);
      if (lowest.total <= avgOthers * 0.5) {
        return `${nameOf(lowest.tag)} finished with only ${lowest.total} hero levels`;
      }
    }
  }

  if (dur != null && dur > 0 && dur < 12 * 60) {
    return `over in ${Math.max(1, Math.round(dur / 60))} minutes`;
  }
  if (dur != null && dur > 35 * 60) {
    return `${Math.round(dur / 60)}-minute marathon`;
  }
  const leaver = all.find((p) => p.mmrGain != null && p.mmrGain <= -30);
  if (leaver) return `${leaver.name} dropped early (${leaver.mmrGain})`;
  if (w != null && l != null && Math.abs(w - l) <= 5) return "dead-even lobby";
  if (w != null && l != null && (w + l) / 2 >= 1800) return "high-level lobby";
  return null;
}

function buildStartEvent(match, relevant) {
  const id = match.id || match.match?.id;
  if (!id) return null;
  const teams = (match.teams || []).map((t) => buildEventPlayers(t, relevant));
  if (!teams.flat().some((p) => p.inChannel)) return null;
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
  if (!teams.flat().some((p) => p.inChannel)) return null;
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
      if (ev) addGameEvent(ev);
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
        if (ev) addGameEvent({ ...ev, live: true });
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

        // Inline chat event + transient MMR-delta pills for channel members
        const ev = buildEndEvent(match, id, channelTagsRef.current);
        if (ev) {
          const matchPlayers = (match.teams || []).flatMap((t) => t.players || []);
          addGameEvent({
            ...ev,
            live: true,
            mvp: computeMvp(playerScores),
            note: computeNote(ev, { playerScores, matchPlayers }),
          });
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
