import React from "react";

const GOLD = "#fcdb33";
const GOLD_DIM = "#b89a1e";

const RACE_COLORS = {
  Human: "#4a9eff",
  Orc: "#f87171",
  "Night Elf": "#4ade80",
  Undead: "#c084fc",
  Random: "#fcdb33",
};

/**
 * PlayerGlyph — a small radial glyph encoding a player's playstyle.
 *
 * Visual mappings:
 *   - Spoke count = number of active control groups
 *   - Spoke length = relative usage of each group
 *   - Overall scale = replay count (confidence)
 *   - Fill color = race
 *   - Center dot brightness = APM
 *   - Rotation offset = derived from group indices (visual variety)
 */
export default function PlayerGlyph({
  cx, cy, glyph, race, replayCount = 1,
  baseR = 12, isHighlighted = false, isHovered = false,
}) {
  if (!glyph || !glyph.hotkey) {
    const r = isHovered ? 5.5 : isHighlighted ? 5 : 3.5;
    return (
      <circle cx={cx} cy={cy} r={r}
        fill={GOLD} opacity={isHighlighted ? 0.9 : 0.4}
        stroke={isHighlighted ? "#fff" : GOLD_DIM}
        strokeWidth={isHighlighted ? 1.5 : 0.5}
        pointerEvents="none" />
    );
  }

  const hotkey = glyph.hotkey;
  const apm = glyph.apm || 0;
  const color = RACE_COLORS[race] || GOLD;

  // Active groups: any with usage > 5% of max
  const maxUsage = Math.max(...hotkey, 0.01);
  const active = hotkey
    .map((val, i) => ({ group: i, usage: val }))
    .filter(g => g.usage > maxUsage * 0.05)
    .sort((a, b) => b.usage - a.usage);

  if (active.length === 0) {
    const r = isHovered ? 5 : 3.5;
    return (
      <circle cx={cx} cy={cy} r={r}
        fill={color} opacity={0.4}
        pointerEvents="none" />
    );
  }

  // Scale: base size modulated by replay confidence
  const confidence = Math.min(replayCount / 10, 1);
  const R = baseR * (0.6 + confidence * 0.4);
  const hoverScale = isHovered ? 1.4 : isHighlighted ? 1.15 : 1;
  const finalR = R * hoverScale;

  // Opacity from APM
  const apmAlpha = 0.35 + Math.min(apm, 1) * 0.45;

  // Rotation offset: sum of active group indices → unique angle per player
  const rotOffset = active.reduce((s, g) => s + g.group * 0.7, 0);

  const els = [];
  const angleStep = (Math.PI * 2) / active.length;
  const spokePoints = [];

  for (let i = 0; i < active.length; i++) {
    const angle = i * angleStep - Math.PI / 2 + rotOffset;
    const lengthFrac = active[i].usage / maxUsage;
    const spokeLen = finalR * (0.35 + lengthFrac * 0.65);

    const tx = cx + Math.cos(angle) * spokeLen;
    const ty = cy + Math.sin(angle) * spokeLen;
    spokePoints.push({ x: tx, y: ty, lengthFrac });
  }

  // Filled shape: smooth closed curve through tips
  if (spokePoints.length >= 3) {
    // Build a smooth closed path using cubic bezier through each point
    let d = "";
    const n = spokePoints.length;
    for (let i = 0; i < n; i++) {
      const curr = spokePoints[i];
      const next = spokePoints[(i + 1) % n];
      const prev = spokePoints[(i - 1 + n) % n];
      const nextNext = spokePoints[(i + 2) % n];

      // Catmull-Rom to cubic bezier control points
      const tension = 0.3;
      const cp1x = curr.x + (next.x - prev.x) * tension;
      const cp1y = curr.y + (next.y - prev.y) * tension;
      const cp2x = next.x - (nextNext.x - curr.x) * tension;
      const cp2y = next.y - (nextNext.y - curr.y) * tension;

      if (i === 0) d += `M ${curr.x} ${curr.y} `;
      d += `C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y} `;
    }

    els.push(
      <path key="shape" d={d}
        fill={color}
        opacity={apmAlpha * 0.15}
        stroke={color}
        strokeWidth={isHighlighted ? 1 : 0.6}
        strokeOpacity={apmAlpha * 0.5}
        strokeLinejoin="round"
        pointerEvents="none" />
    );
  } else if (spokePoints.length === 2) {
    // Two spokes: draw a thin lens/leaf shape
    const [a, b] = spokePoints;
    const midX = (a.x + b.x) / 2;
    const midY = (a.y + b.y) / 2;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const bulge = finalR * 0.2;
    const nx = -dy, ny = dx;
    const len = Math.sqrt(nx * nx + ny * ny) || 1;

    els.push(
      <path key="shape"
        d={`M ${a.x} ${a.y} Q ${midX + (nx / len) * bulge} ${midY + (ny / len) * bulge} ${b.x} ${b.y} Q ${midX - (nx / len) * bulge} ${midY - (ny / len) * bulge} ${a.x} ${a.y}`}
        fill={color}
        opacity={apmAlpha * 0.15}
        stroke={color}
        strokeWidth={0.6}
        strokeOpacity={apmAlpha * 0.5}
        pointerEvents="none" />
    );
  }

  // Spoke lines + tip dots
  for (let i = 0; i < spokePoints.length; i++) {
    const p = spokePoints[i];
    els.push(
      <line key={`spoke-${i}`}
        x1={cx} y1={cy} x2={p.x} y2={p.y}
        stroke={color}
        strokeWidth={isHighlighted ? 1.2 : 0.7}
        opacity={apmAlpha * (0.4 + p.lengthFrac * 0.5)}
        strokeLinecap="round"
        pointerEvents="none" />
    );

    const tipR = (0.8 + p.lengthFrac * 1.2) * hoverScale;
    els.push(
      <circle key={`tip-${i}`}
        cx={p.x} cy={p.y} r={tipR}
        fill={color}
        opacity={apmAlpha * 0.7}
        pointerEvents="none" />
    );
  }

  // Center dot
  els.push(
    <circle key="center"
      cx={cx} cy={cy}
      r={isHighlighted ? 2 : 1.5}
      fill={color}
      opacity={apmAlpha * 0.9}
      pointerEvents="none" />
  );

  // Highlight ring
  if (isHighlighted) {
    els.push(
      <circle key="highlight-ring"
        cx={cx} cy={cy}
        r={finalR + 3}
        fill="none" stroke="#fff"
        strokeWidth="1"
        opacity="0.4"
        pointerEvents="none" />
    );
  }

  return <g pointerEvents="none">{els}</g>;
}
