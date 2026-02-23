import React from "react";
import { GOLD, GREEN, GREY, GREY_MID, safeMax, smoothPath } from "../vizUtils";

/**
 * HeartbeatEcg — ECG trace with one complex per action type.
 * Each "heartbeat" complex shape is modulated by the action type's frequency.
 * APM controls baseline rate, hotkey intensity controls amplitude.
 */
export default function HeartbeatEcg({ segments }) {
  const W = 300, H = 120;
  const { action = Array(6).fill(0), apm = [0, 0, 0], hotkey = Array(20).fill(0) } = segments || {};

  const maxAction = safeMax(action);
  const baselineY = H / 2;
  const amplitude = 20 + (apm[2] || 0) * 25; // burst controls amplitude
  const hkIntensity = hotkey.slice(0, 10).reduce((s, v) => s + v, 0);

  const points = [];
  const complexWidth = (W - 40) / action.length;

  action.forEach((v, i) => {
    const startX = 20 + i * complexWidth;
    const strength = v / maxAction;

    // Flat baseline before complex
    points.push({ x: startX, y: baselineY });
    points.push({ x: startX + complexWidth * 0.15, y: baselineY });

    // P wave (small bump)
    points.push({ x: startX + complexWidth * 0.2, y: baselineY - strength * amplitude * 0.2 });
    points.push({ x: startX + complexWidth * 0.25, y: baselineY });

    // QRS complex (sharp spike)
    points.push({ x: startX + complexWidth * 0.3, y: baselineY + strength * amplitude * 0.15 }); // Q dip
    points.push({ x: startX + complexWidth * 0.35, y: baselineY - strength * amplitude }); // R peak
    points.push({ x: startX + complexWidth * 0.4, y: baselineY + strength * amplitude * 0.3 }); // S dip
    points.push({ x: startX + complexWidth * 0.45, y: baselineY });

    // T wave (broad bump)
    points.push({ x: startX + complexWidth * 0.55, y: baselineY - strength * amplitude * 0.25 });
    points.push({ x: startX + complexWidth * 0.65, y: baselineY });

    // Flat after
    points.push({ x: startX + complexWidth * 0.85, y: baselineY });
  });

  // Build path manually with straight lines for sharp ECG look
  let pathD = "";
  points.forEach((p, i) => {
    pathD += `${i === 0 ? "M" : "L"} ${p.x} ${p.y} `;
  });

  // Grid lines
  const gridLines = [];
  for (let y = 20; y < H - 10; y += 20) {
    gridLines.push(
      <line key={`gh-${y}`} x1={15} y1={y} x2={W - 15} y2={y}
        stroke={GREY_MID} strokeWidth="0.3" />
    );
  }
  for (let x = 20; x < W; x += 20) {
    gridLines.push(
      <line key={`gv-${x}`} x1={x} y1={10} x2={x} y2={H - 15}
        stroke={GREY_MID} strokeWidth="0.3" />
    );
  }

  // Action type labels
  const labels = ["R-CLK", "ABL", "BLD", "ITM", "SEL", "ASN"];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      {gridLines}
      {/* Baseline */}
      <line x1={15} y1={baselineY} x2={W - 15} y2={baselineY}
        stroke={GREY_MID} strokeWidth="0.5" strokeDasharray="4,4" />
      {/* ECG trace */}
      <path d={pathD} fill="none" stroke={GREEN} strokeWidth="1.5" strokeLinejoin="round" />
      {/* Action labels */}
      {action.map((v, i) => (
        <text key={`al-${i}`}
          x={20 + i * complexWidth + complexWidth / 2}
          y={H - 3}
          textAnchor="middle" fill={GREY} fontSize="5.5" fontFamily="Inconsolata, monospace"
        >
          {labels[i]}
        </text>
      ))}
      {/* Heart rate label */}
      <text x={W - 15} y={14} textAnchor="end" fill={GREEN} fontSize="7" fontFamily="Inconsolata, monospace">
        {(60 + (apm[0] || 0) * 140).toFixed(0)} BPM
      </text>
    </svg>
  );
}
