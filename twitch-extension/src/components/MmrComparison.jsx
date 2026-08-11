import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import { geometricMean, stdDev } from "../lib/formatters";
import { colors } from "../lib/tokens";

const MMR_DOMAIN = [700, 2700];
const AREA_MULTIPLIER = 1.6;
const COMBINED_GAP = 5;

const VARIANTS = {
  card:      { compact: true },
  scorecard: { hideVs: true },
  micro:     { compact: true, hideLabels: true },
  overlay:   { compact: true, hideLabels: true },
};

const MmrComparison = React.memo(({ data, variant, compact, hideLabels, hideVs, showMean = false, showStdDev = false, showValues = false, localScale = false }) => {
  const preset = VARIANTS[variant] || {};
  const isCompact = compact ?? preset.compact ?? false;
  const labelsHidden = hideLabels ?? preset.hideLabels ?? false;
  const vsHidden = hideVs ?? preset.hideVs ?? false;
  const { teamOneMmrs, teamTwoMmrs, teamOneAT = [], teamTwoAT = [] } = data;
  const svgRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current) return;
    const parent = svgRef.current.parentElement;

    const draw = () => {
      if (!svgRef.current) return;

      const calcGroupSizes = (atArray) => {
        const counts = {};
        atArray.forEach(id => { if (id > 0) counts[id] = (counts[id] || 0) + 1; });
        return counts;
      };
      const teamOneGroupSizes = calcGroupSizes(teamOneAT);
      const teamTwoGroupSizes = calcGroupSizes(teamTwoAT);

      const teamOneData = teamOneMmrs
        .map((mmr, i) => ({ mmr, atGroupId: teamOneAT[i] || 0, atGroupSize: teamOneGroupSizes[teamOneAT[i]] || 0, index: i, team: 1 }))
        .filter(d => d.mmr && d.mmr > 0);
      const teamTwoData = teamTwoMmrs
        .map((mmr, i) => ({ mmr, atGroupId: teamTwoAT[i] || 0, atGroupSize: teamTwoGroupSizes[teamTwoAT[i]] || 0, index: i, team: 2 }))
        .filter(d => d.mmr && d.mmr > 0);

      const svg = d3.select(svgRef.current);
      svg.selectAll("*").remove();

      const width = parent.clientWidth;
      const height = parent.clientHeight;
      const margin = { top: 10, right: 0, bottom: 10, left: 0 };
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      const yDomain = localScale
        ? (() => {
            const allMmrs = [...teamOneData, ...teamTwoData].map(d => d.mmr);
            if (!allMmrs.length) return MMR_DOMAIN;
            const pad = 80;
            return [Math.max(0, Math.min(...allMmrs) - pad), Math.max(...allMmrs) + pad];
          })()
        : MMR_DOMAIN;

      const yScale = d3.scaleLinear().domain(yDomain).range([innerHeight, margin.top]);
      const dotRadius = width < 150 ? 3 : (isCompact ? 4 : 5);
      const beeswarmStep = dotRadius * 2;
      const teamOneX = innerWidth / 3 + margin.left;
      const teamTwoX = (2 * innerWidth) / 3 + margin.left;
      const combinedRadiusFor = (groupSize) => dotRadius * Math.sqrt(groupSize) * Math.sqrt(AREA_MULTIPLIER);

      const applyBeeswarm = (teamData, baseX, isTeamOne) => {
        const minDist = dotRadius * 2.5;
        const offsetDirection = isTeamOne ? -1 : 1;
        const atGroups = {};
        teamData.forEach(d => {
          if (d.atGroupId > 0) {
            if (!atGroups[d.atGroupId]) atGroups[d.atGroupId] = [];
            atGroups[d.atGroupId].push(d);
          }
        });
        const positionedATGroups = [];
        const sortedATGroups = Object.entries(atGroups)
          .map(([groupId, players]) => ({
            groupId: parseInt(groupId),
            players,
            avgMmr: players.reduce((sum, p) => sum + p.mmr, 0) / players.length,
            mmrCenter: players.reduce((sum, p) => sum + yScale(p.mmr), 0) / players.length,
            radius: combinedRadiusFor(players.length)
          }))
          .sort((a, b) => b.avgMmr - a.avgMmr);

        sortedATGroups.forEach(group => {
          let teamPos = baseX;
          let attempts = 0;
          while (attempts < 10) {
            const collision = positionedATGroups.find(pg => {
              const mmrDist = Math.abs(pg.mmrCenter - group.mmrCenter);
              const teamDist = Math.abs(pg.teamPos - teamPos);
              const minSeparation = pg.radius + group.radius + 4;
              return Math.sqrt(mmrDist ** 2 + teamDist ** 2) < minSeparation;
            });
            if (!collision) break;
            attempts++;
            teamPos = baseX + offsetDirection * attempts * beeswarmStep;
          }
          teamPos = Math.max(group.radius + 2, Math.min(innerWidth - group.radius - 2, teamPos));
          positionedATGroups.push({ ...group, teamPos });
        });

        const combinedCircles = positionedATGroups.map(g => ({
          mmrCenter: g.mmrCenter, radius: g.radius, teamPos: g.teamPos, groupId: g.groupId
        }));

        const positioned = [];
        const sortedData = [...teamData].sort((a, b) => {
          if (a.atGroupId > 0 && b.atGroupId === 0) return -1;
          if (a.atGroupId === 0 && b.atGroupId > 0) return 1;
          return b.mmr - a.mmr;
        });

        sortedData.forEach(d => {
          const mmrPos = yScale(d.mmr);
          if (d.atGroupId > 0) {
            const groupInfo = positionedATGroups.find(g => g.groupId === d.atGroupId);
            positioned.push({ ...d, x: groupInfo ? groupInfo.teamPos : baseX, y: mmrPos });
            return;
          }
          let teamPos = baseX;
          let attempts = 0;
          while (attempts < 10) {
            const soloCollision = positioned.find(p => {
              if (p.atGroupId > 0) return false;
              return Math.sqrt((p.x - teamPos) ** 2 + (p.y - mmrPos) ** 2) < minDist;
            });
            const combinedCollision = combinedCircles.find(c => {
              const mmrDist = Math.abs(mmrPos - c.mmrCenter);
              const teamDist = Math.abs(teamPos - c.teamPos);
              return Math.sqrt(mmrDist ** 2 + teamDist ** 2) < (c.radius + dotRadius + 6);
            });
            if (!soloCollision && !combinedCollision) break;
            attempts++;
            teamPos = baseX + offsetDirection * attempts * beeswarmStep;
          }
          positioned.push({ ...d, x: teamPos, y: mmrPos });
        });

        const minX = dotRadius + 2;
        const maxX = innerWidth - dotRadius - 2;
        positioned.forEach(p => { p.x = Math.max(minX, Math.min(maxX, p.x)); });
        return positioned;
      };

      const teamOnePositioned = applyBeeswarm(teamOneData, teamOneX, true);
      const teamTwoPositioned = applyBeeswarm(teamTwoData, teamTwoX, false);

      const drawSpreadLine = (positionedData, teamClass) => {
        const sorted = [...positionedData].sort((a, b) => a.y - b.y);
        const segments = [];
        let currentSegment = [];
        const processedATGroups = new Set();
        sorted.forEach(d => {
          if (d.atGroupId > 0) {
            const groupKey = d.atGroupId;
            if (!processedATGroups.has(groupKey)) {
              const atPlayers = sorted.filter(p => p.atGroupId === d.atGroupId);
              if (atPlayers.length >= 2) {
                const combinedRadius = combinedRadiusFor(atPlayers.length);
                const centerY = atPlayers.reduce((sum, p) => sum + p.y, 0) / atPlayers.length;
                currentSegment.push({ x: d.x, y: centerY - combinedRadius });
                if (currentSegment.length > 1) segments.push(currentSegment);
                currentSegment = [{ x: d.x, y: centerY + combinedRadius }];
                processedATGroups.add(groupKey);
              }
            }
          } else {
            currentSegment.push({ x: d.x, y: d.y });
          }
        });
        if (currentSegment.length > 1) segments.push(currentSegment);
        const line = d3.line().x(d => d.x).y(d => d.y);
        segments.forEach(seg => {
          svg.append("path").datum(seg).attr("class", `line ${teamClass}`).attr("d", line).attr("fill", "none");
        });
      };

      drawSpreadLine(teamOnePositioned, "team-one");
      drawSpreadLine(teamTwoPositioned, "team-two");

      const teamOneColor = colors.teamBlue.value;
      const teamTwoColor = colors.teamRed.value;

      if (showMean || showStdDev) {
        const team1Mean = geometricMean(teamOneMmrs);
        const team2Mean = geometricMean(teamTwoMmrs);
        const team1Std = stdDev(teamOneMmrs);
        const team2Std = stdDev(teamTwoMmrs);
        const team1Xs = teamOnePositioned.map(d => d.x);
        const team2Xs = teamTwoPositioned.map(d => d.x);
        const team1MinX = Math.min(...team1Xs);
        const team1MaxX = Math.max(...team1Xs);
        const team2MinX = Math.min(...team2Xs);
        const team2MaxX = Math.max(...team2Xs);
        const padding = dotRadius + 4;
        const team1Width = Math.max((team1MaxX - team1MinX) + padding * 2, 20);
        const team2Width = Math.max((team2MaxX - team2MinX) + padding * 2, 20);
        const team1CenterX = (team1MinX + team1MaxX) / 2;
        const team2CenterX = (team2MinX + team2MaxX) / 2;

        if (showStdDev) {
          const t1Upper = Math.min(yDomain[1], team1Mean + team1Std);
          const t1Lower = Math.max(yDomain[0], team1Mean - team1Std);
          svg.append("rect").attr("x", team1CenterX - team1Width / 2).attr("y", yScale(t1Upper)).attr("width", team1Width).attr("height", Math.max(yScale(t1Lower) - yScale(t1Upper), 4)).attr("fill", teamOneColor).attr("opacity", 0.12).attr("rx", 2);
          const t2Upper = Math.min(yDomain[1], team2Mean + team2Std);
          const t2Lower = Math.max(yDomain[0], team2Mean - team2Std);
          svg.append("rect").attr("x", team2CenterX - team2Width / 2).attr("y", yScale(t2Upper)).attr("width", team2Width).attr("height", Math.max(yScale(t2Lower) - yScale(t2Upper), 4)).attr("fill", teamTwoColor).attr("opacity", 0.12).attr("rx", 2);
        }

        if (showMean) {
          svg.append("line").attr("x1", team1CenterX - team1Width / 2).attr("y1", yScale(team1Mean)).attr("x2", team1CenterX + team1Width / 2).attr("y2", yScale(team1Mean)).attr("stroke", teamOneColor).attr("stroke-width", 2).attr("stroke-dasharray", "4,3").attr("opacity", 0.8);
          svg.append("line").attr("x1", team2CenterX - team2Width / 2).attr("y1", yScale(team2Mean)).attr("x2", team2CenterX + team2Width / 2).attr("y2", yScale(team2Mean)).attr("stroke", teamTwoColor).attr("stroke-width", 2).attr("stroke-dasharray", "4,3").attr("opacity", 0.8);
        }
      }

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

      const drawCombinedCircle = (players, teamClass) => {
        if (players.length < 2) return;
        const groupSize = players.length;
        const centerY = players.reduce((sum, p) => sum + p.y, 0) / players.length;
        const positionedX = players[0].x;
        const combinedRadius = combinedRadiusFor(groupSize);
        const sliceAngle = (2 * Math.PI) / groupSize;
        const baseRotation = -Math.PI / 2 + Math.PI / 4;
        const maskId = `mask-${teamClass}-${groupSize}-${positionedX.toFixed(0)}`;
        const mask = svg.append("defs").append("mask").attr("id", maskId);
        mask.append("circle").attr("cx", positionedX).attr("cy", centerY).attr("r", combinedRadius).attr("fill", "white");
        for (let i = 0; i < groupSize; i++) {
          const angle = i * sliceAngle + baseRotation;
          const x2 = positionedX + Math.cos(angle) * (combinedRadius + 1);
          const y2 = centerY + Math.sin(angle) * (combinedRadius + 1);
          mask.append("line").attr("x1", positionedX).attr("y1", centerY).attr("x2", x2).attr("y2", y2).attr("stroke", "black").attr("stroke-width", COMBINED_GAP);
        }
        svg.append("circle").attr("cx", positionedX).attr("cy", centerY).attr("r", combinedRadius).attr("class", `dot ${teamClass}`).attr("mask", `url(#${maskId})`);
      };

      Object.values(teamOneATGroups).forEach(players => drawCombinedCircle(players, "dot-team-one"));
      Object.values(teamTwoATGroups).forEach(players => drawCombinedCircle(players, "dot-team-two"));

      teamOnePositioned.forEach(d => {
        if (d.atGroupId > 0) return;
        svg.append("circle").attr("class", "dot dot-team-one").attr("cx", d.x).attr("cy", d.y).attr("r", dotRadius);
      });
      teamTwoPositioned.forEach(d => {
        if (d.atGroupId > 0) return;
        svg.append("circle").attr("class", "dot dot-team-two").attr("cx", d.x).attr("cy", d.y).attr("r", dotRadius);
      });

      if (showValues) {
        const fontSize = isCompact ? 10 : 12;
        const labelOffset = dotRadius + 6;
        teamOnePositioned.forEach(d => {
          svg.append("text").attr("x", d.x - labelOffset).attr("y", d.y).attr("text-anchor", "end").attr("dominant-baseline", "middle").attr("font-family", "var(--font-mono)").attr("font-size", fontSize).attr("fill", teamOneColor).attr("opacity", 0.9).text(d.mmr);
        });
        teamTwoPositioned.forEach(d => {
          svg.append("text").attr("x", d.x + labelOffset).attr("y", d.y).attr("text-anchor", "start").attr("dominant-baseline", "middle").attr("font-family", "var(--font-mono)").attr("font-size", fontSize).attr("fill", teamTwoColor).attr("opacity", 0.9).text(d.mmr);
        });
      }

      const middleLine = innerWidth / 2 + margin.left;
      svg.append("line").attr("class", "line team-middle").attr("x1", middleLine).attr("y1", 0).attr("x2", middleLine).attr("y2", height);

      if (!labelsHidden && !vsHidden) {
        svg.append("text").attr("x", middleLine).attr("y", height - 4).attr("text-anchor", "middle").attr("font-family", "var(--font-display)").attr("font-size", 11).attr("fill", colors.greyLight.value).attr("letter-spacing", "0.1em").text("vs");
      }
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(parent);
    return () => observer.disconnect();
  }, [teamOneMmrs, teamTwoMmrs, teamOneAT, teamTwoAT, isCompact, showMean, showStdDev, labelsHidden, vsHidden, showValues, localScale]);

  return <svg ref={svgRef} style={{ width: "100%", height: "100%" }}></svg>;
});

export { MmrComparison };
