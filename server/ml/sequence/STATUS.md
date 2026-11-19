# Smurf detection: state, data, plan

Last updated 19 Nov 2026. Numbers come from `RESULTS.md`.

## Models

| | Whitened scorer | Sequence model |
|---|---|---|
| Where it runs | Production: True Sight Identify and the suspects list | Offline only (Modal) |
| Input | One fingerprint per game: action mix, APM, hotkeys, tempo, control-group switches | The first 256-action windows of each game: action type, control group, unit count, order id, time between actions |
| Method | Within-class whitening (WCCN), then cosine similarity | Dilated 1D CNN, contrastive loss (SupCon), 2 folds split by tag hash |
| Right account first | 87.6% | 90.9% |
| Owner flagged "possible" | 41% | 57% |
| False alarms at "possible" (owner absent) | 7.5% | 8.3% |
| Players it can score | Everyone with fingerprints (3,515) | Only players with action sequences (about 2,100) |

The verdict rule is the same for both: the top match has to stand out against the 100 nearest strangers on both sides. It is "confident" when that stand-out is rarer than 1% of 300 ordinary accounts' best matches, and "possible" when rarer than 5%.

Country and chat are shown as side evidence only. They can be faked, so neither model uses them.

## Data

| What | Count | Notes |
|---|---|---|
| Replays in the DB | 22,665 | |
| Replay files still on disk | 7,380 | The importer deletes each `.w3g` after parsing it |
| Games at parser standard v2 | 1,136 and rising | The re-parse of the files on disk finishes about 18:00 UTC on 19 Nov |
| Players without an action sequence | 1,404 | 726 re-downloads would cover all but 80 |
| Labelled pairs | 19, all "same" | `pair_labels` and `validation_pairs` in the relay DB |

Parser v2 (`PARSER_VERSION` in `server/src/replayParser.js`) adds order and ability ids, the unit type tabbed to, and gold/lumber sent to allies. Games parsed before v2 have none of these. OPERATIONS.md, under "Replay parser standard", says how to check coverage.

W3C limits downloads per IP over a rolling 24 hours: 100/day for games up to 7 days old, 70/day for older games. The importer's drip takes up to 60 of those. We have no API token and want to stay self-sufficient.

## Plan

1. **Retrain on the mixed data** (scheduled for 19 Nov evening, after the re-parse): export, train and evaluate on Modal CPUs, then compare with the table above. Add the 19 new labels to the confirmed test set.
2. **Drip the backfill:** the relay downloads one replay about every 30 minutes, waits after a 429 instead of stopping, and replans daily. It will take weeks.
3. **Sequence model on the site:** embed every player with a sequence on Modal, load the vectors into the relay, and show its verdict next to the whitened one in Identify.
4. **Retrain in 2-4 weeks** once the backfill and v2 data have grown. Whichever scorer wins on the labels becomes the main verdict, and we then try combining the two.

What we need from Chris: labels, especially "Different players". With none so far, we cannot measure false alarms on real suspects.
