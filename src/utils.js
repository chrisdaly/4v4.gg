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

export const getUniqueListBy = (arr, key) => [...new Map(arr.map((item) => [item[key], item])).values()];

export const akaLookup = (aka) => {
  const mapping = {
    完颜啊骨打: "hainiu",
    테드의뜨거운눈빛: "bonggo",
    渺小之牛头人: "tiny tauren",
  };

  const name = mapping[aka] || null;
  return name;
};

export const raceLookup = (aka) => {
  const mapping = {
    "Teo#23801": "hainiu",
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

export const preprocessPlayerScores = (match, playerScores) => {
  console.log("match", match);
  // Map over the match data first
  const playerData = match.teams.flatMap((team, teamIndex) => {
    return team.players.map((playerData) => {
      const playerScore = playerScores.find((score) => score.battleTag === playerData.battleTag);
      const { oldMmr, mmrChange } = calcPlayerMmrAndChange(playerData.battleTag, match);
      return {
        ...playerScore,
        ...playerData,
        oldMmr,
        mmrChange,
      };
    });
  });

  const metaData = {
    startTime: match.startTime.slice(0, 16),
    gameLength: `${Math.floor(match.durationInSeconds / 60)}:${(match.durationInSeconds % 60).toString().padStart(2, "0")}`,
    server: match.serverInfo.name?.toUpperCase(),
    location: match.serverInfo.location?.toUpper(),
    mapName: match.mapName?.toUpperCase(),
  };

  console.log("playerData", playerData, metaData);

  return { playerData, metaData };
};
