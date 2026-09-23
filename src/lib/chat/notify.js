/**
 * Desktop notifications for watched-player chat lines.
 *
 * Permission is only ever requested from requestNotifyPermission(), which
 * useWatchList (chatExtras) calls when a player is starred; a decided
 * permission (granted or denied) is never asked for again. Notifications
 * coalesce: at most one per 5s, and the same tag so a new one replaces the
 * last.
 */

const TAG = "4v4-chat";
const THROTTLE_MS = 5000;
const BODY_MAX = 120;

let lastShownAt = 0;

function api() {
  return typeof window !== "undefined" && typeof window.Notification !== "undefined" ? window.Notification : null;
}

export function notifyPermission() {
  const N = api();
  return N ? N.permission : "unsupported";
}

export function canNotify() {
  return notifyPermission() === "granted";
}

export function requestNotifyPermission() {
  const N = api();
  if (!N) return Promise.resolve("unsupported");
  if (N.permission !== "default") return Promise.resolve(N.permission);
  try {
    return Promise.resolve(N.requestPermission()).catch(() => "denied");
  } catch {
    return Promise.resolve("denied");
  }
}

export function truncateBody(text) {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  return t.length > BODY_MAX ? `${t.slice(0, BODY_MAX - 1)}…` : t;
}

/**
 * notifyChat({ name, text, icon, onClick }) -> Notification | null
 */
export function notifyChat({ name, text, icon, onClick }) {
  const N = api();
  if (!N || N.permission !== "granted") return null;
  const now = Date.now();
  if (now - lastShownAt < THROTTLE_MS) return null;
  lastShownAt = now;
  try {
    const n = new N(`${name} in 4v4 chat`, {
      body: truncateBody(text),
      icon: icon || "/favicon.svg",
      tag: TAG,
    });
    n.onclick = () => {
      try {
        window.focus();
      } catch {
        // some browsers refuse programmatic focus; the click still raises the tab
      }
      if (onClick) onClick();
      try {
        n.close();
      } catch {
        // already closed
      }
    };
    return n;
  } catch {
    return null;
  }
}

export function resetNotifyThrottle() {
  lastShownAt = 0;
}
