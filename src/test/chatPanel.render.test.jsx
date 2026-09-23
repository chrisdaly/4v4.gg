import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Render every row eagerly: happy-dom has no layout, so the real Virtuoso
// would measure a 0px viewport and render nothing. This exercises the same
// itemContent/Header/Footer wiring the real list uses.
vi.mock('react-virtuoso', () => ({
  Virtuoso: React.forwardRef(function FakeVirtuoso({ data, itemContent, components, context, firstItemIndex = 0, computeItemKey }, ref) {
    React.useImperativeHandle(ref, () => ({ scrollToIndex: () => {} }));
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

afterEach(() => {
  cleanup();
  localStorage.clear();
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
    expect(screen.getByText('Today')).toBeInTheDocument();
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
