import React, { useState, useEffect } from "react";
import { findPlayerInOngoingMatches } from "./utils.jsx";
import OnGoingGame from "./OngoingGame.jsx";

const PlayerStream = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [ongoingGame, setOngoingGame] = useState(null);
  const [style, setStyle] = useState("default");

  useEffect(() => {
    // Get style from URL params
    const params = new URLSearchParams(window.location.search);
    const styleParam = params.get("style") || "default";
    setStyle(styleParam);

    loadData();
    const interval = setInterval(fetchOngoingGames, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      await fetchOngoingGames();
      setIsLoaded(true);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  // Get streamer tag from URL
  const getStreamerTag = () => {
    const pageUrl = new URL(window.location.href);
    const encoded = pageUrl.pathname.split("/").slice(-1)[0];
    return decodeURIComponent(encoded);
  };

  const fetchOngoingGames = async () => {
    try {
      const ongoingResponse = await fetch("https://website-backend.w3champions.com/api/matches/ongoing");
      const ongoingResult = await ongoingResponse.json();

      const tag = getStreamerTag();
      const game = findPlayerInOngoingMatches(ongoingResult, tag);
      setOngoingGame(game);
    } catch (error) {
      console.error("Error fetching ongoing games:", error);
    }
  };

  if (!isLoaded) return null;

  // Style options: default, dark, bordered, minimal
  return (
    <div id="StreamOverlay" className={`stream-style-${style}`}>
      {ongoingGame && <OnGoingGame ongoingGameData={ongoingGame} compact={true} streamerTag={getStreamerTag()} />}
    </div>
  );
};

export default PlayerStream;
