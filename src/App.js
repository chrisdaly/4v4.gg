import React, { Component } from "react";
import { Container } from "semantic-ui-react";

import Match from "./Match.js";

import "semantic-ui-css/semantic.min.css";
import "./App.css";

const gameMode = 4;
const gateway = 20;
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
