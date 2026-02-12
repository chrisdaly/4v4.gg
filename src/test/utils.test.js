import { describe, it, expect } from 'vitest';
import {
  akaLookup,
  calcPlayerMmrAndChange,
  processMatchData,
  calculatePercentiles,
  processOngoingGameData,
  findPlayerInOngoingMatches,
  calculateTeamMMR,
  calculateWinProbability,
  findPotentialATGroups,
  toFlag,
  formatEventTime,
} from '../lib/utils';

/* ── akaLookup ──────────────────────────────── */

describe('akaLookup', () => {
  it('returns English name for known Chinese alias', () => {
    expect(akaLookup('完颜啊骨打')).toBe('hainiu');
  });

  it('returns English name for known Korean alias', () => {
    expect(akaLookup('테드의뜨거운눈빛')).toBe('bonggo');
  });

  it('returns null for unknown alias', () => {
    expect(akaLookup('someRandomName')).toBeNull();
  });
});

/* ── calcPlayerMmrAndChange ─────────────────── */

const makeMatch = (teams) => ({ teams });
const makePlayer = (battleTag, oldMmr, currentMmr, mmrGain) => ({
  battleTag,
  oldMmr,
  currentMmr,
  mmrGain,
});

describe('calcPlayerMmrAndChange', () => {
  const match = makeMatch([
    { players: [makePlayer('Alice#1234', 1500, 1520, 20), makePlayer('Bob#5678', 1400, 1380, -20)] },
    { players: [makePlayer('Carol#9999', 1600, 1580, -20), makePlayer('Dave#1111', 1700, 1720, 20)] },
  ]);

  it('finds player and returns MMR data with + prefix', () => {
    const result = calcPlayerMmrAndChange('Alice#1234', match);
    expect(result).toEqual({ oldMmr: 1500, mmrChange: '+20' });
  });

  it('returns negative MMR change as string', () => {
    const result = calcPlayerMmrAndChange('Bob#5678', match);
    expect(result).toEqual({ oldMmr: 1400, mmrChange: '-20' });
  });

  it('finds player on second team', () => {
    const result = calcPlayerMmrAndChange('Dave#1111', match);
    expect(result).toEqual({ oldMmr: 1700, mmrChange: '+20' });
  });

  it('returns null for non-existent player', () => {
    expect(calcPlayerMmrAndChange('Nobody#0000', match)).toBeNull();
  });
});

/* ── processMatchData ───────────────────────── */

describe('processMatchData', () => {
  const match = {
    id: 'match123',
    endTime: '2025-01-01T12:00:00Z',
    startTime: '2025-01-01T11:30:00Z',
    mapName: '(4)Ferocity',
    teams: [
      {
        players: [
          { battleTag: 'Alice#1234', currentMmr: 1520, oldMmr: 1500, mmrGain: 20, race: 1, won: true },
        ],
      },
      {
        players: [
          { battleTag: 'Bob#5678', currentMmr: 1380, oldMmr: 1400, mmrGain: -20, race: 2, won: false },
        ],
      },
    ],
  };

  it('extracts player data and win status', () => {
    const result = processMatchData(match, 'Alice#1234');
    expect(result.won).toBe(true);
    expect(result.playerData.currentMmr).toBe(1520);
    expect(result.playerData.race).toBe(1);
    expect(result.mapName).toBe('(4)Ferocity');
  });

  it('is case-insensitive for battleTag', () => {
    const result = processMatchData(match, 'alice#1234');
    expect(result.won).toBe(true);
  });

  it('returns null playerData for unknown player', () => {
    const result = processMatchData(match, 'Nobody#0000');
    expect(result.playerData).toBeNull();
    expect(result.won).toBe(false);
  });
});

/* ── calculatePercentiles ───────────────────── */

describe('calculatePercentiles', () => {
  it('calculates percentile ranks for an array', () => {
    const result = calculatePercentiles([10, 30, 20]);
    expect(result[0]).toBe(0);      // lowest value → 0th percentile
    expect(result[1]).toBe(100);    // highest value → 100th percentile
    expect(result[2]).toBe(50);     // middle value → 50th percentile
  });

  it('handles single element array', () => {
    const result = calculatePercentiles([42]);
    expect(result).toEqual([NaN]); // 0/0
  });

  it('handles two elements', () => {
    const result = calculatePercentiles([5, 10]);
    expect(result).toEqual([0, 100]);
  });
});

/* ── processOngoingGameData ─────────────────── */

describe('processOngoingGameData', () => {
  const match = {
    id: 'ongoing1',
    startTime: '2025-01-01T11:00:00Z',
    durationInSeconds: 754,
    serverInfo: { name: 'us-east', location: 'virginia' },
    mapName: '(4)Ferocity',
    teams: [
      { players: [{ battleTag: 'Alice#1234', race: 1, oldMmr: 1500 }] },
      { players: [{ battleTag: 'Bob#5678', race: 2, oldMmr: 1400 }] },
    ],
  };

  it('produces playerData and metaData', () => {
    const { playerData, metaData } = processOngoingGameData(match);
    expect(playerData).toHaveLength(2);
    expect(playerData[0].battleTag).toBe('Alice#1234');
    expect(metaData.matchId).toBe('ongoing1');
    expect(metaData.gameLength).toBe('12:34');
    expect(metaData.server).toBe('US-EAST');
    expect(metaData.mapName).toBe('(4)FEROCITY');
  });
});

/* ── findPlayerInOngoingMatches ──────────────── */

describe('findPlayerInOngoingMatches', () => {
  const allMatchData = {
    matches: [
      {
        id: 'match1',
        teams: [
          { players: [{ battleTag: 'Alice#1234' }, { battleTag: 'Bob#5678' }] },
          { players: [{ battleTag: 'Carol#9999' }] },
        ],
      },
      {
        id: 'match2',
        teams: [
          { players: [{ battleTag: 'Dave#1111' }] },
          { players: [{ battleTag: 'Eve#2222' }] },
        ],
      },
    ],
  };

  it('finds player in first match', () => {
    const result = findPlayerInOngoingMatches(allMatchData, 'Alice#1234');
    expect(result.id).toBe('match1');
  });

  it('finds player in second match', () => {
    const result = findPlayerInOngoingMatches(allMatchData, 'Eve#2222');
    expect(result.id).toBe('match2');
  });

  it('returns null for player not in any match', () => {
    expect(findPlayerInOngoingMatches(allMatchData, 'Nobody#0000')).toBeNull();
  });
});

/* ── calculateTeamMMR ───────────────────────── */

describe('calculateTeamMMR', () => {
  it('sums oldMmr across all teams and players', () => {
    const teams = [
      { players: [{ oldMmr: 1500 }, { oldMmr: 1600 }] },
      { players: [{ oldMmr: 1400 }, { oldMmr: 1700 }] },
    ];
    expect(calculateTeamMMR(teams)).toBe(6200);
  });

  it('handles empty teams', () => {
    expect(calculateTeamMMR([{ players: [] }])).toBe(0);
  });
});

/* ── calculateWinProbability ────────────────── */

describe('calculateWinProbability', () => {
  it('returns 50% for equal MMR', () => {
    expect(calculateWinProbability(1500, 1500)).toBe(50);
  });

  it('returns >50% when team1 has higher MMR', () => {
    const prob = calculateWinProbability(1600, 1400);
    expect(prob).toBeGreaterThan(50);
    expect(prob).toBeLessThanOrEqual(100);
  });

  it('returns <50% when team1 has lower MMR', () => {
    const prob = calculateWinProbability(1400, 1600);
    expect(prob).toBeLessThan(50);
    expect(prob).toBeGreaterThanOrEqual(0);
  });

  it('is symmetric: prob(A,B) + prob(B,A) = 100', () => {
    const a = calculateWinProbability(1500, 1700);
    const b = calculateWinProbability(1700, 1500);
    expect(a + b).toBe(100);
  });
});

/* ── findPotentialATGroups ──────────────────── */

describe('findPotentialATGroups', () => {
  it('finds players with matching MMR on team 0', () => {
    const players = [
      { battleTag: 'A#1', oldMmr: 1500 },
      { battleTag: 'B#2', oldMmr: 1500 },
      { battleTag: 'C#3', oldMmr: 1600 },
      { battleTag: 'D#4', oldMmr: 1700 },
      // team 2
      { battleTag: 'E#5', oldMmr: 1500 },
      { battleTag: 'F#6', oldMmr: 1500 },
      { battleTag: 'G#7', oldMmr: 1800 },
      { battleTag: 'H#8', oldMmr: 1900 },
    ];
    const groups = findPotentialATGroups(players, 0);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toEqual(['A#1', 'B#2']);
  });

  it('finds players with matching MMR on team 1', () => {
    const players = [
      { battleTag: 'A#1', oldMmr: 1500 },
      { battleTag: 'B#2', oldMmr: 1600 },
      { battleTag: 'C#3', oldMmr: 1700 },
      { battleTag: 'D#4', oldMmr: 1800 },
      // team 2
      { battleTag: 'E#5', oldMmr: 1500 },
      { battleTag: 'F#6', oldMmr: 1500 },
      { battleTag: 'G#7', oldMmr: 1500 },
      { battleTag: 'H#8', oldMmr: 1900 },
    ];
    const groups = findPotentialATGroups(players, 1);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toEqual(['E#5', 'F#6', 'G#7']);
  });

  it('returns empty for no matches', () => {
    const players = [
      { battleTag: 'A#1', oldMmr: 1500 },
      { battleTag: 'B#2', oldMmr: 1600 },
      { battleTag: 'C#3', oldMmr: 1700 },
      { battleTag: 'D#4', oldMmr: 1800 },
    ];
    expect(findPotentialATGroups(players, 0)).toEqual([]);
  });
});

/* ── toFlag ──────────────────────────────────── */

describe('toFlag', () => {
  it('converts country code to emoji flag', () => {
    expect(toFlag('US')).toBe('🇺🇸');
    expect(toFlag('DE')).toBe('🇩🇪');
  });

  it('is case-insensitive', () => {
    expect(toFlag('us')).toBe('🇺🇸');
  });

  it('returns empty string for invalid input', () => {
    expect(toFlag('')).toBe('');
    expect(toFlag(null)).toBe('');
    expect(toFlag('ABC')).toBe('');
  });
});

/* ── formatEventTime ─────────────────────────── */

describe('formatEventTime', () => {
  it('formats time as H:MM', () => {
    const d = new Date(2025, 0, 1, 14, 5);
    expect(formatEventTime(d)).toBe('14:05');
  });

  it('does not pad hours', () => {
    const d = new Date(2025, 0, 1, 9, 30);
    expect(formatEventTime(d)).toBe('9:30');
  });

  it('pads single-digit minutes', () => {
    const d = new Date(2025, 0, 1, 0, 3);
    expect(formatEventTime(d)).toBe('0:03');
  });
});
