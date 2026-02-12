import React, { useRef, useEffect, useState, useMemo } from "react";
import * as d3 from "d3";
import { feature } from "topojson-client";
import countryCentroids from "../lib/countryCentroids";
import "../styles/components/WorldMap.css";

/** Compute the subsolar point (no library needed). */
const getSubsolarPoint = (time) => {
  const now = time || new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now - start) / 86400000);
  const declination = -23.44 * Math.cos((2 * Math.PI / 365) * (dayOfYear + 10));
  const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60;
  const longitude = -(utcHours / 24 * 360 - 180);
  return [longitude, declination];
};

// Visible bounds — cropped to focus on player regions (NA, SA, Europe, Asia)
// Shifted east to center on Atlantic, tighter south crop
const LAT_SOUTH = -42;
const LAT_NORTH = 72;
const LON_WEST = -130;
const LON_EAST = 160;
const VISIBLE_BOUNDS = {
  type: "Polygon",
  coordinates: [[
    [LON_WEST, LAT_SOUTH], [LON_EAST, LAT_SOUTH], [LON_EAST, LAT_NORTH], [LON_WEST, LAT_NORTH], [LON_WEST, LAT_SOUTH],
  ]],
};

// Buffer initial data before starting entrance animation (matches MMR strip timing)
const INTRO_BUFFER_MS = 2500;

// Label layout constants
const LABEL_FONT_SIZE = 11;
const DOT_COLOR = "rgba(255, 255, 255, 0.75)";

const rectsOverlap = (a, b) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

// Time zone cities — lat set to bottom of visible area
const TIME_ZONES = [
  { label: "LA", lon: -118.24, offset: -8 },
  { label: "NYC", lon: -74.0, offset: -5 },
  { label: "SAO", lon: -46.6, offset: -3 },
  { label: "LON", lon: -0.12, offset: 0 },
  { label: "MSK", lon: 37.6, offset: 3 },
  { label: "SEL", lon: 127.0, offset: 9 },
  { label: "SYD", lon: 151.2, offset: 11 },
];

const formatTime = (offset, time) => {
  const now = time || new Date();
  const utcH = now.getUTCHours();
  const utcM = now.getUTCMinutes();
  let h = (utcH + offset + 24) % 24;
  const ampm = h >= 12 ? "p" : "a";
  h = h % 12 || 12;
  const m = utcM < 10 ? `0${utcM}` : utcM;
  return `${h}:${m}${ampm}`;
};

/** Build the projection fitted to our cropped bounds. */
const buildProjection = (width, height) => {
  return d3.geoNaturalEarth1()
    .fitSize([width, height], VISIBLE_BOUNDS)
    .clipExtent([[0, 0], [width, height]]);
};

/**
 * Place labels for a set of players near their dots.
 * Returns array of placed label rects (for further collision checks).
 */
const placeLabels = (g, candidates, dotPositions, existingRects, bounds, fontSize) => {
  const charW = fontSize * 0.56;
  const labelH = fontSize + 2;
  const padX = 3;
  const padY = 2;
  const placed = [...existingRects];

  for (const player of candidates) {
    const code = player.country.toUpperCase();
    const dotPos = dotPositions.find((d) => d.code === code);
    if (!dotPos) continue;

    const name = player.name;
    if (!name) continue;

    const textW = name.length * charW + padX * 2;
    const textH = labelH + padY * 2;

    const offsets = [
      { dx: dotPos.r + 4, dy: -textH / 2 },
      { dx: dotPos.r + 2, dy: -dotPos.r - textH },
      { dx: -textW / 2, dy: -dotPos.r - textH - 2 },
      { dx: -textW - dotPos.r - 2, dy: -dotPos.r - textH },
      { dx: -textW - dotPos.r - 4, dy: -textH / 2 },
      { dx: -textW - dotPos.r - 2, dy: dotPos.r },
      { dx: -textW / 2, dy: dotPos.r + 4 },
      { dx: dotPos.r + 2, dy: dotPos.r },
    ];

    for (const { dx, dy } of offsets) {
      const lx = dotPos.x + dx;
      const ly = dotPos.y + dy;

      if (lx < bounds.left || ly < bounds.top || lx + textW > bounds.right || ly + textH > bounds.bottom) continue;

      const candidateRect = { x: lx, y: ly, w: textW, h: textH };

      if (placed.some((r) => rectsOverlap(candidateRect, r))) continue;

      let hitsDot = false;
      for (const dp of dotPositions) {
        const dotRect = { x: dp.x - dp.r, y: dp.y - dp.r, w: dp.r * 2, h: dp.r * 2 };
        if (rectsOverlap(candidateRect, dotRect)) { hitsDot = true; break; }
      }
      if (hitsDot) continue;

      placed.push(candidateRect);

      // In-game players get gold labels, online players get dimmer white
      const labelColor = player.inGame ? "var(--gold)" : "rgba(255, 255, 255, 0.5)";
      g.append("text")
        .attr("x", Math.round(lx + padX))
        .attr("y", Math.round(ly + textH - padY - 1))
        .attr("fill", labelColor)
        .attr("font-size", `${fontSize}px`)
        .attr("font-family", "var(--font-display)")
        .text(name);
      break;
    }
  }
  return placed;
};

const WorldMap = ({ playerCountries, players = [], instant = false, animationScale = 1, time = null }) => {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [worldData, setWorldData] = useState(null);
  const introReadyRef = useRef(instant);
  const [introReady, setIntroReady] = useState(instant);
  const prevPlayersRef = useRef(instant ? new Map() : null); // null = first render, skip diff

  // Buffer initial data so dots from chat + matches all arrive together
  useEffect(() => {
    if (introReadyRef.current) return;
    if (!playerCountries || playerCountries.size === 0) return;
    const timer = setTimeout(() => {
      introReadyRef.current = true;
      setIntroReady(true);
    }, INTRO_BUFFER_MS);
    return () => clearTimeout(timer);
  }, [playerCountries]);

  useEffect(() => {
    fetch("/data/world-110m.json")
      .then((r) => r.json())
      .then((topo) => {
        const land = feature(topo, topo.objects.countries);
        setWorldData(land);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) {
        setDimensions({
          width: Math.floor(rect.width),
          height: Math.floor(rect.height),
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const dots = useMemo(() => {
    if (!playerCountries || playerCountries.size === 0) return [];
    const result = [];
    for (const [code, counts] of playerCountries) {
      const coords = countryCentroids[code.toUpperCase()];
      if (!coords) continue;
      result.push({
        code: code.toUpperCase(),
        lon: coords[0],
        lat: coords[1],
        total: (counts.online || 0) + (counts.inGame || 0),
      });
    }
    return result;
  }, [playerCountries]);

  // ALL players sorted by MMR desc — collision detection naturally limits density
  const labelCandidates = useMemo(() => {
    if (!players || players.length === 0) return [];
    return [...players]
      .filter((p) => p.country)
      .sort((a, b) => (b.mmr ?? -1) - (a.mmr ?? -1));
  }, [players]);

  // Main D3 render
  useEffect(() => {
    const { width, height } = dimensions;
    if (!introReady || !svgRef.current || !width || !height || !worldData) return;

    const s = animationScale;
    const svg = d3.select(svgRef.current);

    // Only clear static layers — keep dot group for transitions
    svg.selectAll(".static-layer").remove();
    svg.selectAll(".label-layer").remove();
    svg.selectAll(".time-layer").remove();

    const projection = buildProjection(width, height);
    const path = d3.geoPath(projection);

    // Static group — land, graticule, night
    const staticG = svg.append("g").attr("class", "static-layer").attr("pointer-events", "none");

    // Land polygons
    staticG.append("g")
      .selectAll("path")
      .data(worldData.features)
      .join("path")
      .attr("d", path)
      .attr("fill", "rgba(60, 60, 55, 0.5)")
      .attr("stroke", "rgba(100, 100, 90, 0.3)")
      .attr("stroke-width", 0.5);

    // 3. Graticule
    const graticule = d3.geoGraticule().stepMinor([30, 30]).extentMinor([[LON_WEST, LAT_SOUTH], [LON_EAST, LAT_NORTH]])();
    staticG.append("path")
      .datum(graticule)
      .attr("d", path)
      .attr("fill", "none")
      .attr("stroke", "rgba(255, 255, 255, 0.04)")
      .attr("stroke-width", 0.5);

    // 4. Night overlay
    const subsolar = getSubsolarPoint(time);
    const antipodeLon = subsolar[0] > 0 ? subsolar[0] - 180 : subsolar[0] + 180;
    const antipode = [antipodeLon, -subsolar[1]];
    const nightCircle = d3.geoCircle().center(antipode).radius(90)();

    staticG.append("path")
      .datum(nightCircle)
      .attr("class", "night-overlay")
      .attr("d", path)
      .attr("fill", "rgba(0, 0, 0, 0.35)")
      .attr("stroke", "none");

    // 5. Player dots — D3 data join for enter/exit transitions
    const maxTotal = d3.max(dots, (d) => d.total) || 1;
    const rScale = d3.scaleSqrt().domain([1, Math.max(maxTotal, 2)]).range([3, 12]);

    // Compute projected positions
    const dotData = dots.map((d) => {
      const pt = projection([d.lon, d.lat]);
      return pt ? { ...d, px: pt[0], py: pt[1], r: rScale(d.total) } : null;
    }).filter(Boolean);

    // Build dotPositions for label placement
    const dotPositions = dotData.map((d) => ({ x: d.px, y: d.py, r: d.r, code: d.code }));

    // Ensure dot group exists and is above the static layer
    let dotG = svg.select(".dot-group");
    if (dotG.empty()) {
      dotG = svg.append("g").attr("class", "dot-group");
    }
    dotG.raise();

    const dotSel = dotG.selectAll("circle.map-dot")
      .data(dotData, (d) => d.code);

    // Exit — fast fade for bulk exits (filtering), slower for organic
    const mapExitDuration = dotSel.exit().size() > 3 ? 300 : 1500;
    dotSel.exit()
      .transition().duration(mapExitDuration * s).ease(d3.easeCubicIn)
      .attr("r", 0)
      .attr("opacity", 0)
      .remove();

    // Update — move smoothly
    dotSel.transition().duration(1000 * s).ease(d3.easeSinInOut)
      .attr("cx", (d) => d.px)
      .attr("cy", (d) => d.py)
      .attr("r", (d) => d.r);

    // Build a map of country code → top player name for enter labels
    const countryTopPlayer = new Map();
    for (const p of labelCandidates) {
      const code = p.country.toUpperCase();
      if (!countryTopPlayer.has(code)) countryTopPlayer.set(code, p.name);
    }

    // Enter label group — lives above dots, cleared on each render
    svg.selectAll(".enter-label-layer").remove();
    const enterLabelG = svg.append("g").attr("class", "enter-label-layer").attr("pointer-events", "none");

    // Track entering country codes to avoid double labels with static labels
    const enteringCodes = new Set();
    dotSel.enter().each(function (d) { enteringCodes.add(d.code); });

    const isBulkEnter = dotSel.enter().size() > 3;

    // Enter — fast for filter, slow + dramatic for real events
    const enteringDots = dotSel.enter()
      .append("circle")
      .attr("class", "map-dot")
      .attr("cx", (d) => d.px)
      .attr("cy", (d) => d.py)
      .attr("r", 0)
      .attr("fill", DOT_COLOR)
      .attr("stroke", "rgba(255, 255, 255, 0.3)")
      .attr("stroke-width", 0.5)
      .attr("opacity", 0);

    if (isBulkEnter) {
      // Fast filter enter — simple fade in
      enteringDots
        .transition().duration(400 * s).ease(d3.easeCubicOut)
        .attr("r", (d) => d.r)
        .attr("opacity", 1);
    } else {
      // Organic enter — floating name label + glow pulse
      enteringDots.each(function (d) {
        const name = countryTopPlayer.get(d.code);
        if (!name) return;
        enterLabelG.append("text")
          .attr("class", `enter-label-${d.code}`)
          .attr("x", Math.round(d.px + d.r + 6))
          .attr("y", Math.round(d.py + 4))
          .attr("fill", "rgba(255, 255, 255, 0.8)")
          .attr("font-size", `${LABEL_FONT_SIZE}px`)
          .attr("font-family", "var(--font-display)")
          .attr("opacity", 0)
          .text(name);
      });

      enteringDots
        .transition().duration(2000 * s).ease(d3.easeCubicOut)
        .attr("r", (d) => d.r)
        .attr("opacity", 1)
        .each(function (d) {
          enterLabelG.select(`.enter-label-${d.code}`)
            .transition().duration(800 * s)
            .attr("opacity", 1);
        })
        .transition().duration(600 * s)
        .attr("stroke", "rgba(255, 255, 255, 0.6)")
        .attr("stroke-width", 2)
        .transition().duration(800 * s)
        .attr("stroke", "rgba(255, 255, 255, 0.3)")
        .attr("stroke-width", 0.5)
        .on("end", function (d) {
          enterLabelG.select(`.enter-label-${d.code}`)
            .transition().delay(5000 * s).duration(1500 * s)
            .attr("opacity", 0)
            .remove();
        });
    }

    // 6. Per-player enter/exit animations — only for organic events, not filtering
    const currentPlayerMap = new Map();
    for (const p of (players || [])) {
      if (p.battleTag && p.country) {
        currentPlayerMap.set(p.battleTag, { country: p.country.toUpperCase(), name: p.name || p.battleTag.split("#")[0] });
      }
    }
    const isFirstRender = prevPlayersRef.current === null;
    const prevMap = prevPlayersRef.current || new Map();
    prevPlayersRef.current = currentPlayerMap;

    // Count player-level diffs to detect bulk (filter) vs organic
    let playerExitCount = 0;
    let playerEnterCount = 0;
    if (!isFirstRender) {
      for (const tag of prevMap.keys()) { if (!currentPlayerMap.has(tag)) playerExitCount++; }
      for (const tag of currentPlayerMap.keys()) { if (!prevMap.has(tag)) playerEnterCount++; }
    }
    const isBulkPlayerChange = playerExitCount > 3 || playerEnterCount > 3;

    if (!isFirstRender && !isBulkPlayerChange) {
      // Ensure event layer exists (persists across renders)
      let eventG = svg.select(".player-event-layer");
      if (eventG.empty()) eventG = svg.append("g").attr("class", "player-event-layer").attr("pointer-events", "none");
      eventG.raise();

      // Player exits — name drifts up and fades
      for (const [tag, info] of prevMap) {
        if (currentPlayerMap.has(tag)) continue;
        const coords = countryCentroids[info.country];
        if (!coords) continue;
        const pt = projection([coords[0], coords[1]]);
        if (!pt) continue;

        eventG.append("text")
          .attr("x", Math.round(pt[0] + 8))
          .attr("y", Math.round(pt[1] + 4))
          .attr("fill", "rgba(255, 255, 255, 0.7)")
          .attr("font-size", `${LABEL_FONT_SIZE}px`)
          .attr("font-family", "var(--font-display)")
          .attr("opacity", 0.8)
          .text(info.name)
          .transition().duration(2500 * s).ease(d3.easeCubicOut)
          .attr("y", pt[1] - 20)
          .attr("opacity", 0)
          .remove();
      }

      // Player enters at existing countries — ripple + gold name label
      const prevCountries = new Set([...prevMap.values()].map((v) => v.country));
      for (const [tag, info] of currentPlayerMap) {
        if (prevMap.has(tag)) continue;
        if (!prevCountries.has(info.country)) continue; // new country handled by dot enter
        const coords = countryCentroids[info.country];
        if (!coords) continue;
        const pt = projection([coords[0], coords[1]]);
        if (!pt) continue;
        const [px, py] = pt;

        // Expanding ripple ring
        eventG.append("circle")
          .attr("cx", px).attr("cy", py)
          .attr("r", 3)
          .attr("fill", "none")
          .attr("stroke", "rgba(255, 255, 255, 0.9)")
          .attr("stroke-width", 2)
          .attr("opacity", 1)
          .transition().duration(1200 * s).ease(d3.easeCubicOut)
          .attr("r", 24)
          .attr("stroke-width", 0.5)
          .attr("opacity", 0)
          .remove();

        // Bright flash dot at entry point
        eventG.append("circle")
          .attr("cx", px).attr("cy", py)
          .attr("r", 2)
          .attr("fill", "rgba(255, 255, 255, 0.9)")
          .attr("opacity", 1)
          .transition().duration(600 * s).ease(d3.easeCubicOut)
          .attr("r", 6)
          .transition().duration(1000 * s)
          .attr("r", 0)
          .attr("opacity", 0)
          .remove();

        // Gold name label
        eventG.append("text")
          .attr("x", Math.round(px + 10))
          .attr("y", Math.round(py + 4))
          .attr("fill", "var(--gold)")
          .attr("font-size", `${LABEL_FONT_SIZE + 1}px`)
          .attr("font-family", "var(--font-display)")
          .attr("opacity", 0)
          .text(info.name)
          .transition().duration(600 * s)
          .attr("opacity", 1)
          .transition().delay(5000 * s).duration(1500 * s)
          .attr("opacity", 0)
          .remove();
      }
    }

    // 7. Player name labels — skip countries with active enter labels to avoid doubling
    //    Only suppress for organic (non-bulk) enters where animated labels are shown
    const labelG = svg.append("g").attr("class", "label-layer").attr("pointer-events", "none");
    const staticCandidates = enteringCodes.size > 0 && !isBulkEnter
      ? labelCandidates.filter((p) => !enteringCodes.has(p.country.toUpperCase()))
      : labelCandidates;
    const placedLabels = placeLabels(
      labelG, staticCandidates, dotPositions, [],
      { left: 0, top: 0, right: width, bottom: height },
      LABEL_FONT_SIZE,
    );

    // 7. Time zone labels along bottom
    const timeG = svg.append("g").attr("class", "time-layer").attr("pointer-events", "none");
    const placedTimeLabels = [];
    for (const tz of TIME_ZONES) {
      const pt = projection([tz.lon, LAT_SOUTH + 2]);
      if (!pt) continue;
      const [tx, ty] = pt;
      if (tx < 10 || tx > width - 10 || ty > height) continue;

      const timeStr = formatTime(tz.offset, time);
      const tw = (tz.label.length + 1 + timeStr.length) * 5.8 + 14;
      const th = 14;
      const rect = { x: tx - tw / 2, y: height - 20, w: tw, h: th };

      if (placedLabels.some((r) => rectsOverlap(rect, r))) continue;
      if (placedTimeLabels.some((r) => rectsOverlap(rect, r))) continue;

      placedTimeLabels.push(rect);

      const text = timeG.append("text")
        .attr("x", tx)
        .attr("y", height - 9)
        .attr("text-anchor", "middle")
        .attr("font-size", "10px")
        .attr("font-family", "var(--font-mono)")
        .attr("letter-spacing", "0.05em");

      text.append("tspan")
        .attr("fill", "rgba(255, 255, 255, 0.35)")
        .text(tz.label + " ");

      text.append("tspan")
        .attr("fill", "rgba(255, 255, 255, 0.55)")
        .text(timeStr);
    }

  }, [introReady, dimensions, worldData, dots, labelCandidates, players, animationScale, time]);

  // Update terminator every 60s (live mode only — replay re-renders via time dep)
  useEffect(() => {
    if (time || !svgRef.current || !worldData || !dimensions.width) return;

    const interval = setInterval(() => {
      const svg = d3.select(svgRef.current);
      const projection = buildProjection(dimensions.width, dimensions.height);
      const path = d3.geoPath(projection);

      const subsolar = getSubsolarPoint();
      const antipodeLon = subsolar[0] > 0 ? subsolar[0] - 180 : subsolar[0] + 180;
      const antipode = [antipodeLon, -subsolar[1]];
      const nightCircle = d3.geoCircle().center(antipode).radius(90)();

      svg.select(".night-overlay").attr("d", path(nightCircle));
    }, 60000);

    return () => clearInterval(interval);
  }, [worldData, dimensions, time]);

  return (
    <div ref={containerRef} className="world-map-container">
      <svg ref={svgRef} width={dimensions.width} height={dimensions.height} />
    </div>
  );
};

export default WorldMap;
