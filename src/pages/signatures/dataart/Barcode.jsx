import React from "react";
import { flattenSegments, GOLD, GREY, GREY_MID, lerpColor } from "../vizUtils";

/**
 * Barcode — All 63 handcrafted dimensions as colored vertical bars.
 * Higher values are gold, lower values are dark. Width encodes nothing — pure 1D scan.
 */
export default function Barcode({ segments }) {
  const W = 300, H = 80;
  const dims = flattenSegments(segments);
  const min = Math.min(...dims);
  const max = Math.max(...dims);
  const range = max - min || 1;
  const barW = (W - 16) / dims.length;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      {dims.map((v, i) => {
        const t = (v - min) / range;
        const color = lerpColor("#111111", GOLD, t);
        const h = 10 + t * (H - 28);
        return (
          <rect
            key={i}
            x={8 + i * barW}
            y={(H - 12) / 2 - h / 2 + 2}
            width={Math.max(barW - 0.4, 0.5)}
            height={h}
            fill={color}
            opacity={0.6 + t * 0.4}
            rx="0.5"
          />
        );
      })}
      {/* Segment separators */}
      {[6, 9, 29, 36, 38, 48].map((idx) => (
        <line
          key={`sep-${idx}`}
          x1={8 + idx * barW}
          y1={4}
          x2={8 + idx * barW}
          y2={H - 10}
          stroke={GREY_MID}
          strokeWidth="0.5"
          strokeDasharray="2,2"
        />
      ))}
      <text x={8} y={H - 1} fill={GREY} fontSize="7" fontFamily="Inconsolata, monospace">
        63 dims
      </text>
      <text x={W - 8} y={H - 1} textAnchor="end" fill={GREY} fontSize="7" fontFamily="Inconsolata, monospace">
        ACT · APM · HK · TMP · INT · TRN · RHY
      </text>
    </svg>
  );
}
