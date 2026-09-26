import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation, Link } from "react-router-dom";
import { PageLayout } from "../components/PageLayout";
import { PageHero, Button } from "../components/ui";
import PeonLoader from "../components/PeonLoader";
import useAdmin from "../lib/useAdmin";
import {
  SLOTS, loadPicks, savePicks, assign, inSlot, pickedTags, pickQuotes, lineKey,
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
function Compose({ candidate, slot, draft, onChange, adminKey, weekStart, weekEnd }) {
  const d = draft || startDraft(candidate);
  const preview = composeItem(candidate, d);
  const set = (patch) => onChange({ ...d, ...patch });

  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState(null);
  // 402 or 503 means the relay has no usable model, which no amount of
  // clicking fixes. Stop offering the button and say where to draft instead.
  const [noModel, setNoModel] = useState(false);
  const [query, setQuery] = useState("");
  const [wholeArchive, setWholeArchive] = useState(false);
  const [found, setFound] = useState(null);
  const [searching, setSearching] = useState(false);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);

  /** Ask the relay to write a first pass. You edit it; you never keep it as is. */
  const writeDraft = async () => {
    setDrafting(true);
    setDraftError(null);
    try {
      const res = await fetch(`${RELAY_URL}/api/admin/story-draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": adminKey },
        body: JSON.stringify({ candidate, slot }),
      });
      if (!res.ok) {
        if (res.status === 402 || res.status === 503) setNoModel(true);
        throw new Error((await res.json().catch(() => ({}))).error || `Relay said ${res.status}`);
      }
      const { headline, body } = await res.json();
      set({ headline: headline || d.headline, body: body || d.body });
    } catch (e) {
      setDraftError(e.message);
    } finally {
      setDrafting(false);
    }
  };

  /**
   * Your own search, not my picks. The week by default, everything on ask,
   * and it pages, because the first fifty hits are rarely the good ones.
   */
  const PAGE = 50;
  const runSearch = async (offset = 0) => {
    if (query.trim().length < 2) return;
    setSearching(true);
    try {
      const sp = new URLSearchParams({
        q: query.trim(), limit: String(PAGE), offset: String(offset), since: "all",
      });
      if (!wholeArchive) {
        sp.set("after", `${weekStart}T00:00:00`);
        sp.set("before", `${weekEnd}T23:59:59`);
      }
      const res = await fetch(`${RELAY_URL}/api/chat/search?${sp}`);
      const data = res.ok ? await res.json() : { results: [], total: 0 };
      const rows = (data.results || []).map((m) => ({
        at: m.received_at, name: m.user_name, tag: m.battle_tag, text: m.message,
      }));
      setFound((prev) => (offset > 0 ? [...(prev || []), ...rows] : rows));
      setTotal(data.total ?? rows.length);
      setOffset(offset);
    } catch {
      if (offset === 0) setFound([]);
    } finally {
      setSearching(false);
    }
  };
  const search = (e) => {
    e?.preventDefault();
    runSearch(0);
  };

  const QuoteRow = ({ line, i }) => (
    <button
      key={i}
      type="button"
      className={`sd-quote${hasQuote(d, line) ? " sd-quote--on" : ""}`}
      onClick={() => onChange(toggleQuote(d, line))}
    >
      <span className="sd-quote-at">{String(line.at).slice(5, 16)}</span>
      <span className="sd-quote-who">{line.name}</span>
      <span className="sd-quote-text">{line.text}</span>
    </button>
  );

  const picked = d.quotes || [];
  const pickedKeys = new Set(picked.map(lineKey));

  return (
    <div className="sd-compose" data-compose={candidate.id}>
      <div className="sd-compose-top">
        <span className="sd-compose-label">The story</span>
        {!noModel && (
          <Button $pill onClick={writeDraft} disabled={drafting} title="Have a first pass written from these lines, then edit it">
            {drafting ? "Writing…" : "Draft it for me"}
          </Button>
        )}
      </div>
      {noModel ? (
        <span className="sd-compose-note">
          No model on the relay. Draft this one in Claude Code and paste it in.
        </span>
      ) : draftError ? (
        <span className="sd-compose-error">{draftError}</span>
      ) : null}
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

      <span className="sd-compose-label">Quotes ({picked.length} picked)</span>
      {picked.length > 0 && (
        <div className="sd-quotes sd-quotes--picked">
          {picked.map((l, i) => <QuoteRow key={`p${i}`} line={l} i={i} />)}
        </div>
      )}

      <form className="sd-search" onSubmit={search}>
        <input
          className="sd-input sd-input--search"
          placeholder="Search the chat for any quote..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <label className="sd-search-scope">
          <input type="checkbox" checked={wholeArchive} onChange={(e) => setWholeArchive(e.target.checked)} />
          All time
        </label>
        <Button $pill onClick={search} disabled={searching || query.trim().length < 2}>
          {searching ? "…" : "Search"}
        </Button>
      </form>

      {found !== null ? (
        <>
          <span className="sd-compose-label">
            {total} found{wholeArchive ? " in the whole archive" : " this week"}
            {found.length > 0 && " · click to add"}
            {" · "}
            <button type="button" className="sd-linkish" onClick={() => setFound(null)}>back to this story</button>
          </span>
          <div className="sd-quotes sd-quotes--wide">
            {found.filter((l) => !pickedKeys.has(lineKey(l))).map((l, i) => <QuoteRow key={`f${i}`} line={l} i={i} />)}
          </div>
          {found.length < total && (
            <Button $ghost onClick={() => runSearch(offset + PAGE)} disabled={searching}>
              {searching ? "…" : `Show ${Math.min(PAGE, total - found.length)} more of ${total}`}
            </Button>
          )}
        </>
      ) : (
        <>
          <span className="sd-compose-label">From this story ({(candidate.lines || []).length} lines)</span>
          <div className="sd-quotes sd-quotes--wide">
            {(candidate.lines || []).filter((l) => !pickedKeys.has(lineKey(l)))
              .map((l, i) => <QuoteRow key={`c${i}`} line={l} i={i} />)}
          </div>
        </>
      )}

      <span className="sd-compose-label">As it will read in the issue</span>
      {isReady(d) ? (
        <pre className="sd-preview">{preview}</pre>
      ) : (
        <pre className="sd-preview sd-preview--empty">Write a headline and a body, or have one drafted.</pre>
      )}
    </div>
  );
}

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
              {slot === s.key ? s.label : s.label.split(" ")[0]}
            </Button>
          ))}
        </div>
      </div>
      <p className="sd-why">{candidate.why}</p>
      {quotes.length > 0 && !open && !slot && (
        <p className="sd-peek">{quotes[0].name}: {quotes[0].text}</p>
      )}
      {slot && <p className="sd-placed">In the issue above · {SLOTS.find((x) => x.key === slot)?.label}</p>}
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
  const tags = useMemo(() => pickedTags(all, picks, drafts), [all, picks, drafts]);
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
  // Promoted stories, in the order they will appear in the issue
  const working = SLOTS.flatMap((slot) => inSlot(all, picks, slot.key));

  /** The strongest few, plus anything already picked, then the rest on ask. */
  const List = ({ items, expanded, onExpand }) => {
    const shown = expanded ? items : items.filter((c, i) => i < 8 || picks[c.id]);
    return (
      <>
        {shown.map((c) => (
          <CandidateRow key={c.id} candidate={c} slot={picks[c.id]} onAssign={onAssign} />
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

          {working.length > 0 && (
            <section className="sd-working" data-working>
              <h2 className="sd-col-head">In the issue</h2>
              {working.map((c) => (
                <article key={c.id} className={`sd-story sd-story--${picks[c.id]}`} data-story={c.id}>
                  <div className="sd-story-head">
                    <span className="sd-story-slot">{SLOTS.find((x) => x.key === picks[c.id])?.label}</span>
                    <span className="sd-story-subject">
                      {c.kind === "theme" ? c.term : c.who.map((w) => w.name).join(" · ")}
                    </span>
                    <span className="sd-story-why">{c.why}</span>
                    <Button $ghost onClick={() => onAssign(c.id, picks[c.id])} title="Take it out of the issue">
                      Remove
                    </Button>
                  </div>
                  <Compose
                    candidate={c}
                    slot={picks[c.id]}
                    draft={drafts[c.id]}
                    onChange={(d) => onDraft(c.id, d)}
                    adminKey={adminKey}
                    weekStart={weekStart}
                    weekEnd={data?.weekEnd || weekStart}
                  />
                </article>
              ))}
            </section>
          )}

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
