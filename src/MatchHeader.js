import React, { Component } from "react";
import { Grid, Statistic, Label } from "semantic-ui-react";

import Mmr from "./Mmr.js";
import crown from "./logos/crown.svg";

import grandmaster from "./icons/grandmaster.png";
import adept from "./icons/adept.png";
import master from "./icons/master.png";
import diamond from "./icons/diamond.png";
import platinum from "./icons/platinum.png";
import gold from "./icons/gold.png";
import silver from "./icons/silver.png";
import bronze from "./icons/bronze.png";
import grass from "./icons/grass.png";
import goldrush from "./maps/goldrush.png";
import TwilightRuinsLV from "./maps/TwilightRuinsLV.png";

class MatchHeader extends Component {
  render() {
    // const league = "grandmaster";
    const badgeMapping = {
      grandmaster: grandmaster,
      adept: adept,
      master: master,
      diamond: diamond,
      platinum: platinum,
      gold: gold,
      silver: silver,
      bronze: bronze,
      grass: grass,
    };

    const mapMapping = {
      goldrush: goldrush,
      TwilightRuinsLV: TwilightRuinsLV,
    };

    const leagueIcon = badgeMapping[this.props.league];
    const mapIcon = mapMapping[this.props.map];
    console.log("this.props.map", this.props.map, mapIcon);

    const startDate = this.props.startDate;
    let end = Date.now();
    let elapsed = end - startDate;
    let minutes = Math.floor(elapsed / 1000 / 60);

    return (
      <Grid.Row columns={3}>
        <Grid.Column width={6}>
          {/* <img src={mapIcon} alt={this.props.map} className={"map"} /> */}
          <p className={"matchHeaderLabel"}>{this.props.map}</p>
        </Grid.Column>
        <Grid.Column width={2}>
          <img src={leagueIcon} alt={this.props.league} className={"league"} />
        </Grid.Column>
        <Grid.Column width={6}>
          <p className={"matchHeaderLabel"}>{minutes} mins</p>
        </Grid.Column>
      </Grid.Row>
    );
  }
}

export default MatchHeader;
