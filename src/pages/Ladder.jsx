import React, { useState, useEffect, useMemo, useCallback } from "react";

import LadderRow from "../components/LadderRow";
import { gateway } from "../lib/params";
import { fetchPlayerSessionData } from "../lib/utils";
import { getPlayerProfile, getPlayerTimelineMerged, getLadder, getLadderCached, getSeasons, getOngoingMatches } from "../lib/api";
import { cache } from "../lib/cache";
import { getLiveStreamers } from "../lib/twitchService";
import { LEAGUES } from "../lib/constants";
import { GiCrossedSwords } from "react-icons/gi";
import "../styles/pages/Ladder.css";

// Initialize rankings from cache for instant UI on navigation
const getInitialRankings = (leagueId, seasonId) => {
  if (!seasonId) return [];
  return getLadderCached(leagueId, seasonId) || [];
};

const Ladder = () => {
  // Try to get initial season from cache or use default
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [selectedLeague, setSelectedLeague] = useState(0);
  const [availableSeasons, setAvailableSeasons] = useState([]);

  // Initialize rankings from cache for instant UI
  const [rankings, setRankings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sparklineData, setSparklineData] = useState({});
  const [sessionData, setSessionData] = useState({});
  const [detectedRaces, setDetectedRaces] = useState({});
  const [twitchLinks, setTwitchLinks] = useState({});
  const [liveStreamers, setLiveStreamers] = useState(new Map());
  const [ongoingPlayers, setOngoingPlayers] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [sortField, setSortField] = useState("rank");
  const [sortDirection, setSortDirection] = useState("asc");

  // Fetch available seasons on mount
  useEffect(() => {
    const fetchSeasonsData = async () => {
      try {
        const seasons = await getSeasons();
        if (seasons && seasons.length > 0) {
          setAvailableSeasons(seasons);
          const latestSeason = seasons[0].id;
          setSelectedSeason(latestSeason);

          // Check if we have cached rankings for instant display
          const cachedRankings = getLadderCached(0, latestSeason);
          if (cachedRankings) {
            setRankings(cachedRankings);
            setIsLoading(false);
          }
        }
      } catch (e) {
        console.error("Failed to fetch seasons:", e);
        setSelectedSeason(24);
      }
    };
    fetchSeasonsData();
  }, []);

  // Fetch ongoing games to check who's live
  useEffect(() => {
    const fetchOngoing = async () => {
      try {
        const data = await getOngoingMatches();
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

  // Check Twitch live status for players with linked accounts
  useEffect(() => {
    const twitchNames = Object.values(twitchLinks).filter(Boolean);
    if (twitchNames.length === 0) {
      setLiveStreamers(new Map());
      return;
    }

    const checkLiveStatus = async () => {
      const live = await getLiveStreamers(twitchNames);
      setLiveStreamers(live);
    };

    checkLiveStatus();
    // Refresh live status every 60 seconds
    const interval = setInterval(checkLiveStatus, 60000);
    return () => clearInterval(interval);
  }, [twitchLinks]);

  // Fetch ladder data when season or league changes
  useEffect(() => {
    if (selectedSeason === null) return;

    const playerDataCacheKey = `ladderPlayerData:${selectedLeague}:${selectedSeason}`;

    const fetchLadderData = async () => {
      // Check cache first for instant display
      const cachedRankings = getLadderCached(selectedLeague, selectedSeason);
      const cachedPlayerData = cache.get(playerDataCacheKey);

      if (cachedRankings && cachedRankings.length > 0) {
        setRankings(cachedRankings);
        setIsLoading(false);

        // Also restore cached player data (sparklines, sessions, etc.)
        if (cachedPlayerData) {
          setSparklineData(cachedPlayerData.sparklines || {});
          setSessionData(cachedPlayerData.sessions || {});
          setDetectedRaces(cachedPlayerData.races || {});
          setTwitchLinks(cachedPlayerData.twitch || {});
        }
      } else {
        setIsLoading(true);
        setSparklineData({});
        setSessionData({});
        setDetectedRaces({});
        setTwitchLinks({});
      }

      try {
        const result = await getLadder(selectedLeague, selectedSeason);
        setRankings(result);

        // Batch fetch sparkline and session data for all players
        fetchPlayerData(result, selectedSeason, playerDataCacheKey);
      } catch (e) {
        console.error("Failed to fetch ladder:", e);
        setRankings([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLadderData();
  }, [selectedSeason, selectedLeague]);

  // Batch fetch sparklines and session data for all players
  // Now uses cached API layer to avoid redundant calls
  const fetchPlayerData = async (players, season, playerDataCacheKey) => {
    const batchSize = 5;

    // Accumulate all data for caching at the end
    const allSparklines = {};
    const allSessions = {};
    const allRaces = {};
    const allTwitch = {};

    for (let i = 0; i < players.length; i += batchSize) {
      const batch = players.slice(i, i + batchSize);
      const promises = batch.map(async (rank) => {
        const battleTag = rank.playersInfo[0]?.battleTag;
        // Use race from ladder data - no need for 5-race discovery loop
        const race = rank.player?.race ?? rank.playersInfo[0]?.calculatedRace;
        if (!battleTag) return null;

        // Fetch sparkline data using merged timeline (caches each race call)
        let sparkline = [];
        try {
          sparkline = await getPlayerTimelineMerged(battleTag, season);
        } catch (e) {
          // Silently fail - sparkline will just be empty
        }

        // Fetch session data (uses cached API internally)
        let session = null;
        try {
          const sessionResult = await fetchPlayerSessionData(battleTag, race);
          session = sessionResult?.session || null;
        } catch (e) {
          // Silently fail
        }

        // Fetch Twitch info from player profile (cached, deduplicated)
        let twitch = null;
        try {
          const profile = await getPlayerProfile(battleTag);
          twitch = profile?.twitch || null;
        } catch (e) {
          // Silently fail
        }

        return { battleTag, sparkline, session, detectedRace: race, twitch };
      });

      const results = await Promise.all(promises);

      results.forEach((result) => {
        if (result) {
          allSparklines[result.battleTag] = result.sparkline;
          allSessions[result.battleTag] = result.session;
          if (result.detectedRace !== undefined && result.detectedRace !== null) {
            allRaces[result.battleTag] = result.detectedRace;
          }
          if (result.twitch) {
            allTwitch[result.battleTag] = result.twitch;
          }
        }
      });

      // Update UI progressively
      setSparklineData((prev) => ({ ...prev, ...allSparklines }));
      setSessionData((prev) => ({ ...prev, ...allSessions }));
      setDetectedRaces((prev) => ({ ...prev, ...allRaces }));
      setTwitchLinks((prev) => ({ ...prev, ...allTwitch }));
    }

    // Cache all player data together (5 minute TTL)
    cache.set(playerDataCacheKey, {
      sparklines: allSparklines,
      sessions: allSessions,
      races: allRaces,
      twitch: allTwitch,
    }, 5 * 60 * 1000);
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

  // Sort results (memoized to avoid re-sorting on unrelated state changes)
  const sortedRankings = useMemo(() => [...displayRankings].sort((a, b) => {
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
      case "winrate": {
        const aWins = a.player?.wins || 0;
        const aLosses = a.player?.losses || 0;
        const bWins = b.player?.wins || 0;
        const bLosses = b.player?.losses || 0;
        aVal = aWins + aLosses > 0 ? aWins / (aWins + aLosses) : 0;
        bVal = bWins + bLosses > 0 ? bWins / (bWins + bLosses) : 0;
        break;
      }
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
  }), [displayRankings, sortField, sortDirection, sparklineData, ongoingPlayers]);

  // Count how many players in this ladder are currently in game
  const inGameCount = useMemo(() => rankings.filter((rank) => {
    const battleTag = rank.playersInfo?.[0]?.battleTag;
    return battleTag && ongoingPlayers.has(battleTag.toLowerCase());
  }).length, [rankings, ongoingPlayers]);

  const currentLeague = LEAGUES.find((l) => l.id === selectedLeague);

  return (
    <div className="ladder-page">
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
                    <GiCrossedSwords className="in-game-icon-small" />
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

      {isLoading || isSearching ? (
        <div className="ladder-loading">
          <div className="loader-spinner lg"></div>
          <span className="loader-text">{isSearching ? "Searching" : "Loading ladder"}</span>
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
          <div className="ladder-body">
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
                const twitchName = twitchLinks[battleTag];
                const isStreaming = twitchName && liveStreamers.has(twitchName.toLowerCase());
                const streamInfo = isStreaming ? liveStreamers.get(twitchName.toLowerCase()) : null;

                return (
                  <LadderRow
                    key={rank.id}
                    rank={rank}
                    sparklineData={sparklineData[battleTag] || []}
                    session={sessionData[battleTag] || null}
                    detectedRace={detectedRaces[battleTag]}
                    twitch={twitchName || null}
                    isStreaming={isStreaming}
                    streamInfo={streamInfo}
                    isLive={isLive}
                    isEven={index % 2 === 0}
                  />
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Ladder;
