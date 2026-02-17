import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { fetchAndCacheProfile } from "../lib/profileCache";
import { CountryFlag } from "../components/ui";
import FormDots from "../components/FormDots";
import PeonLoader from "../components/PeonLoader";
import {
  parseDigestSections,
  parseMentions,
  parseStatLine,
  extractMentionedTags,
  splitQuotes,
  groupQuotesBySpeaker,
  parsePowerRankings,
  parseAwards,
  parseUpsets,
  parseATSpotlight,
  parseMatchStats,
  parseNewBlood,
} from "../lib/digestUtils";
import "../styles/pages/Magazine.css";

const RELAY_URL =
  import.meta.env.VITE_CHAT_RELAY_URL || "https://4v4gg-chat-relay.fly.dev";

const RACE_ICONS = {
  HU: "/icons/human.png",
  ORC: "/icons/orc.png",
  NE: "/icons/elf.png",
  UD: "/icons/undead.png",
};

const AWARD_ICONS = {
  MVP: "\uD83C\uDFC6",
  "Iron Man": "\uD83D\uDCAA",
  "Most Improved": "\uD83D\uDCC8",
  "Biggest Tilt": "\uD83D\uDCC9",
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

const COVER_BACKGROUNDS = [
  "/backgrounds/themes/frozen-throne-chronicle.jpg",
  "/backgrounds/themes/arena-reforged.jpg",
  "/backgrounds/themes/blackrock-firelands.jpg",
  "/backgrounds/themes/blight-undead-4k.jpg",
  "/backgrounds/themes/dalaran.jpg",
  "/backgrounds/themes/ashenvale.jpg",
  "/backgrounds/themes/lordaeron.jpg",
  "/backgrounds/themes/outland.jpg",
  "/backgrounds/themes/holy-light.jpg",
  "/backgrounds/themes/culling-clean.jpg",
  "/backgrounds/themes/frozen-throne-lichking.jpg",
  "/backgrounds/themes/arena-tyrande-illidan.jpg",
];

const hashDate = (dateStr) => {
  let h = 0;
  for (let i = 0; i < dateStr.length; i++) {
    h = (h * 31 + dateStr.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
};

const formatWeekRange = (weekStart, weekEnd) => {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const s = new Date(weekStart + "T12:00:00");
  const e = new Date(weekEnd + "T12:00:00");
  const sMonth = months[s.getMonth()];
  const eMonth = months[e.getMonth()];
  if (sMonth === eMonth) return `${sMonth} ${s.getDate()} \u2013 ${e.getDate()}, ${s.getFullYear()}`;
  return `${sMonth} ${s.getDate()} \u2013 ${eMonth} ${e.getDate()}, ${s.getFullYear()}`;
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
   ACT 1 — THE STORIES (editorial / narrative)
   ═══════════════════════════════════════════════════════ */

const CoverHero = ({ weekly, topics, coverBg }) => {
  const stats = weekly.stats;
  return (
    <section className="mg-cover" style={{ backgroundImage: `url(${coverBg})` }}>
      <div className="mg-cover-overlay" />
      <div className="mg-cover-content reveal" style={{ "--delay": "0.05s" }}>
        <span className="mg-eyebrow">The 4v4 Weekly</span>
        <h1 className="mg-cover-title">{formatWeekRange(weekly.week_start, weekly.week_end)}</h1>
        {topics.length > 0 && (
          <div className="mg-topic-pills">
            {topics.map((t, i) => (
              <span key={i} className="mg-topic-pill">{t}</span>
            ))}
          </div>
        )}
        {stats && (
          <div className="mg-cover-stats">
            {stats.totalGames != null && (
              <div className="mg-cover-stat">
                <span className="mg-cover-stat-value">{stats.totalGames.toLocaleString()}</span>
                <span className="mg-cover-stat-label">Games</span>
              </div>
            )}
            {stats.uniquePlayers != null && (
              <div className="mg-cover-stat">
                <span className="mg-cover-stat-value">{stats.uniquePlayers}</span>
                <span className="mg-cover-stat-label">Players</span>
              </div>
            )}
            {stats.averageMmr != null && (
              <div className="mg-cover-stat">
                <span className="mg-cover-stat-value">{Math.round(stats.averageMmr)}</span>
                <span className="mg-cover-stat-label">Avg MMR</span>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

/** Big lead story — ONE focused headline + attributed pull quotes */
const FeatureStory = ({ lead, quotes, coverBg, nameToTag }) => {
  if (!lead) return null;

  // Only show quotes from speakers mentioned in the lead, cap at 3
  const leadLower = lead.toLowerCase();
  const attributed = quotes.filter((q) => {
    const m = q.match(/^(\w[\w\d!ǃ]*?):\s+/);
    return m && leadLower.includes(m[1].toLowerCase());
  }).slice(0, 3);

  return (
    <section className="mg-feature reveal" style={{ "--delay": "0.10s" }}>
      <div className="mg-feature-image" style={{ backgroundImage: `url(${coverBg})` }}>
        <div className="mg-feature-image-overlay" />
      </div>
      <div className="mg-feature-body">
        <span className="mg-section-label mg-section-label--red">Top Story</span>
        <p className="mg-feature-lead">{highlightNames(lead, nameToTag)}</p>
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

/** Parse ban text into structured { name, duration, reason } */
const parseBanItem = (text) => {
  const m = text.trim().match(/^(\S+)\s+banned\s+(?:(\d+)\s+days?\s+)?for\s+(.+)$/i);
  if (!m) return null;
  return { name: m[1], duration: m[2] ? `${m[2]}d` : "perm", reason: m[3] };
};

/** Secondary stories grid — sub-drama + highlights + bans + recap */
const StoriesGrid = ({ stories, highlights, bans, recap, nameToTag }) => {
  const highlightItems = highlights ? highlights.split(/;\s*/).filter(Boolean) : [];
  const banRows = bans ? bans.split(/;\s*/).map(parseBanItem).filter(Boolean) : [];
  const allItems = [...stories.map((s) => ({ type: "story", text: s })), ...highlightItems.map((h) => ({ type: "highlight", text: h.trim() }))];

  if (allItems.length === 0 && banRows.length === 0 && !recap) return null;

  return (
    <section className="mg-section mg-stories reveal" style={{ "--delay": "0.14s" }}>
      <div className="mg-stories-grid">
        {/* Left column: stories + highlights as unified list */}
        {allItems.length > 0 && (
          <div className="mg-stories-col">
            <span className="mg-section-label">Also This Week</span>
            <ul className="mg-sidebar-list">
              {allItems.map((item, i) => (
                <li key={i} className="mg-sidebar-item">
                  {item.type === "story" ? highlightNames(item.text, nameToTag) : item.text}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Right column: structured bans + compact recap */}
        <div className="mg-stories-col">
          {banRows.length > 0 && (
            <div className="mg-stories-sidebar">
              <span className="mg-section-label mg-section-label--red">Bans</span>
              <div className="mg-bans-table">
                {banRows.map((b, i) => (
                  <div key={i} className="mg-ban-row">
                    <span className="mg-ban-name">{b.name}</span>
                    <span className="mg-ban-duration">{b.duration}</span>
                    <span className="mg-ban-reason">{b.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {recap && (
            <div className="mg-stories-sidebar">
              <span className="mg-section-label">Week in Review</span>
              <p className="mg-recap-text">{recap}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

/* ═══════════════════════════════════════════════════════
   ACT 2 — THE PLAYERS (features / spotlights)
   ═══════════════════════════════════════════════════════ */

const SpotlightCard = ({ stat, profile, accent }) => {
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
        <span className={`mg-spotlight-role mg-spotlight-role--${accent}`}>
          {accent === "green" ? "Winner" : accent === "red" ? "Loser" : "Grinder"}
        </span>
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
          ) : accent === "gold" && stat.headline && (
            <span className="mg-spotlight-mmr mg-text-gold">{stat.headline}</span>
          )}
          <span className="mg-spotlight-record">
            {stat.wins}W-{stat.losses}L
          </span>
        </div>
        {formArr.length > 0 && <FormDots form={formArr} size="small" maxDots={15} showSummary={false} />}
      </div>
    </div>
  );
};

const SpotlightsSection = ({ sections, profiles }) => {
  const winner = sections.find((s) => s.key === "WINNER");
  const loser = sections.find((s) => s.key === "LOSER");
  const grinder = sections.find((s) => s.key === "GRINDER");

  const winnerStat = winner ? parseStatLine(winner.content) : null;
  const loserStat = loser ? parseStatLine(loser.content) : null;
  const grinderStat = grinder ? parseStatLine(grinder.content) : null;

  if (!winnerStat && !loserStat && !grinderStat) return null;

  return (
    <section className="mg-section mg-spotlights reveal" style={{ "--delay": "0.20s" }}>
      <div className="mg-section-header">
        <span className="mg-section-label">Player Spotlights</span>
        <div className="mg-section-rule" />
      </div>
      <div className="mg-spotlight-grid">
        <SpotlightCard stat={winnerStat} profile={profiles.get(winnerStat?.battleTag)} accent="green" />
        <SpotlightCard stat={loserStat} profile={profiles.get(loserStat?.battleTag)} accent="red" />
        <SpotlightCard stat={grinderStat} profile={profiles.get(grinderStat?.battleTag)} accent="gold" />
      </div>
    </section>
  );
};

const StreaksSection = ({ sections, profiles }) => {
  const hot = sections.find((s) => s.key === "HOTSTREAK");
  const cold = sections.find((s) => s.key === "COLDSTREAK");
  const hotStat = hot ? parseStatLine(hot.content) : null;
  const coldStat = cold ? parseStatLine(cold.content) : null;

  if (!hotStat && !coldStat) return null;

  const renderStreak = (stat, type) => {
    if (!stat) return null;
    const profile = profiles.get(stat.battleTag);
    const formArr = stat.form ? stat.form.split("").map((c) => c === "W") : [];
    const streakMatch = stat.headline.match(/(\d+)[WL]\s*streak/i);
    const streakCount = streakMatch ? parseInt(streakMatch[1]) : null;
    const isHot = type === "hot";

    return (
      <div className={`mg-streak-card mg-streak-card--${isHot ? "hot" : "cold"}`}>
        <div className="mg-streak-header">
          <span className={`mg-streak-icon ${isHot ? "mg-text-green" : "mg-text-red"}`}>
            {isHot ? "\uD83D\uDD25" : "\u2744\uFE0F"}
          </span>
          <div className="mg-streak-title">
            <span className="mg-streak-label">{isHot ? "Hot Streak" : "Cold Streak"}</span>
            {streakCount && (
              <span className={`mg-streak-count ${isHot ? "mg-text-green" : "mg-text-red"}`}>
                {streakCount}{isHot ? "W" : "L"}
              </span>
            )}
          </div>
        </div>
        <div className="mg-streak-player">
          {profile?.pic && <img src={profile.pic} alt="" className="mg-streak-avatar" />}
          <div className="mg-streak-player-info">
            <Link to={`/player/${encodeURIComponent(stat.battleTag)}`} className="mg-streak-name">
              {stat.name}
            </Link>
            {stat.race && RACE_ICONS[stat.race] && (
              <img src={RACE_ICONS[stat.race]} alt={stat.race} className="mg-streak-race" />
            )}
            {profile?.country && <CountryFlag name={profile.country.toLowerCase()} />}
          </div>
          <span className="mg-streak-record">{stat.wins}W-{stat.losses}L</span>
        </div>
        {formArr.length > 0 && (
          <div className="mg-streak-form">
            <FormDots form={formArr} size="small" maxDots={30} showSummary={false} />
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="mg-section reveal" style={{ "--delay": "0.22s" }}>
      <div className="mg-section-header">
        <span className="mg-section-label">Streaks</span>
        <div className="mg-section-rule" />
      </div>
      <div className="mg-streaks-grid">
        {renderStreak(hotStat, "hot")}
        {renderStreak(coldStat, "cold")}
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
  const risers = sorted.filter((r) => r.mmrChange > 0);
  const fallers = sorted.filter((r) => r.mmrChange < 0).reverse();

  const renderRow = (r, i) => {
    const profile = profiles.get(r.battleTag);
    const sign = r.mmrChange > 0 ? "+" : "";
    return (
      <div key={r.battleTag} className="mg-rank-row">
        <span className="mg-rank-pos">{i + 1}</span>
        <div className="mg-rank-player">
          {profile?.pic ? (
            <img src={profile.pic} alt="" className="mg-rank-avatar" />
          ) : (
            <div className="mg-rank-avatar-ph">
              {r.race && RACE_ICONS[r.race] ? (
                <img src={RACE_ICONS[r.race]} alt="" className="mg-rank-race-icon" />
              ) : (
                <span>{r.name.charAt(0)}</span>
              )}
            </div>
          )}
          <Link to={`/player/${encodeURIComponent(r.battleTag)}`} className="mg-rank-name">
            {r.name}
          </Link>
          {profile?.country && <CountryFlag name={profile.country.toLowerCase()} />}
        </div>
        <span className={`mg-rank-mmr ${r.mmrChange >= 0 ? "mg-text-green" : "mg-text-red"}`}>
          {sign}{r.mmrChange}
        </span>
      </div>
    );
  };

  const hasNegative = fallers.length > 0;

  return (
    <section className="mg-section mg-rankings reveal" style={{ "--delay": "0.30s" }}>
      <div className="mg-section-header">
        <span className="mg-section-label">Power Rankings</span>
        <div className="mg-section-rule" />
      </div>
      {hasNegative ? (
        <div className="mg-rank-columns">
          <div className="mg-rank-col">
            <span className="mg-rank-col-label mg-text-green">Biggest Risers</span>
            {risers.slice(0, 5).map(renderRow)}
          </div>
          <div className="mg-rank-col">
            <span className="mg-rank-col-label mg-text-red">Biggest Fallers</span>
            {fallers.slice(0, 5).map(renderRow)}
          </div>
        </div>
      ) : (
        <div className="mg-rank-single">
          {sorted.slice(0, 10).map(renderRow)}
        </div>
      )}
    </section>
  );
};

const AwardsSection = ({ awardsContent, matchStatsContent, profiles }) => {
  const awards = awardsContent ? parseAwards(awardsContent) : [];
  const matchStats = matchStatsContent ? parseMatchStats(matchStatsContent) : [];

  const cards = [
    ...awards.map((a) => ({
      key: `award-${a.category}`,
      icon: AWARD_ICONS[a.category] || "\uD83C\uDFC5",
      category: a.category,
      battleTag: a.battleTag,
      name: a.name,
      detail: a.detail,
      runnersUp: [],
    })),
    ...matchStats.map((s) => ({
      key: `stat-${s.category}`,
      icon: MATCH_STAT_ICONS[s.category] || "\uD83C\uDFC5",
      category: s.category,
      battleTag: s.battleTag,
      name: s.name,
      detail: s.detail,
      runnersUp: s.runnersUp,
    })),
  ];

  if (cards.length === 0) return null;

  return (
    <section className="mg-section mg-awards reveal" style={{ "--delay": "0.32s" }}>
      <div className="mg-section-header">
        <span className="mg-section-label mg-section-label--gold">Awards</span>
        <div className="mg-section-rule" />
      </div>
      <div className="mg-awards-grid">
        {cards.map((c) => {
          const profile = profiles.get(c.battleTag);
          return (
            <div key={c.key} className="mg-award-card">
              <span className="mg-award-icon">{c.icon}</span>
              <span className="mg-award-category">{c.category}</span>
              <div className="mg-award-player">
                {profile?.pic && (
                  <img src={profile.pic} alt="" className="mg-award-pic" />
                )}
                <Link to={`/player/${encodeURIComponent(c.battleTag)}`} className="mg-award-name">
                  {c.name}
                </Link>
              </div>
              <span className="mg-award-detail">{c.detail}</span>
              {c.runnersUp.length > 0 && (
                <span className="mg-award-runners">{c.runnersUp.join(", ")}</span>
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
                    </div>
                    <span className="mg-newblood-mmr">{p.mmr}</span>
                    <span className={`mg-newblood-wr ${p.winPct >= 50 ? "mg-text-green" : "mg-text-red"}`}>
                      {p.winPct}%
                    </span>
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
   Main Page
   ═══════════════════════════════════════════════════════ */

const Magazine = () => {
  const [weeklyDigests, setWeeklyDigests] = useState([]);
  const [weeklyIdx, setWeeklyIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState(new Map());

  useEffect(() => {
    fetch(`${RELAY_URL}/api/admin/weekly-digests`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        setWeeklyDigests(data);
        setLoading(false);
      })
      .catch((err) => { console.error("Magazine fetch failed:", err); setLoading(false); });
  }, []);

  const weekly = weeklyDigests[weeklyIdx] || null;

  const sections = useMemo(() => {
    if (!weekly?.digest) return [];
    return parseDigestSections(weekly.digest);
  }, [weekly]);

  const topics = useMemo(() => {
    const topicSection = sections.find((s) => s.key === "TOPICS");
    if (!topicSection) return [];
    return topicSection.content.split(",").map((t) => t.trim()).filter(Boolean);
  }, [sections]);

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
      if (s.key === "AWARDS") {
        for (const a of parseAwards(s.content)) names.set(a.name, a.battleTag);
      }
      if (s.key === "NEW_BLOOD") {
        for (const p of parseNewBlood(s.content)) names.set(p.name, p.battleTag);
      }
      if (s.key === "MATCH_STATS") {
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
      if (s.key === "AWARDS") {
        for (const a of parseAwards(s.content)) tags.add(a.battleTag);
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
      if (s.key === "MATCH_STATS") {
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
  const awardsSection = find("AWARDS");
  const newBloodSection = find("NEW_BLOOD");
  const atSection = find("AT_SPOTLIGHT");
  // Parse drama into lead headline + sub-stories
  const dramaQuotes = dramaSection ? splitQuotes(dramaSection.content).quotes : [];
  const dramaCleaned = dramaSection ? cleanSummary(splitQuotes(dramaSection.content).summary) : "";
  const dramaItems = dramaCleaned ? dramaCleaned.split(/;\s*/).filter(Boolean).map((s) => s.trim()) : [];
  const dramaLead = dramaItems[0] || "";
  const dramaSubStories = dramaItems.slice(1);

  return (
    <div className="mg-page">
      {/* ACT 1 — THE STORIES */}
      <CoverHero weekly={weekly} topics={topics} coverBg={coverBg} />

      <div className="mg-week-nav reveal" style={{ "--delay": "0.08s" }}>
        <button
          className="mg-week-btn"
          onClick={() => setWeeklyIdx((i) => Math.min(i + 1, weeklyDigests.length - 1))}
          disabled={weeklyIdx >= weeklyDigests.length - 1}
        >
          &larr; Older
        </button>
        <span className="mg-week-label">
          Week {weeklyIdx + 1} of {weeklyDigests.length}
        </span>
        <button
          className="mg-week-btn"
          onClick={() => setWeeklyIdx((i) => Math.max(i - 1, 0))}
          disabled={weeklyIdx <= 0}
        >
          Newer &rarr;
        </button>
      </div>

      {dramaLead && (
        <FeatureStory
          lead={dramaLead}
          quotes={dramaQuotes}
          coverBg={coverBg}
          nameToTag={knownNames}
        />
      )}

      <StoriesGrid
        stories={dramaSubStories}
        highlights={highlightsSection?.content}
        bans={bansSection?.content}
        recap={recapSection?.content}
        nameToTag={knownNames}
      />

      {/* ACT 2 — THE PLAYERS */}
      <SpotlightsSection sections={sections} profiles={profiles} />
      <StreaksSection sections={sections} profiles={profiles} />
      {upsetSection && <UpsetsSection content={upsetSection.content} profiles={profiles} />}

      {/* ACT 3 — THE NUMBERS */}
      <div className="mg-numbers-divider reveal" style={{ "--delay": "0.28s" }}>
        <div className="mg-section-rule" />
        <span className="mg-numbers-label">The Numbers</span>
        <div className="mg-section-rule" />
      </div>

      {rankingsSection && <RankingsSection content={rankingsSection.content} profiles={profiles} />}
      <AwardsSection
        awardsContent={awardsSection?.content}
        matchStatsContent={matchStatsSection?.content}
        profiles={profiles}
      />
      <CompactStats
        newBloodContent={newBloodSection?.content}
        atContent={atSection?.content}
        profiles={profiles}
      />
      <ClipsSection clips={weekly.clips} />
    </div>
  );
};

export default Magazine;
