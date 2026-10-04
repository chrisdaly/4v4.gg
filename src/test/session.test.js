import { describe, it, expect } from 'vitest';
import { detectSessionGames, matchIdleGapMs, SESSION_GAP_MINUTES, groupIntoSessions, describeSession } from '../lib/session';

// Matches arrive newest first, as the API hands them over
const at = (minutesAgo, lengthMinutes = 20) => ({
  startTime: new Date(Date.UTC(2026, 9, 1, 12, 0) + (-minutesAgo) * 60000).toISOString(),
  endTime: new Date(Date.UTC(2026, 9, 1, 12, 0) + (-minutesAgo + lengthMinutes) * 60000).toISOString(),
});

const match = (minutesAgo, won, mmr) => {
  const { startTime, endTime } = at(minutesAgo);
  return {
    startTime,
    endTime,
    teams: [
      { players: [{ battleTag: 'Solana#1', won, oldMmr: mmr, currentMmr: mmr + (won ? 12 : -12) }] },
      { players: [{ battleTag: 'riggen#2', won: !won, oldMmr: 1500, currentMmr: 1500 }] },
    ],
  };
};

describe('detectSessionGames', () => {
  it('is one sitting: games break apart only on a gap of more than two hours', () => {
    expect(SESSION_GAP_MINUTES).toBe(120);
    // four games through the evening, the longest break 90 minutes, then a
    // three-hour gap to the afternoon's games
    const matches = [
      match(0, true, 1560),
      match(110, false, 1548), // 90 min idle after the one before it
      match(160, true, 1560),
      match(200, true, 1548),
      match(400, false, 1560), // 180 min idle: yesterday's sitting, in effect
      match(440, true, 1572),
    ];
    const session = detectSessionGames(matches, 'Solana#1');
    expect(session).toHaveLength(4);
    expect(session.map((g) => g.won)).toEqual([true, false, true, true]);
    expect(session[0].mmrGain).toBe(12);
  });

  it('counts only the games the player is in, and takes the gap as given', () => {
    const matches = [match(0, true, 1500), match(100, false, 1488)];
    expect(detectSessionGames(matches, 'nobody#9')).toEqual([]);
    expect(detectSessionGames(matches, 'Solana#1')).toHaveLength(2);
    // a shorter gap than the default splits the same two games
    expect(detectSessionGames(matches, 'Solana#1', 60)).toHaveLength(1);
    expect(detectSessionGames([], 'Solana#1')).toEqual([]);
  });

  it('measures idle time as the newer game starting after the older one ended', () => {
    const older = match(200, true, 1500);
    const newer = match(100, true, 1512);
    // 200 min ago plus a 20 min game, to 100 min ago: 80 minutes idle
    expect(matchIdleGapMs(newer, older)).toBe(80 * 60 * 1000);
  });
});

// ── The history table's sittings ──

const clockAt = (h, m = 0) => new Date(2026, 9, 3, h, m).toISOString();
const game = (startH, endH, won, oldMmr, currentMmr, startM = 0, endM = 0) => ({
  startTime: clockAt(startH, startM), endTime: clockAt(endH, endM),
  teams: [{ players: [{ battleTag: 'Me#1', won, oldMmr, currentMmr }] }, { players: [] }],
});

describe('groupIntoSessions', () => {
  it('splits a newest-first page where the idle gap passes two hours', () => {
    const matches = [
      game(21, 21, true, 1500, 1507, 0, 30),   // 21:00-21:30
      game(20, 20, false, 1508, 1500, 0, 45),  // 20:00-20:45, 15 min after the one below
      game(19, 19, true, 1500, 1508, 0, 45),   // 19:00-19:45
      game(14, 14, false, 1510, 1500, 0, 30),  // 14:00-14:30, 4h30 before the one above
    ];
    const groups = groupIntoSessions(matches, 'me#1');
    expect(groups).toHaveLength(2);
    expect(groups[0].matches).toHaveLength(3);
    expect(groups[0]).toMatchObject({ wins: 2, losses: 1, mmrChange: 7, start: clockAt(19), end: clockAt(21, 30) });
    expect(groups[1]).toMatchObject({ wins: 0, losses: 1, mmrChange: -10 });
  });

  it('skips a match the player is not in and returns nothing for an empty page', () => {
    const stray = { startTime: clockAt(10), endTime: clockAt(10, 20), teams: [{ players: [{ battleTag: 'Other#2', won: true }] }] };
    expect(groupIntoSessions([stray], 'me#1')).toEqual([]);
    expect(groupIntoSessions([], 'me#1')).toEqual([]);
  });
});

describe('describeSession', () => {
  const now = new Date(2026, 9, 4, 12, 0);
  it('names today and yesterday, and dates the rest', () => {
    expect(describeSession(new Date(2026, 9, 4, 9, 5), new Date(2026, 9, 4, 11, 0), now)).toEqual({ day: 'Today', time: '9:05-11:00' });
    expect(describeSession(new Date(2026, 9, 3, 18, 39), new Date(2026, 9, 3, 21, 9), now).day).toBe('Yesterday');
    expect(describeSession(new Date(2026, 8, 27, 20, 0), new Date(2026, 8, 27, 22, 0), now).day).toBe('Sun 27 Sept');
    expect(describeSession(new Date(2025, 11, 31, 20, 0), new Date(2025, 11, 31, 22, 0), now).day).toMatch(/2025$/);
  });
});
