/**
 * One message shape for the chat feed.
 *
 * The relay speaks two dialects:
 *   - SQLite rows (REST /api/chat/messages, /api/chat/search, the SSE
 *     `history` event): battle_tag, user_name, clan_tag, sent_at,
 *     received_at, deleted
 *   - live SSE `message` events (server/src/signalr.js normalizeMessage):
 *     battleTag, userName, clanTag, sentAt (no receivedAt)
 *
 * Everything downstream of useChatStream consumes only the normalized form:
 *   { id, battleTag, userName, clanTag, text, sentAt, receivedAt, deleted, kind }
 *
 * `kind` is one of: message | system | bot | translation. Bot responses and
 * translations arrive on their own SSE events today and are kept in their
 * own slices, so the normalizer only ever emits `message` or `system`; the
 * other two are reserved for when those slices fold into the feed.
 */

const SYSTEM_TAG = "system";

function pick(raw, snake, camel) {
  const v = raw[snake];
  if (v !== undefined && v !== null) return v;
  const c = raw[camel];
  return c === undefined ? null : c;
}

export function normalizeMessage(raw) {
  if (!raw) return null;
  const battleTag = pick(raw, "battle_tag", "battleTag") || "";
  const explicitKind = raw.kind;
  const kind =
    explicitKind === "bot" || explicitKind === "translation"
      ? explicitKind
      : !battleTag || battleTag === SYSTEM_TAG
        ? "system"
        : "message";
  return {
    id: raw.id ?? null,
    battleTag,
    userName: pick(raw, "user_name", "userName") || "",
    clanTag: pick(raw, "clan_tag", "clanTag") || "",
    text: raw.text ?? raw.message ?? "",
    sentAt: pick(raw, "sent_at", "sentAt"),
    // SQLite datetime string when the row came from the DB; live SSE
    // messages have not been stamped yet. Kept verbatim: it is the paging
    // cursor for /api/chat/messages?before=
    receivedAt: pick(raw, "received_at", "receivedAt"),
    deleted: raw.deleted === 1 || raw.deleted === true,
    kind,
  };
}

export function normalizeMessages(rows) {
  if (!Array.isArray(rows)) return [];
  const out = [];
  for (const row of rows) {
    const m = normalizeMessage(row);
    if (m) out.push(m);
  }
  return out;
}
