"""
FastAPI inference sidecar for WC3 player embeddings.

Uses ONNX Runtime (~50MB) instead of PyTorch (~1.7GB) for minimal memory footprint.
Serves POST /embed and POST /embed-batch to compute 128-dim player style embeddings.

Runs on port 8081 alongside Node.js (port 8080) on Fly.io.

Usage:
  uvicorn embed_server:app --host 0.0.0.0 --port 8081
"""

import os
import numpy as np
import onnxruntime as ort
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="WC3 Embed Server", docs_url=None, redoc_url=None)

MODEL_PATH = os.environ.get("MODEL_PATH", "/app/ml/data/model.onnx")
BLOCK_SIZE = 1024
N_EMBD = 128

session = None


@app.on_event("startup")
def load_model():
    global session
    if not os.path.exists(MODEL_PATH):
        print(f"[Embed] WARNING: Model not found at {MODEL_PATH}")
        return
    print(f"[Embed] Loading ONNX model from {MODEL_PATH}")
    session = ort.InferenceSession(MODEL_PATH, providers=["CPUExecutionProvider"])
    print(f"[Embed] Model loaded ({os.path.getsize(MODEL_PATH) // 1024} KB)")


class EmbedRequest(BaseModel):
    tokens: list[int]


class EmbedBatchRequest(BaseModel):
    sequences: list[list[int]]


@app.get("/health")
def health():
    return {"ok": True, "model_loaded": session is not None}


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
