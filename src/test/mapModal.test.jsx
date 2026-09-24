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
    <div data-mock-map data-dim={props.dimOutside ?? ''} data-compact={String(Boolean(props.compact))} data-highlight={String(Boolean(props.highlightInGame))}>
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

const u = (name, cc, mmr) => ({ battleTag: `${name}#1`, name, cc, mmr });
const roster = [u('a', 'FR', 2000), u('b', 'DE', 1800), u('c', 'DE', 1600), u('e', 'CN', 1900), u('f', 'KR', 1700), u('g', 'US', 1500)];
const stats = new Map(roster.map((x) => [x.battleTag, { mmr: x.mmr }]));
const avatars = new Map(roster.map((x) => [x.battleTag, { country: x.cc }]));
const inGameTags = new Set(['b#1']);
const NOON = new Date('2026-09-23T12:00:00Z');
const rows = regionSummary(roster, { stats, avatars }, NOON).rows;

// Stands in for Chat.jsx: the region filter and mapOpen live here, the
// panel opens the modal, both share the region
const regionSpy = vi.fn();
function Owner({ initialRegion = null }) {
  const [region, setRegionState] = React.useState(initialRegion);
  const [mapOpen, setMapOpen] = React.useState(false);
  const setRegion = (r) => {
    regionSpy(r);
    setRegionState(r);
  };
  return (
    <MemoryRouter>
      <MapPanel users={roster} avatars={avatars} stats={stats} inGameTags={inGameTags} status="connected" region={region} onRegionChange={setRegion} onExpand={() => setMapOpen(true)} />
      {mapOpen && (
        <MapModal users={roster} avatars={avatars} stats={stats} inGameTags={inGameTags} regions={rows} region={region} onRegionChange={setRegion} onClose={() => setMapOpen(false)} />
      )}
    </MemoryRouter>
  );
}

const dialog = () => screen.queryByRole('dialog', { name: 'World map' });
const smallMap = () => document.querySelector('[data-map-panel] [data-mock-map]');

afterEach(() => {
  cleanup();
  regionSpy.mockClear();
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
    expect(smallMap()).toHaveAttribute('data-dim', 'East Asia');
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

  it('shows the countries pill, the full map with the shared region, and toggles the region from the caption, a dot and Show all', () => {
    render(<Owner initialRegion="Europe" />);
    fireEvent.click(screen.getByRole('button', { name: 'Expand map' }));
    const modal = dialog();
    expect(within(modal).getByText('4v4.GG')).toBeInTheDocument();
    expect(modal.querySelector('[data-country-count]')).toHaveTextContent('5 countries');
    const map = modal.querySelector('[data-mock-map]');
    expect(map).toHaveAttribute('data-compact', 'false');
    expect(map).toHaveAttribute('data-highlight', 'true');
    expect(map).toHaveAttribute('data-dim', 'Europe');
    expect(modal.querySelector('[data-map-region]')).toHaveTextContent('Europe');

    const caption = modal.querySelector('[data-map-caption]');
    expect(caption.textContent.replace(/\s+/g, ' ').trim()).toBe('Europe3·East Asia2·North America1');
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
    expect(map).toHaveAttribute('data-dim', 'East Asia');
    expect(within(caption).getByRole('button', { name: 'East Asia' })).toHaveAttribute('data-active', 'true');
    // the small map follows the same state
    expect(smallMap()).toHaveAttribute('data-dim', 'East Asia');

    // a dot in the modal toggles too, and Show all clears
    fireEvent.click(map.querySelector('[data-dot="US"]'));
    expect(regionSpy).toHaveBeenLastCalledWith('North America');
    expect(dialog()).not.toBeNull();
    fireEvent.click(within(modal).getByRole('button', { name: 'Show all' }));
    expect(regionSpy).toHaveBeenLastCalledWith(null);
    expect(map).toHaveAttribute('data-dim', '');
  });
});
