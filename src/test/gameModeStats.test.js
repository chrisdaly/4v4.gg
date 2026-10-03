import { describe, it, expect } from 'vitest';
import { pickModeRow, toModeStats } from '../lib/api';
import { GAME_MODE } from '../lib/params';

// W3C returns one game-mode-stats row per mode, except 1v1, which it splits
// per race played. These are the shapes seen on live players.
const CHANJI = [
  { gameMode: 4, mmr: 2186, wins: 120, losses: 110, quantile: 0.9804 },
  { gameMode: 1, mmr: 2371, wins: 180, losses: 173, race: 2, quantile: 0.9926 },
  { gameMode: 1, mmr: 1996, wins: 0, losses: 1, race: 0, quantile: 0.9575 },
];

describe('pickModeRow', () => {
  it('takes the race a solo player actually plays, not the first row', () => {
    const row = pickModeRow(CHANJI, GAME_MODE.ONE_V_ONE);
    expect(row.mmr).toBe(2371);
    expect(row.race).toBe(2);
  });

  it('finds the single 4v4 row', () => {
    expect(pickModeRow(CHANJI, GAME_MODE.FOUR_V_FOUR).mmr).toBe(2186);
  });

  it('returns null for a mode the player has never queued', () => {
    expect(pickModeRow(CHANJI, GAME_MODE.TWO_V_TWO)).toBe(null);
  });

  it('survives a response that is not an array', () => {
    expect(pickModeRow(undefined, GAME_MODE.ONE_V_ONE)).toBe(null);
    expect(pickModeRow(null, GAME_MODE.ONE_V_ONE)).toBe(null);
  });

  it('still picks a row when every candidate has zero games', () => {
    const rows = [{ gameMode: 1, mmr: 1500, wins: 0, losses: 0 }];
    expect(pickModeRow(rows, GAME_MODE.ONE_V_ONE).mmr).toBe(1500);
  });
});

describe('toModeStats', () => {
  it('derives games and keeps the quantile that makes modes comparable', () => {
    const stats = toModeStats(pickModeRow(CHANJI, GAME_MODE.ONE_V_ONE));
    expect(stats.games).toBe(353);
    expect(stats.quantile).toBeCloseTo(0.9926);
  });

  it('maps an absent row to null rather than a zeroed player', () => {
    expect(toModeStats(null)).toBe(null);
  });

  it('nulls a missing quantile instead of coercing it to zero', () => {
    expect(toModeStats({ gameMode: 1, mmr: 1800, wins: 5, losses: 5 }).quantile).toBe(null);
  });
});
