import React, { Component } from "react";
import Player from "./Player.js";
import TeamHeader from "./TeamHeader.js";

class Team extends Component {
  render() {
    let {
      team,
      teamNum,
      teamAverage,
      teamDeviation,
      sparklinePlayersData,
      ladderRanks,
    } = this.props;
    const won = team.won;
    sparklinePlayersData = sparklinePlayersData || {};

    return (
      <div className={"teamDiv"}>
        <TeamHeader
          teamNum={teamNum}
          teamMmr={teamAverage}
          teamDeviation={teamDeviation}
          won={won}
          transition={this.props.transition}
        ></TeamHeader>

        {Object.keys(team.players).map((key) => (
          <Player
            key={team.players[key].name}
            rank={ladderRanks.filter(
              (d) => d.player1Id === team.players[key].battleTag
            )}
            data={team.players[key]}
            side={this.props.side}
            transition={this.props.transition}
            sparklinePlayersData={
              team.players[key].battleTag in sparklinePlayersData
                ? sparklinePlayersData[team.players[key].battleTag]
                : []
            }
          ></Player>
        ))}
      </div>
    );
  }
}

export default Team;
