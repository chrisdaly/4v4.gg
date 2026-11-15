"""Detail on the whitened model: games needed, race, and the confirmed smurf pairs."""
import sys, sqlite3
import numpy as np
from collections import Counter
from bench import handcrafted, _cos, MIN_GALLERY
from stat_models import features, fit_stats, whiten, centred
from score_norm import b, make

F, M = features(b)
probes_full = b.probes

print('Rank-1 by number of games in the hidden half')
for k in (() if 'pairs' in sys.argv else (1, 3, 5, 10, 20)):
    idx = [i for i, g in enumerate(probes_full) if len(g) >= k]
    b.probes = [probes_full[i][:k] for i in range(len(probes_full))]
    # evaluate only probes that have k games
    for name, sc, tr in (('handcrafted', handcrafted(), False), ('whitened', make(), True)):
        if tr:
            S = np.zeros((len(b.probes), len(b.gallery)))
            for f in (0, 1):
                train = np.where(b.game_fold == f)[0]
                pi = np.where(b.fold[b.probe_player] != f)[0]
                S[pi] = sc(b, train, [b.probes[i] for i in pi], b.gallery)
        else:
            S = sc(b, None, b.probes, b.gallery)
        r = b.evaluate(S[idx], np.array(idx))
        print(f'  {k:>2} games  {name:<12} n={r["n"]:<5} rank-1 {r["rank1"]*100:5.1f}%  top-5 {r["top5"]*100:5.1f}%')
b.probes = probes_full

print('\nSame race vs cross race (majority race of hidden half vs known half)')
def maj(g):
    c = Counter(r for r in b.race[g] if r)
    return c.most_common(1)[0][0] if c else None
pr = [maj(g) for g in b.probes]; gr = [maj(b.gallery[o]) for o in b.owner]
same = np.array([p is not None and p == g for p, g in zip(pr, gr)])
cross = np.array([p is not None and g is not None and p != g for p, g in zip(pr, gr)])
for name, sc, tr in (('handcrafted', handcrafted(), False), ('whitened', make(), True)):
    _, S = b.run(name, sc, trained=tr)
    for lab_, m in (('same race', same), ('cross race', cross)):
        idx = np.where(m)[0]
        r = b.evaluate(S[idx], idx)
        print(f'    {lab_:<10} n={r["n"]:<5} rank-1 {r["rank1"]*100:5.1f}%  top-5 {r["top5"]*100:5.1f}%')

print('\nConfirmed smurf pairs: rank of the main when looking up the smurf (whole accounts)')
con = sqlite3.connect(sys.argv[1])
pairs = con.execute('SELECT tag_main, tag_smurf FROM validation_pairs').fetchall()
tag_idx = {t: i for i, t in enumerate(b.tags)}
n_players = len(b.tags)
starts = np.searchsorted(b.player, np.arange(n_players)); ends = np.append(starts[1:], len(b.player))
accounts = [p for p in range(n_players) if ends[p] - starts[p] >= MIN_GALLERY]
groups = [np.arange(starts[p], ends[p]) for p in accounts]
acc_of = {p: i for i, p in enumerate(accounts)}
held = {tag_idx[t] for pr_ in pairs for t in pr_ if t in tag_idx}
train = np.where(~np.isin(b.player, list(held)))[0]
mu, Sw, _ = fit_stats(F, M, b.player, train)
W = whiten(Sw, 0.1)
E, _ = centred(b, F, M, mu, groups)
Sw_all = _cos(E @ W, E @ W)
Xm = b.mean_over(b.X, groups)
from bench import segment_scores, WEIGHTS
def hc_row(i):
    sc = segment_scores(Xm[i:i+1], Xm)
    num = np.zeros(len(groups)); den = np.zeros(len(groups))
    for name, w in WEIGHTS.items():
        s = sc[name][0]; a = s > 0
        num += np.where(a, s * w, 0); den += np.where(a, w, 0)
    return np.divide(num, den, out=np.zeros_like(num), where=den > 0)
print(f"  {'smurf -> main':<44} {'handcrafted':>12} {'whitened':>10}   of {len(groups)} accounts")
tot = {'h': [], 'w': []}
for main, smurf in pairs:
    if main not in tag_idx or smurf not in tag_idx or tag_idx[main] not in acc_of or tag_idx[smurf] not in acc_of:
        print(f'  {smurf + " -> " + main:<44} not indexed'); continue
    q, t = acc_of[tag_idx[smurf]], acc_of[tag_idx[main]]
    out = []
    for key, row in (('h', hc_row(q)), ('w', Sw_all[q].copy())):
        row = row.copy(); own = row[t]; row[q] = -np.inf; row[t] = -np.inf
        # other confirmed smurfs of the same main are the same person: not wrong answers
        for m2, s2 in pairs:
            if m2 == main and s2 in tag_idx and tag_idx[s2] in acc_of:
                row[acc_of[tag_idx[s2]]] = -np.inf
        rk = 1 + int((row > own).sum()); out.append(rk); tot[key].append(rk)
    print(f'  {smurf + " -> " + main:<44} {out[0]:>12} {out[1]:>10}')
for key, name in (('h', 'handcrafted'), ('w', 'whitened')):
    r = np.array(tot[key])
    print(f'  {name}: first for {(r == 1).sum()} of {len(r)}, top 5 for {(r <= 5).sum()}, median rank {int(np.median(r))}')
