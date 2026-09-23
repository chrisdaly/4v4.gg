/**
 * Static country lookups for the /chat world overview: region buckets,
 * UTC offsets (one per country, DST ignored) and the per-region summary
 * that feeds the Regions panel. Everything keys on ISO 3166 alpha-2 codes
 * in any case; unknown or missing codes fall into "Other".
 */

const REGION_CODES = {
  Europe: [
    "FR", "DE", "SE", "ES", "AT", "PL", "FI", "GB", "NL", "IT", "PT", "DK", "NO", "BE", "CH", "CZ", "HU", "RO",
    "GR", "IE", "BG", "HR", "SK", "SI", "LT", "LV", "EE", "LU", "MT", "CY", "IS", "LI", "RS", "BA", "ME", "MK",
    "AL", "XK", "AD", "MC", "SM", "VA", "GI", "FO", "GL",
  ],
  "East Asia": ["CN", "HK", "KR", "TW", "JP", "MO", "SG", "MN"],
  "North America": ["US", "CA", "MX", "PR", "GU"],
  CIS: ["RU", "UA", "BY", "KZ", "AM", "AZ", "KG", "TJ", "TM", "UZ", "MD"],
  "South America": ["BR", "PE", "AR", "CL", "CO", "VE", "EC", "BO", "PY", "UY", "GY", "SR"],
  Oceania: ["AU", "NZ", "FJ", "PG", "NC", "PF"],
};

export const OTHER_REGION = "Other";

/** Region names in display order for ties (the summary sorts by count first). */
export const REGION_NAMES = [...Object.keys(REGION_CODES), OTHER_REGION];

const codeToRegion = new Map();
for (const [name, codes] of Object.entries(REGION_CODES)) {
  for (const code of codes) codeToRegion.set(code, name);
}

/** One representative UTC offset per region for the Regions panel clock. */
const REGION_OFFSETS = {
  Europe: 1,
  "East Asia": 8,
  "North America": -5,
  CIS: 3,
  "South America": -3,
  Oceania: 10,
  [OTHER_REGION]: 0,
};

/* Standard-time UTC offsets in hours. Multi-zone countries use the zone
   where most of the population (or the game's player base) lives. */
const UTC_OFFSETS = {
  // Europe
  GB: 0, IE: 0, PT: 0, IS: 0, FO: 0, GI: 1,
  FR: 1, DE: 1, ES: 1, AT: 1, PL: 1, NL: 1, IT: 1, DK: 1, NO: 1, BE: 1, CH: 1, CZ: 1, HU: 1, SE: 1, SK: 1,
  SI: 1, HR: 1, RS: 1, BA: 1, ME: 1, MK: 1, AL: 1, XK: 1, LU: 1, MT: 1, AD: 1, MC: 1, SM: 1, VA: 1, LI: 1,
  FI: 2, GR: 2, RO: 2, BG: 2, LT: 2, LV: 2, EE: 2, CY: 2, UA: 2, MD: 2, GL: -3,
  // CIS
  RU: 3, BY: 3, TR: 3, KZ: 5, AM: 4, AZ: 4, GE: 4, KG: 6, TJ: 5, TM: 5, UZ: 5,
  // East Asia
  CN: 8, HK: 8, TW: 8, MO: 8, SG: 8, MN: 8, MY: 8, PH: 8, KR: 9, JP: 9, VN: 7, TH: 7, ID: 7, KH: 7, LA: 7, MM: 6.5,
  // North America
  US: -5, CA: -5, MX: -6, PR: -4, GU: 10, CU: -5, DO: -4, GT: -6, CR: -6, PA: -5, HN: -6, SV: -6, NI: -6, JM: -5,
  // South America
  BR: -3, AR: -3, CL: -4, PE: -5, CO: -5, VE: -4, EC: -5, BO: -4, PY: -4, UY: -3, GY: -4, SR: -3,
  // Oceania
  AU: 10, NZ: 12, FJ: 12, PG: 10, NC: 11, PF: -10,
  // Middle East, Africa, South Asia
  IL: 2, AE: 4, SA: 3, QA: 3, KW: 3, BH: 3, OM: 4, IR: 3.5, IQ: 3, JO: 2, LB: 2, SY: 2, EG: 2, ZA: 2, NG: 1,
  MA: 1, DZ: 1, TN: 1, KE: 3, ET: 3, IN: 5.5, PK: 5, BD: 6, LK: 5.5, NP: 5.75, AF: 4.5,
};

const norm = (code) => (typeof code === "string" && code ? code.toUpperCase() : null);

/** Region name for a country code ("Other" when unknown or missing). */
export function regionOf(countryCode) {
  const code = norm(countryCode);
  return (code && codeToRegion.get(code)) || OTHER_REGION;
}

/** Representative UTC offset (hours) for a region name; 0 when unknown. */
export function regionOffsetOf(regionName) {
  return REGION_OFFSETS[regionName] ?? 0;
}

/** Standard-time UTC offset in hours for a country code; null when unknown. */
export function utcOffsetOf(countryCode) {
  const code = norm(countryCode);
  const off = code ? UTC_OFFSETS[code] : undefined;
  return off == null ? null : off;
}

const pad = (n) => String(n).padStart(2, "0");

/** "5:43p" for a UTC offset in hours at `now` (a Date; defaults to the current time). */
export function offsetTimeLabel(offsetHours, now = new Date()) {
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const m = ((utcMinutes + Math.round(offsetHours * 60)) % 1440 + 1440) % 1440;
  const h24 = Math.floor(m / 60);
  const ap = h24 >= 12 ? "p" : "a";
  const h12 = h24 % 12 || 12;
  return `${h12}:${pad(m % 60)}${ap}`;
}

/** "5:43p" local time for a country; "" when its offset is unknown. */
export function localTimeLabel(countryCode, now = new Date()) {
  const off = utcOffsetOf(countryCode);
  return off == null ? "" : offsetTimeLabel(off, now);
}

/** Uppercase country code for a user from the avatars map, or null. */
export function countryOf(user, avatars) {
  return norm(avatars?.get(user?.battleTag)?.country);
}

/** "12 countries" (singular when 1). */
export function countriesLabel(n) {
  return `${n} ${n === 1 ? "country" : "countries"}`;
}

/**
 * Per-region rows for the Regions panel, sorted by online count desc
 * (ties by REGION_NAMES order):
 *   { name, count, avgMmr (null when nobody has one), topCountries (up to 3
 *     codes, most players first), localTime, share (count / largest count) }
 * plus countryCount, the number of distinct known countries.
 * meta = { stats, avatars }
 */
export function regionSummary(users, meta = {}, now = new Date()) {
  const { stats, avatars } = meta;
  const byRegion = new Map();
  const knownCountries = new Set();
  for (const u of users || []) {
    const code = countryOf(u, avatars);
    if (code) knownCountries.add(code);
    const name = regionOf(code);
    if (!byRegion.has(name)) byRegion.set(name, { count: 0, mmrSum: 0, mmrN: 0, countries: new Map() });
    const r = byRegion.get(name);
    r.count++;
    const mmr = stats?.get(u.battleTag)?.mmr;
    if (mmr != null) {
      r.mmrSum += mmr;
      r.mmrN++;
    }
    if (code) r.countries.set(code, (r.countries.get(code) || 0) + 1);
  }
  const max = Math.max(1, ...[...byRegion.values()].map((r) => r.count));
  const rows = [...byRegion]
    .map(([name, r]) => ({
      name,
      count: r.count,
      avgMmr: r.mmrN ? Math.round(r.mmrSum / r.mmrN) : null,
      topCountries: [...r.countries]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 3)
        .map(([code]) => code),
      localTime: offsetTimeLabel(regionOffsetOf(name), now),
      share: r.count / max,
    }))
    .sort((a, b) => b.count - a.count || REGION_NAMES.indexOf(a.name) - REGION_NAMES.indexOf(b.name));
  return { rows, countryCount: knownCountries.size };
}

/**
 * Data in the shapes WorldMap takes:
 *   playerCountries  code -> { online, inGame }
 *   mapPlayers       { battleTag, name, country, mmr, inGame }
 * meta = { stats, avatars, inGameTags }
 */
export function buildMapData(users, meta = {}) {
  const { stats, avatars, inGameTags } = meta;
  const playerCountries = new Map();
  const mapPlayers = [];
  for (const u of users || []) {
    const code = countryOf(u, avatars);
    if (!code) continue;
    const tag = u.battleTag;
    const inGame = Boolean(inGameTags?.has(tag));
    if (!playerCountries.has(code)) playerCountries.set(code, { online: 0, inGame: 0 });
    playerCountries.get(code)[inGame ? "inGame" : "online"]++;
    mapPlayers.push({ battleTag: tag, name: u.name || tag.split("#")[0], country: code, mmr: stats?.get(tag)?.mmr ?? null, inGame });
  }
  return { playerCountries, mapPlayers };
}
