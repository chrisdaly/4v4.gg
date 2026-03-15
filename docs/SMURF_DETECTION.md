# Smurf Detection & Playstyle Analysis

Work-in-progress feature for detecting smurfs and analyzing player playstyles via replay fingerprinting.

## Status: Hidden/Experimental

- Removed from public nav (was in MORE dropdown as "Lab")
- Still accessible at `/replay-lab` for testing
- Player profile playstyle tab uses this data

## Architecture

### Database Tables

```sql
-- Player fingerprints extracted from replays
player_fingerprints (
  id, replay_id, player_id, battle_tag, player_name, race,
  vector,           -- 30-dim fingerprint vector
  action_seg,       -- action type distribution
  apm_seg,          -- APM over game segments
  hotkey_seg,       -- hotkey usage patterns
  tempo_seg,        -- tempo/rhythm metrics
  intensity_seg,    -- intensity patterns
  transitions_seg,  -- group switching patterns
  rhythm_seg,       -- action timing patterns
  embedding         -- 128-dim embedding for similarity search
)

-- Raw action data for detailed analysis
replay_player_actions (
  replay_id, player_id, timed_segments, full_action_sequence,
  group_hotkeys, esc, subgroup, removeunit, basic, rightclick,
  ability, buildtrain, item, select_count, assigngroup,
  selecthotkey, group_compositions
)
```

### API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/fingerprints/profile/:battleTag` | Aggregated playstyle profile |
| `GET /api/fingerprints/profile/:battleTag/replays` | Replay list for player |
| `GET /api/fingerprints/profile/:battleTag/replays/:id` | Single-replay fingerprint |
| `GET /api/fingerprints/profile/:battleTag/personas` | Account sharing detection |
| `GET /api/fingerprints/explore/players` | Indexed player directory |
| `POST /api/fingerprints/import` | Import replays from W3C |
| `POST /api/replays/upload` | Upload .w3g file |

### Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `TransitionGlyph` | `src/components/replay-lab/TransitionGlyph.jsx` | Visual fingerprint (control group switching patterns) |
| `PlaystyleReport` | `src/components/replay-lab/PlaystyleReport.jsx` | Detailed playstyle breakdown (groups, speed, habits) |
| `PersonaSplit` | `src/components/replay-lab/PersonaSplit.jsx` | Account sharing visualization |
| `ScoutTab` | `src/pages/replay-lab/ScoutTab.jsx` | Player lookup + profile view |
| `CompareTab` | `src/pages/replay-lab/CompareTab.jsx` | Side-by-side player comparison |

### Fingerprint Vector (30 dimensions)

1. **Action mix** (6d): rightclick, ability, buildtrain, item, basic, select ratios
2. **Hotkey usage** (6d): group 0-9 usage distribution
3. **APM profile** (4d): early/mid/late game APM + variance
4. **Tempo** (4d): action burst patterns, rhythm consistency
5. **Intensity** (4d): peaks, valleys, stability
6. **Transitions** (6d): group switching patterns

### Notes System

PlaystyleReport generates human-readable notes based on fingerprint:
- "Selection addict" - high re-select ratio
- "Locked loop" - dominant group pair
- "Tab masher" - high subgroup cycling rate
- "Machine-gun pace" - fast + steady APM
- etc.

## Player Name Fallback

Uploaded replays don't have battle_tag, only player_name with discriminator (e.g., "Klotervan#2162"). API endpoints fall back to player_name lookup:

```javascript
let rows = getPlayerFingerprints(battleTag);
if (rows.length === 0) {
  rows = getPlayerFingerprintsByName(playerName); // LIKE query
}
```

## Integration Points

- **Upload page** (`/upload`): Shows playstyle after upload, links to player profile
- **Player profile** (`/player/:tag?tab=playstyle`): Embeds ScoutTab
- **Admin** (`/admin`): Could add Lab link here for internal testing

## Future Work

- [ ] Smurf similarity search (find accounts with similar fingerprints)
- [ ] Confidence scoring (need more replays for reliable fingerprint)
- [ ] PCA visualization (2D embedding plot)
- [ ] Persona detection refinement (account sharing alerts)
- [ ] Match prediction based on playstyle matchups
