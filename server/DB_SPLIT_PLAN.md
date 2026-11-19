# Plan: stop backups taking the relay down

Draft, 19 Nov 2026. Nothing here is built yet.

## Problem

Litestream's full copy of the database takes the relay down. The relay keeps everything in one 14.8 GB SQLite file, `/data/chat.db`. While Litestream copies it, the disk is saturated. Node's database reads queue behind the copy, health checks fail, and chat, the site's relay data and the smurf pages all stop for 10-15 minutes.

Recent outages:

| When (UTC) | Cause |
|---|---|
| 18 Nov 13:41-13:57 | Full copy after a restart |
| 18 Nov ~14:15-14:25 | CPU credits drained |
| 19 Nov 15:13-15:29 | CPU credits drained by the re-parse; ended by a restart |
| 19 Nov 16:33-16:45 | Full copy, with no restart involved |

## Why a full copy happens (Litestream v0.3.13, from its source)

- **When it copies.** A replica takes a full snapshot when it is in a generation that has none yet, which can happen after a restart. It also takes one when its retention check (hourly) finds the newest snapshot is older than the retention period.
- **Retention.** The default is 24h, and our `litestream.yml` does not set it. So there is roughly one forced full copy a day, at whatever time the previous one happened to fall. That fits 16:33 today.
- **Snapshot interval.** It has no default, so it is off for us.
- **No rate limit.** v0.3.13 has no setting to throttle a snapshot's reads.
- **Per-database settings.** Several databases can sit in one config, each with its own retention and snapshot interval.

## Step 0: move the daily copy to the quiet window (small, now)

This doesn't shorten the outage, but it moves it to 12:00-14:00 UTC, the quietest hours for chat, and makes it predictable.

1. Set `snapshot-interval: 24h` and `retention: 48h` on the replica. Snapshots then follow a 24h clock from the last one, and retention no longer forces extra copies.
2. Shift that clock into the window. With the last snapshot at 16:33, a one-off `snapshot-interval: 20h` lands the next copy around 12:33 the next day. Then set it back to 24h, which takes a second deploy.
3. Document the window in OPERATIONS.md: no deploys during the daily copy.

## Step 1: split the database (the real fix)

Keep chat and site data in `chat.db`, backed up continuously as now. Move the replay analysis data into its own file, `analysis.db`, backed up once a night with a slow copy. A day-old backup is fine for analysis data.

**Tables to move:**
- `replays`, `replay_players`, `replay_chat`, `replay_player_actions` (the action-sequence blobs, most likely the bulk of the 14.8 GB)
- `replay_group_transitions`, `player_fingerprints`, `import_priority_queue`, `player_game_countries`, `player_countries`
- `pair_labels`, `pair_unsure`, `validation_pairs`

**How the code reaches it:** open `chat.db` as now, then `ATTACH '/data/analysis.db' AS analysis`. SQLite resolves an unqualified table name through the attached databases, so existing queries and joins keep working without edits. Writes that span both files are no longer atomic. A quick look found nothing that needs that, but it has to be checked during the work.

**Order of work:**
1. **Measure.** Get the real size of each table from a copy, not from the live disk: a size query reads every page, which would cause the same outage. Run it on a Litestream restore in a Modal container. If the analysis tables turn out not to be the bulk, stop and rethink.
2. **Code.** Attach on open (main thread, workers, the read-only worker connection and `exportSequences.js`). Create the moved tables in `analysis.db`. Add a nightly throttled backup of `analysis.db` to Tigris, at about 5 MB/s, roughly 45 minutes for 13 GB, running off the main thread. Test it all against a local copy.
3. **Migration**, in the quiet window, in a worker:
   - Copy each table in rowid batches with a pause between batches, so the disk is never saturated.
   - Check row counts match, then drop the tables from `chat.db`.
   - `VACUUM` it, which is quick once it's small.
   - `chat.db` then needs a fresh full copy, which takes seconds at its new size.
   - Free space: the volume has 22 GB free and the copy needs about 13 GB, so it fits, but watch the WAL.
4. **Backup config.** `litestream.yml` covers `chat.db` only. Restore instructions in OPERATIONS.md get a second line for `analysis.db`.

**Rollback:** until the tables are dropped from `chat.db`, rolling back means removing the ATTACH. After that, the nightly `analysis.db` backup plus Litestream's `chat.db` restore cover it.

**Expected result:** daily and restart copies of `chat.db` take seconds instead of 10-15 minutes. The large file is read once a night, slowly.

## Also

- **Restarts.** At most one deploy a day, in the quiet window.
- **Heavy jobs.** Batch work runs on Modal, not the relay (see the CPU section in OPERATIONS.md).
- **Upgrade later.** Revisit a bigger machine only if the sequence model's live scoring moves onto the relay.
