import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import OngoingGame from "../components/OngoingGame";
import { calculateTeamMMR } from "../lib/utils";
import { getOngoingMatches, getOngoingMatchesCached } from "../lib/api";

// Sort matches by team MMR (highest first)
const sortByMMR = (matches) => {
  if (!matches) return [];
  return matches.slice().sort((a, b) => {
    const teamAMMR = calculateTeamMMR(a.teams);
    const teamBMMR = calculateTeamMMR(b.teams);
    return teamBMMR - teamAMMR;
  });
};

// Initialize from cache for instant UI on navigation
const getInitialData = () => {
  const cached = getOngoingMatchesCached();
  if (cached?.matches) {
    return sortByMMR(cached.matches);
  }
  return null;
};

const OngoingGames = () => {
  // Initialize state from cache synchronously (no loading flash on navigation)
  const [ongoingGameData, setOngoingGameData] = useState(getInitialData);
  const [isLoading, setIsLoading] = useState(() => getInitialData() === null);

  useEffect(() => {
    fetchOngoingMatchesData();
    // Set up polling every 30 seconds
    const interval = setInterval(fetchOngoingMatchesData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchOngoingMatchesData = async () => {
    try {
      const data = await getOngoingMatches();
      const sortedMatches = sortByMMR(data.matches);
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
        <div className="page-loader">
          <div className="loader-spinner lg" />
          <span className="loader-text">Loading matches</span>
        </div>
      ) : ongoingGameData ? (
        <div>
          <Navbar />
          <div className="games">
            {ongoingGameData.map((d) => (
              <OngoingGame ongoingGameData={d} key={d.id} />
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

export default OngoingGames;
