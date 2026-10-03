import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

// Within this of the end counts as reading the tail: new lines follow
const AT_BOTTOM_PX = 60;
// Page older history in from here up, forward out of an archive window from here down
const NEAR_TOP_PX = 600;
const NEAR_BOTTOM_PX = 400;

/* The row elements this hook holds the viewport against */
export const ROW_KEY_ATTR = "data-row-key";

function rowNode(el, key) {
  if (!el || key == null) return null;
  for (const node of el.querySelectorAll(`[${ROW_KEY_ATTR}]`)) {
    if (node.dataset.rowKey === key) return node;
  }
  return null;
}

/**
 * The /chat stream's scroll position.
 *
 * Every row is in the DOM, so nothing here estimates a height. On every
 * scroll the hook records which row sits at the top of the viewport and
 * where that row's box starts; after any change that could have moved it -
 * a page of older history arriving above, a link card finishing its lookup,
 * an image landing - it moves the scroll by exactly how far that row
 * actually moved. The reader stays on the line they were reading, in one
 * step, with no frame where the stream sits at the wrong offset.
 *
 * That frame is what a virtualized list cannot avoid: it has to guess the
 * height of rows it has not rendered, render them, measure them and then
 * correct, and the correction is a paint behind. Holding a real element is
 * only possible because the rows are all really there.
 *
 * The browser's own scroll anchoring does something similar, but it is
 * switched off at scroll offset 0 - exactly where paging older history
 * happens - so the rows container sets `overflow-anchor: none` and this
 * does all of it, the same way in every browser.
 *
 *   rows          the rendered rows, in order; a change re-runs the hold
 *   windowId      changes when the loaded window is replaced (jump to date,
 *                 back to live), which lands at the newest row
 *   followTail    whether the newest row pulls the viewport along when the
 *                 reader is already at the end. True for a live stream; false
 *                 for a transcript, which opens at the top and stays wherever
 *                 the reader put it
 *   onNearTop     reaching the head: page older history in
 *   onNearBottom  reaching the tail of an archive window: page forward
 *   onTopRowChange(key) the row at the top of the viewport, for the day bar
 *
 * Returns { scrollerRef, listRef, atBottom, scrollToBottom, scrollToKey }.
 */
export default function useStreamScroll({
  rows,
  windowId = 0,
  followTail = true,
  onNearTop,
  onNearBottom,
  onTopRowChange,
}) {
  // Element refs are callbacks, not plain refs, and this is load-bearing:
  // the panel shows a skeleton until the first messages arrive, so on every
  // cold load the scroller mounts long after an effect would have looked for
  // it. An effect whose dependencies never change would then bind its
  // listener to nothing, no scroll would ever be seen, and every page of
  // older history would read as "the reader is at the end" and send them
  // there. A callback ref fires exactly when the element appears.
  const scrollerElRef = useRef(null);
  const listElRef = useRef(null);
  const [atBottom, setAtBottom] = useState(true);
  const atBottomRef = useRef(true);
  // The row held still across changes: its key, its offset, and its element
  // while that element lives (React keeps it across renders, so the walk
  // below almost always starts one row from where it ends)
  const anchorRef = useRef(null);
  const windowRef = useRef(windowId);
  // Distance from the end as of the last measurement; 0 so the first fill of
  // an empty stream lands at the newest line
  const distanceRef = useRef(0);
  const lastTopRef = useRef(-1);
  const topKeyRef = useRef(null);
  // Read through a ref so the scroll listener never has to be re-bound
  const cbRef = useRef(null);
  cbRef.current = { onNearTop, onNearBottom, onTopRowChange };
  const followRef = useRef(followTail);
  followRef.current = followTail;
  // Only a tail-following stream has a reason to jump to the end
  const shouldPin = () => followRef.current && distanceRef.current <= AT_BOTTOM_PX;

  // Which row is at the top of the viewport, walked from the last answer
  // rather than scanned from the start of the list
  const findTopRow = useCallback(() => {
    const el = scrollerElRef.current;
    const list = listElRef.current;
    if (!el || !list) return null;
    const edge = el.getBoundingClientRect().top + 1;
    let node = anchorRef.current?.node;
    if (!node || !node.isConnected) node = rowNode(list, anchorRef.current?.key) || list.firstElementChild;
    while (node && node.getBoundingClientRect().bottom <= edge) node = node.nextElementSibling;
    if (!node) node = list.lastElementChild;
    while (node?.previousElementSibling && node.previousElementSibling.getBoundingClientRect().bottom > edge) {
      node = node.previousElementSibling;
    }
    return node || null;
  }, []);

  const capture = useCallback(() => {
    const node = findTopRow();
    // The day bar follows whatever is at the top, divider included
    const key = node?.dataset.rowKey ?? null;
    if (key !== topKeyRef.current) {
      topKeyRef.current = key;
      cbRef.current.onTopRowChange?.(key);
    }
    // The hold does not: a day divider belongs ahead of the first row of its
    // day, so a page of older history from that same day moves it up the
    // list on purpose. Holding it would hold the list still and let
    // everything the reader was looking at slide out from under it.
    let anchor = node;
    while (anchor && anchor.dataset.rowDivider === "true") anchor = anchor.nextElementSibling;
    anchorRef.current = anchor ? { key: anchor.dataset.rowKey, top: anchor.offsetTop, node: anchor } : null;
  }, [findTopRow]);

  const pinToBottom = useCallback(() => {
    const el = scrollerElRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    lastTopRef.current = el.scrollTop;
    capture();
  }, [capture]);

  // Move the scroll by however far the anchor row moved, so it ends up back
  // under the same pixel it was under before the change
  const hold = useCallback(() => {
    const el = scrollerElRef.current;
    const list = listElRef.current;
    const a = anchorRef.current;
    if (!el || !list || !a) {
      capture();
      return;
    }
    const node = a.node?.isConnected ? a.node : rowNode(list, a.key);
    if (!node) {
      capture();
      return;
    }
    const delta = node.offsetTop - a.top;
    if (delta !== 0) {
      el.scrollTop += delta;
      lastTopRef.current = el.scrollTop;
    }
    anchorRef.current = { key: a.key, top: node.offsetTop, node };
  }, [capture]);

  const setBottom = useCallback((value) => {
    if (value === atBottomRef.current) return;
    atBottomRef.current = value;
    setAtBottom(value);
  }, []);

  /**
   * How far the viewport is from the end, recorded every time anything could
   * have changed it. The decision below reads this rather than a flag kept
   * by the scroll handler: a scroll that does not move the position, a
   * programmatic jump, or a list that grew under a viewport sitting still
   * all leave such a flag describing a position the reader is no longer in,
   * and a stale "at the end" sends them to the end on the next change.
   */
  const measure = useCallback(() => {
    const el = scrollerElRef.current;
    if (!el) return;
    distanceRef.current = el.scrollHeight - el.scrollTop - el.clientHeight;
    setBottom(distanceRef.current <= AT_BOTTOM_PX);
  }, [setBottom]);

  const handleScroll = useCallback(() => {
    const el = scrollerElRef.current;
    if (!el) return;
    measure();
    // The position itself is unchanged (momentum settling, a rubber-band at
    // either end): nothing to re-anchor and nothing new within reach
    if (el.scrollTop === lastTopRef.current) return;
    lastTopRef.current = el.scrollTop;
    capture();
    if (el.scrollTop <= NEAR_TOP_PX) cbRef.current.onNearTop?.();
    if (distanceRef.current <= NEAR_BOTTOM_PX) cbRef.current.onNearBottom?.();
  }, [capture, measure]);

  // The handler through a ref, so the callback ref below can stay stable
  const scrollHandlerRef = useRef(null);
  scrollHandlerRef.current = handleScroll;
  const onScrollEvent = useRef((e) => scrollHandlerRef.current?.(e)).current;

  const scrollerRef = useCallback((el) => {
    const prev = scrollerElRef.current;
    if (prev === el) return;
    if (prev) prev.removeEventListener("scroll", onScrollEvent);
    scrollerElRef.current = el;
    if (el) el.addEventListener("scroll", onScrollEvent, { passive: true });
  }, [onScrollEvent]);

  // Rows changed: a replaced window starts at the newest line, a reader at
  // the tail follows it, anyone reading further up stays where they are
  useLayoutEffect(() => {
    if (!scrollerElRef.current) return;
    if (windowRef.current !== windowId && followRef.current) {
      windowRef.current = windowId;
      pinToBottom();
      measure();
      return;
    }
    windowRef.current = windowId;
    // Where the reader was before this change, measured, not remembered
    if (shouldPin()) pinToBottom();
    else hold();
    measure();
  }, [rows, windowId, hold, pinToBottom, measure]);

  // Heights that settle after the fact - a card landing, an image decoding,
  // a font swapping - move the rows under the reader just as a prepend does.
  // No guard on the observer's first callback: observe() fires one
  // immediately, and holding a row that has not moved costs a subtraction,
  // while skipping a callback that turns out to be a real resize costs the
  // reader their place.
  const resizeRef = useRef(null);
  resizeRef.current = () => {
    if (shouldPin()) pinToBottom();
    else hold();
    measure();
  };
  const observerRef = useRef(null);
  const listRef = useCallback((el) => {
    if (listElRef.current === el) return;
    listElRef.current = el;
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (el && typeof ResizeObserver !== "undefined") {
      observerRef.current = new ResizeObserver(() => resizeRef.current?.());
      observerRef.current.observe(el);
    }
  }, []);
  useEffect(() => () => observerRef.current?.disconnect(), []);

  const scrollToBottom = useCallback(() => {
    const el = scrollerElRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    distanceRef.current = 0;
    setBottom(true);
  }, [setBottom]);

  /** Put a row on screen. Returns false when it is not loaded. */
  const scrollToKey = useCallback((key, align = "center") => {
    const el = scrollerElRef.current;
    const node = rowNode(listElRef.current, key);
    if (!el || !node) return false;
    const room = align === "center" ? Math.max(0, (el.clientHeight - node.offsetHeight) / 2) : 0;
    el.scrollTop = Math.max(0, node.offsetTop - room);
    lastTopRef.current = el.scrollTop;
    measure();
    capture();
    return true;
  }, [capture, measure]);

  return { scrollerRef, listRef, atBottom, scrollToBottom, scrollToKey };
}
