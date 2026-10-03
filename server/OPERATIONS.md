# Chat Relay Operations

Runbook for the `4v4gg-chat-relay` Fly app (single machine, region `ewr`, SQLite on a 20GB volume mounted at `/data`).

## Architecture constraints

- **Exactly one machine.** The app uses a `[mounts]` volume; a second machine would get its own empty volume and silently fork the database (split-brain). Never `fly scale count` above 1.
- SQLite runs in WAL mode. The WAL is flushed every 30 minutes (or continuously by Litestream when enabled).
- The server handles SIGTERM: it checkpoints and closes the DB, so normal deploys are safe.

## Deploying

```bash
cd server
fly deploy . --config fly.toml -a 4v4gg-chat-relay --ha=false
```

Four things that have each failed a deploy:

- **Run it from `server/`.** The Dockerfile lives there, not at the repo root. From the root, fly reports `app does not have a Dockerfile or buildpacks configured`.
- **`--ha=false` is not optional.** Without it fly can start a second machine, which forks the database (see Architecture constraints above).
- **`fly auth login` needs a real terminal.** Through a non-interactive shell it fails with `requires an interactive terminal`, but still rewrites `~/.fly/config.yml`, leaving a valid `fm2_` token that flyctl then refuses to read back (`no access token available`). The token works when passed explicitly:

  ```bash
  export FLY_API_TOKEN=$(python3 -c "import re;t=open('$HOME/.fly/config.yml').read();print(re.search(r'^access_token:\s*(.*)$',t,re.M).group(1).strip())")
  ```

  A permanent fix is `fly tokens create deploy` in an interactive terminal, stored in your shell profile.
- **Each `!`-prefixed command in Claude Code is a fresh shell**, so an `export` on one line is gone by the next. Chain everything with `&&`.

`.dockerignore` keeps `data/` (~1.8GB of production SQLite) and `node_modules/` out of the build context. Without it every deploy uploads the live database to the remote builder. If you add a file the Dockerfile needs to `COPY`, check it is not caught by a pattern there - the file deliberately uses no `!` negations.

After deploying, confirm the routes you changed actually shipped, e.g.:

```bash
curl -s "https://4v4gg-chat-relay.fly.dev/api/w3c/twitch?tags=ToD%232792"
```

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

The SignalR JWT expires **7 days after issue** (hardcoded in W3C's identification-service; no refresh endpoint exists).

**August 2026 change:** W3C's chat service now requires a one-time ticket instead of a raw JWT. The relay handles this automatically — on every connect/reconnect it calls `POST https://chat-service.w3champions.com/auth/session` with the stored JWT to get a short-lived ticket (60s TTL, single-use), then passes the ticket as `access_token` to the WebSocket. You never need to update the connection code; just keep the JWT current.

**How to find the JWT:** W3C moved away from localStorage. Use the Network tab in DevTools on w3champions.com → look for requests to `identification-service.w3champions.com` → copy the `Authorization: Bearer eyJ…` value, or look for the JWT in a POST response body after login.

Monitoring: the server checks the token every 30 min and files a GitHub issue (label `relay-ops`) once per token when expiry is <24h away or auth has failed.

Renewal: obtain a fresh `eyJ…` JWT and inject it:

```bash
curl -X POST https://4v4gg-chat-relay.fly.dev/api/admin/token \
  -H "X-API-Key: $ADMIN_API_KEY" -H "Content-Type: application/json" \
  -d '{"token":"<jwt>"}'
```

## Feature switches (fly secrets)

Set with `fly secrets set NAME=value -a 4v4gg-chat-relay`; the machine restarts, which drops the chat relay for a few seconds. Unset with `fly secrets unset NAME`.

| Secret | Default | What it does |
|---|---|---|
| `BLURB_ENABLED` | off | Match blurbs. On, every request to `/api/chat/match-blurb/:id` that has no stored row runs a Sonnet call over a fact sheet, and a second one once post-game reactions land. Off, stored blurbs still serve and nothing reaches the model. Turned off Oct 2026: the chat was asking for one per finished game, 234 a day, about $100 a month, for cards mostly nobody opened. The frontend now only asks from `/match/:id`, so leaving this on costs roughly what people actually read. |
| `BOT_ENABLED` | off | The `!command` bot in the 4v4 room. |
| `ANNOUNCE_ENABLED` | off | GAME START / GAME OVER tickers posted into the room (needs a bot account + JWT). |
| `ANTHROPIC_API_KEY` | unset | Every model call: translations, digests, blurbs, cover art prompts. Unset means those features no-op rather than error. |

Translations are not switchable: the relay translates a message only when it is non-Latin script (`translate.js` `needsTranslation`), which is about 1.1% of traffic, a few cents a month. The English is stored on `messages.translation`, so history and search carry it.

## June 2026 incident (context)

The replay importer filled the volume (16.8GB `chat.db`, mostly `raw_parsed`, plus ~4GB of `.w3g` files) → `SQLITE_IOERR_SHMSIZE` crash-loop on June 3 → the then-current auto-recovery wiped the DB. History before June 3, 2026 was lost from the live DB. All mitigations above came out of this incident.

Salvage state (as of June 10, 2026):

- Orphaned volume `vol_vjyz2zmegwmnz5zv` (unattached, 100% full) holds the pre-incident DB: base file corrupt, but the 154MB WAL has good data through ~May 22. Recoverable by giving the volume a few hundred KB of headroom (extend it, or delete a few re-downloadable `.w3g` files), replaying the WAL, and dumping the valuable tables. **Do not destroy this volume until salvage is complete.**
- A stopped helper machine `vol-inspect2` has the volume mounted at `/mnt` with sqlite3 installed and `/tmp/salvage.sh` staged.
- The live volume has ~6,950 orphaned `.w3g` files (pre-incident, absent from the DB). They can be re-indexed with `scripts/reparse-old-replays.mjs`, then deleted.
