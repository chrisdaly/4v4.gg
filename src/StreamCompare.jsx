import React, { useState, useEffect } from "react";
import { findPlayerInOngoingMatches, detectArrangedTeams, fetchPlayerSessionData } from "./utils.jsx";
import OnGoingGame from "./OngoingGame.jsx";
import MinimalOverlay from "./MinimalOverlay.jsx";

const StreamCompare = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [ongoingGame, setOngoingGame] = useState(null);
  const [atGroups, setAtGroups] = useState({});
  const [sessionData, setSessionData] = useState({});

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

  const getStreamerTag = () => {
    const pageUrl = new URL(window.location.href);
    const encoded = pageUrl.pathname.split("/").slice(-1)[0];
    return decodeURIComponent(encoded);
  };

  const fetchOngoingGames = async () => {
    try {
      const ongoingResponse = await fetch("https://website-backend.w3champions.com/api/matches/ongoing");
      const ongoingResult = await ongoingResponse.json();
      const tag = getStreamerTag();
      const game = findPlayerInOngoingMatches(ongoingResult, tag);
      setOngoingGame(game);

      // Detect AT groups and fetch session data for minimal overlay
      if (game?.teams) {
        // Extract all player battleTags from both teams
        const players = game.teams.flatMap(team =>
          team.players.map(p => p.battleTag)
        );

        const groups = await detectArrangedTeams(players);
        setAtGroups(groups || {});

        // Fetch session data for all players (in parallel)
        const sessionPromises = players.map(async (battleTag) => {
          const data = await fetchPlayerSessionData(battleTag);
          // data.session.form is array of booleans for current session W/L
          return [battleTag, {
            recentGames: data?.session?.form || [],
            wins: data?.session?.wins || 0,
            losses: data?.session?.losses || 0,
          }];
        });
        const sessionResults = await Promise.all(sessionPromises);
        const sessionObj = Object.fromEntries(sessionResults);
        setSessionData(sessionObj);
      }
    } catch (error) {
      console.error("Error fetching ongoing games:", error);
    }
  };

  if (!isLoaded) return <div style={{ color: '#888', padding: '20px' }}>Loading...</div>;
  if (!ongoingGame) return <div style={{ color: '#888', padding: '20px' }}>No ongoing game found for {getStreamerTag()}</div>;

  const styles = [
    { name: "Original (default)", className: "stream-style-default" },
    { name: "Clean (current)", className: "stream-style-clean" },
    { name: "Broadcast", className: "stream-style-broadcast" },
    { name: "Minimal", className: "stream-style-minimal-bar" },
    { name: "Grid", className: "stream-style-grid" },
  ];

  return (
    <div style={{ padding: '20px', background: '#0a0a0a', minHeight: '100vh' }}>
      <h1 style={{ color: '#fcdb33', marginBottom: '30px', fontFamily: 'Friz_Quadrata_Bold' }}>
        Stream Overlay Comparison
      </h1>

      {styles.map((style, idx) => (
        <div key={idx} style={{ marginBottom: '40px' }}>
          <h3 style={{ color: '#888', marginBottom: '10px', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            {style.name}
            <span style={{ color: '#666', marginLeft: '10px', fontSize: '12px' }}>
              ?style={style.className.replace('stream-style-', '')}
            </span>
          </h3>
          <div id="StreamOverlay" className={style.className} style={{ display: 'inline-block' }}>
            <OnGoingGame ongoingGameData={ongoingGame} compact={true} streamerTag={getStreamerTag()} />
          </div>
        </div>
      ))}

      {/* Minimal Overlay on WC3 mock */}
      <h2 style={{ color: '#4ade80', marginBottom: '20px', marginTop: '40px', fontFamily: 'Friz_Quadrata_Bold' }}>
        Minimal Overlay (on WC3 game mock)
      </h2>

      <div style={{
        background: 'linear-gradient(180deg, #1a2a1a 0%, #0d1a0d 40%, #1a1a10 70%, #2a2015 100%)',
        backgroundImage: `
          radial-gradient(circle at 30% 40%, rgba(0, 80, 0, 0.3) 0%, transparent 40%),
          radial-gradient(circle at 70% 30%, rgba(0, 50, 80, 0.2) 0%, transparent 30%),
          linear-gradient(180deg, #1a2a1a 0%, #0d1a0d 40%, #1a1a10 70%, #2a2015 100%)
        `,
        padding: '40px 20px 80px 20px',
        borderRadius: '8px',
        position: 'relative',
        minHeight: '200px',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}>
        {/* Fake WC3 UI bar at bottom */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '60px',
          background: 'linear-gradient(180deg, #3d2817 0%, #1a0f08 100%)',
          borderTop: '2px solid #8b7355',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{
            width: '120px',
            height: '50px',
            background: 'linear-gradient(180deg, #2a1a0a 0%, #1a0f05 100%)',
            border: '1px solid #8b7355',
            borderRadius: '4px',
          }} />
        </div>
        {/* Overlay positioned above fake UI */}
        <div style={{ marginBottom: '70px' }}>
          <MinimalOverlay
            matchData={ongoingGame}
            atGroups={atGroups}
            sessionData={sessionData}
            streamerTag={getStreamerTag()}
          />
        </div>
      </div>
    </div>
  );
};

export default StreamCompare;
