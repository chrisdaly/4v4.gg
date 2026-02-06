import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

// atStyle options: "combined" (default), "yin-yang", "bracket", "pill", "chain", "glow", "pie"
// pieConfig allows tuning: { combinedGap (px), areaMultiplier (1.0-2.0) }
// AT arrays use GROUP IDs (not sizes): 0 = solo, 1+ = group ID. Size is calculated from count.
// showMean: show horizontal line at geometric mean
// showStdDev: show shaded region for standard deviation
// hideLabels: hide the inline μ/σ text labels (keeps visual elements)
// showValues: show MMR values next to each dot
const MmrComparison = ({ data, compact = false, atStyle = "combined", pieConfig = {}, showMean = false, showStdDev = false, hideLabels = false, showValues = false }) => {
  const { teamOneMmrs, teamTwoMmrs, teamOneAT = [], teamTwoAT = [] } = data;
  const svgRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current) return;

    // Calculate group sizes from group IDs
    const calcGroupSizes = (atArray) => {
      const counts = {};
      atArray.forEach(id => { if (id > 0) counts[id] = (counts[id] || 0) + 1; });
      return counts;
    };
    const teamOneGroupSizes = calcGroupSizes(teamOneAT);
    const teamTwoGroupSizes = calcGroupSizes(teamTwoAT);

    // Create data with AT group info, filter out unranked players
    // atGroupId = the group ID (0 = solo), atGroupSize = calculated size of that group
    const teamOneData = teamOneMmrs
      .map((mmr, i) => ({
        mmr,
        atGroupId: teamOneAT[i] || 0,
        atGroupSize: teamOneGroupSizes[teamOneAT[i]] || 0,
        index: i,
        team: 1
      }))
      .filter(d => d.mmr && d.mmr > 0);
    const teamTwoData = teamTwoMmrs
      .map((mmr, i) => ({
        mmr,
        atGroupId: teamTwoAT[i] || 0,
        atGroupSize: teamTwoGroupSizes[teamTwoAT[i]] || 0,
        index: i,
        team: 2
      }))
      .filter(d => d.mmr && d.mmr > 0);

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const parent = svgRef.current.parentElement;
    const width = parent.clientWidth;
    const height = parent.clientHeight;

    const margin = { top: 10, right: 0, bottom: 10, left: 0 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Fixed Y-axis: 700 (min possible) to 2700 (max seen in 4v4)
    const yDomain = [700, 2700];

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
        if (d.atGroupId > 0) {
          const key = d.atGroupId;
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
    // Prioritizes: 1) AT groups (highest MMR first), 2) Solo players (highest MMR first)
    // Non-priority elements offset AWAY from center line (team1 goes left, team2 goes right)
    const applyBeeswarm = (teamData, baseX, isTeamOne) => {
      const minDist = dotRadius * 2.5; // Minimum distance between dot centers

      // Direction away from center: team1 goes left (-1), team2 goes right (+1)
      const offsetDirection = isTeamOne ? -1 : 1;

      // First, position AT groups (they can collide with each other)
      const atGroups = {};
      teamData.forEach(d => {
        if (d.atGroupId > 0) {
          if (!atGroups[d.atGroupId]) atGroups[d.atGroupId] = [];
          atGroups[d.atGroupId].push(d);
        }
      });

      const areaMultiplier = pieConfig.areaMultiplier ?? 1.6;
      const positionedATGroups = []; // { groupId, centerY, radius, x }

      // Sort AT groups by average MMR (highest first)
      const sortedATGroups = Object.entries(atGroups)
        .map(([groupId, players]) => ({
          groupId: parseInt(groupId),
          players,
          avgMmr: players.reduce((sum, p) => sum + p.mmr, 0) / players.length,
          centerY: players.reduce((sum, p) => sum + yScale(p.mmr), 0) / players.length,
          radius: dotRadius * Math.sqrt(players.length) * Math.sqrt(areaMultiplier)
        }))
        .sort((a, b) => b.avgMmr - a.avgMmr);

      // Position each AT group, checking for collisions with already positioned groups
      sortedATGroups.forEach(group => {
        let x = baseX;
        let attempts = 0;

        while (attempts < 10) {
          const collision = positionedATGroups.find(pg => {
            const yDist = Math.abs(pg.centerY - group.centerY);
            const xDist = Math.abs(pg.x - x);
            const minSeparation = pg.radius + group.radius + 4;
            const dist = Math.sqrt(xDist ** 2 + yDist ** 2);
            return dist < minSeparation;
          });

          if (!collision) break;

          attempts++;
          x = baseX + offsetDirection * attempts * 8;
        }

        // Clamp X to stay within bounds
        const minX = group.radius + 2;
        const maxX = innerWidth - group.radius - 2;
        const clampedX = Math.max(minX, Math.min(maxX, x));
        positionedATGroups.push({ ...group, x: clampedX });
      });

      // Build combined circles info from positioned AT groups
      const combinedCircles = positionedATGroups.map(g => ({
        centerY: g.centerY,
        radius: g.radius,
        x: g.x,
        groupId: g.groupId
      }));

      // Now position all players
      const positioned = [];

      // Sort: AT players first (by their group's positioned X), then solos by MMR
      const sortedData = [...teamData].sort((a, b) => {
        if (a.atGroupId > 0 && b.atGroupId === 0) return -1;
        if (a.atGroupId === 0 && b.atGroupId > 0) return 1;
        return b.mmr - a.mmr;
      });

      sortedData.forEach(d => {
        const y = yScale(d.mmr);

        // AT players use their group's positioned X
        if (d.atGroupId > 0) {
          const groupInfo = positionedATGroups.find(g => g.groupId === d.atGroupId);
          const x = groupInfo ? groupInfo.x : baseX;
          positioned.push({ ...d, x, y });
          return;
        }

        // Solo players: check for collisions and offset on X-axis only
        let x = baseX;
        let attempts = 0;

        while (attempts < 10) {
          // Check collision with other solo players already positioned
          const soloCollision = positioned.find(p => {
            if (p.atGroupId > 0) return false;
            const dist = Math.sqrt((p.x - x) ** 2 + (p.y - y) ** 2);
            return dist < minDist;
          });

          // Check collision with combined circles (AT groups) at their positioned X
          const combinedCollision = combinedCircles.find(c => {
            const yDist = Math.abs(y - c.centerY);
            const xDist = Math.abs(x - c.x);
            const dist = Math.sqrt(xDist ** 2 + yDist ** 2);
            return dist < (c.radius + dotRadius + 6);
          });

          if (!soloCollision && !combinedCollision) break;

          attempts++;
          x = baseX + offsetDirection * attempts * 8;
        }

        positioned.push({ ...d, x, y });
      });

      // Clamp all positions to stay within SVG bounds
      const minX = dotRadius + 2;
      const maxX = innerWidth - dotRadius - 2;
      positioned.forEach(p => {
        p.x = Math.max(minX, Math.min(maxX, p.x));
      });

      return positioned;
    };

    const teamOnePositioned = applyBeeswarm(teamOneData, teamOneX, true);
    const teamTwoPositioned = applyBeeswarm(teamTwoData, teamTwoX, false);

    // Draw team spread lines connecting all dots at their actual positions
    // For AT groups (combined circles), line stops at edge of circle (doesn't go through)
    const drawSpreadLine = (positionedData, teamClass) => {
      // Sort by Y position (MMR) to draw lines top to bottom
      const sorted = [...positionedData].sort((a, b) => a.y - b.y);

      const areaMultiplier = pieConfig.areaMultiplier ?? 1.6;

      // Build line segments, breaking at AT circles (don't draw through them)
      const segments = [];
      let currentSegment = [];

      // Track which AT groups we've processed
      const processedATGroups = new Set();

      sorted.forEach((d, i) => {
        if (d.atGroupId > 0 && atStyle === "combined") {
          // This is an AT player
          const groupKey = d.atGroupId;

          if (!processedATGroups.has(groupKey)) {
            // First time seeing this AT group - add top edge and start new segment after
            const atPlayers = sorted.filter(p => p.atGroupId === d.atGroupId);
            if (atPlayers.length >= 2) {
              const centerY = atPlayers.reduce((sum, p) => sum + p.y, 0) / atPlayers.length;
              const combinedRadius = dotRadius * Math.sqrt(atPlayers.length) * Math.sqrt(areaMultiplier);

              // Add top edge to current segment, then close it
              currentSegment.push({ x: d.x, y: centerY - combinedRadius });
              if (currentSegment.length > 1) {
                segments.push(currentSegment);
              }

              // Start new segment from bottom edge
              currentSegment = [{ x: d.x, y: centerY + combinedRadius }];
              processedATGroups.add(groupKey);
            }
          }
          // Skip other AT players in same group (already handled)
        } else {
          // Solo player - add their position
          currentSegment.push({ x: d.x, y: d.y });
        }
      });

      // Don't forget the last segment
      if (currentSegment.length > 1) {
        segments.push(currentSegment);
      }

      // Draw all segments
      const line = d3.line().x((d) => d.x).y((d) => d.y);
      segments.forEach(seg => {
        svg.append("path")
          .datum(seg)
          .attr("class", `line ${teamClass}`)
          .attr("d", line)
          .attr("fill", "none");
      });
    };

    drawSpreadLine(teamOnePositioned, "team-one");
    drawSpreadLine(teamTwoPositioned, "team-two");

    // Colors from design tokens
    const goldColor = "#fcdb33";
    const teamOneColor = "#4da6ff";
    const teamTwoColor = "#ef4444";

    // Calculate geometric mean: nth root of product
    const geometricMean = (arr) => {
      const filtered = arr.filter(v => v && v > 0);
      if (filtered.length === 0) return 0;
      const product = filtered.reduce((acc, val) => acc * val, 1);
      return Math.pow(product, 1 / filtered.length);
    };

    // Calculate standard deviation
    const stdDev = (arr, mean) => {
      const filtered = arr.filter(v => v && v > 0);
      if (filtered.length === 0) return 0;
      const squaredDiffs = filtered.map(v => Math.pow(v - mean, 2));
      return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / filtered.length);
    };

    // Draw mean and std dev if enabled
    if (showMean || showStdDev) {
      const team1Mean = geometricMean(teamOneMmrs);
      const team2Mean = geometricMean(teamTwoMmrs);
      const team1Std = stdDev(teamOneMmrs, team1Mean);
      const team2Std = stdDev(teamTwoMmrs, team2Mean);

      // Calculate actual dot spread width for each team
      const team1Xs = teamOnePositioned.map(d => d.x);
      const team2Xs = teamTwoPositioned.map(d => d.x);
      const team1MinX = Math.min(...team1Xs);
      const team1MaxX = Math.max(...team1Xs);
      const team2MinX = Math.min(...team2Xs);
      const team2MaxX = Math.max(...team2Xs);

      // Width is the spread of dots + some padding for the dot radius
      const padding = dotRadius + 4;
      const team1Width = Math.max((team1MaxX - team1MinX) + padding * 2, 20);
      const team2Width = Math.max((team2MaxX - team2MinX) + padding * 2, 20);
      const team1CenterX = (team1MinX + team1MaxX) / 2;
      const team2CenterX = (team2MinX + team2MaxX) / 2;

      // Draw std dev regions (shaded areas) - draw first so they're behind
      if (showStdDev) {
        // Team 1 std dev region
        const t1Upper = Math.min(2700, team1Mean + team1Std);
        const t1Lower = Math.max(700, team1Mean - team1Std);
        svg.append("rect")
          .attr("x", team1CenterX - team1Width / 2)
          .attr("y", yScale(t1Upper))
          .attr("width", team1Width)
          .attr("height", Math.max(yScale(t1Lower) - yScale(t1Upper), 4))
          .attr("fill", teamOneColor)
          .attr("opacity", 0.12)
          .attr("rx", 2);

        // Team 2 std dev region
        const t2Upper = Math.min(2700, team2Mean + team2Std);
        const t2Lower = Math.max(700, team2Mean - team2Std);
        svg.append("rect")
          .attr("x", team2CenterX - team2Width / 2)
          .attr("y", yScale(t2Upper))
          .attr("width", team2Width)
          .attr("height", Math.max(yScale(t2Lower) - yScale(t2Upper), 4))
          .attr("fill", teamTwoColor)
          .attr("opacity", 0.12)
          .attr("rx", 2);

        // Subtle σ value labels (only if hideLabels is false)
        if (!hideLabels) {
          const fontSize = compact ? 7 : 9;
          const labelOpacity = compact ? 0.4 : 0.5;

          // Team 1 σ label (left side, outside the region)
          svg.append("text")
            .attr("x", team1CenterX - team1Width / 2 - 2)
            .attr("y", yScale(t1Upper) + 2)
            .attr("text-anchor", "end")
            .attr("dominant-baseline", "hanging")
            .attr("font-family", "var(--font-mono)")
            .attr("font-size", fontSize)
            .attr("fill", teamOneColor)
            .attr("opacity", labelOpacity)
            .text(`σ${Math.round(team1Std)}`);

          // Team 2 σ label (right side, outside the region)
          svg.append("text")
            .attr("x", team2CenterX + team2Width / 2 + 2)
            .attr("y", yScale(t2Upper) + 2)
            .attr("text-anchor", "start")
            .attr("dominant-baseline", "hanging")
            .attr("font-family", "var(--font-mono)")
            .attr("font-size", fontSize)
            .attr("fill", teamTwoColor)
            .attr("opacity", labelOpacity)
            .text(`σ${Math.round(team2Std)}`);
        }
      }

      // Draw mean lines
      if (showMean) {
        // Team 1 mean line (dashed)
        svg.append("line")
          .attr("x1", team1CenterX - team1Width / 2)
          .attr("y1", yScale(team1Mean))
          .attr("x2", team1CenterX + team1Width / 2)
          .attr("y2", yScale(team1Mean))
          .attr("stroke", teamOneColor)
          .attr("stroke-width", 2)
          .attr("stroke-dasharray", "4,3")
          .attr("opacity", 0.8);

        // Team 2 mean line (dashed)
        svg.append("line")
          .attr("x1", team2CenterX - team2Width / 2)
          .attr("y1", yScale(team2Mean))
          .attr("x2", team2CenterX + team2Width / 2)
          .attr("y2", yScale(team2Mean))
          .attr("stroke", teamTwoColor)
          .attr("stroke-width", 2)
          .attr("stroke-dasharray", "4,3")
          .attr("opacity", 0.8);

        // μ value labels (only if hideLabels is false)
        if (!hideLabels) {
          const fontSize = compact ? 7 : 9;
          const labelOpacity = compact ? 0.5 : 0.6;

          // Team 1 μ value label (right of line)
          svg.append("text")
            .attr("x", team1CenterX + team1Width / 2 + 2)
            .attr("y", yScale(team1Mean))
            .attr("text-anchor", "start")
            .attr("dominant-baseline", "middle")
            .attr("font-family", "var(--font-mono)")
            .attr("font-size", fontSize)
            .attr("fill", teamOneColor)
            .attr("opacity", labelOpacity)
            .text(`μ${Math.round(team1Mean)}`);

          // Team 2 μ value label (left of line)
          svg.append("text")
            .attr("x", team2CenterX - team2Width / 2 - 2)
            .attr("y", yScale(team2Mean))
            .attr("text-anchor", "end")
            .attr("dominant-baseline", "middle")
            .attr("font-family", "var(--font-mono)")
            .attr("font-size", fontSize)
            .attr("fill", teamTwoColor)
            .attr("opacity", labelOpacity)
            .text(`μ${Math.round(team2Mean)}`);
        }
      }
    }

    // Group AT players by their group ID for each team
    const groupATPlayers = (teamData, teamKey) => {
      const groups = {};
      teamData.forEach(d => {
        if (d.atGroupId > 0) {
          const key = `${teamKey}-${d.atGroupId}`;
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
      // Use the positioned X from the first player (all players in group have same X)
      const positionedX = players[0].x;

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
        .attr("cx", positionedX)
        .attr("cy", centerY)
        .attr("r", combinedRadius)
        .attr("fill", "white");

      // Black lines for gaps (will be transparent)
      for (let i = 0; i < groupSize; i++) {
        const angle = i * sliceAngle + baseRotation;
        const x2 = positionedX + Math.cos(angle) * (combinedRadius + 1);
        const y2 = centerY + Math.sin(angle) * (combinedRadius + 1);

        mask.append("line")
          .attr("x1", positionedX)
          .attr("y1", centerY)
          .attr("x2", x2)
          .attr("y2", y2)
          .attr("stroke", "black")
          .attr("stroke-width", gapWidth);
      }

      // Draw the full circle with the mask applied
      svg.append("circle")
        .attr("cx", positionedX)
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

    // Track AT group slice indices for yin-yang rendering (keyed by groupId)
    const atGroupSliceCounters = { team1: {}, team2: {} };

    // Draw Team One dots
    teamOnePositioned.forEach(d => {
      if (d.atGroupId > 0 && atStyle === "yin-yang") {
        const groupId = d.atGroupId;
        const groupSize = d.atGroupSize;
        if (!atGroupSliceCounters.team1[groupId]) atGroupSliceCounters.team1[groupId] = 0;
        const sliceIndex = atGroupSliceCounters.team1[groupId];
        atGroupSliceCounters.team1[groupId]++;
        if (atGroupSliceCounters.team1[groupId] >= groupSize) atGroupSliceCounters.team1[groupId] = 0;
        drawYinYang(teamOneX, d.y, groupSize, sliceIndex, "dot-team-one");
      } else if (d.atGroupId > 0 && (atStyle === "pie" || atStyle === "arcs" || atStyle === "combined")) {
        // These styles draw AT players separately, no individual dots needed
      } else {
        svg.append("circle")
          .attr("class", "dot dot-team-one")
          .attr("cx", d.atGroupId > 0 ? teamOneX : d.x)
          .attr("cy", d.y)
          .attr("r", dotRadius);
      }
    });

    // Draw Team Two dots
    teamTwoPositioned.forEach(d => {
      if (d.atGroupId > 0 && atStyle === "yin-yang") {
        const groupId = d.atGroupId;
        const groupSize = d.atGroupSize;
        if (!atGroupSliceCounters.team2[groupId]) atGroupSliceCounters.team2[groupId] = 0;
        const sliceIndex = atGroupSliceCounters.team2[groupId];
        atGroupSliceCounters.team2[groupId]++;
        if (atGroupSliceCounters.team2[groupId] >= groupSize) atGroupSliceCounters.team2[groupId] = 0;
        drawYinYang(teamTwoX, d.y, groupSize, sliceIndex, "dot-team-two");
      } else if (d.atGroupId > 0 && (atStyle === "pie" || atStyle === "arcs" || atStyle === "combined")) {
        // These styles draw AT players separately, no individual dots needed
      } else {
        svg.append("circle")
          .attr("class", "dot dot-team-two")
          .attr("cx", d.atGroupId > 0 ? teamTwoX : d.x)
          .attr("cy", d.y)
          .attr("r", dotRadius);
      }
    });

    // Draw MMR values next to dots if showValues is enabled
    if (showValues) {
      const fontSize = compact ? 10 : 12;
      const labelOffset = dotRadius + 6;

      // Team One values (left side of dots)
      teamOnePositioned.forEach(d => {
        svg.append("text")
          .attr("x", d.x - labelOffset)
          .attr("y", d.y)
          .attr("text-anchor", "end")
          .attr("dominant-baseline", "middle")
          .attr("font-family", "var(--font-mono)")
          .attr("font-size", fontSize)
          .attr("fill", teamOneColor)
          .attr("opacity", 0.9)
          .text(d.mmr);
      });

      // Team Two values (right side of dots)
      teamTwoPositioned.forEach(d => {
        svg.append("text")
          .attr("x", d.x + labelOffset)
          .attr("y", d.y)
          .attr("text-anchor", "start")
          .attr("dominant-baseline", "middle")
          .attr("font-family", "var(--font-mono)")
          .attr("font-size", fontSize)
          .attr("fill", teamTwoColor)
          .attr("opacity", 0.9)
          .text(d.mmr);
      });
    }

    // Center line
    const middleLine = innerWidth / 2 + margin.left;
    svg.append("line")
      .attr("class", "line team-middle")
      .attr("x1", middleLine).attr("y1", 0)
      .attr("x2", middleLine).attr("y2", height);
  }, [teamOneMmrs, teamTwoMmrs, teamOneAT, teamTwoAT, compact, atStyle, pieConfig, showMean, showStdDev, hideLabels, showValues]);

  return <svg ref={svgRef} style={{ width: "100%", height: "100%" }}></svg>;
};

export { MmrComparison };
