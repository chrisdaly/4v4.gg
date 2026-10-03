import { useRef } from "react";
import { geometricMean } from "../formatters";

/**
 * Incremental indexes over the message feed.
 *
 * The feed array is only ever appended to (live messages), prepended to
 * (load earlier) or trimmed/filtered (cap, deletes). Instead of rescanning
 * the whole array whenever it changes, `updateFeedIndex` walks only the
 * messages it has not seen before (new head + new tail, found by id) and
 * maintains:
 *
 *   lastChatAt  Map<battleTag, ms>  newest sentAt per author
 *   tags        Set<battleTag>      every author seen
 *
 * Both are copy-on-write: the returned Map/Set keep their identity while
 * nothing changed, so downstream useMemo/useEffect deps stay stable.
 */

const RECENT_CHATTER_MS = 10 * 60 * 1000;
const IN_GAME_CHAT_GRACE_MS = 60_000;

export function createFeedIndex() {
  return {
    seen: new Set(),
    lastChatAt: new Map(),
    tags: new Set(),
    snapshot: { lastChatAt: new Map(), messageTags: new Set() },
  };
}

function msOf(iso) {
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function visit(index, msg) {
  index.seen.add(msg.id);
  const tag = msg.battleTag;
  if (!tag || msg.kind === "system") return false;
  let changed = false;
  if (!index.tags.has(tag)) {
    index.tags.add(tag);
    changed = true;
  }
  const t = msOf(msg.sentAt);
  const prev = index.lastChatAt.get(tag);
  if (prev === undefined || t > prev) {
    index.lastChatAt.set(tag, t);
    changed = true;
  }
  return changed;
}

/**
 * Feed `messages` (normalized, chronological) into the index. Returns
 * `{ lastChatAt, messageTags }` - fresh copies only when something changed.
 */
export function updateFeedIndex(index, messages) {
  const len = messages.length;
  let changed = false;

  // New tail: walk back from the newest message until we hit a known id
  let tailStart = len;
  while (tailStart > 0 && !index.seen.has(messages[tailStart - 1].id)) tailStart--;
  for (let i = tailStart; i < len; i++) {
    if (visit(index, messages[i])) changed = true;
  }

  // New head (load earlier): walk forward until a known id. Skipped when
  // the tail walk already covered the whole array (first fill).
  if (tailStart > 0) {
    let headEnd = 0;
    while (headEnd < tailStart && !index.seen.has(messages[headEnd].id)) headEnd++;
    for (let i = 0; i < headEnd; i++) {
      if (visit(index, messages[i])) changed = true;
    }
  }

  // Keep the seen-id set from growing without bound over a long session
  if (index.seen.size > len * 3 + 1000) {
    index.seen = new Set(messages.map((m) => m.id));
  }

  if (changed) {
    index.snapshot = {
      lastChatAt: new Map(index.lastChatAt),
      messageTags: new Set(index.tags),
    };
  }
  return index.snapshot;
}

/** Authors who chatted within the last 10 minutes. */
export function recentChattersFrom(lastChatAt, now = Date.now()) {
  const cutoff = now - RECENT_CHATTER_MS;
  const out = new Set();
  for (const [tag, t] of lastChatAt) {
    if (t >= cutoff) out.add(tag);
  }
  return out;
}

/**
 * Players in an ongoing match, minus anyone who chatted in the last minute
 * (they are visibly at the keyboard, so the match is probably not theirs).
 */
export function inGameTagsFrom(ongoingMatches, lastChatAt, now = Date.now()) {
  const tags = new Set();
  for (const match of ongoingMatches) {
    for (const team of match.teams || []) {
      for (const player of team.players || []) {
        if (player.battleTag) tags.add(player.battleTag);
      }
    }
  }
  if (tags.size === 0) return tags;
  const cutoff = now - IN_GAME_CHAT_GRACE_MS;
  for (const [tag, t] of lastChatAt) {
    if (t > cutoff) tags.delete(tag);
  }
  return tags;
}

/**
 * Per-player lookups derived from the ongoing-match poll:
 *   inGameInfoMap   battleTag -> { mapName, startTime, matchId }
 *   inGameMatchMap  battleTag -> player page URL
 *   ongoingMatchIds Set of running match ids
 */
export function ongoingIndexFrom(ongoingMatches) {
  const inGameInfoMap = new Map();
  const inGameMatchMap = new Map();
  const ongoingMatchIds = new Set();
  for (const match of ongoingMatches) {
    const id = match.id || match.match?.id;
    if (id) ongoingMatchIds.add(id);
    for (const team of match.teams || []) {
      for (const player of team.players || []) {
        if (!player.battleTag) continue;
        inGameInfoMap.set(player.battleTag, {
          mapName: match.mapName,
          startTime: match.startTime,
          matchId: match.id,
        });
        inGameMatchMap.set(player.battleTag, `/player/${encodeURIComponent(player.battleTag)}`);
      }
    }
  }
  return { inGameInfoMap, inGameMatchMap, ongoingMatchIds };
}

/**
 * Ongoing matches with at least one channel member in them, newest first.
 * The stream used to carry these as LIVE tickers, but a game starting is
 * state, not a moment: it stays true for twenty minutes and then stops
 * being true, which is a list's job, not a log line's.
 *
 *   -> [{ matchId, mapName, startTime, avgMmr, names, extra, playerCount }]
 *      names  the channel members in it, at most two
 *      extra  how many more players the lobby holds
 */
export function liveGamesFrom(ongoingMatches, onlineUsers, max = 8) {
  const channel = new Set(
    (onlineUsers || []).map((u) => u.battleTag?.toLowerCase()).filter(Boolean)
  );
  if (channel.size === 0) return [];
  const games = [];
  for (const match of ongoingMatches || []) {
    const id = match.id || match.match?.id;
    if (!id) continue;
    const players = (match.teams || []).flatMap((t) => t.players || []);
    const inChannel = players.filter((p) => channel.has(p.battleTag?.toLowerCase()));
    if (inChannel.length === 0) continue;
    const mmrs = players.map((p) => p.oldMmr).filter((m) => m > 0);
    const names = inChannel
      .slice(0, 2)
      .map((p) => p.name || p.battleTag?.split("#")[0])
      .filter(Boolean);
    games.push({
      matchId: id,
      mapName: match.mapName || null,
      startTime: match.startTime || null,
      avgMmr: mmrs.length > 0 ? Math.round(geometricMean(mmrs)) : null,
      names,
      extra: Math.max(players.length - names.length, 0),
      playerCount: players.length,
    });
  }
  return games
    .sort((a, b) => new Date(b.startTime || 0) - new Date(a.startTime || 0))
    .slice(0, max);
}

/**
 * Hold on to the previous collection when the new one holds the same
 * things. These derivations are rebuilt on every arriving message (they key
 * off lastChatAt), and the chat rows are memoized on their identity: a new
 * Set with identical members would re-render every visible row for nothing.
 */
export function useStable(value, equal) {
  const ref = useRef(value);
  if (ref.current !== value && !equal(ref.current, value)) ref.current = value;
  return ref.current;
}

export const sameSet = (a, b) => {
  if (a === b) return true;
  if (!a || !b || a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
};

export const sameMapKeys = (a, b) => {
  if (a === b) return true;
  if (!a || !b || a.size !== b.size) return false;
  for (const [k, v] of a) if (b.get(k) !== v) return false;
  return true;
};
