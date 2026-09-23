import { useEffect, useMemo, useRef } from "react";
import useChatStream from "../useChatStream";
import useOngoingMatches from "../useOngoingMatches";
import usePlayerMeta, { refreshPlayerSession } from "../usePlayerMeta";
import useGameEvents from "./useGameEvents";
import useTwitchLive from "./useTwitchLive";
import {
  createFeedIndex,
  updateFeedIndex,
  recentChattersFrom,
  inGameTagsFrom,
  ongoingIndexFrom,
} from "./derived";

/**
 * The chat feed store. One hook that owns every slice the /chat page
 * renders from - messages, bot responses, translations, presence, game
 * events, player metadata - and the sets derived from them. The page is a
 * thin shell that passes these down.
 */
export default function useChatFeed() {
  const stream = useChatStream();
  const { messages, onlineUsers } = stream;
  const { matches: ongoingMatches } = useOngoingMatches();

  // Incremental author index: only new head/tail messages are visited
  const indexRef = useRef(null);
  if (indexRef.current === null) indexRef.current = createFeedIndex();
  const { lastChatAt, messageTags } = useMemo(
    () => updateFeedIndex(indexRef.current, messages),
    [messages]
  );

  // Who chatted in the last 10 minutes (roster dims everyone else)
  const recentChatters = useMemo(() => recentChattersFrom(lastChatAt), [lastChatAt]);

  // In-game players, minus anyone who chatted in the last minute
  const inGameTags = useMemo(
    () => inGameTagsFrom(ongoingMatches, lastChatAt),
    [ongoingMatches, lastChatAt]
  );

  const { inGameInfoMap, inGameMatchMap, ongoingMatchIds } = useMemo(
    () => ongoingIndexFrom(ongoingMatches),
    [ongoingMatches]
  );

  // Every battleTag we need metadata for: message authors + channel roster
  const allTags = useMemo(() => {
    const tags = new Set(messageTags);
    for (const u of onlineUsers) {
      if (u.battleTag) tags.add(u.battleTag);
    }
    return tags;
  }, [messageTags, onlineUsers]);

  const { avatars, stats, sessions } = usePlayerMeta(allTags);
  const { gameEvents, recentWinners, recentDeltas } = useGameEvents({
    messages,
    onlineUsers,
    ongoingMatches,
  });
  const liveStreamers = useTwitchLive(onlineUsers);

  // Re-fetch sessions for players who just left a game
  const prevInGameRef = useRef(new Set());
  useEffect(() => {
    const prev = prevInGameRef.current;
    const leftGame = [...prev].filter((tag) => !inGameTags.has(tag));
    prevInGameRef.current = new Set(inGameTags);
    for (const tag of leftGame) refreshPlayerSession(tag);
  }, [inGameTags]);

  return {
    ...stream,
    ongoingMatches,
    avatars,
    stats,
    sessions,
    inGameTags,
    inGameInfoMap,
    inGameMatchMap,
    ongoingMatchIds,
    recentChatters,
    allTags,
    gameEvents,
    recentWinners,
    recentDeltas,
    liveStreamers,
  };
}
