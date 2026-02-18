import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import styled from "styled-components";

const COLORS = ["#fcdb33", "#4a9eff", "#ff4a4a", "#4caf50"];

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Legend = styled.div`
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-family: var(--font-mono);
  font-size: 9px;
  color: var(--grey-light);
`;

const LegendDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${(p) => p.$color};
`;

/**
 * Multi-series APM sparkline overlay.
 * series: [{ label, timedSegments }]
 */
export default function OverlaySparkline({ series }) {
  const svgRef = useRef(null);
  const W = 320, H = 120;
  const margin = { top: 8, right: 8, bottom: 18, left: 8 };

  useEffect(() => {
    if (!svgRef.current || !series || series.length === 0) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const iw = W - margin.left - margin.right;
    const ih = H - margin.top - margin.bottom;

    // Shared scales across all series
    const maxLen = d3.max(series, (s) => s.timedSegments?.length || 0) || 1;
    const maxVal = d3.max(series, (s) => d3.max(s.timedSegments || [0])) || 1;

    const x = d3.scaleLinear().domain([0, maxLen - 1]).range([0, iw]);
    const y = d3.scaleLinear().domain([0, maxVal * 1.1]).range([ih, 0]);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Vertical grid lines every 5 minutes
    for (let m = 5; m < maxLen; m += 5) {
      g.append("line")
        .attr("x1", x(m)).attr("x2", x(m))
        .attr("y1", 0).attr("y2", ih)
        .attr("stroke", "rgba(255,255,255,0.06)")
        .attr("stroke-width", 0.5);
    }

    // Draw each series
    series.forEach((s, idx) => {
      const segs = s.timedSegments;
      if (!segs || segs.length === 0) return;
      const color = COLORS[idx % COLORS.length];

      // Area
      const area = d3.area()
        .x((_, i) => x(i))
        .y0(ih)
        .y1((d) => y(d))
        .curve(d3.curveMonotoneX);

      g.append("path")
        .datum(segs)
        .attr("d", area)
        .attr("fill", color)
        .attr("fill-opacity", 0.1);

      // Line
      const line = d3.line()
        .x((_, i) => x(i))
        .y((d) => y(d))
        .curve(d3.curveMonotoneX);

      g.append("path")
        .datum(segs)
        .attr("d", line)
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", 1.5)
        .attr("stroke-opacity", 0.8);
    });

    // X-axis ticks
    const tickInterval = maxLen <= 15 ? 5 : 10;
    for (let m = 0; m < maxLen; m += tickInterval) {
      g.append("text")
        .attr("x", x(m))
        .attr("y", ih + 12)
        .attr("text-anchor", "middle")
        .attr("font-family", "var(--font-mono, monospace)")
        .attr("font-size", 7)
        .attr("fill", "rgba(255,255,255,0.3)")
        .text(`${m}m`);
    }
  }, [series]);

  if (!series || series.length === 0) return null;

  return (
    <Wrap>
      <svg ref={svgRef} width={W} height={H} />
      <Legend>
        {series.map((s, i) => (
          <LegendItem key={i}>
            <LegendDot $color={COLORS[i % COLORS.length]} />
            {s.label}
          </LegendItem>
        ))}
      </Legend>
    </Wrap>
  );
}
