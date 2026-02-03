import React, { useState, useEffect, useMemo } from "react";
import { Flag } from "semantic-ui-react";
import Navbar from "./Navbar.jsx";
import { gateway } from "./params";
import "./Stats.css";

import grandmasterIcon from "./icons/grandmaster.png";
import masterIcon from "./icons/master.png";
import diamondIcon from "./icons/diamond.png";
import platinumIcon from "./icons/platinum.png";
import goldIcon from "./icons/gold.png";
import silverIcon from "./icons/silver.png";
import bronzeIcon from "./icons/bronze.png";

// SVG race icons
import humanIcon from "./icons/human.svg";
import orcIcon from "./icons/orc.svg";
import elfIcon from "./icons/elf.svg";
import undeadIcon from "./icons/undead.svg";
import randomIcon from "./icons/random.svg";

const LEAGUES = [
  { id: 0, name: "Grandmaster", icon: grandmasterIcon },
  { id: 1, name: "Master", icon: masterIcon },
  { id: 2, name: "Diamond", icon: diamondIcon },
  { id: 3, name: "Platinum", icon: platinumIcon },
  { id: 4, name: "Gold", icon: goldIcon },
  { id: 5, name: "Silver", icon: silverIcon },
  { id: 6, name: "Bronze", icon: bronzeIcon },
];

const RACES = [
  { id: 1, name: "Human", icon: humanIcon },
  { id: 2, name: "Orc", icon: orcIcon },
  { id: 4, name: "Night Elf", icon: elfIcon },
  { id: 8, name: "Undead", icon: undeadIcon },
  { id: 0, name: "Random", icon: randomIcon },
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
const LeagueDistribution = ({ leagueCounts, selectedLeague, onLeagueClick, isLoading }) => {
  const totalPlayers = Object.values(leagueCounts).reduce((sum, count) => sum + count, 0);
  const maxCount = Math.max(...Object.values(leagueCounts), 1);

  if (isLoading || totalPlayers === 0) {
    return (
      <div className="stats-card">
        <div className="stats-card-header">
          <h2 className="stats-card-title">League Distribution</h2>
        </div>
        <div className="stats-loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="stats-card">
      <div className="stats-card-header">
        <h2 className="stats-card-title">League Distribution</h2>
        <span className="stats-card-subtitle">{totalPlayers.toLocaleString()} players</span>
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
                <span className="stats-name">{league.name}</span>
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
        <button className="stats-clear-filter" onClick={() => onLeagueClick(null)}>
          Clear filter
        </button>
      )}
    </div>
  );
};

// Race distribution chart component
const RaceDistribution = ({ raceCounts, selectedLeague, isLoading }) => {
  const totalPlayers = Object.values(raceCounts).reduce((sum, count) => sum + count, 0);
  const maxCount = Math.max(...Object.values(raceCounts), 1);

  const selectedLeagueName = selectedLeague !== null
    ? LEAGUES.find(l => l.id === selectedLeague)?.name
    : null;

  if (isLoading || totalPlayers === 0) {
    return (
      <div className="stats-card">
        <div className="stats-card-header">
          <h2 className="stats-card-title">Race Distribution</h2>
          {selectedLeagueName && (
            <span className="stats-card-filter">{selectedLeagueName}</span>
          )}
        </div>
        <div className="stats-loading">{isLoading ? "Loading..." : "No data"}</div>
      </div>
    );
  }

  return (
    <div className="stats-card">
      <div className="stats-card-header">
        <h2 className="stats-card-title">Race Distribution</h2>
        <div className="stats-card-meta">
          {selectedLeagueName && (
            <span className="stats-card-filter">{selectedLeagueName}</span>
          )}
          <span className="stats-card-subtitle">{totalPlayers.toLocaleString()} players</span>
        </div>
      </div>
      <div className="stats-bars">
        {RACES.map((race) => {
          const count = raceCounts[race.id] || 0;
          const percentage = totalPlayers > 0 ? ((count / totalPlayers) * 100).toFixed(1) : 0;
          const barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0;

          return (
            <div key={race.id} className="stats-row">
              <div className="stats-label">
                <img src={race.icon} alt="" className="stats-icon race-icon" />
                <span className="stats-name">{race.name}</span>
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
    </div>
  );
};

// Country distribution chart component
const CountryDistribution = ({ countryCounts, selectedLeague, isLoading }) => {
  const sortedCountries = useMemo(() => {
    return Object.entries(countryCounts)
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10); // Top 10 countries
  }, [countryCounts]);

  const totalPlayers = sortedCountries.reduce((sum, [_, count]) => sum + count, 0);
  const maxCount = sortedCountries.length > 0 ? sortedCountries[0][1] : 1;

  const selectedLeagueName = selectedLeague !== null
    ? LEAGUES.find(l => l.id === selectedLeague)?.name
    : null;

  if (isLoading || sortedCountries.length === 0) {
    return (
      <div className="stats-card">
        <div className="stats-card-header">
          <h2 className="stats-card-title">Top Countries</h2>
        </div>
        <div className="stats-loading">{isLoading ? "Loading..." : "No data"}</div>
      </div>
    );
  }

  return (
    <div className="stats-card">
      <div className="stats-card-header">
        <h2 className="stats-card-title">Top Countries</h2>
        <div className="stats-card-meta">
          {selectedLeagueName && (
            <span className="stats-card-filter">{selectedLeagueName}</span>
          )}
          <span className="stats-card-subtitle">{totalPlayers.toLocaleString()} players</span>
        </div>
      </div>
      <div className="stats-bars">
        {sortedCountries.map(([countryCode, count]) => {
          const percentage = totalPlayers > 0 ? ((count / totalPlayers) * 100).toFixed(1) : 0;
          const barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0;
          const countryName = COUNTRY_NAMES[countryCode] || countryCode;

          return (
            <div key={countryCode} className="stats-row">
              <div className="stats-label">
                <Flag name={countryCode.toLowerCase()} className="stats-flag" />
                <span className="stats-name">{countryName}</span>
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
        <div className="stats-loading">{isLoading ? "Loading..." : "No data"}</div>
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
        <div className="stats-loading">{isLoading ? "Loading..." : "No data"}</div>
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
        <div className="stats-loading">{isLoading ? "Loading..." : "No data"}</div>
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

// Map Popularity chart
const MapPopularity = ({ mapData, selectedSeason, isLoading }) => {
  const chartData = useMemo(() => {
    if (!mapData?.length) return [];

    const seasonData = mapData.find(m => m.season === selectedSeason);
    if (!seasonData?.matchesOnMapPerModes) return [];

    const mode4Data = seasonData.matchesOnMapPerModes.find(m => m.gameMode === 4);
    if (!mode4Data?.maps) return [];

    return mode4Data.maps
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [mapData, selectedSeason]);

  const maxCount = chartData.length > 0 ? chartData[0].count : 1;
  const totalGames = chartData.reduce((sum, d) => sum + d.count, 0);

  if (isLoading || chartData.length === 0) {
    return (
      <div className="stats-card">
        <div className="stats-card-header">
          <h2 className="stats-card-title">Map Popularity</h2>
        </div>
        <div className="stats-loading">{isLoading ? "Loading..." : "No data"}</div>
      </div>
    );
  }

  return (
    <div className="stats-card">
      <div className="stats-card-header">
        <h2 className="stats-card-title">Map Popularity</h2>
        <span className="stats-card-subtitle">{totalGames.toLocaleString()} games</span>
      </div>
      <div className="stats-bars">
        {chartData.map((map) => {
          const percentage = totalGames > 0 ? ((map.count / totalGames) * 100).toFixed(1) : 0;
          const barWidth = maxCount > 0 ? (map.count / maxCount) * 100 : 0;
          const displayName = map.mapName || map.map.replace(/^\(\d\)/, '').trim();

          return (
            <div key={map.map} className="stats-row">
              <div className="stats-label">
                <span className="stats-name map-name">{displayName}</span>
              </div>
              <div className="stats-bar-container">
                <div
                  className="stats-bar map-bar"
                  style={{ width: `${barWidth}%` }}
                />
              </div>
              <div className="stats-values">
                <span className="stats-count">{map.count.toLocaleString()}</span>
                <span className="stats-percent">{percentage}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Stats = () => {
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [availableSeasons, setAvailableSeasons] = useState([]);
  const [leagueData, setLeagueData] = useState({});
  const [playerCountries, setPlayerCountries] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // W3C Stats API data
  const [mmrData, setMmrData] = useState(null);
  const [hoursData, setHoursData] = useState(null);
  const [lengthData, setLengthData] = useState(null);
  const [mapData, setMapData] = useState(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Fetch available seasons on mount
  useEffect(() => {
    const fetchSeasons = async () => {
      try {
        const response = await fetch(
          "https://website-backend.w3champions.com/api/ladder/seasons"
        );
        const seasons = await response.json();
        if (seasons && seasons.length > 0) {
          setAvailableSeasons(seasons);
          setSelectedSeason(seasons[0].id);
        }
      } catch (e) {
        console.error("Failed to fetch seasons:", e);
        setSelectedSeason(24);
      }
    };
    fetchSeasons();
  }, []);

  // Fetch W3C stats (not season-dependent)
  useEffect(() => {
    const fetchW3CStats = async () => {
      setIsLoadingStats(true);
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
      } catch (e) {
        console.error("Failed to fetch W3C stats:", e);
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchW3CStats();
  }, []);

  // Fetch MMR distribution when season changes
  useEffect(() => {
    if (selectedSeason === null) return;

    const fetchMmrDistribution = async () => {
      try {
        const response = await fetch(
          `https://website-backend.w3champions.com/api/w3c-stats/mmr-distribution?season=${selectedSeason}&gateWay=${gateway}&gameMode=4`
        );
        const data = await response.json();
        setMmrData(data);
      } catch (e) {
        console.error("Failed to fetch MMR distribution:", e);
      }
    };

    fetchMmrDistribution();
  }, [selectedSeason]);

  // Fetch all league data when season changes
  useEffect(() => {
    if (selectedSeason === null) return;

    const fetchAllLeagueData = async () => {
      setIsLoading(true);
      const data = {};

      try {
        const promises = LEAGUES.map(async (league) => {
          const url = `https://website-backend.w3champions.com/api/ladder/${league.id}?gateWay=${gateway}&gameMode=4&season=${selectedSeason}`;
          const response = await fetch(url);
          const result = await response.json();
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
      } catch (e) {
        console.error("Failed to fetch league data:", e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllLeagueData();
  }, [selectedSeason]);

  // Compute league counts from data
  const leagueCounts = useMemo(() => {
    const counts = {};
    LEAGUES.forEach((league) => {
      counts[league.id] = leagueData[league.id]?.length || 0;
    });
    return counts;
  }, [leagueData]);

  // Compute race counts - filtered by selected league if applicable
  const raceCounts = useMemo(() => {
    const counts = { 0: 0, 1: 0, 2: 0, 4: 0, 8: 0 };

    const leaguesToCount = selectedLeague !== null
      ? [selectedLeague]
      : LEAGUES.map(l => l.id);

    leaguesToCount.forEach((leagueId) => {
      const players = leagueData[leagueId] || [];
      players.forEach((player) => {
        const race = player.player?.race ?? player.playersInfo?.[0]?.calculatedRace;
        if (race !== undefined && counts.hasOwnProperty(race)) {
          counts[race]++;
        }
      });
    });

    return counts;
  }, [leagueData, selectedLeague]);

  // Compute country counts - filtered by selected league if applicable
  const countryCounts = useMemo(() => {
    const counts = {};

    const leaguesToCount = selectedLeague !== null
      ? [selectedLeague]
      : LEAGUES.map(l => l.id);

    leaguesToCount.forEach((leagueId) => {
      const players = leagueData[leagueId] || [];
      players.forEach((player) => {
        const location = player.playersInfo?.[0]?.location;
        if (location) {
          counts[location] = (counts[location] || 0) + 1;
        }
      });
    });

    return counts;
  }, [leagueData, selectedLeague]);

  const handleSeasonChange = (e) => {
    setSelectedSeason(parseInt(e.target.value, 10));
    setSelectedLeague(null);
  };

  const handleLeagueClick = (leagueId) => {
    setSelectedLeague(selectedLeague === leagueId ? null : leagueId);
  };

  return (
    <div className="stats-page">
      <Navbar />
      <div className="stats-header">
        <h1 className="stats-title">4v4 Statistics</h1>
        <div className="stats-controls">
          <div className="season-selector">
            <select
              id="season-select"
              value={selectedSeason || ""}
              onChange={handleSeasonChange}
            >
              {availableSeasons.map((s) => (
                <option key={s.id} value={s.id}>
                  S{s.id}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <LeagueDistribution
          leagueCounts={leagueCounts}
          selectedLeague={selectedLeague}
          onLeagueClick={handleLeagueClick}
          isLoading={isLoading}
        />
        <RaceDistribution
          raceCounts={raceCounts}
          selectedLeague={selectedLeague}
          isLoading={isLoading}
        />
        <CountryDistribution
          countryCounts={countryCounts}
          selectedLeague={selectedLeague}
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
    </div>
  );
};

export default Stats;
