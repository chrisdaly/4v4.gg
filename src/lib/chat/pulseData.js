/**
 * Data for the chat Pulse column, in the shapes Observatory feeds
 * OnlineMmrStrip and WorldMap plus the two caption lines:
 *
 *   stripPlayers    users with a known MMR ({ battleTag, name, mmr, wins, losses })
 *   playerCountries code -> { online, inGame }
 *   mapPlayers      { battleTag, name, country, mmr, inGame } for the map
 *   countryCount    distinct countries among users with a known country
 *   topCountries    top three [code, headcount] by headcount, ties by code
 *   countriesLabel  "12 countries" (singular when 1)
 *   topLabel        "DE 9 · FR 6 · CN 5" ("" when nobody has a country)
 */
export function buildPulseData(users, stats, avatars, inGameTags) {
  const stripPlayers = [];
  const playerCountries = new Map();
  const mapPlayers = [];
  for (const u of users || []) {
    const tag = u.battleTag;
    const name = u.name || tag.split("#")[0];
    const s = stats?.get(tag);
    const mmr = s?.mmr;
    const inGame = Boolean(inGameTags?.has(tag));
    if (mmr != null) stripPlayers.push({ battleTag: tag, name, mmr, wins: s.wins || 0, losses: s.losses || 0 });
    const country = avatars?.get(tag)?.country;
    if (!country) continue;
    const code = country.toUpperCase();
    if (!playerCountries.has(code)) playerCountries.set(code, { online: 0, inGame: 0 });
    playerCountries.get(code)[inGame ? "inGame" : "online"]++;
    mapPlayers.push({ battleTag: tag, name, country: code, mmr: mmr ?? null, inGame });
  }
  const topCountries = [...playerCountries]
    .map(([code, c]) => [code, c.online + c.inGame])
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 3);
  const countryCount = playerCountries.size;
  return {
    stripPlayers,
    playerCountries,
    mapPlayers,
    countryCount,
    topCountries,
    countriesLabel: `${countryCount} ${countryCount === 1 ? "country" : "countries"}`,
    topLabel: topCountries.map(([code, n]) => `${code} ${n}`).join(" · "),
  };
}
