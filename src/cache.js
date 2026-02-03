/**
 * Simple sessionStorage cache with TTL
 */

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

export const cache = {
  get(key) {
    try {
      const item = sessionStorage.getItem(key);
      if (!item) return null;

      const { data, expiry } = JSON.parse(item);
      if (Date.now() > expiry) {
        sessionStorage.removeItem(key);
        return null;
      }
      return data;
    } catch (e) {
      return null;
    }
  },

  set(key, data, ttl = DEFAULT_TTL) {
    try {
      const item = {
        data,
        expiry: Date.now() + ttl,
      };
      sessionStorage.setItem(key, JSON.stringify(item));
    } catch (e) {
      // Storage full or unavailable, ignore
    }
  },

  remove(key) {
    sessionStorage.removeItem(key);
  },

  clear() {
    sessionStorage.clear();
  },
};

/**
 * Create a cache key from parameters
 */
export const createCacheKey = (prefix, params) => {
  return `${prefix}:${JSON.stringify(params)}`;
};
