"""
FastAPI sidecar for the relay (fly app 4v4gg-ml).

Serves POST /umap and POST /umap-transform: 2D projections of player
embeddings for the True Sight map. The embeddings themselves are computed in
the relay (src/identityModel.js); this only lays them out.
Serves POST /embed-text: sentence embeddings for chat lines.

Usage:
  uvicorn embed_server:app --host 0.0.0.0 --port 8081
"""

import os
import threading
import numpy as np
import onnxruntime as ort
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional

app = FastAPI(title="WC3 Embed Server", docs_url=None, redoc_url=None)

umap_model = None  # cached fitted UMAP model
# Every UMAP call takes this lock. Numba's default threading layer aborts the
# whole process if two threads enter it at once, which is what happened when a
# map request arrived while the start-up warm-up was still compiling.
umap_lock = threading.Lock()

# The sentence model for chat text
TEXT_MODEL_PATH = os.environ.get("TEXT_MODEL_PATH", "/app/data/text-model.onnx")
TEXT_TOKENIZER_PATH = os.environ.get("TEXT_TOKENIZER_PATH", "/app/data/text-tokenizer.json")
TEXT_MAX_TOKENS = 128  # chat lines are short; truncating here keeps inference cheap
text_session = None
text_tokenizer = None


@app.on_event("startup")
def warm_up():
    # Warm up UMAP/numba JIT in a background thread to avoid blocking startup
    def _warmup():
        try:
            import umap
            with umap_lock:
                print("[Embed] Warming up UMAP (numba JIT)...")
                dummy = np.random.rand(20, 10).astype(np.float32)
                umap.UMAP(n_components=2, n_neighbors=5, random_state=42).fit_transform(dummy)
                print("[Embed] UMAP warmup complete")
        except Exception as e:
            print(f"[Embed] UMAP warmup failed (non-fatal): {e}")
    threading.Thread(target=_warmup, daemon=True).start()


class UmapRequest(BaseModel):
    embeddings: list[list[float]]
    n_neighbors: Optional[int] = 15
    min_dist: Optional[float] = 0.1


class UmapTransformRequest(BaseModel):
    embeddings: list[list[float]]


@app.get("/health")
def health():
    return {
        "ok": True,
        "umap_fitted": umap_model is not None,
        "text_model_loaded": text_session is not None,
    }


class TextEmbedRequest(BaseModel):
    texts: list[str]


def _load_text_model():
    """
    Load the sentence model on first use, not at import, so the projection
    endpoints keep serving even when the text model is missing from the image.
    """
    global text_session, text_tokenizer
    if text_session is not None:
        return
    from tokenizers import Tokenizer

    if not os.path.exists(TEXT_MODEL_PATH) or not os.path.exists(TEXT_TOKENIZER_PATH):
        raise HTTPException(503, "Text model not in this image; rebuild with the download step")
    text_tokenizer = Tokenizer.from_file(TEXT_TOKENIZER_PATH)
    text_tokenizer.enable_truncation(max_length=TEXT_MAX_TOKENS)
    text_tokenizer.enable_padding(length=None)
    text_session = ort.InferenceSession(TEXT_MODEL_PATH, providers=["CPUExecutionProvider"])


@app.post("/embed-text")
def embed_text(req: TextEmbedRequest):
    """
    Sentence embeddings for chat lines, used to find where a conversation
    changes subject and which conversations share one.

    multilingual-e5-small, because roughly a fifth of this chat is not English
    and an English-only model clusters by language rather than by subject. The
    "query: " prefix is what e5 was trained with; the same prefix goes on both
    sides because the comparison here is symmetric, line against line.
    """
    if not req.texts:
        return {"vectors": [], "dims": 0}
    _load_text_model()

    encoded = text_tokenizer.encode_batch([f"query: {t or ''}" for t in req.texts])
    ids = np.array([e.ids for e in encoded], dtype=np.int64)
    mask = np.array([e.attention_mask for e in encoded], dtype=np.int64)

    feed = {"input_ids": ids, "attention_mask": mask}
    names = {i.name for i in text_session.get_inputs()}
    if "token_type_ids" in names:
        feed["token_type_ids"] = np.zeros_like(ids)
    hidden = text_session.run(None, feed)[0]

    # Mean-pool over real tokens only, then L2 normalise so cosine is a dot product
    m = mask[:, :, None].astype(np.float32)
    pooled = (hidden * m).sum(axis=1) / np.clip(m.sum(axis=1), 1e-9, None)
    norms = np.clip(np.linalg.norm(pooled, axis=1, keepdims=True), 1e-9, None)
    pooled = pooled / norms

    return {
        "vectors": [[round(float(x), 6) for x in row] for row in pooled],
        "dims": int(pooled.shape[1]),
    }


@app.post("/umap")
async def umap_fit_project(req: UmapRequest):
    """Fit UMAP on full embedding matrix and return 2D projections."""
    global umap_model
    import umap
    import asyncio

    if len(req.embeddings) < 5:
        raise HTTPException(400, "Need at least 5 embeddings for UMAP")

    matrix = np.array(req.embeddings, dtype=np.float32)
    n_neighbors = min(req.n_neighbors, len(req.embeddings) - 1)

    def _fit():
        reducer = umap.UMAP(
            n_components=2,
            n_neighbors=n_neighbors,
            min_dist=req.min_dist,
            metric="cosine",
            random_state=42,
        )
        with umap_lock:
            coords = reducer.fit_transform(matrix)
        return reducer, coords

    # Run in thread pool to avoid blocking health checks
    loop = asyncio.get_event_loop()
    reducer, coords = await loop.run_in_executor(None, _fit)
    umap_model = reducer  # cache for transform calls

    points = [{"x": round(float(c[0]), 4), "y": round(float(c[1]), 4)} for c in coords]
    return {"points": points}


@app.post("/umap-transform")
async def umap_transform(req: UmapTransformRequest):
    """Project new embeddings using the cached fitted UMAP model."""
    import asyncio

    if umap_model is None:
        raise HTTPException(503, "No UMAP model fitted yet — call /umap first")

    if len(req.embeddings) == 0:
        return {"points": []}

    matrix = np.array(req.embeddings, dtype=np.float32)

    def _transform():
        with umap_lock:
            return umap_model.transform(matrix)

    loop = asyncio.get_event_loop()
    coords = await loop.run_in_executor(None, _transform)

    points = [{"x": round(float(c[0]), 4), "y": round(float(c[1]), 4)} for c in coords]
    return {"points": points}
