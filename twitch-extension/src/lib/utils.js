import { getPlayerGameModeStatsRaw } from './api.js';

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
  return null;
};

const findPotentialATGroups = (players, teamIndex) => {
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
  return Object.values(mmrGroups).filter(group => group.length >= 2);
};

const confirmATPartners = async (battleTag) => {
  try {
    const stats = await getPlayerGameModeStatsRaw(battleTag);
    if (!stats) return [];
    const atPartners = [];
    for (const stat of stats) {
      if (stat.id && stat.id.includes('_4v4_AT')) {
        const idParts = stat.id.split('@');
        for (const part of idParts) {
          if (part.includes('#') && !part.includes('GM_')) {
            const tag = part.replace(/^\d+_/, '');
            if (tag.toLowerCase() !== battleTag.toLowerCase()) {
              atPartners.push(tag);
            }
          }
        }
      }
    }
    return [...new Set(atPartners)];
  } catch {
    return [];
  }
};

export const detectArrangedTeams = async (players) => {
  const atGroups = {};
  for (const teamIndex of [0, 1]) {
    const potentialGroups = findPotentialATGroups(players, teamIndex);
    for (const group of potentialGroups) {
      const confirmedPartners = await confirmATPartners(group[0]);
      const partnersInMatch = confirmedPartners.filter(partner =>
        group.some(g => g.toLowerCase() === partner.toLowerCase())
      );
      if (partnersInMatch.length > 0) {
        for (const battleTag of group) {
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
};
