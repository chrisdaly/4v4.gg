import React, { useState, useEffect } from "react";
import { Container, Dimmer, Loader } from "semantic-ui-react";
import Game from "./Game.jsx";
import Navbar from "./Navbar.jsx";
import OnGoingGame from "./OngoingGame.jsx";
import { calculateTeamMMR, getPlayerProfilePicUrl, fetchMMRTimeline, getPlayerCountry } from "./utils.jsx";
import { gameMode, gateway, season } from "./params";

const OnGoingGames = () => {
  const [ongoingGameData, setOngoingGameData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchOngoingMatchesData();
  }, []);

  const fetchOngoingMatchesData = async () => {
    try {
      const response = await fetch(`https://website-backend.w3champions.com/api/matches/ongoing?offset=0&gateway=${gateway}&pageSize=50&gameMode=${gameMode}&map=Overall&sort=startTimeDescending`);
      if (!response.ok) {
        throw new Error("Failed to fetch ongoing matches data");
      }
      const data = await response.json();
      const sortedMatches = data.matches.slice().sort((a, b) => {
        const teamAMMR = calculateTeamMMR(a.teams);
        const teamBMMR = calculateTeamMMR(b.teams);
        return teamBMMR - teamAMMR;
      });
      setOngoingGameData(sortedMatches);

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
      ) : ongoingGameData ? (
        <div>
          <Navbar />
          <div className="games">
            {ongoingGameData.map((d) => (
              <OnGoingGame ongoingGameData={d} key={d.id} />
            ))}
          </div>
        </div>
      ) : (
        <div>
          Error: Failed to load match data
          <p>{JSON.stringify(ongoingGameData)}</p>
        </div>
      )}
    </>
  );
};

export default OnGoingGames;
