import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation, Link } from "react-router-dom";
import { PageLayout } from "../components/PageLayout";
import { PageHero, Button } from "../components/ui";
import PeonLoader from "../components/PeonLoader";
import useAdmin from "../lib/useAdmin";
import { SLOTS, loadPicks, savePicks, assign, inSlot, toSections, pickedTags, pickQuotes } from "../lib/news/storyDesk";
import { formatWeekRange } from "../lib/digestUtils";
import "../styles/pages/StoryDesk.css";

const RELAY_URL = import.meta.env.VITE_CHAT_RELAY_URL || "https://4v4gg-chat-relay.fly.dev";

/** The Monday on or before a date, which is how issues are keyed. */
export function mondayOf(date) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

/** The Monday of the last week that has already finished. */
export function lastCompleteWeek(today = new Date()) {
  const thisMonday = mondayOf(today.toISOString().slice(0, 10));
  const d = new Date(`${thisMonday}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 7);
  return d.toISOString().slice(0, 10);
}

const shiftWeeks = (weekStart, n) => {
  const d = new Date(`${weekStart}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n * 7);
  return d.toISOString().slice(0, 10);
};

/** One candidate: its rank, why it ranked, and what to do with it. */
function CandidateRow({ candidate, slot, onAssign }) {
  const [open, setOpen] = useState(false);
  const quotes = useMemo(() => pickQuotes(candidate, 4), [candidate]);
  const title = candidate.kind === "theme"
    ? candidate.term
    : candidate.who.map((w) => w.name).join(" · ");

  return (
    <div className={`sd-row${slot ? ` sd-row--${slot}` : ""}`} data-candidate={candidate.id}>
      <div className="sd-row-head">
        <span className="sd-score">{candidate.kind === "theme" ? `${candidate.score}x` : candidate.score}</span>
        <button type="button" className="sd-title" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          {title}
        </button>
        <div className="sd-slots">
          {SLOTS.map((s) => (
            <Button
              key={s.key}
              $pill
              className={slot === s.key ? "sd-slot sd-slot--on" : "sd-slot"}
              title={s.hint}
              onClick={() => onAssign(candidate.id, s.key)}
            >
              {s.label}
            </Button>
          ))}
        </div>
      </div>
      <p className="sd-why">{candidate.why}</p>
      {quotes.length > 0 && !open && (
        <p className="sd-peek">{quotes[0].name}: {quotes[0].text}</p>
      )}
      {open && (
        <div className="sd-lines">
          {(candidate.lines || []).slice(0, 60).map((l, i) => (
            <p key={i} className="sd-line">
              <span className="sd-line-at">{l.at.slice(5, 16)}</span>
              <span className="sd-line-who">{l.name}</span>
              <span className="sd-line-text">{l.text}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * The story desk: where the week's editorial decisions get made. Two ranked
 * lists of candidates with the numbers behind each rank, a slot to promote
 * them into, and the digest sections those picks become.
 *
 * It is deliberately not the reading page. Picking stories and laying out an
 * issue are different jobs and the controls for one get in the way of the
 * other.
 */
export default function StoryDesk() {
  const location = useLocation();
  const { adminKey, isAdmin } = useAdmin();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const [weekStart, setWeekStart] = useState(() => params.get("week") || lastCompleteWeek());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [picks, setPicks] = useState(() => loadPicks(weekStart));
  const [copied, setCopied] = useState(false);

  useEffect(() => { setPicks(loadPicks(weekStart)); }, [weekStart]);

  useEffect(() => {
    if (!isAdmin || !adminKey) { setLoading(false); return undefined; }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`${RELAY_URL}/api/admin/story-candidates/${weekStart}`, { headers: { "X-API-Key": adminKey } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Relay said ${r.status}`))))
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [weekStart, adminKey, isAdmin]);

  const all = useMemo(() => [...(data?.themes || []), ...(data?.threads || [])], [data]);

  const onAssign = useCallback((id, slot) => {
    setPicks((prev) => {
      const next = assign(prev, id, slot);
      savePicks(weekStart, next);
      return next;
    });
  }, [weekStart]);

  const sections = useMemo(() => toSections(all, picks), [all, picks]);
  const tags = useMemo(() => pickedTags(all, picks), [all, picks]);

  const copy = () => {
    const text = tags.length > 0 ? `${sections}\nMENTIONS: ${tags.join(",")}` : sections;
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  if (!isAdmin) {
    return (
      <PageLayout>
        <PageHero eyebrow="Editorial" title="Story Desk" />
        <p className="sd-empty">Add your admin key to see the week&rsquo;s candidates.</p>
      </PageLayout>
    );
  }

  const counts = SLOTS.map((s) => ({ ...s, n: inSlot(all, picks, s.key).length }));

  return (
    <PageLayout>
      <PageHero eyebrow="Editorial" title="Story Desk" />

      <div className="sd-bar">
        <div className="sd-week">
          <Button $ghost onClick={() => setWeekStart((w) => shiftWeeks(w, -1))}>← Earlier</Button>
          <span className="sd-week-label">{formatWeekRange(weekStart, data?.weekEnd || weekStart)}</span>
          <Button $ghost onClick={() => setWeekStart((w) => shiftWeeks(w, 1))}>Later →</Button>
        </div>
        {data && (
          <span className="sd-counts">
            {data.weekMessages.toLocaleString("en-US")} messages this week, {data.baselineMessages.toLocaleString("en-US")} in the four before
          </span>
        )}
        <Link to={`/news?week=${weekStart}`} className="sd-link">See the issue →</Link>
      </div>

      {loading && <PeonLoader />}
      {error && <p className="sd-empty">Could not load candidates. {error}</p>}

      {data && !loading && (
        <>
          <div className="sd-budget" data-budget>
            {counts.map((c) => (
              <span key={c.key} className={`sd-budget-slot${c.n > 0 ? " sd-budget-slot--filled" : ""}`}>
                <span className="sd-budget-n">{c.n}</span>
                <span className="sd-budget-label">{c.label}</span>
              </span>
            ))}
            <Button $primary onClick={copy} disabled={!sections}>
              {copied ? "Copied" : "Copy sections"}
            </Button>
          </div>

          <div className="sd-cols">
            <section className="sd-col" data-list="themes">
              <h2 className="sd-col-head">Themes</h2>
              <p className="sd-col-sub">
                Topics that ran well above the last four weeks. These are the slow stories: they never spike, so
                nothing that looks for busy minutes will find them.
              </p>
              {data.themes.map((c) => (
                <CandidateRow key={c.id} candidate={c} slot={picks[c.id]} onAssign={onAssign} />
              ))}
              {data.themes.length === 0 && <p className="sd-empty">Nothing ran above baseline this week.</p>}
            </section>

            <section className="sd-col" data-list="threads">
              <h2 className="sd-col-head">Threads</h2>
              <p className="sd-col-sub">
                Bursts: a lot of messages in a few minutes, mostly between two people, with the room reacting.
                These are almost always arguments.
              </p>
              {data.threads.map((c) => (
                <CandidateRow key={c.id} candidate={c} slot={picks[c.id]} onAssign={onAssign} />
              ))}
              {data.threads.length === 0 && <p className="sd-empty">No bursts this week.</p>}
            </section>
          </div>

          {sections && (
            <section className="sd-out">
              <h2 className="sd-col-head">Sections from your picks</h2>
              <pre className="sd-pre">{sections}</pre>
            </section>
          )}
        </>
      )}
    </PageLayout>
  );
}
