import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import PulseColumn from '../components/chat/PulseColumn';
import { dodge, ticks } from '../components/chat/MmrBeeswarmV';
import { buildPulseData } from '../lib/chat/pulseData';
import { usePulsePref } from '../lib/chat/pulsePref';

// The map is d3 + topojson fetch: stub it and expose the props it was given
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

// happy-dom has no layout: the beeswarm measures its host through
// ResizeObserver, so hand it a fixed 344x400 box on observe
const SWARM_BOX = { width: 344, height: 400 };
class FakeResizeObserver {
  constructor(cb) { this.cb = cb; }
  observe() { this.cb([{ contentRect: SWARM_BOX }]); }
  disconnect() {}
}

const user = (name) => ({ battleTag: `${name}#1`, name });
const users = [user('Moon'), user('Grubby'), user('Happy'), user('Sleepy'), user('Lyn')];
const stats = new Map([
  ['Moon#1', { mmr: 1800.4, race: 4 }],
  ['Grubby#1', { mmr: 1950, race: 2 }],
  ['Happy#1', { mmr: 2100, race: 8 }],
  ['Lyn#1', { mmr: 1700, race: 2 }],
]);
const avatars = new Map([['Moon#1', { profilePicUrl: 'https://x/moon.jpg', country: 'KR' }]]);
const inGameTags = new Set(['Moon#1', 'Lyn#1']);

function renderColumn(overrides = {}) {
  return render(
    <PulseColumn
      users={users}
      stats={stats}
      avatars={avatars}
      inGameTags={inGameTags}
      watchList={new Set()}
      onPlayerClick={() => {}}
      {...overrides}
    />
  );
}

const dot = (tag) => document.querySelector(`[data-dot="${tag}"]`);
const dotTags = () => [...document.querySelectorAll('[data-dot]')].map((el) => el.getAttribute('data-dot'));

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', FakeResizeObserver);
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  document.body.classList.remove('chat-focus');
  vi.unstubAllGlobals();
});

describe('PulseColumn frame', () => {
  it('renders the Pulse label with the countries count, the compact map and the top countries under it', () => {
    renderColumn();
    const column = document.querySelector('[data-pulse]');
    expect(column).toHaveTextContent('Pulse');
    expect(document.querySelector('[data-pulse-countries]')).toHaveTextContent('1 country');
    const map = document.querySelector('[data-pulse-map] [data-mock-map]');
    expect(map).toHaveAttribute('data-compact', 'true');
    expect(map).toHaveAttribute('data-instant', 'true');
    // Moon is Korean and in a game; nobody else has a country yet
    expect(JSON.parse(map.getAttribute('data-countries'))).toEqual([['KR', { online: 0, inGame: 1 }]]);
    expect(map).toHaveAttribute('data-players', 'Moon#1:KR:1800.4:true');
    expect(document.querySelector('[data-pulse-top]')).toHaveTextContent('KR 1');
    // map above the top-countries line above the swarm
    const order = [...column.querySelectorAll('[data-pulse-map], [data-pulse-top], [data-pulse-swarm]')].map((el) => el.dataset);
    expect(order.map((d) => Object.keys(d)[0])).toEqual(['pulseMap', 'pulseTop', 'pulseSwarm']);
  });

  it('captions the country count and the top three countries by headcount, ties by code', () => {
    const roster = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((n) => user(n));
    const countries = { A: 'de', B: 'de', C: 'de', D: 'fr', E: 'fr', F: 'cn', G: 'us' };
    const av = new Map(Object.entries(countries).map(([n, c]) => [`${n}#1`, { country: c }]));
    renderColumn({ users: roster, avatars: av, stats: new Map(), inGameTags: new Set() });
    expect(document.querySelector('[data-pulse-countries]')).toHaveTextContent('4 countries');
    expect(document.querySelector('[data-pulse-top]')).toHaveTextContent('DE 3 · FR 2 · CN 1');
    expect(JSON.parse(document.querySelector('[data-mock-map]').getAttribute('data-countries'))).toEqual([
      ['DE', { online: 3, inGame: 0 }],
      ['FR', { online: 2, inGame: 0 }],
      ['CN', { online: 1, inGame: 0 }],
      ['US', { online: 1, inGame: 0 }],
    ]);
  });

  it('is not rendered when the preference is off', () => {
    renderColumn({ open: false });
    expect(document.querySelector('[data-pulse]')).toBeNull();
    expect(document.querySelector('[data-mock-map]')).toBeNull();
  });

  it('reads the persisted preference: off in storage hides the column until toggled back on', () => {
    localStorage.setItem('chat:showPulse', '0');
    function Harness() {
      const [showPulse, togglePulse] = usePulsePref();
      return (
        <>
          <button type="button" onClick={togglePulse}>Pulse</button>
          <PulseColumn open={showPulse} users={users} stats={stats} avatars={avatars} inGameTags={inGameTags} />
        </>
      );
    }
    render(<Harness />);
    expect(document.querySelector('[data-pulse]')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Pulse' }));
    expect(document.querySelector('[data-pulse]')).not.toBeNull();
    expect(localStorage.getItem('chat:showPulse')).toBe('1');
    fireEvent.click(screen.getByRole('button', { name: 'Pulse' }));
    expect(document.querySelector('[data-pulse]')).toBeNull();
    expect(localStorage.getItem('chat:showPulse')).toBe('0');
  });

  it('defaults to shown with nothing in storage', () => {
    function Harness() {
      const [showPulse] = usePulsePref();
      return <PulseColumn open={showPulse} users={users} stats={stats} avatars={avatars} inGameTags={inGameTags} />;
    }
    render(<Harness />);
    expect(document.querySelector('[data-pulse]')).not.toBeNull();
  });

  it('hides while Focus mode (body.chat-focus) is on and returns when it ends', async () => {
    renderColumn();
    expect(document.querySelector('[data-pulse]')).not.toBeNull();
    await act(async () => {
      document.body.classList.add('chat-focus');
      await Promise.resolve();
    });
    expect(document.querySelector('[data-pulse]')).toBeNull();
    await act(async () => {
      document.body.classList.remove('chat-focus');
      await Promise.resolve();
    });
    expect(document.querySelector('[data-pulse]')).not.toBeNull();
  });

  it('starts hidden when mounted with Focus already on', () => {
    document.body.classList.add('chat-focus');
    renderColumn();
    expect(document.querySelector('[data-pulse]')).toBeNull();
  });
});

describe('PulseColumn beeswarm', () => {
  it('draws one dot per known MMR, gold for in-game, with a name and MMR title', () => {
    renderColumn();
    expect(dotTags().sort()).toEqual(['Grubby#1', 'Happy#1', 'Lyn#1', 'Moon#1']);
    expect(dot('Moon#1')).toHaveAttribute('data-ingame', 'true');
    expect(dot('Lyn#1')).toHaveAttribute('data-ingame', 'true');
    expect(dot('Happy#1')).not.toHaveAttribute('data-ingame');
    expect(dot('Moon#1').querySelector('title')).toHaveTextContent('Moon · 1800 · in game');
    expect(dot('Happy#1').querySelector('title')).toHaveTextContent('Happy · 2100');
    const gold = dot('Moon#1').querySelector('circle:not([data-ring])').getAttribute('fill');
    const white = dot('Happy#1').querySelector('circle:not([data-ring])').getAttribute('fill');
    expect(gold).not.toBe(white);
    expect(white).toBe('rgba(255, 255, 255, 0.75)');
  });

  it('places higher MMR higher up on the fixed 900..2600 scale with ticks every 300', () => {
    renderColumn();
    const cy = (tag) => Number(dot(tag).querySelector('circle:not([data-ring])').getAttribute('cy'));
    expect(cy('Happy#1')).toBeLessThan(cy('Grubby#1'));
    expect(cy('Grubby#1')).toBeLessThan(cy('Moon#1'));
    expect(cy('Moon#1')).toBeLessThan(cy('Lyn#1'));
    const tickValues = [...document.querySelectorAll('[data-tick]')].map((el) => Number(el.getAttribute('data-tick')));
    expect(tickValues).toEqual([900, 1200, 1500, 1800, 2100, 2400]);
    expect(ticks()).toEqual(tickValues);
    const tickText = document.querySelector('[data-tick="1800"] text');
    expect(tickText).toHaveTextContent('1800');
    expect(tickText).toHaveAttribute('font-family', 'var(--font-mono)');
    expect(tickText).toHaveAttribute('font-size', 'var(--text-xxxs)');
  });

  it('rings watched players in gold', () => {
    renderColumn({ watchList: new Set(['lyn#1']) });
    expect(dot('Lyn#1')).toHaveAttribute('data-watched', 'true');
    expect(dot('Lyn#1').querySelector('[data-ring]')).toHaveAttribute('stroke', 'var(--gold)');
    expect(dot('Moon#1')).not.toHaveAttribute('data-watched');
    expect(dot('Moon#1').querySelector('[data-ring]')).toBeNull();
  });

  it('reports the clicked dot through onPlayerClick', () => {
    const onPlayerClick = vi.fn();
    renderColumn({ onPlayerClick });
    fireEvent.click(dot('Grubby#1').querySelector('circle'));
    expect(onPlayerClick).toHaveBeenCalledTimes(1);
    expect(onPlayerClick).toHaveBeenCalledWith('Grubby#1');
  });

  it('spreads equal MMRs sideways without overlap', () => {
    const roster = ['A', 'B', 'C', 'D', 'E'].map((n) => user(n));
    const same = new Map(roster.map((u) => [u.battleTag, { mmr: 1800 }]));
    renderColumn({ users: roster, stats: same, avatars: new Map(), inGameTags: new Set() });
    const xs = [...document.querySelectorAll('[data-dot] circle')].map((c) => Number(c.getAttribute('cx')));
    expect(new Set(xs).size).toBe(5);
    xs.sort((a, b) => a - b);
    for (let i = 1; i < xs.length; i++) expect(xs[i] - xs[i - 1]).toBeGreaterThanOrEqual(8);
  });
});

describe('dodge layout', () => {
  it('keeps every pair at least a diameter plus gap apart and stays within the half width', () => {
    const points = Array.from({ length: 24 }, (_, i) => ({ tag: `p${i}`, y: 100 + (i % 7) * 1.5 }));
    const placed = dodge(points, 4, 150);
    for (let i = 0; i < placed.length; i++) {
      expect(Math.abs(placed[i].x)).toBeLessThanOrEqual(150);
      for (let j = i + 1; j < placed.length; j++) {
        const d = Math.hypot(placed[i].x - placed[j].x, placed[i].y - placed[j].y);
        expect(d).toBeGreaterThanOrEqual(9 - 1e-6);
      }
    }
    // the first dot sits on the centre line
    expect(placed[0].x).toBe(0);
  });

  it('is deterministic for the same input', () => {
    const points = Array.from({ length: 12 }, (_, i) => ({ tag: `p${i}`, y: 50 + (i % 3) }));
    expect(dodge(points, 4, 100)).toEqual(dodge([...points].reverse(), 4, 100));
  });
});

describe('buildPulseData', () => {
  it('shapes strip, map and captions; unknown MMR players skip the strip, no country skips the map', () => {
    const d = buildPulseData(users, stats, avatars, inGameTags);
    expect(d.stripPlayers.map((p) => `${p.battleTag}:${p.mmr}`).sort()).toEqual(
      ['Grubby#1:1950', 'Happy#1:2100', 'Lyn#1:1700', 'Moon#1:1800.4'],
    );
    expect(d.stripPlayers.find((p) => p.battleTag === 'Moon#1').name).toBe('Moon');
    expect(d.mapPlayers).toEqual([{ battleTag: 'Moon#1', name: 'Moon', country: 'KR', mmr: 1800.4, inGame: true }]);
    expect(d.countryCount).toBe(1);
    expect(d.topCountries).toEqual([['KR', 1]]);
    expect(d.countriesLabel).toBe('1 country');
    expect(d.topLabel).toBe('KR 1');
  });

  it('handles an empty roster', () => {
    const d = buildPulseData([], new Map(), new Map(), new Set());
    expect(d.stripPlayers).toEqual([]);
    expect(d.countriesLabel).toBe('0 countries');
    expect(d.topLabel).toBe('');
  });
});
