# Task: Improve MMR Chart Statistics Display

## Current State
The MMR comparison chart (src/MmrComparison.jsx) shows team balance in 4v4 matches:
- Dots for each player positioned by MMR on a vertical axis (700-2700)
- Geometric mean line for each team
- Standard deviation shaded region
- Small labels with values (μ1430, σ215) but they're hard to read

## Goal
Make the statistics more readable without cluttering the chart itself.

## Ideas to Explore
1. **Values outside the chart** - μ and σ values above or below the chart area, not inline with the visualization
2. **Comparison format** - Show as "1430 vs 1426" for means, highlight the difference
3. **Animation** - Values that animate/transition when data changes
4. **Hover states** - Show detailed stats on hover, keep chart clean by default
5. **Separate stats row** - A dedicated area showing: μ₁=1430 | σ₁=215 | Δμ=4
6. **Color coding the difference** - Green if balanced (<50 diff), yellow if moderate, red if large gap

## Implementation
Create a dedicated test page at `/mmr-lab` to iterate on designs without affecting the main app. Import MmrComparison and experiment with wrapper components that add stats display.

## Files to Reference
- `src/MmrComparison.jsx` - Current chart component (D3-based)
- `src/design-tokens.js` - Color/font tokens
- `src/DesignLab.jsx` - Example of a design iteration page
- `src/Game.jsx` - Where chart is used in production

## Design Constraints
- Dark theme (#0a0a0a background)
- Team colors: blue (#4da6ff), red (#ef4444), gold (#fcdb33)
- Fonts: Friz Quadrata for display, Inconsolata for mono/numbers
- Keep it subtle - the dots are the primary information
