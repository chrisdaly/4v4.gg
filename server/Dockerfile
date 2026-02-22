FROM node:20-slim

RUN apt-get update && apt-get install -y python3 python3-pip make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Node.js dependencies
COPY package.json package-lock.json* ./
RUN npm ci --production

# Python dependencies (onnxruntime is ~50MB vs torch ~1.7GB)
RUN pip3 install --break-system-packages --no-cache-dir \
    onnxruntime numpy fastapi uvicorn[standard]

# Copy application code
COPY src/ src/
COPY ml/embed_server.py ml/embed_server.py
COPY ml/tokenizer.py ml/tokenizer.py
COPY ml/tokenizer.js ml/tokenizer.js

# Copy ONNX model
COPY ml/data/model.onnx ml/data/model.onnx

COPY start.sh start.sh

RUN mkdir -p /data

ENV DB_PATH=/data/chat.db
ENV PORT=8080
ENV MODEL_PATH=/app/ml/data/model.onnx
ENV EMBED_URL=http://localhost:8081

EXPOSE 8080
EXPOSE 8081

CMD ["sh", "start.sh"]
