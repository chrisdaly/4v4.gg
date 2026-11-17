"""
Sequence model: learn a player's click habits from raw action sequences.

    .venv/bin/python train.py data/ runs/fold0 --fold 0 [--steps 20000]

Players are split in two by a hash of their tag. The model trains on one
fold and is tested on the other, so it never sees a player it is tested on.

Training: each batch holds P players x K games; one random window of WINDOW (256)
actions per game goes through a small transformer and is pooled into a
unit-length vector. Supervised contrastive loss pulls one player's games
together and pushes everyone else's apart.

Test (same as server/ml/identity/RESULTS.md): every test-fold player with 8+
games is split by import order (replay id); the later half has its name
hidden and is ranked against every account in the data (the test-fold
players' earlier halves plus every other account's games). An account is
the mean of its games' vectors; games are embedded from several windows.
"""
import argparse
import hashlib
import json
import math
import time
from collections import defaultdict
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

WINDOW = 256
FIELDS = ('act', 'grp', 'units', 'order', 'dt', 'mins')
SIZES = {'act': 16, 'grp': 11, 'units': 13, 'order': 1002, 'dt': 33, 'mins': 41}
MIN_TEST_GAMES = 8
EVAL_WINDOWS = 8


# ── data ─────────────────────────────────────────

def fold_of(tag):
    return int(hashlib.md5(tag.lower().encode()).hexdigest(), 16) % 2


def load(data_dir):
    d = Path(data_dir)
    arr = np.load(d / 'arrays.npz')
    data = {k: arr[k] for k in FIELDS}
    offsets = arr['offsets']
    rows = (d / 'games.tsv').read_text().splitlines()[1:]
    games = [dict(zip(('tag', 'replay', 'race', 'team', 'date'), r.split('\t'))) for r in rows]
    for g in games:
        g['replay'] = int(g['replay'])
    return data, offsets, games


def window(data, start, end, length, rng=None, at=None):
    """One window of `length` actions from game [start, end), zero-padded."""
    n = end - start
    if at is None:
        at = 0 if n <= length else int(rng.integers(0, n - length + 1))
    s, e = start + at, min(end, start + at + length)
    out = np.zeros((len(FIELDS), length), np.int64)
    for i, k in enumerate(FIELDS):
        out[i, : e - s] = data[k][s:e]
    return out, e - s


# ── model ────────────────────────────────────────

class Block(nn.Module):
    """Residual dilated convolution: sees `dilation * 4` actions either side."""
    def __init__(self, dim, dilation):
        super().__init__()
        self.conv = nn.Conv1d(dim, dim, 5, padding=2 * dilation, dilation=dilation)
        self.norm = nn.BatchNorm1d(dim)
        self.mix = nn.Conv1d(dim, dim, 1)

    def forward(self, h):
        return h + self.mix(F.gelu(self.norm(self.conv(h))))


class Encoder(nn.Module):
    """Dilated convolutions over the action stream (receptive field ~250
    actions), then mean and max pooling over the window. A transformer was
    tried first: on an 8 GB M2 it needed ~3s a step against ~0.1s here."""
    def __init__(self, dim=128, dilations=(1, 2, 4, 8, 16, 32), out=128):
        super().__init__()
        self.emb = nn.ModuleDict({k: nn.Embedding(SIZES[k], dim) for k in FIELDS})
        self.blocks = nn.Sequential(*[Block(dim, d) for d in dilations])
        self.head = nn.Sequential(nn.Linear(2 * dim, dim), nn.GELU(), nn.Linear(dim, out))

    def forward(self, x, lengths):
        # x: (B, F, L) ints; lengths: (B,)
        h = sum(self.emb[k](x[:, i]) for i, k in enumerate(FIELDS)).transpose(1, 2)  # (B, D, L)
        keep = (torch.arange(x.shape[2], device=x.device)[None] < lengths[:, None]).unsqueeze(1).float()
        h = self.blocks(h * keep) * keep
        mean = h.sum(2) / keep.sum(2).clamp(min=1)
        mx = (h - (1 - keep) * 1e4).amax(2)
        return F.normalize(self.head(torch.cat([mean, mx], 1)), dim=-1)


def supcon(z, labels, temp=0.07):
    sim = z @ z.T / temp
    eye = torch.eye(len(z), device=z.device, dtype=torch.bool)
    sim = sim.masked_fill(eye, -1e9)
    pos = (labels[:, None] == labels[None]) & ~eye
    logp = sim - torch.logsumexp(sim, dim=1, keepdim=True)
    return -(logp * pos).sum(1).div(pos.sum(1).clamp(min=1)).mean()


# ── eval ─────────────────────────────────────────

@torch.no_grad()
def embed_games(model, data, offsets, idx, device, batch=256):
    model.eval()
    out = np.zeros((len(idx), model.head[-1].out_features), np.float32)
    for b in range(0, len(idx), batch):
        xs, ls, owner = [], [], []
        for j, gi in enumerate(idx[b: b + batch]):
            s, e = offsets[gi], offsets[gi + 1]
            n = e - s
            starts = [0] if n <= WINDOW else np.linspace(0, n - WINDOW, EVAL_WINDOWS).astype(int)
            for at in starts:
                x, l = window(data, s, e, WINDOW, at=int(at))
                xs.append(x); ls.append(l); owner.append(j)
        z = model(torch.from_numpy(np.stack(xs)).to(device), torch.tensor(ls, device=device)).cpu().numpy()
        owner = np.array(owner)
        for j in range(len(idx[b: b + batch])):
            v = z[owner == j].mean(0)
            out[b + j] = v / (np.linalg.norm(v) + 1e-9)
    model.train()
    return out


def account(vectors):
    v = vectors.mean(0)
    return v / (np.linalg.norm(v) + 1e-9)


def evaluate(model, data, offsets, games, test_fold, device):
    by_tag = defaultdict(list)
    for i, g in enumerate(games):
        by_tag[g['tag']].append(i)
    z = embed_games(model, data, offsets, np.arange(len(games)), device)

    names, known, queries = [], [], []
    for tag, idx in by_tag.items():
        idx = sorted(idx, key=lambda i: games[i]['replay'])
        if fold_of(tag) == test_fold and len(idx) >= MIN_TEST_GAMES:
            half = len(idx) // 2
            names.append(tag); known.append(account(z[idx[:half]]))
            queries.append((len(names) - 1, idx[half:]))
        else:
            names.append(tag); known.append(account(z[idx]))
    pool = np.stack(known)
    first = top5 = 0
    for owner, idx in queries:
        scores = pool @ account(z[idx])
        rank = int((scores > scores[owner]).sum())
        first += rank == 0
        top5 += rank < 5
    n = len(queries)
    return {'queries': n, 'pool': len(names), 'first': first / n, 'top5': top5 / n}


# ── train ────────────────────────────────────────

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('data'); ap.add_argument('out')
    ap.add_argument('--fold', type=int, default=0, help='fold to TEST on; trains on the other')
    ap.add_argument('--steps', type=int, default=8000)
    ap.add_argument('--players', type=int, default=32)
    ap.add_argument('--games', type=int, default=3)
    ap.add_argument('--lr', type=float, default=3e-4)
    ap.add_argument('--eval-every', type=int, default=2000)
    a = ap.parse_args()

    device = 'mps' if torch.backends.mps.is_available() else 'cuda' if torch.cuda.is_available() else 'cpu'
    out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
    data, offsets, games = load(a.data)
    by_tag = defaultdict(list)
    for i, g in enumerate(games):
        if fold_of(g['tag']) != a.fold:
            by_tag[g['tag']].append(i)
    train_tags = [t for t, idx in by_tag.items() if len(idx) >= 2]
    print(f'{len(games)} games; training on {len(train_tags)} players (fold {1 - a.fold}), device {device}')

    model = Encoder().to(device)
    opt = torch.optim.AdamW(model.parameters(), lr=a.lr, weight_decay=0.05)
    sched = torch.optim.lr_scheduler.LambdaLR(
        opt, lambda s: min(1, s / 500) * 0.5 * (1 + math.cos(math.pi * min(1, s / a.steps))))
    rng = np.random.default_rng(0)
    log, t0, best = [], time.time(), -1
    for step in range(1, a.steps + 1):
        tags = rng.choice(len(train_tags), size=a.players, replace=False)
        xs, ls, labels = [], [], []
        for li, ti in enumerate(tags):
            idx = by_tag[train_tags[ti]]
            for gi in rng.choice(idx, size=a.games, replace=len(idx) < a.games):
                x, l = window(data, offsets[gi], offsets[gi + 1], WINDOW, rng)
                xs.append(x); ls.append(l); labels.append(li)
        z = model(torch.from_numpy(np.stack(xs)).to(device), torch.tensor(ls, device=device))
        loss = supcon(z, torch.tensor(labels, device=device))
        opt.zero_grad(); loss.backward()
        nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        opt.step(); sched.step()
        if step % 100 == 0:
            print(f'step {step} loss {loss.item():.3f} {time.time() - t0:.0f}s', flush=True)
        if step % a.eval_every == 0 or step == a.steps:
            r = evaluate(model, data, offsets, games, a.fold, device)
            r['step'] = step
            log.append(r)
            print(json.dumps(r), flush=True)
            if r['first'] > best:
                best = r['first']
                torch.save(model.state_dict(), out / 'model.pt')
            (out / 'log.json').write_text(json.dumps(log, indent=1))


if __name__ == '__main__':
    main()
