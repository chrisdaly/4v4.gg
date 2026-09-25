import React from "react";
import { Link } from "react-router-dom";
import { CountryFlag } from "../ui";
import QuoteBlock from "../chat/QuoteBlock";

/**
 * The week's pulse: how busy the ladder was, and who the room could not
 * stop talking about. Both render nothing without a story, and both are
 * meant to carry a line of argument rather than just a count.
 */

const DAY_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * Games by day as a bar row, with the player count of the last few weeks
 * beside it. The daily bars say when the ladder fills; the weekly players
 * line says whether there is anyone left to fill it.
 */
export function WeekTrend({ trend, weekStart }) {
  if (!trend) return null;
  const { days = [], weeks = [], blurb } = trend;
  if (days.length === 0 && weeks.length === 0) return null;

  const ordered = [...days].sort((a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day));
  const maxGames = Math.max(...ordered.map((d) => d.games), 1);
  const busiest = ordered.reduce((a, b) => (b.games > a.games ? b : a), ordered[0] || { games: 0 });

  const players = weeks.filter((w) => w.players > 0);
  const maxPlayers = Math.max(...players.map((w) => w.players), 1);
  const minPlayers = Math.min(...players.map((w) => w.players), maxPlayers);
  const span = Math.max(maxPlayers - minPlayers, 1);
  // A tall-enough floor so a 5% swing still reads as a slope, not a flat line
  const height = (n) => 30 + Math.round(((n - minPlayers) / span) * 70);

  return (
    <section className="mg-section mg-pulse reveal" style={{ "--delay": "0.16s" }} data-week-trend>
      <div className="mg-section-header">
        <span className="mg-section-label">The Week In Games</span>
        <div className="mg-section-rule" />
      </div>
      <div className="mg-pulse-grid">
        {ordered.length > 0 && (
          <div className="mg-pulse-panel">
            <span className="mg-pulse-panel-label">Games by day</span>
            <div className="mg-pulse-days">
              {ordered.map((d) => (
                <div key={d.day} className="mg-pulse-day" data-pulse-day={d.day}>
                  <span className="mg-pulse-day-count">{d.games}</span>
                  <div
                    className={`mg-pulse-bar${d.day === busiest.day ? " mg-pulse-bar--peak" : ""}`}
                    style={{ "--pct": `${Math.round((d.games / maxGames) * 100)}%` }}
                  />
                  <span className="mg-pulse-day-label">{d.day}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {players.length > 1 && (
          <div className="mg-pulse-panel">
            <span className="mg-pulse-panel-label">Players, last {players.length} weeks</span>
            <div className="mg-pulse-weeks">
              {players.map((w) => {
                const isThis = w.weekStart === weekStart;
                return (
                  <div key={w.weekStart} className="mg-pulse-week" data-pulse-week={w.weekStart}>
                    <span className={`mg-pulse-week-count${isThis ? " mg-pulse-week-count--now" : ""}`}>{w.players}</span>
                    <div
                      className={`mg-pulse-week-bar${isThis ? " mg-pulse-week-bar--now" : ""}`}
                      style={{ "--pct": `${height(w.players)}%` }}
                    />
                    <span className="mg-pulse-week-label">
                      {new Date(`${w.weekStart}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      {blurb && <p className="mg-pulse-blurb">{blurb}</p>}
    </section>
  );
}

/**
 * The name the room could not leave alone: the count, how many different
 * people said it, how many days it ran, and what they actually said. The
 * quotes are the point, the number is only the reason to print them.
 */
export function MostTalkedAbout({ subject, profile, highlightNames, nameToTag }) {
  if (!subject?.battleTag) return null;
  const { name, messages, people, days, blurb, quotes = [] } = subject;
  const stat = (value, label) => (
    <div className="mg-talked-stat">
      <span className="mg-talked-value">{value}</span>
      <span className="mg-talked-label">{label}</span>
    </div>
  );

  return (
    <section className="mg-section mg-talked reveal" style={{ "--delay": "0.18s" }} data-most-talked-about={subject.battleTag}>
      <div className="mg-section-header">
        <span className="mg-section-label mg-section-label--gold">Most talked about</span>
        <div className="mg-section-rule" />
      </div>
      <div className="mg-talked-card">
        {profile?.pic && <div className="mg-talked-art" style={{ backgroundImage: `url(${profile.pic})` }} aria-hidden="true" />}
        <div className="mg-talked-head">
          {profile?.pic && <img src={profile.pic} alt="" className="mg-talked-avatar" />}
          <div className="mg-talked-who">
            <Link to={`/player/${encodeURIComponent(subject.battleTag)}`} className="mg-talked-name">{name}</Link>
            {profile?.country && <CountryFlag name={profile.country.toLowerCase()} />}
          </div>
          <div className="mg-talked-stats">
            {stat(messages, messages === 1 ? "MESSAGE" : "MESSAGES")}
            {stat(people, people === 1 ? "PERSON" : "PEOPLE")}
            {stat(`${days}/7`, "DAYS")}
          </div>
        </div>
        {blurb && (
          <p className="mg-talked-blurb">
            {highlightNames ? highlightNames(blurb, nameToTag) : blurb}
          </p>
        )}
        <QuoteBlock quotes={quotes.map((q) => (q.speaker ? `${q.speaker}: ${q.text}` : q.text))} marginTop="var(--space-4)" />
      </div>
    </section>
  );
}
