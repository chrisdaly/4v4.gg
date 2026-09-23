import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import UserListSidebar, { liveGamesFrom } from '../components/UserListSidebar';

const NOW = Date.now();
const minsAgo = (m) => new Date(NOW - m * 60 * 1000).toISOString();
const HOURS_4 = 4 * 60 * 60 * 1000;

const user = (name, extra = {}) => ({ battleTag: `${name}#1`, name, joinedAt: NOW - 60_000, ...extra });

const users = [
  user('Moon'),
  user('Grubby'),
  user('Happy'),
  user('Sleepy', { joinedAt: NOW - HOURS_4 }),
  user('Lyn'),
];

const stats = new Map([
  ['Moon#1', { mmr: 1800.4, race: 4 }],
  ['Grubby#1', { mmr: 1950, race: 2 }],
  ['Happy#1', { mmr: 2100, race: 8 }],
  ['Lyn#1', { mmr: 1700, race: 2 }],
]);
const avatars = new Map([['Moon#1', { profilePicUrl: 'https://x/moon.jpg', country: 'KR' }]]);

const inGameTags = new Set(['Moon#1', 'Lyn#1']);
const inGameInfoMap = new Map([
  ['Moon#1', { mapName: 'Ferocity', startTime: minsAgo(12), matchId: 'm1' }],
  ['Lyn#1', { mapName: 'Royal Gardens', startTime: minsAgo(3), matchId: 'm2' }],
]);
const inGameMatchMap = new Map([
  ['Moon#1', '/player/Moon%231'],
  ['Lyn#1', '/player/Lyn%231'],
]);

function renderSidebar(overrides = {}) {
  return render(
    <MemoryRouter>
      <UserListSidebar
        users={users}
        avatars={avatars}
        stats={stats}
        sessions={new Map()}
        inGameTags={inGameTags}
        inGameInfoMap={inGameInfoMap}
        inGameMatchMap={inGameMatchMap}
        recentWinners={new Set(['Happy#1'])}
        recentDeltas={new Map([['Grubby#1', -9]])}
        liveStreamers={new Map([['Grubby#1', { twitchName: 'grubby', title: 'live' }]])}
        watchList={new Set()}
        onToggleWatch={() => {}}
        recentChatters={new Set(['Grubby#1'])}
        $mobileVisible={false}
        onClose={() => {}}
        {...overrides}
      />
    </MemoryRouter>
  );
}

const rowNames = (sectionId) =>
  [...document.querySelectorAll(`[data-section="${sectionId}"] [data-row]`)].map((el) => el.getAttribute('data-row'));

afterEach(cleanup);

describe('UserListSidebar sections', () => {
  it('splits the roster into in game, online and away with counts', () => {
    renderSidebar();
    expect(screen.getByText('5 online')).toBeInTheDocument();
    expect(rowNames('ingame')).toEqual(['Moon#1', 'Lyn#1']);
    expect(rowNames('online')).toEqual(['Happy#1', 'Grubby#1']);
    expect(rowNames('away')).toEqual(['Sleepy#1']);

    const ingameHeader = within(document.querySelector('[data-section="ingame"]')).getByRole('button', { name: /In game/ });
    expect(ingameHeader).toHaveTextContent('In game 2');
  });

  it('renders rows with avatar, flag, mmr, twitch link and a link for in-game players', () => {
    renderSidebar();
    const moon = document.querySelector('[data-row="Moon#1"]');
    expect(moon.tagName).toBe('A');
    expect(moon).toHaveAttribute('href', '/player/Moon%231');
    expect(moon).toHaveAttribute('title', 'Ferocity · 12m');
    expect(moon.querySelector('img[src="https://x/moon.jpg"]')).not.toBeNull();
    expect(moon.querySelector('img[alt="KR"], img[src*="kr"]')).not.toBeNull();
    expect(within(moon).getByText('1800')).toBeInTheDocument();

    const grubby = document.querySelector('[data-row="Grubby#1"]');
    expect(grubby.tagName).toBe('DIV');
    expect(within(grubby).getByTitle('live')).toHaveAttribute('href', 'https://twitch.tv/grubby');
  });

  it('dims away rows and quiet online rows, never recent chatters', () => {
    renderSidebar();
    expect(document.querySelector('[data-row="Sleepy#1"]')).toHaveAttribute('data-dim', 'idle');
    expect(document.querySelector('[data-row="Happy#1"]')).toHaveAttribute('data-dim', 'quiet');
    expect(document.querySelector('[data-row="Grubby#1"]')).not.toHaveAttribute('data-dim');
  });

  it('collapses a section on header click', () => {
    renderSidebar();
    fireEvent.click(screen.getByRole('button', { name: /Online/ }));
    expect(rowNames('online')).toEqual([]);
    expect(rowNames('ingame')).toEqual(['Moon#1', 'Lyn#1']);
    fireEvent.click(screen.getByRole('button', { name: /Online/ }));
    expect(rowNames('online')).toEqual(['Happy#1', 'Grubby#1']);
  });

  it('shows skeleton rows while the roster is empty', () => {
    renderSidebar({ users: [] });
    expect(screen.getByText('0 online')).toBeInTheDocument();
    expect(document.querySelectorAll('[data-row]').length).toBe(0);
    expect(document.querySelectorAll('[data-section]').length).toBe(0);
  });
});

describe('UserListSidebar chips', () => {
  it('uses the shared chip: in game with elapsed, lost with delta, won without', () => {
    renderSidebar();
    const chipOf = (tag) => document.querySelector(`[data-row="${tag}"] [data-chip]`);
    expect(chipOf('Moon#1')).toHaveTextContent('in game 12m');
    expect(chipOf('Moon#1')).toHaveAttribute('data-chip', 'ingame');
    expect(chipOf('Grubby#1')).toHaveTextContent('lost -9');
    expect(chipOf('Grubby#1')).toHaveAttribute('data-chip', 'lost');
    expect(chipOf('Happy#1')).toHaveTextContent('won');
    expect(chipOf('Happy#1')).toHaveAttribute('data-chip', 'won');
    expect(chipOf('Sleepy#1')).toBeNull();
    // one chip per row, no crown or delta pill
    expect(document.querySelectorAll('[data-row="Grubby#1"] [data-chip]').length).toBe(1);
    expect(document.querySelector('img[src*="king"]')).toBeNull();
  });
});

describe('UserListSidebar sort and filter', () => {
  it('sorts by MMR by default and by name when Player is active', () => {
    renderSidebar();
    const player = screen.getByRole('button', { name: 'Player' });
    const mmr = screen.getByRole('button', { name: 'MMR' });
    expect(mmr).toHaveAttribute('data-active', 'true');
    expect(rowNames('online')).toEqual(['Happy#1', 'Grubby#1']);
    fireEvent.click(player);
    expect(player).toHaveAttribute('data-active', 'true');
    expect(mmr).toHaveAttribute('data-active', 'false');
    expect(rowNames('online')).toEqual(['Grubby#1', 'Happy#1']);
    expect(rowNames('ingame')).toEqual(['Lyn#1', 'Moon#1']);
  });

  it('pins watched players to the top of their section', () => {
    renderSidebar({ watchList: new Set(['grubby#1']) });
    expect(rowNames('online')).toEqual(['Grubby#1', 'Happy#1']);
    const star = within(document.querySelector('[data-row="Grubby#1"]')).getByRole('button', { name: 'Unwatch player' });
    expect(star).toHaveTextContent('★');
  });

  it('calls onToggleWatch from the star without following the row link', () => {
    const onToggleWatch = vi.fn();
    renderSidebar({ onToggleWatch });
    fireEvent.click(within(document.querySelector('[data-row="Moon#1"]')).getByRole('button', { name: 'Watch player' }));
    expect(onToggleWatch).toHaveBeenCalledWith('Moon#1');
  });

  it('filters rows by name and reports when nothing matches', () => {
    renderSidebar();
    const input = screen.getByLabelText('Filter players');
    fireEvent.change(input, { target: { value: 'gru' } });
    expect(rowNames('online')).toEqual(['Grubby#1']);
    expect(document.querySelector('[data-section="ingame"]')).toBeNull();
    expect(screen.getByText('5 online')).toBeInTheDocument();
    fireEvent.change(input, { target: { value: 'zzz' } });
    expect(screen.getByText('No players match')).toBeInTheDocument();
    expect(document.querySelectorAll('[data-row]').length).toBe(0);
  });
});

describe('UserListSidebar live now strip', () => {
  it('lists one row per game with map, channel player count and elapsed time', () => {
    renderSidebar();
    const strip = document.querySelector('[data-live-strip]');
    expect(strip).toHaveAttribute('data-live-count', '2');
    const rows = strip.querySelectorAll('[data-live-row]');
    expect(rows.length).toBe(2);
    expect(rows[0]).toHaveTextContent('Royal Gardens');
    expect(rows[0]).toHaveTextContent('1 from channel · 3m');
    expect(rows[0]).toHaveAttribute('href', '/player/Lyn%231');
    expect(rows[0]).toHaveAttribute('title', 'Lyn');
    expect(rows[1]).toHaveTextContent('Ferocity');
    expect(rows[1]).toHaveTextContent('1 from channel · 12m');
  });

  it('is absent when nobody in the channel is playing', () => {
    renderSidebar({ inGameTags: new Set(), inGameInfoMap: new Map() });
    expect(document.querySelector('[data-live-strip]')).toBeNull();
  });

  it('collapses to a count when more than three games are running', () => {
    const many = ['A', 'B', 'C', 'D', 'E'].map((n) => user(n));
    const tags = new Set(many.map((u) => u.battleTag));
    const info = new Map(many.map((u, i) => [u.battleTag, { mapName: `Map ${i}`, startTime: minsAgo(i + 1), matchId: `g${i}` }]));
    renderSidebar({ users: many, inGameTags: tags, inGameInfoMap: info, inGameMatchMap: new Map() });
    const strip = document.querySelector('[data-live-strip]');
    expect(strip).toHaveAttribute('data-live-count', '5');
    expect(strip.querySelectorAll('[data-live-row]').length).toBe(0);
    expect(strip).toHaveTextContent('5 from channel');
    fireEvent.click(within(strip).getByRole('button'));
    expect(strip.querySelectorAll('[data-live-row]').length).toBe(5);
  });
});

describe('liveGamesFrom', () => {
  it('groups channel members by match and orders by channel head count', () => {
    const roster = [user('A'), user('B'), user('C'), user('D')];
    const tags = new Set(['A#1', 'B#1', 'C#1']);
    const info = new Map([
      ['A#1', { mapName: 'Ferocity', startTime: minsAgo(5), matchId: 'm1' }],
      ['B#1', { mapName: 'Ferocity', startTime: minsAgo(5), matchId: 'm1' }],
      ['C#1', { mapName: 'Snowblind', startTime: minsAgo(1), matchId: 'm2' }],
      ['D#1', { mapName: 'Ignored', startTime: minsAgo(1), matchId: 'm3' }],
    ]);
    const games = liveGamesFrom(roster, tags, info, new Map([['A#1', '/player/A%231']]));
    expect(games.map((g) => [g.mapName, g.players, g.url])).toEqual([
      ['Ferocity', ['A', 'B'], '/player/A%231'],
      ['Snowblind', ['C'], undefined],
    ]);
  });
});

describe('UserListSidebar mobile sheet', () => {
  it('closes from the header button', () => {
    const onClose = vi.fn();
    renderSidebar({ onClose, $mobileVisible: true });
    fireEvent.click(document.querySelector('button[aria-label="Close roster"]'));
    expect(onClose).toHaveBeenCalled();
  });
});
