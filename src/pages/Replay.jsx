import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useHistory } from "react-router-dom";
import OnlineMmrStrip from "../components/OnlineMmrStrip";
import WorldMap from "../components/WorldMap";
import EventFeed from "../components/EventFeed";
import "../styles/pages/Replay.css";

const RELAY_URL =
  import.meta.env.VITE_CHAT_RELAY_URL || "https://4v4gg-chat-relay.fly.dev";

const SPEEDS = [1, 10, 50, 100];

const PRESETS = [
  { label: "Last hour", hours: 1 },
  { label: "Last 6h", hours: 6 },
  { label: "Last 24h", hours: 24 },
  { label: "Last 3 days", hours: 72 },
];

/* ── Helpers ─────────────────────────────────────────── */

const formatClock = (d) => {
  if (!d) return "--:--:--";
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  const s = d.getSeconds().toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
};

const formatDate = (d) => {
  if (!d) return "";
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
};

/* Convert Date to local datetime-local string (YYYY-MM-DDTHH:MM) */
const toLocalInput = (d) => {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${mo}-${da}T${h}:${m}`;
};

/* Default: last hour */
const defaultFrom = () => {
  const d = new Date();
  d.setHours(d.getHours() - 1);
  return toLocalInput(d);
};
const defaultTo = () => toLocalInput(new Date());

/* ── Replay Page ─────────────────────────────────────── */

const Replay = () => {
  const history = useHistory();

  // Date range
  const [fromStr, setFromStr] = useState(defaultFrom);
  const [toStr, setToStr] = useState(defaultTo);

  // Raw events fetched from API
  const [rawEvents, setRawEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);

  // Playback state
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(10);
  const [eventIndex, setEventIndex] = useState(0);
  const [simTime, setSimTime] = useState(null);
  const playRef = useRef(false);
  const speedRef = useRef(speed);
  const indexRef = useRef(0);
  const rafRef = useRef(null);
  const lastFrameRef = useRef(null);
  const simTimeRef = useRef(null); // persistent sim clock (ms since epoch)

  // Virtual state built from processed events
  const [onlineUsers, setOnlineUsers] = useState(new Map());
  const [activeMatches, setActiveMatches] = useState(new Map());
  const [feedEvents, setFeedEvents] = useState([]);

  // Pre-compute full MMR range from all events so the Y-axis stays fixed
  const mmrRange = useMemo(() => {
    let min = Infinity, max = -Infinity;
    for (const ev of rawEvents) {
      if (ev.type !== "game_start" && ev.type !== "game_end") continue;
      for (const p of ev.payload?.players || []) {
        const mmr = p.currentMmr || p.oldMmr;
        if (mmr != null && mmr > 0) {
          if (mmr < min) min = mmr;
          if (mmr > max) max = mmr;
        }
      }
    }
    if (min === Infinity) return null;
    return [min - 50, max + 50];
  }, [rawEvents]);

  // Animation speed: scale down durations at higher playback speeds
  const animationScale = useMemo(() => {
    if (speed <= 1) return 1;
    if (speed <= 10) return 0.3;
    if (speed <= 50) return 0.1;
    return 0.05;
  }, [speed]);

  // Fetch summary on mount
  useEffect(() => {
    fetch(`${RELAY_URL}/api/chat/events/summary`)
      .then((r) => r.json())
      .then(setSummary)
      .catch(() => {});
  }, []);

  // Fetch events for range (accepts optional overrides for preset buttons)
  const fetchEvents = useCallback(async (overrideFrom, overrideTo) => {
    setLoading(true);
    setError(null);
    setPlaying(false);
    playRef.current = false;

    try {
      const from = new Date(overrideFrom || fromStr).toISOString();
      const to = new Date(overrideTo || toStr).toISOString();
      const res = await fetch(
        `${RELAY_URL}/api/chat/events?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // Pre-parse timestamps once to avoid Date churn in hot loops
      const events = (data.events || []).map((ev) => ({ ...ev, _ms: new Date(ev.timestamp).getTime() }));
      setRawEvents(events);
      resetState();
    } catch (err) {
      setError(err.message);
      setRawEvents([]);
    } finally {
      setLoading(false);
    }
  }, [fromStr, toStr]);

  const handlePreset = useCallback((hours) => {
    const to = new Date();
    const from = new Date(to.getTime() - hours * 60 * 60 * 1000);
    setFromStr(toLocalInput(from));
    setToStr(toLocalInput(to));
    fetchEvents(from.toISOString(), to.toISOString());
  }, [fetchEvents]);

  // Auto-load last hour on mount
  const didAutoLoad = useRef(false);
  useEffect(() => {
    if (didAutoLoad.current) return;
    didAutoLoad.current = true;
    handlePreset(1);
  }, []);

  const resetState = useCallback(() => {
    setEventIndex(0);
    indexRef.current = 0;
    setSimTime(null);
    simTimeRef.current = null;
    setOnlineUsers(new Map());
    setActiveMatches(new Map());
    setFeedEvents([]);
    lastFrameRef.current = null;
  }, []);

  // Keep refs in sync
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { playRef.current = playing; }, [playing]);

  // Process a single event into virtual state
  const processEvent = useCallback((event, rawIdx) => {
    const { type, payload, _ms } = event;
    const time = new Date(_ms);

    switch (type) {
      case "join": {
        setOnlineUsers((prev) => {
          const next = new Map(prev);
          next.set(payload.battleTag, {
            battleTag: payload.battleTag,
            name: payload.name || payload.battleTag.split("#")[0],
            clanTag: payload.clanTag || "",
          });
          return next;
        });
        setFeedEvents((prev) => [{
          type: "join",
          player: payload.name || payload.battleTag.split("#")[0],
          tag: payload.battleTag,
          country: null,
          time,
          rawIdx,
        }, ...prev].slice(0, 100));
        break;
      }
      case "leave": {
        setOnlineUsers((prev) => {
          const next = new Map(prev);
          next.delete(payload.battleTag);
          return next;
        });
        setFeedEvents((prev) => [{
          type: "leave",
          player: payload.name || payload.battleTag.split("#")[0],
          tag: payload.battleTag,
          country: null,
          time,
          rawIdx,
        }, ...prev].slice(0, 100));
        break;
      }
      case "game_start": {
        setActiveMatches((prev) => {
          const next = new Map(prev);
          next.set(payload.matchId, payload);
          return next;
        });
        const startPlayers = (payload.players || []).map((p) => ({
          name: p.name || p.battleTag?.split("#")[0],
          battleTag: p.battleTag,
          mmr: p.currentMmr || p.oldMmr || 0,
        }));
        const startMmrs = startPlayers.map((p) => p.mmr).filter((m) => m > 0);
        const startAvg = startMmrs.length > 0 ? Math.round(startMmrs.reduce((a, b) => a + b, 0) / startMmrs.length) : null;
        setFeedEvents((prev) => [{
          type: "game_start",
          gamePlayers: startPlayers,
          avgMmr: startAvg,
          matchId: payload.matchId,
          time,
          rawIdx,
        }, ...prev].slice(0, 100));
        break;
      }
      case "game_end": {
        setActiveMatches((prev) => {
          const next = new Map(prev);
          next.delete(payload.matchId);
          return next;
        });
        const endPlayers = (payload.players || []).map((p) => ({
          name: p.name || p.battleTag?.split("#")[0],
          battleTag: p.battleTag,
          mmr: p.currentMmr || p.oldMmr || 0,
        }));
        const endMmrs = endPlayers.map((p) => p.mmr).filter((m) => m > 0);
        const endAvg = endMmrs.length > 0 ? Math.round(endMmrs.reduce((a, b) => a + b, 0) / endMmrs.length) : null;
        const results = (payload.players || [])
          .map((p) => ({
            name: p.name || p.battleTag?.split("#")[0],
            tag: p.battleTag,
            delta: (p.oldMmr != null && p.currentMmr != null && p.oldMmr !== p.currentMmr)
              ? Math.round(p.currentMmr - p.oldMmr) : null,
            mmr: p.currentMmr || p.oldMmr || 0,
          }));
        setFeedEvents((prev) => [{
          type: "game_end",
          gamePlayers: endPlayers,
          results,
          avgMmr: endAvg,
          matchId: payload.matchId,
          time,
          rawIdx,
        }, ...prev].slice(0, 100));
        break;
      }
    }
  }, []);

  // Playback loop using requestAnimationFrame
  // Maintains a persistent sim clock that advances at speed × real time
  useEffect(() => {
    if (!playing || rawEvents.length === 0) return;

    // Initialize sim clock to current event's timestamp if not set
    const idx = indexRef.current;
    if (simTimeRef.current == null && idx < rawEvents.length) {
      simTimeRef.current = rawEvents[idx]._ms;
    }

    const tick = (now) => {
      if (!playRef.current) return;

      if (lastFrameRef.current != null) {
        const realDeltaMs = now - lastFrameRef.current;
        const simDeltaMs = realDeltaMs * speedRef.current;

        // Advance the persistent sim clock
        simTimeRef.current += simDeltaMs;
        const targetMs = simTimeRef.current;

        let i = indexRef.current;

        // Process all events up to the sim clock (use pre-parsed _ms)
        while (i < rawEvents.length) {
          if (rawEvents[i]._ms > targetMs) break;
          processEvent(rawEvents[i], i);
          i++;
        }

        indexRef.current = i;
        setEventIndex(i);
        setSimTime(new Date(targetMs));

        if (i >= rawEvents.length) {
          setPlaying(false);
          playRef.current = false;
        }
      }

      lastFrameRef.current = now;
      if (playRef.current) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    lastFrameRef.current = null;
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, rawEvents, processEvent]);

  // Rebuild virtual state by replaying all events up to (exclusive) targetIdx
  const rebuildStateTo = useCallback((targetIdx) => {
    const users = new Map();
    const matches = new Map();
    const feed = [];

    for (let i = 0; i < targetIdx && i < rawEvents.length; i++) {
      const ev = rawEvents[i];
      const { type, payload, _ms } = ev;
      const time = new Date(_ms);

      switch (type) {
        case "join":
          users.set(payload.battleTag, {
            battleTag: payload.battleTag,
            name: payload.name || payload.battleTag.split("#")[0],
            clanTag: payload.clanTag || "",
          });
          break;
        case "leave":
          users.delete(payload.battleTag);
          break;
        case "game_start":
          matches.set(payload.matchId, payload);
          break;
        case "game_end":
          matches.delete(payload.matchId);
          break;
      }

      // Build feed event matching the shared EventFeed component shape
      const feedEvent = { type, time, rawIdx: i, matchId: payload.matchId };
      if (type === "join" || type === "leave") {
        feedEvent.player = payload.name || payload.battleTag?.split("#")[0];
        feedEvent.tag = payload.battleTag;
      }
      if (type === "game_start" || type === "game_end") {
        const gp = (payload.players || []).map((p) => ({
          name: p.name || p.battleTag?.split("#")[0],
          battleTag: p.battleTag,
          mmr: p.currentMmr || p.oldMmr || 0,
        }));
        const mmrs = gp.map((p) => p.mmr).filter((m) => m > 0);
        feedEvent.gamePlayers = gp;
        feedEvent.avgMmr = mmrs.length > 0 ? Math.round(mmrs.reduce((a, b) => a + b, 0) / mmrs.length) : null;
      }
      if (type === "game_end") {
        feedEvent.results = (payload.players || []).map((p) => ({
          name: p.name || p.battleTag?.split("#")[0],
          tag: p.battleTag,
          delta: (p.oldMmr != null && p.currentMmr != null && p.oldMmr !== p.currentMmr)
            ? Math.round(p.currentMmr - p.oldMmr) : null,
          mmr: p.currentMmr || p.oldMmr || 0,
        }));
      }
      if (feed.length >= 50) feed.pop();
      feed.unshift(feedEvent);
    }

    setOnlineUsers(users);
    setActiveMatches(matches);
    setFeedEvents(feed);
    setEventIndex(targetIdx);
    indexRef.current = targetIdx;
    lastFrameRef.current = null;

    // Set sim clock to the target event's timestamp (use pre-parsed _ms)
    if (targetIdx < rawEvents.length) {
      setSimTime(new Date(rawEvents[targetIdx]._ms));
      simTimeRef.current = rawEvents[targetIdx]._ms;
    } else if (rawEvents.length > 0) {
      const last = rawEvents[rawEvents.length - 1];
      setSimTime(new Date(last._ms));
      simTimeRef.current = last._ms;
    }
  }, [rawEvents]);

  // Seek to a position via the scrubber
  const handleSeek = useCallback((e) => {
    setPlaying(false);
    playRef.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rebuildStateTo(parseInt(e.target.value, 10));
  }, [rebuildStateTo]);

  // Seek to a specific event by raw index (click from EventFeed)
  const seekToEvent = useCallback((rawIdx) => {
    setPlaying(false);
    playRef.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rebuildStateTo(rawIdx);
  }, [rebuildStateTo]);

  const togglePlay = useCallback(() => {
    if (eventIndex >= rawEvents.length && rawEvents.length > 0) {
      // At end, restart
      resetState();
      setTimeout(() => setPlaying(true), 50);
      return;
    }
    setPlaying((p) => !p);
  }, [eventIndex, rawEvents.length, resetState]);

  const handlePlayerClick = useCallback((battleTag) => {
    if (battleTag) history.push(`/player/${encodeURIComponent(battleTag)}`);
  }, [history]);

  // ── Derive visualization data from virtual state ──

  // Convert activeMatches to the match format the components expect
  const matchesForViz = useMemo(() => {
    return [...activeMatches.values()].map((m) => {
      const team0 = [], team1 = [];
      for (const p of m.players || []) {
        const entry = {
          battleTag: p.battleTag,
          oldMmr: p.oldMmr || p.currentMmr || 0,
          currentMmr: p.currentMmr || p.oldMmr || 0,
          race: p.race,
        };
        (p.teamIdx === 1 ? team1 : team0).push(entry);
      }
      return { id: m.matchId, mapName: m.map, teams: [{ players: team0 }, { players: team1 }] };
    });
  }, [activeMatches]);

  // Build players for the MMR strip
  const stripPlayers = useMemo(() => {
    const seen = new Set();
    const result = [];

    // Online users from chat
    for (const [tag, u] of onlineUsers) {
      seen.add(tag);
      result.push({
        battleTag: tag,
        name: u.name || tag.split("#")[0],
        mmr: null, // We don't have stats in replay
        race: null,
        wins: 0,
        losses: 0,
        rank: null,
      });
    }

    // Add in-game players not already in online users
    for (const match of activeMatches.values()) {
      for (const p of match.players || []) {
        if (p.battleTag && !seen.has(p.battleTag)) {
          seen.add(p.battleTag);
          const mmr = p.currentMmr || p.oldMmr || 0;
          result.push({
            battleTag: p.battleTag,
            name: p.name || p.battleTag.split("#")[0],
            mmr: mmr > 0 ? mmr : null,
            race: p.race ?? null,
            wins: 0,
            losses: 0,
            rank: null,
          });
        }
      }
    }

    return result.filter((p) => p.mmr != null);
  }, [onlineUsers, activeMatches]);

  // Build player countries for map
  const playerCountries = useMemo(() => {
    const inGameTags = new Set();
    for (const match of activeMatches.values()) {
      for (const p of match.players || []) {
        if (p.battleTag) inGameTags.add(p.battleTag);
      }
    }

    const countries = new Map();
    for (const match of activeMatches.values()) {
      for (const p of match.players || []) {
        if (!p.country || !p.battleTag) continue;
        const code = p.country.toUpperCase();
        if (!countries.has(code)) countries.set(code, { online: 0, inGame: 0 });
        countries.get(code).inGame++;
      }
    }
    return countries;
  }, [activeMatches]);

  // Map players (with countries from match data)
  const mapPlayers = useMemo(() => {
    const result = [];
    for (const match of activeMatches.values()) {
      for (const p of match.players || []) {
        if (!p.country || !p.battleTag) continue;
        const mmr = p.currentMmr || p.oldMmr || null;
        result.push({
          battleTag: p.battleTag,
          name: p.name || p.battleTag.split("#")[0],
          country: p.country.toUpperCase(),
          mmr,
          inGame: true,
        });
      }
    }
    return result;
  }, [activeMatches]);

  // Progress percentage
  const progress = rawEvents.length > 0 ? (eventIndex / rawEvents.length) * 100 : 0;

  return (
    <div className="replay">
      {/* Controls bar */}
      <div className="replay-controls">
        <div className="replay-controls-row">
          <div className="replay-presets">
            {PRESETS.map((p) => (
              <button
                key={p.hours}
                className="replay-btn replay-btn-preset"
                onClick={() => handlePreset(p.hours)}
                disabled={loading}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="replay-date-inputs">
            <label>
              <span className="replay-label">From</span>
              <input
                type="datetime-local"
                value={fromStr}
                onChange={(e) => setFromStr(e.target.value)}
              />
            </label>
            <label>
              <span className="replay-label">To</span>
              <input
                type="datetime-local"
                value={toStr}
                onChange={(e) => setToStr(e.target.value)}
              />
            </label>
            <button className="replay-btn replay-btn-load" onClick={() => fetchEvents()} disabled={loading}>
              {loading ? "Loading..." : "Load"}
            </button>
          </div>

          <div className="replay-playback">
            <button
              className="replay-btn replay-btn-play"
              onClick={togglePlay}
              disabled={rawEvents.length === 0}
            >
              {playing ? "⏸" : eventIndex >= rawEvents.length && rawEvents.length > 0 ? "⟳" : "▶"}
            </button>
            <div className="replay-speed-btns">
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  className={`replay-btn replay-btn-speed ${speed === s ? "active" : ""}`}
                  onClick={() => setSpeed(s)}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          <div className="replay-clock">
            <span className="replay-clock-date">{simTime ? formatDate(simTime) : ""}</span>
            <span className="replay-clock-time">{formatClock(simTime)}</span>
          </div>

          <div className="replay-stats">
            <span>{onlineUsers.size} chatting</span>
            <span>{activeMatches.size} games</span>
            <span>{eventIndex}/{rawEvents.length}</span>
          </div>
        </div>

        {rawEvents.length > 0 && (
          <div className="replay-scrubber">
            <input
              type="range"
              min={0}
              max={rawEvents.length}
              value={eventIndex}
              onChange={handleSeek}
              className="replay-range"
            />
            <div className="replay-progress-bar" style={{ width: `${progress}%` }} />
          </div>
        )}

        {error && <div className="replay-error">{error}</div>}

        {summary && !rawEvents.length && !loading && (
          <div className="replay-summary">
            {summary.totalEvents > 0
              ? `${summary.totalEvents.toLocaleString()} events recorded · ${summary.days?.length || 0} days`
              : "No events recorded yet. Events will appear once the server starts recording."
            }
          </div>
        )}
      </div>

      {/* Visualization area */}
      <div className="replay-viz">
        <div className="replay-panel replay-world-map">
          <div className="replay-section-header">
            <span className="replay-section-title">World Map</span>
            <span className="replay-section-count">{playerCountries.size} countries</span>
          </div>
          <WorldMap playerCountries={playerCountries} players={mapPlayers} instant animationScale={animationScale} time={simTime} />
        </div>

        <div className="replay-panel replay-mmr-chart">
          <div className="replay-section-header">
            <span className="replay-section-title">MMR Distribution</span>
            <span className="replay-section-count">{stripPlayers.length} players</span>
          </div>
          {stripPlayers.length > 0 ? (
            <OnlineMmrStrip
              players={stripPlayers}
              matches={matchesForViz}
              onPlayerClick={handlePlayerClick}
              mmrRange={mmrRange}
              animationScale={animationScale}
            />
          ) : (
            <div className="replay-empty">Waiting for match data...</div>
          )}
        </div>

        <EventFeed events={feedEvents} onEventClick={seekToEvent} className="replay-panel replay-events" />
      </div>
    </div>
  );
};

export default Replay;
