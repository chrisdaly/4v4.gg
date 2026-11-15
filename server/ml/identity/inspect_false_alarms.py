"""Are the strongest 'false alarms' actually the same person on another account?"""
import sys, sqlite3
import numpy as np
from score_norm import b, make
res, S = b.run('whitened cosine', make(), trained=True)
con = sqlite3.connect(sys.argv[1])
pairs = set()
for m, s in con.execute('SELECT tag_main, tag_smurf FROM validation_pairs'):
    pairs.add((m, s)); pairs.add((s, m))
n = S.shape[0]
own = S[np.arange(n), b.owner]
S2 = S.copy(); S2[np.arange(n), b.owner] = -np.inf
bo = S2.argmax(1); bs = S2.max(1)
order = np.argsort(-bs)
# shared games between probe account and its best other
games_of = {}
for p in range(len(b.tags)):
    pass
rep = b.replay
def reps(player):
    lo = np.searchsorted(b.player, player); hi = np.searchsorted(b.player, player, side='right')
    return set(rep[lo:hi].tolist())
print('Top 40 probes by strength of best NON-owner match')
print(f"{'probe account':<26}{'best other account':<26}{'score':>6} {'owner':>6}  known pair  shared games  n(probe)/n(other)")
known = 0
for i in order[:40]:
    pt = b.tags[b.probe_player[i]]; ot = b.tags[b.gal_player[bo[i]]]
    kp = (pt, ot) in pairs; known += kp
    shared = len(reps(b.probe_player[i]) & reps(b.gal_player[bo[i]]))
    print(f"{pt[:25]:<26}{ot[:25]:<26}{bs[i]:6.3f} {own[i]:6.3f}  {'YES' if kp else '':<10}  {shared:>5}        {len(b.probes[i])}/{len(b.gallery[bo[i]])}")
print('known validation pairs among top 40:', known)
print('quantiles of best-other:', np.quantile(bs, [0.5, 0.9, 0.95, 0.99]).round(3), ' owner:', np.quantile(own, [0.1, 0.25, 0.5, 0.75]).round(3))
