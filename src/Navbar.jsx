import React, { Component } from "react";
import { Link } from "react-router-dom";

import * as d3 from "d3";

import { Header, Divider, Grid } from "semantic-ui-react";

// import logo from "./logos/logo.svg";

class Navbar extends Component {
  render() {
    return (
      <div className="navbar">
        <Header as="h1" icon textAlign="center">
          <div id="logoAndText">
            {/* <img src={logo} alt={"asd"} className={"logo"} /> */}
            <Header.Content>4v4.GG</Header.Content>
          </div>
          <Grid divided="vertically">
            <Grid.Row columns={3}>
              <Grid.Column width={4}>
                <h3>
                  <Link to="/ongoing">Live Games</Link>
                </h3>
              </Grid.Column>
              <Grid.Column width={4}>
                <h3>
                  <Link to="/finished">Recently Finished Games</Link>
                </h3>
              </Grid.Column>
              <Grid.Column width={4}>
                <h3>
                  <Link to="/queue">Queue</Link>
                </h3>
              </Grid.Column>
              <Grid.Column width={4}>
                <h3>
                  <Link to="/ladder">Ladder</Link>
                </h3>
              </Grid.Column>
            </Grid.Row>
            <Grid.Row columns={1}>
              <Grid.Column></Grid.Column>
            </Grid.Row>
          </Grid>
        </Header>
        {/* <Divider /> */}
        {/* <Image centered size="large" src="https://react.semantic-ui.com/images/wireframe/centered-paragraph.png" /> */}
      </div>
    );
  }
}

export default Navbar;
