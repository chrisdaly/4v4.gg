import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

// Beeswarm layout using d3-force to prevent overlapping
const MmrComparisonBeeswarm = ({ data, layout = "vertical" }) => {
  const { teamOneMmrs, teamTwoMmrs, teamOneAT = [], teamTwoAT = [], teamOneNames = [], teamTwoNames = [] } = data;
  const svgRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const parent = svgRef.current.parentElement;
    const width = parent.clientWidth;
    const height = parent.clientHeight;

    // Create combined data with team info
    const teamOneData = teamOneMmrs
      .map((mmr, i) => ({ mmr, isAT: teamOneAT[i], team: 1, name: teamOneNames[i] || `P${i+1}`, index: i }))
      .filter(d => d.mmr && d.mmr > 0);
    const teamTwoData = teamTwoMmrs
      .map((mmr, i) => ({ mmr, isAT: teamTwoAT[i], team: 2, name: teamTwoNames[i] || `P${i+5}`, index: i }))
      .filter(d => d.mmr && d.mmr > 0);

    const allData = [...teamOneData, ...teamTwoData];
    const allMmrs = allData.map(d => d.mmr);
    const minMmr = Math.min(...allMmrs);
    const maxMmr = Math.max(...allMmrs);

    const dotRadius = layout === "strip" ? 6 : 8;
    const padding = dotRadius + 4;

    // Different layouts
    if (layout === "vertical") {
      renderVerticalBeeswarm(svg, allData, width, height, minMmr, maxMmr, dotRadius, padding);
    } else if (layout === "horizontal") {
      renderHorizontalBeeswarm(svg, allData, width, height, minMmr, maxMmr, dotRadius, padding);
    } else if (layout === "sideBySide") {
      renderSideBySide(svg, teamOneData, teamTwoData, width, height, minMmr, maxMmr, dotRadius, padding);
    } else if (layout === "strip") {
      renderStrip(svg, allData, width, height, minMmr, maxMmr, dotRadius, padding);
    }

  }, [data, layout]);

  return <svg ref={svgRef} style={{ width: "100%", height: "100%" }} />;
};

// Vertical beeswarm - similar to current but with collision prevention
function renderVerticalBeeswarm(svg, data, width, height, minMmr, maxMmr, radius, padding) {
  const yScale = d3.scaleLinear()
    .domain([minMmr - 50, maxMmr + 50])
    .range([height - padding, padding]);

  // Separate columns for each team
  const team1X = width * 0.33;
  const team2X = width * 0.67;

  // Simple beeswarm: offset x based on collision
  const positioned = [];
  data.forEach(d => {
    const targetX = d.team === 1 ? team1X : team2X;
    const y = yScale(d.mmr);

    // Check for collisions and offset
    let x = targetX;
    let attempts = 0;
    const maxOffset = 20;
    while (attempts < 10) {
      const collision = positioned.find(p =>
        Math.sqrt((p.x - x) ** 2 + (p.y - y) ** 2) < radius * 2.2
      );
      if (!collision) break;
      x = targetX + (attempts % 2 === 0 ? 1 : -1) * Math.ceil(attempts / 2) * 8;
      attempts++;
    }

    positioned.push({ ...d, x, y });
  });

  // Draw AT connecting lines first
  const team1AT = positioned.filter(d => d.team === 1 && d.isAT);
  const team2AT = positioned.filter(d => d.team === 2 && d.isAT);

  if (team1AT.length > 1) {
    svg.append("line")
      .attr("class", "at-connect-line")
      .attr("x1", team1AT[0].x).attr("y1", team1AT[0].y)
      .attr("x2", team1AT[1].x).attr("y2", team1AT[1].y);
  }
  if (team2AT.length > 1) {
    svg.append("line")
      .attr("class", "at-connect-line")
      .attr("x1", team2AT[0].x).attr("y1", team2AT[0].y)
      .attr("x2", team2AT[1].x).attr("y2", team2AT[1].y);
  }

  // Draw center line
  svg.append("line")
    .attr("class", "line team-middle")
    .attr("x1", width / 2).attr("y1", 0)
    .attr("x2", width / 2).attr("y2", height);

  // Draw dots
  svg.selectAll(".dot")
    .data(positioned)
    .enter()
    .append("circle")
    .attr("class", d => `dot dot-team-${d.team === 1 ? "one" : "two"} ${d.isAT ? "at-ring" : ""}`)
    .attr("cx", d => d.x)
    .attr("cy", d => d.y)
    .attr("r", radius);
}

// Horizontal beeswarm - MMR on x-axis
function renderHorizontalBeeswarm(svg, data, width, height, minMmr, maxMmr, radius, padding) {
  const xScale = d3.scaleLinear()
    .domain([minMmr - 50, maxMmr + 50])
    .range([padding, width - padding]);

  const centerY = height / 2;

  // Beeswarm with vertical offset for collisions
  const positioned = [];
  data.forEach(d => {
    const x = xScale(d.mmr);
    let y = centerY;
    let attempts = 0;

    while (attempts < 10) {
      const collision = positioned.find(p =>
        Math.sqrt((p.x - x) ** 2 + (p.y - y) ** 2) < radius * 2.2
      );
      if (!collision) break;
      // Alternate above/below center
      y = centerY + (attempts % 2 === 0 ? 1 : -1) * Math.ceil(attempts / 2) * (radius * 2);
      attempts++;
    }

    positioned.push({ ...d, x, y });
  });

  // Draw AT connecting lines
  const team1AT = positioned.filter(d => d.team === 1 && d.isAT);
  const team2AT = positioned.filter(d => d.team === 2 && d.isAT);

  [team1AT, team2AT].forEach(atGroup => {
    if (atGroup.length > 1) {
      svg.append("line")
        .attr("class", "at-connect-line")
        .attr("x1", atGroup[0].x).attr("y1", atGroup[0].y)
        .attr("x2", atGroup[1].x).attr("y2", atGroup[1].y);
    }
  });

  // Draw dots
  svg.selectAll(".dot")
    .data(positioned)
    .enter()
    .append("circle")
    .attr("class", d => `dot dot-team-${d.team === 1 ? "one" : "two"} ${d.isAT ? "at-ring" : ""}`)
    .attr("cx", d => d.x)
    .attr("cy", d => d.y)
    .attr("r", radius);

  // X-axis labels
  svg.append("text")
    .attr("x", padding).attr("y", height - 4)
    .attr("fill", "#666").attr("font-size", "10px")
    .text(minMmr);
  svg.append("text")
    .attr("x", width - padding).attr("y", height - 4)
    .attr("fill", "#666").attr("font-size", "10px")
    .attr("text-anchor", "end")
    .text(maxMmr);
}

// Side by side columns
function renderSideBySide(svg, team1Data, team2Data, width, height, minMmr, maxMmr, radius, padding) {
  const yScale = d3.scaleLinear()
    .domain([minMmr - 50, maxMmr + 50])
    .range([height - padding, padding]);

  const team1X = width * 0.25;
  const team2X = width * 0.75;

  // Position team 1
  const team1Positioned = [];
  team1Data.forEach(d => {
    const y = yScale(d.mmr);
    let x = team1X;
    let attempts = 0;

    while (attempts < 10) {
      const collision = team1Positioned.find(p =>
        Math.sqrt((p.x - x) ** 2 + (p.y - y) ** 2) < radius * 2.2
      );
      if (!collision) break;
      x = team1X + (attempts % 2 === 0 ? 1 : -1) * Math.ceil(attempts / 2) * (radius * 1.5);
      attempts++;
    }
    team1Positioned.push({ ...d, x, y });
  });

  // Position team 2
  const team2Positioned = [];
  team2Data.forEach(d => {
    const y = yScale(d.mmr);
    let x = team2X;
    let attempts = 0;

    while (attempts < 10) {
      const collision = team2Positioned.find(p =>
        Math.sqrt((p.x - x) ** 2 + (p.y - y) ** 2) < radius * 2.2
      );
      if (!collision) break;
      x = team2X + (attempts % 2 === 0 ? 1 : -1) * Math.ceil(attempts / 2) * (radius * 1.5);
      attempts++;
    }
    team2Positioned.push({ ...d, x, y });
  });

  // Draw AT connecting lines
  const team1AT = team1Positioned.filter(d => d.isAT);
  const team2AT = team2Positioned.filter(d => d.isAT);

  [team1AT, team2AT].forEach(atGroup => {
    if (atGroup.length > 1) {
      svg.append("line")
        .attr("class", "at-connect-line")
        .attr("x1", atGroup[0].x).attr("y1", atGroup[0].y)
        .attr("x2", atGroup[1].x).attr("y2", atGroup[1].y);
    }
  });

  // Center divider
  svg.append("line")
    .attr("class", "line team-middle")
    .attr("x1", width / 2).attr("y1", padding)
    .attr("x2", width / 2).attr("y2", height - padding);

  // Team labels
  svg.append("text")
    .attr("x", team1X).attr("y", 12)
    .attr("fill", "#4a9eff").attr("font-size", "10px").attr("text-anchor", "middle")
    .text("TEAM 1");
  svg.append("text")
    .attr("x", team2X).attr("y", 12)
    .attr("fill", "#ef4444").attr("font-size", "10px").attr("text-anchor", "middle")
    .text("TEAM 2");

  // Draw dots
  [...team1Positioned, ...team2Positioned].forEach(d => {
    svg.append("circle")
      .attr("class", `dot dot-team-${d.team === 1 ? "one" : "two"} ${d.isAT ? "at-ring" : ""}`)
      .attr("cx", d.x)
      .attr("cy", d.y)
      .attr("r", radius);
  });
}

// Compact strip layout - single horizontal line
function renderStrip(svg, data, width, height, minMmr, maxMmr, radius, padding) {
  const xScale = d3.scaleLinear()
    .domain([minMmr - 30, maxMmr + 30])
    .range([padding, width - padding]);

  const centerY = height / 2;

  // Force simulation for beeswarm
  const nodes = data.map(d => ({
    ...d,
    x: xScale(d.mmr),
    targetX: xScale(d.mmr),
    y: centerY
  }));

  // Simple collision resolution
  for (let iter = 0; iter < 50; iter++) {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j].x - nodes[i].x;
        const dy = nodes[j].y - nodes[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = radius * 2.1;

        if (dist < minDist && dist > 0) {
          const push = (minDist - dist) / 2;
          const angle = Math.atan2(dy, dx);
          nodes[i].x -= Math.cos(angle) * push * 0.5;
          nodes[j].x += Math.cos(angle) * push * 0.5;
          nodes[i].y -= Math.sin(angle) * push * 0.5;
          nodes[j].y += Math.sin(angle) * push * 0.5;
        }
      }
      // Pull back toward target x
      nodes[i].x += (nodes[i].targetX - nodes[i].x) * 0.1;
      // Keep y near center
      nodes[i].y += (centerY - nodes[i].y) * 0.3;
    }
  }

  // Clamp y to bounds
  nodes.forEach(n => {
    n.y = Math.max(radius + 2, Math.min(height - radius - 2, n.y));
  });

  // Draw AT connecting lines
  const team1AT = nodes.filter(d => d.team === 1 && d.isAT);
  const team2AT = nodes.filter(d => d.team === 2 && d.isAT);

  [team1AT, team2AT].forEach(atGroup => {
    if (atGroup.length > 1) {
      svg.append("line")
        .attr("class", "at-connect-line")
        .attr("x1", atGroup[0].x).attr("y1", atGroup[0].y)
        .attr("x2", atGroup[1].x).attr("y2", atGroup[1].y);
    }
  });

  // Draw dots
  svg.selectAll(".dot")
    .data(nodes)
    .enter()
    .append("circle")
    .attr("class", d => `dot dot-team-${d.team === 1 ? "one" : "two"} ${d.isAT ? "at-ring" : ""}`)
    .attr("cx", d => d.x)
    .attr("cy", d => d.y)
    .attr("r", radius);
}

export { MmrComparisonBeeswarm };
