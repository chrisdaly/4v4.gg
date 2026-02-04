import React, { useState, useEffect } from "react";
import { Dimmer, Loader } from "semantic-ui-react";
import Game from "./Game.jsx";
import { processOngoingGameData, getPlayerProfileInfo, getPlayerCountry, fetchPlayerSessionData } from "./utils.jsx";
import { getLiveStreamers } from "./twitchService";

const OnGoingGame = ({ ongoingGameData, compact, streamerTag }) => {
  const [playerData, setPlayerData] = useState(null);
  const [metaData, setMetaData] = useState(null);
  const [profilePics, setProfilePics] = useState(null);
  const [playerCountries, setPlayerCountries] = useState({});
  const [sessionData, setSessionData] = useState({});
  const [liveStreamers, setLiveStreamers] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const processedData = preprocessMatchData(ongoingGameData);
    const { playerData, metaData } = { ...processedData };
    setPlayerData(playerData);
    setMetaData(metaData);
    fetchRemainingPlayerData(playerData);
  }, []);

  const preprocessMatchData = (ongoingGameData) => {
    if (!ongoingGameData) {
      throw new Error("Invalid match data format");
    }
    return processOngoingGameData(ongoingGameData);
  };

  const fetchRemainingPlayerData = async (processedData) => {
    setIsLoading(true);
    try {
      const promises = processedData.map(async (playerData) => {
        const { battleTag, race } = playerData;
        const [profileInfo, country, sessionInfo] = await Promise.all([
          getPlayerProfileInfo(battleTag),
          getPlayerCountry(battleTag),
          fetchPlayerSessionData(battleTag, race),
        ]);
        return { ...playerData, profilePicUrl: profileInfo.profilePicUrl, twitch: profileInfo.twitch, country, sessionInfo };
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

  return (
    <>
      {isLoading ? (
        <Dimmer active>
          <Loader size="large">Loading match data...</Loader>
        </Dimmer>
      ) : playerData && profilePics ? (
        <Game playerData={playerData} metaData={metaData} profilePics={profilePics} playerCountries={playerCountries} sessionData={sessionData} liveStreamers={liveStreamers} compact={compact} streamerTag={streamerTag} />
      ) : (
        <div>Error: Failed to load match data</div>
      )}
    </>
  );
};

export default OnGoingGame;
