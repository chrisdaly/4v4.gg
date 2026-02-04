import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

// atStyle options: "combined" (default), "yin-yang", "bracket", "pill", "chain", "glow", "pie"
// pieConfig allows tuning: { combinedGap (px), areaMultiplier (1.0-2.0) }
const MmrComparison = ({ data, compact = false, atStyle = "combined", pieConfig = {} }) => {
  const { teamOneMmrs, teamTwoMmrs, teamOneAT = [], teamTwoAT = [] } = data;
  const svgRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current) return;

    // Create data with AT group size info, filter out unranked players
    const teamOneData = teamOneMmrs
      .map((mmr, i) => ({ mmr, atGroupSize: teamOneAT[i] || 0, index: i, team: 1 }))
      .filter(d => d.mmr && d.mmr > 0);
    const teamTwoData = teamTwoMmrs
      .map((mmr, i) => ({ mmr, atGroupSize: teamTwoAT[i] || 0, index: i, team: 2 }))
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
    const dotRadius = compact ? 4 : 5;
    const shurikenRadius = compact ? 6 : 8; // Larger for AT visibility

    // Calculate combined circle info for AT groups (for collision detection)
    const getCombinedCircleInfo = (teamData) => {
      const groups = {};
      teamData.forEach(d => {
        if (d.atGroupSize > 0) {
          const key = d.atGroupSize;
          if (!groups[key]) groups[key] = [];
          groups[key].push(d);
        }
      });

      const circles = [];
      Object.values(groups).forEach(players => {
        if (players.length >= 2) {
          const centerY = players.reduce((sum, p) => sum + yScale(p.mmr), 0) / players.length;
          const areaMultiplier = pieConfig.areaMultiplier ?? 1.6;
          const combinedRadius = dotRadius * Math.sqrt(players.length) * Math.sqrt(areaMultiplier);
          circles.push({ centerY, radius: combinedRadius });
        }
      });
      return circles;
    };

    // Beeswarm collision detection
    // Prioritizes: 1) AT groups (stay at center), 2) Highest MMR players
    // Non-priority dots offset AWAY from center line (team1 goes left, team2 goes right)
    const applyBeeswarm = (teamData, baseX, isTeamOne) => {
      const minDist = dotRadius * 2.5; // Minimum distance between dot centers

      // Get combined circles for this team (for collision with solo players)
      const combinedCircles = atStyle === "combined" ? getCombinedCircleInfo(teamData) : [];

      // Sort: AT players first, then by MMR (highest first)
      const sortedData = [...teamData].sort((a, b) => {
        // AT groups always come first
        if (a.atGroupSize > 0 && b.atGroupSize === 0) return -1;
        if (a.atGroupSize === 0 && b.atGroupSize > 0) return 1;
        // Then by MMR (highest first)
        return b.mmr - a.mmr;
      });

      const positioned = [];
      // Direction away from center: team1 goes left (-1), team2 goes right (+1)
      const offsetDirection = isTeamOne ? -1 : 1;

      sortedData.forEach(d => {
        const y = yScale(d.mmr);
        let x = baseX;

        // AT players always stay at center X
        if (d.atGroupSize > 0) {
          positioned.push({ ...d, x, y });
          return;
        }

        // Solo players: check for collisions and offset on X-axis only
        let attempts = 0;
        while (attempts < 10) {
          // Check collision with other solo players already positioned
          const soloCollision = positioned.find(p => {
            if (p.atGroupSize > 0) return false;
            const dist = Math.sqrt((p.x - x) ** 2 + (p.y - y) ** 2);
            return dist < minDist;
          });

          // Check collision with combined circles (AT groups)
          const combinedCollision = combinedCircles.find(c => {
            // Check if this dot would overlap with the combined circle
            const yDist = Math.abs(y - c.centerY);
            const xDist = Math.abs(x - baseX);
            // Combined circle is at baseX, so check if dot is within its radius
            const dist = Math.sqrt(xDist ** 2 + yDist ** 2);
            return dist < (c.radius + dotRadius + 2); // Add small buffer
          });

          if (!soloCollision && !combinedCollision) break;

          // Offset away from center line (X-axis only, no Y movement)
          attempts++;
          x = baseX + offsetDirection * attempts * 8;
        }

        positioned.push({ ...d, x, y });
      });

      return positioned;
    };

    const teamOnePositioned = applyBeeswarm(teamOneData, teamOneX, true);
    const teamTwoPositioned = applyBeeswarm(teamTwoData, teamTwoX, false);

    // Draw team spread lines connecting all dots at their actual positions
    // For AT groups (combined circles), line stops at edge of circle
    const drawSpreadLine = (positionedData, teamClass) => {
      // Sort by Y position (MMR) to draw lines top to bottom
      const sorted = [...positionedData].sort((a, b) => a.y - b.y);

      // Get combined circle info for this team
      const combinedCircles = atStyle === "combined" ? getCombinedCircleInfo(positionedData) : [];
      const areaMultiplier = pieConfig.areaMultiplier ?? 1.6;

      // Build line points, adjusting for combined circle edges
      const linePoints = [];

      sorted.forEach((d, i) => {
        if (d.atGroupSize > 0 && atStyle === "combined") {
          // This is an AT player - find the combined circle
          const atPlayers = sorted.filter(p => p.atGroupSize === d.atGroupSize);
          if (atPlayers.length >= 2) {
            const centerY = atPlayers.reduce((sum, p) => sum + p.y, 0) / atPlayers.length;
            const combinedRadius = dotRadius * Math.sqrt(atPlayers.length) * Math.sqrt(areaMultiplier);

            // Only add edge points once per AT group (first and last player in sorted order)
            const atIndices = sorted.map((p, idx) => p.atGroupSize === d.atGroupSize ? idx : -1).filter(idx => idx >= 0);
            const isFirstAT = i === atIndices[0];
            const isLastAT = i === atIndices[atIndices.length - 1];

            if (isFirstAT) {
              // Add top edge of circle
              linePoints.push({ x: d.x, y: centerY - combinedRadius });
            }
            if (isLastAT) {
              // Add bottom edge of circle
              linePoints.push({ x: d.x, y: centerY + combinedRadius });
            }
          }
        } else {
          // Solo player - add their position
          linePoints.push({ x: d.x, y: d.y });
        }
      });

      if (linePoints.length > 1) {
        const line = d3.line().x((d) => d.x).y((d) => d.y);
        svg.append("path").datum(linePoints).attr("class", `line ${teamClass}`).attr("d", line);
      }
    };

    drawSpreadLine(teamOnePositioned, "team-one");
    drawSpreadLine(teamTwoPositioned, "team-two");

    // Track AT group slice indices for yin-yang rendering
    const atGroupCounters = { team1: {}, team2: {} };

    // Colors from design tokens
    const goldColor = "#fcdb33";

    // Group AT players by their group size for each team
    const groupATPlayers = (teamData, teamKey) => {
      const groups = {};
      teamData.forEach(d => {
        if (d.atGroupSize > 0) {
          const key = `${teamKey}-${d.atGroupSize}`;
          if (!groups[key]) groups[key] = [];
          groups[key].push(d);
        }
      });
      return groups;
    };

    const teamOneATGroups = groupATPlayers(teamOnePositioned, 'team1');
    const teamTwoATGroups = groupATPlayers(teamTwoPositioned, 'team2');

    // Helper to draw bracket-style AT indicator
    const drawBracket = (players, baseX, teamClass, isLeft) => {
      if (players.length < 2) return;

      const yValues = players.map(p => p.y).sort((a, b) => a - b);
      const minY = yValues[0];
      const maxY = yValues[yValues.length - 1];
      const bracketOffset = isLeft ? -16 : 16;
      const bracketX = baseX + bracketOffset;
      const tickSize = 6;
      const labelOffset = isLeft ? -8 : 8;

      // Draw bracket line
      svg.append("line")
        .attr("x1", bracketX)
        .attr("y1", minY - 4)
        .attr("x2", bracketX)
        .attr("y2", maxY + 4)
        .attr("stroke", goldColor)
        .attr("stroke-width", 2)
        .attr("opacity", 0.9);

      // Top tick
      svg.append("line")
        .attr("x1", bracketX)
        .attr("y1", minY - 4)
        .attr("x2", bracketX + (isLeft ? tickSize : -tickSize))
        .attr("y2", minY - 4)
        .attr("stroke", goldColor)
        .attr("stroke-width", 2)
        .attr("opacity", 0.9);

      // Bottom tick
      svg.append("line")
        .attr("x1", bracketX)
        .attr("y1", maxY + 4)
        .attr("x2", bracketX + (isLeft ? tickSize : -tickSize))
        .attr("y2", maxY + 4)
        .attr("stroke", goldColor)
        .attr("stroke-width", 2)
        .attr("opacity", 0.9);

      // Stack size label
      svg.append("text")
        .attr("x", bracketX + labelOffset)
        .attr("y", (minY + maxY) / 2)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("font-family", "var(--font-mono)")
        .attr("font-size", compact ? 9 : 10)
        .attr("fill", goldColor)
        .attr("font-weight", "bold")
        .text(players.length);
    };

    // Helper to draw pill/capsule around AT group
    const drawPill = (players, baseX, teamClass) => {
      if (players.length < 2) return;

      const yValues = players.map(p => p.y).sort((a, b) => a - b);
      const minY = yValues[0];
      const maxY = yValues[yValues.length - 1];
      const padding = 12;
      const pillWidth = 24;

      // Draw pill background
      svg.append("rect")
        .attr("x", baseX - pillWidth / 2)
        .attr("y", minY - padding)
        .attr("width", pillWidth)
        .attr("height", maxY - minY + padding * 2)
        .attr("rx", pillWidth / 2)
        .attr("ry", pillWidth / 2)
        .attr("fill", "none")
        .attr("stroke", goldColor)
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "4,2")
        .attr("opacity", 0.7);

      // Stack size label at top
      svg.append("text")
        .attr("x", baseX)
        .attr("y", minY - padding - 6)
        .attr("text-anchor", "middle")
        .attr("font-family", "var(--font-mono)")
        .attr("font-size", compact ? 9 : 10)
        .attr("fill", goldColor)
        .attr("font-weight", "bold")
        .text(players.length);
    };

    // Helper to draw chain links between AT players
    const drawChain = (players, baseX, teamClass) => {
      if (players.length < 2) return;

      const sortedPlayers = [...players].sort((a, b) => a.y - b.y);

      for (let i = 0; i < sortedPlayers.length - 1; i++) {
        const y1 = sortedPlayers[i].y;
        const y2 = sortedPlayers[i + 1].y;
        const midY = (y1 + y2) / 2;
        const linkHeight = Math.min(12, (y2 - y1) / 2 - 4);

        // Draw chain link (oval)
        svg.append("ellipse")
          .attr("cx", baseX)
          .attr("cy", midY)
          .attr("rx", 4)
          .attr("ry", linkHeight)
          .attr("fill", "none")
          .attr("stroke", goldColor)
          .attr("stroke-width", 2)
          .attr("opacity", 0.8);
      }

      // Stack size label
      const minY = sortedPlayers[0].y;
      svg.append("text")
        .attr("x", baseX + 14)
        .attr("y", minY)
        .attr("text-anchor", "start")
        .attr("dominant-baseline", "middle")
        .attr("font-family", "var(--font-mono)")
        .attr("font-size", compact ? 9 : 10)
        .attr("fill", goldColor)
        .attr("font-weight", "bold")
        .text(players.length);
    };

    // Helper to draw glow region behind AT players
    const drawGlow = (players, baseX, teamClass) => {
      if (players.length < 2) return;

      const yValues = players.map(p => p.y).sort((a, b) => a - b);
      const minY = yValues[0];
      const maxY = yValues[yValues.length - 1];
      const glowWidth = 32;
      const padding = 16;

      // Create gradient
      const gradientId = `glow-${teamClass}-${players.length}-${Math.random().toString(36).substr(2, 5)}`;
      const gradient = svg.append("defs")
        .append("linearGradient")
        .attr("id", gradientId)
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "100%")
        .attr("y2", "0%");

      gradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", goldColor)
        .attr("stop-opacity", 0);
      gradient.append("stop")
        .attr("offset", "50%")
        .attr("stop-color", goldColor)
        .attr("stop-opacity", 0.15);
      gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", goldColor)
        .attr("stop-opacity", 0);

      // Draw glow rectangle
      svg.append("rect")
        .attr("x", baseX - glowWidth / 2)
        .attr("y", minY - padding)
        .attr("width", glowWidth)
        .attr("height", maxY - minY + padding * 2)
        .attr("fill", `url(#${gradientId})`)
        .attr("rx", 4);

      // Stack size label
      svg.append("text")
        .attr("x", baseX)
        .attr("y", minY - padding - 6)
        .attr("text-anchor", "middle")
        .attr("font-family", "var(--font-mono)")
        .attr("font-size", compact ? 9 : 10)
        .attr("fill", goldColor)
        .attr("font-weight", "bold")
        .text(players.length);
    };

    // Helper to draw combined circle for AT group
    // Area of x circles combined: new radius = baseRadius * sqrt(x)
    // Split into n sections with transparent straight line gaps using SVG mask
    const drawCombinedCircle = (players, baseX, teamClass) => {
      if (players.length < 2) return;

      const groupSize = players.length;
      const centerY = players.reduce((sum, p) => sum + p.y, 0) / players.length;

      // Combined radius with optional area multiplier
      const baseRadius = dotRadius;
      const areaMultiplier = pieConfig.areaMultiplier ?? 1.6;
      const combinedRadius = baseRadius * Math.sqrt(groupSize) * Math.sqrt(areaMultiplier);

      // Gap width in pixels (straight line gap)
      const gapWidth = pieConfig.combinedGap ?? 5;

      const sliceAngle = (2 * Math.PI) / groupSize;
      const baseRotation = -Math.PI / 2 + Math.PI / 4; // Start from top, rotated 45 degrees

      // Create unique mask ID for this group
      const maskId = `mask-${teamClass}-${groupSize}-${Math.random().toString(36).substr(2, 5)}`;

      // Create mask: white circle with black gap lines (black = transparent)
      const mask = svg.append("defs")
        .append("mask")
        .attr("id", maskId);

      // White circle (fully visible)
      mask.append("circle")
        .attr("cx", baseX)
        .attr("cy", centerY)
        .attr("r", combinedRadius)
        .attr("fill", "white");

      // Black lines for gaps (will be transparent)
      for (let i = 0; i < groupSize; i++) {
        const angle = i * sliceAngle + baseRotation;
        const x2 = baseX + Math.cos(angle) * (combinedRadius + 1);
        const y2 = centerY + Math.sin(angle) * (combinedRadius + 1);

        mask.append("line")
          .attr("x1", baseX)
          .attr("y1", centerY)
          .attr("x2", x2)
          .attr("y2", y2)
          .attr("stroke", "black")
          .attr("stroke-width", gapWidth);
      }

      // Draw the full circle with the mask applied
      svg.append("circle")
        .attr("cx", baseX)
        .attr("cy", centerY)
        .attr("r", combinedRadius)
        .attr("class", `dot ${teamClass}`)
        .attr("mask", `url(#${maskId})`);
    };

    // Helper to draw unified pie for AT group - all slices at center position
    const drawUnifiedPie = (players, baseX, teamClass) => {
      if (players.length < 2) return;

      const groupSize = players.length;

      // Calculate center Y (average of all player Y positions)
      const centerY = players.reduce((sum, p) => sum + p.y, 0) / players.length;

      // Use pieConfig or defaults
      const configRadius = pieConfig.radius ?? (shurikenRadius + (groupSize - 2) * 1.5);
      const gapAngle = pieConfig.gapAngle ?? 0.5;
      const innerRadius = pieConfig.innerRadius ?? 0;
      const showRing = pieConfig.showRing ?? false;
      const showLines = pieConfig.showLines ?? false;

      // Draw optional ring
      if (showRing) {
        svg.append("circle")
          .attr("cx", baseX)
          .attr("cy", centerY)
          .attr("r", configRadius + 2)
          .attr("fill", "none")
          .attr("stroke", goldColor)
          .attr("stroke-width", 2)
          .attr("opacity", 0.9);
      }

      // Draw pie slices with gaps
      const sliceAngle = (2 * Math.PI) / groupSize;
      const baseRotation = -Math.PI / 2; // Start from top

      for (let i = 0; i < groupSize; i++) {
        const startAngle = i * sliceAngle + gapAngle / 2 + baseRotation;
        const endAngle = (i + 1) * sliceAngle - gapAngle / 2 + baseRotation;

        const arc = d3.arc()
          .innerRadius(innerRadius)
          .outerRadius(configRadius)
          .startAngle(startAngle + Math.PI / 2)
          .endAngle(endAngle + Math.PI / 2);

        svg.append("path")
          .attr("d", arc())
          .attr("transform", `translate(${baseX}, ${centerY})`)
          .attr("class", `dot ${teamClass}`);
      }

      // Draw connecting lines from pie to each player's actual position
      if (showLines) {
        players.forEach(p => {
          if (Math.abs(p.y - centerY) > configRadius + 4) {
            svg.append("line")
              .attr("x1", baseX)
              .attr("y1", p.y > centerY ? centerY + configRadius + 2 : centerY - configRadius - 2)
              .attr("x2", baseX)
              .attr("y2", p.y > centerY ? p.y - dotRadius - 2 : p.y + dotRadius + 2)
              .attr("stroke", goldColor)
              .attr("stroke-width", 1)
              .attr("stroke-dasharray", "2,2")
              .attr("opacity", 0.5);
          }
        });
      }
    };

    // Helper to draw arcs at each player's actual position (like 2AT half-circles)
    const drawArcsAtPosition = (players, baseX, teamClass, isLeftTeam) => {
      if (players.length < 2) return;

      const groupSize = players.length;
      const sortedPlayers = [...players].sort((a, b) => a.y - b.y);

      // Use pieConfig or defaults
      const configRadius = pieConfig.radius ?? 8;
      const innerRadius = pieConfig.innerRadius ?? 0;
      const showLines = pieConfig.showLines ?? false;

      // Each player gets an arc portion (half for 2, third for 3, quarter for 4)
      const sliceAngle = Math.PI / groupSize; // Half circle divided by group size

      sortedPlayers.forEach((p, i) => {
        // For left team: arcs face right (toward center)
        // For right team: arcs face left (toward center)
        const baseRotation = isLeftTeam ? -Math.PI / 2 : Math.PI / 2;
        const startAngle = baseRotation - (groupSize * sliceAngle / 2) + (i * sliceAngle);
        const endAngle = startAngle + sliceAngle;

        const arc = d3.arc()
          .innerRadius(innerRadius)
          .outerRadius(configRadius)
          .startAngle(startAngle + Math.PI / 2)
          .endAngle(endAngle + Math.PI / 2);

        svg.append("path")
          .attr("d", arc())
          .attr("transform", `translate(${baseX}, ${p.y})`)
          .attr("class", `dot ${teamClass}`);
      });

      // Draw connecting lines between AT players
      if (showLines && sortedPlayers.length > 1) {
        for (let i = 0; i < sortedPlayers.length - 1; i++) {
          svg.append("line")
            .attr("x1", baseX)
            .attr("y1", sortedPlayers[i].y + configRadius)
            .attr("x2", baseX)
            .attr("y2", sortedPlayers[i + 1].y - configRadius)
            .attr("stroke", goldColor)
            .attr("stroke-width", 1.5)
            .attr("stroke-dasharray", "3,2")
            .attr("opacity", 0.6);
        }
      }
    };

    // Legacy yin-yang for backwards compatibility (individual slices at each player position)
    const drawYinYang = (cx, cy, groupSize, sliceIndex, teamClass) => {
      const radius = shurikenRadius;

      // Draw gold ring for AT indicator (only once per position)
      if (sliceIndex === 0) {
        svg.append("circle")
          .attr("cx", cx)
          .attr("cy", cy)
          .attr("r", radius + 1.5)
          .attr("fill", "none")
          .attr("stroke", goldColor)
          .attr("stroke-width", 1.5)
          .attr("opacity", 0.8);
      }

      // For 2-stack: true yin-yang S-curve
      if (groupSize === 2) {
        const halfRadius = radius / 2;

        if (sliceIndex === 0) {
          // Left half with S-curve: top bulge out, bottom bulge in
          const path = d3.path();
          // Start at top
          path.moveTo(cx, cy - radius);
          // Outer arc on left (top half of circle)
          path.arc(cx, cy, radius, -Math.PI / 2, Math.PI / 2, false);
          // Small arc curving inward (bottom bulge)
          path.arc(cx, cy + halfRadius, halfRadius, Math.PI / 2, -Math.PI / 2, false);
          // Small arc curving outward (top bulge)
          path.arc(cx, cy - halfRadius, halfRadius, Math.PI / 2, -Math.PI / 2, true);
          path.closePath();

          svg.append("path")
            .attr("d", path.toString())
            .attr("class", `dot ${teamClass}`);
        } else {
          // Right half: mirror of left
          const path = d3.path();
          path.moveTo(cx, cy - radius);
          // Outer arc on right
          path.arc(cx, cy, radius, -Math.PI / 2, Math.PI / 2, true);
          // Small arc (bottom)
          path.arc(cx, cy + halfRadius, halfRadius, Math.PI / 2, -Math.PI / 2, true);
          // Small arc (top)
          path.arc(cx, cy - halfRadius, halfRadius, Math.PI / 2, -Math.PI / 2, false);
          path.closePath();

          svg.append("path")
            .attr("d", path.toString())
            .attr("class", `dot ${teamClass}`);
        }
      } else {
        // For 3-stack and 4-stack: clean pie slices
        const sliceAngle = (2 * Math.PI) / groupSize;
        const gapAngle = 0.15; // Small gap between slices
        const baseRotation = -Math.PI / 2; // Start from top
        const startAngle = sliceIndex * sliceAngle + gapAngle / 2 + baseRotation;
        const endAngle = (sliceIndex + 1) * sliceAngle - gapAngle / 2 + baseRotation;

        const arc = d3.arc()
          .innerRadius(0)
          .outerRadius(radius)
          .startAngle(startAngle + Math.PI / 2) // d3.arc uses different angle convention
          .endAngle(endAngle + Math.PI / 2);

        svg.append("path")
          .attr("d", arc())
          .attr("transform", `translate(${cx}, ${cy})`)
          .attr("class", `dot ${teamClass}`);
      }
    };

    // Draw AT group indicators based on style (draw these first, behind dots)
    if (atStyle === "bracket") {
      Object.values(teamOneATGroups).forEach(players => drawBracket(players, teamOneX, "team-one", true));
      Object.values(teamTwoATGroups).forEach(players => drawBracket(players, teamTwoX, "team-two", false));
    } else if (atStyle === "pill") {
      Object.values(teamOneATGroups).forEach(players => drawPill(players, teamOneX, "team-one"));
      Object.values(teamTwoATGroups).forEach(players => drawPill(players, teamTwoX, "team-two"));
    } else if (atStyle === "chain") {
      Object.values(teamOneATGroups).forEach(players => drawChain(players, teamOneX, "team-one"));
      Object.values(teamTwoATGroups).forEach(players => drawChain(players, teamTwoX, "team-two"));
    } else if (atStyle === "glow") {
      Object.values(teamOneATGroups).forEach(players => drawGlow(players, teamOneX, "team-one"));
      Object.values(teamTwoATGroups).forEach(players => drawGlow(players, teamTwoX, "team-two"));
    } else if (atStyle === "pie") {
      Object.values(teamOneATGroups).forEach(players => drawUnifiedPie(players, teamOneX, "dot-team-one"));
      Object.values(teamTwoATGroups).forEach(players => drawUnifiedPie(players, teamTwoX, "dot-team-two"));
    } else if (atStyle === "arcs") {
      Object.values(teamOneATGroups).forEach(players => drawArcsAtPosition(players, teamOneX, "dot-team-one", true));
      Object.values(teamTwoATGroups).forEach(players => drawArcsAtPosition(players, teamTwoX, "dot-team-two", false));
    } else if (atStyle === "combined") {
      Object.values(teamOneATGroups).forEach(players => drawCombinedCircle(players, teamOneX, "dot-team-one"));
      Object.values(teamTwoATGroups).forEach(players => drawCombinedCircle(players, teamTwoX, "dot-team-two"));
    }

    // Draw Team One dots
    teamOnePositioned.forEach(d => {
      if (d.atGroupSize > 0 && atStyle === "yin-yang") {
        const groupSize = d.atGroupSize;
        if (!atGroupCounters.team1[groupSize]) atGroupCounters.team1[groupSize] = 0;
        const sliceIndex = atGroupCounters.team1[groupSize];
        atGroupCounters.team1[groupSize]++;
        if (atGroupCounters.team1[groupSize] >= groupSize) atGroupCounters.team1[groupSize] = 0;
        drawYinYang(teamOneX, d.y, groupSize, sliceIndex, "dot-team-one");
      } else if (d.atGroupSize > 0 && (atStyle === "pie" || atStyle === "arcs" || atStyle === "combined")) {
        // These styles draw AT players separately, no individual dots needed
      } else {
        svg.append("circle")
          .attr("class", "dot dot-team-one")
          .attr("cx", d.atGroupSize > 0 ? teamOneX : d.x)
          .attr("cy", d.y)
          .attr("r", dotRadius);
      }
    });

    // Draw Team Two dots
    teamTwoPositioned.forEach(d => {
      if (d.atGroupSize > 0 && atStyle === "yin-yang") {
        const groupSize = d.atGroupSize;
        if (!atGroupCounters.team2[groupSize]) atGroupCounters.team2[groupSize] = 0;
        const sliceIndex = atGroupCounters.team2[groupSize];
        atGroupCounters.team2[groupSize]++;
        if (atGroupCounters.team2[groupSize] >= groupSize) atGroupCounters.team2[groupSize] = 0;
        drawYinYang(teamTwoX, d.y, groupSize, sliceIndex, "dot-team-two");
      } else if (d.atGroupSize > 0 && (atStyle === "pie" || atStyle === "arcs" || atStyle === "combined")) {
        // These styles draw AT players separately, no individual dots needed
      } else {
        svg.append("circle")
          .attr("class", "dot dot-team-two")
          .attr("cx", d.atGroupSize > 0 ? teamTwoX : d.x)
          .attr("cy", d.y)
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
  }, [teamOneMmrs, teamTwoMmrs, teamOneAT, teamTwoAT, compact, atStyle, pieConfig]);

  return <svg ref={svgRef} style={{ width: "100%", height: "100%" }}></svg>;
};

export { MmrComparison };
