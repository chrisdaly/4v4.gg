/**
 * Enhanced cache with localStorage persistence, request deduplication, and configurable TTLs
 */

// TTL configurations in milliseconds
export const TTL = {
  PERSONAL_SETTINGS: 30 * 60 * 1000, // 30 minutes - profile pics/country rarely change
  GAME_MODE_STATS: 10 * 60 * 1000,   // 10 minutes - stats update after each game
  MMR_TIMELINE: 30 * 60 * 1000,      // 30 minutes - historical data
  MATCHES: 5 * 60 * 1000,            // 5 minutes - recent matches
  LADDER: 5 * 60 * 1000,             // 5 minutes - ladder rankings
  DEFAULT: 5 * 60 * 1000,            // 5 minutes default
};

// In-flight request tracking for deduplication
const inFlightRequests = new Map();

/**
 * Get storage backend (localStorage with sessionStorage fallback)
 */
const getStorage = () => {
  try {
    // Test localStorage availability
    localStorage.setItem('__test__', '1');
    localStorage.removeItem('__test__');
    return localStorage;
  } catch (e) {
    return sessionStorage;
  }
};

const storage = getStorage();

/**
 * Cache object with TTL support
 */
export const cache = {
  get(key) {
    try {
      const item = storage.getItem(`cache:${key}`);
      if (!item) return null;

      const { data, expiry } = JSON.parse(item);
      if (Date.now() > expiry) {
        storage.removeItem(`cache:${key}`);
        return null;
      }
      return data;
    } catch (e) {
      return null;
    }
  },

  set(key, data, ttl = TTL.DEFAULT) {
    try {
      const item = {
        data,
        expiry: Date.now() + ttl,
      };
      storage.setItem(`cache:${key}`, JSON.stringify(item));
    } catch (e) {
      // Storage full - try to clear old entries
      this.cleanup();
      try {
        storage.setItem(`cache:${key}`, JSON.stringify({
          data,
          expiry: Date.now() + ttl,
        }));
      } catch (e2) {
        // Still full, ignore
      }
    }
  },

  remove(key) {
    storage.removeItem(`cache:${key}`);
  },

  clear() {
    // Only clear cache entries (preserve other storage)
    const keysToRemove = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && key.startsWith('cache:')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => storage.removeItem(key));
  },

  /**
   * Remove expired entries to free up space
   */
  cleanup() {
    const now = Date.now();
    const keysToRemove = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && key.startsWith('cache:')) {
        try {
          const item = JSON.parse(storage.getItem(key));
          if (item && item.expiry && now > item.expiry) {
            keysToRemove.push(key);
          }
        } catch (e) {
          keysToRemove.push(key);
        }
      }
    }
    keysToRemove.forEach(key => storage.removeItem(key));
  },
};

/**
 * Create a cache key from parameters
 */
export const createCacheKey = (prefix, params) => {
  return `${prefix}:${JSON.stringify(params)}`;
};

/**
 * Fetch with caching and request deduplication
 * @param {string} url - The URL to fetch
 * @param {object} options - Fetch options
 * @param {string} cacheKey - Cache key for this request
 * @param {number} ttl - Cache TTL in milliseconds
 * @returns {Promise<any>} - Parsed JSON response
 */
export const fetchWithCache = async (url, { cacheKey, ttl = TTL.DEFAULT, skipCache = false } = {}) => {
  const key = cacheKey || url;

  // Check cache first (unless skipping)
  if (!skipCache) {
    const cached = cache.get(key);
    if (cached !== null) {
      return cached;
    }
  }

  // Check for in-flight request (request deduplication)
  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key);
  }

  // Create the fetch promise
  const fetchPromise = (async () => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();

      // Cache the result
      cache.set(key, data, ttl);

      return data;
    } finally {
      // Remove from in-flight tracking
      inFlightRequests.delete(key);
    }
  })();

  // Track this request
  inFlightRequests.set(key, fetchPromise);

  return fetchPromise;
};

/**
 * Batch fetch multiple URLs with deduplication
 * @param {Array<{url: string, cacheKey?: string, ttl?: number}>} requests
 * @returns {Promise<any[]>}
 */
export const fetchBatch = async (requests) => {
  return Promise.all(
    requests.map(({ url, cacheKey, ttl }) =>
      fetchWithCache(url, { cacheKey, ttl }).catch(() => null)
    )
  );
};
