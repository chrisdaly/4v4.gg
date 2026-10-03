import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { render, act, cleanup, fireEvent } from '@testing-library/react';
import useStreamScroll, { ROW_KEY_ATTR } from '../lib/chat/useStreamScroll';
import { installLayout, restoreLayout, installResizeObserver } from './helpers/layout';

// The hold, on its own. The panel tests cover a page of older history
// arriving; this covers the case that has no React render behind it at all -
// a row that was already on screen getting taller after the fact, which is
// what a link card or a late image does. The browser moves everything below
// it down; the hook has to move the scroll back by the same amount.

const VIEWPORT = 200;

// Row heights live here so a test can change one and fire a resize
let heights = [];

let fireResize = () => {};
function installGeometry() {
  installLayout({
    scroller: '[data-scroller]',
    list: '[data-list]',
    row: `[${ROW_KEY_ATTR}]`,
    viewport: VIEWPORT,
    heights: () => heights,
  });
  fireResize = installResizeObserver();
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
  fireResize();
});

beforeEach(() => {
  heights = Array.from({ length: 10 }, () => 100);
  installGeometry();
});
afterEach(() => {
  cleanup();
  restoreLayout();
});

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

  it('holds the reader at the very top, where paging older history actually happens', () => {
    const keys = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
    const { rerender } = render(<Stream rows={makeRows(keys)} />);
    scrollTo(0);
    const before = rowEl('a').getBoundingClientRect().top;

    heights = [...Array.from({ length: 5 }, () => 100), ...heights];
    rerender(<Stream rows={makeRows(['v', 'w', 'x', 'y', 'z', ...keys])} />);

    // the oldest line the reader had is still exactly where it was, with the
    // page that just arrived sitting above it
    expect(rowEl('a').getBoundingClientRect().top).toBe(before);
    expect(scroller().scrollTop).toBe(500);
  });

  it('does not send the reader to the end when the scroll position has not changed recently', () => {
    const keys = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
    const { rerender } = render(<Stream rows={makeRows(keys)} />);
    scrollTo(0);
    // A scroll event that reports the same position - momentum settling, a
    // rubber-band at the top, a programmatic nudge. It must not be read as
    // "nothing to update" for where the reader is.
    act(() => fireEvent.scroll(scroller()));
    const before = rowEl('a').getBoundingClientRect().top;

    heights = [...Array.from({ length: 5 }, () => 100), ...heights];
    rerender(<Stream rows={makeRows(['v', 'w', 'x', 'y', 'z', ...keys])} />);

    expect(scroller().scrollTop).not.toBe(scroller().scrollHeight - VIEWPORT);
    expect(rowEl('a').getBoundingClientRect().top).toBe(before);
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
