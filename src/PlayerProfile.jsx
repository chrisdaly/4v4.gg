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

// Map images stored locally in /public/maps/
const getMapImageUrl = (mapName) => {
  if (!mapName) return null;
  // Strip parentheses prefix like "(4)", spaces, and apostrophes
  const cleanName = mapName.replace(/^\(\d\)/, "").replace(/ /g, "").replace(/'/g, "");
  return `/maps/${cleanName}.png`;
};

// Layout options with descriptions
const LAYOUTS = {
  glance: {
    name: "Glance",
    description: "Ultra minimal - just the essentials",
  },
  session: {
    name: "Session",
    description: "Between games - last game + session history",
  },
  progress: {
    name: "Progress",
    description: "Am I improving? MMR trends + rank movement",
  },
  social: {
    name: "Social",
    description: "Team focused - who to queue with",
  },
  stream: {
    name: "Stream",
    description: "Overlay for broadcasts - transparent, minimal",
  },
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
  const [ladderStanding, setLadderStanding] = useState(null);

  // Layout state - default to "session", can be changed via URL param ?layout=progress
  const getInitialLayout = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get("layout") || "session";
  };
  const [layout, setLayout] = useState(getInitialLayout);

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
    // Reset all state when battleTag changes
    setPlayerData(null);
    setProfilePic(null);
    setCountry(null);
    setMatches([]);
    setSessionGames([]);
    setSeasonMmrs([]);
    setOngoingGame(null);
    setMapStats({});
    setTeammateStats([]);
    setLastGameData(null);
    setExpandedGameId(null);
    setExpandedGameData(null);
    setLadderStanding(null);
    setIsLoading(true);

    loadAllData();
    fetchOngoingGames();

    const interval = setInterval(fetchOngoingGames, 30000);
    return () => clearInterval(interval);
  }, [battleTag]);

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

      // Fetch ladder standing
      await fetchLadderStanding();

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

    // Fetch last game details - find the first match where this player actually participated
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

  const fetchLadderStanding = async () => {
    try {
      // First, search for the player to find their league
      const searchUrl = `https://website-backend.w3champions.com/api/ladder/search?gateWay=${gateway}&searchFor=${encodeURIComponent(battleTag.split("#")[0])}&gameMode=4&season=${season}`;
      console.log("Searching ladder:", searchUrl);
      const searchResponse = await fetch(searchUrl);
      if (!searchResponse.ok) {
        console.log("Search response not ok:", searchResponse.status);
        return;
      }

      const searchResults = await searchResponse.json();
      console.log("Search results:", searchResults);
      if (searchResults.length > 0) {
        console.log("First result structure:", JSON.stringify(searchResults[0], null, 2));
      }

      // Find the exact player match - check both playersInfo and player.playerIds
      const playerResult = searchResults.find(r => {
        const tag1 = r.playersInfo?.[0]?.battleTag?.toLowerCase();
        const tag2 = r.player?.playerIds?.[0]?.battleTag?.toLowerCase();
        return tag1 === battleTagLower || tag2 === battleTagLower;
      });

      if (!playerResult) {
        console.log("Player not found in search results. Looking for:", battleTagLower);
        return;
      }

      console.log("Found player result:", playerResult);
      const leagueId = playerResult.league;
      const league = LEAGUES.find(l => l.id === leagueId);
      console.log("League:", leagueId, league);

      // Now fetch the full ladder for this league to get neighbors
      const ladderUrl = `https://website-backend.w3champions.com/api/ladder/${leagueId}?gateWay=${gateway}&gameMode=4&season=${season}`;
      const ladderResponse = await fetch(ladderUrl);
      if (!ladderResponse.ok) return;

      const ladderData = await ladderResponse.json();

      // Find the player's index in the ladder
      const playerIndex = ladderData.findIndex(
        r => r.playersInfo?.[0]?.battleTag?.toLowerCase() === battleTagLower
      );

      if (playerIndex === -1) return;

      // Get 3 players above and 3 below
      const startIdx = Math.max(0, playerIndex - 3);
      const endIdx = Math.min(ladderData.length, playerIndex + 4);
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

  // ============================================
  // LAYOUT: GLANCE - Ultra minimal
  // ============================================
  const renderGlanceLayout = () => (
    <div className="glance-layout">
      <div className="glance-card">
        <div className="glance-left">
          <div className="glance-pic">
            {profilePic && <img src={profilePic} alt="" />}
            {country && <Flag name={country.toLowerCase()} className="glance-flag" />}
          </div>
          <div className="glance-info">
            <div className="glance-name-row">
              <span className="glance-name">{playerName}</span>
              {ongoingGame && <span className="glance-live"><span className="pulse"></span>LIVE</span>}
            </div>
            {playerData && (
              <div className="glance-stats">
                <span className="glance-mmr">{playerData.mmr}</span>
                <span className="glance-mmr-label">MMR</span>
                {ladderStanding && (
                  <>
                    <img src={ladderStanding.league?.icon} alt="" className="glance-league" />
                    <span className="glance-rank">#{ladderStanding.playerRank}</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="glance-right">
          {sessionGames.length > 0 ? (
            <div className="glance-session">
              <div className="glance-session-stats">
                <span className="glance-record">{sessionWins}W-{sessionLosses}L</span>
                <span className={`glance-delta ${sessionMmrChange >= 0 ? 'positive' : 'negative'}`}>
                  {sessionMmrChange >= 0 ? '+' : ''}{sessionMmrChange}
                </span>
              </div>
              <FormDots form={sessionGames.slice().reverse().map(g => g.won)} size="small" />
            </div>
          ) : (
            <span className="glance-no-session">No session</span>
          )}
          {lastGameResult && !ongoingGame && (
            <div className={`glance-last ${lastGameResult.won ? 'win' : 'loss'}`}>
              {lastGameResult.won ? 'W' : 'L'} {lastGameResult.mmrChange >= 0 ? '+' : ''}{lastGameResult.mmrChange}
            </div>
          )}
        </div>
      </div>
      {/* Layout switcher at bottom */}
      <div className="glance-switcher">
        {Object.entries(LAYOUTS).map(([key, { name }]) => (
          <button key={key} className={`layout-btn ${layout === key ? 'active' : ''}`} onClick={() => setLayout(key)}>{name}</button>
        ))}
      </div>
    </div>
  );

  // ============================================
  // LAYOUT: SESSION - Between games (default)
  // ============================================
  const renderSessionLayout = () => (
    <div className="session-layout">
      {/* Compact Header */}
      <header className="session-header">
        <div className="session-header-left">
          <div className="sh-pic">
            {profilePic && <img src={profilePic} alt="" />}
            {country && <Flag name={country.toLowerCase()} className="sh-flag" />}
          </div>
          <div className="sh-info">
            <div className="sh-name-row">
              <h1 className="sh-name">{playerName}</h1>
              {ongoingGame && <span className="sh-live"><span className="pulse"></span>LIVE</span>}
            </div>
            {playerData && (
              <div className="sh-stats">
                <span className="sh-mmr">{playerData.mmr}</span>
                <span className="sh-label">MMR</span>
                {ladderStanding && (
                  <>
                    <img src={ladderStanding.league?.icon} alt="" className="sh-league" />
                    <span className="sh-rank">#{ladderStanding.playerRank}</span>
                  </>
                )}
                <span className="sh-divider">•</span>
                <span className="sh-record">{playerData.wins}W-{playerData.losses}L</span>
              </div>
            )}
          </div>
        </div>
        <div className="session-header-center">
          {sessionGames.length > 0 && (
            <div className="sh-session">
              <span className="sh-session-label">SESSION</span>
              <div className="sh-session-row">
                <span className="sh-session-record">{sessionWins}W-{sessionLosses}L</span>
                <span className={`sh-session-delta ${sessionMmrChange >= 0 ? 'positive' : 'negative'}`}>
                  {sessionMmrChange >= 0 ? '+' : ''}{sessionMmrChange}
                </span>
              </div>
              <FormDots form={sessionGames.slice().reverse().map(g => g.won)} size="small" />
            </div>
          )}
        </div>
        <div className="session-header-right">
          {lastGameResult && !ongoingGame && (
            <div className={`sh-last-badge ${lastGameResult.won ? 'win' : 'loss'}`}>
              <span className="sh-last-result">{lastGameResult.won ? 'WIN' : 'LOSS'}</span>
              <span className={`sh-last-mmr ${lastGameResult.mmrChange >= 0 ? 'positive' : 'negative'}`}>
                {lastGameResult.mmrChange >= 0 ? '+' : ''}{lastGameResult.mmrChange}
              </span>
            </div>
          )}
          <div className="layout-switcher">
            {Object.entries(LAYOUTS).map(([key, { name }]) => (
              <button key={key} className={`layout-btn ${layout === key ? 'active' : ''}`} onClick={() => setLayout(key)} title={LAYOUTS[key].description}>{name}</button>
            ))}
          </div>
        </div>
      </header>

      {/* Last Game - Main Focus */}
      {ongoingGame && (
        <div className="session-game-main">
          <OnGoingGame ongoingGameData={ongoingGame} />
        </div>
      )}
      {lastGameData && !ongoingGame && (
        <div className="session-game-main">
          <FinishedGame data={lastGameData} />
        </div>
      )}

      {/* Session Games Strip */}
      {sessionGames.length > 1 && (
        <div className="session-strip">
          <h3 className="strip-title">Session ({sessionGames.length} games)</h3>
          <div className="session-chips">
            {sessionGames.map((game, idx) => {
              const mc = (game.playerData?.currentMmr || 0) - (game.playerData?.oldMmr || 0);
              return (
                <div key={game.id || idx} className={`game-chip ${game.won ? 'win' : 'loss'}`} onClick={() => handleExpandGame(game.id)}>
                  <span className="chip-result">{game.won ? 'W' : 'L'}</span>
                  <span className="chip-map">{game.mapName?.replace(/^\(\d\)\s*/, '')}</span>
                  <span className={`chip-mmr ${mc >= 0 ? 'positive' : 'negative'}`}>{mc >= 0 ? '+' : ''}{mc}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Expanded Game */}
      {expandedGameId && expandedGameData && (
        <div className="session-expanded">
          <FinishedGame data={expandedGameData} />
        </div>
      )}
    </div>
  );

  // ============================================
  // LAYOUT: PROGRESS - Am I improving?
  // ============================================
  const renderProgressLayout = () => {
    const sessionStartMmr = sessionGames.length > 0 ? sessionGames[sessionGames.length - 1].playerData?.oldMmr : null;
    const last20 = matches.slice(0, 20).map(m => {
      for (const team of m.teams || []) {
        const p = team.players.find(p => p.battleTag?.toLowerCase() === battleTagLower);
        if (p) return p.won;
      }
      return null;
    }).filter(x => x !== null);

    return (
      <div className="progress-layout">
        {/* Header */}
        <header className="progress-header">
          <div className="ph-left">
            <div className="ph-pic">
              {profilePic && <img src={profilePic} alt="" />}
            </div>
            <div className="ph-info">
              <h1 className="ph-name">{playerName}</h1>
              {playerData && (
                <div className="ph-current">
                  <span className="ph-mmr">{playerData.mmr}</span>
                  <span className="ph-label">MMR</span>
                  {ladderStanding && (
                    <>
                      <img src={ladderStanding.league?.icon} alt="" className="ph-league" />
                      <span className="ph-rank">#{ladderStanding.playerRank}</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="layout-switcher">
            {Object.entries(LAYOUTS).map(([key, { name }]) => (
              <button key={key} className={`layout-btn ${layout === key ? 'active' : ''}`} onClick={() => setLayout(key)}>{name}</button>
            ))}
          </div>
        </header>

        {/* MMR Journey */}
        <div className="progress-journey">
          <h2 className="progress-section-title">Season {season} Journey</h2>
          <div className="journey-stats">
            <div className="journey-stat">
              <span className="journey-label">Lowest</span>
              <span className="journey-value low">{lowestMmr || '—'}</span>
            </div>
            <div className="journey-arrow">→</div>
            <div className="journey-stat current">
              <span className="journey-label">Current</span>
              <span className="journey-value">{currentMmr || '—'}</span>
            </div>
            <div className="journey-arrow">→</div>
            <div className="journey-stat">
              <span className="journey-label">Peak</span>
              <span className="journey-value high">{peakMmr || '—'}</span>
            </div>
          </div>
          {seasonMmrs.length > 2 && (
            <div className="progress-chart">
              <Sparklines data={seasonMmrs} svgWidth={800} svgHeight={80} margin={5} preserveAspectRatio="none">
                <SparklinesLine style={{ strokeWidth: 2, stroke: "#fcdb33", fill: "rgba(252, 219, 51, 0.1)" }} />
              </Sparklines>
            </div>
          )}
        </div>

        {/* Two Column: Ladder + Form */}
        <div className="progress-columns">
          {/* Ladder Position */}
          {ladderStanding && (
            <div className="progress-ladder">
              <h3 className="progress-col-title">
                <img src={ladderStanding.league?.icon} alt="" className="pcol-league" />
                {ladderStanding.league?.name} Ladder
              </h3>
              <div className="progress-ladder-list">
                {ladderStanding.neighbors.map((n) => {
                  const isMe = n.playersInfo?.[0]?.battleTag?.toLowerCase() === battleTagLower;
                  return (
                    <div key={n.id} className={`pl-row ${isMe ? 'me' : ''}`}>
                      <span className="pl-rank">#{n.rankNumber}</span>
                      <img src={raceMapping[n.playersInfo?.[0]?.calculatedRace]} alt="" className="pl-race" />
                      <span className={`pl-name ${isMe ? 'me' : ''}`}>{n.player?.name}</span>
                      <span className="pl-mmr">{n.player?.mmr}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent Form */}
          <div className="progress-form">
            <h3 className="progress-col-title">Last 20 Games</h3>
            <div className="form-grid">
              {last20.map((won, i) => (
                <div key={i} className={`form-cell ${won ? 'win' : 'loss'}`}>{won ? 'W' : 'L'}</div>
              ))}
            </div>
            <div className="form-summary">
              <span className="form-wins">{last20.filter(w => w).length}W</span>
              <span className="form-losses">{last20.filter(w => !w).length}L</span>
              <span className="form-wr">({Math.round((last20.filter(w => w).length / last20.length) * 100)}%)</span>
            </div>
          </div>
        </div>

        {/* Session Progress */}
        {sessionGames.length > 0 && (
          <div className="progress-session">
            <h3 className="progress-col-title">Today's Session</h3>
            <div className="ps-summary">
              <div className="ps-stat">
                <span className="ps-label">Started</span>
                <span className="ps-value">{sessionStartMmr || '—'}</span>
              </div>
              <div className="ps-arrow">→</div>
              <div className="ps-stat">
                <span className="ps-label">Now</span>
                <span className="ps-value">{currentMmr || '—'}</span>
              </div>
              <div className={`ps-change ${sessionMmrChange >= 0 ? 'positive' : 'negative'}`}>
                {sessionMmrChange >= 0 ? '+' : ''}{sessionMmrChange} MMR
              </div>
            </div>
            <div className="ps-games">
              {sessionGames.map((g, i) => {
                const mc = (g.playerData?.currentMmr || 0) - (g.playerData?.oldMmr || 0);
                return (
                  <div key={g.id || i} className={`ps-game ${g.won ? 'win' : 'loss'}`}>
                    <span className="ps-result">{g.won ? 'W' : 'L'}</span>
                    <span className="ps-map">{g.mapName?.replace(/^\(\d\)\s*/, '')}</span>
                    <span className={`ps-mmr ${mc >= 0 ? 'positive' : 'negative'}`}>{mc >= 0 ? '+' : ''}{mc}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ============================================
  // LAYOUT: SOCIAL - Who to queue with
  // ============================================
  const renderSocialLayout = () => (
    <div className="social-layout">
      {/* Header */}
      <header className="social-header">
        <div className="soc-left">
          <div className="soc-pic">
            {profilePic && <img src={profilePic} alt="" />}
          </div>
          <div className="soc-info">
            <h1 className="soc-name">{playerName}</h1>
            {playerData && (
              <div className="soc-stats">
                <span className="soc-mmr">{playerData.mmr}</span>
                <span className="soc-label">MMR</span>
              </div>
            )}
          </div>
        </div>
        <div className="layout-switcher">
          {Object.entries(LAYOUTS).map(([key, { name }]) => (
            <button key={key} className={`layout-btn ${layout === key ? 'active' : ''}`} onClick={() => setLayout(key)}>{name}</button>
          ))}
        </div>
      </header>

      {/* Teammates Grid */}
      <div className="social-teammates-section">
        <h2 className="social-section-title">Your Teammates</h2>
        <p className="social-section-sub">Players you queue with most</p>
        <div className="teammates-grid">
          {teammateStats.slice(0, 12).map((t) => {
            const wr = Math.round((t.wins / t.games) * 100);
            return (
              <a key={t.battleTag} href={`/player/${t.battleTag.replace("#", "%23")}`} className="teammate-card">
                <div className="tc-name">{t.name}</div>
                <div className="tc-games">{t.games} games</div>
                <div className="tc-stats">
                  <span className="tc-record">{t.wins}W-{t.losses}L</span>
                  <span className={`tc-wr ${wr >= 50 ? 'good' : 'bad'}`}>{wr}%</span>
                </div>
                <div className="tc-bar"><div className="tc-fill" style={{ width: `${wr}%` }} /></div>
              </a>
            );
          })}
        </div>
      </div>

      {/* Recent with teammates */}
      <div className="social-recent-section">
        <h3 className="social-section-title">Recent Games</h3>
        <div className="social-recent-list">
          {sessionGames.slice(0, 10).map((g, i) => {
            const mc = (g.playerData?.currentMmr || 0) - (g.playerData?.oldMmr || 0);
            const myTeam = g.teams?.find(t => t.players.some(p => p.battleTag?.toLowerCase() === battleTagLower));
            const teammates = myTeam?.players.filter(p => p.battleTag?.toLowerCase() !== battleTagLower) || [];

            return (
              <div key={g.id || i} className={`sr-game ${g.won ? 'win' : 'loss'}`}>
                <span className={`sr-result ${g.won ? 'win' : 'loss'}`}>{g.won ? 'W' : 'L'}</span>
                <span className="sr-map">{g.mapName?.replace(/^\(\d\)\s*/, '')}</span>
                <span className="sr-with">with {teammates.map(p => p.name).join(', ') || 'randoms'}</span>
                <span className={`sr-mmr ${mc >= 0 ? 'positive' : 'negative'}`}>{mc >= 0 ? '+' : ''}{mc}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // ============================================
  // LAYOUT: STREAM - Overlay for broadcasts
  // ============================================
  const renderStreamLayout = () => (
    <div className="stream-layout">
      <div className="stream-card">
        <div className="stream-top">
          <div className="stream-identity">
            {profilePic && <img src={profilePic} alt="" className="stream-pic" />}
            <div className="stream-info">
              <span className="stream-name">{playerName}</span>
              {playerData && (
                <span className="stream-mmr">{playerData.mmr} MMR</span>
              )}
            </div>
          </div>
          {ladderStanding && (
            <div className="stream-rank">
              <img src={ladderStanding.league?.icon} alt="" className="stream-league-icon" />
              <span className="stream-rank-num">#{ladderStanding.playerRank}</span>
            </div>
          )}
        </div>
        {sessionGames.length > 0 && (
          <div className="stream-session">
            <span className="stream-session-record">{sessionWins}W - {sessionLosses}L</span>
            <span className={`stream-session-delta ${sessionMmrChange >= 0 ? 'positive' : 'negative'}`}>
              ({sessionMmrChange >= 0 ? '+' : ''}{sessionMmrChange})
            </span>
            <FormDots form={sessionGames.slice().reverse().map(g => g.won)} size="small" />
          </div>
        )}
        {ongoingGame && (
          <div className="stream-live">
            <span className="stream-live-dot"></span>
            <span>IN GAME</span>
          </div>
        )}
      </div>
      {/* Tiny switcher */}
      <div className="stream-switcher">
        {Object.entries(LAYOUTS).map(([key, { name }]) => (
          <button key={key} className={`layout-btn-mini ${layout === key ? 'active' : ''}`} onClick={() => setLayout(key)}>{name[0]}</button>
        ))}
      </div>
    </div>
  );

  return (
    <div className={`player-profile layout-${layout}`}>
      {layout === 'glance' && renderGlanceLayout()}
      {layout === 'session' && renderSessionLayout()}
      {layout === 'progress' && renderProgressLayout()}
      {layout === 'social' && renderSocialLayout()}
      {layout === 'stream' && renderStreamLayout()}
    </div>
  );
};

export default PlayerProfile;
