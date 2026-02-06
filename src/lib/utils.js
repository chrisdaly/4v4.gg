import { gateway, season } from "./params";

export const akaLookup = (aka) => {
  const mapping = {
    完颜啊骨打: "hainiu",
    테드의뜨거운눈빛: "bonggo",
    渺小之牛头人: "tiny tauren",
  };

  const name = mapping[aka] || null;
  return name;
};

export const calcPlayerMmrAndChange = (battleTag, match) => {
  for (const team of match.teams) {
    for (const player of team.players) {
      if (player.battleTag === battleTag) {
        const mmr = player.currentMmr;
        const oldMmr = player.oldMmr;
        let mmrChange = player.mmrGain.toString(); // Convert mmrChange to a string
        if (player.mmrGain > 0) {
          mmrChange = `+${mmrChange}`;
        }
        return { oldMmr, mmrChange };
      }
    }
  }
  return null;
};

export const processMatchData = (match, battleTag) => {
  const battleTagLower = battleTag.toLowerCase();
  let playerData = null;
  let won = false;

  for (const team of match.teams || []) {
    for (const player of team.players || []) {
      if (player.battleTag?.toLowerCase() === battleTagLower) {
        playerData = {
          currentMmr: player.currentMmr,
          oldMmr: player.oldMmr,
          mmrGain: player.mmrGain,
          race: player.race,
        };
        won = player.won === true || player.won === 1;
        break;
      }
    }
    if (playerData) break;
  }

  return {
    id: match.id,
    endTime: match.endTime,
    startTime: match.startTime,
    mapName: match.mapName,
    won,
    playerData,
    teams: match.teams,
  };
};

export const calculatePercentiles = (arr) => {
  const sortedArr = arr.slice().sort((a, b) => a - b);
  const n = sortedArr.length;
  return arr.map((num) => {
    const index = sortedArr.indexOf(num);
    return (index / (n - 1)) * 100;
  });
};

export const preprocessPlayerScores = (match, playerScores) => {
  // Define the key display name mapping
  const keyDisplayNameMapping = {
    heroesKilled: "Heroes Killed",
    expGained: "Experience Gained",
    goldCollected: "Gold Mined",
    unitsProduced: "Units Produced",
    unitsKilled: "Units Killed",
    largestArmy: "Largest Army",
    lumberCollected: "Lumber Harvested",
    goldUpkeepLost: "Gold Lost to Upkeep",
  };

  const dataTypes = ["heroScore", "resourceScore", "unitScore"];

  let stats = {};
  for (const dataType of dataTypes) {
    for (const [statName, value] of Object.entries(playerScores[0][dataType])) {
      const values = playerScores.map((d) => d[dataType][statName]);
      let percentiles = calculatePercentiles(values);

      // If the statName is "goldUpkeepLost", reverse the percentiles
      if (statName === "goldUpkeepLost") {
        percentiles = percentiles.map((d) => 100 - d);
      }
      const displayName = keyDisplayNameMapping[statName] || statName;
      stats[displayName] = { percentiles, values };
    }
  }

  let mvpData = {};
  const mvpKeys = ["Heroes Killed", "Experience Gained", "Gold Mined", "Units Killed", "Largest Army"];
  for (let i = 0; i < 8; i++) {
    const playerName = playerScores[i].battleTag.split("#")[0];
    let summed = 0;
    for (const dataType of mvpKeys) {
      const percentiles = stats[dataType].percentiles;
      summed += percentiles[i];
    }
    mvpData[playerName] = summed;
  }

  const [mvp, maxValue] = Object.entries(mvpData).reduce((acc, [key, value]) => (value > acc[1] ? [key, value] : acc), ["", -Infinity]);

  const playerData = match.teams.flatMap((team, teamIndex) => {
    return team.players.map((playerData) => {
      const playerScore = playerScores.find((score) => score.battleTag === playerData.battleTag);
      const { oldMmr, mmrChange } = calcPlayerMmrAndChange(playerData.battleTag, match);
      const isMvp = playerData.battleTag.split("#")[0] === mvp ? true : false;
      return {
        ...playerScore,
        ...playerData,
        oldMmr,
        mmrChange,
        isMvp,
      };
    });
  });

  const metaData = {
    startTime: match.startTime,
    gameLength: `${Math.floor(match.durationInSeconds / 60)}:${(match.durationInSeconds % 60).toString().padStart(2, "0")}`,
    server: match.serverInfo.name?.toUpperCase(),
    location: match.serverInfo.location?.toUpperCase(),
    mapName: match.mapName?.toUpperCase(),
    mapId: match.mapName,
  };

  return { playerData, metaData, stats };
};

export const processOngoingGameData = (match) => {
  // Process each ongoing game
  const playerData = match.teams.flatMap((team, teamIndex) => {
    return team.players.map((playerData) => {
      return {
        ...playerData,
      };
    });
  });

  const metaData = {
    matchId: match.id,
    startTime: match.startTime,
    gameLength: `${Math.floor(match.durationInSeconds / 60)}:${(match.durationInSeconds % 60).toString().padStart(2, "0")}`,
    server: match.serverInfo.name?.toUpperCase(),
    location: match.serverInfo.location?.toUpperCase(),
    mapName: match.mapName?.toUpperCase(),
    mapId: match.mapName,
  };

  return { playerData, metaData };
};

// Legacy exports - re-export from api.js for backward compatibility
// Components should migrate to using api.js directly
export { getPlayerProfile as getPlayerProfileInfo } from './api';
export { getPlayerProfile } from './api';

// Helper to extract just profile pic URL (for backward compatibility)
export const getPlayerProfilePicUrl = async (battleTag) => {
  const { getPlayerProfile } = await import('./api');
  const profile = await getPlayerProfile(battleTag);
  return profile.profilePicUrl;
};

export const findPlayerInOngoingMatches = (allMatchData, playerBattleTag) => {
  for (const matchData of allMatchData.matches) {
    for (const team of matchData.teams) {
      for (const player of team.players) {
        if (player.battleTag === playerBattleTag) {
          return matchData;
        }
      }
    }
  }
  return null; // Player not found in the match
};

// Detect session boundary - if 1+ hour gap between consecutive games, session ends
const SESSION_GAP_MINUTES = 60;

const detectSessionGames = (matches, battleTag) => {
  if (!matches || matches.length === 0) return [];

  const battleTagLower = battleTag.toLowerCase();
  const sessionGapMs = SESSION_GAP_MINUTES * 60 * 1000; // 1 hour in ms
  const sessionMatches = [];

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];

    // Find player data in this match
    let playerData = null;
    for (const team of match.teams) {
      const player = team.players.find((p) => p.battleTag.toLowerCase() === battleTagLower);
      if (player) {
        playerData = player;
        break;
      }
    }
    if (!playerData) continue;

    // Check time gap from previous game
    if (i > 0) {
      const prevEndTime = new Date(matches[i - 1].endTime);
      const thisEndTime = new Date(match.endTime);
      const gapMs = prevEndTime - thisEndTime; // matches are newest-first

      if (gapMs > sessionGapMs) {
        break; // Found session boundary
      }
    }

    sessionMatches.push({
      won: playerData.won,
      oldMmr: playerData.oldMmr,
      currentMmr: playerData.currentMmr,
      mmrGain: playerData.currentMmr - playerData.oldMmr,
      endTime: match.endTime,
    });
  }

  return sessionMatches;
};

export const fetchRecentForm = async (battleTag) => {
  try {
    const url = `https://website-backend.w3champions.com/api/matches?playerId=${encodeURIComponent(battleTag)}&offset=0&gameMode=4&season=${season}&gateway=${gateway}`;
    const response = await fetch(url);
    if (!response.ok) {
      return [];
    }
    const result = await response.json();
    if (!result.matches || result.matches.length === 0) {
      return [];
    }
    // Get last 5 games and return array of booleans (true = win)
    const battleTagLower = battleTag.toLowerCase();
    const recentGames = result.matches.slice(0, 5).map((match) => {
      for (const team of match.teams) {
        const player = team.players.find((p) => p.battleTag.toLowerCase() === battleTagLower);
        if (player) {
          return player.won;
        }
      }
      return false;
    });
    return recentGames;
  } catch (error) {
    return [];
  }
};

// New combined function - fetches session data + season timeline
// Now uses cached API layer to avoid redundant calls
export const fetchPlayerSessionData = async (battleTag, raceOverride) => {
  try {
    // Import API functions (using dynamic import to avoid circular deps)
    const { getPlayerMatches, getPlayerTimelineMerged, getPlayerStats } = await import('./api');

    const battleTagLower = battleTag.toLowerCase();

    // Fetch recent matches (cached, deduplicated)
    const { matches } = await getPlayerMatches(battleTag, 50);

    if (!matches || matches.length === 0) {
      return { session: null, seasonMmrs: [], currentMmrFallback: null, rank: null, lastPlayed: null };
    }

    // Fetch timeline (cached per-race, then merged)
    let seasonMmrs = await getPlayerTimelineMerged(battleTag);

    // If timeline failed, build from matches data
    if (seasonMmrs.length === 0 && matches.length > 0) {
      seasonMmrs = matches
        .map(match => {
          for (const team of match.teams) {
            const player = team.players.find(p => p.battleTag.toLowerCase() === battleTagLower);
            if (player && player.currentMmr != null) return player.currentMmr;
          }
          return null;
        })
        .filter(mmr => mmr !== null)
        .reverse();
    }

    // Fetch game-mode-stats for rank and fallback MMR (cached)
    const stats = await getPlayerStats(battleTag);
    const currentMmrFallback = seasonMmrs.length === 0 ? stats?.mmr : null;
    const rank = stats?.rank || null;

    // Process session detection
    let session = null;
    const sessionGames = detectSessionGames(matches, battleTag);

    if (sessionGames.length > 0) {
      session = {
        games: sessionGames,
        form: sessionGames.map(g => g.won).reverse(),
        wins: sessionGames.filter(g => g.won).length,
        losses: sessionGames.filter(g => !g.won).length,
        mmrChange: sessionGames[0].currentMmr - sessionGames[sessionGames.length - 1].oldMmr,
        startMmr: sessionGames[sessionGames.length - 1].oldMmr,
        currentMmr: sessionGames[0].currentMmr,
      };
    }

    // Get last played time
    let lastPlayed = null;
    const lastMatch = matches.find(match => {
      for (const team of match.teams) {
        if (team.players.some(p => p.battleTag.toLowerCase() === battleTagLower)) {
          return true;
        }
      }
      return false;
    });

    if (lastMatch) {
      const lastPlayedDate = new Date(lastMatch.endTime);
      const now = new Date();
      const diffMs = now - lastPlayedDate;
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);

      if (diffHours < 1) {
        lastPlayed = "< 1 hour ago";
      } else if (diffHours < 24) {
        lastPlayed = `${diffHours}h ago`;
      } else {
        lastPlayed = `${diffDays}d ago`;
      }
    }

    return { session, seasonMmrs, currentMmrFallback, rank, lastPlayed };
  } catch (error) {
    console.error("Error fetching player session data:", error);
    return { session: null, seasonMmrs: [], currentMmrFallback: null, rank: null, lastPlayed: null };
  }
};

// Now uses cached API layer
export const fetchMMRTimeline = async (battleTag, race) => {
  const { getPlayerTimeline } = await import('./api');
  return getPlayerTimeline(battleTag, race);
};

// Legacy export - re-export from api.js for backward compatibility
export const getPlayerCountry = async (battleTag) => {
  const { getPlayerProfile } = await import('./api');
  const profile = await getPlayerProfile(battleTag);
  return profile.country;
};

export const calculateTeamMMR = (teams) => {
  // Calculate team MMR as the sum of all players' currentMmr in a team
  return teams.reduce((total, team) => {
    return total + team.players.reduce((teamTotal, player) => teamTotal + player.oldMmr, 0);
  }, 0);
};

// Calculate win probability using ELO formula
// Returns probability for team 1 (0-100)
export const calculateWinProbability = (team1AvgMmr, team2AvgMmr) => {
  const expected = 1 / (1 + Math.pow(10, (team2AvgMmr - team1AvgMmr) / 400));
  return Math.round(expected * 100);
};

export function calculateElapsedTime(utcDate) {
  const localDate = new Date(utcDate);
  const now = new Date();
  const diffMs = now - localDate;
  const diffMins = Math.round(((diffMs % 86400000) % 3600000) / 60000); // minutes
  return diffMins;
}


// Find players with matching MMR on the same team (potential AT)
export const findPotentialATGroups = (players, teamIndex) => {
  const teamPlayers = players.filter((_, idx) =>
    teamIndex === 0 ? idx < 4 : idx >= 4
  );

  const mmrGroups = {};
  teamPlayers.forEach(player => {
    const mmr = player.oldMmr;
    if (mmr && mmr > 0) {
      if (!mmrGroups[mmr]) mmrGroups[mmr] = [];
      mmrGroups[mmr].push(player.battleTag);
    }
  });

  // Return groups with 2+ players sharing MMR
  return Object.values(mmrGroups).filter(group => group.length >= 2);
};

// Confirm AT status by checking game-mode-stats API
export const confirmATPartners = async (battleTag) => {
  try {
    const url = `https://website-backend.w3champions.com/api/players/${encodeURIComponent(battleTag)}/game-mode-stats?gateway=${gateway}&season=${season}`;
    const response = await fetch(url);
    if (!response.ok) return [];

    const stats = await response.json();
    const atPartners = [];

    for (const stat of stats) {
      // Look for 4v4 AT entries (id contains _4v4_AT)
      if (stat.id && stat.id.includes('_4v4_AT')) {
        // ID format: "23_Compre#2362@20_fuetti#2605@20_GM_4v4_AT"
        // Split by @ and extract battleTags
        const idParts = stat.id.split('@');
        for (const part of idParts) {
          if (part.includes('#') && !part.includes('GM_')) {
            // Remove leading number_ prefix (season or gateway)
            const tag = part.replace(/^\d+_/, '');
            if (tag.toLowerCase() !== battleTag.toLowerCase()) {
              atPartners.push(tag);
            }
          }
        }
      }
    }

    return [...new Set(atPartners)]; // Remove duplicates
  } catch (error) {
    console.error('Error fetching AT partners:', error);
    return [];
  }
};

// Detect AT groups in a match - returns map of battleTag -> [partnerBattleTags]
export const detectArrangedTeams = async (players) => {
  const atGroups = {};

  // Check both teams for potential AT (matching MMR)
  for (const teamIndex of [0, 1]) {
    const potentialGroups = findPotentialATGroups(players, teamIndex);

    for (const group of potentialGroups) {
      // Only need to check one player from the group
      const confirmedPartners = await confirmATPartners(group[0]);

      // Check if any confirmed partners are in this match group
      const partnersInMatch = confirmedPartners.filter(partner =>
        group.some(g => g.toLowerCase() === partner.toLowerCase())
      );

      // If we found AT partners in this match, store them for each player
      if (partnersInMatch.length > 0) {
        for (const battleTag of group) {
          // Store OTHER players in the group as partners (not self)
          const otherPartners = group
            .filter(g => g.toLowerCase() !== battleTag.toLowerCase())
            .map(p => p.toLowerCase());
          if (otherPartners.length > 0) {
            atGroups[battleTag.toLowerCase()] = otherPartners;
          }
        }
      }
    }
  }

  return atGroups;
}
