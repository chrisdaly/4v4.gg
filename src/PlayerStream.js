import React, { useState, useEffect } from "react";
import { findPlayerInOngoingMatches } from "./utils.js";
import OnGoingGame from "./OngoingGame.js";
import human from "./icons/human.svg";
import orc from "./icons/orc.svg";
import elf from "./icons/elf.svg";
import undead from "./icons/undead.svg";
import random from "./icons/random.svg";

const PlayerProfile = () => {
  const [matchHistory, setMatchHistory] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [ongoingGame, setOngoingGame] = useState(null);
  const raceMapping = { 8: undead, 0: random, 4: elf, 2: orc, 1: human };
  const [race, setRace] = useState(null);

  useEffect(() => {
    // Immediately load data when the component mounts
    loadData();

    // Fetch ongoing games every 30 seconds
    const interval = setInterval(fetchOngoingGames, 30000);

    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      // Fetch ongoing games immediately
      await fetchOngoingGames();

      // Other data loading logic here (e.g., player profile, match history, etc.)

      setIsLoaded(true);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const fetchOngoingGames = async () => {
    try {
      // Fetch ongoing games API
      const ongoingResponse = await fetch("https://website-backend.w3champions.com/api/matches/ongoing");
      const ongoingResult = await ongoingResponse.json();

      // Extract tag from URL
      const pageUrl = new URL(window.location.href);
      const tag = pageUrl.pathname.split("/").slice(-1)[0].replace("%23", "#");

      // Find ongoing game for the player
      const ongoingGame = findPlayerInOngoingMatches(ongoingResult, tag);
      setOngoingGame(ongoingGame);
    } catch (error) {
      console.error("Error fetching ongoing games:", error);
    }
  };

  if (!isLoaded) return null;

  return (
    <div id="PlayerProfile">
      {!ongoingGame ? (
        <></>
      ) : (
        <div id="ongoing">
          <OnGoingGame ongoingGameData={ongoingGame} />
        </div>
      )}
    </div>
  );
};

export default PlayerProfile;
