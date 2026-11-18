"""
Run eval_verdict.py on Modal.

One-off uploads to the smurf-seq volume (besides /data from modal_train.py):
    modal volume put smurf-seq runs/fold0/model.pt /models/fold0/model.pt
    modal volume put smurf-seq runs/fold1/model.pt /models/fold1/model.pt
    modal volume put smurf-seq ../identity/games.npz /fp/games.npz
    modal volume put smurf-seq confirmed.json /fp/confirmed.json

    modal run --detach modal_eval.py
    modal volume get smurf-seq /runs/eval_verdict.txt runs/eval_verdict.txt

The report is written to the volume, so a detached run survives the laptop
sleeping. GPUs need a card on the Modal account; without one, set MODAL_GPU=
(empty) to run on CPUs, about 1-2 hours.
"""
import os
import subprocess
from pathlib import Path

import modal

HERE = Path(__file__).parent
GPU = os.environ.get('MODAL_GPU', 'T4') or None
app = modal.App('smurf-seq-eval')
vol = modal.Volume.from_name('smurf-seq')
image = (modal.Image.debian_slim(python_version='3.12')
         .pip_install('numpy', 'torch')
         .add_local_file(HERE / 'train.py', '/root/train.py')
         .add_local_file(HERE / 'eval_verdict.py', '/root/eval_verdict.py'))


@app.function(gpu=GPU, cpu=8, memory=8192, image=image, volumes={'/vol': vol}, timeout=4 * 3600)
def run():
    out = Path('/vol/runs/eval_verdict.txt')
    out.parent.mkdir(parents=True, exist_ok=True)
    with out.open('w') as f:
        r = subprocess.run(['python', '-u', '/root/eval_verdict.py', '/vol/data', '/vol/fp/games.npz',
                            '/vol/models', '/vol/fp/confirmed.json'], stdout=f, stderr=subprocess.STDOUT)
    vol.commit()
    return out.read_text() + (f'\n[exit {r.returncode}]' if r.returncode else '')


@app.local_entrypoint()
def main():
    print(run.remote())
