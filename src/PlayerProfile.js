import React, { Component } from "react";
import Navbar from "./Navbar.js";

import { Container } from "semantic-ui-react";

class PlayerProfile extends Component {
  state = {
    matches: [],
  };

  componentDidMount() {
    this.loadData();
    // let intervalId = setInterval(this.loadData, 30000);
    // if (queryParams.player !== undefined) {

    // }
    this.setState({}); //intervalId
  }

  componentWillUnmount() {
    // clearInterval(this.state.intervalId);
  }

  loadData = async () => {
    try {
      const pageUrl = new URL(window.location.href);
      const player = pageUrl.pathname.split("/").slice(-1)[0]; //
      console.log("player", player);

      var url = new URL(`https://website-backend.w3champions.com/api/players/${player}`);
      console.log("url", url);
      var response = await fetch(url);
      var result = await response.json();
      console.log("result", result);
      this.setState({ ...result });

      var url = new URL("https://website-backend.w3champions.com/api/matches/search");
      var params = { playerId: player.replace("%23", "#"), gateway: 20, offset: 0, gameMode: 4, season: 7, pageSize: 100 };
      url.search = new URLSearchParams(params).toString();
      var response = await fetch(url);
      var result = await response.json();
      console.log("result", result);

      this.setState({ ...result });
    } catch (e) {
      console.log(e);
    }
  };

  render() {
    if (this.state.name) {
      return (
        <Container>
          <Navbar />
          <div>
            <p>{this.state.name}</p>
            {this.state.playerAkaData.country}
          </div>
        </Container>
      );
    } else {
      return <div>No matches being played </div>;
    }

    //   <Container>

    // <p>test</p>
    //   </Container>
  }
}

export default PlayerProfile;
