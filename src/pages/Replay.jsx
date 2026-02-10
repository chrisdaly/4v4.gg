import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useHistory } from "react-router-dom";
import OnlineMmrStrip from "../components/OnlineMmrStrip";
import WorldMap from "../components/WorldMap";
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

const toFlag = (code) => {
  if (!code || code.length !== 2) return "";
  return String.fromCodePoint(
    ...[...code.toUpperCase()].map((c) => 0x1F1E6 + c.charCodeAt(0) - 65)
  );
};

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

const formatEventTime = (time) => {
  const h = time.getHours();
  const m = time.getMinutes();
  return `${h}:${m < 10 ? "0" + m : m}`;
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

/* ── EventFeed (replay version) ──────────────────────── */

const EventFeed = ({ events, onEventClick }) => (
  <div className="replay-panel replay-events">
    <div className="replay-section-header">
      <span className="replay-section-title">Activity</span>
      <span className="replay-section-count">{events.length} events</span>
    </div>
    <div className="event-feed-list">
      {events.length === 0 && (
        <div className="replay-empty">No events yet...</div>
      )}
      {events.map((e, i) => (
        <div
          key={`${e.type}-${i}`}
          className="event-item event-item-clickable"
          onClick={() => onEventClick && e.rawIdx != null && onEventClick(e.rawIdx)}
        >
          <span className={`event-dot event-${e.type}`} />
          <div className="event-body">
            <div className="event-main">
              {e.country && <span className="event-flag">{toFlag(e.country)}</span>}
              <span className="event-name">
                {e.type === "game_start"
                  ? (e.players || []).slice(0, 2).join(", ") +
                    ((e.players || []).length > 2 ? ` +${e.players.length - 2}` : "")
                  : e.type === "game_end"
                    ? "Game ended"
                    : e.player}
              </span>
              <span className="event-time">{formatEventTime(e.time)}</span>
            </div>
            <div className="event-detail">
              {e.type === "join" && "joined"}
              {e.type === "leave" && "left"}
              {e.type === "game_start" && (e.map ? `started on ${e.map}` : "started a game")}
              {e.type === "game_end" && (
                (e.results || []).length > 0 ? (
                  <div className="event-game-results">
                    {[...e.results].sort((a, b) => b.delta - a.delta).map((r, j) => (
                      <div key={j} className="event-game-row">
                        <span className="event-game-name">{r.name}</span>
                        <span className={r.delta > 0 ? "event-delta-gain" : "event-delta-loss"}>
                          {r.delta > 0 ? "+" : ""}{r.delta}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span>{(e.players || []).slice(0, 4).join(", ")}</span>
                )
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

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
      setRawEvents(data.events || []);
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
    const { type, payload, timestamp } = event;
    const time = new Date(timestamp);

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
        const playerNames = (payload.players || []).map((p) => p.name || p.battleTag?.split("#")[0]);
        setFeedEvents((prev) => [{
          type: "game_start",
          players: playerNames,
          map: payload.map,
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
        const gamePlayers = (payload.players || []).map((p) => p.name || p.battleTag?.split("#")[0]);
        // Compute MMR deltas where we have both old and current
        const results = (payload.players || [])
          .filter((p) => p.oldMmr != null && p.currentMmr != null && p.oldMmr !== p.currentMmr)
          .map((p) => ({
            name: p.name || p.battleTag?.split("#")[0],
            delta: Math.round(p.currentMmr - p.oldMmr),
            mmr: p.currentMmr,
          }));
        setFeedEvents((prev) => [{
          type: "game_end",
          players: gamePlayers,
          results,
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
      simTimeRef.current = new Date(rawEvents[idx].timestamp).getTime();
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

        // Process all events up to the sim clock
        while (i < rawEvents.length) {
          const eventMs = new Date(rawEvents[i].timestamp).getTime();
          if (eventMs > targetMs) break;
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

  // Seek to a position via the scrubber
  const handleSeek = useCallback((e) => {
    const targetIdx = parseInt(e.target.value, 10);

    // Reset state and replay all events up to targetIdx
    const users = new Map();
    const matches = new Map();
    const feed = [];

    for (let i = 0; i < targetIdx && i < rawEvents.length; i++) {
      const ev = rawEvents[i];
      const { type, payload, timestamp } = ev;
      const time = new Date(timestamp);

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

      // Only keep last 50 feed events for display
      if (feed.length >= 50) feed.pop();
      feed.unshift({
        type,
        player: type === "join" || type === "leave"
          ? (payload.name || payload.battleTag?.split("#")[0]) : undefined,
        players: type === "game_start" || type === "game_end"
          ? (payload.players || []).map((p) => p.name || p.battleTag?.split("#")[0]) : undefined,
        results: type === "game_end"
          ? (payload.players || [])
            .filter((p) => p.oldMmr != null && p.currentMmr != null && p.oldMmr !== p.currentMmr)
            .map((p) => ({ name: p.name || p.battleTag?.split("#")[0], delta: Math.round(p.currentMmr - p.oldMmr), mmr: p.currentMmr }))
          : undefined,
        map: payload.map,
        matchId: payload.matchId,
        time,
        rawIdx: i,
      });
    }

    setOnlineUsers(users);
    setActiveMatches(matches);
    setFeedEvents(feed);
    setEventIndex(targetIdx);
    indexRef.current = targetIdx;
    lastFrameRef.current = null;

    if (targetIdx < rawEvents.length) {
      const t = new Date(rawEvents[targetIdx].timestamp);
      setSimTime(t);
      simTimeRef.current = t.getTime();
    } else if (rawEvents.length > 0) {
      const t = new Date(rawEvents[rawEvents.length - 1].timestamp);
      setSimTime(t);
      simTimeRef.current = t.getTime();
    }
  }, [rawEvents]);

  // Seek to a specific event by raw index (click from EventFeed)
  // Rebuilds state up to (but not including) the event, then starts playback
  const seekToEvent = useCallback((rawIdx) => {
    // Pause first
    setPlaying(false);
    playRef.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    // Rebuild state up to rawIdx (exclusive — we want to see it animate in)
    const users = new Map();
    const matches = new Map();
    const feed = [];

    for (let i = 0; i < rawIdx && i < rawEvents.length; i++) {
      const ev = rawEvents[i];
      const { type, payload, timestamp } = ev;
      const time = new Date(timestamp);

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

      if (feed.length >= 50) feed.pop();
      feed.unshift({
        type,
        player: type === "join" || type === "leave"
          ? (payload.name || payload.battleTag?.split("#")[0]) : undefined,
        players: type === "game_start" || type === "game_end"
          ? (payload.players || []).map((p) => p.name || p.battleTag?.split("#")[0]) : undefined,
        results: type === "game_end"
          ? (payload.players || [])
            .filter((p) => p.oldMmr != null && p.currentMmr != null && p.oldMmr !== p.currentMmr)
            .map((p) => ({ name: p.name || p.battleTag?.split("#")[0], delta: Math.round(p.currentMmr - p.oldMmr), mmr: p.currentMmr }))
          : undefined,
        map: payload.map,
        matchId: payload.matchId,
        time,
        rawIdx: i,
      });
    }

    setOnlineUsers(users);
    setActiveMatches(matches);
    setFeedEvents(feed);
    setEventIndex(rawIdx);
    indexRef.current = rawIdx;
    lastFrameRef.current = null;

    if (rawIdx < rawEvents.length) {
      const t = new Date(rawEvents[rawIdx].timestamp);
      setSimTime(t);
      simTimeRef.current = t.getTime();
    }

    // Start playing after a short delay so React renders the rebuilt state first
    setTimeout(() => setPlaying(true), 80);
  }, [rawEvents]);

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
    return [...activeMatches.values()].map((m) => ({
      id: m.matchId,
      mapName: m.map,
      teams: [
        { players: (m.players || []).filter((_, i) => i < 4).map((p) => ({
          battleTag: p.battleTag,
          oldMmr: p.oldMmr || p.currentMmr || 0,
          currentMmr: p.currentMmr || p.oldMmr || 0,
          race: p.race,
        }))},
        { players: (m.players || []).filter((_, i) => i >= 4).map((p) => ({
          battleTag: p.battleTag,
          oldMmr: p.oldMmr || p.currentMmr || 0,
          currentMmr: p.currentMmr || p.oldMmr || 0,
          race: p.race,
        }))},
      ],
    }));
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

        <EventFeed events={feedEvents} onEventClick={seekToEvent} />
      </div>
    </div>
  );
};

export default Replay;
