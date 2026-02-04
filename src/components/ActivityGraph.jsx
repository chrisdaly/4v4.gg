import React, { useState, useEffect, useMemo } from "react";
import "./ActivityGraph.css";

const CACHE_KEY_PREFIX = "activity-graph-";
const CACHE_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes
const WEEKS_TO_SHOW = 13; // ~3 months

/**
 * ActivityGraph - GitHub-style contribution graph for match activity
 */
const ActivityGraph = ({ battleTag, currentSeason, gateway = 20 }) => {
  const [activityData, setActivityData] = useState({});
  const [seasonRanges, setSeasonRanges] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [tooltip, setTooltip] = useState(null);

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

  const getCacheKey = () => `${CACHE_KEY_PREFIX}${battleTag}`;

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

      try {
        const seasonsResponse = await fetch("https://website-backend.w3champions.com/api/ladder/seasons");
        const seasons = await seasonsResponse.json();
        const relevantSeasons = seasons.filter(s => s.id >= currentSeason - 1 && s.id <= currentSeason);

        for (const season of relevantSeasons) {
          if (season.startDate) {
            ranges[season.id] = {
              start: new Date(season.startDate),
              end: season.endDate ? new Date(season.endDate) : new Date(),
            };
          }

          let offset = 0;
          const pageSize = 100;
          let hasMore = true;

          while (hasMore) {
            const url = `https://website-backend.w3champions.com/api/matches/search?playerId=${encodeURIComponent(battleTag)}&offset=${offset}&gameMode=4&season=${season.id}&gateway=${gateway}&pageSize=${pageSize}`;
            const response = await fetch(url);
            if (!response.ok) break;

            const data = await response.json();
            const matches = data.matches || [];
            if (matches.length === 0) break;

            for (const match of matches) {
              const endDate = new Date(match.endTime);
              if (endDate < threeMonthsAgo) {
                hasMore = false;
                break;
              }
              const dateKey = endDate.toISOString().split("T")[0];
              activityMap[dateKey] = (activityMap[dateKey] || 0) + 1;
            }

            offset += pageSize;
            if (offset > 500) break;
          }
        }

        setActivityData(activityMap);
        setSeasonRanges(ranges);
        saveToCache(activityMap, ranges);
      } catch (error) {
        console.error("Error fetching activity:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (battleTag) {
      fetchActivityData();
    }
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

  const totalGames = useMemo(() => {
    return Object.values(activityData).reduce((sum, c) => sum + c, 0);
  }, [activityData]);

  if (isLoading) {
    return (
      <div className="activity-graph-card">
        <div className="ag-header">
          <h3 className="ag-title">Activity</h3>
        </div>
        <div className="ag-loading">
          <div className="loader-spinner"></div>
          <span className="loader-text">Loading</span>
        </div>
      </div>
    );
  }

  return (
    <div className="activity-graph-card">
      <div className="ag-header">
        <h3 className="ag-title">Activity</h3>
        <span className="ag-total">{totalGames} games</span>
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
          <span>M</span>
          <span>T</span>
          <span>W</span>
          <span>T</span>
          <span>F</span>
          <span>S</span>
          <span>S</span>
        </div>

        {/* Grid */}
        <div className="ag-grid">
          {weeks.map((week, wi) => (
            <div key={wi} className={`ag-week ${isNewMonth(wi) && wi > 0 ? "ag-month-start" : ""}`}>
              {week.map((date, di) => {
                const dateKey = date.toISOString().split("T")[0];
                const count = activityData[dateKey] || 0;
                const intensity = getIntensity(count);
                const inSeason = isInCurrentSeason(date);
                const isFuture = date > new Date();

                return (
                  <div
                    key={di}
                    className={`ag-cell ag-l${intensity}${inSeason ? " ag-season" : ""}${isFuture ? " ag-future" : ""}`}
                    onMouseEnter={(e) => !isFuture && setTooltip({
                      x: e.clientX,
                      y: e.clientY,
                      text: `${count} game${count !== 1 ? "s" : ""} on ${formatDate(date)}`,
                    })}
                    onMouseLeave={() => setTooltip(null)}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div className="ag-tooltip" style={{ left: tooltip.x + 10, top: tooltip.y - 40 }}>
          {tooltip.text}
        </div>
      )}
    </div>
  );
};

export default ActivityGraph;
