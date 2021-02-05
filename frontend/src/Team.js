import React, { Component } from "react";
import Player from "./Player.js";
import TeamHeader from "./TeamHeader.js";

const calculateAverage = (arr) => Math.round(arr.reduce((p, c) => p + c, 0) / arr.length);

class Team extends Component {
  render() {
    const { team, teamNum } = this.props;
    const playerMmrs = team.players.map((d) => d.oldMmr);
    const teamMmr = calculateAverage(playerMmrs);

    return (
      <div>
        <TeamHeader teamNum={teamNum} teamMmr={teamMmr}></TeamHeader>

        {Object.keys(team.players).map((key) => (
          <Player key={team.players[key].name} data={team.players[key]}></Player>
        ))}
      </div>
    );
  }
}

export default Team;
