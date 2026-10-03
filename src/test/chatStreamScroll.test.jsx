import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { render, act, cleanup, fireEvent } from '@testing-library/react';
import useStreamScroll, { ROW_KEY_ATTR } from '../lib/chat/useStreamScroll';

// The hold, on its own. The panel tests cover a page of older history
// arriving; this covers the case that has no React render behind it at all -
// a row that was already on screen getting taller after the fact, which is
// what a link card or a late image does. The browser moves everything below
// it down; the hook has to move the scroll back by the same amount.

const VIEWPORT = 200;

// Row heights live here so a test can change one and fire a resize
let heights = [];
const offsetOf = (i) => heights.slice(0, i).reduce((a, b) => a + b, 0);
const total = () => heights.reduce((a, b) => a + b, 0);

let resizeCallbacks = [];
function installGeometry() {
  const proto = window.HTMLElement.prototype;
  const rows = () => Array.from(document.querySelectorAll(`[data-list] > [${ROW_KEY_ATTR}]`));
  const isScroller = (el) => el.dataset && el.dataset.scroller !== undefined;
  const rect = (top, bottom) => ({ top, bottom, height: bottom - top, left: 0, right: 0, width: 100, x: 0, y: top });
  const scroller = () => document.querySelector('[data-scroller]');

  Object.defineProperty(proto, 'offsetTop', {
    configurable: true,
    get() { const i = rows().indexOf(this); return i === -1 ? 0 : offsetOf(i); },
  });
  Object.defineProperty(proto, 'offsetHeight', {
    configurable: true,
    get() { const i = rows().indexOf(this); return i === -1 ? 0 : heights[i]; },
  });
  Object.defineProperty(proto, 'clientHeight', {
    configurable: true,
    get() { return isScroller(this) ? VIEWPORT : 0; },
  });
  Object.defineProperty(proto, 'scrollHeight', {
    configurable: true,
    get() { return isScroller(this) ? total() : 0; },
  });
  proto.getBoundingClientRect = function () {
    if (isScroller(this)) return rect(0, VIEWPORT);
    const i = rows().indexOf(this);
    if (i === -1) return rect(0, 0);
    const top = offsetOf(i) - (scroller()?.scrollTop || 0);
    return rect(top, top + heights[i]);
  };
  proto.scrollTo = function (opts) { this.scrollTop = opts?.top ?? 0; };

  resizeCallbacks = [];
  globalThis.ResizeObserver = class {
    constructor(cb) { resizeCallbacks.push(cb); }
    observe() {}
    disconnect() {}
  };
}

function Stream({ rows, windowId = 0 }) {
  const { scrollerRef, listRef, atBottom } = useStreamScroll({ rows, windowId });
  return (
    <div data-scroller ref={scrollerRef} data-at-bottom={String(atBottom)}>
      <div data-list ref={listRef}>
        {rows.map((row) => (
          <div key={row.key} {...{ [ROW_KEY_ATTR]: row.key }}>{row.key}</div>
        ))}
      </div>
    </div>
  );
}

const makeRows = (keys) => keys.map((key) => ({ key, kind: 'group' }));
const scroller = () => document.querySelector('[data-scroller]');
const rowEl = (key) => document.querySelector(`[${ROW_KEY_ATTR}="${key}"]`);
const scrollTo = (top) => act(() => {
  scroller().scrollTop = top;
  fireEvent.scroll(scroller());
});
// A box gets taller. The browser moves everything below it down and leaves
// the scroll offset alone, so without the hook the reader's line slides down
// the screen by exactly `by`.
const growRow = (index, by) => act(() => {
  heights[index] += by;
  resizeCallbacks.forEach((cb) => cb());
});

beforeEach(() => {
  heights = Array.from({ length: 10 }, () => 100);
  installGeometry();
});
afterEach(cleanup);

describe('useStreamScroll', () => {
  it('opens at the newest row', () => {
    render(<Stream rows={makeRows(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'])} />);
    expect(scroller().scrollTop).toBe(1000);
    expect(scroller().dataset.atBottom).toBe('true');
  });

  it('holds the reader in place when rows are added above them', () => {
    const keys = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
    const { rerender } = render(<Stream rows={makeRows(keys)} />);
    scrollTo(400); // 'e' is at the top of the viewport
    expect(scroller().dataset.atBottom).toBe('false');
    const before = rowEl('e').getBoundingClientRect().top;

    heights = [...Array.from({ length: 3 }, () => 100), ...heights];
    rerender(<Stream rows={makeRows(['x', 'y', 'z', ...keys])} />);

    expect(rowEl('e').getBoundingClientRect().top).toBe(before);
    expect(scroller().scrollTop).toBe(700);
  });

  it('holds the reader in place when a row above them grows after the fact', () => {
    render(<Stream rows={makeRows(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'])} />);
    scrollTo(400);
    const before = rowEl('e').getBoundingClientRect().top;

    // 'b' is above the viewport: a link card lands in it and it gets taller
    growRow(1, 110);

    expect(rowEl('e').getBoundingClientRect().top).toBe(before);
    expect(scroller().scrollTop).toBe(510);
  });

  it('stays on the newest row when one grows and the reader is at the tail', () => {
    render(<Stream rows={makeRows(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'])} />);
    expect(scroller().scrollTop).toBe(1000);
    growRow(0, 110);
    expect(scroller().scrollTop).toBe(scroller().scrollHeight);
  });

  it('follows the tail for a new row, and leaves a reader up the list alone', () => {
    const keys = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
    const { rerender } = render(<Stream rows={makeRows(keys)} />);
    heights.push(100);
    rerender(<Stream rows={makeRows([...keys, 'k'])} />);
    expect(scroller().scrollTop).toBe(1100);

    scrollTo(300);
    heights.push(100);
    rerender(<Stream rows={makeRows([...keys, 'k', 'l'])} />);
    expect(scroller().scrollTop).toBe(300);
  });

  it('lands at the newest row when the window is replaced', () => {
    const { rerender } = render(<Stream rows={makeRows(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'])} />);
    scrollTo(0);
    expect(scroller().dataset.atBottom).toBe('false');
    heights = Array.from({ length: 6 }, () => 100);
    rerender(<Stream rows={makeRows(['p', 'q', 'r', 's', 't', 'u'])} windowId={1} />);
    expect(scroller().scrollTop).toBe(600);
    expect(scroller().dataset.atBottom).toBe('true');
  });

  it('reports reaching the head and the tail', () => {
    const onNearTop = vi.fn();
    const onNearBottom = vi.fn();
    function Probe() {
      const { scrollerRef, listRef } = useStreamScroll({
        rows: makeRows(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']),
        onNearTop,
        onNearBottom,
      });
      return (
        <div data-scroller ref={scrollerRef}>
          <div data-list ref={listRef}>
            {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'].map((key) => (
              <div key={key} {...{ [ROW_KEY_ATTR]: key }}>{key}</div>
            ))}
          </div>
        </div>
      );
    }
    render(<Probe />);
    onNearBottom.mockClear();
    scrollTo(0);
    expect(onNearTop).toHaveBeenCalled();
    scrollTo(800);
    expect(onNearBottom).toHaveBeenCalled();
  });
});
