import React, { useState, useEffect } from "react";
import Game from "./Game.jsx";
import { preprocessPlayerScores, fetchPlayerSessionData } from "./utils.jsx";
import { getPlayerProfile } from "./api";
import { cache } from "./cache";

// Get cached player data for a finished match
const getCachedMatchPlayerData = (matchId) => {
  return cache.get(`finishedMatchPlayers:${matchId}`);
};

const FinishedGame = ({ data, compact = false }) => {
  const matchId = data?.match?.id;
  const cachedData = matchId ? getCachedMatchPlayerData(matchId) : null;

  // Initialize from cache for instant display
  const [playerData, setPlayerData] = useState(cachedData?.playerData || null);
  const [metaData, setMetaData] = useState(cachedData?.metaData || null);
  const [profilePics, setProfilePics] = useState(cachedData?.profilePics || {});
  const [playerCountries, setPlayerCountries] = useState(cachedData?.countries || {});
  const [sessionData, setSessionData] = useState(cachedData?.sessions || {});
  const [isLoading, setIsLoading] = useState(!cachedData && !compact);

  useEffect(() => {
    fetchMatchData();
  }, []);

  const fetchMatchData = async () => {
    try {
      const processedData = preprocessMatchData(data);
      const { playerData: newPlayerData, metaData: newMetaData } = processedData;
      setPlayerData(newPlayerData);
      setMetaData({ ...newMetaData, matchId: data.match.id });

      // In compact mode, skip fetching extra player data for faster loading
      if (compact) {
        setIsLoading(false);
      } else {
        // If we have cached data, still refresh but don't show loading
        if (!cachedData) {
          setIsLoading(true);
        }
        await fetchPlayerData(newPlayerData);
      }
    } catch (error) {
      console.error("Error fetching match data:", error.message);
      setIsLoading(false);
    }
  };

  const preprocessMatchData = (matchData) => {
    if (!matchData) {
      throw new Error("Invalid match data format");
    }
    return preprocessPlayerScores(matchData.match, matchData.playerScores);
  };

  const fetchPlayerData = async (processedData) => {
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

      // Cache all player data for this match (30 minute TTL - finished match data is stable)
      if (matchId) {
        cache.set(`finishedMatchPlayers:${matchId}`, {
          playerData: processedData,
          metaData: { ...metaData, matchId },
          profilePics: newProfilePics,
          countries: newCountries,
          sessions: newSessions,
        }, 30 * 60 * 1000);
      }
    } catch (error) {
      console.error("Error fetching player data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {isLoading ? (
        <div className="page-loader">
          <div className="loader-spinner lg" />
          <span className="loader-text">Loading match data</span>
        </div>
      ) : playerData ? (
        <Game playerData={playerData} metaData={metaData} profilePics={profilePics} playerCountries={playerCountries} sessionData={sessionData} compact={compact} />
      ) : (
        <div>Error: Failed to load match data</div>
      )}
    </>
  );
};

export default FinishedGame;
