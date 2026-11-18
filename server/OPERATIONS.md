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

  The permanent fix is an app-scoped deploy token in a private file, which `server/deploy.sh` picks up on its own. Create it once in an interactive terminal:

  ```bash
  (umask 077 && fly tokens create deploy -a 4v4gg-chat-relay -x 8760h > ~/.fly/4v4gg-chat-relay.deploy-token)
  ```

  Then deploy with `./server/deploy.sh`. The token expires after a year (`-x 8760h`); rerun the command to renew it. Keep it out of the shell profile: `~/.zshrc` is tracked in the dotfiles repo, and a global `FLY_API_TOKEN` would point every fly command at this one app.
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
- `fly machine exec` cuts a command off after about a minute, so a full-DB scan (table sizes, counts over `replays`) has to run detached and write to a file: `setsid nohup sqlite3 -readonly /data/chat.db "..." > /tmp/out.txt 2>&1 &`, then `cat` it later.

**Alerts** (`src/diskMonitor.js`, checks every 30 min): one alert when free space drops below 25%, another below 15% (where imports pause), re-armed once free space is back above 30%. `/api/health` reports `diskFreePct`.

Alerts go out through `src/alerts.js` on every configured channel:
- GitHub issue labelled `relay-ops` - needs `GITHUB_TOKEN` and `GITHUB_REPO`. An issue filed with your own token does not email you, so this is a record, not a notification.
- Email via Resend - needs `RESEND_API_KEY` and `ALERT_EMAIL_TO` (`fly secrets set`). Off until both are set.

Prove the channels work rather than assuming: `curl -X POST https://4v4gg-chat-relay.fly.dev/api/admin/alert-test -H "X-API-Key: $ADMIN_API_KEY"` sends a test alert and returns `sent` / `not_configured` / `failed` per channel.

## Replay imports

Playstyle and smurf detection run on replays downloaded from W3C. The code is `src/replayImporter.js`.

**W3C's limit** (read from `w3champions/website-backend`, `ReplaysController` and `ReplayRateLimitAttribute`, November 2026):

- Per IP address, over a rolling hour and a rolling 24 hours. There is no reset time.
- Matches up to 7 days old: 50 an hour, 100 a day. Older matches: 30 an hour, 70 a day.
- Every request counts, including one that returns 404.
- Over the limit returns 429. The importer then pauses for an hour.
- W3C can issue an API token (`X-API-Token` header) with its own higher limits. The relay does not have one.

**How the allowance is spent:**

- The background importer runs every 5 minutes and re-reads the last ~200 games every third cycle. It only downloads a game containing a player with fewer than 3 replays (`TARGET_REPLAYS`), taking the game with the most such players first. With everyone covered it downloads nothing.
- It stops once the relay has made 60 downloads of any kind in the last 24 hours (`DRIP_DAILY_BUDGET`). The rest is for on-demand imports, which are not capped. The count is in memory, so a restart forgets it.
- An on-demand import (`POST /api/fingerprints/import`) runs at once as a background job. Only if W3C answers 429 does the player go to the priority queue (`import_priority_queue`), which the importer drains one player per cycle, newest request first. Inspect it with `GET /api/admin/import-queue`.

**Sizing** (1 to 14 November 2026): 174 4v4 games a day, about 257 different players a day, 700 over two weeks. Choosing games by missing players covers all of them on roughly 25 downloads a day, so the allowance is not the constraint for keeping up. It is the constraint for bulk re-downloads such as the sequence backfill.

Imports stop entirely below 15% free disk (see Disk management). `/api/health` reports the free space.

## Replay parser standard

Every parsed game's per-player row in `replay_player_actions` carries `parser_version`: what its action sequence holds. The versions and what each adds are listed on `PARSER_VERSION` in `src/replayParser.js`; bump it whenever the sequence gains information.

| Version | Since | Holds |
|---|---|---|
| NULL | before 2026-11-18 | timing, action type, control group, unit count on selections. No order/ability ids (the parser read the wrong field), no tabbed unit type, no resource sends. Some rows have no sequence at all. |
| 2 (gold) | 2026-11-18 | adds the order/ability id on every order (FourCC like `ohun`, or hex for built-in orders, `d0012` = move), the unit type tabbed to, gold/lumber sent to allies |

**Coverage:** `GET /api/replays/parse-coverage` (admin key) gives rows and games per version, how many players have at least one gold game, and the re-parse job's progress.

**Bringing old games up to standard:**

- Games whose `.w3g` is still on the volume (`/data/replays`, about 7,400 files in November 2026): `POST /api/replays/reparse` (admin key) re-parses them in a worker thread, newest first, pausing 1.5 s between games so the relay stays responsive. No W3C requests. `?limit=N` for a trial. Roughly 3-6 s of CPU per game, so a full run takes most of a day.
- Games whose file is gone: only a re-download brings them up (`POST /api/fingerprints/backfill-sequences`, inside W3C's 70 a day for older games). New games are parsed at the current standard on import.

Not kept, deliberately: actions 0x1A (sent by the client after every selection change) and 0x1B (undocumented, arrives in automatic runs of tens of thousands per game, more than all real actions).

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
