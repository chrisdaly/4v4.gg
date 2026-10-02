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
COPY tokenizer.py .
COPY data/model.onnx data/model.onnx

ENV MODEL_PATH=/app/data/model.onnx
ENV TEXT_MODEL_PATH=/app/data/text-model.onnx
ENV TEXT_TOKENIZER_PATH=/app/data/text-tokenizer.json

EXPOSE 8081

CMD ["uvicorn", "embed_server:app", "--host", "0.0.0.0", "--port", "8081"]
