import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import GamesPanel, { minutesIn } from '../components/chat/GamesPanel';
import { liveGamesFrom } from '../lib/chat/derived';

afterEach(cleanup);

const online = [{ battleTag: 'Moon#2356' }, { battleTag: 'Grubby#1' }];

const match = (id, over) => ({
  id,
  mapName: 'Ferocity',
  startTime: new Date(Date.now() - 5 * 60_000).toISOString(),
  teams: [
    { players: [{ battleTag: 'Moon#2356', name: 'Moon', oldMmr: 1800 }, { battleTag: 'X#9', name: 'X', oldMmr: 1700 }] },
    { players: [{ battleTag: 'Y#9', name: 'Y', oldMmr: 1750 }, { battleTag: 'Z#9', name: 'Z', oldMmr: 1760 }] },
  ],
  ...over,
});

describe('liveGamesFrom', () => {
  it('keeps only the matches someone in the channel is in, newest first', () => {
    const older = match('m1', { startTime: new Date(Date.now() - 20 * 60_000).toISOString() });
    const newer = match('m2');
    const theirs = {
      id: 'm3',
      mapName: 'Lilious',
      startTime: new Date().toISOString(),
      teams: [{ players: [{ battleTag: 'Nobody#1', name: 'Nobody', oldMmr: 1500 }] }],
    };
    const games = liveGamesFrom([older, newer, theirs], online);
    expect(games.map((g) => g.matchId)).toEqual(['m2', 'm1']);
  });

  it('names the channel players, counts the rest and averages the lobby', () => {
    const [game] = liveGamesFrom([match('m1')], online);
    expect(game).toMatchObject({ matchId: 'm1', mapName: 'Ferocity', names: ['Moon'], extra: 3, playerCount: 4 });
    expect(game.avgMmr).toBeGreaterThan(1700);
    expect(game.avgMmr).toBeLessThan(1800);
  });

  it('is empty with nobody online', () => {
    expect(liveGamesFrom([match('m1')], [])).toEqual([]);
  });
});

describe('minutesIn', () => {
  it('counts whole minutes and never goes negative', () => {
    const now = Date.now();
    expect(minutesIn(new Date(now - 5 * 60_000).toISOString(), now)).toBe(5);
    expect(minutesIn(new Date(now + 60_000).toISOString(), now)).toBe(0);
    expect(minutesIn(null)).toBeNull();
  });
});

const endEvent = {
  id: 'ge-m5', type: 'game_end', time: new Date().toISOString(), matchId: 'm5', mapName: 'Ferocity',
  durationInSeconds: 900,
  winners: [{ battleTag: 'Moon#2356', name: 'Moon', mmr: 1800, mmrGain: 12, inChannel: true }],
  losers: [{ battleTag: 'X#9', name: 'X', mmr: 1700, mmrGain: -9, inChannel: false }],
  winnersMmr: 1800, losersMmr: 1700,
};

describe('GamesPanel', () => {
  it('says so when nothing is happening', () => {
    render(<GamesPanel games={[]} finished={[]} />);
    expect(screen.getByText('Nobody here is in a game.')).toBeInTheDocument();
    expect(document.querySelector('[data-games-count]')).toBeNull();
  });

  it('lists each game with its minutes, players, lobby average and map', () => {
    const games = liveGamesFrom([match('m1')], online);
    render(<GamesPanel games={games} />);
    expect(document.querySelector('[data-games-count]')).toHaveTextContent('1');
    const row = document.querySelector('[data-game="m1"]');
    expect(row.querySelector('[data-minutes]')).toHaveTextContent('5m');
    expect(row).toHaveTextContent('Moon');
    expect(row).toHaveTextContent('+3');
    expect(row).toHaveTextContent('Ferocity');
  });

  it('opens the game card with the shape the in-game markers use', () => {
    const onOpenGame = vi.fn();
    const games = liveGamesFrom([match('m1')], online);
    render(<GamesPanel games={games} onOpenGame={onOpenGame} />);
    fireEvent.click(document.querySelector('[data-game="m1"]'));
    expect(onOpenGame).toHaveBeenCalledTimes(1);
    expect(onOpenGame.mock.calls[0][0]).toMatchObject({ matchId: 'm1', mapName: 'Ferocity' });
    expect(onOpenGame.mock.calls[0][0].startTime).toBeTruthy();
  });

  it('lists what just finished under the live games, newest first', () => {
    const older = { ...endEvent, id: 'ge-m4', matchId: 'm4', time: new Date(Date.now() - 600_000).toISOString() };
    render(<GamesPanel games={liveGamesFrom([match('m1')], online)} finished={[older, endEvent]} />);
    expect(screen.getByText('Just finished')).toBeInTheDocument();
    const finishedRows = [...document.querySelectorAll('[data-finished]')].map((el) => el.dataset.finished);
    expect(finishedRows).toEqual(['m5', 'm4']);
    expect(document.querySelector('[data-finished="m5"]')).toHaveTextContent('Moon won Ferocity');
  });

  it('opens a finished game from its row', () => {
    const onOpenGame = vi.fn();
    render(<GamesPanel games={[]} finished={[endEvent]} onOpenGame={onOpenGame} />);
    fireEvent.click(document.querySelector('[data-finished="m5"]'));
    expect(onOpenGame.mock.calls[0][0]).toMatchObject({ matchId: 'm5', mapName: 'Ferocity' });
  });

  it('ignores anything that is not a finish', () => {
    render(<GamesPanel games={[]} finished={[{ id: 'gs-m9', type: 'game_start', matchId: 'm9' }]} />);
    expect(document.querySelector('[data-finished]')).toBeNull();
    expect(screen.getByText('Nobody here is in a game.')).toBeInTheDocument();
  });
});