import React, { useState, useEffect, useMemo } from "react";
import { Dimmer, Loader } from "semantic-ui-react";
import Navbar from "./Navbar.jsx";
import FinishedGame from "./FinishedGame.jsx";
import { calculateTeamMMR } from "./utils.jsx";
import { gameMode, gateway, season, maps } from "./params";

function isLessThan30MinutesAgo(endTimeString) {
  // Convert the endTime string to a Date object
  const endTime = new Date(endTimeString);
  // Get the current time
  const currentTime = new Date();

  // Calculate the difference in milliseconds between current time and endTime
  const differenceInMilliseconds = currentTime - endTime;

  // Convert the difference to minutes
  const differenceInMinutes = differenceInMilliseconds / (1000 * 60);

  // Return true if the difference is less than 30 minutes
  return differenceInMinutes < 30;
}

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

const RecentlyFinished = () => {
  const [finishedGameData, setFinishedGameData] = useState(null);
  const [matchesData, setMatchesData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filter states
  const [mapFilter, setMapFilter] = useState("all");
  const [durationFilter, setDurationFilter] = useState(0);
  const [mmrFilter, setMmrFilter] = useState(0);

  useEffect(() => {
    fetchFinishedMatchesData();
  }, []);

  const getMatchData = async (matchId) => {
    const url = `https://website-backend.w3champions.com/api/matches/${matchId}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Failed to fetch match data");
    }
    return response.json();
  };

  const fetchFinishedMatchesData = async () => {
    try {
      const response = await fetch(`https://website-backend.w3champions.com/api/matches?offset=0&gateway=${gateway}&pageSize=50&gameMode=${gameMode}&map=Overall`);
      if (!response.ok) {
        throw new Error("Failed to fetch ongoing matches data");
      }
      const data = await response.json();

      // Filter the data
      const filteredData = data.matches.filter((match) => isLessThan30MinutesAgo(match.endTime));
      console.log("filteredData", filteredData);

      const sortedMatches = filteredData.slice().sort((a, b) => {
        const teamAMMR = calculateTeamMMR(a.teams);
        const teamBMMR = calculateTeamMMR(b.teams);
        return teamBMMR - teamAMMR;
      });

      setFinishedGameData(sortedMatches);

      // Fetch match data for each gameId in filteredData
      const matchDataPromises = sortedMatches.map((match) => getMatchData(match.id));
      const matchDataResults = await Promise.all(matchDataPromises);

      console.log("matchDataResults", matchDataResults);
      setMatchesData(matchDataResults);

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

  return (
    <>
      {isLoading ? (
        <Dimmer active>
          <Loader size="large">Loading match data...</Loader>
        </Dimmer>
      ) : matchesData ? (
        <div>
          <Navbar />
          <div className="finished-page">
            <div className="finished-header">
              <div className="finished-title-section">
                <h1 className="finished-title">Recently Finished</h1>
                <div className="finished-stats">
                  <span className="stat-item">
                    {filteredMatches.length} of {matchesData.length} games
                  </span>
                </div>
              </div>
              <div className="finished-controls">
                <div className="filter-group">
                  <label>Map</label>
                  <select
                    value={mapFilter}
                    onChange={(e) => setMapFilter(e.target.value)}
                  >
                    <option value="all">All Maps</option>
                    {availableMaps.map((mapName) => (
                      <option key={mapName} value={mapName}>
                        {maps[mapName] || mapName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="filter-group">
                  <label>Duration</label>
                  <select
                    value={durationFilter}
                    onChange={(e) => setDurationFilter(Number(e.target.value))}
                  >
                    {DURATION_RANGES.map((range, idx) => (
                      <option key={idx} value={idx}>
                        {range.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="filter-group">
                  <label>Avg MMR</label>
                  <select
                    value={mmrFilter}
                    onChange={(e) => setMmrFilter(Number(e.target.value))}
                  >
                    {MMR_RANGES.map((range, idx) => (
                      <option key={idx} value={idx}>
                        {range.label}
                      </option>
                    ))}
                  </select>
                </div>
                {hasActiveFilters && (
                  <button className="clear-filters" onClick={clearFilters}>
                    Clear
                  </button>
                )}
              </div>
            </div>
            <div className="games">
              {filteredMatches.length > 0 ? (
                filteredMatches.map((d) => (
                  <FinishedGame key={d.match.id} data={d} />
                ))
              ) : (
                <div className="no-results">
                  No matches found with current filters
                </div>
              )}
            </div>
          </div>
        </div>
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
