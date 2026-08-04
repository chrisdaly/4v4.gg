import React, { useState, useEffect } from "react";
import { MmrComparison } from "./MmrComparison";
import { CountryFlag } from "./ui";
import { raceMapping } from "../lib/constants";

// Phase: 0 = MMR, 1 = country flag, 2 = session form
const PHASE_MMR = 0;
const PHASE_FLAG = 1;
const PHASE_SESSION = 2;
const PHASE_COUNT = 3;

const MatchOverlay = ({ matchData, atGroups = {}, sessionData = {}, countries = {}, avatarUrls = {}, mmrDuration = 8000, flagDuration = 4000, sessionDuration = 4000, streamerTag = "", matchStyle = "default", layout = "horizontal", slideOut = false, hudIntegrated = false, introPhase = false, introDismissing = false, hidden = false }) => {
  const [phase, setPhase] = useState(PHASE_MMR);
  const [fading, setFading] = useState(false);

  // Rotate through phases: MMR → flag → session (skip phases with no data)
  useEffect(() => {
    const hasCountries = Object.keys(countries).length > 0;
    const hasSession = Object.keys(sessionData).length > 0;
    if (!hasCountries && !hasSession) return;

    const getNextPhase = (cur) => {
      let next = (cur + 1) % PHASE_COUNT;
      if (next === PHASE_FLAG && !hasCountries) next = (next + 1) % PHASE_COUNT;
      if (next === PHASE_SESSION && !hasSession) next = (next + 1) % PHASE_COUNT;
      return next;
    };

    const durations = [mmrDuration, flagDuration, sessionDuration];
    let fadeTimeout;
    const timeout = setTimeout(() => {
      setFading(true);
      fadeTimeout = setTimeout(() => {
        setPhase(prev => getNextPhase(prev));
        setFading(false);
      }, 800);
    }, durations[phase]);

    return () => {
      clearTimeout(timeout);
      clearTimeout(fadeTimeout);
    };
  }, [phase, sessionData, countries, mmrDuration, flagDuration, sessionDuration]);

  // Get AT group ID (0 for solo, 1+ for AT groups)
  // Returns the same ID for all members of the same AT group
  const getATGroupId = React.useMemo(() => {
    const cache = {};
    let nextGroupId = 1;

    Object.values(atGroups).forEach(group => {
      if (!Array.isArray(group) || group.length === 0) return;
      // Check if any member already has an ID
      const existingId = group.find(tag => cache[tag.toLowerCase()]);
      if (existingId) {
        // Use existing ID for all members
        const id = cache[existingId.toLowerCase()];
        group.forEach(tag => { cache[tag.toLowerCase()] = id; });
      } else {
        // Assign new ID to all members
        const id = nextGroupId++;
        group.forEach(tag => { cache[tag.toLowerCase()] = id; });
      }
    });

    return (battleTag) => cache[battleTag?.toLowerCase()] || 0;
  }, [atGroups]);

  if (!matchData?.teams || matchData.teams.length < 2) return null;

  // Determine which team the streamer is on, put their team on the left
  const streamerTagLower = streamerTag.toLowerCase();
  const team0Players = matchData.teams[0]?.players || [];
  const team1Players = matchData.teams[1]?.players || [];

  // Check both teams for streamer
  const streamerOnTeam0 = team0Players.some(p =>
    p.battleTag?.toLowerCase() === streamerTagLower ||
    p.name?.toLowerCase() === streamerTagLower.split('#')[0]
  );
  const streamerOnTeam1 = team1Players.some(p =>
    p.battleTag?.toLowerCase() === streamerTagLower ||
    p.name?.toLowerCase() === streamerTagLower.split('#')[0]
  );

  // Swap teams if streamer is on team 1 (so streamer's team is always left)
  const [leftTeamRaw, rightTeamRaw] = streamerOnTeam1 && !streamerOnTeam0
    ? [team1Players, team0Players]
    : [team0Players, team1Players];

  // Sort left team by MMR ascending (lowest on far left, highest near center)
  const team1 = [...leftTeamRaw].sort((a, b) =>
    (a.currentMmr || a.oldMmr || 0) - (b.currentMmr || b.oldMmr || 0)
  );

  // Sort right team by MMR descending (highest near center, lowest on far right)
  const team2 = [...rightTeamRaw].sort((a, b) =>
    (b.currentMmr || b.oldMmr || 0) - (a.currentMmr || a.oldMmr || 0)
  );

  if (team1.length === 0 || team2.length === 0) return null;

  const team1Mmr = Math.round(team1.reduce((sum, p) => sum + (p.currentMmr || p.oldMmr || 0), 0) / team1.length);
  const team2Mmr = Math.round(team2.reduce((sum, p) => sum + (p.currentMmr || p.oldMmr || 0), 0) / team2.length);

  // Check if player is in an AT group
  const isAT = (battleTag) => {
    for (const group of Object.values(atGroups)) {
      if (group.includes(battleTag)) return true;
    }
    return false;
  };

  // Check if two adjacent players are AT partners
  const areATPartners = (p1, p2) => {
    for (const group of Object.values(atGroups)) {
      if (group.includes(p1.battleTag) && group.includes(p2.battleTag)) return true;
    }
    return false;
  };

  // Render session form dots (wins/losses from current session, capped at 5)
  const renderSessionDots = (battleTag) => {
    const session = sessionData[battleTag];
    if (!session?.recentGames || session.recentGames.length === 0) {
      return <span className="mo-mmr">—</span>;
    }

    const games = session.recentGames.slice(0, 5);
    return (
      <div className="mo-session-dots">
        {games.map((won, i) => (
          <span
            key={i}
            className={`mo-dot ${won ? 'win' : 'loss'} ${i === games.length - 1 ? 'latest' : ''}`}
          />
        ))}
      </div>
    );
  };

  const renderStat = (player) => {
    const mmr = player.currentMmr || player.oldMmr || 0;
    const country = countries[player.battleTag];

    if (phase === PHASE_FLAG && country) {
      return <CountryFlag name={country.toLowerCase()} className="mo-flag-inline" />;
    }
    if (phase === PHASE_SESSION) {
      return renderSessionDots(player.battleTag);
    }
    return <span className="mo-mmr">{mmr ? mmr.toLocaleString() : "—"}</span>;
  };

  const renderPlayer = (player, index, team, isStreamerTeam) => {
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

  if (layout === "vertical") {
    // Sort teams by MMR descending (highest at top)
    const team1Sorted = [...team1].sort((a, b) => (b.currentMmr || b.oldMmr || 0) - (a.currentMmr || a.oldMmr || 0));
    const team2Sorted = [...team2].sort((a, b) => (b.currentMmr || b.oldMmr || 0) - (a.currentMmr || a.oldMmr || 0));

    // Render the cycling stat (MMR, flag, or session) for vertical layout
    const renderVerticalStat = (player) => {
      const mmr = player.currentMmr || player.oldMmr || 0;
      const country = countries[player.battleTag];

      if (phase === PHASE_FLAG && country) {
        return <CountryFlag name={country.toLowerCase()} className="mov-flag" />;
      }
      if (phase === PHASE_SESSION) {
        const session = sessionData[player.battleTag];
        if (!session?.recentGames || session.recentGames.length === 0) {
          return <span className="mov-mmr">—</span>;
        }
        const games = session.recentGames.slice(0, 5);
        return (
          <div className="mov-session-dots">
            {games.map((won, i) => (
              <span key={i} className={`mov-dot ${won ? 'win' : 'loss'}`} />
            ))}
          </div>
        );
      }
      return <span className="mov-mmr">{mmr ? mmr.toLocaleString() : "—"}</span>;
    };

    const renderCard = (player) => {
      return (
        <div key={player.battleTag} className="mov-card">
          <img src={raceMapping[player.race]} alt="" className="mov-race" />
          <span className="mov-name">{player.name}</span>
          <div className={`mov-bottom ${fading ? 'fading' : ''}`}>
            {renderVerticalStat(player)}
          </div>
        </div>
      );
    };

    return (
      <div className={`minimal-overlay mov-container match-style-${matchStyle}${slideOut ? ' slide-out' : ''}`}>
        {/* Chart on top */}
        <div className="mov-chart-top">
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

        {/* Player cards: 2 columns */}
        <div className="mov-cols">
          <div className="mov-col">
            {team1Sorted.map(p => renderCard(p))}
          </div>
          <div className="mov-col">
            {team2Sorted.map(p => renderCard(p))}
          </div>
        </div>
      </div>
    );
  }

  if (layout === "sides") {
    const team1Sorted = [...team1].sort((a, b) => (b.currentMmr || b.oldMmr || 0) - (a.currentMmr || a.oldMmr || 0));
    const team2Sorted = [...team2].sort((a, b) => (b.currentMmr || b.oldMmr || 0) - (a.currentMmr || a.oldMmr || 0));

    const renderSideCard = (player) => {
      const avatarUrl = avatarUrls[player.battleTag];
      return (
        <div key={player.battleTag} className="moas-player">
          <img
            src={avatarUrl || raceMapping[player.race]}
            alt=""
            className={`moas-avatar${avatarUrl ? "" : " moas-avatar-race"}`}
            onError={e => { e.target.src = raceMapping[player.race]; }}
          />
          <span className={`moas-name${isAT(player.battleTag) ? " is-at" : ""}`}>{player.name}</span>
          <div className={`moas-stat${fading ? " fading" : ""}`}>{renderStat(player)}</div>
        </div>
      );
    };

    return (
      <div className={`moas-outer${slideOut ? " slide-out" : ""}`}>
        <div className={`moas-panel match-style-${matchStyle}`}>
          <div className="moas-avg moas-avg-blue">{team1Mmr} avg</div>
          {team1Sorted.map(p => renderSideCard(p))}
        </div>
        <div className={`moas-panel moas-panel-right match-style-${matchStyle}`}>
          {team2Sorted.map(p => renderSideCard(p))}
          <div className="moas-avg moas-avg-red">{team2Mmr} avg</div>
        </div>
      </div>
    );
  }

  if (layout === "top-bar") {
    const renderCompactCard = (player) => {
      const avatarUrl = avatarUrls[player.battleTag];
      return (
        <div key={player.battleTag} className="moatb-player">
          <img
            src={avatarUrl || raceMapping[player.race]}
            alt=""
            className={`moatb-avatar${avatarUrl ? "" : " moatb-avatar-race"}`}
            onError={e => { e.target.src = raceMapping[player.race]; }}
          />
          <span className={`moatb-name${isAT(player.battleTag) ? " is-at" : ""}`}>{player.name}</span>
          <div className={`moatb-stat${fading ? " fading" : ""}`}>{renderStat(player)}</div>
        </div>
      );
    };

    return (
      <div className={`minimal-overlay moatb-container match-style-${matchStyle}${slideOut ? " slide-out" : ""}`}>
        <div className="moatb-team moatb-team-1">
          {team1.map(p => renderCompactCard(p))}
        </div>
        <div className="moatb-center">
          <span className="moatb-avg moatb-avg-blue">{team1Mmr}</span>
          <span className="moatb-vs">vs</span>
          <span className="moatb-avg moatb-avg-red">{team2Mmr}</span>
        </div>
        <div className="moatb-team moatb-team-2">
          {team2.map(p => renderCompactCard(p))}
        </div>
      </div>
    );
  }

  if (layout === "avatar" && introPhase) {
    return (
      <div className={`mo-intro match-style-${matchStyle}${introDismissing ? " mo-intro-out" : " mo-intro-in"}`}>
        <div className="mo-intro-team mo-intro-team-1">
          {team1.map(p => {
            const avatarUrl = avatarUrls[p.battleTag];
            return (
              <div key={p.battleTag} className="mo-intro-card">
                <div className="mo-intro-avatar-wrap">
                  <img src={avatarUrl || raceMapping[p.race]} alt="" className={`mo-intro-avatar${avatarUrl ? "" : " mo-intro-avatar-race"}`} onError={e => { e.target.src = raceMapping[p.race]; }} />
                  {avatarUrl && <img src={raceMapping[p.race]} alt="" className="mo-intro-race-badge" />}
                </div>
                <span className="mo-intro-name">{p.name}</span>
                <span className="mo-intro-mmr">{(p.currentMmr || p.oldMmr || 0).toLocaleString()}</span>
              </div>
            );
          })}
        </div>
        <div className="mo-intro-center">
          <span className="mo-intro-vs">VS</span>
          <div className="mo-intro-avgs">
            <span className="mo-intro-avg mo-intro-avg-blue">{team1Mmr.toLocaleString()}</span>
            <span className="mo-intro-avg-label">avg</span>
            <span className="mo-intro-avg mo-intro-avg-red">{team2Mmr.toLocaleString()}</span>
          </div>
        </div>
        <div className="mo-intro-team mo-intro-team-2">
          {team2.map(p => {
            const avatarUrl = avatarUrls[p.battleTag];
            return (
              <div key={p.battleTag} className="mo-intro-card">
                <div className="mo-intro-avatar-wrap">
                  <img src={avatarUrl || raceMapping[p.race]} alt="" className={`mo-intro-avatar${avatarUrl ? "" : " mo-intro-avatar-race"}`} onError={e => { e.target.src = raceMapping[p.race]; }} />
                  {avatarUrl && <img src={raceMapping[p.race]} alt="" className="mo-intro-race-badge" />}
                </div>
                <span className="mo-intro-name">{p.name}</span>
                <span className="mo-intro-mmr">{(p.currentMmr || p.oldMmr || 0).toLocaleString()}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (layout === "avatar" && hidden) return null;

  if (layout === "avatar") {
    const renderAvatarCard = (player) => {
      const avatarUrl = avatarUrls[player.battleTag];
      return (
        <div key={player.battleTag} className="moa-player">
          <div className="moa-avatar-wrap">
            <img
              src={avatarUrl || raceMapping[player.race]}
              alt=""
              className={`moa-avatar${avatarUrl ? "" : " moa-avatar-race"}`}
              onError={e => { e.target.src = raceMapping[player.race]; }}
            />
            {avatarUrl && (
              <img src={raceMapping[player.race]} alt="" className="moa-race-badge" />
            )}
          </div>
          <span className={`moa-name${isAT(player.battleTag) ? " is-at" : ""}`}>{player.name}</span>
          <div className={`moa-stat${fading ? " fading" : ""}`}>
            {renderStat(player)}
          </div>
        </div>
      );
    };

    return (
      <div className={`minimal-overlay moa-container match-style-${matchStyle}${hudIntegrated ? " hud-integrated" : ""}${slideOut ? " slide-out" : ""}`}>
        <div className="moa-team moa-team-1">
          {team1.map(p => renderAvatarCard(p))}
        </div>
        <div className="moa-center">
          <div className="moa-chart">
            <MmrComparison
              data={{
                teamOneMmrs: team1.map(p => p.currentMmr || p.oldMmr || 0),
                teamTwoMmrs: team2.map(p => p.currentMmr || p.oldMmr || 0),
                teamOneAT: team1.map(p => getATGroupId(p.battleTag)),
                teamTwoAT: team2.map(p => getATGroupId(p.battleTag)),
              }}
              variant="overlay"
              localScale
            />
          </div>
        </div>
        <div className="moa-team moa-team-2">
          {team2.map(p => renderAvatarCard(p))}
        </div>
      </div>
    );
  }

  return (
    <div className={`minimal-overlay match-style-${matchStyle}${slideOut ? ' slide-out' : ''}`}>
      {/* Single row: Team1 | Chart | Team2 */}
      <div className="mo-players-row">
        <div className="mo-team mo-team-1 team-blue">
          {team1.map((p, i) => renderPlayer(p, i, team1, true))}
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
          {team2.map((p, i) => renderPlayer(p, i, team2, false))}
        </div>
      </div>
    </div>
  );
};

export default MatchOverlay;
