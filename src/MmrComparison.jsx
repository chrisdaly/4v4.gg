import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

const MmrComparison = ({ data, compact = false }) => {
  const { teamOneMmrs, teamTwoMmrs, teamOneAT = [], teamTwoAT = [] } = data;
  const svgRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current) return;

    // Create data with AT info, filter out unranked players
    const teamOneData = teamOneMmrs
      .map((mmr, i) => ({ mmr, isAT: teamOneAT[i] || false }))
      .filter(d => d.mmr && d.mmr > 0);
    const teamTwoData = teamTwoMmrs
      .map((mmr, i) => ({ mmr, isAT: teamTwoAT[i] || false }))
      .filter(d => d.mmr && d.mmr > 0);

    const svg = d3.select(svgRef.current);

    // Remove existing content to avoid appending multiple plots
    svg.selectAll("*").remove();

    // Get dimensions of parent container
    const parent = svgRef.current.parentElement;
    const width = parent.clientWidth;
    const height = parent.clientHeight;

    // Define margins
    const margin = { top: 5, right: 0, bottom: 5, left: 0 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Define scales
    const yScale = d3
      .scaleLinear()
      .domain([800, 2600])
      .range([innerHeight, margin.bottom]);

    // Draw Team One line and circles
    const teamOneX = innerWidth / 3 + margin.left;
    const teamOneLine = d3
      .line()
      .x(() => teamOneX)
      .y((d) => yScale(d.mmr));

    svg.append("path")
      .datum(teamOneData)
      .attr("class", "line team-one")
      .attr("d", teamOneLine);

    const dotRadius = compact ? 3 : 4;

    svg
      .selectAll(".dot-team-one")
      .data(teamOneData)
      .enter()
      .append("circle")
      .attr("class", (d) => `dot dot-team-one ${d.isAT ? "at-dot" : ""}`)
      .attr("cx", teamOneX)
      .attr("cy", (d) => yScale(d.mmr))
      .attr("r", dotRadius);

    // Draw Team Two line and circles
    const teamTwoX = (2 * innerWidth) / 3 + margin.left;
    const teamTwoLine = d3
      .line()
      .x(() => teamTwoX)
      .y((d) => yScale(d.mmr));

    svg.append("path")
      .datum(teamTwoData)
      .attr("class", "line team-two")
      .attr("d", teamTwoLine);

    svg
      .selectAll(".dot-team-two")
      .data(teamTwoData)
      .enter()
      .append("circle")
      .attr("class", (d) => `dot dot-team-two ${d.isAT ? "at-dot" : ""}`)
      .attr("cx", teamTwoX)
      .attr("cy", (d) => yScale(d.mmr))
      .attr("r", dotRadius);

    const middleLine = innerWidth / 2 + margin.left;

    svg
      .append("line")
      .attr("class", "line team-middle")
      .attr("x1", middleLine)
      .attr("y1", compact ? 5 : 15)
      .attr("x2", middleLine)
      .attr("y2", innerHeight - (compact ? 5 : 15));

    // Only show MMR label in non-compact mode
    if (!compact) {
      svg.append("text").attr("class", "axistitle").text("MMR").attr("x", middleLine).attr("y", innerHeight);
    }
  }, [teamOneMmrs, teamTwoMmrs, teamOneAT, teamTwoAT, compact]);

  return <svg ref={svgRef} style={{ width: "100%", height: "100%" }}></svg>;
};

export { MmrComparison };
