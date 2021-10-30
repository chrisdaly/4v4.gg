import React, { Component } from "react";
import { Container, Grid, Statistic, Divider, Dimmer, Loader } from "semantic-ui-react";

import Navbar from "./Navbar.js";

import Match from "./Match.js";

const arithmeticMean = (x) => {
  const product = x.reduce((p, c) => p * c, 1);
  const exponent = 1 / x.length;
  return Math.round(Math.pow(product, exponent));
};

class Queue extends Component {
  state = {
    match: null,
    isLoaded: false,
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
    const pageUrl = new URL(window.location.href);
    const matchId = pageUrl.pathname.split("/").slice(-1)[0]; //
    const url = new URL(`https://website-backend.w3champions.com/api/matches/${matchId}`);
    let match = null;
    console.log("url", url);

    var response = await fetch(url);
    var result = await response.json();

    if (result.match === null) {
      const gameMode = 4;
      const gateway = 20;

      var urlLive = new URL("https://website-backend.w3champions.com/api/matches/ongoing");
      var params = { offset: 0, gateway, pageSize: 50, gameMode, map: "Overall" };
      // var url = new URL("https://website-backend.w3champions.com/api/matches/search");

      // var params = { playerId: "ic3#21532", gateway, pageSize: 50, gameMode, map: "Overall", offset: 0, season: 6 };
      urlLive.search = new URLSearchParams(params).toString();
      // console.log("url", url);

      response = await fetch(urlLive);
      result = await response.json();
      let matches = result.matches;

      matches = matches.filter((d) => d.id === matchId);
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

      match = matches[0];
    } else {
      console.log("result", result);
      match = result.match;
    }
    console.log("MATCH", match);

    if (match !== undefined) {
      let matchMmr = 0;
      match.teams.forEach((t) => {
        let playerMmrs = t.players.map((d) => d.oldMmr);
        let teamAverage = arithmeticMean(playerMmrs);
        t.teamAverage = teamAverage;
        matchMmr += teamAverage;
      });

      match.matchMmr = Math.round(matchMmr / 2);

      this.setState({ ...result, match, isLoaded: true });
    }
  };

  render() {
    const queueDict = this.state.QUEUED_PLAYER_COUNT ? this.state.QUEUED_PLAYER_COUNT.filter((d) => d.gateway === 20 && d.gameMode === 4)[0] : {};
    const numQueued = queueDict ? queueDict.count : 0;
    const playerPoolPlaying = this.state.playerPoolPlaying;
    const playerPoolRecent = this.state.playerPoolRecent;
    const match = this.state.match;

    if (this.state.isLoaded === true) {
      return (
        <Container>
          <Navbar />
          <div className="matches">
            {/* {Object.keys(matches).map((key) => ( */}
            <Match match={match}></Match>
            {/* ))} */}
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

export default Queue;
