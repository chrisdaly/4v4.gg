import React, { useState, useEffect } from "react";

import FinishedGame from "../components/FinishedGame";
import OnGoingGame from "../components/OngoingGame";
import { getMatch, getMatchCached, getOngoingMatches } from "../lib/api";

const extractMatchIdFromUrl = () => {
  const pageUrl = new URL(window.location.href);
  return pageUrl.pathname.split("/").slice(-1)[0];
};

// Initialize from cache for instant UI on navigation (finished games only)
const getInitialData = () => {
  const matchId = extractMatchIdFromUrl();
  const cached = getMatchCached(matchId);
  // Only use cache if it contains a real finished match
  return cached?.match ? cached : null;
};

const FinishedGamePage = () => {
  const [data, setData] = useState(getInitialData);
  const [ongoingMatch, setOngoingMatch] = useState(null);
  const [isLoading, setIsLoading] = useState(() => getInitialData() === null);

  useEffect(() => {
    fetchMatchData();
  }, []);

  const fetchMatchData = async () => {
    const matchId = extractMatchIdFromUrl();

    // Try finished match API first
    try {
      const result = await getMatch(matchId);
      if (result?.match) {
        setData(result);
        setIsLoading(false);
        return;
      }
    } catch (error) {
      console.error("Error fetching finished match:", error.message);
    }

    // Ongoing matches use different IDs than finished matches,
    // so fall back to searching the ongoing list by ID
    try {
      const ongoing = await getOngoingMatches();
      const found = (ongoing?.matches || []).find((m) => m.id === matchId);
      if (found) {
        setOngoingMatch(found);
        setIsLoading(false);
        return;
      }
    } catch (error) {
      console.error("Error fetching ongoing matches:", error.message);
    }

    setIsLoading(false);
  };

  return (
    <>
      {isLoading ? (
        <div className="page-loader">
          <div className="loader-spinner lg" />
          <span className="loader-text">Loading match data</span>
        </div>
      ) : data?.match ? (
        <FinishedGame data={data} />
      ) : ongoingMatch ? (
        <OnGoingGame ongoingGameData={ongoingMatch} />
      ) : (
        <div>Error: Failed to load match data</div>
      )}
    </>
  );
};

export default FinishedGamePage;
