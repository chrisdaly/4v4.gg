import human from '@icons/human.svg';
import orc from '@icons/orc.svg';
import elf from '@icons/elf.svg';
import undead from '@icons/undead.svg';
import random from '@icons/random.svg';

export const RACE_BACKGROUND = {
  0: '/backgrounds/orc.jpg',
  1: '/backgrounds/human.jpg',
  2: '/backgrounds/orc.jpg',
  4: '/backgrounds/nightelf.jpg',
  8: '/backgrounds/undead.jpg',
};

export const raceMapping = {
  0: random,
  1: human,
  2: orc,
  4: elf,
  8: undead,
};
