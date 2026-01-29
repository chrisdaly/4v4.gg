import React, { useState, useEffect, useCallback } from "react";
import Navbar from "./Navbar.jsx";
import LadderRow from "./LadderRow.jsx";
import { gateway } from "./params";
import { fetchPlayerSessionData } from "./utils";

import grandmasterIcon from "./icons/grandmaster.png";
import masterIcon from "./icons/master.png";
import diamondIcon from "./icons/diamond.png";
import platinumIcon from "./icons/platinum.png";
import goldIcon from "./icons/gold.png";
import silverIcon from "./icons/silver.png";
import bronzeIcon from "./icons/bronze.png";

const LEAGUES = [
  { id: 0, name: "Grandmaster", icon: grandmasterIcon },
  { id: 1, name: "Master", icon: masterIcon },
  { id: 2, name: "Diamond", icon: diamondIcon },
  { id: 3, name: "Platinum", icon: platinumIcon },
  { id: 4, name: "Gold", icon: goldIcon },
  { id: 5, name: "Silver", icon: silverIcon },
  { id: 6, name: "Bronze", icon: bronzeIcon },
];

const Ladder = () => {
  const [rankings, setRankings] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [selectedLeague, setSelectedLeague] = useState(0);
  const [availableSeasons, setAvailableSeasons] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sparklineData, setSparklineData] = useState({});
  const [sessionData, setSessionData] = useState({});
  const [detectedRaces, setDetectedRaces] = useState({});
  const [ongoingPlayers, setOngoingPlayers] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [sortField, setSortField] = useState("rank");
  const [sortDirection, setSortDirection] = useState("asc");

  // Fetch available seasons on mount
  useEffect(() => {
    const fetchSeasons = async () => {
      try {
        const response = await fetch(
          "https://website-backend.w3champions.com/api/ladder/seasons"
        );
        const seasons = await response.json();
        if (seasons && seasons.length > 0) {
          setAvailableSeasons(seasons);
          setSelectedSeason(seasons[0].id); // Default to latest season
        }
      } catch (e) {
        console.error("Failed to fetch seasons:", e);
        setSelectedSeason(24);
      }
    };
    fetchSeasons();
  }, []);

  // Fetch ongoing games to check who's live
  useEffect(() => {
    const fetchOngoing = async () => {
      try {
        const response = await fetch(
          "https://website-backend.w3champions.com/api/matches/ongoing?offset=0&gameMode=4"
        );
        const data = await response.json();
        const livePlayers = new Set();

        if (data?.matches) {
          data.matches.forEach((match) => {
            match.teams?.forEach((team) => {
              team.players?.forEach((player) => {
                if (player.battleTag) {
                  livePlayers.add(player.battleTag.toLowerCase());
                }
              });
            });
          });
        }
        setOngoingPlayers(livePlayers);
      } catch (e) {
        console.error("Failed to fetch ongoing games:", e);
      }
    };

    fetchOngoing();
    // Refresh ongoing status every 30 seconds
    const interval = setInterval(fetchOngoing, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch ladder data when season or league changes
  useEffect(() => {
    if (selectedSeason === null) return;

    const fetchLadder = async () => {
      setIsLoading(true);
      setSparklineData({});
      setSessionData({});
      setDetectedRaces({});

      try {
        const url = new URL(
          `https://website-backend.w3champions.com/api/ladder/${selectedLeague}?gateWay=${gateway}&gameMode=4&season=${selectedSeason}`
        );
        const response = await fetch(url);
        const result = await response.json();
        setRankings(result);

        // Batch fetch sparkline and session data for all players
        fetchPlayerData(result, selectedSeason);
      } catch (e) {
        console.error("Failed to fetch ladder:", e);
        setRankings([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLadder();
  }, [selectedSeason, selectedLeague]);

  // Batch fetch sparklines and session data for all players
  const fetchPlayerData = async (players, season) => {
    const batchSize = 5;

    for (let i = 0; i < players.length; i += batchSize) {
      const batch = players.slice(i, i + batchSize);
      const promises = batch.map(async (rank) => {
        const battleTag = rank.playersInfo[0]?.battleTag;
        // Try player.race first (actual played race), fall back to calculatedRace
        const race = rank.player?.race ?? rank.playersInfo[0]?.calculatedRace;
        if (!battleTag) return null;

        const encodedTag = battleTag.replace("#", "%23");

        // Fetch sparkline data - try all races and use the one with most data
        let sparkline = [];
        let detectedRace = race;
        try {
          const races = [1, 2, 4, 8, 0]; // Human, Orc, NE, UD, Random - prioritize specific races
          let bestData = [];
          let bestRace = race;

          for (const r of races) {
            const url = new URL(
              `https://website-backend.w3champions.com/api/players/${encodedTag}/mmr-rp-timeline`
            );
            url.search = new URLSearchParams({ gateway, season, gameMode: 4, race: r }).toString();
            const response = await fetch(url);
            const text = await response.text();

            if (text) {
              try {
                const result = JSON.parse(text);
                if (result?.mmrRpAtDates?.length > bestData.length) {
                  bestData = result.mmrRpAtDates.map((d) => d.mmr);
                  bestRace = r;
                }
              } catch (parseErr) {
                // JSON parse failed
              }
            }
          }

          sparkline = bestData;
          detectedRace = bestRace;
        } catch (e) {
          // Silently fail - sparkline will just be empty
        }

        // Fetch session data
        let session = null;
        try {
          const sessionResult = await fetchPlayerSessionData(battleTag, race);
          session = sessionResult?.session || null;
        } catch (e) {
          console.log("Failed to fetch session for", battleTag, e);
        }

        return { battleTag, sparkline, session, detectedRace };
      });

      const results = await Promise.all(promises);

      const newSparklines = {};
      const newSessions = {};
      const newRaces = {};

      results.forEach((result) => {
        if (result) {
          newSparklines[result.battleTag] = result.sparkline;
          newSessions[result.battleTag] = result.session;
          if (result.detectedRace !== undefined && result.detectedRace !== null) {
            newRaces[result.battleTag] = result.detectedRace;
          }
        }
      });

      setSparklineData((prev) => ({ ...prev, ...newSparklines }));
      setSessionData((prev) => ({ ...prev, ...newSessions }));
      setDetectedRaces((prev) => ({ ...prev, ...newRaces }));
    }
  };

  const handleSeasonChange = (e) => {
    setSelectedSeason(parseInt(e.target.value, 10));
  };

  const handleLeagueChange = (e) => {
    setSelectedLeague(parseInt(e.target.value, 10));
    // Clear search when changing league
    setSearchQuery("");
    setSearchResults(null);
  };

  // Cross-league player search
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    const searchPlayers = async () => {
      setIsSearching(true);
      try {
        // Search the W3Champions API for players
        const response = await fetch(
          `https://website-backend.w3champions.com/api/ladder/search?gateWay=${gateway}&searchFor=${encodeURIComponent(searchQuery)}&gameMode=4&season=${selectedSeason}`
        );
        const results = await response.json();
        setSearchResults(results || []);
      } catch (e) {
        console.error("Search failed:", e);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    // Debounce search
    const timeoutId = setTimeout(searchPlayers, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedSeason]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      // Default to asc for rank, desc for everything else
      setSortDirection(field === "rank" || field === "race" ? "asc" : "desc");
    }
  };

  // Use search results if searching, otherwise use current league rankings
  const displayRankings = searchResults !== null ? searchResults : rankings;

  // Helper to calculate momentum (session MMR change or sparkline trend)
  const getMomentum = (rank) => {
    const battleTag = rank.playersInfo?.[0]?.battleTag;
    const session = sessionData[battleTag];
    if (session?.mmrChange !== undefined) {
      return session.mmrChange;
    }
    // Fallback to sparkline trend (simple: last - first of recent)
    const sparkline = sparklineData[battleTag];
    if (sparkline?.length >= 2) {
      const recent = sparkline.slice(-10);
      return recent[recent.length - 1] - recent[0];
    }
    return 0;
  };

  // Helper to check if player is live
  const isPlayerLive = (rank) => {
    const battleTag = rank.playersInfo?.[0]?.battleTag;
    return battleTag && ongoingPlayers.has(battleTag.toLowerCase()) ? 1 : 0;
  };

  // Sort results
  const sortedRankings = [...displayRankings].sort((a, b) => {
    let aVal, bVal;

    switch (sortField) {
      case "rank":
        aVal = a.rankNumber;
        bVal = b.rankNumber;
        break;
      case "mmr":
        aVal = a.player?.mmr || 0;
        bVal = b.player?.mmr || 0;
        break;
      case "wins":
        aVal = a.player?.wins || 0;
        bVal = b.player?.wins || 0;
        break;
      case "losses":
        aVal = a.player?.losses || 0;
        bVal = b.player?.losses || 0;
        break;
      case "winrate":
        const aWins = a.player?.wins || 0;
        const aLosses = a.player?.losses || 0;
        const bWins = b.player?.wins || 0;
        const bLosses = b.player?.losses || 0;
        aVal = aWins + aLosses > 0 ? aWins / (aWins + aLosses) : 0;
        bVal = bWins + bLosses > 0 ? bWins / (bWins + bLosses) : 0;
        break;
      case "games":
        aVal = (a.player?.wins || 0) + (a.player?.losses || 0);
        bVal = (b.player?.wins || 0) + (b.player?.losses || 0);
        break;
      case "race":
        aVal = a.player?.race ?? a.playersInfo?.[0]?.calculatedRace ?? 99;
        bVal = b.player?.race ?? b.playersInfo?.[0]?.calculatedRace ?? 99;
        break;
      case "momentum":
        aVal = getMomentum(a);
        bVal = getMomentum(b);
        break;
      case "live":
        aVal = isPlayerLive(a);
        bVal = isPlayerLive(b);
        break;
      default:
        return 0;
    }

    return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
  });

  // Count how many players in this ladder are currently in game
  const inGameCount = rankings.filter((rank) => {
    const battleTag = rank.playersInfo?.[0]?.battleTag;
    return battleTag && ongoingPlayers.has(battleTag.toLowerCase());
  }).length;

  const currentLeague = LEAGUES.find((l) => l.id === selectedLeague);

  return (
    <div className="ladder-page">
      <Navbar />
      <div className="ladder-header">
        <div className="ladder-title-section">
          {searchResults !== null ? (
            <>
              <h1 className="ladder-title">Search Results</h1>
              <div className="ladder-stats">
                <span className="stat-item">{searchResults.length} players found</span>
              </div>
            </>
          ) : (
            <>
              <div className="ladder-league-title">
                <img src={currentLeague?.icon} alt="" className="league-icon-title" />
                <h1 className="ladder-title">{currentLeague?.name}</h1>
              </div>
              <div className="ladder-stats">
                <span className="stat-item">{rankings.length} players</span>
                {inGameCount > 0 && (
                  <span className="stat-item in-game">
                    <span className="live-dot-small"></span>
                    {inGameCount} in game
                  </span>
                )}
              </div>
            </>
          )}
        </div>
        <div className="ladder-controls">
          <div className="ladder-search">
            <input
              type="text"
              placeholder="Search all leagues..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="search-clear" onClick={() => { setSearchQuery(""); setSearchResults(null); }}>×</button>
            )}
          </div>
          <div className="ladder-selectors">
            <div className="league-selector">
              <img src={currentLeague?.icon} alt="" className="league-icon" />
              <select
                id="league-select"
                value={selectedLeague}
                onChange={handleLeagueChange}
                disabled={searchResults !== null}
              >
                {LEAGUES.map((league) => (
                  <option key={league.id} value={league.id}>
                    {league.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="season-selector">
              <select
                id="season-select"
                value={selectedSeason || ""}
                onChange={handleSeasonChange}
              >
                {availableSeasons.map((s) => (
                  <option key={s.id} value={s.id}>
                    S{s.id}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="ladder-container">
        {isLoading || isSearching ? (
          <div className="ladder-loading">
            <div className="loading-spinner"></div>
            <span>{isSearching ? "Searching..." : "Loading ladder..."}</span>
          </div>
        ) : (
          <div className="ladder-table">
            <div className="ladder-header-row">
              <div className={`col-rank sortable ${sortField === "rank" ? "active" : ""}`} onClick={() => handleSort("rank")}>Rank</div>
              <div className={`col-player sortable ${sortField === "race" ? "active" : ""}`} onClick={() => handleSort("race")}>Player</div>
              <div className={`col-mmr sortable ${sortField === "mmr" ? "active" : ""}`} onClick={() => handleSort("mmr")}>MMR</div>
              <div className={`col-record sortable ${sortField === "games" ? "active" : ""}`} onClick={() => handleSort("games")}>Record</div>
              <div className={`col-winrate sortable ${sortField === "winrate" ? "active" : ""}`} onClick={() => handleSort("winrate")}>Win%</div>
              <div className={`col-session sortable ${sortField === "momentum" ? "active" : ""}`} onClick={() => handleSort("momentum")}>Session</div>
              <div className={`col-form sortable ${sortField === "live" ? "active" : ""}`} onClick={() => handleSort("live")}>Form</div>
            </div>
            {sortedRankings.length === 0 ? (
              <div className="ladder-no-results">
                {searchResults !== null
                  ? `No players found matching "${searchQuery}"`
                  : "No players in this league"}
              </div>
            ) : (
              sortedRankings.map((rank, index) => {
                const battleTag = rank.playersInfo?.[0]?.battleTag || rank.player?.playerIds?.[0]?.battleTag;
                const isLive = battleTag && ongoingPlayers.has(battleTag.toLowerCase());

                return (
                  <LadderRow
                    key={rank.id}
                    rank={rank}
                    sparklineData={sparklineData[battleTag] || []}
                    session={sessionData[battleTag] || null}
                    detectedRace={detectedRaces[battleTag]}
                    isLive={isLive}
                    isEven={index % 2 === 0}
                  />
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Ladder;
