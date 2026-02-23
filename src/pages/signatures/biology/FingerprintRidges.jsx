import React from "react";
import { GOLD, GOLD_DIM, GREY, GREY_MID, safeMax, seededRandom, hashCode } from "../vizUtils";

/**
 * FingerprintRidges — Loop/whorl/arch ridge patterns modulated by data.
 * Action types control ridge flow direction, APM controls ridge density,
 * transitions create ridge bifurcations (minutiae).
 */
export default function FingerprintRidges({ segments, battleTag }) {
  const W = 180, H = 220;
  const cx = W / 2, cy = H / 2;
  const { action = Array(6).fill(0), apm = [0, 0, 0], transitions = Array(10).fill(0) } = segments || {};

  const rand = seededRandom(hashCode(battleTag || "default"));
  const maxAction = safeMax(action);
  const elements = [];

  // Determine ridge pattern type from action distribution
  const dominantAction = action.indexOf(Math.max(...action));
  // 0-1: loop, 2-3: whorl, 4-5: arch
  const patternType = dominantAction < 2 ? "loop" : dominantAction < 4 ? "whorl" : "arch";

  // Ridge density from APM (more APM = tighter ridges)
  const ridgeCount = 12 + Math.round((apm[0] || 0) * 18);
  const ridgeSpacing = 3 + (1 - (apm[0] || 0)) * 2;

  // Fingerprint oval boundary
  const ovalRx = 65;
  const ovalRy = 85;
  elements.push(
    <ellipse key="boundary" cx={cx} cy={cy} rx={ovalRx} ry={ovalRy}
      fill="none" stroke={GREY_MID} strokeWidth="1" opacity="0.3" />
  );

  // Generate ridges
  for (let r = 0; r < ridgeCount; r++) {
    const t = r / ridgeCount;
    const offset = (r - ridgeCount / 2) * ridgeSpacing;
    const points = [];
    const numPts = 20;

    for (let i = 0; i < numPts; i++) {
      const s = i / (numPts - 1); // 0 to 1 along ridge
      let x, y;

      if (patternType === "loop") {
        // Loop pattern — concentric U shapes
        const loopW = (ovalRx - 10) * (1 - Math.abs(t - 0.5) * 1.5);
        x = cx + (s - 0.5) * loopW * 1.6;
        y = cy + offset + Math.pow(Math.abs(s - 0.5) * 2, 2) * 20 * (t < 0.5 ? 1 : -1);
      } else if (patternType === "whorl") {
        // Whorl pattern — spiral curves
        const angle = s * Math.PI * 1.5 + t * Math.PI * 2;
        const spiralR = 15 + t * 55;
        x = cx + Math.cos(angle) * spiralR * (0.6 + s * 0.4);
        y = cy + Math.sin(angle) * spiralR * (0.5 + s * 0.5);
      } else {
        // Arch pattern — curved horizontal lines
        x = cx + (s - 0.5) * (ovalRx * 1.6);
        const archHeight = Math.sin(s * Math.PI) * (25 - Math.abs(offset) * 0.4);
        y = cy + offset - archHeight;
      }

      // Add micro-wobble based on action data
      const actionIdx = Math.floor(s * action.length) % action.length;
      const wobble = (action[actionIdx] / maxAction) * 2;
      x += (rand() - 0.5) * wobble;
      y += (rand() - 0.5) * wobble;

      // Clip to oval
      const dx = (x - cx) / ovalRx;
      const dy = (y - cy) / ovalRy;
      if (dx * dx + dy * dy > 0.85) continue;

      points.push({ x, y });
    }

    if (points.length < 3) continue;

    // Build smooth path
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx1 = prev.x + (curr.x - prev.x) * 0.3;
      const cpx2 = curr.x - (curr.x - prev.x) * 0.3;
      d += ` C ${cpx1} ${prev.y}, ${cpx2} ${curr.y}, ${curr.x} ${curr.y}`;
    }

    elements.push(
      <path key={`ridge-${r}`} d={d}
        fill="none" stroke={GOLD_DIM} strokeWidth={0.8 + t * 0.4}
        opacity={0.25 + t * 0.25} strokeLinecap="round" />
    );
  }

  // Minutiae markers from transitions (ridge endings and bifurcations)
  const maxTrans = safeMax(transitions);
  transitions.forEach((v, i) => {
    if (v < 0.03) return;
    const angle = (i / transitions.length) * Math.PI * 2;
    const dist = 20 + rand() * 40;
    const mx = cx + Math.cos(angle) * dist;
    const my = cy + Math.sin(angle) * dist * 1.2;
    const dx2 = (mx - cx) / ovalRx;
    const dy2 = (my - cy) / ovalRy;
    if (dx2 * dx2 + dy2 * dy2 > 0.7) return;

    elements.push(
      <circle key={`min-${i}`} cx={mx} cy={my} r={1.5 + (v / maxTrans) * 2}
        fill="none" stroke={GOLD} strokeWidth="0.8"
        opacity={0.3 + (v / maxTrans) * 0.4} />
    );
  });

  // Pattern label
  elements.push(
    <text key="pattern-label" x={cx} y={H - 6} textAnchor="middle"
      fill={GREY} fontSize="7" fontFamily="Inconsolata, monospace" opacity="0.6">
      {patternType.toUpperCase()}
    </text>
  );

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      {elements}
    </svg>
  );
}
