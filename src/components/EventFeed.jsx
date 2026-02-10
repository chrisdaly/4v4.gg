import React from "react";
import { toFlag, formatEventTime } from "../lib/utils";

const EventFeed = ({ events, onEventClick, title = "Activity", className = "home-panel home-events" }) => (
  <div className={className}>
    <div className="home-section-header">
      <span className="home-section-title">{title}</span>
      {events.length > 0 && (
        <span className="home-section-count">{events.length} events</span>
      )}
    </div>
    <div className="event-feed-list">
      {events.length === 0 && (
        <div className="home-empty">Waiting for activity...</div>
      )}
      {events.map((e, i) => (
        <div
          key={`${e.type}-${e.time?.getTime?.() || i}-${i}`}
          className={`event-item${onEventClick ? " event-item-clickable" : ""}`}
          onClick={() => onEventClick && e.rawIdx != null && onEventClick(e.rawIdx)}
        >
          <span className={`event-dot event-${e.type}`} />
          <div className="event-body">
            <div className="event-main">
              {e.country && <span className="event-flag">{toFlag(e.country)}</span>}
              <span className="event-name">
                {e.type === "game_start"
                  ? `Game started${e.avgMmr ? ` (${e.avgMmr.toLocaleString()} MMR)` : ""}`
                  : e.type === "game_end"
                    ? `Game ended${e.avgMmr ? ` (${e.avgMmr.toLocaleString()} MMR)` : ""}`
                    : e.player}
              </span>
              {e.time && <span className="event-time">{formatEventTime(e.time)}</span>}
            </div>
            <div className="event-detail">
              {e.type === "join" && "joined"}
              {e.type === "leave" && "left"}
              {e.type === "game_start" && (
                <div className="event-game-results">
                  {(e.gamePlayers || []).map((p, j) => (
                    <div key={j} className="event-game-row">
                      <span className="event-game-name">{p.name}</span>
                      {p.mmr > 0 && <span className="event-mmr">{p.mmr.toLocaleString()}</span>}
                    </div>
                  ))}
                </div>
              )}
              {e.type === "game_end" && (
                <div className="event-game-results">
                  {(e.results?.length > 0 ? e.results : (e.gamePlayers || []).map((p) => ({ name: p.name, mmr: p.mmr, delta: null })))
                    .sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0))
                    .map((r, j) => (
                      <div key={j} className="event-game-row">
                        <span className="event-game-name">{r.name}</span>
                        <span className="event-game-stats">
                          {r.mmr > 0 && <span className="event-mmr">{r.mmr.toLocaleString()}</span>}
                          {r.delta != null && (
                            <span className={r.delta > 0 ? "event-delta-gain" : "event-delta-loss"}>
                              {r.delta > 0 ? "+" : ""}{r.delta}
                            </span>
                          )}
                        </span>
                      </div>
                    ))}
                </div>
              )}
              {e.type === "mmr_gain" && <><span className="event-delta-gain">+{e.delta}</span> MMR</>}
              {e.type === "mmr_loss" && <><span className="event-delta-loss">{e.delta}</span> MMR</>}
              {(e.type === "join" || e.type === "leave") && e.mmr != null && (
                <span className="event-mmr"> · {Math.round(e.mmr).toLocaleString()} MMR</span>
              )}
              {(e.type === "mmr_gain" || e.type === "mmr_loss") && (
                <span className="event-mmr"> ({Math.round(e.prevMmr).toLocaleString()} → {Math.round(e.mmr).toLocaleString()})</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default EventFeed;
