import React, { Component } from "react";
import Player from "./Player.js";
import TeamHeader from "./TeamHeader.js";

class Team extends Component {
  render() {
    const { team, teamNum, teamAverage } = this.props;
    const won = team.won;

    return (
      <div className={"teamDiv"}>
        <TeamHeader teamNum={teamNum} teamMmr={teamAverage} won={won}></TeamHeader>

        {Object.keys(team.players).map((key) => (
          <Player key={team.players[key].name} data={team.players[key]} side={this.props.side}></Player>
        ))}
      </div>
    );
  }
}

export default Team;
