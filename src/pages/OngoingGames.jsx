import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link, useHistory } from "react-router-dom";
import { GiCrossedSwords } from "react-icons/gi";

import OngoingGame from "../components/OngoingGame";
import PeonLoader from "../components/PeonLoader";
import { PageLayout, PageHero } from "../components/PageLayout";
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
  const [allReady, setAllReady] = useState(false);
  const readySet = useRef(new Set());

  useEffect(() => {
    fetchOngoingMatchesData();
    const interval = setInterval(fetchOngoingMatchesData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Reset ready tracking when match list changes
  useEffect(() => {
    if (!ongoingGameData || ongoingGameData.length === 0) return;
    readySet.current = new Set();
    setAllReady(false);
  }, [ongoingGameData?.length]);

  const handleGameReady = useCallback((matchId) => {
    readySet.current.add(matchId);
    if (ongoingGameData && readySet.current.size >= ongoingGameData.length) {
      setAllReady(true);
    }
  }, [ongoingGameData]);

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

  const hasGames = ongoingGameData && ongoingGameData.length > 0;
  const showLoader = isLoading || (hasGames && !allReady);

  const gamesNav = (
    <div className="games-nav">
      <Link to="/live" className="games-nav-tab active">Live</Link>
      <Link to="/finished" className="games-nav-tab">Finished</Link>
    </div>
  );

  if (isLoading) {
    return (
      <PageLayout bare header={
        <PageHero eyebrow="4v4.gg Games" title="Games" lg>
          {gamesNav}
        </PageHero>
      }>
        <div className="page-loader">
          <PeonLoader />
        </div>
      </PageLayout>
    );
  }

  if (!hasGames && ongoingGameData) {
    return (
      <PageLayout bare header={
        <PageHero eyebrow="4v4.gg Games" title="Games" lg>
          {gamesNav}
        </PageHero>
      }>
        <div className="empty-state" style={{ borderTop: 'none' }}>
          <GiCrossedSwords className="empty-state-icon" />
          <h2 className="empty-state-title">No Live Games</h2>
          <p className="empty-state-text">No 4v4 matches are being played right now</p>
          <Link to="/finished" className="empty-state-link">View recently finished games</Link>
        </div>
      </PageLayout>
    );
  }

  if (!ongoingGameData) {
    return (
      <div>
        Error: Failed to load match data
        <p>{JSON.stringify(ongoingGameData)}</p>
      </div>
    );
  }

  const liveHeader = (
    <PageHero eyebrow="4v4.gg Games" title="Games" lg>
      {gamesNav}
      <div className="page-stats">
        <span className="stat-item live-stat">
          <span className="live-dot" />
          {ongoingGameData.length} {ongoingGameData.length === 1 ? 'game' : 'games'} in progress
        </span>
      </div>
    </PageHero>
  );

  return (
    <>
      {showLoader && (
        <div className="page-loader">
          <PeonLoader />
        </div>
      )}
      <div style={showLoader ? { position: 'absolute', left: '-9999px', visibility: 'hidden' } : undefined}>
        <PageLayout bare header={liveHeader}>
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
                <OngoingGame ongoingGameData={d} onReady={handleGameReady} />
              </div>
            ))}
          </div>
        </PageLayout>
      </div>
    </>
  );
};

export default OngoingGames;
