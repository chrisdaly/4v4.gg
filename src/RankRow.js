import React, { Component } from "react";

import { Container, Flag, Header, Table, Rating } from "semantic-ui-react";

class RankRow extends Component {
  render() {
    const { name, mmr, wins, losses, winrate } = { ...this.props.rank.player };
    const battleTag = this.props.rank.playersInfo[0].battleTag;
    return (
      <Table.Row>
        <Table.Cell>
          <Header as="h2" textAlign="center" inverted>
            {this.props.rank.rankNumber}
          </Header>
        </Table.Cell>
        <Table.Cell singleLine>
          {/* {name} */}
          <a target="_blank" href={`/player/${battleTag.replace("#", "%23")}`} rel="noreferrer">
            {name}
          </a>
        </Table.Cell>
        <Table.Cell>{this.props.rank.rankingPoints}</Table.Cell>
        <Table.Cell textAlign="right">{mmr}</Table.Cell>
        <Table.Cell>{wins}</Table.Cell>
        <Table.Cell>{losses}</Table.Cell>
        <Table.Cell>{Math.round(winrate * 10000) / 100}%</Table.Cell>
      </Table.Row>
    );
  }
}

export default RankRow;
