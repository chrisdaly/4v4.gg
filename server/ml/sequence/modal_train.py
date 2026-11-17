"""
Run train.py on a Modal GPU instead of the laptop.

One-off setup:
    pip3 install --user modal && python3 -m modal setup
    modal volume create smurf-seq
    modal volume put smurf-seq data/arrays.npz /data/arrays.npz
    modal volume put smurf-seq data/games.tsv /data/games.tsv

Each run (results land in runs/fold<N>-modal/ locally):
    modal run modal_train.py --fold 0
    modal run modal_train.py --fold 1 --steps 20000

An L4 is about $0.80/hour, billed per second; a run is minutes, well inside
the free plan's monthly credit.
"""
import subprocess
from pathlib import Path

import modal

app = modal.App('smurf-seq')
vol = modal.Volume.from_name('smurf-seq', create_if_missing=True)
image = (modal.Image.debian_slim(python_version='3.12')
         .pip_install('numpy', 'torch')
         .add_local_file(Path(__file__).parent / 'train.py', '/root/train.py'))


@app.function(gpu='L4', image=image, volumes={'/vol': vol}, timeout=4 * 3600)
def train(fold: int, steps: int, extra: str):
    out = f'/vol/runs/fold{fold}'
    cmd = ['python', '-u', '/root/train.py', '/vol/data', out,
           '--fold', str(fold), '--steps', str(steps), *extra.split()]
    subprocess.run(cmd, check=True)
    vol.commit()
    return {name: (Path(out) / name).read_bytes() for name in ('log.json', 'model.pt')}


@app.local_entrypoint()
def main(fold: int = 0, steps: int = 8000, extra: str = ''):
    files = train.remote(fold, steps, extra)
    out = Path(__file__).parent / 'runs' / f'fold{fold}-modal'
    out.mkdir(parents=True, exist_ok=True)
    for name, data in files.items():
        (out / name).write_bytes(data)
    print(f'saved to {out}')
    print(files['log.json'].decode())
