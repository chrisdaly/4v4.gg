import React, { Component } from "react";
import Match from "./Match.js";
import { Container } from "semantic-ui-react";

import "semantic-ui-css/semantic.min.css";
import "./App.css";

import fakeData from "./fakeData.js";

const validQueue = (queue) => queue.length === 1 && typeof queue[0] !== "undefined" && "count" in queue[0];
const gameMode = 4;
const gateway = 20;

const socket = new WebSocket(
  `ws://157.90.1.251:25058/?%7B%22battleTag%22:%22WEAREFOALS%25231522%22,%22gateway%22:${gameMode},%22gatewayPing%22:218,%22toonName%22:%22WEAREFOALS%25231522%22,%22token%22:%22%22,%22country%22:%22GB%22,%22ipAddress%22:%2237.156.72.6%22%7D`
);

const calculateAverage = (arr) => Math.round(arr.reduce((p, c) => p + c, 0) / arr.length);

class App extends Component {
  state = {
    matches: [],
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
    console.log("loadData");
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
          let teamAverage = calculateAverage(playerMmrs);
          t.teamAverage = teamAverage;
          matchMmr += teamAverage;
        });

        m.matchMmr = Math.round(matchMmr / 2);
      });

      matches.sort((a, b) => b.matchMmr - a.matchMmr);

      this.setState({
        matches,
      });
    } catch (e) {
      console.log(e);
    }
  };

  render() {
    const { matches } = this.state;

    if (matches.length > 0) {
      return (
        <Container>
          {Object.keys(matches).map((key) => (
            <Match match={matches[key]} key={matches[key].id}></Match>
          ))}
        </Container>
      );
    } else {
      return <div>No matches being played </div>;
    }
  }
}

export default App;
