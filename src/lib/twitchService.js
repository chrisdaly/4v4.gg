// Twitch live stream detection service
// Queries the chat relay server, which proxies the Twitch Helix API

const RELAY_URL =
  import.meta.env.VITE_CHAT_RELAY_URL || "https://4v4gg-chat-relay.fly.dev";

const sanitizeTwitchName = (name) =>
  name.replace("https://twitch.tv/", "").toLowerCase();

/**
 * Check which Twitch usernames are currently live
 * @param {string[]} twitchNames - Array of Twitch usernames to check
 * @returns {Promise<Map<string, {viewerCount: number, title: string}>>} Map of live streamers
 */
export const getLiveStreamers = async (twitchNames) => {
  const liveStreamers = new Map();

  if (!twitchNames || twitchNames.length === 0) {
    return liveStreamers;
  }

  try {
    // Twitch API allows up to 100 user_login params
    const sanitizedNames = twitchNames
      .filter(name => name && typeof name === "string")
      .map(sanitizeTwitchName)
      .filter(name => name.length > 0);

    if (sanitizedNames.length === 0) {
      return liveStreamers;
    }

    const logins = sanitizedNames.map(name => encodeURIComponent(name)).join(",");
    const url = `${RELAY_URL}/api/twitch/streams?logins=${logins}`;

    const response = await fetch(url);

    if (!response.ok) {
      console.warn("Twitch relay error:", response.status);
      return liveStreamers;
    }

    const data = await response.json();
    if (data?.streams) {
      data.streams.forEach(stream => {
        liveStreamers.set(stream.user_login.toLowerCase(), {
          viewerCount: stream.viewer_count,
          title: stream.title,
          gameName: stream.game_name,
          startedAt: stream.started_at,
        });
      });
    }
  } catch (error) {
    console.warn("Failed to check Twitch streams:", error.message);
  }

  return liveStreamers;
};

/**
 * Check if a single Twitch username is live
 * @param {string} twitchName - Twitch username to check
 * @returns {Promise<{isLive: boolean, viewerCount?: number, title?: string}>}
 */
export const isStreamerLive = async (twitchName) => {
  const liveStreamers = await getLiveStreamers([twitchName]);
  const streamInfo = liveStreamers.get(sanitizeTwitchName(twitchName));

  if (streamInfo) {
    return { isLive: true, ...streamInfo };
  }

  return { isLive: false };
};
