FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends curl \
 && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir \
    onnxruntime numpy fastapi uvicorn[standard] umap-learn tokenizers

# The sentence model for chat text, fetched at build rather than committed: it
# is 118MB and has no business in git. multilingual-e5-small, int8 quantised,
# because about a fifth of this chat is not English and an English-only model
# groups by language instead of by subject.
ARG TEXT_MODEL_REPO=Xenova/multilingual-e5-small
RUN mkdir -p data \
 && curl -fsSL -o data/text-model.onnx \
      "https://huggingface.co/${TEXT_MODEL_REPO}/resolve/main/onnx/model_quantized.onnx" \
 && curl -fsSL -o data/text-tokenizer.json \
      "https://huggingface.co/${TEXT_MODEL_REPO}/resolve/main/tokenizer.json" \
 && python -c "import os;assert os.path.getsize('data/text-model.onnx')>50_000_000,'model download truncated'"

COPY embed_server.py .

ENV TEXT_MODEL_PATH=/app/data/text-model.onnx
ENV TEXT_TOKENIZER_PATH=/app/data/text-tokenizer.json

EXPOSE 8081

# An empty host binds every interface, IPv4 and IPv6. Both are needed: Fly's
# health check and public proxy come in over IPv4, and the relay reaches this
# app at 4v4gg-ml.internal, which is IPv6 only. "0.0.0.0" refused the relay;
# "::" on its own answers IPv6 only and fails the health check.
CMD ["uvicorn", "embed_server:app", "--host", "", "--port", "8081"]
