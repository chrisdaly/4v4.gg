"""
FastAPI inference sidecar for WC3 player embeddings.

Uses ONNX Runtime (~50MB) instead of PyTorch (~1.7GB) for minimal memory footprint.
Serves POST /embed and POST /embed-batch to compute 128-dim player style embeddings.
Serves POST /umap and POST /umap-transform for 2D UMAP projections.

Runs on port 8081 alongside Node.js (port 8080) on Fly.io.

Usage:
  uvicorn embed_server:app --host 0.0.0.0 --port 8081
"""

import os
import numpy as np
import onnxruntime as ort
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional

app = FastAPI(title="WC3 Embed Server", docs_url=None, redoc_url=None)

MODEL_PATH = os.environ.get("MODEL_PATH", "/app/ml/data/model.onnx")
BLOCK_SIZE = 128
N_EMBD = 128

session = None
umap_model = None  # cached fitted UMAP model


@app.on_event("startup")
def load_model():
    global session
    if not os.path.exists(MODEL_PATH):
        print(f"[Embed] WARNING: Model not found at {MODEL_PATH}")
        return
    print(f"[Embed] Loading ONNX model from {MODEL_PATH}")
    session = ort.InferenceSession(MODEL_PATH, providers=["CPUExecutionProvider"])
    print(f"[Embed] Model loaded ({os.path.getsize(MODEL_PATH) // 1024} KB)")

    # Warm up UMAP/numba JIT in a background thread to avoid blocking startup
    import threading
    def _warmup():
        try:
            import umap
            print("[Embed] Warming up UMAP (numba JIT)...")
            dummy = np.random.rand(20, 10).astype(np.float32)
            umap.UMAP(n_components=2, n_neighbors=5, random_state=42).fit_transform(dummy)
            print("[Embed] UMAP warmup complete")
        except Exception as e:
            print(f"[Embed] UMAP warmup failed (non-fatal): {e}")
    threading.Thread(target=_warmup, daemon=True).start()


class EmbedRequest(BaseModel):
    tokens: list[int]


class EmbedBatchRequest(BaseModel):
    sequences: list[list[int]]


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
        "model_loaded": session is not None,
        "umap_fitted": umap_model is not None,
    }


@app.post("/embed")
def embed(req: EmbedRequest):
    if session is None:
        raise HTTPException(503, "Model not loaded")
    if len(req.tokens) < 3:
        raise HTTPException(400, "Sequence too short")

    padded = (req.tokens + [0] * (BLOCK_SIZE - len(req.tokens)))[:BLOCK_SIZE]
    input_ids = np.array([padded], dtype=np.int64)
    result = session.run(None, {"input_ids": input_ids})
    return {"embedding": result[0][0].tolist(), "dim": N_EMBD}


@app.post("/embed-batch")
def embed_batch(req: EmbedBatchRequest):
    if session is None:
        raise HTTPException(503, "Model not loaded")
    if len(req.sequences) == 0:
        return {"embeddings": [], "dim": N_EMBD}

    batch = []
    for tokens in req.sequences:
        if len(tokens) < 3:
            continue
        padded = (tokens + [0] * (BLOCK_SIZE - len(tokens)))[:BLOCK_SIZE]
        batch.append(padded)

    if not batch:
        return {"embeddings": [], "dim": N_EMBD}

    input_ids = np.array(batch, dtype=np.int64)
    result = session.run(None, {"input_ids": input_ids})
    return {"embeddings": result[0].tolist(), "dim": N_EMBD}


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
        return umap_model.transform(matrix)

    loop = asyncio.get_event_loop()
    coords = await loop.run_in_executor(None, _transform)

    points = [{"x": round(float(c[0]), 4), "y": round(float(c[1]), 4)} for c in coords]
    return {"points": points}
