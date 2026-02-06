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

// League definitions with icons
export const LEAGUES = [
  { id: 0, name: "Grandmaster", icon: grandmasterIcon },
  { id: 1, name: "Master", icon: masterIcon },
  { id: 2, name: "Diamond", icon: diamondIcon },
  { id: 3, name: "Platinum", icon: platinumIcon },
  { id: 4, name: "Gold", icon: goldIcon },
  { id: 5, name: "Silver", icon: silverIcon },
  { id: 6, name: "Bronze", icon: bronzeIcon },
];

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
