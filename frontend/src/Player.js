import React, { Component } from "react";
import { Card, Flag } from "semantic-ui-react";
import { Header, Image, Table } from "semantic-ui-react";

class Player extends Component {
  render() {
    const { race, oldMmr, name, location } = this.props.data;
    console.log("this.props", this.props);

    return (
      <div>
        {/* <Card link header={name} meta={oldMmr} /> */}
        <p>
          <b>{name}</b> {oldMmr} <Flag name={location.toLowerCase()}></Flag>
        </p>
      </div>
    );
  }
}

export default Player;
