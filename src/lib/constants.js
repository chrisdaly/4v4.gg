/**
 * Shared constants used across the application
 */

import human from "../assets/icons/human.svg";
import orc from "../assets/icons/orc.svg";
import elf from "../assets/icons/elf.svg";
import undead from "../assets/icons/undead.svg";
import random from "../assets/icons/random.svg";

import grandmasterIcon from "../assets/icons/grandmaster.png";
import masterIcon from "../assets/icons/master.png";
import diamondIcon from "../assets/icons/diamond.png";
import platinumIcon from "../assets/icons/platinum.png";
import goldIcon from "../assets/icons/gold.png";
import silverIcon from "../assets/icons/silver.png";
import bronzeIcon from "../assets/icons/bronze.png";
import adeptIcon from "../assets/icons/adept.png";
import grassIcon from "../assets/icons/grass.png";

// Race ID to icon mapping
export const raceMapping = {
  0: random,
  1: human,
  2: orc,
  4: elf,
  8: undead,
};

// Race icons for direct import
export const raceIcons = {
  human,
  orc,
  elf,
  undead,
  random,
};

// League tiers, keyed by W3C's leagueOrder. A tier holds one or more
// divisions, and the ladder id (/api/ladder/{id}) numbers the divisions,
// not the tiers: in 4v4 season 25, id 2 is Adept, ids 3-4 are Diamond 1-2,
// 5-7 Platinum, 8-10 Gold, 11-13 Silver, 14-15 Bronze, 16 Grass. Never map
// a ladder id to a tier name; go through a division (getLeagueDivisions)
// or the row's own leagueOrder.
export const LEAGUE_TIERS = [
  { order: 0, key: "grandmaster", name: "Grandmaster", icon: grandmasterIcon },
  { order: 1, key: "master", name: "Master", icon: masterIcon },
  { order: 2, key: "adept", name: "Adept", icon: adeptIcon },
  { order: 3, key: "diamond", name: "Diamond", icon: diamondIcon },
  { order: 4, key: "platinum", name: "Platinum", icon: platinumIcon },
  { order: 5, key: "gold", name: "Gold", icon: goldIcon },
  { order: 6, key: "silver", name: "Silver", icon: silverIcon },
  { order: 7, key: "bronze", name: "Bronze", icon: bronzeIcon },
  { order: 8, key: "grass", name: "Grass", icon: grassIcon },
];

export const leagueTier = (order) => LEAGUE_TIERS.find((t) => t.order === order) || null;

// 4v4 Europe constellation for season 25 (league-constellation endpoint),
// used until the live one arrives or when it fails.
export const DEFAULT_LEAGUE_DIVISIONS = [
  { id: 0, order: 0, division: 0 },
  { id: 1, order: 1, division: 0 },
  { id: 2, order: 2, division: 1 },
  { id: 3, order: 3, division: 1 },
  { id: 4, order: 3, division: 2 },
  { id: 5, order: 4, division: 1 },
  { id: 6, order: 4, division: 2 },
  { id: 7, order: 4, division: 3 },
  { id: 8, order: 5, division: 1 },
  { id: 9, order: 5, division: 2 },
  { id: 10, order: 5, division: 3 },
  { id: 11, order: 6, division: 1 },
  { id: 12, order: 6, division: 2 },
  { id: 13, order: 6, division: 3 },
  { id: 14, order: 7, division: 1 },
  { id: 15, order: 7, division: 2 },
  { id: 16, order: 8, division: 1 },
];

// "Diamond 2" when the tier has several divisions, else just "Diamond"
export const divisionLabel = (division, divisions = DEFAULT_LEAGUE_DIVISIONS) => {
  const tier = leagueTier(division.order);
  if (!tier) return `League ${division.id}`;
  const siblings = divisions.filter((d) => d.order === division.order).length;
  return siblings > 1 ? `${tier.name} ${division.division}` : tier.name;
};

// Race ID → full-bleed background (public/backgrounds/)
export const RACE_BACKGROUND = {
  0: '/backgrounds/orc.jpg',
  1: '/backgrounds/human.jpg',
  2: '/backgrounds/orc.jpg',
  4: '/backgrounds/nightelf.jpg',
  8: '/backgrounds/undead.jpg',
};

// League icons for direct import
export const leagueIcons = {
  grandmaster: grandmasterIcon,
  master: masterIcon,
  diamond: diamondIcon,
  platinum: platinumIcon,
  gold: goldIcon,
  silver: silverIcon,
  bronze: bronzeIcon,
};
