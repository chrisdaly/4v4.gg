import React, { useEffect, useRef, useMemo } from "react";
import * as d3 from "d3";
import styled from "styled-components";

const Wrap = styled.div`
  overflow-x: auto;
`;

/**
 * Cross-replay similarity matrix — only shows cross-replay pairs.
 * Rows = replay A players, Columns = replay B players (or grouped by replay).
 *
 * players: [{ uid, playerName, replayId }]
 * matrix: NxN similarity array (full, including same-replay)
 * replayLabels: { [replayId]: "R1" | "R2" | ... }
 * onCellClick: (uidA, uidB) => void
 * selectedCell: { uidA, uidB } | null
 */
export default function SimilarityMatrix({
  players,
  matrix,
  replayLabels,
  onCellClick,
  selectedCell,
}) {
  const svgRef = useRef(null);
  const n = players.length;

  // Group players by replay
  const replayGroups = useMemo(() => {
    const groups = {};
    players.forEach((p, idx) => {
      if (!groups[p.replayId]) groups[p.replayId] = [];
      groups[p.replayId].push({ ...p, idx });
    });
    return Object.entries(groups); // [[replayId, players[]], ...]
  }, [players]);

  useEffect(() => {
    if (!svgRef.current || n === 0 || !matrix || replayGroups.length < 2)
      return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Show cross-replay blocks: rows = each replay, cols = other replays
    // For 2 replays this is a simple R1-rows × R2-cols grid
    // For 3+ replays, show all cross-replay blocks stacked

    const cellSize = 44;
    const labelW = 140;
    const labelH = 100;
    const blockGap = 16;

    // Build list of cross-replay blocks
    const blocks = [];
    for (let a = 0; a < replayGroups.length; a++) {
      for (let b = a + 1; b < replayGroups.length; b++) {
        blocks.push({
          rowGroup: replayGroups[a],
          colGroup: replayGroups[b],
        });
      }
    }

    // Lay out blocks vertically
    let totalH = labelH;
    const blockPositions = blocks.map((block) => {
      const rows = block.rowGroup[1].length;
      const cols = block.colGroup[1].length;
      const pos = { y: totalH, rows, cols };
      totalH += rows * cellSize + blockGap + 20; // 20 for block header
      return pos;
    });

    const maxCols = Math.max(...blocks.map((b) => b.colGroup[1].length));
    const W = labelW + maxCols * cellSize + 20;
    const H = totalH + 20;

    svg.attr("width", W).attr("height", H);

    // Color scale: emphasize the 0.4–0.8 range where discrimination happens
    function cellColor(val) {
      if (val < 0.35) return "rgba(255,255,255,0.03)";
      if (val < 0.50) {
        const t = (val - 0.35) / 0.15;
        return d3.interpolateRgb("rgba(252,219,51,0.06)", "rgba(252,219,51,0.18)")(t);
      }
      if (val < 0.65) {
        const t = (val - 0.50) / 0.15;
        return d3.interpolateRgb("rgba(252,219,51,0.18)", "rgba(252,219,51,0.45)")(t);
      }
      // 0.65+ strong match zone
      const t = Math.min(1, (val - 0.65) / 0.35);
      return d3.interpolateRgb("rgba(252,219,51,0.50)", "rgba(252,219,51,0.95)")(t);
    }

    blocks.forEach((block, bi) => {
      const { rowGroup, colGroup } = block;
      const [rowReplayId, rowPlayers] = rowGroup;
      const [colReplayId, colPlayers] = colGroup;
      const pos = blockPositions[bi];

      const g = svg
        .append("g")
        .attr("transform", `translate(${labelW}, ${pos.y})`);

      // Block header
      g.append("text")
        .attr("x", (colPlayers.length * cellSize) / 2)
        .attr("y", -6)
        .attr("text-anchor", "middle")
        .attr("font-family", "var(--font-mono, monospace)")
        .attr("font-size", 10)
        .attr("fill", "rgba(255,255,255,0.4)")
        .text(
          `${replayLabels[rowReplayId] || "?"} vs ${replayLabels[colReplayId] || "?"}`
        );

      // Column labels (top)
      colPlayers.forEach((cp, j) => {
        const tag = replayLabels[cp.replayId] || "?";
        g.append("text")
          .attr("x", 0)
          .attr("y", 0)
          .attr(
            "transform",
            `translate(${j * cellSize + cellSize / 2}, -18) rotate(-35)`
          )
          .attr("text-anchor", "start")
          .attr("font-family", "var(--font-mono, monospace)")
          .attr("font-size", 9)
          .attr("fill", "rgba(255,255,255,0.6)")
          .text(cp.playerName.split("#")[0] + ` (${tag})`);
      });

      // Row labels (left) + cells
      rowPlayers.forEach((rp, i) => {
        const tag = replayLabels[rp.replayId] || "?";
        g.append("text")
          .attr("x", -8)
          .attr("y", i * cellSize + cellSize / 2)
          .attr("text-anchor", "end")
          .attr("dominant-baseline", "central")
          .attr("font-family", "var(--font-mono, monospace)")
          .attr("font-size", 9)
          .attr("fill", "rgba(255,255,255,0.6)")
          .text(rp.playerName.split("#")[0] + ` (${tag})`);

        colPlayers.forEach((cp, j) => {
          const val = matrix[rp.idx][cp.idx];
          const pct = Math.round(val * 100);

          const isSelected =
            selectedCell &&
            ((selectedCell.uidA === rp.uid &&
              selectedCell.uidB === cp.uid) ||
              (selectedCell.uidA === cp.uid &&
                selectedCell.uidB === rp.uid));

          const cellG = g
            .append("g")
            .attr(
              "transform",
              `translate(${j * cellSize}, ${i * cellSize})`
            );

          // Background
          cellG
            .append("rect")
            .attr("width", cellSize - 2)
            .attr("height", cellSize - 2)
            .attr("fill", cellColor(val))
            .attr("rx", 3);

          // Selection highlight
          if (isSelected) {
            cellG
              .append("rect")
              .attr("width", cellSize - 2)
              .attr("height", cellSize - 2)
              .attr("fill", "none")
              .attr("stroke", "#fff")
              .attr("stroke-width", 2)
              .attr("rx", 3);
          }

          // Percentage text — always show
          cellG
            .append("text")
            .attr("x", (cellSize - 2) / 2)
            .attr("y", (cellSize - 2) / 2)
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "central")
            .attr("font-family", "var(--font-mono, monospace)")
            .attr("font-size", 11)
            .attr("font-weight", val >= 0.6 ? "bold" : "normal")
            .attr(
              "fill",
              val >= 0.65
                ? "rgba(0,0,0,0.8)"
                : val >= 0.45
                  ? "rgba(255,255,255,0.7)"
                  : "rgba(255,255,255,0.3)"
            )
            .text(pct);

          // Click handler
          cellG
            .append("rect")
            .attr("width", cellSize - 2)
            .attr("height", cellSize - 2)
            .attr("fill", "transparent")
            .attr("cursor", "pointer")
            .on("click", () => onCellClick(rp.uid, cp.uid));
        });
      });
    });
  }, [players, matrix, replayLabels, selectedCell, onCellClick, n, replayGroups]);

  if (n === 0 || replayGroups.length < 2) return null;

  return (
    <Wrap>
      <svg ref={svgRef} />
    </Wrap>
  );
}
