import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

const MmrComparison = ({ data, compact = false }) => {
  const { teamOneMmrs, teamTwoMmrs, teamOneAT = [], teamTwoAT = [] } = data;
  const svgRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current) return;

    // Create data with AT group size info, filter out unranked players
    // teamOneAT/teamTwoAT now contain group sizes (0, 2, 3, 4) instead of booleans
    const teamOneData = teamOneMmrs
      .map((mmr, i) => ({ mmr, atGroupSize: teamOneAT[i] || 0, index: i }))
      .filter(d => d.mmr && d.mmr > 0);
    const teamTwoData = teamTwoMmrs
      .map((mmr, i) => ({ mmr, atGroupSize: teamTwoAT[i] || 0, index: i }))
      .filter(d => d.mmr && d.mmr > 0);

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const parent = svgRef.current.parentElement;
    const width = parent.clientWidth;
    const height = parent.clientHeight;

    const margin = { top: 10, right: 0, bottom: 10, left: 0 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

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

    const teamOneX = innerWidth / 3 + margin.left;
    const teamTwoX = (2 * innerWidth) / 3 + margin.left;
    const dotRadius = compact ? 3 : 4;

    // Draw team spread lines
    const teamOneLine = d3.line().x(() => teamOneX).y((d) => yScale(d.mmr));
    svg.append("path").datum(teamOneData).attr("class", "line team-one").attr("d", teamOneLine);

    const teamTwoLine = d3.line().x(() => teamTwoX).y((d) => yScale(d.mmr));
    svg.append("path").datum(teamTwoData).attr("class", "line team-two").attr("d", teamTwoLine);

    // Track AT group slice indices for shuriken rendering
    const atGroupCounters = { team1: {}, team2: {} };

    // Helper to draw shuriken pie slice for AT players
    const drawShuriken = (cx, cy, groupSize, sliceIndex, teamClass) => {
      const totalRadius = dotRadius * Math.sqrt(groupSize);
      const sliceAngle = (2 * Math.PI) / groupSize;
      const gapAngle = 0.5;
      const baseRotation = groupSize === 2 ? Math.PI / 4 : 0;
      const startAngle = sliceIndex * sliceAngle + gapAngle / 2 + baseRotation;
      const endAngle = (sliceIndex + 1) * sliceAngle - gapAngle / 2 + baseRotation;

      const arc = d3.arc()
        .innerRadius(0)
        .outerRadius(totalRadius)
        .startAngle(startAngle)
        .endAngle(endAngle);

      svg.append("path")
        .attr("d", arc())
        .attr("transform", `translate(${cx}, ${cy})`)
        .attr("class", `dot ${teamClass}`);
    };

    // Draw Team One dots/shurikens
    teamOneData.forEach(d => {
      const cy = yScale(d.mmr);
      if (d.atGroupSize > 0) {
        const groupSize = d.atGroupSize;
        if (!atGroupCounters.team1[groupSize]) atGroupCounters.team1[groupSize] = 0;
        const sliceIndex = atGroupCounters.team1[groupSize];
        atGroupCounters.team1[groupSize]++;
        if (atGroupCounters.team1[groupSize] >= groupSize) atGroupCounters.team1[groupSize] = 0;
        drawShuriken(teamOneX, cy, groupSize, sliceIndex, "dot-team-one");
      } else {
        svg.append("circle")
          .attr("class", "dot dot-team-one")
          .attr("cx", teamOneX)
          .attr("cy", cy)
          .attr("r", dotRadius);
      }
    });

    // Draw Team Two dots/shurikens
    teamTwoData.forEach(d => {
      const cy = yScale(d.mmr);
      if (d.atGroupSize > 0) {
        const groupSize = d.atGroupSize;
        if (!atGroupCounters.team2[groupSize]) atGroupCounters.team2[groupSize] = 0;
        const sliceIndex = atGroupCounters.team2[groupSize];
        atGroupCounters.team2[groupSize]++;
        if (atGroupCounters.team2[groupSize] >= groupSize) atGroupCounters.team2[groupSize] = 0;
        drawShuriken(teamTwoX, cy, groupSize, sliceIndex, "dot-team-two");
      } else {
        svg.append("circle")
          .attr("class", "dot dot-team-two")
          .attr("cx", teamTwoX)
          .attr("cy", cy)
          .attr("r", dotRadius);
      }
    });

    // Center line
    const middleLine = innerWidth / 2 + margin.left;
    svg.append("line")
      .attr("class", "line team-middle")
      .attr("x1", middleLine).attr("y1", 0)
      .attr("x2", middleLine).attr("y2", height);

    if (!compact) {
      svg.append("text").attr("class", "axistitle").text("MMR").attr("x", middleLine).attr("y", innerHeight);
    }
  }, [teamOneMmrs, teamTwoMmrs, teamOneAT, teamTwoAT, compact]);

  return <svg ref={svgRef} style={{ width: "100%", height: "100%" }}></svg>;
};

export { MmrComparison };
