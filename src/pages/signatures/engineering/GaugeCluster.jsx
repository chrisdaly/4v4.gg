import React from "react";
import { GOLD, GOLD_DIM, GREEN, RED, GREY, GREY_MID, polarToCart, clamp } from "../vizUtils";

/**
 * GaugeCluster — Dashboard gauges for APM, Intensity, and Tempo peak.
 * Three analog gauges like a car dashboard.
 */

function Gauge({ cx, cy, r, value, max, label, color, unit }) {
  const startAngle = Math.PI * 0.75;
  const endAngle = Math.PI * 2.25;
  const angleRange = endAngle - startAngle;
  const normalizedVal = clamp(value / (max || 1), 0, 1);
  const needleAngle = startAngle + normalizedVal * angleRange;

  // Tick marks
  const ticks = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const angle = startAngle + t * angleRange;
    const inner = polarToCart(cx, cy, r - 4, angle);
    const outer = polarToCart(cx, cy, r, angle);
    const isMajor = i % 5 === 0;
    ticks.push(
      <line
        key={i}
        x1={inner.x}
        y1={inner.y}
        x2={outer.x}
        y2={outer.y}
        stroke={isMajor ? GREY : GREY_MID}
        strokeWidth={isMajor ? 1 : 0.5}
      />
    );
    if (isMajor) {
      const labelPt = polarToCart(cx, cy, r - 10, angle);
      ticks.push(
        <text
          key={`l-${i}`}
          x={labelPt.x}
          y={labelPt.y}
          textAnchor="middle"
          dominantBaseline="central"
          fill={GREY}
          fontSize="6"
          fontFamily="Inconsolata, monospace"
        >
          {Math.round((t * max))}
        </text>
      );
    }
  }

  // Arc background
  const arcStart = polarToCart(cx, cy, r, startAngle);
  const arcEnd = polarToCart(cx, cy, r, endAngle);
  const arcPath = `M ${arcStart.x} ${arcStart.y} A ${r} ${r} 0 1 1 ${arcEnd.x} ${arcEnd.y}`;

  // Colored arc up to value
  const valEnd = polarToCart(cx, cy, r, needleAngle);
  const largeArc = normalizedVal > 0.5 ? 1 : 0;
  const valPath = `M ${arcStart.x} ${arcStart.y} A ${r} ${r} 0 ${largeArc} 1 ${valEnd.x} ${valEnd.y}`;

  // Needle
  const needleTip = polarToCart(cx, cy, r - 6, needleAngle);

  return (
    <g>
      <path d={arcPath} fill="none" stroke={GREY_MID} strokeWidth="3" strokeLinecap="round" />
      <path d={valPath} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" opacity="0.8" />
      {ticks}
      <line
        x1={cx}
        y1={cy}
        x2={needleTip.x}
        y2={needleTip.y}
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx={cx} cy={cy} r="3" fill={GREY_MID} />
      <circle cx={cx} cy={cy} r="1.5" fill={color} />
      <text
        x={cx}
        y={cy + r * 0.45}
        textAnchor="middle"
        fill={GREY}
        fontSize="7"
        fontFamily="Inconsolata, monospace"
      >
        {label}
      </text>
      <text
        x={cx}
        y={cy + r * 0.45 + 10}
        textAnchor="middle"
        fill={color}
        fontSize="9"
        fontFamily="Inconsolata, monospace"
        fontWeight="bold"
      >
        {value.toFixed(2)}{unit || ""}
      </text>
    </g>
  );
}

export default function GaugeCluster({ segments }) {
  const W = 300, H = 130;
  const { apm = [0, 0, 0], intensity = [0, 0], tempo = Array(7).fill(0) } = segments || {};

  const peakTempo = Math.max(...tempo);
  const gaugeR = 36;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      <Gauge cx={60} cy={70} r={gaugeR} value={apm[0] || 0} max={1} label="APM" color={GREEN} />
      <Gauge cx={150} cy={70} r={gaugeR} value={intensity[0] || 0} max={1} label="HK INT" color={GOLD} />
      <Gauge cx={240} cy={70} r={gaugeR} value={peakTempo} max={1} label="TEMPO" color={RED} />
    </svg>
  );
}
