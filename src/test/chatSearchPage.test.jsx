import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// The page only talks to the relay; the ladder typeahead and profile lookups
// are best-effort extras that would otherwise hit the W3C API
vi.mock('../lib/api', () => ({
  searchLadder: vi.fn(async () => []),
  getPlayerProfile: vi.fn(async () => ({})),
}));
vi.mock('../lib/profileCache', () => ({
  getCachedProfile: () => null,
  fetchAndCacheProfile: async () => ({ pic: null, country: null }),
}));

const fetchCalls = [];
let relayPayload = { results: [], total: 0 };
let contextPayload = [];
global.fetch = vi.fn(async (url) => {
  const href = String(url);
  fetchCalls.push(href);
  return { ok: true, json: async () => (href.includes('/messages/search/context') ? contextPayload : relayPayload) };
});

import ChatSearchPage, { paramsFromSearch, buildResultItems } from '../pages/ChatSearch';

describe('chat search URL params', () => {
  it('defaults to the 7 day window with nothing in the URL', () => {
    expect(paramsFromSearch('')).toEqual({ q: '', player: '', since: '7d' });
  });

  it('reads q, player and since', () => {
    expect(paramsFromSearch('?q=hola&player=Moon%232356&since=30d'))
      .toEqual({ q: 'hola', player: 'Moon#2356', since: '30d' });
  });

  it('still understands the links the /chat panel handed out', () => {
    expect(paramsFromSearch('?q=Moon&qmode=player&qsince=30d'))
      .toEqual({ q: '', player: 'Moon', since: '30d' });
    // an empty qsince meant all time
    expect(paramsFromSearch('?q=gg&qsince=')).toEqual({ q: 'gg', player: '', since: 'all' });
  });

  it('drops a window it does not offer', () => {
    expect(paramsFromSearch('?q=gg&since=2d').since).toBe('7d');
  });
});

describe('chat search results', () => {
  const rows = [
    { id: 9, battle_tag: 'Moon#2356', user_name: 'Moon', message: 'gg', received_at: '2026-09-27 10:00:00' },
    { id: 8, battle_tag: 'Moon#2356', user_name: 'Moon', message: 'wp', received_at: '2026-09-27 09:58:00' },
    // same author, but an hour earlier: its own group
    { id: 7, battle_tag: 'Moon#2356', user_name: 'Moon', message: 'anyone up', received_at: '2026-09-27 08:30:00' },
    { id: 6, battle_tag: 'Grubby#1', user_name: 'Grubby', message: 'me', received_at: '2026-09-27 08:29:00' },
  ];

  it('groups consecutive lines from one author when they are close in time', () => {
    const groups = buildResultItems(rows).filter((i) => i.type === 'group');
    expect(groups.map((g) => g.group.lines.map((l) => l.text))).toEqual([
      ['gg', 'wp'],
      ['anyone up'],
      ['me'],
    ]);
    expect(groups[0].group.author).toMatchObject({ battleTag: 'Moon#2356', userName: 'Moon' });
  });

  it('keeps the relay ids and cursors on each line so a hit can link into /chat', () => {
    const [first] = buildResultItems(rows).filter((i) => i.type === 'group');
    expect(first.group.lines[0]).toMatchObject({ msgId: 9, receivedAt: '2026-09-27 10:00:00' });
  });

  it('opens a day divider per calendar day', () => {
    const items = buildResultItems([
      ...rows,
      { id: 5, battle_tag: 'Moon#2356', user_name: 'Moon', message: 'last week', received_at: '2026-09-20 12:00:00' },
    ]);
    expect(items.filter((i) => i.type === 'day')).toHaveLength(2);
    expect(items[0].type).toBe('day');
  });
});

describe('chat search page', () => {
  beforeEach(() => {
    localStorage.clear();
    fetchCalls.length = 0;
    relayPayload = {
      query: 'gg', player: null, since: '30d', windowHours: 720, offset: 0, limit: 50,
      total: 2,
      results: [
        { id: '6ab81', user_name: 'Moon', clan_tag: '', message: 'gg wp', battle_tag: 'Moon#2356', sent_at: '2026-09-26T19:40:57Z', received_at: '2026-09-26 19:40:57' },
        { id: '6ab80', user_name: 'Grubby', clan_tag: '', message: 'NOT GG YET', battle_tag: 'Grubby#1', sent_at: '2026-09-26T18:44:13Z', received_at: '2026-09-26 18:44:13' },
      ],
    };
  });
  afterEach(cleanup);

  const renderPage = (search) =>
    render(
      <MemoryRouter initialEntries={[`/search${search}`]}>
        <ChatSearchPage />
      </MemoryRouter>
    );

  it('runs the search in the URL and renders every hit as a transcript row', async () => {
    renderPage('?q=gg&since=30d');
    await screen.findByText(/2 lines/);
    const [url] = fetchCalls;
    expect(url).toContain('/api/chat/search?');
    expect(url).toContain('since=30d');
    expect(url).toContain('q=gg');
    expect(document.querySelectorAll('[data-variant="transcript"]')).toHaveLength(2);
    expect(screen.getByText(/2 lines for "gg"/)).toHaveTextContent('last 30 days');
  });

  it('highlights the query in every hit', async () => {
    renderPage('?q=gg&since=30d');
    await screen.findByText(/2 lines/);
    expect(document.querySelector('mark')).toHaveTextContent('gg');
  });

  it('opens the minutes around a hit in place, and closes them again', async () => {
    contextPayload = [
      { id: '6ab7f', user_name: 'Anica', message: 'gj meta', battle_tag: 'Anica#11244', received_at: '2026-09-26 19:39:55' },
      { id: '6ab81', user_name: 'Moon', message: 'gg wp', battle_tag: 'Moon#2356', received_at: '2026-09-26 19:40:57' },
      { id: '6ab82', user_name: 'Anica', message: 'rematch?', battle_tag: 'Anica#11244', received_at: '2026-09-26 19:41:30' },
    ];
    renderPage('?q=gg&since=30d');
    await screen.findByText(/2 lines/);

    fireEvent.click(screen.getAllByRole('button', { name: 'context' })[0]);
    const drawer = await screen.findByText(/3 min/).then((el) => el.closest('[data-context-drawer]'));
    expect(fetchCalls.some((u) => u.includes('/messages/search/context') && u.includes('padding=3'))).toBe(true);
    // the surrounding lines land under the hit, and the results are untouched
    await waitFor(() => expect(within(drawer).getByText('rematch?')).toBeTruthy());
    expect(screen.getByText(/2 lines/)).toBeTruthy();
    // the live stream is still one click away, from inside the drawer
    expect(within(drawer).getByRole('link', { name: /open in chat/i }).getAttribute('href'))
      .toBe('/chat?m=6ab81&at=2026-09-26%2019%3A40%3A57');

    fireEvent.click(within(drawer).getByRole('button', { name: /close/i }));
    await waitFor(() => expect(document.querySelector('[data-context-drawer]')).toBeNull());
  });

  it('widens the window without touching the results', async () => {
    contextPayload = [];
    renderPage('?q=gg&since=30d');
    await screen.findByText(/2 lines/);
    fireEvent.click(screen.getAllByRole('button', { name: 'context' })[0]);
    await screen.findByText(/3 min/);
    fireEvent.click(screen.getByRole('button', { name: 'wider' }));
    await waitFor(() => expect(fetchCalls.some((u) => u.includes('padding=10'))).toBe(true));
    expect(screen.getByText(/2 lines/)).toBeTruthy();
  });

  it('says so when the window holds nothing', async () => {
    relayPayload = { results: [], total: 0 };
    renderPage('?q=nothinghere&since=24h');
    expect(await screen.findByText(/Nothing in the last 24h/)).toBeTruthy();
  });

  it('asks the relay for the player when a link carries the old qmode=player', async () => {
    renderPage('?q=Moon&qmode=player&qsince=all');
    await screen.findByText(/2 lines/);
    expect(fetchCalls[0]).toContain('player=Moon');
    expect(fetchCalls[0]).toContain('since=all');
    expect(fetchCalls[0]).not.toContain('q=Moon');
  });
});
