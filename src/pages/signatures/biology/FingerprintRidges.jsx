import React from "react";
import { GOLD, GOLD_DIM, GREY, GREY_MID, safeMax, seededRandom, hashCode } from "../vizUtils";

/**
 * FingerprintRidges — Control-group fingerprint.
 * Each of the 10 control groups (hotkey[0-9]) maps to a horizontal zone.
 * Ridge density in each zone = how much that group is used.
 * Assignment frequency (hotkey[10-19]) adds diamond minutiae markers.
 * Overall ridge tightness modulated by APM.
 */
export default function FingerprintRidges({ segments, battleTag }) {
  const W = 180, H = 240;
  const cx = W / 2, cy = H / 2 - 10;
  const { hotkey = Array(20).fill(0), apm = [0, 0, 0] } = segments || {};

  const rand = seededRandom(hashCode(battleTag || "default"));
  const elements = [];

  // hotkey[0-9] = usage distribution per group, hotkey[10-19] = assignment distribution
  const usage = hotkey.slice(0, 10);
  const assigns = hotkey.slice(10, 20);
  const maxUsage = safeMax(usage);
  const maxAssign = safeMax(assigns);

  // Find which groups are active (non-trivial usage)
  const activeGroups = usage.map((v, i) => ({ group: i, usage: v, assign: assigns[i] || 0 }))
    .filter(g => g.usage > 0.01);

  // Fingerprint oval boundary
  const ovalRx = 65;
  const ovalRy = 85;
  elements.push(
    <ellipse key="boundary" cx={cx} cy={cy} rx={ovalRx} ry={ovalRy}
      fill="none" stroke={GREY_MID} strokeWidth="1" opacity="0.3" />
  );

  // Ridge density from APM (more APM = tighter ridges)
  const apmFactor = apm[0] || 0;
  const baseRidgeCount = 10 + Math.round(apmFactor * 15);

  // Divide the oval into zones for each active group
  // If no active groups, show empty fingerprint
  if (activeGroups.length === 0) {
    elements.push(
      <text key="empty" x={cx} y={cy} textAnchor="middle" fill={GREY}
        fontSize="8" fontFamily="Inconsolata, monospace" opacity="0.5">
        No hotkey data
      </text>
    );
    return <svg viewBox={`0 0 ${W} ${H}`} width="100%">{elements}</svg>;
  }

  // Allocate zones proportional to usage — each group gets a vertical band
  const totalUsage = activeGroups.reduce((s, g) => s + g.usage, 0) || 1;
  const innerTop = cy - ovalRy + 12;
  const innerBot = cy + ovalRy - 12;
  const totalHeight = innerBot - innerTop;

  let yOffset = innerTop;
  for (const grp of activeGroups) {
    const zoneFrac = grp.usage / totalUsage;
    const zoneHeight = totalHeight * zoneFrac;
    const zoneCenter = yOffset + zoneHeight / 2;

    // Number of ridges in this zone proportional to usage * apm
    const ridgeCount = Math.max(2, Math.round(baseRidgeCount * zoneFrac));
    const ridgeSpacing = zoneHeight / (ridgeCount + 1);

    for (let r = 0; r < ridgeCount; r++) {
      const ry = yOffset + ridgeSpacing * (r + 1);
      const points = [];
      const numPts = 18;

      for (let i = 0; i < numPts; i++) {
        const s = i / (numPts - 1);
        // Ridge width narrows near oval edges
        const dy = (ry - cy) / ovalRy;
        const maxWidth = Math.sqrt(Math.max(0, 1 - dy * dy)) * ovalRx * 0.9;
        let x = cx + (s - 0.5) * maxWidth * 2;
        let y = ry;

        // Gentle wave modulated by group index for visual variety
        const wave = Math.sin(s * Math.PI * (2 + grp.group * 0.3)) * (1.5 + grp.usage / maxUsage * 2);
        y += wave;

        // Micro-wobble
        x += (rand() - 0.5) * 1.2;
        y += (rand() - 0.5) * 0.8;

        // Clip to oval
        const dx2 = (x - cx) / ovalRx;
        const dy2 = (y - cy) / ovalRy;
        if (dx2 * dx2 + dy2 * dy2 > 0.88) continue;

        points.push({ x, y });
      }

      if (points.length < 3) continue;

      let d = `M ${points[0].x} ${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const cpx1 = prev.x + (curr.x - prev.x) * 0.3;
        const cpx2 = curr.x - (curr.x - prev.x) * 0.3;
        d += ` C ${cpx1} ${prev.y}, ${cpx2} ${curr.y}, ${curr.x} ${curr.y}`;
      }

      const intensity = grp.usage / maxUsage;
      elements.push(
        <path key={`ridge-${grp.group}-${r}`} d={d}
          fill="none" stroke={GOLD_DIM} strokeWidth={0.6 + intensity * 0.6}
          opacity={0.2 + intensity * 0.35} strokeLinecap="round" />
      );
    }

    // Diamond minutiae for assignment hotkeys
    if (grp.assign > 0.02) {
      const numDiamonds = Math.min(4, Math.round((grp.assign / maxAssign) * 4));
      for (let d = 0; d < numDiamonds; d++) {
        const dx = cx + (rand() - 0.5) * ovalRx * 1.2;
        const dy = yOffset + rand() * zoneHeight;
        const checkX = (dx - cx) / ovalRx;
        const checkY = (dy - cy) / ovalRy;
        if (checkX * checkX + checkY * checkY > 0.75) continue;

        const sz = 2 + (grp.assign / maxAssign) * 1.5;
        elements.push(
          <polygon key={`dia-${grp.group}-${d}`}
            points={`${dx},${dy - sz} ${dx + sz},${dy} ${dx},${dy + sz} ${dx - sz},${dy}`}
            fill="none" stroke={GOLD} strokeWidth="0.6"
            opacity={0.25 + (grp.assign / maxAssign) * 0.35} />
        );
      }
    }

    // Side label for this zone
    const labelY = zoneCenter;
    const labelDy = (labelY - cy) / ovalRy;
    if (Math.abs(labelDy) < 0.85) {
      elements.push(
        <text key={`zlabel-${grp.group}`} x={cx + ovalRx + 6} y={labelY + 1}
          textAnchor="start" fill={GREY} fontSize="6"
          fontFamily="Inconsolata, monospace" opacity="0.45">
          {grp.group}
        </text>
      );
    }

    yOffset += zoneHeight;
  }

  // ── Legend ──
  const legendY = H - 30;
  const legItems = [
    { type: "ridge", label: "zone = group usage" },
    { type: "diamond", label: "re-assign" },
    { type: "density", label: "density = APM" },
  ];

  let lx = 12;
  legItems.forEach((item, i) => {
    const ly = legendY + (i < 2 ? 0 : 12);
    if (i === 2) lx = 12;

    if (item.type === "ridge") {
      elements.push(
        <line key="leg-ridge" x1={lx} y1={ly} x2={lx + 12} y2={ly}
          stroke={GOLD_DIM} strokeWidth="1" opacity="0.5" />
      );
      lx += 16;
    } else if (item.type === "diamond") {
      const sz = 3;
      const dx = lx + 4, dy = ly;
      elements.push(
        <polygon key="leg-dia"
          points={`${dx},${dy - sz} ${dx + sz},${dy} ${dx},${dy + sz} ${dx - sz},${dy}`}
          fill="none" stroke={GOLD} strokeWidth="0.6" opacity="0.5" />
      );
      lx += 14;
    } else if (item.type === "density") {
      // Two lines, one loose one tight
      elements.push(
        <line key="leg-d1" x1={lx} y1={ly - 1.5} x2={lx + 6} y2={ly - 1.5}
          stroke={GOLD_DIM} strokeWidth="0.6" opacity="0.35" />
      );
      elements.push(
        <line key="leg-d2" x1={lx} y1={ly + 1.5} x2={lx + 6} y2={ly + 1.5}
          stroke={GOLD_DIM} strokeWidth="0.6" opacity="0.35" />
      );
      lx += 10;
    }

    elements.push(
      <text key={`leg-t-${i}`} x={lx} y={ly + 1}
        textAnchor="start" dominantBaseline="central"
        fill={GREY} fontSize="6.5" fontFamily="Inconsolata, monospace" opacity="0.5">
        {item.label}
      </text>
    );
    lx += item.label.length * 4.2 + 10;
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      {elements}
    </svg>
  );
}
