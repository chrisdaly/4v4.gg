import React, { useState, useEffect } from "react";
import { Container, Dimmer, Loader } from "semantic-ui-react";
import Game from "./Game.js";
import { processOngoingGameData, getPlayerProfilePicUrl, fetchMMRTimeline, getPlayerCountry } from "./utils.js";
import { gameMode, gateway, season } from "./params";

const OnGoingGame = ({ ongoingGameData, compact }) => {
  console.log("OnGoingGame", "compact", compact);
  const [playerData, setPlayerData] = useState(null);
  const [metaData, setMetaData] = useState(null);
  const [profilePics, setProfilePics] = useState(null);
  const [mmrTimeline, setMmrTimeline] = useState({});
  const [playerCountries, setPlayerCountries] = useState({});

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const processedData = preprocessMatchData(ongoingGameData);
    // console.log("XXX processedData", processedData);
    const { playerData, metaData } = { ...processedData };
    setPlayerData(playerData);
    setMetaData(metaData);
    fetchRemainingPlayerData(playerData);
  }, []);

  const preprocessMatchData = (ongoingGameData) => {
    if (!ongoingGameData) {
      throw new Error("Invalid match data format");
    }
    // Process ongoing game data into the desired format
    return processOngoingGameData(ongoingGameData);
  };

  const fetchRemainingPlayerData = async (processedData) => {
    // console.log("ONGOING GAME const fetchPlayerData", processedData);

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
      // console.log("profilePics", profilePics);

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
      ) : playerData && profilePics ? (
        <div>
          <Game playerData={playerData} metaData={metaData} profilePics={profilePics} mmrTimeline={mmrTimeline} playerCountries={playerCountries} compact={compact} />
        </div>
      ) : (
        <div>
          Error: Failed to load match data
          {JSON.stringify(playerData)}
          {JSON.stringify(profilePics)}
        </div>
      )}
    </>
  );
};

export default OnGoingGame;
