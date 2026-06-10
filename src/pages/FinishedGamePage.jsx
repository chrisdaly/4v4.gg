import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

import FinishedGame from "../components/FinishedGame";
import OnGoingGame from "../components/OngoingGame";
import PeonLoader from "../components/PeonLoader";
import { getMatch, getMatchCached, getOngoingMatches } from "../lib/api";

// Initialize from cache for instant UI on navigation (finished games only)
const getCachedData = (matchId) => {
  if (!matchId) return null;
  const cached = getMatchCached(matchId);
  // Only use cache if it contains a real finished match
  return cached?.match ? cached : null;
};

const FinishedGamePage = () => {
  const { matchId } = useParams();
  const [data, setData] = useState(() => getCachedData(matchId));
  const [ongoingMatch, setOngoingMatch] = useState(null);
  const [isLoading, setIsLoading] = useState(() => getCachedData(matchId) === null);

  useEffect(() => {
    let cancelled = false;

    const cached = getCachedData(matchId);
    setData(cached);
    setOngoingMatch(null);
    setIsLoading(cached === null);

    if (!matchId) {
      setIsLoading(false);
      return;
    }

    const fetchMatchData = async () => {
      // Try finished match API first
      try {
        const result = await getMatch(matchId);
        if (cancelled) return;
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
        if (cancelled) return;
        const found = (ongoing?.matches || []).find((m) => m.id === matchId);
        if (found) {
          setOngoingMatch(found);
          setIsLoading(false);
          return;
        }
      } catch (error) {
        console.error("Error fetching ongoing matches:", error.message);
      }

      if (!cancelled) setIsLoading(false);
    };

    fetchMatchData();
    return () => { cancelled = true; };
  }, [matchId]);

  return (
    <div className="match-page">
      {isLoading ? (
        <div className="page-loader">
          <PeonLoader />
        </div>
      ) : data?.match ? (
        <FinishedGame data={data} />
      ) : ongoingMatch ? (
        <OnGoingGame ongoingGameData={ongoingMatch} />
      ) : (
        <div>Error: Failed to load match data</div>
      )}
    </div>
  );
};

export default FinishedGamePage;
