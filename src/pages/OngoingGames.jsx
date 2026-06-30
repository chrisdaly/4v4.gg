import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Link, useHistory } from "react-router-dom";
import { GiCrossedSwords } from "react-icons/gi";

import OngoingGame from "../components/OngoingGame";
import PeonLoader from "../components/PeonLoader";
import { PageLayout, PageHero } from "../components/PageLayout";
import { calculateTeamMMR } from "../lib/utils";
import { getOngoingMatchesCached, getMatch } from "../lib/api";
import { cache } from "../lib/cache";
import useOngoingMatches from "../lib/useOngoingMatches";

const EXITING_DISPLAY_MS = 30000;
const EXITING_FADE_MS = 1500;
const WINNER_RETRY_DELAY_MS = 20000;
const WINNER_MAX_RETRIES = 2;

const WinnerBanner = ({ winnerTeamIndex }) => {
  const isBlue = winnerTeamIndex === 0;
  const cls = winnerTeamIndex === null ? "winner-pending" : isBlue ? "winner-blue" : "winner-red";
  const label = winnerTeamIndex === null ? "Game Over" : isBlue ? "Blue Team Wins" : "Red Team Wins";
  return (
    <div className={`game-over-banner ${cls}`}>
      {label}
    </div>
  );
};

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
  const { data, error } = useOngoingMatches();
  const ongoingGameData = useMemo(
    () => (data?.matches ? sortByMMR(data.matches) : getInitialData()),
    [data]
  );
  const isLoading = ongoingGameData === null && !error;
  const [allReady, setAllReady] = useState(false);
  const readySet = useRef(new Set());
  const hasInitiallyLoadedRef = useRef(false);

  // Only reset ready tracking on the very first load — not on re-polls
  useEffect(() => {
    if (!ongoingGameData || ongoingGameData.length === 0) return;
    if (hasInitiallyLoadedRef.current) return;
    readySet.current = new Set();
    setAllReady(false);
  }, [ongoingGameData?.length]);

  const handleGameReady = useCallback((matchId) => {
    readySet.current.add(matchId);
    if (ongoingGameData && readySet.current.size >= ongoingGameData.length) {
      hasInitiallyLoadedRef.current = true;
      setAllReady(true);
    }
  }, [ongoingGameData]);

  // Track games that just finished
  const [exitingGames, setExitingGames] = useState({});
  const prevMatchDataRef = useRef({});
  const prevMatchIdsRef = useRef(new Set());
  const exitingIdsRef = useRef(new Set());
  const exitingTimersRef = useRef({});

  useEffect(() => {
    if (!ongoingGameData) return;

    const currentIds = new Set(ongoingGameData.map(d => d.id));

    // Remember all current game data for when they disappear next poll
    for (const d of ongoingGameData) {
      prevMatchDataRef.current[d.id] = d;
    }

    // Find games that just disappeared
    const goneIds = [...prevMatchIdsRef.current].filter(id => !currentIds.has(id) && !exitingIdsRef.current.has(id));

    if (goneIds.length > 0) {
      const newEntries = {};
      for (const id of goneIds) {
        const gameData = prevMatchDataRef.current[id];
        if (!gameData) continue;
        exitingIdsRef.current.add(id);
        newEntries[id] = { data: gameData, winnerTeamIndex: null, fading: false };
      }

      if (Object.keys(newEntries).length > 0) {
        setExitingGames(prev => ({ ...prev, ...newEntries }));

        for (const id of Object.keys(newEntries)) {
          // Fetch winner result with retries (W3C API takes 1-3 min to process finished games)
          const tryFetchWinner = (attempt = 0) => {
            // Clear stale cache before each attempt so retries get fresh data
            if (attempt > 0) cache.remove(`match:${id}`);
            getMatch(id).then(result => {
              const winnerIdx = (result?.match?.teams || []).findIndex(t =>
                (t.players || []).some(p => p.won === true || p.won === 1)
              );
              if (winnerIdx >= 0) {
                setExitingGames(prev => {
                  if (!prev[id]) return prev;
                  return { ...prev, [id]: { ...prev[id], winnerTeamIndex: winnerIdx } };
                });
              } else if (attempt < WINNER_MAX_RETRIES && exitingIdsRef.current.has(id)) {
                const retryTimer = setTimeout(() => tryFetchWinner(attempt + 1), WINNER_RETRY_DELAY_MS);
                exitingTimersRef.current[`${id}_retry${attempt}`] = retryTimer;
              }
            }).catch(() => {
              if (attempt < WINNER_MAX_RETRIES && exitingIdsRef.current.has(id)) {
                const retryTimer = setTimeout(() => tryFetchWinner(attempt + 1), WINNER_RETRY_DELAY_MS);
                exitingTimersRef.current[`${id}_retry${attempt}`] = retryTimer;
              }
            });
          };
          tryFetchWinner();

          // Start fade timer
          const fadeTimer = setTimeout(() => {
            setExitingGames(prev => {
              if (!prev[id]) return prev;
              return { ...prev, [id]: { ...prev[id], fading: true } };
            });
            const removeTimer = setTimeout(() => {
              setExitingGames(prev => {
                const next = { ...prev };
                delete next[id];
                return next;
              });
              exitingIdsRef.current.delete(id);
              delete prevMatchDataRef.current[id];
            }, EXITING_FADE_MS);
            exitingTimersRef.current[`${id}_remove`] = removeTimer;
          }, EXITING_DISPLAY_MS);
          exitingTimersRef.current[id] = fadeTimer;
        }
      }
    }

    prevMatchIdsRef.current = currentIds;
  }, [ongoingGameData]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      for (const timer of Object.values(exitingTimersRef.current)) {
        clearTimeout(timer);
      }
    };
  }, []);

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

  const exitingList = Object.values(exitingGames);

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
            {exitingList.map(({ data, winnerTeamIndex, fading }) => {
              const winnerCls = winnerTeamIndex === null ? "winner-pending" : winnerTeamIndex === 0 ? "winner-blue" : "winner-red";
              return (
                <div
                  key={data.id}
                  style={{ opacity: fading ? 0 : 1, transition: `opacity ${EXITING_FADE_MS}ms ease`, width: "100%" }}
                >
                  <div
                    className={`game-clickable game-finished ${winnerCls}`}
                    onClick={(e) => {
                      if (e.target.closest("a")) return;
                      history.push(`/match/${data.id}`);
                    }}
                  >
                    <WinnerBanner winnerTeamIndex={winnerTeamIndex} />
                    <div className="game-over-bar">
                      <div className="game-over-bar-fill" />
                    </div>
                    <OngoingGame ongoingGameData={data} onReady={() => {}} />
                  </div>
                </div>
              );
            })}
          </div>
        </PageLayout>
      </div>
    </>
  );
};

export default OngoingGames;
