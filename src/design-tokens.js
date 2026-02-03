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
  greyLight: { value: '#999', css: '--grey-light', usage: 'Secondary text, labels' },
  greyMid: { value: '#444', css: '--grey-mid', usage: 'Borders, disabled' },
  greyDark: { value: '#1a1a1a', css: '--grey-dark', usage: 'Elevated surfaces' },
};

export const fonts = {
  display: { value: '"Friz_Quadrata_Bold", Georgia, serif', css: '--font-display', usage: 'Headlines, player names' },
  mono: { value: '"Inconsolata", "SF Mono", Consolas, monospace', css: '--font-mono', usage: 'Everything else' },
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
};

// Components that should exist in ui.jsx
export const components = [
  { name: 'Button', description: 'Primary/secondary variants' },
  { name: 'Badge', description: 'Status badges (win/loss/default)' },
  { name: 'Card', description: 'Gold-bordered container' },
  { name: 'Dot', description: 'Win/loss form indicator' },
  { name: 'TeamBar', description: 'Blue/red team indicator' },
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
