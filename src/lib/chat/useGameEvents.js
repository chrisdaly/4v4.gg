import { useState, useEffect, useRef, useCallback } from "react";
import { getFinishedMatches, getMatch, getMatchBlurb } from "../api";
import { computeMvp, computeNote } from "../matchNotes";
import { geometricMean } from "../formatters";

const W3C_API = "https://website-backend.w3champions.com/api";
const BACKFILL_WINDOW_MS = 3 * 60 * 60 * 1000;
const RESULT_RETRY_MS = 5000;
const HIGHLIGHT_MS = 120_000;
const DELTA_MS = 10 * 60 * 1000; // roster "last game" delta column memory

/* ── Game-event builders ──────────────────────────────
   Events show the full lobby (all 8 players); `inChannel` marks the ones
   in the chat room so the renderer can highlight them. Events are only
   emitted when at least one player is in the channel. */

const buildEventPlayers = (team, relevant) =>
  (team.players || []).map((p) => ({
    battleTag: p.battleTag,
    name: p.name || p.battleTag?.split("#")[0],
    // effective race - finished games resolve what Random rolled
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

export function buildStartEvent(match, relevant) {
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

export function buildEndEvent(match, id, relevant) {
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

const lobbyTags = (ev) =>
  new Set(ev.teams.flat().map((p) => p.battleTag?.toLowerCase()).filter(Boolean));

/**
 * Game start/finish events woven into the chat, plus the transient
 * crown (recentWinners) and MMR-delta pill (recentDeltas) state that
 * finished games light up for two minutes.
 *
 * - live detection: diffs the ongoing-match poll for started/ended ids
 * - backfill: on first load, injects recently finished + running games
 *   involving channel members or recent chatters
 * - blurbs: asks the relay's LLM ticker for a drama angle and keeps
 *   polling while the blurb is provisional
 */
export default function useGameEvents({ messages, onlineUsers, ongoingMatches }) {
  const [gameEvents, setGameEvents] = useState([]);
  const [recentWinners, setRecentWinners] = useState(new Set());
  const [recentDeltas, setRecentDeltas] = useState(new Map());
  const prevMatchIdsRef = useRef(new Set());
  const matchTimersRef = useRef([]);
  const channelTagsRef = useRef(new Set());
  const startedMatchPlayersRef = useRef(new Map());
  const backfilledEndsRef = useRef(false);
  const backfilledStartsRef = useRef(false);

  // Lowercased battleTags of everyone in the channel - used to decide which
  // game events are relevant enough to show inline in the chat
  useEffect(() => {
    channelTagsRef.current = new Set(
      onlineUsers.map((u) => u.battleTag?.toLowerCase()).filter(Boolean)
    );
  }, [onlineUsers]);

  const addMatchTimer = useCallback((fn, ms) => {
    const id = setTimeout(() => {
      matchTimersRef.current = matchTimersRef.current.filter((t) => t !== id);
      fn();
    }, ms);
    matchTimersRef.current.push(id);
  }, []);

  // Clear pending match timers on unmount
  useEffect(() => {
    return () => {
      for (const id of matchTimersRef.current) clearTimeout(id);
    };
  }, []);

  const addGameEvent = useCallback((event) => {
    setGameEvents((prev) => {
      if (prev.some((e) => e.id === event.id)) return prev;
      return [...prev.slice(-99), event];
    });
  }, []);

  // When heuristics found nothing, ask the relay's LLM ticker for a drama
  // angle. The relay answers immediately with a provisional blurb, then may
  // rewrite it once post-game reactions land - so keep polling while
  // pending and swap the text in place (only blurb notes get replaced).
  const fillBlurb = useCallback((eventId, matchId, attempt = 0) => {
    getMatchBlurb(matchId).then(({ blurb, parts, badges, rivals, pending, retryInMs }) => {
      setGameEvents((prev) =>
        prev.map((e) => {
          if (e.id !== eventId) return e;
          const next = { ...e };
          // Chat shows all parts: headline + h2h + streaks + drama
          const chatText = parts
            ? [parts.headline, parts.h2h, parts.streaks, parts.drama].filter(Boolean).join(" · ")
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
  }, [addMatchTimer]);

  // Backfill game events retroactively on page load: recently finished games
  // (real endTime) and currently running games (real startTime) involving
  // channel members or recent chatters get injected into the stream, so the
  // chat shows game context from before you opened the page.
  const backfillContext = () => {
    const relevant = new Set(channelTagsRef.current);
    for (const m of messages) {
      const tag = m.battleTag?.toLowerCase();
      if (tag) relevant.add(tag);
    }
    const oldestMsgTime = new Date(messages[0].sentAt).getTime();
    const cutoff = Math.max(oldestMsgTime, Date.now() - BACKFILL_WINDOW_MS);
    return { cutoff, relevant };
  };

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
        startedMatchPlayersRef.current.set(id, lobbyTags(ev));
      }
    }
    // runs once when messages + users + first ongoing poll are all available
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, onlineUsers, ongoingMatches]);

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
          startedMatchPlayersRef.current.set(id, lobbyTags(ev));
        }
      }
    }

    if (endedIds.length === 0) return;

    async function fetchResult(id, attempt = 0) {
      let match;
      let playerScores;
      try {
        const res = await fetch(`${W3C_API}/matches/${encodeURIComponent(id)}`);
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
        addMatchTimer(() => fetchResult(id, attempt + 1), RESULT_RETRY_MS);
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
          }, HIGHLIGHT_MS);
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
            }, DELTA_MS);
          }
        }
      }
    }

    for (const id of endedIds) {
      addMatchTimer(() => fetchResult(id), RESULT_RETRY_MS);
    }
  }, [ongoingMatches, addGameEvent, addMatchTimer, fillBlurb]);

  return { gameEvents, recentWinners, recentDeltas };
}
