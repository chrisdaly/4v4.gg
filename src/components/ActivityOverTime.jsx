import React, { useMemo } from "react";
import { SEASON_STARTS } from "./SeasonTimeline";
import { weeklyCounts, inactiveGaps, gapLabel } from "../lib/profile/storyline";

/**
 * Games per week over the player's history as a line with a soft area
 * fill. Stretches of three or more empty weeks are shaded and labelled
 * ("away 11 weeks"); season ticks run along the bottom.
 *
 * Props: seasonActivity (getPlayerAllSeasonActivity: [{ season, dayCounts }]),
 * maxWeeks (default 104, the last ~2 years)
 */
const W = 1000;
const H = 148;
const AXIS = 22;

export default function ActivityOverTime({ seasonActivity, maxWeeks = 104 }) {
  const { weeks, gaps, points, seasons } = useMemo(() => {
    const dayCounts = {};
    for (const s of seasonActivity || []) {
      for (const [day, n] of Object.entries(s.dayCounts || {})) dayCounts[day] = (dayCounts[day] || 0) + n;
    }
    const all = weeklyCounts(dayCounts);
    const wk = all.slice(-maxWeeks);
    const max = Math.max(1, ...wk.map((w) => w.count));
    const x = (i) => (wk.length > 1 ? (i / (wk.length - 1)) * W : W / 2);
    const y = (v) => H - 4 - (v / max) * (H - 12);
    const pts = wk.map((w, i) => ({ x: x(i), y: y(w.count) }));
    const first = wk[0]?.start;
    const last = wk[wk.length - 1]?.start;
    const ticks = [];
    if (first && last) {
      for (const [id, start] of Object.entries(SEASON_STARTS)) {
        if (start >= first && start <= last) {
          ticks.push({ season: Number(id), pct: ((start - first) / Math.max(1, last - first)) * 100 });
        }
      }
    }
    return { weeks: wk, gaps: inactiveGaps(wk), points: pts, seasons: ticks };
  }, [seasonActivity, maxWeeks]);

  if (weeks.length < 2) return null;
  const line = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const pct = (i) => (i / (weeks.length - 1)) * 100;

  return (
    <div className="aot" data-activity-over-time={weeks.length}>
      <div className="aot-chart">
        {gaps.map((g) => (
          <div key={g.from} className="aot-gap" style={{ left: `${pct(g.from)}%`, width: `${pct(g.to) - pct(g.from)}%` }} data-gap={g.weeks}>
            <span className="aot-gap-label">{gapLabel(g.weeks)}</span>
          </div>
        ))}
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="aot-svg" aria-hidden="true">
          <polygon points={`0,${H} ${line} ${W},${H}`} className="aot-area" />
          <polyline points={line} className="aot-line" vectorEffect="non-scaling-stroke" />
        </svg>
        {seasons.map((t) => (
          <span key={t.season} className="aot-season" style={{ left: `${t.pct}%` }}>S{t.season}</span>
        ))}
      </div>
      <div className="aot-axis" style={{ height: AXIS }} />
    </div>
  );
}
