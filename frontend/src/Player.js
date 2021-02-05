import React, { Component } from "react";
import { Card, Flag } from "semantic-ui-react";
import { Header, Image, Table, Icon, Grid } from "semantic-ui-react";

class Player extends Component {
  render() {
    const { race, oldMmr, name, location } = this.props.data;
    let countryCode = location !== null ? location.toLowerCase() : "";
    const raceMapping = {
      8: "💀", //"undead",
      0: "🎲", //"random",
      4: "🧝", //night elf
      2: "👹", //"orc",
      1: "👨", //"human",
    };
    const raceIcon = raceMapping[race];

    return (
      <Grid divided="vertically">
        <Grid.Row columns={3} className={"playerTop"}>
          <Grid.Column></Grid.Column>
          <Grid.Column>{oldMmr}</Grid.Column>
          <Grid.Column></Grid.Column>
        </Grid.Row>

        <Grid.Row columns={3} className={"playerBottom"}>
          <Grid.Column width={4}>
            <Flag name={countryCode}></Flag>
          </Grid.Column>
          <Grid.Column width={8} className="playerName">
            {name}
          </Grid.Column>
          <Grid.Column width={4}>{raceIcon}</Grid.Column>
        </Grid.Row>
      </Grid>
    );
  }
}

export default Player;
