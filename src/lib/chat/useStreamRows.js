import { useMemo, useRef } from "react";
import { useMessageSegments, getDateKey } from "../useChatMessages";

/**
 * The /chat stream's rows: messages grouped by author, day dividers, and
 * where the "new" marker sits.
 *
 * The one rule the whole file exists to keep: a row that has not changed
 * comes back as the same object. Grouping re-runs over the entire list
 * whenever a message arrives, so without the caches here every row would be
 * a new object every time, the memoized row component would have nothing to
 * compare, and one line landing would re-render the whole visible stream
 * while the reader was in the middle of it.
 *
 *   messages       the loaded window, oldest first
 *   windowId       changes when the window is replaced, which resets the caches
 *   filterActive   the search field has a query
 *   filterQ        that query, lowercased
 *   newMarkerTime  lines after this are new since the last visit
 *
 * Returns { rows, newMarkerKey, foundCount }.
 */
export default function useStreamRows({
  messages,
  windowId = 0,
  filterActive = false,
  filterQ = "",
  newMarkerTime = null,
}) {
  // Prepend boundaries: the id of the earliest message before each page of
  // older history. Grouping never merges across one, so the row that was
  // first before the prepend keeps its key and its lines, which is the row
  // the viewport is held against while the page arrives above it. A prepend
  // is recognised by the previous first message still being loaded but no
  // longer first; a replaced window resets.
  const boundaryRef = useRef({ windowId, firstId: null, ids: new Set() });
  const boundaryIds = useMemo(() => {
    const firstId = messages[0]?.id ?? null;
    if (boundaryRef.current.windowId !== windowId) {
      boundaryRef.current = { windowId, firstId, ids: new Set() };
      return boundaryRef.current.ids;
    }
    const b = boundaryRef.current;
    if (b.firstId !== null && firstId !== b.firstId && messages.some((m) => m.id === b.firstId)) {
      b.ids = new Set(b.ids).add(b.firstId);
    }
    b.firstId = firstId;
    return b.ids;
  }, [messages, windowId]);
  const messageSegments = useMessageSegments(messages, boundaryIds);

  // One row per message group (author + consecutive lines within 2 min) or
  // system message. Nothing else: games used to be woven in here, and a
  // quiet spell could leave more tickers on screen than sentences. They are
  // all in the game activity panel now, live and finished alike, and the
  // stream is only what people said.
  const rowCacheRef = useRef(new Map());
  const renderItems = useMemo(() => {
    const prev = rowCacheRef.current;
    const next = new Map();
    const items = [];
    for (const seg of messageSegments) {
      const start = seg.start;
      const time = new Date(start.sentAt).getTime();
      const fresh = start.kind === "system"
        ? { kind: "system", key: start.id, msg: start, time }
        : { kind: "group", key: start.id, msg: start, msgs: [start, ...seg.continuations], time };
      const cached = prev.get(start.id);
      const item = sameRow(cached, fresh) ? cached : fresh;
      next.set(start.id, item);
      items.push(item);
    }
    rowCacheRef.current = next;
    return items.sort((a, b) => a.time - b.time);
  }, [messageSegments]);

  // The filter: message groups whose author or text matches the query;
  // system lines drop out while it is set
  const filteredItems = useMemo(() => {
    if (!filterActive) return renderItems;
    return renderItems.filter((item) => item.kind === "group" && groupMatches(item, filterQ));
  }, [renderItems, filterActive, filterQ]);

  // Day dividers are rows of their own (keyed by day) ahead of the first row
  // of each day, so paging in older history from the same day never changes
  // an existing row's height. The marker is a key held beside the list, not
  // a flag on the row: spreading one onto every row to carry a single
  // boolean was exactly the identity loss this file is here to avoid.
  const dividerCacheRef = useRef(new Map());
  const { rows, newMarkerKey } = useMemo(() => {
    const prev = dividerCacheRef.current;
    const next = new Map();
    const out = [];
    let prevDay = null;
    let markerKey = null;
    filteredItems.forEach((item) => {
      const day = getDateKey(item.msg.sentAt);
      if (day !== prevDay) {
        const key = `day:${day}`;
        const cached = prev.get(key);
        const divider = cached && cached.sentAt === item.msg.sentAt
          ? cached
          : { kind: "divider", key, time: item.time, sentAt: item.msg.sentAt };
        next.set(key, divider);
        out.push(divider);
        prevDay = day;
      }
      if (markerKey === null && newMarkerTime != null && item.time > newMarkerTime) markerKey = item.key;
      out.push(item);
    });
    dividerCacheRef.current = next;
    return { rows: out, newMarkerKey: markerKey };
  }, [filteredItems, newMarkerTime]);

  return { rows, newMarkerKey, foundCount: filterActive ? filteredItems.length : 0 };
}

/**
 * Two renders of the same row. Message objects are never mutated in place,
 * so identity on the first and last line settles it.
 */
export function sameRow(a, b) {
  if (!a || a.kind !== b.kind || a.msg !== b.msg) return false;
  if (!a.msgs) return !b.msgs;
  return Boolean(b.msgs) && a.msgs.length === b.msgs.length && a.msgs[a.msgs.length - 1] === b.msgs[b.msgs.length - 1];
}

/**
 * Whether a message group (author + lines) matches the filter query, by
 * display name or text, case-insensitive.
 */
export function groupMatches(row, q) {
  const name = (row.msg.userName || row.msg.battleTag?.split("#")[0] || "").toLowerCase();
  if (name.includes(q)) return true;
  return row.msgs.some((m) => (m.text || "").toLowerCase().includes(q));
}
