import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import UserListSidebar from '../components/UserListSidebar';

// The strip and map are d3 + ResizeObserver (and the map fetches topojson):
// stub both and expose the props they were given
vi.mock('../components/OnlineMmrStrip', () => ({
  default: (props) => (
    <div
      data-mock-strip
      data-compact={String(Boolean(props.compact))}
      data-players={props.players.map((p) => `${p.battleTag}:${p.mmr}`).join(',')}
      data-ingame-tags={[...(props.inGameTags || [])].join(",")}
      onClick={() => props.onPlayerClick?.(props.players[0]?.battleTag)}
    />
  ),
}));
vi.mock('../components/WorldMap', () => ({
  default: (props) => (
    <div
      data-mock-map
      data-compact={String(Boolean(props.compact))}
      data-instant={String(Boolean(props.instant))}
      data-countries={JSON.stringify([...props.playerCountries])}
      data-players={props.players.map((p) => `${p.battleTag}:${p.country}:${p.mmr}:${p.inGame}`).join(',')}
    />
  ),
}));

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

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('UserListSidebar flat list', () => {
  it('renders one flat list ordered by MMR descending, unknown MMR last, with no sections or dividers', () => {
    renderSidebar();
    expect(rowNames()).toEqual(['Happy#1', 'Grubby#1', 'Moon#1', 'Lyn#1', 'Sleepy#1']);
    expect(document.querySelectorAll('[data-section]').length).toBe(0);
    expect(document.querySelectorAll('[data-game-divider]').length).toBe(0);
    expect(screen.queryByText(/In game/)).toBeNull();
    expect(screen.queryByText(/^Away$/)).toBeNull();
  });

  it('orders unknown MMR players by name after everyone with an MMR', () => {
    const roster = [user('Zed'), user('Amy'), user('Bob'), user('Kim')];
    renderSidebar({
      users: roster,
      stats: new Map([['Kim#1', { mmr: 1500 }]]),
      inGameTags: new Set(),
      inGameInfoMap: new Map(),
      inGameMatchMap: new Map(),
    });
    expect(rowNames()).toEqual(['Kim#1', 'Amy#1', 'Bob#1', 'Zed#1']);
  });

  it('has no sort toggle', () => {
    renderSidebar();
    expect(screen.queryByRole('button', { name: 'Player' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'MMR' })).toBeNull();
  });

  it('renders rows with avatar, flag, mmr, twitch link and a player link on the name of in-game players', () => {
    renderSidebar();
    const moon = row('Moon#1');
    expect(moon.tagName).toBe('DIV');
    expect(moon).toHaveAttribute('role', 'button');
    expect(within(moon).getByRole('link', { name: 'Moon' })).toHaveAttribute('href', '/player/Moon%231');
    expect(moon.querySelector('img[src="https://x/moon.jpg"]')).not.toBeNull();
    expect(moon.querySelector('img[alt="KR"], img[src*="kr"]')).not.toBeNull();
    expect(within(moon).getByText('1800')).toBeInTheDocument();

    const grubby = row('Grubby#1');
    expect(grubby.tagName).toBe('DIV');
    expect(grubby).not.toHaveAttribute('role');
    expect(within(grubby).queryByRole('link', { name: 'Grubby' })).toBeNull();
    expect(within(grubby).getByTitle('live')).toHaveAttribute('href', 'https://twitch.tv/grubby');
  });

  it('shows the crossed swords glyph with map and elapsed on in-game rows only', () => {
    renderSidebar();
    const swords = row('Moon#1').querySelector('[data-in-game]');
    expect(swords).not.toBeNull();
    expect(swords).toHaveAttribute('title', 'in game · Ferocity · 12m');
    expect(swords.querySelector('svg')).not.toBeNull();
    // glyph sits right after the name
    expect(swords.previousElementSibling).toHaveTextContent('Moon');
    expect(row('Lyn#1').querySelector('[data-in-game]')).toHaveAttribute('title', 'in game · Royal Gardens · 3m');
    expect(row('Happy#1').querySelector('[data-in-game]')).toBeNull();
    expect(row('Grubby#1').querySelector('[data-in-game]')).toBeNull();
    expect(row('Sleepy#1').querySelector('[data-in-game]')).toBeNull();
    expect(document.querySelectorAll('[data-in-game]').length).toBe(2);
  });

  it('renders no status chip on any row', () => {
    renderSidebar();
    expect(document.querySelectorAll('[data-chip]').length).toBe(0);
    expect(document.querySelector('img[src*="king"]')).toBeNull();
    expect(row('Moon#1')).not.toHaveTextContent(/in game/i);
    expect(row('Moon#1')).toHaveTextContent('Moon');
    expect(row('Moon#1')).toHaveTextContent('1800');
  });

  it('shows skeleton rows while the roster is empty', () => {
    renderSidebar({ users: [] });
    expect(screen.getByText('online')).toBeInTheDocument();
    expect(document.querySelector('[data-online-count]')).toHaveTextContent('0 online');
    expect(document.querySelectorAll('[data-row]').length).toBe(0);
  });
});

describe('UserListSidebar header', () => {
  it('shows the online count and a live link counting distinct games in progress', () => {
    renderSidebar();
    expect(document.querySelector('[data-online-count]')).toHaveTextContent('5 online');
    const live = document.querySelector('[data-live-count]');
    expect(live).toHaveTextContent('2 live');
    expect(live).toHaveAttribute('href', '/live');
  });

  it('counts a shared game once and hides the live link when nobody is in a game', () => {
    const roster = [user('A'), user('B'), user('C')];
    const info = new Map([
      ['A#1', { mapName: 'Ferocity', startTime: minsAgo(20), matchId: 'm1' }],
      ['B#1', { mapName: 'Ferocity', startTime: minsAgo(20), matchId: 'm1' }],
    ]);
    renderSidebar({ users: roster, stats: new Map(), inGameTags: new Set(['A#1', 'B#1']), inGameInfoMap: info, inGameMatchMap: new Map() });
    expect(document.querySelector('[data-live-count]')).toHaveTextContent('1 live');
    cleanup();
    renderSidebar({ users: roster, stats: new Map(), inGameTags: new Set(), inGameInfoMap: new Map(), inGameMatchMap: new Map() });
    expect(document.querySelector('[data-live-count]')).toBeNull();
  });
});

describe('UserListSidebar dimming', () => {
  it('dims idle rows only; in-game and recently joined rows are normal', () => {
    renderSidebar();
    expect(row('Sleepy#1')).toHaveAttribute('data-dim', 'idle');
    expect(row('Happy#1')).not.toHaveAttribute('data-dim');
    expect(row('Grubby#1')).not.toHaveAttribute('data-dim');
    expect(row('Moon#1')).not.toHaveAttribute('data-dim');
    expect(document.querySelectorAll('[data-dim="quiet"]').length).toBe(0);
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

describe('UserListSidebar watch and filter', () => {
  it('pins watched players in a Watching block above the list', () => {
    renderSidebar({ watchList: new Set(['lyn#1']) });
    const block = document.querySelector('[data-watching]');
    expect(block).toHaveTextContent('Watching');
    expect(rowNames(block)).toEqual(['Lyn#1']);
    expect(rowNames()).toEqual(['Lyn#1', 'Happy#1', 'Grubby#1', 'Moon#1', 'Sleepy#1']);
    const star = within(row('Lyn#1')).getByRole('button', { name: 'Unwatch player' });
    expect(star).toHaveTextContent('★');
  });

  it('renders no Watching block when nobody is watched', () => {
    renderSidebar();
    expect(document.querySelector('[data-watching]')).toBeNull();
    expect(screen.queryByText('Watching')).toBeNull();
  });

  it('calls onToggleWatch from the star without opening the game', () => {
    const onToggleWatch = vi.fn();
    const onOpenGame = vi.fn();
    renderSidebar({ onToggleWatch, onOpenGame });
    fireEvent.click(within(row('Moon#1')).getByRole('button', { name: 'Watch player' }));
    expect(onToggleWatch).toHaveBeenCalledWith('Moon#1');
    expect(onOpenGame).not.toHaveBeenCalled();
  });

  it('filters rows by name and reports when nothing matches', () => {
    renderSidebar();
    const input = screen.getByLabelText('Filter players');
    fireEvent.change(input, { target: { value: 'gru' } });
    expect(rowNames()).toEqual(['Grubby#1']);
    expect(document.querySelector('[data-online-count]')).toHaveTextContent('5 online');
    fireEvent.change(input, { target: { value: 'zzz' } });
    expect(screen.getByText('No players match')).toBeInTheDocument();
    expect(document.querySelectorAll('[data-row]').length).toBe(0);
  });

  it('shows a long name, a four digit MMR, the swords glyph and the star in one row', () => {
    const roster = [user('SergeyPenkin')];
    renderSidebar({
      users: roster,
      stats: new Map([['SergeyPenkin#1', { mmr: 2345 }]]),
      inGameTags: new Set(['SergeyPenkin#1']),
      inGameInfoMap: new Map([['SergeyPenkin#1', { mapName: 'Ferocity', startTime: minsAgo(5), matchId: 'm9' }]]),
      inGameMatchMap: new Map(),
    });
    const r = row('SergeyPenkin#1');
    expect(r.children.length).toBe(5); // avatar, name anchor, swords, mmr, star
    expect(within(r).getByText('SergeyPenkin')).toBeInTheDocument();
    expect(within(r).getByText('2345')).toBeInTheDocument();
    expect(within(r).getByRole('button', { name: 'Watch player' })).toBeInTheDocument();
    expect(r.querySelector('[data-chip]')).toBeNull();
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
    // rows for players not in a game are not games
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

describe('UserListSidebar pulse', () => {
  it('renders the compact strip with every known MMR and the in-game tags', () => {
    renderSidebar();
    const strip = document.querySelector('[data-pulse-strip] [data-mock-strip]');
    expect(strip).toHaveAttribute('data-compact', 'true');
    expect(strip.getAttribute('data-players').split(',').sort()).toEqual(
      ['Grubby#1:1950', 'Happy#1:2100', 'Lyn#1:1700', 'Moon#1:1800.4'],
    );
    expect(strip.getAttribute("data-ingame-tags").split(',').sort()).toEqual(['Lyn#1', 'Moon#1']);
  });

  it('renders the compact map instantly from the channel users countries and MMRs', () => {
    renderSidebar();
    const map = document.querySelector('[data-pulse-map] [data-mock-map]');
    expect(map).toHaveAttribute('data-compact', 'true');
    expect(map).toHaveAttribute('data-instant', 'true');
    // Moon is Korean and in a game; nobody else has a country yet
    expect(JSON.parse(map.getAttribute('data-countries'))).toEqual([['KR', { online: 0, inGame: 1 }]]);
    expect(map).toHaveAttribute('data-players', 'Moon#1:KR:1800.4:true');
    expect(document.querySelector('[data-pulse-caption]')).toHaveTextContent('1 country · top: KR 1');
  });

  it('captions the country count and the top three countries by headcount', () => {
    const roster = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((n) => user(n));
    const countries = { A: 'de', B: 'de', C: 'de', D: 'fr', E: 'fr', F: 'cn', G: 'us' };
    const av = new Map(Object.entries(countries).map(([n, c]) => [`${n}#1`, { country: c }]));
    renderSidebar({ users: roster, avatars: av, stats: new Map(), inGameTags: new Set(), inGameInfoMap: new Map(), inGameMatchMap: new Map() });
    expect(document.querySelector('[data-pulse-caption]')).toHaveTextContent('4 countries · top: DE 3, FR 2, CN 1');
    const map = document.querySelector('[data-mock-map]');
    expect(JSON.parse(map.getAttribute('data-countries'))).toEqual([
      ['DE', { online: 3, inGame: 0 }],
      ['FR', { online: 2, inGame: 0 }],
      ['CN', { online: 1, inGame: 0 }],
      ['US', { online: 1, inGame: 0 }],
    ]);
  });

  it('is open by default, collapses from the chevron and persists the choice', () => {
    renderSidebar();
    const pulse = document.querySelector('[data-pulse]');
    expect(pulse).toHaveAttribute('data-open', 'true');
    expect(pulse).toHaveTextContent('Pulse');
    const toggle = screen.getByRole('button', { name: 'Collapse pulse' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(toggle);
    expect(pulse).toHaveAttribute('data-open', 'false');
    expect(document.querySelector('[data-pulse-body]')).toBeNull();
    expect(document.querySelector('[data-mock-strip]')).toBeNull();
    expect(document.querySelector('[data-mock-map]')).toBeNull();
    expect(screen.getByRole('button', { name: 'Expand pulse' })).toHaveAttribute('aria-expanded', 'false');
    expect(localStorage.getItem('chat:showPulse')).toBe('0');
    // header line stays, and the roster is untouched
    expect(pulse).toHaveTextContent('Pulse');
    expect(rowNames()).toEqual(['Happy#1', 'Grubby#1', 'Moon#1', 'Lyn#1', 'Sleepy#1']);

    cleanup();
    renderSidebar();
    expect(document.querySelector('[data-pulse]')).toHaveAttribute('data-open', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'Expand pulse' }));
    expect(document.querySelector('[data-pulse-body]')).not.toBeNull();
    expect(localStorage.getItem('chat:showPulse')).toBe('1');
  });

  it('filters the roster to a player clicked on the strip', () => {
    renderSidebar();
    // the stub clicks its first player, Moon (users order, known MMR)
    fireEvent.click(document.querySelector('[data-mock-strip]'));
    expect(rowNames()).toEqual(['Moon#1']);
    expect(screen.getByLabelText('Filter players')).toHaveValue('Moon');
  });
});
