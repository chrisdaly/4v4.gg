import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import * as d3 from "d3";

const DOT_COLOR = "rgba(255, 255, 255, 0.75)";
const DOT_COLOR_INGAME = "rgba(255, 255, 255, 0.85)";
const LABEL_COLOR = "rgba(255, 255, 255, 0.6)";
const TEAM_COLORS = ["#4da6ff", "#ef4444"];

// Label layout constants
const LABEL_FONT_SIZE = 13;
const LABEL_CHAR_W = 7.4;  // approximate width per char at 13px font-display
const LABEL_H = 15;         // line height
const LABEL_PAD_X = 4;      // horizontal padding around text
const LABEL_PAD_Y = 2;      // vertical padding

// Check if two rects overlap
const rectsOverlap = (a, b) => {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
};

// Check if a rect overlaps any dot circle (as a rect approximation)
const rectOverlapsDot = (rect, dots) => {
  for (const d of dots) {
    const dotRect = { x: d.x - d.r, y: d.y - d.r, w: d.r * 2, h: d.r * 2 };
    if (rectsOverlap(rect, dotRect)) return true;
  }
  return false;
};

// How long to collect initial data before starting the intro animation
const INTRO_BUFFER_MS = 2500;

const OnlineMmrStrip = ({
  players,
  matches = [],
  histogram = null,
  onPlayerClick = null,
  mmrFilter = null,
  onMmrFilter = null,
}) => {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const hoveredTagRef = useRef(null);
  const prevMmrsRef = useRef(new Map());
  const animatingRef = useRef(false);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);

  // Buffer initial data so in-game + chat players all arrive together
  const introReadyRef = useRef(false);
  const [introReady, setIntroReady] = useState(false);
  useEffect(() => {
    if (introReadyRef.current) return;
    if (!players || players.length === 0) return;
    // First data arrived — start the collection window
    const timer = setTimeout(() => {
      introReadyRef.current = true;
      setIntroReady(true);
    }, INTRO_BUFFER_MS);
    return () => clearTimeout(timer);
  }, [players]);

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
    for (const match of matches) {
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
    if (!introReady || !svgRef.current || !width || !height || width < 60 || !players || players.length === 0) return;

    const svg = d3.select(svgRef.current);

    // VERTICAL LAYOUT: MMR on Y-axis, displacement on X-axis
    const padding = { left: 36, right: 50, top: 36, bottom: 36 };
    const chartWidth = width - padding.left - padding.right;
    const centerX = padding.left + chartWidth / 2;

    const mmrs = players.map((p) => p.mmr);
    const minMmr = d3.min(mmrs) - 50;
    const maxMmr = d3.max(mmrs) + 50;

    // Y-scale for MMR (inverted: higher MMR at top)
    const y = d3.scaleLinear()
      .domain([minMmr, maxMmr])
      .range([height - padding.bottom, padding.top]);

    // Max games for dot sizing
    const allGames = players.map((p) => (p.wins || 0) + (p.losses || 0));
    const maxGames = d3.max(allGames) || 1;
    const rScale = d3.scaleSqrt().domain([0, maxGames]).range([4, 16]);

    // ── Clear static layers, keep dot group + label layer + arc layer ──
    svg.selectAll(".static-layer").remove();
    svg.selectAll(".enter-label-layer").remove();
    svg.selectAll(".exit-label-layer").remove();

    // Static group (behind everything) — no mouse interaction
    const staticG = svg.append("g").attr("class", "static-layer").attr("pointer-events", "none");

    // ── Histogram backdrop ──
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

    // ── Grid lines + clickable axis labels ──
    const step = 200;
    const gridStart = Math.ceil(minMmr / step) * step;

    // Persist axis label layer across renders for smooth transitions
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

    // Data-join axis labels so they transition instead of being recreated
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
        .transition().duration(400).ease(d3.easeCubicOut)
        .attr("fill", targetFill);

      g.select("rect")
        .attr("x", width - 48).attr("y", y(v) - 8);

      if (onMmrFilter) {
        g.select("rect")
          .on("mouseenter", () => {
            if (animatingRef.current) return;
            g.select("text").transition().duration(150).attr("fill", isActive ? "var(--gold)" : "rgba(255, 255, 255, 0.8)");
          })
          .on("mouseleave", () => {
            if (animatingRef.current) return;
            g.select("text").transition().duration(300).attr("fill", targetFill);
          })
          .on("click", () => {
            if (animatingRef.current) return;
            onMmrFilter(v);
          });
      }
    });

    // ── Center axis ──
    staticG.append("line")
      .attr("x1", centerX).attr("x2", centerX)
      .attr("y1", padding.top).attr("y2", height - padding.bottom)
      .attr("stroke", "#333").attr("stroke-width", 1);

    // ── Beeswarm positions ──
    const sorted = [...players].sort((a, b) => b.mmr - a.mmr); // highest MMR first (top to bottom)
    const positions = [];

    for (const player of sorted) {
      const py = y(player.mmr);
      const games = (player.wins || 0) + (player.losses || 0);
      const dotR = rScale(games);
      let px = centerX;
      let offset = 1;
      while (positions.some((p) => {
        const minDist = (p.r + dotR) * 1.2;
        return Math.hypot(p.x - px, p.y - py) < minDist;
      })) {
        px = centerX + (offset % 2 === 0 ? 1 : -1) * Math.ceil(offset / 2) * (dotR * 2.2);
        offset++;
        if (offset > 20) break;
      }
      const gameInfo = inGameMap.get(player.battleTag);
      positions.push({
        x: px, y: py, r: dotR,
        race: player.race, tag: player.battleTag,
        mmr: player.mmr, inGame: !!gameInfo,
        mapName: gameInfo?.mapName || null,
        matchId: gameInfo?.matchId || null,
        teamIdx: gameInfo?.teamIdx ?? null,
        wins: player.wins || 0,
        losses: player.losses || 0,
      });
    }

    // ── Match pairing arcs (persisted, data-joined for transitions) ──
    let arcG = svg.select(".arc-layer");
    const isArcLayerNew = arcG.empty();
    if (isArcLayerNew) {
      arcG = svg.append("g").attr("class", "arc-layer").attr("pointer-events", "none").attr("opacity", 0);
    }

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
      const color = TEAM_COLORS[teamIdx] || "#888";
      for (let i = 0; i < members.length - 1; i++) {
        const a = members[i];
        const b = members[i + 1];
        const dist = Math.abs(a.y - b.y);
        const controlX = Math.min(a.x, b.x) - dist * 0.3 - 8;
        const d = `M ${a.x} ${a.y} Q ${controlX} ${(a.y + b.y) / 2} ${b.x} ${b.y}`;
        arcData.push({ key: `${a.tag}-${b.tag}`, d, color });
      }
    }

    const arcSel = arcG.selectAll("path.team-arc").data(arcData, (d) => d.key);
    arcSel.exit().transition().duration(400).attr("opacity", 0).remove();
    arcSel.enter().append("path")
      .attr("class", "team-arc")
      .attr("fill", "none")
      .attr("stroke", (d) => d.color)
      .attr("stroke-width", 1)
      .attr("opacity", 0)
      .attr("d", (d) => d.d)
      .transition().duration(600)
      .attr("opacity", 0.25);
    arcSel.transition().duration(1500).ease(d3.easeSinInOut)
      .attr("d", (d) => d.d)
      .attr("opacity", 0.25);

    // ── Enter/exit dot animations via data join ──
    let dotGroup = svg.select(".dot-group");
    if (dotGroup.empty()) {
      dotGroup = svg.append("g").attr("class", "dot-group");
    }
    // Ensure dots are always the topmost interactive layer
    dotGroup.raise();

    const dots = dotGroup.selectAll("circle.player-dot")
      .data(positions, (d) => d.tag);

    // Exit animation — fast fade for bulk exits (filtering), slow slide for organic exits
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
          .attr("font-size", `${LABEL_FONT_SIZE}px`)
          .attr("font-family", "var(--font-display)")
          .attr("opacity", 0.9)
          .text(name);
        exitLabels.set(d.tag, label);
      });
    }
    dots.exit()
      .transition().duration(isBulkExit ? 400 : 5000)
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

    // Detect MMR changes from previous render
    const changedDots = [];
    for (const pos of positions) {
      const prev = prevMmrsRef.current.get(pos.tag);
      if (prev != null && prev !== pos.mmr) {
        changedDots.push({ ...pos, delta: pos.mmr - prev });
      }
    }
    const nextMmrs = new Map();
    for (const pos of positions) nextMmrs.set(pos.tag, pos.mmr);
    prevMmrsRef.current = nextMmrs;

    dots.transition().duration(2000).ease(d3.easeSinInOut)
      .attr("cx", (d) => d.x)
      .attr("cy", (d) => d.y)
      .attr("r", (d) => d.r)
      .attr("fill", (d) => d.inGame ? DOT_COLOR_INGAME : DOT_COLOR)
      .attr("opacity", 1);

    // Show pulse ring + delta label for changed MMR dots
    if (changedDots.length > 0) {
      let deltaG = svg.select(".delta-label-layer");
      if (deltaG.empty()) {
        deltaG = svg.append("g").attr("class", "delta-label-layer").attr("pointer-events", "none");
      }
      deltaG.raise();

      const isGameEnd = changedDots.length >= 6;

      for (let ci = 0; ci < changedDots.length; ci++) {
        const changed = changedDots[ci];
        const isGain = changed.delta > 0;
        const color = isGain ? "var(--green)" : "var(--red)";
        const deltaText = (isGain ? "+" : "") + changed.delta;
        const stagger = isGameEnd ? ci * 80 : 0;

        // Brief colored flash overlay on the dot
        if (isGameEnd) {
          deltaG.append("circle")
            .attr("cx", changed.x).attr("cy", changed.y)
            .attr("r", changed.r + 2)
            .attr("fill", color)
            .attr("opacity", 0)
            .transition().delay(stagger).duration(200)
            .attr("opacity", 0.6)
            .transition().duration(800).ease(d3.easeCubicOut)
            .attr("opacity", 0)
            .remove();
        }

        // Expanding pulse ring
        deltaG.append("circle")
          .attr("cx", changed.x).attr("cy", changed.y)
          .attr("r", changed.r)
          .attr("fill", "none")
          .attr("stroke", color)
          .attr("stroke-width", isGameEnd ? 2.5 : 2)
          .attr("opacity", 1)
          .transition().delay(stagger).duration(isGameEnd ? 1500 : 1200).ease(d3.easeCubicOut)
          .attr("r", changed.r + (isGameEnd ? 25 : 18))
          .attr("stroke-width", 0.5).attr("opacity", 0)
          .remove();

        // Delta text that fades in, then floats up and fades out
        deltaG.append("text")
          .attr("x", changed.x)
          .attr("y", changed.y - changed.r - 6)
          .attr("text-anchor", "middle")
          .attr("font-size", isGameEnd ? "13px" : "11px")
          .attr("font-family", "var(--font-mono)")
          .attr("font-weight", "bold")
          .attr("fill", color)
          .attr("opacity", 0)
          .text(deltaText)
          .transition().delay(stagger).duration(300)
          .attr("opacity", 1)
          .transition().delay(isGameEnd ? 4000 : 3000).duration(2000)
          .attr("y", changed.y - changed.r - 28)
          .attr("opacity", 0)
          .remove();
      }
    }

    const enterFromY = padding.top - 20;
    const enterCount = dots.enter().size();
    const isBulkLoad = enterCount > 3;

    // If no dots are entering, show arcs immediately (they started hidden)
    animatingRef.current = !isBulkLoad && enterCount > 0;
    if (enterCount === 0 || isBulkLoad) arcG.attr("opacity", 1);

    const enterLabelG = svg.append("g").attr("class", "enter-label-layer").attr("pointer-events", "none");
    const enterLabels = new Map();
    const totalEntering = enterCount;

    if (isBulkLoad) {
      // ── Bulk enter (filtering) — fast fade in at target position, no flying labels ──
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
        .transition().duration(400).ease(d3.easeCubicOut)
        .attr("opacity", 1);
    } else {
      // ── Organic enter — fly in from top with gold trailing labels ──
      const entered = dots.enter()
        .append("circle")
        .attr("class", "player-dot")
        .attr("cx", (d) => d.x)
        .attr("cy", enterFromY)
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
          .attr("x", d.x + d.r + 8)
          .attr("y", enterFromY + 4)
          .attr("text-anchor", "start")
          .attr("fill", "var(--gold)")
          .attr("font-size", `${LABEL_FONT_SIZE}px`)
          .attr("font-family", "var(--font-display)")
          .attr("opacity", 0)
          .text(name);
        enterLabels.set(d.tag, label);
      });

      let settledCount = 0;

      entered.transition()
        .duration(4000)
        .ease(d3.easeCubicOut)
        .attrTween("cy", (d) => {
          const interp = d3.interpolate(enterFromY, d.y);
          return (t) => {
            const cy = interp(t);
            const label = enterLabels.get(d.tag);
            if (label) {
              label.attr("y", cy + 4)
                .attr("opacity", Math.min(1, t * 3));
            }
            return cy;
          };
        })
        .attrTween("r", (d) => (t) => d.r * Math.min(1, t * 2))
        .attrTween("opacity", () => (t) => Math.min(1, t * 3))
        .on("end", function (d) {
          const label = enterLabels.get(d.tag);
          if (label) {
            if (labeledTags.has(d.tag)) {
              label.transition().duration(400).attr("opacity", 0).remove();
            } else {
              label.attr("opacity", 1)
                .attr("x", d.x + d.r + 8).attr("y", d.y + 4);
              label.transition().delay(5000).duration(1500)
                .attr("opacity", 0)
                .remove();
            }
          }
          settledCount++;
          if (settledCount >= totalEntering) {
            animatingRef.current = false;
            svg.select(".label-layer")
              .transition().duration(400)
              .attr("opacity", 1);
            svg.select(".arc-layer")
              .transition().duration(600)
              .attr("opacity", 1);
          }
        });
    }

    const allDots = dotGroup.selectAll("circle.player-dot");

    // Build match lookup for hover highlighting
    const matchPlayers = new Map(); // matchId → [{ tag, teamIdx }]
    for (const pos of positions) {
      if (!pos.inGame || pos.matchId == null) continue;
      if (!matchPlayers.has(pos.matchId)) matchPlayers.set(pos.matchId, []);
      matchPlayers.get(pos.matchId).push({ tag: pos.tag, teamIdx: pos.teamIdx });
    }

    // ── Player name labels with collision detection ──
    // Persist label layer across renders for smooth transitions
    let labelG = svg.select(".label-layer");
    const isLabelLayerNew = labelG.empty();
    if (isLabelLayerNew) {
      labelG = svg.append("g").attr("class", "label-layer").attr("pointer-events", "none");
    }
    if (totalEntering > 0 && isLabelLayerNew && !isBulkLoad) labelG.attr("opacity", 0);

    const visible = positions;
    const labeledTags = new Set();
    const labelPositions = [];
    const placedLabelRects = [];

    const bounds = {
      left: padding.left,
      right: width - padding.right,
      top: padding.top - 4,
      bottom: height - padding.bottom + 2,
    };

    // Compute label position (returns data, doesn't append to DOM)
    const computeLabelPos = (pos, force) => {
      const name = pos.tag?.split("#")[0] || "";
      if (!name) return null;

      const textW = name.length * LABEL_CHAR_W + LABEL_PAD_X * 2;
      const textH = LABEL_H + LABEL_PAD_Y * 2;

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
        const candidateX = pos.x + dx;
        const candidateY = pos.y + dy;

        if (candidateX < bounds.left || candidateX + textW > bounds.right) continue;
        if (candidateY < bounds.top || candidateY + textH > bounds.bottom) continue;

        const candidateRect = { x: candidateX, y: candidateY, w: textW, h: textH };
        if (!force) {
          if (placedLabelRects.some((r) => rectsOverlap(candidateRect, r))) continue;
          if (rectOverlapsDot(candidateRect, positions.filter((p) => p.tag !== pos.tag))) continue;
        }

        placedLabelRects.push(candidateRect);
        labeledTags.add(pos.tag);
        return {
          tag: pos.tag, name,
          x: candidateX + textW / 2,
          y: candidateY + textH - LABEL_PAD_Y - 1,
        };
      }
      return null;
    };

    // Always show top 3 MMR players — force-placed before anything else
    const top3 = [...visible].sort((a, b) => b.mmr - a.mmr).slice(0, 3);
    for (const pos of top3) {
      const l = computeLabelPos(pos, true);
      if (l) labelPositions.push(l);
    }

    // Fill in remaining labels by priority (extremes first), respecting collisions
    const byPriority = [...visible].sort((a, b) => {
      const median = d3.median(visible, (d) => d.mmr) || 0;
      return Math.abs(b.mmr - median) - Math.abs(a.mmr - median);
    });

    for (const pos of byPriority) {
      if (labeledTags.has(pos.tag)) continue;
      const l = computeLabelPos(pos, false);
      if (l) labelPositions.push(l);
    }

    // Build set of tags with MMR changes for gold flash
    const changedTagSet = new Set(changedDots.map((d) => d.tag));

    // Data-join labels for smooth transitions
    const labelsSel = labelG.selectAll("text.player-label").data(labelPositions, (d) => d.tag);
    labelsSel.exit().transition().duration(400).attr("opacity", 0).remove();

    labelsSel.enter().append("text")
      .attr("class", "player-label")
      .attr("text-anchor", "middle")
      .attr("font-size", `${LABEL_FONT_SIZE}px`)
      .attr("font-family", "var(--font-display)")
      .attr("data-tag", (d) => d.tag)
      .text((d) => d.name)
      .attr("x", (d) => d.x).attr("y", (d) => d.y)
      .attr("fill", LABEL_COLOR)
      .attr("opacity", 0)
      .transition().duration(600).ease(d3.easeCubicOut)
      .attr("opacity", isLabelLayerNew && totalEntering > 0 && !isBulkLoad ? 0 : 1);

    // Update existing labels — transition position, flash gold if MMR changed
    labelsSel
      .transition().duration(2000).ease(d3.easeSinInOut)
      .attr("x", (d) => d.x).attr("y", (d) => d.y)
      .attr("fill", (d) => changedTagSet.has(d.tag) ? "var(--gold)" : LABEL_COLOR);

    // Fade changed labels back to white after the flash
    if (changedTagSet.size > 0) {
      labelsSel.filter((d) => changedTagSet.has(d.tag))
        .transition().delay(2500).duration(1000)
        .attr("fill", LABEL_COLOR);
    }

    // Ensure label layer is above dots
    labelG.raise();

    // Hover labels group — for temporary labels shown during highlight
    svg.selectAll(".hover-label-layer").remove();
    const hoverLabelG = svg.append("g").attr("class", "hover-label-layer").attr("pointer-events", "none");

    // ── Highlight helpers ──
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

      // Highlight dots — solid team color (fill + stroke match)
      allDots.each(function (od) {
        d3.select(this).interrupt();
        if (od.tag === tag) {
          d3.select(this)
            .attr("fill", myColor).attr("stroke", myColor)
            .attr("stroke-width", 1).attr("r", od.r + 3).attr("opacity", 1);
        } else if (teammates.has(od.tag)) {
          d3.select(this)
            .attr("fill", myColor).attr("stroke", myColor)
            .attr("stroke-width", 1).attr("r", od.r + 1).attr("opacity", 1);
        } else if (opponents.has(od.tag)) {
          d3.select(this)
            .attr("fill", enemyColor).attr("stroke", enemyColor)
            .attr("stroke-width", 1).attr("r", od.r + 1).attr("opacity", 1);
        } else {
          d3.select(this)
            .attr("fill", "rgba(255,255,255,0.15)")
            .attr("opacity", 1)
            .attr("stroke", "none").attr("stroke-width", 0);
        }
      });

      // Hide arcs and static layer during highlight
      svg.select(".arc-layer").attr("opacity", 0.05);
      svg.select(".static-layer").attr("opacity", 0.3);

      // Dim non-match static labels, brighten match ones with team color
      labelG.selectAll("text").each(function () {
        const el = d3.select(this);
        const t = el.attr("data-tag");
        if (matchTags.has(t)) {
          const color = (t === tag || teammates.has(t)) ? myColor : enemyColor;
          el.attr("fill", color).attr("opacity", 1);
        } else {
          el.attr("opacity", 0.08);
        }
      });

      // Add temporary hover labels for unlabeled match participants (with collision detection)
      hoverLabelG.selectAll("*").remove();
      const hoverPlaced = []; // track placed hover label rects
      for (const mTag of matchTags) {
        if (labeledTags.has(mTag)) continue;
        const mPos = positions.find((p) => p.tag === mTag);
        if (!mPos) continue;
        const name = mPos.tag?.split("#")[0] || "";
        if (!name) continue;
        const color = (mTag === tag || teammates.has(mTag)) ? myColor : enemyColor;

        const textW = name.length * LABEL_CHAR_W + LABEL_PAD_X * 2;
        const textH = LABEL_H + LABEL_PAD_Y * 2;
        let labelY = mPos.y - textH / 2;
        labelY = Math.max(bounds.top, Math.min(bounds.bottom - textH, labelY));

        const leftX = mPos.x - mPos.r - 4 - textW;
        const rightX = mPos.x + mPos.r + 4;

        for (const candidateX of [rightX, leftX]) {
          if (candidateX < bounds.left || candidateX + textW > bounds.right) continue;
          const candidateRect = { x: candidateX, y: labelY, w: textW, h: textH };
          // Only check against other hover labels and match participant dots (dimmed dots are fine to overlap)
          if (hoverPlaced.some((r) => rectsOverlap(candidateRect, r))) continue;
          const matchDots = positions.filter((p) => p.tag !== mTag && matchTags.has(p.tag));
          if (rectOverlapsDot(candidateRect, matchDots)) continue;

          hoverPlaced.push(candidateRect);
          hoverLabelG.append("text")
            .attr("x", candidateX + textW / 2)
            .attr("y", labelY + textH - LABEL_PAD_Y - 1)
            .attr("text-anchor", "middle")
            .attr("fill", color)
            .attr("font-size", `${LABEL_FONT_SIZE}px`)
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
      // Restore arcs and static layer
      svg.select(".arc-layer").attr("opacity", 1);
      svg.select(".static-layer").attr("opacity", 1);
      labelG.selectAll("text").each(function () {
        d3.select(this).attr("fill", LABEL_COLOR).attr("opacity", 1);
      });
      hoverLabelG.selectAll("*").remove();
    };

    // ── Event handlers (disabled during entrance animation) ──
    allDots
      .on("mouseenter", function (e, d) {
        if (animatingRef.current) return;
        hoveredTagRef.current = d.tag;
        if (d.inGame && d.matchId != null) {
          applyHighlight(d.tag);
        } else {
          // Brighten hovered dot
          d3.select(this).attr("r", d.r + 3).attr("fill", "#fff")
            .attr("stroke", "rgba(255,255,255,0.5)").attr("stroke-width", 2);
          // Dim all other dots
          allDots.each(function (od) {
            if (od.tag === d.tag) return;
            d3.select(this)
              .attr("fill", "rgba(255,255,255,0.15)")
              .attr("stroke", "none").attr("stroke-width", 0);
          });
          // Dim all static labels except this player's
          labelG.selectAll("text").each(function () {
            const el = d3.select(this);
            if (el.attr("data-tag") === d.tag) {
              el.attr("fill", "#fff").attr("opacity", 1);
            } else {
              el.attr("opacity", 0.05);
            }
          });
          // Dim arcs and static layer
          svg.select(".arc-layer").attr("opacity", 0.05);
          svg.select(".static-layer").attr("opacity", 0.3);
          // Show hover label if not already labeled
          hoverLabelG.selectAll("*").remove();
          if (!labeledTags.has(d.tag)) {
            const name = d.tag?.split("#")[0] || "";
            if (name) {
              hoverLabelG.append("text")
                .attr("x", d.x + d.r + 8)
                .attr("y", d.y + 4)
                .attr("text-anchor", "start")
                .attr("fill", "#fff")
                .attr("font-size", `${LABEL_FONT_SIZE}px`)
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

    // Re-apply highlight if mouse is still over a dot after re-render
    if (hoveredTagRef.current && !animatingRef.current) {
      applyHighlight(hoveredTagRef.current);
    }

  }, [introReady, players, matches, width, height, histogram, inGameMap, onPlayerClick, mmrFilter, onMmrFilter]);

  if (!players || players.length === 0) return null;

  return (
    <div ref={containerRef} className="mmr-strip-container" style={{ position: "relative" }}>
      <svg ref={svgRef} width={width} height={height} />
    </div>
  );
};

export default OnlineMmrStrip;