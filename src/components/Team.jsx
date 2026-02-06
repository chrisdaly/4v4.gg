import React from "react";
import Player from "./Player";
import TeamHeader from "./TeamHeader";

const Team = ({
  team,
  teamNum,
  teamAverage,
  teamDeviation,
  sparklinePlayersData = {},
  ladderRanks,
  side,
  transition,
  noteApiAttempted,
}) => {
  const won = team.won;

  return (
    <div className="teamDiv">
      <TeamHeader
        teamNum={teamNum}
        teamMmr={teamAverage}
        teamDeviation={teamDeviation}
        won={won}
        transition={transition}
      />

      {Object.keys(team.players).map((key) => (
        <Player
          key={team.players[key].name}
          rank={ladderRanks.filter(
            (d) => d.player1Id === team.players[key].battleTag
          )}
          data={team.players[key]}
          side={side}
          transition={transition}
          sparklinePlayersData={
            team.players[key].battleTag in sparklinePlayersData
              ? sparklinePlayersData[team.players[key].battleTag]
              : []
          }
          noteApiAttempted={noteApiAttempted}
        />
      ))}
    </div>
  );
};

export default Team;
