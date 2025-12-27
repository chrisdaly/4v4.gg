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
    startTime: match.startTime, //.slice(0, 16).replace("T", " "),
    gameLength: `${Math.floor(match.durationInSeconds / 60)}:${(match.durationInSeconds % 60).toString().padStart(2, "0")}`,
    server: match.serverInfo.name?.toUpperCase(),
    location: match.serverInfo.location?.toUpperCase(),
    mapName: match.mapName?.toUpperCase(),
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
    startTime: match.startTime, //.slice(0, 16).replace("T", " "),
    gameLength: `${Math.floor(match.durationInSeconds / 60)}:${(match.durationInSeconds % 60).toString().padStart(2, "0")}`,
    server: match.serverInfo.name?.toUpperCase(),
    location: match.serverInfo.location?.toUpperCase(),
    mapName: match.mapName?.toUpperCase(),
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

export const fetchMMRTimeline = async (battleTag, race) => {
  const url = new URL(`https://website-backend.w3champions.com/api/players/${battleTag.replace("#", "%23")}/mmr-rp-timeline`);
  const params = { gateway, season, race, gameMode: 4 };
  url.search = new URLSearchParams(params).toString();
  try {
    const response = await fetch(url);
    const result = await response.json();
    const mmrTimeline = result.mmrRpAtDates.map((d) => d.mmr);
    return mmrTimeline;
  } catch (error) {
    console.error("Error fetching MMR timeline:", error);
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
