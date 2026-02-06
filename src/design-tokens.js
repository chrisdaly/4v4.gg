/**
 * Design Tokens - Single Source of Truth
 *
 * This file defines all design tokens used across the app.
 * - App.css :root variables should match these values
 * - StyleReference.jsx renders these tokens visually
 * - CLAUDE.md references this file for documentation
 *
 * To validate consistency, run: npm run validate-tokens
 */

export const colors = {
  gold: { value: '#fcdb33', css: '--gold', usage: 'Brand, player names, accents' },
  green: { value: '#4ade80', css: '--green', usage: 'Wins, positive' },
  red: { value: '#f87171', css: '--red', usage: 'Losses, negative' },
  blue: { value: '#3b82f6', css: '--blue', usage: 'Links, info' },
  greyLight: { value: '#bbb', css: '--grey-light', usage: 'Secondary text, labels' },
  textBody: { value: '#ccc', css: '--text-body', usage: 'Body/prose text' },
  greyMid: { value: '#444', css: '--grey-mid', usage: 'Borders, disabled' },
  greyDark: { value: '#1a1a1a', css: '--grey-dark', usage: 'Elevated surfaces' },
  white: { value: '#fff', css: '--white', usage: 'Primary text' },
  teamBlue: { value: '#4da6ff', css: '--team-blue', usage: 'Team 1 indicator' },
  teamRed: { value: '#ef4444', css: '--team-red', usage: 'Team 2 indicator' },
  twitchPurple: { value: '#9146ff', css: '--twitch-purple', usage: 'Twitch branding' },
  atPurple: { value: '#8b5cf6', css: '--at-purple', usage: 'AT team indicators' },
};

export const fonts = {
  display: { value: '"Friz_Quadrata_Bold", Georgia, serif', css: '--font-display', usage: 'Headlines, player names' },
  mono: { value: '"Inconsolata", "SF Mono", Consolas, monospace', css: '--font-mono', usage: 'Stats, labels, dates' },
  body: { value: '"Libre Baskerville", Georgia, serif', css: '--font-body', usage: 'Blog prose, descriptions' },
};

export const typeScale = {
  xxs: { value: '12px', css: '--text-xxs', usage: 'Tiny labels, tooltips' },
  xs: { value: '14px', css: '--text-xs', usage: 'Labels, column headers' },
  sm: { value: '16px', css: '--text-sm', usage: 'Small text, captions' },
  base: { value: '18px', css: '--text-base', usage: 'Body default' },
  lg: { value: '24px', css: '--text-lg', usage: 'Subheadings' },
  xl: { value: '34px', css: '--text-xl', usage: 'Headings, player names' },
};

export const spacing = {
  1: { value: '4px', css: '--space-1' },
  2: { value: '8px', css: '--space-2' },
  4: { value: '16px', css: '--space-4' },
  6: { value: '24px', css: '--space-6' },
  8: { value: '32px', css: '--space-8' },
  12: { value: '48px', css: '--space-12' },
};

export const borders = {
  radiusSm: { value: '2px', css: '--radius-sm', usage: 'Subtle rounding' },
  radiusMd: { value: '4px', css: '--radius-md', usage: 'Cards, buttons' },
  radiusFull: { value: '9999px', css: '--radius-full', usage: 'Pills, dots' },
  thin: { value: '1px', css: '--border-thin', usage: 'Subtle borders' },
  thick: { value: '2px', css: '--border-thick', usage: 'Emphasis borders' },
};

export const effects = {
  shadowGlow: { value: '0 0 20px rgba(252, 219, 51, 0.3)', css: '--shadow-glow', usage: 'Gold glow effect' },
  transition: { value: '150ms ease', css: '--transition', usage: 'Default animation' },
};

export const overlays = {
  heavy: { value: 'rgba(0, 0, 0, 0.9)', css: '--overlay-heavy', usage: 'Nearly opaque' },
  medium: { value: 'rgba(0, 0, 0, 0.8)', css: '--overlay-medium', usage: 'Standard overlay' },
  light: { value: 'rgba(0, 0, 0, 0.6)', css: '--overlay-light', usage: 'Lighter backdrop' },
};

export const surfaces = {
  surface1: { value: 'rgba(255, 255, 255, 0.02)', css: '--surface-1', usage: 'Card background' },
  surface2: { value: 'rgba(255, 255, 255, 0.05)', css: '--surface-2', usage: 'Hover state' },
  surface3: { value: 'rgba(255, 255, 255, 0.1)', css: '--surface-3', usage: 'Borders, dividers' },
};

export const tints = {
  gold: { value: 'rgba(252, 219, 51, 0.1)', css: '--gold-tint', usage: 'Gold highlight bg' },
  green: { value: 'rgba(74, 222, 128, 0.1)', css: '--green-tint', usage: 'Win highlight bg' },
  red: { value: 'rgba(248, 113, 113, 0.1)', css: '--red-tint', usage: 'Loss highlight bg' },
};

export const zIndex = {
  dropdown: { value: 100, css: '--z-dropdown' },
  overlay: { value: 200, css: '--z-overlay' },
  modal: { value: 300, css: '--z-modal' },
};

// Usage patterns - common combinations
export const patterns = {
  playerName: {
    description: 'Player names',
    css: 'font-family: var(--font-display); color: var(--gold)',
  },
  statsMmr: {
    description: 'Stats/MMR values',
    css: 'font-family: var(--font-mono); color: #fff',
  },
  label: {
    description: 'Labels, column headers',
    css: 'font: var(--text-xs) var(--font-mono); text-transform: uppercase; letter-spacing: 0.1em; color: var(--grey-light)',
  },
  winValue: {
    description: 'Win values',
    css: 'color: var(--green)',
  },
  lossValue: {
    description: 'Loss values',
    css: 'color: var(--red)',
  },
  liveIndicator: {
    description: 'Live/ongoing indicator',
    css: 'width: 10px; height: 10px; background: var(--red); border-radius: 50%; animation: pulse 1.5s infinite',
  },
  cardGold: {
    description: 'Primary cards',
    css: 'border: var(--border-thick) solid var(--gold); border-radius: var(--radius-md)',
  },
  cardSubtle: {
    description: 'Secondary cards',
    css: 'border: 1px solid var(--grey-mid); border-radius: var(--radius-md)',
  },
  selectGold: {
    description: 'Dropdown/select',
    css: 'font-family: var(--font-display); background: linear-gradient(180deg, rgba(30,30,30,0.95), rgba(15,15,15,0.98)); border: 1px solid rgba(252,219,51,0.3); border-radius: 4px; color: var(--gold); padding: 8px 28px 8px 12px',
  },
  listItemName: {
    description: 'List item names (leagues, races, countries)',
    css: 'font-family: var(--font-display); font-size: var(--text-base); color: #fff',
  },
  listItemValue: {
    description: 'List item values (counts, percentages)',
    css: 'font-family: var(--font-mono); font-size: var(--text-base); color: #fff',
  },
  // Blog patterns
  blogPageTitle: {
    description: 'Blog page/article h1',
    css: 'font-family: var(--font-display); font-size: var(--text-xl); color: var(--gold)',
  },
  blogSectionTitle: {
    description: 'Blog h2 (article sections)',
    css: 'font-family: var(--font-display); font-size: var(--text-lg); color: var(--white)',
  },
  blogPostTitle: {
    description: 'Blog post title in listing',
    css: 'font-family: var(--font-display); font-size: 28px; color: var(--white)',
  },
  blogTag: {
    description: 'Blog tags/categories',
    css: 'font-family: var(--font-mono); font-size: var(--text-xxs); color: var(--grey-light); text-transform: uppercase; letter-spacing: 0.1em',
  },
  blogDate: {
    description: 'Blog dates',
    css: 'font-family: var(--font-mono); font-size: var(--text-xxs); color: var(--grey-light)',
  },
  blogBody: {
    description: 'Blog article body text',
    css: 'font-family: var(--font-body); font-size: var(--text-base); color: var(--text-body); line-height: 1.85',
  },
  blogDesc: {
    description: 'Blog post description in listing',
    css: 'font-family: var(--font-body); font-size: var(--text-base); color: var(--text-body); line-height: 1.7',
  },
};

// Components that should exist in ui.jsx
export const components = [
  { name: 'Button', description: 'Primary/secondary variants' },
  { name: 'Badge', description: 'Status badges (win/loss/default)' },
  { name: 'Card', description: 'Gold-bordered container' },
  { name: 'Dot', description: 'Win/loss form indicator' },
  { name: 'TeamBar', description: 'Blue/red team indicator' },
  { name: 'Select', description: 'Gold dropdown with custom arrow' },
];

// Export all tokens for iteration
export const allTokens = {
  colors,
  fonts,
  typeScale,
  spacing,
  borders,
  effects,
  overlays,
  surfaces,
  tints,
  zIndex,
};

export default allTokens;
