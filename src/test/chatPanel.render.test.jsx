import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup, waitFor, act, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Render every row eagerly: happy-dom has no layout, so the real Virtuoso
// would measure a 0px viewport and render nothing. This exercises the same
// itemContent/Header/Footer wiring the real list uses. rangeChanged fires
// once per data change with the whole list "visible" (no boxes to measure),
// which is what the sticky day bar falls back to.
const scrollToIndex = vi.fn();
// The latest props the panel handed the list, so a test can drive the
// callbacks the real Virtuoso would call (atBottomStateChange, followOutput)
const virtuosoProps = vi.hoisted(() => ({ current: null }));
vi.mock('react-virtuoso', () => ({
  Virtuoso: React.forwardRef(function FakeVirtuoso(props, ref) {
    const { data, itemContent, components, context, firstItemIndex = 0, computeItemKey, rangeChanged } = props;
    virtuosoProps.current = props;
    React.useImperativeHandle(ref, () => ({ scrollToIndex }));
    React.useEffect(() => {
      rangeChanged?.({ startIndex: firstItemIndex, endIndex: firstItemIndex + data.length - 1 });
    }, [rangeChanged, firstItemIndex, data.length]);
    const { Header, Footer } = components;
    return (
      <div data-testid="virtuoso">
        {Header && <Header context={context} />}
        {data.map((row, i) => (
          <div key={computeItemKey(firstItemIndex + i, row)} data-key={computeItemKey(firstItemIndex + i, row)} data-index={firstItemIndex + i}>
            {itemContent(firstItemIndex + i, row, context)}
          </div>
        ))}
        {Footer && <Footer context={context} />}
      </div>
    );
  }),
}));

import ChatPanel from '../components/ChatPanel';
import GameModal, { resolveGame } from '../components/chat/GameModal';
import { useWatchList } from '../lib/chatExtras';
import { resetNotifyThrottle } from '../lib/chat/notify';
import { resetUnfurlCache } from '../lib/chat/unfurl';
import { isTrimPaused, setTrimPaused } from '../lib/chat/trimGate';
import { localTimeLabel } from '../lib/chat/localTime';

// Noon LOCAL time today (the day dividers use local dates), so 'Today' /
// 'Yesterday' assertions never rot and do not depend on the machine's timezone
const T0 = (() => { const d = new Date(); d.setHours(12, 0, 0, 0); return d.getTime(); })();
const iso = (ms) => new Date(T0 + ms).toISOString();
const msg = (id, tag, ms, text, extra = {}) => ({
  id, battleTag: tag, userName: tag.split('#')[0], clanTag: '', text,
  sentAt: iso(ms), receivedAt: null, deleted: false, kind: tag === 'system' ? 'system' : 'message', ...extra,
});

const messages = [
  msg('sys1', 'system', -100000, 'Connected to channel'),
  msg('a1', 'Grubby#1', 0, '!stats moon'),
  msg('a2', 'Grubby#1', 30000, 'second line http://example.com'),
  msg('b1', 'Moon#2', 60000, 'hola'),
  msg('c1', 'Watched#3', 90000, 'i am starred'),
];
const gameEvents = [{
  id: 'ge-m1', type: 'game_end', time: iso(45000), matchId: 'm1', mapName: 'Ferocity',
  durationInSeconds: 1200, winners: [{ battleTag: 'Moon#2', name: 'Moon', mmr: 1800, mmrGain: 12, inChannel: true }],
  losers: [{ battleTag: 'X#9', name: 'X', mmr: 1700, mmrGain: -9, inChannel: false }], winnersMmr: 1800, losersMmr: 1700,
  note: { text: 'close one', tag: null }, badges: [], rivals: [],
}, {
  id: 'gs-m2', type: 'game_start', time: iso(70000), matchId: 'm2', mapName: 'Royal Gardens',
  teamMmrs: [1847, 1790],
  teams: [
    [{ battleTag: 'Moon#2', name: 'Moon', mmr: 1800, inChannel: true }, { battleTag: 'T#1', name: 'T', mmr: 1900, inChannel: false },
      { battleTag: 'U#1', name: 'U', mmr: 1850, inChannel: false }, { battleTag: 'V#1', name: 'V', mmr: 1840, inChannel: false }],
    [{ battleTag: 'W#1', name: 'W', mmr: 1790, inChannel: false }],
  ],
}];
const botResponses = [{ command: '!stats', triggeredByTag: 'Grubby#1', response: 'Moon: 1800 MMR', botEnabled: true, time: iso(1000) },
  { command: '!help', triggeredByTag: 'Nobody#0', response: 'orphan', botEnabled: false, time: iso(1000) }];
const translations = new Map([['b1', 'hello']]);
const stats = new Map([['Grubby#1', { mmr: 1900.4, race: 2 }]]);
const avatars = new Map([['Moon#2', { profilePicUrl: 'https://x/pic.jpg', country: 'KR' }]]);
const fiveMinutesAgo = () => new Date(Date.now() - 5 * 60 * 1000).toISOString();

const baseProps = {
  status: 'connected',
  avatars,
  stats,
  sessions: new Map(),
  inGameTags: new Set(['Moon#2']),
  recentWinners: new Set(['Grubby#1']),
  recentDeltas: new Map([['Watched#3', -9]]),
  gameEvents,
  ongoingMatchIds: new Set(['m2']),
  liveStreamers: new Map([['Grubby#1', { twitchName: 'grubby', title: 'live', viewerCount: 3 }]]),
  watchList: new Set(['watched#3']),
  onlineUsers: [{ battleTag: 'Grubby#1', name: 'Grubby' }],
  botResponses,
  translations,
  loadOlder: () => Promise.resolve({ added: 0 }),
  hasMoreHistory: true,
};

// The Search and Stats toggles live in the map panel header (Chat.jsx);
// this stands in for it: the panel gets controlled props and two buttons
// flip them the way the header pills do.
const searchToggle = vi.fn();
function Owner({ initialSearchOpen = false, initialStatsOpen = false, ...props }) {
  const [searchOpen, setSearchOpen] = React.useState(initialSearchOpen);
  const [statsOpen, setStatsOpen] = React.useState(initialStatsOpen);
  const onSearchOpenChange = React.useCallback((v) => {
    searchToggle(v);
    setSearchOpen(v);
  }, []);
  return (
    <MemoryRouter>
      <button type="button" onClick={() => setSearchOpen((v) => !v)}>toggle search</button>
      <button type="button" onClick={() => setStatsOpen((v) => !v)}>toggle stats</button>
      <ChatPanel
        {...props}
        searchOpen={searchOpen}
        onSearchOpenChange={onSearchOpenChange}
        statsOpen={statsOpen}
        onStatsOpenChange={setStatsOpen}
      />
    </MemoryRouter>
  );
}

function renderPanel(overrides = {}) {
  return render(
    <Owner
      {...baseProps}
      messages={messages}
      inGameInfoMap={new Map([['Moon#2', { mapName: 'Ferocity', startTime: fiveMinutesAgo(), matchId: 'm2' }]])}
      {...overrides}
    />
  );
}

// Keep the relay off the network unless a test installs its own fetch mock
beforeEach(() => {
  scrollToIndex.mockClear();
  searchToggle.mockClear();
  setTrimPaused(false);
  resetNotifyThrottle();
  resetUnfurlCache();
  if (!vi.isMockFunction(globalThis.fetch)) {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, json: async () => ({}) });
  }
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

// document.hidden is a prototype getter in happy-dom; override per test
function setHidden(hidden) {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (hidden ? 'hidden' : 'visible') });
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'));
  });
}
function resetHidden() {
  delete document.hidden;
  delete document.visibilityState;
}

describe('ChatPanel history prepend', () => {
  // Rows as the fake Virtuoso renders them: absolute index and key
  const domRows = () => Array.from(document.querySelectorAll('[data-index]')).map((el) => ({
    el, index: Number(el.dataset.index), key: el.dataset.key,
  }));
  const rowOf = (msgId) => document.getElementById(`msg-${msgId}`).closest('[data-index]');
  const lineCount = (rowEl) => rowEl.querySelectorAll('[id^="msg-"]').length;

  it('keeps the viewport anchor when older history loads, even from the same author', async () => {
    // Earliest loaded row is a Grubby group (a1, a2). The page of older
    // history ends with 3 Grubby lines within 2 min of a1: without a
    // boundary they would merge into that group, changing its key and its
    // height, and the anchor row would slide.
    const initial = messages.filter((m) => m.id !== 'sys1');
    const older = [];
    for (let i = 0; i < 27; i++) {
      const tag = ['Alpha#1', 'Beta#2', 'Gamma#3'][i % 3];
      older.push(msg(`o${i}`, tag, -600000 + i * 10000, `older ${i}`));
    }
    older.push(msg('g1', 'Grubby#1', -90000, 'grubby earlier 1'));
    older.push(msg('g2', 'Grubby#1', -60000, 'grubby earlier 2'));
    older.push(msg('g3', 'Grubby#1', -30000, 'grubby earlier 3'));

    const loadOlder = vi.fn();
    let resolveLoad;
    function Harness() {
      const [msgs, setMsgs] = React.useState(initial);
      const load = React.useCallback(() => {
        loadOlder();
        return new Promise((resolve) => {
          resolveLoad = () => {
            setMsgs((prev) => [...older, ...prev]);
            resolve({ added: older.length });
          };
        });
      }, []);
      return (
        <MemoryRouter>
          <ChatPanel
            messages={msgs} status="connected" avatars={avatars} stats={stats} sessions={new Map()}
            inGameTags={new Set()} inGameInfoMap={new Map()} recentWinners={new Set()} recentDeltas={new Map()}
            gameEvents={[]} ongoingMatchIds={new Set()} liveStreamers={new Map()} watchList={new Set()}
            onlineUsers={[]} botResponses={[]} translations={new Map()}
            loadOlder={load} hasMoreHistory
          />
        </MemoryRouter>
      );
    }
    const keyWarnings = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<Harness />);

    const before = domRows();
    const firstBefore = before[0].index;
    const anchorBefore = rowOf('a1');
    const anchorIndexBefore = Number(anchorBefore.dataset.index);
    const anchorKeyBefore = anchorBefore.dataset.key;
    expect(lineCount(anchorBefore)).toBe(2);
    // Day divider is its own row ahead of the first message row
    expect(before[0].key).toMatch(/^day:/);
    expect(anchorIndexBefore).toBe(firstBefore + 1);

    // Two triggers while the fetch is in flight load once
    const button = screen.getByRole('button', { name: 'Load earlier messages' });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(loadOlder).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveLoad();
    });
    await waitFor(() => expect(document.getElementById('msg-o0')).toBeInTheDocument());

    const after = domRows();
    const added = after.length - before.length;
    // 27 single-line groups + 1 separate Grubby group; the divider moved
    expect(added).toBe(28);
    expect(after[0].index).toBe(firstBefore - added);

    // The previously first message row keeps its key, its index and its lines
    const anchorAfter = rowOf('a1');
    expect(anchorAfter.dataset.key).toBe(anchorKeyBefore);
    expect(Number(anchorAfter.dataset.index)).toBe(anchorIndexBefore);
    expect(lineCount(anchorAfter)).toBe(2);
    // The same-author page forms its own group right above it
    const grubbyOlder = rowOf('g1');
    expect(lineCount(grubbyOlder)).toBe(3);
    expect(Number(grubbyOlder.dataset.index)).toBe(anchorIndexBefore - 1);

    // No duplicate keys, indices consecutive
    const keys = after.map((r) => r.key);
    expect(new Set(keys).size).toBe(keys.length);
    after.forEach((r, i) => expect(r.index).toBe(after[0].index + i));
    expect(keyWarnings.mock.calls.filter((c) => String(c[0]).includes('same key'))).toHaveLength(0);
  });
});

describe('ChatPanel head trim', () => {
  const domRows = () => Array.from(document.querySelectorAll('[data-index]')).map((el) => ({
    el, index: Number(el.dataset.index), key: el.dataset.key,
  }));
  const rowOf = (msgId) => document.getElementById(`msg-${msgId}`).closest('[data-index]');
  const lineCount = (rowEl) => rowEl.querySelectorAll('[id^="msg-"]').length;

  // The live cap drops the oldest messages. Rows: day divider, sys1, the
  // Grubby group (a1, a2), b1, c1.
  function Harness({ initial }) {
    const [msgs, setMsgs] = React.useState(initial);
    return (
      <MemoryRouter>
        <button type="button" onClick={() => setMsgs((m) => m.slice(1))}>drop one</button>
        <button type="button" onClick={() => setMsgs((m) => m.slice(3))}>drop three</button>
        <ChatPanel
          messages={msgs} status="connected" avatars={avatars} stats={stats} sessions={new Map()}
          inGameTags={new Set()} inGameInfoMap={new Map()} recentWinners={new Set()} recentDeltas={new Map()}
          gameEvents={[]} ongoingMatchIds={new Set()} liveStreamers={new Map()} watchList={new Set()}
          onlineUsers={[]} botResponses={[]} translations={new Map()}
          loadOlder={() => Promise.resolve({ added: 0 })} hasMoreHistory={false}
        />
      </MemoryRouter>
    );
  }

  it('raises firstItemIndex by the number of whole rows removed, so the surviving rows keep their index', () => {
    render(<Harness initial={messages} />);
    const before = domRows();
    expect(before.map((r) => r.key.replace(/^day:.*/, 'day'))).toEqual(['day', 'sys1', 'a1', 'b1', 'c1']);
    const bIndex = Number(rowOf('b1').dataset.index);

    // sys1, a1, a2 gone: the system row and the whole Grubby group
    fireEvent.click(screen.getByText('drop three'));
    const after = domRows();
    expect(after.map((r) => r.key.replace(/^day:.*/, 'day'))).toEqual(['day', 'b1', 'c1']);
    expect(after[0].index).toBe(before[0].index + 2);
    expect(Number(rowOf('b1').dataset.index)).toBe(bIndex);
    after.forEach((r, i) => expect(r.index).toBe(after[0].index + i));
  });

  it('leaves firstItemIndex alone when only the head group shrinks', () => {
    render(<Harness initial={messages.filter((m) => m.id !== 'sys1')} />);
    const before = domRows();
    expect(lineCount(rowOf('a1'))).toBe(2);
    const bIndex = Number(rowOf('b1').dataset.index);

    // a1 gone: the Grubby group is now keyed a2 with one line, no row removed
    fireEvent.click(screen.getByText('drop one'));
    const after = domRows();
    expect(after.map((r) => r.key.replace(/^day:.*/, 'day'))).toEqual(['day', 'a2', 'b1', 'c1']);
    expect(after[0].index).toBe(before[0].index);
    expect(lineCount(rowOf('a2'))).toBe(1);
    expect(Number(rowOf('b1').dataset.index)).toBe(bIndex);
  });
});

describe('ChatPanel bottom state', () => {
  it('pauses the live trim while the viewport is off the bottom, resumes on return and resets on unmount', () => {
    const { unmount } = renderPanel();
    expect(isTrimPaused()).toBe(false);
    act(() => virtuosoProps.current.atBottomStateChange(false));
    expect(isTrimPaused()).toBe(true);
    act(() => virtuosoProps.current.atBottomStateChange(true));
    expect(isTrimPaused()).toBe(false);
    act(() => virtuosoProps.current.atBottomStateChange(false));
    expect(isTrimPaused()).toBe(true);
    unmount();
    expect(isTrimPaused()).toBe(false);
  });

  it('follows output only from the bottom: smooth when the reader was there, instant catch-up mid-follow, never when away', () => {
    renderPanel();
    const { followOutput, atBottomStateChange } = virtuosoProps.current;
    // Virtuoso reports not at bottom: never follow
    expect(followOutput(false)).toBe(false);
    // At rest at the bottom before the append
    act(() => atBottomStateChange(true));
    expect(followOutput(true)).toBe('smooth');
    // The list grew and the follow scroll is still in flight (Virtuoso passes
    // true while its own scroll runs): catch up instantly, no stacked smooth
    act(() => atBottomStateChange(false));
    expect(followOutput(true)).toBe('auto');
    // Landed
    act(() => atBottomStateChange(true));
    expect(followOutput(true)).toBe('smooth');
    // Reader scrolled up and no scroll in flight
    act(() => atBottomStateChange(false));
    expect(followOutput(false)).toBe(false);
  });
});

describe('ChatPanel rows', () => {
  it('renders groups, system rows, game rows, bot rows, translations and chips under the header', () => {
    renderPanel();

    expect(screen.getByText('Connected to channel')).toBeInTheDocument();
    expect(screen.getByText('Grubby')).toBeInTheDocument();
    expect(screen.getByText('!stats moon')).toBeInTheDocument();
    expect(screen.getByText('http://example.com')).toBeInTheDocument();
    expect(screen.getByText('Moon: 1800 MMR')).toBeInTheDocument();
    expect(screen.getByText('orphan')).toBeInTheDocument();
    expect(screen.getByText('hello')).toBeInTheDocument();
    expect(document.getElementById('msg-a1').closest('[data-variant="feed"]').querySelector('[data-mmr]')).toHaveTextContent(/^1900$/);
    expect(screen.queryByText('1900 MMR')).toBeNull();
    expect(screen.getByText('Load earlier messages')).toBeInTheDocument();
    expect(screen.getAllByText('Today')).toHaveLength(2); // in-list divider + sticky day bar
    expect(document.getElementById('msg-a1')).not.toBeNull();
    expect(document.getElementById('msg-a2')).not.toBeNull();

    // The header: home link (relay status in its tooltip, no dot), the
    // always-visible search field; no toggle pills, no title
    const header = document.querySelector('[data-chat-header]');
    const home = within(header).getByRole('link', { name: /4v4\.GG/ });
    expect(home).toHaveAttribute('href', '/');
    expect(home).toHaveAttribute('data-relay-status', 'connected');
    expect(home).toHaveAttribute('title', '4v4.GG home · relay connected');
    expect(home.querySelector('span')).toBeNull();
    expect(within(header).getByRole('search')).toHaveAttribute('data-search-active', 'false');
    expect(within(header).getByLabelText('Search messages or players')).toHaveValue('');
    expect(screen.queryByText('4v4 Chat')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Search' })).toBeNull();
    expect(screen.queryByTitle(/game tickers/)).toBeNull();
    expect(screen.queryByTitle(/Focus mode/)).toBeNull();
    expect(screen.queryByTitle(/pulse column/)).toBeNull();

    // Grubby's two lines share one group (one avatar column for both)
    const grubbyGroup = document.getElementById('msg-a1').closest('[data-variant="feed"]');
    expect(grubbyGroup).toContainElement(document.getElementById('msg-a2'));

    // In-game marker while playing, won/lost chips in the post-game window
    expect(screen.getByText('5m')).toHaveAttribute('data-chip', 'ingame');
    expect(screen.queryByText('in game 5m')).toBeNull();
    expect(screen.getByText('lost -9')).toHaveAttribute('data-chip', 'lost');
    expect(screen.getByText('won')).toHaveAttribute('data-chip', 'won');
    expect(screen.getByTitle('live')).toHaveAttribute('href', 'https://twitch.tv/grubby');

    // Game events are one-line rows until clicked
    expect(screen.getByText('FINISHED')).toBeInTheDocument();
    expect(screen.getByText('LIVE')).toBeInTheDocument();
    expect(screen.getByText(/Moon won 20:00 on Ferocity, \+12 avg/)).toBeInTheDocument();
    expect(screen.getByText(/Moon \+3 started on Royal Gardens, 1847 avg/)).toBeInTheDocument();
    expect(screen.queryByText('close one')).toBeNull();
  });

  it("puts each sender's local time from their profile country in the name's tooltip", () => {
    renderPanel();
    // Moon's profile says KR: the label is the send time shifted to Seoul (UTC+9)
    const moon = document.getElementById('msg-b1').closest('[data-variant="feed"]');
    expect(moon.querySelector('[data-local-time]')).toHaveAttribute('title', `${localTimeLabel('KR', new Date(T0 + 60_000))} local`);
    expect(moon).not.toHaveTextContent(/local/);
    // Grubby has no profile, so no country and no clock
    const grubby = document.getElementById('msg-a1').closest('[data-variant="feed"]');
    expect(grubby.querySelector('[data-local-time]')).toBeNull();
  });

  it('lays a game row on the message grid with a tone dot and the same right-hand cell as a message line', () => {
    renderPanel();
    const rows = document.querySelectorAll('[data-ticker]');
    expect(rows).toHaveLength(2);
    const finished = document.querySelector('[data-ticker="finished"]');
    const live = document.querySelector('[data-ticker="live"]');
    expect(finished).toHaveAttribute('role', 'button');
    expect(finished).toHaveAttribute('aria-expanded', 'false');
    expect(finished).toHaveAttribute('data-event-id', 'ge-m1');
    expect(live).toHaveAttribute('data-event-id', 'gs-m2');
    expect(finished.querySelector('[aria-hidden="true"]')).not.toBeNull(); // the dot
    // no old-style icon slot or run block
    expect(document.querySelector('[data-ticker-icon]')).toBeNull();
    expect(document.querySelector('[data-run-start]')).toBeNull();
    // game row and message line end with the same cell: time plus the 20px copy-link slot
    const lineEnd = document.getElementById('msg-a1').querySelector('[data-line-end]');
    const rowEnd = live.querySelector('[data-line-end]');
    expect(lineEnd.querySelector('[data-end-slot]')).not.toBeNull();
    expect(rowEnd.querySelector('[data-end-slot]')).not.toBeNull();
    expect(lineEnd.className).toBe(rowEnd.className);
    expect(lineEnd.querySelector('[data-end-slot]').className).toBe(rowEnd.querySelector('[data-end-slot]').className);
    expect(rowEnd.querySelector('a')).toBeNull(); // slot reserved, no copy link
  });

  it('marks a start event whose game has ended as started, without the live dot', () => {
    renderPanel({ ongoingMatchIds: new Set() });
    expect(document.querySelector('[data-ticker="live"]')).toBeNull();
    const started = document.querySelector('[data-ticker="started"]');
    expect(started).toHaveTextContent('STARTED');
    expect(started).toHaveTextContent(/Moon \+3 started on Royal Gardens/);
  });

  it('expands a row into the game card on click and collapses it from the card header', () => {
    renderPanel();
    fireEvent.click(screen.getByText('FINISHED'));
    const card = document.querySelector('[data-game-card="ge-m1"]');
    expect(card).not.toBeNull();
    expect(document.querySelector('[data-ticker="finished"]')).toHaveAttribute('data-expanded', 'true');
    // header: tag pill, duration, lobby average, time
    const head = screen.getByTitle('Collapse');
    expect(head).toHaveTextContent('FINISHED');
    expect(head).toHaveTextContent('20:00');
    expect(head).toHaveTextContent('1750 avg');
    // map links to the match, teams with MMR and delta, losers dimmed
    expect(screen.getByRole('link', { name: 'Ferocity' })).toHaveAttribute('href', '/match/m1');
    expect(card.querySelector('[data-team="a"]')).toHaveTextContent('Moon');
    expect(card.querySelector('[data-team="a"]')).toHaveTextContent('1800');
    expect(card.querySelector('[data-team="a"]')).toHaveTextContent('+12');
    expect(card.querySelector('[data-team="b"]')).toHaveTextContent('X');
    expect(card.querySelector('[data-team="b"]')).toHaveTextContent('-9');
    expect(card.querySelector('[data-mmr-strip]')).not.toBeNull();
    // the note row below the hairline
    const note = card.querySelector('[data-note="NOTE"]');
    expect(note).toHaveTextContent('close one');
    // streak and rivalry badges are gone from the card
    expect(card.querySelector('[data-badge]')).toBeNull();

    fireEvent.click(head);
    expect(document.querySelector('[data-game-card="ge-m1"]')).toBeNull();
    expect(screen.queryByText('close one')).toBeNull();
    expect(document.querySelector('[data-ticker="finished"]')).toHaveAttribute('aria-expanded', 'false');

    // keyboard: Enter on the row opens, Enter on the header closes
    fireEvent.keyDown(document.querySelector('[data-ticker="live"]'), { key: 'Enter' });
    const liveCard = document.querySelector('[data-game-card="gs-m2"]');
    expect(liveCard).not.toBeNull();
    expect(screen.getByTitle('Collapse')).toHaveTextContent('LIVE');
    expect(screen.getByRole('link', { name: 'Royal Gardens' })).toHaveAttribute('href', '/live');
    expect(liveCard.querySelector('[data-team="a"]').querySelectorAll('a')).toHaveLength(4);
    fireEvent.keyDown(screen.getByTitle('Collapse'), { key: 'Enter' });
    expect(document.querySelector('[data-game-card="gs-m2"]')).toBeNull();
  });

  it('shows the MVP badge and tags the MVP note', () => {
    const mvpEvents = [{
      ...gameEvents[0],
      mvp: 'Moon#2',
      note: { text: 'fielded a 94-supply army', tag: 'Moon#2', name: 'Moon', mmr: 1800, race: 4, heroes: null, raceId: null, quote: null },
    }];
    renderPanel({ gameEvents: mvpEvents });
    fireEvent.click(screen.getByText('FINISHED'));
    const card = document.querySelector('[data-game-card="ge-m1"]');
    expect(card.querySelector('[data-team="a"] [data-mvp]')).toHaveTextContent('MVP');
    expect(card.querySelector('[data-team="b"] [data-mvp]')).toBeNull();
    const note = card.querySelector('[data-note="MVP"]');
    expect(note).toHaveTextContent('MVP');
    expect(note).toHaveTextContent('fielded a 94-supply army');
    expect(note.querySelector('a')).toHaveAttribute('href', '/player/Moon%232');
  });

  it('opens the game from the in-game marker and keeps won/lost chips inert', () => {
    const onOpenGame = vi.fn();
    renderPanel({ onOpenGame });
    const marker = screen.getByText('5m');
    expect(marker.tagName).toBe('BUTTON');
    fireEvent.click(marker);
    expect(onOpenGame).toHaveBeenCalledTimes(1);
    expect(onOpenGame.mock.calls[0][0]).toMatchObject({ matchId: 'm2', mapName: 'Ferocity' });
    expect(screen.getByText('lost -9').tagName).toBe('SPAN');
    cleanup();
    renderPanel();
    expect(screen.getByText('5m').tagName).toBe('SPAN');
  });

  it('on mobile a name opens the player card, rows use the short game copy and hover cards are off', () => {
    const onOpenPlayer = vi.fn();
    renderPanel({ isMobile: true, onOpenPlayer });
    const name = screen.getByText('Moon');
    expect(name.tagName).toBe('BUTTON');
    fireEvent.click(name);
    expect(onOpenPlayer).toHaveBeenCalledWith('Moon#2');
    expect(screen.queryByText('FINISHED')).toBeNull();
    expect(document.querySelector('[data-ticker="finished"]')).toHaveTextContent('Moon won Ferocity · +12');
    expect(document.querySelector('[data-ticker="live"]')).toHaveTextContent('Moon +3 · Royal Gardens');
  });

  it('hides game rows when showGames is off', () => {
    renderPanel({ showGames: false });
    expect(document.querySelectorAll('[data-ticker]')).toHaveLength(0);
    expect(screen.queryByText('FINISHED')).toBeNull();
    expect(screen.getByText('hola')).toBeInTheDocument();
    // the preference belongs to the owner now
    expect(localStorage.getItem('chat:showGames')).toBeNull();
  });

  it('shows translations unless told not to', () => {
    renderPanel({ showTranslations: false });
    expect(screen.queryByText('hello')).toBeNull();
    expect(screen.getByText('hola')).toBeInTheDocument();
  });

  it('never sets a focus-mode body class', () => {
    renderPanel();
    expect(document.body.classList.contains('chat-focus')).toBe(false);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(document.body.classList.contains('chat-focus')).toBe(false);
  });
});

describe('ChatPanel permalinks', () => {
  it('renders a copy-link anchor per line that copies and rewrites the URL', async () => {
    const writeText = vi.fn().mockResolvedValue();
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const replaceState = vi.spyOn(window.history, 'replaceState');
    renderPanel();

    const links = screen.getAllByLabelText('Copy link');
    // one per non-system line: a1, a2, b1, c1
    expect(links).toHaveLength(4);
    const expected = `${window.location.origin}/chat?m=a2`;
    const a2 = links.find((l) => l.getAttribute('href') === expected);
    expect(a2).toBeTruthy();
    expect(a2.tagName).toBe('A');
    expect(document.getElementById('msg-a2')).toContainElement(a2);

    fireEvent.click(a2);
    await waitFor(() => expect(screen.getByText('Copied')).toBeInTheDocument());
    expect(writeText).toHaveBeenCalledWith(expected);
    expect(replaceState).toHaveBeenCalledTimes(1);
    expect(replaceState.mock.calls[0].slice(1)).toEqual(['', '/chat?m=a2']);

    // modified clicks keep the native anchor behaviour
    fireEvent.click(a2, { ctrlKey: true });
    expect(writeText).toHaveBeenCalledTimes(1);
    replaceState.mockRestore();
  });

  it('resolves ?m= on load: scrolls to the row and flashes the line', async () => {
    renderPanel({ permalinkId: 'b1' });
    await waitFor(() => expect(scrollToIndex).toHaveBeenCalled());
    const call = scrollToIndex.mock.calls[0][0];
    expect(call.align).toBe('center');
    // scrollToIndex takes the 0-based data index; data-index carries firstItemIndex
    const row = document.getElementById('msg-b1').closest('[data-index]');
    const rowsInOrder = Array.from(document.querySelectorAll('[data-index]'));
    expect(call.index).toBe(rowsInOrder.indexOf(row));
    expect(document.getElementById('msg-b1')).toHaveStyle({ background: 'rgba(252, 219, 51, 0.14)' });
  });

  it('pages older history until a permalinked message is loaded', async () => {
    const loadOlder = vi.fn();
    function PagingHarness() {
      // b1, c1 in the initial window; a1 arrives with the first older page
      const [msgs, setMsgs] = React.useState(messages.slice(2));
      const load = React.useCallback(async () => {
        loadOlder();
        setMsgs(messages);
        return { added: 2, oldestCursor: null };
      }, []);
      return (
        <MemoryRouter>
          <ChatPanel
            messages={msgs}
            status="connected"
            avatars={avatars}
            stats={stats}
            sessions={new Map()}
            inGameTags={new Set()}
            inGameInfoMap={new Map()}
            recentWinners={new Set()}
            recentDeltas={new Map()}
            gameEvents={[]}
            ongoingMatchIds={new Set()}
            liveStreamers={new Map()}
            watchList={new Set()}
            onlineUsers={[]}
            botResponses={[]}
            translations={new Map()}
            loadOlder={load}
            hasMoreHistory
            permalinkId="a1"
          />
        </MemoryRouter>
      );
    }
    render(<PagingHarness />);
    await waitFor(() => expect(loadOlder).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(scrollToIndex).toHaveBeenCalled());
    expect(document.getElementById('msg-a1')).not.toBeNull();
  });
});

describe('ChatPanel anchored permalink', () => {
  it('reloads the window around &at= when the message is not loaded, then jumps once the new window is in', async () => {
    const older = [msg('old1', 'Moon#2', -3 * 86400000, 'from the archive'), msg('old2', 'Moon#2', -3 * 86400000 + 1000, 'still there')];
    const loadWindow = vi.fn(async () => older);
    let windowId = 0;
    const view = () => (
      <Owner {...baseProps} messages={windowId === 0 ? messages : older} inGameInfoMap={new Map()} loadWindow={loadWindow} windowId={windowId} permalinkId="old1" permalinkAt="2026-09-22 11:00:00" />
    );
    const { rerender } = render(view());
    await waitFor(() => expect(loadWindow).toHaveBeenCalledTimes(1));
    // +1s past the anchor, in the relay's cursor format
    expect(loadWindow).toHaveBeenCalledWith('2026-09-22 11:00:01');
    expect(scrollToIndex).not.toHaveBeenCalled();
    windowId = 1;
    rerender(view());
    await waitFor(() => expect(scrollToIndex).toHaveBeenCalled());
    expect(document.getElementById('msg-old1')).not.toBeNull();
    expect(loadWindow).toHaveBeenCalledTimes(1);
  });

  it('scrolls straight to a loaded message without touching the window', async () => {
    const loadWindow = vi.fn(async () => messages);
    renderPanel({ loadWindow, permalinkId: 'b1', permalinkAt: '2026-09-22 11:00:00' });
    await waitFor(() => expect(scrollToIndex).toHaveBeenCalled());
    expect(loadWindow).not.toHaveBeenCalled();
  });
});

describe('ChatPanel sticky day bar', () => {
  beforeEach(() => {
    // /api/chat/stats supplies the archive's oldest day for the date input
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ oldestMessage: '2026-06-01 00:00:00' }) });
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the top row\'s day and opens a date picker bounded by the archive', async () => {
    renderPanel();
    const day = screen.getByTitle('Jump to date');
    expect(day).toHaveTextContent('Today');
    fireEvent.click(day);
    const input = document.getElementById('chat-jump-date');
    expect(input).toHaveAttribute('type', 'date');
    const today = new Date();
    const ymd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    expect(input).toHaveAttribute('max', ymd);
    await waitFor(() => expect(input).toHaveAttribute('min', '2026-06-01'));
    expect(globalThis.fetch.mock.calls.some((c) => /\/api\/chat\/stats$/.test(String(c[0])))).toBe(true);
    // Esc closes the popover
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(document.getElementById('chat-jump-date')).toBeNull();
  });

  it('loads a window ending at the picked day and offers Back to live', async () => {
    const dayMsgs = [
      msg('d1', 'Moon#2', -3 * 86400000, 'three days ago'),
      msg('d2', 'Moon#2', -2 * 86400000, 'two days ago'),
    ];
    const loadWindow = vi.fn(async () => dayMsgs);
    const loadLatest = vi.fn(async () => messages);
    renderPanel({ loadWindow, loadLatest, windowMode: 'live' });
    expect(screen.queryByText('Back to live')).toBeNull();

    fireEvent.click(screen.getByTitle('Jump to date'));
    const picked = new Date(T0 - 2 * 86400000);
    const ymd = `${picked.getFullYear()}-${String(picked.getMonth() + 1).padStart(2, '0')}-${String(picked.getDate()).padStart(2, '0')}`;
    fireEvent.change(document.getElementById('chat-jump-date'), { target: { value: ymd } });
    await waitFor(() => expect(loadWindow).toHaveBeenCalledTimes(1));
    // cursor is the start of the next local day in the relay's UTC format
    const cursor = loadWindow.mock.calls[0][0];
    const nextDay = new Date(picked.getFullYear(), picked.getMonth(), picked.getDate() + 1);
    expect(cursor).toBe(nextDay.toISOString().slice(0, 19).replace('T', ' '));
    expect(document.getElementById('chat-jump-date')).toBeNull();

    cleanup();
    renderPanel({ messages: dayMsgs, loadWindow, loadLatest, windowMode: 'archive', windowId: 1 });
    const back = screen.getByText('Back to live');
    expect(back).toBeInTheDocument();
    fireEvent.click(back);
    await waitFor(() => expect(loadLatest).toHaveBeenCalledTimes(1));
  });
});

describe('ChatPanel filter', () => {
  const field = () => within(document.querySelector('[data-chat-header]')).getByLabelText('Search messages or players');
  const groups = () => [...document.querySelectorAll('[data-variant="feed"]')].map((el) => el.querySelector('[data-local-time], a, button').textContent);

  beforeEach(() => {
    window.history.replaceState(null, '', '/chat');
  });
  afterEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('filters the stream by author name or text, counts the hits, hides game and system rows, and clears from the × or Esc', () => {
    renderPanel();
    expect(document.querySelectorAll('[data-variant="feed"]').length).toBe(3);
    expect(document.querySelectorAll('[data-ticker]').length).toBe(2);

    fireEvent.change(field(), { target: { value: 'HOLA' } });
    expect(screen.getByRole('search', { name: 'Filter messages' })).toHaveAttribute('data-search-active', 'true');
    expect(document.querySelector('[data-found-count]')).toHaveTextContent('1 found');
    expect(groups()).toEqual(['Moon']);
    expect(document.querySelectorAll('[data-ticker]').length).toBe(0);
    expect(screen.queryByText('Connected to channel')).toBeNull();
    expect(screen.getByText('hola')).toBeInTheDocument();
    // one day divider for the remaining rows, still the sticky bar
    expect(screen.getAllByText('Today')).toHaveLength(2);
    expect(globalThis.fetch.mock.calls.some((c) => /\/api\/chat\/search/.test(String(c[0])))).toBe(false);

    // by name, matching the whole group (both of Grubby's lines)
    fireEvent.change(field(), { target: { value: 'grub' } });
    expect(document.querySelector('[data-found-count]')).toHaveTextContent('1 found');
    expect(document.getElementById('msg-a1')).not.toBeNull();
    expect(document.getElementById('msg-a2')).not.toBeNull();
    expect(document.getElementById('msg-b1')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(field()).toHaveValue('');
    expect(document.querySelector('[data-found-count]')).toBeNull();
    expect(document.querySelectorAll('[data-variant="feed"]').length).toBe(3);
    expect(document.querySelectorAll('[data-ticker]').length).toBe(2);

    fireEvent.change(field(), { target: { value: 'zzz' } });
    expect(document.querySelector('[data-found-count]')).toHaveTextContent('0 found');
    expect(screen.getByText('No messages match')).toBeInTheDocument();
    expect(screen.queryByTestId('virtuoso')).toBeNull();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(field()).toHaveValue('');
    expect(screen.queryByText('No messages match')).toBeNull();
  });

  it('pages older history from the button only while a query is set', async () => {
    const loadOlder = vi.fn(async () => ({ added: 0 }));
    renderPanel({ loadOlder });
    fireEvent.change(field(), { target: { value: 'hola' } });
    await act(async () => virtuosoProps.current.startReached?.());
    expect(loadOlder).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Load earlier messages'));
    await waitFor(() => expect(loadOlder).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    await act(async () => virtuosoProps.current.startReached?.());
    expect(loadOlder).toHaveBeenCalledTimes(2);
  });

  it('seeds the field from ?q= (the old /search links), then drops the query from the address bar', () => {
    window.history.replaceState(null, '', '/chat?q=gg&since=all');
    renderPanel();
    expect(field()).toHaveValue('gg');
    expect(document.querySelector('[data-found-count]')).toHaveTextContent('0 found');
    expect(window.location.search).toBe('');
    expect(searchToggle).not.toHaveBeenCalled();
    cleanup();
    window.history.replaceState(null, '', '/chat?player=Moon%232&m=b1');
    renderPanel();
    expect(field()).toHaveValue('Moon#2');
    expect(window.location.search).toBe('?m=b1');
  });

  it('shows the mobile search row only while searchOpen, sharing the query, and closes it on Esc', () => {
    renderPanel();
    expect(document.querySelector('[data-mobile-search]')).toBeNull();
    fireEvent.click(screen.getByText('toggle search'));
    const row = document.querySelector('[data-mobile-search]');
    expect(row).not.toBeNull();
    fireEvent.change(within(row).getByLabelText('Search messages or players'), { target: { value: 'hola' } });
    expect(field()).toHaveValue('hola');
    expect(within(row).getByText('1 found')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(searchToggle).toHaveBeenLastCalledWith(false);
    expect(document.querySelector('[data-mobile-search]')).toBeNull();
    expect(field()).toHaveValue('');
  });
});

describe('ChatPanel latest pill', () => {
  const later = (n) => [...messages, ...Array.from({ length: n }, (_, i) => msg(`n${i + 1}`, 'Moon#2', 120000 + (i + 1) * 1000, `line ${i + 1}`))];

  it('on desktop shows "N new" only when lines arrive while the viewport is off the bottom, and scrolls down on click', () => {
    const { rerender } = renderPanel();
    expect(document.querySelector('[data-latest-pill]')).toBeNull();
    act(() => virtuosoProps.current.atBottomStateChange(false));
    expect(document.querySelector('[data-latest-pill]')).toBeNull();
    rerender(<Owner {...baseProps} messages={later(1)} inGameInfoMap={new Map()} />);
    expect(document.querySelector('[data-latest-pill]')).toHaveAttribute('data-latest-pill', 'new');
    expect(document.querySelector('[data-latest-pill]')).toHaveTextContent('↓ 1 new');
    rerender(<Owner {...baseProps} messages={later(2)} inGameInfoMap={new Map()} />);
    expect(document.querySelector('[data-latest-pill]')).toHaveTextContent('↓ 2 new');
    fireEvent.click(document.querySelector('[data-latest-pill]'));
    expect(scrollToIndex).toHaveBeenCalledWith(expect.objectContaining({ index: 'LAST' }));
    act(() => virtuosoProps.current.atBottomStateChange(true));
    expect(document.querySelector('[data-latest-pill]')).toBeNull();
  });

  it('on mobile shows "Latest" whenever the viewport is off the bottom', () => {
    const { rerender } = renderPanel({ isMobile: true });
    expect(document.querySelector('[data-latest-pill]')).toBeNull();
    act(() => virtuosoProps.current.atBottomStateChange(false));
    expect(document.querySelector('[data-latest-pill]')).toHaveTextContent('↓ Latest');
    rerender(<Owner {...baseProps} isMobile messages={later(1)} inGameInfoMap={new Map()} />);
    expect(document.querySelector('[data-latest-pill]')).toHaveTextContent('↓ 1 new');
  });
});

describe('ChatPanel stats strip', () => {
  const statsPayload = {
    totalMessages: 5000, uniqueUsers: 320, messagesLast24h: 1234, messagesLast7d: 8765, usersLast24h: 42,
    oldestMessage: '2026-06-01 00:00:00',
    topChatters: [
      { user_name: 'Grubby', battle_tag: 'Grubby#1', count: 900 },
      { user_name: 'Moon', battle_tag: 'Moon#2', count: 800 },
      { user_name: 'C', battle_tag: 'C#3', count: 3 }, { user_name: 'D', battle_tag: 'D#4', count: 2 },
      { user_name: 'E', battle_tag: 'E#5', count: 1 }, { user_name: 'F', battle_tag: 'F#6', count: 1 },
    ],
    byHour: [...Array(24)].map((_, hour) => ({ hour, count: hour + 1 })),
    byHourToday: [{ hour: 12, count: 7 }],
    perDay: [],
  };

  it('is closed until statsOpen, then fetches /api/chat/stats and renders the figures at the top of the list', async () => {
    let resolveStats;
    globalThis.fetch.mockImplementation(async (url) => {
      if (String(url).endsWith('/api/chat/stats')) {
        return new Promise((resolve) => { resolveStats = () => resolve({ ok: true, json: async () => statsPayload }); });
      }
      return { ok: false, json: async () => ({}) };
    });
    renderPanel();
    expect(screen.queryByTestId('stats-strip')).toBeNull();
    expect(globalThis.fetch.mock.calls.filter((c) => String(c[0]).endsWith('/api/chat/stats'))).toHaveLength(0);
    fireEvent.click(screen.getByText('toggle stats'));
    // skeleton until the relay answers
    const strip = screen.getByTestId('stats-strip');
    expect(strip).toHaveAttribute('aria-busy', 'true');
    expect(globalThis.fetch.mock.calls.filter((c) => String(c[0]).endsWith('/api/chat/stats'))).toHaveLength(1);
    // the strip sits above the stream inside the panel
    const panel = document.querySelector('[data-chat-panel]');
    expect(panel).toContainElement(strip);
    expect(strip.compareDocumentPosition(screen.getByTestId('virtuoso')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    resolveStats();
    await waitFor(() => expect(screen.getByText('1,234')).toBeInTheDocument());
    expect(screen.getByText('Messages 24h')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Chatters 24h')).toBeInTheDocument();
    expect(screen.getByText('Busiest hour today')).toBeInTheDocument();
    expect(screen.getByText('7 msgs')).toBeInTheDocument();
    // top 5 of 6, names link to the player page
    const top = screen.getByText('Top chatters').parentElement;
    expect(top.querySelectorAll('li')).toHaveLength(5);
    expect(screen.getByTitle('Grubby#1')).toHaveAttribute('href', '/player/Grubby%231');
    expect(screen.getByText('900')).toBeInTheDocument();
    // 24 bars, the current hour drawn full gold
    const bars = screen.getByTestId('stats-sparkline').querySelectorAll('rect');
    expect(bars).toHaveLength(24);
    const current = [...bars].filter((r) => r.getAttribute('data-current') === 'true');
    expect(current).toHaveLength(1);
    expect(current[0].getAttribute('data-hour')).toBe(String(new Date().getHours()));
    expect(current[0].getAttribute('fill-opacity')).toBe('1');
    expect(bars[(Number(current[0].getAttribute('data-hour')) + 1) % 24].getAttribute('fill-opacity')).toBe('0.35');

    fireEvent.click(screen.getByText('toggle stats'));
    expect(screen.queryByTestId('stats-strip')).toBeNull();
    // no preference of its own any more
    expect(localStorage.getItem('chat:showStats')).toBeNull();
  });

  it('renders straight away when mounted open', () => {
    renderPanel({ initialStatsOpen: true });
    expect(screen.getByTestId('stats-strip')).toBeInTheDocument();
  });
});

describe('ChatPanel tab badge', () => {
  afterEach(() => {
    resetHidden();
    document.title = '';
    document.querySelector('link[rel="icon"]')?.remove();
  });

  it('counts unread while hidden in the title and favicon, restores on return', () => {
    document.title = '4v4.GG';
    function Harness() {
      const [msgs, setMsgs] = React.useState(messages);
      return (
        <MemoryRouter>
          <button type="button" onClick={() => setMsgs((m) => [...m, msg(`n${m.length}`, 'Moon#2', 200000 + m.length * 1000, 'later')])}>add</button>
          <ChatPanel
            messages={msgs} status="connected" avatars={avatars} stats={stats} sessions={new Map()}
            inGameTags={new Set()} inGameInfoMap={new Map()} recentWinners={new Set()} recentDeltas={new Map()}
            gameEvents={[]} ongoingMatchIds={new Set()} liveStreamers={new Map()} watchList={new Set()}
            onlineUsers={[]} botResponses={[]} translations={new Map()}
            loadOlder={() => Promise.resolve({ added: 0 })} hasMoreHistory
          />
        </MemoryRouter>
      );
    }
    render(<Harness />);
    expect(document.title).toBe('4v4.GG');
    // messages arriving while visible do not badge
    fireEvent.click(screen.getByText('add'));
    expect(document.title).toBe('4v4.GG');

    setHidden(true);
    expect(document.title).toBe('4v4.GG');
    fireEvent.click(screen.getByText('add'));
    expect(document.title).toBe('(1) 4v4 Chat');
    expect(document.querySelector('link[rel="icon"]')).toHaveAttribute('href', '/favicon-unread.svg');
    fireEvent.click(screen.getByText('add'));
    expect(document.title).toBe('(2) 4v4 Chat');

    setHidden(false);
    expect(document.title).toBe('4v4.GG');
    expect(document.querySelector('link[rel="icon"]')).toHaveAttribute('href', '/favicon.svg');
  });
});

describe('ChatPanel notifications', () => {
  let created;
  let requestPermission;
  let permission;
  beforeEach(() => {
    created = [];
    permission = 'default';
    requestPermission = vi.fn(async () => permission);
    class FakeNotification {
      static get permission() { return permission; }
      static requestPermission(...args) { return requestPermission(...args); }
      constructor(title, options) { this.title = title; this.options = options; created.push(this); }
      close() { this.closed = true; }
    }
    vi.stubGlobal('Notification', FakeNotification);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    resetHidden();
  });

  const harness = (watchList) => {
    function Harness() {
      const [msgs, setMsgs] = React.useState(messages);
      const add = (tag, text) => setMsgs((m) => [...m, msg(`n${m.length}`, tag, 200000 + m.length * 1000, text)]);
      return (
        <MemoryRouter>
          <button type="button" onClick={() => add('Watched#3', 'ping me now, this is a fairly long message that goes on and on and on and on and on and on and on and on and on and on')}>watched</button>
          <button type="button" onClick={() => add('Moon#2', 'hey Watched are you there')}>mention</button>
          <button type="button" onClick={() => add('Moon#2', 'nothing to see')}>plain</button>
          <ChatPanel
            messages={msgs} status="connected" avatars={new Map([['Watched#3', { profilePicUrl: 'https://x/w.jpg' }]])} stats={stats} sessions={new Map()}
            inGameTags={new Set()} inGameInfoMap={new Map()} recentWinners={new Set()} recentDeltas={new Map()}
            gameEvents={[]} ongoingMatchIds={new Set()} liveStreamers={new Map()} watchList={watchList}
            onlineUsers={[]} botResponses={[]} translations={new Map()}
            loadOlder={() => Promise.resolve({ added: 0 })} hasMoreHistory
          />
        </MemoryRouter>
      );
    }
    return render(<Harness />);
  };

  it('has no Ping pill and never asks for permission on load or on new lines', () => {
    harness(new Set(['watched#3']));
    expect(screen.queryByTitle(/ping/i)).toBeNull();
    expect(screen.queryByText('Ping')).toBeNull();
    fireEvent.click(screen.getByText('watched'));
    expect(requestPermission).not.toHaveBeenCalled();
    expect(localStorage.getItem('chat:notify')).toBeNull();
  });

  it('notifies for a watched player only while hidden and granted', () => {
    harness(new Set(['watched#3']));

    // not granted: no notification even while hidden
    setHidden(true);
    fireEvent.click(screen.getByText('watched'));
    expect(created).toHaveLength(0);

    // granted but visible: no notification
    permission = 'granted';
    setHidden(false);
    fireEvent.click(screen.getByText('watched'));
    expect(created).toHaveLength(0);

    // granted and hidden: one notification, tagged, truncated body, avatar icon
    setHidden(true);
    fireEvent.click(screen.getByText('watched'));
    expect(created).toHaveLength(1);
    expect(created[0].title).toBe('Watched in 4v4 chat');
    expect(created[0].options.tag).toBe('4v4-chat');
    expect(created[0].options.icon).toBe('https://x/w.jpg');
    expect(created[0].options.body.length).toBeLessThanOrEqual(120);
    // coalesced: a second one inside 5s is dropped
    fireEvent.click(screen.getByText('watched'));
    expect(created).toHaveLength(1);

    // click brings the tab back and jumps to the line
    const focus = vi.spyOn(window, 'focus').mockImplementation(() => {});
    created[0].onclick();
    expect(focus).toHaveBeenCalled();
    expect(created[0].closed).toBe(true);
    focus.mockRestore();
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it('notifies for a mention of a watched player and not for plain lines', () => {
    permission = 'granted';
    harness(new Set(['watched#3']));
    setHidden(true);
    resetNotifyThrottle();
    fireEvent.click(screen.getByText('plain'));
    expect(created).toHaveLength(0);
    fireEvent.click(screen.getByText('mention'));
    expect(created).toHaveLength(1);
    expect(created[0].title).toBe('Moon in 4v4 chat');
    expect(created[0].options.icon).toBe('/favicon.svg');
  });

  it('asks for permission when the first player is starred, and not again once decided', () => {
    function Stars() {
      const { watchList, toggleWatch } = useWatchList();
      return (
        <>
          <button type="button" onClick={() => toggleWatch('Moon#2')}>star moon</button>
          <button type="button" onClick={() => toggleWatch('Grubby#1')}>star grubby</button>
          <span data-testid="count">{watchList.size}</span>
        </>
      );
    }
    render(<Stars />);
    expect(requestPermission).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('star moon'));
    expect(requestPermission).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('count')).toHaveTextContent('1');
    expect(JSON.parse(localStorage.getItem('chat:watchList'))).toEqual(['moon#2']);
    // unstarring never asks
    fireEvent.click(screen.getByText('star moon'));
    expect(requestPermission).toHaveBeenCalledTimes(1);
    // denied: starring again does nothing further
    permission = 'denied';
    fireEvent.click(screen.getByText('star grubby'));
    expect(requestPermission).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('count')).toHaveTextContent('1');
  });
});

describe('GameModal', () => {
  const info = { matchId: 'm2', mapName: 'Royal Gardens', startTime: fiveMinutesAgo() };
  const hover = { avatars, stats, sessions: new Map(), inGameTags: new Set(['Moon#2']), inGameInfoMap: new Map([['Moon#2', info]]) };
  const renderModal = (overrides = {}) => {
    const onClose = vi.fn();
    render(
      <MemoryRouter>
        <GameModal
          game={info}
          gameEvents={gameEvents}
          ongoingMatches={[]}
          ongoingMatchIds={new Set(['m2'])}
          onlineUsers={[{ battleTag: 'Moon#2', name: 'Moon' }, { battleTag: 'Grubby#1', name: 'Grubby' }]}
          inGameInfoMap={hover.inGameInfoMap}
          stats={new Map([['Moon#2', { mmr: 1800 }]])}
          hoverData={hover}
          onClose={onClose}
          {...overrides}
        />
      </MemoryRouter>
    );
    return onClose;
  };

  it('shows the expanded card for the ongoing match with a Live header, closes on the button, backdrop and Esc', () => {
    const onClose = renderModal();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-label', 'Live · Royal Gardens · 5m');
    expect(screen.getByText('Royal Gardens')).toBeInTheDocument(); // card map name
    expect(screen.getByRole('link', { name: 'Moon' })).toHaveAttribute('href', '/player/Moon%232');
    // the card's LIVE pill and its "N min in" meta (the start event's time is
    // not recent here, so the meta falls back to "in progress")
    expect(screen.getByText('LIVE')).toBeInTheDocument();
    expect(screen.getByText(/in progress|min in/)).toBeInTheDocument();
    // no collapse control inside the modal
    expect(screen.queryByTitle('Collapse')).toBeNull();
    expect(document.querySelector('[data-game-roster]')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Close game' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(dialog);
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(document.querySelector('[data-game-modal="m2"]'));
    expect(onClose).toHaveBeenCalledTimes(2);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('builds the card from the ongoing poll when the start event was not seen', () => {
    const match = {
      id: 'm7', mapName: 'Snowblind', startTime: fiveMinutesAgo(),
      teams: [
        { players: [{ battleTag: 'Moon#2', name: 'Moon', race: 4, oldMmr: 1800 }] },
        { players: [{ battleTag: 'Z#1', name: 'Z', race: 2, oldMmr: 1700 }] },
      ],
    };
    const { event, players } = resolveGame({ matchId: 'm7', mapName: 'Snowblind' }, {
      gameEvents, ongoingMatches: [match], onlineUsers: [{ battleTag: 'Moon#2', name: 'Moon' }],
    });
    expect(event).toMatchObject({ id: 'gs-m7', type: 'game_start', mapName: 'Snowblind' });
    expect(event.teams[0][0]).toMatchObject({ battleTag: 'Moon#2', inChannel: true });
    expect(players).toEqual([]);
  });

  it('lists the channel players in the game with their MMR when there is no card data', () => {
    const unknown = { matchId: 'm9', mapName: 'Ferocity', startTime: fiveMinutesAgo() };
    renderModal({
      game: unknown,
      ongoingMatchIds: new Set(['m9']),
      inGameInfoMap: new Map([['Moon#2', unknown], ['Grubby#1', unknown]]),
      stats: new Map([['Moon#2', { mmr: 1800.4 }]]),
    });
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-label', 'Live · Ferocity · 5m');
    const roster = document.querySelector('[data-game-roster]');
    expect(roster).not.toBeNull();
    expect(roster.querySelectorAll('li')).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'Moon' })).toHaveAttribute('href', '/player/Moon%232');
    expect(screen.getByText('1800')).toBeInTheDocument();
    expect(screen.queryByText('LIVE')).toBeNull();
  });

  it('says Finished once the match leaves the ongoing set', () => {
    renderModal({ ongoingMatchIds: new Set() });
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-label', 'Finished · Royal Gardens');
  });
});

describe('ChatPanel mentions and unfurls', () => {
  it('tints a line that names a watched player and marks the name', () => {
    renderPanel({ messages: [...messages, msg('m1', 'Moon#2', 120000, 'gg WATCHED nice one'), msg('m2', 'Grubby#1', 150000, 'watchedx is not a mention')] });
    const mentioned = document.getElementById('msg-m1').closest('[data-variant="feed"]');
    expect(mentioned).toHaveAttribute('data-watched', 'true');
    const mark = mentioned.querySelector('[data-mention="true"]');
    expect(mark).toHaveTextContent('WATCHED');
    const plain = document.getElementById('msg-m2').closest('[data-variant="feed"]');
    expect(plain.querySelector('[data-mention="true"]')).toBeNull();
    expect(plain).not.toHaveAttribute('data-watched');
    // the author's own row keeps its treatment
    const own = document.getElementById('msg-c1').closest('[data-variant="feed"]');
    expect(own).toHaveAttribute('data-watched', 'true');
  });

  it('renders the link first and one card per message once metadata arrives', async () => {
    globalThis.fetch.mockImplementation(async (url) => {
      const u = String(url);
      if (u.includes('/api/twitch/clip/')) {
        return { ok: true, json: async () => ({ title: 'Insane hold', thumbnail_url: 'https://t/c.jpg', broadcaster_name: 'Grubby', url: 'https://clips.twitch.tv/Slug-1' }) };
      }
      if (u.startsWith('https://www.youtube.com/oembed')) {
        return { ok: true, json: async () => ({ title: 'A video', thumbnail_url: 'https://i.ytimg.com/v.jpg', author_name: 'Moon' }) };
      }
      return { ok: false, json: async () => ({}) };
    });
    renderPanel({
      messages: [
        ...messages,
        msg('u1', 'Moon#2', 120000, 'clip https://clips.twitch.tv/Slug-1 and https://youtu.be/dQw4w9WgXcQ'),
        msg('u2', 'Grubby#1', 150000, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
      ],
    });
    expect(screen.getByText('https://clips.twitch.tv/Slug-1')).toHaveAttribute('href', 'https://clips.twitch.tv/Slug-1');
    const cards = await screen.findAllByTestId('unfurl-card');
    expect(cards).toHaveLength(2);
    const twitch = cards.find((c) => c.getAttribute('data-kind') === 'twitch');
    expect(twitch).toHaveAttribute('href', 'https://clips.twitch.tv/Slug-1');
    expect(twitch).toHaveTextContent('Insane hold');
    expect(twitch).toHaveTextContent('clips.twitch.tv');
    expect(twitch.querySelector('img')).toHaveAttribute('src', 'https://t/c.jpg');
    const yt = cards.find((c) => c.getAttribute('data-kind') === 'youtube');
    expect(yt).toHaveAttribute('href', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(yt).toHaveTextContent('A video');
    // u1 had two links but gets one card (the first); the card sits in the feed row
    expect(document.getElementById('msg-u1').parentElement.querySelectorAll('[data-testid="unfurl-card"]')).toHaveLength(1);
  });
});

describe('/search redirect', () => {
  it('maps the old page params onto the chat search panel', async () => {
    const { searchRedirectTarget } = await import('../pages/Search');
    expect(searchRedirectTarget('')).toBe('/chat');
    expect(searchRedirectTarget('?q=hola')).toBe('/chat?q=hola');
    expect(searchRedirectTarget('?q=Moon&qmode=player&qsince=30d')).toBe('/chat?player=Moon&since=30d');
    expect(searchRedirectTarget('?q=gg&qsince=')).toBe('/chat?q=gg&since=all');
    expect(searchRedirectTarget('?q=gg&qsince=2d')).toBe('/chat?q=gg');
  });
});
