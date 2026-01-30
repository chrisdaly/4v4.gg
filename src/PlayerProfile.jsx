import React, { useState, useEffect } from "react";
import { Flag } from "semantic-ui-react";
import { Link } from "react-router-dom";
import { Sparklines, SparklinesLine } from "react-sparklines";
import { findPlayerInOngoingMatches, getPlayerProfilePicUrl, getPlayerCountry } from "./utils.jsx";
import Navbar from "./Navbar.jsx";
import FormDots from "./FormDots.jsx";
import { gateway } from "./params.jsx";
import { GameCard, GameRow } from "./components/game";

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
  const [lastGameData, setLastGameData] = useState(null);
  const [ladderStanding, setLadderStanding] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

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
    setLastGameData(null);
    setLadderStanding(null);
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
        }
      }

      // Fetch match history (first page)
      await fetchMatches(0);

      // Fetch MMR timeline
      await fetchMmrTimeline();

      // Fetch ladder standing
      await fetchLadderStanding();

    } catch (error) {
      console.error("Error loading player data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMatches = async (page) => {
    const offset = page * GAMES_PER_PAGE;
    const matchesUrl = `https://website-backend.w3champions.com/api/matches?playerId=${encodeURIComponent(battleTag)}&offset=${offset}&gameMode=4&season=${selectedSeason}&gateway=${gateway}&pageSize=${GAMES_PER_PAGE}`;
    const matchesResponse = await fetch(matchesUrl);
    if (matchesResponse.ok) {
      const matchesData = await matchesResponse.json();
      if (matchesData.matches) {
        setMatches(matchesData.matches);
        setTotalMatches(matchesData.count || matchesData.matches.length);
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
    const sessionMatches = [];

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

    // Fetch last game details
    for (const match of matchList) {
      let playerFound = false;
      for (const team of match.teams) {
        if (team.players.find(p => p.battleTag.toLowerCase() === battleTagLower)) {
          playerFound = true;
          break;
        }
      }
      if (playerFound) {
        fetchLastGameDetails(match.id);
        break;
      }
    }
  };

  const fetchLastGameDetails = async (matchId) => {
    try {
      const url = `https://website-backend.w3champions.com/api/matches/${matchId}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setLastGameData(data);
      }
    } catch (error) {
      console.error("Error fetching last game:", error);
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
            <div className="player-pic-wrapper">
              {profilePic && <img src={profilePic} alt="" className="player-pic" />}
              {country && <Flag name={country.toLowerCase()} className="player-flag" />}
            </div>
            <div className="player-info">
              <div className="player-name-row">
                <h1 className="player-name">{playerName}</h1>
                {ongoingGame && (
                  <span className="live-dot"></span>
                )}
              </div>
              {playerData && (
                <div className="player-stats-row">
                  <span className="player-mmr">{playerData.mmr}</span>
                  <span className="player-mmr-label">MMR</span>
                  {ladderStanding && (
                    <>
                      <img src={ladderStanding.league?.icon} alt="" className="player-league-icon" />
                      <span className="player-rank">#{ladderStanding.playerRank}</span>
                    </>
                  )}
                  <span className="player-divider">|</span>
                  <span className="player-record">
                    <span className="wins">{playerData.wins}</span>
                    <span className="sep">-</span>
                    <span className="losses">{playerData.losses}</span>
                  </span>
                  <span className="player-winrate">({winrate}%)</span>
                </div>
              )}
            </div>
          </div>

          <div className="player-header-right">
            {/* Session Summary */}
            {sessionGames.length > 0 && (
              <div className="session-summary-inline">
                <span className="session-label">SESSION</span>
                <div className="session-stats">
                  <span className="session-record">{sessionWins}W-{sessionLosses}L</span>
                  <span className={`session-mmr-change ${sessionMmrChange >= 0 ? 'positive' : 'negative'}`}>
                    {sessionMmrChange >= 0 ? '+' : ''}{sessionMmrChange}
                  </span>
                </div>
                <FormDots form={sessionGames.slice().reverse().map(g => g.won)} size="small" />
              </div>
            )}

            {/* Season Selector */}
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
            {/* Current/Last Game Section */}
            {ongoingGame ? (
              <section className="current-game-section">
                <h2 className="section-title">Current Game</h2>
                <GameCard
                  game={ongoingGame}
                  status="live"
                  size="expanded"
                  playerBattleTag={battleTag}
                />
              </section>
            ) : lastGameData ? (
              <section className="last-game-section">
                <h2 className="section-title">Last Game</h2>
                <GameCard
                  game={lastGameData}
                  playerBattleTag={battleTag}
                />
              </section>
            ) : null}

            {/* Recent Games Section */}
            {sessionGames.length > 1 && (
              <section className="recent-games-section">
                <h2 className="section-title">Session Games ({sessionGames.length})</h2>
                <div className="recent-games-grid">
                  {sessionGames.map((game, idx) => (
                    <GameCard
                      key={game.id || idx}
                      game={game}
                      size="mini"
                      status={game.won ? "won" : "lost"}
                      playerBattleTag={battleTag}
                    />
                  ))}
                </div>
              </section>
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
                  <div className="mh-col mmr">MMR</div>
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
            {sessionGames.length > 0 && (
              <div className="session-card">
                <h3 className="sc-title">Session Summary</h3>
                <div className="sc-stats">
                  <div className="sc-stat">
                    <span className="sc-label">Games</span>
                    <span className="sc-value">{sessionGames.length}</span>
                  </div>
                  <div className="sc-stat">
                    <span className="sc-label">Record</span>
                    <span className="sc-value">{sessionWins}W-{sessionLosses}L</span>
                  </div>
                  <div className="sc-stat">
                    <span className="sc-label">MMR Change</span>
                    <span className={`sc-value ${sessionMmrChange >= 0 ? 'positive' : 'negative'}`}>
                      {sessionMmrChange >= 0 ? '+' : ''}{sessionMmrChange}
                    </span>
                  </div>
                </div>
                <div className="sc-form">
                  <FormDots form={sessionGames.slice().reverse().map(g => g.won)} size="medium" />
                </div>
              </div>
            )}

            {/* MMR Sparkline */}
            {seasonMmrs.length > 2 && (
              <div className="mmr-chart-card">
                <h3 className="mcc-title">Season {selectedSeason} MMR</h3>
                <div className="mcc-stats">
                  <div className="mcc-stat">
                    <span className="mcc-label">Low</span>
                    <span className="mcc-value low">{Math.min(...seasonMmrs)}</span>
                  </div>
                  <div className="mcc-stat">
                    <span className="mcc-label">Current</span>
                    <span className="mcc-value">{seasonMmrs[seasonMmrs.length - 1]}</span>
                  </div>
                  <div className="mcc-stat">
                    <span className="mcc-label">Peak</span>
                    <span className="mcc-value high">{Math.max(...seasonMmrs)}</span>
                  </div>
                </div>
                <div className="mcc-chart">
                  <Sparklines data={seasonMmrs} svgWidth={250} svgHeight={60} margin={5}>
                    <SparklinesLine style={{ strokeWidth: 2, stroke: "var(--gold)", fill: "rgba(252, 219, 51, 0.1)" }} />
                  </Sparklines>
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
