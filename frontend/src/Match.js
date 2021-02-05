import React, { Component } from "react";
import Team from "./Team.js";

import { Segment, Grid } from "semantic-ui-react";

class Match extends Component {
  render() {
    const { match } = this.props;
    const teams = match.teams;

    return (
      <Segment>
        <Grid columns={3}>
          <Grid.Row>
            <Grid.Column>
              <Team team={teams[0]} teamNum={1}></Team>
            </Grid.Column>
            <Grid.Column></Grid.Column>
            <Grid.Column>
              <Team team={teams[1]} teamNum={2}></Team>
            </Grid.Column>
          </Grid.Row>
        </Grid>
      </Segment>
    );
  }
}

export default Match;
