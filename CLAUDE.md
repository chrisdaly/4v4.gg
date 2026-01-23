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

### CSS Variables
All colors should use CSS variables defined in `:root` in `App.css`:

```css
:root {
  /* Brand colors */
  --gold: #fcdb33;      /* Player names, highlights, borders */
  --green: #4ade80;     /* Wins, positive changes */
  --red: #f87171;       /* Losses, negative changes */
  --grey: #888;         /* Keys, labels */
  --grey-light: #ccc;   /* Secondary text */
  --grey-dark: #666;    /* Muted text, subtle elements */

  /* Text colors */
  --text-primary: #fff;     /* Main text, values */
  --text-secondary: #ccc;   /* Secondary info */
  --text-muted: #888;       /* Labels, hints */

  /* Background colors */
  --bg-dark: #0a0a0a;
  --bg-card: rgba(255, 255, 255, 0.02);
  --border-color: #333;
  --border-gold: var(--gold);
}
```

### Color Usage Guidelines
| Element | Variable | Example |
|---------|----------|---------|
| Player names | `var(--gold)` | `<h2>PlayerName</h2>` |
| MMR values | `var(--text-primary)` | 1847 MMR |
| Win indicators | `var(--green)` | +15, 5W |
| Loss indicators | `var(--red)` | -12, 3L |
| Labels/hints | `var(--text-muted)` | "MMR", "Session:" |
| Secondary text | `var(--text-secondary)` | Teammate names |
| Muted elements | `var(--grey-dark)` | Timestamps, dividers |

### Typography
- **Headings (h1, h2, h3)**: `font-family: "Friz_Quadrata_Bold"` - gold color
- **Numbers/stats**: `font-family: "Inconsolata"` - monospace for alignment
- **Body text**: System default

### Component Patterns
- Game containers: `border: 2px solid var(--gold)` with radial gradient background
- Stat rows: Alternating `background: var(--bg-card)` for zebra striping
- Win/loss indicators: Use `.positive`/`.negative` classes for color
- Form dots: `.form-dot.win` (green) / `.form-dot.loss` (red)

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
