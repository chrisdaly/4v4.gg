import { gateway, season } from "./params";

export const standardDeviation = (array) => {
  const n = array.length;
  const mean = array.reduce((a, b) => a + b) / n;
  const dev = Math.sqrt(array.map((x) => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / n);
  return Math.round(dev);
};

export const arithmeticMean = (x) => {
  const product = x.reduce((p, c) => p * c, 1);
  const exponent = 1 / x.length;
  return Math.round(Math.pow(product, exponent));
};

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
  // console.log(arr);
  // Sort the array in ascending order
  const sortedArr = arr.slice().sort((a, b) => a - b);
  const n = sortedArr.length;

  // Calculate percentile for each element
  const percentiles = arr.map((num) => {
    // Find the index of the number in the sorted array
    const index = sortedArr.indexOf(num);

    // Calculate percentile using index and array length
    const percentile = (index / (n - 1)) * 100;
    return percentile;
  });
  return percentiles;
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

export const getPlayerProfilePicUrl = async (battleTag) => {
  try {
    const response = await fetch(`https://website-backend.w3champions.com/api/personal-settings/${encodeURIComponent(battleTag)}`);
    const profileData = await response.json();
    const { profilePicture } = profileData;
    if (!profilePicture || !profilePicture.pictureId) {
      return null;
    }
    const { pictureId, race } = profilePicture;
    const raceMapping = { 64: "starter", 16: "total", 8: "undead", 0: "random", 4: "nightelf", 2: "orc", 1: "human" };
    const { specialPictures } = profileData;
    if (specialPictures.map((d) => d.pictureId).includes(pictureId)) {
      return `https://w3champions.wc3.tools/prod/integration/icons/specialAvatars/SPECIAL_${pictureId}.jpg`;
    } else {
      return `https://w3champions.wc3.tools/prod/integration/icons/raceAvatars/classic/${raceMapping[race].toUpperCase()}_${pictureId}.jpg`;
    }
  } catch (error) {
    console.error("Error fetching player profile picture:", error);
    return null;
  }
};

// Get player profile info including pic URL and Twitch
export const getPlayerProfileInfo = async (battleTag) => {
  try {
    const response = await fetch(`https://website-backend.w3champions.com/api/personal-settings/${encodeURIComponent(battleTag)}`);
    const profileData = await response.json();

    // Get profile pic URL
    let profilePicUrl = null;
    const { profilePicture, specialPictures, twitch } = profileData;
    if (profilePicture && profilePicture.pictureId) {
      const { pictureId, race } = profilePicture;
      const raceMapping = { 64: "starter", 16: "total", 8: "undead", 0: "random", 4: "nightelf", 2: "orc", 1: "human" };
      if (specialPictures.map((d) => d.pictureId).includes(pictureId)) {
        profilePicUrl = `https://w3champions.wc3.tools/prod/integration/icons/specialAvatars/SPECIAL_${pictureId}.jpg`;
      } else {
        profilePicUrl = `https://w3champions.wc3.tools/prod/integration/icons/raceAvatars/classic/${raceMapping[race].toUpperCase()}_${pictureId}.jpg`;
      }
    }

    return {
      profilePicUrl,
      twitch: twitch || null,
    };
  } catch (error) {
    console.error("Error fetching player profile info:", error);
    return { profilePicUrl: null, twitch: null };
  }
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
export const fetchPlayerSessionData = async (battleTag, raceOverride) => {
  try {
    // Fetch recent matches first (we'll use this to get race + session data)
    const matchesUrl = `https://website-backend.w3champions.com/api/matches?playerId=${encodeURIComponent(battleTag)}&offset=0&gameMode=4&season=${season}&gateway=${gateway}&pageSize=50`;
    const matchesResponse = await fetch(matchesUrl);

    if (!matchesResponse.ok) {
      console.error(`Matches API failed for ${battleTag}`);
      return { session: null, seasonMmrs: [] };
    }

    const matchesData = await matchesResponse.json();
    const battleTagLower = battleTag.toLowerCase();

    // Find player's most-played race from matches
    let playerRace = raceOverride || 0;
    if (matchesData.matches && matchesData.matches.length > 0) {
      const raceCounts = {};
      for (const match of matchesData.matches) {
        for (const team of match.teams) {
          const player = team.players.find(p => p.battleTag.toLowerCase() === battleTagLower);
          if (player && player.race != null) {
            raceCounts[player.race] = (raceCounts[player.race] || 0) + 1;
          }
        }
      }
      // Find most common race
      const mostPlayedRace = Object.entries(raceCounts)
        .sort((a, b) => b[1] - a[1])[0];
      if (mostPlayedRace) {
        playerRace = parseInt(mostPlayedRace[0]);
      }
      console.log(`${battleTag} race counts:`, raceCounts, `-> using race ${playerRace}`);
    }

    // Fetch timeline for ALL races in parallel and merge (4v4 MMR is unified but data may be stored per-race)
    const races = [0, 1, 2, 4, 8]; // Random, Human, Orc, NE, UD
    let allTimelinePoints = [];

    const timelinePromises = races.map(async (race) => {
      try {
        const timelineUrl = `https://website-backend.w3champions.com/api/players/${encodeURIComponent(battleTag)}/mmr-rp-timeline?gateway=${gateway}&season=${season}&race=${race}&gameMode=4`;
        const response = await fetch(timelineUrl);
        if (response.ok) {
          const data = await response.json();
          if (data.mmrRpAtDates && data.mmrRpAtDates.length > 0) {
            return data.mmrRpAtDates;
          }
        }
      } catch (e) {}
      return [];
    });

    const results = await Promise.all(timelinePromises);
    allTimelinePoints = results.flat();

    // Sort by date and dedupe (same date = same game)
    let seasonMmrs = [];
    let lastTimelineDate = null;

    if (allTimelinePoints.length > 0) {
      const uniqueByDate = {};
      for (const point of allTimelinePoints) {
        uniqueByDate[point.date] = point;
      }
      const sorted = Object.values(uniqueByDate).sort((a, b) => new Date(a.date) - new Date(b.date));
      seasonMmrs = sorted.map(d => d.mmr);
      lastTimelineDate = sorted[sorted.length - 1].date;
      console.log(`Timeline for ${battleTag}: ${seasonMmrs.length} points merged from all races`);
    } else {
      console.log(`No timeline data for ${battleTag} from any race`);
    }

    // If timeline failed, build from matches data
    if (seasonMmrs.length === 0 && matchesData.matches) {
      // Debug: log first match's battleTags to check format
      if (matchesData.matches.length > 0) {
        const firstMatch = matchesData.matches[0];
        const allTags = firstMatch.teams.flatMap(t => t.players.map(p => p.battleTag));
        console.log(`Debug ${battleTag}: Looking for "${battleTagLower}" in tags:`, allTags);
      }

      seasonMmrs = matchesData.matches
        .map(match => {
          for (const team of match.teams) {
            const player = team.players.find(p => p.battleTag.toLowerCase() === battleTagLower);
            // Handle null/undefined MMR - some matches don't have MMR data
            if (player && player.currentMmr != null) return player.currentMmr;
          }
          return null;
        })
        .filter(mmr => mmr !== null)
        .reverse();
      console.log(`Built timeline from matches for ${battleTag}:`, seasonMmrs.length, "games");
    }

    // Fetch game-mode-stats for rank and fallback MMR
    let currentMmrFallback = null;
    let rank = null;
    try {
      const statsUrl = `https://website-backend.w3champions.com/api/players/${encodeURIComponent(battleTag)}/game-mode-stats?gateway=${gateway}&season=${season}`;
      const statsResponse = await fetch(statsUrl);
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        const fourVsFourStats = statsData.find(s => s.gameMode === 4);
        if (fourVsFourStats) {
          rank = fourVsFourStats.rank;
          if (seasonMmrs.length === 0 && fourVsFourStats.mmr) {
            currentMmrFallback = fourVsFourStats.mmr;
            console.log(`Got MMR from game-mode-stats for ${battleTag}:`, currentMmrFallback);
          }
        }
      }
    } catch (e) {
      console.error(`Failed to fetch game-mode-stats for ${battleTag}:`, e);
    }

    console.log(`Season MMRs for ${battleTag}:`, seasonMmrs.length, "data points");

    // Process session detection (reusing matchesData from above)
    let session = null;
    if (matchesData.matches && matchesData.matches.length > 0) {
      console.log(`Matches for ${battleTag}:`, matchesData.matches.length);

      // Detect current session
      const sessionGames = detectSessionGames(matchesData.matches, battleTag);
      console.log(`Session games for ${battleTag}:`, sessionGames.length);

      // Calculate session stats
      if (sessionGames.length > 0) {
        session = {
          games: sessionGames,
          form: sessionGames.map(g => g.won).reverse(), // Reverse so oldest is first (left), newest is last (right)
          wins: sessionGames.filter(g => g.won).length,
          losses: sessionGames.filter(g => !g.won).length,
          mmrChange: sessionGames[0].currentMmr - sessionGames[sessionGames.length - 1].oldMmr,
          startMmr: sessionGames[sessionGames.length - 1].oldMmr,
          currentMmr: sessionGames[0].currentMmr,
        };
      }
    }

    // Get last played time from most recent match the player was actually in
    let lastPlayed = null;
    let lastPlayedDate = null;

    if (matchesData.matches && matchesData.matches.length > 0) {
      // Find first match where player actually participated
      const lastMatch = matchesData.matches.find(match => {
        for (const team of match.teams) {
          if (team.players.some(p => p.battleTag.toLowerCase() === battleTagLower)) {
            return true;
          }
        }
        return false;
      });

      if (lastMatch) {
        lastPlayedDate = new Date(lastMatch.endTime);
      }
    }

    // Fallback to timeline date if no match found
    if (!lastPlayedDate && lastTimelineDate) {
      lastPlayedDate = new Date(lastTimelineDate);
    }

    if (lastPlayedDate) {
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

export const fetchMMRTimeline = async (battleTag, race) => {
  const url = new URL(`https://website-backend.w3champions.com/api/players/${battleTag.replace("#", "%23")}/mmr-rp-timeline`);
  const params = { gateway, season, race, gameMode: 4 };
  url.search = new URLSearchParams(params).toString();
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return [];
    }
    const result = await response.json();
    if (!result.mmrRpAtDates || result.mmrRpAtDates.length === 0) {
      return [];
    }
    return result.mmrRpAtDates.map((d) => d.mmr);
  } catch (error) {
    return [];
  }
};

export const getPlayerCountry = async (battleTag) => {
  try {
    const response = await fetch(`https://website-backend.w3champions.com/api/personal-settings/${encodeURIComponent(battleTag)}`);
    const profileData = await response.json();
    return profileData.location || null;
  } catch (error) {
    console.error("Error fetching player country:", error);
    return null;
  }
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

export function convertToLocalTime(utcDate) {
  const localDate = new Date(utcDate);
  return localDate.toLocaleString();
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
      for (const battleTag of group) {
        const partnersInMatch = confirmedPartners.filter(partner =>
          group.some(g => g.toLowerCase() === partner.toLowerCase())
        );
        if (partnersInMatch.length > 0) {
          atGroups[battleTag.toLowerCase()] = partnersInMatch.map(p => p.toLowerCase());
        }
      }
    }
  }

  return atGroups;
}
