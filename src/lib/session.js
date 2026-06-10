/**
 * Shared session-detection helpers for player match history.
 * Matches arrive newest-first from the API.
 */

const SESSION_GAP_MINUTES = 60;

// Idle time between two consecutive games (newer game's start minus older game's end)
export const matchIdleGapMs = (newerMatch, olderMatch) =>
  new Date(newerMatch.startTime) - new Date(olderMatch.endTime);

const findPlayerInMatch = (match, battleTagLower) => {
  for (const team of match.teams) {
    const player = team.players.find((p) => p.battleTag.toLowerCase() === battleTagLower);
    if (player) return player;
  }
  return null;
};

// Keep only matches where the player played the given race
export const filterMatchesByRace = (matches, battleTag, race) => {
  if (race == null || !matches) return matches;
  const battleTagLower = battleTag.toLowerCase();
  return matches.filter((match) => {
    const player = findPlayerInMatch(match, battleTagLower);
    return player != null && player.race === race;
  });
};

// Detect session boundary - if gapMinutes+ idle time between consecutive games, session ends
export const detectSessionGames = (matches, battleTag, gapMinutes = SESSION_GAP_MINUTES) => {
  if (!matches || matches.length === 0) return [];

  const battleTagLower = battleTag.toLowerCase();
  const sessionGapMs = gapMinutes * 60 * 1000;
  const sessionMatches = [];

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];

    const playerData = findPlayerInMatch(match, battleTagLower);
    if (!playerData) continue;

    if (i > 0) {
      const gapMs = matchIdleGapMs(matches[i - 1], match);
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
