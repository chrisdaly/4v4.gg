import React, { Component } from "react";
import { TransitionGroup, CSSTransition } from "react-transition-group";

import Mmr from "./Mmr.jsx";

class TeamHeader extends Component {
  render() {
    let { teamNum, teamMmr, teamDeviation, won } = this.props;
    if (teamMmr !== undefined) {
      teamMmr = teamMmr.toLocaleString();
    }
    return (
      <div className={`th-container team-header team-${teamNum}`}>
        <div className="th-row playerTop">
          <div className="th-col">
            <Mmr data={teamMmr}></Mmr>
          </div>
        </div>
      </div>
    );
  }
}

export default TeamHeader;
