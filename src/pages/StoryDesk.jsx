import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation, Link } from "react-router-dom";
import { PageLayout } from "../components/PageLayout";
import { PageHero, Button } from "../components/ui";
import PeonLoader from "../components/PeonLoader";
import useAdmin from "../lib/useAdmin";
import FormDots from "../components/FormDots";
import { StreakSpectrum } from "../components/news/WeeklyMagazine";
import { WeekTrend } from "../components/news/WeekPulse";
import {
  SLOTS, loadPicks, savePicks, assign, inSlot, pickedTags, pickQuotes, lineKey,
  readStatLine, readSpectrum, readRankings, readDaily, readMmr, findRun, SPOTLIGHT_ORDER,
  loadQuote, saveQuote, quoteSection,
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
        <div className="sd-peek">
          {quotes.slice(0, 3).map((q, i) => (
            <p key={i} className="sd-peek-line">
              <span className="sd-peek-who">{q.name}</span> {q.text}
            </p>
          ))}
        </div>
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
 * Quote of the week: the lines somebody else laughed at, shown the way the
 * home page shows the winner, so picking one is a matter of reading them
 * rather than reading a score. Your own search is there for when none of
 * them is the one you remember.
 */
function QuoteOfWeek({ quotes, chosen, onChoose, weekStart, weekEnd }) {
  const [query, setQuery] = useState("");
  const [found, setFound] = useState(null);
  const [searching, setSearching] = useState(false);

  const search = async (e) => {
    e?.preventDefault();
    if (query.trim().length < 2) return;
    setSearching(true);
    try {
      const sp = new URLSearchParams({
        q: query.trim(), limit: "30", since: "all",
        after: `${weekStart}T00:00:00`, before: `${weekEnd}T23:59:59`,
      });
      const res = await fetch(`${RELAY_URL}/api/chat/search?${sp}`);
      const data = res.ok ? await res.json() : { results: [] };
      setFound((data.results || []).map((m) => ({
        id: `s:${m.id}`, at: m.received_at, name: m.user_name, tag: m.battle_tag, text: m.message,
      })));
    } catch {
      setFound([]);
    } finally {
      setSearching(false);
    }
  };

  const shown = found ?? quotes;
  const isChosen = (q) => chosen?.text === q.text && chosen?.name === q.name;

  return (
    <section className="sd-qotw" data-qotw>
      <div className="sd-stats-head">
        <h2 className="sd-col-head">Quote of the week</h2>
        <span className="sd-col-sub sd-stats-sub">
          Lines somebody else laughed at within two minutes. One goes on the front of the issue and on the
          home page, so pick the one that reads best cold.
        </span>
      </div>

      {chosen && (
        <div className="sd-qotw-chosen">
          <span className="sd-qotw-label">Chosen</span>
          <span className="sd-qotw-text">&ldquo;{chosen.text}&rdquo;</span>
          <span className="sd-qotw-by">{chosen.name}</span>
          <Button $ghost onClick={() => onChoose(null)}>Clear</Button>
        </div>
      )}

      <form className="sd-search" onSubmit={search}>
        <input
          className="sd-input sd-input--search"
          placeholder="Or find one yourself..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {found && <Button $ghost onClick={() => { setFound(null); setQuery(""); }}>Back to the best</Button>}
        <Button $pill onClick={search} disabled={searching || query.trim().length < 2}>
          {searching ? "…" : "Search"}
        </Button>
      </form>

      <div className="sd-qotw-grid">
        {shown.map((q) => (
          <button
            key={q.id}
            type="button"
            className={`sd-qotw-card${isChosen(q) ? " sd-qotw-card--on" : ""}`}
            onClick={() => onChoose(isChosen(q) ? null : q)}
            data-quote-option={q.id}
          >
            <span className="sd-qotw-text">&ldquo;{q.text}&rdquo;</span>
            <span className="sd-qotw-foot">
              <span className="sd-qotw-by">{q.name}</span>
              {q.laughs > 0 && (
                <span className="sd-qotw-laughs" title={(q.who || []).join(", ")}>
                  {q.laughs} laughed
                </span>
              )}
              <span className="sd-qotw-at">{String(q.at).slice(5, 16)}</span>
            </span>
          </button>
        ))}
        {shown.length === 0 && (
          <p className="sd-empty">{found ? "Nothing matched that." : "Nothing landed this week."}</p>
        )}
      </div>
    </section>
  );
}

/**
 * The week's numbers as they will appear, not as the text that encodes them.
 * A line like "WINNER: Name#1[HU] +239 MMR (17W-6L) WLWW" is unreadable and
 * the totals underneath it were never interesting, so both are gone.
 */
/**
 * A card's week as dots, grouped by the day they were played, with the run
 * that earned the card picked out. 187 dots in a row tell you nothing about
 * when the week turned, and a 10-win streak is invisible inside 80 of them.
 */
function WeekDots({ days, streak }) {
  if (!days?.length) return null;
  // Walk the flat form so the streak's position maps back onto the days
  let seen = 0;
  return (
    <div className="sd-weekdots">
      {days.map(({ day, form }) => {
        const cells = form.split("").map((ch, i) => {
          const idx = seen + i;
          const inRun = streak && idx >= streak.start && idx < streak.end;
          return (
            <span
              key={i}
              className={`sd-dot sd-dot--${ch === "W" ? "win" : "loss"}${inRun ? " sd-dot--run" : ""}`}
            />
          );
        });
        seen += form.length;
        return (
          <div key={day} className="sd-weekday">
            <span className="sd-weekday-label">{day}</span>
            <div className="sd-weekday-dots">{cells}</div>
            <span className="sd-weekday-n">{form.length || ""}</span>
          </div>
        );
      })}
    </div>
  );
}

function NumbersPreview({ sections, weekStart }) {
  const cards = SPOTLIGHT_ORDER
    .map((c) => ({ ...c, stat: readStatLine(sections[c.key]) }))
    .filter((c) => c.stat);
  const spectrum = readSpectrum(sections.STREAK_SPECTRUM);
  const rankings = readRankings(sections.POWER_RANKINGS);
  const trend = sections.WEEK_TREND;
  const heroes = (sections.HEROSLAYER_HEROES || "").split(",").filter(Boolean);
  const daily = readDaily(sections.SPOTLIGHT_DAILY);
  const mmr = readMmr(sections.SPOTLIGHT_MMR);
  const heroTotal = sections.HEROSLAYER_TOTAL || null;
  const [heroGame, heroMatchId] = String(sections.HEROSLAYER_GAME || "").split("|");
  // The run that earned the card, so it can be picked out of the dots
  const runFor = (key, stat) => {
    const m = String(stat.headline).match(/(\d+)([WL]) streak/);
    return m ? findRun(stat.form, m[2], Number(m[1])) : null;
  };
  const maxRise = Math.max(...rankings.map((r) => Math.abs(r.mmrChange)), 1);

  return (
    <div className="sd-numbers" data-numbers>
      {cards.length > 0 && (
        <div className="sd-cards">
          {cards.map(({ key, label, accent, stat }) => (
            <div key={key} className={`sd-card sd-card--${accent}`} data-number-card={key}>
              <span className="sd-card-role">{label}</span>
              <span className="sd-card-name">{stat.name}</span>
              <span className="sd-card-stat">{stat.headline}</span>
              <span className="sd-card-record">
                {stat.wins}W-{stat.losses}L
                {mmr[key] ? <span className="sd-card-mmr">{mmr[key].toLocaleString("en-US")} MMR</span> : null}
              </span>
              {key === "HEROSLAYER" && heroGame && (
                heroMatchId ? (
                  <a className="sd-card-extra sd-card-link" href={`/match/${heroMatchId}`} target="_blank" rel="noreferrer">
                    {heroGame} →
                  </a>
                ) : <span className="sd-card-extra">{heroGame}</span>
              )}
              {key === "HEROSLAYER" && heroTotal && (
                <span className="sd-card-record">{heroTotal} over the week</span>
              )}
              {key === "HEROSLAYER" && heroes.length > 0 && (
                <div className="sd-card-heroes">
                  {heroes.map((h) => <img key={h} src={`/heroes/${h}.jpeg`} alt={h} className="sd-card-hero" />)}
                </div>
              )}
              {key !== "HEROSLAYER" && daily[key]?.length ? (
                <WeekDots days={daily[key]} streak={runFor(key, stat)} />
              ) : key !== "HEROSLAYER" && stat.form ? (
                <FormDots form={stat.form.split("").map((c) => c === "W")} size="small" maxDots={24} showSummary={false} />
              ) : null}
            </div>
          ))}
        </div>
      )}

      {rankings.length > 0 && (
        <div className="sd-ranks">
          <span className="sd-compose-label">Power rankings</span>
          {rankings.map((r) => (
            <div key={r.battleTag} className="sd-rank" data-rank={r.battleTag}>
              <span className="sd-rank-name">{r.name}</span>
              <span className="sd-rank-bar-wrap">
                <span
                  className={`sd-rank-bar${r.mmrChange < 0 ? " sd-rank-bar--down" : ""}`}
                  style={{ "--pct": `${Math.round((Math.abs(r.mmrChange) / maxRise) * 100)}%` }}
                />
              </span>
              <span className={`sd-rank-mmr ${r.mmrChange < 0 ? "mg-text-red" : "mg-text-green"}`}>
                {r.mmrChange > 0 ? "+" : ""}{r.mmrChange}
              </span>
            </div>
          ))}
        </div>
      )}

      {spectrum && (
        <div className="sd-spectrum">
          <span className="sd-compose-label">Streaks across the ladder</span>
          <StreakSpectrum spectrumData={spectrum} />
        </div>
      )}

      {trend && <WeekTrend trend={{ ...parseTrend(trend), blurb: sections.WEEK_TREND_BLURB || null }} weekStart={weekStart} />}
    </div>
  );
}

/** "days=Mon:203,...|weeks=2026-08-24:1502/666,..." as WeekTrend wants it. */
function parseTrend(line) {
  const parts = {};
  for (const chunk of String(line).split("|")) {
    const [k, v] = chunk.split(/=(.+)/);
    if (k && v) parts[k] = v;
  }
  const weeks = (parts.weeks || "").split(",").map((e) => {
    const [weekStart, rest] = e.split(":");
    const [games, players] = String(rest || "").split("/");
    return weekStart && games ? { weekStart, games: Number(games), players: Number(players) } : null;
  }).filter(Boolean);
  return weeks.length ? { weeks } : null;
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
  const [showAllPeople, setShowAllPeople] = useState(false);
  const [stats, setStats] = useState(null);
  const [statsState, setStatsState] = useState(null);
  const [issue, setIssue] = useState(null);
  const [quote, setQuote] = useState(null);
  const [publishing, setPublishing] = useState(false);

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
   * The week's numbers: winners, streaks, rankings, new blood, hero kills,
   * the trend. Computed on the relay from stored match data, so this is a
   * fetch and a write, never a judgement call.
   */
  /** What the issue already says, so the desk never has to send you elsewhere. */
  const loadIssue = useCallback(async () => {
    try {
      const res = await fetch(`${RELAY_URL}/api/admin/weekly-digests`, {
        cache: "no-store", headers: { "X-API-Key": adminKey },
      });
      const all = res.ok ? await res.json() : [];
      setIssue(all.find((w) => w.week_start === weekStart) || null);
    } catch {
      setIssue(null);
    }
  }, [weekStart, adminKey]);

  /**
   * Publishing reads the current flag first and only moves it in the
   * direction asked. The relay's route is a toggle, so firing it blind can
   * unpublish something that was already out.
   */
  const setPublished = async (next) => {
    if (!issue || Boolean(issue.published) === next) return;
    setPublishing(true);
    try {
      await fetch(`${RELAY_URL}/api/admin/weekly-digest/${weekStart}/publish`, {
        method: "PUT", headers: { "X-API-Key": adminKey },
      });
      await loadIssue();
    } finally {
      setPublishing(false);
    }
  };

  const loadStats = useCallback(async () => {
    setStatsState("loading");
    try {
      const res = await fetch(`${RELAY_URL}/api/admin/weekly-stats/${weekStart}`, {
        headers: { "X-API-Key": adminKey },
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Relay said ${res.status}`);
      setStats(await res.json());
      setStatsState(null);
    } catch (e) {
      setStats(null);
      setStatsState(e.message);
    }
  }, [weekStart, adminKey]);

  useEffect(() => {
    setStats(null);
    setStatsState(null);
    setQuote(loadQuote(weekStart));
    if (isAdmin && adminKey) {
      loadStats();
      loadIssue();
    }
  }, [weekStart, isAdmin, adminKey, loadStats, loadIssue]);

  /**
   * Write the composed stories into the issue, keeping every other section
   * as it is. The relay's set route also resets the draft column, so
   * editorial mode cannot resurrect an older version over the top.
   */
  const apply = async (includeStats = true) => {
    setApplying(true);
    setApplied(null);
    try {
      const res = await fetch(`${RELAY_URL}/api/admin/weekly-digest/${weekStart}/draft`, {
        headers: { "X-API-Key": adminKey },
      });
      const current = res.ok ? (await res.json()).digest || "" : "";
      const best = quoteSection(quote);
      const merged = applyToDigest(current, {
        ...(includeStats && stats ? stats.sections : {}),
        ...sections,
        ...(best ? { BEST_OF_CHAT: best } : {}),
      });
      const save = await fetch(`${RELAY_URL}/api/admin/weekly-digest/${weekStart}/set`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": adminKey },
        body: JSON.stringify({ digest: merged, ...(stats?.stats ? { stats: stats.stats } : {}) }),
      });
      setApplied(save.ok ? "Saved" : "Could not save");
      if (save.ok) await loadIssue();
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
  // A term that is a player's name says who the week was about, not what happened
  const themes = data?.themes || [];
  const subjects = themes.filter((t) => t.subject !== "player");
  const people = themes.filter((t) => t.subject === "player");

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
            <span className="sd-budget-slot">
              <span className={`sd-budget-n${stats ? " sd-budget-n--ready" : ""}`}>
                {stats ? Object.keys(stats.sections).length : statsState === "loading" ? "…" : 0}
              </span>
              <span className="sd-budget-label">Numbers</span>
            </span>
            <span className="sd-budget-sep" aria-hidden="true" />
            {applied && <span className="sd-applied">{applied}</span>}
            <span className="sd-budget-slot">
              <span className={`sd-budget-n${quote ? " sd-budget-n--ready" : ""}`}>{quote ? 1 : 0}</span>
              <span className="sd-budget-label">Quote</span>
            </span>
            <span className="sd-budget-sep" aria-hidden="true" />
            <Button $primary onClick={() => apply()} disabled={applying || (readyCount === 0 && !stats)}>
              {applying ? "Saving…" : "Save to issue"}
            </Button>
            {issue && (
              <Button
                $secondary
                onClick={() => setPublished(!issue.published)}
                disabled={publishing}
                title={issue.published ? "Take it back off the site" : "Put this issue on the site"}
              >
                {publishing ? "…" : issue.published ? "Published · take down" : "Publish"}
              </Button>
            )}
          </div>

          <QuoteOfWeek
            quotes={data.quotes || []}
            chosen={quote}
            weekStart={weekStart}
            weekEnd={data.weekEnd || weekStart}
            onChoose={(q) => { setQuote(q); saveQuote(weekStart, q); }}
          />

          <section className="sd-stats" data-stats>
            <div className="sd-stats-head">
              <h2 className="sd-col-head">The week&rsquo;s numbers</h2>
              <span className="sd-col-sub sd-stats-sub">
                Winners, streaks, rankings, new blood, hero kills and the trend, already counted from match
                data. Nothing here is a judgement call, so it saves with everything else.
              </span>
              {statsState === "loading" && <span className="sd-col-sub sd-stats-sub">Counting…</span>}
              {statsState && statsState !== "loading" && (
                <Button $secondary onClick={loadStats}>Try again</Button>
              )}
            </div>
            {statsState && statsState !== "loading" && <p className="sd-compose-error">{statsState}</p>}
            {stats && <NumbersPreview sections={stats.sections} weekStart={weekStart} />}
          </section>

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
              <h2 className="sd-col-head">Argued about all week</h2>
              <p className="sd-col-sub">
                A subject that ran well above the last four weeks, so <strong>3x</strong> is three times the
                usual amount of talk. These are the slow stories: they never spike, so counting busy minutes
                will not find them.
              </p>
              <List items={subjects} expanded={showAllThemes} onExpand={() => setShowAllThemes(true)} />
              {subjects.length === 0 && <p className="sd-empty">No subject ran above the last four weeks.</p>}

              {people.length > 0 && (
                <>
                  <h2 className="sd-col-head sd-col-head--second">Who they talked about</h2>
                  <p className="sd-col-sub">
                    The same measure, but the word is somebody&rsquo;s name. A player spiking is usually not a
                    story on its own, it is who the week was about. Worth a look when the number is large.
                  </p>
                  <List items={people} expanded={showAllPeople} onExpand={() => setShowAllPeople(true)} />
                </>
              )}
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
