import React, { Component } from "react";
import { Container, Grid, Dimmer, Loader, Divider } from "semantic-ui-react";

import Match from "./Match.js";
import Navbar from "./Navbar.js";

import { standardDeviation, arithmeticMean } from "./utils.js";

import "semantic-ui-css/semantic.min.css";
import "./App.css";

import { gameMode, gateway, season } from "./params";

class App extends Component {
  state = {
    QUEUED_PLAYER_COUNT: [],
    queue: [],
    matches: [],
    ladderRanks: [],
  };

  componentDidMount() {
    this.loadData();
    let intervalId = setInterval(this.loadData, 30000);
    this.setState({ intervalId });
  }

  componentWillUnmount() {
    clearInterval(this.state.intervalId);
  }

  loadData = async () => {
    try {
      var url = new URL(
        "https://website-backend.w3champions.com/api/matches/ongoing"
      );
      var params = {
        offset: 0,
        gateway,
        pageSize: 50,
        gameMode,
        map: "Overall",
      };
      url.search = new URLSearchParams(params).toString();

      var response = await fetch(url);
      var result = await response.json();
      let matches = result.matches;

      matches.forEach((m) => {
        let matchMmr = 0;
        m.teams.forEach((t) => {
          let playerMmrs = t.players.map((d) => d.oldMmr);
          let teamAverage = arithmeticMean(playerMmrs);
          let teamDeviation = standardDeviation(playerMmrs);
          t.teamAverage = teamAverage;
          t.teamDeviation = teamDeviation;
          matchMmr += teamAverage;
        });

        m.matchMmr = Math.round(matchMmr / 2);
      });

      matches.sort((a, b) => b.matchMmr - a.matchMmr);

      const pageUrl = new URL(window.location.href);
      const searchParams = new URLSearchParams(pageUrl.search);
      const queryParams = Object.fromEntries(searchParams);
      if (queryParams.player !== undefined) {
      }

      this.setState({ matches });

      var url = new URL("https://website-backend.w3champions.com/api/ladder/0");
      var params = { gateway, season, gameMode };
      url.search = new URLSearchParams(params).toString();

      var response = await fetch(url);
      var result = await response.json();
      this.setState({ ladderRanks: result.slice(0, 20) });
    } catch (e) {
      console.log(e);
    }
  };

  render() {
    const { matches, ladderRanks } = this.state;
    if (matches.length > 0 && ladderRanks.length > 0) {
      return (
        <Container>
          <>
            <Navbar />
          </>
          <div className="matches">
            {Object.keys(matches).map((key) => (
              <div>
                <Match
                  match={matches[key]}
                  key={matches[key].id}
                  ladderRanks={ladderRanks}
                />
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
