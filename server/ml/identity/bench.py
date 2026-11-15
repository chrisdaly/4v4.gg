"""
Experiment bench for smurf-identification scorers.

Same test as server/scripts/eval-identify.mjs: every player with 8+ games is
split by date into a known half and a hidden half; a scorer ranks every known
account for each hidden half. Anything trained is fitted on one fold of players
and tested on the other (2-fold cross-fit), so no probe's owner is ever seen in
training.
"""
import json, os, sqlite3, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, 'games.npz')
SEGS = [('action', 6), ('apm', 3), ('hotkey', 20), ('tempo', 7), ('intensity', 2), ('transitions', 10), ('rhythm', 15)]
SL = {}
_o = 0
for _n, _d in SEGS:
    SL[_n] = slice(_o, _o + _d)
    _o += _d
DIM = _o
WEIGHTS = dict(action=1.0, apm=2.0, hotkey=3.0, tempo=2.0, intensity=3.0, transitions=4.0, rhythm=4.0)
MIN_REPLAYS, MIN_GALLERY = 8, 3


def load(db_path):
    if os.path.exists(CACHE):
        z = np.load(CACHE, allow_pickle=True)
        return z['X'], z['player'], z['replay'], z['race'], list(z['tags'])
    con = sqlite3.connect(db_path)
    cur = con.execute("""
        SELECT COALESCE(pf.battle_tag, pf.player_name), pf.replay_id, pf.race,
               pf.action_seg, pf.apm_seg, pf.hotkey_seg, pf.tempo_seg, pf.intensity_seg,
               pf.transitions_seg, pf.rhythm_seg
        FROM player_fingerprints pf JOIN replays r ON r.id = pf.replay_id
        ORDER BY 1, COALESCE(r.match_date, r.uploaded_at), pf.replay_id""")
    X, player, replay, race, tags, idx = [], [], [], [], [], {}
    for row in cur:
        tag = row[0]
        if tag not in idx:
            idx[tag] = len(tags)
            tags.append(tag)
        v = np.zeros(DIM, dtype=np.float32)
        for (name, d), js in zip(SEGS, row[3:]):
            try:
                a = json.loads(js) if js else []
            except Exception:
                a = []
            if len(a) == d:
                v[SL[name]] = a
        X.append(v)
        player.append(idx[tag])
        replay.append(row[1])
        race.append(row[2] or '')
    X = np.nan_to_num(np.array(X, dtype=np.float32))
    player, replay, race = np.array(player), np.array(replay), np.array(race)
    np.savez_compressed(CACHE, X=X, player=player, replay=replay, race=race, tags=np.array(tags, dtype=object))
    return X, player, replay, race, tags


class Bench:
    def __init__(self, db_path, seed=12345):
        self.X, self.player, self.replay, self.race, self.tags = load(db_path)
        n_players = len(self.tags)
        starts = np.searchsorted(self.player, np.arange(n_players))
        ends = np.append(starts[1:], len(self.player))
        self.gallery, self.gal_player, self.probes, self.owner = [], [], [], []
        self.probe_player = []
        for p in range(n_players):
            g = np.arange(starts[p], ends[p])  # already in date order
            if len(g) >= MIN_REPLAYS:
                cut = len(g) // 2
                self.owner.append(len(self.gallery))
                self.gallery.append(g[:cut]); self.gal_player.append(p)
                self.probes.append(g[cut:]); self.probe_player.append(p)
            elif len(g) >= MIN_GALLERY:
                self.gallery.append(g); self.gal_player.append(p)
        self.owner = np.array(self.owner)
        self.gal_player = np.array(self.gal_player)
        self.probe_player = np.array(self.probe_player)
        rng = np.random.RandomState(seed)
        # Fold per PLAYER, covering everyone, so training never sees a test player.
        self.fold = rng.randint(0, 2, size=n_players)
        self.game_fold = self.fold[self.player]

    # entity helpers ------------------------------------------------------
    def mean_over(self, F, groups, mask=None):
        """Mean of per-game features F over each group of game indices.
        mask (games x dims, bool) marks which entries count; unmasked means are 0."""
        out = np.zeros((len(groups), F.shape[1]), dtype=np.float64)
        for i, g in enumerate(groups):
            if mask is None:
                out[i] = F[g].mean(0)
            else:
                m = mask[g]
                c = m.sum(0)
                out[i] = np.where(c > 0, (F[g] * m).sum(0) / np.maximum(c, 1), 0)
        return out

    # evaluation ----------------------------------------------------------
    def evaluate(self, S, probe_idx=None):
        """S: (probes x gallery) similarity. Returns dict of metrics."""
        owner = self.owner if probe_idx is None else self.owner[probe_idx]
        n = S.shape[0]
        own = S[np.arange(n), owner]
        S2 = S.copy()
        S2[np.arange(n), owner] = -np.inf
        best_other = S2.max(1)
        rank = 1 + (S2 > own[:, None]).sum(1)
        res = dict(n=n, rank1=float((rank == 1).mean()), top5=float((rank <= 5).mean()))
        for fpr in (0.01, 0.05):
            thr = np.sort(best_other)[::-1][min(n - 1, int(n * fpr))]
            res[f'det@{int(fpr*100)}%'] = float(((rank == 1) & (own > thr)).mean())
        return res

    def run(self, name, scorer, trained=False):
        """scorer(bench, train_games or None, probe_groups, gallery_groups) -> S.
        Trained scorers are cross-fitted: fit on fold k, score the other fold's probes."""
        if not trained:
            S = scorer(self, None, self.probes, self.gallery)
            res = self.evaluate(S)
        else:
            parts, own = [], []
            S_all = np.zeros((len(self.probes), len(self.gallery)))
            for k in (0, 1):
                train_games = np.where(self.game_fold == k)[0]
                pi = np.where(self.fold[self.probe_player] != k)[0]
                S_all[pi] = scorer(self, train_games, [self.probes[i] for i in pi], self.gallery)
            res = self.evaluate(S_all)
            S = S_all
        print(f"  {name:<44} rank-1 {res['rank1']*100:5.1f}%  top-5 {res['top5']*100:5.1f}%  "
              f"caught@1% {res['det@1%']*100:5.1f}%  caught@5% {res['det@5%']*100:5.1f}%", flush=True)
        return res, S


# ── Baseline: a faithful copy of computeServerSimilarity ────────────────

def _cos(A, B):
    na = np.linalg.norm(A, axis=1, keepdims=True); nb = np.linalg.norm(B, axis=1, keepdims=True)
    A = np.divide(A, na, out=np.zeros_like(A), where=na > 0)
    B = np.divide(B, nb, out=np.zeros_like(B), where=nb > 0)
    return A @ B.T


def _l2(A, B):
    d2 = (A * A).sum(1)[:, None] + (B * B).sum(1)[None, :] - 2 * A @ B.T
    return np.sqrt(np.maximum(d2, 0))


def segment_scores(P, G):
    out = {}
    for name, _ in SEGS:
        a, b = P[:, SL[name]], G[:, SL[name]]
        if name == 'apm':
            out[name] = np.maximum(0, 1 - _l2(a, b) / 1.5)
        elif name == 'intensity':
            out[name] = np.maximum(0, 1 - _l2(a, b) / 0.5)
        else:
            out[name] = _cos(a, b)
    return out


def handcrafted(weights=WEIGHTS):
    def scorer(b, _train, probes, gallery):
        P, G = b.mean_over(b.X, probes), b.mean_over(b.X, gallery)
        sc = segment_scores(P, G)
        num = np.zeros((len(probes), len(gallery))); den = np.zeros_like(num)
        for name, w in weights.items():
            if w == 0:
                continue
            s = sc[name]; active = s > 0
            num += np.where(active, s * w, 0); den += np.where(active, w, 0)
        return np.divide(num, den, out=np.zeros_like(num), where=den > 0)
    return scorer


if __name__ == '__main__':
    b = Bench(sys.argv[1])
    print(f'{len(b.X)} games, {len(b.tags)} players, {len(b.gallery)} gallery, {len(b.probes)} probes')
    b.run('handcrafted (production)', handcrafted())
