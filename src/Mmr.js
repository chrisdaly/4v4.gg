import React, { Component } from "react";

class Mmr extends Component {
  render() {
    const oldMmr = this.props.data;

    if (oldMmr !== undefined) {
      return <p className={"number"}>{oldMmr.toLocaleString()}</p>;
    } else {
      return null;
    }
  }
}

export default Mmr;
