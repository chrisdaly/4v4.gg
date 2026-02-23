import React, { useState, useCallback, useRef } from "react";
import styled from "styled-components";
import PeonLoader from "../PeonLoader";
import PlayerGlyph from "./PlayerGlyph";

const RELAY_URL =
  import.meta.env.VITE_CHAT_RELAY_URL || "https://4v4gg-chat-relay.fly.dev";

const GOLD = "#fcdb33";
const GOLD_DIM = "#b89a1e";
const GREY = "#bbb";
const GREY_MID = "#444";
const RED = "#f87171";
const GREEN = "#4ade80";

function projectEmbedding(embedding, pcaMean, pcaComponents) {
  const centered = embedding.map((v, d) => v - pcaMean[d]);
  const x = pcaComponents[0].reduce((s, c, d) => s + centered[d] * c, 0);
  const y = pcaComponents[1].reduce((s, c, d) => s + centered[d] * c, 0);
  return { x, y };
}

function covarianceEllipse(dots) {
  if (dots.length < 3) return null;
  const n = dots.length;
  const mx = dots.reduce((s, d) => s + d.x, 0) / n;
  const my = dots.reduce((s, d) => s + d.y, 0) / n;
  let cxx = 0, cyy = 0, cxy = 0;
  for (const d of dots) {
    cxx += (d.x - mx) ** 2;
    cyy += (d.y - my) ** 2;
    cxy += (d.x - mx) * (d.y - my);
  }
  cxx /= n; cyy /= n; cxy /= n;
  const trace = cxx + cyy;
  const det = cxx * cyy - cxy * cxy;
  const disc = Math.sqrt(Math.max((trace * trace) / 4 - det, 0));
  const l1 = trace / 2 + disc;
  const l2 = trace / 2 - disc;
  const angle = Math.abs(cxy) < 1e-10 ? 0 : Math.atan2(l1 - cxx, cxy);
  return {
    cx: mx, cy: my,
    rx: Math.sqrt(Math.max(l1, 0)),
    ry: Math.sqrt(Math.max(l2, 0)),
    angleDeg: (angle * 180) / Math.PI,
  };
}

const HOVER_THRESHOLD = 25;

/**
 * EmbeddingScatter — PCA scatter plot of neural player embeddings.
 *
 * @param {object}   mapData        - { players, pca } from /api/fingerprints/embedding-map
 * @param {string[]} highlightTags  - battleTags to highlight as foreground
 * @param {object}   suspects       - { pairs, playerCount } from /api/fingerprints/suspects
 * @param {function} onSelectPlayer - (battleTag) => void, called when a dot is clicked
 * @param {boolean}  hideSuspects   - if true, hide the suspects panel below the scatter
 */
export default function EmbeddingScatter({ mapData, highlightTags = [], suspects, onSelectPlayer, allPlayers, hideSuspects }) {
  const [expandedTag, setExpandedTag] = useState(null);
  const [replayDots, setReplayDots] = useState(null);
  const [loadingReplays, setLoadingReplays] = useState(false);
  const [hoveredPlayer, setHoveredPlayer] = useState(null);
  const [hoveredReplay, setHoveredReplay] = useState(null);
  const [mousePos, setMousePos] = useState(null);
  const svgRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchedTags, setSearchedTags] = useState([]);
  const [showSuspects, setShowSuspects] = useState(true);
  const [hoveredSuspect, setHoveredSuspect] = useState(null);

  const handlePlayerClick = useCallback(async (battleTag) => {
    // Notify parent if callback provided
    if (onSelectPlayer) onSelectPlayer(battleTag);

    if (expandedTag === battleTag) {
      setExpandedTag(null);
      setReplayDots(null);
      return;
    }
    if (!mapData?.pca?.mean || !mapData?.pca?.components) return;
    setExpandedTag(battleTag);
    setLoadingReplays(true);
    try {
      const res = await fetch(
        `${RELAY_URL}/api/fingerprints/embeddings/${encodeURIComponent(battleTag)}`
      );
      if (!res.ok) { setReplayDots(null); setLoadingReplays(false); return; }
      const data = await res.json();
      const dots = data.replays.map(r => {
        const { x, y } = projectEmbedding(r.embedding, mapData.pca.mean, mapData.pca.components);
        return {
          x: Math.round(x * 1000) / 1000,
          y: Math.round(y * 1000) / 1000,
          mapName: r.mapName,
          matchDate: r.matchDate,
          gameDuration: r.gameDuration,
          replayId: r.replayId,
        };
      });
      const avgX = dots.reduce((s, d) => s + d.x, 0) / dots.length;
      const avgY = dots.reduce((s, d) => s + d.y, 0) / dots.length;
      const stdX = Math.sqrt(dots.reduce((s, d) => s + (d.x - avgX) ** 2, 0) / dots.length);
      const stdY = Math.sqrt(dots.reduce((s, d) => s + (d.y - avgY) ** 2, 0) / dots.length);
      const ellipse = covarianceEllipse(dots);
      setReplayDots({ dots, avgX, avgY, stdX, stdY, count: dots.length, ellipse });
    } catch {
      setReplayDots(null);
    }
    setLoadingReplays(false);
  }, [expandedTag, mapData, onSelectPlayer]);

  if (!mapData || mapData.players.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "40px 0" }}>
        <PeonLoader size="sm" />
      </div>
    );
  }

  const W = 800, H = 500;
  const PAD_L = 60, PAD_B = 60, PAD_T = 30, PAD_R = 30;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;
  const { players, pca } = mapData;

  const xs = players.map(p => p.x);
  const ys = players.map(p => p.y);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const yMin = Math.min(...ys), yMax = Math.max(...ys);
  const xRange = xMax - xMin || 1;
  const yRange = yMax - yMin || 1;

  const scale = (px, py) => ({
    sx: PAD_L + ((px - xMin) / xRange) * plotW,
    sy: PAD_T + ((py - yMin) / yRange) * plotH,
  });
  const unscale = (sx, sy) => ({
    dx: xMin + ((sx - PAD_L) / plotW) * xRange,
    dy: yMin + ((sy - PAD_T) / plotH) * yRange,
  });

  // Max replay count for opacity scaling
  const maxReplays = Math.max(...players.map(p => p.replayCount), 1);


  const highlightSet = new Set([...highlightTags, ...searchedTags]);
  const scatterTagSet = new Set(players.map(p => p.battleTag));
  const searchSuggestions = searchQuery.length >= 2
    ? (allPlayers || players).filter(p => {
        const tag = p.battleTag || p.battle_tag;
        return tag.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !highlightSet.has(tag);
      }).slice(0, 8).map(p => ({
        battleTag: p.battleTag || p.battle_tag,
        replayCount: p.replayCount || p.replay_count,
        onScatter: scatterTagSet.has(p.battleTag || p.battle_tag),
      }))
    : [];
  const bgPlayers = players.filter(p => !highlightSet.has(p.battleTag));
  const fgPlayers = players.filter(p => highlightSet.has(p.battleTag));

  const popMeanX = players.reduce((a, p) => a + p.x, 0) / players.length;
  const popMeanY = players.reduce((a, p) => a + p.y, 0) / players.length;
  const popStdX = Math.sqrt(
    players.reduce((s, p) => s + (p.x - popMeanX) ** 2, 0) / players.length
  );
  const popStdY = Math.sqrt(
    players.reduce((s, p) => s + (p.y - popMeanY) ** 2, 0) / players.length
  );
  const popStd = Math.sqrt(popStdX ** 2 + popStdY ** 2);
  const distFromCenter = (p) => {
    const d = Math.sqrt((p.x - popMeanX) ** 2 + (p.y - popMeanY) ** 2);
    return popStd > 0 ? d / popStd : 0;
  };

  // Derive human-readable axis labels from correlations
  const axisLabel = (pcKey) => {
    const corrs = pca?.axisCorrelations?.[pcKey];
    if (!corrs || corrs.length === 0) return null;
    const top = corrs[0]; // strongest absolute correlation
    if (Math.abs(top.r) < 0.15) return null; // too weak to name
    const dir = top.r > 0 ? '+' : '−';
    return `${dir}${top.label}`;
  };
  const pc1Label = axisLabel('pc1');
  const pc2Label = axisLabel('pc2');

  const TICK_COUNT = 5;
  const xTicks = Array.from({ length: TICK_COUNT }, (_, i) => {
    const t = i / (TICK_COUNT - 1);
    return { val: xMin + t * xRange, px: PAD_L + t * plotW };
  });
  const yTicks = Array.from({ length: TICK_COUNT }, (_, i) => {
    const t = i / (TICK_COUNT - 1);
    return { val: yMin + t * yRange, px: PAD_T + t * plotH };
  });

  const formatDuration = (secs) => {
    if (!secs) return "?";
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const handleMouseMove = (e) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;
    if (mx < PAD_L || mx > W - PAD_R || my < PAD_T || my > H - PAD_B) {
      setHoveredPlayer(null); setHoveredReplay(null); setMousePos(null); return;
    }
    const clientPos = { clientX: e.clientX, clientY: e.clientY };
    if (replayDots?.dots) {
      let nearestReplay = null;
      let nearestReplayDist = Infinity;
      for (const d of replayDots.dots) {
        const { sx, sy } = scale(d.x, d.y);
        const dist = Math.sqrt((mx - sx) ** 2 + (my - sy) ** 2);
        if (dist < nearestReplayDist) { nearestReplayDist = dist; nearestReplay = d; }
      }
      if (nearestReplay && nearestReplayDist < 12) {
        setHoveredReplay(nearestReplay); setHoveredPlayer(null); setMousePos(clientPos); return;
      }
    }
    setHoveredReplay(null);
    let nearest = null;
    let nearestDist = Infinity;
    for (const p of players) {
      const { sx, sy } = scale(p.x, p.y);
      const dist = Math.sqrt((mx - sx) ** 2 + (my - sy) ** 2);
      if (dist < nearestDist) { nearestDist = dist; nearest = p; }
    }
    if (nearest && nearestDist < HOVER_THRESHOLD) {
      setHoveredPlayer(nearest); setMousePos(clientPos);
    } else {
      setHoveredPlayer(null); setMousePos(null);
    }
  };

  const handleMouseLeave = () => {
    setHoveredPlayer(null); setHoveredReplay(null); setMousePos(null);
  };

  const handleOverlayClick = () => {
    if (hoveredPlayer) {
      // Always allow clicking any dot — highlight it and notify parent
      if (!highlightSet.has(hoveredPlayer.battleTag)) {
        setSearchedTags(prev => [...prev, hoveredPlayer.battleTag]);
      }
      handlePlayerClick(hoveredPlayer.battleTag);
    }
  };

  const hoveredSc = hoveredPlayer ? scale(hoveredPlayer.x, hoveredPlayer.y) : null;

  const clusterDateRange = replayDots?.dots?.length > 0 ? (() => {
    const dates = replayDots.dots.filter(d => d.matchDate).map(d => new Date(d.matchDate));
    if (dates.length === 0) return null;
    const min = new Date(Math.min(...dates));
    const max = new Date(Math.max(...dates));
    return `${min.toLocaleDateString()} — ${max.toLocaleDateString()}`;
  })() : null;

  const tightness = replayDots && popStdX > 0 ? (replayDots.stdX / popStdX) : null;

  return (
    <ScatterContainer>
      {/* Stats bar */}
      <StatsBar>
        <StatChip>{players.length} <span>players</span></StatChip>
        {pca?.varianceExplained && (
          <StatChip>{pca.varianceExplained[0] + pca.varianceExplained[1]}% <span>variance captured</span></StatChip>
        )}
        {suspects?.totalPairs && (
          <StatChip>{suspects.totalPairs} <span>pairs analyzed</span></StatChip>
        )}
      </StatsBar>

      {/* Search */}
      <SearchRow>
        <SearchInputWrap>
          <SearchInput
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === "Escape" && setSearchQuery("")}
            placeholder="Search players…"
          />
          {searchSuggestions.length > 0 && (
            <SearchDropdown>
              {searchSuggestions.map(p => (
                <SearchItem key={p.battleTag} onClick={() => {
                  setSearchedTags(prev => [...prev, p.battleTag]);
                  setSearchQuery("");
                  if (onSelectPlayer) onSelectPlayer(p.battleTag);
                }}>
                  <span className="name">{p.battleTag.split("#")[0]}</span>
                  <span className="meta">
                    {p.replayCount} replays{!p.onScatter && " · data only"}
                  </span>
                </SearchItem>
              ))}
            </SearchDropdown>
          )}
        </SearchInputWrap>
        {searchedTags.map(tag => (
          <SearchChip key={tag}>
            {tag.split("#")[0]}
            <button onClick={() => {
              setSearchedTags(prev => prev.filter(t => t !== tag));
              if (expandedTag === tag) { setExpandedTag(null); setReplayDots(null); }
            }}>×</button>
          </SearchChip>
        ))}
      </SearchRow>

      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} width="100%">
        <defs>
          <filter id="scatter-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <radialGradient id="dot-grad">
            <stop offset="0%" stopColor={GOLD} stopOpacity="0.9" />
            <stop offset="100%" stopColor={GOLD_DIM} stopOpacity="0.6" />
          </radialGradient>
        </defs>

        {/* Plot background */}
        <rect x={PAD_L} y={PAD_T} width={plotW} height={plotH} fill="rgba(0, 0, 0, 0.35)" rx="4" />

        {/* Density heatmap removed — was causing murky overlay */}

        {/* Grid lines */}
        {xTicks.map((t, i) => (
          <g key={`xt-${i}`}>
            <line x1={t.px} y1={PAD_T} x2={t.px} y2={H - PAD_B}
              stroke={GREY_MID} strokeWidth="0.5" strokeDasharray="3 3" opacity="0.25" />
            <text x={t.px} y={H - PAD_B + 16} textAnchor="middle"
              fill={GREY_MID} fontSize="9" fontFamily="Inconsolata, monospace">{t.val.toFixed(1)}</text>
          </g>
        ))}
        {yTicks.map((t, i) => (
          <g key={`yt-${i}`}>
            <line x1={PAD_L} y1={t.px} x2={W - PAD_R} y2={t.px}
              stroke={GREY_MID} strokeWidth="0.5" strokeDasharray="3 3" opacity="0.25" />
            <text x={PAD_L - 8} y={t.px + 3} textAnchor="end"
              fill={GREY_MID} fontSize="9" fontFamily="Inconsolata, monospace">{t.val.toFixed(1)}</text>
          </g>
        ))}

        {/* Suspect connection lines */}
        {showSuspects && suspects?.pairs && (() => {
          const playerMap = new Map(players.map(p => [p.battleTag, p]));
          const topPairs = suspects.pairs.slice(0, 20);
          const maxSim = topPairs[0]?.similarity || 1;
          const minSim = topPairs[topPairs.length - 1]?.similarity || 0;
          const simRange = maxSim - minSim || 1;
          return topPairs.map((pair, i) => {
            const pA = playerMap.get(pair.tagA);
            const pB = playerMap.get(pair.tagB);
            if (!pA || !pB) return null;
            const { sx: x1, sy: y1 } = scale(pA.x, pA.y);
            const { sx: x2, sy: y2 } = scale(pB.x, pB.y);
            const t = (pair.similarity - minSim) / simRange;
            const isHovered = hoveredSuspect === i;
            return (
              <line key={`suspect-${i}`} x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={RED} strokeWidth={isHovered ? 2.5 : 0.8 + t * 1.2}
                opacity={isHovered ? 0.8 : 0.08 + t * 0.2}
                strokeDasharray={isHovered ? "none" : "4 3"}
                pointerEvents="none" />
            );
          });
        })()}

        {/* Background player glyphs — radial shapes encoding playstyle */}
        {bgPlayers.map((p, i) => {
          const { sx, sy } = scale(p.x, p.y);
          const isHovered = hoveredPlayer?.battleTag === p.battleTag;
          return (
            <PlayerGlyph key={`bg-${i}`}
              cx={sx} cy={sy}
              glyph={p.glyph}
              race={p.race}
              replayCount={p.replayCount}
              baseR={10}
              isHovered={isHovered}
            />
          );
        })}

        {/* Replay cluster (expanded player) */}
        {replayDots && expandedTag && (() => {
          const { dots, avgX, avgY, ellipse } = replayDots;
          const { sx: csx, sy: csy } = scale(avgX, avgY);
          const sortedDated = dots.filter(d => d.matchDate)
            .sort((a, b) => new Date(a.matchDate) - new Date(b.matchDate));
          const firstId = sortedDated[0]?.replayId;
          const lastId = sortedDated[sortedDated.length - 1]?.replayId;

          let ellipseEls = null;
          if (ellipse) {
            const { sx: esx, sy: esy } = scale(ellipse.cx, ellipse.cy);
            const rxPx = Math.max((ellipse.rx / xRange) * plotW, 4);
            const ryPx = Math.max((ellipse.ry / yRange) * plotH, 4);
            ellipseEls = (
              <g>
                <ellipse cx={esx} cy={esy} rx={rxPx * 2} ry={ryPx * 2}
                  fill="none" stroke={GOLD} strokeWidth="0.8"
                  strokeDasharray="4 3" opacity="0.15"
                  transform={`rotate(${ellipse.angleDeg}, ${esx}, ${esy})`} />
                <ellipse cx={esx} cy={esy} rx={rxPx} ry={ryPx}
                  fill={GOLD} fillOpacity="0.05" stroke={GOLD} strokeWidth="1.2"
                  opacity="0.4"
                  transform={`rotate(${ellipse.angleDeg}, ${esx}, ${esy})`} />
              </g>
            );
          }

          return (
            <g>
              {ellipseEls}
              {dots.map((d, i) => {
                const { sx, sy } = scale(d.x, d.y);
                return (
                  <line key={`line-${i}`} x1={csx} y1={csy} x2={sx} y2={sy}
                    stroke={GOLD} strokeWidth="0.5" opacity="0.06" pointerEvents="none" />
                );
              })}
              {sortedDated.length >= 2 && sortedDated.slice(0, -1).map((d, i) => {
                const next = sortedDated[i + 1];
                const { sx: x1, sy: y1 } = scale(d.x, d.y);
                const { sx: x2, sy: y2 } = scale(next.x, next.y);
                const progress = sortedDated.length > 2 ? i / (sortedDated.length - 2) : 1;
                return (
                  <line key={`journey-${i}`} x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke={GOLD} strokeWidth={1 + progress * 1.5}
                    opacity={0.15 + progress * 0.5}
                    strokeLinecap="round" pointerEvents="none" />
                );
              })}
              {dots.map((d, i) => {
                const { sx, sy } = scale(d.x, d.y);
                const isHovered = hoveredReplay === d;
                const isFirst = d.replayId === firstId;
                const isLast = d.replayId === lastId;
                const isEndpoint = isFirst || isLast;
                return (
                  <g key={`replay-${i}`}>
                    <circle cx={sx} cy={sy}
                      r={isHovered ? 4.5 : isEndpoint ? 4 : 3}
                      fill={GOLD} opacity={isHovered ? 0.9 : isEndpoint ? 0.85 : 0.6}
                      stroke={isEndpoint ? "#fff" : "rgba(255,255,255,0.3)"}
                      strokeWidth={isEndpoint ? 1 : 0.5}
                      pointerEvents="none" />
                    {isFirst && sortedDated.length >= 2 && (
                      <text x={sx} y={sy - 7} textAnchor="middle"
                        fill="rgba(255,255,255,0.5)" fontSize="7"
                        fontFamily="Inconsolata, monospace" pointerEvents="none">1</text>
                    )}
                    {isLast && sortedDated.length >= 2 && (
                      <text x={sx} y={sy - 7} textAnchor="middle"
                        fill="rgba(255,255,255,0.7)" fontSize="7"
                        fontFamily="Inconsolata, monospace" pointerEvents="none">
                        {sortedDated.length}
                      </text>
                    )}
                  </g>
                );
              })}
              <circle cx={csx} cy={csy} r="2.5" fill="#fff" stroke={GOLD} strokeWidth="1" opacity="0.9" />
              <line x1={csx - 5} y1={csy} x2={csx + 5} y2={csy} stroke="#fff" strokeWidth="0.8" opacity="0.6" />
              <line x1={csx} y1={csy - 5} x2={csx} y2={csy + 5} stroke="#fff" strokeWidth="0.8" opacity="0.6" />
            </g>
          );
        })()}

        {/* Foreground (highlighted) player glyphs */}
        {fgPlayers.map((p, i) => {
          const { sx, sy } = scale(p.x, p.y);
          const label = p.battleTag.split("#")[0];
          const isExpanded = expandedTag === p.battleTag;
          return (
            <g key={`fg-${i}`} pointerEvents="none">
              {isExpanded && (
                <circle cx={sx} cy={sy} r="20" fill="none" stroke={GOLD}
                  strokeWidth="1.2" strokeDasharray="3 2" opacity="0.5" />
              )}
              <PlayerGlyph
                cx={sx} cy={sy}
                glyph={p.glyph}
                race={p.race}
                replayCount={p.replayCount}
                baseR={14}
                isHighlighted
              />
              <text x={sx + 18} y={sy + 4} fill="#fff" fontSize="11"
                fontFamily="var(--font-display)" fontWeight="bold"
                stroke="rgba(0,0,0,0.7)" strokeWidth="3" paintOrder="stroke">
                {label}
              </text>
            </g>
          );
        })}

        {/* Hover crosshairs */}
        {hoveredSc && (
          <g pointerEvents="none">
            <line x1={hoveredSc.sx} y1={PAD_T} x2={hoveredSc.sx} y2={H - PAD_B}
              stroke={GOLD_DIM} strokeWidth="0.8" strokeDasharray="4 3" opacity="0.3" />
            <line x1={PAD_L} y1={hoveredSc.sy} x2={W - PAD_R} y2={hoveredSc.sy}
              stroke={GOLD_DIM} strokeWidth="0.8" strokeDasharray="4 3" opacity="0.3" />
            {(() => {
              const { dx, dy } = unscale(hoveredSc.sx, hoveredSc.sy);
              return (
                <>
                  <text x={hoveredSc.sx} y={H - PAD_B + 28} textAnchor="middle"
                    fill={GOLD_DIM} fontSize="8"
                    fontFamily="Inconsolata, monospace">{dx.toFixed(2)}</text>
                  <text x={PAD_L - 8} y={hoveredSc.sy + 3} textAnchor="end"
                    fill={GOLD_DIM} fontSize="8"
                    fontFamily="Inconsolata, monospace">{dy.toFixed(2)}</text>
                </>
              );
            })()}
            {!highlightSet.has(hoveredPlayer.battleTag) && (
              <circle cx={hoveredSc.sx} cy={hoveredSc.sy} r="8"
                fill="none" stroke={GOLD}
                strokeWidth="1.5" opacity="0.5" />
            )}
          </g>
        )}

        {/* Population centroid */}
        {(() => {
          const { sx: cmx, sy: cmy } = scale(popMeanX, popMeanY);
          return (
            <g opacity="0.2" pointerEvents="none">
              <line x1={cmx - 8} y1={cmy} x2={cmx + 8} y2={cmy} stroke={GREY_MID} strokeWidth="1" />
              <line x1={cmx} y1={cmy - 8} x2={cmx} y2={cmy + 8} stroke={GREY_MID} strokeWidth="1" />
              <circle cx={cmx} cy={cmy} r="3" fill="none" stroke={GREY_MID} strokeWidth="0.8" />
            </g>
          );
        })()}

        {/* Axes + labels */}
        <line x1={PAD_L} y1={H - PAD_B} x2={W - PAD_R} y2={H - PAD_B} stroke={GREY_MID} strokeWidth="1" />
        <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={H - PAD_B} stroke={GREY_MID} strokeWidth="1" />
        <text x={(PAD_L + W - PAD_R) / 2} y={H - 12} textAnchor="middle"
          fill={GREY_MID} fontSize="10" fontFamily="Inconsolata, monospace">
          {pc1Label ? `${pc1Label}  ·  ` : ''}PC1 ({pca?.varianceExplained?.[0]}% var)
        </text>
        <text x={16} y={(PAD_T + H - PAD_B) / 2} textAnchor="middle"
          fill={GREY_MID} fontSize="10" fontFamily="Inconsolata, monospace"
          transform={`rotate(-90, 16, ${(PAD_T + H - PAD_B) / 2})`}>
          {pc2Label ? `${pc2Label}  ·  ` : ''}PC2 ({pca?.varianceExplained?.[1]}% var)
        </text>

        {/* Player count label (no race legend) */}
        <text x={W - PAD_R - 8} y={PAD_T + 12} textAnchor="end" fill={GREY_MID}
          fontSize="9" fontFamily="Inconsolata, monospace">
          n={players.length}
        </text>

        {/* Click overlay */}
        <rect x={PAD_L} y={PAD_T} width={plotW} height={plotH}
          fill="transparent" style={{ cursor: "crosshair" }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleOverlayClick} />
      </svg>

      {/* Tooltips */}
      {hoveredPlayer && mousePos && (
        <ScatterTooltip style={{ left: mousePos.clientX, top: mousePos.clientY }}>
          <span className="name">{hoveredPlayer.battleTag.split("#")[0]}</span>
          <span className="meta">{hoveredPlayer.race} &middot; {hoveredPlayer.replayCount} replays</span>
          <span className="meta">{distFromCenter(hoveredPlayer).toFixed(1)}σ from center</span>
        </ScatterTooltip>
      )}
      {hoveredReplay && mousePos && (
        <ScatterTooltip style={{ left: mousePos.clientX, top: mousePos.clientY }}>
          <span className="name">{hoveredReplay.mapName || "Unknown map"}</span>
          <span className="meta">
            {hoveredReplay.matchDate ? new Date(hoveredReplay.matchDate).toLocaleDateString() : "?"} — {formatDuration(hoveredReplay.gameDuration)}
          </span>
        </ScatterTooltip>
      )}

      {/* Cluster stats */}
      {loadingReplays && (
        <div style={{ marginTop: 8 }}><PeonLoader size="sm" /></div>
      )}
      {replayDots && expandedTag && !loadingReplays && (
        <ClusterStats>
          <span className="tag">{expandedTag.split("#")[0]}</span>
          <span>{replayDots.count} replays</span>
          {tightness !== null && (
            <span>tightness: <strong style={{ color: tightness < 0.3 ? GREEN : tightness < 0.6 ? GOLD : RED }}>
              {(tightness * 100).toFixed(0)}%
            </strong></span>
          )}
          {clusterDateRange && <span>{clusterDateRange}</span>}
          <span className="hint">click player to collapse</span>
        </ClusterStats>
      )}

      {/* Suspects panel (can be hidden via prop) */}
      {!hideSuspects && suspects?.pairs?.length > 0 && (
        <SuspectsPanel>
          <SuspectsPanelHeader>
            <span className="title">Suspect Pairs</span>
            <span className="meta">{suspects.pairs.length} pairs</span>
            <button
              className={showSuspects ? "active" : ""}
              onClick={() => setShowSuspects(s => !s)}
            >
              {showSuspects ? "Hide lines" : "Show lines"}
            </button>
          </SuspectsPanelHeader>
          <SuspectsTable>
            <thead>
              <tr>
                <th>Player A</th>
                <th>Player B</th>
                <th>Match</th>
                <th>Pctl</th>
              </tr>
            </thead>
            <tbody>
              {suspects.pairs.slice(0, 20).map((pair, i) => (
                <tr key={i}
                  className={hoveredSuspect === i ? "hovered" : ""}
                  onMouseEnter={() => setHoveredSuspect(i)}
                  onMouseLeave={() => setHoveredSuspect(null)}
                  onClick={() => {
                    const tags = [pair.tagA, pair.tagB];
                    setSearchedTags(prev => {
                      const existing = new Set(prev);
                      const next = [...prev];
                      for (const t of tags) {
                        if (!existing.has(t)) next.push(t);
                      }
                      return next;
                    });
                    if (onSelectPlayer) onSelectPlayer(pair.tagA);
                  }}
                >
                  <td>{pair.tagA.split("#")[0]}</td>
                  <td>{pair.tagB.split("#")[0]}</td>
                  <td className="sim" style={{
                    color: pair.similarity > 0.85 ? RED : pair.similarity > 0.75 ? GOLD : GREY,
                  }}>
                    {(pair.similarity * 100).toFixed(1)}%
                  </td>
                  <td className="pctl">
                    {pair.percentile != null ? `${pair.percentile}%` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </SuspectsTable>
        </SuspectsPanel>
      )}
    </ScatterContainer>
  );
}

// ── Styled Components ──────────────────────────────────

const ScatterContainer = styled.div`
  position: relative;
  svg { display: block; width: 100%; height: auto; }
`;

const StatsBar = styled.div`
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
  margin-bottom: var(--space-3);
`;

const StatChip = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--gold);
  background: var(--gold-tint);
  border: var(--border-thin) solid rgba(252, 219, 51, 0.25);
  border-radius: var(--radius-sm);
  padding: 6px 12px;
  font-weight: 600;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(252, 219, 51, 0.12);
    border-color: var(--gold);
  }

  span {
    color: var(--grey-light);
    font-weight: 400;
    margin-left: 4px;
  }
`;

const SearchRow = styled.div`
  display: flex; align-items: center; gap: 8px; margin-bottom: var(--space-3); flex-wrap: wrap;
`;

const SearchInputWrap = styled.div`
  position: relative;
`;

const SearchInput = styled.input`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  background: var(--surface-1);
  border: var(--border-thin) solid var(--grey-mid);
  border-radius: var(--radius-md);
  color: var(--white);
  padding: 8px 14px;
  width: 240px;
  outline: none;
  transition: all 0.2s ease;

  &:focus {
    border-color: var(--gold);
    box-shadow: 0 0 0 1px rgba(252, 219, 51, 0.15);
  }
  &::placeholder { color: var(--grey-mid); }
`;

const SearchDropdown = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  width: 300px;
  background: rgba(10, 10, 10, 0.96);
  backdrop-filter: blur(12px);
  border: var(--border-thin) solid var(--grey-mid);
  border-radius: var(--radius-md);
  margin-top: 4px;
  z-index: 50;
  max-height: 280px;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
`;

const SearchItem = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 8px 12px;
  cursor: pointer;
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  transition: background 0.15s ease;
  border-bottom: var(--border-thin) solid rgba(255, 255, 255, 0.04);

  &:last-child { border-bottom: none; }
  &:hover { background: var(--gold-tint); }
  .name { color: var(--white); font-family: var(--font-display); font-size: var(--text-xxs); }
  .meta { color: var(--grey-light); margin-left: auto; font-size: var(--text-xxxs); }
`;

const SearchChip = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 6px 12px;
  border: var(--border-thin) solid rgba(252, 219, 51, 0.3);
  border-radius: var(--radius-full);
  font-family: var(--font-display);
  font-size: var(--text-xxs);
  color: var(--gold);
  background: var(--gold-tint);

  button {
    background: none;
    border: none;
    color: var(--grey-light);
    cursor: pointer;
    font-size: 14px;
    padding: 0 2px;
    line-height: 1;
    transition: color 0.15s ease;
    &:hover { color: var(--red); }
  }
`;

const SuspectsPanel = styled.div`
  margin-top: var(--space-4);
  border: var(--border-thin) solid var(--grey-mid);
  border-radius: var(--radius-md);
  background: var(--surface-1);
  overflow: hidden;
  transition: border-color 0.2s ease;

  &:hover { border-color: rgba(255, 255, 255, 0.15); }
`;

const SuspectsPanelHeader = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-4);
  border-bottom: var(--border-thin) solid var(--grey-mid);
  background: rgba(255, 255, 255, 0.02);

  .title {
    font-family: var(--font-mono);
    color: var(--grey-light);
    font-size: var(--text-xxs);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .meta {
    font-family: var(--font-mono);
    color: var(--grey-mid);
    font-size: var(--text-xxs);
  }
  button {
    margin-left: auto;
    font-family: var(--font-mono);
    font-size: var(--text-xxs);
    background: none;
    border: var(--border-thin) solid var(--grey-mid);
    border-radius: var(--radius-sm);
    color: var(--grey-light);
    padding: 4px 12px;
    cursor: pointer;
    transition: all 0.2s ease;
    &.active { color: var(--red); border-color: var(--red); background: var(--red-tint); }
    &:hover { color: var(--white); border-color: var(--grey-light); }
  }
`;

const SuspectsTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  max-height: 280px;
  display: block;
  overflow-y: auto;

  thead, tbody, tr { display: table; width: 100%; table-layout: fixed; }

  th {
    text-align: left;
    padding: 8px 12px;
    color: var(--grey-mid);
    font-size: var(--text-xxxs);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    border-bottom: var(--border-thin) solid var(--grey-mid);
    position: sticky;
    top: 0;
    background: rgba(10, 10, 10, 0.96);
    backdrop-filter: blur(8px);
  }

  td {
    padding: 6px 12px;
    color: var(--grey-light);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    border-bottom: var(--border-thin) solid rgba(255, 255, 255, 0.04);
  }

  .sim { font-weight: bold; font-size: var(--text-xxs); }
  .pctl { color: var(--grey-mid); }

  tbody tr {
    cursor: pointer;
    transition: background 0.15s ease;
    &:hover, &.hovered { background: var(--gold-tint); }
  }
`;

const ScatterTooltip = styled.div`
  position: fixed;
  transform: translate(12px, -100%);
  pointer-events: none;
  background: rgba(10, 8, 6, 0.95);
  backdrop-filter: blur(12px);
  border: var(--border-thin) solid rgba(252, 219, 51, 0.3);
  border-radius: var(--radius-md);
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  z-index: 100;
  white-space: nowrap;
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);

  .name {
    font-family: var(--font-display);
    font-size: var(--text-xs);
    font-weight: bold;
    color: var(--gold);
  }
  .meta { color: var(--grey-light); font-size: var(--text-xxxs); }
`;

const ClusterStats = styled.div`
  display: flex;
  gap: var(--space-4);
  align-items: center;
  flex-wrap: wrap;
  margin-top: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border: var(--border-thin) solid var(--grey-mid);
  border-radius: var(--radius-md);
  background: var(--surface-1);
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);

  .tag { color: var(--gold); font-weight: bold; }
  .hint { color: var(--grey-mid); margin-left: auto; }
`;
