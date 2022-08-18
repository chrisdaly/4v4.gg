import React, { Component } from "react";
import { Container, Grid, Dimmer, Loader, Divider } from "semantic-ui-react";

import Match from "./Match.js";
import Navbar from "./Navbar.js";

import {standardDeviation, arithmeticMean} from "./utils.js"

import "semantic-ui-css/semantic.min.css";
import "./App.css";

const gameMode = 4;
const gateway = 20;

class App extends Component {
  state = {
    // ONLINE_PLAYER_COUNT: [],
    QUEUED_PLAYER_COUNT: [],
    queue: [],
    matches: [],
    transition: false,
    sparklinePlayersData: {}
  };

  componentDidMount() {
    this.loadData();
    let intervalId = setInterval(this.loadData, 30000);
    let transitionId = setInterval(() => this.setState({ transition: !this.state.transition }), 5000);

    this.setState({ intervalId, transitionId });
  }

  componentWillUnmount() {
    clearInterval(this.state.intervalId);
    clearInterval(this.state.transitionId);
  }

  loadData = async () => {
    try {
      var url = new URL("https://website-backend.w3champions.com/api/matches/ongoing");
      var params = { offset: 0, gateway, pageSize: 50, gameMode, map: "Overall" };
      url.search = new URLSearchParams(params).toString();

      const response = await fetch(url);
      const result = await response.json();
      let matches = result.matches;

      matches.forEach((m) => {
        let matchMmr = 0;
        m.teams.forEach((t) => {
          let playerMmrs = t.players.map((d) => d.oldMmr);
          let teamAverage = arithmeticMean(playerMmrs);
          let teamDeviation = standardDeviation(playerMmrs)
          t.teamAverage = teamAverage;
          t.teamDeviation = teamDeviation
          matchMmr += teamAverage;
        });

        m.matchMmr = Math.round(matchMmr / 2);
      });

      matches.sort((a, b) => b.matchMmr - a.matchMmr);

      const pageUrl = new URL(window.location.href);
      const searchParams = new URLSearchParams(pageUrl.search);
      const queryParams = Object.fromEntries(searchParams);
      console.log("queryParams", queryParams);

      if (queryParams.player !== undefined) {
      }

      this.setState({ matches });
    } catch (e) {
      console.log(e);
    }
  };

  render() {
    const { matches } = this.state;

    if (matches.length > 0) {
      return (
        <Container>
          <Navbar />
          <div className="matches">
            {Object.keys(matches).map((key) => (
              <div>
                <Match match={matches[key]} key={matches[key].id} transition={this.state.transition}></Match>
                <Divider />
              </div>
            ))}
          </div>
        </Container>
      );
    } else {
      return (
        <Container>
          <Navbar />
          <Grid columns={3}>
            <Grid.Row columns={3}>
              <Dimmer active>
                <Loader />
              </Dimmer>
            </Grid.Row>
          </Grid>
        </Container>
      );
    }
  }
}

export default App;
// npm run dev
