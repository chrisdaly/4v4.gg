import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MapPanel from '../components/chat/MapPanel';
import MapModal from '../components/chat/MapModal';
import { regionSummary } from '../lib/chat/regions';

// The map is d3 + a topojson fetch: stub it. Dots are svg circles with the
// real class, clicking one calls onDotClick without stopping propagation
// (the real WorldMap does both; MapPanel's target guard covers this case).
vi.mock('../components/WorldMap', () => ({
  default: (props) => (
    <div
      data-mock-map
      data-dim={[...props.playerCountries.keys()].filter((c) => props.dimOutside?.(c)).join(',')}
      data-compact={String(Boolean(props.compact))}
      data-highlight={String(Boolean(props.highlightInGame))}
    >
      <svg>
        {[...props.playerCountries.keys()].map((code) => (
          <circle key={code} className="map-dot" data-dot={code} onClick={() => props.onDotClick(code)} />
        ))}
      </svg>
    </div>
  ),
}));

vi.mock('../lib/chat/digestToday', () => ({
  fetchTodayDigest: () => Promise.resolve(null),
}));

const NOW = Date.now();
const HOURS_4 = 4 * 60 * 60 * 1000;
const u = (name, cc, mmr, extra = {}) => ({ battleTag: `${name}#1`, name, cc, mmr, joinedAt: NOW - 60_000, ...extra });
const roster = [
  u('a', 'FR', 2000),
  u('b', 'DE', 1800),
  u('c', 'DE', 1600),
  u('e', 'CN', 1900),
  u('f', 'KR', 1700),
  u('g', 'US', 1500),
  u('old', 'DE', 1400, { joinedAt: NOW - HOURS_4 }),
];
const stats = new Map(roster.map((x) => [x.battleTag, { mmr: x.mmr }]));
const avatars = new Map(roster.map((x) => [x.battleTag, { country: x.cc }]));
const inGameTags = new Set(['b#1']);
const inGameInfoMap = new Map([['b#1', { matchId: 'm1', mapName: 'Ferocity', startTime: new Date(NOW - 5 * 60_000).toISOString() }]]);
const NOON = new Date('2026-09-23T12:00:00Z');
const rows = regionSummary(roster, { stats, avatars }, NOON).rows;

// Stands in for Chat.jsx: the region and country scopes and mapOpen live
// here, the panel opens the modal, everything shares the scope. One scope
// at a time: setting one clears the other.
const regionSpy = vi.fn();
const countrySpy = vi.fn();
const openGameSpy = vi.fn();
function Owner({ initialRegion = null, initialCountry = null }) {
  const [region, setRegionState] = React.useState(initialRegion);
  const [country, setCountryState] = React.useState(initialCountry);
  const [mapOpen, setMapOpen] = React.useState(false);
  const setRegion = (r) => {
    regionSpy(r);
    setRegionState(r);
    setCountryState(null);
  };
  const setCountry = (c) => {
    countrySpy(c);
    setCountryState(c);
    setRegionState(null);
  };
  return (
    <MemoryRouter>
      <MapPanel
        users={roster}
        avatars={avatars}
        stats={stats}
        inGameTags={inGameTags}
        status="connected"
        region={region}
        country={country}
        onRegionChange={setRegion}
        onExpand={() => setMapOpen(true)}
      />
      <span data-owner-scope>{country ? `country:${country}` : region ? `region:${region}` : 'none'}</span>
      {mapOpen && (
        <MapModal
          users={roster}
          avatars={avatars}
          stats={stats}
          inGameTags={inGameTags}
          inGameInfoMap={inGameInfoMap}
          regions={rows}
          region={region}
          country={country}
          onRegionChange={setRegion}
          onCountryChange={setCountry}
          onOpenGame={openGameSpy}
          onClose={() => setMapOpen(false)}
        />
      )}
    </MemoryRouter>
  );
}

const dialog = () => screen.queryByRole('dialog', { name: 'World map' });
const smallMap = () => document.querySelector('[data-map-panel] [data-mock-map]');
const ownerScope = () => document.querySelector('[data-owner-scope]').textContent;
const rail = () => document.querySelector('[data-map-rail]');
const countryRows = () => [...rail().querySelectorAll('[data-country-row]')].map((el) => el.getAttribute('data-country-row'));
const railRows = () => [...rail().querySelectorAll('[data-rail-row]')].map((el) => el.getAttribute('data-rail-row'));
const openModal = (props) => {
  render(<Owner {...props} />);
  fireEvent.click(screen.getByRole('button', { name: 'Expand map' }));
  return dialog();
};

afterEach(() => {
  cleanup();
  regionSpy.mockClear();
  countrySpy.mockClear();
  openGameSpy.mockClear();
});

describe('MapModal', () => {
  it('opens from the expand button and from a map-body click, not from a dot click', () => {
    render(<Owner />);
    expect(dialog()).toBeNull();
    fireEvent.click(within(smallMap().parentElement).getByRole('button', { name: 'Expand map' }));
    expect(dialog()).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Close map' }));
    expect(dialog()).toBeNull();

    fireEvent.click(document.querySelector('[data-map-box]'));
    expect(dialog()).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Close map' }));
    expect(dialog()).toBeNull();

    // a dot in the small map filters, it does not expand
    fireEvent.click(smallMap().querySelector('[data-dot="KR"]'));
    expect(dialog()).toBeNull();
    expect(regionSpy).toHaveBeenLastCalledWith('East Asia');
    expect(smallMap()).toHaveAttribute('data-dim', 'FR,DE,US');
  });

  it('closes on Esc, the backdrop and the close button, never on a click inside', () => {
    render(<Owner />);
    fireEvent.click(screen.getByRole('button', { name: 'Expand map' }));
    expect(dialog()).not.toBeNull();
    fireEvent.click(dialog());
    expect(dialog()).not.toBeNull();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(dialog()).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Expand map' }));
    fireEvent.click(document.querySelector('[data-map-modal]'));
    expect(dialog()).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Expand map' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close map' }));
    expect(dialog()).toBeNull();
  });

  it('shows the countries pill, the full map with the shared region, and toggles the region from the caption and Show all', () => {
    render(<Owner initialRegion="Europe" />);
    fireEvent.click(screen.getByRole('button', { name: 'Expand map' }));
    const modal = dialog();
    expect(within(modal).getByText('4v4.GG')).toBeInTheDocument();
    expect(modal.querySelector('[data-country-count]')).toHaveTextContent('5 countries');
    const map = modal.querySelector('[data-mock-map]');
    expect(map).toHaveAttribute('data-compact', 'false');
    expect(map).toHaveAttribute('data-highlight', 'true');
    expect(map).toHaveAttribute('data-dim', 'CN,KR,US');
    expect(modal.querySelector('[data-map-region]')).toHaveTextContent('Europe');

    const caption = modal.querySelector('[data-map-caption]');
    expect(caption.textContent.replace(/\s+/g, ' ').trim()).toBe('Europe4·East Asia2·North America1');
    const europe = within(caption).getByRole('button', { name: 'Europe' });
    expect(europe).toHaveAttribute('data-active', 'true');
    expect(europe).toHaveAttribute('aria-pressed', 'true');

    // caption: same region again clears, another selects
    fireEvent.click(europe);
    expect(regionSpy).toHaveBeenLastCalledWith(null);
    expect(map).toHaveAttribute('data-dim', '');
    expect(modal.querySelector('[data-map-region]')).toBeNull();
    expect(within(modal).queryByRole('button', { name: 'Show all' })).toBeNull();
    fireEvent.click(within(caption).getByRole('button', { name: 'East Asia' }));
    expect(regionSpy).toHaveBeenLastCalledWith('East Asia');
    expect(map).toHaveAttribute('data-dim', 'FR,DE,US');
    expect(within(caption).getByRole('button', { name: 'East Asia' })).toHaveAttribute('data-active', 'true');
    // the small map follows the same state
    expect(smallMap()).toHaveAttribute('data-dim', 'FR,DE,US');

    // Show all clears
    fireEvent.click(within(modal).getByRole('button', { name: 'Show all' }));
    expect(regionSpy).toHaveBeenLastCalledWith(null);
    expect(map).toHaveAttribute('data-dim', '');
    expect(ownerScope()).toBe('none');
  });
});

describe('MapModal rail', () => {
  it('lists countries by count with name, count, avg MMR and a share bar, under the filter input and the caption', () => {
    const modal = openModal();
    expect(within(rail()).getByLabelText('Filter players')).toHaveValue('');
    expect(modal.querySelector('[data-rail-caption]')).toHaveTextContent('7 players · 5 countries');
    expect(countryRows()).toEqual(['DE', 'CN', 'FR', 'KR', 'US']);
    const de = rail().querySelector('[data-country-row="DE"]');
    expect(within(de).getByText('Germany')).toBeInTheDocument();
    expect(de.querySelector('img')).toHaveAttribute('alt', 'de');
    expect(de.querySelector('[data-country-row-count]')).toHaveTextContent('3');
    expect(de.querySelector('[data-country-row-avg]')).toHaveTextContent('1600');
    expect(railRows()).toEqual([]);
    expect(modal.querySelector('[data-players-header]')).toBeNull();
  });

  it('drills into a country from a row: players by MMR with flag, link, game dot and idle dimming; back returns to the list', () => {
    const modal = openModal();
    fireEvent.click(rail().querySelector('[data-country-row="DE"]'));
    expect(countrySpy).toHaveBeenLastCalledWith('DE');
    expect(ownerScope()).toBe('country:DE');
    expect(countryRows()).toEqual([]);
    expect(railRows()).toEqual(['b#1', 'c#1', 'old#1']);
    const header = modal.querySelector('[data-players-header]');
    expect(header).toHaveTextContent('Germany');
    expect(header.querySelector('img')).toHaveAttribute('alt', 'de');
    expect(header.querySelector('[data-players-count]')).toHaveTextContent('3');
    expect(modal.querySelector('[data-map-country]')).toHaveTextContent('Germany');
    expect(modal.querySelector('[data-map-region]')).toBeNull();
    // the map dims everything but Germany, on both maps
    expect(modal.querySelector('[data-mock-map]')).toHaveAttribute('data-dim', 'FR,CN,KR,US');
    expect(smallMap()).toHaveAttribute('data-dim', 'FR,CN,KR,US');

    const b = rail().querySelector('[data-rail-row="b#1"]');
    expect(within(b).getByRole('link', { name: 'b' })).toHaveAttribute('href', '/player/b%231');
    expect(b.querySelector('[data-in-game="true"]')).not.toBeNull();
    expect(b).toHaveAttribute('role', 'button');
    expect(within(b).getByText('1800')).toBeInTheDocument();
    expect([...b.querySelectorAll('img')].map((i) => i.getAttribute('alt'))).toContain('de');
    const c = rail().querySelector('[data-rail-row="c#1"]');
    expect(c.querySelector('[data-in-game="true"]')).toBeNull();
    expect(c).not.toHaveAttribute('role');
    expect(c).not.toHaveAttribute('data-dim');
    expect(rail().querySelector('[data-rail-row="old#1"]')).toHaveAttribute('data-dim', 'idle');

    // an in-game row opens the game, its name link does not
    fireEvent.click(b);
    expect(openGameSpy).toHaveBeenCalledWith(inGameInfoMap.get('b#1'));
    fireEvent.click(within(b).getByRole('link', { name: 'b' }));
    expect(openGameSpy).toHaveBeenCalledTimes(1);
    fireEvent.click(c);
    expect(openGameSpy).toHaveBeenCalledTimes(1);

    fireEvent.click(within(header).getByRole('button', { name: 'Back to countries' }));
    expect(countrySpy).toHaveBeenLastCalledWith(null);
    expect(ownerScope()).toBe('none');
    expect(countryRows()).toEqual(['DE', 'CN', 'FR', 'KR', 'US']);
    expect(railRows()).toEqual([]);
  });

  it('filters players by name across every country, narrows within a country, and the back arrow clears the filter', () => {
    const modal = openModal();
    const input = within(rail()).getByLabelText('Filter players');
    fireEvent.change(input, { target: { value: 'O' } });
    // "old" only; case-insensitive, whole channel, no country scope set
    expect(railRows()).toEqual(['old#1']);
    expect(countryRows()).toEqual([]);
    expect(ownerScope()).toBe('none');
    expect(modal.querySelector('[data-players-header]')).toHaveTextContent('Matches');
    fireEvent.change(input, { target: { value: 'zzz' } });
    expect(railRows()).toEqual([]);
    expect(within(rail()).getByText('No players match')).toBeInTheDocument();
    fireEvent.click(within(rail()).getByRole('button', { name: 'Clear filter' }));
    expect(input).toHaveValue('');
    expect(countryRows()).toEqual(['DE', 'CN', 'FR', 'KR', 'US']);

    // inside a country the filter narrows that country's players
    fireEvent.click(rail().querySelector('[data-country-row="DE"]'));
    fireEvent.change(input, { target: { value: 'c' } });
    expect(railRows()).toEqual(['c#1']);
    fireEvent.change(input, { target: { value: '' } });
    expect(railRows()).toEqual(['b#1', 'c#1', 'old#1']);
  });

  it('selects a country from a dot in the modal, the same dot again clears it, and Show all clears the country', () => {
    const modal = openModal({ initialRegion: 'Europe' });
    const map = modal.querySelector('[data-mock-map]');
    fireEvent.click(map.querySelector('[data-dot="US"]'));
    expect(countrySpy).toHaveBeenLastCalledWith('US');
    expect(ownerScope()).toBe('country:US');
    expect(dialog()).not.toBeNull();
    expect(railRows()).toEqual(['g#1']);
    expect(map).toHaveAttribute('data-dim', 'FR,DE,CN,KR');
    expect(modal.querySelector('[data-map-country]')).toHaveTextContent('United States');
    // the caption no longer marks Europe: one scope at a time
    expect(within(modal.querySelector('[data-map-caption]')).getByRole('button', { name: 'Europe' })).toHaveAttribute('data-active', 'false');

    fireEvent.click(map.querySelector('[data-dot="US"]'));
    expect(countrySpy).toHaveBeenLastCalledWith(null);
    expect(ownerScope()).toBe('none');
    expect(countryRows().length).toBe(5);

    fireEvent.click(map.querySelector('[data-dot="KR"]'));
    expect(ownerScope()).toBe('country:KR');
    fireEvent.click(within(modal).getByRole('button', { name: 'Show all' }));
    expect(countrySpy).toHaveBeenLastCalledWith(null);
    expect(ownerScope()).toBe('none');
    expect(map).toHaveAttribute('data-dim', '');
    expect(modal.querySelector('[data-map-country]')).toBeNull();
  });

  it('keeps the country scope after closing, and a region pick clears it', () => {
    openModal();
    fireEvent.click(rail().querySelector('[data-country-row="FR"]'));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(dialog()).toBeNull();
    expect(ownerScope()).toBe('country:FR');
    expect(smallMap()).toHaveAttribute('data-dim', 'DE,CN,KR,US');
    // reopening lands on the players view
    fireEvent.click(screen.getByRole('button', { name: 'Expand map' }));
    expect(railRows()).toEqual(['a#1']);
    fireEvent.click(within(dialog().querySelector('[data-map-caption]')).getByRole('button', { name: 'East Asia' }));
    expect(ownerScope()).toBe('region:East Asia');
    expect(countryRows().length).toBe(5);
  });
});
