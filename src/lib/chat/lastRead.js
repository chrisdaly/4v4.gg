/**
 * Where this browser stopped reading /chat.
 *
 * The "new" marker used to exist only while a tab was open: hide the tab and
 * it remembered, close it and it forgot. Coming back to a busy day meant
 * scrolling and guessing. The newest message seen at the bottom of the
 * stream is written here instead, so the next visit can mark the spot.
 *
 * It is a per-browser convenience, so every read and write is guarded: a
 * private window or blocked site data means no marker, not a broken page.
 */

const KEY = "chat:lastRead";
// A write per message would be a write per second on a busy evening
const WRITE_EVERY_MS = 5000;
// Older than this and "where you left off" is not worth marking: the stream
// has moved on and the marker would sit above everything loaded
export const STALE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

let lastWriteAt = 0;

/** -> { id, at } (at is epoch ms), or null when there is nothing usable. */
export function loadLastRead(now = Date.now()) {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!raw || typeof raw.at !== "number" || Number.isNaN(raw.at)) return null;
    if (now - raw.at > STALE_AFTER_MS) return null;
    return { id: raw.id ?? null, at: raw.at };
  } catch {
    return null;
  }
}

/**
 * Remember a message as read. Throttled, so following a live channel does
 * not write on every line; `force` skips the throttle (leaving the page).
 */
export function saveLastRead(message, { force = false, now = Date.now() } = {}) {
  if (!message?.sentAt) return;
  if (!force && now - lastWriteAt < WRITE_EVERY_MS) return;
  const at = new Date(message.sentAt).getTime();
  if (Number.isNaN(at)) return;
  lastWriteAt = now;
  try {
    localStorage.setItem(KEY, JSON.stringify({ id: message.id ?? null, at }));
  } catch { /* nothing to do about it */ }
}

export function clearLastRead() {
  lastWriteAt = 0;
  try {
    localStorage.removeItem(KEY);
  } catch { /* nothing to do about it */ }
}

/** Test seam: the throttle is module state. */
export function resetLastReadThrottle() {
  lastWriteAt = 0;
}
