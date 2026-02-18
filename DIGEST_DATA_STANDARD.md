# Task: Unified Digest Data Standard

## Goal

Design and implement a **structured JSON schema** to replace the current flat-text `KEY: content\n` format used by the weekly digest system. The digest server should produce it, and both Magazine views (editorial + reader) should consume it — with one shared contract between them.

---

## Context: Why This Matters

We've been fighting bugs caused by the flat-text format for weeks. Two recent examples:

### Bug 1: DRAMA_QUOTES silently ignored
`DRAMA_QUOTES` wasn't in the `QUOTE_KEYS` array, so the section regex never recognized it. Clicking the X button to delete a quote called `handleEditSection("DRAMA_QUOTES", ...)`, which parsed the draft, couldn't find the section, and returned `prev` unchanged. The delete button appeared to do nothing.

### Bug 2: Reader mode filtered out curated quotes
Quotes were extracted globally from the entire DRAMA section (all stories combined), so the lead story's quotes were mixed with quotes from other stories. Then `FeatureStory` filtered to only speakers mentioned in the lead text and capped at 3 — dropping curated quotes from grimfoLf, mubarak, BRAVID, Mystic. Admin mode showed 7 curated quotes, reader mode showed 3.

**Root cause of both:** The flat-text format forces every piece of related data into separate top-level keys (`WINNER`, `WINNER_BLURB`, `WINNER_QUOTES`) that must be manually registered, independently parsed, and reassembled by the consumer. There's no schema, no nesting, and no validation.

---

## Current Architecture (what to replace)

### Storage: flat text in SQLite
```sql
CREATE TABLE weekly_digests (
  week_start TEXT PRIMARY KEY,
  digest     TEXT NOT NULL,    -- Flat "KEY: content\n" lines
  draft      TEXT,             -- Editorial working copy (same format)
  clips      TEXT,             -- JSON array (already structured!)
  stats      TEXT,             -- JSON object (already structured!)
  ...
);
```

### Format: one line per key
```
DRAMA: ToD vs GhostGGGL feuded all week "ToD: you are garbage" "GhostGGGL: blocked by the nose"; Napo got banned "Napo: i COACHED MY SELF"
WINNER: ToD#1234[HU] +248 MMR (18W-7L) WWLWWWWLWWW
WINNER_BLURB: Climbed +248 MMR across 25 games on Human...
WINNER_QUOTES: "ToD: finally climbing"; "ToD: feels good"
HEROSLAYER_HEROES: HDeathKnight,HLich,HNecromancer
HEROSLAYER_VICTIMS: HPaladin,HDeathKnight,HArchMage
HEROSLAYER_KILLBOARD: HPaladin:12,HDeathKnight:10,HArchMage:8
```

### Pain points
1. **Manual key registration in 3-4 places** — `DIGEST_SECTIONS`, `QUOTE_KEYS`, `BLURB_KEYS`, `HEROSLAYER_DATA_KEYS`, server-side regex. Miss one and things silently fail.
2. **No nesting** — A spotlight player's blurb, quotes, streak data, and hero data are all separate top-level keys found via string suffix matching (`${statKey}_BLURB`).
3. **Inconsistent naming** — `HEROSLAYER_BLURB` vs `Hero Slayer_BLURB` vs `Unit Killer_BLURB`. Match stat awards use display names as key prefixes.
4. **Fragile parsing** — Semicolons separate items, pipes separate fields, brackets encode arrays, quotes use regex extraction. Each format needs its own parser.
5. **Orphaned subsections** — Hiding COLDSTREAK doesn't remove COLDSTREAK_BLURB/COLDSTREAK_QUOTES from the published digest.
6. **Editorial ↔ reader divergence** — Both views re-parse the same flat text with different logic. Quote filtering, story extraction, and section assembly are duplicated and inconsistent.

---

## Proposed: Structured JSON Schema

Replace `digest TEXT` with `digest_json JSONB` (or just `TEXT` containing JSON). The server produces this object, both Magazine views consume it directly.

### Top-level structure
```typescript
interface WeeklyDigest {
  version: 1;
  weekStart: string;   // "2025-02-10"
  weekEnd: string;     // "2025-02-16"

  // ACT 1: Narrative sections
  narrative: {
    topics: string[];
    drama: StoryItem[];        // First item = lead/top story
    bans: BanItem[];
    highlights: StoryItem[];
    recap: string | null;
    bestOfChat: string | null;
  };

  // ACT 2: Player spotlights
  spotlights: {
    winner: SpotlightCard | null;
    loser: SpotlightCard | null;
    grinder: SpotlightCard | null;
    hotStreak: SpotlightCard | null;
    coldStreak: SpotlightCard | null;
    heroSlayer: HeroSlayerCard | null;
  };

  // ACT 3: Data sections
  powerRankings: RankingEntry[];
  matchStats: AwardCard[];       // Unit Killer, Longest Game, etc.
  heroMeta: AwardCard[];         // Fan Favorite, Spicy Combo, etc.
  newBlood: NewBloodEntry[];
  upsets: UpsetEntry[];
  atSpotlight: ATStackEntry[];

  // Metadata
  mentions: Record<string, string>;  // name → battleTag
  stats: WeeklyStats;
  clips: Clip[];
}
```

### Key sub-types
```typescript
interface StoryItem {
  summary: string;
  quotes: Quote[];
  headline?: string;        // Optional title for lead stories
}

interface Quote {
  speaker: string | null;   // null = unattributed
  text: string;
}

interface SpotlightCard {
  battleTag: string;
  race: string | null;
  mmrChange: number;
  wins: number;
  losses: number;
  form: string;             // "WWLWWWW"
  blurb: string | null;
  quotes: Quote[];
  // Streak-specific (only for hotStreak/coldStreak)
  streakLength?: number;
  dailyBreakdown?: DailyEntry[];
  streakSpectrum?: { wins: Record<number, number>; losses: Record<number, number> };
}

interface HeroSlayerCard extends SpotlightCard {
  heroKillRate: number;
  maxKillsInGame: number;
  playerHeroes: string[];
  victimHeroes: string[];
  killboard: Record<string, number>;
}

interface BanItem {
  name: string;
  duration: string;         // "3d" or "perm"
  reason: string;
  matchId: string | null;
}

interface RankingEntry {
  rank: number;
  battleTag: string;
  race: string | null;
  mmrChange: number;
  wins: number;
  losses: number;
  form: string;
}

interface AwardCard {
  category: string;         // "unit_killer", "fan_favorite"
  label: string;            // "Unit Killer", "Fan Favorite"
  battleTag: string;
  stat: string;             // "312.4 units killed/game"
  runners?: string[];       // Runner-up descriptions
  blurb: string | null;
  quotes: Quote[];
  heroes?: string[];        // Hero combo if applicable
}

interface NewBloodEntry {
  battleTag: string;
  mmr: number;
  games: number;
  winRate: number;
  isReturning: boolean;
  lastSeen?: string;        // ISO date if returning
  firstSeen?: string;
}

interface UpsetEntry {
  matchId: string;
  map: string;
  mmrGap: number;
  underdogs: TeamEntry[];
  favorites: TeamEntry[];
}

interface TeamEntry {
  battleTag: string;
  mmr: number;
}

interface ATStackEntry {
  players: { battleTag: string; mmr: number }[];
  stackSize: number;
  wins: number;
  losses: number;
  winRate: number;
}
```

---

## Migration Strategy

This is a **big change** that touches the server digest generator, the editorial hook, and both Magazine views. Do it incrementally:

### Phase 1: Add JSON alongside flat text (server)
- Add a `toJSON()` function in `server/src/digest.js` that converts the flat text to the JSON schema after generation
- Store both `digest` (flat text, for backward compat) and `digest_json` (new format) in the DB
- The AI prompt to Claude can stay the same — just parse its flat-text output into JSON before storing
- Add a new GET endpoint (or query param) that returns JSON format

### Phase 2: Consume JSON in reader view
- Update `src/pages/Magazine.jsx` to read from the JSON format
- Remove all the per-section parsing (`parseStatLine`, `parsePowerRankings`, `splitQuotes`, etc.)
- Each component receives its typed sub-object directly
- This is the simpler view — no editing, just rendering

### Phase 3: Consume JSON in editorial view
- Update `src/components/news/WeeklyMagazine.jsx` and `useWeeklyEditorial.js`
- Editorial operations (edit, delete, reorder, toggle) mutate the JSON draft directly
- No more `parseDigestSections()` → `find()` → regex extraction chains
- Autosave sends the JSON draft to the server

### Phase 4: Drop flat text
- Remove `digest` column (or stop writing to it)
- Remove all flat-text parsing utilities from `digestUtils.js`
- Remove `SECTION_RE`, `ALL_SECTION_KEYS`, `QUOTE_KEYS`, `BLURB_KEYS`, etc.

---

## Key Files to Modify

| File | Role | Changes |
|------|------|---------|
| `server/src/digest.js` | Produces digest | Add `toJSON()` converter after AI generation |
| `server/src/db.js` | Database schema | Add `digest_json` column |
| `server/src/routes/admin.js` | API routes | Serve JSON format, accept JSON draft saves |
| `src/lib/digestUtils.js` | Shared parsing | Eventually replace with typed accessors |
| `src/lib/useWeeklyEditorial.js` | Editorial state | Mutate JSON draft instead of flat text |
| `src/pages/Magazine.jsx` | Reader view | Consume JSON directly |
| `src/components/news/WeeklyMagazine.jsx` | Editorial view | Consume JSON directly |

---

## Design Decisions to Make

1. **Where does the flat→JSON conversion happen?** Server-side after AI generation (recommended) vs. client-side on fetch?
2. **Does the AI prompt change?** The flat-text format works well for LLM output. Asking Claude to produce valid JSON is possible but may reduce quality. Recommend: keep flat-text prompt, parse to JSON server-side.
3. **How to handle the editorial draft?** Store as JSON and mutate directly? Or keep flat text for the draft and only convert on publish?
4. **Migration for existing data?** Write a one-time migration script to convert all existing `digest` text rows to `digest_json`.
5. **Versioning?** The `version: 1` field allows schema evolution. Should we validate against a JSON schema on write?

---

## Success Criteria

- [ ] No manual key registration — adding a new section type requires changes in ONE place
- [ ] Quotes, blurbs, and metadata are nested inside their parent (spotlight, award, story)
- [ ] Editorial operations (edit, delete, reorder, add quote) work by mutating JSON — no regex parsing
- [ ] Reader view consumes typed objects — no `splitQuotes()`, `parseStatLine()`, etc.
- [ ] Both views render identical content from the same data
- [ ] Existing weekly digests are migrated and render correctly
