import React, { useState, useEffect } from "react";
import { Flag } from "semantic-ui-react";
import { Link } from "react-router-dom";
import { findPlayerInOngoingMatches, getPlayerProfilePicUrl, getPlayerCountry } from "./utils.jsx";
import Navbar from "./Navbar.jsx";
import FormDots from "./FormDots.jsx";
import { gateway } from "./params.jsx";
import { GameRow } from "./components/game";
import ActivityGraph from "./components/ActivityGraph";
import OngoingGame from "./OngoingGame";

import human from "./icons/human.svg";
import orc from "./icons/orc.svg";
import elf from "./icons/elf.svg";
import undead from "./icons/undead.svg";
import random from "./icons/random.svg";

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

const raceMapping = { 8: undead, 0: random, 4: elf, 2: orc, 1: human };

const GAMES_PER_PAGE = 20;

const MIN_GAMES_FOR_STATS = 3;

const PlayerProfile = () => {
  // Core data
  const [playerData, setPlayerData] = useState(null);
  const [profilePic, setProfilePic] = useState(null);
  const [country, setCountry] = useState(null);
  const [matches, setMatches] = useState([]);
  const [totalMatches, setTotalMatches] = useState(0);
  const [sessionGames, setSessionGames] = useState([]);
  const [seasonMmrs, setSeasonMmrs] = useState([]);
  const [ongoingGame, setOngoingGame] = useState(null);
  const [ladderStanding, setLadderStanding] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Best/worst allies and maps stats
  const [allyStats, setAllyStats] = useState([]);
  const [worstAllyStats, setWorstAllyStats] = useState([]);
  const [mapStats, setMapStats] = useState([]);
  const [worstMapStats, setWorstMapStats] = useState([]);
  const [nemesisStats, setNemesisStats] = useState([]);

  // Season state
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [availableSeasons, setAvailableSeasons] = useState([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);

  const SESSION_GAP_MINUTES = 60;

  // Extract battleTag from URL
  const getBattleTag = () => {
    const pageUrl = new URL(window.location.href);
    return decodeURIComponent(pageUrl.pathname.split("/").slice(-1)[0]);
  };

  const battleTag = getBattleTag();
  const battleTagLower = battleTag.toLowerCase();
  const playerName = battleTag.split("#")[0];

  // Fetch available seasons on mount
  useEffect(() => {
    const fetchSeasons = async () => {
      try {
        const response = await fetch("https://website-backend.w3champions.com/api/ladder/seasons");
        const seasons = await response.json();
        if (seasons && seasons.length > 0) {
          setAvailableSeasons(seasons);
          setSelectedSeason(seasons[0].id);
        }
      } catch (e) {
        console.error("Failed to fetch seasons:", e);
        setSelectedSeason(24);
      }
    };
    fetchSeasons();
  }, []);

  // Reset and reload when battleTag or season changes
  useEffect(() => {
    if (selectedSeason === null) return;

    setPlayerData(null);
    setProfilePic(null);
    setCountry(null);
    setMatches([]);
    setTotalMatches(0);
    setSessionGames([]);
    setSeasonMmrs([]);
    setOngoingGame(null);
    setLadderStanding(null);
    setAllyStats([]);
    setWorstAllyStats([]);
    setMapStats([]);
    setWorstMapStats([]);
    setNemesisStats([]);
    setCurrentPage(0);
    setIsLoading(true);

    loadAllData();
    fetchOngoingGames();

    const interval = setInterval(fetchOngoingGames, 30000);
    return () => clearInterval(interval);
  }, [battleTag, selectedSeason]);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [pic, playerCountry] = await Promise.all([
        getPlayerProfilePicUrl(battleTag),
        getPlayerCountry(battleTag),
      ]);

      setProfilePic(pic);
      setCountry(playerCountry);

      // Fetch player stats
      const statsUrl = `https://website-backend.w3champions.com/api/players/${encodeURIComponent(battleTag)}/game-mode-stats?gateway=${gateway}&season=${selectedSeason}`;
      const statsResponse = await fetch(statsUrl);
      if (statsResponse.ok) {
        const stats = await statsResponse.json();
        const fourVsFourStats = stats.find(s => s.gameMode === 4);
        if (fourVsFourStats) {
          setPlayerData(fourVsFourStats);
          // Set total matches from player stats (wins + losses)
          setTotalMatches((fourVsFourStats.wins || 0) + (fourVsFourStats.losses || 0));
        }
      }

      // Fetch match history (first page)
      await fetchMatches(0);

      // Fetch MMR timeline
      await fetchMmrTimeline();

      // Fetch ladder standing
      await fetchLadderStanding();

      // Fetch statistics for allies and maps
      await fetchStatistics();

    } catch (error) {
      console.error("Error loading player data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMatches = async (page) => {
    const offset = page * GAMES_PER_PAGE;
    // Use /api/matches/search which properly filters by playerId
    const matchesUrl = `https://website-backend.w3champions.com/api/matches/search?playerId=${encodeURIComponent(battleTag)}&offset=${offset}&gameMode=4&season=${selectedSeason}&gateway=${gateway}&pageSize=${GAMES_PER_PAGE}`;
    const matchesResponse = await fetch(matchesUrl);
    if (matchesResponse.ok) {
      const matchesData = await matchesResponse.json();
      if (matchesData.matches) {
        setMatches(matchesData.matches);
        // /api/matches/search doesn't return count, so derive from player stats
        // totalMatches will be set from playerData.wins + playerData.losses
        if (page === 0) {
          processMatchData(matchesData.matches);
        }
      }
    }
  };

  const fetchMmrTimeline = async () => {
    const races = [0, 1, 2, 4, 8];
    let allPoints = [];

    for (const race of races) {
      try {
        const url = `https://website-backend.w3champions.com/api/players/${encodeURIComponent(battleTag)}/mmr-rp-timeline?gateway=${gateway}&season=${selectedSeason}&race=${race}&gameMode=4`;
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          if (data.mmrRpAtDates) {
            allPoints = [...allPoints, ...data.mmrRpAtDates];
          }
        }
      } catch (e) {}
    }

    const uniqueByDate = {};
    for (const point of allPoints) {
      uniqueByDate[point.date] = point;
    }
    const sorted = Object.values(uniqueByDate).sort((a, b) => new Date(a.date) - new Date(b.date));
    setSeasonMmrs(sorted.map(d => d.mmr));
  };

  const processMatchData = (matchList) => {
    if (!matchList || matchList.length === 0) return;

    const sessionGapMs = SESSION_GAP_MINUTES * 60 * 1000;
    const sessionMaxAgeMs = 2 * 60 * 60 * 1000; // Only show session if most recent game is within 2 hours
    const sessionMatches = [];

    // Check if the most recent game is recent enough to be an "active" session
    const mostRecentEndTime = new Date(matchList[0]?.endTime);
    const now = new Date();
    const timeSinceLastGame = now - mostRecentEndTime;

    if (timeSinceLastGame > sessionMaxAgeMs) {
      // Session is too old, don't show it
      setSessionGames([]);
    } else {
      for (let i = 0; i < matchList.length; i++) {
        const match = matchList[i];

        let playerInMatch = null;
        let playerWon = false;
        for (const team of match.teams) {
          const player = team.players.find(p => p.battleTag.toLowerCase() === battleTagLower);
          if (player) {
            playerInMatch = player;
            playerWon = player.won;
            break;
          }
        }
        if (!playerInMatch) continue;

        if (i > 0) {
          const prevEndTime = new Date(matchList[i - 1].endTime);
          const thisEndTime = new Date(match.endTime);
          const gapMs = prevEndTime - thisEndTime;
          if (gapMs > sessionGapMs) break;
        }

        sessionMatches.push({
          ...match,
          playerData: playerInMatch,
          won: playerWon,
        });
      }

      setSessionGames(sessionMatches);
    }

  };

  const fetchOngoingGames = async () => {
    try {
      const ongoingResponse = await fetch("https://website-backend.w3champions.com/api/matches/ongoing");
      const ongoingResult = await ongoingResponse.json();
      const game = findPlayerInOngoingMatches(ongoingResult, battleTag);
      setOngoingGame(game);
    } catch (error) {
      console.error("Error fetching ongoing games:", error);
    }
  };

  const fetchLadderStanding = async () => {
    try {
      const searchUrl = `https://website-backend.w3champions.com/api/ladder/search?gateWay=${gateway}&searchFor=${encodeURIComponent(battleTag.split("#")[0])}&gameMode=4&season=${selectedSeason}`;
      const searchResponse = await fetch(searchUrl);
      if (!searchResponse.ok) return;

      const searchResults = await searchResponse.json();
      const playerResult = searchResults.find(r => {
        const tag1 = r.playersInfo?.[0]?.battleTag?.toLowerCase();
        const tag2 = r.player?.playerIds?.[0]?.battleTag?.toLowerCase();
        return tag1 === battleTagLower || tag2 === battleTagLower;
      });

      if (!playerResult) return;

      const leagueId = playerResult.league;
      const league = LEAGUES.find(l => l.id === leagueId);

      const ladderUrl = `https://website-backend.w3champions.com/api/ladder/${leagueId}?gateWay=${gateway}&gameMode=4&season=${selectedSeason}`;
      const ladderResponse = await fetch(ladderUrl);
      if (!ladderResponse.ok) return;

      const ladderData = await ladderResponse.json();
      const playerIndex = ladderData.findIndex(
        r => r.playersInfo?.[0]?.battleTag?.toLowerCase() === battleTagLower
      );

      if (playerIndex === -1) return;

      // Get 2 players above and 2 below
      const startIdx = Math.max(0, playerIndex - 2);
      const endIdx = Math.min(ladderData.length, playerIndex + 3);
      const neighbors = ladderData.slice(startIdx, endIdx);

      setLadderStanding({
        league,
        leagueId,
        playerRank: playerResult.rankNumber,
        playerIndex,
        neighbors,
        totalInLeague: ladderData.length,
      });
    } catch (error) {
      console.error("Error fetching ladder standing:", error);
    }
  };

  const fetchStatistics = async () => {
    try {
      // Fetch 100 matches for statistics calculation
      const statsUrl = `https://website-backend.w3champions.com/api/matches/search?playerId=${encodeURIComponent(battleTag)}&offset=0&gameMode=4&season=${selectedSeason}&gateway=${gateway}&pageSize=100`;
      const response = await fetch(statsUrl);
      if (!response.ok) return;

      const data = await response.json();
      if (!data.matches || data.matches.length === 0) return;

      // Calculate ally stats
      const allies = {};
      // Calculate map stats
      const maps = {};
      // Calculate opponent stats (for nemesis)
      const opponents = {};

      for (const match of data.matches) {
        // Find player's team and opponent team
        let playerTeam = null;
        let opponentTeam = null;
        let playerWon = false;

        for (const team of match.teams) {
          const player = team.players.find(p => p.battleTag.toLowerCase() === battleTagLower);
          if (player) {
            playerTeam = team;
            playerWon = player.won;
          } else {
            opponentTeam = team;
          }
        }

        if (!playerTeam) continue;

        // Aggregate ally stats (teammates on player's team)
        for (const teammate of playerTeam.players) {
          if (teammate.battleTag.toLowerCase() === battleTagLower) continue;

          const tag = teammate.battleTag;
          if (!allies[tag]) {
            allies[tag] = { battleTag: tag, name: teammate.name, wins: 0, losses: 0, total: 0 };
          }
          allies[tag].total += 1;
          if (playerWon) {
            allies[tag].wins += 1;
          } else {
            allies[tag].losses += 1;
          }
        }

        // Aggregate opponent stats (for nemesis - who we lose to most)
        if (opponentTeam) {
          for (const opponent of opponentTeam.players) {
            const tag = opponent.battleTag;
            if (!opponents[tag]) {
              opponents[tag] = { battleTag: tag, name: opponent.name, wins: 0, losses: 0, total: 0 };
            }
            opponents[tag].total += 1;
            if (playerWon) {
              opponents[tag].losses += 1; // Our win = their loss
            } else {
              opponents[tag].wins += 1; // Our loss = their win (they beat us)
            }
          }
        }

        // Aggregate map stats - use mapName and clean it
        const rawMapName = match.mapName;
        if (rawMapName) {
          // Clean map name: remove "(4) " prefix
          const cleanMapName = rawMapName.replace(/^\(\d\)\s*/, "");
          if (!maps[cleanMapName]) {
            maps[cleanMapName] = { name: cleanMapName, wins: 0, losses: 0, total: 0 };
          }
          maps[cleanMapName].total += 1;
          if (playerWon) {
            maps[cleanMapName].wins += 1;
          } else {
            maps[cleanMapName].losses += 1;
          }
        }
      }

      // Process allies with win rates
      const alliesWithRates = Object.values(allies)
        .filter(a => a.total >= MIN_GAMES_FOR_STATS)
        .map(a => ({ ...a, winRate: Math.round((a.wins / a.total) * 100) }));

      // Best allies: highest win rate
      const bestAllies = [...alliesWithRates]
        .sort((a, b) => b.winRate - a.winRate || b.total - a.total)
        .slice(0, 3);

      // Worst allies: lowest win rate (with at least some losses)
      const worstAllies = [...alliesWithRates]
        .filter(a => a.losses > 0)
        .sort((a, b) => a.winRate - b.winRate || b.total - a.total)
        .slice(0, 3);

      // Process maps with win rates
      const mapsWithRates = Object.values(maps)
        .filter(m => m.total >= MIN_GAMES_FOR_STATS)
        .map(m => ({ ...m, winRate: Math.round((m.wins / m.total) * 100) }));

      // Best maps: highest win rate
      const bestMaps = [...mapsWithRates]
        .sort((a, b) => b.winRate - a.winRate || b.total - a.total)
        .slice(0, 5);

      // Worst maps: lowest win rate
      const worstMaps = [...mapsWithRates]
        .filter(m => m.losses > 0)
        .sort((a, b) => a.winRate - b.winRate || b.total - a.total)
        .slice(0, 3);

      // Nemesis: opponents who beat us most (sort by their wins against us)
      const nemesisList = Object.values(opponents)
        .filter(o => o.total >= MIN_GAMES_FOR_STATS && o.wins > 0)
        .map(o => ({ ...o, winRate: Math.round((o.wins / o.total) * 100) }))
        .sort((a, b) => b.wins - a.wins || b.winRate - a.winRate)
        .slice(0, 3);

      setAllyStats(bestAllies);
      setWorstAllyStats(worstAllies);
      setMapStats(bestMaps);
      setWorstMapStats(worstMaps);
      setNemesisStats(nemesisList);
    } catch (error) {
      console.error("Error fetching statistics:", error);
    }
  };

  const handleSeasonChange = (e) => {
    setSelectedSeason(parseInt(e.target.value, 10));
  };

  const handlePageChange = async (newPage) => {
    setCurrentPage(newPage);
    await fetchMatches(newPage);
    window.scrollTo({ top: document.querySelector('.match-history-section')?.offsetTop - 100 || 0, behavior: 'smooth' });
  };

  if (isLoading) {
    return (
      <div className="player-page">
        <Navbar />
        <div className="player-loading">
          <div className="loading-spinner"></div>
          <span>Loading player data...</span>
        </div>
      </div>
    );
  }

  // Calculate derived stats
  const sessionWins = sessionGames.filter(g => g.won).length;
  const sessionLosses = sessionGames.length - sessionWins;
  const sessionMmrChange = sessionGames.length > 0
    ? (sessionGames[0].playerData?.currentMmr || 0) - (sessionGames[sessionGames.length - 1].playerData?.oldMmr || 0)
    : 0;
  const winrate = playerData && (playerData.wins + playerData.losses) > 0
    ? Math.round((playerData.wins / (playerData.wins + playerData.losses)) * 100)
    : 0;
  const totalPages = Math.ceil(totalMatches / GAMES_PER_PAGE);

  return (
    <div className="player-page">
      <Navbar />

      <div className="player-container">
        {/* Player Header */}
        <header className="player-header">
          <div className="player-header-left">
            <div className="hd-pic-wrapper">
              {profilePic && <img src={profilePic} alt="" className="hd-pic" />}
              {country && <Flag name={country.toLowerCase()} className="hd-flag" />}
            </div>
            <div className="hd-info">
              <div className="hd-name-row">
                <span className="hd-name">{playerName}</span>
                {ongoingGame && <span className="hd-live-dot"></span>}
              </div>
              {playerData && (
                <>
                  <div className="hd-stats-row">
                    {ladderStanding && (
                      <span className="hd-rank">#{ladderStanding.playerRank}</span>
                    )}
                    <span className="hd-mmr">{playerData.mmr}</span>
                    <span className="hd-mmr-label">MMR</span>
                  </div>
                  <div className="hd-record-row">
                    <span className="hd-wins">{playerData.wins}W</span>
                    <span className="hd-losses">-{playerData.losses}L</span>
                    <span className="hd-sep">·</span>
                    <span className="hd-winrate">{winrate}%</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="player-header-right">
            <div className="season-selector">
              <select value={selectedSeason || ""} onChange={handleSeasonChange}>
                {availableSeasons.map((s) => (
                  <option key={s.id} value={s.id}>
                    S{s.id}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </header>

        <div className="player-content">
          {/* Main Content */}
          <main className="player-main">
            {/* Live Game Section */}
            {ongoingGame && (
              <div className="live-game-section">
                <OngoingGame
                  ongoingGameData={ongoingGame}
                  compact={true}
                  streamerTag={battleTag}
                />
              </div>
            )}

            {/* Match History Table */}
            <section className="match-history-section">
              <div className="section-header">
                <h2 className="section-title">Match History</h2>
                <span className="match-count">{totalMatches} games</span>
              </div>

              <div className="match-history-table">
                <div className="mh-header">
                  <div className="mh-col result">Result</div>
                  <div className="mh-col map">Map</div>
                  <div className="mh-col avg-mmr">Avg MMR</div>
                  <div className="mh-col mmr">+/-</div>
                  <div className="mh-col allies">Allies</div>
                  <div className="mh-col duration">Duration</div>
                  <div className="mh-col time">Time</div>
                </div>
                {matches.map((match, idx) => (
                  <GameRow
                    key={match.id}
                    game={match}
                    playerBattleTag={battleTag}
                    striped={idx % 2 === 1}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="pagination">
                  <button
                    className="page-btn"
                    disabled={currentPage === 0}
                    onClick={() => handlePageChange(currentPage - 1)}
                  >
                    Prev
                  </button>
                  <div className="page-numbers">
                    {[...Array(Math.min(5, totalPages))].map((_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i;
                      } else if (currentPage < 3) {
                        pageNum = i;
                      } else if (currentPage > totalPages - 4) {
                        pageNum = totalPages - 5 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          className={`page-num ${currentPage === pageNum ? 'active' : ''}`}
                          onClick={() => handlePageChange(pageNum)}
                        >
                          {pageNum + 1}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    className="page-btn"
                    disabled={currentPage >= totalPages - 1}
                    onClick={() => handlePageChange(currentPage + 1)}
                  >
                    Next
                  </button>
                </div>
              )}
            </section>
          </main>

          {/* Sidebar */}
          <aside className="player-sidebar">
            {/* Ladder Standing */}
            {ladderStanding && (
              <div className="ladder-standing">
                <div className="ls-header">
                  <img src={ladderStanding.league?.icon} alt="" className="ls-league-icon" />
                  <span className="ls-league-name">{ladderStanding.league?.name}</span>
                </div>
                <div className="ls-list">
                  {ladderStanding.neighbors.map((n) => {
                    const isMe = n.playersInfo?.[0]?.battleTag?.toLowerCase() === battleTagLower;
                    const nTag = n.playersInfo?.[0]?.battleTag;
                    return (
                      <Link
                        key={n.id}
                        to={isMe ? '#' : `/player/${encodeURIComponent(nTag)}`}
                        className={`ls-row ${isMe ? 'me' : ''}`}
                        onClick={e => isMe && e.preventDefault()}
                      >
                        <span className="ls-rank">#{n.rankNumber}</span>
                        <img src={raceMapping[n.playersInfo?.[0]?.calculatedRace]} alt="" className="ls-race" />
                        <span className="ls-name">{n.player?.name}</span>
                        <span className="ls-mmr">{n.player?.mmr}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Session Summary Card */}
            {sessionGames.length > 0 && (() => {
              // Calculate session duration (oldest game start to newest game end)
              const oldestGame = sessionGames[sessionGames.length - 1];
              const newestGame = sessionGames[0];
              const sessionStart = oldestGame?.startTime ? new Date(oldestGame.startTime) : null;
              const sessionEnd = newestGame?.endTime ? new Date(newestGame.endTime) : null;

              let sessionDuration = null;
              if (sessionStart && sessionEnd) {
                const durationMs = sessionEnd - sessionStart;
                const hours = Math.floor(durationMs / (1000 * 60 * 60));
                const mins = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
                sessionDuration = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
              }

              return (
                <div className="session-card">
                  <h3 className="sc-title">Session Summary</h3>
                  <div className="sc-stats">
                    <div className="sc-stat">
                      <span className="sc-label">Duration</span>
                      <span className="sc-value">{sessionDuration || `${sessionGames.length} games`}</span>
                    </div>
                    <div className="sc-stat">
                      <span className="sc-label">Record</span>
                      <span className="sc-value">{sessionWins}W-{sessionLosses}L</span>
                    </div>
                    <div className="sc-stat">
                      <span className="sc-label">MMR</span>
                      <span className={`sc-value ${sessionMmrChange >= 0 ? 'positive' : 'negative'}`}>
                        {sessionMmrChange >= 0 ? '+' : ''}{sessionMmrChange}
                      </span>
                    </div>
                  </div>
                  <div className="sc-form">
                    <FormDots form={sessionGames.slice().reverse().map(g => g.won)} size="medium" />
                  </div>
                </div>
              );
            })()}

            {/* MMR Thermometer */}
            {seasonMmrs.length > 2 && (() => {
              const low = Math.min(...seasonMmrs);
              const peak = Math.max(...seasonMmrs);
              const current = seasonMmrs[seasonMmrs.length - 1];
              const range = peak - low;
              const position = range > 0 ? ((current - low) / range) * 100 : 50;
              return (
                <div className="mmr-thermometer-card">
                  <h3 className="mtc-title">Season {selectedSeason} MMR</h3>
                  <div className="mtc-bar">
                    <div className="mtc-bar-track">
                      <div className="mtc-bar-marker" style={{ left: `${position}%` }} />
                    </div>
                    <div className="mtc-bar-labels">
                      <div className="mtc-label-group">
                        <span className="mtc-value low">{low}</span>
                        <span className="mtc-label">LOW</span>
                      </div>
                      <div className="mtc-label-group current">
                        <span className="mtc-value">{current}</span>
                        <span className="mtc-label">CURRENT</span>
                      </div>
                      <div className="mtc-label-group">
                        <span className="mtc-value high">{peak}</span>
                        <span className="mtc-label">PEAK</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Activity Graph */}
            <ActivityGraph
              battleTag={battleTag}
              currentSeason={selectedSeason}
              gateway={gateway}
            />

            {/* Best Allies */}
            {allyStats.length > 0 && (
              <div className="best-allies-card">
                <h3 className="bac-title">Best Allies</h3>
                <div className="bac-list">
                  {allyStats.map((ally, idx) => (
                    <Link
                      key={ally.battleTag}
                      to={`/player/${encodeURIComponent(ally.battleTag)}`}
                      className="bac-row"
                    >
                      <span className="bac-rank">#{idx + 1}</span>
                      <span className="bac-name">{ally.name}</span>
                      <span className="bac-stats">
                        <span className="bac-winrate">{ally.winRate}%</span>
                        <span className="bac-record">({ally.wins}W-{ally.losses}L)</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Best Maps */}
            {mapStats.length > 0 && (
              <div className="best-maps-card">
                <h3 className="bmc-title">Best Maps</h3>
                <div className="bmc-list">
                  {mapStats.map((map, idx) => (
                    <div key={map.name} className="bmc-row">
                      <span className="bmc-rank">#{idx + 1}</span>
                      <span className="bmc-name">{map.name}</span>
                      <span className="bmc-stats">
                        <span className="bmc-winrate">{map.winRate}%</span>
                        <span className="bmc-record">({map.wins}W-{map.losses}L)</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Worst Allies */}
            {worstAllyStats.length > 0 && (
              <div className="worst-allies-card">
                <h3 className="wac-title">Worst Allies</h3>
                <div className="wac-list">
                  {worstAllyStats.map((ally, idx) => (
                    <Link
                      key={ally.battleTag}
                      to={`/player/${encodeURIComponent(ally.battleTag)}`}
                      className="wac-row"
                    >
                      <span className="wac-rank">#{idx + 1}</span>
                      <span className="wac-name">{ally.name}</span>
                      <span className="wac-stats">
                        <span className="wac-winrate">{ally.winRate}%</span>
                        <span className="wac-record">({ally.wins}W-{ally.losses}L)</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Worst Maps */}
            {worstMapStats.length > 0 && (
              <div className="worst-maps-card">
                <h3 className="wmc-title">Worst Maps</h3>
                <div className="wmc-list">
                  {worstMapStats.map((map, idx) => (
                    <div key={map.name} className="wmc-row">
                      <span className="wmc-rank">#{idx + 1}</span>
                      <span className="wmc-name">{map.name}</span>
                      <span className="wmc-stats">
                        <span className="wmc-winrate">{map.winRate}%</span>
                        <span className="wmc-record">({map.wins}W-{map.losses}L)</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Nemesis */}
            {nemesisStats.length > 0 && (
              <div className="nemesis-card">
                <h3 className="nc-title">Nemesis</h3>
                <div className="nc-list">
                  {nemesisStats.map((enemy, idx) => {
                    // Calculate YOUR win rate against them (inverse of their wins against you)
                    const yourWinRate = enemy.total > 0 ? Math.round((enemy.losses / enemy.total) * 100) : 0;
                    return (
                      <Link
                        key={enemy.battleTag}
                        to={`/player/${encodeURIComponent(enemy.battleTag)}`}
                        className="nc-row"
                      >
                        <span className="nc-rank">#{idx + 1}</span>
                        <span className="nc-name">{enemy.name}</span>
                        <span className="nc-stats">
                          <span className="nc-winrate">{yourWinRate}%</span>
                          <span className="nc-record">({enemy.losses}W-{enemy.wins}L)</span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

          </aside>
        </div>
      </div>
    </div>
  );
};

export default PlayerProfile;
