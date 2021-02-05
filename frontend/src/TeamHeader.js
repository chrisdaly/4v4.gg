import React, { Component } from "react";
import { Card, Flag } from "semantic-ui-react";
import { Header, Image, Table, Icon, Grid } from "semantic-ui-react";

class TeamHeader extends Component {
  render() {
    const { teamNum, teamMmr } = this.props;

    return (
      <Grid divided="vertically">
        <Grid.Row columns={3} className={"playerTop"}>
          <Grid.Column></Grid.Column>
          <Grid.Column>{teamMmr}</Grid.Column>
          <Grid.Column></Grid.Column>
        </Grid.Row>

        <Grid.Row columns={3} className={"playerBottom"}>
          <Grid.Column width={4}></Grid.Column>
          <Grid.Column width={8} className="playerName">
            Team #{teamNum}
          </Grid.Column>
          <Grid.Column width={4}></Grid.Column>
        </Grid.Row>
      </Grid>
    );
  }
}

export default TeamHeader;
