import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import UserListSidebar, { stripDots, bracketGroups } from '../components/UserListSidebar';

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
        {...overrides}
      />
    </MemoryRouter>
  );
}

const rowNames = (scope = document) => [...scope.querySelectorAll('[data-row]')].map((el) => el.getAttribute('data-row'));
const row = (tag) => document.querySelector(`[data-row="${tag}"]`);
const brackets = () => [...document.querySelectorAll('[data-bracket]')].map((el) => el.getAttribute('data-bracket'));
const stripTags = () => [...document.querySelectorAll('[data-strip-dot]')].map((el) => el.getAttribute('data-strip-dot'));

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('stripDots and bracketGroups', () => {
  it('places one dot per rated player on the 1200-2200+ axis, stacked per column, filled when in game, with the median', () => {
    const many = [user('Low'), user('Mid'), user('MidToo'), user('High'), user('Unrated')];
    const s = new Map([
      ['Low#1', { mmr: 1000 }],
      ['Mid#1', { mmr: 1700 }],
      ['MidToo#1', { mmr: 1710 }],
      ['High#1', { mmr: 2400 }],
    ]);
    const { dots, height, median } = stripDots(many, s, new Set(['Mid#1']));
    expect(dots.map((d) => d.tag)).toEqual(['Low#1', 'Mid#1', 'MidToo#1', 'High#1']);
    // x is a percent of 1200..2200, clamped at both ends
    expect(dots[0].x).toBe(0);
    expect(dots[1].x).toBe(50);
    expect(dots[3].x).toBe(100);
    // 1700 and 1710 share a ~30 MMR column: the second stacks 8px up
    expect(dots[1].y).toBe(1);
    expect(dots[2].y).toBe(9);
    expect(dots[0].y).toBe(1);
    expect(dots[1].inGame).toBe(true);
    expect(dots[2].inGame).toBe(false);
    expect(height).toBe(2 * 8 + 4);
    // the median of four sorted values is the upper middle one (1710)
    expect(median).toBe(51);
    expect(stripDots([], s, new Set())).toEqual({ dots: [], height: 12, median: null, medianMmr: null });
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

  it('renders rows with avatar, flag, mmr, twitch link and a player link on every name', () => {
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
    expect(within(grubby).getByRole('link', { name: 'Grubby' })).toHaveAttribute('href', '/player/Grubby%231');
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

describe('UserListSidebar header and MMR strip', () => {
  it('shows the online count pill, the in-game count and the column hint, and no close button', () => {
    renderSidebar();
    expect(screen.getByText('Online')).toBeInTheDocument();
    expect(document.querySelector('[data-online-count]')).toHaveTextContent('5');
    expect(document.querySelector('[data-in-game-count]')).toHaveTextContent('2 in game');
    expect(screen.getByText('LAST · MMR')).toBeInTheDocument();
    expect(document.querySelector('[data-roster-scope]')).toBeNull();
    expect(document.querySelector('[data-live-count]')).toBeNull();
    expect(document.querySelector('button[aria-label="Close roster"]')).toBeNull();
  });

  it('renders the dot strip over rated players, filled for in-game ones, with the median and the axis labels', () => {
    renderSidebar();
    expect(document.querySelector('[data-histogram]')).toBeNull();
    expect(document.querySelectorAll('[data-bin]').length).toBe(0);
    // rated players, lowest MMR first
    expect(stripTags()).toEqual(['Lyn#1', 'Moon#1', 'Grubby#1', 'Happy#1']);
    expect(document.querySelector('[data-strip-dot="Moon#1"]')).toHaveAttribute('data-strip-in-game', 'true');
    expect(document.querySelector('[data-strip-dot="Moon#1"]')).toHaveAttribute('title', 'Moon · 1800 · in game');
    expect(document.querySelector('[data-strip-dot="Grubby#1"]')).not.toHaveAttribute('data-strip-in-game');
    expect(document.querySelector('[data-strip-dot="Grubby#1"]')).toHaveAttribute('title', 'Grubby · 1950');
    // the median of 1700, 1800, 1950, 2100 is 1950: 75% along
    expect(document.querySelector('[data-strip-median]')).toHaveAttribute('data-strip-median', '75.0');
    expect(document.querySelector('[data-strip-height]')).toHaveAttribute('data-strip-height', '12');
    expect(screen.getByText('<1300')).toBeInTheDocument();
    expect(screen.getByText('2200+')).toBeInTheDocument();
  });
});

describe('UserListSidebar region filter', () => {
  it('narrows rows, counts and the strip to the region and names it in the header', () => {
    renderSidebar({ region: 'East Asia' });
    expect(rowNames()).toEqual(['Moon#1', 'Lyn#1']);
    expect(document.querySelector('[data-online-count]')).toHaveTextContent('2');
    expect(document.querySelector('[data-in-game-count]')).toHaveTextContent('2 in game');
    expect(document.querySelector('[data-roster-scope]')).toHaveTextContent('East Asia');
    expect(stripTags()).toEqual(['Lyn#1', 'Moon#1']);
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

  it('narrows rows, counts and the strip to a country and shows its flag and code in the header', () => {
    renderSidebar({ country: 'KR' });
    expect(rowNames()).toEqual(['Moon#1', 'Lyn#1']);
    expect(document.querySelector('[data-online-count]')).toHaveTextContent('2');
    expect(document.querySelector('[data-in-game-count]')).toHaveTextContent('2 in game');
    const scope = document.querySelector('[data-roster-scope]');
    expect(scope).toHaveTextContent('KR');
    expect(scope).toHaveAttribute('title', 'South Korea');
    expect(scope.querySelector('img')).toHaveAttribute('alt', 'kr');
    expect(stripTags()).toEqual(['Lyn#1', 'Moon#1']);
    expect(brackets()).toEqual(['1800 - 1999', '1600 - 1799']);
    cleanup();
    renderSidebar({ country: 'NL' });
    expect(rowNames()).toEqual(['Grubby#1']);
    cleanup();
    renderSidebar({ country: 'FR' });
    expect(rowNames()).toEqual([]);
    expect(screen.getByText('Nobody online in France')).toBeInTheDocument();
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
  it('opens the game from an in-game row and the player card from any other row, with plain names and no stars', () => {
    const onOpenGame = vi.fn();
    const onOpenPlayer = vi.fn();
    renderSidebar({ isMobile: true, onOpenGame, onOpenPlayer, $mobileVisible: true, id: 'chat-roster' });
    expect(document.querySelector('[data-roster]')).toHaveAttribute('id', 'chat-roster');
    expect(screen.getByText('MMR')).toBeInTheDocument();
    // in-game row: the game, and the name is text rather than a link
    const moon = row('Moon#1');
    expect(within(moon).queryByRole('link', { name: 'Moon' })).toBeNull();
    fireEvent.click(moon);
    expect(onOpenGame).toHaveBeenCalledWith(inGameInfoMap.get('Moon#1'));
    expect(onOpenPlayer).not.toHaveBeenCalled();
    // any other row: the player card, by click and keyboard
    const grubby = row('Grubby#1');
    expect(grubby).toHaveAttribute('role', 'button');
    expect(grubby).toHaveAttribute('aria-label', 'Grubby');
    fireEvent.click(grubby);
    expect(onOpenPlayer).toHaveBeenCalledWith('Grubby#1');
    fireEvent.keyDown(row('Happy#1'), { key: 'Enter' });
    expect(onOpenPlayer).toHaveBeenLastCalledWith('Happy#1');
    expect(onOpenGame).toHaveBeenCalledTimes(1);
    expect(document.querySelectorAll('button[aria-label$="player"]').length).toBe(0);
  });

  it('keeps desktop rows plain when onOpenPlayer is given without isMobile', () => {
    const onOpenPlayer = vi.fn();
    renderSidebar({ onOpenPlayer });
    expect(row('Grubby#1')).not.toHaveAttribute('role');
    expect(within(row('Moon#1')).getByRole('link', { name: 'Moon' })).toBeInTheDocument();
  });
});
