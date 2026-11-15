# ml/

Two things live here.

## The sidecar (`embed_server.py`, fly app `4v4gg-ml`)

A small FastAPI service the relay calls at `EMBED_URL`:

- `POST /umap`, `POST /umap-transform`: lay player embeddings out in 2D for the
  True Sight map. The embeddings are computed in the relay
  (`src/identityModel.js`); the sidecar only projects them.
- `POST /embed-text`: sentence embeddings for chat lines (multilingual-e5-small),
  used to cut conversations where the subject changes.

Deploy from this directory with `fly deploy`. The text model is downloaded at
image build, so nothing large is committed.

## The identity scorer (`identity/`)

The model behind smurf detection: how it is fitted, how it is tested, and every
measured result. Start with `identity/RESULTS.md`. The fitted model ships as
`server/src/identity-model.json` and is applied in Node, so the relay needs no
Python to score players.

## History

Until November 2026 this folder also held a nanoGPT model trained on replay
action sequences ("player embeddings", 128 dimensions). It was removed: it only
ever read the first ~126 actions of a game, was trained to predict the next
action rather than to tell players apart, its weights were never committed, and
a rebuild in June 2026 wiped every embedding it had produced. A sequence model
is still a reasonable next step; it should be measured with
`scripts/eval-identify.mjs` against the numbers in `identity/RESULTS.md`.
