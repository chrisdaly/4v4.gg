import React, { useState, useEffect } from "react";
import Game from "./Game";
import { processOngoingGameData } from "../lib/utils";
import { cache } from "../lib/cache";
import { enrichPlayerData } from "../lib/gameDataUtils";

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
    if (!ongoingGameData) return;

    const { playerData: newPlayerData, metaData: newMetaData } = processOngoingGameData(ongoingGameData);
    setPlayerData(newPlayerData);
    setMetaData(newMetaData);

    // If we had cached data, still refresh in background but don't show loading
    if (!cachedData) {
      setIsLoading(true);
    }
    fetchRemainingPlayerData(newPlayerData);
  }, [ongoingGameData]);

  const fetchRemainingPlayerData = async (processedData) => {
    try {
      const result = await enrichPlayerData(processedData, {
        fetchSessions: true,
        fetchTwitchStatus: true,
      });

      setProfilePics(result.profilePics);
      setPlayerCountries(result.countries);
      setSessionData(result.sessions);
      setLiveStreamers(result.liveStreamers);

      // Cache all player data for this match (2 minute TTL for ongoing matches)
      if (matchId) {
        cache.set(`matchPlayers:${matchId}`, {
          playerData: processedData,
          metaData,
          profilePics: result.profilePics,
          countries: result.countries,
          sessions: result.sessions,
        }, 2 * 60 * 1000);
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
