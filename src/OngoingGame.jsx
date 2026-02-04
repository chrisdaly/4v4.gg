import React, { useState, useEffect } from "react";
import Game from "./Game.jsx";
import { processOngoingGameData, fetchPlayerSessionData } from "./utils.jsx";
import { getPlayerProfile } from "./api";
import { cache } from "./cache";
import { getLiveStreamers } from "./twitchService";

// Get cached player data for a match
const getCachedMatchPlayerData = (matchId) => {
  return cache.get(`matchPlayers:${matchId}`);
};

const OnGoingGame = ({ ongoingGameData, compact, streamerTag }) => {
  const matchId = ongoingGameData?.id;
  const cachedData = matchId ? getCachedMatchPlayerData(matchId) : null;

  // Initialize from cache for instant display
  const [playerData, setPlayerData] = useState(cachedData?.playerData || null);
  const [metaData, setMetaData] = useState(cachedData?.metaData || null);
  const [profilePics, setProfilePics] = useState(cachedData?.profilePics || null);
  const [playerCountries, setPlayerCountries] = useState(cachedData?.countries || {});
  const [sessionData, setSessionData] = useState(cachedData?.sessions || {});
  const [liveStreamers, setLiveStreamers] = useState({});
  const [isLoading, setIsLoading] = useState(!cachedData);

  useEffect(() => {
    const processedData = preprocessMatchData(ongoingGameData);
    const { playerData: newPlayerData, metaData: newMetaData } = processedData;
    setPlayerData(newPlayerData);
    setMetaData(newMetaData);

    // If we had cached data, still refresh in background but don't show loading
    if (!cachedData) {
      setIsLoading(true);
    }
    fetchRemainingPlayerData(newPlayerData);
  }, []);

  const preprocessMatchData = (ongoingGameData) => {
    if (!ongoingGameData) {
      throw new Error("Invalid match data format");
    }
    return processOngoingGameData(ongoingGameData);
  };

  const fetchRemainingPlayerData = async (processedData) => {
    try {
      const promises = processedData.map(async (playerData) => {
        const { battleTag, race } = playerData;
        // Use consolidated profile fetch (single API call for pic, twitch, country)
        const [profile, sessionInfo] = await Promise.all([
          getPlayerProfile(battleTag),
          fetchPlayerSessionData(battleTag, race),
        ]);
        return {
          ...playerData,
          profilePicUrl: profile.profilePicUrl,
          twitch: profile.twitch,
          country: profile.country,
          sessionInfo
        };
      });
      const updatedData = await Promise.all(promises);

      const newProfilePics = updatedData.reduce((acc, curr) => {
        acc[curr.battleTag] = curr.profilePicUrl;
        return acc;
      }, {});
      const newCountries = updatedData.reduce((acc, curr) => {
        acc[curr.battleTag] = curr.country;
        return acc;
      }, {});
      const newSessions = updatedData.reduce((acc, curr) => {
        acc[curr.battleTag] = curr.sessionInfo?.session;
        return acc;
      }, {});

      setProfilePics(newProfilePics);
      setPlayerCountries(newCountries);
      setSessionData(newSessions);

      // Cache all player data for this match (2 minute TTL for ongoing matches)
      if (matchId) {
        cache.set(`matchPlayers:${matchId}`, {
          playerData: processedData,
          metaData,
          profilePics: newProfilePics,
          countries: newCountries,
          sessions: newSessions,
        }, 2 * 60 * 1000);
      }

      // Check which players with Twitch accounts are actually streaming
      const twitchUsernames = updatedData
        .filter(p => p.twitch)
        .map(p => p.twitch);

      if (twitchUsernames.length > 0) {
        const streamers = await getLiveStreamers(twitchUsernames);
        // Map battleTag to stream info for players who are live
        const liveMap = {};
        for (const player of updatedData) {
          if (player.twitch) {
            const streamInfo = streamers.get(player.twitch.toLowerCase());
            if (streamInfo) {
              liveMap[player.battleTag] = { ...streamInfo, twitchName: player.twitch };
            }
          }
        }
        setLiveStreamers(liveMap);
      }
    } catch (error) {
      console.error("Error fetching player data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return null;

  if (!playerData || !profilePics) {
    return <div>Error: Failed to load match data</div>;
  }

  return (
    <Game playerData={playerData} metaData={metaData} profilePics={profilePics} playerCountries={playerCountries} sessionData={sessionData} liveStreamers={liveStreamers} compact={compact} streamerTag={streamerTag} />
  );
};

export default OnGoingGame;
