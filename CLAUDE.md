# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

4v4.gg is a React-based real-time spectator and analytics web application for Warcraft III 4v4 competitive matches. It consumes data from the W3Champions API to display live ongoing matches, finished game statistics, player MMR trends, and ladder rankings.

## Development Commands

```bash
# Start development server (port 3000)
npm run dev

# Production build (outputs to /build)
npm run build

# Preview production build locally
npm run preview
```

## Architecture

### Data Flow
1. **W3Champions API** (`website-backend.w3champions.com`) provides all match and player data
2. **utils.js** contains 80+ functions for processing raw API responses (MMR calculations, percentiles, data enrichment)
3. Components consume processed data with 30-second polling intervals for live updates

### Key Files
- `src/params.jsx` - API configuration (gameMode, gateway, season, map name mappings)
- `src/utils.jsx` - Core data processing functions:
  - `processOngoingGameData()` - Live match formatting
  - `preprocessPlayerScores()` - Game stats percentile calculation
  - `fetchMMRTimeline()` - Historical MMR data
  - `arithmeticMean()` / `standardDeviation()` - Team MMR calculations

### Routing (React Router v5)
| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | OnGoingGames | Homepage - all live matches |
| `/queue` | Queue | Player queue statistics |
| `/finished` | RecentlyFinished | Recently completed games |
| `/ladder` | Ladder | Player rankings by MMR |
| `/player` | PlayerProfile | Specific player's ongoing game |
| `/stream` | PlayerStream | Stream-optimized view |
| `/match` | FinishedGamePage | Finished game by ID |

### Component Patterns
- **Functional components with hooks** for newer code (OnGoingGames, Game, PlayerProfile)
- **Class components** for legacy code (Queue, Ladder, Navbar, Team)
- Container/presenter pattern: OngoingGame (fetches/processes) → Game (renders)

### Styling Stack
- Semantic UI React for pre-built components (Table, Grid, Header, Flag)
- Styled Components for dynamic CSS-in-JS
- Custom CSS variables in App.css (see Design System below)
- Custom fonts: Friz Quadrata (headings), Inconsolata (numbers)

## Design System

Minimal token set (~20 tokens). View live reference at `/styles`.

### CSS Variables (App.css :root)

```css
/* COLORS (6) */
--gold: #fcdb33;        /* Brand, player names, accents */
--green: #4ade80;       /* Wins, positive */
--red: #f87171;         /* Losses, negative */
--grey-light: #999;     /* Secondary text, labels */
--grey-mid: #444;       /* Borders, disabled */
--grey-dark: #1a1a1a;   /* Elevated surfaces */

/* FONTS (2) */
--font-display          /* Friz Quadrata - headlines, player names */
--font-mono             /* Inconsolata - everything else */

/* TYPE SCALE (5) */
--text-xs: 11px;        /* Labels, column headers */
--text-sm: 13px;        /* Small text */
--text-base: 15px;      /* Body default */
--text-lg: 20px;        /* Subheadings */
--text-xl: 28px;        /* Headings */

/* SPACING (6) */
--space-1: 4px;   --space-6: 24px;
--space-2: 8px;   --space-8: 32px;
--space-4: 16px;  --space-12: 48px;

/* BORDERS (5) */
--radius-sm: 2px;  --radius-md: 4px;  --radius-full: 9999px;
--border-thin: 1px;  --border-thick: 2px;

/* OTHER */
--shadow-glow: 0 0 20px rgba(252, 219, 51, 0.3);
--transition: 150ms ease;
```

### Usage Patterns

| Element | Style |
|---------|-------|
| Player names | `font-family: var(--font-display); color: var(--gold)` |
| Stats/MMR | `font-family: var(--font-mono); color: #fff` |
| Labels | `font: var(--text-xs) var(--font-mono); text-transform: uppercase; letter-spacing: 0.1em; color: var(--grey-light)` |
| Win values | `color: var(--green)` |
| Loss values | `color: var(--red)` |
| Cards | `border: var(--border-thick) solid var(--gold); border-radius: var(--radius-md)` |
| Borders | `border: 1px solid var(--grey-mid)` |

### Shared Components

Import from `src/components/ui.jsx`:
- `Button` - Primary/secondary variants
- `Badge` - Status badges (win/loss/default)
- `Card` - Gold-bordered container
- `Dot` - Win/loss form indicator
- `TeamBar` - Blue/red team indicator

## API Integration

All data from W3Champions API:
- `GET /api/matches/ongoing` - Live games
- `GET /api/matches` - Finished games
- `GET /api/matches/{id}` - Specific game details
- `GET /api/ladder/{race}` - Player rankings
- `GET /api/players/{battleTag}/mmr-rp-timeline` - MMR history
- `GET /api/personal-settings/{battleTag}` - Player profile (avatar, country)

## Assets

- `src/icons/` - Race icons (human, orc, elf, undead), league tier icons
- `public/heroes/` - 28 hero character images
- `public/backgrounds/` - Map and race backgrounds
- `public/maps/` - Minimap images for each map

### Map Images

Map minimap images are stored in `public/maps/` as PNG files. The filename is derived from the API's `mapId` by:

1. Stripping the `(4)` prefix (e.g., `(4)Ekrezem's Maze` → `Ekrezem's Maze`)
2. Removing all spaces (`Ekrezem's Maze` → `Ekrezem'sMaze`)
3. Removing apostrophes (`Ekrezem'sMaze` → `EkrezemsMaze`)

**If a map image is missing:**

1. Check the browser console/network tab for the 404'd filename (e.g., `/maps/SomeNewMap.png`)
2. Get the minimap image from W3Champions or the map file itself
3. Save as `public/maps/{CleanName}.png` matching the expected filename
4. The `getMapImageUrl()` function in `Game.jsx` handles the name transformation

**Current maps:** Ferocity, EkrezemsMaze, Snowblind, NorthshireLV, OrdealGround, GoldRush, RoyalGardens, NerubianPassage, PaintedWorld, Nightopia, IndigoKeeper, Deadlock, TwilightRuinsLV, WellspringTemple, SanctuaryLV, BloodvenomFallsv2, Lilious, NorthmarshRuin, RuinsofAlterac
