import React, { Component } from "react";
import Match from "./Match.js";
import { Container, Header } from "semantic-ui-react";

import "semantic-ui-css/semantic.min.css";
import "./App.css";

const validQueue = (queue) => queue.length === 1 && typeof queue[0] !== "undefined" && "count" in queue[0];
const gameMode = 4;
const gateway = 20;

const socket = new WebSocket(
  `ws://157.90.1.251:25058/?%7B%22battleTag%22:%22WEAREFOALS%25231522%22,%22gateway%22:${gameMode},%22gatewayPing%22:218,%22toonName%22:%22WEAREFOALS%25231522%22,%22token%22:%22%22,%22country%22:%22GB%22,%22ipAddress%22:%2237.156.72.6%22%7D`
);

class App extends Component {
  state = {
    ONLINE_PLAYER_COUNT: [],
    QUEUED_PLAYER_COUNT: [],
    queueCount: 0,
    matches: [],
  };

  componentWillMount() {
    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      const type = msg.type;
      const data = msg.data;
      // console.log(type, data);

      const queueFiltered = this.state.QUEUED_PLAYER_COUNT.filter((d) => (d.gateway === 20) & (d.gameMode == 4));
      // console.log("queueFiltered", queueFiltered);
      // console.log("validQueue", validQueue(queueFiltered));
      const queueCount = validQueue(queueFiltered) ? queueFiltered[0].count : 0;

      var url = new URL("https://website-backend.w3champions.com/api/matches/ongoing");
      var params = { offset: 0, gateway, pageSize: 50, gameMode, map: "Overall" };
      url.search = new URLSearchParams(params).toString();

      fetch(url)
        .then((response) => response.json())
        .then(
          (result) => {
            this.setState({
              matches: result.matches,
              [type]: data,
              queueCount,
            });
          },
          (error) => {
            this.setState({
              isLoaded: true,
              error,
            });
          }
        );
    };
  }

  render() {
    const { queueCount, matches } = this.state;

    if (queueCount > 0) {
      return (
        <Container text>
          <Header as="h2">
            {gameMode} v {gameMode} Queue Summary
          </Header>
          <div>
            <p>PLAYERS IN QUEUE: {JSON.stringify(queueCount)}</p>
            <p>ONGOING MATCHES: {matches.length}</p>

            {Object.keys(matches).map((key) => (
              <Match match={matches[key]} key={matches[key].id}></Match>
            ))}
          </div>
        </Container>
      );
    } else {
      return <div>No data </div>;
    }
  }
}

export default App;
