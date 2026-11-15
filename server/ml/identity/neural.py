"""Round 5: a small neural embedding trained to tell players apart, on the same
per-game features. Trained on one fold of players, tested on the other."""
import sys
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as Fn
from bench import _cos
from stat_models import features, fit_stats
from score_norm import b, make, snorm
from clean_negatives import report

F, M = features(b)
torch.manual_seed(0)


def train_net(train, emb=64, hidden=256, epochs=30, margin=0.2, scale=24.0, drop=0.1, lr=2e-3, verbose=False):
    mu, Sw, _ = fit_stats(F, M, b.player, train)
    sd = np.sqrt(np.maximum(np.diag(Sw), 1e-10))

    def prep(idx):
        Z = np.where(M[idx], (F[idx] - mu) / sd, 0.0)
        return np.concatenate([Z, M[idx].astype(np.float64)], 1).astype(np.float32)

    pl = b.player[train]
    uniq, inv, cnt = np.unique(pl, return_inverse=True, return_counts=True)
    keep = cnt[inv] >= 4
    Xtr = torch.tensor(prep(train[keep]))
    remap = -np.ones(len(uniq), dtype=np.int64)
    remap[cnt >= 4] = np.arange((cnt >= 4).sum())
    ytr = torch.tensor(remap[inv[keep]])
    n_cls = int((cnt >= 4).sum())

    net = nn.Sequential(
        nn.Linear(Xtr.shape[1], hidden), nn.BatchNorm1d(hidden), nn.ReLU(), nn.Dropout(drop),
        nn.Linear(hidden, hidden), nn.BatchNorm1d(hidden), nn.ReLU(), nn.Dropout(drop),
        nn.Linear(hidden, emb),
    )
    proto = nn.Parameter(torch.randn(n_cls, emb) * 0.01)
    opt = torch.optim.AdamW(list(net.parameters()) + [proto], lr=lr, weight_decay=1e-4)
    sched = torch.optim.lr_scheduler.OneCycleLR(opt, max_lr=lr, total_steps=epochs * (len(Xtr) // 512 + 1))
    for ep in range(epochs):
        net.train()
        perm = torch.randperm(len(Xtr))
        tot = 0.0
        for i in range(0, len(perm), 512):
            idx = perm[i:i + 512]
            if len(idx) < 2:
                continue
            z = Fn.normalize(net(Xtr[idx]), dim=1)
            logits = z @ Fn.normalize(proto, dim=1).T
            # additive margin softmax: the true class must win by a margin
            logits = scale * (logits - margin * Fn.one_hot(ytr[idx], n_cls))
            loss = Fn.cross_entropy(logits, ytr[idx])
            opt.zero_grad(); loss.backward(); opt.step(); sched.step()
            tot += loss.item() * len(idx)
        if verbose and ep % 5 == 4:
            print(f'    epoch {ep+1} loss {tot/len(perm):.3f}', flush=True)
    net.eval()

    def embed(groups):
        allg = np.concatenate(groups)
        with torch.no_grad():
            Z = Fn.normalize(net(torch.tensor(prep(allg))), dim=1).numpy()
        out = np.zeros((len(groups), Z.shape[1])); o = 0
        for i, g in enumerate(groups):
            out[i] = Z[o:o + len(g)].mean(0); o += len(g)
        return out
    return embed


def neural(norm=False, **kw):
    def scorer(b, train, probes, gallery):
        k = b.game_fold[train[0]]
        embed = train_net(train, **kw)
        Pe, Ge = embed(probes), embed(gallery)
        S = _cos(Pe, Ge)
        if norm:
            S = snorm(S, Pe, Ge, np.where(b.fold[b.gal_player] == k)[0], 100)
        return S
    return scorer


if __name__ == '__main__':
    configs = {
        'neural 64d': dict(),
        'neural 64d, wider (512)': dict(hidden=512),
        'neural 128d, 60 epochs': dict(emb=128, epochs=60),
        'neural 64d, margin 0.35': dict(margin=0.35),
        'neural 64d, dropout 0.3': dict(drop=0.3),
    }
    only = sys.argv[2] if len(sys.argv) > 2 else None
    for name, kw in configs.items():
        if only and only not in name:
            continue
        _, S = b.run(name, neural(**kw), trained=True)
        _, Sn = b.run(name + ' + s-norm', neural(norm=True, **kw), trained=True)
        report(name + ' (rank raw, threshold s-norm)', S, Sn)
