import React, { useState, useEffect } from "react";
import { gateway, season } from "../../lib/params";
import { GameCard } from "../../components/game/index";

/**
 * Last Game Overlay Page - for OBS/Streamlabs browser source
 * URL: /overlay/lastgame/{battleTag}
 *
 * Query params:
 * - layout: "horizontal" | "vertical" | "compact" | "wide" (default: "vertical")
 *
 * Usage in OBS/Streamlabs:
 * 1. Add Browser Source
 * 2. URL: https://yoursite.com/overlay/lastgame/YourTag%23123
 * 3. Width: 280, Height: 320 (adjust as needed)
 * 4. Custom CSS: body { background: transparent !important; }
 */
const LastGameOverlayPage = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [matchData, setMatchData] = useState(null);
  const [battleTag, setBattleTag] = useState(null);

  const getBattleTag = () => {
    const pageUrl = new URL(window.location.href);
    const encoded = pageUrl.pathname.split("/").slice(-1)[0];
    return decodeURIComponent(encoded);
  };

  const getLayout = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get("layout") || "vertical";
  };

  useEffect(() => {
    const tag = getBattleTag();
    setBattleTag(tag);
    loadData(tag);
    // Refresh every 30 seconds
    const interval = setInterval(() => loadData(tag), 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async (tag) => {
    try {
      // Fetch recent matches
      const matchesUrl = `https://website-backend.w3champions.com/api/matches?playerId=${encodeURIComponent(tag)}&offset=0&gameMode=4&season=${season}&gateway=${gateway}&pageSize=5`;
      const matchesResponse = await fetch(matchesUrl);

      if (!matchesResponse.ok) {
        console.error("Failed to fetch matches");
        setIsLoaded(true);
        return;
      }

      const matchesData = await matchesResponse.json();

      if (!matchesData.matches || matchesData.matches.length === 0) {
        setIsLoaded(true);
        return;
      }

      // Get the most recent match - use the raw match data
      const match = matchesData.matches[0];
      setMatchData(match);
      setIsLoaded(true);
    } catch (error) {
      console.error("Error loading last game data:", error);
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
      {isLoaded && matchData && battleTag && (
        <GameCard
          game={matchData}
          playerBattleTag={battleTag}
          overlay={true}
          layout={getLayout()}
          size="expanded"
        />
      )}
    </div>
  );
};

export default LastGameOverlayPage;
