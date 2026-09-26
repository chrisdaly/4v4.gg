import React from "react";
import { Link } from "react-router-dom";
import { CountryFlag } from "../ui";
import QuoteBlock from "../chat/QuoteBlock";

/**
 * The week's pulse: how busy the ladder was, and who the room could not
 * stop talking about. Both render nothing without a story, and both are
 * meant to carry a line of argument rather than just a count.
 */

/**
 * The player count of the last few weeks. The daily game counts used to sit
 * beside this and they were only ever a report: the ladder is busier at the
 * weekend, which surprises nobody. Whether there is anyone left to fill it
 * is the story, so it gets the whole section.
 */
export function WeekTrend({ trend, weekStart }) {
  if (!trend) return null;
  const { weeks = [], blurb } = trend;
  const players = weeks.filter((w) => w.players > 0);
  if (players.length < 2) return null;

  const max = Math.max(...players.map((w) => w.players));
  const min = Math.min(...players.map((w) => w.players));
  const span = Math.max(max - min, 1);
  // A tall floor so a 15% swing still reads as a slope rather than a flat line
  const height = (n) => 24 + Math.round(((n - min) / span) * 76);

  const first = players[0];
  const last = players[players.length - 1];
  const change = last.players - first.players;
  const pct = Math.round((change / first.players) * 100);

  return (
    <section className="mg-section mg-pulse reveal" style={{ "--delay": "0.16s" }} data-week-trend>
      <div className="mg-section-header">
        <span className="mg-section-label">Players, last {players.length} weeks</span>
        <div className="mg-section-rule" />
      </div>
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
      {change !== 0 && (
        <p className="mg-pulse-delta" data-pulse-delta>
          <span className={change < 0 ? "mg-text-red" : "mg-text-green"}>
            {change > 0 ? "+" : ""}{change} players
          </span>
          <span className="mg-pulse-delta-sub">
            {pct > 0 ? "+" : ""}{pct}% since {new Date(`${first.weekStart}T12:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric" })}
          </span>
        </p>
      )}
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
