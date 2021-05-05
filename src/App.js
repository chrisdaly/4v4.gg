import React, { Component } from "react";
import { Container } from "semantic-ui-react";

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
    matches: [],
  };

  componentDidMount() {
    const url = new URL(window.location.href);
    const searchParams = new URLSearchParams(url.search);
    const queryParams = Object.fromEntries(searchParams);
    console.log("queryParams", queryParams);
    this.loadData();
    let intervalId = setInterval(this.loadData, 30000);
    this.setState({ intervalId });
  }

  componentWillUnmount() {
    clearInterval(this.state.intervalId);
  }

  loadData = async () => {
    console.log("loadData");
    try {
      var url = new URL("https://website-backend.w3champions.com/api/matches/ongoing");
      var params = { offset: 0, gateway, pageSize: 50, gameMode, map: "Overall" };
      // var url = new URL("https://website-backend.w3champions.com/api/matches/search");

      // var params = { playerId: "ic3#21532", gateway, pageSize: 50, gameMode, map: "Overall", offset: 0, season: 6 };
      url.search = new URLSearchParams(params).toString();
      console.log("url", url);

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
              <Match match={matches[key]} key={matches[key].id}></Match>
            ))}
          </div>
        </Container>
      );
    } else {
      return <div>No matches being played </div>;
    }
  }
}

export default App;
