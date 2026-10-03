export const gameMode = 4;
export const gateway = 20;

/**
 * W3C game mode ids, as served by /api/ladder/active-modes.
 *
 * ARRANGED_FOUR is not in active-modes but is what game-mode-stats and
 * /ladder return for 4v4 arranged teams: one row per AT group, with the
 * group's own MMR and rank.
 */
export const GAME_MODE = {
  ONE_V_ONE: 1,
  TWO_V_TWO: 2,
  FOUR_V_FOUR: 4,
  FFA: 5,
  ARRANGED_FOUR: 8,
};

export const GAME_MODE_LABEL = {
  [GAME_MODE.ONE_V_ONE]: "1v1",
  [GAME_MODE.TWO_V_TWO]: "2v2",
  [GAME_MODE.FOUR_V_FOUR]: "4v4",
  [GAME_MODE.FFA]: "FFA",
  [GAME_MODE.ARRANGED_FOUR]: "4v4 AT",
};
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
