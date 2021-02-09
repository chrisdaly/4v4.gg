import React, { Component } from "react";

import RangePlotOld from "./charts/RangePlotOld";
// import RangePlot from "./charts/RangePlot";

class RangePlotSection extends Component {
  componentDidMount() {
    this.draw();
  }

  draw = () => {
    if (this.props.data != null && this.props.data !== []) {
      RangePlotOld(`rangeplot-${this.props.id}`, this.props.data);
    }
  };

  render() {
    return <div id={`rangeplot-${this.props.id}`}></div>;
  }
}

export default RangePlotSection;
