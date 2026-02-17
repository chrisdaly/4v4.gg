import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { fetchAndCacheProfile } from "../../lib/profileCache";
import { CountryFlag, ConfirmModal } from "../ui";
import FormDots from "../FormDots";
import PeonLoader from "../PeonLoader";
import useWeeklyEditorial, {
  TOGGLEABLE_SECTIONS,
  STAT_LINES,
} from "../../lib/useWeeklyEditorial";
import useVariantGen from "../../lib/useVariantGen";
import VariantPicker from "./VariantPicker";
import {
  COVER_BACKGROUNDS,
  hashDate,
  formatWeekRange,
  parseDigestSections,
  parseMentions,
  parseStatLine,
  extractMentionedTags,
  splitQuotes,
  groupQuotesBySpeaker,
  getSpotlightExtras,
  parsePowerRankings,
  parseUpsets,
  parseATSpotlight,
  parseMatchStats,
  parseNewBlood,
} from "../../lib/digestUtils";
import "../../styles/pages/Magazine.css";

const RELAY_URL =
  import.meta.env.VITE_CHAT_RELAY_URL || "https://4v4gg-chat-relay.fly.dev";

const RACE_ICONS = {
  HU: "/icons/human.png",
  ORC: "/icons/orc.png",
  NE: "/icons/elf.png",
  UD: "/icons/undead.png",
};

const MATCH_STAT_ICONS = {
  "Hero Slayer": "\u2694\uFE0F",
  "Unit Killer": "\uD83D\uDCA5",
  "Longest Game": "\u23F1\uFE0F",
  "Fan Favorite": "\u2B50",
  "Spicy Combo": "\uD83C\uDF36\uFE0F",
  "One Trick": "\uD83C\uDFAF",
  "Wildcard": "\uD83C\uDCCF",
};

/** Clean up summary text after quote extraction — removes empty paren blocks, stray punctuation */
const cleanSummary = (text) =>
  text
    .replace(/\([;,\s]*\)/g, "")       // "(; ; ; )" or "()" left after quote extraction
    .replace(/\n+/g, " ")              // collapse newlines
    .replace(/\s{2,}/g, " ")           // collapse spaces
    .replace(/\s+([.,;])/g, "$1")      // remove space before punctuation
    .replace(/[.,;]+\s*$/, "")         // trim trailing punctuation
    .trim();

/** Highlight known player names in narrative text as gold links/spans */
const highlightNames = (text, nameToTag) => {
  if (!nameToTag || nameToTag.size === 0) return text;
  const names = [...nameToTag.keys()]
    .filter((n) => n.length >= 3)
    .sort((a, b) => b.length - a.length);
  if (names.length === 0) return text;
  const escaped = names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`\\b(${escaped.join("|")})\\b`, "g");
  const parts = [];
  let last = 0;
  let k = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const tag = nameToTag.get(m[0]);
    if (tag && tag.includes("#")) {
      parts.push(
        <Link key={k++} to={`/player/${encodeURIComponent(tag)}`} className="mg-inline-name">{m[0]}</Link>
      );
    } else {
      parts.push(<span key={k++} className="mg-inline-name">{m[0]}</span>);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length > 0 ? parts : text;
};

/* ═══════════════════════════════════════════════════════
   EDITORIAL HELPERS
   ═══════════════════════════════════════════════════════ */

/** Inline editable text — click to edit, blur to save */
const EditableText = ({ value, onSave, tag: Tag = "span", className = "" }) => {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);

  useEffect(() => setText(value), [value]);

  if (!editing) {
    return (
      <Tag
        className={`${className} mg-editable`}
        onClick={() => setEditing(true)}
        title="Click to edit"
      >
        {value}
      </Tag>
    );
  }

  return Tag === "p" || Tag === "textarea" ? (
    <textarea
      className={`${className} mg-editable mg-editable--active`}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => { setEditing(false); if (text.trim() !== value) onSave(text.trim()); }}
      onKeyDown={(e) => { if (e.key === "Escape") { setEditing(false); setText(value); } }}
      autoFocus
      rows={3}
    />
  ) : (
    <input
      type="text"
      className={`${className} mg-editable mg-editable--active`}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => { setEditing(false); if (text.trim() !== value) onSave(text.trim()); }}
      onKeyDown={(e) => {
        if (e.key === "Enter") { setEditing(false); if (text.trim() !== value) onSave(text.trim()); }
        if (e.key === "Escape") { setEditing(false); setText(value); }
      }}
      autoFocus
    />
  );
};

/** Section visibility toggle for admins */
const SectionToggle = ({ label, sectionKey, hidden, onToggle, children }) => {
  return (
    <div className={`mg-editorial-section-wrap ${hidden ? "mg-editorial-section--hidden" : ""}`}>
      <div className="mg-editorial-section-toggle">
        <label className="mg-editorial-toggle-label">
          <input
            type="checkbox"
            checked={!hidden}
            onChange={() => onToggle(sectionKey)}
          />
          {label}
        </label>
      </div>
      {!hidden && children}
    </div>
  );
};

/** Stat line toggle */
const StatToggle = ({ label, statKey, hidden, onToggle }) => (
  <label className="mg-editorial-stat-toggle">
    <input type="checkbox" checked={!hidden} onChange={() => onToggle(statKey)} />
    {label}
  </label>
);

/** Item checkbox + reorder controls for semicolon lists */
const ItemControls = ({ idx, total, selected, onToggle, onMoveUp, onMoveDown }) => (
  <div className="mg-editorial-item-controls">
    <input type="checkbox" checked={selected} onChange={onToggle} />
    <button className="mg-editorial-move" disabled={idx === 0} onClick={onMoveUp} title="Move up">&#9650;</button>
    <button className="mg-editorial-move" disabled={idx === total - 1} onClick={onMoveDown} title="Move down">&#9660;</button>
  </div>
);

/** Save status bar */
const SaveStatus = ({ state }) => {
  if (state === "idle") return null;
  const label = state === "dirty" ? "Unsaved" : state === "saving" ? "Saving..." : "Saved";
  return (
    <div className={`mg-editorial-status mg-editorial-status--${state}`}>
      {label}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   ACT 1 — THE STORIES (editorial / narrative)
   ═══════════════════════════════════════════════════════ */

const CoverHero = ({ weekly, coverBg, headline, editorial, onRegenerate, regenerating, variantGen }) => {
  const stats = weekly.stats;
  return (
    <header className="mg-header reveal" style={{ "--delay": "0.05s" }}>
      <span className="mg-header-date">{formatWeekRange(weekly.week_start, weekly.week_end)}</span>
      {editorial && weekly.week_start && (
        <span className="mg-header-admin-actions">
          <a
            href={`/dev?week=${weekly.week_start}`}
            className="mg-editorial-cover-link"
            title="Edit cover image"
          >
            Edit Cover
          </a>
          <button
            className="mg-regen-btn"
            onClick={onRegenerate}
            disabled={regenerating}
            title="Delete cached digest and regenerate from scratch"
          >
            {regenerating ? "Regenerating..." : "Regenerate"}
          </button>
          {variantGen && !variantGen.isGenerating && !variantGen.isDone && (
            <button
              className="mg-regen-btn"
              onClick={variantGen.startGeneration}
              title="Generate 3 editorial variants for mix-and-match"
            >
              Generate Variants
            </button>
          )}
          {variantGen?.isGenerating && (
            <span className="mg-gen-status mg-gen-status--generating">
              <span className="mg-gen-dot" />
              Generating... <span className="mg-gen-progress">{variantGen.job.completed}/{variantGen.job.total}</span>
            </span>
          )}
          {variantGen?.isDone && (
            <button
              className="mg-regen-btn"
              onClick={() => variantGen.setShowPicker(true)}
              style={{ borderColor: "var(--green)", color: "var(--green)" }}
              title="Review and pick from 3 generated variants"
            >
              Review {variantGen.variants.length} Variants
            </button>
          )}
          {variantGen?.job?.status === "error" && (
            <span className="mg-gen-status mg-gen-status--error">
              Generation failed
            </span>
          )}
        </span>
      )}
      {headline && (
        editorial ? (
          <EditableText value={headline} onSave={editorial.onEditHeadline} tag="h1" className="mg-header-title" />
        ) : (
          <h1 className="mg-header-title">{headline}</h1>
        )
      )}
      {stats && (
        <div className="mg-header-stats">
          {stats.totalGames != null && (
            <div className="mg-header-stat">
              <span className="mg-header-stat-value">{stats.totalGames.toLocaleString()}</span>
              <span className="mg-header-stat-label">Games</span>
            </div>
          )}
          {stats.uniquePlayers != null && (
            <div className="mg-header-stat">
              <span className="mg-header-stat-value">{stats.uniquePlayers}</span>
              <span className="mg-header-stat-label">Players</span>
            </div>
          )}
        </div>
      )}
      <div className="mg-header-image">
        <img src={coverBg} alt="" className="mg-header-img" />
      </div>
    </header>
  );
};

/** Big lead story — headline + attributed pull quotes */
const FeatureStory = ({ lead, quotes, nameToTag, editorial }) => {
  if (!lead) return null;

  // Only show quotes from speakers mentioned in the lead, cap at 3
  const leadLower = lead.toLowerCase();
  const attributed = quotes.filter((q) => {
    const m = q.match(/^(\w[\w\d!ǃ]*?):\s+/);
    return m && leadLower.includes(m[1].toLowerCase());
  }).slice(0, 3);

  return (
    <section className="mg-feature reveal" style={{ "--delay": "0.10s" }}>
      <div className="mg-feature-body">
        <span className="mg-section-label mg-section-label--red">Top Story</span>
        {editorial ? (
          <EditableText value={lead} onSave={(t) => editorial.onEditLead(t)} tag="p" className="mg-feature-lead" />
        ) : (
          <p className="mg-feature-lead">{highlightNames(lead, nameToTag)}</p>
        )}
        {attributed.length > 0 && (
          <div className="mg-quotes">
            {groupQuotesBySpeaker(attributed).map((group, i) => (
              <div key={i} className="mg-quote-group">
                {group.name && <span className="mg-quote-name">{group.name}</span>}
                {group.messages.map((msg, j) => (
                  <blockquote key={j} className="mg-quote">{msg}</blockquote>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

/** Parse ban text into structured { name, duration, reason, matchId } */
const parseBanItem = (text) => {
  const m = text.trim().match(/^(\S+)\s+banned\s+(?:(\d+)\s+days?\s+)?for\s+(.+)$/i);
  if (!m) return null;
  let reason = m[3];
  let matchId = null;
  // Extract match ID patterns like "match 12345" or "(match 12345)" or "match ID 12345"
  const matchIdRe = /\(?match(?:\s+ID)?\s+(\d+)\)?/i;
  const mm = reason.match(matchIdRe);
  if (mm) {
    matchId = mm[1];
    reason = reason.replace(matchIdRe, "").replace(/\s{2,}/g, " ").trim();
    if (reason.endsWith(",") || reason.endsWith(";")) reason = reason.slice(0, -1).trim();
  }
  return { name: m[1], duration: m[2] ? `${m[2]}d` : "perm", reason, matchId };
};

/** Secondary stories grid — sub-drama + highlights + bans */
const StoriesGrid = ({ stories, highlights, bans, nameToTag, editorial }) => {
  const highlightItems = highlights ? highlights.split(/;\s*/).filter(Boolean) : [];
  const banRows = bans ? bans.split(/;\s*/).map(parseBanItem).filter(Boolean) : [];

  if (stories.length === 0 && highlightItems.length === 0 && banRows.length === 0) return null;

  return (
    <section className="mg-section mg-stories reveal" style={{ "--delay": "0.14s" }}>
      <div className="mg-stories-grid">
        {/* Left column: drama sub-stories */}
        {stories.length > 0 && (
          <div className="mg-stories-col">
            <div className="mg-section-header">
              <span className="mg-section-label">Also This Week</span>
              <div className="mg-section-rule" />
            </div>
            <ul className="mg-sidebar-list">
              {stories.map((text, i) => (
                <li key={i} className="mg-sidebar-item">
                  {editorial?.itemControls?.DRAMA?.(i, text)}
                  {highlightNames(text, nameToTag)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Right column: highlights + bans */}
        <div className="mg-stories-col">
          {highlightItems.length > 0 && (
            <div className="mg-stories-sidebar">
              <div className="mg-section-header">
                <span className="mg-section-label mg-section-label--green">Highlights</span>
                <div className="mg-section-rule" />
              </div>
              <ul className="mg-sidebar-list">
                {highlightItems.map((text, i) => (
                  <li key={i} className="mg-sidebar-item">
                    {editorial?.itemControls?.HIGHLIGHTS?.(i, text)}
                    {highlightNames(text.trim(), nameToTag)}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {banRows.length > 0 && (
            <div className="mg-stories-sidebar">
              <div className="mg-section-header">
                <span className="mg-section-label mg-section-label--red">Bans</span>
                <div className="mg-section-rule" />
              </div>
              <div className="mg-bans-table">
                {banRows.map((b, i) => (
                  <div key={i} className="mg-ban-row">
                    <div className="mg-ban-header">
                      <span className="mg-ban-name">{b.name}</span>
                      <span className="mg-ban-duration">{b.duration}</span>
                    </div>
                    <span className="mg-ban-reason">
                      {b.reason}
                      {b.matchId && (
                        <>
                          {" "}
                          <Link to={`/match/${b.matchId}`} className="mg-ban-match-link">Match</Link>
                        </>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

/** Week in Review — standalone wrap-up section */
const RecapSection = ({ content, editorial }) => {
  if (!content) return null;
  return (
    <section className="mg-section mg-recap-wrap reveal" style={{ "--delay": "0.40s" }}>
      <div className="mg-section-header">
        <span className="mg-section-label">Week in Review</span>
        <div className="mg-section-rule" />
      </div>
      {editorial ? (
        <EditableText value={content} onSave={(t) => editorial.onEditRecap(t)} tag="p" className="mg-recap-text" />
      ) : (
        <p className="mg-recap-text">{content}</p>
      )}
    </section>
  );
};

/* ═══════════════════════════════════════════════════════
   ACT 2 — THE PLAYERS (features / spotlights)
   ═══════════════════════════════════════════════════════ */

const SpotlightCard = ({ stat, profile, accent, role, blurb, quotes }) => {
  if (!stat) return null;
  const formArr = stat.form ? stat.form.split("").map((c) => c === "W") : [];
  const sign = stat.mmrChange > 0 ? "+" : "";
  const hasPic = profile?.pic;

  return (
    <div className={`mg-spotlight-card mg-spotlight-card--${accent}`}>
      {hasPic && (
        <div className="mg-spotlight-bg" style={{ backgroundImage: `url(${profile.pic})` }} />
      )}
      <div className="mg-spotlight-overlay" />
      <div className="mg-spotlight-content">
        <span className={`mg-spotlight-role mg-spotlight-role--${accent}`}>{role}</span>
        <div className="mg-spotlight-player">
          {!hasPic && stat.race && RACE_ICONS[stat.race] && (
            <img src={RACE_ICONS[stat.race]} alt={stat.race} className="mg-spotlight-race-fallback" />
          )}
          <Link to={`/player/${encodeURIComponent(stat.battleTag)}`} className="mg-spotlight-name">
            {stat.name}
          </Link>
          {profile?.country && <CountryFlag name={profile.country.toLowerCase()} />}
        </div>
        {stat.race && RACE_ICONS[stat.race] && hasPic && (
          <img src={RACE_ICONS[stat.race]} alt={stat.race} className="mg-spotlight-race-icon" />
        )}
        <div className="mg-spotlight-stats">
          {stat.mmrChange != null ? (
            <span className={`mg-spotlight-mmr ${stat.mmrChange >= 0 ? "mg-text-green" : "mg-text-red"}`}>
              {sign}{stat.mmrChange} MMR
            </span>
          ) : stat.headline && (
            <span className={`mg-spotlight-mmr mg-text-${accent}`}>{stat.headline}</span>
          )}
        </div>
        {formArr.length > 0 && <FormDots form={formArr} size="small" maxDots={20} showSummary={false} />}
        {blurb && (
          <p className="mg-spotlight-blurb">{typeof blurb === "string" ? blurb : blurb.join(" ")}</p>
        )}
        {quotes && quotes.length > 0 && (
          <div className="mg-spotlight-quotes">
            {groupQuotesBySpeaker(quotes).map((group, i) => (
              <div key={i} className="mg-quote-group">
                {group.name && <span className="mg-quote-name">{group.name}</span>}
                {group.messages.map((msg, j) => (
                  <blockquote key={j} className="mg-quote">{msg}</blockquote>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const SpotlightsSection = ({ sections, profiles }) => {
  const cards = [
    { key: "WINNER", role: "Winner", accent: "green" },
    { key: "LOSER", role: "Loser", accent: "red" },
    { key: "GRINDER", role: "Grinder", accent: "gold" },
    { key: "HOTSTREAK", role: "Hot Streak", accent: "green" },
    { key: "COLDSTREAK", role: "Cold Streak", accent: "red" },
  ];
  const parsed = cards.map(({ key, role, accent }) => {
    const sec = sections.find((s) => s.key === key);
    const stat = sec ? parseStatLine(sec.content) : null;
    if (!stat) return null;
    // Server-generated blurb + chat quotes (preferred)
    const extras = getSpotlightExtras(key, sections);
    const blurb = extras.blurb || null;
    const quotes = extras.quotes.length > 0 ? extras.quotes : [];
    return { stat, role, accent, blurb, quotes };
  }).filter(Boolean);

  if (parsed.length === 0) return null;

  return (
    <section className="mg-section mg-spotlights reveal" style={{ "--delay": "0.20s" }}>
      <div className="mg-section-header">
        <span className="mg-section-label">Player Spotlights</span>
        <div className="mg-section-rule" />
      </div>
      <div className="mg-spotlight-grid">
        {parsed.map(({ stat, role, accent, blurb, quotes }) => (
          <SpotlightCard key={stat.battleTag} stat={stat} profile={profiles.get(stat.battleTag)} accent={accent} role={role} blurb={blurb} quotes={quotes} />
        ))}
      </div>
    </section>
  );
};

const UpsetsSection = ({ content, profiles }) => {
  const upsets = parseUpsets(content).filter((u) =>
    u.underdogMmrs.every((m) => m > 0) && u.favoriteMmrs.every((m) => m > 0)
  );
  if (upsets.length === 0) return null;

  const biggest = upsets.reduce((a, b) => (b.mmrGap > a.mmrGap ? b : a), upsets[0]);
  const u = biggest;
  const mapClean = u.map.replace(/ /g, "").replace(/'/g, "");

  return (
    <section className="mg-section reveal" style={{ "--delay": "0.24s" }}>
      <div className="mg-section-header">
        <span className="mg-section-label mg-section-label--green">Upset of the Week</span>
        <div className="mg-section-rule" />
      </div>
      <div className="mg-upset-card">
        <div className="mg-upset-map-bg" style={{ backgroundImage: `url(/maps/${mapClean}.png)` }} />
        <div className="mg-upset-overlay" />
        <div className="mg-upset-content">
          <div className="mg-upset-badge">
            <span className="mg-upset-gap">{u.mmrGap}</span>
            <span className="mg-upset-gap-label">MMR gap</span>
          </div>
          <div className="mg-upset-teams">
            <div className="mg-upset-team mg-upset-team--underdogs">
              <span className="mg-upset-team-label mg-text-green">Underdogs</span>
              <span className="mg-upset-team-avg">{u.underdogAvg} avg</span>
              {u.underdogTags.map((tag, j) => {
                const profile = profiles.get(tag);
                const name = tag.split("#")[0];
                return (
                  <div key={tag} className="mg-upset-player">
                    {profile?.pic && <img src={profile.pic} alt="" className="mg-upset-avatar" />}
                    <Link to={`/player/${encodeURIComponent(tag)}`} className="mg-upset-name">{name}</Link>
                    {profile?.country && <CountryFlag name={profile.country.toLowerCase()} style={{ width: 12, height: 9 }} />}
                    <span className="mg-upset-mmr">{u.underdogMmrs[j] || ""}</span>
                  </div>
                );
              })}
            </div>
            <div className="mg-upset-vs">VS</div>
            <div className="mg-upset-team mg-upset-team--favorites">
              <span className="mg-upset-team-label mg-text-red">Favorites</span>
              <span className="mg-upset-team-avg">{u.favoriteAvg} avg</span>
              {u.favoriteTags.map((tag, j) => {
                const profile = profiles.get(tag);
                const name = tag.split("#")[0];
                return (
                  <div key={tag} className="mg-upset-player">
                    {profile?.pic && <img src={profile.pic} alt="" className="mg-upset-avatar" />}
                    <Link to={`/player/${encodeURIComponent(tag)}`} className="mg-upset-name">{name}</Link>
                    {profile?.country && <CountryFlag name={profile.country.toLowerCase()} style={{ width: 12, height: 9 }} />}
                    <span className="mg-upset-mmr">{u.favoriteMmrs[j] || ""}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mg-upset-footer">
            <span className="mg-upset-map-name">{u.map}</span>
            <Link to={`/match/${u.matchId}`} className="mg-upset-match-link">View Match</Link>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ═══════════════════════════════════════════════════════
   ACT 3 — THE NUMBERS (stats / data)
   ═══════════════════════════════════════════════════════ */

const RankingsSection = ({ content, profiles }) => {
  const all = parsePowerRankings(content);
  if (all.length === 0) return null;

  const sorted = [...all].sort((a, b) => b.mmrChange - a.mmrChange);
  const top5 = sorted.slice(0, 5);
  const bot5 = sorted.slice(-5).reverse();
  const seen = new Set(top5.map((r) => r.battleTag));
  const combined = [...top5, ...bot5.filter((r) => !seen.has(r.battleTag))];
  const maxAbs = Math.max(...combined.map((r) => Math.abs(r.mmrChange)), 1);

  const renderRow = (r) => {
    const profile = profiles.get(r.battleTag);
    const sign = r.mmrChange > 0 ? "+" : "";
    const pct = Math.abs(r.mmrChange) / maxAbs * 100;
    const isPositive = r.mmrChange >= 0;

    const avatar = profile?.pic ? (
      <img src={profile.pic} alt="" className="mg-rank-avatar" />
    ) : (
      <div className="mg-rank-avatar-ph">
        {r.race && RACE_ICONS[r.race] ? (
          <img src={RACE_ICONS[r.race]} alt="" className="mg-rank-race-icon" />
        ) : (
          <span>{r.name.charAt(0)}</span>
        )}
      </div>
    );

    return (
      <div key={r.battleTag} className="mg-rank-row">
        {/* Left side: negative bar + label (or empty) */}
        <div className="mg-rank-left">
          {!isPositive && (
            <>
              <span className="mg-rank-mmr mg-text-red">{sign}{r.mmrChange}</span>
              <div className="mg-rank-bar mg-rank-bar--red" style={{ width: `${pct}%` }} />
            </>
          )}
        </div>

        {/* Center: avatar + name */}
        <div className="mg-rank-center">
          {avatar}
          <Link to={`/player/${encodeURIComponent(r.battleTag)}`} className="mg-rank-name">
            {r.name}
          </Link>
          {profile?.country && <CountryFlag name={profile.country.toLowerCase()} />}
        </div>

        {/* Right side: positive bar + label (or empty) */}
        <div className="mg-rank-right">
          {isPositive && (
            <>
              <div className="mg-rank-bar mg-rank-bar--green" style={{ width: `${pct}%` }} />
              <span className="mg-rank-mmr mg-text-green">{sign}{r.mmrChange}</span>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <section className="mg-section mg-rankings reveal" style={{ "--delay": "0.30s" }}>
      <div className="mg-section-header">
        <span className="mg-section-label">Power Rankings</span>
        <div className="mg-section-rule" />
      </div>
      <div className="mg-rank-diverge">
        {combined.map(renderRow)}
      </div>
    </section>
  );
};

const MatchStatsSection = ({ content, profiles }) => {
  const matchStats = content ? parseMatchStats(content) : [];
  if (matchStats.length === 0) return null;

  return (
    <section className="mg-section mg-awards reveal" style={{ "--delay": "0.32s" }}>
      <div className="mg-section-header">
        <span className="mg-section-label mg-section-label--gold">Match Stats</span>
        <div className="mg-section-rule" />
      </div>
      <div className="mg-awards-grid">
        {matchStats.map((s) => {
          const profile = profiles.get(s.battleTag);
          return (
            <div key={s.category} className="mg-award-card">
              <span className="mg-award-icon">{MATCH_STAT_ICONS[s.category] || "\uD83C\uDFC5"}</span>
              <span className="mg-award-category">{s.category}</span>
              <div className="mg-award-player">
                {profile?.pic && (
                  <img src={profile.pic} alt="" className="mg-award-pic" />
                )}
                <Link to={`/player/${encodeURIComponent(s.battleTag)}`} className="mg-award-name">
                  {s.name}
                </Link>
              </div>
              <span className="mg-award-detail">{s.detail}</span>
              {s.combo && (
                <span className="mg-award-combo">{s.combo}</span>
              )}
              {s.runnersUp.length > 0 && (
                <span className="mg-award-runners">{s.runnersUp.join(", ")}</span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};


const HeroesSection = ({ content, profiles }) => {
  const heroStats = content ? parseMatchStats(content) : [];
  if (heroStats.length === 0) return null;

  return (
    <section className="mg-section mg-awards reveal" style={{ "--delay": "0.33s" }}>
      <div className="mg-section-header">
        <span className="mg-section-label mg-section-label--gold">Heroes of the Week</span>
        <div className="mg-section-rule" />
      </div>
      <div className="mg-awards-grid">
        {heroStats.map((s) => {
          const profile = profiles.get(s.battleTag);
          return (
            <div key={s.category} className="mg-award-card">
              <span className="mg-award-icon">{MATCH_STAT_ICONS[s.category] || "\uD83C\uDFC5"}</span>
              <span className="mg-award-category">{s.category}</span>
              <div className="mg-award-player">
                {profile?.pic && (
                  <img src={profile.pic} alt="" className="mg-award-pic" />
                )}
                <Link to={`/player/${encodeURIComponent(s.battleTag)}`} className="mg-award-name">
                  {s.name}
                </Link>
              </div>
              <span className="mg-award-detail">{s.detail}</span>
              {s.runnersUp.length > 0 && (
                <span className="mg-award-runners">{s.runnersUp.join(", ")}</span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

const CompactStats = ({ newBloodContent, atContent, profiles }) => {
  const players = newBloodContent ? parseNewBlood(newBloodContent) : [];
  const stacks = atContent ? parseATSpotlight(atContent) : [];

  if (players.length === 0 && stacks.length === 0) return null;

  return (
    <section className="mg-section reveal" style={{ "--delay": "0.36s" }}>
      <div className="mg-compact-grid">
        {players.length > 0 && (
          <div className="mg-compact-block">
            <div className="mg-section-header">
              <span className="mg-section-label mg-section-label--gold">New Blood</span>
              <div className="mg-section-rule" />
            </div>
            <div className="mg-newblood-list">
              {players.map((p) => {
                const profile = profiles.get(p.battleTag);
                return (
                  <div key={p.battleTag} className="mg-newblood-row">
                    <div className="mg-newblood-player">
                      {profile?.pic ? (
                        <img src={profile.pic} alt="" className="mg-newblood-avatar" />
                      ) : (
                        <div className="mg-newblood-avatar-placeholder">
                          <span>{p.name.charAt(0)}</span>
                        </div>
                      )}
                      <Link to={`/player/${encodeURIComponent(p.battleTag)}`} className="mg-newblood-name">
                        {p.name}
                      </Link>
                      {p.returning && (
                        <span className="mg-newblood-badge--returning">Returning</span>
                      )}
                    </div>
                    <span className="mg-newblood-mmr">{p.mmr}</span>
                    <span className="mg-newblood-games">{p.games}g</span>
                    <span className={`mg-newblood-wr ${p.winPct >= 50 ? "mg-text-green" : "mg-text-red"}`}>
                      {p.winPct}%
                    </span>
                    {p.firstDate && (
                      <span className="mg-newblood-first">since {new Date(p.firstDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {stacks.length > 0 && (
          <div className="mg-compact-block">
            <div className="mg-section-header">
              <span className="mg-section-label">Team Stacks</span>
              <div className="mg-section-rule" />
            </div>
            <div className="mg-stacks-list">
              {stacks.map((s, i) => (
                <div key={i} className="mg-stack-row">
                  <div className="mg-stack-players">
                    {s.players.map((name, j) => (
                      <span key={j} className="mg-stack-player-name">
                        {name}{j < s.players.length - 1 ? " + " : ""}
                      </span>
                    ))}
                    <span className="mg-stack-size">{s.stackSize}-stack</span>
                  </div>
                  <span className="mg-stack-record">{s.wins}W-{s.losses}L</span>
                  <span className={`mg-stack-wr ${s.winPct >= 60 ? "mg-text-green" : s.winPct < 50 ? "mg-text-red" : ""}`}>
                    {s.winPct}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

const ClipsSection = ({ clips }) => {
  if (!clips || clips.length === 0) return null;
  const featured = clips[0];
  const rest = clips.slice(1);

  return (
    <section className="mg-section mg-clips reveal" style={{ "--delay": "0.38s" }}>
      <div className="mg-section-header">
        <span className="mg-section-label">Clips</span>
        <div className="mg-section-rule" />
      </div>
      <a href={featured.url} target="_blank" rel="noopener noreferrer" className="mg-clip-featured">
        <div className="mg-clip-thumb-wrap mg-clip-thumb-wrap--featured">
          <img src={featured.thumbnail_url} alt="" className="mg-clip-thumb" />
          <div className="mg-clip-play">&#9654;</div>
          <span className="mg-clip-duration">{Math.round(featured.duration)}s</span>
        </div>
        <div className="mg-clip-info">
          <span className="mg-clip-title">{featured.title}</span>
          <span className="mg-clip-meta">{featured.twitch_login} · {featured.view_count?.toLocaleString()} views</span>
        </div>
      </a>
      {rest.length > 0 && (
        <div className="mg-clips-grid">
          {rest.map((clip) => (
            <a key={clip.clip_id} href={clip.url} target="_blank" rel="noopener noreferrer" className="mg-clip-card">
              <div className="mg-clip-thumb-wrap">
                <img src={clip.thumbnail_url} alt="" className="mg-clip-thumb" />
                <div className="mg-clip-play mg-clip-play--small">&#9654;</div>
                <span className="mg-clip-duration">{Math.round(clip.duration)}s</span>
              </div>
              <div className="mg-clip-info">
                <span className="mg-clip-title">{clip.title}</span>
                <span className="mg-clip-meta">{clip.twitch_login} · {clip.view_count?.toLocaleString()} views</span>
              </div>
            </a>
          ))}
        </div>
      )}
    </section>
  );
};

/* ═══════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════ */

const WeeklyMagazine = ({ weekParam, isAdmin = false, apiKey = "" }) => {
  const [weeklyDigests, setWeeklyDigests] = useState([]);
  const [weeklyIdx, setWeeklyIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState(new Map());

  useEffect(() => {
    fetch(`${RELAY_URL}/api/admin/weekly-digests`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        setWeeklyDigests(data);
        // If weekParam provided, find and select that week
        if (weekParam && data.length > 0) {
          const idx = data.findIndex((w) => w.week_start === weekParam);
          if (idx >= 0) setWeeklyIdx(idx);
        }
        setLoading(false);
      })
      .catch((err) => { console.error("Magazine fetch failed:", err); setLoading(false); });
  }, [weekParam]);

  const weekly = weeklyDigests[weeklyIdx] || null;

  // Editorial hook
  const handleDigestUpdated = useCallback((newDigest) => {
    setWeeklyDigests((prev) =>
      prev.map((w, i) => (i === weeklyIdx ? { ...w, digest: newDigest } : w))
    );
  }, [weeklyIdx]);

  const ed = useWeeklyEditorial({
    weekly,
    isAdmin,
    apiKey,
    onDigestUpdated: handleDigestUpdated,
  });

  // Variant generation hook
  const variantGen = useVariantGen({
    weekStart: weekly?.week_start,
    apiKey,
    isAdmin,
  });

  // Apply variant picks → update digest + re-init editorial
  const handleApplyVariants = useCallback(async () => {
    const newDraft = await variantGen.applyPicks();
    if (newDraft) {
      // Re-fetch the weekly digest list to pick up the new draft
      try {
        const res = await fetch(`${RELAY_URL}/api/admin/weekly-digests`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setWeeklyDigests(data);
        }
      } catch {}
    }
  }, [variantGen.applyPicks, weeklyIdx]);

  // Regenerate digest (delete cache + re-fetch)
  const [regenerating, setRegenerating] = useState(false);
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);
  const doRegenerate = useCallback(async () => {
    if (!weekly?.week_start || !apiKey) return;
    setShowRegenConfirm(false);
    setRegenerating(true);
    try {
      await fetch(`${RELAY_URL}/api/admin/weekly-digest/${weekly.week_start}`, {
        method: "DELETE",
        headers: { "X-API-Key": apiKey },
      });
      const res = await fetch(`${RELAY_URL}/api/admin/weekly-digest/${weekly.week_start}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.digest) {
          setWeeklyDigests((prev) =>
            prev.map((w, i) => (i === weeklyIdx ? { ...w, digest: data.digest } : w))
          );
        }
      }
    } catch (err) {
      console.warn("[Magazine] Regenerate failed:", err.message);
    }
    setRegenerating(false);
  }, [weekly, apiKey, weeklyIdx]);

  const sections = useMemo(() => {
    if (!weekly?.digest) return [];
    return parseDigestSections(weekly.digest);
  }, [weekly]);

  // Build name→battleTag map from all structured sections + quote speakers
  const knownNames = useMemo(() => {
    const names = new Map();
    for (const s of sections) {
      if (["WINNER", "LOSER", "GRINDER", "HOTSTREAK", "COLDSTREAK"].includes(s.key)) {
        const stat = parseStatLine(s.content);
        if (stat) names.set(stat.name, stat.battleTag);
      }
      if (s.key === "POWER_RANKINGS") {
        for (const r of parsePowerRankings(s.content)) names.set(r.name, r.battleTag);
      }
      if (s.key === "NEW_BLOOD") {
        for (const p of parseNewBlood(s.content)) names.set(p.name, p.battleTag);
      }
      if (s.key === "MATCH_STATS" || s.key === "HEROES") {
        for (const ms of parseMatchStats(s.content)) names.set(ms.name, ms.battleTag);
      }
      if (s.key === "UPSET") {
        for (const u of parseUpsets(s.content)) {
          u.underdogTags.forEach((t) => names.set(t.split("#")[0], t));
          u.favoriteTags.forEach((t) => names.set(t.split("#")[0], t));
        }
      }
      // Extract speaker names from drama quotes
      if (s.key === "DRAMA") {
        const { quotes } = splitQuotes(s.content);
        for (const q of quotes) {
          const m = q.match(/^(\w[\w\d!ǃ]*?):\s+/);
          if (m && m[1].length >= 2) names.set(m[1], m[1]);
        }
      }
    }
    const mentionMap = parseMentions(sections);
    for (const [name, tag] of mentionMap) names.set(name, tag);
    return names;
  }, [sections]);

  useEffect(() => {
    if (!weekly?.digest) return;
    const allSections = parseDigestSections(weekly.digest);
    const mentions = parseMentions(allSections);
    const tags = new Set();

    for (const s of allSections) {
      if (["WINNER", "LOSER", "GRINDER", "HOTSTREAK", "COLDSTREAK"].includes(s.key)) {
        const stat = parseStatLine(s.content);
        if (stat) tags.add(stat.battleTag);
      }
      if (s.key === "POWER_RANKINGS") {
        for (const r of parsePowerRankings(s.content)) tags.add(r.battleTag);
      }
      if (s.key === "UPSET") {
        for (const u of parseUpsets(s.content)) {
          u.underdogTags.forEach((t) => tags.add(t));
          u.favoriteTags.forEach((t) => tags.add(t));
        }
      }
      if (s.key === "NEW_BLOOD") {
        for (const p of parseNewBlood(s.content)) tags.add(p.battleTag);
      }
      if (s.key === "MATCH_STATS" || s.key === "HEROES") {
        for (const ms of parseMatchStats(s.content)) tags.add(ms.battleTag);
      }
    }

    for (const s of allSections) {
      for (const tag of extractMentionedTags(s.content, mentions)) tags.add(tag);
    }

    if (tags.size === 0) return;

    Promise.all([...tags].map((tag) => fetchAndCacheProfile(tag).then((p) => [tag, p]))).then(
      (results) => {
        const map = new Map();
        for (const [tag, p] of results) {
          if (p) map.set(tag, p);
        }
        setProfiles(map);
      }
    );
  }, [weekly]);

  const [coverBg, setCoverBg] = useState(COVER_BACKGROUNDS[0]);

  useEffect(() => {
    if (!weekly) return;
    const fallback = COVER_BACKGROUNDS[hashDate(weekly.week_start) % COVER_BACKGROUNDS.length];
    const coverUrl = `${RELAY_URL}/api/admin/weekly-digest/${weekly.week_start}/cover.jpg`;
    const img = new Image();
    img.onload = () => setCoverBg(coverUrl);
    img.onerror = () => setCoverBg(fallback);
    img.src = coverUrl;
  }, [weekly]);

  const find = (key) => sections.find((s) => s.key === key);

  if (loading) {
    return (
      <div className="mg-page">
        <div className="page-loader fade-in"><PeonLoader /></div>
      </div>
    );
  }

  if (!weekly) {
    return (
      <div className="mg-page">
        <div className="mg-empty">
          <h2>No weekly digests available yet.</h2>
          <p>Check back after the first weekly roundup is published.</p>
        </div>
      </div>
    );
  }

  const dramaSection = find("DRAMA");
  const recapSection = find("RECAP");
  const rankingsSection = find("POWER_RANKINGS");
  const highlightsSection = find("HIGHLIGHTS");
  const bansSection = find("BANS");
  const upsetSection = find("UPSET");
  const matchStatsSection = find("MATCH_STATS");
  const heroesSection = find("HEROES");
  const newBloodSection = find("NEW_BLOOD");
  const atSection = find("AT_SPOTLIGHT");
  // Parse drama into lead headline + sub-stories
  const dramaQuotes = dramaSection ? splitQuotes(dramaSection.content).quotes : [];
  const dramaCleaned = dramaSection ? cleanSummary(splitQuotes(dramaSection.content).summary) : "";
  const dramaItems = dramaCleaned ? dramaCleaned.split(/;\s*/).filter(Boolean).map((s) => s.trim()) : [];
  // Lead item may have "Title | narrative body" format
  const rawLead = dramaItems[0] || "";
  const pipeSplit = rawLead.split(/\s*\|\s*/);
  const dramaTitle = pipeSplit.length > 1 ? pipeSplit[0] : "";
  const dramaLead = pipeSplit.length > 1 ? pipeSplit.slice(1).join(" | ") : rawLead;
  const dramaSubStories = dramaItems.slice(1);

  // Editorial callbacks for CoverHero — editing headline edits first drama item title
  const editorialProps = ed.isEditorial ? {
    onEditHeadline: (text) => {
      if (dramaTitle) {
        ed.handleEditSummary("DRAMA", 0, `${text} | ${dramaLead}`);
      } else {
        ed.handleEditSummary("DRAMA", 0, text);
      }
    },
    onEditLead: (text) => {
      if (dramaTitle) {
        ed.handleEditSummary("DRAMA", 0, `${dramaTitle} | ${text}`);
      } else {
        ed.handleEditSummary("DRAMA", 0, text);
      }
    },
    onEditRecap: (text) => ed.handleEditSection("RECAP", text),
  } : null;

  // Build item controls helper for StoriesGrid
  const storyItemControls = ed.isEditorial ? {
    DRAMA: (subIdx) => {
      const draftIdx = subIdx + 1;
      const sel = ed.sectionSelections.DRAMA || new Set();
      return (
        <ItemControls
          idx={subIdx}
          total={dramaSubStories.length}
          selected={sel.has(draftIdx)}
          onToggle={() => ed.toggleItem("DRAMA", draftIdx)}
          onMoveUp={() => ed.handleReorderItem("DRAMA", draftIdx, draftIdx - 1)}
          onMoveDown={() => ed.handleReorderItem("DRAMA", draftIdx, draftIdx + 1)}
        />
      );
    },
    HIGHLIGHTS: (idx) => {
      const sel = ed.sectionSelections.HIGHLIGHTS || new Set();
      const hlItems = highlightsSection?.content.split(/;\s*/).filter(Boolean) || [];
      return (
        <ItemControls
          idx={idx}
          total={hlItems.length}
          selected={sel.has(idx)}
          onToggle={() => ed.toggleItem("HIGHLIGHTS", idx)}
          onMoveUp={() => ed.handleReorderItem("HIGHLIGHTS", idx, idx - 1)}
          onMoveDown={() => ed.handleReorderItem("HIGHLIGHTS", idx, idx + 1)}
        />
      );
    },
  } : null;

  return (
    <div className={`mg-page ${ed.isEditorial ? "mg-page--editorial" : ""}`}>
      {/* Side navigation arrows */}
      {weeklyDigests.length > 1 && (
        <div className="mg-side-nav">
          <button
            className="mg-side-btn mg-side-btn--left"
            onClick={() => setWeeklyIdx((i) => Math.min(i + 1, weeklyDigests.length - 1))}
            disabled={weeklyIdx >= weeklyDigests.length - 1}
            title="Older"
          >
            &#8249;
          </button>
          <button
            className="mg-side-btn mg-side-btn--right"
            onClick={() => setWeeklyIdx((i) => Math.max(i - 1, 0))}
            disabled={weeklyIdx <= 0}
            title="Newer"
          >
            &#8250;
          </button>
        </div>
      )}

      {/* Editorial controls panel */}
      {ed.isEditorial && ed.editableItemSections.length > 0 && (
        <div className="mg-editorial-panel reveal" style={{ "--delay": "0.08s" }}>
          <div className="mg-section-header" style={{ maxWidth: 900, margin: "0 auto", padding: "0 var(--space-6)" }}>
            <span className="mg-section-label mg-section-label--gold">Editorial Controls</span>
            <div className="mg-section-rule" />
          </div>
          <div className="mg-editorial-grid">
            {ed.editableItemSections.map(({ key, label, items }) => (
              <div key={key} className="mg-editorial-block">
                <span className="mg-editorial-block-label">{label}</span>
                {items.map((item, i) => {
                  const sel = ed.sectionSelections[key] || new Set();
                  const summaryText = item.replace(/"[^"]+"/g, "").replace(/\s{2,}/g, " ").trim();
                  const short = summaryText.length > 60 ? summaryText.slice(0, 57) + "..." : summaryText;
                  return (
                    <div key={i} className={`mg-editorial-item ${sel.has(i) ? "" : "mg-editorial-item--off"}`}>
                      <ItemControls
                        idx={i}
                        total={items.length}
                        selected={sel.has(i)}
                        onToggle={() => ed.toggleItem(key, i)}
                        onMoveUp={() => ed.handleReorderItem(key, i, i - 1)}
                        onMoveDown={() => ed.handleReorderItem(key, i, i + 1)}
                      />
                      {ed.editingItem === `${key}-${i}` ? (
                        <input
                          type="text"
                          className="mg-editorial-inline-input"
                          defaultValue={summaryText}
                          autoFocus
                          onBlur={(e) => ed.handleEditSummary(key, i, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") ed.handleEditSummary(key, i, e.target.value);
                            if (e.key === "Escape") ed.setEditingItem(null);
                          }}
                        />
                      ) : (
                        <span
                          className="mg-editorial-item-text"
                          onClick={() => ed.setEditingItem(`${key}-${i}`)}
                          title="Click to edit"
                        >
                          {short}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Section toggles */}
            <div className="mg-editorial-block">
              <span className="mg-editorial-block-label">Sections</span>
              {TOGGLEABLE_SECTIONS.map(({ key, label }) => (
                <label key={key} className="mg-editorial-toggle-label">
                  <input
                    type="checkbox"
                    checked={!ed.hiddenSections.has(key)}
                    onChange={() => ed.toggleSection(key)}
                  />
                  {label}
                </label>
              ))}
            </div>

            {/* Stat line toggles */}
            <div className="mg-editorial-block">
              <span className="mg-editorial-block-label">Stats</span>
              {STAT_LINES.map(({ key, label }) => (
                <StatToggle
                  key={key}
                  label={label}
                  statKey={key}
                  hidden={ed.hiddenStats.has(key)}
                  onToggle={ed.toggleStat}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ACT 1 — THE STORIES */}
      <CoverHero weekly={weekly} coverBg={coverBg} headline={dramaTitle || dramaLead} editorial={editorialProps} onRegenerate={() => setShowRegenConfirm(true)} regenerating={regenerating} variantGen={ed.isEditorial ? variantGen : null} />

      {dramaLead && (
        <FeatureStory
          lead={dramaLead}
          quotes={dramaQuotes}
          nameToTag={knownNames}
          editorial={editorialProps}
        />
      )}

      <StoriesGrid
        stories={dramaSubStories}
        highlights={highlightsSection?.content}
        bans={bansSection?.content}
        nameToTag={knownNames}
        editorial={ed.isEditorial ? { itemControls: storyItemControls } : null}
      />

      {/* Player features */}
      {(!ed.isEditorial || !["WINNER", "LOSER", "GRINDER", "HOTSTREAK", "COLDSTREAK"].every((k) => ed.hiddenStats.has(k))) && (
        <SpotlightsSection sections={sections} profiles={profiles} />
      )}
      {upsetSection && (!ed.isEditorial || !ed.hiddenSections.has("UPSET")) && (
        <UpsetsSection content={upsetSection.content} profiles={profiles} />
      )}
      {heroesSection && (!ed.isEditorial || !ed.hiddenSections.has("HEROES")) && (
        <HeroesSection content={heroesSection.content} profiles={profiles} />
      )}

      {/* Stats & data */}
      {rankingsSection && (!ed.isEditorial || !ed.hiddenSections.has("POWER_RANKINGS")) && (
        <RankingsSection content={rankingsSection.content} profiles={profiles} />
      )}
      {matchStatsSection && (!ed.isEditorial || !ed.hiddenSections.has("MATCH_STATS")) && (
        <MatchStatsSection content={matchStatsSection.content} profiles={profiles} />
      )}
      <CompactStats
        newBloodContent={(!ed.isEditorial || !ed.hiddenSections.has("NEW_BLOOD")) ? newBloodSection?.content : null}
        atContent={(!ed.isEditorial || !ed.hiddenSections.has("AT_SPOTLIGHT")) ? atSection?.content : null}
        profiles={profiles}
      />

      {/* Wrap-up */}
      <RecapSection
        content={recapSection?.content}
        editorial={editorialProps}
      />
      <ClipsSection clips={weekly.clips} />

      {/* Save status bar */}
      {ed.isEditorial && <SaveStatus state={ed.publishState} />}

      {/* Regenerate confirmation modal */}
      <ConfirmModal
        open={showRegenConfirm}
        title="Regenerate Digest"
        message={`This will delete the cached digest for ${weekly ? formatWeekRange(weekly.week_start, weekly.week_end) : ""} and regenerate it from scratch. All editorial edits will be lost.`}
        confirmLabel="Regenerate"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={doRegenerate}
        onCancel={() => setShowRegenConfirm(false)}
      />

      {/* Variant picker overlay */}
      {variantGen.showPicker && variantGen.variants.length > 0 && (
        <VariantPicker
          variants={variantGen.variants}
          picks={variantGen.picks}
          onPick={variantGen.pickSection}
          onApply={handleApplyVariants}
          onCancel={() => variantGen.setShowPicker(false)}
          applyError={variantGen.applyError}
        />
      )}
    </div>
  );
};

export default WeeklyMagazine;
