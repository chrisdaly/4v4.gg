import React, { useState, useEffect } from "react";
import { Container, Dimmer, Loader } from "semantic-ui-react";
import Navbar from "./Navbar.js";
import MatchDetails from "./MatchDetails.js";
import { preprocessPlayerScores, calcPlayerMmrAndChange } from "./utils.js";

import { gameMode, gateway, season } from "./params";

const MatchPage = () => {
  const [matchData, setMatchData] = useState(null);
  const [profilePics, setProfilePics] = useState({});
  const [mmrTimeline, setMmrTimeline] = useState({});
  const [playerCountries, setPlayerCountries] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMatchData();
  }, []);

  const fetchMatchData = async () => {
    try {
      const matchId = extractMatchIdFromUrl();
      const matchData = await getMatchData(matchId);
      const processedData = preprocessMatchData(matchData);
      setMatchData(processedData);
      await fetchPlayerData(processedData);
    } catch (error) {
      console.error("Error fetching match data:", error.message);
      setIsLoading(false);
    }
  };

  const extractMatchIdFromUrl = () => {
    const pageUrl = new URL(window.location.href);
    return pageUrl.pathname.split("/").slice(-1)[0];
  };

  const getMatchData = async (matchId) => {
    const url = `https://website-backend.w3champions.com/api/matches/${matchId}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Failed to fetch match data");
    }
    return response.json();
  };

  const preprocessMatchData = (matchData) => {
    if (!matchData || !matchData.match || !matchData.playerScores) {
      throw new Error("Invalid match data format");
    }
    return preprocessPlayerScores(matchData.match, matchData.playerScores);
  };

  const fetchPlayerData = async (processedData) => {
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
      setProfilePics(
        updatedData.reduce((acc, curr) => {
          acc[curr.battleTag] = curr.profilePicUrl;
          return acc;
        }, {})
      );
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

  const getPlayerProfilePicUrl = async (battleTag) => {
    try {
      const response = await fetch(`https://website-backend.w3champions.com/api/personal-settings/${encodeURIComponent(battleTag)}`);
      const profileData = await response.json();
      const { profilePicture } = profileData;
      if (!profilePicture || !profilePicture.pictureId) {
        return null;
      }
      const { pictureId, race } = profilePicture;
      const raceMapping = { 64: "starter", 16: "total", 8: "undead", 0: "random", 4: "nightelf", 2: "orc", 1: "human" };
      const { specialPictures } = profileData;
      if (specialPictures.map((d) => d.pictureId).includes(pictureId)) {
        return `https://w3champions.wc3.tools/prod/integration/icons/specialAvatars/SPECIAL_${pictureId}.jpg`;
      } else {
        return `https://w3champions.wc3.tools/prod/integration/icons/raceAvatars/classic/${raceMapping[race].toUpperCase()}_${pictureId}.jpg`;
      }
    } catch (error) {
      console.error("Error fetching player profile picture:", error);
      return null;
    }
  };

  const fetchMMRTimeline = async (battleTag, race) => {
    const url = new URL(`https://website-backend.w3champions.com/api/players/${battleTag.replace("#", "%23")}/mmr-rp-timeline`);
    const params = { gateway, season, race, gameMode: 4 };
    url.search = new URLSearchParams(params).toString();
    try {
      const response = await fetch(url);
      const result = await response.json();
      return result.mmrRpAtDates.map((d) => d.mmr);
    } catch (error) {
      console.error("Error fetching MMR timeline:", error);
      return [];
    }
  };

  const getPlayerCountry = async (battleTag) => {
    try {
      const response = await fetch(`https://website-backend.w3champions.com/api/personal-settings/${encodeURIComponent(battleTag)}`);
      const profileData = await response.json();
      return profileData.countryCode || null;
    } catch (error) {
      console.error("Error fetching player country:", error);
      return null;
    }
  };

  return (
    <div>
      {isLoading ? (
        <Dimmer active>
          <Loader size="large">Loading match data...</Loader>
        </Dimmer>
      ) : matchData ? (
        <MatchDetails matchData={matchData} profilePics={profilePics} mmrTimeline={mmrTimeline} playerCountries={playerCountries} />
      ) : (
        <div>Error: Failed to load match data</div>
      )}
    </div>
  );
};

export default MatchPage;
