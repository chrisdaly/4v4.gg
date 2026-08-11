import React, { useState, useEffect } from 'react';
import GameFoundScreen from '../components/GameFoundScreen';
import { findPlayerInOngoingMatches, detectArrangedTeams } from '../lib/utils';
import { getPlayerProfile, getOngoingMatches, fetchPlayerForm } from '../lib/api';

const POLL_INTERVAL = 30000;

const getDevBattletag = () => new URLSearchParams(window.location.search).get('battletag') || null;

const App = () => {
  const [battletag, setBattletag] = useState(null);
  const [ongoingGame, setOngoingGame] = useState(null);
  const [displayedGame, setDisplayedGame] = useState(null);
  const [slideOut, setSlideOut] = useState(false);
  const [avatarUrls, setAvatarUrls] = useState({});
  const [countries, setCountries] = useState({});
  const [sessionData, setSessionData] = useState({});

  useEffect(() => {
    document.body.style.background = 'transparent';
    document.documentElement.style.background = 'transparent';
    document.body.style.overflow = 'hidden';
  }, []);

  // Read battletag from Twitch config (or ?battletag= in dev)
  useEffect(() => {
    const devTag = getDevBattletag();
    if (devTag) { setBattletag(devTag); return; }

    const loadConfig = () => {
      try {
        const raw = window.Twitch?.ext?.configuration?.broadcaster?.content;
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.battletag) setBattletag(parsed.battletag);
        }
      } catch {}
    };

    window.Twitch?.ext?.configuration?.onChanged(loadConfig);
    if (window.Twitch?.ext) window.Twitch.ext.onAuthorized(() => loadConfig());
    loadConfig();
  }, []);

  // Slide in/out when game starts or ends
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

  // Poll W3C API
  useEffect(() => {
    if (!battletag) return;

    const fetchGame = async () => {
      try {
        const data = await getOngoingMatches();
        const game = findPlayerInOngoingMatches(data, battletag);

        if (game?.teams) {
          const players = game.teams.flatMap(t => t.players);
          const tags = players.map(p => p.battleTag);

          // Fetch profiles for avatars + countries (only when game changes)
          const currentId = game.id || tags.join(',');
          const prevId = displayedGame?.id || (displayedGame ? displayedGame.teams?.flatMap(t => t.players).map(p => p.battleTag).join(',') : null);

          if (currentId !== prevId) {
            const [, profiles, forms] = await Promise.all([
              detectArrangedTeams(players).catch(() => ({})),
              Promise.all(tags.map(tag => getPlayerProfile(tag).catch(() => ({})))),
              Promise.all(tags.map(tag => fetchPlayerForm(tag).catch(() => []))),
            ]);
            setAvatarUrls(Object.fromEntries(profiles.map((p, i) => [tags[i], p.profilePicUrl]).filter(([, u]) => u)));
            setCountries(Object.fromEntries(profiles.map((p, i) => [tags[i], p.country]).filter(([, c]) => c)));
            setSessionData(Object.fromEntries(tags.map((tag, i) => [tag, { form: forms[i] }])));
          }

          setOngoingGame(game);
        } else {
          setOngoingGame(null);
        }
      } catch (err) {
        console.error('[4v4.gg extension] fetch failed:', err);
      }
    };

    fetchGame();
    const interval = setInterval(fetchGame, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [battletag]);

  if (!displayedGame) return null;

  return (
    <GameFoundScreen
      matchData={displayedGame}
      avatarUrls={avatarUrls}
      countries={countries}
      sessionData={sessionData}
      slideOut={slideOut}
    />
  );
};

export default App;
