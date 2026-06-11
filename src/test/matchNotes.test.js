import { describe, it, expect } from 'vitest';
import { computeNote, computeMvp, noteContextFromMatch } from '../lib/matchNotes';

const player = (tag, race, mmrGain = 5) => ({
  battleTag: `${tag}#1`,
  name: tag,
  race,
  mmrGain,
});

const ctx = (overrides = {}) => ({
  winners: [player('A', 1), player('B', 2), player('C', 4), player('D', 8)],
  losers: [player('E', 1, -5), player('F', 2, -5), player('G', 4, -5), player('H', 8, -5)],
  winnersMmr: 1500,
  losersMmr: 1500,
  durationInSeconds: 20 * 60,
  ...overrides,
});

const scores = (perPlayer) =>
  perPlayer.map(([tag, hk, exp, gold, uk, army]) => ({
    battleTag: `${tag}#1`,
    heroScore: { heroesKilled: hk, expGained: exp },
    resourceScore: { goldCollected: gold },
    unitScore: { unitsKilled: uk, largestArmy: army },
  }));

const evenScores = scores([
  ['A', 1, 2000, 10000, 40, 60],
  ['B', 1, 2100, 10100, 41, 61],
  ['C', 2, 2200, 10200, 42, 62],
  ['D', 1, 2300, 10300, 43, 63],
  ['E', 2, 2400, 10400, 44, 64],
  ['F', 1, 2500, 10500, 45, 65],
  ['G', 2, 2600, 10600, 46, 66],
  ['H', 1, 2700, 10700, 47, 67],
]);

describe('computeNote', () => {
  it('returns null for an unremarkable game', () => {
    expect(computeNote(ctx({ winnersMmr: 1500, losersMmr: 1510 }))).toBeNull();
  });

  it('flags all-race victories above everything', () => {
    const c = ctx({
      winners: [player('A', 8), player('B', 8), player('C', 8), player('D', 8)],
      winnersMmr: 1400,
      losersMmr: 1500, // would also be an upset
    });
    expect(computeNote(c)).toBe('all-Undead victory');
  });

  it('prefers upsets over triple-race wins', () => {
    const c = ctx({
      winners: [player('A', 1), player('B', 1), player('C', 1), player('D', 8)],
      winnersMmr: 1400,
      losersMmr: 1500,
    });
    expect(computeNote(c)).toMatch(/^upset/);
  });

  it('prefers scoreboard dominance over triple-race wins', () => {
    const c = ctx({
      winners: [player('A', 1), player('B', 1), player('C', 1), player('D', 8)],
    });
    // Different players top different stats — like real lobbies — so A's
    // sweep produces a wide rank-sum gap over second place
    const dominant = scores([
      ['A', 9, 9000, 90000, 99, 89],
      ['B', 2, 2000, 15000, 30, 70],
      ['C', 3, 2500, 11000, 50, 55],
      ['D', 0, 3000, 12000, 35, 65],
      ['E', 4, 1800, 13000, 45, 50],
      ['F', 1, 2200, 10000, 55, 60],
      ['G', 5, 2800, 14000, 25, 75],
      ['H', 2, 2600, 9000, 60, 45],
    ]);
    expect(computeNote(c, { playerScores: dominant })).toBe('A dominated the scoreboard');
  });

  it('flags rare hero picks', () => {
    const heroStats = [
      {
        pick: 0,
        stats: [
          { icon: 'archmage', count: 9950 },
          { icon: 'beastmaster', count: 50 },
        ],
      },
    ];
    const matchPlayers = [
      { battleTag: 'A#1', heroes: [{ icon: 'beastmaster', level: 5 }] },
      { battleTag: 'B#1', heroes: [{ icon: 'archmage', level: 5 }] },
    ];
    expect(computeNote(ctx(), { matchPlayers, heroStats })).toBe(
      'A went Beastmaster first — a 0.5% pick'
    );
  });

  it('flags stunted hero levels in long games', () => {
    const matchPlayers = 'ABCDEFGH'.split('').map((tag, i) => ({
      battleTag: `${tag}#1`,
      heroes: [{ icon: 'archmage', level: i === 0 ? 3 : 12 }],
    }));
    expect(computeNote(ctx({ durationInSeconds: 25 * 60 }), { matchPlayers })).toBe(
      'A finished with only 3 hero levels'
    );
  });

  it('flags stomps and marathons', () => {
    expect(computeNote(ctx({ durationInSeconds: 9 * 60, winnersMmr: 1500, losersMmr: 1510 }))).toBe('over in 9 minutes');
    expect(computeNote(ctx({ durationInSeconds: 40 * 60, winnersMmr: 1500, losersMmr: 1510 }))).toBe('40-minute marathon');
  });

  it('skips score checks gracefully when scores are even', () => {
    expect(computeNote(ctx({ winnersMmr: 1500, losersMmr: 1510 }), { playerScores: evenScores })).toBeNull();
  });
});

describe('computeMvp', () => {
  it('picks the player with the best summed stat ranks', () => {
    const dominant = scores([
      ['A', 9, 9000, 90000, 99, 89],
      ['B', 1, 2100, 10100, 41, 61],
    ]);
    expect(computeMvp(dominant)).toBe('A#1');
  });

  it('returns null without scores', () => {
    expect(computeMvp(null)).toBeNull();
  });
});

describe('noteContextFromMatch', () => {
  it('builds winners/losers with team MMRs from a match payload', () => {
    const match = {
      durationInSeconds: 1200,
      teams: [
        { players: [{ battleTag: 'A#1', name: 'A', race: 0, rndRace: 2, oldMmr: 1600, won: true }] },
        { players: [{ battleTag: 'B#1', name: 'B', race: 1, oldMmr: 1400, won: false }] },
      ],
    };
    const c = noteContextFromMatch(match);
    expect(c.winners[0].race).toBe(2); // rndRace resolved
    expect(c.winnersMmr).toBe(1600);
    expect(c.losersMmr).toBe(1400);
  });

  it('returns null when no winner is determinable', () => {
    expect(noteContextFromMatch({ teams: [{ players: [{ won: false }] }, { players: [{ won: false }] }] })).toBeNull();
  });
});
