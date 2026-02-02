import * as d3 from "d3";
import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Flag, Table } from "semantic-ui-react";

import FormDots from "./FormDots.jsx";
import elf from "./icons/elf.svg";
import human from "./icons/human.svg";
import orc from "./icons/orc.svg";
import random from "./icons/random.svg";
import undead from "./icons/undead.svg";
import { calculateElapsedTime, calculateWinProbability, detectArrangedTeams } from "./utils.jsx";

const getMapImageUrl = mapId => {
  if (!mapId) return null;
  const cleanName = mapId
    .replace(/^\(\d\)/, "")
    .replace(/ /g, "")
    .replace(/'/g, "");
  return `/maps/${cleanName}.png`;
};

// Configurable MMR Chart with multiple layouts
const MmrChartConfigurable = ({ data, layout, atColor, compact, shapeType, petalParams }) => {
  const { teamOneMmrs, teamTwoMmrs, teamOneAT = [], teamTwoAT = [] } = data;
  const svgRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const parent = svgRef.current.parentElement;
    const width = parent.clientWidth;
    const height = parent.clientHeight;

    const teamOneData = teamOneMmrs
      .map((mmr, i) => ({ mmr, atGroupSize: teamOneAT[i] || 0, team: 1, index: i }))
      .filter(d => d.mmr && d.mmr > 0);
    const teamTwoData = teamTwoMmrs
      .map((mmr, i) => ({ mmr, atGroupSize: teamTwoAT[i] || 0, team: 2, index: i }))
      .filter(d => d.mmr && d.mmr > 0);

    const allData = [...teamOneData, ...teamTwoData];
    const allMmrs = allData.map(d => d.mmr);
    const minMmr = Math.min(...allMmrs);
    const maxMmr = Math.max(...allMmrs);

    const dotRadius = compact ? 4 : layout === "strip" ? 6 : 7;
    const padding = dotRadius + 4;

    const color = atColor || "#c9a227";

    if (layout === "vertical") {
      renderVertical(svg, teamOneData, teamTwoData, width, height, minMmr, maxMmr, dotRadius, padding, color);
    } else if (layout === "sideBySide") {
      renderSideBySide(svg, teamOneData, teamTwoData, width, height, minMmr, maxMmr, dotRadius, padding, color, shapeType, petalParams);
    } else if (layout === "horizontal") {
      renderHorizontal(svg, allData, width, height, minMmr, maxMmr, dotRadius, padding, color);
    } else if (layout === "strip") {
      renderStrip(svg, allData, width, height, minMmr, maxMmr, dotRadius, padding, color);
    }
  }, [data, layout, atColor, compact, shapeType, petalParams]);

  // Container size varies by layout
  const containerStyle = {
    width: "100%",
    height: layout === "horizontal" ? "80px" : layout === "strip" ? "50px" : "100%",
  };

  return (
    <div style={containerStyle}>
      <svg ref={svgRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
};

function renderVertical(svg, team1Data, team2Data, width, height, minMmr, maxMmr, radius, padding, atColor) {
  const yScale = d3
    .scaleLinear()
    .domain([minMmr - 50, maxMmr + 50])
    .range([height - padding, padding]);

  const team1X = width * 0.33;
  const team2X = width * 0.67;

  // Center line
  svg
    .append("line")
    .attr("class", "line team-middle")
    .attr("x1", width / 2)
    .attr("y1", 0)
    .attr("x2", width / 2)
    .attr("y2", height);

  // AT lines
  const team1AT = team1Data.filter(d => d.atGroupSize > 0);
  const team2AT = team2Data.filter(d => d.atGroupSize > 0);

  if (team1AT.length > 1) {
    svg
      .append("line")
      .attr("x1", team1X)
      .attr("y1", yScale(team1AT[0].mmr))
      .attr("x2", team1X)
      .attr("y2", yScale(team1AT[1].mmr))
      .attr("stroke", atColor)
      .attr("stroke-width", 4)
      .attr("stroke-opacity", 0.9);
  }
  if (team2AT.length > 1) {
    svg
      .append("line")
      .attr("x1", team2X)
      .attr("y1", yScale(team2AT[0].mmr))
      .attr("x2", team2X)
      .attr("y2", yScale(team2AT[1].mmr))
      .attr("stroke", atColor)
      .attr("stroke-width", 4)
      .attr("stroke-opacity", 0.9);
  }

  // Dots
  team1Data.forEach(d => {
    svg
      .append("circle")
      .attr("cx", team1X)
      .attr("cy", yScale(d.mmr))
      .attr("r", radius)
      .attr("fill", "#4a9eff")
      .attr("stroke", d.atGroupSize > 0 ? atColor : "none")
      .attr("stroke-width", d.atGroupSize > 0 ? 3 : 0);
  });
  team2Data.forEach(d => {
    svg
      .append("circle")
      .attr("cx", team2X)
      .attr("cy", yScale(d.mmr))
      .attr("r", radius)
      .attr("fill", "#ef4444")
      .attr("stroke", d.atGroupSize > 0 ? atColor : "none")
      .attr("stroke-width", d.atGroupSize > 0 ? 3 : 0);
  });

  svg
    .append("text")
    .attr("class", "axistitle")
    .text("MMR")
    .attr("x", width / 2)
    .attr("y", height - 4);
}

function renderSideBySide(svg, team1Data, team2Data, width, height, minMmr, maxMmr, radius, padding, atColor, shapeType, petalParams) {
  const yScale = d3
    .scaleLinear()
    .domain([minMmr - 50, maxMmr + 50])
    .range([height - padding, padding]);

  const team1X = width * 0.3;
  const team2X = width * 0.7;
  const collisionOffset = radius * 2.5;

  // Petal parameters with defaults
  const pLength = petalParams?.length ?? 1.4;
  const pWidth = petalParams?.width ?? 0.7;
  const pOffset = petalParams?.offset ?? 0.3;
  const pRotation = petalParams?.rotation ?? 0;

  // Position dots
  const positionTeam = (data, centerX, isTeam1) => {
    const positioned = [];
    const atGroupCounters = {};

    data.forEach(d => {
      const y = yScale(d.mmr);
      let x = centerX;
      let sliceIndex = 0;

      if (d.atGroupSize > 0) {
        const groupSize = d.atGroupSize;
        if (!atGroupCounters[groupSize]) atGroupCounters[groupSize] = 0;
        sliceIndex = atGroupCounters[groupSize];
        atGroupCounters[groupSize]++;
        if (atGroupCounters[groupSize] >= groupSize) atGroupCounters[groupSize] = 0;
      } else {
        let attempts = 0;
        while (attempts < 5) {
          const collision = positioned.find(p => Math.abs(p.y - y) < radius * 2.2 && Math.abs(p.x - x) < radius * 2.2);
          if (!collision) break;
          attempts++;
          x = isTeam1 ? centerX - collisionOffset * attempts : centerX + collisionOffset * attempts;
        }
      }

      positioned.push({ ...d, x, y, sliceIndex });
    });
    return positioned;
  };

  const team1Pos = positionTeam(team1Data, team1X, true);
  const team2Pos = positionTeam(team2Data, team2X, false);

  // Team spread lines
  if (team1Pos.length > 0) {
    const team1Ys = team1Pos.map(d => d.y).sort((a, b) => a - b);
    svg.append("line")
      .attr("x1", team1X).attr("y1", team1Ys[0])
      .attr("x2", team1X).attr("y2", team1Ys[team1Ys.length - 1])
      .attr("stroke", "#4a9eff").attr("stroke-width", 2).attr("stroke-opacity", 0.4);
  }
  if (team2Pos.length > 0) {
    const team2Ys = team2Pos.map(d => d.y).sort((a, b) => a - b);
    svg.append("line")
      .attr("x1", team2X).attr("y1", team2Ys[0])
      .attr("x2", team2X).attr("y2", team2Ys[team2Ys.length - 1])
      .attr("stroke", "#ef4444").attr("stroke-width", 2).attr("stroke-opacity", 0.4);
  }

  // Center line
  svg.append("line")
    .attr("class", "line team-middle")
    .attr("x1", width / 2).attr("y1", padding)
    .attr("x2", width / 2).attr("y2", height - padding - 10);

  // Shape drawing functions
  const drawShape = (svg, cx, cy, angle, r, fill, groupSize, sliceIndex) => {
    const shape = shapeType || "shuriken";

    switch (shape) {
      case "shuriken": {
        // One circle with area = groupSize circles, split into equal pie slices
        // Area of N circles = N * π * r², so radius = r * √N
        const totalRadius = r * Math.sqrt(groupSize);

        // Pie slice for this player
        const sliceAngle = (2 * Math.PI) / groupSize;
        const gapAngle = 0.5; // Bigger gap between slices

        // Rotate 2-player by 45° for diagonal split
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
          .attr("fill", fill);
        break;
      }

      case "shamrock": {
        // Shamrock: overlapping lobes forming one unified flower shape
        // Scale lobe size with group size so total area feels right
        // More players = bigger lobes to compensate for overlap
        const sizeScale = 0.85 + groupSize * 0.15; // 2p=1.15, 3p=1.3, 4p=1.45
        const lobeRadius = r * sizeScale;
        const lobeOffset = r * 0.6;

        const lobeCx = cx + Math.sin(angle) * lobeOffset;
        const lobeCy = cy - Math.cos(angle) * lobeOffset;

        svg.append("circle")
          .attr("cx", lobeCx)
          .attr("cy", lobeCy)
          .attr("r", lobeRadius)
          .attr("fill", fill);
        break;
      }

      case "clover": {
        // Clover: single elongated petal per player, overlapping at center
        const lobeRadius = r * 0.7;
        const lobeOffset = r * 0.7;

        const lobeCx = cx + Math.sin(angle) * lobeOffset;
        const lobeCy = cy - Math.cos(angle) * lobeOffset;

        // Elongated ellipse pointing outward
        svg.append("ellipse")
          .attr("cx", lobeCx)
          .attr("cy", lobeCy)
          .attr("rx", lobeRadius * 0.7)
          .attr("ry", lobeRadius * 1.2)
          .attr("transform", `rotate(${(angle * 180) / Math.PI}, ${lobeCx}, ${lobeCy})`)
          .attr("fill", fill);
        break;
      }

      case "petal": {
        const petalLength = r * pLength;
        const petalWidth = r * pWidth;
        const offsetFromCenter = r * pOffset;
        const petalCx = cx + Math.sin(angle) * offsetFromCenter;
        const petalCy = cy - Math.cos(angle) * offsetFromCenter;
        const totalRotation = (angle * 180) / Math.PI + pRotation;
        svg.append("ellipse")
          .attr("cx", petalCx).attr("cy", petalCy)
          .attr("rx", petalWidth).attr("ry", petalLength)
          .attr("transform", `rotate(${totalRotation}, ${petalCx}, ${petalCy})`)
          .attr("fill", fill);
        break;
      }

      case "teardrop": {
        // Teardrop: pointed tip outward, rounded base
        const len = r * 1.6;
        const tipX = cx + Math.sin(angle) * len;
        const tipY = cy - Math.cos(angle) * len;
        const baseOffset = r * 0.3;
        const baseCx = cx - Math.sin(angle) * baseOffset;
        const baseCy = cy + Math.cos(angle) * baseOffset;
        const perpX = Math.cos(angle) * r * 0.6;
        const perpY = Math.sin(angle) * r * 0.6;

        const path = `M ${tipX} ${tipY}
          Q ${baseCx + perpX} ${baseCy + perpY}, ${baseCx} ${baseCy}
          Q ${baseCx - perpX} ${baseCy - perpY}, ${tipX} ${tipY}`;
        svg.append("path").attr("d", path).attr("fill", fill);
        break;
      }

      case "chevron": {
        // Chevron/Arrow pointing outward
        const len = r * 1.5;
        const armLen = r * 1.0;
        const armAngle = 0.5; // radians spread

        const tipX = cx + Math.sin(angle) * len;
        const tipY = cy - Math.cos(angle) * len;
        const leftX = cx + Math.sin(angle - armAngle) * armLen;
        const leftY = cy - Math.cos(angle - armAngle) * armLen;
        const rightX = cx + Math.sin(angle + armAngle) * armLen;
        const rightY = cy - Math.cos(angle + armAngle) * armLen;
        const innerLen = r * 0.5;
        const innerX = cx + Math.sin(angle) * innerLen;
        const innerY = cy - Math.cos(angle) * innerLen;

        const path = `M ${tipX} ${tipY} L ${leftX} ${leftY} L ${innerX} ${innerY} L ${rightX} ${rightY} Z`;
        svg.append("path").attr("d", path).attr("fill", fill);
        break;
      }

      case "crescent": {
        // Crescent/Arc shape
        const outerR = r * 1.3;
        const innerR = r * 0.7;
        const arcAngle = Math.PI / groupSize * 0.8; // Arc span based on group size

        const arc = d3.arc()
          .innerRadius(innerR)
          .outerRadius(outerR)
          .startAngle(angle - arcAngle)
          .endAngle(angle + arcAngle);

        svg.append("path")
          .attr("d", arc())
          .attr("transform", `translate(${cx}, ${cy})`)
          .attr("fill", fill);
        break;
      }

      case "triangle": {
        // Rounded triangle / guitar pick
        const len = r * 1.5;
        const baseWidth = r * 0.9;

        const tipX = cx + Math.sin(angle) * len;
        const tipY = cy - Math.cos(angle) * len;
        const leftX = cx + Math.sin(angle - Math.PI * 0.7) * baseWidth;
        const leftY = cy - Math.cos(angle - Math.PI * 0.7) * baseWidth;
        const rightX = cx + Math.sin(angle + Math.PI * 0.7) * baseWidth;
        const rightY = cy - Math.cos(angle + Math.PI * 0.7) * baseWidth;

        // Rounded corners using quadratic curves
        const path = `M ${tipX} ${tipY}
          Q ${(tipX + leftX) / 2 + Math.cos(angle) * r * 0.3} ${(tipY + leftY) / 2 + Math.sin(angle) * r * 0.3}, ${leftX} ${leftY}
          Q ${cx} ${cy}, ${rightX} ${rightY}
          Q ${(tipX + rightX) / 2 - Math.cos(angle) * r * 0.3} ${(tipY + rightY) / 2 - Math.sin(angle) * r * 0.3}, ${tipX} ${tipY}`;
        svg.append("path").attr("d", path).attr("fill", fill);
        break;
      }

      case "star": {
        // Sharp star point radiating outward
        const outerLen = r * 1.8;
        const innerLen = r * 0.4;
        const spikeWidth = Math.PI / (groupSize * 3);

        const tipX = cx + Math.sin(angle) * outerLen;
        const tipY = cy - Math.cos(angle) * outerLen;
        const leftX = cx + Math.sin(angle - spikeWidth) * innerLen;
        const leftY = cy - Math.cos(angle - spikeWidth) * innerLen;
        const rightX = cx + Math.sin(angle + spikeWidth) * innerLen;
        const rightY = cy - Math.cos(angle + spikeWidth) * innerLen;

        const path = `M ${tipX} ${tipY} L ${leftX} ${leftY} L ${cx} ${cy} L ${rightX} ${rightY} Z`;
        svg.append("path").attr("d", path).attr("fill", fill);
        break;
      }

      case "pacman": {
        // Pac-man style pie wedge
        const pieRadius = r * 1.2;
        const gapAngle = 0.15; // Gap between slices
        const sliceAngle = (2 * Math.PI) / groupSize;
        const startAngle = angle - sliceAngle / 2 + gapAngle / 2;
        const endAngle = angle + sliceAngle / 2 - gapAngle / 2;

        const arc = d3.arc()
          .innerRadius(0)
          .outerRadius(pieRadius)
          .startAngle(startAngle)
          .endAngle(endAngle)
          .cornerRadius(2);

        svg.append("path")
          .attr("d", arc())
          .attr("transform", `translate(${cx}, ${cy})`)
          .attr("fill", fill);
        break;
      }

      default:
        svg.append("circle").attr("cx", cx).attr("cy", cy).attr("r", radius).attr("fill", fill);
    }
  };

  // Draw team 1
  team1Pos.forEach(d => {
    if (d.atGroupSize > 0) {
      const sliceAngle = (2 * Math.PI) / d.atGroupSize;
      const angle = d.sliceIndex * sliceAngle + sliceAngle / 2;
      drawShape(svg, d.x, d.y, angle, radius, "#4a9eff", d.atGroupSize, d.sliceIndex);
    } else {
      svg.append("circle").attr("cx", d.x).attr("cy", d.y).attr("r", radius).attr("fill", "#4a9eff");
    }
  });

  // Draw team 2
  team2Pos.forEach(d => {
    if (d.atGroupSize > 0) {
      const sliceAngle = (2 * Math.PI) / d.atGroupSize;
      const angle = d.sliceIndex * sliceAngle + sliceAngle / 2;
      drawShape(svg, d.x, d.y, angle, radius, "#ef4444", d.atGroupSize, d.sliceIndex);
    } else {
      svg.append("circle").attr("cx", d.x).attr("cy", d.y).attr("r", radius).attr("fill", "#ef4444");
    }
  });
}

function renderHorizontal(svg, allData, width, height, minMmr, maxMmr, radius, padding, atColor) {
  const xScale = d3
    .scaleLinear()
    .domain([minMmr - 30, maxMmr + 30])
    .range([padding, width - padding]);

  const centerY = height / 2;

  // Beeswarm
  const positioned = [];
  allData.forEach(d => {
    const x = xScale(d.mmr);
    let y = centerY;
    let attempts = 0;
    while (attempts < 10) {
      const collision = positioned.find(p => Math.sqrt((p.x - x) ** 2 + (p.y - y) ** 2) < radius * 2.2);
      if (!collision) break;
      y = centerY + (attempts % 2 === 0 ? 1 : -1) * Math.ceil(attempts / 2) * (radius * 2);
      attempts++;
    }
    positioned.push({ ...d, x, y });
  });

  // AT lines
  const team1AT = positioned.filter(d => d.team === 1 && d.atGroupSize > 0);
  const team2AT = positioned.filter(d => d.team === 2 && d.atGroupSize > 0);

  [team1AT, team2AT].forEach(atGroup => {
    if (atGroup.length > 1) {
      svg
        .append("line")
        .attr("x1", atGroup[0].x)
        .attr("y1", atGroup[0].y)
        .attr("x2", atGroup[1].x)
        .attr("y2", atGroup[1].y)
        .attr("stroke", atColor)
        .attr("stroke-width", 4)
        .attr("stroke-opacity", 0.9);
    }
  });

  // Dots
  positioned.forEach(d => {
    svg
      .append("circle")
      .attr("cx", d.x)
      .attr("cy", d.y)
      .attr("r", radius)
      .attr("fill", d.team === 1 ? "#4a9eff" : "#ef4444")
      .attr("stroke", d.atGroupSize > 0 ? atColor : "none")
      .attr("stroke-width", d.atGroupSize > 0 ? 3 : 0);
  });

  // Axis labels
  svg
    .append("text")
    .attr("x", padding)
    .attr("y", height - 4)
    .attr("fill", "#666")
    .attr("font-size", "9px")
    .text(minMmr);
  svg
    .append("text")
    .attr("x", width - padding)
    .attr("y", height - 4)
    .attr("fill", "#666")
    .attr("font-size", "9px")
    .attr("text-anchor", "end")
    .text(maxMmr);
}

function renderStrip(svg, allData, width, height, minMmr, maxMmr, radius, padding, atColor) {
  const xScale = d3
    .scaleLinear()
    .domain([minMmr - 30, maxMmr + 30])
    .range([padding, width - padding]);

  const centerY = height / 2;

  // Force-based beeswarm
  const nodes = allData.map(d => ({
    ...d,
    x: xScale(d.mmr),
    targetX: xScale(d.mmr),
    y: centerY,
  }));

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
      nodes[i].x += (nodes[i].targetX - nodes[i].x) * 0.1;
      nodes[i].y += (centerY - nodes[i].y) * 0.3;
    }
  }

  nodes.forEach(n => {
    n.y = Math.max(radius + 2, Math.min(height - radius - 2, n.y));
  });

  // AT lines
  const team1AT = nodes.filter(d => d.team === 1 && d.atGroupSize > 0);
  const team2AT = nodes.filter(d => d.team === 2 && d.atGroupSize > 0);

  [team1AT, team2AT].forEach(atGroup => {
    if (atGroup.length > 1) {
      svg
        .append("line")
        .attr("x1", atGroup[0].x)
        .attr("y1", atGroup[0].y)
        .attr("x2", atGroup[1].x)
        .attr("y2", atGroup[1].y)
        .attr("stroke", atColor)
        .attr("stroke-width", 3)
        .attr("stroke-opacity", 0.9);
    }
  });

  // Dots
  nodes.forEach(d => {
    svg
      .append("circle")
      .attr("cx", d.x)
      .attr("cy", d.y)
      .attr("r", radius)
      .attr("fill", d.team === 1 ? "#4a9eff" : "#ef4444")
      .attr("stroke", d.atGroupSize > 0 ? atColor : "none")
      .attr("stroke-width", d.atGroupSize > 0 ? 2 : 0);
  });
}

// Main Game component variant for design testing
const GameDesignVariant = ({
  playerData: rawPlayerData,
  metaData,
  profilePics,
  playerCountries,
  sessionData,
  compact,
  initialATGroups,
  mmrLayout = "vertical",
  atColor,
  shapeType = "shuriken",
  petalParams,
}) => {
  const [atGroups, setAtGroups] = useState(initialATGroups || {});

  const raceMapping = { 8: undead, 0: random, 4: elf, 2: orc, 1: human };
  const playerData = [...rawPlayerData.slice(0, 4).reverse(), ...rawPlayerData.slice(4)];

  useEffect(() => {
    if (initialATGroups) return;
    const detect = async () => {
      const groups = await detectArrangedTeams(rawPlayerData);
      setAtGroups(groups);
    };
    detect();
  }, [rawPlayerData, initialATGroups]);

  const isPlayerAT = battleTag => battleTag.toLowerCase() in atGroups;
  const getATPartners = battleTag => atGroups[battleTag.toLowerCase()] || [];
  // Returns AT group size: 0 for non-AT, 2/3/4 for AT groups
  const getATGroupSize = battleTag => {
    const partners = getATPartners(battleTag);
    return partners.length > 0 ? partners.length + 1 : 0;
  };

  const hasATPartnerRight = playerIndex => {
    if (playerIndex >= playerData.length - 1) return false;
    const current = playerData[playerIndex];
    const next = playerData[playerIndex + 1];
    const sameTeam = (playerIndex < 4 && playerIndex + 1 < 4) || (playerIndex >= 4 && playerIndex + 1 < 8);
    if (!sameTeam) return false;
    const partners = getATPartners(current.battleTag);
    return partners.some(p => p.toLowerCase() === next.battleTag.toLowerCase());
  };

  const renderPlayerCell = (player, teamClassName, playerIndex) => {
    const { oldMmr } = player;
    const flagPosition = teamClassName === "team-0" ? { top: 0, right: 0 } : { top: 0, left: 0 };
    const playerSession = sessionData?.[player.battleTag];
    const sessionDelta = playerSession?.mmrChange || 0;
    const playerIsAT = isPlayerAT(player.battleTag);
    const showChain = hasATPartnerRight(playerIndex);

    return (
      <Table.HeaderCell
        key={player.battleTag}
        style={{ position: "relative", overflow: "visible" }}
        className={playerIsAT ? "is-at" : ""}
      >
        <div className={`playerDiv ${compact ? "compact" : ""} ${playerIsAT ? "is-at" : ""}`}>
          <div style={{ position: "relative", display: "inline-block" }}>
            {profilePics[player.battleTag] ? (
              <img
                src={profilePics[player.battleTag]}
                alt="Player Profile Pic"
                className={`profile-pic ${playerIsAT ? "at" : ""}`}
              />
            ) : null}
            {playerCountries[player.battleTag] ? (
              <Flag
                name={playerCountries[player.battleTag].toLowerCase()}
                style={{ position: "absolute", ...flagPosition }}
                className={`${teamClassName} flag`}
              />
            ) : null}
            <img src={raceMapping[player.race]} alt="" className="race-overlay" />
          </div>

          <div>
            <Link to={`/player/${player.battleTag.replace("#", "%23")}`}>
              <h2>{player.name}</h2>
            </Link>
          </div>

          <div className="player-mmr-line">
            {oldMmr && oldMmr > 0 ? (
              <>
                <span className="mmr-value">{oldMmr}</span>
                <span className="mmr-label"> MMR</span>
              </>
            ) : (
              <span className="mmr-label-muted">Unranked</span>
            )}
          </div>

          <div className="session-info">
            {playerSession && playerSession.form && playerSession.form.length > 0 ? (
              <>
                <span className="session-record">
                  {playerSession.wins}W-{playerSession.losses}L
                </span>
                {sessionDelta !== 0 && (
                  <span className={`session-delta ${sessionDelta >= 0 ? "positive" : "negative"}`}>
                    {sessionDelta >= 0 ? " +" : " "}
                    {sessionDelta}
                  </span>
                )}
              </>
            ) : null}
          </div>

          <div className="form-dots-wrapper">
            <FormDots form={playerSession?.form} size="small" />
          </div>
        </div>
        {showChain && <div className="at-connector" />}
      </Table.HeaderCell>
    );
  };

  const team1AvgMmr = Math.round(
    playerData
      .slice(0, 4)
      .map(d => d.oldMmr)
      .reduce((a, b) => a + b, 0) / 4
  );
  const team2AvgMmr = Math.round(
    playerData
      .slice(4)
      .map(d => d.oldMmr)
      .reduce((a, b) => a + b, 0) / 4
  );
  const team1WinProb = calculateWinProbability(team1AvgMmr, team2AvgMmr);
  const team2WinProb = 100 - team1WinProb;

  // Horizontal layouts need different center column structure
  const isHorizontalLayout = mmrLayout === "horizontal" || mmrLayout === "strip";

  return (
    <div className="Game">
      <Table inverted size="small" basic>
        <Table.Header>
          <Table.Row>
            <th> </th>
            <th> </th>
            <th> </th>
            <th className="team-0 team-header">
              <div>
                <h2 className="team-name">TEAM 1</h2>
                <div className="team-mmr-line">
                  <span className="mmr-value">{team1AvgMmr}</span>
                  <span className="mmr-label"> MMR</span>
                  <span className="win-prob">({team1WinProb}%)</span>
                </div>
                <div className="image-container">
                  {playerData.slice(0, 4).map((d, i) => (
                    <img key={i} src={raceMapping[d.race]} alt={d.race} className="race teamHeaderRace" />
                  ))}
                </div>
              </div>
            </th>
            <th className="th-center" style={{ position: "relative" }}>
              <h2>VS</h2>
            </th>
            <th className="team-1 team-header">
              <div>
                <h2 className="team-name">TEAM 2</h2>
                <div className="team-mmr-line">
                  <span className="mmr-value">{team2AvgMmr}</span>
                  <span className="mmr-label"> MMR</span>
                  <span className="win-prob">({team2WinProb}%)</span>
                </div>
                <div className="image-container">
                  {playerData.slice(4).map((d, i) => (
                    <img key={i} src={raceMapping[d.race]} alt={d.race} className="race teamHeaderRace" />
                  ))}
                </div>
              </div>
            </th>
            <th> </th>
            <th> </th>
            <th> </th>
          </Table.Row>
        </Table.Header>

        {/* Horizontal layouts: chart spans full width above players */}
        {isHorizontalLayout && (
          <Table.Header>
            <Table.Row>
              <th colSpan={9} style={{ padding: "8px 16px" }}>
                <div style={{ maxWidth: "800px", margin: "0 auto" }}>
                  <MmrChartConfigurable
                    data={{
                      teamOneMmrs: playerData.slice(0, 4).map(d => d.oldMmr),
                      teamTwoMmrs: playerData.slice(4).map(d => d.oldMmr),
                      teamOneAT: playerData.slice(0, 4).map(d => getATGroupSize(d.battleTag)),
                      teamTwoAT: playerData.slice(4).map(d => getATGroupSize(d.battleTag)),
                    }}
                    layout={mmrLayout}
                    atColor={atColor}
                    compact={compact}
                    shapeType={shapeType}
                    petalParams={petalParams}
                  />
                </div>
              </th>
            </Table.Row>
          </Table.Header>
        )}

        <Table.Header>
          <Table.Row>
            {playerData.map((playerScore, index) => {
              const teamIndex = index < 4 ? 0 : 1;
              const teamClassName = `team-${teamIndex}`;
              return (
                <React.Fragment key={`player-${index}`}>
                  {renderPlayerCell(playerScore, teamClassName, index)}
                  {index === 3 && !isHorizontalLayout && (
                    <th className="th-center" style={{ position: "relative", verticalAlign: "top" }}>
                      <div className="mmr-chart-container">
                        <MmrChartConfigurable
                          data={{
                            teamOneMmrs: playerData.slice(0, 4).map(d => d.oldMmr),
                            teamTwoMmrs: playerData.slice(4).map(d => d.oldMmr),
                            teamOneAT: playerData.slice(0, 4).map(d => getATGroupSize(d.battleTag)),
                            teamTwoAT: playerData.slice(4).map(d => getATGroupSize(d.battleTag)),
                          }}
                          layout={mmrLayout}
                          atColor={atColor}
                          compact={compact}
                          shapeType={shapeType}
                          petalParams={petalParams}
                        />
                      </div>
                    </th>
                  )}
                  {index === 3 && isHorizontalLayout && (
                    <th className="th-center" style={{ position: "relative", verticalAlign: "top" }}>
                      {/* Empty center column for horizontal layouts */}
                    </th>
                  )}
                </React.Fragment>
              );
            })}
          </Table.Row>
        </Table.Header>

        <Table.Body>
          <Table.Row className="meta">
            <td colSpan={9}>
              <div className="meta-bar">
                <div className="meta-map-centered">
                  <img
                    src={getMapImageUrl(metaData.mapId)}
                    alt="map"
                    className="meta-map-img"
                    onError={e => {
                      e.target.style.display = "none";
                    }}
                  />
                  <div className="meta-map-info">
                    <span className="meta-map-name">{metaData.mapName}</span>
                    <span className="meta-details">
                      {metaData.server} ·{" "}
                      {metaData.gameLength === "0:00" ? calculateElapsedTime(metaData.startTime) : metaData.gameLength}{" "}
                      mins
                      {metaData.gameLength === "0:00" && <span className="live-dot"></span>}
                    </span>
                  </div>
                </div>
              </div>
            </td>
          </Table.Row>
        </Table.Body>
      </Table>
    </div>
  );
};

export default GameDesignVariant;
