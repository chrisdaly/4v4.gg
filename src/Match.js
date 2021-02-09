import React, { Component } from "react";
import Team from "./Team.js";
import Timer from "./Time.js";
import RangePlotSection from "./RangePlotSection.js";

import { Segment, Grid } from "semantic-ui-react";

class Match extends Component {
  render() {
    const { match } = this.props;
    const teams = match.teams;

    const teamOneMmrs = teams[0].players.map((d) => d.oldMmr);
    const teamOneAverageMmr = teams[0].teamAverage;

    const teamTwoMmrs = teams[1].players.map((d) => d.oldMmr);
    const teamTwoAverageMmr = teams[1].teamAverage;

    const data = { teamOneMmrs, teamOneAverageMmr, teamTwoMmrs, teamTwoAverageMmr };

    return (
      <Segment>
        <Grid columns={3}>
          <Grid.Row>
            <Grid.Column></Grid.Column>
            <Grid.Column>
              <Timer />
            </Grid.Column>
            <Grid.Column></Grid.Column>
          </Grid.Row>
          <Grid.Row columns={3}>
            <Grid.Column width={6}>
              <Team team={teams[0]} teamNum={1} teamAverage={match.teams[0].teamAverage}></Team>
            </Grid.Column>
            <Grid.Column width={2}>
              <RangePlotSection data={data} id={match.id} />
            </Grid.Column>
            <Grid.Column width={6}>
              <Team team={teams[1]} teamNum={2} teamAverage={match.teams[1].teamAverage}></Team>
            </Grid.Column>
          </Grid.Row>
        </Grid>
      </Segment>
    );
  }
}

export default Match;
