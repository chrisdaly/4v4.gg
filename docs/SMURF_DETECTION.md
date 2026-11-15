# Smurf detection

How 4v4.gg decides that two accounts are probably the same person. Measured
results and the experiments behind them are in
[`server/ml/identity/RESULTS.md`](../server/ml/identity/RESULTS.md).

## The three pieces

1. **Fingerprint** (`server/src/fingerprint.js`). Every replay is boiled down
   to 63 numbers per player, in seven segments:

   | Segment | Size | What it records |
   |---|---|---|
   | action | 6 | Share of right-clicks, abilities, build/train, items, group selects, group assigns |
   | apm | 3 | Mean actions per minute, variability, burstiness |
   | hotkey | 20 | Which control groups (0-9) are selected and assigned, as shares |
   | tempo | 7 | Histogram of gaps between actions, after the first two minutes |
   | intensity | 2 | Share of all actions that are group selects and assigns |
   | transitions | 10 | How concentrated group-to-group switching is |
   | rhythm | 15 | Repeated three-key patterns, A-B-A oscillation, cycle lengths |

   Tempo, transitions and rhythm need the click-by-click action sequence, which
   about half of stored replays do not have. For those games the three segments
   are all zero, and that means "missing", not "no habit".

2. **Scorer** (`server/src/identityModel.js`, `server/src/identity-model.json`).
   Turns an account's fingerprints into one 58-number embedding and compares
   two accounts by cosine. The embedding re-weights each habit by how stable it
   is for one player from game to game: a habit kept every game counts a lot,
   one that drifts with the map counts little. The weights are fitted from the
   data (`server/ml/identity/fit_export.py`), not chosen by hand.

3. **Verdict** (same file). The raw similarity ranks candidates well but cannot
   say whether the top one is real, because some accounts resemble hundreds of
   others. The verdict asks how far the top match stands out above the nearest
   strangers on both sides, then how unusual that is among other accounts' best
   matches: `confident` if at most 1% stand out as much, `possible` at 5%.

## Where it shows up

| Surface | Route | Access |
|---|---|---|
| Identify: look up one account, top five matches and a verdict | `/truesight` | admin |
| Map: every indexed player in 2D, coloured by race or by a trait (speed, control groups, 1-2-1 spam) | `/truesight?tab=map` | admin |
| Confirmed pairs and the suspects list | `/truesight?tab=confirmed` | admin |
| Playstyle tab on a profile, playstyle cards on a match page | `/player`, `/match` | public |

Relay endpoints are under `/api/fingerprints/` (`server/src/routes/fingerprints.js`):
`identify/:battleTag`, `suspects`, `embedding-map`, `validation`, `profile/:battleTag`.

## Measuring it

`server/scripts/eval-identify.mjs` hides the name on the newer half of each
player's games and counts how often the scorer puts it back, and how often the
verdict accuses someone when the real owner is not in the database. Run it
against a copy of the relay database before changing the scorer or the verdict:

```
cd server && node scripts/eval-identify.mjs --db /path/to/chat.db
```

Two accounts that appear in the same game are provably different people. The
suspects list drops such pairs, and the experiments use them as clean negatives.

## Known limits

- A player with several indexed accounts gets a weaker verdict on each, because
  their other accounts sit among the "nearest strangers". They still rank at
  the top of each other's lists.
- Splitting one account in half is an easier test than a real smurf who changes
  race or plays differently on purpose.
- The fingerprint discards detail a model reading raw action sequences could
  use (which groups are switched between, timing between specific keys). That
  is the next step if the shortlist is not good enough.
