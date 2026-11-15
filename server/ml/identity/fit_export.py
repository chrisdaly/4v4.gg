"""Fit the whitened identity model and export it as JSON for the relay.

  python fit_export.py eval.db identity-model.json            # fit on every player (what ships)
  python fit_export.py eval.db identity-model.json --fold 0   # fit on one fold only (for honest evaluation)
"""
import json, sys
import numpy as np
from bench import SEGS, SL, DIM
from stat_models import b, features, fit_stats, whiten, SEQ, RHYTHM_IDS

out = sys.argv[2]
fold = int(sys.argv[sys.argv.index('--fold') + 1]) if '--fold' in sys.argv else None
F, M = features(b)
train = np.arange(len(b.X)) if fold is None else np.where(b.game_fold == fold)[0]
mu, Sw, _ = fit_stats(F, M, b.player, train)
W = whiten(Sw, 0.1)

keep = [i for i in range(DIM) if i not in RHYTHM_IDS]
model = {
    'version': 1,
    'fittedOn': {'games': int(len(train)), 'players': int(len(np.unique(b.player[train]))), 'fold': fold},
    'segments': [{'name': n, 'dims': d} for n, d in SEGS],
    # share-type segments get a square root before centring
    'sqrtSegments': ['action', 'hotkey', 'tempo', 'transitions', 'intensity'],
    # all-zero in these means the replay had no action sequence: treat as missing
    'sequenceSegments': SEQ,
    'keep': keep,
    'mean': [round(float(x), 8) for x in mu],
    'whiten': [[round(float(x), 6) for x in row] for row in W],
}
if fold is not None:
    # which players the model never saw, so the Node evaluation can test only on them
    model['heldOutPlayers'] = [b.tags[p] for p in range(len(b.tags)) if b.fold[p] != fold]
with open(out, 'w') as f:
    json.dump(model, f, separators=(',', ':'))
print(f'wrote {out}: {len(keep)} dims, fitted on {model["fittedOn"]}')
