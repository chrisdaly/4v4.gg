import React, { useRef, useEffect, useState, useMemo } from "react";
import * as d3 from "d3";
import { feature } from "topojson-client";
import countryCentroids from "../lib/countryCentroids";
import "../styles/components/WorldMap.css";

/** Compute the subsolar point (no library needed). */
const getSubsolarPoint = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now - start) / 86400000);
  const declination = -23.44 * Math.cos((2 * Math.PI / 365) * (dayOfYear + 10));
  const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60;
  const longitude = -(utcHours / 24 * 360 - 180);
  return [longitude, declination];
};

// Visible bounds — crop Antarctica, keep Arctic fringe
const LAT_SOUTH = -55;
const LAT_NORTH = 80;
const VISIBLE_BOUNDS = {
  type: "Polygon",
  coordinates: [[
    [-180, LAT_SOUTH], [180, LAT_SOUTH], [180, LAT_NORTH], [-180, LAT_NORTH], [-180, LAT_SOUTH],
  ]],
};

// Europe inset bounds (counterclockwise for correct GeoJSON winding)
const EU_BOUNDS = {
  type: "Polygon",
  coordinates: [[[-12, 34], [-12, 62], [45, 62], [45, 34], [-12, 34]]],
};

// European country codes — dots in these countries get labels in the inset, not the main map
const EU_CODES = new Set([
  "AL", "AD", "AT", "BY", "BE", "BA", "BG", "HR", "CY", "CZ", "DK", "EE",
  "FI", "FR", "DE", "GR", "HU", "IS", "IE", "IT", "XK", "LV", "LI", "LT",
  "LU", "MK", "MT", "MD", "MC", "ME", "NL", "NO", "PL", "PT", "RO",
  "SM", "RS", "SK", "SI", "ES", "SE", "CH", "UA", "GB", "VA",
]);

// Label layout constants
const LABEL_FONT_SIZE = 11;
const LABEL_CHAR_W = 6.2;
const LABEL_H = 13;
const LABEL_PAD_X = 3;
const LABEL_PAD_Y = 2;

const rectsOverlap = (a, b) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

// Time zone cities
const TIME_ZONES = [
  { label: "LA", lon: -118.24, lat: -42, offset: -8 },
  { label: "NYC", lon: -74.0, lat: -42, offset: -5 },
  { label: "SAO", lon: -46.6, lat: -42, offset: -3 },
  { label: "LON", lon: -0.12, lat: -42, offset: 0 },
  { label: "MSK", lon: 37.6, lat: -42, offset: 3 },
  { label: "SEL", lon: 127.0, lat: -42, offset: 9 },
  { label: "SYD", lon: 151.2, lat: -42, offset: 11 },
];

const formatTime = (offset) => {
  const now = new Date();
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

      g.append("text")
        .attr("x", lx + padX)
        .attr("y", ly + textH - padY - 1)
        .attr("fill", "rgba(255, 255, 255, 0.6)")
        .attr("font-size", `${fontSize}px`)
        .attr("font-family", "var(--font-display)")
        .text(name);
      break;
    }
  }
  return placed;
};

const WorldMap = ({ playerCountries, players = [] }) => {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [worldData, setWorldData] = useState(null);

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
        online: counts.online || 0,
        inGame: counts.inGame || 0,
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
    if (!svgRef.current || !width || !height || !worldData) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const projection = buildProjection(width, height);
    const path = d3.geoPath(projection);

    // 1. Ocean background
    svg.append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "rgba(10, 10, 15, 0.6)")
      .attr("rx", 6);

    // 2. Land polygons
    svg.append("g")
      .selectAll("path")
      .data(worldData.features)
      .join("path")
      .attr("d", path)
      .attr("fill", "rgba(60, 60, 55, 0.5)")
      .attr("stroke", "rgba(100, 100, 90, 0.3)")
      .attr("stroke-width", 0.5);

    // 3. Graticule
    const graticule = d3.geoGraticule().stepMinor([30, 30]).extentMinor([[-180, LAT_SOUTH], [180, LAT_NORTH]])();
    svg.append("path")
      .datum(graticule)
      .attr("d", path)
      .attr("fill", "none")
      .attr("stroke", "rgba(255, 255, 255, 0.04)")
      .attr("stroke-width", 0.5);

    // 4. Night overlay
    const subsolar = getSubsolarPoint();
    const antipode = [-subsolar[0], -subsolar[1]];
    const nightCircle = d3.geoCircle().center(antipode).radius(90)();

    svg.append("path")
      .datum(nightCircle)
      .attr("class", "night-overlay")
      .attr("d", path)
      .attr("fill", "rgba(0, 0, 0, 0.35)")
      .attr("stroke", "none");

    // 5. Player dots (main map)
    const maxTotal = d3.max(dots, (d) => d.total) || 1;
    const rScale = d3.scaleSqrt().domain([1, Math.max(maxTotal, 2)]).range([3, 12]);
    const dotPositions = [];

    if (dots.length > 0) {
      const dotG = svg.append("g");

      for (const d of dots) {
        const pt = projection([d.lon, d.lat]);
        if (!pt) continue;
        const r = rScale(d.total);
        dotPositions.push({ x: pt[0], y: pt[1], r, code: d.code });
      }

      dotG.selectAll("circle.player-dot")
        .data(dots)
        .join("circle")
        .attr("class", "player-dot")
        .attr("cx", (d) => projection([d.lon, d.lat])?.[0])
        .attr("cy", (d) => projection([d.lon, d.lat])?.[1])
        .attr("r", (d) => rScale(d.total))
        .attr("fill", "var(--gold, #fcdb33)")
        .attr("fill-opacity", 0.7)
        .attr("stroke", "var(--gold, #fcdb33)")
        .attr("stroke-opacity", 0.3)
        .attr("stroke-width", 1);
    }

    // 6. Main map labels — non-European players only (Europe handled by inset)
    const mainCandidates = labelCandidates.filter((p) => !EU_CODES.has(p.country.toUpperCase()));
    const mainDotPositions = dotPositions.filter((d) => !EU_CODES.has(d.code));
    const labelG = svg.append("g").attr("pointer-events", "none");
    const placedLabels = placeLabels(
      labelG, mainCandidates, mainDotPositions, [],
      { left: 0, top: 0, right: width, bottom: height },
      LABEL_FONT_SIZE,
    );

    // 7. Europe inset — bottom-left corner
    const euDots = dots.filter((d) => EU_CODES.has(d.code));
    if (euDots.length > 0) {
      const insetW = Math.min(width * 0.42, 360);
      const insetH = Math.min(height * 0.65, 300);
      const insetX = 6;
      const insetY = height - insetH - 22;
      const insetPad = 10;

      // Inset background
      svg.append("rect")
        .attr("x", insetX)
        .attr("y", insetY)
        .attr("width", insetW)
        .attr("height", insetH)
        .attr("fill", "rgba(8, 8, 12, 0.7)")
        .attr("stroke", "rgba(255, 255, 255, 0.1)")
        .attr("stroke-width", 0.5)
        .attr("rx", 4);

      // Europe projection — fitExtent with absolute inset coordinates
      const euProjection = d3.geoMercator()
        .fitExtent(
          [[insetX + insetPad, insetY + insetPad], [insetX + insetW - insetPad, insetY + insetH - insetPad]],
          EU_BOUNDS,
        )
        .clipExtent([[insetX, insetY], [insetX + insetW, insetY + insetH]]);

      const euPath = d3.geoPath(euProjection);

      // Inset land
      const euLandG = svg.append("g");
      euLandG.selectAll("path")
        .data(worldData.features)
        .join("path")
        .attr("d", euPath)
        .attr("fill", "rgba(60, 60, 55, 0.5)")
        .attr("stroke", "rgba(100, 100, 90, 0.3)")
        .attr("stroke-width", 0.3);

      // Inset night overlay
      svg.append("path")
        .datum(nightCircle)
        .attr("class", "night-overlay-eu")
        .attr("d", euPath)
        .attr("fill", "rgba(0, 0, 0, 0.3)")
        .attr("stroke", "none");

      // Inset dots
      const euRScale = d3.scaleSqrt().domain([1, Math.max(maxTotal, 2)]).range([2, 8]);
      const euDotPositions = [];
      const euDotG = svg.append("g");

      for (const d of euDots) {
        const pt = euProjection([d.lon, d.lat]);
        if (!pt) continue;
        if (pt[0] < insetX || pt[0] > insetX + insetW || pt[1] < insetY || pt[1] > insetY + insetH) continue;
        const r = euRScale(d.total);
        euDotPositions.push({ x: pt[0], y: pt[1], r, code: d.code });
      }

      euDotG.selectAll("circle.eu-dot")
        .data(euDots)
        .join("circle")
        .attr("cx", (d) => euProjection([d.lon, d.lat])?.[0])
        .attr("cy", (d) => euProjection([d.lon, d.lat])?.[1])
        .attr("r", (d) => euRScale(d.total))
        .attr("fill", "var(--gold, #fcdb33)")
        .attr("fill-opacity", 0.7)
        .attr("stroke", "var(--gold, #fcdb33)")
        .attr("stroke-opacity", 0.3)
        .attr("stroke-width", 0.5);

      // Inset labels
      const euCandidates = labelCandidates.filter((p) => EU_CODES.has(p.country.toUpperCase()));
      const euLabelG = svg.append("g").attr("pointer-events", "none");
      placeLabels(
        euLabelG, euCandidates, euDotPositions, [],
        { left: insetX + 2, top: insetY + 2, right: insetX + insetW - 2, bottom: insetY + insetH - 2 },
        10,
      );

      // "EUROPE" label
      svg.append("text")
        .attr("x", insetX + 6)
        .attr("y", insetY + 12)
        .attr("fill", "rgba(255, 255, 255, 0.3)")
        .attr("font-size", "9px")
        .attr("font-family", "var(--font-mono)")
        .attr("letter-spacing", "0.1em")
        .text("EUROPE");

      // Connector line from inset to Europe on main map
      const euCenter = projection([15, 50]);
      if (euCenter) {
        svg.append("line")
          .attr("x1", insetX + insetW)
          .attr("y1", insetY + insetH / 2)
          .attr("x2", euCenter[0])
          .attr("y2", euCenter[1])
          .attr("stroke", "rgba(255, 255, 255, 0.08)")
          .attr("stroke-width", 0.5)
          .attr("stroke-dasharray", "3,3");
      }
    }

    // 8. Time zone labels along bottom
    const timeG = svg.append("g").attr("pointer-events", "none");
    const placedTimeLabels = [];
    for (const tz of TIME_ZONES) {
      const pt = projection([tz.lon, tz.lat]);
      if (!pt) continue;
      const [tx, ty] = pt;
      if (tx < 10 || tx > width - 10 || ty > height) continue;

      const timeStr = formatTime(tz.offset);
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

  }, [dimensions, worldData, dots, labelCandidates]);

  // Update terminator every 60s
  useEffect(() => {
    if (!svgRef.current || !worldData || !dimensions.width) return;

    const interval = setInterval(() => {
      const svg = d3.select(svgRef.current);
      const projection = buildProjection(dimensions.width, dimensions.height);
      const path = d3.geoPath(projection);

      const subsolar = getSubsolarPoint();
      const antipode = [-subsolar[0], -subsolar[1]];
      const nightCircle = d3.geoCircle().center(antipode).radius(90)();

      svg.select(".night-overlay").attr("d", path(nightCircle));
      // Also update the inset night overlay if it exists
      svg.select(".night-overlay-eu").each(function () {
        const { width, height } = dimensions;
        const insetW = Math.min(width * 0.42, 360);
        const insetH = Math.min(height * 0.65, 300);
        const insetX = 6;
        const insetY = height - insetH - 22;
        const insetPad = 10;
        const euProj = d3.geoMercator()
          .fitExtent(
            [[insetX + insetPad, insetY + insetPad], [insetX + insetW - insetPad, insetY + insetH - insetPad]],
            EU_BOUNDS,
          )
          .clipExtent([[insetX, insetY], [insetX + insetW, insetY + insetH]]);
        d3.select(this).attr("d", d3.geoPath(euProj)(nightCircle));
      });
    }, 60000);

    return () => clearInterval(interval);
  }, [worldData, dimensions]);

  return (
    <div ref={containerRef} className="world-map-container">
      <svg ref={svgRef} width={dimensions.width} height={dimensions.height} />
    </div>
  );
};

export default WorldMap;
