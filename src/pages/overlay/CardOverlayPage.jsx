import React, { useState, useEffect, useRef } from "react";
import { findPlayerInOngoingMatches, detectArrangedTeams, fetchPlayerSessionData } from "../../lib/utils";
import { getPlayerProfile } from "../../lib/api";
import GameCardOverlay from "../../components/GameCardOverlay";

const DEMO_MATCH_DATA = {
  mapName: "Painted World",
  teams: [
    {
      players: [
        { battleTag: "Lacoste#22218",    name: "Lacoste",    race: 2, currentMmr: 2049 },
        { battleTag: "bongzilla#21528",  name: "bongzilla",  race: 4, currentMmr: 1807 },
        { battleTag: "ANALysis#21996",   name: "ANALysis",   race: 0, currentMmr: 1695 },
        { battleTag: "riggen1337#2770",  name: "riggen1337", race: 8, currentMmr: 1653 },
      ],
    },
    {
      players: [
        { battleTag: "Tunafish#21774",      name: "Tunafish",      race: 2, currentMmr: 2037 },
        { battleTag: "ThxForNothin#2370",   name: "ThxForNothin",  race: 1, currentMmr: 1826 },
        { battleTag: "ThebestHum#1842",     name: "ThebestHum",    race: 8, currentMmr: 1661 },
        { battleTag: "Heavenwaits#21353",   name: "Heavenwaits",   race: 1, currentMmr: 1616 },
      ],
    },
  ],
};

const urlParam = (key) => new URLSearchParams(window.location.search).get(key);
const getTag = () => decodeURIComponent(window.location.pathname.split("/").slice(-1)[0]);

const CardOverlayPage = () => {
  const [ongoingGame, setOngoingGame]   = useState(null);
  const [displayedGame, setDisplayedGame] = useState(null);
  const [slideOut, setSlideOut]         = useState(false);
  const [avatarUrls, setAvatarUrls]     = useState({});
  const [countries, setCountries]       = useState({});
  const [sessionData, setSessionData]   = useState({});
  const [atGroups, setAtGroups]         = useState({});
  const lastTagsRef = useRef("");

  useEffect(() => {
    document.body.classList.add("overlay-mode");
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => document.body.classList.remove("overlay-mode");
  }, []);

  // Slide in/out
  useEffect(() => {
    if (ongoingGame && !displayedGame) {
      setSlideOut(false);
      setDisplayedGame(ongoingGame);
    } else if (!ongoingGame && displayedGame) {
      setSlideOut(true);
      const t = setTimeout(() => { setDisplayedGame(null); setSlideOut(false); }, 1200);
      return () => clearTimeout(t);
    } else if (ongoingGame && displayedGame) {
      setDisplayedGame(ongoingGame);
    }
  }, [ongoingGame]);

  const fetchProfiles = async (tags) => {
    const [profiles, sessions] = await Promise.all([
      Promise.all(tags.map(tag => getPlayerProfile(tag).catch(() => ({})))),
      Promise.all(tags.map(tag => fetchPlayerSessionData(tag).catch(() => null))),
    ]);
    setAvatarUrls(Object.fromEntries(profiles.map((p, i) => [tags[i], p.profilePicUrl]).filter(([, u]) => u)));
    setCountries(Object.fromEntries(profiles.map((p, i) => [tags[i], p.country]).filter(([, c]) => c)));
    setSessionData(Object.fromEntries(sessions.map((s, i) => [tags[i], {
      recentGames: s?.session?.form || [],
      mmrChange: s?.session?.mmrChange || 0,
    }]).filter(([, s]) => s)));
  };

  const fetchOngoing = async () => {
    try {
      const res  = await fetch("https://website-backend.w3champions.com/api/matches/ongoing");
      const data = await res.json();
      const tag  = getTag();
      const game = findPlayerInOngoingMatches(data, tag);

      if (game?.teams) {
        const players = game.teams.flatMap(t => t.players);
        const tags    = players.map(p => p.battleTag);
        const tagsKey = tags.join(",");

        if (tagsKey !== lastTagsRef.current) {
          lastTagsRef.current = tagsKey;
          const [groups] = await Promise.all([
            detectArrangedTeams(players).catch(() => ({})),
            fetchProfiles(tags),
          ]);
          setAtGroups(groups || {});
        }
        setOngoingGame(game);
      } else {
        setOngoingGame(null);
      }
    } catch (err) {
      console.error("[CardOverlayPage] fetch failed:", err);
    }
  };

  useEffect(() => {
    const mode = urlParam("demo") === "true" ? "demo" : "live";

    if (mode === "demo") {
      const tags = DEMO_MATCH_DATA.teams.flatMap(t => t.players).map(p => p.battleTag);
      fetchProfiles(tags).catch(() => {});
      setOngoingGame(DEMO_MATCH_DATA);
      return;
    }

    fetchOngoing();
    const interval = setInterval(fetchOngoing, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!displayedGame) return null;

  return (
    <GameCardOverlay
      matchData={displayedGame}
      avatarUrls={avatarUrls}
      countries={countries}
      sessionData={sessionData}
      atGroups={atGroups}
      slideOut={slideOut}
      headerVariant={urlParam("header") || "1"}
    />
  );
};

export default CardOverlayPage;
