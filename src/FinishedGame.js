import React, { useState, useEffect } from "react";
import { Container, Dimmer, Loader } from "semantic-ui-react";
import Navbar from "./Navbar.js";
import Game from "./Game.js";
import { preprocessPlayerScores, calcPlayerMmrAndChange } from "./utils.js";
import { getPlayerCountry, fetchMMRTimeline, getPlayerProfilePicUrl } from "./utils.js";
import { gameMode, gateway, season } from "./params.js";

const FinishedGame = ({ data }) => {
  console.log("data", data);
  const [playerData, setPlayerData] = useState(null);
  // const [scoreScreenData, setScoreScreenData] = useState(null);
  const [metaData, setMetaData] = useState(null);
  const [profilePics, setProfilePics] = useState({});
  const [mmrTimeline, setMmrTimeline] = useState({});
  const [playerCountries, setPlayerCountries] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMatchData();
  }, []);

  const fetchMatchData = async () => {
    try {
      const processedData = preprocessMatchData(data);
      const { playerData, metaData } = { ...processedData };
      console.log("playerData", playerData);
      console.log("metaData", metaData);

      setPlayerData(playerData);
      setMetaData(metaData);
      await fetchPlayerData(playerData);
    } catch (error) {
      console.error("Error fetching match data:", error.message);
      setIsLoading(false);
    }
  };

  const preprocessMatchData = (matchData) => {
    console.log("matchData", matchData);
    if (!matchData) {
      // || !matchData.match || !matchData.playerScores
      throw new Error("Invalid match data format");
    }
    return preprocessPlayerScores(matchData.match, matchData.playerScores);
  };

  const fetchPlayerData = async (processedData) => {
    console.log("FINISHED GAME const fetchPlayerData", processedData);
    setIsLoading(true);
    try {
      const promises = processedData.map(async (playerData) => {
        const { battleTag } = playerData;
        const [profilePicUrl, mmrTimelineData, country] = await Promise.all([getPlayerProfilePicUrl(battleTag), fetchMMRTimeline(battleTag, playerData.race), getPlayerCountry(battleTag)]);
        return {
          ...playerData,
          profilePicUrl,
          mmrTimelineData,
          country,
        };
      });
      const updatedData = await Promise.all(promises);
      let profilePics = updatedData.reduce((acc, curr) => {
        acc[curr.battleTag] = curr.profilePicUrl;
        return acc;
      }, {});
      console.log("profilePics", profilePics);
      setProfilePics(profilePics);
      setMmrTimeline(
        updatedData.reduce((acc, curr) => {
          acc[curr.battleTag] = curr.mmrTimelineData;
          return acc;
        }, {})
      );
      setPlayerCountries(
        updatedData.reduce((acc, curr) => {
          acc[curr.battleTag] = curr.country;
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
        <Game playerData={playerData} metaData={metaData} profilePics={profilePics} mmrTimeline={mmrTimeline} playerCountries={playerCountries} />
      ) : (
        <div>Error: Failed to load match data</div>
      )}
    </>
  );
};

export default FinishedGame;
