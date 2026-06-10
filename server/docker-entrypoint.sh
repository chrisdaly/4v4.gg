#!/bin/sh
set -e

# Off-site DB backup: when a replica URL is configured, run the app under
# litestream so every WAL frame is continuously replicated. Without it, run
# the app directly (no backup — dev / local only).
if [ -n "$LITESTREAM_REPLICA_URL" ]; then
  echo "[Litestream] Replicating $DB_PATH -> $LITESTREAM_REPLICA_URL"
  exec litestream replicate -config /etc/litestream.yml -exec "node src/index.js"
else
  echo "[Litestream] LITESTREAM_REPLICA_URL not set — running WITHOUT off-site backup"
  exec node src/index.js
fi
