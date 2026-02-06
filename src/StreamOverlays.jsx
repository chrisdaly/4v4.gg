import React, { useState, useEffect } from "react";
import { CountryFlag } from "./components/ui";
import { gateway, season } from "./params.jsx";
import { processMatchData } from "./utils.jsx";
import { getPlayerProfile } from "./api";
import FormDots from "./FormDots.jsx";

import grandmasterIcon from "./icons/grandmaster.png";
import masterIcon from "./icons/master.png";
import diamondIcon from "./icons/diamond.png";
import platinumIcon from "./icons/platinum.png";
import goldIcon from "./icons/gold.png";
import silverIcon from "./icons/silver.png";
import bronzeIcon from "./icons/bronze.png";

import human from "./icons/human.svg";
import orc from "./icons/orc.svg";
import elf from "./icons/elf.svg";
import undead from "./icons/undead.svg";
import random from "./icons/random.svg";

const LEAGUES = [
  { id: 0, name: "Grandmaster", icon: grandmasterIcon },
  { id: 1, name: "Master", icon: masterIcon },
  { id: 2, name: "Diamond", icon: diamondIcon },
  { id: 3, name: "Platinum", icon: platinumIcon },
  { id: 4, name: "Gold", icon: goldIcon },
  { id: 5, name: "Silver", icon: silverIcon },
  { id: 6, name: "Bronze", icon: bronzeIcon },
];

const raceMapping = {
  0: random,
  1: human,
  2: orc,
  4: elf,
  8: undead,
};

const StreamOverlays = () => {
  const [playerData, setPlayerData] = useState(null);
  const [profilePic, setProfilePic] = useState(null);
  const [country, setCountry] = useState(null);
  const [sessionGames, setSessionGames] = useState([]);
  const [lastGameData, setLastGameData] = useState(null);
  const [ladderStanding, setLadderStanding] = useState(null);
  const [ongoingMatch, setOngoingMatch] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const SESSION_GAP_MINUTES = 60;

  // Get battleTag and widget type from URL
  const getBattleTag = () => {
    const pageUrl = new URL(window.location.href);
    const pathParts = pageUrl.pathname.split("/");
    // /overlay/identity/BattleTag or /overlay/session/BattleTag
    return decodeURIComponent(pathParts[pathParts.length - 1]);
  };

  const getWidgetType = () => {
    const pageUrl = new URL(window.location.href);
    const pathParts = pageUrl.pathname.split("/");
    return pathParts[2] || "identity"; // identity or session
  };

  const battleTag = getBattleTag();
  const battleTagLower = battleTag.toLowerCase();
  const playerName = battleTag.split("#")[0];
  const widgetType = getWidgetType();

  useEffect(() => {
    if (!battleTag) return;
    loadData();
    const interval = setInterval(loadData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [battleTag]);

  const loadData = async () => {
    try {
      const encodedTag = battleTag.replace("#", "%23");

      // Fetch player stats
      const statsUrl = `https://website-backend.w3champions.com/api/players/${encodedTag}/game-mode-stats?gateWay=${gateway}&season=${season}`;
      const statsResponse = await fetch(statsUrl);
      const statsResult = await statsResponse.json();
      const modeStats = statsResult.find(s => s.gameMode === 4);
      if (modeStats) {
        setPlayerData({
          mmr: modeStats.mmr,
          wins: modeStats.wins,
          losses: modeStats.losses,
          rank: modeStats.rank,
        });
      }

      // Fetch profile (consolidated - single API call for pic, twitch, country)
      const profile = await getPlayerProfile(battleTag);
      if (profile.profilePicUrl) {
        setProfilePic(profile.profilePicUrl);
      }
      if (profile.country) {
        setCountry(profile.country);
      }

      // Fetch matches for session
      const matchesUrl = `https://website-backend.w3champions.com/api/matches/search?playerId=${encodedTag}&gateway=${gateway}&offset=0&pageSize=50&gameMode=4&season=${season}`;
      const matchesResponse = await fetch(matchesUrl);
      const matchesResult = await matchesResponse.json();
      const matches = (matchesResult.matches || []).map(m => processMatchData(m, battleTag));

      // Calculate session games
      const now = new Date();
      const sessionGames = [];
      for (let i = 0; i < matches.length; i++) {
        const game = matches[i];
        const gameTime = new Date(game.endTime);
        if (i === 0) {
          const hoursSinceLastGame = (now - gameTime) / (1000 * 60 * 60);
          if (hoursSinceLastGame > SESSION_GAP_MINUTES / 60) break;
          sessionGames.push(game);
        } else {
          const prevGame = matches[i - 1];
          const prevTime = new Date(prevGame.endTime);
          const gapMinutes = (prevTime - gameTime) / (1000 * 60);
          if (gapMinutes > SESSION_GAP_MINUTES) break;
          sessionGames.push(game);
        }
      }
      setSessionGames(sessionGames);

      // Last game data
      if (matches.length > 0) {
        const lastMatchId = matches[0].id;
        const lastGameUrl = `https://website-backend.w3champions.com/api/matches/${lastMatchId}`;
        const lastGameResponse = await fetch(lastGameUrl);
        if (lastGameResponse.ok) {
          const lastGameResult = await lastGameResponse.json();
          setLastGameData(lastGameResult);
        }
      }

      // Fetch ladder standing
      const searchUrl = `https://website-backend.w3champions.com/api/ladder/search?gateWay=${gateway}&searchFor=${encodeURIComponent(battleTag.split("#")[0])}&gameMode=4&season=${season}`;
      const searchResponse = await fetch(searchUrl);
      if (searchResponse.ok) {
        const searchResults = await searchResponse.json();
        const playerResult = searchResults.find(r => {
          const tag1 = r.playersInfo?.[0]?.battleTag?.toLowerCase();
          const tag2 = r.player?.playerIds?.[0]?.battleTag?.toLowerCase();
          return tag1 === battleTagLower || tag2 === battleTagLower;
        });
        if (playerResult) {
          const league = LEAGUES.find(l => l.id === playerResult.league);
          setLadderStanding({
            league,
            playerRank: playerResult.rankNumber,
          });
        }
      }

      // Fetch ongoing match (for match widget)
      const ongoingUrl = `https://website-backend.w3champions.com/api/matches/ongoing?offset=0&pageSize=50&gameMode=4`;
      const ongoingResponse = await fetch(ongoingUrl);
      if (ongoingResponse.ok) {
        const ongoingResult = await ongoingResponse.json();
        const playerMatch = (ongoingResult.matches || []).find(match => {
          for (const team of match.teams || []) {
            for (const player of team.players || []) {
              if (player.battleTag?.toLowerCase() === battleTagLower) {
                return true;
              }
            }
          }
          return false;
        });
        setOngoingMatch(playerMatch || null);
      }

    } catch (error) {
      console.error("Error loading overlay data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate session stats
  const sessionWins = sessionGames.filter(g => g.won).length;
  const sessionLosses = sessionGames.length - sessionWins;
  const sessionMmrChange = sessionGames.length > 0
    ? (sessionGames[0].playerData?.currentMmr || 0) - (sessionGames[sessionGames.length - 1].playerData?.oldMmr || 0)
    : 0;

  // Last game result
  const lastGameResult = lastGameData ? (() => {
    for (const team of lastGameData.match?.teams || []) {
      const player = team.players.find(p => p.battleTag.toLowerCase() === battleTagLower);
      if (player) {
        const won = player.won === true || player.won === 1;
        const mmrChange = (player.currentMmr || 0) - (player.oldMmr || 0);
        return { won, mmrChange, mapName: lastGameData.match?.mapName };
      }
    }
    return null;
  })() : null;

  // Get teams from last game
  const lastGameTeams = lastGameData?.match?.teams || [];

  if (isLoading) {
    return <div className="stream-overlay-loading"></div>;
  }

  // =====================
  // WIDGET: IDENTITY (Bottom Left)
  // =====================
  if (widgetType === "identity") {
    return (
      <div className="stream-overlay stream-identity-widget">
        <div className="sow-identity">
          {profilePic && <img src={profilePic} alt="" className="sow-pic" />}
          <div className="sow-info">
            <div className="sow-name-row">
              <span className="sow-name">{playerName}</span>
              {country && <CountryFlag name={country.toLowerCase()} className="sow-flag" />}
            </div>
            <div className="sow-stats-row">
              <span className="sow-mmr">{playerData?.mmr || '—'}</span>
              <span className="sow-mmr-label">MMR</span>
              {ladderStanding && (
                <>
                  <img src={ladderStanding.league?.icon} alt="" className="sow-league" />
                  <span className="sow-rank">#{ladderStanding.playerRank}</span>
                </>
              )}
            </div>
          </div>
        </div>
        {sessionGames.length > 0 && (
          <div className="sow-session">
            <span className="sow-session-record">{sessionWins}W-{sessionLosses}L</span>
            <span className={`sow-session-delta ${sessionMmrChange >= 0 ? 'positive' : 'negative'}`}>
              {sessionMmrChange >= 0 ? '+' : ''}{sessionMmrChange}
            </span>
            <FormDots form={sessionGames.slice().reverse().map(g => g.won)} size="small" />
          </div>
        )}
      </div>
    );
  }

  // =====================
  // WIDGET: SESSION (Bottom Right)
  // =====================
  if (widgetType === "session") {
    return (
      <div className="stream-overlay stream-session-widget">
        {/* Session Stats */}
        <div className="ssw-session">
          <div className="ssw-session-header">
            <span className="ssw-label">SESSION</span>
            {sessionGames.length > 0 ? (
              <div className="ssw-session-stats">
                <span className="ssw-record">{sessionWins}W - {sessionLosses}L</span>
                <span className={`ssw-delta ${sessionMmrChange >= 0 ? 'positive' : 'negative'}`}>
                  ({sessionMmrChange >= 0 ? '+' : ''}{sessionMmrChange})
                </span>
              </div>
            ) : (
              <span className="ssw-no-session">No games yet</span>
            )}
          </div>
          {sessionGames.length > 0 && (
            <FormDots form={sessionGames.slice().reverse().map(g => g.won)} size="medium" />
          )}
        </div>

        {/* Last Game Result */}
        {lastGameResult && (
          <div className="ssw-last-game">
            <div className="ssw-last-header">
              <span className="ssw-label">LAST GAME</span>
              <div className={`ssw-result ${lastGameResult.won ? 'win' : 'loss'}`}>
                {lastGameResult.won ? 'WIN' : 'LOSS'}
                <span className={`ssw-mmr-change ${lastGameResult.mmrChange >= 0 ? 'positive' : 'negative'}`}>
                  {lastGameResult.mmrChange >= 0 ? '+' : ''}{lastGameResult.mmrChange}
                </span>
              </div>
            </div>
            <div className="ssw-map">{lastGameResult.mapName?.replace(/^\(\d\)\s*/, '')}</div>

            {/* Teams */}
            <div className="ssw-teams">
              {lastGameTeams.map((team, idx) => {
                const isWinner = team.players.some(p => p.won);
                return (
                  <div key={idx} className={`ssw-team ${isWinner ? 'winner' : 'loser'}`}>
                    <span className="ssw-team-label">{isWinner ? '👑' : ''} Team {idx + 1}</span>
                    <div className="ssw-players">
                      {team.players.map((p, i) => (
                        <div key={i} className="ssw-player">
                          <img src={raceMapping[p.race]} alt="" className="ssw-race" />
                          <span className="ssw-player-name">{p.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // =====================
  // WIDGET: MATCH (Bottom Center - Compact)
  // =====================
  if (widgetType === "match") {
    // Calculate team MMRs
    const teams = ongoingMatch?.teams || [];
    const team1 = teams[0]?.players || [];
    const team2 = teams[1]?.players || [];
    const team1Mmr = team1.length > 0 ? Math.round(team1.reduce((sum, p) => sum + (p.currentMmr || 0), 0) / team1.length) : 0;
    const team2Mmr = team2.length > 0 ? Math.round(team2.reduce((sum, p) => sum + (p.currentMmr || 0), 0) / team2.length) : 0;

    if (!ongoingMatch) {
      return <div className="stream-overlay stream-match-widget stream-match-empty"></div>;
    }

    return (
      <div className="stream-overlay stream-match-widget">
        {/* Team 1 */}
        <div className="smw-team smw-team-left">
          {team1.map((p, i) => (
            <div key={i} className="smw-player">
              <img src={raceMapping[p.race]} alt="" className="smw-race" />
              <span className="smw-name">{p.name}</span>
              <span className="smw-mmr">{p.currentMmr}</span>
            </div>
          ))}
        </div>

        {/* VS / MMR Center */}
        <div className="smw-center">
          <span className="smw-team-mmr">{team1Mmr}</span>
          <span className="smw-vs">vs</span>
          <span className="smw-team-mmr">{team2Mmr}</span>
        </div>

        {/* Team 2 */}
        <div className="smw-team smw-team-right">
          {team2.map((p, i) => (
            <div key={i} className="smw-player">
              <span className="smw-mmr">{p.currentMmr}</span>
              <span className="smw-name">{p.name}</span>
              <img src={raceMapping[p.race]} alt="" className="smw-race" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
};

export default StreamOverlays;
