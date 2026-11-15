"""Round 2: make the score comparable across queries (score normalisation),
LDA projection, and per-game aggregation, on top of whitened cosine."""
import sys
import numpy as np
from bench import Bench, _cos
from stat_models import features, fit_stats, whiten, centred

from stat_models import b
F, M = features(b)


def embed_wccn(b, train, groups, lda_dims=None, shrink=0.1):
    mu, Sw, Sb = fit_stats(F, M, b.player, train)
    W = whiten(Sw, shrink)
    if lda_dims:
        psi, U = np.linalg.eigh(W @ Sb @ W.T)
        W = W @ U[:, ::-1][:, :lda_dims]
    E, n = centred(b, F, M, mu, groups)
    return E @ W, n


def snorm(S, Pe, Ge, cohort, top_k=None):
    """Symmetric score normalisation against a cohort of accounts that cannot be
    the owner (they belong to the training fold). Each score is expressed in
    standard deviations above what the query, and the candidate, usually score
    against strangers. top_k = adaptive: use only each side's closest strangers."""
    C = Ge[cohort]
    q = _cos(Pe, C)            # probes x cohort
    g = _cos(Ge, C)            # gallery x cohort
    # a cohort member scored against itself is not a stranger
    g[cohort, np.arange(len(cohort))] = np.nan

    def stats(A):
        if top_k:
            A = np.sort(np.where(np.isnan(A), -np.inf, A), axis=1)[:, -top_k:]
            A = np.where(np.isinf(A), np.nan, A)
        return np.nanmean(A, 1), np.nanstd(A, 1) + 1e-9
    mq, sq = stats(q); mg, sg = stats(g)
    return 0.5 * ((S - mq[:, None]) / sq[:, None] + (S - mg[None, :]) / sg[None, :])


def make(norm=None, top_k=None, lda_dims=None, shrink=0.1):
    def scorer(b, train, probes, gallery):
        k = b.game_fold[train[0]]
        Pe, _ = embed_wccn(b, train, probes, lda_dims, shrink)
        Ge, _ = embed_wccn(b, train, gallery, lda_dims, shrink)
        S = _cos(Pe, Ge)
        if norm:
            cohort = np.where(b.fold[b.gal_player] == k)[0]
            S = snorm(S, Pe, Ge, cohort, top_k)
        return S
    return scorer


which = (sys.argv[2] if len(sys.argv) > 2 else 'all') if __name__ == '__main__' else 'none'
if which in ('all', 'norm'):
    print('Whitened cosine, with score normalisation')
    b.run('whitened cosine (no normalisation)', make(), trained=True)
    b.run('+ s-norm, full cohort', make(norm=True), trained=True)
    for k in (50, 100, 300):
        b.run(f'+ adaptive s-norm, top {k}', make(norm=True, top_k=k), trained=True)
if which in ('all', 'lda'):
    print('LDA projection before cosine')
    for d in (10, 20, 30, 40):
        b.run(f'LDA {d} dims', make(lda_dims=d), trained=True)
        b.run(f'LDA {d} dims + adaptive s-norm 100', make(lda_dims=d, norm=True, top_k=100), trained=True)
if which in ('all', 'shrink'):
    print('Whitening shrinkage')
    for sh in (0.0, 0.02, 0.05, 0.2, 0.4):
        b.run(f'shrink {sh} + adaptive s-norm 100', make(norm=True, top_k=100, shrink=sh), trained=True)
