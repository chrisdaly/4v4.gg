/**
 * Shared formatting utilities
 */

/**
 * Get map image URL from map ID/name
 * Map images stored locally in /public/maps/
 * @param {string} mapId - Map ID like "(4)Ekrezem's Maze"
 * @returns {string|null} URL path to map image
 */
export const getMapImageUrl = (mapId) => {
  if (!mapId) return null;
  // Strip parentheses prefix like "(4)", spaces, and apostrophes
  const cleanName = mapId.replace(/^\(\d\)/, "").replace(/ /g, "").replace(/'/g, "");
  return `/maps/${cleanName}.png`;
};

/**
 * Format duration from seconds to "MM:SS" format
 * @param {number} seconds - Duration in seconds
 * @returns {string|null} Formatted duration string
 */
export const formatDuration = (seconds) => {
  if (!seconds) return null;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

/**
 * Format a date string to relative time (e.g., "5m ago", "2h ago", "3d ago")
 * @param {string} dateString - ISO date string
 * @returns {string|null} Relative time string
 */
export const formatTimeAgo = (dateString) => {
  if (!dateString) return null;
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

/**
 * Calculate elapsed time from start time to now
 * @param {string} startTime - ISO date string of start time
 * @returns {string|null} Elapsed time in "MM:SS" format
 */
export const formatElapsedTime = (startTime) => {
  if (!startTime) return null;
  const start = new Date(startTime);
  const now = new Date();
  const diffMs = now - start;
  const mins = Math.floor(diffMs / 60000);
  const secs = Math.floor((diffMs % 60000) / 1000);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

/**
 * Calculate geometric mean of an array of numbers
 * Used for team MMR calculations
 * @param {number[]} arr - Array of numbers
 * @returns {number} Geometric mean (rounded)
 */
export const geometricMean = (arr) => {
  const filtered = arr.filter((v) => v && v > 0);
  if (filtered.length === 0) return 0;
  const product = filtered.reduce((acc, val) => acc * val, 1);
  return Math.round(Math.pow(product, 1 / filtered.length));
};

/**
 * Calculate standard deviation of an array
 * @param {number[]} arr - Array of numbers
 * @param {number} mean - Pre-calculated mean (optional, will calculate if not provided)
 * @returns {number} Standard deviation (rounded)
 */
export const stdDev = (arr, mean) => {
  const filtered = arr.filter((v) => v && v > 0);
  if (filtered.length === 0) return 0;
  const calculatedMean = mean ?? geometricMean(arr);
  const squaredDiffs = filtered.map((v) => Math.pow(v - calculatedMean, 2));
  return Math.round(Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / filtered.length));
};
