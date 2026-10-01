import { describe, it, expect } from 'vitest';
import { trendBlurb } from '../../server/src/weeklyStats.js';
import { killboardTiles } from '../lib/digestUtils';

/**
 * The week of 2026-06-01 holds 182 games against a ~1500 median because of the
 * disk-full incident, not because the ladder emptied. Anchoring the blurb on it
 * printed "293 more players than June 1, up 106%" and a games-per-player rate
 * of 5 against 17. weekTrendFrom drops weeks like that before they reach here;
 * these guard the sentences the blurb builds from what is left.
 */
const REAL = [
  '2026-06-08:1537/624', '2026-06-15:1516/614', '2026-06-22:1409/632',
  '2026-06-29:1620/628', '2026-07-06:1561/642', '2026-07-13:1667/778',
  '2026-07-20:1714/732', '2026-07-27:1524/694', '2026-08-03:1443/650',
  '2026-08-10:1469/656', '2026-08-17:1561/664', '2026-08-24:1502/666',
  '2026-08-31:1434/610', '2026-09-07:1123/592', '2026-09-14:1215/569',
];

describe('trendBlurb', () => {
  it('reads the fall against the first sound week, not the damaged one', () => {
    const out = trendBlurb(`days=Mon:130|weeks=${REAL.join(',')}`);
    expect(out).toContain('55 fewer players than June 8, down 9%');
    expect(out).not.toMatch(/up \d+%/);
  });

  it('counts only consecutive falls at the end', () => {
    expect(trendBlurb(`days=Mon:130|weeks=${REAL.join(',')}`)).toContain('3 weekly falls in a row');
  });

  it('says so when the survivors play less, instead of staying silent', () => {
    expect(trendBlurb(`days=Mon:130|weeks=${REAL.join(',')}`)).toContain('play less');
  });

  it('refuses a comparison it cannot make', () => {
    expect(trendBlurb('days=Mon:130|weeks=2026-09-14:1215/569')).toBeNull();
    expect(trendBlurb('nonsense')).toBeNull();
  });
});

/**
 * The killboard lays a kill count across the heroes the other side actually
 * fielded. The roster and the total are real; the per-hero split is recorded
 * nowhere, so the spread has to be even and deterministic rather than drawn at
 * random, which would clump and reshuffle on every render.
 */
describe('killboardTiles', () => {
  const FIELD = [
    'deathknight', 'lich', 'dreadlord', 'deathknight', 'bansheeranger', 'lich',
    'shadowhunter', 'farseer', 'blademaster', 'shadowhunter', 'taurenchieftain',
  ];

  it('lays every kill against a hero and loses none', () => {
    const tiles = killboardTiles(FIELD, 17);
    expect(tiles.reduce((a, t) => a + t.share, 0)).toBe(17);
    expect(tiles).toHaveLength(FIELD.length);
    expect(tiles.map((t) => t.share)).toEqual([2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1]);
  });

  it('spreads as evenly as the count allows, never more than one apart', () => {
    for (const kills of [12, 17, 22, 23, 40]) {
      const shares = killboardTiles(FIELD, kills).map((t) => t.share);
      expect(Math.max(...shares) - Math.min(...shares)).toBeLessThanOrEqual(1);
    }
  });

  it('is the same on every render, so the board does not reshuffle', () => {
    expect(killboardTiles(FIELD, 17)).toEqual(killboardTiles(FIELD, 17));
  });

  it('leaves heroes untouched when there were fewer kills than heroes', () => {
    const tiles = killboardTiles(FIELD, 4);
    expect(tiles).toHaveLength(4);
    expect(tiles.every((t) => t.share === 1)).toBe(true);
  });

  it('draws nothing from nothing', () => {
    expect(killboardTiles([], 17)).toEqual([]);
    expect(killboardTiles(FIELD, 0)).toEqual([]);
    expect(killboardTiles(null, null)).toEqual([]);
  });
});
