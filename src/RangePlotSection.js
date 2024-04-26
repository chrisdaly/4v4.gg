import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

const RangePlotSection = ({ data }) => {
  const { teamOneMmrs, teamTwoMmrs } = data;
  const svgRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);

    // Remove existing content to avoid appending multiple plots
    svg.selectAll("*").remove();

    // Get dimensions of parent container
    const parent = svgRef.current.parentElement;
    const width = parent.clientWidth;
    const height = parent.clientHeight;

    // Define margins
    const margin = { top: 5, right: 0, bottom: 5, left: 0 }; // Adjusted top margin
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Define scales
    const yScale = d3
      .scaleLinear()
      .domain([Math.min(...teamOneMmrs, ...teamTwoMmrs), Math.max(...teamOneMmrs, ...teamTwoMmrs)])
      .range([innerHeight, margin.bottom]);

    // Draw Team One line and circles
    const teamOneLine = d3
      .line()
      .x((d, i) => innerWidth / 4 + margin.left)
      .y((d) => yScale(d));

    svg.append("path").datum(teamOneMmrs).attr("class", "line team-one").attr("d", teamOneLine);

    svg
      .selectAll(".dot-team-one")
      .data(teamOneMmrs)
      .enter()
      .append("circle")
      .attr("class", "dot dot-team-one")
      .attr("cx", innerWidth / 4 + margin.left)
      .attr("cy", (d) => yScale(d))
      .attr("r", 3)
      .attr("fill", "red");

    // Draw Team Two line and circles
    const teamTwoLine = d3
      .line()
      .x((d, i) => (3 * innerWidth) / 4 + margin.left)
      .y((d) => yScale(d));

    svg.append("path").datum(teamTwoMmrs).attr("class", "line team-two").attr("d", teamTwoLine);

    svg
      .selectAll(".dot-team-two")
      .data(teamTwoMmrs)
      .enter()
      .append("circle")
      .attr("class", "dot dot-team-two")
      .attr("cx", (3 * innerWidth) / 4 + margin.left)
      .attr("cy", (d) => yScale(d))
      .attr("r", 3)
      .attr("fill", "blue");

    const middleLine = innerWidth / 2 + margin.left;

    svg
      .append("line")
      .attr("class", "line team-middle")
      .attr("x1", middleLine)
      .attr("y1", 0 + 15)
      .attr("x2", middleLine)
      .attr("y2", innerHeight - 15);

    svg
      .append("text")
      .attr("class", "axistitle")
      .text("MMR")
      .attr("x", middleLine)
      .attr("y", innerHeight - 10);
  }, [teamOneMmrs, teamTwoMmrs]);

  return <svg ref={svgRef} style={{ width: "100%", height: "100%" }}></svg>;
};

export { RangePlotSection };
