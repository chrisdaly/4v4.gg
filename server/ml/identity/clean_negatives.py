"""Clean false-match measurement. Two accounts that appear in the same game are
provably different people, so scores between co-players are uncontaminated
negatives (real alternate accounts can never be among them). Positives are a
hidden half against its own known half."""
import sys
import numpy as np
from collections import defaultdict
from bench import handcrafted, _cos
from stat_models import plda
from score_norm import b, make, embed_wccn, snorm

# co-play pairs between probe i and gallery j (by player)
by_replay = defaultdict(set)
for pl, rp in zip(b.player, b.replay):
    by_replay[rp].add(pl)
gal_of = {p: j for j, p in enumerate(b.gal_player)}
probe_of = {p: i for i, p in enumerate(b.probe_player)}
neg = set()
for players in by_replay.values():
    players = list(players)
    for a in players:
        if a not in probe_of:
            continue
        for c in players:
            if c != a and c in gal_of:
                neg.add((probe_of[a], gal_of[c]))
neg = np.array(sorted(neg))
N = len(b.gallery)
print(f'{len(neg)} provably-different (co-player) probe/account pairs, {len(b.probes)} same-player pairs, pool {N}')


def report(name, S, D=None):
    """S ranks; D (default S) is the number the verdict is thresholded on."""
    D = S if D is None else D
    n = S.shape[0]
    others = np.where(np.arange(N)[None, :] == b.owner[:, None], -np.inf, S).max(1)
    own_rank1 = S[np.arange(n), b.owner] > others
    pos = D[np.arange(n), b.owner]
    ng = np.sort(D[neg[:, 0], neg[:, 1]])[::-1]
    out = []
    for f in (1e-3, 1e-4, 2.2e-5):
        k = max(1, int(round(len(ng) * f)))
        thr = ng[k - 1]
        out.append(((pos > thr) & own_rank1).mean() * 100)
    print(f'  {name:<38} rank-1 {own_rank1.mean()*100:5.1f}%   right and above threshold at pair false-match '
          f'1e-3: {out[0]:5.1f}%   1e-4: {out[1]:5.1f}%   2e-5 (about 5% per lookup): {out[2]:5.1f}%', flush=True)
    return ng


if __name__ == '__main__':
    _, S_hc = b.run('handcrafted', handcrafted())
    report('handcrafted (production)', S_hc)
    _, S_w = b.run('whitened cosine', make(), trained=True)
    ng = report('whitened cosine', S_w)
    _, S_n = b.run('adaptive s-norm 100', make(norm=True, top_k=100, shrink=0.0), trained=True)
    report('whitened cosine + adaptive s-norm', S_n)
    report('rank by cosine, threshold on s-norm', S_w, S_n)
    _, S_p = b.run('PLDA', plda(shrink=0.01), trained=True)
    report('PLDA', S_p)
    report('rank by cosine, threshold on PLDA', S_w, S_p)

    # How contaminated is the "owner removed" test? Compare the false alarms
    # observed there with what clean negatives predict.
    n = S_w.shape[0]
    S2 = S_w.copy()
    S2[np.arange(n), b.owner] = -np.inf
    bo = S2.max(1)
    print('\nWhitened cosine: share of lookups whose best non-owner match clears a threshold')
    print('  threshold   observed   predicted from provably-different pairs')
    for thr in (0.97, 0.98, 0.99, 0.995):
        pair_rate = (ng > thr).mean()
        print(f'  {thr:.3f}      {(bo > thr).mean()*100:5.1f}%     {min(1, 1-(1-pair_rate)**N)*100:5.1f}%   (pair rate {pair_rate:.2e})')
