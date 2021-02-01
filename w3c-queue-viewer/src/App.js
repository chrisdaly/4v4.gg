import React, { Component } from "react";

const socket = new WebSocket(
  "ws://157.90.1.251:25058/?%7B%22battleTag%22:%22WEAREFOALS%25231522%22,%22gateway%22:20,%22gatewayPing%22:218,%22toonName%22:%22WEAREFOALS%25231522%22,%22token%22:%22%22,%22country%22:%22GB%22,%22ipAddress%22:%2237.156.72.6%22%7D"
);

class App extends Component {
  state = {
    ONLINE_PLAYER_COUNT: [],
    QUEUED_PLAYER_COUNT: [],
    queue: [],
    matches: [],
  };

  componentWillMount() {
    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      const type = msg.type;
      const data = msg.data;
      console.log(type, data);

      const queue = this.state.QUEUED_PLAYER_COUNT.filter((d) => d.gateway === 20);

      fetch("https://website-backend.w3champions.com/api/matches/ongoing")
        .then((response) => response.json())
        .then(
          (result) => {
            this.setState({
              matches: result.matches,
              [type]: data,
              queue,
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
    const { queue, matches } = this.state;

    return (
      <div>
        {/* <p>ONLINE_PLAYER_COUNT: {JSON.stringify(this.state.ONLINE_PLAYER_COUNT)}</p> */}
        {/* <p>QUEUED_PLAYER_COUNT: {JSON.stringify(this.state.QUEUED_PLAYER_COUNT)}</p> */}
        <p>QUEUE: {JSON.stringify(queue)}</p>
        <p>MATCHES: {matches.length}</p>
        <p>{JSON.stringify(matches)}</p>
      </div>
    );
  }
}

export default App;
