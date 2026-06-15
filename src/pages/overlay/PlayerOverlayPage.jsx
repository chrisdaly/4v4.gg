import React, { useState, useEffect } from "react";
import { fetchPlayerSessionData } from "../../lib/utils";
import { getPlayerProfile, getPlayerTimelineAllTime, getPlayerTimelineMerged, getPlayerMatches } from "../../lib/api";
import { gateway, season } from "../../lib/params";
import PlayerOverlay from "../../components/PlayerOverlay";

// Fetch overall rank + adjacent ladder entries in one pass
const fetchLadderContext = async (battleTag) => {
  try {
    const battleTagLower = battleTag.toLowerCase();

    const searchUrl = `https://website-backend.w3champions.com/api/ladder/search?gateWay=${gateway}&searchFor=${encodeURIComponent(battleTag.split("#")[0])}&gameMode=4&season=${season}`;
    const searchResponse = await fetch(searchUrl);
    if (!searchResponse.ok) return { overallRank: null, ladderNeighbors: null };

    const searchResults = await searchResponse.json();
    const playerResult = searchResults.find(r => {
      const tag1 = r.playersInfo?.[0]?.battleTag?.toLowerCase();
      const tag2 = r.player?.playerIds?.[0]?.battleTag?.toLowerCase();
      return tag1 === battleTagLower || tag2 === battleTagLower;
    });

    if (!playerResult) return { overallRank: null, ladderNeighbors: null };

    const playerLeague = playerResult.league;
    const leagueRank = playerResult.rankNumber;

    // Fetch above-league counts + player's league ladder in parallel
    const leaguesAbove = Array.from({ length: playerLeague }, (_, i) => i);
    const [ladderResponse, ...aboveCountResults] = await Promise.all([
      fetch(`https://website-backend.w3champions.com/api/ladder/${playerLeague}?gateWay=${gateway}&gameMode=4&season=${season}`),
      ...leaguesAbove.map(l =>
        fetch(`https://website-backend.w3champions.com/api/ladder/${l}?gateWay=${gateway}&gameMode=4&season=${season}`)
          .then(r => r.ok ? r.json().then(d => d.length) : 0)
          .catch(() => 0)
      )
    ]);

    const playersAbove = aboveCountResults.reduce((sum, n) => sum + n, 0);
    const overallRank = playersAbove + leagueRank;

    if (!ladderResponse.ok) return { overallRank, ladderNeighbors: null };

    const ladderData = await ladderResponse.json();
    const sorted = [...ladderData].sort((a, b) => a.rankNumber - b.rankNumber);
    const playerIdx = sorted.findIndex(e => e.rankNumber === leagueRank);

    const entryToNeighbor = (entry, rank) => {
      if (!entry) return null;
      const name = entry.player?.name || entry.playersInfo?.[0]?.battleTag?.split('#')[0];
      const mmr = Math.round(entry.player?.mmr || 0);
      return { name, mmr, rank };
    };

    return {
      overallRank,
      ladderNeighbors: {
        above: playerIdx > 0 ? entryToNeighbor(sorted[playerIdx - 1], overallRank - 1) : null,
        below: playerIdx < sorted.length - 1 ? entryToNeighbor(sorted[playerIdx + 1], overallRank + 1) : null,
      }
    };
  } catch (error) {
    console.error("Error fetching ladder context:", error);
    return { overallRank: null, ladderNeighbors: null };
  }
};

const extractLastGame = (matches, battleTagLower) => {
  if (!matches || matches.length === 0) return null;
  const match = matches[0];
  let won = null;
  for (const team of match.teams || []) {
    const player = team.players?.find(p => p.battleTag?.toLowerCase() === battleTagLower);
    if (player) { won = player.won; break; }
  }
  const mapName = match.mapName?.replace(/^\(\d\)\s*/, '') || 'Unknown';
  return { mapName, won, durationInSeconds: match.durationInSeconds || null };
};

/**
 * Player Overlay Page - for OBS/Streamlabs browser source
 * URL: /overlay/player/{battleTag}
 *
 * Usage in OBS/Streamlabs:
 * 1. Add Browser Source
 * 2. URL: https://yoursite.com/overlay/player/YourTag%23123
 * 3. Width: 320, Height: 380 (for layout=rich)
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

  // Make body fully transparent for OBS browser source
  useEffect(() => {
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.backgroundColor = 'transparent';
    document.body.style.background = 'transparent';
    document.body.classList.add('overlay-mode');
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const battleTag = getBattleTag();
      const name = battleTag.split("#")[0];

      const [profile, sessionInfo, statsResponse, allTimeMmrs, seasonMmrs, recentMatches, ladderContext] = await Promise.all([
        getPlayerProfile(battleTag),
        fetchPlayerSessionData(battleTag),
        fetch(`https://website-backend.w3champions.com/api/players/${encodeURIComponent(battleTag)}/game-mode-stats?gateway=${gateway}&season=${season}`),
        getPlayerTimelineAllTime(battleTag),
        getPlayerTimelineMerged(battleTag),
        getPlayerMatches(battleTag, 5),
        fetchLadderContext(battleTag),
      ]);

      const session = sessionInfo?.session || {};

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

      const allTimePeak = allTimeMmrs.length > 0 ? Math.max(...allTimeMmrs) : null;
      const allTimeLow = allTimeMmrs.length > 0 ? Math.min(...allTimeMmrs) : null;

      const lastGame = extractLastGame(recentMatches?.matches || [], battleTag.toLowerCase());

      setPlayerData({
        name,
        battleTag,
        profilePic: profile?.profilePicUrl,
        country: profile?.country,
        mmr,
        allTimeLow,
        allTimePeak,
        seasonMmrs,
        wins,
        losses,
        sessionChange: session.mmrChange || 0,
        form: session.form || [],
        rank: ladderContext.overallRank,
        ladderNeighbors: ladderContext.ladderNeighbors,
        lastGame,
      });

      setIsLoaded(true);
    } catch (error) {
      console.error("Error loading player data:", error);
      setIsLoaded(true);
    }
  };

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
