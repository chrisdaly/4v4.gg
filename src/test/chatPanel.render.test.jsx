import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup, waitFor, act, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// happy-dom has no layout: every box is 0px, so the stream's scroller would
// think it is always at the bottom and the viewport hold would have nothing
// to measure. `layout()` gives the real elements a geometry - uniform row
// heights down a fixed viewport - and `scrollTo` moves it and fires the
// event the hook listens for. Rows are all really in the DOM now, so
// everything else in here reads them directly.
const ROW_H = 100;
const VIEWPORT = 200;

// Geometry is installed on the prototype rather than per element, because
// the stream scrolls to rows that only exist after an await: a stub applied
// at a fixed moment would miss them. Anything that is not a stream row or
// the stream scroller keeps the real (zero) answers.
const patched = [];
function installLayout() {
  const proto = window.HTMLElement.prototype;
  const listRows = () => Array.from(document.querySelectorAll('[data-chat-list] > [data-row-key]'));
  const isScroller = (el) => el.dataset && el.dataset.chatScroller !== undefined;
  const rect = (top, bottom) => ({ top, bottom, height: bottom - top, left: 0, right: 0, width: 100, x: 0, y: top });

  const define = (name, get) => {
    const original = Object.getOwnPropertyDescriptor(proto, name);
    patched.push([name, original]);
    Object.defineProperty(proto, name, {
      configurable: true,
      get() {
        const mine = get.call(this);
        if (mine !== undefined) return mine;
        return original?.get ? original.get.call(this) : 0;
      },
    });
  };

  define('offsetTop', function () {
    const i = listRows().indexOf(this);
    return i === -1 ? undefined : i * ROW_H;
  });
  define('offsetHeight', function () {
    return this.dataset?.rowKey === undefined ? undefined : ROW_H;
  });
  define('clientHeight', function () {
    return isScroller(this) ? VIEWPORT : undefined;
  });
  define('scrollHeight', function () {
    return isScroller(this) ? listRows().length * ROW_H : undefined;
  });

  const originalRect = proto.getBoundingClientRect;
  patched.push(['getBoundingClientRect', { value: originalRect }]);
  proto.getBoundingClientRect = function () {
    if (isScroller(this)) return rect(0, VIEWPORT);
    const i = listRows().indexOf(this);
    if (i === -1) return originalRect.call(this);
    const top = i * ROW_H - (scroller()?.scrollTop || 0);
    return rect(top, top + ROW_H);
  };
  const originalScrollTo = proto.scrollTo;
  patched.push(['scrollTo', { value: originalScrollTo }]);
  proto.scrollTo = function (opts) {
    if (!isScroller(this)) return originalScrollTo?.call(this, opts);
    this.scrollTop = opts?.top ?? 0;
    fireEvent.scroll(this);
    return undefined;
  };
}

function restoreLayout() {
  const proto = window.HTMLElement.prototype;
  while (patched.length) {
    const [name, original] = patched.pop();
    if (original) Object.defineProperty(proto, name, { configurable: true, ...original });
    else delete proto[name];
  }
}

// Kept so the intent reads at each call site; the geometry is already live
const layout = () => scroller();

const scroller = () => document.querySelector('[data-chat-scroller]');
const rowFor = (msgId) => document.getElementById(`msg-${msgId}`)?.closest('[data-row-key]');
// scrollToKey centres a row: its top, less half the room left over
const centredOn = (msgId) => Math.max(0, rowFor(msgId).offsetTop - (VIEWPORT - ROW_H) / 2);
const waitForCentred = (msgId) => waitFor(() => expect(scroller().scrollTop).toBe(centredOn(msgId)));

// Move the viewport and let the stream see it
function scrollTo(top) {
  const el = scroller();
  act(() => {
    el.scrollTop = top;
    fireEvent.scroll(el);
  });
  return el;
}

// Up the list, far enough off the end that the tail behaviour stops. Not 0:
// the panel mounts at scrollTop 0 in a layout-less DOM, so a scroll to 0 is
// not a move and the stream rightly ignores it.
const scrollUp = () => scrollTo(100);
const scrollToEnd = () => scrollTo(scroller().scrollHeight - VIEWPORT);

import ChatPanel from '../components/ChatPanel';
import GameModal, { resolveGame } from '../components/chat/GameModal';
import { useWatchList } from '../lib/chatExtras';
import { resetNotifyThrottle } from '../lib/chat/notify';
import { resetUnfurlCache } from '../lib/chat/unfurl';
import { isTrimPaused, setTrimPaused } from '../lib/chat/trimGate';
import { localTimeLabel } from '../lib/chat/localTime';
import { saveLastRead, loadLastRead, resetLastReadThrottle } from '../lib/chat/lastRead';

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
  installLayout();
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
  restoreLayout();
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
  const domRows = () => Array.from(document.querySelectorAll('[data-row-key]')).map((el) => ({
    el, index: Number(el.dataset.index), key: el.dataset.rowKey,
  }));
  const rowOf = (msgId) => document.getElementById(`msg-${msgId}`).closest('[data-row-key]');
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

    layout();
    // Reaching the head pages older history in; a second trigger while that
    // fetch is in flight does not start another
    scrollTo(100);
    expect(loadOlder).toHaveBeenCalledTimes(1);
    scrollTo(90);
    expect(loadOlder).toHaveBeenCalledTimes(1);

    const before = domRows();
    const anchorBefore = rowOf('a1');
    const anchorKeyBefore = anchorBefore.dataset.rowKey;
    const anchorOffsetBefore = anchorBefore.offsetTop - scroller().scrollTop;
    expect(lineCount(anchorBefore)).toBe(2);
    // Day divider is its own row ahead of the first message row
    expect(before[0].key).toMatch(/^day:/);

    await act(async () => {
      resolveLoad();
    });
    await waitFor(() => expect(document.getElementById('msg-o0')).toBeInTheDocument());

    const after = domRows();
    // 27 single-line groups + 1 separate Grubby group; the divider moved
    expect(after.length - before.length).toBe(28);

    // The previously first message row keeps its key and its lines, and -
    // the point of all of it - it is still under the same pixel
    const anchorAfter = rowOf('a1');
    expect(anchorAfter.dataset.rowKey).toBe(anchorKeyBefore);
    expect(lineCount(anchorAfter)).toBe(2);
    expect(anchorAfter.offsetTop - scroller().scrollTop).toBe(anchorOffsetBefore);

    // The same-author page forms its own group right above it
    const grubbyOlder = rowOf('g1');
    expect(lineCount(grubbyOlder)).toBe(3);
    expect(grubbyOlder.nextElementSibling).toBe(anchorAfter);

    // No duplicate keys
    const keys = after.map((r) => r.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keyWarnings.mock.calls.filter((c) => String(c[0]).includes('same key'))).toHaveLength(0);
  });
});

describe('ChatPanel head trim', () => {
  const domRows = () => Array.from(document.querySelectorAll('[data-row-key]')).map((el) => ({
    el, index: Number(el.dataset.index), key: el.dataset.rowKey,
  }));
  const rowOf = (msgId) => document.getElementById(`msg-${msgId}`).closest('[data-row-key]');
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

  it('keeps the surviving rows when whole rows are trimmed off the head', () => {
    render(<Harness initial={messages} />);
    const before = domRows();
    expect(before.map((r) => r.key.replace(/^day:.*/, 'day'))).toEqual(['day', 'sys1', 'a1', 'b1', 'c1']);
    const bRow = rowOf('b1');

    // sys1, a1, a2 gone: the system row and the whole Grubby group
    fireEvent.click(screen.getByText('drop three'));
    const after = domRows();
    expect(after.map((r) => r.key.replace(/^day:.*/, 'day'))).toEqual(['day', 'b1', 'c1']);
    // the same element, not one torn down and rebuilt
    expect(rowOf('b1')).toBe(bRow);
  });

  it('re-keys the head group when only its first line is trimmed', () => {
    render(<Harness initial={messages.filter((m) => m.id !== 'sys1')} />);
    expect(lineCount(rowOf('a1'))).toBe(2);
    const bRow = rowOf('b1');

    // a1 gone: the Grubby group is now keyed a2 with one line, no row removed
    fireEvent.click(screen.getByText('drop one'));
    const after = domRows();
    expect(after.map((r) => r.key.replace(/^day:.*/, 'day'))).toEqual(['day', 'a2', 'b1', 'c1']);
    expect(lineCount(rowOf('a2'))).toBe(1);
    expect(rowOf('b1')).toBe(bRow);
  });
});

describe('ChatPanel bottom state', () => {
  // The reader is at the tail or they are not, and the stream behaves
  // differently in each: new lines follow them down at the tail and are left
  // alone above it, and the live cap never trims the head out from under
  // someone reading up the list.
  it('pauses the live trim while the viewport is off the bottom, resumes on return and resets on unmount', () => {
    const { unmount } = renderPanel();
    layout();
    expect(isTrimPaused()).toBe(false);
    scrollUp();
    expect(isTrimPaused()).toBe(true);
    scrollToEnd();
    expect(isTrimPaused()).toBe(false);
    scrollUp();
    expect(isTrimPaused()).toBe(true);
    unmount();
    expect(isTrimPaused()).toBe(false);
  });

  it('sees the reader scroll on a cold load, where the stream arrives after the skeleton', () => {
    // The panel shows a skeleton until the first messages land, so the
    // scroller is not in the DOM when the page mounts. Everything the stream
    // knows about where the reader is depends on noticing it when it appears.
    const { rerender } = render(<Owner {...baseProps} messages={[]} inGameInfoMap={new Map()} />);
    expect(scroller()).toBeNull();

    rerender(<Owner {...baseProps} messages={messages} inGameInfoMap={new Map()} />);
    expect(scroller()).not.toBeNull();

    scrollUp();
    // the scroll was seen: the pill is up and the live cap is held off
    expect(isTrimPaused()).toBe(true);

    // and a page of older history holds the reader instead of sending them
    // to the end
    const anchorRow = rowFor('b1');
    const before = anchorRow.getBoundingClientRect().top;
    const older = Array.from({ length: 6 }, (_, i) => msg(`o${i}`, 'Sok#4', -600000 + i * 10000, `older ${i}`));
    rerender(<Owner {...baseProps} messages={[...older, ...messages]} inGameInfoMap={new Map()} />);

    expect(rowFor('b1').getBoundingClientRect().top).toBe(before);
    expect(scroller().scrollTop).not.toBe(scroller().scrollHeight - VIEWPORT);
  });

  it('follows the newest line while the reader is at the tail', () => {
    const { rerender } = render(<Owner {...baseProps} messages={messages} inGameInfoMap={new Map()} />);
    layout();
    scrollToEnd();
    const el = scroller();
    expect(el.scrollTop).toBe(el.scrollHeight - VIEWPORT);

    rerender(<Owner {...baseProps} inGameInfoMap={new Map()} messages={[...messages, msg('n1', 'Moon#2', 300000, 'one more')]} />);
    // pinned to the end of a list that just grew by a row
    expect(el.scrollTop).toBe(el.scrollHeight);
  });

  it('leaves the scroll alone when a line arrives while the reader is up the list', () => {
    const { rerender } = render(<Owner {...baseProps} messages={messages} inGameInfoMap={new Map()} />);
    layout();
    scrollTo(100);
    const el = scroller();

    rerender(<Owner {...baseProps} inGameInfoMap={new Map()} messages={[...messages, msg('n1', 'Moon#2', 300000, 'one more')]} />);
    // the new row went on the end, below the viewport: nothing moved
    expect(el.scrollTop).toBe(100);
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

    // no game rows: the stream is messages, bot replies and system lines
    expect(screen.queryByText('FINISHED')).toBeNull();
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

  it('keeps games out of the stream entirely: they belong to the game activity panel', () => {
    renderPanel();
    expect(document.querySelectorAll('[data-ticker]')).toHaveLength(0);
    expect(document.querySelector('[data-game-run]')).toBeNull();
    expect(screen.queryByText('FINISHED')).toBeNull();
    expect(screen.queryByText(/won 20:00 on Ferocity/)).toBeNull();
    expect(screen.queryByText(/started on Royal Gardens/)).toBeNull();
    // the talk is all that is left
    expect(screen.getByText('hola')).toBeInTheDocument();
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
    layout();
    await waitForCentred('b1');
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
    await waitFor(() => expect(document.getElementById('msg-a1')).not.toBeNull());
    layout();
    await waitForCentred('a1');
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
    expect(document.getElementById('msg-old1')).toBeNull();
    windowId = 1;
    rerender(view());
    await waitFor(() => expect(document.getElementById('msg-old1')).not.toBeNull());
    layout();
    await waitForCentred('old1');
    expect(loadWindow).toHaveBeenCalledTimes(1);
  });

  it('scrolls straight to a loaded message without touching the window', async () => {
    const loadWindow = vi.fn(async () => messages);
    renderPanel({ loadWindow, permalinkId: 'b1', permalinkAt: '2026-09-22 11:00:00' });
    layout();
    await waitForCentred('b1');
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

  it('filters the stream by author name or text, counts the hits, hides system rows, and clears from the × or Esc', () => {
    renderPanel();
    expect(document.querySelectorAll('[data-variant="feed"]').length).toBe(3);

    fireEvent.change(field(), { target: { value: 'HOLA' } });
    expect(screen.getByRole('search', { name: 'Filter messages' })).toHaveAttribute('data-search-active', 'true');
    expect(document.querySelector('[data-found-count]')).toHaveTextContent('1 found');
    expect(groups()).toEqual(['Moon']);
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
    scrollUp(); // reaching the head pages nothing while a query is set
    expect(loadOlder).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Load earlier messages'));
    await waitFor(() => expect(loadOlder).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    scrollTo(90);
    await waitFor(() => expect(loadOlder).toHaveBeenCalledTimes(2));
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
    scrollUp();
    expect(document.querySelector('[data-latest-pill]')).toBeNull();
    rerender(<Owner {...baseProps} messages={later(1)} inGameInfoMap={new Map()} />);
    expect(document.querySelector('[data-latest-pill]')).toHaveAttribute('data-latest-pill', 'new');
    expect(document.querySelector('[data-latest-pill]')).toHaveTextContent('↓ 1 new');
    rerender(<Owner {...baseProps} messages={later(2)} inGameInfoMap={new Map()} />);
    expect(document.querySelector('[data-latest-pill]')).toHaveTextContent('↓ 2 new');

    // the whole list is loaded, so the pill is one scroll to the end
    act(() => fireEvent.click(document.querySelector('[data-latest-pill]')));
    const el = scroller();
    expect(el.scrollTop).toBe(el.scrollHeight);
    expect(document.querySelector('[data-latest-pill]')).toBeNull();
  });

  it('on mobile shows "Latest" whenever the viewport is off the bottom', () => {
    const { rerender } = renderPanel({ isMobile: true });
    expect(document.querySelector('[data-latest-pill]')).toBeNull();
    scrollUp();
    expect(document.querySelector('[data-latest-pill]')).toHaveTextContent('↓ Latest');
    rerender(<Owner {...baseProps} isMobile messages={later(1)} inGameInfoMap={new Map()} />);
    expect(document.querySelector('[data-latest-pill]')).toHaveTextContent('↓ 1 new');
  });
});

describe('ChatPanel last read', () => {
  beforeEach(() => {
    localStorage.clear();
    resetLastReadThrottle();
  });

  it('marks where the last visit stopped, and offers the trip back while it is off screen', async () => {
    // the reader last saw Grubby's second line; several messages have landed
    saveLastRead({ id: 'a2', sentAt: iso(30000) }, { force: true });
    const since = Array.from({ length: 4 }, (_, i) => msg(`s${i}`, 'Sok#4', 300000 + i * 60000, `since ${i}`));
    renderPanel({ messages: [...messages, ...since] });

    const marker = screen.getByText('new');
    expect(marker).toBeInTheDocument();
    // it sits on the first row the reader has not seen, not at the end
    const markerRow = marker.closest('[data-row-key]');
    expect(markerRow.querySelector('[id="msg-b1"]')).not.toBeNull();

    // the stream opens at the bottom, so the marker is above the viewport
    scrollToEnd();
    const jump = document.querySelector('[data-unread-jump]');
    expect(jump).toHaveTextContent('Where you left off');
    fireEvent.click(jump);
    // aligned to the top of the viewport, not centred
    await waitFor(() => expect(scroller().scrollTop).toBe(markerRow.offsetTop));
  });

  it('shows no marker when nothing arrived since the last visit', () => {
    saveLastRead({ id: 'c1', sentAt: iso(90000) }, { force: true });
    renderPanel();
    expect(screen.queryByText('new')).toBeNull();
    expect(document.querySelector('[data-unread-jump]')).toBeNull();
  });

  it('keeps following the reader: the newest line at the bottom is stored', () => {
    renderPanel();
    scrollToEnd();
    expect(loadLastRead().id).toBe('c1');
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

// detectUnfurl builds a fresh target object on every render. Keying the
// lookup on it meant every re-render of the panel blanked every card on
// screen and took ~110px out of the stream, then put it back.
describe('ChatPanel unfurl stability', () => {
  const withClip = (extra = []) => [
    ...messages,
    msg('u1', 'Moon#2', 120000, 'clip https://clips.twitch.tv/Slug-1'),
    ...extra,
  ];

  beforeEach(() => {
    globalThis.fetch.mockImplementation(async (url) => {
      if (String(url).includes('/api/twitch/clip/')) {
        return { ok: true, json: async () => ({ title: 'Insane hold', thumbnail_url: 'https://t/c.jpg', broadcaster_name: 'Grubby', url: 'https://clips.twitch.tv/Slug-1' }) };
      }
      return { ok: false, json: async () => ({}) };
    });
  });

  it('holds the card through a re-render instead of blanking it', async () => {
    const { rerender } = render(<Owner {...baseProps} messages={withClip()} inGameInfoMap={new Map()} />);
    const card = await screen.findByTestId('unfurl-card');

    rerender(
      <Owner {...baseProps} inGameInfoMap={new Map()} messages={withClip([msg('n3', 'Lyn#9', 180000, 'unrelated')])} />
    );
    await act(async () => {});

    // the same node, not one that went away and came back
    expect(screen.getByTestId('unfurl-card')).toBe(card);
    expect(screen.queryByTestId('unfurl-pending')).toBeNull();
  });

  it('reserves the card height while the lookup is in flight', () => {
    render(<Owner {...baseProps} messages={withClip()} inGameInfoMap={new Map()} />);
    expect(screen.getByTestId('unfurl-pending')).toBeTruthy();
  });
});
