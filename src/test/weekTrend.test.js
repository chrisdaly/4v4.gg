import { describe, it, expect } from 'vitest';
import { trendBlurb } from '../../server/src/weeklyStats.js';

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
