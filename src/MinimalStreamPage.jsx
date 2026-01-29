import React, { useState, useEffect } from "react";
import { findPlayerInOngoingMatches, detectArrangedTeams, fetchPlayerSessionData } from "./utils.jsx";
import MinimalOverlay from "./MinimalOverlay.jsx";

/**
 * Minimal Stream Page - for OBS/Streamlabs browser source
 * URL: /minimal/{battleTag}
 *
 * Usage in Streamlabs:
 * 1. Add Browser Source
 * 2. URL: https://yoursite.com/minimal/YourTag%23123
 * 3. Width: 1000, Height: 200 (adjust as needed)
 * 4. No custom CSS needed - background is transparent by default
 */
const MinimalStreamPage = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [ongoingGame, setOngoingGame] = useState(null);
  const [atGroups, setAtGroups] = useState({});
  const [sessionData, setSessionData] = useState({});

  const getStreamerTag = () => {
    const pageUrl = new URL(window.location.href);
    const encoded = pageUrl.pathname.split("/").slice(-1)[0];
    return decodeURIComponent(encoded);
  };

  useEffect(() => {
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

  const fetchOngoingGames = async () => {
    try {
      const ongoingResponse = await fetch("https://website-backend.w3champions.com/api/matches/ongoing");
      const ongoingResult = await ongoingResponse.json();
      const tag = getStreamerTag();
      const game = findPlayerInOngoingMatches(ongoingResult, tag);
      setOngoingGame(game);

      // Detect AT groups and fetch session data
      if (game?.teams) {
        const players = game.teams.flatMap(team =>
          team.players.map(p => p.battleTag)
        );

        const groups = await detectArrangedTeams(players);
        setAtGroups(groups || {});

        // Fetch session data for all players (in parallel)
        const sessionPromises = players.map(async (battleTag) => {
          const data = await fetchPlayerSessionData(battleTag);
          return [battleTag, {
            recentGames: data?.session?.form || [],
            wins: data?.session?.wins || 0,
            losses: data?.session?.losses || 0,
          }];
        });
        const sessionResults = await Promise.all(sessionPromises);
        const sessionObj = Object.fromEntries(sessionResults);
        setSessionData(sessionObj);
      }
    } catch (error) {
      console.error("Error fetching ongoing games:", error);
    }
  };

  // Transparent background - ready for OBS/Streamlabs
  return (
    <div style={{
      background: 'transparent',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      {!isLoaded && null}
      {isLoaded && !ongoingGame && null}
      {isLoaded && ongoingGame && (
        <MinimalOverlay
          matchData={ongoingGame}
          atGroups={atGroups}
          sessionData={sessionData}
          streamerTag={getStreamerTag()}
        />
      )}
    </div>
  );
};

export default MinimalStreamPage;
