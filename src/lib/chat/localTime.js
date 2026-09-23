/**
 * A chat sender's local clock from their profile country.
 *
 * Standard-time UTC offsets per ISO country code, DST ignored: the label
 * says roughly what time it is for them ("5:43p local"), which is all the
 * chat needs. Countries spanning several zones use their most populous one.
 */

const UTC_OFFSET = {
  // Western Europe
  GB: 0, IE: 0, PT: 0, IS: 0,
  FR: 1, DE: 1, ES: 1, IT: 1, NL: 1, BE: 1, LU: 1, AT: 1, CH: 1, SE: 1, NO: 1, DK: 1,
  PL: 1, CZ: 1, SK: 1, HU: 1, HR: 1, SI: 1, RS: 1, BA: 1, ME: 1, MK: 1, AL: 1, MT: 1,
  // Eastern Europe
  FI: 2, EE: 2, LV: 2, LT: 2, UA: 2, RO: 2, BG: 2, GR: 2, CY: 2, MD: 2,
  // CIS, Middle East
  RU: 3, BY: 3, TR: 3, SA: 3, IQ: 3, QA: 3, KW: 3, BH: 3, JO: 3, LB: 3, SY: 3,
  IL: 2, EG: 2, AE: 4, OM: 4, GE: 4, AM: 4, AZ: 4, IR: 3.5,
  // Central and South Asia
  PK: 5, UZ: 5, KZ: 5, TM: 5, IN: 5.5, LK: 5.5, NP: 5.75, BD: 6, KG: 6, MM: 6.5,
  // South-east and East Asia
  TH: 7, VN: 7, ID: 7, KH: 7, LA: 7,
  CN: 8, HK: 8, TW: 8, MO: 8, SG: 8, MY: 8, PH: 8, MN: 8,
  KR: 9, JP: 9,
  // Oceania
  AU: 10, NZ: 12,
  // Americas
  US: -5, CA: -5, MX: -6, GT: -6, CR: -6,
  CO: -5, PE: -5, EC: -5, PA: -5,
  VE: -4, BO: -4, CL: -4, PY: -4, DO: -4, PR: -4,
  BR: -3, AR: -3, UY: -3,
  // Africa
  MA: 1, DZ: 1, TN: 1, NG: 1, GH: 0, ZA: 2, KE: 3,
};

/** Standard-time UTC offset in hours for a country code, or null when unknown. */
export function utcOffsetOf(code) {
  if (!code) return null;
  const off = UTC_OFFSET[String(code).toUpperCase()];
  return off == null ? null : off;
}

/**
 * localTimeLabel("FR", date) -> "5:43p": the wall clock in that country at
 * `date` (default now), 12-hour with a one-letter meridiem. Null when the
 * country or the date is unknown.
 */
export function localTimeLabel(code, date = new Date()) {
  const off = utcOffsetOf(code);
  if (off == null) return null;
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  const minutes = ((d.getUTCHours() * 60 + d.getUTCMinutes() + Math.round(off * 60)) % 1440 + 1440) % 1440;
  const h = Math.floor(minutes / 60);
  const meridiem = h >= 12 ? "p" : "a";
  return `${h % 12 || 12}:${String(minutes % 60).padStart(2, "0")}${meridiem}`;
}
