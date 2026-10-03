import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { render as rtlRender, cleanup, act, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { installLayout, restoreLayout } from './helpers/layout';

// Profiles are avatars only; keep them off the network
vi.mock('../lib/profileCache', () => ({
  getCachedProfile: () => null,
  fetchAndCacheProfile: () => Promise.resolve(null),
}));

import ChatContext from '../components/ChatContext';

// The quote browser's transcript. Newer messages page in at the TOP of this
// list, which is the direction that moves what the reader is looking at. It
// also must not behave like the live stream and chase the newest line: a
// transcript opens at the top and stays where it was put.

const ROW_H = 100;
const VIEWPORT = 200;

const T0 = Date.UTC(2026, 8, 20, 12, 0, 0);
const msg = (id, tag, offsetMs, text) => ({
  id,
  battle_tag: tag,
  name: tag.split('#')[0],
  text,
  timestamp: new Date(T0 + offsetMs).toISOString(),
});

// one group per message: different authors, so nothing merges
const run = (n, from = 0) =>
  Array.from({ length: n }, (_, i) => msg(`m${from + i}`, `P${from + i}#1`, (from + i) * 600000, `line ${from + i}`));

// ChatMessage links player names, so the transcript needs a router
const render = (ui) => {
  const { rerender, ...rest } = rtlRender(<MemoryRouter>{ui}</MemoryRouter>);
  return { ...rest, rerender: (next) => rerender(<MemoryRouter>{next}</MemoryRouter>) };
};

const scroller = () => document.querySelector('[data-cc-scroller]');
const rowEl = (key) => document.querySelector(`[data-row-key="${key}"]`);
const layout = () => installLayout({
  scroller: '[data-cc-scroller]',
  list: '[data-cc-list]',
  rowHeight: ROW_H,
  viewport: VIEWPORT,
});
const scrollTo = (top) => act(() => {
  scroller().scrollTop = top;
  fireEvent.scroll(scroller());
});

beforeEach(() => layout());
afterEach(() => {
  cleanup();
  restoreLayout();
});

describe('ChatContext scrolling', () => {
  it('keys its rows off the message, not its position in the list', () => {
    render(<ChatContext messages={run(4)} />);
    const keys = Array.from(document.querySelectorAll('[data-row-key]')).map((n) => n.dataset.rowKey);
    expect(keys).toEqual(['m0', 'm1', 'm2', 'm3']);
  });

  it('holds the reader when newer messages page in at the top', () => {
    const { rerender } = render(<ChatContext messages={run(8)} hasNewer onLoadNewer={() => {}} />);
    scrollTo(300);
    const before = rowEl('m3').getBoundingClientRect().top;

    // four newer messages arrive above everything on screen
    rerender(<ChatContext messages={[...run(4, 100), ...run(8)]} hasNewer onLoadNewer={() => {}} />);

    expect(rowEl('m3').getBoundingClientRect().top).toBe(before);
    expect(scroller().scrollTop).toBe(700);
  });

  it('does not chase the end the way the live stream does', () => {
    const { rerender } = render(<ChatContext messages={run(8)} hasMore onLoadMore={() => {}} />);
    expect(scroller().scrollTop).toBe(0);

    // older messages append below: a transcript stays where it is
    rerender(<ChatContext messages={[...run(8), ...run(4, 200)]} hasMore onLoadMore={() => {}} />);
    expect(scroller().scrollTop).toBe(0);
  });

  it('pages in both directions from the edges of the scroller', () => {
    const onLoadNewer = vi.fn();
    const onLoadMore = vi.fn();
    render(
      <ChatContext
        messages={run(20)}
        hasNewer
        onLoadNewer={onLoadNewer}
        hasMore
        onLoadMore={onLoadMore}
      />
    );
    scrollTo(1200);
    scrollTo(0);
    expect(onLoadNewer).toHaveBeenCalled();

    scrollTo(scroller().scrollHeight - VIEWPORT);
    expect(onLoadMore).toHaveBeenCalled();
  });

  it('asks for nothing more while a page is already in flight', () => {
    const onLoadNewer = vi.fn();
    render(<ChatContext messages={run(20)} hasNewer loadingNewer onLoadNewer={onLoadNewer} />);
    scrollTo(1200);
    scrollTo(0);
    expect(onLoadNewer).not.toHaveBeenCalled();
  });
});
