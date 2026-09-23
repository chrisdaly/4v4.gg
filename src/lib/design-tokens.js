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
  textBody: { value: '#ddd', css: '--text-body', usage: 'Body/prose text' },
  greyMid: { value: '#444', css: '--grey-mid', usage: 'Borders, disabled' },
  greyDark: { value: '#1a1a1a', css: '--grey-dark', usage: 'Elevated surfaces' },
  white: { value: '#fff', css: '--white', usage: 'Primary text' },
  teamBlue: { value: '#4da6ff', css: '--team-blue', usage: 'Team 1 indicator' },
  teamRed: { value: '#ef4444', css: '--team-red', usage: 'Team 2 indicator' },
  twitchPurple: { value: '#9146ff', css: '--twitch-purple', usage: 'Twitch branding' },
  atPurple: { value: '#8b5cf6', css: '--at-purple', usage: 'AT team indicators' },
  amber: { value: '#f59e0b', css: '--amber', usage: 'Warnings, bans, upsets' },
  cyan: { value: '#00bcd4', css: '--cyan', usage: 'Stat accent (APM, fingerprint, traits)' },
};

export const fonts = {
  display: { value: '"Friz_Quadrata_Bold", Georgia, serif', css: '--font-display', usage: 'Headlines, player names' },
  mono: { value: '"Inconsolata", "SF Mono", Consolas, monospace', css: '--font-mono', usage: 'Stats, labels, dates' },
  body: { value: '"Libre Baskerville", Georgia, serif', css: '--font-body', usage: 'Prose, summaries, empty states' },
};

export const typeScale = {
  xxxs: { value: '11px', css: '--text-xxxs', usage: 'Dense data, timestamps, compact UI' },
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
  3: { value: '12px', css: '--space-3' },
  4: { value: '16px', css: '--space-4' },
  6: { value: '24px', css: '--space-6' },
  8: { value: '32px', css: '--space-8' },
  12: { value: '48px', css: '--space-12' },
};

export const borders = {
  radiusSm: { value: '2px', css: '--radius-sm', usage: 'Subtle rounding' },
  radiusMd: { value: '4px', css: '--radius-md', usage: 'Cards, buttons' },
  radiusLg: { value: '8px', css: '--radius-lg', usage: 'Large cards, panels, modals' },
  radiusXl: { value: '12px', css: '--radius-xl', usage: 'Page containers, themed cards' },
  radiusFull: { value: '9999px', css: '--radius-full', usage: 'Pills, dots' },
  thin: { value: '1px', css: '--border-thin', usage: 'Subtle borders' },
  thick: { value: '2px', css: '--border-thick', usage: 'Emphasis borders' },
};

export const effects = {
  shadowGlow: { value: '0 0 20px rgba(252, 219, 51, 0.3)', css: '--shadow-glow', usage: 'Gold glow effect' },
  shadowGlowSubtle: { value: '0 0 24px rgba(252, 219, 51, 0.08)', css: '--shadow-glow-subtle', usage: 'Subtle card hover glow' },
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
  panelBg: { value: 'rgba(10, 8, 6, 0.25)', css: '--panel-bg', usage: 'Frosted glass panel background' },
  panelBorder: { value: 'rgba(255, 255, 255, 0.06)', css: '--panel-border', usage: 'Frosted glass panel border' },
};

export const tints = {
  goldSubtle: { value: 'rgba(252, 219, 51, 0.05)', css: '--gold-tint-subtle', usage: 'Gold row hover' },
  gold: { value: 'rgba(252, 219, 51, 0.1)', css: '--gold-tint', usage: 'Gold highlight bg' },
  goldBorderHover: { value: 'rgba(252, 219, 51, 0.3)', css: '--gold-border-hover', usage: 'Gold border on hover/focus' },
  greenStrong: { value: 'rgba(74, 222, 128, 0.18)', css: '--green-tint-strong', usage: 'Win badge bg' },
  redStrong: { value: 'rgba(248, 113, 113, 0.18)', css: '--red-tint-strong', usage: 'Loss badge bg' },
  greenBorder: { value: 'rgba(74, 222, 128, 0.3)', css: '--green-border', usage: 'Win card/badge border' },
  redBorder: { value: 'rgba(248, 113, 113, 0.3)', css: '--red-border', usage: 'Loss card/badge border' },
  greenSubtle: { value: 'rgba(74, 222, 128, 0.05)', css: '--green-tint-subtle', usage: 'Win row hover' },
  green: { value: 'rgba(74, 222, 128, 0.1)', css: '--green-tint', usage: 'Win highlight bg' },
  redSubtle: { value: 'rgba(248, 113, 113, 0.05)', css: '--red-tint-subtle', usage: 'Loss row hover' },
  red: { value: 'rgba(248, 113, 113, 0.1)', css: '--red-tint', usage: 'Loss highlight bg' },
  goldMutedRgb: { value: '180, 150, 90', css: '--gold-muted-rgb', usage: 'Desaturated gold chrome (admin borders, dividers) - use as rgba(var(--gold-muted-rgb), alpha)' },
  goldDarkRgb: { value: '184, 134, 11', css: '--gold-dark-rgb', usage: 'Dark goldenrod for input and nav borders - use as rgba(var(--gold-dark-rgb), alpha)' },
  blue: { value: 'rgba(77, 166, 255, 0.1)', css: '--blue-tint', usage: 'Blue highlight bg (mentions, team 1)' },
  amber: { value: 'rgba(245, 158, 11, 0.1)', css: '--amber-tint', usage: 'Amber chip bg (warnings, upsets)' },
  cyan: { value: 'rgba(0, 188, 212, 0.1)', css: '--cyan-tint', usage: 'Cyan chip bg (stat accents, traits)' },
  purple: { value: 'rgba(139, 92, 246, 0.1)', css: '--purple-tint', usage: 'Purple chip bg (AT groups)' },
};

// League bar colors - match the league icons. Same league must look the same on every page.
export const leagueColors = {
  grandmaster: { value: 'linear-gradient(90deg, #c9a227, #f5d742)', css: '--league-grandmaster', usage: 'League 0 bar' },
  master: { value: 'linear-gradient(90deg, #7b5dbd, #a78bfa)', css: '--league-master', usage: 'League 1 bar' },
  diamond: { value: 'linear-gradient(90deg, #38bdf8, #67e8f9)', css: '--league-diamond', usage: 'League 2 bar' },
  platinum: { value: 'linear-gradient(90deg, #22c55e, #4ade80)', css: '--league-platinum', usage: 'League 3 bar' },
  gold: { value: 'linear-gradient(90deg, #eab308, #facc15)', css: '--league-gold', usage: 'League 4 bar' },
  silver: { value: 'linear-gradient(90deg, #94a3b8, #cbd5e1)', css: '--league-silver', usage: 'League 5 bar' },
  bronze: { value: 'linear-gradient(90deg, #b45309, #f59e0b)', css: '--league-bronze', usage: 'League 6 bar' },
};

// Race bar colors - classic WC3 faction colors.
export const raceColors = {
  human: { value: 'linear-gradient(90deg, #3b82f6, #60a5fa)', css: '--race-human', usage: 'Human bars' },
  orc: { value: 'linear-gradient(90deg, #dc2626, #f87171)', css: '--race-orc', usage: 'Orc bars' },
  nightelf: { value: 'linear-gradient(90deg, #22c55e, #4ade80)', css: '--race-nightelf', usage: 'Night Elf bars' },
  undead: { value: 'linear-gradient(90deg, #7c3aed, #a78bfa)', css: '--race-undead', usage: 'Undead bars' },
  random: { value: 'linear-gradient(90deg, #6b7280, #9ca3af)', css: '--race-random', usage: 'Random bars' },
};

export const zIndex = {
  dropdown: { value: 100, css: '--z-dropdown', usage: 'Select lists, inline dropdowns' },
  nav: { value: 150, css: '--z-nav', usage: 'Fixed navbar' },
  overlay: { value: 200, css: '--z-overlay', usage: 'Page overlays, stream overlays' },
  popover: { value: 250, css: '--z-popover', usage: 'Navbar dropdowns, hover cards, tooltips' },
  modal: { value: 300, css: '--z-modal', usage: 'Modals and modal backdrops' },
};

export const layout = {
  navHeight: { value: '54px', css: '--nav-height', usage: 'Fixed navbar height; use calc(100vh - var(--nav-height))' },
};

// Quote block spacing - set on :root, consumed by the ChatMessage quote variant
export const quote = {
  groupGap: { value: 'var(--space-4)', css: '--quote-group-gap' },
  itemGap: { value: 'var(--space-1)', css: '--quote-item-gap' },
  nameGap: { value: 'var(--space-1)', css: '--quote-name-gap' },
  padLeft: { value: 'var(--space-4)', css: '--quote-pad-left' },
  indent: { value: 'var(--space-4)', css: '--quote-indent' },
  border: { value: '2px solid rgba(255, 255, 255, 0.15)', css: '--quote-border' },
};

// Usage patterns - common combinations
export const patterns = {
  playerName: {
    description: 'Player names',
    css: 'font-family: var(--font-display); color: var(--gold)',
  },
  statsMmr: {
    description: 'Stats/MMR values',
    css: 'font-family: var(--font-mono); color: var(--white)',
  },
  label: {
    description: 'Labels, column headers, chips, section eyebrows (default)',
    css: 'font: var(--text-xxs) var(--font-mono); text-transform: uppercase; letter-spacing: 0.1em; color: var(--grey-light)',
  },
  labelLarge: {
    description: 'Large labels (form field labels, filter headings)',
    css: 'font: var(--text-xs) var(--font-mono); text-transform: uppercase; letter-spacing: 0.1em; color: var(--grey-light)',
  },
  sectionTitle: {
    description: 'Card/section titles',
    css: 'font-family: var(--font-display); font-size: var(--text-sm); color: var(--gold); text-transform: uppercase; letter-spacing: 0.05em',
  },
  heroEyebrow: {
    description: 'Page hero eyebrow (above the h1)',
    css: 'font-family: var(--font-mono); font-size: var(--text-xxs); color: var(--gold); text-transform: uppercase; letter-spacing: 0.32em',
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
    description: 'Live/ongoing indicator (.live-dot in base/animations.css)',
    css: 'width: 10px; height: 10px; background: var(--red); border-radius: 50%; animation: pulse 1.5s infinite',
  },
  deltaChip: {
    description: 'MMR delta (+12 / -8) - Delta in ui.jsx',
    css: 'font-family: var(--font-mono); font-size: var(--text-xs); font-weight: 700; color: var(--green) or var(--red); signed value',
  },
  tagChip: {
    description: 'Tag chip (MVP, ADMIN, traits)',
    css: 'font: var(--text-xxxs) var(--font-mono); text-transform: uppercase; letter-spacing: 0.08em; padding: 2px var(--space-2); border-radius: var(--radius-sm); background: var(--<color>-tint); border: 1px solid <color>',
  },
  ghostPill: {
    description: 'Ghost pill button (tags, date tabs, show more) - Button $pill in ui.jsx',
    css: 'font: var(--text-xxs) var(--font-mono); text-transform: uppercase; letter-spacing: 0.08em; padding: var(--space-1) var(--space-3); border: 1px solid var(--surface-3); border-radius: var(--radius-full); background: transparent; color: var(--grey-light); hover: color var(--white), border-color var(--grey-light)',
  },
  cardGold: {
    description: 'Primary cards',
    css: 'border: var(--border-thick) solid var(--gold); border-radius: var(--radius-md)',
  },
  cardSubtle: {
    description: 'Secondary cards',
    css: 'border: var(--border-thin) solid var(--grey-mid); border-radius: var(--radius-md)',
  },
  cardThemed: {
    description: 'Theme-aware card (ThemedCard in ui.jsx) - follows the active border theme',
    css: 'background: var(--theme-bg, var(--surface-1)); border: var(--theme-border, 1px solid var(--grey-mid)); border-image: var(--theme-border-image, none); border-radius: var(--radius-xl); backdrop-filter: var(--theme-blur, none); box-shadow: var(--theme-shadow, none)',
  },
  popover: {
    description: 'Popover surface (navbar dropdowns, hover cards, select lists)',
    css: 'background: rgba(10, 8, 6, 0.96); border: 1px solid var(--grey-mid); border-radius: var(--radius-md); box-shadow: 0 8px 24px var(--overlay-light); z-index: var(--z-popover); animation: fadeIn 120ms ease-out',
  },
  selectGold: {
    description: 'Dropdown/select (Select in ui.jsx)',
    css: 'font-family: var(--font-display); font-size: var(--text-sm); background: transparent; border: 1px solid var(--grey-mid); border-radius: var(--radius-md); color: var(--grey-light); padding: var(--space-2) 28px var(--space-2) var(--space-4); focus: border-color var(--gold); selected option: var(--gold)',
  },
  input: {
    description: 'Text input (Input in ui.jsx)',
    css: 'font-family: var(--font-mono); font-size: var(--text-xs); background: rgba(0, 0, 0, 0.35); border: 1px solid rgba(var(--gold-dark-rgb), 0.3); border-radius: var(--radius-sm); color: var(--white); padding: var(--space-2) var(--space-4); placeholder: var(--grey-light); focus: border-color var(--gold)',
  },
  listItemName: {
    description: 'List item names (leagues, races, countries)',
    css: 'font-family: var(--font-display); font-size: var(--text-base); color: var(--white)',
  },
  listItemValue: {
    description: 'List item values (counts, percentages)',
    css: 'font-family: var(--font-mono); font-size: var(--text-base); color: var(--white)',
  },
  // Blog patterns
  blogPageTitle: {
    description: 'Blog article h1 (fluid)',
    css: 'font-family: var(--font-display); font-size: clamp(2rem, 5vw, 3.2rem); color: var(--gold)',
  },
  blogSectionTitle: {
    description: 'Blog h2 (article sections)',
    css: 'font-family: var(--font-display); font-size: var(--text-lg); color: var(--gold)',
  },
  blogPostTitle: {
    description: 'Blog post title in listing',
    css: 'font-family: var(--font-display); font-size: var(--text-lg); color: var(--gold)',
  },
  blogTag: {
    description: 'Blog tags and dates (ghost pill)',
    css: 'font-family: var(--font-mono); font-size: var(--text-xxs); color: var(--grey-light); text-transform: uppercase; letter-spacing: 0.08em; border: 1px solid var(--surface-3); border-radius: var(--radius-full); padding: var(--space-1) var(--space-3)',
  },
  blogBody: {
    description: 'Blog article body text',
    css: 'font-family: var(--font-body); font-size: var(--text-base); color: var(--text-body); line-height: 1.85',
  },
  blogDesc: {
    description: 'Blog post description in listing',
    css: 'font-family: var(--font-body); font-size: var(--text-sm); color: var(--grey-light); line-height: 1.6',
  },
  // Quote patterns (Magazine)
  quoteText: {
    description: 'Quoted chat message (indented, italic, grey, left border)',
    css: 'margin-left: var(--quote-indent); padding-left: var(--quote-pad-left); border-left: var(--quote-border); font-style: italic; color: var(--grey-light); line-height: 1.5',
  },
  quoteName: {
    description: 'Quote speaker name (gold, display font)',
    css: 'font-family: var(--font-display); font-size: var(--text-xs); color: var(--gold); margin-bottom: var(--quote-name-gap)',
  },
  quoteSpacing: {
    description: 'Quote spacing constants (set on :root, see the quote export)',
    css: '--quote-group-gap; --quote-item-gap; --quote-name-gap; --quote-pad-left; --quote-indent; --quote-border',
  },
  // Content text patterns
  mapName: {
    description: 'Map names',
    css: 'font-family: var(--font-display); color: var(--white); font-size: var(--text-sm)',
  },
  dataValue: {
    description: 'Data values, counts, numbers',
    css: 'font-family: var(--font-mono); color: var(--white)',
  },
  // Hover patterns
  hoverRow: {
    description: 'Row hover (neutral)',
    css: 'background: var(--surface-2)',
  },
  hoverRowGold: {
    description: 'Row hover (branded)',
    css: 'background: var(--gold-tint-subtle)',
  },
  hoverLink: {
    description: 'Link hover',
    css: 'color: var(--gold)',
  },
  hoverCardGlow: {
    description: 'Card hover (gold border glow)',
    css: 'border-color: var(--gold-border-hover); box-shadow: var(--shadow-glow-subtle)',
  },
  panelGlass: {
    description: 'Frosted glass panel',
    css: 'background: var(--panel-bg); backdrop-filter: blur(12px); border: 1px solid var(--panel-border); border-radius: var(--radius-md)',
  },
};

// JS-side chart palette - for d3/SVG attribute values where CSS vars are awkward.
// Always import these instead of hardcoding hex in chart components.
export const chartColors = {
  gold: colors.gold.value,
  blue: colors.teamBlue.value,
  red: colors.red.value,
  green: colors.green.value,
  cyan: colors.cyan.value,
  amber: colors.amber.value,
  // Neutral chart chrome (dots, labels, gridlines)
  dot: 'rgba(255, 255, 255, 0.75)',
  dotActive: 'rgba(255, 255, 255, 0.85)',
  label: 'rgba(255, 255, 255, 0.6)',
  grid: 'rgba(255, 255, 255, 0.1)',
};

// Solid race colours for JS/SVG use (same hues as raceColors gradients: Night Elf green, Undead purple)
export const raceSolid = {
  human: '#3b82f6',
  orc: '#dc2626',
  nightelf: '#22c55e',
  undead: '#7c3aed',
  random: '#6b7280',
};

// Chart typography (SVG text)
export const chartText = {
  labelFont: fonts.display.value,
  labelSize: 11,
  valueFont: fonts.mono.value,
  valueSize: 11,
};

// Default multi-series order (player 1..4 in overlay charts)
export const chartSeries = [chartColors.gold, chartColors.blue, chartColors.red, chartColors.green];

// Shared components pages should reuse (documented on /style). All live in
// ui.jsx except ChatMessage (components/chat/ChatMessage).
export const components = [
  { name: 'Button', description: 'Variants: $primary, $secondary, $ghost, $pill' },
  { name: 'ResultBadge', description: 'WIN / LOSS / W chip; $won, $lost, $winner; $size sm|md|lg; $square' },
  { name: 'Card', description: 'Card (gold), CardSubtle (grey), ThemedCard (follows border theme)' },
  { name: 'Dot', description: 'Win/loss form indicator; $size, $recent, $dim' },
  { name: 'Delta', description: 'Signed MMR change chip' },
  { name: 'TeamBar', description: 'Blue/red team indicator' },
  { name: 'Select', description: 'Dropdown with custom arrow' },
  { name: 'Input', description: 'Text input; $fullWidth, $error' },
  { name: 'PageNav', description: 'Back link + sibling tabs' },
  { name: 'PageHero', description: 'Page eyebrow + title + lead' },
  { name: 'ConfirmModal', description: 'window.confirm replacement; danger/gold/success' },
  { name: 'Skeleton', description: 'Loading placeholders: Skeleton, SkeletonCircle' },
  { name: 'RaceIcon', description: 'Race icon by race id' },
  { name: 'CountryFlag', description: 'Country flag by ISO code' },
  { name: 'ChatMessage', description: 'Chat message group; variants feed / transcript / quote (components/chat)' },
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
  leagueColors,
  raceColors,
  zIndex,
  layout,
  quote,
};

export default allTokens;
