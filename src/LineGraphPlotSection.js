import React, { Component } from "react";

import LineGraphPlot from "./charts/LineGraphPlot";
// import RangePlot from "./charts/RangePlot";

class LineGraphPlotSection extends Component {
  componentDidMount() {
    this.draw();
  }

  draw = () => {
    if (this.props.data != null && this.props.data !== []) {
      //   LineGraphPlot(`rangeplot-${this.props.id}`, this.props.data);
    }
  };

  render() {
    return <div id={`rangeplot-0`}></div>;
  }
}

export default LineGraphPlotSection;
