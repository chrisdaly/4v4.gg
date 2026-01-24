import React, { useState, useEffect } from "react";
import { Flag } from "semantic-ui-react";
import { Sparklines, SparklinesLine, SparklinesReferenceLine } from "react-sparklines";
import { findPlayerInOngoingMatches, getPlayerProfilePicUrl, getPlayerCountry } from "./utils.jsx";
import OnGoingGame from "./OngoingGame.jsx";
import FinishedGame from "./FinishedGame.jsx";
import FormDots from "./FormDots.jsx";
import { MmrComparison } from "./MmrComparison.jsx";
import { gateway, season } from "./params.jsx";
import human from "./icons/human.svg";
import orc from "./icons/orc.svg";
import elf from "./icons/elf.svg";
import undead from "./icons/undead.svg";
import random from "./icons/random.svg";

const raceMapping = { 8: undead, 0: random, 4: elf, 2: orc, 1: human };

// Map images stored locally in /public/maps/
const getMapImageUrl = (mapName) => {
  if (!mapName) return null;
  // Strip parentheses prefix like "(4)", spaces, and apostrophes
  const cleanName = mapName.replace(/^\(\d\)/, "").replace(/ /g, "").replace(/'/g, "");
  return `/maps/${cleanName}.png`;
};

const PlayerProfile = () => {
  const [playerData, setPlayerData] = useState(null);
  const [profilePic, setProfilePic] = useState(null);
  const [country, setCountry] = useState(null);
  const [matches, setMatches] = useState([]);
  const [sessionGames, setSessionGames] = useState([]);
  const [seasonMmrs, setSeasonMmrs] = useState([]);
  const [ongoingGame, setOngoingGame] = useState(null);
  const [mapStats, setMapStats] = useState({});
  const [teammateStats, setTeammateStats] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
  const [lastGameData, setLastGameData] = useState(null);
  const [expandedGameId, setExpandedGameId] = useState(null);
  const [expandedGameData, setExpandedGameData] = useState(null);

  const SESSION_GAP_MINUTES = 60;

  // Extract battleTag from URL
  const getBattleTag = () => {
    const pageUrl = new URL(window.location.href);
    return decodeURIComponent(pageUrl.pathname.split("/").slice(-1)[0]);
  };

  const battleTag = getBattleTag();
  const battleTagLower = battleTag.toLowerCase();
  const playerName = battleTag.split("#")[0];

  useEffect(() => {
    loadAllData();
    fetchOngoingGames();

    const interval = setInterval(fetchOngoingGames, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      // Fetch all data in parallel
      const [pic, playerCountry] = await Promise.all([
        getPlayerProfilePicUrl(battleTag),
        getPlayerCountry(battleTag),
      ]);

      setProfilePic(pic);
      setCountry(playerCountry);

      // Fetch player stats
      const statsUrl = `https://website-backend.w3champions.com/api/players/${encodeURIComponent(battleTag)}/game-mode-stats?gateway=${gateway}&season=${season}`;
      const statsResponse = await fetch(statsUrl);
      if (statsResponse.ok) {
        const stats = await statsResponse.json();
        const fourVsFourStats = stats.find(s => s.gameMode === 4);
        if (fourVsFourStats) {
          setPlayerData(fourVsFourStats);
        }
      }

      // Fetch match history
      const matchesUrl = `https://website-backend.w3champions.com/api/matches?playerId=${encodeURIComponent(battleTag)}&offset=0&gameMode=4&season=${season}&gateway=${gateway}&pageSize=50`;
      const matchesResponse = await fetch(matchesUrl);
      if (matchesResponse.ok) {
        const matchesData = await matchesResponse.json();
        if (matchesData.matches) {
          setMatches(matchesData.matches);
          processMatchData(matchesData.matches);
        }
      }

      // Fetch MMR timeline
      await fetchMmrTimeline();

    } catch (error) {
      console.error("Error loading player data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMmrTimeline = async () => {
    const races = [0, 1, 2, 4, 8];
    let allPoints = [];

    for (const race of races) {
      try {
        const url = `https://website-backend.w3champions.com/api/players/${encodeURIComponent(battleTag)}/mmr-rp-timeline?gateway=${gateway}&season=${season}&race=${race}&gameMode=4`;
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          if (data.mmrRpAtDates) {
            allPoints = [...allPoints, ...data.mmrRpAtDates];
          }
        }
      } catch (e) {}
    }

    // Dedupe by date and sort
    const uniqueByDate = {};
    for (const point of allPoints) {
      uniqueByDate[point.date] = point;
    }
    const sorted = Object.values(uniqueByDate).sort((a, b) => new Date(a.date) - new Date(b.date));
    setSeasonMmrs(sorted.map(d => d.mmr));
  };

  const processMatchData = (matchList) => {
    if (!matchList || matchList.length === 0) return;

    // Detect session games
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

    // Fetch last game details (most recent game, regardless of session)
    if (matchList.length > 0) {
      fetchLastGameDetails(matchList[0].id);
    }

    // Calculate map stats
    const mapData = {};
    for (const match of matchList) {
      const mapName = match.mapName || 'Unknown';
      if (!mapData[mapName]) {
        mapData[mapName] = { wins: 0, losses: 0 };
      }

      for (const team of match.teams) {
        const player = team.players.find(p => p.battleTag.toLowerCase() === battleTagLower);
        if (player) {
          // Check if player won (handle both boolean and truthy values)
          const won = player.won === true || player.won === 1;
          if (won) {
            mapData[mapName].wins++;
          } else {
            mapData[mapName].losses++;
          }
          break;
        }
      }
    }
    setMapStats(mapData);

    // Calculate teammate stats
    const teammateData = {};
    for (const match of matchList) {
      for (const team of match.teams) {
        const player = team.players.find(p => p.battleTag.toLowerCase() === battleTagLower);
        if (player) {
          const won = player.won === true || player.won === 1;
          // Found player's team, get teammates
          for (const teammate of team.players) {
            if (teammate.battleTag.toLowerCase() !== battleTagLower) {
              const tag = teammate.battleTag;
              if (!teammateData[tag]) {
                teammateData[tag] = { name: teammate.name, wins: 0, losses: 0, games: 0 };
              }
              teammateData[tag].games++;
              if (won) {
                teammateData[tag].wins++;
              } else {
                teammateData[tag].losses++;
              }
            }
          }
          break;
        }
      }
    }

    // Sort by games played
    const sortedTeammates = Object.entries(teammateData)
      .map(([tag, data]) => ({ battleTag: tag, ...data }))
      .sort((a, b) => b.games - a.games)
      .slice(0, 10);
    setTeammateStats(sortedTeammates);
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

  const handleExpandGame = async (gameId) => {
    if (expandedGameId === gameId) {
      // Collapse if already expanded
      setExpandedGameId(null);
      setExpandedGameData(null);
      return;
    }

    setExpandedGameId(gameId);
    try {
      const url = `https://website-backend.w3champions.com/api/matches/${gameId}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setExpandedGameData(data);
      }
    } catch (error) {
      console.error("Error fetching game details:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="player-profile stream-mode">
        <div className="profile-loading">Loading player data...</div>
      </div>
    );
  }

  // Calculate derived stats
  const sessionWins = sessionGames.filter(g => g.won).length;
  const sessionLosses = sessionGames.length - sessionWins;
  const sessionMmrChange = sessionGames.length > 0
    ? (sessionGames[0].playerData?.currentMmr || 0) - (sessionGames[sessionGames.length - 1].playerData?.oldMmr || 0)
    : 0;
  const peakMmr = seasonMmrs.length > 0 ? Math.max(...seasonMmrs) : null;
  const lowestMmr = seasonMmrs.length > 0 ? Math.min(...seasonMmrs) : null;
  const currentMmr = playerData?.mmr || (seasonMmrs.length > 0 ? seasonMmrs[seasonMmrs.length - 1] : null);

  // Calculate last game info
  const lastGameResult = lastGameData ? (() => {
    for (const team of lastGameData.match?.teams || []) {
      const player = team.players.find(p => p.battleTag.toLowerCase() === battleTagLower);
      if (player) {
        const won = player.won === true || player.won === 1;
        const mmrChange = (player.currentMmr || 0) - (player.oldMmr || 0);
        const endTime = new Date(lastGameData.match?.endTime);
        const now = new Date();
        const hoursAgo = Math.round((now - endTime) / (1000 * 60 * 60));
        const timeAgo = hoursAgo < 1 ? 'Just now' : hoursAgo === 1 ? '1 hour ago' : `${hoursAgo} hours ago`;
        return { won, mmrChange, timeAgo, mapName: lastGameData.match?.mapName };
      }
    }
    return null;
  })() : null;

  return (
    <div className="player-profile">
      {/* Page Header */}
      <header className="profile-header">
        <div className="profile-header-content">
          <div className="profile-header-left">
            <div className="profile-pic-wrapper large">
              {profilePic && <img src={profilePic} alt="Profile" className="profile-pic" />}
              {country && <Flag name={country.toLowerCase()} className="profile-flag" />}
            </div>
            <div className="profile-header-info">
              <h1 className="profile-name">{playerName}</h1>
              {playerData && (
                <div className="profile-header-stats">
                  <span className="mmr-value large">{playerData.mmr}</span>
                  <span className="mmr-label"> MMR</span>
                  <span className="rank-badge">#{playerData.rank || '—'}</span>
                </div>
              )}
              {playerData && (
                <div className="profile-header-record">
                  <span className="record-value">{playerData.wins}W - {playerData.losses}L</span>
                  <span className="winrate-value"> ({Math.round((playerData.wins / (playerData.wins + playerData.losses)) * 100)}%)</span>
                </div>
              )}
            </div>
          </div>

          {/* Last Game Result in Header */}
          {lastGameResult && !ongoingGame && (
            <div className={`last-game-badge ${lastGameResult.won ? 'win' : 'loss'}`}>
              <span className="last-game-result">{lastGameResult.won ? 'WIN' : 'LOSS'}</span>
              <span className={`last-game-mmr ${lastGameResult.mmrChange >= 0 ? 'positive' : 'negative'}`}>
                {lastGameResult.mmrChange >= 0 ? '+' : ''}{lastGameResult.mmrChange} MMR
              </span>
              <span className="last-game-time">{lastGameResult.timeAgo}</span>
            </div>
          )}

          {/* Live Indicator */}
          {ongoingGame && (
            <div className="live-badge">
              <span className="live-dot"></span>
              <span className="live-text">LIVE</span>
            </div>
          )}
        </div>
      </header>

      {/* Stats Row */}
      <div className="bento-grid bento-top">
        {/* Session Box */}
        <div className="bento-box session-box">
          <h2 className="section-title">Session</h2>
          {sessionGames.length > 0 ? (
            <>
              <div className="session-stats">
                <span className="session-record-big">{sessionWins}W - {sessionLosses}L</span>
                <span className={`session-delta-big ${sessionMmrChange >= 0 ? 'positive' : 'negative'}`}>
                  {sessionMmrChange >= 0 ? '↑' : '↓'}{Math.abs(sessionMmrChange)}
                </span>
              </div>
              <FormDots form={sessionGames.slice().reverse().map(g => g.won)} size="large" />
              <div className="session-count">{sessionGames.length} games</div>
            </>
          ) : (
            <div className="no-session">No recent games</div>
          )}
        </div>

        {/* MMR Chart Box */}
        {seasonMmrs.length > 2 && (() => {
          const range = peakMmr - lowestMmr;
          const currentPercent = range > 0 ? ((currentMmr - lowestMmr) / range) * 100 : 50;

          return (
            <div className="bento-box mmr-box">
              <h2 className="section-title">Season {season}</h2>
              <div className="mmr-chart-simple">
                <Sparklines data={seasonMmrs} width={200} height={60} margin={5}>
                  <SparklinesLine style={{ strokeWidth: 2, stroke: "#fcdb33", fill: "rgba(252, 219, 51, 0.08)" }} />
                </Sparklines>
              </div>
              <div className="mmr-range-bar">
                <span className="range-label low">{lowestMmr}</span>
                <div className="range-track">
                  <div className="range-dot" style={{ left: `${currentPercent}%` }} />
                </div>
                <span className="range-label high">{peakMmr}</span>
              </div>
              <div className="range-current-label">{currentMmr} MMR</div>
            </div>
          );
        })()}
      </div>

      {/* Currently In Game - Full Width */}
      {ongoingGame && (
        <div className="bento-box bento-wide ongoing-section">
          <h2 className="section-title">🔴 Currently In Game</h2>
          <OnGoingGame ongoingGameData={ongoingGame} />
        </div>
      )}

      {/* Last Game - Full Width */}
      {lastGameData && !ongoingGame && (
        <div className="bento-box bento-wide last-game-section">
          <h2 className="section-title">Last Game</h2>
          <FinishedGame data={lastGameData} />
        </div>
      )}

      {/* Session Games Timeline */}
      {sessionGames.length > 1 && (
        <div className="bento-box session-timeline">
          <h2 className="section-title">Session Games</h2>
          <div className="session-tiles">
            {sessionGames.map((game, idx) => {
              const mmrChange = (game.playerData?.currentMmr || 0) - (game.playerData?.oldMmr || 0);
              const isExpanded = expandedGameId === game.id;

              // Extract players from both teams
              const team1Players = game.teams?.[0]?.players || [];
              const team2Players = game.teams?.[1]?.players || [];

              // Get MMRs for chart
              const team1Mmrs = team1Players.map(p => p.oldMmr || 0);
              const team2Mmrs = team2Players.map(p => p.oldMmr || 0);

              return (
                <div key={game.id || idx}>
                  <div
                    className={`session-tile ${game.won ? 'win' : 'loss'} ${isExpanded ? 'expanded' : ''}`}
                    onClick={() => handleExpandGame(game.id)}
                  >
                    <div className="tile-top">
                      <img
                        src={getMapImageUrl(game.mapName)}
                        alt=""
                        className="tile-map-img"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                      <div className="tile-header">
                        <span className={`tile-result ${game.won ? 'win' : 'loss'}`}>{game.won ? 'WIN' : 'LOSS'}</span>
                        <span className="tile-map-name">{game.mapName}</span>
                        <span className={`tile-mmr ${mmrChange >= 0 ? 'positive' : 'negative'}`}>
                          {mmrChange >= 0 ? '+' : ''}{mmrChange}
                        </span>
                      </div>
                    </div>
                    <div className="tile-body">
                      <div className="tile-team">
                        {team1Players.map((p, i) => (
                          <div key={i} className="tile-player">
                            <img src={raceMapping[p.race]} alt="" className="tile-race" />
                            <span className="tile-player-name">{p.name}</span>
                          </div>
                        ))}
                      </div>
                      <div className="tile-chart">
                        <MmrComparison
                          data={{
                            teamOneMmrs: team1Mmrs,
                            teamTwoMmrs: team2Mmrs,
                            teamOneAT: [],
                            teamTwoAT: [],
                          }}
                          compact={true}
                        />
                      </div>
                      <div className="tile-team right">
                        {team2Players.map((p, i) => (
                          <div key={i} className="tile-player">
                            <span className="tile-player-name">{p.name}</span>
                            <img src={raceMapping[p.race]} alt="" className="tile-race" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Expanded Game Details */}
          {expandedGameId && expandedGameData && (
            <div className="expanded-game">
              <FinishedGame data={expandedGameData} />
            </div>
          )}
        </div>
      )}

      {/* Bento Grid - Bottom Row */}
      <div className="bento-grid bento-bottom">
        {/* Map Stats */}
        <div className="bento-box map-stats">
          <h2 className="section-title">Maps</h2>
          <div className="stats-table">
            {Object.entries(mapStats)
              .sort((a, b) => (b[1].wins + b[1].losses) - (a[1].wins + a[1].losses))
              .slice(0, 6)
              .map(([mapName, stats]) => {
                const total = stats.wins + stats.losses;
                const winRate = Math.round((stats.wins / total) * 100);
                return (
                  <div key={mapName} className="stats-row">
                    <span className="stats-name">{mapName}</span>
                    <div className="stats-bar-container">
                      <div
                        className="stats-bar win"
                        style={{ width: `${winRate}%` }}
                      />
                    </div>
                    <span className="stats-record">{stats.wins}-{stats.losses}</span>
                    <span className={`stats-winrate ${winRate >= 50 ? 'green' : 'red'}`}>{winRate}%</span>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Teammate Stats */}
        <div className="bento-box teammate-stats">
          <h2 className="section-title">Teammates</h2>
          <div className="stats-table">
            {teammateStats.slice(0, 6).map((teammate) => {
              const winRate = Math.round((teammate.wins / teammate.games) * 100);
              return (
                <div key={teammate.battleTag} className="stats-row">
                  <span className="stats-name">{teammate.name}</span>
                  <div className="stats-bar-container">
                    <div
                      className="stats-bar win"
                      style={{ width: `${winRate}%` }}
                    />
                  </div>
                  <span className="stats-record">{teammate.wins}-{teammate.losses}</span>
                  <span className={`stats-winrate ${winRate >= 50 ? 'green' : 'red'}`}>{winRate}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Matches - from session */}
        <div className="bento-box matches-box">
          <h2 className="section-title">Recent</h2>
          <div className="matches-list compact">
            {sessionGames.slice(0, 6).map((game, idx) => {
              const mmrChange = (game.playerData?.currentMmr || 0) - (game.playerData?.oldMmr || 0);
              return (
                <div key={game.id || idx} className={`match-row-compact ${game.won ? 'win' : 'loss'}`}>
                  <span className="match-result">{game.won ? 'W' : 'L'}</span>
                  <span className="match-map">{game.mapName}</span>
                  <span className={`match-mmr-change ${mmrChange >= 0 ? 'positive' : 'negative'}`}>
                    {mmrChange >= 0 ? '+' : ''}{mmrChange}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerProfile;
