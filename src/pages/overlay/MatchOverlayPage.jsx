import React, { useState, useEffect } from "react";
import { findPlayerInOngoingMatches, detectArrangedTeams, fetchPlayerSessionData } from "../../lib/utils";
import { getPlayerProfile } from "../../lib/api";
import MatchOverlay from "../../components/MatchOverlay";

// Demo data for OBS setup - includes varied name lengths for testing truncation
const DEMO_MATCH_DATA = {
  teams: [
    {
      players: [
        { battleTag: "HuyaYumiko0414#1234", name: "HuyaYumiko0414", race: 4, currentMmr: 2234 },
        { battleTag: "Lynfan#1818", name: "Lynfan", race: 1, currentMmr: 2243 },
        { battleTag: "bobbyog#1234", name: "bobbyog", race: 2, currentMmr: 2020 },
        { battleTag: "Lacoste#1979", name: "Lacoste", race: 8, currentMmr: 2032 },
      ],
    },
    {
      players: [
        { battleTag: "UnapologeticOne#1954", name: "UnapologeticOne", race: 2, currentMmr: 1954 },
        { battleTag: "sjow#1773", name: "sjow", race: 4, currentMmr: 1986 },
        { battleTag: "lllllllinVleh#1796", name: "lllllllinVleh", race: 8, currentMmr: 1796 },
        { battleTag: "CrocBlanc#1746", name: "CrocBlanc", race: 1, currentMmr: 1746 },
      ],
    },
  ],
};

const DEMO_COUNTRIES = {
  "HuyaYumiko0414#1234": "cn",
  "Lynfan#1818": "cn",
  "bobbyog#1234": "ca",
  "Lacoste#1979": "de",
  "UnapologeticOne#1954": "de",
  "sjow#1773": "de",
  "lllllllinVleh#1796": "cn",
  "CrocBlanc#1746": "fr",
};

const DEMO_AT_GROUPS = {
  group1: ["HuyaYumiko0414#1234", "Lynfan#1818"],
};

/**
 * Match Overlay Page - for OBS/Streamlabs browser source
 * URL: /overlay/match/{battleTag}
 *
 * Usage in OBS/Streamlabs:
 * 1. Add Browser Source
 * 2. URL: https://yoursite.com/overlay/match/YourTag%23123
 * 3. Width: 1200, Height: 200 (horizontal) or 240x450 (vertical)
 * 4. Custom CSS: body { background: transparent !important; }
 *
 * URL parameters:
 *   ?preview=true - shows demo data for OBS positioning (remove when done)
 *   ?demo=true    - same as preview
 *   ?matchId=xyz  - loads a specific finished match by ID
 *   ?layout=vertical - use vertical sidebar layout
 *   ?style=xxx    - overlay style (default, clean-gold, frame, etc.)
 */
const MatchOverlayPage = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [ongoingGame, setOngoingGame] = useState(null);
  const [atGroups, setAtGroups] = useState({});
  const [sessionData, setSessionData] = useState({});
  const [countries, setCountries] = useState({});

  // Animation state
  const [displayedGame, setDisplayedGame] = useState(null);
  const [isSliding, setIsSliding] = useState(false);
  const [slideDirection, setSlideDirection] = useState('in'); // 'in' or 'out'

  // Make body fully transparent for OBS browser source
  useEffect(() => {
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.backgroundColor = 'transparent';
    document.body.style.background = 'transparent';
    document.body.classList.add('overlay-mode');
  }, []);

  // Handle slide in/out transitions
  useEffect(() => {
    if (ongoingGame && !displayedGame) {
      // Game started - slide in
      setSlideDirection('in');
      setDisplayedGame(ongoingGame);
    } else if (!ongoingGame && displayedGame) {
      // Game ended - fade out, then remove
      setSlideDirection('out');
      setIsSliding(true);
      const timer = setTimeout(() => {
        setDisplayedGame(null);
        setIsSliding(false);
      }, 1000); // Match animation duration
      return () => clearTimeout(timer);
    } else if (ongoingGame && displayedGame) {
      // Game updated (same game, new data)
      setDisplayedGame(ongoingGame);
    }
  }, [ongoingGame]);

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

  const isDemo = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get("demo") === "true";
  };

  const isPreview = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get("preview") === "true";
  };

  const getMatchId = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get("matchId");
  };

  useEffect(() => {
    // Demo mode - use static data, no polling
    if (isDemo()) {
      setOngoingGame(DEMO_MATCH_DATA);
      setAtGroups(DEMO_AT_GROUPS);
      setCountries(DEMO_COUNTRIES);
      setIsLoaded(true);
      return;
    }

    // Match ID mode - fetch specific finished match
    const matchId = getMatchId();
    if (matchId) {
      fetchFinishedMatch(matchId);
      return;
    }

    // Preview mode - show demo data for OBS positioning, no polling
    if (isPreview()) {
      setOngoingGame(DEMO_MATCH_DATA);
      setAtGroups(DEMO_AT_GROUPS);
      setCountries(DEMO_COUNTRIES);
      setIsLoaded(true);
      return; // Don't poll - preview is for static OBS positioning
    }

    // Normal mode - poll for live game
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

  const fetchFinishedMatch = async (matchId) => {
    try {
      const response = await fetch(`https://website-backend.w3champions.com/api/matches/${matchId}`);
      const match = await response.json();
      if (match?.teams) {
        setOngoingGame(match);

        // Fetch countries for all players
        const playerObjects = match.teams.flatMap(team => team.players);
        const battleTags = playerObjects.map(p => p.battleTag);

        const profilePromises = battleTags.map(async (battleTag) => {
          try {
            const profile = await getPlayerProfile(battleTag);
            return [battleTag, profile.country];
          } catch {
            return [battleTag, null];
          }
        });

        const profileResults = await Promise.all(profilePromises);
        setCountries(Object.fromEntries(profileResults.filter(([, c]) => c)));
      }
      setIsLoaded(true);
    } catch (error) {
      console.error("Error fetching match:", error);
      setIsLoaded(true);
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
  // Renders nothing when no game (auto-hide behavior)
  return (
    <div style={{
      background: 'transparent',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      {isLoaded && displayedGame && (
        <MatchOverlay
          matchData={displayedGame}
          atGroups={atGroups}
          sessionData={sessionData}
          countries={countries}
          streamerTag={getStreamerTag()}
          matchStyle={getMatchStyle()}
          layout={getLayout()}
          slideOut={slideDirection === 'out'}
        />
      )}
    </div>
  );
};

export default MatchOverlayPage;
