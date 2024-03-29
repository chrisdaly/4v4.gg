import React, { Component } from "react";
import Navbar from "./Navbar.js";
import RankRow from "./RankRow.js";

import { Container, Flag, Header, Table, Rating } from "semantic-ui-react";

import { gateway, season } from "./params";

class Ladder extends Component {
  state = {
    rankings: [],
  };

  componentDidMount() {
    this.loadData();
    this.setState({}); //intervalId
  }

  componentWillUnmount() {}

  loadData = async () => {
    try {
      var url = new URL(
        `https://website-backend.w3champions.com/api/ladder/0?gateWay=20&gameMode=4&season=${season}`
      );
      var response = await fetch(url);
      var result = await response.json();
      this.setState({ rankings: result });
    } catch (e) {
      console.log(e);
    }
  };

  render() {
    const rankings = this.state.rankings;
    if (rankings.length > 0) {
      return (
        <Container>
          <Navbar />
          <div className={"tableContainer"}>
            <Table inverted size="small" compact>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell singleLine>Rank</Table.HeaderCell>
                  <Table.HeaderCell>LVL</Table.HeaderCell>
                  <Table.HeaderCell>Race</Table.HeaderCell>
                  <Table.HeaderCell>Player</Table.HeaderCell>
                  <Table.HeaderCell>MMR</Table.HeaderCell>
                  <Table.HeaderCell>Wins</Table.HeaderCell>
                  <Table.HeaderCell>Losses</Table.HeaderCell>
                  <Table.HeaderCell>Winrate</Table.HeaderCell>
                  <Table.HeaderCell>Form</Table.HeaderCell>
                </Table.Row>
              </Table.Header>

              <Table.Body>
                {Object.keys(rankings).map((key) => (
                  <RankRow
                    rank={rankings[key]}
                    key={rankings[key].id}
                  ></RankRow>
                ))}
              </Table.Body>
            </Table>
          </div>
        </Container>
      );
    } else {
      return (
        <Container>
          <Navbar />
        </Container>
      );
    }
  }
}

export default Ladder;
