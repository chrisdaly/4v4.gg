import React, { Component } from "react";
import { Grid } from "semantic-ui-react";

import Mmr from "./Mmr.js";
import crown from "./logos/crown.svg";

class TeamHeader extends Component {
  render() {
    const { teamNum, teamMmr, won } = this.props;

    return (
      <Grid divided="vertically" className={`team-header team-${teamNum}`}>
        <Grid.Row columns={2} className={"playerBottom"}>
          <Grid.Column width={4}>
            <span>{won ? <img src={crown} alt={"asd"} className={"crown"} /> : ""}</span>
          </Grid.Column>
          <Grid.Column className="playerName">
            Team <span className={"teamNum"}>{teamNum}</span>
          </Grid.Column>
        </Grid.Row>
        <Grid.Row columns={1} className={"playerTop"}>
          <Grid.Column>
            <Mmr data={teamMmr}></Mmr>
          </Grid.Column>
        </Grid.Row>
      </Grid>
    );
  }
}

export default TeamHeader;
