import React, { useState, useEffect } from "react";
import { Container, Dimmer, Loader } from "semantic-ui-react";
import Navbar from "./Navbar.jsx";
import Game from "./Game.jsx";
import { preprocessPlayerScores, calcPlayerMmrAndChange } from "./utils.jsx";
import { getPlayerCountry, fetchMMRTimeline, getPlayerProfilePicUrl } from "./utils.jsx";
import { gameMode, gateway, season } from "./params.jsx";
import FinishedGame from "./FinishedGame.jsx";

const extractMatchIdFromUrl = () => {
  const pageUrl = new URL(window.location.href);
  return pageUrl.pathname.split("/").slice(-1)[0];
};

const FinishedGamePage = () => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const getMatchData = async (matchId) => {
    const url = `https://website-backend.w3champions.com/api/matches/${matchId}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Failed to fetch match data");
    }
    return response.json();
  };

  useEffect(() => {
    fetchMatchData();
  }, []);

  const fetchMatchData = async () => {
    try {
      const matchId = extractMatchIdFromUrl();
      const data = await getMatchData(matchId);
      console.log("data", data);
      setData(data);
      setIsLoading(false);

      //   setMetaData(metaData);
      //   await fetchPlayerData(playerData);
    } catch (error) {
      console.error("Error fetching match data:", error.message);
      setIsLoading(false);
    }
  };

  return (
    <>
      {isLoading ? (
        <Dimmer active>
          <Loader size="large">Loading match data...</Loader>
        </Dimmer>
      ) : data ? (
        <FinishedGame data={data} />
      ) : (
        <div>Error: Failed to load match data</div>
      )}
    </>
  );
};

export default FinishedGamePage;
