import React, { Component } from "react";
import { Grid } from "semantic-ui-react";
import { TransitionGroup, CSSTransition } from "react-transition-group";

import Mmr from "./Mmr.js";

class TeamHeader extends Component {
  render() {
    let { teamNum, teamMmr, teamDeviation, won } = this.props;
    // console.log(this.props)
    if (teamMmr !== undefined) {
      teamMmr = teamMmr.toLocaleString();
    }
    let statistic = this.props.transition ? ` σ = ${teamDeviation}` : `x̄ = ${teamMmr}`;
    return (
      <Grid divided="vertically" className={`team-header team-${teamNum}`}>
        {/* <Grid.Row columns={2} className={"playerBottom"}>
          <Grid.Column width={4}>
            <span>{won ? <img src={crown} alt={"asd"} className={"crown"} /> : ""}</span>
          </Grid.Column>
          <Grid.Column className="playerName">
            Team <span className={"teamNum"}>{teamNum}</span>
          </Grid.Column>
        </Grid.Row> */}
        <Grid.Row columns={1} className={"playerTop"}>
          <Grid.Column>
            {/* className={"playerMMrstat"}> */}
            <Mmr data={teamMmr}></Mmr>
          </Grid.Column>
        </Grid.Row>
      </Grid>
    );
  }
}

export default TeamHeader;
