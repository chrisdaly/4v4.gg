export const gameMode = 4;
export const gateway = 20;
export let season = 23; // Default, will be updated dynamically

// Fetch current season from API
export const initSeason = async () => {
  try {
    const response = await fetch("https://website-backend.w3champions.com/api/ladder/seasons");
    const seasons = await response.json();
    if (seasons && seasons.length > 0) {
      season = seasons[0].id; // First one is the latest
      console.log(`Using W3Champions season: ${season}`);
    }
  } catch (e) {
    console.warn("Failed to fetch current season, using default:", season);
  }
  return season;
};

export const maps = {
  s13TwilightRuinsLV: "Twilight Ruins",
  s13Ferocityv1_2: "Ferocity",
  s13WellspringTemplev1_2: "Wellspring Temple",
  s13EkrezemsMazev1_1: "Ekrezems Maze",
  s13Snowblindv1_2: "Snowblind",
  s13NorthshireLV: "Northshire",
  s13_1OrdealGroundv1_07: "Ordeal Ground",
  s13GoldRush: "Gold Rush",
  s13RoyalGardensv1_2: "Royal Gardens",
  s13NerubianPassage: "Nerubian Passage",
  s13PaintedWorld: "Painted World",
  s13Nightopia: "Nightopia",
  s13_1IndigoKeeperv1_1: "Indigo Keeper",
  s13DeadlockLV: "Deadlock",
};
