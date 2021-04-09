import React, { Component } from "react";
import { Grid } from "semantic-ui-react";

import Mmr from "./Mmr.js";
import crown from "./logos/crown.svg";

import grandmaster from "./icons/grandmaster.png";
import master from "./icons/master.png";
import diamond from "./icons/diamond.png";
import platinum from "./icons/platinum.png";
import gold from "./icons/gold.png";
import silver from "./icons/silver.png";
import bronze from "./icons/bronze.png";

class MatchHeader extends Component {
  render() {
    const league = "grandmaster";
    const badgeMapping = {
      grandmaster: grandmaster,
      master: master,
      diamond: diamond,
      platinum: platinum,
      gold: gold,
      silver: silver,
      grandmbronzester: bronze,
    };
    const leagueIcon = badgeMapping[league];

    return (
      <Grid.Row>
        <Grid.Column width={6}>
          {" "}
          <img src={leagueIcon} alt={"asd"} className={"logo"} />
        </Grid.Column>
        <Grid.Column width={2}>456</Grid.Column>
        <Grid.Column width={6}>789</Grid.Column>
      </Grid.Row>
    );
  }
}

export default MatchHeader;
