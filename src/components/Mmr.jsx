import React from "react";

const Mmr = ({ data }) => {
  if (data === undefined) return null;
  return <p className="number">{data.toLocaleString()}</p>;
};

export default Mmr;
