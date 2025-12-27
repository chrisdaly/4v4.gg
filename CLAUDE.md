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
- Custom CSS variables in App.css (--gold, --green, --red, --grey)
- Custom fonts: Friz Quadrata, Inconsolata

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
