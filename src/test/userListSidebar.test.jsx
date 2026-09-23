import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import UserListSidebar, { histogramBins, bracketGroups } from '../components/UserListSidebar';

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
const avatars = new Map([
  ['Moon#1', { profilePicUrl: 'https://x/moon.jpg', country: 'KR' }],
  ['Grubby#1', { country: 'NL' }],
  ['Happy#1', { country: 'RU' }],
  ['Lyn#1', { country: 'KR' }],
]);

const inGameTags = new Set(['Moon#1', 'Lyn#1']);
const inGameInfoMap = new Map([
  ['Moon#1', { mapName: 'Ferocity', startTime: minsAgo(12), matchId: 'm1' }],
  ['Lyn#1', { mapName: 'Royal Gardens', startTime: minsAgo(3), matchId: 'm2' }],
]);
const inGameMatchMap = new Map([
  ['Moon#1', '/player/Moon%231'],
  ['Lyn#1', '/player/Lyn%231'],
]);
const recentDeltas = new Map([
  ['Happy#1', 12],
  ['Grubby#1', -7.4],
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
        recentDeltas={recentDeltas}
        liveStreamers={new Map([['Grubby#1', { twitchName: 'grubby', title: 'live' }]])}
        watchList={new Set()}
        onToggleWatch={() => {}}
        onOpenGame={() => {}}
        $mobileVisible={false}
        onClose={() => {}}
        {...overrides}
      />
    </MemoryRouter>
  );
}

const rowNames = (scope = document) => [...scope.querySelectorAll('[data-row]')].map((el) => el.getAttribute('data-row'));
const row = (tag) => document.querySelector(`[data-row="${tag}"]`);
const brackets = () => [...document.querySelectorAll('[data-bracket]')].map((el) => el.getAttribute('data-bracket'));
const bins = () => [...document.querySelectorAll('[data-bin]')].map((el) => Number(el.getAttribute('data-bin')));

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('histogramBins and bracketGroups', () => {
  it('bins MMR into 12 buckets of 100 from 1200, clamping both ends', () => {
    const roster = [user('a'), user('b'), user('c'), user('d'), user('e'), user('f')];
    const s = new Map([
      ['a#1', { mmr: 900 }],
      ['b#1', { mmr: 1200 }],
      ['c#1', { mmr: 1299 }],
      ['d#1', { mmr: 1650 }],
      ['e#1', { mmr: 2300 }],
      ['f#1', { mmr: 2900 }],
    ]);
    const b = histogramBins(roster, s);
    expect(b.length).toBe(12);
    expect(b[0]).toBe(3);
    expect(b[4]).toBe(1);
    expect(b[11]).toBe(2);
    expect(b.reduce((x, y) => x + y, 0)).toBe(6);
  });

  it('groups by bracket in order and trails unrated players', () => {
    const roster = [user('a'), user('b'), user('c'), user('d'), user('e'), user('f')];
    const s = new Map([
      ['a#1', { mmr: 2000 }],
      ['b#1', { mmr: 1999 }],
      ['c#1', { mmr: 1600 }],
      ['d#1', { mmr: 1599 }],
      ['e#1', { mmr: 1000 }],
    ]);
    const g = bracketGroups(roster, s);
    expect(g.map((x) => [x.label, x.users.map((u) => u.name)])).toEqual([
      ['2000+', ['a']],
      ['1800 - 1999', ['b']],
      ['1600 - 1799', ['c']],
      ['1400 - 1599', ['d']],
      ['Under 1400', ['e']],
      ['Unrated', ['f']],
    ]);
  });
});

describe('UserListSidebar list', () => {
  it('orders rows by MMR descending under bracket headers, unknown MMR last', () => {
    renderSidebar();
    expect(rowNames()).toEqual(['Happy#1', 'Grubby#1', 'Moon#1', 'Lyn#1', 'Sleepy#1']);
    expect(brackets()).toEqual(['2000+', '1800 - 1999', '1600 - 1799', 'Unrated']);
    const h = document.querySelector('[data-bracket="1800 - 1999"]');
    expect(h).toHaveTextContent('2');
    expect(screen.queryByText(/^Away$/)).toBeNull();
    expect(screen.queryByText('Watching')).toBeNull();
  });

  it('has no filter input', () => {
    renderSidebar();
    expect(screen.queryByLabelText('Filter players')).toBeNull();
    expect(document.querySelector('input')).toBeNull();
  });

  it('renders rows with avatar, flag, mmr, twitch link and a player link on the name of in-game players', () => {
    renderSidebar();
    const moon = row('Moon#1');
    expect(moon.tagName).toBe('DIV');
    expect(moon).toHaveAttribute('role', 'button');
    expect(within(moon).getByRole('link', { name: 'Moon' })).toHaveAttribute('href', '/player/Moon%231');
    expect(moon.querySelector('img[src="https://x/moon.jpg"]')).not.toBeNull();
    expect(moon.querySelector('img[alt="kr"]')).not.toBeNull();
    expect(within(moon).getByText('1800')).toBeInTheDocument();

    const grubby = row('Grubby#1');
    expect(grubby).not.toHaveAttribute('role');
    expect(within(grubby).queryByRole('link', { name: 'Grubby' })).toBeNull();
    expect(within(grubby).getByTitle('live')).toHaveAttribute('href', 'https://twitch.tv/grubby');
  });

  it('shows the red in-game dot with map and elapsed on in-game rows only', () => {
    renderSidebar();
    const dot = row('Moon#1').querySelector('[data-in-game]');
    expect(dot).toHaveAttribute('title', 'in game · Ferocity · 12m');
    expect(row('Lyn#1').querySelector('[data-in-game]')).toHaveAttribute('title', 'in game · Royal Gardens · 3m');
    expect(row('Happy#1').querySelector('[data-in-game]')).toBeNull();
    expect(document.querySelectorAll('[data-in-game]').length).toBe(2);
    // the dot cell exists on every row so columns line up
    expect(row('Happy#1').children.length).toBe(5);
    expect(row('Moon#1').children.length).toBe(5);
  });

  it('shows the last-game delta from recentDeltas, rounded and signed', () => {
    renderSidebar();
    expect(row('Happy#1').querySelector('[data-delta]')).toHaveTextContent('+12');
    expect(row('Grubby#1').querySelector('[data-delta]')).toHaveTextContent('-7');
    expect(row('Moon#1').querySelector('[data-delta]')).toBeNull();
    expect(document.querySelectorAll('[data-delta]').length).toBe(2);
  });

  it('shows skeleton rows while the roster is empty', () => {
    renderSidebar({ users: [] });
    expect(document.querySelector('[data-online-count]')).toHaveTextContent('0');
    expect(document.querySelectorAll('[data-row]').length).toBe(0);
    expect(document.querySelectorAll('[data-bracket]').length).toBe(0);
  });
});

describe('UserListSidebar header and histogram', () => {
  it('shows the online count pill, the in-game count and the column hint', () => {
    renderSidebar();
    expect(screen.getByText('Online')).toBeInTheDocument();
    expect(document.querySelector('[data-online-count]')).toHaveTextContent('5');
    expect(document.querySelector('[data-in-game-count]')).toHaveTextContent('2 in game');
    expect(screen.getByText('LAST · MMR')).toBeInTheDocument();
    expect(document.querySelector('[data-roster-scope]')).toBeNull();
    expect(document.querySelector('[data-live-count]')).toBeNull();
  });

  it('renders 12 histogram bins over rated players with the axis labels', () => {
    renderSidebar();
    const b = bins();
    expect(b.length).toBe(12);
    // 1700 -> bin 5, 1800 -> 6, 1950 -> 7, 2100 -> 9
    expect(b).toEqual([0, 0, 0, 0, 0, 1, 1, 1, 0, 1, 0, 0]);
    expect(screen.getByText('<1300')).toBeInTheDocument();
    expect(screen.getByText('2200+')).toBeInTheDocument();
    expect(document.querySelector('[data-bin]')).toHaveAttribute('title', '1200 - 1299: 0');
    expect(document.querySelectorAll('[data-bin]')[11]).toHaveAttribute('title', '2300+: 0');
  });
});

describe('UserListSidebar region filter', () => {
  it('narrows rows, counts and the histogram to the region and names it in the header', () => {
    renderSidebar({ region: 'East Asia' });
    expect(rowNames()).toEqual(['Moon#1', 'Lyn#1']);
    expect(document.querySelector('[data-online-count]')).toHaveTextContent('2');
    expect(document.querySelector('[data-in-game-count]')).toHaveTextContent('2 in game');
    expect(document.querySelector('[data-roster-scope]')).toHaveTextContent('East Asia');
    expect(bins()).toEqual([0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0]);
    expect(brackets()).toEqual(['1800 - 1999', '1600 - 1799']);
  });

  it('puts players without a country in Other and reports an empty region', () => {
    renderSidebar({ region: 'Other' });
    expect(rowNames()).toEqual(['Sleepy#1']);
    cleanup();
    renderSidebar({ region: 'Oceania' });
    expect(rowNames()).toEqual([]);
    expect(screen.getByText('Nobody online in Oceania')).toBeInTheDocument();
  });

  it('still honours a name filter prop', () => {
    renderSidebar({ filter: 'gru' });
    expect(rowNames()).toEqual(['Grubby#1']);
    cleanup();
    renderSidebar({ filter: 'zzz' });
    expect(screen.getByText('No players match')).toBeInTheDocument();
  });
});

describe('UserListSidebar dimming', () => {
  it('dims idle rows only; in-game and recently joined rows are normal', () => {
    renderSidebar();
    expect(row('Sleepy#1')).toHaveAttribute('data-dim', 'idle');
    expect(row('Happy#1')).not.toHaveAttribute('data-dim');
    expect(row('Moon#1')).not.toHaveAttribute('data-dim');
  });

  it('does not dim an idle-aged player who is in a game', () => {
    const roster = [user('Old', { joinedAt: NOW - HOURS_4 })];
    renderSidebar({
      users: roster,
      stats: new Map(),
      inGameTags: new Set(['Old#1']),
      inGameInfoMap: new Map([['Old#1', { mapName: 'Ferocity', startTime: minsAgo(5), matchId: 'm1' }]]),
      inGameMatchMap: new Map(),
    });
    expect(row('Old#1')).not.toHaveAttribute('data-dim');
  });
});

describe('UserListSidebar watch star', () => {
  it('keeps the star on every row, lit for watched players, and toggles without opening the game', () => {
    const onToggleWatch = vi.fn();
    const onOpenGame = vi.fn();
    renderSidebar({ onToggleWatch, onOpenGame, watchList: new Set(['lyn#1']) });
    expect(within(row('Lyn#1')).getByRole('button', { name: 'Unwatch player' })).toHaveTextContent('★');
    const star = within(row('Moon#1')).getByRole('button', { name: 'Watch player' });
    expect(star).toHaveTextContent('☆');
    fireEvent.click(star);
    expect(onToggleWatch).toHaveBeenCalledWith('Moon#1');
    expect(onOpenGame).not.toHaveBeenCalled();
    // no pinned block: order is still by MMR
    expect(rowNames()).toEqual(['Happy#1', 'Grubby#1', 'Moon#1', 'Lyn#1', 'Sleepy#1']);
  });
});

describe('UserListSidebar game modal', () => {
  it('opens the game from an in-game row (click and keyboard) with its ongoing-index entry', () => {
    const onOpenGame = vi.fn();
    renderSidebar({ onOpenGame });
    const moon = row('Moon#1');
    fireEvent.click(moon);
    expect(onOpenGame).toHaveBeenCalledTimes(1);
    expect(onOpenGame).toHaveBeenCalledWith(inGameInfoMap.get('Moon#1'));
    fireEvent.keyDown(moon, { key: 'Enter' });
    expect(onOpenGame).toHaveBeenCalledTimes(2);
    fireEvent.click(row('Grubby#1'));
    expect(onOpenGame).toHaveBeenCalledTimes(2);
  });

  it('leaves the name link to the player page without opening the game', () => {
    const onOpenGame = vi.fn();
    renderSidebar({ onOpenGame });
    fireEvent.click(within(row('Lyn#1')).getByRole('link', { name: 'Lyn' }));
    expect(onOpenGame).not.toHaveBeenCalled();
  });

  it('renders plain rows when no onOpenGame is given', () => {
    renderSidebar({ onOpenGame: undefined });
    expect(row('Moon#1')).not.toHaveAttribute('role');
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
