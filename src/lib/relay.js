// Single source of truth for the chat relay base URL.
// Every chat-adjacent module used to declare its own copy of this constant.
export const RELAY_URL =
  import.meta.env.VITE_CHAT_RELAY_URL || "https://4v4gg-chat-relay.fly.dev";

/**
 * fetch() against the relay. `path` is appended to RELAY_URL verbatim, so
 * pass it with a leading slash and any query string already encoded.
 */
export function relayFetch(path, init) {
  return fetch(`${RELAY_URL}${path}`, init);
}
