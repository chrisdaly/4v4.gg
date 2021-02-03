import React, { Component } from "react";
import Team from "./Team.js";

import { Segment, Header } from "semantic-ui-react";

class Match extends Component {
  render() {
    const { match } = this.props;
    const teams = match.teams;

    return (
      <Segment>
        {/* <Header>MATCH</Header> */}
        <Team team={teams[0]} teamNum={1}></Team>
        <br />
        <Team team={teams[1]} teamNum={2}></Team>
        {/* <p>{JSON.stringify(this.props)}</p> */}
        {/* <Player data={teams[0].players[0]}></Player> */}

        {/* {Object.keys(teams[0].players).map((key) => (
          <Player key={teams[0].players[key].name} data={teams[0].players[key]}></Player>
        ))} */}
      </Segment>
    );
  }
}

export default Match;
