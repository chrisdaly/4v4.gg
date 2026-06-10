export const gameMode = 4;
export const gateway = 20;
export let season = 24; // Fallback if API fails, will be updated dynamically

// Fetch current season from API (dynamic import avoids params <-> api cycle)
export const initSeason = async () => {
  try {
    const { getSeasons } = await import("./api");
    const seasons = await getSeasons();
    if (seasons && seasons.length > 0) {
      season = seasons[0].id;
    }
  } catch (e) {
    console.warn("Failed to fetch current season, using default:", season);
  }
  return season;
};
