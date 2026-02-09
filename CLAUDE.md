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

## Chat Relay

The frontend connects to a chat relay server that bridges the W3Champions SignalR chat service via SSE.

| Environment | URL | Notes |
|-------------|-----|-------|
| **Production** | `https://4v4gg-chat-relay.fly.dev` | Fly.io, persistent SQLite, always-on |
| **Dev (default)** | `https://4v4gg-chat-relay.fly.dev` | Uses fly.io relay — more stable than local |
| **Dev (local relay)** | `http://localhost:3002` | Only for developing the relay server itself |

Controlled by `VITE_CHAT_RELAY_URL` in `.env.local`. The fly.io relay is preferred for dev because the local server can crash or serve stale data.

To switch to local relay for server development:
```bash
# in .env.local
VITE_CHAT_RELAY_URL=http://localhost:3002
```

The relay server source is in `server/`. Token is injected via `POST /api/admin/token` with `X-API-Key` header.

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

**Single source of truth:** `src/design-tokens.js`

All design tokens (colors, fonts, spacing, etc.) are defined in `design-tokens.js`. This file is imported by:
- `StyleReference.jsx` - Visual reference at `/styles`
- Components that need token values directly

**Validate consistency:** `npm run validate-tokens` - Checks that App.css matches design-tokens.js

### Quick Reference

| Category | Tokens |
|----------|--------|
| Colors | `--gold` `--green` `--red` `--grey-light` `--grey-mid` `--grey-dark` |
| Fonts | `--font-display` (Friz Quadrata) `--font-mono` (Inconsolata) |
| Type scale | `--text-xxs` (12px) `--text-xs` (14px) `--text-sm` (16px) `--text-base` (18px) `--text-lg` (24px) `--text-xl` (34px) |
| Spacing | `--space-1` (4px) `--space-2` (8px) `--space-4` (16px) `--space-6` (24px) `--space-8` (32px) `--space-12` (48px) |
| Borders | `--radius-sm` `--radius-md` `--radius-full` `--border-thin` `--border-thick` |
| Overlays | `--overlay-heavy` `--overlay-medium` `--overlay-light` |
| Surfaces | `--surface-1` `--surface-2` `--surface-3` |
| Tints | `--gold-tint` `--green-tint` `--red-tint` |

### Usage Patterns

Defined in `design-tokens.js` under `patterns`:

| Element | CSS |
|---------|-----|
| Player names | `font-family: var(--font-display); color: var(--gold)` |
| List item names | `font-family: var(--font-display); font-size: var(--text-base); color: #fff` |
| List item values | `font-family: var(--font-mono); font-size: var(--text-base); color: #fff` |
| Stats/MMR | `font-family: var(--font-mono); color: #fff` |
| Labels | `font: var(--text-xs) var(--font-mono); text-transform: uppercase; letter-spacing: 0.1em; color: var(--grey-light)` |
| Win values | `color: var(--green)` |
| Loss values | `color: var(--red)` |
| Live indicator | `width: 10px; height: 10px; background: var(--red); border-radius: 50%; animation: pulse 1.5s infinite` |
| Primary cards | `border: var(--border-thick) solid var(--gold); border-radius: var(--radius-md)` |
| Secondary cards | `border: 1px solid var(--grey-mid); border-radius: var(--radius-md)` |

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
- `public/backgrounds/` - Race backgrounds (human, orc, nightelf, undead)
- `public/backgrounds/themes/` - Theme background images (25+ files)
- `public/maps/` - Minimap images for each map

### Theme System

Themes are defined in `src/lib/borderThemes.js`. Each theme has: border style, background image, panel colors, blur, and shadow. The system is managed by:
- `src/lib/borderThemes.js` - Theme definitions (28 themes)
- `src/lib/ThemeContext.jsx` - React context, applies CSS custom properties to `<body>`
- `src/components/Navbar.jsx` - Theme picker dropdown in navbar
- `src/components/ThemePicker.jsx` - Fixed bottom theme picker (thumbnail grid)
- `src/components/RaceSelectOverlay.jsx` - First-visit theme selection overlay

### Theme Background Sources

Best source: **warcraft.wiki.gg** — direct download, high-res, no authentication.

**Finding clean backgrounds (no logos/watermarks):**

1. Search for "No_text" login screens — these are the cleanest:
   - Pattern: `https://warcraft.wiki.gg/images/{Expansion}_Login_No_text.jpg`
   - Examples: `Wrath_Login_No_Text.jpg`, `Cataclysm_Login_No_text.jpg`, `Burning_Crusade_Login_No_Text.jpg`
   - Usually 1920x1080, sometimes 3840x2160 (4K)

2. Search for Chronicle/concept art by known artists:
   - Peter Lee (Chronicle volumes) — massive res (3000-5000px), stunning paintings
   - Astri Lohne, Bayard Wu, Glenn Rane — WC3 Reforged key art
   - Pattern: `https://warcraft.wiki.gg/images/Chronicle3_{Subject}.jpg`

3. Search for WC3 Reforged wallpapers/key art:
   - Pattern: `https://warcraft.wiki.gg/images/Warcraft_III_Reforged_-_{Subject}.jpg`
   - Pattern: `https://warcraft.wiki.gg/images/WCIIIR_Key_Art.png`
   - Usually 1920x1080 to 4096x2160

4. Verify before downloading:
   ```bash
   curl -sI "https://warcraft.wiki.gg/images/{filename}" | head -5
   ```
   Look for HTTP 200 and `content-type: image/jpeg` or `image/png`.

5. Download:
   ```bash
   curl -sL -o public/backgrounds/themes/{local-name}.jpg "https://warcraft.wiki.gg/images/{filename}"
   ```

6. Add to `borderThemes.js` with a matching theme entry and to the Assets.jsx theme-backgrounds section.

**Avoid:** Regular loading screens (have expansion logos baked in), fan art with watermarks, overhead map views.

**Rate limits:** warcraft.wiki.gg returns 429 if you hit it too fast. Add `sleep 2` between downloads.

### Map Images

Map minimap images are stored in `public/maps/` as PNG files. The filename is derived from the API's `mapId` by:

1. Stripping the `(4)` prefix (e.g., `(4)Ekrezem's Maze` → `Ekrezem's Maze`)
2. Removing all spaces (`Ekrezem's Maze` → `Ekrezem'sMaze`)
3. Removing apostrophes (`Ekrezem'sMaze` → `EkrezemsMaze`)

**If a map image is missing:**

1. Check the browser console/network tab for the 404'd filename (e.g., `/maps/SomeNewMap.png`)
2. Find the map on [wc3maps.com](https://wc3maps.com/) by searching for the map name
3. Get the map ID from the URL (e.g., `wc3maps.com/map/248157/Deadlock_LV` → ID is `248157`)
4. Download the minimap image:
   ```bash
   curl -sL -o public/maps/{CleanName}.png "https://wc3maps.com/static/maps/{MAP_ID}/archive/war3mapMap.jpg"
   ```
   Example for Deadlock LV:
   ```bash
   curl -sL -o public/maps/DeadlockLV.png "https://wc3maps.com/static/maps/248157/archive/war3mapMap.jpg"
   ```
5. The `getMapImageUrl()` function in `Game.jsx` handles the name transformation

**Current maps:** Ferocity, EkrezemsMaze, Snowblind, NorthshireLV, OrdealGround, GoldRush, RoyalGardens, NerubianPassage, PaintedWorld, Nightopia, IndigoKeeper, Deadlock, TwilightRuinsLV, WellspringTemple, SanctuaryLV, BloodvenomFallsv2, Lilious, NorthmarshRuin, RuinsofAlterac
