import React, { Component } from "react";
import Player from "./Player.js";

class Team extends Component {
  render() {
    console.log("this.props", this.props);
    const { team, teamNum } = this.props;
    console.log("TEAM", team);

    return (
      <div>
        <p>Team {teamNum}</p>
        {Object.keys(team.players).map((key) => (
          <Player key={team.players[key].name} data={team.players[key]}></Player>
        ))}
      </div>
    );
  }
}

export default Team;
