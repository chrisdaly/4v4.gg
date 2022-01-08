import React, { Component } from "react";

class Mmr extends Component {
  render() {
    const oldMmr = this.props.data;

    if (oldMmr !== undefined) {
      return <h5 className={"number"}>{oldMmr.toLocaleString()}</h5>;
    } else {
      return null;
    }
  }
}

export default Mmr;
