import React, { Component } from "react";
import { Container, Grid, Dimmer, Loader } from "semantic-ui-react";

import Match from "./Match.js";
import Navbar from "./Navbar.js";

import "semantic-ui-css/semantic.min.css";
import "./App.css";

const gameMode = 4;
const gateway = 20;
const arithmeticMean = (x) => {
  const product = x.reduce((p, c) => p * c, 1);
  const exponent = 1 / x.length;
  return Math.round(Math.pow(product, exponent));
};

class App extends Component {
  state = {
    // ONLINE_PLAYER_COUNT: [],
    QUEUED_PLAYER_COUNT: [],
    queue: [],
    matches: [],
    transition: false,
  };

  componentDidMount() {
    this.loadData();
    let intervalId = setInterval(this.loadData, 30000);
    let transitionId = setInterval(() => this.setState({ transition: !this.state.transition }), 1000);

    this.setState({ intervalId, transitionId });
  }

  componentWillUnmount() {
    clearInterval(this.state.intervalId);
    clearInterval(this.state.transitionId);
  }

  loadData = async () => {
    // console.log("loadData");
    try {
      var url = new URL("https://website-backend.w3champions.com/api/matches/ongoing");
      var params = { offset: 0, gateway, pageSize: 50, gameMode, map: "Overall" };
      // var url = new URL("https://website-backend.w3champions.com/api/matches/search");

      // var params = { playerId: "ic3#21532", gateway, pageSize: 50, gameMode, map: "Overall", offset: 0, season: 6 };
      url.search = new URLSearchParams(params).toString();
      // console.log("url", url);

      const response = await fetch(url);
      const result = await response.json();
      let matches = result.matches;

      matches.forEach((m) => {
        let matchMmr = 0;
        m.teams.forEach((t) => {
          let playerMmrs = t.players.map((d) => d.oldMmr);
          let teamAverage = arithmeticMean(playerMmrs);
          t.teamAverage = teamAverage;
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
        // matches
      }

      this.setState({ matches });
    } catch (e) {
      console.log(e);
    }
  };

  render() {
    const { matches } = this.state;

    // if (this.state.isLoaded === true) {
    //   return (

    //   );
    // } else {
    //   return (

    //   );
    // }

    if (matches.length > 0) {
      return (
        <Container>
          <Navbar />
          <div className="matches">
            {Object.keys(matches).map((key) => (
              <Match match={matches[key]} key={matches[key].id}></Match>
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
              {/* <Segment> */}
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
