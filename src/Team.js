import React, { Component } from "react";
import Player from "./Player.js";
import TeamHeader from "./TeamHeader.js";

class Team extends Component {
  render() {
    const { team, teamNum, teamAverage } = this.props;

    return (
      <div className={"teamDiv"}>
        <TeamHeader teamNum={teamNum} teamMmr={teamAverage}></TeamHeader>

        {Object.keys(team.players).map((key) => (
          <Player key={team.players[key].name} data={team.players[key]}></Player>
        ))}
      </div>
    );
  }
}

export default Team;
