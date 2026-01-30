import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

const MmrComparison = ({ data, compact = false }) => {
  const { teamOneMmrs, teamTwoMmrs, teamOneAT = [], teamTwoAT = [] } = data;
  const svgRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current) return;

    // Create data with AT info, filter out unranked players
    const teamOneData = teamOneMmrs
      .map((mmr, i) => ({ mmr, isAT: teamOneAT[i] || false, index: i }))
      .filter(d => d.mmr && d.mmr > 0);
    const teamTwoData = teamTwoMmrs
      .map((mmr, i) => ({ mmr, isAT: teamTwoAT[i] || false, index: i }))
      .filter(d => d.mmr && d.mmr > 0);

    const svg = d3.select(svgRef.current);

    // Remove existing content to avoid appending multiple plots
    svg.selectAll("*").remove();

    // Get dimensions of parent container
    const parent = svgRef.current.parentElement;
    const width = parent.clientWidth;
    const height = parent.clientHeight;

    // Define margins
    const margin = { top: 10, right: 0, bottom: 10, left: 0 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Define scales
    // Compact mode: dynamic scale fully stretched (min at bottom, max at top)
    // Non-compact mode: fixed scale 800-2700 for comparing games
    let yDomain;
    if (compact) {
      const allMmrs = [...teamOneData, ...teamTwoData].map(d => d.mmr);
      const minMmr = Math.min(...allMmrs);
      const maxMmr = Math.max(...allMmrs);
      yDomain = [minMmr, maxMmr];
    } else {
      yDomain = [800, 2700];
    }

    const yScale = d3
      .scaleLinear()
      .domain(yDomain)
      .range([innerHeight, margin.top]);

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

    // Draw connecting lines between AT players (rendered first so dots appear on top)
    const teamOneATData = teamOneData.filter(d => d.isAT);
    if (teamOneATData.length > 1) {
      svg.append("path")
        .datum(teamOneATData)
        .attr("class", "at-connect-line")
        .attr("d", d3.line()
          .x(() => teamOneX)
          .y((d) => yScale(d.mmr))
        );
    }
    const teamTwoATData = teamTwoData.filter(d => d.isAT);
    if (teamTwoATData.length > 1) {
      const teamTwoX = (2 * innerWidth) / 3 + margin.left;
      svg.append("path")
        .datum(teamTwoATData)
        .attr("class", "at-connect-line")
        .attr("d", d3.line()
          .x(() => teamTwoX)
          .y((d) => yScale(d.mmr))
        );
    }

    // Team One dots - AT players get purple ring
    svg
      .selectAll(".dot-team-one")
      .data(teamOneData)
      .enter()
      .append("circle")
      .attr("class", (d) => d.isAT ? "dot dot-team-one at-ring" : "dot dot-team-one")
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

    // Team Two dots - AT players get purple ring
    svg
      .selectAll(".dot-team-two")
      .data(teamTwoData)
      .enter()
      .append("circle")
      .attr("class", (d) => d.isAT ? "dot dot-team-two at-ring" : "dot dot-team-two")
      .attr("cx", teamTwoX)
      .attr("cy", (d) => yScale(d.mmr))
      .attr("r", dotRadius);

    const middleLine = innerWidth / 2 + margin.left;

    svg
      .append("line")
      .attr("class", "line team-middle")
      .attr("x1", middleLine)
      .attr("y1", 0)
      .attr("x2", middleLine)
      .attr("y2", height);

    // Only show MMR label in non-compact mode
    if (!compact) {
      svg.append("text").attr("class", "axistitle").text("MMR").attr("x", middleLine).attr("y", innerHeight);
    }
  }, [teamOneMmrs, teamTwoMmrs, teamOneAT, teamTwoAT, compact]);

  return <svg ref={svgRef} style={{ width: "100%", height: "100%" }}></svg>;
};

export { MmrComparison };
