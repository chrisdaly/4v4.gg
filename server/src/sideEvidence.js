/**
 * Side evidence for "are these two accounts one person": things that are not
 * playstyle. The click scorer (identityModel.js) ranks candidates well but can
 * rarely say the top one is real. Evidence from outside the game can.
 *
 * Measured Nov 2026 on 2,315 accounts (ml/identity/RESULTS.md):
 *
 *  - Same person, same flag: 14 of 19 known pairs share a country.
 *  - Two accounts in the same ladder game are different people. All 14
 *    confirmed pairs have never shared one; random pairs of accounts with 150+
 *    games each have, 68% of the time.
 *  - How telling a shared country is depends on how rare the country is, and
 *    it has to be judged against strangers in the click top five, not against
 *    the whole population: compatriots resemble each other more than chance
 *    (strangers in the top five share a rare country 1.8% of the time, six
 *    times the population rate). Comparing candidates who never met the query
 *    with candidates who did (provably different), the share of never-met,
 *    same-country, top-five matches that are real comes out at about
 *      78% when the country is under 1% of accounts,
 *      67% when it is 1 to 5%,
 *      36% when it is over 5%.
 *    Those were estimates from separate tests. Measured end to end
 *    (scripts/eval-combined.mjs, Nov 2026, 1,500 lookups), counting 1-5%
 *    countries named a wrong account in 17.5% of lookups whose owner was not
 *    in the pool, against 3.5% for clicks alone. Under 1% only: 7.0%. So only
 *    a rare country counts. With lobby chat (chatStyle.js) as the other line:
 *    owner named 40.6% of the time, a wrong account 9.5% when absent.
 */

export const RARE_COUNTRY_SHARE = 0.01;
export const UNCOMMON_COUNTRY_SHARE = 0.05;
// Below this many stored countries the shares are not worth trusting
export const MIN_COUNTRY_SAMPLE = 300;

const ESTIMATE_REAL = { rare: 0.78, uncommon: 0.67, common: 0.36 };

/** @returns {'rare'|'uncommon'|'common'|null} null when the share is unknown */
export function countryTier(share) {
  if (share == null) return null;
  if (share < RARE_COUNTRY_SHARE) return 'rare';
  if (share < UNCOMMON_COUNTRY_SHARE) return 'uncommon';
  return 'common';
}

/**
 * Evidence for one candidate from the click top five.
 * @param {object} o
 * @param {string|null} o.queryCountry
 * @param {string|null} o.candidateCountry
 * @param {number|null} o.countryShare - share of accounts flying the query's flag (0-1), null if unknown
 * @param {number} o.sharedLadderGames - ladder 4v4 games both accounts appear in
 * @returns {{
 *   sameCountry: boolean|null, country: string|null, countryShare: number|null, tier: string|null,
 *   sharedLadderGames: number, ruledOut: boolean, supports: boolean, estimateReal: number|null
 * }}
 */
export function sideEvidence({ queryCountry, candidateCountry, countryShare, sharedLadderGames }) {
  const ruledOut = sharedLadderGames > 0;
  const sameCountry = queryCountry && candidateCountry ? queryCountry === candidateCountry : null;
  const tier = sameCountry ? countryTier(countryShare) : null;
  const supports = !ruledOut && sameCountry === true && tier === 'rare';
  return {
    sameCountry,
    country: sameCountry ? queryCountry : null,
    countryShare: sameCountry ? countryShare : null,
    tier,
    sharedLadderGames,
    ruledOut,
    supports,
    estimateReal: !ruledOut && tier ? ESTIMATE_REAL[tier] : null,
  };
}

/**
 * Share of accounts per country from stored counts.
 * @param {Array<{country: string, n: number}>} counts
 * @returns {(country: string|null) => number|null}
 */
export function countryShares(counts) {
  let total = 0;
  const byCountry = new Map();
  for (const { country, n } of counts) { byCountry.set(country, n); total += n; }
  return (country) => {
    if (!country || total < MIN_COUNTRY_SAMPLE) return null;
    // an unseen country is at least as rare as one account in the sample
    return Math.max(byCountry.get(country) || 0, 1) / total;
  };
}
