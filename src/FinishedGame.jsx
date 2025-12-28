import React, { useState, useEffect } from "react";
import { Dimmer, Loader } from "semantic-ui-react";
import Game from "./Game.jsx";
import { preprocessPlayerScores } from "./utils.jsx";
import { getPlayerCountry, getPlayerProfilePicUrl, fetchPlayerSessionData } from "./utils.jsx";

const FinishedGame = ({ data }) => {
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
      await fetchPlayerData(playerData);
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
        const [profilePicUrl, country, sessionInfo] = await Promise.all([
          getPlayerProfilePicUrl(battleTag),
          getPlayerCountry(battleTag),
          fetchPlayerSessionData(battleTag, race),
        ]);
        return { ...playerData, profilePicUrl, country, sessionInfo };
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
        <Dimmer active>
          <Loader size="large">Loading match data...</Loader>
        </Dimmer>
      ) : playerData ? (
        <Game playerData={playerData} metaData={metaData} profilePics={profilePics} playerCountries={playerCountries} sessionData={sessionData} />
      ) : (
        <div>Error: Failed to load match data</div>
      )}
    </>
  );
};

export default FinishedGame;
