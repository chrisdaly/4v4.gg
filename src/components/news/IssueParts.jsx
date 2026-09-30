import React from "react";
import { Link } from "react-router-dom";
import { issueTitle } from "../../lib/news/issueRules";

/**
 * The weekly issue's new pieces (design handoff "News pages"): the lede
 * with key numbers, the quote of the week, day by day, the prev / next
 * issue links and the editorial "left out this week" panel. Each renders
 * nothing when it has no story.
 */

/**
 * The standfirst: the claim, in two sentences, directly under the headline
 * and above the story that proves it. It is one column at full measure, not
 * a narrow one beside a grid, because a paragraph set 14 lines deep in a
 * 420px column is a wall and nobody reads it.
 */
export function LedeSection({ recap, editorial, EditableText }) {
  if (!recap) return null;
  return (
    <section className="mg-lede reveal" style={{ "--delay": "0.08s" }} data-issue-lede>
      {editorial && EditableText ? (
        <EditableText value={recap} onSave={(t) => editorial.handleEditSection("RECAP", t)} tag="p" className="mg-lede-text" />
      ) : (
        <p className="mg-lede-text">{recap}</p>
      )}
    </section>
  );
}

/**
 * The week at a glance as one strip, under the lead story rather than
 * beside the standfirst. Supporting evidence reads better after the claim
 * it supports, and a row does not leave a column of dead space.
 */
export function KeyNumbers({ numbers = [] }) {
  if (numbers.length < 2) return null;
  return (
    <section className="mg-keynums reveal" style={{ "--delay": "0.16s" }} data-key-numbers>
      {numbers.map((n) => (
        <div key={n.label} className="mg-keynum" data-key-number={n.label}>
          <span className={`mg-keynum-value mg-keynum-value--${n.tone || "white"}`}>{n.value}</span>
          <span className="mg-keynum-label">{n.label}</span>
        </div>
      ))}
    </section>
  );
}

/** The quote of the week: BEST_OF_CHAT's pick, the speaker's art faded on the right. */
export function QuoteOfWeek({ quote, profile, context }) {
  if (!quote?.text) return null;
  const href = quote.battleTag ? `/player/${encodeURIComponent(quote.battleTag)}` : null;
  return (
    <section className="mg-qow reveal" style={{ "--delay": "0.12s" }} data-quote-of-week>
      {profile?.pic && <div className="mg-qow-art" style={{ backgroundImage: `url(${profile.pic})` }} aria-hidden="true" />}
      <span className="mg-section-label mg-section-label--gold mg-qow-label">Quote of the week</span>
      <span className="mg-qow-mark" aria-hidden="true">“</span>
      <span className="mg-qow-text">{quote.text}</span>
      <div className="mg-qow-by">
        {profile?.pic && <img src={profile.pic} alt="" className="mg-qow-avatar" />}
        <div className="mg-qow-who">
          {href ? <Link to={href} className="mg-qow-name">{quote.speaker}</Link> : <span className="mg-qow-name">{quote.speaker}</span>}
          {context && <span className="mg-qow-ctx">{context}</span>}
        </div>
      </div>
    </section>
  );
}

/** Day by day: the week's daily digests as one-liners, each linking to its day. */
export function DayByDay({ days = [] }) {
  if (days.length === 0) return null;
  return (
    <section className="mg-section mg-days reveal" style={{ "--delay": "0.40s" }} data-day-by-day>
      <div className="mg-section-header">
        <span className="mg-section-label">Day by day</span>
        <div className="mg-section-rule" />
      </div>
      <div className="mg-days-list">
        {days.map((d) => (
          <Link key={d.date} to={`/news?day=${d.date}`} className="mg-day" data-day={d.date}>
            <span className="mg-day-when">
              <span className="mg-day-dow">{d.dow}</span>
              <span className="mg-day-date">{d.label}</span>
            </span>
            <span className="mg-day-text">{d.text}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/** Prev / next issue at the bottom; the latest issue says when the next is due. */
export function IssueNav({ prev, next, prevNo, nextNo }) {
  return (
    <nav className="mg-issue-nav" aria-label="Issues" data-issue-nav>
      {prev ? (
        <Link to={`/news?week=${prev.week_start}`} className="mg-issue-nav-link mg-issue-nav-prev" data-issue-prev={prev.week_start}>
          <span className="mg-issue-nav-kicker">← Previous{prevNo != null ? ` · No. ${prevNo}` : ""}</span>
          <span className="mg-issue-nav-title">{issueTitle(prev)}</span>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link to={`/news?week=${next.week_start}`} className="mg-issue-nav-link mg-issue-nav-next" data-issue-next={next.week_start}>
          <span className="mg-issue-nav-kicker">Next{nextNo != null ? ` · No. ${nextNo}` : ""} →</span>
          <span className="mg-issue-nav-title">{issueTitle(next)}</span>
        </Link>
      ) : (
        <div className="mg-issue-nav-link mg-issue-nav-next mg-issue-nav-soon" data-issue-next="soon">
          <span className="mg-issue-nav-kicker">Next issue</span>
          <span className="mg-issue-nav-soon-text">Out Monday</span>
        </div>
      )}
    </nav>
  );
}

/** Editorial only: what the section rules left out this week, and why. */
export function LeftOut({ items = [] }) {
  return (
    <section className="mg-leftout" data-left-out>
      <span className="mg-section-label">Left out this week</span>
      {items.length === 0 ? (
        <span className="mg-leftout-none">Nothing. Every section had a story.</span>
      ) : (
        items.map((k) => (
          <div key={k.name} className="mg-leftout-row">
            <span className="mg-leftout-name">{k.name}</span>
            <span className="mg-leftout-reason">{k.reason}</span>
          </div>
        ))
      )}
    </section>
  );
}
