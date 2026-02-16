import React, { useRef, useEffect, useState, useMemo } from "react";
import * as d3 from "d3";
import { colors } from "../lib/design-tokens";

const DOT_COLOR = "rgba(255, 255, 255, 0.75)";
const DOT_COLOR_INGAME = "rgba(255, 255, 255, 0.85)";
const LABEL_COLOR = "rgba(255, 255, 255, 0.6)";
const TEAM_COLORS = [colors.teamBlue.value, colors.teamRed.value];

// Transition timing tiers (ms) — multiply by animationScale `s` before use
const T = {
  FAST: 300,     // bulk ops, fades, quick appear/disappear
  MOVE: 1500,    // repositioning existing elements (dots, labels, arcs)
  ENTER: 2500,   // organic fly-in / fly-out
  LINGER: 4000,  // how long temp gold labels stay visible
};

// Label sizing constants
const L = {
  FONT_SIZE: 13,
  CHAR_W: 7.4,   // approximate width per char at 13px font-display
  H: 15,          // line height
  PAD_X: 4,       // horizontal padding around text
  PAD_Y: 2,       // vertical padding
};

// Settling period: all enters use fast fade-in (no fly-in) during this window
const SETTLE_MS = 4000;

const rectsOverlap = (a, b) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

const rectOverlapsDot = (rect, dots) => {
  for (const d of dots) {
    const dotRect = { x: d.x - d.r, y: d.y - d.r, w: d.r * 2, h: d.r * 2 };
    if (rectsOverlap(rect, dotRect)) return true;
  }
  return false;
};

// Beeswarm layout — stable: reuses X for dots with unchanged MMR
const computePositions = (sorted, y, centerX, rScale, inGameMap, prevPos) => {
  const positions = [];
  const deferred = [];

  for (const player of sorted) {
    const py = y(player.mmr);
    const games = (player.wins || 0) + (player.losses || 0);
    const dotR = rScale(games);
    const gameInfo = inGameMap.get(player.battleTag);
    const prev = prevPos.get(player.battleTag);
    const mmrChanged = prev && prev.mmr !== player.mmr;

    const posData = {
      y: py, r: dotR,
      race: player.race, tag: player.battleTag,
      mmr: player.mmr, inGame: !!gameInfo,
      mapName: gameInfo?.mapName || null,
      matchId: gameInfo?.matchId || null,
      teamIdx: gameInfo?.teamIdx ?? null,
      wins: player.wins || 0,
      losses: player.losses || 0,
    };

    if (prev && !mmrChanged) {
      positions.push({ ...posData, x: prev.x });
    } else {
      deferred.push(posData);
    }
  }

  for (const posData of deferred) {
    let px = centerX;
    let offset = 1;
    while (positions.some((p) => {
      const minDist = (p.r + posData.r) * 1.2;
      return Math.hypot(p.x - px, p.y - posData.y) < minDist;
    })) {
      px = centerX + (offset % 2 === 0 ? 1 : -1) * Math.ceil(offset / 2) * (posData.r * 2.2);
      offset++;
      if (offset > 20) break;
    }
    positions.push({ ...posData, x: px });
  }

  return positions;
};

// Label placement with collision detection
const computeLabelLayout = (positions, bounds) => {
  const labeledTags = new Set();
  const labelPositions = [];
  const placedRects = [];

  const tryPlace = (pos, force) => {
    const name = pos.tag?.split("#")[0] || "";
    if (!name) return null;

    const textW = name.length * L.CHAR_W + L.PAD_X * 2;
    const textH = L.H + L.PAD_Y * 2;

    const offsets = [
      { dx: pos.r + 4, dy: -textH / 2 },
      { dx: pos.r + 2, dy: -pos.r - textH },
      { dx: -textW / 2, dy: -pos.r - textH - 2 },
      { dx: -textW - pos.r - 2, dy: -pos.r - textH },
      { dx: -textW - pos.r - 4, dy: -textH / 2 },
      { dx: -textW - pos.r - 2, dy: pos.r },
      { dx: -textW / 2, dy: pos.r + 4 },
      { dx: pos.r + 2, dy: pos.r },
    ];

    for (const { dx, dy } of offsets) {
      const cx = pos.x + dx;
      const cy = pos.y + dy;

      if (cx < bounds.left || cx + textW > bounds.right) continue;
      if (cy < bounds.top || cy + textH > bounds.bottom) continue;

      const rect = { x: cx, y: cy, w: textW, h: textH };
      if (!force) {
        if (placedRects.some((r) => rectsOverlap(rect, r))) continue;
        if (rectOverlapsDot(rect, positions.filter((p) => p.tag !== pos.tag))) continue;
      }

      placedRects.push(rect);
      labeledTags.add(pos.tag);
      return {
        tag: pos.tag, name,
        x: cx + textW / 2,
        y: cy + textH - L.PAD_Y - 1,
      };
    }
    return null;
  };

  // Top 3 MMR players force-placed first
  const top3 = [...positions].sort((a, b) => b.mmr - a.mmr).slice(0, 3);
  for (const pos of top3) {
    const l = tryPlace(pos, true);
    if (l) labelPositions.push(l);
  }

  // Remaining by priority (furthest from median first)
  const median = d3.median(positions, (d) => d.mmr) || 0;
  const byPriority = [...positions].sort((a, b) =>
    Math.abs(b.mmr - median) - Math.abs(a.mmr - median)
  );
  for (const pos of byPriority) {
    if (labeledTags.has(pos.tag)) continue;
    const l = tryPlace(pos, false);
    if (l) labelPositions.push(l);
  }

  return { labelPositions, labeledTags };
};

const OnlineMmrStrip = ({
  players,
  matches = [],
  histogram = null,
  onPlayerClick = null,
  mmrFilter = null,
  onMmrFilter = null,
  mmrRange = null,       // [min, max] — lock Y-axis scale (replay mode)
  animationScale = 1,    // multiply all transition durations (< 1 = faster)
  pendingDeltas = null,  // [{tag, delta}] — fire delta animations directly (replay)
}) => {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const hoveredTagRef = useRef(null);
  const prevMmrsRef = useRef(new Map());
  const animatingRef = useRef(false);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);

  // Track when first render happens — enters during settling use bulk animation
  const firstRenderTimeRef = useRef(null);
  // Cache beeswarm X positions so dots don't shift when others join/leave
  const prevPositionsRef = useRef(new Map());

  // Resize observer — track both width and height
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) {
        setWidth(Math.floor(rect.width));
        setHeight(Math.floor(rect.height));
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Memoize in-game lookup
  const inGameMap = useMemo(() => {
    const map = new Map();
    for (const match of (matches || [])) {
      const mapName = (match.mapName || match.map || "").replace(/^\(\d\)/, "");
      match.teams?.forEach((team, ti) => {
        team.players?.forEach((p) => {
          if (p.battleTag) {
            map.set(p.battleTag, { matchId: match.id, teamIdx: ti, mapName });
          }
        });
      });
    }
    return map;
  }, [matches]);

  // Main D3 render
  useEffect(() => {
    if (!svgRef.current || !width || !height || width < 60 || !players || players.length === 0) return;
    if (!firstRenderTimeRef.current) firstRenderTimeRef.current = Date.now();

    const s = animationScale;
    const svg = d3.select(svgRef.current);

    // ── Layout ──
    const padding = { left: 36, right: 50, top: 36, bottom: 36 };
    const chartWidth = width - padding.left - padding.right;
    const centerX = padding.left + chartWidth / 2;

    const mmrs = players.map((p) => p.mmr);
    const minMmr = mmrRange ? mmrRange[0] : d3.min(mmrs) - 50;
    const maxMmr = mmrRange ? mmrRange[1] : d3.max(mmrs) + 50;

    const y = d3.scaleLinear()
      .domain([minMmr, maxMmr])
      .range([height - padding.bottom, padding.top]);

    const allGames = players.map((p) => (p.wins || 0) + (p.losses || 0));
    const maxGames = d3.max(allGames) || 1;
    const rScale = d3.scaleSqrt().domain([0, maxGames]).range([4, 16]);

    // ── Data phase (pure computation, no DOM) ──
    const sorted = [...players].sort((a, b) => b.mmr - a.mmr);
    const positions = computePositions(sorted, y, centerX, rScale, inGameMap, prevPositionsRef.current);
    prevPositionsRef.current = new Map(positions.map((p) => [p.tag, { x: p.x, mmr: p.mmr }]));

    const isSettling = (Date.now() - firstRenderTimeRef.current) < SETTLE_MS;
    const changedDots = [];
    if (!isSettling) {
      for (const pos of positions) {
        const prev = prevMmrsRef.current.get(pos.tag);
        if (prev != null && prev !== pos.mmr) {
          changedDots.push({ ...pos, delta: pos.mmr - prev });
        }
      }
    }
    prevMmrsRef.current = new Map(positions.map((p) => [p.tag, p.mmr]));
    const changedTagSet = new Set(changedDots.map((d) => d.tag));

    const bounds = {
      left: padding.left,
      right: width - padding.right,
      top: padding.top - 4,
      bottom: height - padding.bottom + 2,
    };
    const { labelPositions, labeledTags } = computeLabelLayout(positions, bounds);

    // Arc path data
    const teamGroups = new Map();
    for (const pos of positions) {
      if (!pos.inGame || pos.matchId == null) continue;
      const key = `${pos.matchId}-${pos.teamIdx}`;
      if (!teamGroups.has(key)) teamGroups.set(key, []);
      teamGroups.get(key).push(pos);
    }

    const arcData = [];
    for (const [, members] of teamGroups) {
      if (members.length < 2) continue;
      const teamIdx = members[0].teamIdx;
      const color = TEAM_COLORS[teamIdx] || "var(--grey-light)";
      for (let i = 0; i < members.length - 1; i++) {
        const a = members[i];
        const b = members[i + 1];
        const dist = Math.abs(a.y - b.y);
        const controlX = Math.min(a.x, b.x) - dist * 0.3 - 8;
        const d = `M ${a.x} ${a.y} Q ${controlX} ${(a.y + b.y) / 2} ${b.x} ${b.y}`;
        arcData.push({ key: `${a.tag}-${b.tag}`, d, color });
      }
    }

    // Match player lookup for hover highlighting
    const matchPlayers = new Map();
    for (const pos of positions) {
      if (!pos.inGame || pos.matchId == null) continue;
      if (!matchPlayers.has(pos.matchId)) matchPlayers.set(pos.matchId, []);
      matchPlayers.get(pos.matchId).push({ tag: pos.tag, teamIdx: pos.teamIdx });
    }

    // ── Render: Static layers ──
    svg.selectAll(".static-layer").remove();
    svg.selectAll(".enter-label-layer").remove();
    svg.selectAll(".exit-label-layer").remove();

    const staticG = svg.append("g").attr("class", "static-layer").attr("pointer-events", "none");

    // Histogram backdrop
    if (histogram && histogram.length > 0) {
      const histMaxCount = d3.max(histogram, (d) => d.count) || 1;
      const xHist = d3.scaleLinear().domain([0, histMaxCount]).range([0, chartWidth * 0.2]);

      const areaLeft = d3.area()
        .y((d) => y(d.mmr))
        .x0(centerX)
        .x1((d) => centerX - xHist(d.count))
        .curve(d3.curveBasis);

      const areaRight = d3.area()
        .y((d) => y(d.mmr))
        .x0(centerX)
        .x1((d) => centerX + xHist(d.count))
        .curve(d3.curveBasis);

      const visibleBins = histogram.filter((d) => d.mmr >= minMmr && d.mmr <= maxMmr);

      if (visibleBins.length > 1) {
        staticG.append("path")
          .datum(visibleBins)
          .attr("d", areaLeft)
          .attr("fill", "rgba(252, 219, 51, 0.04)")
          .attr("stroke", "rgba(252, 219, 51, 0.08)")
          .attr("stroke-width", 1);

        staticG.append("path")
          .datum(visibleBins)
          .attr("d", areaRight)
          .attr("fill", "rgba(252, 219, 51, 0.04)")
          .attr("stroke", "rgba(252, 219, 51, 0.08)")
          .attr("stroke-width", 1);
      }
    }

    // Grid lines + clickable axis labels
    const step = 200;
    const gridStart = Math.ceil(minMmr / step) * step;

    let axisLabelG = svg.select(".axis-label-layer");
    if (axisLabelG.empty()) {
      axisLabelG = svg.append("g").attr("class", "axis-label-layer");
    }

    const gridValues = [];
    for (let v = gridStart; v <= maxMmr; v += step) gridValues.push(v);

    for (const v of gridValues) {
      staticG.append("line")
        .attr("y1", y(v)).attr("y2", y(v))
        .attr("x1", padding.left).attr("x2", width - padding.right)
        .attr("stroke", "#222").attr("stroke-width", 1);
    }

    const axisLabels = axisLabelG.selectAll(".axis-tick").data(gridValues, (d) => d);
    axisLabels.exit().remove();

    const axisEnter = axisLabels.enter().append("g").attr("class", "axis-tick");
    axisEnter.append("text")
      .attr("text-anchor", "end")
      .attr("font-size", "10px")
      .attr("font-family", "var(--font-mono)")
      .attr("fill", "#555")
      .text((d) => d);
    axisEnter.append("rect")
      .attr("width", 48).attr("height", 16)
      .attr("fill", "transparent")
      .attr("cursor", "pointer");

    const allAxisTicks = axisEnter.merge(axisLabels);

    allAxisTicks.each(function (v) {
      const g = d3.select(this);
      const isActive = mmrFilter === v;
      const isAbove = mmrFilter != null && v >= mmrFilter;
      const targetFill = isActive ? "var(--gold)" : isAbove ? "rgba(255, 255, 255, 0.5)" : "#555";

      g.select("text")
        .attr("y", y(v) + 3).attr("x", width - 4)
        .transition().duration(T.FAST * s).ease(d3.easeCubicOut)
        .attr("fill", targetFill);

      g.select("rect")
        .attr("x", width - 48).attr("y", y(v) - 8);

      if (onMmrFilter) {
        g.select("rect")
          .on("mouseenter", () => {
            if (animatingRef.current) return;
            g.select("text").transition().duration(T.FAST * s).attr("fill", isActive ? "var(--gold)" : "rgba(255, 255, 255, 0.8)");
          })
          .on("mouseleave", () => {
            if (animatingRef.current) return;
            g.select("text").transition().duration(T.FAST * s).attr("fill", targetFill);
          })
          .on("click", () => {
            if (animatingRef.current) return;
            onMmrFilter(v);
          });
      }
    });

    // Center axis
    staticG.append("line")
      .attr("x1", centerX).attr("x2", centerX)
      .attr("y1", padding.top).attr("y2", height - padding.bottom)
      .attr("stroke", "var(--grey-mid)").attr("stroke-width", 1);

    // ── Render: Arcs ──
    let arcG = svg.select(".arc-layer");
    const isArcLayerNew = arcG.empty();
    if (isArcLayerNew) {
      arcG = svg.append("g").attr("class", "arc-layer").attr("pointer-events", "none").attr("opacity", 0);
    }

    const arcSel = arcG.selectAll("path.team-arc").data(arcData, (d) => d.key);
    arcSel.exit().transition().duration(T.FAST * s).attr("opacity", 0).remove();
    arcSel.enter().append("path")
      .attr("class", "team-arc")
      .attr("fill", "none")
      .attr("stroke", (d) => d.color)
      .attr("stroke-width", 1)
      .attr("opacity", 0)
      .attr("d", (d) => d.d)
      .transition().duration(T.FAST * s)
      .attr("opacity", 0.25);
    arcSel.transition().duration(T.MOVE * s).ease(d3.easeCubicInOut)
      .attr("d", (d) => d.d)
      .attr("opacity", 0.25);

    // ── Render: Dots ──
    let dotGroup = svg.select(".dot-group");
    if (dotGroup.empty()) {
      dotGroup = svg.append("g").attr("class", "dot-group");
    }
    dotGroup.raise();

    const dots = dotGroup.selectAll("circle.player-dot")
      .data(positions, (d) => d.tag);

    // Exit animation
    const exitCount = dots.exit().size();
    const isBulkExit = exitCount > 3;
    const exitX = width + 20;
    const exitLabelG = svg.append("g").attr("class", "exit-label-layer").attr("pointer-events", "none");
    const exitLabels = new Map();
    if (!isBulkExit) {
      dots.exit().each(function (d) {
        const name = d.tag?.split("#")[0] || "";
        if (!name) return;
        const label = exitLabelG.append("text")
          .attr("x", d.x + d.r + 8)
          .attr("y", d.y + 4)
          .attr("text-anchor", "start")
          .attr("fill", "var(--gold)")
          .attr("font-size", `${L.FONT_SIZE}px`)
          .attr("font-family", "var(--font-display)")
          .attr("opacity", 0.9)
          .text(name);
        exitLabels.set(d.tag, label);
      });
    }
    dots.exit()
      .transition().duration((isBulkExit ? T.FAST : T.ENTER) * s)
      .ease(isBulkExit ? d3.easeCubicOut : d3.easeCubicIn)
      .attrTween("cx", isBulkExit ? null : function (d) {
        const sx = +d3.select(this).attr("cx");
        return (t) => {
          const cx = sx + (exitX - sx) * t;
          const label = exitLabels.get(d.tag);
          if (label) {
            const r = d.r * (1 - t * 0.8);
            label.attr("x", cx + r + 8).attr("y", +d3.select(this).attr("cy") + 4)
              .attr("opacity", Math.max(0, 1 - t * 1.5));
          }
          return cx;
        };
      })
      .attr("r", isBulkExit ? 0 : 2)
      .attr("opacity", 0)
      .on("end", function (d) {
        const label = exitLabels.get(d.tag);
        if (label) label.remove();
      })
      .remove();

    // Update animation
    if (isSettling) {
      dots
        .attr("cx", (d) => d.x)
        .attr("cy", (d) => d.y)
        .attr("r", (d) => d.r)
        .attr("fill", (d) => d.inGame ? DOT_COLOR_INGAME : DOT_COLOR)
        .attr("opacity", 1);
    } else {
      dots.transition().duration(T.MOVE * s).ease(d3.easeCubicInOut)
        .attr("cx", (d) => d.x)
        .attr("cy", (d) => d.y)
        .attr("r", (d) => d.r)
        .attr("fill", (d) => d.inGame ? DOT_COLOR_INGAME : DOT_COLOR)
        .attr("opacity", 1);
    }

    // Helper: render delta pulse ring + label for a dot
    const renderDeltas = (dots, isGameEnd, deltaLayer) => {
      for (let ci = 0; ci < dots.length; ci++) {
        const changed = dots[ci];
        const isGain = changed.delta > 0;
        const color = isGain ? "var(--green)" : "var(--red)";
        const deltaText = (isGain ? "+" : "") + changed.delta;
        const stagger = isGameEnd ? ci * 80 : 0;

        if (isGameEnd) {
          deltaLayer.append("circle")
            .attr("cx", changed.x).attr("cy", changed.y)
            .attr("r", changed.r + 2)
            .attr("fill", color)
            .attr("opacity", 0)
            .transition().delay(stagger).duration(200 * s)
            .attr("opacity", 0.6)
            .transition().duration(800 * s).ease(d3.easeCubicOut)
            .attr("opacity", 0)
            .remove();
        }

        deltaLayer.append("circle")
          .attr("cx", changed.x).attr("cy", changed.y)
          .attr("r", changed.r)
          .attr("fill", "none")
          .attr("stroke", color)
          .attr("stroke-width", isGameEnd ? 2.5 : 2)
          .attr("opacity", 1)
          .transition().delay(stagger).duration((isGameEnd ? 1500 : 1200) * s).ease(d3.easeCubicOut)
          .attr("r", changed.r + (isGameEnd ? 25 : 18))
          .attr("stroke-width", 0.5).attr("opacity", 0)
          .remove();

        deltaLayer.append("text")
          .attr("x", changed.x)
          .attr("y", changed.y - changed.r - 6)
          .attr("text-anchor", "middle")
          .attr("font-size", isGameEnd ? "13px" : "11px")
          .attr("font-family", "var(--font-mono)")
          .attr("font-weight", "bold")
          .attr("fill", color)
          .attr("opacity", 0)
          .text(deltaText)
          .transition().delay(stagger).duration(300 * s)
          .attr("opacity", 1)
          .transition().delay((isGameEnd ? 4000 : 3000) * s).duration(2000 * s)
          .attr("y", changed.y - changed.r - 28)
          .attr("opacity", 0)
          .remove();
      }
    };

    // MMR delta effects (event-driven, intentionally separate from layout timings)
    if (changedDots.length > 0 || (pendingDeltas && pendingDeltas.length > 0)) {
      let deltaG = svg.select(".delta-label-layer");
      if (deltaG.empty()) {
        deltaG = svg.append("g").attr("class", "delta-label-layer").attr("pointer-events", "none");
      }
      deltaG.raise();

      if (changedDots.length > 0) {
        renderDeltas(changedDots, changedDots.length >= 6, deltaG);
      }

      if (pendingDeltas && pendingDeltas.length > 0) {
        const pendingDots = pendingDeltas
          .map((pd) => {
            const pos = positions.find((p) => p.tag === pd.tag);
            if (!pos) return null;
            return { ...pos, delta: pd.delta };
          })
          .filter(Boolean);
        if (pendingDots.length > 0) {
          renderDeltas(pendingDots, pendingDots.length >= 6, deltaG);
        }
      }
    }

    // Enter animation
    const enterFromX = padding.left - 20;
    const enterCount = dots.enter().size();
    const isBulkLoad = enterCount > 3 || (isSettling && enterCount > 0);
    const enteringTags = new Set();
    if (!isBulkLoad) dots.enter().each(function (d) { enteringTags.add(d.tag); });

    animatingRef.current = !isBulkLoad && enterCount > 0;
    if (enterCount === 0 || isBulkLoad) arcG.attr("opacity", 1);

    const enterLabelG = svg.append("g").attr("class", "enter-label-layer").attr("pointer-events", "none");
    const enterLabels = new Map();

    if (isBulkLoad) {
      dots.enter()
        .append("circle")
        .attr("class", "player-dot")
        .attr("cx", (d) => d.x)
        .attr("cy", (d) => d.y)
        .attr("r", (d) => d.r)
        .attr("opacity", 0)
        .attr("fill", (d) => d.inGame ? DOT_COLOR_INGAME : DOT_COLOR)
        .attr("stroke", "rgba(0,0,0,0.2)")
        .attr("stroke-width", 0.5)
        .attr("cursor", "pointer")
        .transition().duration(T.FAST * s).ease(d3.easeCubicOut)
        .attr("opacity", 1);
    } else {
      const entered = dots.enter()
        .append("circle")
        .attr("class", "player-dot")
        .attr("cx", enterFromX)
        .attr("cy", (d) => d.y)
        .attr("r", 0)
        .attr("opacity", 0)
        .attr("fill", (d) => d.inGame ? DOT_COLOR_INGAME : DOT_COLOR)
        .attr("stroke", "rgba(0,0,0,0.2)")
        .attr("stroke-width", 0.5)
        .attr("cursor", "pointer");

      entered.each(function (d) {
        const name = d.tag?.split("#")[0] || "";
        if (!name) return;
        const label = enterLabelG.append("text")
          .attr("x", enterFromX + 8)
          .attr("y", d.y + 4)
          .attr("text-anchor", "start")
          .attr("fill", "var(--gold)")
          .attr("font-size", `${L.FONT_SIZE}px`)
          .attr("font-family", "var(--font-display)")
          .attr("opacity", 0)
          .text(name);
        enterLabels.set(d.tag, label);
      });

      let settledCount = 0;

      entered.transition()
        .duration(T.ENTER * s)
        .ease(d3.easeCubicOut)
        .attrTween("cx", (d) => {
          const interp = d3.interpolate(enterFromX, d.x);
          return (t) => {
            const cx = interp(t);
            const label = enterLabels.get(d.tag);
            if (label) {
              label.attr("x", cx + d.r + 8)
                .attr("opacity", Math.min(1, t * 3));
            }
            return cx;
          };
        })
        .attrTween("r", (d) => (t) => d.r * Math.min(1, t * 2))
        .attrTween("opacity", () => (t) => Math.min(1, t * 3))
        .on("end", function (d) {
          const label = enterLabels.get(d.tag);
          if (label) {
            if (labeledTags.has(d.tag)) {
              label.transition().duration(T.FAST * s).attr("opacity", 0).remove();
              // Reveal the hidden static label
              labelG.selectAll("text.player-label")
                .filter((ld) => ld.tag === d.tag)
                .transition().duration(T.FAST * s).attr("opacity", 1);
            } else {
              label.attr("opacity", 1)
                .attr("x", d.x + d.r + 8).attr("y", d.y + 4);
              label.transition().delay(T.LINGER * s).duration(T.MOVE * s)
                .attr("opacity", 0)
                .remove();
            }
          }
          settledCount++;
          if (settledCount >= enterCount) {
            animatingRef.current = false;
            svg.select(".label-layer")
              .transition().duration(T.FAST * s)
              .attr("opacity", 1);
            svg.select(".arc-layer")
              .transition().duration(T.FAST * s)
              .attr("opacity", 1);
          }
        });
    }

    const allDots = dotGroup.selectAll("circle.player-dot");

    // ── Render: Labels ──
    let labelG = svg.select(".label-layer");
    const isLabelLayerNew = labelG.empty();
    if (isLabelLayerNew) {
      labelG = svg.append("g").attr("class", "label-layer").attr("pointer-events", "none");
    }
    if (enterCount > 0 && isLabelLayerNew && !isBulkLoad) labelG.attr("opacity", 0);

    const labelsSel = labelG.selectAll("text.player-label").data(labelPositions, (d) => d.tag);
    labelsSel.exit().transition().duration(T.FAST * s).attr("opacity", 0).remove();

    labelsSel.enter().append("text")
      .attr("class", "player-label")
      .attr("text-anchor", "middle")
      .attr("font-size", `${L.FONT_SIZE}px`)
      .attr("font-family", "var(--font-display)")
      .attr("data-tag", (d) => d.tag)
      .text((d) => d.name)
      .attr("x", (d) => d.x).attr("y", (d) => d.y)
      .attr("fill", LABEL_COLOR)
      .attr("opacity", 0)
      .transition().duration(T.FAST * s).ease(d3.easeCubicOut)
      .attr("opacity", (d) => {
        // Hide static labels for entering players — the enter label handles it
        if (enteringTags.has(d.tag)) return 0;
        if (isLabelLayerNew && enterCount > 0 && !isBulkLoad) return 0;
        return 1;
      });

    if (isSettling) {
      labelsSel
        .attr("x", (d) => d.x).attr("y", (d) => d.y)
        .attr("fill", LABEL_COLOR);
    } else {
      labelsSel
        .transition().duration(T.MOVE * s).ease(d3.easeCubicInOut)
        .attr("x", (d) => d.x).attr("y", (d) => d.y)
        .attr("fill", (d) => changedTagSet.has(d.tag) ? "var(--gold)" : LABEL_COLOR);
    }

    if (changedTagSet.size > 0) {
      labelsSel.filter((d) => changedTagSet.has(d.tag))
        .transition().delay(T.MOVE * s).duration(T.FAST * s)
        .attr("fill", LABEL_COLOR);
    }

    labelG.raise();

    // ── Render: Hover system ──
    svg.selectAll(".hover-label-layer").remove();
    const hoverLabelG = svg.append("g").attr("class", "hover-label-layer").attr("pointer-events", "none");

    const applyHighlight = (tag) => {
      const hoveredPos = positions.find((p) => p.tag === tag);
      if (!hoveredPos || !hoveredPos.inGame || hoveredPos.matchId == null) return;

      const teammates = new Set();
      const opponents = new Set();
      const matchTags = new Set([tag]);
      for (const p of matchPlayers.get(hoveredPos.matchId) || []) {
        matchTags.add(p.tag);
        if (p.tag === tag) continue;
        if (p.teamIdx === hoveredPos.teamIdx) teammates.add(p.tag);
        else opponents.add(p.tag);
      }

      const myColor = TEAM_COLORS[hoveredPos.teamIdx] || "#4da6ff";
      const enemyColor = TEAM_COLORS[hoveredPos.teamIdx === 0 ? 1 : 0] || "#ef4444";

      allDots.each(function (od) {
        d3.select(this).interrupt();
        if (od.tag === tag) {
          d3.select(this)
            .attr("stroke", "var(--gold)")
            .attr("stroke-width", 2.5).attr("r", od.r + 3).attr("opacity", 1);
        } else if (teammates.has(od.tag)) {
          d3.select(this)
            .attr("stroke", myColor)
            .attr("stroke-width", 2).attr("r", od.r + 1).attr("opacity", 1);
        } else if (opponents.has(od.tag)) {
          d3.select(this)
            .attr("stroke", enemyColor)
            .attr("stroke-width", 2).attr("r", od.r + 1).attr("opacity", 1);
        } else {
          d3.select(this)
            .attr("fill", "rgba(255,255,255,0.1)")
            .attr("opacity", 1)
            .attr("stroke", "none").attr("stroke-width", 0);
        }
      });

      svg.select(".arc-layer").attr("opacity", 0.05);
      svg.select(".static-layer").attr("opacity", 0.3);

      labelG.selectAll("text").each(function () {
        const el = d3.select(this);
        const t = el.attr("data-tag");
        if (matchTags.has(t)) {
          el.attr("fill", "var(--gold)").attr("opacity", 1);
        } else {
          el.attr("opacity", 0.08);
        }
      });

      // Temporary hover labels for unlabeled match participants
      hoverLabelG.selectAll("*").remove();
      const hoverPlaced = [];
      for (const mTag of matchTags) {
        if (labeledTags.has(mTag)) continue;
        const mPos = positions.find((p) => p.tag === mTag);
        if (!mPos) continue;
        const name = mPos.tag?.split("#")[0] || "";
        if (!name) continue;
        const textW = name.length * L.CHAR_W + L.PAD_X * 2;
        const textH = L.H + L.PAD_Y * 2;
        let labelY = mPos.y - textH / 2;
        labelY = Math.max(bounds.top, Math.min(bounds.bottom - textH, labelY));

        const leftX = mPos.x - mPos.r - 4 - textW;
        const rightX = mPos.x + mPos.r + 4;

        for (const candidateX of [rightX, leftX]) {
          if (candidateX < bounds.left || candidateX + textW > bounds.right) continue;
          const candidateRect = { x: candidateX, y: labelY, w: textW, h: textH };
          if (hoverPlaced.some((r) => rectsOverlap(candidateRect, r))) continue;
          const matchDots = positions.filter((p) => p.tag !== mTag && matchTags.has(p.tag));
          if (rectOverlapsDot(candidateRect, matchDots)) continue;

          hoverPlaced.push(candidateRect);
          hoverLabelG.append("text")
            .attr("x", candidateX + textW / 2)
            .attr("y", labelY + textH - L.PAD_Y - 1)
            .attr("text-anchor", "middle")
            .attr("fill", "var(--gold)")
            .attr("font-size", `${L.FONT_SIZE}px`)
            .attr("font-family", "var(--font-display)")
            .attr("opacity", 1)
            .text(name);
          break;
        }
      }
    };

    const clearHighlight = () => {
      allDots.each(function (od) {
        d3.select(this)
          .attr("r", od.r)
          .attr("fill", od.inGame ? DOT_COLOR_INGAME : DOT_COLOR)
          .attr("opacity", 1)
          .attr("stroke", "rgba(0,0,0,0.2)").attr("stroke-width", 0.5);
      });
      svg.select(".arc-layer").attr("opacity", 1);
      svg.select(".static-layer").attr("opacity", 1);
      labelG.selectAll("text").each(function () {
        d3.select(this).attr("fill", LABEL_COLOR).attr("opacity", 1);
      });
      hoverLabelG.selectAll("*").remove();
    };

    allDots
      .on("mouseenter", function (e, d) {
        if (animatingRef.current) return;
        hoveredTagRef.current = d.tag;
        if (d.inGame && d.matchId != null) {
          applyHighlight(d.tag);
        } else {
          d3.select(this).attr("r", d.r + 3).attr("fill", "var(--white)")
            .attr("stroke", "rgba(255,255,255,0.5)").attr("stroke-width", 2);
          allDots.each(function (od) {
            if (od.tag === d.tag) return;
            d3.select(this)
              .attr("fill", "rgba(255,255,255,0.15)")
              .attr("stroke", "none").attr("stroke-width", 0);
          });
          labelG.selectAll("text").each(function () {
            const el = d3.select(this);
            if (el.attr("data-tag") === d.tag) {
              el.attr("fill", "var(--white)").attr("opacity", 1);
            } else {
              el.attr("opacity", 0.05);
            }
          });
          svg.select(".arc-layer").attr("opacity", 0.05);
          svg.select(".static-layer").attr("opacity", 0.3);
          hoverLabelG.selectAll("*").remove();
          if (!labeledTags.has(d.tag)) {
            const name = d.tag?.split("#")[0] || "";
            if (name) {
              hoverLabelG.append("text")
                .attr("x", d.x + d.r + 8)
                .attr("y", d.y + 4)
                .attr("text-anchor", "start")
                .attr("fill", "var(--white)")
                .attr("font-size", `${L.FONT_SIZE}px`)
                .attr("font-family", "var(--font-display)")
                .text(name);
            }
          }
        }
      })
      .on("mouseleave", function (e, d) {
        if (animatingRef.current) return;
        hoveredTagRef.current = null;
        clearHighlight();
      })
      .on("click", function (e, d) {
        if (animatingRef.current) return;
        onPlayerClick?.(d.tag);
      });

    if (hoveredTagRef.current && !animatingRef.current) {
      applyHighlight(hoveredTagRef.current);
    }

  }, [players, matches, width, height, histogram, inGameMap, onPlayerClick, mmrFilter, onMmrFilter, mmrRange, animationScale, pendingDeltas]);

  if (!players || players.length === 0) return null;

  return (
    <div ref={containerRef} className="mmr-strip-container" style={{ position: "relative" }}>
      <svg ref={svgRef} width={width} height={height} />
    </div>
  );
};

export default OnlineMmrStrip;
