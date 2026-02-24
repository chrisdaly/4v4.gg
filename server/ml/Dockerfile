FROM python:3.11-slim

WORKDIR /app

RUN pip install --no-cache-dir \
    onnxruntime numpy fastapi uvicorn[standard] umap-learn

COPY embed_server.py .
COPY tokenizer.py .
COPY data/model.onnx data/model.onnx

ENV MODEL_PATH=/app/data/model.onnx

EXPOSE 8081

CMD ["uvicorn", "embed_server:app", "--host", "0.0.0.0", "--port", "8081"]
