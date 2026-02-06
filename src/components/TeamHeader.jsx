import React from "react";
import Mmr from "./Mmr";

const TeamHeader = ({ teamNum, teamMmr, teamDeviation, won }) => {
  const displayMmr = teamMmr !== undefined ? teamMmr.toLocaleString() : undefined;

  return (
    <div className={`th-container team-header team-${teamNum}`}>
      <div className="th-row playerTop">
        <div className="th-col">
          <Mmr data={displayMmr} />
        </div>
      </div>
    </div>
  );
};

export default TeamHeader;
