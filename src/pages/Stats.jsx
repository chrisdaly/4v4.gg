import React, { useState, useEffect, useMemo, useCallback } from "react";
import { CountryFlag, Select, Button } from "../components/ui";
import PeonLoader from "../components/PeonLoader";
import { gateway } from "../lib/params";
import { cache } from "../lib/cache";
import { getSeasons, getLadder, getLadderCached } from "../lib/api";
import "../styles/Stats.css";

import { LEAGUES, raceIcons } from "../lib/constants";
import { PageLayout } from "../components/PageLayout";

const RACES = [
  { id: 1, name: "Human", icon: raceIcons.human },
  { id: 2, name: "Orc", icon: raceIcons.orc },
  { id: 4, name: "Night Elf", icon: raceIcons.elf },
  { id: 8, name: "Undead", icon: raceIcons.undead },
  { id: 0, name: "Random", icon: raceIcons.random },
];

// Country name lookup
const COUNTRY_NAMES = {
  US: "United States", DE: "Germany", RU: "Russia", CN: "China", KR: "Korea",
  FR: "France", GB: "United Kingdom", PL: "Poland", BR: "Brazil", CA: "Canada",
  AU: "Australia", NL: "Netherlands", SE: "Sweden", ES: "Spain", IT: "Italy",
  UA: "Ukraine", CZ: "Czech Republic", AT: "Austria", BE: "Belgium", FI: "Finland",
  NO: "Norway", DK: "Denmark", CH: "Switzerland", PT: "Portugal", RO: "Romania",
  HU: "Hungary", GR: "Greece", SK: "Slovakia", BG: "Bulgaria", HR: "Croatia",
  RS: "Serbia", SI: "Slovenia", LT: "Lithuania", LV: "Latvia", EE: "Estonia",
  BY: "Belarus", KZ: "Kazakhstan", TW: "Taiwan", JP: "Japan", VN: "Vietnam",
  TH: "Thailand", PH: "Philippines", MY: "Malaysia", SG: "Singapore", ID: "Indonesia",
  IN: "India", PK: "Pakistan", TR: "Turkey", IL: "Israel", SA: "Saudi Arabia",
  AE: "UAE", EG: "Egypt", ZA: "South Africa", MX: "Mexico", AR: "Argentina",
  CL: "Chile", CO: "Colombia", PE: "Peru", VE: "Venezuela", NZ: "New Zealand",
};

// League distribution chart component
const LeagueDistribution = ({ leagueCounts, selectedLeague, onLeagueClick, filterLabels, isLoading }) => {
  const totalPlayers = Object.values(leagueCounts).reduce((sum, count) => sum + count, 0);
  const maxCount = Math.max(...Object.values(leagueCounts), 1);

  if (isLoading || totalPlayers === 0) {
    return (
      <div className="stats-card">
        <div className="stats-card-header">
          <h2 className="stats-card-title">League Distribution</h2>
          {filterLabels?.length > 0 && (
            <div className="stats-card-meta">
              {filterLabels.map((label, i) => (
                <span key={i} className="stats-card-filter">{label}</span>
              ))}
            </div>
          )}
        </div>
        <div className="stats-loading">
          {isLoading ? (
            <PeonLoader size="sm" />
          ) : "No data"}
        </div>
      </div>
    );
  }

  return (
    <div className="stats-card">
      <div className="stats-card-header">
        <h2 className="stats-card-title">League Distribution</h2>
        <div className="stats-card-meta">
          {filterLabels?.map((label, i) => (
            <span key={i} className="stats-card-filter">{label}</span>
          ))}
          <span className="stats-card-subtitle">{totalPlayers.toLocaleString()} players</span>
        </div>
      </div>
      <div className="stats-bars">
        {LEAGUES.map((league) => {
          const count = leagueCounts[league.id] || 0;
          const percentage = totalPlayers > 0 ? ((count / totalPlayers) * 100).toFixed(1) : 0;
          const barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0;
          const isSelected = selectedLeague === league.id;

          return (
            <div
              key={league.id}
              className={`stats-row clickable ${isSelected ? "selected" : ""}`}
              onClick={() => onLeagueClick(league.id)}
            >
              <div className="stats-label">
                <img src={league.icon} alt="" className="stats-icon" />
                <span className="stats-item-name">{league.name}</span>
              </div>
              <div className="stats-bar-container">
                <div
                  className={`stats-bar league-${league.id}`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
              <div className="stats-values">
                <span className="stats-count">{count.toLocaleString()}</span>
                <span className="stats-percent">{percentage}%</span>
              </div>
            </div>
          );
        })}
      </div>
      {selectedLeague !== null && (
        <Button $ghost className="stats-clear-filter" onClick={() => onLeagueClick(null)}>
          Clear filter
        </Button>
      )}
    </div>
  );
};

// Race distribution chart component
const RaceDistribution = ({ raceCounts, selectedRace, onRaceClick, filterLabels, isLoading }) => {
  const totalPlayers = Object.values(raceCounts).reduce((sum, count) => sum + count, 0);
  const maxCount = Math.max(...Object.values(raceCounts), 1);

  if (isLoading || totalPlayers === 0) {
    return (
      <div className="stats-card">
        <div className="stats-card-header">
          <h2 className="stats-card-title">Race Distribution</h2>
          {filterLabels.length > 0 && (
            <div className="stats-card-meta">
              {filterLabels.map((label, i) => (
                <span key={i} className="stats-card-filter">{label}</span>
              ))}
            </div>
          )}
        </div>
        <div className="stats-loading">
          {isLoading ? (
            <PeonLoader size="sm" />
          ) : "No data"}
        </div>
      </div>
    );
  }

  return (
    <div className="stats-card">
      <div className="stats-card-header">
        <h2 className="stats-card-title">Race Distribution</h2>
        <div className="stats-card-meta">
          {filterLabels.map((label, i) => (
            <span key={i} className="stats-card-filter">{label}</span>
          ))}
          <span className="stats-card-subtitle">{totalPlayers.toLocaleString()} players</span>
        </div>
      </div>
      <div className="stats-bars">
        {RACES.map((race) => {
          const count = raceCounts[race.id] || 0;
          const percentage = totalPlayers > 0 ? ((count / totalPlayers) * 100).toFixed(1) : 0;
          const barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0;
          const isSelected = selectedRace === race.id;

          return (
            <div
              key={race.id}
              className={`stats-row clickable ${isSelected ? "selected" : ""}`}
              onClick={() => onRaceClick(race.id)}
            >
              <div className="stats-label">
                <img src={race.icon} alt="" className="stats-icon race-icon" />
                <span className="stats-item-name">{race.name}</span>
              </div>
              <div className="stats-bar-container">
                <div
                  className={`stats-bar race-${race.id}`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
              <div className="stats-values">
                <span className="stats-count">{count.toLocaleString()}</span>
                <span className="stats-percent">{percentage}%</span>
              </div>
            </div>
          );
        })}
      </div>
      {selectedRace !== null && (
        <Button $ghost className="stats-clear-filter" onClick={() => onRaceClick(null)}>
          Clear filter
        </Button>
      )}
    </div>
  );
};

// Country distribution chart component
const CountryDistribution = ({ countryCounts, selectedCountry, onCountryClick, filterLabels, isLoading }) => {
  const sortedCountries = useMemo(() => {
    return Object.entries(countryCounts)
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10); // Top 10 countries
  }, [countryCounts]);

  const totalPlayers = sortedCountries.reduce((sum, [_, count]) => sum + count, 0);
  const maxCount = sortedCountries.length > 0 ? sortedCountries[0][1] : 1;

  if (isLoading || sortedCountries.length === 0) {
    return (
      <div className="stats-card">
        <div className="stats-card-header">
          <h2 className="stats-card-title">Top Countries</h2>
          {filterLabels.length > 0 && (
            <div className="stats-card-meta">
              {filterLabels.map((label, i) => (
                <span key={i} className="stats-card-filter">{label}</span>
              ))}
            </div>
          )}
        </div>
        <div className="stats-loading">
          {isLoading ? (
            <PeonLoader size="sm" />
          ) : "No data"}
        </div>
      </div>
    );
  }

  return (
    <div className="stats-card">
      <div className="stats-card-header">
        <h2 className="stats-card-title">Top Countries</h2>
        <div className="stats-card-meta">
          {filterLabels.map((label, i) => (
            <span key={i} className="stats-card-filter">{label}</span>
          ))}
          <span className="stats-card-subtitle">{totalPlayers.toLocaleString()} players</span>
        </div>
      </div>
      <div className="stats-bars">
        {sortedCountries.map(([countryCode, count]) => {
          const percentage = totalPlayers > 0 ? ((count / totalPlayers) * 100).toFixed(1) : 0;
          const barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0;
          const countryName = COUNTRY_NAMES[countryCode] || countryCode;
          const isSelected = selectedCountry === countryCode;

          return (
            <div
              key={countryCode}
              className={`stats-row clickable ${isSelected ? "selected" : ""}`}
              onClick={() => onCountryClick(countryCode)}
            >
              <div className="stats-label">
                <CountryFlag name={countryCode.toLowerCase()} className="stats-flag" />
                <span className="stats-item-name">{countryName}</span>
              </div>
              <div className="stats-bar-container">
                <div
                  className="stats-bar country-bar"
                  style={{ width: `${barWidth}%` }}
                />
              </div>
              <div className="stats-values">
                <span className="stats-count">{count.toLocaleString()}</span>
                <span className="stats-percent">{percentage}%</span>
              </div>
            </div>
          );
        })}
      </div>
      {selectedCountry !== null && (
        <Button $ghost className="stats-clear-filter" onClick={() => onCountryClick(null)}>
          Clear filter
        </Button>
      )}
    </div>
  );
};

// MMR Distribution chart
const MmrDistribution = ({ mmrData, isLoading }) => {
  if (isLoading || !mmrData?.distributedMmrs?.length) {
    return (
      <div className="stats-card">
        <div className="stats-card-header">
          <h2 className="stats-card-title">MMR Distribution</h2>
        </div>
        <div className="stats-loading">
          {isLoading ? (
            <PeonLoader size="sm" />
          ) : "No data"}
        </div>
      </div>
    );
  }

  const { distributedMmrs, top2PercentIndex, top5PercentIndex, top10PercentIndex, top25PercentIndex, top50PercentIndex } = mmrData;
  const maxCount = Math.max(...distributedMmrs.map(d => d.count));
  const totalPlayers = distributedMmrs.reduce((sum, d) => sum + d.count, 0);

  // Get percentile MMR values
  const top2Mmr = distributedMmrs[top2PercentIndex]?.mmr;
  const top5Mmr = distributedMmrs[top5PercentIndex]?.mmr;
  const top10Mmr = distributedMmrs[top10PercentIndex]?.mmr;
  const top25Mmr = distributedMmrs[top25PercentIndex]?.mmr;
  const top50Mmr = distributedMmrs[top50PercentIndex]?.mmr;

  return (
    <div className="stats-card stats-card-wide">
      <div className="stats-card-header">
        <h2 className="stats-card-title">MMR Distribution</h2>
        <span className="stats-card-subtitle">{totalPlayers.toLocaleString()} players</span>
      </div>
      <div className="mmr-chart">
        <div className="mmr-bars">
          {distributedMmrs.map((d, i) => {
            const height = maxCount > 0 ? (d.count / maxCount) * 100 : 0;
            const isPercentile = i === top2PercentIndex || i === top5PercentIndex ||
                                 i === top10PercentIndex || i === top25PercentIndex ||
                                 i === top50PercentIndex;
            return (
              <div
                key={d.mmr}
                className={`mmr-bar ${isPercentile ? 'percentile' : ''}`}
                style={{ height: `${height}%` }}
                title={`${d.mmr} MMR: ${d.count} players`}
              />
            );
          })}
        </div>
        <div className="mmr-axis">
          <span>0</span>
          <span>1000</span>
          <span>2000</span>
          <span>3000+</span>
        </div>
      </div>
      <div className="mmr-percentiles">
        <div className="mmr-percentile">
          <span className="mmr-percentile-label">Top 50%</span>
          <span className="mmr-percentile-value">{top50Mmr}+</span>
        </div>
        <div className="mmr-percentile">
          <span className="mmr-percentile-label">Top 25%</span>
          <span className="mmr-percentile-value">{top25Mmr}+</span>
        </div>
        <div className="mmr-percentile">
          <span className="mmr-percentile-label">Top 10%</span>
          <span className="mmr-percentile-value">{top10Mmr}+</span>
        </div>
        <div className="mmr-percentile">
          <span className="mmr-percentile-label">Top 5%</span>
          <span className="mmr-percentile-value">{top5Mmr}+</span>
        </div>
        <div className="mmr-percentile">
          <span className="mmr-percentile-label">Top 2%</span>
          <span className="mmr-percentile-value">{top2Mmr}+</span>
        </div>
      </div>
    </div>
  );
};

// Popular Hours chart
const PopularHours = ({ hoursData, isLoading }) => {
  // Filter for 4v4 (gameMode 4) and aggregate by hour
  const hourlyData = useMemo(() => {
    if (!hoursData?.length) return [];

    const mode4Data = hoursData.find(h => h.gameMode === 4);
    if (!mode4Data?.timeslots) return [];

    // Aggregate by hour
    const byHour = {};
    mode4Data.timeslots.forEach(slot => {
      const hour = slot.hours;
      byHour[hour] = (byHour[hour] || 0) + slot.games;
    });

    return Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      games: byHour[i] || 0
    }));
  }, [hoursData]);

  const maxGames = Math.max(...hourlyData.map(d => d.games), 1);
  const totalGames = hourlyData.reduce((sum, d) => sum + d.games, 0);

  if (isLoading || hourlyData.length === 0) {
    return (
      <div className="stats-card">
        <div className="stats-card-header">
          <h2 className="stats-card-title">Popular Hours (UTC)</h2>
        </div>
        <div className="stats-loading">
          {isLoading ? (
            <PeonLoader size="sm" />
          ) : "No data"}
        </div>
      </div>
    );
  }

  return (
    <div className="stats-card">
      <div className="stats-card-header">
        <h2 className="stats-card-title">Popular Hours (UTC)</h2>
        <span className="stats-card-subtitle">{totalGames.toLocaleString()} games</span>
      </div>
      <div className="hours-chart">
        <div className="hours-bars">
          {hourlyData.map(d => {
            const height = maxGames > 0 ? (d.games / maxGames) * 100 : 0;
            return (
              <div
                key={d.hour}
                className="hours-bar"
                style={{ height: `${height}%` }}
                title={`${d.hour}:00 - ${d.games.toLocaleString()} games`}
              />
            );
          })}
        </div>
        <div className="hours-axis">
          <span>0</span>
          <span>6</span>
          <span>12</span>
          <span>18</span>
          <span>24</span>
        </div>
      </div>
    </div>
  );
};

// Game Length chart
const GameLengthChart = ({ lengthData, isLoading }) => {
  const chartData = useMemo(() => {
    if (!lengthData?.length) return [];

    const mode4Data = lengthData.find(l => l.gameMode === 4);
    if (!mode4Data?.lengths) return [];

    // Group into 5-minute buckets
    const buckets = {};
    mode4Data.lengths.forEach(l => {
      const minutes = Math.floor(l.seconds / 60);
      const bucket = Math.floor(minutes / 5) * 5;
      if (bucket <= 60) { // Cap at 60 minutes
        buckets[bucket] = (buckets[bucket] || 0) + l.games;
      }
    });

    return Object.entries(buckets)
      .map(([min, games]) => ({ minutes: parseInt(min), games }))
      .sort((a, b) => a.minutes - b.minutes);
  }, [lengthData]);

  const maxGames = Math.max(...chartData.map(d => d.games), 1);
  const totalGames = chartData.reduce((sum, d) => sum + d.games, 0);

  if (isLoading || chartData.length === 0) {
    return (
      <div className="stats-card">
        <div className="stats-card-header">
          <h2 className="stats-card-title">Game Length</h2>
        </div>
        <div className="stats-loading">
          {isLoading ? (
            <PeonLoader size="sm" />
          ) : "No data"}
        </div>
      </div>
    );
  }

  return (
    <div className="stats-card">
      <div className="stats-card-header">
        <h2 className="stats-card-title">Game Length</h2>
        <span className="stats-card-subtitle">{totalGames.toLocaleString()} games</span>
      </div>
      <div className="length-chart">
        <div className="length-bars">
          {chartData.map(d => {
            const height = maxGames > 0 ? (d.games / maxGames) * 100 : 0;
            return (
              <div
                key={d.minutes}
                className="length-bar"
                style={{ height: `${height}%` }}
                title={`${d.minutes}-${d.minutes + 5} min: ${d.games.toLocaleString()} games`}
              />
            );
          })}
        </div>
        <div className="length-axis">
          <span>0m</span>
          <span>15m</span>
          <span>30m</span>
          <span>45m</span>
          <span>60m</span>
        </div>
      </div>
    </div>
  );
};

// Helper to get map image URL
const getMapImageUrl = (mapName) => {
  if (!mapName) return null;
  const cleanName = mapName.replace(/^\(\d\)/, "").replace(/ /g, "").replace(/'/g, "");
  return `/maps/${cleanName}.png`;
};

// Map Popularity chart
const MapPopularity = ({ mapData, selectedSeason, isLoading }) => {
  const chartData = useMemo(() => {
    if (!mapData?.length) return [];

    const seasonData = mapData.find(m => m.season === selectedSeason);
    if (!seasonData?.matchesOnMapPerModes) return [];

    const mode4Data = seasonData.matchesOnMapPerModes.find(m => m.gameMode === 4);
    if (!mode4Data?.maps) return [];

    return mode4Data.maps
      .sort((a, b) => b.count - a.count);
  }, [mapData, selectedSeason]);

  const maxCount = chartData.length > 0 ? chartData[0].count : 1;
  const totalGames = chartData.reduce((sum, d) => sum + d.count, 0);

  if (isLoading || chartData.length === 0) {
    return (
      <div className="stats-card">
        <div className="stats-card-header">
          <h2 className="stats-card-title">Map Popularity</h2>
        </div>
        <div className="stats-loading">
          {isLoading ? (
            <PeonLoader size="sm" />
          ) : "No data"}
        </div>
      </div>
    );
  }

  return (
    <div className="stats-card stats-card-wide">
      <div className="stats-card-header">
        <h2 className="stats-card-title">Map Popularity</h2>
        <span className="stats-card-subtitle">{chartData.length} maps · {totalGames.toLocaleString()} games</span>
      </div>
      <div className="map-grid">
        {chartData.map((map, index) => {
          const percentage = totalGames > 0 ? ((map.count / totalGames) * 100).toFixed(1) : 0;
          // API returns mapName (display name) or map (can be timestamp-prefixed ID or "(4)MapName")
          const displayName = map.mapName || map.map.replace(/^\(\d\)/, '').replace(/^\d+/, '').trim();
          const mapImageUrl = getMapImageUrl(displayName);

          return (
            <div key={map.map} className="map-grid-item">
              <div className="map-grid-rank">#{index + 1}</div>
              <img
                src={mapImageUrl}
                alt={displayName}
                className="map-grid-image"
                onError={(e) => { e.target.style.opacity = '0.3'; }}
              />
              <div className="map-grid-info">
                <span className="map-grid-name">{displayName}</span>
                <span className="map-grid-stats">{map.count.toLocaleString()} · {percentage}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const RELAY_URL =
  import.meta.env.VITE_CHAT_RELAY_URL || "https://4v4gg-chat-relay.fly.dev";

// Chat Activity sparkline + stats
const ChatActivity = () => {
  const [buckets, setBuckets] = useState(null);
  const [games, setGames] = useState(null);
  const [selectedBucket, setSelectedBucket] = useState(null);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    fetch(`${RELAY_URL}/api/admin/messages/timeline/${today}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) { setBuckets([]); return; }
        if (Array.isArray(data)) {
          setBuckets(data);
        } else {
          setBuckets(data.buckets || []);
          setGames(data.games || null);
        }
      })
      .catch(() => setBuckets([]));
  }, []);

  const maxCount = useMemo(() => {
    if (!buckets || buckets.length === 0) return 1;
    return Math.max(...buckets.map((b) => b.count));
  }, [buckets]);

  const avg = useMemo(() => {
    if (!buckets || buckets.length === 0) return 0;
    return buckets.reduce((s, b) => s + b.count, 0) / buckets.length;
  }, [buckets]);

  const stats = useMemo(() => {
    if (!buckets || buckets.length === 0) return null;
    const totalMsgs = buckets.reduce((s, b) => s + b.count, 0);
    const uniqueNames = new Set();
    for (const b of buckets) {
      if (b.names) {
        for (const n of b.names.split(",")) {
          const trimmed = n.trim();
          if (trimmed) uniqueNames.add(trimmed);
        }
      }
    }
    let peakBucket = buckets[0];
    for (const b of buckets) {
      if (b.count > peakBucket.count) peakBucket = b;
    }
    return {
      totalMsgs,
      uniqueUsers: uniqueNames.size,
      peakCount: peakBucket.count,
      peakTime: peakBucket.bucket,
    };
  }, [buckets]);

  const handleBarClick = useCallback((bucket) => {
    setSelectedBucket((prev) => (prev === bucket ? null : bucket));
  }, []);

  if (!buckets || buckets.length === 0) {
    return (
      <div className="stats-card stats-card-wide">
        <div className="stats-card-header">
          <h2 className="stats-card-title">Chat Activity</h2>
        </div>
        <div className="stats-loading">No data</div>
      </div>
    );
  }

  const barData = buckets.map((b) => ({
    ...b,
    isSpike: b.count >= avg * 3 && b.count >= 10,
  }));

  const chips = [];
  if (stats) {
    chips.push(`${stats.totalMsgs} messages`);
    chips.push(`${stats.uniqueUsers} players`);
    chips.push(`peak ${stats.peakCount} at ${stats.peakTime} utc`);
  }
  if (games) {
    if (games.totalGames > 0) chips.push(`${games.totalGames} games`);
    if (games.peakConcurrent > 0) chips.push(`${games.peakConcurrent} concurrent`);
  }

  return (
    <div className="stats-card stats-card-wide">
      <div className="stats-card-header">
        <h2 className="stats-card-title">Chat Activity</h2>
        <span className="stats-card-subtitle">Today (UTC)</span>
      </div>
      <div className="chat-activity-spark">
        {barData.map((b) => {
          const height = Math.max(2, (b.count / maxCount) * 100);
          const isSelected = selectedBucket === b.bucket;
          return (
            <div
              key={b.bucket}
              className={`chat-activity-bar-wrap${isSelected ? " chat-activity-bar-wrap--selected" : ""}`}
              onClick={() => handleBarClick(b.bucket)}
              title={`${b.bucket} — ${b.count} msgs, ${b.users} users`}
            >
              <div
                className={`chat-activity-bar${b.isSpike ? " chat-activity-bar--spike" : ""}`}
                style={{ height: `${height}%` }}
              />
            </div>
          );
        })}
      </div>
      {chips.length > 0 && (
        <div className="chat-activity-chips">
          {chips.map((chip, i) => (
            <span key={i} className="chat-activity-chip">{chip}</span>
          ))}
        </div>
      )}
    </div>
  );
};

// Helper to get cached stats data
const getCachedStatsData = (season) => {
  const cacheKey = `statsPage:${season}`;
  return cache.get(cacheKey);
};

const getCachedW3CStats = () => {
  return cache.get('w3cStats');
};

const Stats = () => {
  // Try to initialize from cache
  const cachedW3C = getCachedW3CStats();

  const [selectedSeason, setSelectedSeason] = useState(null);
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [selectedRace, setSelectedRace] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [availableSeasons, setAvailableSeasons] = useState([]);
  const [leagueData, setLeagueData] = useState({});
  const [playerCountries, setPlayerCountries] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // W3C Stats API data - initialize from cache
  const [mmrData, setMmrData] = useState(null);
  const [hoursData, setHoursData] = useState(cachedW3C?.hours || null);
  const [lengthData, setLengthData] = useState(cachedW3C?.lengths || null);
  const [mapData, setMapData] = useState(cachedW3C?.maps || null);
  const [isLoadingStats, setIsLoadingStats] = useState(!cachedW3C);

  // Fetch available seasons on mount
  useEffect(() => {
    const fetchSeasonsData = async () => {
      try {
        const seasons = await getSeasons();
        if (seasons && seasons.length > 0) {
          setAvailableSeasons(seasons);
          const latestSeason = seasons[0].id;
          setSelectedSeason(latestSeason);

          // Check if we have cached stats data for instant display
          const cachedData = getCachedStatsData(latestSeason);
          if (cachedData) {
            setLeagueData(cachedData.leagueData || {});
            setPlayerCountries(cachedData.countries || {});
            setMmrData(cachedData.mmrData || null);
            setIsLoading(false);
          }
        }
      } catch (e) {
        console.error("Failed to fetch seasons:", e);
        setSelectedSeason(24);
      }
    };
    fetchSeasonsData();
  }, []);

  // Fetch W3C stats (not season-dependent) - with caching
  useEffect(() => {
    const fetchW3CStats = async () => {
      // Skip if we have cached data
      if (cachedW3C) {
        setIsLoadingStats(false);
        // Still refresh in background
      } else {
        setIsLoadingStats(true);
      }

      try {
        const [hoursRes, lengthRes, mapRes] = await Promise.all([
          fetch("https://website-backend.w3champions.com/api/w3c-stats/popular-hours"),
          fetch("https://website-backend.w3champions.com/api/w3c-stats/games-lengths"),
          fetch("https://website-backend.w3champions.com/api/w3c-stats/matches-on-map"),
        ]);

        const [hours, lengths, maps] = await Promise.all([
          hoursRes.json(),
          lengthRes.json(),
          mapRes.json(),
        ]);

        setHoursData(hours);
        setLengthData(lengths);
        setMapData(maps);

        // Cache W3C stats (10 minute TTL)
        cache.set('w3cStats', { hours, lengths, maps }, 10 * 60 * 1000);
      } catch (e) {
        console.error("Failed to fetch W3C stats:", e);
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchW3CStats();
  }, []);

  // Fetch MMR distribution when season changes - with caching
  useEffect(() => {
    if (selectedSeason === null) return;

    const fetchMmrDistribution = async () => {
      const cacheKey = `mmrDist:${selectedSeason}`;
      const cached = cache.get(cacheKey);
      if (cached) {
        setMmrData(cached);
        // Still refresh in background
      }

      try {
        const response = await fetch(
          `https://website-backend.w3champions.com/api/w3c-stats/mmr-distribution?season=${selectedSeason}&gateWay=${gateway}&gameMode=4`
        );
        const data = await response.json();
        setMmrData(data);
        cache.set(cacheKey, data, 10 * 60 * 1000);
      } catch (e) {
        console.error("Failed to fetch MMR distribution:", e);
      }
    };

    fetchMmrDistribution();
  }, [selectedSeason]);

  // Fetch all league data when season changes - with caching
  useEffect(() => {
    if (selectedSeason === null) return;

    const statsCacheKey = `statsPage:${selectedSeason}`;

    const fetchAllLeagueData = async () => {
      // Check cache first for instant display
      const cachedData = getCachedStatsData(selectedSeason);
      if (cachedData) {
        setLeagueData(cachedData.leagueData || {});
        setPlayerCountries(cachedData.countries || {});
        setIsLoading(false);
        // Still fetch fresh data in background
      } else {
        setIsLoading(true);
      }

      const data = {};

      try {
        // Use cached API for each league
        const promises = LEAGUES.map(async (league) => {
          const result = await getLadder(league.id, selectedSeason);
          return { id: league.id, players: Array.isArray(result) ? result : [] };
        });

        const results = await Promise.all(promises);
        results.forEach(({ id, players }) => {
          data[id] = players;
        });

        setLeagueData(data);

        // Extract countries from player data
        const countries = {};
        Object.values(data).flat().forEach(player => {
          const location = player.playersInfo?.[0]?.location;
          if (location) {
            countries[location] = (countries[location] || 0) + 1;
          }
        });
        setPlayerCountries(countries);

        // Cache the combined stats page data (5 minute TTL)
        cache.set(statsCacheKey, {
          leagueData: data,
          countries,
          mmrData,
        }, 5 * 60 * 1000);
      } catch (e) {
        console.error("Failed to fetch league data:", e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllLeagueData();
  }, [selectedSeason]);

  // Helper to filter players based on current selections
  const filterPlayer = (player, { skipLeague, skipRace, skipCountry } = {}) => {
    const race = player.player?.race ?? player.playersInfo?.[0]?.calculatedRace;
    const location = player.playersInfo?.[0]?.location;

    if (!skipRace && selectedRace !== null && race !== selectedRace) return false;
    if (!skipCountry && selectedCountry !== null && location !== selectedCountry) return false;

    return true;
  };

  // Compute league counts - filtered by race and country
  const leagueCounts = useMemo(() => {
    const counts = {};
    LEAGUES.forEach((league) => {
      const players = leagueData[league.id] || [];
      counts[league.id] = players.filter(p => filterPlayer(p, { skipLeague: true })).length;
    });
    return counts;
  }, [leagueData, selectedRace, selectedCountry]);

  // Compute race counts - filtered by league and country
  const raceCounts = useMemo(() => {
    const counts = { 0: 0, 1: 0, 2: 0, 4: 0, 8: 0 };

    const leaguesToCount = selectedLeague !== null
      ? [selectedLeague]
      : LEAGUES.map(l => l.id);

    leaguesToCount.forEach((leagueId) => {
      const players = leagueData[leagueId] || [];
      players.forEach((player) => {
        if (!filterPlayer(player, { skipRace: true })) return;
        const race = player.player?.race ?? player.playersInfo?.[0]?.calculatedRace;
        if (race !== undefined && counts.hasOwnProperty(race)) {
          counts[race]++;
        }
      });
    });

    return counts;
  }, [leagueData, selectedLeague, selectedCountry]);

  // Compute country counts - filtered by league and race
  const countryCounts = useMemo(() => {
    const counts = {};

    const leaguesToCount = selectedLeague !== null
      ? [selectedLeague]
      : LEAGUES.map(l => l.id);

    leaguesToCount.forEach((leagueId) => {
      const players = leagueData[leagueId] || [];
      players.forEach((player) => {
        if (!filterPlayer(player, { skipCountry: true })) return;
        const location = player.playersInfo?.[0]?.location;
        if (location) {
          counts[location] = (counts[location] || 0) + 1;
        }
      });
    });

    return counts;
  }, [leagueData, selectedLeague, selectedRace]);

  // Generate filter labels for display
  const getFilterLabels = (exclude) => {
    const labels = [];
    if (exclude !== 'league' && selectedLeague !== null) {
      labels.push(LEAGUES.find(l => l.id === selectedLeague)?.name);
    }
    if (exclude !== 'race' && selectedRace !== null) {
      labels.push(RACES.find(r => r.id === selectedRace)?.name);
    }
    if (exclude !== 'country' && selectedCountry !== null) {
      labels.push(COUNTRY_NAMES[selectedCountry] || selectedCountry);
    }
    return labels.filter(Boolean);
  };

  const handleSeasonChange = (e) => {
    setSelectedSeason(parseInt(e.target.value, 10));
    setSelectedLeague(null);
    setSelectedRace(null);
    setSelectedCountry(null);
  };

  const handleLeagueClick = (leagueId) => {
    setSelectedLeague(selectedLeague === leagueId ? null : leagueId);
  };

  const handleRaceClick = (raceId) => {
    setSelectedRace(selectedRace === raceId ? null : raceId);
  };

  const handleCountryClick = (countryCode) => {
    setSelectedCountry(selectedCountry === countryCode ? null : countryCode);
  };

  return (
    <PageLayout
      maxWidth="1400px"
      header={
        <div className="stats-header">
          <h1 className="stats-title">4v4 Statistics</h1>
          <div className="stats-controls">
            <div className="season-selector">
              <Select
                id="season-select"
                value={selectedSeason || ""}
                onChange={handleSeasonChange}
              >
                {availableSeasons.map((s) => (
                  <option key={s.id} value={s.id}>
                    S{s.id}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </div>
      }
    >
      <div className="stats-grid">
        <LeagueDistribution
          leagueCounts={leagueCounts}
          selectedLeague={selectedLeague}
          onLeagueClick={handleLeagueClick}
          filterLabels={getFilterLabels('league')}
          isLoading={isLoading}
        />
        <RaceDistribution
          raceCounts={raceCounts}
          selectedRace={selectedRace}
          onRaceClick={handleRaceClick}
          filterLabels={getFilterLabels('race')}
          isLoading={isLoading}
        />
        <CountryDistribution
          countryCounts={countryCounts}
          selectedCountry={selectedCountry}
          onCountryClick={handleCountryClick}
          filterLabels={getFilterLabels('country')}
          isLoading={isLoading}
        />
      </div>

      <div className="stats-grid two-col" style={{ marginTop: 'var(--space-4)' }}>
        <MmrDistribution
          mmrData={mmrData}
          isLoading={!mmrData}
        />
        <MapPopularity
          mapData={mapData}
          selectedSeason={selectedSeason}
          isLoading={isLoadingStats}
        />
      </div>

      <div className="stats-grid two-col" style={{ marginTop: 'var(--space-4)' }}>
        <PopularHours
          hoursData={hoursData}
          isLoading={isLoadingStats}
        />
        <GameLengthChart
          lengthData={lengthData}
          isLoading={isLoadingStats}
        />
      </div>

      <div className="stats-grid two-col" style={{ marginTop: 'var(--space-4)' }}>
        <ChatActivity />
      </div>
    </PageLayout>
  );
};

export default Stats;
