"""Round 1: segment ablation, then statistical scorers (whitening, PLDA)."""
import sys
import numpy as np
from bench import Bench, SEGS, SL, DIM, WEIGHTS, handcrafted, _cos

b = Bench(sys.argv[1])
which = (sys.argv[2] if len(sys.argv) > 2 else 'all') if __name__ == '__main__' else 'none'

if which in ('all', 'ablate'):
    print('Baseline')
    b.run('handcrafted (production)', handcrafted())
    print('Each segment alone')
    for name, _ in SEGS:
        b.run(f'only {name}', handcrafted({name: 1.0}))
    print('Leave one segment out')
    for name, _ in SEGS:
        w = dict(WEIGHTS); w[name] = 0
        b.run(f'without {name}', handcrafted(w))

# ── Feature preparation ─────────────────────────────────────────────────
# Sequence-derived segments are all-zero when a replay had no usable action
# sequence. Treat that as missing, not as a habit.
SEQ = ['tempo', 'transitions', 'rhythm']
# rhythm dims 0,2,4,6,8 are trigram ids divided by 999: labels, not quantities.
RHYTHM_IDS = [SL['rhythm'].start + i for i in (0, 2, 4, 6, 8)]


def features(b, sqrt=True, drop_ids=True, drop=()):
    X = b.X.astype(np.float64).copy()
    mask = np.ones_like(X, dtype=bool)
    for name in SEQ:
        s = SL[name]
        missing = ~(X[:, s] != 0).any(1)
        mask[missing, s] = False
    if sqrt:
        # Square root of proportions (Hellinger): tames the skew of share-type features
        for name in ('action', 'hotkey', 'tempo', 'transitions', 'intensity'):
            X[:, SL[name]] = np.sqrt(np.maximum(X[:, SL[name]], 0))
    keep = np.ones(DIM, dtype=bool)
    if drop_ids:
        keep[RHYTHM_IDS] = False
    for name in drop:
        keep[SL[name]] = False
    return X[:, keep], mask[:, keep]


def fit_stats(F, M, player, games):
    """Global mean, within-player and between-player covariance from training games,
    using only observed entries (pairwise-complete)."""
    F, M, pl = F[games], M[games], player[games]
    d = F.shape[1]
    cnt = M.sum(0)
    mu = (F * M).sum(0) / np.maximum(cnt, 1)
    Z = np.where(M, F - mu, 0.0)  # missing -> 0 after centring = population mean
    order = np.argsort(pl, kind='stable')
    Z, pl = Z[order], pl[order]
    uniq, start, counts = np.unique(pl, return_index=True, return_counts=True)
    Sw = np.zeros((d, d)); Sb = np.zeros((d, d)); nw = 0; nb = 0
    for s, c in zip(start, counts):
        if c < 3:
            continue
        g = Z[s:s + c]
        m = g.mean(0)
        r = g - m
        Sw += r.T @ r; nw += c - 1
        Sb += np.outer(m, m); nb += 1
    Sw /= max(nw, 1)
    Sb = Sb / max(nb, 1)
    return mu, Sw, Sb


def whiten(Sw, shrink=0.1):
    d = Sw.shape[0]
    Sw = (1 - shrink) * Sw + shrink * np.eye(d) * np.trace(Sw) / d
    w, V = np.linalg.eigh(Sw)
    return V @ np.diag(1 / np.sqrt(np.maximum(w, 1e-10))) @ V.T


def centred(b, F, M, mu, groups):
    Z = np.where(M, F - mu, 0.0)
    return b.mean_over(Z, groups), np.array([len(g) for g in groups])


def zscore_cosine(**fk):
    F, M = features(b, **fk)

    def scorer(b, train, probes, gallery):
        mu, Sw, _ = fit_stats(F, M, b.player, train)
        sd = np.sqrt(np.maximum(np.diag(Sw), 1e-10))
        P, _ = centred(b, F, M, mu, probes); G, _ = centred(b, F, M, mu, gallery)
        return _cos(P / sd, G / sd)
    return scorer


def wccn_cosine(shrink=0.1, **fk):
    F, M = features(b, **fk)

    def scorer(b, train, probes, gallery):
        mu, Sw, _ = fit_stats(F, M, b.player, train)
        W = whiten(Sw, shrink)
        P, _ = centred(b, F, M, mu, probes); G, _ = centred(b, F, M, mu, gallery)
        return _cos(P @ W, G @ W)
    return scorer


def plda(shrink=0.1, **fk):
    """Two-covariance model. After whitening within-player variation to identity and
    rotating so between-player variation is diagonal (psi), the log likelihood ratio
    of "same player" vs "different players" has a closed form per dimension, and it
    accounts for how many games each side is averaged over."""
    F, M = features(b, **fk)

    def scorer(b, train, probes, gallery):
        mu, Sw, Sb = fit_stats(F, M, b.player, train)
        W = whiten(Sw, shrink)
        Bw = W @ Sb @ W.T
        psi, U = np.linalg.eigh(Bw)
        psi = np.maximum(psi, 1e-6)
        T = W @ U
        P, n1 = centred(b, F, M, mu, probes); G, n2 = centred(b, F, M, mu, gallery)
        P, G = P @ T, G @ T
        S = np.zeros((len(probes), len(gallery)))
        c = psi[None, :] + 1.0 / n2[:, None]          # gallery x d
        for i in range(len(probes)):
            a = psi + 1.0 / n1[i]                      # d
            x = P[i][None, :]
            det = a * c - psi ** 2
            same = np.log(det) + (c * x * x - 2 * psi * x * G + a * G * G) / det
            diff = np.log(a * c) + x * x / a + G * G / c
            S[i] = -0.5 * (same - diff).sum(1)
        return S
    return scorer


if which in ('all', 'stat'):
    print('Statistical scorers (trained on one fold of players, tested on the other)')
    b.run('z-score + cosine', zscore_cosine(), trained=True)
    b.run('whitened (WCCN) + cosine', wccn_cosine(), trained=True)
    b.run('whitened + cosine, raw shares', wccn_cosine(sqrt=False), trained=True)
    b.run('whitened + cosine, keep trigram ids', wccn_cosine(drop_ids=False), trained=True)
    for sh in (0.01, 0.1, 0.3):
        b.run(f'PLDA shrink={sh}', plda(shrink=sh), trained=True)
    b.run('PLDA raw shares', plda(sqrt=False), trained=True)
    print('PLDA leave one segment out')
    for name, _ in SEGS:
        b.run(f'PLDA without {name}', plda(drop=(name,)), trained=True)
    b.run('PLDA hotkey only', plda(drop=tuple(n for n, _ in SEGS if n != 'hotkey')), trained=True)
