import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup, within, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MapPanel from '../components/chat/MapPanel';
import RegionsPanel from '../components/chat/RegionsPanel';
import { regionSummary } from '../lib/chat/regions';

// The map is d3 + a topojson fetch: stub it, expose its props and let a test
// click a dot through onDotClick
let lastMapProps = null;
vi.mock('../components/WorldMap', () => ({
  default: (props) => {
    lastMapProps = props;
    return (
      <div
        data-mock-map
        data-dim={props.dimOutside ?? ''}
        data-highlight={String(Boolean(props.highlightInGame))}
        data-countries={JSON.stringify([...props.playerCountries])}
      >
        {[...props.playerCountries.keys()].map((code) => (
          <button key={code} data-dot={code} onClick={() => props.onDotClick(code)}>{code}</button>
        ))}
      </div>
    );
  },
}));

const digestMock = vi.hoisted(() => ({ value: null }));
vi.mock('../lib/chat/digestToday', () => ({
  fetchTodayDigest: () => Promise.resolve(digestMock.value),
}));

const u = (name, cc, mmr) => ({ battleTag: `${name}#1`, name, cc, mmr });
const roster = [u('a', 'FR', 2000), u('b', 'DE', 1800), u('c', 'DE', 1600), u('e', 'CN', 1900), u('f', 'KR', 1700), u('g', 'US', 1500)];
const stats = new Map(roster.map((x) => [x.battleTag, { mmr: x.mmr }]));
const avatars = new Map(roster.map((x) => [x.battleTag, { country: x.cc }]));
const inGameTags = new Set(['b#1']);
const NOON = new Date('2026-09-23T12:00:00Z');

function renderMap(overrides = {}) {
  return render(
    <MemoryRouter>
      <MapPanel users={roster} avatars={avatars} stats={stats} inGameTags={inGameTags} status="connected" {...overrides} />
    </MemoryRouter>
  );
}

beforeEach(() => {
  lastMapProps = null;
  digestMock.value = null;
});

afterEach(() => {
  cleanup();
});

describe('MapPanel header', () => {
  it('links home with a green relay dot when connected, red otherwise, and counts countries', () => {
    renderMap();
    const home = screen.getByRole('link', { name: /4v4\.GG/ });
    expect(home).toHaveAttribute('href', '/');
    expect(document.querySelector('[data-relay-status]')).toHaveAttribute('data-relay-status', 'connected');
    expect(document.querySelector('[data-country-count]')).toHaveTextContent('5 countries');
    cleanup();
    renderMap({ status: 'reconnecting' });
    expect(document.querySelector('[data-relay-status]')).toHaveAttribute('data-relay-status', 'reconnecting');
    expect(document.querySelector('[data-relay-status]')).toHaveAttribute('title', 'Relay reconnecting');
  });

  it('renders search, stats and games icon buttons that report toggles and reflect their state', () => {
    const onSearchOpenChange = vi.fn();
    const onStatsOpenChange = vi.fn();
    const onShowGamesChange = vi.fn();
    renderMap({ searchOpen: false, statsOpen: true, showGames: true, onSearchOpenChange, onStatsOpenChange, onShowGamesChange });
    const search = screen.getByRole('button', { name: 'Search chat history' });
    const statsBtn = screen.getByRole('button', { name: 'Channel stats' });
    const games = screen.getByRole('button', { name: 'Game tickers' });
    expect(search).toHaveAttribute('aria-pressed', 'false');
    expect(statsBtn).toHaveAttribute('aria-pressed', 'true');
    expect(statsBtn).toHaveAttribute('data-active', 'true');
    expect(games).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(search);
    expect(onSearchOpenChange).toHaveBeenCalledWith(true);
    fireEvent.click(statsBtn);
    expect(onStatsOpenChange).toHaveBeenCalledWith(false);
    fireEvent.click(games);
    expect(onShowGamesChange).toHaveBeenCalledWith(false);
    expect(search.querySelector('svg')).not.toBeNull();
    expect(games.querySelector('svg')).not.toBeNull();
  });

  it('shows the digest link only when today has one', async () => {
    renderMap();
    await act(async () => {});
    expect(screen.queryByRole('link', { name: "Today's digest" })).toBeNull();
    cleanup();
    digestMock.value = { date: '2026-09-23', href: '/news?day=2026-09-23' };
    renderMap();
    await act(async () => {});
    expect(screen.getByRole('link', { name: "Today's digest" })).toHaveAttribute('href', '/news?day=2026-09-23');
  });
});

describe('MapPanel map', () => {
  it('feeds WorldMap the country counts, highlights in-game countries and dims outside the region', () => {
    renderMap({ region: 'Europe' });
    const map = document.querySelector('[data-mock-map]');
    expect(map).toHaveAttribute('data-dim', 'Europe');
    expect(map).toHaveAttribute('data-highlight', 'true');
    expect(lastMapProps.playerCountries.get('DE')).toEqual({ online: 1, inGame: 1 });
    expect(lastMapProps.playerCountries.get('CN')).toEqual({ online: 1, inGame: 0 });
    expect(lastMapProps.players.map((p) => p.battleTag)).toEqual(roster.map((r) => r.battleTag));
    expect(lastMapProps.instant).toBe(true);
    expect(map).toHaveAttribute('data-dim', 'Europe');
  });

  it('toggles the region from a dot click', () => {
    const onRegionChange = vi.fn();
    renderMap({ region: null, onRegionChange });
    fireEvent.click(document.querySelector('[data-dot="KR"]'));
    expect(onRegionChange).toHaveBeenLastCalledWith('East Asia');
    cleanup();
    renderMap({ region: 'East Asia', onRegionChange });
    fireEvent.click(document.querySelector('[data-dot="CN"]'));
    expect(onRegionChange).toHaveBeenLastCalledWith(null);
    fireEvent.click(document.querySelector('[data-dot="US"]'));
    expect(onRegionChange).toHaveBeenLastCalledWith('North America');
  });
});

const rows = regionSummary(roster, { stats, avatars }, NOON).rows;
const rowEls = () => [...document.querySelectorAll('[data-region]')];

describe('RegionsPanel', () => {
  it('renders rows sorted by count with flags, count, avg MMR, local time and a share bar', () => {
    render(<RegionsPanel rows={rows} region={null} onRegionChange={() => {}} />);
    expect(rowEls().map((el) => el.getAttribute('data-region'))).toEqual(['Europe', 'East Asia', 'North America']);
    const eu = rowEls()[0];
    expect(within(eu).getByText('Europe')).toBeInTheDocument();
    expect(eu.querySelector('[data-region-count]')).toHaveTextContent('3');
    expect(eu.querySelector('[data-region-avg]')).toHaveTextContent('1800');
    expect(eu.querySelector('[data-region-time]')).toHaveTextContent('1:00p');
    const flags = [...eu.querySelectorAll('img')].map((img) => img.getAttribute('alt'));
    expect(flags).toEqual(['de', 'fr']);
    expect(screen.getByText('online · avg MMR · local')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show all' })).toBeNull();
    expect(rowEls().some((el) => el.hasAttribute('data-selected'))).toBe(false);
  });

  it('marks the selected row, offers Show all, and toggles the region on click and keyboard', () => {
    const onRegionChange = vi.fn();
    render(<RegionsPanel rows={rows} region="East Asia" onRegionChange={onRegionChange} />);
    const [eu, ea] = rowEls();
    expect(ea).toHaveAttribute('data-selected', 'true');
    expect(ea).toHaveAttribute('aria-pressed', 'true');
    expect(eu).not.toHaveAttribute('data-selected');
    fireEvent.click(ea);
    expect(onRegionChange).toHaveBeenLastCalledWith(null);
    fireEvent.click(eu);
    expect(onRegionChange).toHaveBeenLastCalledWith('Europe');
    fireEvent.keyDown(eu, { key: 'Enter' });
    expect(onRegionChange).toHaveBeenCalledTimes(3);
    fireEvent.click(screen.getByRole('button', { name: 'Show all' }));
    expect(onRegionChange).toHaveBeenLastCalledWith(null);
  });

  it('renders nothing but the header for an empty roster', () => {
    render(<RegionsPanel rows={[]} region={null} onRegionChange={() => {}} />);
    expect(rowEls().length).toBe(0);
    expect(screen.getByText('Regions')).toBeInTheDocument();
  });
});
