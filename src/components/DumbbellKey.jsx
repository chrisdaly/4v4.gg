import React from "react";
import { chartColors } from "../lib/design-tokens";

/**
 * How to read the dumbbell charts.
 *
 * Both directions are drawn, because a falling row puts the 4v4 dot on the
 * left and that is the thing a reader gets wrong. The line always starts at
 * the solo value and the arrow always points at the 4v4 one, so the colours
 * stay fixed whichever way the row runs.
 *
 * The number is named too: it is a change in share, in percentage points,
 * not a percentage change.
 */

const SOLO = chartColors.blue;
const FOUR = chartColors.gold;

function Example({ y, solo, four, value, label }) {
  const up = four > solo;
  const colour = up ? FOUR : SOLO;
  return (
    <g>
      <line
        x1={solo}
        x2={four + (up ? -13 : 13)}
        y1={y}
        y2={y}
        stroke={colour}
        strokeOpacity={0.55}
        strokeWidth={2}
        markerEnd={up ? "url(#dk-up)" : "url(#dk-down)"}
      />
      <circle cx={solo} cy={y} r={4.5} fill={SOLO} stroke="rgba(0,0,0,0.45)" strokeWidth={2} />
      <circle cx={four} cy={y} r={4.5} fill={FOUR} stroke="rgba(0,0,0,0.45)" strokeWidth={2} />
      <text x={Math.max(solo, four) + 14} y={y} dy="0.32em" className="dk-value" fill={colour}>
        {value}
      </text>
      <text x={Math.max(solo, four) + 58} y={y} dy="0.32em" className="dk-label">
        {label}
      </text>
    </g>
  );
}

export default function DumbbellKey({ unit = "hero picks" }) {
  return (
    <div className="dk">
      <div className="dk-legend">
        <span className="dk-key"><span className="dk-swatch" style={{ background: SOLO }} /> solo</span>
        <span className="dk-key"><span className="dk-swatch" style={{ background: FOUR }} /> 4v4</span>
      </div>

      <svg viewBox="0 0 440 62" width="440" height="62" role="img" className="dk-svg">
        <title>
          How to read the chart: the line runs from the solo value to the 4v4 value, and the
          arrow points at 4v4.
        </title>
        <defs>
          <marker id="dk-up" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M0,0 L8,4 L0,8 z" fill={FOUR} />
          </marker>
          <marker id="dk-down" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M0,0 L8,4 L0,8 z" fill={SOLO} />
          </marker>
        </defs>

        <Example y={16} solo={14} four={104} value="+3.2" label="picked more in 4v4" />
        <Example y={46} solo={104} four={14} value="-7.1" label="picked less in 4v4" />
      </svg>

      <p className="dk-note">
        Each dot is that mode&rsquo;s share of all {unit}. The number is the gap between the two, in
        percentage points.
      </p>
    </div>
  );
}
