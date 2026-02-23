import React, { useId } from "react";
import { GOLD, GOLD_DIM, GREEN, GREY, GREY_MID, safeMax } from "../vizUtils";

/**
 * Equalizer — Vertical bars for 7 tempo bins + a VU meter for APM.
 * Like a mixing console channel strip.
 */
export default function Equalizer({ segments }) {
  const W = 260, H = 140;
  const id = useId();
  const { tempo = Array(7).fill(0), apm = [0, 0, 0], intensity = [0, 0] } = segments || {};

  const maxTempo = safeMax(tempo);
  const barW = 20;
  const barGap = 6;
  const startX = 30;
  const barArea = H - 40;

  const tempoLabels = ["<50", "50", "100", "200", "500", "1k", "2k+"];

  // VU meter on the right
  const vuX = startX + 7 * (barW + barGap) + 20;
  const vuH = barArea;
  const vuY = 16;
  const apmLevel = Math.min(apm[0] || 0, 1);
  const burstLevel = Math.min(apm[2] || 0, 1);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      <defs>
        <linearGradient id={`eq-grad-${id}`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={GREEN} />
          <stop offset="60%" stopColor={GOLD} />
          <stop offset="90%" stopColor="#f87171" />
        </linearGradient>
      </defs>

      {/* EQ bars */}
      {tempo.map((v, i) => {
        const h = (v / maxTempo) * barArea;
        const x = startX + i * (barW + barGap);
        const y = 16 + barArea - h;

        return (
          <g key={i}>
            {/* Track */}
            <rect x={x} y={16} width={barW} height={barArea} fill={GREY_MID} rx="2" opacity="0.3" />
            {/* Fill — segmented */}
            {Array.from({ length: Math.ceil(h / 4) }, (_, j) => {
              const segY = 16 + barArea - (j + 1) * 4;
              if (segY < 16) return null;
              const segH = Math.min(3, 16 + barArea - segY);
              const t = j / Math.ceil(barArea / 4);
              return (
                <rect
                  key={j}
                  x={x + 1}
                  y={Math.max(segY, y)}
                  width={barW - 2}
                  height={segY >= y ? segH : 0}
                  fill={t > 0.85 ? "#f87171" : t > 0.6 ? GOLD : GREEN}
                  rx="0.5"
                />
              );
            })}
            {/* Label */}
            <text
              x={x + barW / 2}
              y={H - 4}
              textAnchor="middle"
              fill={GREY}
              fontSize="6"
              fontFamily="Inconsolata, monospace"
            >
              {tempoLabels[i]}
            </text>
          </g>
        );
      })}

      {/* VU Meter */}
      <rect x={vuX} y={vuY} width={12} height={vuH} fill={GREY_MID} rx="2" opacity="0.3" />
      <rect
        x={vuX + 2}
        y={vuY + vuH * (1 - apmLevel)}
        width={8}
        height={vuH * apmLevel}
        fill={`url(#eq-grad-${id})`}
        rx="1"
      />
      {/* Burst marker */}
      <line
        x1={vuX - 2}
        y1={vuY + vuH * (1 - burstLevel)}
        x2={vuX + 14}
        y2={vuY + vuH * (1 - burstLevel)}
        stroke={GOLD}
        strokeWidth="1.5"
      />
      <text
        x={vuX + 6}
        y={H - 4}
        textAnchor="middle"
        fill={GREY}
        fontSize="6"
        fontFamily="Inconsolata, monospace"
      >
        VU
      </text>

      {/* Labels */}
      <text x={startX} y={10} fill={GREY} fontSize="7" fontFamily="Inconsolata, monospace">
        TEMPO BINS (ms)
      </text>
    </svg>
  );
}
