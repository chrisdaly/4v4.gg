import { describe, it, expect } from 'vitest';
import {
  regionOf,
  utcOffsetOf,
  localTimeLabel,
  offsetTimeLabel,
  regionSummary,
  buildMapData,
  countriesLabel,
  REGION_NAMES,
} from '../lib/chat/regions';

const NOON_UTC = new Date('2026-09-23T12:00:00Z');

describe('regionOf', () => {
  it('buckets the handoff countries', () => {
    for (const cc of ['FR', 'DE', 'SE', 'ES', 'AT', 'PL', 'FI', 'GB', 'NL', 'IT', 'PT', 'DK', 'NO', 'BE', 'CH', 'CZ', 'HU', 'RO', 'GR', 'IE']) {
      expect(regionOf(cc), cc).toBe('Europe');
    }
    for (const cc of ['CN', 'HK', 'KR', 'TW', 'JP', 'MO', 'SG']) expect(regionOf(cc), cc).toBe('East Asia');
    for (const cc of ['US', 'CA', 'MX']) expect(regionOf(cc), cc).toBe('North America');
    for (const cc of ['RU', 'UA', 'BY', 'KZ']) expect(regionOf(cc), cc).toBe('CIS');
    for (const cc of ['BR', 'PE', 'AR', 'CL', 'CO']) expect(regionOf(cc), cc).toBe('South America');
    for (const cc of ['AU', 'NZ']) expect(regionOf(cc), cc).toBe('Oceania');
  });

  it('is case-insensitive and sends unknown or missing codes to Other', () => {
    expect(regionOf('de')).toBe('Europe');
    expect(regionOf('ZA')).toBe('Other');
    expect(regionOf('XX')).toBe('Other');
    expect(regionOf(null)).toBe('Other');
    expect(regionOf(undefined)).toBe('Other');
    expect(regionOf('')).toBe('Other');
    expect(REGION_NAMES[REGION_NAMES.length - 1]).toBe('Other');
  });
});

describe('utcOffsetOf and local time', () => {
  it('has one standard-time offset per country, DST ignored', () => {
    expect(utcOffsetOf('GB')).toBe(0);
    expect(utcOffsetOf('DE')).toBe(1);
    expect(utcOffsetOf('fi')).toBe(2);
    expect(utcOffsetOf('RU')).toBe(3);
    expect(utcOffsetOf('CN')).toBe(8);
    expect(utcOffsetOf('KR')).toBe(9);
    expect(utcOffsetOf('US')).toBe(-5);
    expect(utcOffsetOf('BR')).toBe(-3);
    expect(utcOffsetOf('IN')).toBe(5.5);
    expect(utcOffsetOf('XX')).toBeNull();
    expect(utcOffsetOf(null)).toBeNull();
  });

  it('formats 12-hour labels with a/p and wraps past midnight', () => {
    const t = new Date('2026-09-23T17:43:00Z');
    expect(offsetTimeLabel(0, t)).toBe('5:43p');
    expect(localTimeLabel('GB', t)).toBe('5:43p');
    expect(localTimeLabel('DE', t)).toBe('6:43p');
    expect(localTimeLabel('KR', t)).toBe('2:43a');
    expect(localTimeLabel('US', t)).toBe('12:43p');
    expect(localTimeLabel('IN', t)).toBe('11:13p');
    expect(localTimeLabel('PF', new Date('2026-09-23T05:00:00Z'))).toBe('7:00p');
    expect(offsetTimeLabel(0, new Date('2026-09-23T00:05:00Z'))).toBe('12:05a');
    expect(offsetTimeLabel(0, new Date('2026-09-23T12:00:00Z'))).toBe('12:00p');
    expect(localTimeLabel('XX', t)).toBe('');
  });
});

describe('countriesLabel', () => {
  it('pluralises', () => {
    expect(countriesLabel(1)).toBe('1 country');
    expect(countriesLabel(0)).toBe('0 countries');
    expect(countriesLabel(12)).toBe('12 countries');
  });
});

const u = (name, cc, mmr) => ({ battleTag: `${name}#1`, name, cc, mmr });
const roster = [
  u('a', 'FR', 2000), u('b', 'DE', 1800), u('c', 'DE', 1600), u('d', 'GB', null),
  u('e', 'CN', 1900), u('f', 'KR', 1700),
  u('g', 'US', 1500),
  u('h', null, 1400),
];
const stats = new Map(roster.filter((x) => x.mmr != null).map((x) => [x.battleTag, { mmr: x.mmr }]));
const avatars = new Map(roster.filter((x) => x.cc).map((x) => [x.battleTag, { country: x.cc.toLowerCase() }]));

describe('regionSummary', () => {
  it('sorts regions by count desc, averages known MMR, lists top countries by headcount, and counts countries', () => {
    const { rows, countryCount } = regionSummary(roster, { stats, avatars }, NOON_UTC);
    expect(rows.map((r) => r.name)).toEqual(['Europe', 'East Asia', 'North America', 'Other']);
    expect(rows.map((r) => r.count)).toEqual([4, 2, 1, 1]);
    const eu = rows[0];
    expect(eu.avgMmr).toBe(1800); // (2000 + 1800 + 1600) / 3, d has no MMR
    expect(eu.topCountries).toEqual(['DE', 'FR', 'GB']); // DE 2, then FR/GB alphabetical
    expect(eu.share).toBe(1);
    expect(eu.localTime).toBe('1:00p'); // UTC+1
    expect(rows[1].localTime).toBe('8:00p'); // East Asia UTC+8
    expect(rows[1].share).toBe(0.5);
    expect(rows[2].localTime).toBe('7:00a'); // North America UTC-5
    expect(rows[3].avgMmr).toBe(1400);
    expect(rows[3].topCountries).toEqual([]);
    expect(countryCount).toBe(6);
  });

  it('breaks count ties in REGION_NAMES order and returns null avgMmr when nobody is rated', () => {
    const two = [u('x', 'BR', null), u('y', 'RU', null)];
    const av = new Map(two.map((p) => [p.battleTag, { country: p.cc }]));
    const { rows } = regionSummary(two, { stats: new Map(), avatars: av }, NOON_UTC);
    expect(rows.map((r) => r.name)).toEqual(['CIS', 'South America']);
    expect(rows[0].avgMmr).toBeNull();
    expect(rows[0].share).toBe(1);
  });

  it('handles an empty roster', () => {
    expect(regionSummary([], {}, NOON_UTC)).toEqual({ rows: [], countryCount: 0 });
    expect(regionSummary(undefined, undefined, NOON_UTC).rows).toEqual([]);
  });
});

describe('buildMapData', () => {
  it('counts online and in-game per country and lists map players with country', () => {
    const { playerCountries, mapPlayers } = buildMapData(roster, { stats, avatars, inGameTags: new Set(['b#1']) });
    expect(playerCountries.get('DE')).toEqual({ online: 1, inGame: 1 });
    expect(playerCountries.get('FR')).toEqual({ online: 1, inGame: 0 });
    expect(playerCountries.size).toBe(6);
    expect(mapPlayers.length).toBe(7); // h has no country
    expect(mapPlayers.find((p) => p.battleTag === 'b#1')).toEqual({ battleTag: 'b#1', name: 'b', country: 'DE', mmr: 1800, inGame: true });
    expect(mapPlayers.find((p) => p.battleTag === 'd#1').mmr).toBeNull();
  });
});
