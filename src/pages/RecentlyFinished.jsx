import React, { useState, useEffect, useMemo } from "react";

import GameCard from "../components/game/GameCard";
import PeonLoader from "../components/PeonLoader";
import { PageLayout } from "../components/PageLayout";
import { Select, Button } from "../components/ui";
import { calculateTeamMMR } from "../lib/utils";
import { gameMode, gateway, season } from "../lib/params";
import { cache, createCacheKey } from "../lib/cache";
import { getMatch, getFinishedMatches } from "../lib/api";

function isWithinTimeRange(endTimeString, maxMinutes) {
  const endTime = new Date(endTimeString);
  const currentTime = new Date();
  const differenceInMinutes = (currentTime - endTime) / (1000 * 60);
  return differenceInMinutes < maxMinutes;
}

// Time range options (how far back to look)
const TIME_RANGES = [
  { label: "30 min", minutes: 30, pageSize: 50 },
  { label: "1 hour", minutes: 60, pageSize: 75 },
  { label: "2 hours", minutes: 120, pageSize: 100 },
  { label: "4 hours", minutes: 240, pageSize: 150 },
  { label: "8 hours", minutes: 480, pageSize: 200 },
];

// Duration ranges in minutes
const DURATION_RANGES = [
  { label: "All", min: 0, max: Infinity },
  { label: "< 10 min", min: 0, max: 10 },
  { label: "10-20 min", min: 10, max: 20 },
  { label: "20-30 min", min: 20, max: 30 },
  { label: "> 30 min", min: 30, max: Infinity },
];

// MMR ranges
const MMR_RANGES = [
  { label: "All", min: 0, max: Infinity },
  { label: "< 1500", min: 0, max: 1500 },
  { label: "1500-1700", min: 1500, max: 1700 },
  { label: "1700-1900", min: 1700, max: 1900 },
  { label: "1900+", min: 1900, max: Infinity },
];

// Initialize from cache for instant UI on navigation
const getInitialCachedData = (timeRangeIndex) => {
  const listCacheKey = createCacheKey("finishedMatches", { timeRangeIndex, gateway, gameMode });
  return cache.get(listCacheKey);
};

const RecentlyFinished = () => {
  // Initialize state from cache synchronously (no loading flash on navigation)
  const initialCached = getInitialCachedData(0);
  const [finishedGameData, setFinishedGameData] = useState(initialCached?.sortedMatches || null);
  const [matchesData, setMatchesData] = useState(initialCached?.matchesData || null);
  const [isLoading, setIsLoading] = useState(!initialCached);

  // Filter states
  const [mapFilter, setMapFilter] = useState("all");
  const [durationFilter, setDurationFilter] = useState(0);
  const [mmrFilter, setMmrFilter] = useState(0);
  const [timeRangeIndex, setTimeRangeIndex] = useState(0);

  // Pagination - more games per page with compact table view
  const [currentPage, setCurrentPage] = useState(1);
  const GAMES_PER_PAGE = 20;

  useEffect(() => {
    fetchFinishedMatchesData();
  }, [timeRangeIndex]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [mapFilter, durationFilter, mmrFilter]);

  const fetchFinishedMatchesData = async () => {
    const timeRange = TIME_RANGES[timeRangeIndex];
    const listCacheKey = createCacheKey("finishedMatches", { timeRangeIndex, gateway, gameMode });

    // Check cache for the list
    const cachedList = cache.get(listCacheKey);
    if (cachedList) {
      setFinishedGameData(cachedList.sortedMatches);
      setMatchesData(cachedList.matchesData);
      setIsLoading(false);
      return;
    }

    // Only show loading if we don't have data yet
    if (!matchesData) {
      setIsLoading(true);
    }

    try {
      // Use cached API for finished matches list
      const data = await getFinishedMatches(timeRange.pageSize, 0);

      // Filter the data by selected time range
      const filteredData = data.matches.filter((match) => isWithinTimeRange(match.endTime, timeRange.minutes));

      const sortedMatches = filteredData.slice().sort((a, b) => {
        const teamAMMR = calculateTeamMMR(a.teams);
        const teamBMMR = calculateTeamMMR(b.teams);
        return teamBMMR - teamAMMR;
      });

      setFinishedGameData(sortedMatches);

      // Fetch match data for each gameId using cached API
      const matchDataPromises = sortedMatches.map((match) => getMatch(match.id));
      const matchDataResults = await Promise.all(matchDataPromises);

      setMatchesData(matchDataResults);

      // Cache the full result for 2 minutes
      cache.set(listCacheKey, { sortedMatches, matchesData: matchDataResults }, 2 * 60 * 1000);

      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching match data:", error.message);
      setIsLoading(false);
    }
  };

  // Get unique maps from the matches data
  const availableMaps = useMemo(() => {
    if (!matchesData) return [];
    const mapSet = new Set();
    matchesData.forEach((d) => {
      if (d.match?.mapName) {
        mapSet.add(d.match.mapName);
      }
    });
    return Array.from(mapSet).sort();
  }, [matchesData]);

  // Filter matches
  const filteredMatches = useMemo(() => {
    if (!matchesData) return [];

    return matchesData.filter((d) => {
      const match = d.match;

      // Map filter
      if (mapFilter !== "all" && match.mapName !== mapFilter) {
        return false;
      }

      // Duration filter
      const durationRange = DURATION_RANGES[durationFilter];
      const durationMinutes = match.durationInSeconds / 60;
      if (durationMinutes < durationRange.min || durationMinutes >= durationRange.max) {
        return false;
      }

      // MMR filter
      const mmrRange = MMR_RANGES[mmrFilter];
      const teamMMR = calculateTeamMMR(match.teams);
      if (teamMMR < mmrRange.min || teamMMR >= mmrRange.max) {
        return false;
      }

      return true;
    });
  }, [matchesData, mapFilter, durationFilter, mmrFilter]);

  const clearFilters = () => {
    setMapFilter("all");
    setDurationFilter(0);
    setMmrFilter(0);
  };

  const hasActiveFilters = mapFilter !== "all" || durationFilter !== 0 || mmrFilter !== 0;

  // Pagination calculations
  const totalPages = Math.ceil(filteredMatches.length / GAMES_PER_PAGE);
  const startIndex = (currentPage - 1) * GAMES_PER_PAGE;
  const endIndex = startIndex + GAMES_PER_PAGE;
  const paginatedMatches = filteredMatches.slice(startIndex, endIndex);

  return (
    <>
      {isLoading ? (
        <div className="page-loader">
          <PeonLoader />
        </div>
      ) : matchesData ? (
        <PageLayout
          maxWidth="1200px"
          header={
            <div className="finished-header">
              <div className="finished-title-section">
                <h1 className="finished-title">Recently Finished</h1>
                <div className="finished-stats">
                  <span className="stat-item">
                    {filteredMatches.length} games
                    {totalPages > 1 && ` · Page ${currentPage} of ${totalPages}`}
                  </span>
                </div>
              </div>
              <div className="finished-controls">
                <div className="filter-group">
                  <label>Time Range</label>
                  <Select
                    value={timeRangeIndex}
                    onChange={(e) => setTimeRangeIndex(Number(e.target.value))}
                  >
                    {TIME_RANGES.map((range, idx) => (
                      <option key={idx} value={idx}>
                        Last {range.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="filter-group">
                  <label>Map</label>
                  <Select
                    value={mapFilter}
                    onChange={(e) => setMapFilter(e.target.value)}
                  >
                    <option value="all">All Maps</option>
                    {availableMaps.map((mapName) => (
                      <option key={mapName} value={mapName}>
                        {mapName}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="filter-group">
                  <label>Duration</label>
                  <Select
                    value={durationFilter}
                    onChange={(e) => setDurationFilter(Number(e.target.value))}
                  >
                    {DURATION_RANGES.map((range, idx) => (
                      <option key={idx} value={idx}>
                        {range.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="filter-group">
                  <label>Avg MMR</label>
                  <Select
                    value={mmrFilter}
                    onChange={(e) => setMmrFilter(Number(e.target.value))}
                  >
                    {MMR_RANGES.map((range, idx) => (
                      <option key={idx} value={idx}>
                        {range.label}
                      </option>
                    ))}
                  </Select>
                </div>
                {hasActiveFilters && (
                  <Button $ghost className="clear-filters" onClick={clearFilters}>
                    Clear
                  </Button>
                )}
              </div>
            </div>
          }
        >
          <div className="game-tiles">
            {paginatedMatches.length > 0 ? (
              paginatedMatches.map((d) => (
                <GameCard key={d.match.id} game={d} />
              ))
            ) : (
              <div className="no-results">
                No matches found with current filters
              </div>
            )}
          </div>
          {totalPages > 1 && (
            <div className="pagination">
              <Button
                $secondary
                className="pagination-btn"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                ««
              </Button>
              <Button
                $secondary
                className="pagination-btn"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                «
              </Button>
              <span className="pagination-info">
                {startIndex + 1}-{Math.min(endIndex, filteredMatches.length)} of {filteredMatches.length}
              </span>
              <Button
                $secondary
                className="pagination-btn"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                »
              </Button>
              <Button
                $secondary
                className="pagination-btn"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                »»
              </Button>
            </div>
          )}
        </PageLayout>
      ) : (
        <div>
          Error: Failed to load match data
          <p>{JSON.stringify(finishedGameData)}</p>
        </div>
      )}
    </>
  );
};

export default RecentlyFinished;
