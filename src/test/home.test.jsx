import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { quoteOfTheDay, findQuoteMessage } from '../lib/home/quoteOfTheDay';
import { todayStats } from '../lib/home/todayStats';
import Scoreboard from '../components/home/Scoreboard';
import LiveGamePanel from '../components/home/LiveGamePanel';
import ReadsCarousel from '../components/home/ReadsCarousel';
import StreamerCarousel from '../components/home/StreamerCarousel';

// The live slide enriches players over the network; stub it to a marker
vi.mock('../components/home/LiveGameSlide', () => ({
  default: ({ match, active }) => <div data-slide={match.id} data-active={active ? 'true' : 'false'}>{match.mapName}</div>,
}));

const renderIn = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('quoteOfTheDay', () => {
  it('takes the first attributed quote from BEST_OF_CHAT, then DRAMA_QUOTES, then DRAMA, with the speaker tag from MENTIONS', () => {
    const digest = {
      digest: 'DRAMA: Toast flamed Moon over a tower rush "Toast: you are garbage" "Moon: cry more"\nBEST_OF_CHAT: The zoo line "GosuXtreme: when u enter 4s u entering a zoo"\nMENTIONS: GosuXtreme#2101, Toast#1',
    };
    expect(quoteOfTheDay(digest)).toEqual({ text: 'when u enter 4s u entering a zoo', speaker: 'GosuXtreme', battleTag: 'GosuXtreme#2101', label: 'QUOTE OF THE DAY' });
    const dramaOnly = { digest: 'DRAMA: Toast flamed Moon "Toast: you are garbage"\nDRAMA_QUOTES: "Moon: cry more"' };
    expect(quoteOfTheDay(dramaOnly)).toEqual({ text: 'cry more', speaker: 'Moon', battleTag: null, label: 'QUOTE OF THE DAY' });
    expect(quoteOfTheDay({ digest: 'DRAMA: nothing quoted here' })).toBeNull();
    expect(quoteOfTheDay(null)).toBeNull();
    // A weekly issue row (it carries week_start) is the quote of the week
    expect(quoteOfTheDay({ ...digest, week_start: '2026-09-15' }).label).toBe('QUOTE OF THE WEEK');
  });

  it('finds the message behind a quote through the relay search, retrying with the first four words', async () => {
    const calls = [];
    const fetcher = vi.fn(async (url) => {
      calls.push(url);
      const sp = new URLSearchParams(url.split('?')[1]);
      const hit = sp.get('q') === 'when u enter 4s' ? [{ id: 'm77', received_at: '2026-09-24 11:00:00' }] : [];
      return { ok: true, json: async () => ({ results: hit }) };
    });
    const quote = { text: 'when u enter 4s u entering a zoo', speaker: 'GosuXtreme', battleTag: null };
    expect(await findQuoteMessage(quote, fetcher)).toEqual({ id: 'm77', receivedAt: '2026-09-24 11:00:00' });
    expect(calls).toHaveLength(2);
    const first = new URLSearchParams(calls[0].split('?')[1]);
    expect(first.get('q')).toBe('when u enter 4s u entering a zoo');
    expect(first.get('player')).toBe('GosuXtreme');
    expect(first.get('since')).toBe('all');
    expect(await findQuoteMessage({ text: 'nothing', speaker: 'x' }, async () => ({ ok: false }))).toBeNull();
    expect(await findQuoteMessage(null, fetcher)).toBeNull();
  });

  it('reads a JSON narrative as well and skips unattributed quotes', () => {
    const digest = { digest: '', digestJson: JSON.stringify({ narrative: { bestOfChat: '"just text" "sjow: who wants 4s?"', drama: [] } }) };
    expect(quoteOfTheDay(digest)).toEqual({ text: 'who wants 4s?', speaker: 'sjow', battleTag: null, label: 'QUOTE OF THE DAY' });
  });
});

describe('todayStats', () => {
  it('counts games and distinct players from game starts and walks the roster peak back from now', () => {
    const start = (players) => ({ type: 'game_start', payload: { players: players.map((battleTag) => ({ battleTag })) } });
    const events = [
      { type: 'join', payload: {} },
      start(['a#1', 'b#1']),
      { type: 'leave', payload: {} },
      { type: 'leave', payload: {} },
      start(['b#1', 'c#1']),
      { type: 'game_end', payload: {} },
      { type: 'join', payload: {} },
    ];
    // now: 10 online. Before the last join: 9; before the two leaves: 11 (the peak); before the first join: 10
    expect(todayStats(events, 10)).toEqual({ games: 2, players: 3, peakOnline: 11 });
    expect(todayStats([], 4)).toEqual({ games: 0, players: 0, peakOnline: 4 });
  });
});

describe('Scoreboard', () => {
  it('counts the figures up to their values, shows the quote with its speaker and the call to action', async () => {
    renderIn(
      <Scoreboard
        online={49}
        live={5}
        quote={{ text: 'when u enter 4s u entering a zoo', speaker: 'GosuXtreme', battleTag: 'GosuXtreme#2101' }}
        quoteHref="/chat?m=m77&at=2026-09-24%2011%3A00%3A00"
        profile={{ profilePicUrl: 'https://x/gosu.jpg', country: 'DE' }}
      />
    );
    await waitFor(() => expect(document.querySelector('[data-count="online"]')).toHaveTextContent('49'), { timeout: 3000 });
    await waitFor(() => expect(document.querySelector('[data-count="live"]')).toHaveTextContent('5'), { timeout: 3000 });
    expect(screen.getByText('PLAYERS ONLINE')).toBeInTheDocument();
    expect(screen.getByText('GAMES LIVE')).toBeInTheDocument();
    const quote = document.querySelector('[data-quote]');
    expect(quote).toHaveAttribute('href', '/chat?m=m77&at=2026-09-24%2011%3A00%3A00');
    expect(quote).toHaveAttribute('title', 'Open in the chat');
    expect(quote).toHaveTextContent('“when u enter 4s u entering a zoo”');
    expect(quote).toHaveTextContent('GosuXtreme');
    expect(quote.querySelector('img[src="https://x/gosu.jpg"]')).not.toBeNull();
    expect(quote.querySelector('img[alt="de"]')).not.toBeNull();
    expect(screen.getByRole('link', { name: 'ENTER THE JUNGLE →' })).toHaveAttribute('href', '/chat');
  });

  it('shows 0 and no quote block while there is nothing to say', () => {
    renderIn(<Scoreboard online={0} live={0} quote={null} profile={null} />);
    expect(document.querySelector('[data-count="online"]')).toHaveTextContent('0');
    expect(document.querySelector('[data-quote]')).toBeNull();
    cleanup();
    // before the message is found the quote just opens the chat
    renderIn(<Scoreboard online={1} live={0} quote={{ text: 'gg', speaker: 'Moon', battleTag: null }} profile={null} />);
    expect(document.querySelector('[data-quote]')).toHaveAttribute('href', '/chat');
  });
});

describe('LiveGamePanel', () => {
  const matches = [
    { id: 'm1', mapName: '(4)Deadlock LV' },
    { id: 'm2', mapName: '(4)Arathor' },
    { id: 'm3', mapName: '(4)Ferocity' },
  ];

  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('shows the highest-rated game first, rotates every rotateSeconds, and the pager jumps to a game', () => {
    const onSlideChange = vi.fn();
    renderIn(<LiveGamePanel matches={matches} rotateSeconds={6} onSlideChange={onSlideChange} />);
    expect(document.querySelector('[data-slide="m1"]')).toHaveAttribute('data-active', 'true');
    expect(document.querySelector('[data-slide="m2"]')).toHaveAttribute('data-active', 'false');
    expect(document.querySelector('[data-live-caption]')).toHaveTextContent('Game 1 of 3 · highest-rated first');
    expect(onSlideChange).toHaveBeenLastCalledWith(0, matches[0]);
    act(() => vi.advanceTimersByTime(6000));
    expect(document.querySelector('[data-slide="m2"]')).toHaveAttribute('data-active', 'true');
    expect(document.querySelector('[data-live-caption]')).toHaveTextContent('Game 2 of 3');
    expect(onSlideChange).toHaveBeenLastCalledWith(1, matches[1]);
    const bars = screen.getAllByRole('tab');
    expect(bars).toHaveLength(3);
    expect(bars[1]).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(bars[2]);
    expect(document.querySelector('[data-slide="m3"]')).toHaveAttribute('data-active', 'true');
    expect(screen.getByRole('link', { name: 'All live games →' })).toHaveAttribute('href', '/live');
  });

  it('flashes a tagged event on the LIVE NOW bar for 1.7s, then returns to the caption', () => {
    const { rerender } = renderIn(<LiveGamePanel matches={matches} rotateSeconds={60} flash={null} />);
    rerender(
      <MemoryRouter>
        <LiveGamePanel matches={matches} rotateSeconds={60} flash={{ id: 'e1', tag: 'FINISHED', text: 'Arathor · Solana and team +7' }} />
      </MemoryRouter>
    );
    const flash = document.querySelector('[data-live-flash="FINISHED"]');
    expect(flash).toHaveTextContent('FINISHED');
    expect(flash).toHaveTextContent('Arathor · Solana and team +7');
    expect(document.querySelector('[data-live-caption]')).toBeNull();
    act(() => vi.advanceTimersByTime(1700));
    expect(document.querySelector('[data-live-flash]')).toBeNull();
    expect(document.querySelector('[data-live-caption]')).toHaveTextContent('Game 1 of 3');
  });

  it('shows the latest finished game with winners, losers, MVP and note when nothing is live', () => {
    const player = (name, mmrGain, race = 1) => ({ battleTag: `${name}#1`, name, race, mmr: 1800, mmrGain, inChannel: true });
    const finished = {
      event: {
        id: 'ge-1', type: 'game_end', time: new Date(Date.now() - 35 * 60000).toISOString(), matchId: '1', mapName: 'Northmarsh Ruin',
        durationInSeconds: 343, mvp: 'Solana#1',
        winners: [player('Solana', 7), player('sjow', 7)], losers: [player('riggen', -7), player('Toast', -7)],
      },
      note: { text: 'fielded a 94-supply army', tag: 'Solana#1', name: 'Solana' },
    };
    renderIn(<LiveGamePanel matches={[]} finished={finished} />);
    expect(document.querySelector('[data-live-panel]')).toHaveAttribute('data-live-panel', 'empty');
    expect(screen.getByText('FINISHED')).toBeInTheDocument();
    expect(screen.getByText('Northmarsh Ruin')).toBeInTheDocument();
    expect(screen.getByText('5:43 · 35 min ago')).toBeInTheDocument();
    expect(screen.getByText('WINNERS')).toBeInTheDocument();
    expect(screen.getByText('LOSERS')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Solana' })).toHaveAttribute('href', '/player/Solana%231');
    expect(screen.getAllByText('+7')).toHaveLength(2);
    expect(screen.getAllByText('-7')).toHaveLength(2);
    expect(screen.getAllByText('MVP')).toHaveLength(2); // badge on the row, tag on the note
    expect(screen.getByText('fielded a 94-supply army')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'RECENT MATCHES →' })).toHaveAttribute('href', '/finished');
    expect(document.querySelector('[data-live-bar]')).toBeNull();
  });

  it('offers recent matches when there is no finished game to show either', () => {
    renderIn(<LiveGamePanel matches={[]} finished={null} />);
    expect(screen.getByText('No games live right now.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'RECENT MATCHES →' })).toBeInTheDocument();
  });
});

describe('ReadsCarousel', () => {
  const items = [
    { key: 'w', kicker: "THIS WEEK'S ISSUE · No. 14", title: 'Instagram Wars', sub: 'Mar 23 – 29 · Read →', bg: '/a.jpg', href: '/news?week=2026-03-23' },
    { key: 'b', kicker: 'FROM THE BLOG', title: 'How the MMR chart works', sub: 'Sep 20 · Read →', bg: '/b.jpg', href: '/blog/mmr' },
  ];

  it('alternates the items and pins one from its pager bar', () => {
    vi.useFakeTimers();
    renderIn(<ReadsCarousel items={items} rotateSeconds={6} />);
    expect(document.querySelector('[data-read="w"]')).toHaveClass('is-active');
    expect(screen.getByText('Instagram Wars').closest('a')).toHaveAttribute('href', '/news?week=2026-03-23');
    act(() => vi.advanceTimersByTime(6000));
    expect(document.querySelector('[data-read="b"]')).toHaveClass('is-active');
    fireEvent.click(screen.getByRole('button', { name: 'Instagram Wars' }));
    expect(document.querySelector('[data-read="w"]')).toHaveClass('is-active');
    act(() => vi.advanceTimersByTime(12000));
    expect(document.querySelector('[data-read="w"]')).toHaveClass('is-active');
  });

  it('renders nothing without items', () => {
    renderIn(<ReadsCarousel items={[]} />);
    expect(document.querySelector('[data-reads]')).toBeNull();
  });
});

describe('StreamerCarousel', () => {
  it('shows the live 4v4 streamers by viewers with the Twitch preview, position and stream link; nothing when none are live', () => {
    const live = new Map([
      ['Ivan#1', { twitchName: 'ivanooze', title: 'coffee and random team', viewerCount: 57 }],
      ['Solana#1', { twitchName: 'solana', title: '4v4 grind to 2200 | !discord', viewerCount: 412 }],
    ]);
    renderIn(<StreamerCarousel liveStreamers={live} onlineUsers={[{ battleTag: 'Solana#1', name: 'Solana' }]} />);
    const top = document.querySelector('[data-stream="Solana#1"]');
    expect(top).toHaveClass('is-active');
    expect(top).toHaveAttribute('href', '/stream/Solana%231');
    expect(top).toHaveTextContent('Solana');
    expect(top).toHaveTextContent('4v4 grind to 2200 | !discord');
    expect(top).toHaveTextContent('412 watching');
    expect(top).toHaveTextContent('1 / 2');
    expect(top.querySelector('.hm-stream-thumb').style.backgroundImage).toContain('live_user_solana-');
    expect(document.querySelector('[data-stream="Ivan#1"]')).not.toHaveClass('is-active');
    cleanup();
    renderIn(<StreamerCarousel liveStreamers={new Map()} onlineUsers={[]} />);
    expect(document.querySelector('[data-streamers]')).toBeNull();
  });
});
