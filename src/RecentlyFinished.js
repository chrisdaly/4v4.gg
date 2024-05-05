import React, { useState, useEffect } from "react";
import { Container, Dimmer, Loader } from "semantic-ui-react";
import Game from "./Game.js";
import Navbar from "./Navbar.js";
import FinishedGame from "./FinishedGame.js";
import OnGoingGame from "./OngoingGame.js";
import { calculateTeamMMR, getPlayerProfilePicUrl, fetchMMRTimeline, getPlayerCountry } from "./utils.js";
import { gameMode, gateway, season } from "./params";

function isLessThan30MinutesAgo(endTimeString) {
  // Convert the endTime string to a Date object
  const endTime = new Date(endTimeString);
  // Get the current time
  const currentTime = new Date();

  // Calculate the difference in milliseconds between current time and endTime
  const differenceInMilliseconds = currentTime - endTime;

  // Convert the difference to minutes
  const differenceInMinutes = differenceInMilliseconds / (1000 * 60);

  // Return true if the difference is less than 30 minutes
  return differenceInMinutes < 30;
}

const RecentlyFinished = () => {
  const [finishedGameData, setFinishedGameData] = useState(null);
  const [matchesData, setMatchesData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchFinishedMatchesData();
  }, []);

  const getMatchData = async (matchId) => {
    const url = `https://website-backend.w3champions.com/api/matches/${matchId}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Failed to fetch match data");
    }
    return response.json();
  };

  const fetchFinishedMatchesData = async () => {
    try {
      const response = await fetch(`https://website-backend.w3champions.com/api/matches?offset=0&gateway=${gateway}&pageSize=50&gameMode=${gameMode}&map=Overall`);
      if (!response.ok) {
        throw new Error("Failed to fetch ongoing matches data");
      }
      const data = await response.json();

      // Filter the data
      const filteredData = data.matches.filter((match) => isLessThan30MinutesAgo(match.endTime));
      console.log("filteredData", filteredData);

      const sortedMatches = filteredData.slice().sort((a, b) => {
        const teamAMMR = calculateTeamMMR(a.teams);
        const teamBMMR = calculateTeamMMR(b.teams);
        return teamBMMR - teamAMMR;
      });

      setFinishedGameData(sortedMatches);

      // Fetch match data for each gameId in filteredData
      const matchDataPromises = sortedMatches.map((match) => getMatchData(match.id));
      const matchDataResults = await Promise.all(matchDataPromises);

      console.log("matchDataResults", matchDataResults);
      setMatchesData(matchDataResults);

      setIsLoading(false);
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
      ) : matchesData ? (
        <div>
          <Navbar />
          <div>
            {console.log("matchesData", matchesData)}
            {matchesData.map((d) => (
              <FinishedGame data={d} />
            ))}
          </div>
        </div>
      ) : (
        <div>
          Error: Failed to load match data
          <p>{JSON.stringify(finishedGameData)}</p>
        </div>
      )}
    </>
  );
};

export default RecentlyFinished;
