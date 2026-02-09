import React, { useState, useEffect } from "react";
import { MmrComparison } from "./MmrComparison";
import { raceMapping } from "../lib/constants";

const MatchOverlay = ({ matchData, atGroups = {}, sessionData = {}, mmrDuration = 8000, sessionDuration = 4000, streamerTag = "", matchStyle = "default" }) => {
  const [showSession, setShowSession] = useState(false);
  const [fading, setFading] = useState(false);

  // Rotate between MMR (80%) and session (20%) with different durations
  useEffect(() => {
    const hasSessionData = Object.keys(sessionData).length > 0;
    if (!hasSessionData) return;

    let timeout;
    const scheduleNext = () => {
      const duration = showSession ? sessionDuration : mmrDuration;
      timeout = setTimeout(() => {
        setFading(true);
        setTimeout(() => {
          setShowSession(prev => !prev);
          setFading(false);
        }, 800); // match CSS fade duration
      }, duration);
    };

    scheduleNext();
    return () => clearTimeout(timeout);
  }, [showSession, sessionData, mmrDuration, sessionDuration]);

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

    const games = session.recentGames.slice(0, 10);
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

  const renderPlayer = (player, index, team, isStreamerTeam) => {
    const nextPlayer = team[index + 1];
    const showConnector = nextPlayer && areATPartners(player, nextPlayer);
    const mmr = player.currentMmr || player.oldMmr || 0;

    return (
      <div key={player.battleTag} className="mo-player">
        <img src={raceMapping[player.race]} alt="" className="mo-race" />
        <span className={`mo-name ${isAT(player.battleTag) ? "is-at" : ""}`}>
          {player.name}
        </span>
        <div className={`mo-stat ${fading ? 'fading' : ''}`}>
          {showSession ? renderSessionDots(player.battleTag) : (
            <span className="mo-mmr">{mmr || "—"}</span>
          )}
        </div>
        {showConnector && <div className="mo-at-line" />}
      </div>
    );
  };

  return (
    <div className={`minimal-overlay match-style-${matchStyle}`}>
      {/* Single row: Team1 | Chart | Team2 */}
      <div className="mo-players-row">
        <div className="mo-team mo-team-1 team-blue">
          {team1.map((p, i) => renderPlayer(p, i, team1, true))}
        </div>

        <div className="mo-chart">
          <MmrComparison
            data={{
              teamOneMmrs: team1.map(p => p.currentMmr || p.oldMmr || 0),
              teamTwoMmrs: team2.map(p => p.currentMmr || p.oldMmr || 0),
              teamOneAT: team1.map(p => getATGroupId(p.battleTag)),
              teamTwoAT: team2.map(p => getATGroupId(p.battleTag)),
            }}
            compact={true}
            atStyle="combined"
            showMean={false}
            showStdDev={true}
            hideLabels={true}
          />
          <span className="mo-vs">vs</span>
        </div>

        <div className="mo-team mo-team-2 team-red">
          {team2.map((p, i) => renderPlayer(p, i, team2, false))}
        </div>
      </div>
    </div>
  );
};

export default MatchOverlay;
