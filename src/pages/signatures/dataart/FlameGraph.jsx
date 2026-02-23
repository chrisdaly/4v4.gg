import React from "react";
import { GOLD, GOLD_DIM, RED, GREY, GREY_MID, lerpColor, safeMax } from "../vizUtils";

/**
 * FlameGraph — Hierarchical stacked bars.
 * Bottom layer: 6 action types (widest).
 * Middle layer: hotkey groups within each action type (narrower).
 * Top layer: transitions (narrowest).
 * Height = value intensity. Classic flame graph colors.
 */
export default function FlameGraph({ segments }) {
  const W = 300, H = 140;
  const { action = Array(6).fill(0), hotkey = Array(20).fill(0), transitions = Array(10).fill(0) } = segments || {};

  const padL = 8, padR = 8, padB = 18;
  const barArea = W - padL - padR;
  const maxH = H - padB - 10;

  const maxAction = safeMax(action);
  const selectFreqs = hotkey.slice(0, 10);
  const maxHK = safeMax(selectFreqs);
  const maxTrans = safeMax(transitions);

  const elements = [];
  const actionTotal = action.reduce((s, v) => s + v, 0) || 1;

  // Layer 1: Action types (bottom)
  let x = padL;
  const layer1Y = H - padB;
  const layer1H = maxH * 0.35;
  const actionLabels = ["R-CLK", "ABL", "BLD", "ITM", "SEL", "ASN"];
  const actionRects = [];

  action.forEach((v, i) => {
    const w = (v / actionTotal) * barArea;
    if (w < 1) { x += w; return; }
    const color = lerpColor("#8b2500", "#ff6b35", v / maxAction);
    actionRects.push({ x, w, i });
    elements.push(
      <rect key={`a-${i}`} x={x} y={layer1Y - layer1H} width={w} height={layer1H}
        fill={color} opacity="0.85" rx="1" />
    );
    if (w > 20) {
      elements.push(
        <text key={`al-${i}`} x={x + w / 2} y={layer1Y - 4}
          textAnchor="middle" fill="#fff" fontSize="6" fontFamily="Inconsolata, monospace" opacity="0.7">
          {actionLabels[i]}
        </text>
      );
    }
    x += w;
  });

  // Layer 2: Hotkey groups (middle) — subdivide across action bars
  const layer2Y = layer1Y - layer1H;
  const layer2H = maxH * 0.35;
  const hkTotal = selectFreqs.reduce((s, v) => s + v, 0) || 1;

  let hx = padL;
  selectFreqs.forEach((v, i) => {
    const w = (v / hkTotal) * barArea;
    if (w < 0.5) { hx += w; return; }
    const h = layer2H * (v / maxHK);
    const color = lerpColor("#cc4400", GOLD, v / maxHK);
    elements.push(
      <rect key={`hk-${i}`} x={hx} y={layer2Y - h} width={w} height={h}
        fill={color} opacity="0.75" rx="1" />
    );
    if (w > 12) {
      elements.push(
        <text key={`hl-${i}`} x={hx + w / 2} y={layer2Y - h + 8}
          textAnchor="middle" fill="#000" fontSize="6" fontFamily="Inconsolata, monospace" fontWeight="bold">
          {i}
        </text>
      );
    }
    hx += w;
  });

  // Layer 3: Transitions (top) — small flame tips
  const layer3Y = layer2Y - layer2H * 0.6;
  const layer3H = maxH * 0.25;
  const transTotal = transitions.reduce((s, v) => s + v, 0) || 1;

  let tx = padL;
  transitions.forEach((v, i) => {
    const w = (v / transTotal) * barArea;
    if (w < 0.5) { tx += w; return; }
    const h = layer3H * (v / maxTrans);
    const color = lerpColor(GOLD_DIM, GOLD, v / maxTrans);
    elements.push(
      <rect key={`tr-${i}`} x={tx} y={layer3Y - h + layer2H * 0.4} width={w} height={h}
        fill={color} opacity="0.6" rx="1" />
    );
    tx += w;
  });

  // Layer labels on right
  const labelX = W - 4;
  elements.push(
    <text key="l1" x={labelX} y={layer1Y - layer1H / 2} textAnchor="end"
      fill={GREY} fontSize="6" fontFamily="Inconsolata, monospace">ACTIONS</text>,
    <text key="l2" x={labelX} y={layer2Y - layer2H * 0.3} textAnchor="end"
      fill={GREY} fontSize="6" fontFamily="Inconsolata, monospace">HOTKEYS</text>,
    <text key="l3" x={labelX} y={layer3Y - layer3H * 0.2 + layer2H * 0.4} textAnchor="end"
      fill={GREY} fontSize="6" fontFamily="Inconsolata, monospace">TRANS</text>
  );

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      {elements}
    </svg>
  );
}
