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

const OnlineMmrStrip = ({
  players,
  matches = [],
  histogram = null,
  onPlayerClick = null,
}) => {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const hoveredTagRef = useRef(null);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);

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
    if (!svgRef.current || !width || !height || height < 60 || !players || players.length === 0) return;

    const svg = d3.select(svgRef.current);

    const padding = { left: 40, right: 40, top: 24, bottom: 30 };
    const chartHeight = height - padding.top - padding.bottom;
    const centerY = padding.top + chartHeight / 2;

    const mmrs = players.map((p) => p.mmr);
    const minMmr = d3.min(mmrs) - 50;
    const maxMmr = d3.max(mmrs) + 50;

    const x = d3.scaleLinear()
      .domain([minMmr, maxMmr])
      .range([padding.left, width - padding.right]);

    // Max games for dot sizing
    const allGames = players.map((p) => (p.wins || 0) + (p.losses || 0));
    const maxGames = d3.max(allGames) || 1;
    const rScale = d3.scaleSqrt().domain([0, maxGames]).range([4, 16]);

    // ── Clear static layers, keep dot group ──
    svg.selectAll(".static-layer").remove();
    svg.selectAll(".arc-layer").remove();
    svg.selectAll(".label-layer").remove();

    // Static group (behind everything) — no mouse interaction
    const staticG = svg.append("g").attr("class", "static-layer").attr("pointer-events", "none");

    // ── Histogram backdrop ──
    if (histogram && histogram.length > 0) {
      const histMaxCount = d3.max(histogram, (d) => d.count) || 1;
      const yHist = d3.scaleLinear().domain([0, histMaxCount]).range([0, chartHeight * 0.15]);

      const areaAbove = d3.area()
        .x((d) => x(d.mmr))
        .y0(centerY)
        .y1((d) => centerY - yHist(d.count))
        .curve(d3.curveBasis);

      const areaBelow = d3.area()
        .x((d) => x(d.mmr))
        .y0(centerY)
        .y1((d) => centerY + yHist(d.count))
        .curve(d3.curveBasis);

      const visibleBins = histogram.filter((d) => d.mmr >= minMmr && d.mmr <= maxMmr);

      if (visibleBins.length > 1) {
        staticG.append("path")
          .datum(visibleBins)
          .attr("d", areaAbove)
          .attr("fill", "rgba(252, 219, 51, 0.04)")
          .attr("stroke", "rgba(252, 219, 51, 0.08)")
          .attr("stroke-width", 1);

        staticG.append("path")
          .datum(visibleBins)
          .attr("d", areaBelow)
          .attr("fill", "rgba(252, 219, 51, 0.04)")
          .attr("stroke", "rgba(252, 219, 51, 0.08)")
          .attr("stroke-width", 1);
      }
    }

    // ── Grid lines ──
    const step = 200;
    const gridStart = Math.ceil(minMmr / step) * step;
    for (let v = gridStart; v <= maxMmr; v += step) {
      staticG.append("line")
        .attr("x1", x(v)).attr("x2", x(v))
        .attr("y1", padding.top).attr("y2", height - padding.bottom)
        .attr("stroke", "#222").attr("stroke-width", 1);
      staticG.append("text")
        .attr("x", x(v)).attr("y", height - 6)
        .attr("fill", "#555").attr("font-size", "10px")
        .attr("font-family", "var(--font-mono)").attr("text-anchor", "middle")
        .text(v);
    }

    // ── Center axis ──
    staticG.append("line")
      .attr("x1", padding.left).attr("x2", width - padding.right)
      .attr("y1", centerY).attr("y2", centerY)
      .attr("stroke", "#333").attr("stroke-width", 1);

    // ── Beeswarm positions ──
    const sorted = [...players].sort((a, b) => a.mmr - b.mmr);
    const positions = [];

    for (const player of sorted) {
      const px = x(player.mmr);
      const games = (player.wins || 0) + (player.losses || 0);
      const dotR = rScale(games);
      let py = centerY;
      let offset = 1;
      while (positions.some((p) => {
        const minDist = (p.r + dotR) * 1.2;
        return Math.hypot(p.x - px, p.y - py) < minDist;
      })) {
        py = centerY + (offset % 2 === 0 ? 1 : -1) * Math.ceil(offset / 2) * (dotR * 2.2);
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

    // ── Match pairing arcs ──
    const arcG = svg.append("g").attr("class", "arc-layer").attr("pointer-events", "none");
    const teamGroups = new Map();
    for (const pos of positions) {
      if (!pos.inGame || pos.matchId == null) continue;
      const key = `${pos.matchId}-${pos.teamIdx}`;
      if (!teamGroups.has(key)) teamGroups.set(key, []);
      teamGroups.get(key).push(pos);
    }

    for (const [, members] of teamGroups) {
      if (members.length < 2) continue;
      const teamIdx = members[0].teamIdx;
      const color = TEAM_COLORS[teamIdx] || "#888";
      for (let i = 0; i < members.length - 1; i++) {
        const a = members[i];
        const b = members[i + 1];
        const dist = Math.abs(a.x - b.x);
        const controlY = Math.min(a.y, b.y) - dist * 0.3 - 8;
        arcG.append("path")
          .attr("d", `M ${a.x} ${a.y} Q ${(a.x + b.x) / 2} ${controlY} ${b.x} ${b.y}`)
          .attr("fill", "none")
          .attr("stroke", color)
          .attr("stroke-width", 1)
          .attr("opacity", 0.25);
      }
    }

    // ── Enter/exit dot animations via data join ──
    let dotGroup = svg.select(".dot-group");
    if (dotGroup.empty()) {
      dotGroup = svg.append("g").attr("class", "dot-group");
    }
    // Ensure dots are always the topmost interactive layer
    dotGroup.raise();

    const dots = dotGroup.selectAll("circle.player-dot")
      .data(positions, (d) => d.tag);

    dots.exit()
      .transition().duration(400)
      .attr("r", 0).attr("opacity", 0)
      .remove();

    dots.transition().duration(300)
      .attr("cx", (d) => d.x)
      .attr("cy", (d) => d.y)
      .attr("r", (d) => d.r)
      .attr("fill", (d) => d.inGame ? DOT_COLOR_INGAME : DOT_COLOR)
      .attr("opacity", 1);

    const startX = x(1500);

    const entered = dots.enter()
      .append("circle")
      .attr("class", "player-dot")
      .attr("cx", startX)
      .attr("cy", centerY)
      .attr("r", 2)
      .attr("opacity", 0.3)
      .attr("fill", (d) => d.inGame ? DOT_COLOR_INGAME : DOT_COLOR)
      .attr("stroke", "rgba(0,0,0,0.2)")
      .attr("stroke-width", 0.5)
      .attr("cursor", "pointer");

    entered.transition()
      .duration(600)
      .ease(d3.easeCubicOut)
      .attr("cx", (d) => d.x)
      .attr("cy", (d) => d.y)
      .attr("r", (d) => d.r)
      .attr("opacity", 1);

    const allDots = entered.merge(dots);

    // Build match lookup for hover highlighting
    const matchPlayers = new Map(); // matchId → [{ tag, teamIdx }]
    for (const pos of positions) {
      if (!pos.inGame || pos.matchId == null) continue;
      if (!matchPlayers.has(pos.matchId)) matchPlayers.set(pos.matchId, []);
      matchPlayers.get(pos.matchId).push({ tag: pos.tag, teamIdx: pos.teamIdx });
    }

    // ── Player name labels with collision detection ──
    const labelG = svg.append("g").attr("class", "label-layer").attr("pointer-events", "none");
    const visible = positions;
    const labeledTags = new Set(); // track which tags got a static label

    // Sort by priority: highest MMR first, then lowest — labels the extremes first,
    // then fills in anyone else who fits
    const byPriority = [...visible].sort((a, b) => {
      const median = d3.median(visible, (d) => d.mmr) || 0;
      return Math.abs(b.mmr - median) - Math.abs(a.mmr - median);
    });

    const placedLabels = [];
    const bounds = {
      left: padding.left,
      right: width - padding.right,
      top: padding.top - 4,
      bottom: height - padding.bottom + 2,
    };

    for (const pos of byPriority) {
      const name = pos.tag?.split("#")[0] || "";
      if (!name) continue;

      const textW = name.length * LABEL_CHAR_W + LABEL_PAD_X * 2;
      const textH = LABEL_H + LABEL_PAD_Y * 2;

      let labelX = pos.x - textW / 2;
      labelX = Math.max(bounds.left, Math.min(bounds.right - textW, labelX));

      const aboveY = pos.y - pos.r - 4 - textH;
      const belowY = pos.y + pos.r + 4;

      for (const candidateY of [aboveY, belowY]) {
        if (candidateY < bounds.top || candidateY + textH > bounds.bottom) continue;

        const candidateRect = { x: labelX, y: candidateY, w: textW, h: textH };
        if (placedLabels.some((r) => rectsOverlap(candidateRect, r))) continue;
        if (rectOverlapsDot(candidateRect, positions.filter((p) => p.tag !== pos.tag))) continue;

        placedLabels.push(candidateRect);
        labeledTags.add(pos.tag);
        labelG.append("text")
          .attr("x", labelX + textW / 2)
          .attr("y", candidateY + textH - LABEL_PAD_Y - 1)
          .attr("text-anchor", "middle")
          .attr("fill", LABEL_COLOR)
          .attr("font-size", `${LABEL_FONT_SIZE}px`)
          .attr("font-family", "var(--font-display)")
          .attr("data-tag", pos.tag)
          .text(name);
        break;
      }
    }

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
        let labelX = mPos.x - textW / 2;
        labelX = Math.max(bounds.left, Math.min(bounds.right - textW, labelX));

        const aboveY = mPos.y - mPos.r - 4 - textH;
        const belowY = mPos.y + mPos.r + 4;

        for (const candidateY of [aboveY, belowY]) {
          if (candidateY < bounds.top || candidateY + textH > bounds.bottom) continue;
          const candidateRect = { x: labelX, y: candidateY, w: textW, h: textH };
          // Only check against other hover labels and match participant dots (dimmed dots are fine to overlap)
          if (hoverPlaced.some((r) => rectsOverlap(candidateRect, r))) continue;
          const matchDots = positions.filter((p) => p.tag !== mTag && matchTags.has(p.tag));
          if (rectOverlapsDot(candidateRect, matchDots)) continue;

          hoverPlaced.push(candidateRect);
          hoverLabelG.append("text")
            .attr("x", labelX + textW / 2)
            .attr("y", candidateY + textH - LABEL_PAD_Y - 1)
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

    // ── Event handlers ──
    allDots
      .on("mouseenter", function (e, d) {
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
                .attr("x", d.x)
                .attr("y", d.y - d.r - 8)
                .attr("text-anchor", "middle")
                .attr("fill", "#fff")
                .attr("font-size", `${LABEL_FONT_SIZE}px`)
                .attr("font-family", "var(--font-display)")
                .text(name);
            }
          }
        }
      })
      .on("mouseleave", function (e, d) {
        hoveredTagRef.current = null;
        clearHighlight();
      })
      .on("click", function (e, d) {
        onPlayerClick?.(d.tag);
      });

    // Re-apply highlight if mouse is still over a dot after re-render
    if (hoveredTagRef.current) {
      applyHighlight(hoveredTagRef.current);
    }

  }, [players, matches, width, height, histogram, inGameMap, onPlayerClick]);

  if (!players || players.length === 0) return null;

  return (
    <div ref={containerRef} className="mmr-strip-container" style={{ position: "relative" }}>
      <svg ref={svgRef} width={width} height={height} />
    </div>
  );
};

export default OnlineMmrStrip;
