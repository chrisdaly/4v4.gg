import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import FinishedGame from "../components/FinishedGame";
import { getMatch, getMatchCached } from "../lib/api";

const extractMatchIdFromUrl = () => {
  const pageUrl = new URL(window.location.href);
  return pageUrl.pathname.split("/").slice(-1)[0];
};

// Initialize from cache for instant UI on navigation
const getInitialData = () => {
  const matchId = extractMatchIdFromUrl();
  return getMatchCached(matchId);
};

const FinishedGamePage = () => {
  // Initialize state from cache synchronously (no loading flash on navigation)
  const [data, setData] = useState(getInitialData);
  const [isLoading, setIsLoading] = useState(() => getInitialData() === null);

  useEffect(() => {
    fetchMatchData();
  }, []);

  const fetchMatchData = async () => {
    try {
      const matchId = extractMatchIdFromUrl();
      const data = await getMatch(matchId);
      setData(data);
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
          <span className="loader-text">Loading match data</span>
        </div>
      ) : data ? (
        <FinishedGame data={data} />
      ) : (
        <div>Error: Failed to load match data</div>
      )}
    </>
  );
};

export default FinishedGamePage;
