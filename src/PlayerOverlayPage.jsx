import React, { useState, useEffect } from "react";
import { getPlayerProfileInfo, fetchPlayerSessionData, getPlayerCountry } from "./utils.jsx";
import { gateway, season } from "./params.jsx";
import PlayerOverlay from "./PlayerOverlay.jsx";

// Calculate overall rank by counting players in higher leagues
const fetchOverallRank = async (battleTag) => {
  try {
    const battleTagLower = battleTag.toLowerCase();

    // First find the player's league
    const searchUrl = `https://website-backend.w3champions.com/api/ladder/search?gateWay=${gateway}&searchFor=${encodeURIComponent(battleTag.split("#")[0])}&gameMode=4&season=${season}`;
    const searchResponse = await fetch(searchUrl);
    if (!searchResponse.ok) return null;

    const searchResults = await searchResponse.json();
    const playerResult = searchResults.find(r => {
      const tag1 = r.playersInfo?.[0]?.battleTag?.toLowerCase();
      const tag2 = r.player?.playerIds?.[0]?.battleTag?.toLowerCase();
      return tag1 === battleTagLower || tag2 === battleTagLower;
    });

    if (!playerResult) return null;

    const playerLeague = playerResult.league; // 0=GM, 1=Master, 2=Diamond, etc.
    const leagueRank = playerResult.rankNumber;

    // Count players in all leagues above this one
    let playersAbove = 0;
    for (let league = 0; league < playerLeague; league++) {
      try {
        const ladderUrl = `https://website-backend.w3champions.com/api/ladder/${league}?gateWay=${gateway}&gameMode=4&season=${season}`;
        const ladderResponse = await fetch(ladderUrl);
        if (ladderResponse.ok) {
          const ladderData = await ladderResponse.json();
          playersAbove += ladderData.length;
        }
      } catch (e) {
        // Skip if league fetch fails
      }
    }

    return playersAbove + leagueRank;
  } catch (error) {
    console.error("Error calculating overall rank:", error);
    return null;
  }
};

// Fetch ALL-TIME MMR timeline (across all seasons)
const fetchAllTimeMmrTimeline = async (battleTag) => {
  const races = [0, 1, 2, 4, 8]; // random, human, orc, elf, undead
  const allPoints = [];

  // Fetch seasons list first
  let seasons = [];
  try {
    const seasonsResponse = await fetch("https://website-backend.w3champions.com/api/ladder/seasons");
    if (seasonsResponse.ok) {
      seasons = await seasonsResponse.json();
    }
  } catch (e) {
    // Fall back to current season only
    seasons = [{ id: season }];
  }

  // Fetch timeline for each season and race combination (in parallel)
  const promises = [];
  for (const s of seasons) {
    for (const race of races) {
      promises.push(
        fetch(`https://website-backend.w3champions.com/api/players/${encodeURIComponent(battleTag)}/mmr-rp-timeline?gateway=${gateway}&season=${s.id}&race=${race}&gameMode=4`)
          .then(r => r.ok ? r.json() : null)
          .then(data => data?.mmrRpAtDates || [])
          .catch(() => [])
      );
    }
  }

  const results = await Promise.all(promises);
  for (const points of results) {
    allPoints.push(...points);
  }

  // Dedupe by date and sort chronologically
  const uniqueByDate = {};
  for (const point of allPoints) {
    // Keep the point with highest MMR for each date (in case of multiple races)
    if (!uniqueByDate[point.date] || point.mmr > uniqueByDate[point.date].mmr) {
      uniqueByDate[point.date] = point;
    }
  }

  const sorted = Object.values(uniqueByDate).sort((a, b) => new Date(a.date) - new Date(b.date));
  return sorted.map(d => d.mmr);
};

/**
 * Player Overlay Page - for OBS/Streamlabs browser source
 * URL: /overlay/player/{battleTag}
 *
 * Usage in OBS/Streamlabs:
 * 1. Add Browser Source
 * 2. URL: https://yoursite.com/overlay/player/YourTag%23123
 * 3. Width: 400, Height: 150 (adjust as needed)
 * 4. Custom CSS: body { background: transparent !important; }
 */
const PlayerOverlayPage = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [playerData, setPlayerData] = useState(null);

  const getBattleTag = () => {
    const pageUrl = new URL(window.location.href);
    const encoded = pageUrl.pathname.split("/").slice(-1)[0];
    return decodeURIComponent(encoded);
  };

  const getBgStyle = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get("bg") || "bg-gradient-fade";
  };

  const getLayout = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get("layout") || "default";
  };

  useEffect(() => {
    loadData();
    // Refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const battleTag = getBattleTag();
      const name = battleTag.split("#")[0];

      // Fetch profile info, session data, game-mode-stats, country, all-time MMR, and overall rank in parallel
      const [profileInfo, sessionInfo, statsResponse, country, allTimeMmrs, overallRank] = await Promise.all([
        getPlayerProfileInfo(battleTag),
        fetchPlayerSessionData(battleTag),
        fetch(`https://website-backend.w3champions.com/api/players/${encodeURIComponent(battleTag)}/game-mode-stats?gateway=${gateway}&season=${season}`),
        getPlayerCountry(battleTag),
        fetchAllTimeMmrTimeline(battleTag),
        fetchOverallRank(battleTag),
      ]);

      const session = sessionInfo?.session || {};

      // Get 4v4 stats from game-mode-stats API
      let mmr = 0;
      let wins = 0;
      let losses = 0;

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        const fourVsFourStats = statsData.find(s => s.gameMode === 4);
        if (fourVsFourStats) {
          mmr = fourVsFourStats.mmr || session.currentMmr || 0;
          wins = fourVsFourStats.wins || 0;
          losses = fourVsFourStats.losses || 0;
        }
      }

      // Calculate ALL-TIME peak and low from MMR timeline
      const allTimePeak = allTimeMmrs.length > 0 ? Math.max(...allTimeMmrs) : null;
      const allTimeLow = allTimeMmrs.length > 0 ? Math.min(...allTimeMmrs) : null;

      setPlayerData({
        name,
        battleTag,
        profilePic: profileInfo?.profilePicUrl,
        country,
        mmr,
        allTimeLow,
        allTimePeak,
        wins,
        losses,
        sessionChange: session.mmrChange || 0,
        form: session.form || [],
        rank: overallRank,
      });

      setIsLoaded(true);
    } catch (error) {
      console.error("Error loading player data:", error);
      setIsLoaded(true);
    }
  };

  // Transparent background - ready for OBS/Streamlabs
  return (
    <div style={{
      background: 'transparent',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      {isLoaded && playerData && (
        <PlayerOverlay playerData={playerData} layout={getLayout()} bgStyle={getBgStyle()} />
      )}
    </div>
  );
};

export default PlayerOverlayPage;
