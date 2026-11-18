"""
Does the sequence model make better verdicts, not just better rankings?

    python eval_verdict.py DATA FINGERPRINTS_NPZ MODELS_DIR CONFIRMED_JSON

DATA            prepared sequence data (arrays.npz, games.tsv)
FINGERPRINTS    identity/games.npz (per-game fingerprints, for the whitened scorer)
MODELS_DIR      holds fold0/model.pt and fold1/model.pt from train.py
CONFIRMED_JSON  [[main, smurf], ...] from /api/fingerprints/validation

Three scorers on the same games: whitened (production), sequence, and both
averaged. Each is judged with the relay's verdict (server/src/identityModel.js):
how far the top match stands out above the 100 nearest strangers on both sides,
as a rarity against the best-match stand-out of ordinary accounts; confident
at 1%, possible at 5%.

1. Hidden halves (same split as train.py), owner in the pool: how often is the
   top match right AND flagged, and how often is a wrong top match flagged?
2. Owner removed from the pool: every flag is a false alarm.
3. Confirmed pairs: where the main ranks for the smurf, and the verdict.
"""
import json
import sys
from collections import defaultdict
from pathlib import Path

import numpy as np
import torch

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE))
import train as T  # noqa: E402

COHORT = 100
SEGS = [('action', 6), ('apm', 3), ('hotkey', 20), ('tempo', 7), ('intensity', 2), ('transitions', 10), ('rhythm', 15)]


def seg_slices():
    out, o = {}, 0
    for n, d in SEGS:
        out[n] = slice(o, o + d)
        o += d
    return out, o


def fingerprint_features(npz):
    """As server/ml/identity/stat_models.features: sqrt shares, missing sequence
    segments masked, trigram ids dropped."""
    SL, DIM = seg_slices()
    z = np.load(npz, allow_pickle=True)
    X = z['X'].astype(np.float64)
    M = np.ones_like(X, dtype=bool)
    for name in ('tempo', 'transitions', 'rhythm'):
        s = SL[name]
        M[~(X[:, s] != 0).any(1), s] = False
    for name in ('action', 'hotkey', 'tempo', 'transitions', 'intensity'):
        X[:, SL[name]] = np.sqrt(np.maximum(X[:, SL[name]], 0))
    keep = np.ones(DIM, bool)
    keep[[SL['rhythm'].start + i for i in (0, 2, 4, 6, 8)]] = False
    tags = list(z['tags'])
    row = {(tags[p], int(r)): i for i, (p, r) in enumerate(zip(z['player'], z['replay']))}
    return X[:, keep], M[:, keep], row


def unit(v):
    return v / (np.linalg.norm(v, axis=-1, keepdims=True) + 1e-9)


def strangers(S, exclude):
    """Mean/std of the COHORT highest scores per row, leaving out `exclude` (bool mask)."""
    S = np.where(exclude, -np.inf, S)
    top = -np.sort(-S, axis=1)[:, :COHORT]
    return top.mean(1), top.std(1) + 1e-9


def standout(Sq, G, cand, skip_q, skip_c):
    """Stand-out of candidate `cand[i]` for query row i (Sq: queries x pool),
    against both the query's and the candidate's nearest strangers."""
    n = len(Sq)
    s = Sq[np.arange(n), cand]
    ex = skip_q.copy()
    ex[np.arange(n), cand] = True
    qm, qs = strangers(Sq, ex)
    Sc = G[cand] @ G.T  # candidate vs pool
    exc = skip_c.copy()
    exc[np.arange(n), cand] = True
    cm, cs = strangers(Sc, exc)
    return 0.5 * ((s - qm) / qs + (s - cm) / cs)


def reference(G, sample):
    """Best-match stand-outs of ordinary pool accounts (the relay's reference)."""
    S = G[sample] @ G.T
    skip = np.zeros_like(S, dtype=bool)
    skip[np.arange(len(sample)), sample] = True
    best = np.where(skip, -np.inf, S).argmax(1)
    return np.sort(standout(S, G, best, skip, skip_c_for(G, best, sample)))


def skip_c_for(G, cand, also):
    m = np.zeros((len(cand), len(G)), dtype=bool)
    m[np.arange(len(cand)), also] = True
    return m


def rarity(values, ref):
    return 1 - np.searchsorted(ref, values, side='left') / len(ref)


def verdicts(r):
    return np.where(r <= 0.01, 'confident', np.where(r <= 0.05, 'possible', 'no'))


def main(data_dir, fp_npz, models_dir, confirmed_json):
    device = 'cuda' if torch.cuda.is_available() else 'mps' if torch.backends.mps.is_available() else 'cpu'
    X, M, fp_row = fingerprint_features(fp_npz)
    data, offsets, games = T.load(data_dir)
    both = [i for i, g in enumerate(games) if (g['tag'], g['replay']) in fp_row]
    by_tag = defaultdict(list)
    for i in both:
        by_tag[games[i]['tag']].append(i)
    tag_id = {t: k for k, t in enumerate(by_tag)}
    pairs = json.loads(Path(confirmed_json).read_text())
    rng = np.random.default_rng(0)
    print(f'{len(both)} games, {len(by_tag)} accounts, device {device}', flush=True)

    embeds = {}
    for fold in (0, 1):
        model = T.Encoder().to(device)
        model.load_state_dict(torch.load(Path(models_dir) / f'fold{fold}' / 'model.pt', map_location=device))
        embeds[fold] = T.embed_games(model, data, offsets, np.array(both), device)
        print(f'embedded fold {fold}', flush=True)
    pos = {g: k for k, g in enumerate(both)}

    def whitener(train_games):
        rows = [fp_row[(games[i]['tag'], games[i]['replay'])] for i in train_games]
        F, Mk = X[rows], M[rows]
        pl = np.array([tag_id[games[i]['tag']] for i in train_games])
        mu = (F * Mk).sum(0) / np.maximum(Mk.sum(0), 1)
        Z = np.where(Mk, F - mu, 0.0)
        d = F.shape[1]
        Sw, nw = np.zeros((d, d)), 0
        for p in np.unique(pl):
            g = Z[pl == p]
            if len(g) >= 3:
                r = g - g.mean(0); Sw += r.T @ r; nw += len(g) - 1
        Sw = Sw / max(nw, 1)
        Sw = 0.9 * Sw + 0.1 * np.eye(d) * np.trace(Sw) / d
        w, V = np.linalg.eigh(Sw)
        return mu, V @ np.diag(1 / np.sqrt(np.maximum(w, 1e-10))) @ V.T

    def fp_acct(idx, mu, W):
        rows = [fp_row[(games[i]['tag'], games[i]['replay'])] for i in idx]
        return unit(np.where(M[rows], X[rows] - mu, 0.0).mean(0) @ W)

    def seq_acct(idx, fold):
        return unit(embeds[fold][[pos[i] for i in idx]].mean(0))

    results = defaultdict(lambda: defaultdict(list))
    for fold in (0, 1):
        known, queries = [], []
        for tag, idx in by_tag.items():
            idx = sorted(idx, key=lambda i: games[i]['replay'])
            if T.fold_of(tag) == fold and len(idx) >= T.MIN_TEST_GAMES:
                h = len(idx) // 2
                known.append(idx[:h]); queries.append((len(known) - 1, idx[h:]))
            else:
                known.append(idx)
        owner = np.array([o for o, _ in queries])
        mu, W = whitener([i for t, idx in by_tag.items() if T.fold_of(t) != fold for i in idx])
        scorers = {}
        Gw = np.stack([fp_acct(k, mu, W) for k in known]); Pw = np.stack([fp_acct(q, mu, W) for _, q in queries])
        Gs = np.stack([seq_acct(k, fold) for k in known]); Ps = np.stack([seq_acct(q, fold) for _, q in queries])
        # "both": concatenated unit vectors, so similarity is the mean of the two cosines
        scorers['whitened'] = (Pw, Gw)
        scorers['sequence'] = (Ps, Gs)
        scorers['both'] = (unit(np.hstack([Pw, Ps])), unit(np.hstack([Gw, Gs])))
        not_owner = np.setdiff1d(np.arange(len(known)), owner)
        sample = rng.choice(not_owner, size=min(300, len(not_owner)), replace=False)
        n = len(queries)
        for name, (P, G) in scorers.items():
            ref = reference(G, sample)
            S = P @ G.T
            # 1. owner in the pool
            none = np.zeros_like(S, dtype=bool)
            top = S.argmax(1)
            r = rarity(standout(S, G, top, none, skip_c_for(G, top, top)), ref)
            v = verdicts(r)
            right = top == owner
            for key, val in (('right_conf', right & (v == 'confident')), ('right_poss', right & (v != 'no')),
                             ('wrong_conf', ~right & (v == 'confident')), ('wrong_poss', ~right & (v != 'no'))):
                results[name][key].append(val)
            # 2. owner removed: every flag is false
            skip = np.zeros_like(S, dtype=bool); skip[np.arange(n), owner] = True
            top2 = np.where(skip, -np.inf, S).argmax(1)
            skipc = skip_c_for(G, top2, owner)
            r2 = rarity(standout(np.where(skip, -np.inf, S), G, top2, skip, skipc), ref)
            v2 = verdicts(r2)
            results[name]['absent_conf'].append(v2 == 'confident')
            results[name]['absent_poss'].append(v2 != 'no')
        print(f'fold {fold} done', flush=True)

    print('\nHidden halves, both folds')
    print(f"{'scorer':<10} {'right+confident':>16} {'right+possible':>15} {'wrong+confident':>16} {'wrong+possible':>15} {'absent: confident':>18} {'absent: possible':>17}")
    for name, d in results.items():
        m = {k: np.concatenate(v).mean() * 100 for k, v in d.items()}
        print(f"{name:<10} {m['right_conf']:15.1f}% {m['right_poss']:14.1f}% {m['wrong_conf']:15.1f}% "
              f"{m['wrong_poss']:14.1f}% {m['absent_conf']:17.1f}% {m['absent_poss']:16.1f}%")

    # 3. Confirmed pairs: smurf's whole account against every account
    print('\nConfirmed pairs: rank of the main for the smurf (whitened / sequence / both)')
    mu, W = whitener(both)
    tags = list(by_tag)
    Gw = np.stack([fp_acct(by_tag[t], mu, W) for t in tags])
    for main_tag, smurf in pairs:
        if main_tag not in tag_id or smurf not in tag_id:
            print(f'  {main_tag} / {smurf}: not in the sequence data')
            continue
        fold = T.fold_of(smurf)  # the model that never trained on the smurf
        Gs = np.stack([seq_acct(by_tag[t], fold) for t in tags])
        out = []
        for name, G in (('whitened', Gw), ('sequence', Gs), ('both', unit(np.hstack([Gw, Gs])))):
            s_i, m_i = tag_id[smurf], tag_id[main_tag]
            S = G[[s_i]] @ G.T
            skip = np.zeros_like(S, dtype=bool); skip[0, s_i] = True
            rank = int((np.where(skip, -np.inf, S)[0] > S[0, m_i]).sum()) + 1
            sample = rng.choice(np.setdiff1d(np.arange(len(G)), [s_i, m_i]), size=300, replace=False)
            ref = reference(G, sample)
            st = standout(np.where(skip, -np.inf, S), G, np.array([m_i]), skip, skip_c_for(G, np.array([m_i]), np.array([s_i])))
            out.append(f'{rank:>4} {verdicts(rarity(st, ref))[0]:<9}')
        print(f"  {main_tag.split('#')[0]:>12} / {smurf.split('#')[0]:<12} " + ' | '.join(out), flush=True)


if __name__ == '__main__':
    main(*sys.argv[1:5])
