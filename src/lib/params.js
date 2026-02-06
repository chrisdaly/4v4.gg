export const gameMode = 4;
export const gateway = 20;
export let season = 24; // Fallback if API fails, will be updated dynamically

// Fetch current season from API
export const initSeason = async () => {
  try {
    const response = await fetch("https://website-backend.w3champions.com/api/ladder/seasons");
    const seasons = await response.json();
    if (seasons && seasons.length > 0) {
      season = seasons[0].id;
    }
  } catch (e) {
    console.warn("Failed to fetch current season, using default:", season);
  }
  return season;
};
