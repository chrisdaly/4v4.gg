import React, { useState, useEffect } from "react";
import { getPlayerAllSeasonActivity } from "../lib/api";
import PeonLoader from "./PeonLoader";

// Approximate W3C season start dates
const SEASON_STARTS = {
  1:  new Date(2019, 10, 1),
  2:  new Date(2020, 1, 1),
  3:  new Date(2020, 5, 1),
  4:  new Date(2020, 8, 1),
  5:  new Date(2020, 11, 1),
  6:  new Date(2021, 2, 1),
  7:  new Date(2021, 5, 1),
  8:  new Date(2021, 8, 1),
  9:  new Date(2021, 11, 1),
  10: new Date(2022, 2, 1),
  11: new Date(2022, 4, 1),
  12: new Date(2022, 5, 1),
  13: new Date(2022, 6, 1),
  14: new Date(2022, 7, 1),
  15: new Date(2022, 8, 1),
  16: new Date(2022, 8, 1),
  17: new Date(2023, 2, 1),
  18: new Date(2023, 9, 1),
  19: new Date(2024, 0, 1),
  20: new Date(2024, 8, 1),
  21: new Date(2025, 0, 1),
  22: new Date(2025, 4, 1),
  23: new Date(2025, 7, 1),
  24: new Date(2025, 11, 1),
};

function toWeekStart(dayStr) {
  const d = new Date(dayStr + "T12:00:00Z");
  const dow = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - (dow - 1));
  return d.toISOString().slice(0, 10);
}

export default function SeasonTimeline({ battleTag }) {
  const [seasonActivity, setSeasonActivity] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!battleTag) return;
    setSeasonActivity(null);
    setLoading(true);
    getPlayerAllSeasonActivity(battleTag).then(data => {
      setSeasonActivity(data);
      setLoading(false);
    });
  }, [battleTag]);

  if (loading) return (
    <div style={{ padding: "var(--space-6) 0", display: "flex", justifyContent: "center" }}>
      <PeonLoader size="sm" />
    </div>
  );

  if (!seasonActivity || seasonActivity.length === 0) return null;

  const usedSeasons = seasonActivity.map(s => s.season);
  // Clamp start to S16 (Sep 2022) — earlier seasons are very short and bunch up
  const earliestSeason = Math.max(usedSeasons[0] ?? 16, 16);
  const effectiveStart = (SEASON_STARTS[earliestSeason] ?? new Date(2022, 8, 1)).getTime();
  const effectiveEnd = Date.now();

  const tl = (dateStr) => {
    if (!dateStr) return null;
    const t = new Date(dateStr).getTime();
    return Math.max(0, Math.min(100, ((t - effectiveStart) / (effectiveEnd - effectiveStart)) * 100));
  };

  const yearLabels = [2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026]
    .map(y => ({ label: String(y), date: new Date(y, 0, 1) }))
    .filter(({ date }) => date.getTime() > effectiveStart && date.getTime() < effectiveEnd);

  return (
    <div>
      {/* Year labels */}
      <div style={{ position: "relative", height: 20, marginBottom: 6 }}>
        {yearLabels.map(({ label, date }) => {
          const pct = tl(date.toISOString());
          if (pct === null) return null;
          return (
            <div key={label} style={{ position: "absolute", left: `${pct}%`, transform: "translateX(-50%)", fontFamily: "var(--font-mono)", fontSize: 12, color: "rgba(255,255,255,0.45)", whiteSpace: "nowrap" }}>
              {label}
            </div>
          );
        })}
      </div>

      {/* Track */}
      <div style={{ position: "relative", height: 80 }}>
        {/* Baseline */}
        <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, background: "rgba(255,255,255,0.08)", transform: "translateY(-50%)" }} />

        {/* Season dividers */}
        {usedSeasons.map(s => {
          const pct = SEASON_STARTS[s] ? tl(SEASON_STARTS[s].toISOString()) : null;
          if (pct === null) return null;
          return (
            <div key={s} style={{ position: "absolute", left: `${pct}%`, top: "10%", height: "80%", width: 1, background: "rgba(255,255,255,0.12)" }} />
          );
        })}

        {/* Ticks per season */}
        {seasonActivity.map(({ season, matchDays }) => {
          const rawDays = matchDays || [];
          let dotDays;
          if (rawDays.length > 20) {
            const weekSet = new Set(rawDays.map(toWeekStart));
            dotDays = [...weekSet].sort();
          } else {
            dotDays = [...rawDays].sort();
          }

          return dotDays.map((day, i) => {
            const pct = tl(day + "T12:00:00Z");
            if (pct === null) return null;
            return (
              <div key={`${season}-${i}`} title={`S${season}: ${day}`} style={{
                position: "absolute", left: `${pct}%`,
                top: "calc(50% - 10px)",
                width: 3, height: 20,
                borderRadius: 1,
                background: "var(--gold)",
                opacity: 0.7,
                transform: "translateX(-50%)",
              }} />
            );
          });
        })}

        {/* Season labels — below the track centre */}
        {seasonActivity.map(({ season }) => {
          const pct = SEASON_STARTS[season] ? tl(SEASON_STARTS[season].toISOString()) : null;
          if (pct === null) return null;
          return (
            <div key={season} style={{ position: "absolute", left: `${pct + 0.3}%`, bottom: 6, fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(252,219,51,0.75)", whiteSpace: "nowrap" }}>
              S{season}
            </div>
          );
        })}
      </div>

    </div>
  );
}
