// Twitch live stream detection service
// Uses W3Champions' OAuth proxy to get Twitch API access

const W3C_TWITCH_OAUTH_URL = "https://identification.w3champions.com/api/oauth/twitch";
const TWITCH_HELIX_URL = "https://api.twitch.tv/helix/streams";
const TWITCH_CLIENT_ID = "38ac0gifyt5khcuq23h2p8zpcqosbc"; // W3C's client ID

let cachedToken = null;
let tokenExpiry = 0;

/**
 * Get Twitch OAuth token from W3C's proxy
 * @returns {Promise<string|null>} Access token or null if unavailable
 */
export const getTwitchToken = async () => {
  // Return cached token if still valid
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  try {
    const response = await fetch(W3C_TWITCH_OAUTH_URL);
    if (!response.ok) {
      console.warn("W3C Twitch OAuth unavailable:", response.status);
      return null;
    }

    const data = await response.json();
    if (data?.access_token) {
      cachedToken = data.access_token;
      // Cache for slightly less than the actual expiry
      tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
      return cachedToken;
    }
  } catch (error) {
    console.warn("Failed to get Twitch token:", error.message);
  }

  return null;
};

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

  const token = await getTwitchToken();
  if (!token) {
    return liveStreamers;
  }

  try {
    // Twitch API allows up to 100 user_login params
    const sanitizedNames = twitchNames
      .filter(name => name && typeof name === "string")
      .map(name => name.replace("https://twitch.tv/", "").toLowerCase())
      .filter(name => name.length > 0);

    if (sanitizedNames.length === 0) {
      return liveStreamers;
    }

    const params = sanitizedNames.map(name => `user_login=${encodeURIComponent(name)}`).join("&");
    const url = `${TWITCH_HELIX_URL}?first=100&${params}`;

    const response = await fetch(url, {
      headers: {
        "Client-ID": TWITCH_CLIENT_ID,
        "Authorization": `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      console.warn("Twitch API error:", response.status);
      return liveStreamers;
    }

    const data = await response.json();
    if (data?.data) {
      data.data.forEach(stream => {
        liveStreamers.set(stream.user_name.toLowerCase(), {
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
  const streamInfo = liveStreamers.get(twitchName.toLowerCase());

  if (streamInfo) {
    return { isLive: true, ...streamInfo };
  }

  return { isLive: false };
};
