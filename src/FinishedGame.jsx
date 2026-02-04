import React, { useState, useEffect } from "react";
import Game from "./Game.jsx";
import { preprocessPlayerScores, fetchPlayerSessionData } from "./utils.jsx";
import { getPlayerProfile } from "./api";

const FinishedGame = ({ data, compact = false }) => {
  const [playerData, setPlayerData] = useState(null);
  const [metaData, setMetaData] = useState(null);
  const [profilePics, setProfilePics] = useState({});
  const [playerCountries, setPlayerCountries] = useState({});
  const [sessionData, setSessionData] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMatchData();
  }, []);

  const fetchMatchData = async () => {
    try {
      const processedData = preprocessMatchData(data);
      const { playerData, metaData } = { ...processedData };
      setPlayerData(playerData);
      setMetaData({ ...metaData, matchId: data.match.id });

      // In compact mode, skip fetching extra player data for faster loading
      if (compact) {
        setIsLoading(false);
      } else {
        await fetchPlayerData(playerData);
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
    setIsLoading(true);
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
      setProfilePics(
        updatedData.reduce((acc, curr) => {
          acc[curr.battleTag] = curr.profilePicUrl;
          return acc;
        }, {})
      );
      setPlayerCountries(
        updatedData.reduce((acc, curr) => {
          acc[curr.battleTag] = curr.country;
          return acc;
        }, {})
      );
      setSessionData(
        updatedData.reduce((acc, curr) => {
          acc[curr.battleTag] = curr.sessionInfo?.session;
          return acc;
        }, {})
      );
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
