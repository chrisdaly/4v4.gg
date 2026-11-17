# Sequence model: results

Measured 18 Nov 2026 on the sequence export (95,780 games, 1,960 accounts).
Each fold trains on half the players (by tag hash) and tests on the other half;
the hidden half of each test player (8+ games) is ranked against every account.
8,000 steps, about 1h50 per fold on an 8 GB M2.

| Fold | Hidden players | Right account first | Top 5 |
|---|---|---|---|
| 0 | 530 | 89.6% | 99.8% |
| 1 | 503 | 92.2% | 99.2% |

## Against the whitened scorer, same games and split

94,302 games that have both a sequence and a fingerprint (`compare.py` in the
session scratchpad; logic: same split as train.py, whitener fitted on the
training fold only). Both folds pooled, 1,019 hidden players, pool 1,928.

| Scorer | First | Top 5 | Caught at 1% false alarms | Caught at 5% |
|---|---|---|---|---|
| Whitened (production) | 87.6% | 97.7% | 4.5% | 25.2% |
| Sequence model | 90.9% | 99.6% | 7.2% | 32.4% |
| Both, z-scored per lookup and summed | 91.9% | 99.7% | 5.3% | 19.7% |

- The 78% in `identity/RESULTS.md` is a harder set (players without sequences,
  fewer games). On these players the whitened scorer already gets 87.6%, so the
  sequence model's real gain is about 3 points first place, 2 points top 5.
- "Caught" uses the raw score as a threshold, which production does not do (it
  uses the stand-out measure). Fusing by per-lookup z-scores throws away the
  absolute level, which is why it ranks best but thresholds worst. Next: the
  stand-out verdict on both scores, and the confirmed smurf pairs.
- The stored sequences carry action type, control group and timing only; unit
  counts and ability ids are absent, so those inputs are all zero.
