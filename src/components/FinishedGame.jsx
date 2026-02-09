import React, { useState, useEffect } from "react";
import Game from "./Game";
import { preprocessPlayerScores } from "../lib/utils";
import { cache } from "../lib/cache";
import { enrichPlayerData } from "../lib/gameDataUtils";

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
      if (!data) {
        throw new Error("Invalid match data format");
      }
      const processedData = preprocessPlayerScores(data.match, data.playerScores);
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

  const fetchPlayerData = async (processedData) => {
    try {
      const result = await enrichPlayerData(processedData, {
        fetchSessions: true,
        fetchTwitchStatus: false,
      });

      // Merge with existing data to prevent flash of missing content
      setProfilePics(prev => ({ ...prev, ...result.profilePics }));
      setPlayerCountries(prev => ({ ...prev, ...result.countries }));
      setSessionData(prev => ({ ...prev, ...result.sessions }));

      // Cache all player data for this match (30 minute TTL - finished match data is stable)
      if (matchId) {
        cache.set(`finishedMatchPlayers:${matchId}`, {
          playerData: processedData,
          metaData: { ...metaData, matchId },
          profilePics: result.profilePics,
          countries: result.countries,
          sessions: result.sessions,
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
