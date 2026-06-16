import React, { useState, useRef, useCallback, useMemo } from "react";
import styled from "styled-components";
import { RaceIcon } from "../ui";

const VIEWBOX_W = 1000;
const LABEL_W = 120;
const CHART_W = VIEWBOX_W - LABEL_W;
const ROW_H = 32;
const ROW_GAP = 6;
const TICK_H = 26;

const TYPE_COLORS = {
  cmd:     "#4a9eff",
  instant: "#26c6da",
  hotkey:  "#c8a84b",
  assign:  "#e67e22",
  select:  "#5a5a6a",
  other:   "#333344",
};

const TYPE_LABELS = {
  cmd:     "Command",
  instant: "Instant",
  hotkey:  "Hotkey",
  assign:  "Assign",
  select:  "Select",
  other:   "Other",
};

const TYPES = ["cmd", "instant", "hotkey", "assign", "select", "other"];

const RACE_MAP = {
  0: "random", 1: "human", 2: "orc", 4: "nightelf", 8: "undead",
  Human: "human", Orc: "orc", "Night Elf": "nightelf", Undead: "undead", Random: "random",
};

function formatMs(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

// brushMs / onBrushChange are optional — if provided, brush state is controlled externally
export default function ActionTimeline({ players, durationMs, brushMs: externalBrushMs, onBrushChange }) {
  const svgRef = useRef(null);
  const [dragStart, setDragStart] = useState(null);
  const [dragMode, setDragMode] = useState(null); // 'create' | 'move'
  const [moveOffset, setMoveOffset] = useState(0); // chart-x offset from brush left edge on move start
  const [hoverX, setHoverX] = useState(null);
  const [internalBrush, setInternalBrush] = useState(null); // { x1, x2 } in chart-space coords

  const controlled = onBrushChange != null;

  const visiblePlayers = useMemo(
    () => players.filter((p) => p.timeline?.bins?.length > 0),
    [players]
  );

  const totalH = visiblePlayers.length * (ROW_H + ROW_GAP) + TICK_H + 8;

  const msToX = useCallback((ms) => (ms / durationMs) * CHART_W, [durationMs]);
  const xToMs = useCallback(
    (x) => Math.max(0, Math.min(durationMs, (x / CHART_W) * durationMs)),
    [durationMs]
  );

  const maxDensity = useMemo(() => {
    let max = 1;
    for (const p of visiblePlayers) {
      for (const bin of p.timeline.bins) {
        const t = TYPES.reduce((s, k) => s + (bin[k] || 0), 0);
        if (t > max) max = t;
      }
    }
    return max;
  }, [visiblePlayers]);

  const getChartX = useCallback((e) => {
    const el = svgRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    return (e.clientX - rect.left) * (VIEWBOX_W / rect.width) - LABEL_W;
  }, []);

  const brush = controlled ? null : internalBrush;

  // Always compute brushMs from whichever source is active
  const brushMs = controlled
    ? externalBrushMs
    : brush
    ? { startMs: xToMs(Math.min(brush.x1, brush.x2)), endMs: xToMs(Math.max(brush.x1, brush.x2)) }
    : null;

  // Brush pixel coords for rendering (chart-space, not viewBox-space)
  const brushOverlay = brushMs
    ? { x1: msToX(brushMs.startMs), x2: msToX(brushMs.endMs) }
    : null;

  const isInsideBrush = useCallback((x) => {
    if (!brushOverlay) return false;
    return x >= brushOverlay.x1 && x <= brushOverlay.x2;
  }, [brushOverlay]);

  const emitBrush = useCallback((x1, x2) => {
    const clamped = { x1: Math.max(0, x1), x2: Math.min(CHART_W, x2) };
    if (controlled) {
      onBrushChange({ startMs: xToMs(clamped.x1), endMs: xToMs(clamped.x2) });
    } else {
      setInternalBrush(clamped);
    }
  }, [controlled, onBrushChange, xToMs]);

  const handleMouseDown = useCallback(
    (e) => {
      e.preventDefault();
      const x = getChartX(e);
      setDragStart(x);
      if (brushOverlay && isInsideBrush(x)) {
        // Click inside existing brush → move mode
        setDragMode('move');
        setMoveOffset(x - brushOverlay.x1);
      } else {
        // Click outside → create new brush
        setDragMode('create');
        if (!controlled) setInternalBrush({ x1: x, x2: x });
      }
    },
    [getChartX, brushOverlay, isInsideBrush, controlled]
  );

  const handleMouseMove = useCallback(
    (e) => {
      const x = getChartX(e);
      setHoverX(x);
      if (dragStart === null || !dragMode) return;

      if (dragMode === 'move' && brushOverlay) {
        const w = brushOverlay.x2 - brushOverlay.x1;
        const newX1 = x - moveOffset;
        emitBrush(newX1, newX1 + w);
      } else if (dragMode === 'create') {
        if (controlled) {
          onBrushChange({ startMs: xToMs(Math.min(dragStart, x)), endMs: xToMs(Math.max(dragStart, x)) });
        } else {
          setInternalBrush({ x1: dragStart, x2: x });
        }
      }
    },
    [dragStart, dragMode, moveOffset, brushOverlay, getChartX, controlled, onBrushChange, xToMs, emitBrush]
  );

  const handleMouseUp = useCallback(
    (e) => {
      const x = getChartX(e);
      if (dragMode === 'create' && dragStart !== null && Math.abs(x - dragStart) < 4) {
        if (controlled) onBrushChange(null);
        else setInternalBrush(null);
      }
      setDragStart(null);
      setDragMode(null);
    },
    [dragMode, dragStart, getChartX, controlled, onBrushChange]
  );

  const cursorStyle = useMemo(() => {
    if (dragMode === 'move') return 'grabbing';
    if (hoverX !== null && isInsideBrush(hoverX)) return 'grab';
    return 'crosshair';
  }, [dragMode, hoverX, isInsideBrush]);

  const breakdown = useMemo(() => {
    if (!brushMs || brushMs.endMs - brushMs.startMs < 1000) return null;
    return visiblePlayers.map((p) => {
      const { bins, binSizeMs } = p.timeline;
      const totals = { cmd: 0, instant: 0, hotkey: 0, assign: 0, select: 0, other: 0 };
      for (const bin of bins) {
        if (bin.t + binSizeMs <= brushMs.startMs) continue;
        if (bin.t >= brushMs.endMs) break;
        for (const k of TYPES) totals[k] += bin[k] || 0;
      }
      const total = TYPES.reduce((s, k) => s + totals[k], 0);
      const windowMins = (brushMs.endMs - brushMs.startMs) / 60000;
      const apm = windowMins > 0 ? Math.round(total / windowMins) : 0;
      const topType = TYPES.reduce((a, b) => (totals[b] > totals[a] ? b : a), "cmd");
      const topPct = total > 0 ? Math.round((totals[topType] / total) * 100) : 0;
      return { playerName: p.playerName, race: p.race, apm, totals, total, topType, topPct };
    });
  }, [brushMs, visiblePlayers]);

  // Time axis ticks every 5 min (or 3 min for short games)
  const tickInterval = durationMs > 20 * 60000 ? 5 * 60000 : 3 * 60000;
  const ticks = [];
  for (let ms = 0; ms <= durationMs; ms += tickInterval) ticks.push(ms);

  if (visiblePlayers.length === 0) return null;

  const brushX1 = brushOverlay ? LABEL_W + brushOverlay.x1 : 0;
  const brushW = brushOverlay ? Math.abs(brushOverlay.x2 - brushOverlay.x1) : 0;

  return (
    <Container>
      <Header>
        <Title>Action Timeline</Title>
        <Legend>
          {TYPES.filter((t) => t !== "other").map((t) => (
            <LegendItem key={t}>
              <Dot style={{ background: TYPE_COLORS[t] }} />
              {TYPE_LABELS[t]}
            </LegendItem>
          ))}
        </Legend>
      </Header>

      <SvgWrap>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEWBOX_W} ${totalH}`}
          style={{ width: "100%", display: "block", userSelect: "none" }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => { setDragStart(null); setDragMode(null); setHoverX(null); }}
        >
          {/* Grid lines at tick marks */}
          {ticks.map((ms) => (
            <line
              key={ms}
              x1={LABEL_W + msToX(ms)}
              y1={0}
              x2={LABEL_W + msToX(ms)}
              y2={totalH - TICK_H}
              stroke="rgba(255,255,255,0.05)"
              strokeWidth={1}
            />
          ))}

          {/* Player rows */}
          {visiblePlayers.map((p, pi) => {
            const y = pi * (ROW_H + ROW_GAP);
            const { bins, binSizeMs } = p.timeline;
            const name = p.playerName.split("#")[0].slice(0, 11);

            return (
              <g key={pi}>
                <text
                  x={LABEL_W - 8}
                  y={y + ROW_H / 2 + 5}
                  textAnchor="end"
                  fill="rgba(255,255,255,0.7)"
                  fontSize={13}
                  fontFamily="var(--font-mono)"
                >
                  {name}
                </text>
                {/* Track background */}
                <rect
                  x={LABEL_W}
                  y={y}
                  width={CHART_W}
                  height={ROW_H}
                  fill="rgba(255,255,255,0.025)"
                  rx={2}
                />
                {/* Action density bins */}
                {bins.map((bin, bi) => {
                  const total = TYPES.reduce((s, k) => s + (bin[k] || 0), 0);
                  if (total === 0) return null;
                  const bx = LABEL_W + msToX(bin.t);
                  const bw = Math.max(1, msToX(binSizeMs) - 0.5);
                  const opacity = 0.25 + 0.75 * (total / maxDensity);
                  const segs = [];
                  let sy = y + ROW_H;
                  for (const type of TYPES) {
                    const v = bin[type] || 0;
                    if (!v) continue;
                    const h = (v / total) * ROW_H;
                    sy -= h;
                    segs.push(
                      <rect
                        key={type}
                        x={bx}
                        y={sy}
                        width={bw}
                        height={h}
                        fill={TYPE_COLORS[type]}
                        opacity={opacity}
                      />
                    );
                  }
                  return <g key={bi}>{segs}</g>;
                })}
              </g>
            );
          })}

          {/* Brush highlight */}
          {brushW > 2 && (
            <>
              {/* Dim the unselected areas */}
              <rect x={LABEL_W} y={0} width={brushX1 - LABEL_W} height={totalH - TICK_H}
                fill="rgba(0,0,0,0.45)" style={{ pointerEvents: "none" }} />
              <rect x={brushX1 + brushW} y={0} width={CHART_W - (brushX1 - LABEL_W) - brushW} height={totalH - TICK_H}
                fill="rgba(0,0,0,0.45)" style={{ pointerEvents: "none" }} />
              {/* Bright selection border */}
              <rect x={brushX1} y={0} width={brushW} height={totalH - TICK_H}
                fill="rgba(200,168,75,0.07)" stroke="var(--gold)" strokeWidth={1.5}
                style={{ pointerEvents: "none" }} />
              {/* Edge handle lines */}
              <line x1={brushX1} y1={0} x2={brushX1} y2={totalH - TICK_H}
                stroke="var(--gold)" strokeWidth={2} style={{ pointerEvents: "none" }} />
              <line x1={brushX1 + brushW} y1={0} x2={brushX1 + brushW} y2={totalH - TICK_H}
                stroke="var(--gold)" strokeWidth={2} style={{ pointerEvents: "none" }} />
            </>
          )}

          {/* Invisible interaction target */}
          <rect
            x={LABEL_W}
            y={0}
            width={CHART_W}
            height={totalH - TICK_H}
            fill="transparent"
            style={{ cursor: cursorStyle }}
          />

          {/* Time axis */}
          {ticks.map((ms) => (
            <text
              key={ms}
              x={LABEL_W + msToX(ms)}
              y={totalH - 5}
              textAnchor="middle"
              fill="#666677"
              fontSize={11}
              fontFamily="var(--font-mono)"
            >
              {formatMs(ms)}
            </text>
          ))}
        </svg>
      </SvgWrap>

      {breakdown ? (
        <BreakdownPanel>
          <BdHeader>
            {formatMs(brushMs.startMs)} – {formatMs(brushMs.endMs)}
          </BdHeader>
          <BdRows>
            {breakdown.map((bd, i) => {
              const race = RACE_MAP[bd.race] || "random";
              return (
                <BdRow key={i}>
                  <BdPlayer>
                    <RaceIcon race={race} size={14} />
                    <BdName>{bd.playerName.split("#")[0].slice(0, 12)}</BdName>
                  </BdPlayer>
                  <BdApm>
                    {bd.apm}<BdUnit>APM</BdUnit>
                  </BdApm>
                  <BdBar>
                    {TYPES.map((type) => {
                      if (!bd.totals[type]) return null;
                      const pct = (bd.totals[type] / bd.total) * 100;
                      return (
                        <BdSeg
                          key={type}
                          style={{ width: `${pct}%`, background: TYPE_COLORS[type] }}
                          title={`${TYPE_LABELS[type]}: ${Math.round(pct)}%`}
                        />
                      );
                    })}
                  </BdBar>
                  <BdTop style={{ color: TYPE_COLORS[bd.topType] }}>
                    {bd.topPct}% {TYPE_LABELS[bd.topType]}
                  </BdTop>
                </BdRow>
              );
            })}
          </BdRows>
        </BreakdownPanel>
      ) : (
        <DragHint>Drag on the timeline to inspect a window</DragHint>
      )}
    </Container>
  );
}

// ── Styled Components ──────────────────────────────────────────────────────────

const Container = styled.div`
  margin: var(--space-6) 0;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-4);
  margin-bottom: var(--space-3);
  flex-wrap: wrap;
`;

const Title = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--gold);
  text-transform: uppercase;
  letter-spacing: 0.08em;
`;

const Legend = styled.div`
  display: flex;
  gap: var(--space-4);
  flex-wrap: wrap;
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--grey-light);
`;

const Dot = styled.div`
  width: 10px;
  height: 10px;
  border-radius: 2px;
  flex-shrink: 0;
`;

const SvgWrap = styled.div`
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--grey-mid);
  border-radius: var(--radius-sm);
  overflow: hidden;
`;

const DragHint = styled.div`
  margin-top: var(--space-2);
  font-family: var(--font-mono);
  font-size: 10px;
  color: #3a3a4a;
  text-align: center;
  padding: var(--space-2) 0;
`;

const BreakdownPanel = styled.div`
  margin-top: var(--space-3);
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--grey-mid);
  border-radius: var(--radius-sm);
  overflow: hidden;
`;

const BdHeader = styled.div`
  padding: var(--space-3) var(--space-4);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--gold);
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
`;

const BdRows = styled.div`
  display: flex;
  flex-direction: column;
`;

const BdRow = styled.div`
  display: grid;
  grid-template-columns: 180px 90px 1fr 150px;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);

  &:last-child {
    border-bottom: none;
  }
`;

const BdPlayer = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  overflow: hidden;
`;

const BdName = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: rgba(255, 255, 255, 0.9);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const BdApm = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-lg);
  color: #fff;
  text-align: right;
`;

const BdUnit = styled.span`
  font-size: 11px;
  color: var(--grey-light);
  margin-left: 4px;
`;

const BdBar = styled.div`
  display: flex;
  height: 20px;
  border-radius: 3px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.05);
`;

const BdSeg = styled.div`
  height: 100%;
  min-width: 2px;
  transition: opacity 0.15s ease;

  &:hover {
    opacity: 0.8;
  }
`;

const BdTop = styled.div`
  font-family: var(--font-mono);
  font-size: 13px;
  text-align: right;
`;
