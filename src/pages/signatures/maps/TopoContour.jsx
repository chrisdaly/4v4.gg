import React from "react";
import { GOLD, GOLD_DIM, GREY, GREY_MID, lerpColor } from "../vizUtils";

/**
 * TopoContour — 8×8 heightmap from embedding, rendered as contour lines.
 * If no embedding, falls back to using all 63 handcrafted dims reshaped to ~8×8.
 */
export default function TopoContour({ segments, embedding }) {
  const W = 240, H = 200;
  const gridSize = 8;

  // Build 8x8 grid from embedding or segments
  let values;
  if (embedding && embedding.length >= 64) {
    values = embedding.slice(0, 64);
  } else {
    // Flatten segments and pad/truncate to 64
    const { action = [], apm = [], hotkey = [], tempo = [], intensity = [], transitions = [], rhythm = [] } = segments || {};
    const flat = [...action, ...apm, ...hotkey, ...tempo, ...intensity, ...transitions, ...rhythm];
    values = Array.from({ length: 64 }, (_, i) => flat[i % flat.length] || 0);
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  // Normalize to 0-1
  const grid = [];
  for (let r = 0; r < gridSize; r++) {
    grid[r] = [];
    for (let c = 0; c < gridSize; c++) {
      grid[r][c] = (values[r * gridSize + c] - min) / range;
    }
  }

  const padL = 20, padT = 15;
  const cellW = (W - padL * 2) / gridSize;
  const cellH = (H - padT * 2) / gridSize;
  const elements = [];

  // Draw colored heightmap cells
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const v = grid[r][c];
      const color = lerpColor("#0a1a2e", GOLD, v);
      elements.push(
        <rect key={`cell-${r}-${c}`}
          x={padL + c * cellW}
          y={padT + r * cellH}
          width={cellW}
          height={cellH}
          fill={color}
          opacity={0.4 + v * 0.5}
        />
      );
    }
  }

  // Draw contour lines at specific thresholds
  const thresholds = [0.2, 0.4, 0.6, 0.8];

  thresholds.forEach((threshold, ti) => {
    // Simple marching squares-ish: draw line segments where value crosses threshold
    for (let r = 0; r < gridSize - 1; r++) {
      for (let c = 0; c < gridSize - 1; c++) {
        const tl = grid[r][c];
        const tr = grid[r][c + 1];
        const bl = grid[r + 1][c];
        const br = grid[r + 1][c + 1];

        const x = padL + c * cellW;
        const y = padT + r * cellH;

        // Check which edges the contour crosses
        const edges = [];
        if ((tl >= threshold) !== (tr >= threshold)) {
          const t = (threshold - tl) / (tr - tl);
          edges.push({ x: x + t * cellW, y: y });
        }
        if ((tr >= threshold) !== (br >= threshold)) {
          const t = (threshold - tr) / (br - tr);
          edges.push({ x: x + cellW, y: y + t * cellH });
        }
        if ((bl >= threshold) !== (br >= threshold)) {
          const t = (threshold - bl) / (br - bl);
          edges.push({ x: x + t * cellW, y: y + cellH });
        }
        if ((tl >= threshold) !== (bl >= threshold)) {
          const t = (threshold - tl) / (bl - tl);
          edges.push({ x: x, y: y + t * cellH });
        }

        // Draw lines between pairs of edge crossings
        if (edges.length >= 2) {
          elements.push(
            <line key={`contour-${ti}-${r}-${c}`}
              x1={edges[0].x} y1={edges[0].y}
              x2={edges[1].x} y2={edges[1].y}
              stroke={GOLD}
              strokeWidth={0.5 + ti * 0.3}
              opacity={0.2 + ti * 0.15}
            />
          );
          if (edges.length === 4) {
            elements.push(
              <line key={`contour-${ti}-${r}-${c}-b`}
                x1={edges[2].x} y1={edges[2].y}
                x2={edges[3].x} y2={edges[3].y}
                stroke={GOLD}
                strokeWidth={0.5 + ti * 0.3}
                opacity={0.2 + ti * 0.15}
              />
            );
          }
        }
      }
    }
  });

  // Elevation labels
  elements.push(
    <text key="elev-low" x={padL} y={H - 2} fill={GREY} fontSize="7" fontFamily="Inconsolata, monospace">
      low
    </text>,
    <text key="elev-high" x={W - padL} y={H - 2} textAnchor="end" fill={GOLD} fontSize="7" fontFamily="Inconsolata, monospace">
      high
    </text>,
    <text key="grid-label" x={W / 2} y={H - 2} textAnchor="middle" fill={GREY_MID} fontSize="6" fontFamily="Inconsolata, monospace">
      8x8 embedding heightmap
    </text>
  );

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      {elements}
    </svg>
  );
}
