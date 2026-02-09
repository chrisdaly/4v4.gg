/**
 * Shared game data processing utilities
 *
 * Used by both OngoingGame.jsx and FinishedGame.jsx containers to avoid
 * duplicating player data enrichment, team extraction, status computation,
 * and player relation detection logic.
 */

import { getPlayerProfile } from "./api";
import { fetchPlayerSessionData } from "./utils";
import { getLiveStreamers } from "./twitchService";

/**
 * Extract a flat array of players from the teams array in a match object.
 * Works with both ongoing and finished match data formats.
 *
 * Ongoing matches have: { teams: [{ players: [...] }, ...] }
 * Finished matches have: { match: { teams: [...] }, playerScores: [...] }
 *
 * @param {Array} teams - The teams array from a match object
 * @returns {Array<{battleTag: string, name: string, race: number, ...}>} Flat player array
 */
export const extractTeamPlayers = (teams) => {
  if (!teams || !Array.isArray(teams)) return [];
  return teams.flatMap((team) =>
    (team.players || []).map((player) => ({ ...player }))
  );
};

/**
 * Determine the status of a game from its match data.
 *
 * @param {Object} match - Match data (ongoing or finished format)
 * @param {string} [playerBattleTag] - Optional battleTag to determine win/loss relative to a player
 * @returns {"live"|"won"|"lost"|"finished"} The computed game status
 */
export const calculateGameStatus = (match, playerBattleTag) => {
  if (!match) return "finished";

  // Check for live game: has startTime but no endTime and duration is 0
  const inner = match.match || match;
  const hasEndTime = inner.endTime || match.endTime;
  const duration = inner.durationInSeconds ?? match.durationInSeconds ?? -1;

  if (!hasEndTime && duration === 0) {
    return "live";
  }

  // If a player battleTag is provided, determine win/loss from their perspective
  if (playerBattleTag) {
    const battleTagLower = playerBattleTag.toLowerCase();
    const teams = inner.teams || match.teams || [];

    for (const team of teams) {
      for (const player of team.players || []) {
        if (player.battleTag?.toLowerCase() === battleTagLower) {
          const won = player.won === true || player.won === 1;
          return won ? "won" : "lost";
        }
      }
    }
  }

  return "finished";
};

/**
 * Batch fetch profile pics, countries, and Twitch links for a list of players.
 * Consolidates the duplicated enrichment logic from both containers.
 *
 * Each player object must have at minimum: { battleTag, race, location }
 *
 * @param {Array<Object>} players - Array of player data objects with battleTag, race, location
 * @param {Object} [options] - Configuration options
 * @param {boolean} [options.fetchSessions=true] - Whether to fetch session data (form, MMR changes)
 * @param {boolean} [options.fetchTwitchStatus=false] - Whether to check live Twitch status
 * @returns {Promise<{profilePics: Object, countries: Object, sessions: Object, liveStreamers: Object, enrichedPlayers: Array}>}
 */
export const enrichPlayerData = async (players, options = {}) => {
  const { fetchSessions = true, fetchTwitchStatus = false } = options;

  const promises = players.map(async (player) => {
    const { battleTag, race, location } = player;

    // Build parallel fetches for each player
    const fetches = [getPlayerProfile(battleTag)];
    if (fetchSessions) {
      fetches.push(fetchPlayerSessionData(battleTag, race));
    }

    const results = await Promise.all(fetches);
    const profile = results[0];
    const sessionInfo = fetchSessions ? results[1] : null;

    return {
      ...player,
      profilePicUrl: profile.profilePicUrl,
      twitch: profile.twitch,
      // Use profile country if set, otherwise fall back to match location (IP-based)
      country: profile.country || location,
      sessionInfo,
    };
  });

  const enrichedPlayers = await Promise.all(promises);

  // Build lookup maps from enriched data
  const profilePics = {};
  const countries = {};
  const sessions = {};

  for (const player of enrichedPlayers) {
    profilePics[player.battleTag] = player.profilePicUrl;
    countries[player.battleTag] = player.country;
    if (fetchSessions) {
      sessions[player.battleTag] = player.sessionInfo?.session;
    }
  }

  // Optionally check which players with Twitch accounts are actually streaming
  let liveStreamers = {};
  if (fetchTwitchStatus) {
    const twitchUsernames = enrichedPlayers
      .filter((p) => p.twitch)
      .map((p) => p.twitch);

    if (twitchUsernames.length > 0) {
      const streamers = await getLiveStreamers(twitchUsernames);
      for (const player of enrichedPlayers) {
        if (player.twitch) {
          const streamInfo = streamers.get(player.twitch.toLowerCase());
          if (streamInfo) {
            liveStreamers[player.battleTag] = {
              ...streamInfo,
              twitchName: player.twitch,
            };
          }
        }
      }
    }
  }

  return { profilePics, countries, sessions, liveStreamers, enrichedPlayers };
};

/**
 * Determine a player's relationship to a reference player (e.g., streamer or profile owner).
 * Returns "me", "ally", or "opponent" based on team membership.
 *
 * @param {string} playerBattleTag - The battleTag to classify
 * @param {Array<Object>} allPlayers - Flat array of all 8 players (team 1 = indices 0-3, team 2 = indices 4-7)
 * @param {string} referenceBattleTag - The battleTag of the reference player (streamer, profile owner)
 * @returns {"me"|"ally"|"opponent"|null} The player's relation, or null if reference player not found
 */
export const detectPlayerRelation = (
  playerBattleTag,
  allPlayers,
  referenceBattleTag
) => {
  if (!referenceBattleTag || !playerBattleTag || !allPlayers) return null;

  const refLower = referenceBattleTag.toLowerCase();
  const playerLower = playerBattleTag.toLowerCase();

  // "me" check
  if (playerLower === refLower) return "me";

  // Find which team the reference player is on
  const refIndex = allPlayers.findIndex(
    (p) => p.battleTag?.toLowerCase() === refLower
  );
  if (refIndex === -1) return null;

  const refTeam = refIndex < 4 ? 0 : 1;

  // Find which team the target player is on
  const playerIndex = allPlayers.findIndex(
    (p) => p.battleTag?.toLowerCase() === playerLower
  );
  if (playerIndex === -1) return null;

  const playerTeam = playerIndex < 4 ? 0 : 1;

  return playerTeam === refTeam ? "ally" : "opponent";
};
