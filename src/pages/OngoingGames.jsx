import React, { useState, useEffect } from "react";
import { Link, useHistory } from "react-router-dom";
import { GiCrossedSwords } from "react-icons/gi";

import OngoingGame from "../components/OngoingGame";
import PeonLoader from "../components/PeonLoader";
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
  const history = useHistory();
  const [ongoingGameData, setOngoingGameData] = useState(getInitialData);
  const [isLoading, setIsLoading] = useState(() => getInitialData() === null);

  useEffect(() => {
    fetchOngoingMatchesData();
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

  return isLoading ? (
    <div className="page-loader">
      <PeonLoader />
    </div>
  ) : ongoingGameData && ongoingGameData.length > 0 ? (
    <div className="games">
      {ongoingGameData.map((d) => (
        <div
          key={d.id}
          className="game-clickable"
          onClick={(e) => {
            if (e.target.closest("a")) return;
            history.push(`/match/${d.id}`);
          }}
        >
          <OngoingGame ongoingGameData={d} />
        </div>
      ))}
    </div>
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
  );
};

export default OngoingGames;
