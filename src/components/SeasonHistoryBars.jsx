import React from "react";

/**
 * Peak MMR per season as bars, the current season in gold.
 * Props: seasonActivity ([{ season, peakMmr, games }]), currentSeason
 */
export default function SeasonHistoryBars({ seasonActivity, currentSeason }) {
  const seasons = (seasonActivity || []).filter((s) => s.peakMmr > 0).slice(-10);
  if (seasons.length === 0) return null;
  const min = Math.min(...seasons.map((s) => s.peakMmr)) - 100;
  const max = Math.max(...seasons.map((s) => s.peakMmr));
  const span = Math.max(1, max - min);
  return (
    <div className="shb" data-season-history={seasons.length}>
      {seasons.map((s) => {
        const current = s.season === currentSeason;
        return (
          <div key={s.season} className={`shb-col ${current ? "shb-col--current" : ""}`} data-season={s.season} title={`Season ${s.season} · peak ${s.peakMmr} · ${s.games} games`}>
            <span className="shb-value">{s.peakMmr.toLocaleString("en-US")}</span>
            <div className="shb-bar" style={{ height: `${Math.max(4, ((s.peakMmr - min) / span) * 100)}%` }} />
            <span className="shb-label">S{s.season}</span>
          </div>
        );
      })}
    </div>
  );
}
