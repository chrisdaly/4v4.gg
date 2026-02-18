import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import styled from "styled-components";

const COLORS = ["#fcdb33", "#4a9eff", "#ff4a4a", "#4caf50"];

const RADAR_AXES = [
  { key: "rightclick", label: "R-Click" },
  { key: "ability", label: "Ability" },
  { key: "buildtrain", label: "Build" },
  { key: "item", label: "Item" },
  { key: "selecthotkey", label: "Hotkey" },
  { key: "assigngroup", label: "Assign" },
];

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const ChartLabel = styled.div`
  font-family: var(--font-mono);
  font-size: 9px;
  color: var(--grey-mid);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  text-align: center;
  margin-top: 2px;
`;

/**
 * Overlay radar chart — ghost polygons for earlier replays, solid for latest.
 * series: [{ label, actions }] — actions has rightclick, ability, etc.
 */
export default function OverlayRadar({ series }) {
  const svgRef = useRef(null);
  const W = 180, H = 180;
  const cx = W / 2, cy = H / 2;
  const maxR = 64;

  useEffect(() => {
    if (!svgRef.current || !series || series.length === 0) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const n = RADAR_AXES.length;
    const angleSlice = (2 * Math.PI) / n;
    const g = svg.append("g").attr("transform", `translate(${cx},${cy})`);

    // Reference rings
    [0.25, 0.5, 0.75].forEach((frac) => {
      g.append("circle")
        .attr("r", maxR * frac)
        .attr("fill", "none")
        .attr("stroke", "rgba(255,255,255,0.06)")
        .attr("stroke-width", 0.5);
    });

    // Axis lines + labels
    RADAR_AXES.forEach((axis, i) => {
      const angle = i * angleSlice - Math.PI / 2;
      g.append("line")
        .attr("x1", 0).attr("y1", 0)
        .attr("x2", maxR * Math.cos(angle))
        .attr("y2", maxR * Math.sin(angle))
        .attr("stroke", "rgba(255,255,255,0.08)")
        .attr("stroke-width", 0.5);

      const lx = (maxR + 14) * Math.cos(angle);
      const ly = (maxR + 14) * Math.sin(angle);
      g.append("text")
        .attr("x", lx).attr("y", ly)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "central")
        .attr("font-family", "var(--font-mono, monospace)")
        .attr("font-size", 7)
        .attr("fill", "rgba(255,255,255,0.45)")
        .text(axis.label);
    });

    // Compute max value across all series for consistent scaling
    let globalMax = 0;
    const allValues = series.map((s) => {
      const acts = s.actions;
      const total = RADAR_AXES.reduce((sum, a) => sum + (acts[a.key] || 0), 0);
      if (total === 0) return RADAR_AXES.map(() => 0);
      const vals = RADAR_AXES.map((a) => (acts[a.key] || 0) / total);
      const m = d3.max(vals) || 0;
      if (m > globalMax) globalMax = m;
      return vals;
    });

    if (globalMax === 0) return;
    const scale = d3.scaleLinear().domain([0, globalMax]).range([0, maxR]);
    const lineGen = d3.line().x((d) => d[0]).y((d) => d[1]);

    // Draw polygons — earlier = ghost, latest = solid
    series.forEach((s, idx) => {
      const values = allValues[idx];
      const isLatest = idx === series.length - 1;
      const color = COLORS[idx % COLORS.length];

      const points = values.map((v, i) => {
        const angle = i * angleSlice - Math.PI / 2;
        const r = scale(v);
        return [r * Math.cos(angle), r * Math.sin(angle)];
      });
      points.push(points[0]); // close

      g.append("path")
        .attr("d", lineGen(points))
        .attr("fill", color)
        .attr("fill-opacity", isLatest ? 0.2 : 0.1)
        .attr("stroke", color)
        .attr("stroke-width", isLatest ? 1.5 : 1)
        .attr("stroke-opacity", isLatest ? 0.9 : 0.3);
    });
  }, [series]);

  if (!series || series.length === 0) return null;

  return (
    <Wrap>
      <svg ref={svgRef} width={W} height={H} />
      <ChartLabel>Actions overlay</ChartLabel>
    </Wrap>
  );
}
