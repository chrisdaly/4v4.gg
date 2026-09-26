import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation, Link } from "react-router-dom";
import { PageLayout } from "../components/PageLayout";
import { PageHero, Button } from "../components/ui";
import PeonLoader from "../components/PeonLoader";
import useAdmin from "../lib/useAdmin";
import {
  SLOTS, loadPicks, savePicks, assign, inSlot, pickedTags, pickQuotes,
  loadDrafts, saveDrafts, startDraft, composeItem, toggleQuote, hasQuote, isReady,
  applyToDigest, composedSections,
} from "../lib/news/storyDesk";
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

/**
 * Writing a promoted story. The lines are already here, which is the point:
 * the old editorial mode had to go searching the chat for quotes, and the
 * desk knows the cast and the window a candidate came from.
 */
function Compose({ candidate, draft, onChange }) {
  const d = draft || startDraft(candidate);
  const preview = composeItem(candidate, d);
  const set = (patch) => onChange({ ...d, ...patch });

  return (
    <div className="sd-compose" data-compose={candidate.id}>
      <input
        className="sd-input"
        placeholder="Headline"
        value={d.headline || ""}
        onChange={(e) => set({ headline: e.target.value })}
      />
      <textarea
        className="sd-textarea"
        placeholder="The story, in two or three sentences."
        rows={3}
        value={d.body || ""}
        onChange={(e) => set({ body: e.target.value })}
      />
      <span className="sd-compose-label">Quotes ({(d.quoteKeys || []).length} picked)</span>
      <div className="sd-quotes">
        {(candidate.lines || []).slice(0, 40).map((l, i) => {
          const on = hasQuote(d, l);
          return (
            <button
              key={i}
              type="button"
              className={`sd-quote${on ? " sd-quote--on" : ""}`}
              onClick={() => onChange(toggleQuote(d, l))}
            >
              <span className="sd-quote-who">{l.name}</span>
              <span className="sd-quote-text">{l.text}</span>
            </button>
          );
        })}
      </div>
      {preview && (
        <>
          <span className="sd-compose-label">As it will read in the issue</span>
          <pre className="sd-preview">{preview}</pre>
        </>
      )}
    </div>
  );
}

/** One candidate: its rank, why it ranked, and what to do with it. */
function CandidateRow({ candidate, slot, onAssign, draft, onDraft }) {
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
              {slot === s.key ? s.label : s.label.split(" ")[0]}
            </Button>
          ))}
        </div>
      </div>
      <p className="sd-why">{candidate.why}</p>
      {quotes.length > 0 && !open && !slot && (
        <p className="sd-peek">{quotes[0].name}: {quotes[0].text}</p>
      )}
      {slot && <Compose candidate={candidate} draft={draft} onChange={(d) => onDraft(candidate.id, d)} />}
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
  const [drafts, setDrafts] = useState(() => loadDrafts(weekStart));
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(null);
  const [showAllThemes, setShowAllThemes] = useState(false);
  const [showAllThreads, setShowAllThreads] = useState(false);

  useEffect(() => {
    setPicks(loadPicks(weekStart));
    setDrafts(loadDrafts(weekStart));
    setApplied(null);
  }, [weekStart]);

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

  const onDraft = useCallback((id, d) => {
    setDrafts((prev) => {
      const next = { ...prev, [id]: d };
      saveDrafts(weekStart, next);
      return next;
    });
  }, [weekStart]);

  const sections = useMemo(() => composedSections(all, picks, drafts), [all, picks, drafts]);
  const tags = useMemo(() => pickedTags(all, picks), [all, picks]);
  const readyCount = useMemo(
    () => all.filter((c) => picks[c.id] && isReady(drafts[c.id])).length,
    [all, picks, drafts]
  );

  /**
   * Write the composed stories into the issue, keeping every other section
   * as it is. The relay's set route also resets the draft column, so
   * editorial mode cannot resurrect an older version over the top.
   */
  const apply = async () => {
    setApplying(true);
    setApplied(null);
    try {
      const res = await fetch(`${RELAY_URL}/api/admin/weekly-digest/${weekStart}/draft`, {
        headers: { "X-API-Key": adminKey },
      });
      const current = res.ok ? (await res.json()).digest || "" : "";
      const merged = applyToDigest(current, sections);
      const save = await fetch(`${RELAY_URL}/api/admin/weekly-digest/${weekStart}/set`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": adminKey },
        body: JSON.stringify({ digest: merged }),
      });
      setApplied(save.ok ? "Written to the issue" : "Could not write to the issue");
    } catch {
      setApplied("Could not reach the relay");
    } finally {
      setApplying(false);
      setTimeout(() => setApplied(null), 4000);
    }
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

  /** The strongest few, plus anything already picked, then the rest on ask. */
  const List = ({ items, expanded, onExpand }) => {
    const shown = expanded ? items : items.filter((c, i) => i < 8 || picks[c.id]);
    return (
      <>
        {shown.map((c) => (
          <CandidateRow key={c.id} candidate={c} slot={picks[c.id]} onAssign={onAssign} draft={drafts[c.id]} onDraft={onDraft} />
        ))}
        {!expanded && items.length > shown.length && (
          <Button $ghost className="sd-more" onClick={onExpand}>
            Show {items.length - shown.length} more
          </Button>
        )}
      </>
    );
  };

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
              <span key={c.key} className={`sd-budget-slot${c.n > 0 ? " sd-budget-slot--filled" : ""}`} title={c.hint}>
                <span className="sd-budget-n">{c.max ? `${c.n}/${c.max}` : c.n}</span>
                <span className="sd-budget-label">{c.label}</span>
              </span>
            ))}
            <span className="sd-budget-sep" aria-hidden="true" />
            <span className="sd-budget-slot">
              <span className={`sd-budget-n${readyCount > 0 ? " sd-budget-n--ready" : ""}`}>{readyCount}</span>
              <span className="sd-budget-label">Written</span>
            </span>
            {applied && <span className="sd-applied">{applied}</span>}
            <Button $primary onClick={apply} disabled={applying || readyCount === 0}>
              {applying ? "Writing…" : "Write to issue"}
            </Button>
          </div>

          <div className="sd-cols">
            <section className="sd-col" data-list="themes">
              <h2 className="sd-col-head">Talked about all week</h2>
              <p className="sd-col-sub">
                One subject, many people, spread over days. Ranked by how far above the last four weeks it ran,
                so <strong>3x</strong> means three times the usual amount of talk. Slow stories: they never spike,
                so counting busy minutes will not find them.
              </p>
              <List items={data.themes} expanded={showAllThemes} onExpand={() => setShowAllThemes(true)} />
              {data.themes.length === 0 && <p className="sd-empty">Nothing ran above the last four weeks.</p>}
            </section>

            <section className="sd-col" data-list="threads">
              <h2 className="sd-col-head">Blew up in minutes</h2>
              <p className="sd-col-sub">
                One conversation, fast, usually two people going at each other while the room watches. Ranked on
                messages per minute and how many people laughed. These are almost always arguments.
              </p>
              <List items={data.threads} expanded={showAllThreads} onExpand={() => setShowAllThreads(true)} />
              {data.threads.length === 0 && <p className="sd-empty">Nothing blew up this week.</p>}
            </section>
          </div>

          {Object.keys(sections).length > 0 && (
            <section className="sd-out">
              <h2 className="sd-col-head">What will be written</h2>
              <pre className="sd-pre">
                {Object.entries(sections).map(([k, v]) => `${k}: ${v}`).join("\n\n")}
                {tags.length > 0 ? `\n\nMENTIONS touched: ${tags.join(", ")}` : ""}
              </pre>
            </section>
          )}
        </>
      )}
    </PageLayout>
  );
}
