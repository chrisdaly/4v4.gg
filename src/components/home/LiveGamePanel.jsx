import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import LiveGameSlide from "./LiveGameSlide";
import { RaceIcon } from "../ui";
import { getMapImageUrl } from "../../lib/formatters";
import { renderBlurbText } from "../MatchNote";

/**
 * The home page's live game panel: one slide per ongoing game, highest
 * average MMR first, rotating every `rotateSeconds`, with the LIVE NOW bar
 * along the bottom (pulsing dot, "Game N of M · highest-rated first" or,
 * for ~1.7s after one arrives, a tagged event, then the pager bars and the
 * link to /live). With no game live it shows the latest finished game
 * instead (winners, losers, MVP, note) and a link to /finished.
 *
 * Props
 *   matches        ongoing matches sorted by average MMR (desc), or null
 *                  before the first poll (the panel stays blank)
 *   rotateSeconds  default 6
 *   flash          the latest event to announce, { id, tag, color, text }
 *                  or null; a new id restarts the 1.7s
 *   finished       { event, note } the latest finished game for the empty
 *                  state (a game_end event from useGameEvents' builder)
 */

const FLASH_MS = 1700;

const TAG_COLOR = {
  FINISHED: "var(--green)",
  STARTED: "var(--red)",
  JOINED: "var(--team-blue)",
};

function FinishedPanel({ finished }) {
  const ev = finished?.event;
  if (!ev) {
    return (
      <div className="hm-empty" data-live-empty>
        <span className="hm-empty-text">No games live right now.</span>
        <Link to="/finished" className="hm-cta hm-cta-inline">RECENT MATCHES →</Link>
      </div>
    );
  }
  const mapImg = getMapImageUrl(ev.mapName);
  const duration = ev.durationInSeconds != null ? `${Math.floor(ev.durationInSeconds / 60)}:${String(Math.round(ev.durationInSeconds % 60)).padStart(2, "0")}` : null;
  const ago = ev.time ? Math.max(0, Math.round((Date.now() - new Date(ev.time).getTime()) / 60000)) : null;
  const gain = (p) => (p.mmrGain == null ? "" : `${p.mmrGain >= 0 ? "+" : "-"}${Math.abs(Math.round(p.mmrGain))}`);
  const note = finished.note || ev.note;
  const noteText = typeof note === "string" ? note : note?.text;
  const noteName = typeof note === "object" ? note?.name : null;
  return (
    <div className="hm-finished" data-live-empty="finished">
      <div className="hm-finished-head">
        <span className="hm-finished-tag">FINISHED</span>
        {mapImg && <img src={mapImg} alt="" className="hm-finished-map" onError={(e) => { e.target.style.display = "none"; }} />}
        <span className="hm-finished-mapname">{ev.mapName}</span>
        <span className="hm-finished-meta">
          {duration}
          {duration && ago != null ? " · " : ""}
          {ago != null ? `${ago} min ago` : ""}
        </span>
      </div>
      <div className="hm-finished-teams">
        <div className="hm-finished-side hm-finished-winners">
          <span className="hm-finished-label hm-finished-label-w">WINNERS</span>
          {ev.winners.map((p) => (
            <div key={p.battleTag} className="hm-finished-row">
              {ev.mvp && p.battleTag === ev.mvp && <span className="hm-mvp-badge">MVP</span>}
              <span className="hm-finished-delta hm-finished-delta-w">{gain(p)}</span>
              <Link to={`/player/${encodeURIComponent(p.battleTag)}`} className="hm-finished-name">{p.name}</Link>
              <RaceIcon race={p.race} className="hm-finished-race" />
            </div>
          ))}
        </div>
        <span className="hm-finished-vs">vs</span>
        <div className="hm-finished-side hm-finished-losers">
          <span className="hm-finished-label hm-finished-label-l">LOSERS</span>
          {ev.losers.map((p) => (
            <div key={p.battleTag} className="hm-finished-row">
              <RaceIcon race={p.race} className="hm-finished-race" />
              <Link to={`/player/${encodeURIComponent(p.battleTag)}`} className="hm-finished-name hm-finished-name-l">{p.name}</Link>
              <span className="hm-finished-delta hm-finished-delta-l">{gain(p)}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="hm-finished-foot">
        {noteText && (
          <span className="hm-finished-note">
            <span className="hm-finished-note-tag">{ev.mvp && note?.tag === ev.mvp ? "MVP" : "NOTE"}</span>
            {noteName && <span className="hm-finished-note-name">{noteName} </span>}
            <span>{renderBlurbText(noteText)}</span>
          </span>
        )}
        <Link to="/finished" className="hm-cta hm-cta-inline">RECENT MATCHES →</Link>
      </div>
    </div>
  );
}

export default function LiveGamePanel({ matches: matchesProp = [], rotateSeconds = 6, flash = null, finished = null, onSlideChange }) {
  const loading = matchesProp === null;
  const matches = useMemo(() => matchesProp || [], [matchesProp]);
  const [idx, setIdx] = useState(0);
  const [shownFlash, setShownFlash] = useState(null);
  const count = matches.length;
  const safeIdx = count > 0 ? Math.min(idx, count - 1) : 0;

  // Rotation, restarted whenever the set of games or the interval changes
  const ids = useMemo(() => matches.map((m) => m.id).join(","), [matches]);
  useEffect(() => {
    if (count < 2) return undefined;
    const id = setInterval(() => setIdx((i) => (i + 1) % count), Math.max(3, rotateSeconds) * 1000);
    return () => clearInterval(id);
  }, [count, rotateSeconds, ids]);

  useEffect(() => {
    onSlideChange?.(safeIdx, matches[safeIdx] || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeIdx, ids]);

  // A new event replaces the caption for 1.7s
  const flashTimer = useRef(null);
  useEffect(() => {
    if (!flash) return undefined;
    setShownFlash(flash);
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setShownFlash(null), FLASH_MS);
    return () => clearTimeout(flashTimer.current);
  }, [flash]);

  if (loading) {
    return <section className="hm-live hm-panel" data-live-panel="loading" aria-busy="true" />;
  }

  if (count === 0) {
    return (
      <section className="hm-live hm-panel" data-live-panel="empty">
        <FinishedPanel finished={finished} />
      </section>
    );
  }

  return (
    <section className="hm-live hm-panel" data-live-panel={count}>
      <div className="hm-slides">
        {matches.map((m, i) => (
          <LiveGameSlide key={m.id} match={m} active={i === safeIdx} />
        ))}
      </div>
      <div className="hm-livebar" data-live-bar>
        <span className="live-dot hm-livebar-dot" />
        <span className="hm-livebar-label">LIVE NOW</span>
        {shownFlash ? (
          <span className="hm-livebar-event" key={shownFlash.id} data-live-flash={shownFlash.tag}>
            <span className="hm-livebar-tag" style={{ color: TAG_COLOR[shownFlash.tag] || "var(--grey-light)", borderColor: TAG_COLOR[shownFlash.tag] || "var(--grey-light)" }}>
              {shownFlash.tag}
            </span>
            {shownFlash.text}
          </span>
        ) : (
          <span className="hm-livebar-caption" data-live-caption>
            Game {safeIdx + 1} of {count} · highest-rated first
          </span>
        )}
        <div className="hm-pager" role="tablist" aria-label="Live games">
          {matches.map((m, i) => (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={i === safeIdx}
              aria-label={`Game ${i + 1}`}
              className={`hm-pager-bar ${i === safeIdx ? "is-active" : ""}`}
              onClick={() => setIdx(i)}
            />
          ))}
        </div>
        <Link to="/live" className="hm-livebar-link">All live games →</Link>
      </div>
    </section>
  );
}
