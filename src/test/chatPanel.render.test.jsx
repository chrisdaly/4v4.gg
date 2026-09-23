import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Render every row eagerly: happy-dom has no layout, so the real Virtuoso
// would measure a 0px viewport and render nothing. This exercises the same
// itemContent/Header/Footer wiring the real list uses. rangeChanged fires
// once per data change with the whole list "visible" (no boxes to measure),
// which is what the sticky day bar falls back to.
const scrollToIndex = vi.fn();
vi.mock('react-virtuoso', () => ({
  Virtuoso: React.forwardRef(function FakeVirtuoso({ data, itemContent, components, context, firstItemIndex = 0, computeItemKey, rangeChanged }, ref) {
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

const T0 = Date.parse('2026-09-23T12:00:00Z');
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

describe('ChatPanel rows', () => {
  it('renders groups, system rows, game rows, bot rows, translations and chips, with no header', () => {
    renderPanel();

    expect(screen.getByText('Connected to channel')).toBeInTheDocument();
    expect(screen.getByText('Grubby')).toBeInTheDocument();
    expect(screen.getByText('!stats moon')).toBeInTheDocument();
    expect(screen.getByText('http://example.com')).toBeInTheDocument();
    expect(screen.getByText('Moon: 1800 MMR')).toBeInTheDocument();
    expect(screen.getByText('orphan')).toBeInTheDocument();
    expect(screen.getByText('hello')).toBeInTheDocument();
    expect(screen.getByText('1900 MMR')).toBeInTheDocument();
    expect(screen.getByText('Load earlier messages')).toBeInTheDocument();
    expect(screen.getAllByText('Today')).toHaveLength(2); // in-list divider + sticky day bar
    expect(document.getElementById('msg-a1')).not.toBeNull();
    expect(document.getElementById('msg-a2')).not.toBeNull();

    // No header: no title, no toggle pills, no status badge
    expect(screen.queryByText('4v4 Chat')).toBeNull();
    expect(screen.queryByTitle('Search chat history')).toBeNull();
    expect(screen.queryByTitle(/game tickers/)).toBeNull();
    expect(screen.queryByTitle(/Focus mode/)).toBeNull();
    expect(screen.queryByTitle(/relay:/)).toBeNull();
    expect(screen.queryByTitle(/pulse column/)).toBeNull();

    // Grubby's two lines share one group (one avatar column for both)
    const grubbyGroup = document.getElementById('msg-a1').closest('[data-variant="feed"]');
    expect(grubbyGroup).toContainElement(document.getElementById('msg-a2'));

    // In-game chip while playing, won/lost chips in the post-game window
    expect(screen.getByText('in game 5m')).toHaveAttribute('data-chip', 'ingame');
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

  it("shows each sender's local time from their profile country", () => {
    renderPanel();
    // Moon's profile says KR: 12:01Z is 9:01p in Seoul
    const moon = document.getElementById('msg-b1').closest('[data-variant="feed"]');
    expect(moon.querySelector('[data-local-time]')).toHaveTextContent('9:01p local');
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

  it('opens the game from an in-game chip and keeps won/lost chips inert', () => {
    const onOpenGame = vi.fn();
    renderPanel({ onOpenGame });
    const chip = screen.getByText('in game 5m');
    expect(chip.tagName).toBe('BUTTON');
    fireEvent.click(chip);
    expect(onOpenGame).toHaveBeenCalledTimes(1);
    expect(onOpenGame.mock.calls[0][0]).toMatchObject({ matchId: 'm2', mapName: 'Ferocity' });
    expect(screen.getByText('lost -9').tagName).toBe('SPAN');
    cleanup();
    renderPanel();
    expect(screen.getByText('in game 5m').tagName).toBe('SPAN');
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

describe('ChatPanel search', () => {
  // Relay rows are snake_case; the panel normalizes them
  const row = (id, tag, receivedAt, text) => ({
    id, user_name: tag.split('#')[0], clan_tag: '', battle_tag: tag, message: text,
    sent_at: `${receivedAt.replace(' ', 'T')}.000Z`, received_at: receivedAt,
  });
  const hits = [
    row('s1', 'Moon#2', '2026-09-23 11:00:00', 'hola from moon'),
    row('s2', 'Grubby#1', '2026-09-22 09:30:00', 'HOLA again'),
  ];
  let fetchMock;
  const searchCalls = () => fetchMock.mock.calls.map((c) => String(c[0])).filter((u) => u.includes('/api/chat/search'));
  const lastSearchParams = () => new URLSearchParams(searchCalls().at(-1).split('?')[1]);

  beforeEach(() => {
    window.history.replaceState(null, '', '/chat');
    fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const u = String(url);
      if (u.includes('/api/chat/search')) {
        const sp = new URLSearchParams(u.split('?')[1]);
        const offset = Number(sp.get('offset') || 0);
        return { ok: true, json: async () => ({ results: offset === 0 ? hits : [row('s3', 'Moon#2', '2026-09-20 08:00:00', 'hola three')], total: 3, offset, limit: 50 }) };
      }
      return { ok: true, json: async () => ({}) };
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    window.history.replaceState(null, '', '/');
  });

  it('is closed until the owner opens it, then searches with a debounce, renders transcript rows with the term marked, syncs the URL and switches range', async () => {
    renderPanel();
    expect(screen.queryByLabelText('Search messages')).toBeNull();
    fireEvent.click(screen.getByText('toggle search'));
    expect(screen.getByText(/Search messages, filter by player/)).toBeInTheDocument();
    expect(screen.queryByTestId('virtuoso')).toBeNull();

    fireEvent.change(screen.getByLabelText('Search messages'), { target: { value: 'hola' } });
    // skeletons until the debounced request lands
    expect(screen.getAllByTestId('search-skeleton').length).toBeGreaterThan(0);
    expect(searchCalls()).toHaveLength(0);
    await waitFor(() => expect(screen.getByText('3 results')).toBeInTheDocument());
    expect(searchCalls()).toHaveLength(1);
    expect(Object.fromEntries(lastSearchParams())).toEqual({ q: 'hola', since: '7d', limit: '50', offset: '0' });
    expect(window.location.search).toBe('?q=hola&since=7d');

    // transcript variant, one row per hit, day dividers between days, term highlighted
    expect(document.querySelectorAll('[data-variant="transcript"]')).toHaveLength(2);
    const s1 = document.getElementById('msg-s1');
    expect(s1).toHaveTextContent('hola from moon');
    expect(s1.querySelector('span span')).toHaveTextContent('hola');
    expect(document.getElementById('msg-s2').textContent).toContain('HOLA again');
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Yesterday')).toBeInTheDocument();

    // range pills
    const pill7d = screen.getByRole('button', { name: '7d' });
    expect(pill7d).toHaveAttribute('data-active', 'true');
    fireEvent.click(screen.getByRole('button', { name: '30d' }));
    await waitFor(() => expect(searchCalls()).toHaveLength(2));
    expect(lastSearchParams().get('since')).toBe('30d');
    expect(screen.getByRole('button', { name: '30d' })).toHaveAttribute('data-active', 'true');
    expect(pill7d).toHaveAttribute('data-active', 'false');
    await waitFor(() => expect(window.location.search).toBe('?q=hola&since=30d'));

    // Esc asks the owner to close the panel, which clears the URL and brings the stream back
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(searchToggle).toHaveBeenLastCalledWith(false);
    expect(screen.getByTestId('virtuoso')).toBeInTheDocument();
    expect(window.location.search).toBe('');
  });

  it('asks the owner to open from ?q=&player=&since= on load and filters by player with suggestions', async () => {
    window.history.replaceState(null, '', '/chat?q=gg&player=Moon%232&since=all');
    renderPanel();
    expect(searchToggle).toHaveBeenCalledWith(true);
    expect(screen.getByLabelText('Search messages')).toHaveValue('gg');
    expect(screen.getByLabelText('Filter by player')).toHaveValue('Moon#2');
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('data-active', 'true');
    await waitFor(() => expect(searchCalls()).toHaveLength(1));
    expect(Object.fromEntries(lastSearchParams())).toEqual({ q: 'gg', player: 'Moon#2', since: 'all', limit: '50', offset: '0' });

    // player field suggests online users by name prefix; picking one sets the full tag
    const player = screen.getByLabelText('Filter by player');
    fireEvent.focus(player);
    fireEvent.change(player, { target: { value: 'gr' } });
    const option = await screen.findByRole('option', { name: 'Grubby' });
    fireEvent.click(option);
    expect(player).toHaveValue('Grubby#1');
    expect(screen.queryByRole('option')).toBeNull();
    await waitFor(() => expect(lastSearchParams().get('player')).toBe('Grubby#1'));
    expect(window.location.search).toBe('?q=gg&player=Grubby%231&since=all');

    // a name inside a result narrows to that author instead of jumping
    await waitFor(() => expect(document.getElementById('msg-s1')).not.toBeNull());
    fireEvent.click(screen.getByRole('button', { name: 'Moon' }));
    expect(player).toHaveValue('Moon#2');
    expect(scrollToIndex).not.toHaveBeenCalled();
  });

  it('does not ask to open when the URL carries no search', () => {
    renderPanel();
    expect(searchToggle).not.toHaveBeenCalled();
  });

  it('pages with More until every result is in', async () => {
    renderPanel({ initialSearchOpen: true });
    fireEvent.change(screen.getByLabelText('Search messages'), { target: { value: 'hola' } });
    const more = await screen.findByRole('button', { name: 'More' });
    fireEvent.click(more);
    await waitFor(() => expect(document.getElementById('msg-s3')).not.toBeNull());
    expect(lastSearchParams().get('offset')).toBe('2');
    expect(document.querySelectorAll('[data-variant="transcript"]')).toHaveLength(3);
    expect(screen.queryByRole('button', { name: 'More' })).toBeNull();
  });

  it('jumps straight to a hit that is already in the stream and closes the panel', async () => {
    const loadWindow = vi.fn();
    fetchMock.mockImplementation(async () => ({ ok: true, json: async () => ({ results: [row('b1', 'Moon#2', '2026-09-23 12:01:00', 'hola')], total: 1, offset: 0, limit: 50 }) }));
    renderPanel({ loadWindow, initialSearchOpen: true });
    fireEvent.change(screen.getByLabelText('Search messages'), { target: { value: 'hola' } });
    const hit = await screen.findByTitle('Jump to message');
    fireEvent.click(hit);
    expect(searchToggle).toHaveBeenLastCalledWith(false);
    await waitFor(() => expect(scrollToIndex).toHaveBeenCalled());
    expect(loadWindow).not.toHaveBeenCalled();
    expect(screen.getByTestId('virtuoso')).toBeInTheDocument();
    expect(document.getElementById('msg-b1')).toHaveStyle({ background: 'rgba(252, 219, 51, 0.14)' });
  });

  it('reloads the window around a hit outside the stream, then jumps once it arrives', async () => {
    const old = msg('old1', 'Moon#2', -5 * 86400000, 'hola from the archive', { receivedAt: '2026-09-18 12:00:00' });
    fetchMock.mockImplementation(async () => ({ ok: true, json: async () => ({ results: [row('old1', 'Moon#2', '2026-09-18 12:00:00', 'hola from the archive')], total: 1, offset: 0, limit: 50 }) }));
    const loadWindow = vi.fn();
    function WindowHarness() {
      const [state, setState] = React.useState({ msgs: messages, windowId: 0, mode: 'live' });
      const load = React.useCallback(async (before) => {
        loadWindow(before);
        const loaded = [old, msg('old2', 'Grubby#1', -5 * 86400000 + 60000, 'later', { receivedAt: '2026-09-18 12:01:00' })];
        setState((s) => ({ msgs: loaded, windowId: s.windowId + 1, mode: 'archive' }));
        return loaded;
      }, []);
      return (
        <Owner
          {...baseProps}
          initialSearchOpen
          messages={state.msgs}
          inGameInfoMap={new Map()}
          gameEvents={[]}
          loadWindow={load}
          loadLatest={async () => messages}
          windowMode={state.mode}
          windowId={state.windowId}
        />
      );
    }
    render(<WindowHarness />);
    fireEvent.change(screen.getByLabelText('Search messages'), { target: { value: 'hola' } });
    fireEvent.click(await screen.findByTitle('Jump to message'));
    await waitFor(() => expect(loadWindow).toHaveBeenCalledTimes(1));
    // one second past the hit's received_at, in the relay's cursor format
    expect(loadWindow.mock.calls[0][0]).toBe('2026-09-18 12:00:01');
    await waitFor(() => expect(scrollToIndex).toHaveBeenCalled());
    expect(document.getElementById('msg-old1')).toHaveStyle({ background: 'rgba(252, 219, 51, 0.14)' });
    expect(screen.getByText('Back to live')).toBeInTheDocument();
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
