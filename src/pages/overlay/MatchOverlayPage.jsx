import React, { useState, useEffect } from "react";
import { findPlayerInOngoingMatches, detectArrangedTeams, fetchPlayerSessionData } from "../../lib/utils";
import { getPlayerProfile } from "../../lib/api";
import MatchOverlay from "../../components/MatchOverlay";

/**
 * Match Overlay Page - for OBS/Streamlabs browser source
 * URL: /overlay/match/{battleTag}
 *
 * Usage in OBS/Streamlabs:
 * 1. Add Browser Source
 * 2. URL: https://yoursite.com/overlay/match/YourTag%23123
 * 3. Width: 1200, Height: 200 (adjust as needed)
 * 4. Custom CSS: body { background: transparent !important; }
 */
const MatchOverlayPage = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [ongoingGame, setOngoingGame] = useState(null);
  const [atGroups, setAtGroups] = useState({});
  const [sessionData, setSessionData] = useState({});
  const [countries, setCountries] = useState({});

  // Make body fully transparent for OBS browser source
  useEffect(() => {
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.backgroundColor = 'transparent';
    document.body.style.background = 'transparent';
    document.body.classList.add('overlay-mode');
  }, []);

  const getStreamerTag = () => {
    const pageUrl = new URL(window.location.href);
    const encoded = pageUrl.pathname.split("/").slice(-1)[0];
    return decodeURIComponent(encoded);
  };

  const getMatchStyle = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get("style") || "default";
  };

  const getLayout = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get("layout") || "horizontal";
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(fetchOngoingGames, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      await fetchOngoingGames();
      setIsLoaded(true);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const fetchOngoingGames = async () => {
    try {
      const ongoingResponse = await fetch("https://website-backend.w3champions.com/api/matches/ongoing");
      const ongoingResult = await ongoingResponse.json();
      const tag = getStreamerTag();
      const game = findPlayerInOngoingMatches(ongoingResult, tag);
      setOngoingGame(game);

      // Detect AT groups and fetch session data
      if (game?.teams) {
        const playerObjects = game.teams.flatMap(team => team.players);
        const battleTags = playerObjects.map(p => p.battleTag);

        const groups = await detectArrangedTeams(playerObjects);
        setAtGroups(groups || {});

        // Fetch session data and profiles for all players (in parallel)
        const sessionPromises = battleTags.map(async (battleTag) => {
          const data = await fetchPlayerSessionData(battleTag);
          return [battleTag, {
            recentGames: data?.session?.form || [],
            wins: data?.session?.wins || 0,
            losses: data?.session?.losses || 0,
          }];
        });
        const profilePromises = battleTags.map(async (battleTag) => {
          const profile = await getPlayerProfile(battleTag);
          return [battleTag, profile.country];
        });

        const [sessionResults, profileResults] = await Promise.all([
          Promise.all(sessionPromises),
          Promise.all(profilePromises),
        ]);
        setSessionData(Object.fromEntries(sessionResults));
        setCountries(Object.fromEntries(profileResults.filter(([, c]) => c)));
      }
    } catch (error) {
      console.error("Error fetching ongoing games:", error);
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
      {!isLoaded && null}
      {isLoaded && !ongoingGame && null}
      {isLoaded && ongoingGame && (
        <MatchOverlay
          matchData={ongoingGame}
          atGroups={atGroups}
          sessionData={sessionData}
          countries={countries}
          streamerTag={getStreamerTag()}
          matchStyle={getMatchStyle()}
          layout={getLayout()}
        />
      )}
    </div>
  );
};

export default MatchOverlayPage;
