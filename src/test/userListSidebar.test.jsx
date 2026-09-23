import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import UserListSidebar from '../components/UserListSidebar';

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

/** [[divider text | null, [row tags]], ...] for every match sub-group in the In game section. */
const inGameGroups = () =>
  [...document.querySelectorAll('[data-section="ingame"] [data-game]')].map((g) => [
    g.querySelector('[data-game-divider]')?.textContent ?? null,
    [...g.querySelectorAll('[data-row]')].map((el) => el.getAttribute('data-row')),
  ]);

afterEach(cleanup);

describe('UserListSidebar sections', () => {
  it('splits the roster into in game, online and away with counts', () => {
    renderSidebar();
    expect(screen.getByText('5 online')).toBeInTheDocument();
    // in game rows follow match order (newest game first when head counts tie)
    expect(rowNames('ingame')).toEqual(['Lyn#1', 'Moon#1']);
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
    expect(rowNames('ingame')).toEqual(['Lyn#1', 'Moon#1']);
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

describe('UserListSidebar rows carry no status chip', () => {
  it('renders name and MMR only, no in game, won or lost chip and no crown', () => {
    renderSidebar({ recentWinners: new Set(['Happy#1']), recentDeltas: new Map([['Grubby#1', -9]]) });
    expect(document.querySelectorAll('[data-chip]').length).toBe(0);
    expect(document.querySelector('img[src*="king"]')).toBeNull();
    const moon = document.querySelector('[data-row="Moon#1"]');
    expect(moon).not.toHaveTextContent(/in game/i);
    expect(moon).toHaveTextContent('Moon');
    expect(moon).toHaveTextContent('1800');
    expect(document.querySelector('[data-row="Grubby#1"]')).not.toHaveTextContent(/lost/i);
    expect(document.querySelector('[data-row="Happy#1"]')).not.toHaveTextContent(/won/i);
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

describe('UserListSidebar in game sub-groups', () => {
  it('has no live now strip', () => {
    renderSidebar();
    expect(document.querySelector('[data-live-strip]')).toBeNull();
    expect(screen.queryByText(/Live now/)).toBeNull();
  });

  it('groups in-game rows by match with a divider of map, elapsed and channel head count', () => {
    renderSidebar();
    expect(inGameGroups()).toEqual([
      ['Royal Gardens · 3m · 1', ['Lyn#1']],
      ['Ferocity · 12m · 1', ['Moon#1']],
    ]);
    const divider = document.querySelector('[data-game="m2"] [data-game-divider]');
    expect(divider).toHaveAttribute('title', 'Royal Gardens · 3m · 1');
    // one divider per game, never one per row
    expect(document.querySelectorAll('[data-game-divider]').length).toBe(2);
  });

  it('orders games by channel head count then newest, and rows within a game by the current sort', () => {
    const roster = [user('A'), user('B'), user('C'), user('D'), user('E')];
    const tags = new Set(['A#1', 'B#1', 'C#1', 'D#1', 'E#1']);
    const info = new Map([
      ['A#1', { mapName: 'Ferocity', startTime: minsAgo(20), matchId: 'm1' }],
      ['B#1', { mapName: 'Ferocity', startTime: minsAgo(20), matchId: 'm1' }],
      ['C#1', { mapName: 'Snowblind', startTime: minsAgo(1), matchId: 'm2' }],
      ['D#1', { mapName: 'Gold Rush', startTime: minsAgo(9), matchId: 'm3' }],
    ]);
    const mmr = new Map([
      ['A#1', { mmr: 1500 }],
      ['B#1', { mmr: 1900 }],
      ['C#1', { mmr: 1600 }],
      ['D#1', { mmr: 1700 }],
    ]);
    renderSidebar({ users: roster, stats: mmr, inGameTags: tags, inGameInfoMap: info, inGameMatchMap: new Map() });
    expect(inGameGroups()).toEqual([
      ['Ferocity · 20m · 2', ['B#1', 'A#1']],
      ['Snowblind · 1m · 1', ['C#1']],
      ['Gold Rush · 9m · 1', ['D#1']],
      [null, ['E#1']],
    ]);
    expect(document.querySelector('[data-game="unknown"] [data-game-divider]')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Player' }));
    expect(inGameGroups()[0]).toEqual(['Ferocity · 20m · 2', ['A#1', 'B#1']]);
  });

  it('keeps the map and elapsed tooltip on in-game rows and leaves online rows without one', () => {
    renderSidebar();
    expect(document.querySelector('[data-row="Lyn#1"]')).toHaveAttribute('title', 'Royal Gardens · 3m');
    expect(document.querySelector('[data-row="Happy#1"]')).not.toHaveAttribute('title');
  });

  it('shows a long name, a four digit MMR and the star in one row without a chip', () => {
    const roster = [user('SergeyPenkin')];
    renderSidebar({
      users: roster,
      stats: new Map([['SergeyPenkin#1', { mmr: 2345 }]]),
      inGameTags: new Set(['SergeyPenkin#1']),
      inGameInfoMap: new Map([['SergeyPenkin#1', { mapName: 'Ferocity', startTime: minsAgo(5), matchId: 'm9' }]]),
      inGameMatchMap: new Map(),
    });
    const row = document.querySelector('[data-row="SergeyPenkin#1"]');
    expect(row.children.length).toBe(4); // avatar, name anchor, mmr, star
    expect(within(row).getByText('SergeyPenkin')).toBeInTheDocument();
    expect(within(row).getByText('2345')).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: 'Watch player' })).toBeInTheDocument();
    expect(row.querySelector('[data-chip]')).toBeNull();
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
