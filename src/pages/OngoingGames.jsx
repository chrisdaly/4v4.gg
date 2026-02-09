import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { GiCrossedSwords } from "react-icons/gi";

import OngoingGame from "../components/OngoingGame";
import { PageLayout } from "../components/PageLayout";
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
      ) : ongoingGameData && ongoingGameData.length > 0 ? (
        <PageLayout maxWidth="1200px">
          <div className="games">
            {ongoingGameData.map((d) => (
              <OngoingGame ongoingGameData={d} key={d.id} />
            ))}
          </div>
        </PageLayout>
      ) : ongoingGameData ? (
        <div className="empty-state">
          <GiCrossedSwords className="empty-state-icon" />
          <h2 className="empty-state-title">No Live Games</h2>
          <p className="empty-state-text">No 4v4 matches are being played right now</p>
          <Link to="/finished" className="empty-state-link">View recently finished games</Link>
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
