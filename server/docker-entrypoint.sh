#!/bin/sh
set -e

# Off-site DB backup: when a Tigris bucket is provisioned (fly storage create
# sets BUCKET_NAME + AWS_* secrets), run the app under litestream so every WAL
# frame is continuously replicated. Without it, run the app directly.
if [ -n "$BUCKET_NAME" ]; then
  echo "[Litestream] Replicating $DB_PATH -> $BUCKET_NAME (endpoint: $AWS_ENDPOINT_URL_S3)"
  exec litestream replicate -config /etc/litestream.yml -exec "node src/index.js"
else
  echo "[Litestream] BUCKET_NAME not set — running WITHOUT off-site backup"
  exec node src/index.js
fi
