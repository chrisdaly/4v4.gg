#!/bin/sh
# Start both Node.js server and Python embed sidecar

# Start Python embed server in background (if model exists)
if [ -f "/app/ml/data/model.onnx" ]; then
  echo "[Start] Launching embed sidecar on port 8081..."
  python3 -m uvicorn ml.embed_server:app --host 0.0.0.0 --port 8081 &
  EMBED_PID=$!
else
  echo "[Start] No model found, skipping embed sidecar"
fi

# Start Node.js server (foreground)
echo "[Start] Launching Node.js server on port ${PORT:-8080}..."
exec node src/index.js
