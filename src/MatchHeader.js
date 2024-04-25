import React, { Component } from "react";
import { Grid, Statistic, Label, GridColumn } from "semantic-ui-react";

import { maps } from "./params";

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
// import logo from "./logos/logo.svg";

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
      // inGame: logo,
    };

    const mapMapping = {
      goldrush: goldrush,
      TwilightRuinsLV: TwilightRuinsLV,
    };

    const leagueIcon = badgeMapping[this.props.league];
    const mapIcon = mapMapping[this.props.map];
    const map = maps.hasOwnProperty(this.props.map) ? maps[this.props.map] : this.props.map;
    let text = "";

    const startDate = this.props.startDate;
    if (this.props.ongoing) {
      if (startDate !== null) {
        let end = Date.now();
        let elapsed = end - startDate;
        let minutes = Math.floor(elapsed / 1000 / 60);
        if (minutes < 60 * 24) {
          text = `${minutes}'`;
        } else {
          text = `started ${startDate.toDateString()}`;
        }
      } else {
        text = "";
      }
    } else {
      let end = Date.now();
      let elapsed = end - startDate;
      let minutes = Math.floor(elapsed / 1000 / 60);

      text = `${startDate.toDateString()}`;
    }

    return (
      <Grid.Row style={{ paddingBottom: "14px" }}>
        <Grid.Column>
          <Grid.Row>
            <a target="_blank" href={`/match/${this.props.id}`} rel="noreferrer">
              <img src={leagueIcon} alt={this.props.league} className={"league"} />
            </a>
            <h2 className={"mapLabel"}>{map}</h2>
          </Grid.Row>
          <Grid.Row>
            {/* <Grid.Column>test</Grid.Column> */}
            <Grid.Column>
              <div className={"pulsating-circle"} />
              <p>{text}</p>
            </Grid.Column>
          </Grid.Row>
        </Grid.Column>
      </Grid.Row>
    );
  }
}

export default MatchHeader;
