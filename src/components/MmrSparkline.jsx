import React from "react";

/**
 * MmrSparkline — the shared MMR-over-time trend line (ladder rows, player
 * profile). Hand-rolled SVG; gold by default per the design system.
 *
 * width may be a number or "100%" — the viewBox is logical and the polyline
 * uses a non-scaling stroke, so the line stays crisp at any size.
 * maxPoints: keep only the last N points (null = all).
 */
const VB_W = 100;
const VB_H = 24;

export default function MmrSparkline({ data, width = 80, height = 18, maxPoints = null, stroke = "var(--gold)", strokeWidth = 1.5, className }) {
  const points = maxPoints ? (data || []).slice(-maxPoints) : data || [];
  if (points.length < 2) return null;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const pad = 2;
  const stepX = (VB_W - pad * 2) / (points.length - 1);
  const pts = points
    .map((v, i) => `${(pad + i * stepX).toFixed(2)},${(pad + (1 - (v - min) / range) * (VB_H - pad * 2)).toFixed(2)}`)
    .join(" ");

  return (
    <svg
      className={className}
      width={width}
      height={height}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polyline
        points={pts}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
