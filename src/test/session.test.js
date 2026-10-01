import { describe, it, expect } from 'vitest';
import { detectSessionGames, matchIdleGapMs, SESSION_GAP_MINUTES } from '../lib/session';

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
