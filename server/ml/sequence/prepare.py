"""
Turn the sequence export (src/exportSequences.js) into arrays for training.

    .venv/bin/python prepare.py ../sequences.tsv.gz data/

One row per action, six small integer fields, all games concatenated:
  act   action type (0x10..0x68, mapped to 1..N)
  grp   control group 0-9 -> 1..10, 0 when the action has none
  units units selected, 1..12 (capped) -> 1..12, 0 when not a selection
  order order/ability id from a vocabulary of the most common ones,
        0 none, 1 rare
  dt    time since the previous action, log2 buckets 0..32
  mins  minute of the game, capped at 40

Games are cut to their first MAX_ACTIONS actions. Writes data/arrays.npz
(the fields plus per-game offsets) and data/games.tsv (one row per game:
battle_tag, replay_id, race, team_id, match_date).
"""
import gzip
import math
import sys
from collections import Counter
from pathlib import Path

import numpy as np

MAX_ACTIONS = 4000
ORDER_VOCAB = 1000
ACT_IDS = [0x10, 0x11, 0x12, 0x13, 0x14, 0x16, 0x17, 0x18, 0x19, 0x1E, 0x61, 0x66, 0x67, 0x68]
ACT_INDEX = {a: i + 1 for i, a in enumerate(ACT_IDS)}


def dt_bucket(ms):
    return min(32, int(math.log2(ms + 1) * 2)) if ms > 0 else 0


def parse_tokens(text):
    """Yield (dt, act, grp, units, order) per action token."""
    for tok in text.split(' ')[:MAX_ACTIONS]:
        parts = tok.split(':')
        dt, act = int(parts[0]), int(parts[1], 16)
        grp = units = 0
        order = None
        for p in parts[2:]:
            if p[0] == 'g':
                grp = int(p[1:]) + 1
            elif p[0] == 'n':
                units = max(1, min(12, int(p[1:])))
            elif p[0] == 'o':
                order = p[1:]
        yield dt, act, grp, units, order


def main(src, out_dir):
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)

    # Pass 1: order-id vocabulary
    orders = Counter()
    with gzip.open(src, 'rt') as f:
        for line in f:
            for tok in line.rstrip('\n').split('\t')[8].split(' ')[:MAX_ACTIONS]:
                i = tok.find(':o')
                if i >= 0:
                    orders[tok[i + 2:].split(':')[0]] += 1
    order_index = {o: i + 2 for i, (o, _) in enumerate(orders.most_common(ORDER_VOCAB))}
    print(f'{len(orders)} distinct orders, keeping {len(order_index)}')

    # Pass 2: arrays
    fields = {k: [] for k in ('act', 'grp', 'units', 'order', 'dt', 'mins')}
    offsets = [0]
    meta = []
    with gzip.open(src, 'rt') as f:
        for n, line in enumerate(f):
            cols = line.rstrip('\n').split('\t')
            replay_id, _player_id, tag, race, team, date = cols[:6]
            act, grp, units, order, dts, mins = [], [], [], [], [], []
            elapsed = 0
            for dt, a, g, u, o in parse_tokens(cols[8]):
                elapsed += dt
                act.append(ACT_INDEX.get(a, 0))
                grp.append(g)
                units.append(u)
                order.append(0 if o is None else order_index.get(o, 1))
                dts.append(dt_bucket(dt))
                mins.append(min(40, elapsed // 60000))
            if len(act) < 50:
                continue
            fields['act'].append(np.array(act, np.uint8))
            fields['grp'].append(np.array(grp, np.uint8))
            fields['units'].append(np.array(units, np.uint8))
            fields['order'].append(np.array(order, np.uint16))
            fields['dt'].append(np.array(dts, np.uint8))
            fields['mins'].append(np.array(mins, np.uint8))
            offsets.append(offsets[-1] + len(act))
            meta.append((tag, replay_id, race, team, date))
            if (n + 1) % 5000 == 0:
                print(f'{n + 1} games, {offsets[-1] / 1e6:.0f}M actions')

    np.savez(out / 'arrays.npz', offsets=np.array(offsets, np.int64),
             **{k: np.concatenate(v) for k, v in fields.items()})
    with open(out / 'games.tsv', 'w') as f:
        f.write('battle_tag\treplay_id\trace\tteam_id\tmatch_date\n')
        for row in meta:
            f.write('\t'.join(row) + '\n')
    with open(out / 'orders.txt', 'w') as f:
        f.write('\n'.join(order_index))
    print(f'{len(meta)} games, {offsets[-1] / 1e6:.0f}M actions -> {out}')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
