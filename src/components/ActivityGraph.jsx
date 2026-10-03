import React, { useState, useEffect, useMemo } from "react";
import PeonLoader from "./PeonLoader";
import { getSeasons, getPlayerMatches } from "../lib/api";
import "./ActivityGraph.css";

// v2: keys are local days, so a cached v1 map (UTC days) must not be reused
const CACHE_KEY_PREFIX = "activity-graph-v2-";
const CACHE_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes
const WEEKS_TO_SHOW = 13; // ~3 months
const PAGE_SIZE = 100;
const MAX_OFFSET = 500;

/**
 * A day's key in the player's own timezone. toISOString() would key by UTC,
 * which in Dubai put every game on the cell before the one the player reads
 * and lit up tomorrow's square with today's games.
 */
const dayKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const fromDayKey = (key) => new Date(`${key}T00:00:00`);

/**
 * ActivityGraph - GitHub-style contribution graph for match activity.
 * size="large" (the profile's Activity tab) draws bigger cells with
 * Mon / Wed / Fri labels and a "N games · played X of Y days" summary.
 */
const ActivityGraph = ({ battleTag, currentSeason, gateway = 20, size = "small", title = "Activity" }) => {
  const [activityData, setActivityData] = useState({});
  const [seasonRanges, setSeasonRanges] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredDay, setHoveredDay] = useState(null);

  // Generate dates for the last 13 weeks (3 months), starting on Monday
  const { weeks, monthLabels } = useMemo(() => {
    const result = [];
    const months = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Start from 13 weeks ago, aligned to Monday
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - (WEEKS_TO_SHOW * 7));
    // Align to Monday (getDay() returns 0 for Sunday, 1 for Monday, etc.)
    const dayOfWeek = startDate.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    startDate.setDate(startDate.getDate() + daysToMonday);

    let currentDate = new Date(startDate);
    let lastMonth = -1;

    while (currentDate <= today) {
      const week = [];

      // Track month label at start of week
      if (currentDate.getMonth() !== lastMonth) {
        months.push({
          label: currentDate.toLocaleDateString("en-US", { month: "short" }),
          weekIndex: result.length,
        });
        lastMonth = currentDate.getMonth();
      }

      for (let d = 0; d < 7; d++) {
        week.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }

      result.push(week);
    }

    return { weeks: result, monthLabels: months };
  }, []);

  const getCacheKey = () => `${CACHE_KEY_PREFIX}${battleTag}-s${currentSeason}-g${gateway}`;

  const loadFromCache = () => {
    try {
      const cached = localStorage.getItem(getCacheKey());
      if (cached) {
        const { data, seasonRanges: ranges, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_EXPIRY_MS) {
          return { data, ranges, isValid: true };
        }
      }
    } catch (e) {}
    return { data: null, ranges: null, isValid: false };
  };

  const saveToCache = (data, ranges) => {
    try {
      localStorage.setItem(getCacheKey(), JSON.stringify({
        data,
        seasonRanges: ranges,
        timestamp: Date.now(),
      }));
    } catch (e) {}
  };

  useEffect(() => {
    let cancelled = false;

    const fetchActivityData = async () => {
      setIsLoading(true);

      const { data: cachedData, ranges: cachedRanges, isValid } = loadFromCache();
      if (isValid && cachedData) {
        setActivityData(cachedData);
        setSeasonRanges(cachedRanges || {});
        setIsLoading(false);
        return;
      }

      const activityMap = {};
      const ranges = {};
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      // Matches are newest first, so the page that crosses three months back
      // is the last one worth having. Most players are inside that on page
      // one; the rest fan out in a single round trip rather than a chain of
      // them. getPlayerMatches shares its cache with the profile page, so the
      // current season's first page is usually already in hand.
      const countPage = (matches) => {
        let reachedEdge = false;
        for (const match of matches) {
          const endDate = new Date(match.endTime);
          if (endDate < threeMonthsAgo) {
            reachedEdge = true;
            continue;
          }
          const dateKey = dayKey(endDate);
          activityMap[dateKey] = (activityMap[dateKey] || 0) + 1;
        }
        return reachedEdge;
      };

      try {
        const seasons = await getSeasons();
        if (cancelled) return;
        const relevantSeasons = seasons.filter(s => s.id >= currentSeason - 1 && s.id <= currentSeason);

        await Promise.all(relevantSeasons.map(async (season) => {
          if (season.startDate) {
            ranges[season.id] = {
              start: new Date(season.startDate),
              end: season.endDate ? new Date(season.endDate) : new Date(),
            };
          }

          const first = await getPlayerMatches(battleTag, PAGE_SIZE, 0, season.id);
          if (cancelled || first.matches.length === 0) return;
          if (countPage(first.matches)) return;

          const total = Math.min(first.count || first.matches.length, MAX_OFFSET + PAGE_SIZE);
          const rest = await Promise.all(
            Array.from(
              { length: Math.max(0, Math.ceil(total / PAGE_SIZE) - 1) },
              (_, i) => getPlayerMatches(battleTag, PAGE_SIZE, (i + 1) * PAGE_SIZE, season.id)
            )
          );
          if (cancelled) return;
          for (const page of rest) countPage(page.matches);
        }));

        if (cancelled) return;
        setActivityData(activityMap);
        setSeasonRanges(ranges);
        saveToCache(activityMap, ranges);
      } catch (error) {
        console.error("Error fetching activity:", error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    if (battleTag) {
      fetchActivityData();
    }

    return () => {
      cancelled = true;
    };
  }, [battleTag, currentSeason, gateway]);

  const getIntensity = (count) => {
    if (!count) return 0;
    if (count === 1) return 1;
    if (count <= 3) return 2;
    if (count <= 6) return 3;
    return 4;
  };

  const isInCurrentSeason = (date) => {
    const range = seasonRanges[currentSeason];
    if (!range) return false;
    return date >= range.start && date <= range.end;
  };

  const formatDate = (date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  // Check if this week starts a new month
  const isNewMonth = (weekIndex) => {
    return monthLabels.some(m => m.weekIndex === weekIndex);
  };

  const stats = useMemo(() => {
    const total = Object.values(activityData).reduce((sum, c) => sum + c, 0);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const todayKey = dayKey(now);
    const yesterdayKey = dayKey(yesterday);
    const last24h = (activityData[todayKey] || 0) + (activityData[yesterdayKey] || 0);

    // Average per day over the last 30 days
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    let last30 = 0;
    for (const [key, count] of Object.entries(activityData)) {
      const d = fromDayKey(key);
      if (d >= thirtyDaysAgo) last30 += count;
    }
    const avgPerDay = last30 / 30;
    const daysPlayed = Object.values(activityData).filter((c) => c > 0).length;

    return { total, last24h, last30, avgPerDay, daysPlayed };
  }, [activityData]);
  const daysShown = weeks.reduce((n, w) => n + w.filter((d) => d <= new Date()).length, 0);
  const large = size === "large";

  if (isLoading) {
    return (
      <div className={`activity-graph-card${large ? " ag--large" : ""}`}>
        <div className="ag-header">
          <h3 className="ag-title">{title}</h3>
        </div>
        <div className="ag-loading">
          <PeonLoader size="sm" />
        </div>
      </div>
    );
  }

  return (
    <div className={`activity-graph-card${large ? " ag--large" : ""}`} data-activity-graph={size}>
      <div className="ag-header">
        <h3 className="ag-title">{title}</h3>
        {large && (
          <span className="ag-summary" data-activity-summary>
            last 3 months · {stats.total} games · played {stats.daysPlayed} of {daysShown} days
          </span>
        )}
      </div>

      {/* Month labels */}
      <div className="ag-month-row">
        <div className="ag-day-label-spacer"></div>
        {weeks.map((_, wi) => {
          const monthLabel = monthLabels.find(m => m.weekIndex === wi);
          return (
            <div key={wi} className={`ag-month-cell ${isNewMonth(wi) && wi > 0 ? "ag-month-start" : ""}`}>
              {monthLabel ? monthLabel.label : ""}
            </div>
          );
        })}
      </div>

      <div className="ag-body">
        {/* Day labels - Mon to Sun */}
        <div className="ag-day-labels">
          {large ? (
            <>
              <span>Mon</span>
              <span></span>
              <span>Wed</span>
              <span></span>
              <span>Fri</span>
              <span></span>
              <span></span>
            </>
          ) : (
            <>
              <span>M</span>
              <span>T</span>
              <span>W</span>
              <span>T</span>
              <span>F</span>
              <span>S</span>
              <span>S</span>
            </>
          )}
        </div>

        {/* Grid */}
        <div className="ag-grid">
          {weeks.map((week, wi) => (
            <div key={wi} className={`ag-week ${isNewMonth(wi) && wi > 0 ? "ag-month-start" : ""}`}>
              {week.map((date, di) => {
                const dateKey = dayKey(date);
                const isFuture = date > new Date();
                const count = activityData[dateKey] || 0;
                // A day that has not happened is always blank: a filled square
                // that ignores the cursor reads as a broken one
                const intensity = isFuture ? 0 : getIntensity(count);
                const inSeason = !isFuture && isInCurrentSeason(date);

                return (
                  <div
                    key={di}
                    className={`ag-cell ag-l${intensity}${inSeason ? " ag-season" : ""}${isFuture ? " ag-future" : ""}`}
                    onMouseEnter={() => !isFuture && setHoveredDay(
                      `${count} game${count !== 1 ? "s" : ""} on ${formatDate(date)}`
                    )}
                    onMouseLeave={() => setHoveredDay(null)}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* The hovered day reads out here rather than in a box over the grid,
          and the line keeps its height so nothing shifts on hover */}
      <div className="ag-readout">{hoveredDay || "\u00a0"}</div>

      <div className="ag-footer">
        <span className="ag-stat">{stats.last24h} today</span>
        <span className="ag-stat-sep">&middot;</span>
        <span className="ag-stat">{stats.avgPerDay.toFixed(1)}/day avg</span>
        <span className="ag-stat-sep">&middot;</span>
        <span className="ag-stat">{stats.total} total</span>
      </div>
    </div>
  );
};

export default ActivityGraph;
