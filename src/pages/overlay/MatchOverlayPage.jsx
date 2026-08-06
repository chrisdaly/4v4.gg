import React, { useState, useEffect, useRef } from "react";
import { findPlayerInOngoingMatches, detectArrangedTeams, fetchPlayerSessionData } from "../../lib/utils";
import { getPlayerProfile, getPlayerStats } from "../../lib/api";
import MatchOverlay from "../../components/MatchOverlay";
import GameIntroScreen from "../../components/GameIntroScreen";
import GameOutroScreen from "../../components/GameOutroScreen";

const DEMO_MATCH_DATA = {
  mapName: "Painted World",
  teams: [
    {
      players: [
        { battleTag: "Lacoste#22218", name: "Lacoste", race: 2, currentMmr: 2049 },
        { battleTag: "bongzilla#21528", name: "bongzilla", race: 4, currentMmr: 1807 },
        { battleTag: "ANALysis#21996", name: "ANALysis", race: 0, currentMmr: 1695 },
        { battleTag: "riggen1337#2770", name: "riggen1337", race: 8, currentMmr: 1653 },
      ],
    },
    {
      players: [
        { battleTag: "Tunafish#21774", name: "Tunafish", race: 2, currentMmr: 2037 },
        { battleTag: "ThxForNothin#2370", name: "ThxForNothin", race: 1, currentMmr: 1826 },
        { battleTag: "ThebestHum#1842", name: "ThebestHum", race: 8, currentMmr: 1661 },
        { battleTag: "Heavenwaits#21353", name: "Heavenwaits", race: 1, currentMmr: 1616 },
      ],
    },
  ],
};

const DEMO_COUNTRIES = {};
const DEMO_AT_GROUPS = {};

// ── URL param helpers ────────────────────────────────────────────────────────
const urlParam = (key) => new URLSearchParams(window.location.search).get(key);

const MatchOverlayPage = () => {
  // Core data
  const [isLoaded, setIsLoaded] = useState(false);
  const [ongoingGame, setOngoingGame] = useState(null);
  const [atGroups, setAtGroups] = useState({});
  const [sessionData, setSessionData] = useState({});
  const [countries, setCountries] = useState({});
  const [avatarUrls, setAvatarUrls] = useState({});
  const [playerStats, setPlayerStats] = useState({});

  // Displayed game (lags ongoingGame to allow slide-out animation)
  const [displayedGame, setDisplayedGame] = useState(null);
  const [slideOut, setSlideOut] = useState(false);

  // Intro (splash)
  const [introPhase, setIntroPhase] = useState(false);
  const [introDismissing, setIntroDismissing] = useState(false);
  const introGameId = useRef(null);

  // Outro (score screen)
  const [outroGame, setOutroGame] = useState(null);       // finished match data
  const [outroPhase, setOutroPhase] = useState(false);
  const [outroDismissing, setOutroDismissing] = useState(false);
  const lastGameRef = useRef(null); // track live game to detect end

  // OBS: transparent background
  useEffect(() => {
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.backgroundColor = 'transparent';
    document.body.style.background = 'transparent';
    document.body.classList.add('overlay-mode');
  }, []);

  // Slide in/out when game starts or ends
  useEffect(() => {
    if (ongoingGame && !displayedGame) {
      setSlideOut(false);
      setDisplayedGame(ongoingGame);
    } else if (!ongoingGame && displayedGame) {
      setSlideOut(true);
      const t = setTimeout(() => {
        setDisplayedGame(null);
        setSlideOut(false);
        introGameId.current = null;
      }, 1000);
      return () => clearTimeout(t);
    } else if (ongoingGame && displayedGame) {
      setDisplayedGame(ongoingGame);
    }
  }, [ongoingGame]);

  // Intro/outro only fire when explicitly in screens-only mode
  const introEnabled = urlParam("screens") === "only";
  useEffect(() => {
    if (!ongoingGame || !introEnabled) return;
    const gameId = ongoingGame.id || JSON.stringify(ongoingGame.teams?.map(t => t.players?.map(p => p.battleTag)));
    if (introGameId.current === gameId) return;
    introGameId.current = gameId;

    setIntroPhase(true);
    setIntroDismissing(false);
    const dismissTimer = setTimeout(() => setIntroDismissing(true), 10000);
    const hideTimer = setTimeout(() => { setIntroPhase(false); setIntroDismissing(false); }, 11200);
    return () => { clearTimeout(dismissTimer); clearTimeout(hideTimer); };
  }, [ongoingGame]);

  // HUD sync — when syncScreens=true, delay HUD appearance to match intro screen duration (11.2s)
  const syncScreens = urlParam("syncScreens") === "true";
  const hudGameId = useRef(null);
  const [hudReady, setHudReady] = useState(!syncScreens);

  useEffect(() => {
    if (!displayedGame) {
      if (syncScreens) setHudReady(false);
      hudGameId.current = null;
      return;
    }
    const gameId = displayedGame.id || JSON.stringify(displayedGame.teams?.map(t => t.players?.map(p => p.battleTag)));
    if (hudGameId.current === gameId) return;
    hudGameId.current = gameId;
    if (syncScreens) {
      setHudReady(false);
      const t = setTimeout(() => setHudReady(true), 12200);
      return () => clearTimeout(t);
    }
  }, [displayedGame]);

  // Outro sequence — show score screen, auto-dismiss after 20s
  // finishedMatch = { match, playerScores }
  const showOutro = (finishedMatch) => {
    setOutroGame(finishedMatch);
    setOutroPhase(true);
    setOutroDismissing(false);
    const dismissTimer = setTimeout(() => setOutroDismissing(true), 9500);
    const hideTimer = setTimeout(() => { setOutroPhase(false); setOutroDismissing(false); setOutroGame(null); }, 10700);
    // store timers so cleanup could happen (not critical for demo)
    return () => { clearTimeout(dismissTimer); clearTimeout(hideTimer); };
  };

  const getStreamerTag = () => decodeURIComponent(window.location.pathname.split("/").slice(-1)[0]);
  const getMatchStyle = () => urlParam("style") || "default";
  const getLayout    = () => urlParam("layout") || "horizontal";
  const getHudIntegrated = () => urlParam("hud") === "true";

  // ── Fetch helpers ──────────────────────────────────────────────────────────

  const fetchProfiles = async (battleTags) => {
    const [profiles, stats, sessions] = await Promise.all([
      Promise.all(battleTags.map(tag => getPlayerProfile(tag).catch(() => ({})))),
      Promise.all(battleTags.map(tag => getPlayerStats(tag).catch(() => null))),
      Promise.all(battleTags.map(tag => fetchPlayerSessionData(tag).catch(() => null))),
    ]);
    setAvatarUrls(Object.fromEntries(profiles.map((p, i) => [battleTags[i], p.profilePicUrl]).filter(([, u]) => u)));
    setCountries(Object.fromEntries(profiles.map((p, i) => [battleTags[i], p.country]).filter(([, c]) => c)));
    setPlayerStats(Object.fromEntries(stats.map((s, i) => [battleTags[i], s]).filter(([, s]) => s)));
    setSessionData(Object.fromEntries(sessions.map((s, i) => [battleTags[i], {
      recentGames: s?.session?.form || [],
      wins: s?.session?.wins || 0,
      losses: s?.session?.losses || 0,
    }])));
  };

  const fetchOutroForTag = async (tag) => {
    try {
      const season = 25;
      const search = await fetch(`https://website-backend.w3champions.com/api/matches/search?playerId=${encodeURIComponent(tag)}&gameMode=4&season=${season}&gateway=20&pageSize=1`).then(r => r.json());
      const recentId = search?.matches?.[0]?.id;
      if (!recentId) return null;
      const full = await fetch(`https://website-backend.w3champions.com/api/matches/${recentId}`).then(r => r.json());
      return { match: full.match || full, playerScores: full.playerScores || [] };
    } catch { return null; }
  };

  // ── Initialisation ────────────────────────────────────────────────────────

  useEffect(() => {
    const mode = urlParam("demo") === "true" ? "demo"
      : urlParam("demoOutro") ? "demoOutro"
      : urlParam("preview") === "true" ? "preview"
      : urlParam("matchId") ? "matchId"
      : "live";

    if (mode === "demo") {
      const tags = DEMO_MATCH_DATA.teams.flatMap(t => t.players).map(p => p.battleTag);
      fetchProfiles(tags)
        .catch(err => console.error("[demo] profiles failed:", err))
        .finally(() => { setOngoingGame(DEMO_MATCH_DATA); setIsLoaded(true); });
      return;
    }

    if (mode === "demoOutro") {
      const matchId = urlParam("demoOutro");
      (async () => {
        const res = await fetch(`https://website-backend.w3champions.com/api/matches/${matchId}`).then(r => r.json()).catch(() => null);
        const match = res?.match || res;
        if (match?.teams) {
          const tags = match.teams.flatMap(t => t.players).map(p => p.battleTag);
          await fetchProfiles(tags).catch(() => {});
          setOutroGame({ match, playerScores: res?.playerScores || [] });
          setOutroPhase(true);
        }
        setIsLoaded(true);
      })();
      return;
    }

    if (mode === "preview") {
      setOngoingGame(DEMO_MATCH_DATA);
      setAtGroups(DEMO_AT_GROUPS);
      setCountries(DEMO_COUNTRIES);
      setIsLoaded(true);
      return;
    }

    if (mode === "matchId") {
      (async () => {
        const matchId = urlParam("matchId");
        const res = await fetch(`https://website-backend.w3champions.com/api/matches/${matchId}`).then(r => r.json()).catch(() => null);
        const match = res?.match || res;
        if (match?.teams) {
          const tags = match.teams.flatMap(t => t.players).map(p => p.battleTag);
          await fetchProfiles(tags).catch(() => {});
          const groups = await detectArrangedTeams(match.teams.flatMap(t => t.players)).catch(() => ({}));
          setAtGroups(groups || {});
          setOngoingGame({ ...match, mapName: match.mapName || match.map });
        }
        setIsLoaded(true);
      })();
      return;
    }

    // Live mode — poll for streamer's game
    fetchOngoingGames().finally(() => setIsLoaded(true));
    const interval = setInterval(fetchOngoingGames, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchOngoingGames = async () => {
    try {
      const res = await fetch("https://website-backend.w3champions.com/api/matches/ongoing");
      const data = await res.json();
      const tag = getStreamerTag();
      const game = findPlayerInOngoingMatches(data, tag);

      // Game ended — fire outro
      if (!game && lastGameRef.current && introEnabled) {
        const finished = await fetchOutroForTag(tag);
        if (finished) showOutro(finished);
      }
      lastGameRef.current = game || null;

      if (game?.teams) {
        const playerObjects = game.teams.flatMap(t => t.players);
        const tags = playerObjects.map(p => p.battleTag);
        const [groups] = await Promise.all([
          detectArrangedTeams(playerObjects),
          fetchProfiles(tags),
        ]);
        setAtGroups(groups || {});
        setOngoingGame(game);
      } else {
        setOngoingGame(null);
      }
    } catch (err) {
      console.error("fetchOngoingGames failed:", err);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const layout = getLayout();
  const matchStyle = getMatchStyle();
  const streamerTag = getStreamerTag();
  const screensOnly = urlParam("screens") === "only";

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'transparent', overflow: 'hidden' }}>

      {/* Fullscreen intro — fires when a new game starts (screens source only) */}
      {introPhase && displayedGame && (
        <GameIntroScreen
          matchData={displayedGame}
          avatarUrls={avatarUrls}
          countries={countries}
          sessionData={sessionData}
          playerStats={playerStats}
          matchStyle={matchStyle}
          dismissing={introDismissing}
        />
      )}

      {/* Fullscreen score screen — fires when game ends (screens source only) */}
      {outroPhase && outroGame && (
        <GameOutroScreen
          matchData={outroGame}
          avatarUrls={avatarUrls}
          countries={countries}
          sessionData={sessionData}
          matchStyle={matchStyle}
          dismissing={outroDismissing}
          streamerTag={streamerTag}
        />
      )}

      {/* HUD strip — bottom bar, hidden in screens-only mode; delayed when syncScreens=true */}
      {!screensOnly && isLoaded && displayedGame && hudReady && (
        <div style={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0,
          display: 'flex',
          justifyContent: 'center',
          padding: '0 0 20px',
        }}>
          <MatchOverlay
            matchData={displayedGame}
            atGroups={atGroups}
            sessionData={sessionData}
            countries={countries}
            avatarUrls={avatarUrls}
            streamerTag={streamerTag}
            matchStyle={matchStyle}
            layout={layout}
            hudIntegrated={getHudIntegrated()}
            slideOut={slideOut}
            hidden={(introPhase && !introDismissing) || outroPhase}
          />
        </div>
      )}

    </div>
  );
};

export default MatchOverlayPage;
