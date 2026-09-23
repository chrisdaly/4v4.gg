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
          <div key={computeItemKey(firstItemIndex + i, row)} data-index={firstItemIndex + i}>
            {itemContent(firstItemIndex + i, row, context)}
          </div>
        ))}
        {Footer && <Footer context={context} />}
      </div>
    );
  }),
}));

import ChatPanel from '../components/ChatPanel';
import { resetTodayDigestCache } from '../lib/chat/digestToday';
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

function renderPanel(overrides = {}) {
  return render(
    <MemoryRouter>
      <ChatPanel
        messages={messages}
        status="connected"
        avatars={avatars}
        stats={stats}
        sessions={new Map()}
        inGameTags={new Set(['Moon#2'])}
        inGameInfoMap={new Map([['Moon#2', { mapName: 'Ferocity', startTime: fiveMinutesAgo(), matchId: 'm2' }]])}
        recentWinners={new Set(['Grubby#1'])}
        recentDeltas={new Map([['Watched#3', -9]])}
        gameEvents={gameEvents}
        ongoingMatchIds={new Set(['m2'])}
        liveStreamers={new Map([['Grubby#1', { twitchName: 'grubby', title: 'live', viewerCount: 3 }]])}
        watchList={new Set(['watched#3'])}
        onlineUsers={[{ battleTag: 'Grubby#1', name: 'Grubby' }]}
        botResponses={botResponses}
        translations={translations}
        loadOlder={() => Promise.resolve({ added: 0 })}
        hasMoreHistory
        {...overrides}
      />
    </MemoryRouter>
  );
}

// Every mount asks the relay for today's digest; keep that off the network
// unless a test installs its own fetch mock
beforeEach(() => {
  scrollToIndex.mockClear();
  resetTodayDigestCache();
  resetNotifyThrottle();
  resetUnfurlCache();
  if (!vi.isMockFunction(globalThis.fetch)) {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, json: async () => ({}) });
  }
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  document.body.classList.remove('chat-focus');
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

describe('ChatPanel rows', () => {
  it('renders groups, system rows, tickers, bot rows, translations and chips', () => {
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
    expect(screen.getByText('5')).toBeInTheDocument(); // header message count

    // Grubby's two lines share one group (one avatar column for both)
    const grubbyGroup = document.getElementById('msg-a1').closest('[data-variant="feed"]');
    expect(grubbyGroup).toContainElement(document.getElementById('msg-a2'));

    // In-game chip while playing, won/lost chips in the post-game window
    expect(screen.getByText('in game 5m')).toHaveAttribute('data-chip', 'ingame');
    expect(screen.getByText('lost -9')).toHaveAttribute('data-chip', 'lost');
    expect(screen.getByText('won')).toHaveAttribute('data-chip', 'won');
    expect(screen.getByTitle('live')).toHaveAttribute('href', 'https://twitch.tv/grubby');

    // Game events are one-line tickers until clicked
    expect(screen.getByText('Finished')).toBeInTheDocument();
    expect(screen.getByText('Live')).toBeInTheDocument();
    expect(screen.getByText('Moon won 20:00 on Ferocity, +12 avg')).toBeInTheDocument();
    expect(screen.getByText('Moon +3 started on Royal Gardens, 1847 avg')).toBeInTheDocument();
    expect(screen.queryByText('close one')).toBeNull();
    fireEvent.click(screen.getByText('Finished'));
    expect(screen.getByText('close one')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Finished'));
    expect(screen.queryByText('close one')).toBeNull();
  });

  it('hides tickers when the Games toggle is off and remembers it', () => {
    renderPanel();
    const games = screen.getByTitle('Hide game tickers');
    expect(games).toHaveAttribute('data-active', 'true');
    fireEvent.click(games);
    expect(screen.queryByText('Finished')).toBeNull();
    expect(screen.getByText('hola')).toBeInTheDocument();
    expect(localStorage.getItem('chat:showGames')).toBe('0');
  });

  it('shows relay faults instead of a generic reconnecting state', () => {
    renderPanel({ status: 'auth_failed' });
    expect(screen.getByText('relay auth failed')).toBeInTheDocument();
    cleanup();
    renderPanel({ status: 'banned' });
    expect(screen.getByText('relay banned')).toBeInTheDocument();
    cleanup();
    renderPanel({ status: 'reconnecting' });
    expect(screen.getByText('Reconnecting...')).toBeInTheDocument();
  });
});

describe('ChatPanel focus mode', () => {
  it('toggles body.chat-focus, compacts the feed, hides tickers and exits on Esc', () => {
    renderPanel();
    expect(document.body.classList.contains('chat-focus')).toBe(false);
    expect(screen.getByText('Finished')).toBeInTheDocument();

    const focus = screen.getByTitle(/Focus mode/);
    fireEvent.click(focus);
    expect(document.body.classList.contains('chat-focus')).toBe(true);
    expect(localStorage.getItem('chat:focus')).toBe('1');
    expect(screen.getByTitle('Exit focus mode (Esc)')).toHaveAttribute('data-active', 'true');
    // tickers hidden without touching the Games preference
    expect(screen.queryByText('Finished')).toBeNull();
    expect(screen.getByTitle('Hide game tickers')).toHaveAttribute('data-active', 'true');
    expect(localStorage.getItem('chat:showGames')).toBeNull();
    // groups render compact
    const grubbyGroup = document.getElementById('msg-a1').closest('[data-variant="feed"]');
    expect(grubbyGroup).toHaveAttribute('data-compact', 'true');

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(document.body.classList.contains('chat-focus')).toBe(false);
    expect(localStorage.getItem('chat:focus')).toBe('1'); // Esc exits the session, the persisted pref is untouched
    expect(screen.getByText('Finished')).toBeInTheDocument();
    expect(grubbyGroup).not.toHaveAttribute('data-compact');
  });

  it('restores Focus from localStorage and clears the class on unmount', () => {
    localStorage.setItem('chat:focus', '1');
    const { unmount } = renderPanel();
    expect(document.body.classList.contains('chat-focus')).toBe(true);
    unmount();
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
    // Esc closes the popover first; a second Esc would exit Focus
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

  it('searches with a debounce, renders transcript rows with the term marked, syncs the URL and switches range', async () => {
    renderPanel();
    fireEvent.click(screen.getByTitle('Search chat history'));
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

    // closing the panel clears the URL and brings the stream back
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByTestId('virtuoso')).toBeInTheDocument();
    expect(window.location.search).toBe('');
  });

  it('opens from ?q=&player=&since= on load and filters by player with suggestions', async () => {
    window.history.replaceState(null, '', '/chat?q=gg&player=Moon%232&since=all');
    renderPanel();
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

  it('pages with More until every result is in', async () => {
    renderPanel();
    fireEvent.click(screen.getByTitle('Search chat history'));
    fireEvent.change(screen.getByLabelText('Search messages'), { target: { value: 'hola' } });
    const more = await screen.findByRole('button', { name: 'More' });
    fireEvent.click(more);
    await waitFor(() => expect(document.getElementById('msg-s3')).not.toBeNull());
    expect(lastSearchParams().get('offset')).toBe('2');
    expect(document.querySelectorAll('[data-variant="transcript"]')).toHaveLength(3);
    expect(screen.queryByRole('button', { name: 'More' })).toBeNull();
  });

  it('jumps straight to a hit that is already in the stream', async () => {
    const loadWindow = vi.fn();
    fetchMock.mockImplementation(async () => ({ ok: true, json: async () => ({ results: [row('b1', 'Moon#2', '2026-09-23 12:01:00', 'hola')], total: 1, offset: 0, limit: 50 }) }));
    renderPanel({ loadWindow });
    fireEvent.click(screen.getByTitle('Search chat history'));
    fireEvent.change(screen.getByLabelText('Search messages'), { target: { value: 'hola' } });
    const hit = await screen.findByTitle('Jump to message');
    fireEvent.click(hit);
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
        <MemoryRouter>
          <ChatPanel
            messages={state.msgs}
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
                loadOlder={() => Promise.resolve({ added: 0 })}
            hasMoreHistory
            loadWindow={load}
            loadLatest={async () => messages}
            windowMode={state.mode}
            windowId={state.windowId}
          />
        </MemoryRouter>
      );
    }
    render(<WindowHarness />);
    fireEvent.click(screen.getByTitle('Search chat history'));
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

  it('is off by default, toggles from the header pill, persists and fetches /api/chat/stats', async () => {
    let resolveStats;
    globalThis.fetch.mockImplementation(async (url) => {
      if (String(url).endsWith('/api/chat/stats')) {
        return new Promise((resolve) => { resolveStats = () => resolve({ ok: true, json: async () => statsPayload }); });
      }
      return { ok: false, json: async () => ({}) };
    });
    renderPanel();
    expect(screen.queryByTestId('stats-strip')).toBeNull();
    const pill = screen.getByTitle('Show chat stats');
    expect(pill).toHaveAttribute('data-active', 'false');
    fireEvent.click(pill);
    expect(localStorage.getItem('chat:showStats')).toBe('1');
    expect(screen.getByTitle('Hide chat stats')).toHaveAttribute('data-active', 'true');
    // skeleton until the relay answers
    const strip = screen.getByTestId('stats-strip');
    expect(strip).toHaveAttribute('aria-busy', 'true');
    expect(globalThis.fetch.mock.calls.filter((c) => String(c[0]).endsWith('/api/chat/stats'))).toHaveLength(1);

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

    fireEvent.click(screen.getByTitle('Hide chat stats'));
    expect(screen.queryByTestId('stats-strip')).toBeNull();
    expect(localStorage.getItem('chat:showStats')).toBe('0');
  });

  it('restores the strip from localStorage', () => {
    localStorage.setItem('chat:showStats', '1');
    renderPanel();
    expect(screen.getByTestId('stats-strip')).toBeInTheDocument();
  });
});

describe('ChatPanel digest pill', () => {
  it('links to today\'s digest on /news when the relay has one', async () => {
    globalThis.fetch.mockImplementation(async (url) => {
      if (String(url).includes('/api/admin/stats/today')) {
        return { ok: true, json: async () => ({ date: '2026-09-23', digest: '# Today\nstuff' }) };
      }
      return { ok: false, json: async () => ({}) };
    });
    renderPanel();
    const pill = await screen.findByTitle("Today's digest on /news");
    expect(pill).toHaveAttribute('href', '/news?day=2026-09-23');
    expect(pill).toHaveTextContent('Digest');
    expect(globalThis.fetch.mock.calls.filter((c) => String(c[0]).includes('/api/admin/stats/today'))).toHaveLength(1);

    // module-scope cache: a second mount does not re-ask
    cleanup();
    renderPanel();
    await screen.findByTitle("Today's digest on /news");
    expect(globalThis.fetch.mock.calls.filter((c) => String(c[0]).includes('/api/admin/stats/today'))).toHaveLength(1);
  });

  it('is hidden when there is no digest for today', async () => {
    globalThis.fetch.mockImplementation(async (url) => {
      if (String(url).includes('/api/admin/stats/today')) {
        return { ok: true, json: async () => ({ date: '2026-09-23', digest: null }) };
      }
      return { ok: false, json: async () => ({}) };
    });
    renderPanel();
    await waitFor(() => expect(globalThis.fetch.mock.calls.some((c) => String(c[0]).includes('/api/admin/stats/today'))).toBe(true));
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByTitle("Today's digest on /news")).toBeNull();
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

  it('asks for permission only when Ping is switched on, and only notifies while hidden and granted', () => {
    harness(new Set(['watched#3']));
    expect(requestPermission).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTitle('Ping when watched players chat'));
    expect(requestPermission).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('chat:notify')).toBe('1');

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

    // switching Ping off does not ask again; switching on with a decided permission does not either
    fireEvent.click(screen.getByTitle('Mute watched-player pings'));
    fireEvent.click(screen.getByTitle('Ping when watched players chat'));
    expect(requestPermission).toHaveBeenCalledTimes(1);
  });

  it('notifies for a mention of a watched player and not for plain lines', () => {
    permission = 'granted';
    harness(new Set(['watched#3']));
    fireEvent.click(screen.getByTitle('Ping when watched players chat'));
    setHidden(true);
    resetNotifyThrottle();
    fireEvent.click(screen.getByText('plain'));
    expect(created).toHaveLength(0);
    fireEvent.click(screen.getByText('mention'));
    expect(created).toHaveLength(1);
    expect(created[0].title).toBe('Moon in 4v4 chat');
    expect(created[0].options.icon).toBe('/favicon.svg');
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
