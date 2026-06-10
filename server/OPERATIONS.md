# Chat Relay Operations

Runbook for the `4v4gg-chat-relay` Fly app (single machine, region `ewr`, SQLite on a 20GB volume mounted at `/data`).

## Architecture constraints

- **Exactly one machine.** The app uses a `[mounts]` volume; a second machine would get its own empty volume and silently fork the database (split-brain). Never `fly scale count` above 1.
- SQLite runs in WAL mode. The WAL is flushed every 30 minutes (or continuously by Litestream when enabled).
- The server handles SIGTERM: it checkpoints and closes the DB, so normal deploys are safe.

## Backups (Litestream)

The Docker image bundles [Litestream](https://litestream.io), replicating to a Tigris bucket (Fly object storage). It activates when `BUCKET_NAME` is set, which happens automatically when the bucket is provisioned:

```bash
fly storage create -a 4v4gg-chat-relay -n 4v4gg-chat-db
```

This sets `BUCKET_NAME` + `AWS_*` secrets on the app. Bucket `4v4gg-chat-db` was provisioned June 10, 2026.

Startup logs show either `[Litestream] Replicating ...` or `running WITHOUT off-site backup`.

**Restore after data loss** (run on the machine, app stopped or DB path moved aside):

```bash
litestream restore -config /etc/litestream.yml -o /data/chat.db /data/chat.db
```

Fly's daily volume snapshots (5-day retention) are a secondary fallback only.

## DB corruption — what the server does and what you do

The server **never destroys data automatically**. On startup:

- `SQLITE_IOERR*` (usually disk full): it logs and **exits**. Free disk space (`/data/replays` first), restart. Do **not** delete `chat.db-wal` — it contains committed writes.
- `SQLITE_CORRUPT`: it attempts `sqlite3 .recover`. On success the corrupt original is kept at `chat.db.corrupt` (delete it once verified). On failure it **exits** — restore from Litestream or a volume snapshot; never start from an empty DB.

If the machine crash-loops, that is intentional: a crash-looping server is recoverable, a wiped database is not.

## Disk management

- The replay importer deletes each `.w3g` after a successful import and does not store `raw_parsed`. It pauses itself below 15% free disk (`[Importer] Low disk space`).
- Check usage: `fly ssh console -a 4v4gg-chat-relay -C "df -h /data"`.
- If the DB file itself is bloated from before June 2026, reclaim space with `VACUUM` during a quiet period.

## W3C chat token

The SignalR token expires periodically. Symptom: `[SignalR] Authorization failed — token is invalid` repeating every 60s in logs — **chat messages are silently not captured while this persists.** Fix: obtain a fresh W3C JWT and inject it:

```bash
curl -X POST https://4v4gg-chat-relay.fly.dev/api/admin/token \
  -H "X-API-Key: $ADMIN_API_KEY" -H "Content-Type: application/json" \
  -d '{"token":"<jwt>"}'
```

## June 2026 incident (context)

The replay importer filled the volume (16.8GB `chat.db`, mostly `raw_parsed`, plus ~4GB of `.w3g` files) → `SQLITE_IOERR_SHMSIZE` crash-loop on June 3 → the then-current auto-recovery wiped the DB. History before June 3, 2026 was lost from the live DB. All mitigations above came out of this incident.

Salvage state (as of June 10, 2026):

- Orphaned volume `vol_vjyz2zmegwmnz5zv` (unattached, 100% full) holds the pre-incident DB: base file corrupt, but the 154MB WAL has good data through ~May 22. Recoverable by giving the volume a few hundred KB of headroom (extend it, or delete a few re-downloadable `.w3g` files), replaying the WAL, and dumping the valuable tables. **Do not destroy this volume until salvage is complete.**
- A stopped helper machine `vol-inspect2` has the volume mounted at `/mnt` with sqlite3 installed and `/tmp/salvage.sh` staged.
- The live volume has ~6,950 orphaned `.w3g` files (pre-incident, absent from the DB). They can be re-indexed with `scripts/reparse-old-replays.mjs`, then deleted.
