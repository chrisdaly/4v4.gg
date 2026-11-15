/**
 * Disk space monitor for the volume that holds the database.
 *
 * A full volume is what corrupted the DB in June 2026. The replay importer
 * pauses itself below MIN_FREE_RATIO, but a silent pause just moves the
 * failure somewhere nobody is looking. This alerts once on the way down to
 * each level, and re-arms after space is freed.
 */
import { statfsSync } from 'fs';
import { dirname } from 'path';
import config from './config.js';
import { getSetting, setSetting } from './db.js';
import { MIN_FREE_RATIO } from './replayImporter.js';
import { sendAlert, alertDelivered } from './alerts.js';

const CHECK_INTERVAL_MS = 30 * 60 * 1000;
const WARN_FREE_RATIO = 0.25; // early warning, while imports still run
const CRITICAL_FREE_RATIO = MIN_FREE_RATIO; // imports pause here
const REARM_FREE_RATIO = 0.3; // gap above WARN so a volume hovering at the line does not re-alert
const LEVEL_KEY = 'disk_alert_level'; // '' | 'warn' | 'critical' - the last level alerted on

const GB = 1024 ** 3;

function readDisk() {
  const s = statfsSync(dirname(config.DB_PATH));
  return {
    free: s.bavail / s.blocks,
    freeGb: (s.bavail * s.bsize) / GB,
    totalGb: (s.blocks * s.bsize) / GB,
  };
}

export function getDiskHealth() {
  try {
    const d = readDisk();
    return {
      diskFreePct: Math.round(d.free * 1000) / 10,
      diskFreeGb: Math.round(d.freeGb * 10) / 10,
      diskTotalGb: Math.round(d.totalGb * 10) / 10,
    };
  } catch {
    return {};
  }
}

export function diskLevel(free) {
  if (free < CRITICAL_FREE_RATIO) return 'critical';
  if (free < WARN_FREE_RATIO) return 'warn';
  return null;
}

function alertFor(level, d) {
  const pct = Math.round(d.free * 100);
  const numbers = `${d.freeGb.toFixed(1)} GB free of ${d.totalGb.toFixed(1)} GB (${pct}% free)`;
  if (level === 'critical') {
    return {
      title: `[Relay] Disk ${100 - pct}% full - replay imports are PAUSED`,
      body: [
        `The relay volume has ${numbers}.`,
        '',
        `Below ${Math.round(CRITICAL_FREE_RATIO * 100)}% free the replay importer pauses, so every playstyle import on the site fails until space is freed.`,
        'A completely full volume is what corrupted the database in June 2026.',
        '',
        'Check usage: fly machine exec <machine-id> "df -h /data" --app 4v4gg-chat-relay',
        'See server/OPERATIONS.md, "Disk management".',
      ].join('\n'),
    };
  }
  return {
    title: `[Relay] Disk ${100 - pct}% full - imports pause at ${Math.round((1 - CRITICAL_FREE_RATIO) * 100)}%`,
    body: [
      `The relay volume has ${numbers}.`,
      '',
      `Nothing is broken yet. Replay imports pause once free space drops below ${Math.round(CRITICAL_FREE_RATIO * 100)}%.`,
      '',
      'See server/OPERATIONS.md, "Disk management".',
    ].join('\n'),
  };
}

// `d` is injectable so the level logic can be exercised without filling a disk.
export async function checkDisk(d = readDisk()) {
  const level = diskLevel(d.free);
  const alerted = getSetting(LEVEL_KEY) || '';

  if (!level) {
    if (alerted && d.free >= REARM_FREE_RATIO) setSetting(LEVEL_KEY, '');
    return;
  }
  if (level === alerted) return;
  if (level === 'warn' && alerted === 'critical') {
    // Recovered out of critical but not clear: no new alert, but a later
    // drop back into critical must alert again.
    setSetting(LEVEL_KEY, 'warn');
    return;
  }

  console.error(`[DiskMonitor] ${level}: ${Math.round(d.free * 100)}% free`);
  const outcome = await sendAlert(alertFor(level, d));
  // Only record the level once someone was actually told; otherwise retry
  // on the next check.
  if (alertDelivered(outcome)) setSetting(LEVEL_KEY, level);
  else console.error('[DiskMonitor] Alert not delivered on any channel:', JSON.stringify(outcome));
}

export function startDiskMonitor() {
  setTimeout(() => checkDisk().catch((err) => console.error('[DiskMonitor]', err.message)), 45_000);
  setInterval(() => checkDisk().catch((err) => console.error('[DiskMonitor]', err.message)), CHECK_INTERVAL_MS);
  console.log(`[DiskMonitor] Started (checks every 30 min, warns below ${WARN_FREE_RATIO * 100}% free)`);
}
