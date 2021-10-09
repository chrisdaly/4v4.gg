import React, { Component } from "react";

import * as d3 from "d3";

import { Header, Divider, Image } from "semantic-ui-react";

import logo from "./logos/logo.svg";

class Navbar extends Component {
  render() {
    return (
      <div className="navbar">
        <Header as="h2" icon textAlign="center">
          <img src={logo} alt={"asd"} className={"logo"} />
          {/* <Icon name="users" circular />` */}
          <Header.Content>4v4.GG</Header.Content>
        </Header>
        <Divider />
        {/* <Image centered size="large" src="https://react.semantic-ui.com/images/wireframe/centered-paragraph.png" /> */}
      </div>
    );
  }
}

export default Navbar;
