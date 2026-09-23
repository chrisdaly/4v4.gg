import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
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
        sendMessage={() => {}}
        loadOlder={() => Promise.resolve({ added: 0 })}
        hasMoreHistory
        {...overrides}
      />
    </MemoryRouter>
  );
}

beforeEach(() => {
  scrollToIndex.mockClear();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  document.body.classList.remove('chat-focus');
});

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
            sendMessage={() => {}}
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
    expect(globalThis.fetch.mock.calls[0][0]).toMatch(/\/api\/chat\/stats$/);
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
            sendMessage={() => {}}
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
