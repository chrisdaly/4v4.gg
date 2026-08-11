const API_BASE = 'https://website-backend.w3champions.com/api';

const W3C_STORAGE = 'https://storage.w3champions.com/prod/integration/icons';
const EAvatarCategory = { RANDOM: 0, HUMAN: 1, ORC: 2, NIGHTELF: 4, UNDEAD: 8, TOTAL: 16, SPECIAL: 32, STARTER: 64 };
const RACE_AVATAR_NAME = { 0: 'RANDOM', 1: 'HUMAN', 2: 'ORC', 4: 'NIGHTELF', 8: 'UNDEAD' };
const COUNTRY_OVERRIDES = { "потоп#2562": "RU" };

const buildProfilePicUrl = (data) => {
  if (!data?.profilePicture?.pictureId) return null;
  const { pictureId, race, isClassic } = data.profilePicture;
  const classicPrefix = isClassic ? 'classic/' : '';
  if (race === EAvatarCategory.SPECIAL || data.specialPictures?.some(d => d.pictureId === pictureId)) {
    return `${W3C_STORAGE}/specialAvatars/SPECIAL_${pictureId}.jpg`;
  }
  if (race === EAvatarCategory.TOTAL) return `${W3C_STORAGE}/raceAvatars/${classicPrefix}TOTAL_${pictureId}.jpg`;
  if (race === EAvatarCategory.STARTER) return `${W3C_STORAGE}/raceAvatars/${classicPrefix}STARTER_${pictureId}.jpg`;
  const raceName = RACE_AVATAR_NAME[race] || 'RANDOM';
  return `${W3C_STORAGE}/raceAvatars/${classicPrefix}${raceName}_${pictureId}.jpg`;
};

export const getPlayerProfile = async (battleTag) => {
  try {
    const res = await fetch(`${API_BASE}/personal-settings/${encodeURIComponent(battleTag)}`);
    const data = await res.json();
    return {
      profilePicUrl: buildProfilePicUrl(data),
      country: COUNTRY_OVERRIDES[battleTag.toLowerCase()] || data.location || null,
    };
  } catch {
    return { profilePicUrl: null, country: null };
  }
};

export const getPlayerGameModeStatsRaw = async (battleTag) => {
  try {
    const res = await fetch(`${API_BASE}/players/${encodeURIComponent(battleTag)}/game-mode-stats?gateway=20&season=25`);
    return res.json();
  } catch {
    return null;
  }
};

export const getOngoingMatches = async () => {
  const res = await fetch(`${API_BASE}/matches/ongoing`);
  return res.json();
};

export const fetchPlayerForm = async (battleTag, season = 25) => {
  try {
    const res = await fetch(
      `${API_BASE}/matches/search?playerId=${encodeURIComponent(battleTag)}&gameMode=4&season=${season}&gateway=20&pageSize=10`
    );
    const data = await res.json();
    if (!data?.matches?.length) return [];
    const bTag = battleTag.toLowerCase();
    return data.matches
      .map(match => {
        for (const team of match.teams) {
          const p = team.players.find(p => p.battleTag.toLowerCase() === bTag);
          if (p) return p.won === true || p.won === 1;
        }
        return null;
      })
      .filter(r => r !== null)
      .slice(0, 5)
      .reverse();
  } catch {
    return [];
  }
};
