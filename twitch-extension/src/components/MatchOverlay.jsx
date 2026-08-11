import React, { useState, useEffect } from "react";
import { MmrComparison } from "./MmrComparison";
import { raceMapping } from "../lib/constants";

const PHASE_MMR = 0;
const PHASE_FLAG = 1;
const PHASE_COUNT = 2;

const CountryFlag = ({ name, className }) => {
  if (!name) return null;
  const code = name.toLowerCase();
  return (
    <img
      src={`https://flagcdn.com/16x12/${code}.png`}
      srcSet={`https://flagcdn.com/32x24/${code}.png 2x`}
      alt={code}
      className={className}
      loading="lazy"
    />
  );
};

const MatchOverlay = ({ matchData, atGroups = {}, countries = {}, avatarUrls = {}, mmrDuration = 8000, flagDuration = 4000, streamerTag = "", matchStyle = "default", slideOut = false }) => {
  const [phase, setPhase] = useState(PHASE_MMR);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const hasCountries = Object.keys(countries).length > 0;
    if (!hasCountries) return;

    const durations = [mmrDuration, flagDuration];
    let fadeTimeout;
    const timeout = setTimeout(() => {
      setFading(true);
      fadeTimeout = setTimeout(() => {
        setPhase(prev => (prev + 1) % PHASE_COUNT);
        setFading(false);
      }, 800);
    }, durations[phase]);

    return () => { clearTimeout(timeout); clearTimeout(fadeTimeout); };
  }, [phase, countries, mmrDuration, flagDuration]);

  const getATGroupId = React.useMemo(() => {
    const cache = {};
    let nextGroupId = 1;
    Object.values(atGroups).forEach(group => {
      if (!Array.isArray(group) || group.length === 0) return;
      const existingId = group.find(tag => cache[tag.toLowerCase()]);
      if (existingId) {
        const id = cache[existingId.toLowerCase()];
        group.forEach(tag => { cache[tag.toLowerCase()] = id; });
      } else {
        const id = nextGroupId++;
        group.forEach(tag => { cache[tag.toLowerCase()] = id; });
      }
    });
    return (battleTag) => cache[battleTag?.toLowerCase()] || 0;
  }, [atGroups]);

  if (!matchData?.teams || matchData.teams.length < 2) return null;

  const streamerTagLower = streamerTag.toLowerCase();
  const team0Players = matchData.teams[0]?.players || [];
  const team1Players = matchData.teams[1]?.players || [];

  const streamerOnTeam0 = team0Players.some(p =>
    p.battleTag?.toLowerCase() === streamerTagLower ||
    p.name?.toLowerCase() === streamerTagLower.split('#')[0]
  );
  const streamerOnTeam1 = team1Players.some(p =>
    p.battleTag?.toLowerCase() === streamerTagLower ||
    p.name?.toLowerCase() === streamerTagLower.split('#')[0]
  );

  const [leftTeamRaw, rightTeamRaw] = streamerOnTeam1 && !streamerOnTeam0
    ? [team1Players, team0Players]
    : [team0Players, team1Players];

  const team1 = [...leftTeamRaw].sort((a, b) =>
    (a.currentMmr || a.oldMmr || 0) - (b.currentMmr || b.oldMmr || 0)
  );
  const team2 = [...rightTeamRaw].sort((a, b) =>
    (b.currentMmr || b.oldMmr || 0) - (a.currentMmr || a.oldMmr || 0)
  );

  if (team1.length === 0 || team2.length === 0) return null;

  const isAT = (battleTag) => {
    for (const group of Object.values(atGroups)) {
      if (group.includes(battleTag)) return true;
    }
    return false;
  };

  const areATPartners = (p1, p2) => {
    for (const group of Object.values(atGroups)) {
      if (group.includes(p1.battleTag) && group.includes(p2.battleTag)) return true;
    }
    return false;
  };

  const renderStat = (player) => {
    const mmr = player.currentMmr || player.oldMmr || 0;
    const country = countries[player.battleTag];
    if (phase === PHASE_FLAG && country) {
      return <CountryFlag name={country.toLowerCase()} className="mo-flag-inline" />;
    }
    return <span className="mo-mmr">{mmr ? mmr.toLocaleString() : "—"}</span>;
  };

  const renderPlayer = (player, index, team) => {
    const nextPlayer = team[index + 1];
    const showConnector = nextPlayer && areATPartners(player, nextPlayer);
    return (
      <div key={player.battleTag} className="mo-player">
        <img src={raceMapping[player.race]} alt="" className="mo-race" />
        <span className={`mo-name ${isAT(player.battleTag) ? "is-at" : ""}`}>
          {player.name}
        </span>
        <div className={`mo-stat ${fading ? 'fading' : ''}`}>
          {renderStat(player)}
        </div>
        {showConnector && <div className="mo-at-line" />}
      </div>
    );
  };

  return (
    <div className={`minimal-overlay match-style-${matchStyle}${slideOut ? ' slide-out' : ''}`}>
      <div className="mo-players-row">
        <div className="mo-team mo-team-1 team-blue">
          {team1.map((p, i) => renderPlayer(p, i, team1))}
        </div>

        <div className="mo-center">
          <div className="mo-chart">
            <MmrComparison
              data={{
                teamOneMmrs: team1.map(p => p.currentMmr || p.oldMmr || 0),
                teamTwoMmrs: team2.map(p => p.currentMmr || p.oldMmr || 0),
                teamOneAT: team1.map(p => getATGroupId(p.battleTag)),
                teamTwoAT: team2.map(p => getATGroupId(p.battleTag)),
              }}
              variant="overlay"
            />
          </div>
        </div>

        <div className="mo-team mo-team-2 team-red">
          {team2.map((p, i) => renderPlayer(p, i, team2))}
        </div>
      </div>
    </div>
  );
};

export default MatchOverlay;
