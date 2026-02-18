import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import styled from "styled-components";

// ── Layout ──────────────────────────────────────────

const FingerprintRow = styled.div`
  display: flex;
  gap: var(--space-4);
  align-items: center;
  padding: var(--space-2);
  background: rgba(0, 0, 0, 0.15);
  border-radius: var(--radius-sm);
  margin-bottom: 4px;
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

const ChartWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const EscBadge = styled.span`
  font-family: var(--font-mono);
  font-size: 9px;
  color: var(--grey-light);
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
  padding: 0 4px;
  margin-top: 2px;
`;

const StatsBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: var(--radius-sm);
  min-width: 90px;
`;

const StatRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-2);
`;

const StatLabel = styled.span`
  font-family: var(--font-mono);
  font-size: 8px;
  color: var(--grey-mid);
  text-transform: uppercase;
  letter-spacing: 0.06em;
`;

const StatValue = styled.span`
  font-family: var(--font-mono);
  font-size: 11px;
  color: ${(p) => p.$color || "var(--white)"};
  font-weight: bold;
`;

const StatDivider = styled.div`
  height: 1px;
  background: rgba(255, 255, 255, 0.06);
  margin: 2px 0;
`;

const SequenceWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  max-width: 180px;
`;

const SequenceRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1px;
  line-height: 1;
`;

const SeqChar = styled.span`
  font-family: var(--font-mono);
  font-size: 10px;
  color: ${(p) => p.$highlight ? "var(--gold)" : "rgba(255,255,255,0.4)"};
  background: ${(p) => p.$highlight ? "rgba(252, 219, 51, 0.12)" : "transparent"};
  border-radius: 1px;
  padding: 0 1px;
`;

const SeqMeta = styled.span`
  font-family: var(--font-mono);
  font-size: 8px;
  color: var(--grey-mid);
`;

// ── Hotkey Ring ─────────────────────────────────────

function HotkeyRing({ groupHotkeys }) {
  const svgRef = useRef(null);
  const W = 120, H = 120;
  const cx = W / 2, cy = H / 2;
  const outerR = 48, innerR = 34, labelR = 54;

  useEffect(() => {
    if (!svgRef.current || !groupHotkeys) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const groups = [];
    for (let i = 0; i <= 9; i++) {
      const g = groupHotkeys[String(i)] || { assigned: 0, used: 0 };
      groups.push({ id: i, assigned: g.assigned || 0, used: g.used || 0 });
    }

    const maxAssigned = d3.max(groups, d => d.assigned) || 1;
    const maxUsed = d3.max(groups, d => d.used) || 1;

    const arcGen = d3.arc();
    const n = groups.length;
    const pad = 0.06;
    const sliceAngle = (2 * Math.PI) / n;

    const container = svg.append("g").attr("transform", `translate(${cx},${cy})`);

    groups.forEach((g, i) => {
      const startAngle = i * sliceAngle - Math.PI / 2 + pad / 2;
      const endAngle = (i + 1) * sliceAngle - Math.PI / 2 - pad / 2;

      // Ghost arc (always visible)
      container.append("path")
        .attr("d", arcGen({
          innerRadius: innerR,
          outerRadius: outerR,
          startAngle,
          endAngle,
        }))
        .attr("fill", "rgba(255, 255, 255, 0.03)")
        .attr("stroke", "rgba(255, 255, 255, 0.06)")
        .attr("stroke-width", 0.5);

      // Outer arc — assigned (cyan)
      if (g.assigned > 0) {
        const opacity = 0.3 + 0.7 * (g.assigned / maxAssigned);
        const thickness = 4 + 10 * (g.assigned / maxAssigned);
        container.append("path")
          .attr("d", arcGen({
            innerRadius: outerR - thickness,
            outerRadius: outerR,
            startAngle,
            endAngle,
          }))
          .attr("fill", "#00bcd4")
          .attr("opacity", opacity);
      }

      // Inner arc — used (gold)
      if (g.used > 0) {
        const opacity = 0.3 + 0.7 * (g.used / maxUsed);
        const thickness = 4 + 8 * (g.used / maxUsed);
        container.append("path")
          .attr("d", arcGen({
            innerRadius: innerR,
            outerRadius: innerR + thickness,
            startAngle,
            endAngle,
          }))
          .attr("fill", "var(--gold, #fcdb33)")
          .attr("opacity", opacity);
      }

      // Tooltip overlay
      container.append("path")
        .attr("d", arcGen({
          innerRadius: innerR - 4,
          outerRadius: outerR + 4,
          startAngle,
          endAngle,
        }))
        .attr("fill", "transparent")
        .attr("cursor", "default")
        .append("title")
        .text(`Group ${g.id}: ${g.assigned} assigned, ${g.used} used`);

      // Group number label
      const midAngle = (startAngle + endAngle) / 2;
      const lx = labelR * Math.cos(midAngle);
      const ly = labelR * Math.sin(midAngle);
      container.append("text")
        .attr("x", lx)
        .attr("y", ly)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "central")
        .attr("font-family", "var(--font-mono, monospace)")
        .attr("font-size", 8)
        .attr("fill", g.assigned > 0 || g.used > 0 ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.2)")
        .text(g.id);
    });

    // Center text — hotkey diversity (how many groups used)
    const diversity = groups.filter(g => g.used > 0).length;
    container.append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("font-family", "var(--font-mono, monospace)")
      .attr("font-size", 16)
      .attr("fill", "var(--gold, #fcdb33)")
      .attr("font-weight", "bold")
      .text(diversity);

    container.append("text")
      .attr("y", 14)
      .attr("text-anchor", "middle")
      .attr("font-family", "var(--font-mono, monospace)")
      .attr("font-size", 7)
      .attr("fill", "rgba(255,255,255,0.4)")
      .text("groups");

  }, [groupHotkeys]);

  if (!groupHotkeys) return null;

  return (
    <ChartWrap>
      <svg ref={svgRef} width={W} height={H} />
      <ChartLabel>Hotkeys</ChartLabel>
    </ChartWrap>
  );
}

// ── APM Sparkline ───────────────────────────────────

function ApmSparkline({ timedSegments }) {
  const svgRef = useRef(null);
  const W = 260, H = 100;
  const margin = { top: 8, right: 8, bottom: 16, left: 8 };

  useEffect(() => {
    if (!svgRef.current || !timedSegments || timedSegments.length === 0) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const iw = W - margin.left - margin.right;
    const ih = H - margin.top - margin.bottom;

    const x = d3.scaleLinear()
      .domain([0, timedSegments.length - 1])
      .range([0, iw]);

    const maxVal = d3.max(timedSegments) || 1;
    const y = d3.scaleLinear()
      .domain([0, maxVal * 1.1])
      .range([ih, 0]);

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Vertical grid lines every 5 minutes
    for (let m = 5; m < timedSegments.length; m += 5) {
      g.append("line")
        .attr("x1", x(m)).attr("x2", x(m))
        .attr("y1", 0).attr("y2", ih)
        .attr("stroke", "rgba(255,255,255,0.06)")
        .attr("stroke-width", 0.5);
    }

    // Area
    const area = d3.area()
      .x((_, i) => x(i))
      .y0(ih)
      .y1(d => y(d))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(timedSegments)
      .attr("d", area)
      .attr("fill", "var(--gold, #fcdb33)")
      .attr("fill-opacity", 0.2);

    // Line
    const line = d3.line()
      .x((_, i) => x(i))
      .y(d => y(d))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(timedSegments)
      .attr("d", line)
      .attr("fill", "none")
      .attr("stroke", "var(--gold, #fcdb33)")
      .attr("stroke-width", 1.5);

    // Mean line
    const mean = d3.mean(timedSegments);
    g.append("line")
      .attr("x1", 0).attr("x2", iw)
      .attr("y1", y(mean)).attr("y2", y(mean))
      .attr("stroke", "rgba(255,255,255,0.3)")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "4 3");

    // Mean label
    g.append("text")
      .attr("x", iw - 2)
      .attr("y", y(mean) - 4)
      .attr("text-anchor", "end")
      .attr("font-family", "var(--font-mono, monospace)")
      .attr("font-size", 8)
      .attr("fill", "rgba(255,255,255,0.4)")
      .text(`avg ${Math.round(mean)}`);

    // X-axis minute ticks
    const tickInterval = timedSegments.length <= 15 ? 5 : 10;
    for (let m = 0; m < timedSegments.length; m += tickInterval) {
      g.append("line")
        .attr("x1", x(m)).attr("x2", x(m))
        .attr("y1", ih).attr("y2", ih + 4)
        .attr("stroke", "rgba(255,255,255,0.2)");
      g.append("text")
        .attr("x", x(m))
        .attr("y", ih + 12)
        .attr("text-anchor", "middle")
        .attr("font-family", "var(--font-mono, monospace)")
        .attr("font-size", 7)
        .attr("fill", "rgba(255,255,255,0.3)")
        .text(`${m}m`);
    }

  }, [timedSegments]);

  if (!timedSegments || timedSegments.length === 0) return null;

  return (
    <ChartWrap>
      <svg ref={svgRef} width={W} height={H} />
      <ChartLabel>APM over time</ChartLabel>
    </ChartWrap>
  );
}

// ── Action Radar ────────────────────────────────────

const RADAR_AXES = [
  { key: "rightclick", label: "R-Click" },
  { key: "ability", label: "Ability" },
  { key: "buildtrain", label: "Build" },
  { key: "item", label: "Item" },
  { key: "selecthotkey", label: "Hotkey" },
  { key: "assigngroup", label: "Assign" },
];

function ActionRadar({ actions }) {
  const svgRef = useRef(null);
  const W = 160, H = 160;
  const cx = W / 2, cy = H / 2;
  const maxR = 58;

  useEffect(() => {
    if (!svgRef.current || !actions) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const total = RADAR_AXES.reduce((sum, a) => sum + (actions[a.key] || 0), 0);
    if (total === 0) return;

    const values = RADAR_AXES.map(a => (actions[a.key] || 0) / total);
    const maxVal = d3.max(values) || 1;

    const n = RADAR_AXES.length;
    const angleSlice = (2 * Math.PI) / n;

    const g = svg.append("g").attr("transform", `translate(${cx},${cy})`);

    // Reference rings at 25%, 50%, 75%
    [0.25, 0.5, 0.75].forEach(frac => {
      const r = maxR * frac;
      g.append("circle")
        .attr("r", r)
        .attr("fill", "none")
        .attr("stroke", "rgba(255,255,255,0.06)")
        .attr("stroke-width", 0.5);
    });

    // Axis lines + labels
    RADAR_AXES.forEach((axis, i) => {
      const angle = i * angleSlice - Math.PI / 2;
      const lx = (maxR + 14) * Math.cos(angle);
      const ly = (maxR + 14) * Math.sin(angle);

      g.append("line")
        .attr("x1", 0).attr("y1", 0)
        .attr("x2", maxR * Math.cos(angle))
        .attr("y2", maxR * Math.sin(angle))
        .attr("stroke", "rgba(255,255,255,0.08)")
        .attr("stroke-width", 0.5);

      g.append("text")
        .attr("x", lx)
        .attr("y", ly)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "central")
        .attr("font-family", "var(--font-mono, monospace)")
        .attr("font-size", 7)
        .attr("fill", "rgba(255,255,255,0.45)")
        .text(axis.label);
    });

    // Data polygon
    const scale = d3.scaleLinear().domain([0, maxVal]).range([0, maxR]);
    const points = values.map((v, i) => {
      const angle = i * angleSlice - Math.PI / 2;
      const r = scale(v);
      return [r * Math.cos(angle), r * Math.sin(angle)];
    });
    points.push(points[0]); // close the polygon

    const lineGen = d3.line().x(d => d[0]).y(d => d[1]);

    g.append("path")
      .attr("d", lineGen(points))
      .attr("fill", "var(--gold, #fcdb33)")
      .attr("fill-opacity", 0.15)
      .attr("stroke", "var(--gold, #fcdb33)")
      .attr("stroke-width", 1.5)
      .attr("stroke-opacity", 0.8);

    // Dots at vertices
    points.slice(0, -1).forEach(([px, py]) => {
      g.append("circle")
        .attr("cx", px).attr("cy", py)
        .attr("r", 2.5)
        .attr("fill", "var(--gold, #fcdb33)")
        .attr("fill-opacity", 0.7);
    });

  }, [actions]);

  if (!actions) return null;

  return (
    <ChartWrap>
      <svg ref={svgRef} width={W} height={H} />
      <ChartLabel>Actions</ChartLabel>
    </ChartWrap>
  );
}

// ── Control Stats ───────────────────────────────────

function median(arr) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function ControlStats({ actions }) {
  const selects = actions.select_count || 0;
  const removes = actions.removeunit || 0;
  const subgroups = actions.subgroup || 0;
  const esc = actions.esc || 0;
  const segs = actions.timed_segments || [];

  const apmMax = segs.length ? Math.max(...segs) : 0;
  const apmAvg = segs.length ? Math.round(segs.reduce((a, b) => a + b, 0) / segs.length) : 0;
  const apmMed = segs.length ? Math.round(median(segs)) : 0;

  return (
    <ChartWrap>
      <StatsBlock>
        <StatRow>
          <StatLabel>Peak</StatLabel>
          <StatValue $color="var(--gold)">{apmMax}</StatValue>
        </StatRow>
        <StatRow>
          <StatLabel>Avg</StatLabel>
          <StatValue>{apmAvg}</StatValue>
        </StatRow>
        <StatRow>
          <StatLabel>Median</StatLabel>
          <StatValue>{apmMed}</StatValue>
        </StatRow>
        <StatDivider />
        <StatRow>
          <StatLabel>Select</StatLabel>
          <StatValue>{selects.toLocaleString()}</StatValue>
        </StatRow>
        <StatRow>
          <StatLabel>Remove</StatLabel>
          <StatValue>{removes.toLocaleString()}</StatValue>
        </StatRow>
        <StatRow>
          <StatLabel>Subgrp</StatLabel>
          <StatValue $color={subgroups > 0 ? "#00bcd4" : undefined}>{subgroups.toLocaleString()}</StatValue>
        </StatRow>
        <StatRow>
          <StatLabel>ESC</StatLabel>
          <StatValue $color="var(--grey-light)">{esc.toLocaleString()}</StatValue>
        </StatRow>
      </StatsBlock>
      <ChartLabel>Stats</ChartLabel>
    </ChartWrap>
  );
}

// ── Early Game Sequence ─────────────────────────────

function detectRepeats(seq) {
  // Find repeated patterns of length 2-4 in the sequence
  const highlights = new Set();
  for (let len = 2; len <= 4; len++) {
    for (let i = 0; i <= seq.length - len * 2; i++) {
      const pat = seq.slice(i, i + len).map(s => s.group).join(',');
      const next = seq.slice(i + len, i + len * 2).map(s => s.group).join(',');
      if (pat === next) {
        for (let j = i; j < i + len * 2 && j < seq.length; j++) highlights.add(j);
      }
    }
  }
  return highlights;
}

function EarlyGameSequence({ sequence }) {
  if (!sequence || sequence.length === 0) return null;

  const highlights = detectRepeats(sequence);
  const hasSpam = highlights.size > 6;
  const seqStr = sequence.map(s => s.group).join('');

  return (
    <ChartWrap>
      <SequenceWrap>
        <SequenceRow>
          {sequence.slice(0, 60).map((s, i) => (
            <SeqChar key={i} $highlight={highlights.has(i)} title={`${s.type === 'a' ? 'Assign' : 'Select'} group ${s.group} @ ${(s.ms / 1000).toFixed(1)}s`}>
              {s.group}
            </SeqChar>
          ))}
          {sequence.length > 60 && <SeqChar>...</SeqChar>}
        </SequenceRow>
        <SeqMeta>
          {sequence.length} hotkey actions in first 60s
          {hasSpam && " · spam detected"}
        </SeqMeta>
      </SequenceWrap>
      <ChartLabel>Opening{hasSpam ? " (spam)" : ""}</ChartLabel>
    </ChartWrap>
  );
}

// ── Named exports for use in comparisons ────────────

export { HotkeyRing, ApmSparkline, ActionRadar, EarlyGameSequence, ControlStats };

// ── Wrapper ─────────────────────────────────────────

export default function PlayerFingerprint({ actions }) {
  if (!actions) return null;

  return (
    <FingerprintRow>
      <HotkeyRing groupHotkeys={actions.group_hotkeys} />
      <ControlStats actions={actions} />
      <ApmSparkline timedSegments={actions.timed_segments} />
      <ActionRadar actions={actions} />
      <EarlyGameSequence sequence={actions.early_game_sequence} />
    </FingerprintRow>
  );
}
