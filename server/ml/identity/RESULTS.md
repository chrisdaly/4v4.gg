# Identity model: results

Measured 15 Nov 2026 on an export of the relay database: 178,246 per-game
fingerprints from 3,609 players. None had a neural embedding, so the "hybrid"
score in production was the handcrafted score alone.

## The test

Every player with 8+ games is split by date. The older half keeps its name; the
newer half has its name hidden. A scorer ranks all 2,316 known accounts for each
of the 1,590 hidden halves. Anything fitted is trained on one half of the
players and tested on the other, so it never sees a player it is tested on.

False matches are measured on co-players: two accounts in the same game are
provably different people, and a real alternate account can never be among
them (329,533 such pairs).

## Results

| Scorer | Right account first | In top 5 | Right and above threshold at about 5% false alarms per lookup |
|---|---|---|---|
| Handcrafted (production) | 51.4% | 73.2% | 15.2% |
| Hotkey layout only | 54.8% | 77.2% | - |
| Whitened cosine | 77.7% | 93.8% | 3.7% on the raw score, 32.2% thresholding on adaptive s-norm |
| Small neural net on the same features | 81-82% | 97-98% | 34-37% thresholding on adaptive s-norm |

Whitened model against handcrafted, by games in the hidden half (first place):
1 game 57.5% vs 24.7%, 3 games 74.4% vs 39.1%, 10 games 80.9% vs 56.2%,
20 games 83.3% vs 62.7%.

Different race in the hidden half: whitened 70.1% (same race 80.1%),
handcrafted 48.6% (same race 52.4%).

Confirmed smurf pairs (14): whitened puts the main in the top 4 for all 14 and
first for 9. Handcrafted is first for 9 but ranks two at 57 and 76.

## The verdict

Ranking is not a verdict: the raw score cannot tell a real match from a
lookalike (3.7% caught in the table above). The relay therefore judges how far
the top match stands out above the nearest 100 strangers on both sides, against
how far a best match stands out for a sample of 300 accounts
(`server/src/identityModel.js`). Measured with the relay's own functions on the
819 players the scorer never saw (`scripts/eval-identify.mjs`):

| | confident | possible or better |
|---|---|---|
| Owner in the pool, names them | 10.9% | 26.3% |
| Owner in the pool, names someone else | 0.4% | 1.5% |
| Owner not in the pool (every verdict is wrong) | 1.7% | 5.5% |

The rule it replaced (top score against the 99.5th percentile of random pairs)
said "confident" for 82% of lookups whose owner was not in the pool.

The suspects list ranks pairs by the same stand-out measure. Ranked by raw
similarity it was generic low-game accounts; ranked this way its head is pairs
such as Cacxa26/cacxa27, bark#21978/bark#5125 and oONever#21412/oONever#2423.

## What the whitened model is

The same seven segments, with three changes:

1. Square root of share-type features, and the five trigram-id slots of the
   rhythm segment dropped (they are labels, not quantities).
2. Sequence segments that are all zero count as missing, not as a habit. About
   half of all fingerprints have no action-sequence data.
3. Each feature is rescaled by how much one player varies in it from game to
   game (within-player covariance, whitened), then accounts are compared by
   cosine.

It is a 58-number mean and a 58x58 matrix: `server/src/identity-model.json`,
applied by `server/src/identityModel.js`. The Node implementation reproduces
the Python numbers exactly (79.7% / 93.8% on the fold it never saw).

## What did not help

- Gaussian PLDA scoring: better thresholds than raw cosine, worse ranking (64%).
- Plain s-norm over the whole cohort: worse. Adaptive (closest 100) helps the
  threshold but costs ranking, so rank on cosine and threshold on s-norm.
- LDA dimension reduction: no gain at any size.
- Gap to runner-up, or the top score in standard deviations above the query's
  own spread, as the verdict statistic on the handcrafted score.
- Excluding same-game players from the candidate list: half a point.
- Leaving the nearest 3 to 20 accounts out of the "nearest strangers" group, so
  a player's own alternates do not count against them: correct "possible or
  better" verdicts fell from 26% to 16-19%.

## Segment ablation (handcrafted)

Alone: hotkey 54.8%, tempo 50.3%, rhythm 44.9%, transitions 34.5%, action
15.7%, intensity 5.4%, apm 3.0%. Removing hotkey drops the full score to 31.4%;
removing any other single segment costs under 2 points of first place.

## Limits

- Splitting one account in half is easier than a real smurf who changes race or
  plays differently on purpose. The 14 confirmed pairs are the only check on
  that, and they were found with the handcrafted scorer.
- The neural net is only 4 points better than the matrix. The features, not the
  model, are the ceiling. The next gain has to come from raw action sequences,
  which this export does not contain.

## Reproduce

```
cd server/ml/identity
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python stat_models.py ../../eval.db all      # ablation, whitening, PLDA
.venv/bin/python score_norm.py ../../eval.db all       # s-norm, LDA, shrinkage
.venv/bin/python clean_negatives.py ../../eval.db      # co-player false-match rates
.venv/bin/python detail.py ../../eval.db               # games needed, race, confirmed pairs
.venv/bin/python neural.py ../../eval.db               # small neural embedding
.venv/bin/python fit_export.py ../../eval.db ../../src/identity-model.json
# honest numbers: fit on one fold, test on the players it never saw
.venv/bin/python fit_export.py ../../eval.db model-fold0.json --fold 0
cd ../.. && node scripts/eval-identify.mjs --db eval.db --identity-model ml/identity/model-fold0.json
```
