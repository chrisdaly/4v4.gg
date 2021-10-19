import React, { Component } from "react";
import Team from "./Team.js";
import Timer from "./Time.js";
import MatchHeader from "./MatchHeader.js";

import RangePlotSection from "./RangePlotSection.js";

import * as d3 from "d3";

import { Grid, Segment, Divider } from "semantic-ui-react";

class Match extends Component {
  render() {
    const { match } = this.props;
    const teams = match.teams;

    const teamOneMmrs = teams[0].players.map((d) => d.oldMmr);
    console.log("teamOneMmrs", teamOneMmrs);
    const teamOneAverageMmr = teams[0].teamAverage;
    console.log("teamOneAverageMmr", teamOneAverageMmr);

    const teamTwoMmrs = teams[1].players.map((d) => d.oldMmr);
    const teamTwoAverageMmr = teams[1].teamAverage;
    console.log("teamTwoAverageMmr", teamTwoAverageMmr);

    const gameMmr = Math.round((teamOneAverageMmr + teamTwoAverageMmr) / 2);
    const threshold = d3
      .scaleThreshold()
      .domain([1000, 1200, 1300, 1400, 1500, 1600, 1700])
      .range(["grass", "bronze", "silver", "gold", "platinum", "diamond", "adept", "master", "grandmaster"]);

    const league = threshold(gameMmr);

    // console.log(gameMmr, threshold(gameMmr));

    const data = { teamOneMmrs, teamOneAverageMmr, teamTwoMmrs, teamTwoAverageMmr, league };
    const startDate = new Date(this.props.match.startTime);
    const map = this.props.match.map;

    return (
      // <Segment>
      <div>
        <Grid columns={3}>
          <MatchHeader league={league} startDate={startDate} map={map}></MatchHeader>
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
        <Divider />
      </div>
      // </Segment>
    );
  }
}

export default Match;
