import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import styled from "styled-components";
import { Link } from "react-router-dom";
import { Button } from "./ui";

// ── Layout ──────────────────────────────────────────

const Card = styled.div`
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--grey-mid);
  border-radius: var(--radius-md);
  padding: var(--space-4);
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-4);
`;

const CardTitle = styled.h3`
  font-family: var(--font-display);
  font-size: var(--text-base);
  color: var(--gold);
  margin: 0;
`;

const CardSubtitle = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--grey-light);
`;

const ChartGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);

  @media (max-width: 500px) {
    grid-template-columns: 1fr;
  }
`;

const ChartWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const ChartLabel = styled.div`
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--grey-mid);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  text-align: center;
  margin-top: 4px;
`;

const StatsRow = styled.div`
  display: flex;
  gap: var(--space-4);
  justify-content: center;
  margin-top: var(--space-4);
  flex-wrap: wrap;
`;

const Stat = styled.div`
  text-align: center;
`;

const StatValue = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-base);
  color: ${(p) => p.$color || "var(--white)"};
  font-weight: bold;
`;

const StatLabel = styled.div`
  font-family: var(--font-mono);
  font-size: 9px;
  color: var(--grey-mid);
  text-transform: uppercase;
  letter-spacing: 0.06em;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: var(--space-6) var(--space-4);
`;

const EmptyText = styled.p`
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--grey-light);
  margin-bottom: var(--space-4);
`;

// ── Hotkey Ring ─────────────────────────────────────

function HotkeyRing({ groupUsage }) {
  const svgRef = useRef(null);
  const W = 140, H = 140;
  const cx = W / 2, cy = H / 2;
  const outerR = 52, innerR = 38, labelR = 58;

  useEffect(() => {
    if (!svgRef.current || !groupUsage) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Build groups 0-9 from groupUsage array
    const groups = [];
    for (let i = 0; i <= 9; i++) {
      const g = groupUsage.find(gu => gu.group === i) || { used: 0, assigned: 0 };
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
        .attr("font-size", 9)
        .attr("fill", g.assigned > 0 || g.used > 0 ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.2)")
        .text(g.id);
    });

    // Center text — hotkey diversity
    const diversity = groups.filter(g => g.used > 0).length;
    container.append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("font-family", "var(--font-mono, monospace)")
      .attr("font-size", 20)
      .attr("fill", "var(--gold, #fcdb33)")
      .attr("font-weight", "bold")
      .text(diversity);

    container.append("text")
      .attr("y", 16)
      .attr("text-anchor", "middle")
      .attr("font-family", "var(--font-mono, monospace)")
      .attr("font-size", 8)
      .attr("fill", "rgba(255,255,255,0.4)")
      .text("groups");

  }, [groupUsage]);

  if (!groupUsage || groupUsage.length === 0) return null;

  return (
    <ChartWrap>
      <svg ref={svgRef} width={W} height={H} />
      <ChartLabel>Hotkeys</ChartLabel>
    </ChartWrap>
  );
}

// ── Action Radar ────────────────────────────────────

const RADAR_AXES = [
  { key: 0, label: "R-Click" },
  { key: 1, label: "Ability" },
  { key: 2, label: "Build" },
  { key: 3, label: "Item" },
  { key: 4, label: "Hotkey" },
  { key: 5, label: "Assign" },
];

function ActionRadar({ actionSegment }) {
  const svgRef = useRef(null);
  const W = 140, H = 140;
  const cx = W / 2, cy = H / 2;
  const maxR = 52;

  useEffect(() => {
    if (!svgRef.current || !actionSegment || actionSegment.length < 6) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const values = actionSegment.slice(0, 6);
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

  }, [actionSegment]);

  if (!actionSegment || actionSegment.length < 6) return null;

  return (
    <ChartWrap>
      <svg ref={svgRef} width={W} height={H} />
      <ChartLabel>Actions</ChartLabel>
    </ChartWrap>
  );
}

// ── Main SignatureCard Component ────────────────────

export default function SignatureCard({ profile, battleTag, loading, onUpload }) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Playstyle Signature</CardTitle>
        </CardHeader>
        <EmptyState>
          <EmptyText>Loading...</EmptyText>
        </EmptyState>
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Playstyle Signature</CardTitle>
        </CardHeader>
        <EmptyState>
          <EmptyText>
            No signature data available for this player.
            Upload a replay to generate their playstyle fingerprint.
          </EmptyText>
          <Link to="/signatures">
            <Button>View Signatures</Button>
          </Link>
        </EmptyState>
      </Card>
    );
  }

  const { averaged, groupUsage, actionCounts, replayCount, confidence } = profile;
  const actionSegment = averaged?.segments?.action || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Playstyle Signature</CardTitle>
        <CardSubtitle>
          {replayCount} {replayCount === 1 ? "replay" : "replays"}
          {confidence?.selfConsistency != null && (
            <> · {Math.round(confidence.selfConsistency * 100)}% consistent</>
          )}
        </CardSubtitle>
      </CardHeader>

      <ChartGrid>
        <HotkeyRing groupUsage={groupUsage} />
        <ActionRadar actionSegment={actionSegment} />
      </ChartGrid>

      {actionCounts && (
        <StatsRow>
          <Stat>
            <StatValue $color="var(--gold)">{actionCounts.assignPerMin}</StatValue>
            <StatLabel>Assign/min</StatLabel>
          </Stat>
          <Stat>
            <StatValue>{actionCounts.selectPerMin}</StatValue>
            <StatLabel>Select/min</StatLabel>
          </Stat>
          <Stat>
            <StatValue $color="#00bcd4">{actionCounts.tabPerMin}</StatValue>
            <StatLabel>Tab/min</StatLabel>
          </Stat>
          {actionCounts.rhythmMedianMs && (
            <Stat>
              <StatValue>{actionCounts.rhythmMedianMs}ms</StatValue>
              <StatLabel>Rhythm</StatLabel>
            </Stat>
          )}
        </StatsRow>
      )}

      <StatsRow style={{ marginTop: "var(--space-2)" }}>
        <Link to="/signatures">
          <Button $secondary>Explore Signatures</Button>
        </Link>
      </StatsRow>
    </Card>
  );
}

// Also export individual components for use elsewhere
export { HotkeyRing, ActionRadar };
