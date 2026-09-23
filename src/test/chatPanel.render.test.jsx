import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
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

describe('ChatPanel rows', () => {
  it('renders group starts, continuations, system rows, events, bot rows and translations', () => {
    const messages = [
      msg('sys1', 'system', -100000, 'Connected to channel'),
      msg('a1', 'Grubby#1', 0, '!stats moon'),
      msg('a2', 'Grubby#1', 30000, 'second line http://example.com'),
      msg('b1', 'Moon#2', 60000, 'hola'),
      msg('c1', 'Watched#3', 90000, 'i am starred'),
    ];
    const gameEvents = [{
      id: 'ge-m1', type: 'game_end', time: iso(45000), matchId: 'm1', mapName: 'Ferocity',
      durationInSeconds: 1200, winners: [{ battleTag: 'Moon#2', name: 'Moon', mmr: 1800, inChannel: true }],
      losers: [{ battleTag: 'X#9', name: 'X', mmr: 1700, inChannel: false }], winnersMmr: 1800, losersMmr: 1700,
      note: { text: 'close one', tag: null }, badges: [], rivals: [],
    }];
    const botResponses = [{ command: '!stats', triggeredByTag: 'Grubby#1', response: 'Moon: 1800 MMR', botEnabled: true, time: iso(1000) },
      { command: '!help', triggeredByTag: 'Nobody#0', response: 'orphan', botEnabled: false, time: iso(1000) }];
    const translations = new Map([['b1', 'hello']]);
    const stats = new Map([['Grubby#1', { mmr: 1900.4, race: 2 }]]);
    const avatars = new Map([['Moon#2', { profilePicUrl: 'https://x/pic.jpg', country: 'KR' }]]);

    render(
      <MemoryRouter>
        <ChatPanel
          messages={messages}
          status="connected"
          avatars={avatars}
          stats={stats}
          sessions={new Map()}
          inGameTags={new Set(['Moon#2'])}
          inGameInfoMap={new Map([['Moon#2', { mapName: 'Ferocity', startTime: iso(0), matchId: 'm2' }]])}
          recentWinners={new Set(['Moon#2'])}
          recentDeltas={new Map([['Moon#2', 12]])}
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
        />
      </MemoryRouter>
    );

    expect(screen.getByText('Connected to channel')).toBeInTheDocument();
    expect(screen.getByText('Grubby')).toBeInTheDocument();
    expect(screen.getByText('!stats moon')).toBeInTheDocument();
    expect(screen.getByText('http://example.com')).toBeInTheDocument();
    expect(screen.getByText('Moon: 1800 MMR')).toBeInTheDocument();
    expect(screen.getByText('orphan')).toBeInTheDocument();
    expect(screen.getByText('hello')).toBeInTheDocument();
    expect(screen.getByText('1900')).toBeInTheDocument();
    expect(screen.getByText('+12')).toBeInTheDocument();
    expect(screen.getByText('Finish')).toBeInTheDocument();
    expect(screen.getByText('close one')).toBeInTheDocument();
    expect(screen.getByText('Load earlier messages')).toBeInTheDocument();
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(document.getElementById('msg-a2')).not.toBeNull();
    expect(screen.getByText('5')).toBeInTheDocument(); // header message count
  });
});
