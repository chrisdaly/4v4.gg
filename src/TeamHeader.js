import React, { Component } from "react";
import { Card, Flag } from "semantic-ui-react";
import { Header, Image, Table, Icon, Grid } from "semantic-ui-react";

class TeamHeader extends Component {
  render() {
    const { teamNum, teamMmr } = this.props;

    return (
      <Grid divided="vertically" className={`team-header team-${teamNum}`}>
        <Grid.Row columns={1} className={"playerTop"}>
          <Grid.Column>{teamMmr}</Grid.Column>
        </Grid.Row>

        <Grid.Row columns={1} className={"playerBottom"}>
          <Grid.Column className="playerName">
            Team <span className={"teamNum"}>#{teamNum}</span>
          </Grid.Column>
        </Grid.Row>
      </Grid>
    );
  }
}

export default TeamHeader;
