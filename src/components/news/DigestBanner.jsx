import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { fetchAndCacheProfile } from "../../lib/profileCache";
import { CountryFlag } from "../ui";
import { FiExternalLink, FiCamera, FiEdit2 } from "react-icons/fi";
import ChatContext from "./ChatContext";
import StatPicker from "./StatPicker";
import PeonLoader from "../PeonLoader";
import useEditorial, { EDITABLE_SECTIONS } from "../../lib/useEditorial";
import useScreenshot from "../../lib/useScreenshot";
import {
  DIGEST_SECTIONS,
  parseDigestSections,
  parseMentions,
  parseStatLine,
  extractMentionedTags,
  splitQuotes,
  groupQuotesBySpeaker,
  parsePowerRankings,
  parseAwards,
} from "../../lib/digestUtils";
import { MmrComparison } from "../MmrComparison";

const RELAY_URL =
  import.meta.env.VITE_CHAT_RELAY_URL || "https://4v4gg-chat-relay.fly.dev";

/* Data-derived sections — no ChatContext, no click-to-expand */
const DATA_SECTIONS = new Set(["UPSET", "MATCH_STATS", "NEW_BLOOD", "AT_SPOTLIGHT"]);

/* ── Rendering helpers ──────────────────────────────── */

const MATCH_ID_RE = /\b([a-f0-9]{24})\b/g;
const UPSET_DATA_RE = /\s*\[([0-9,]+)\|([0-9,]+)\|([^|]+)\|([^\]]+)\]\s*$/;
const UPSET_MMRS_RE = /\s*\[([0-9,]+)\|([0-9,]+)(?:\|[^\]]+)?\]\s*$/;
const AT_DATA_RE = /\s*\[([^|]+)\|([0-9,]+)\]\s*$/;

const linkifyMatchIds = (text) => {
  const parts = [];
  let last = 0;
  for (const match of text.matchAll(MATCH_ID_RE)) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push(
      <Link key={`m${match.index}`} to={`/match/${match[1]}`} className="digest-match-link">
        match <FiExternalLink size={11} />
      </Link>
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length > 0 ? parts : [text];
};

const highlightNames = (text, nameSet) => {
  const chunks = linkifyMatchIds(text);

  if (!nameSet || nameSet.size === 0) return chunks;
  const names = [...nameSet].sort((a, b) => b.length - a.length);
  const escaped = names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`\\b(${escaped.join("|")})\\b`, "gi");

  const result = [];
  for (const chunk of chunks) {
    if (typeof chunk !== "string") {
      result.push(chunk);
      continue;
    }
    let last = 0;
    for (const match of chunk.matchAll(re)) {
      if (match.index > last) result.push(chunk.slice(last, match.index));
      result.push(
        <span key={match.index} className="digest-name">{match[0]}</span>
      );
      last = match.index + match[0].length;
    }
    if (last < chunk.length) result.push(chunk.slice(last));
  }
  return result;
};

/* ── Sub-components ──────────────────────────────────── */

const DigestAvatar = ({ src, country }) => (
  <span className="digest-avatar-wrap">
    <img
      src={src}
      alt=""
      className="digest-avatar"
      onError={(e) => { e.target.style.display = "none"; }}
    />
    {country && <CountryFlag name={country.toLowerCase()} className="digest-avatar-flag" />}
  </span>
);

const FormDots = ({ form }) => {
  if (!form) return null;
  return (
    <span className="digest-form-dots">
      {form.split("").map((c, i) => (
        <span
          key={i}
          className={`digest-form-dot ${c === "W" ? "digest-form-dot--w" : "digest-form-dot--l"}`}
        />
      ))}
    </span>
  );
};

/** Full UPSET card: [Team1] [Chart] [Team2] layout like the live game page. */
const UpsetCard = ({ item, profiles }) => {
  const m = UPSET_DATA_RE.exec(item);
  if (!m) {
    const display = item.replace(UPSET_MMRS_RE, "");
    return <span className="digest-section-text">{display}</span>;
  }

  const winnerMmrs = m[1].split(",").map(Number);
  const loserMmrs = m[2].split(",").map(Number);
  const winnerTags = m[3].split(",");
  const loserTags = m[4].split(",");
  const validWinnerMmrs = winnerMmrs.filter(n => n > 0);
  const validLoserMmrs = loserMmrs.filter(n => n > 0);
  const hasChart = validWinnerMmrs.length >= 2 && validLoserMmrs.length >= 2;
  const zeros = (n) => new Array(n).fill(0);

  const displayText = item.replace(UPSET_DATA_RE, "");
  const mapMatch = displayText.match(/on (.+?) —/);
  const gapMatch = displayText.match(/(\d+) MMR gap/);
  const matchId = displayText.match(/([a-f0-9]{24})/)?.[1];

  const TeamCol = ({ tags, isWinner }) => (
    <div className={`upset-card-team${isWinner ? " upset-card-team--winner" : ""}`}>
      {tags.map((tag, i) => {
        const p = profiles.get(tag);
        const name = tag.split("#")[0];
        return (
          <Link key={i} to={`/player/${encodeURIComponent(tag)}`} className="upset-card-player">
            {p?.pic ? (
              <img src={p.pic} alt="" className="upset-card-avatar" onError={(e) => { e.target.style.display = "none"; }} />
            ) : (
              <div className="upset-card-avatar upset-card-avatar--empty" />
            )}
            <span className="upset-card-name">{name}</span>
          </Link>
        );
      })}
    </div>
  );

  return (
    <div className="upset-card">
      <div className="upset-card-body">
        <TeamCol tags={winnerTags} isWinner={true} />
        {hasChart && (
          <div className="upset-card-chart">
            <MmrComparison
              data={{
                teamOneMmrs: validWinnerMmrs,
                teamTwoMmrs: validLoserMmrs,
                teamOneAT: zeros(validWinnerMmrs.length),
                teamTwoAT: zeros(validLoserMmrs.length),
              }}
              compact={true}
              fitToData={true}
            />
          </div>
        )}
        <TeamCol tags={loserTags} isWinner={false} />
      </div>
      <div className="upset-card-footer">
        {mapMatch && <span className="upset-card-map">{mapMatch[1]}</span>}
        {gapMatch && <span className="upset-card-gap">{gapMatch[1]} MMR gap</span>}
        {matchId && (
          <Link to={`/match/${matchId}`} className="digest-match-link">
            match <FiExternalLink size={11} />
          </Link>
        )}
      </div>
    </div>
  );
};

/** AT Spotlight card: [Avatars+Names] [MMR Chart] with W/L footer */
const ATSpotlightCard = ({ item, profiles }) => {
  const m = AT_DATA_RE.exec(item);
  const displayText = item.replace(AT_DATA_RE, "");
  if (!m) return <span className="digest-section-text">{displayText}</span>;

  const tags = m[1].split(",");
  const mmrs = m[2].split(",").map(Number);
  const validMmrs = mmrs.filter(n => n > 0);

  // Parse display info
  const sizeMatch = displayText.match(/(\d)-stack/);
  const recordMatch = displayText.match(/(\d+W-\d+L\s+\d+%)/);
  const avgMatch = displayText.match(/avg (\d+) MMR/);

  return (
    <div className="at-card">
      <div className="at-card-body">
        <div className="at-card-players">
          {tags.map((tag, i) => {
            const p = profiles.get(tag);
            const name = tag.split("#")[0];
            return (
              <Link key={i} to={`/player/${encodeURIComponent(tag)}`} className="at-card-player">
                {p?.pic ? (
                  <img src={p.pic} alt="" className="upset-card-avatar" onError={(e) => { e.target.style.display = "none"; }} />
                ) : (
                  <div className="upset-card-avatar upset-card-avatar--empty" />
                )}
                <span className="at-card-name">{name}</span>
                {mmrs[i] > 0 && <span className="at-card-mmr">{mmrs[i]}</span>}
              </Link>
            );
          })}
        </div>
        {validMmrs.length >= 2 && (
          <div className="at-card-chart">
            <MmrComparison
              data={{
                teamOneMmrs: validMmrs,
                teamTwoMmrs: [],
                teamOneAT: new Array(validMmrs.length).fill(1),
                teamTwoAT: [],
              }}
              compact={true}
              fitToData={true}
            />
          </div>
        )}
      </div>
      <div className="at-card-footer">
        {sizeMatch && <span className="at-card-size">{sizeMatch[1]}-stack</span>}
        {avgMatch && <span className="at-card-avg">{avgMatch[1]} MMR</span>}
        {recordMatch && <span className="at-card-record">{recordMatch[1]}</span>}
      </div>
    </div>
  );
};

const DigestQuotes = ({ quotes }) => {
  if (!quotes || quotes.length === 0) return null;
  const groups = groupQuotesBySpeaker(quotes);
  const hasAttribution = groups.some((g) => g.name);
  if (!hasAttribution) {
    return (
      <div className="digest-quotes">
        {quotes.map((q, qi) => (
          <div key={qi} className="digest-quote">{q}</div>
        ))}
      </div>
    );
  }
  return (
    <div className="digest-quotes digest-quotes--chat">
      {groups.map((g, gi) => (
        <div key={gi} className="digest-quote-group">
          {g.name && <span className="digest-quote-name">{g.name}</span>}
          {g.messages.map((text, ti) => (
            <div key={ti} className="digest-quote digest-quote--attributed">{text}</div>
          ))}
        </div>
      ))}
    </div>
  );
};

const StatSection = ({ stat, cls, label, profiles, date, expanded, onToggle, sectionKey, sectionId }) => {
  const profile = profiles.get(stat.battleTag);
  let displayHeadline = stat.headline;
  if (sectionKey === "GRINDER") {
    displayHeadline = `(${stat.wins + stat.losses})`;
  } else if ((sectionKey === "WINNER" || sectionKey === "LOSER") && stat.mmrChange != null) {
    const sign = stat.mmrChange > 0 ? "+" : "";
    displayHeadline = `${sign}${stat.mmrChange} MMR`;
  }
  return (
    <div id={sectionId} className={`digest-section digest-section--${cls} digest-section--clickable`} onClick={onToggle}>
      <span className="digest-section-label">{label}</span>
      <div className="digest-stat">
        {profile?.pic && <DigestAvatar src={profile.pic} country={profile.country} />}
        <Link
          to={`/player/${encodeURIComponent(stat.battleTag)}`}
          className="digest-stat-name"
          onClick={(e) => e.stopPropagation()}
        >
          {stat.name}
        </Link>
        <span className="digest-stat-headline">{displayHeadline}</span>
        <FormDots form={stat.form} />
      </div>
      <ChatContext
        date={date}
        battleTags={[stat.battleTag]}
        playerOnly
        expanded={expanded}
      />
    </div>
  );
};

/* ── Clips section ──────────────────────────────────── */

const ClipsSection = ({ clips, sectionId }) => {
  if (!clips || clips.length === 0) return null;
  return (
    <div id={sectionId} className="digest-section digest-section--clips">
      <span className="digest-section-label">Clips</span>
      <div className="digest-clips-strip">
        {clips.map((clip) => (
          <a
            key={clip.clip_id}
            href={clip.url}
            target="_blank"
            rel="noopener noreferrer"
            className="digest-clip-card"
          >
            <div className="digest-clip-thumb-wrap">
              <img src={clip.thumbnail_url} alt="" className="digest-clip-thumb" />
              <span className="digest-clip-duration">{Math.round(clip.duration)}s</span>
            </div>
            <div className="digest-clip-info">
              <span className="digest-clip-title">{clip.title}</span>
              <span className="digest-clip-meta">
                {clip.twitch_login} · {clip.view_count?.toLocaleString()} views
              </span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

/* ── Power Rankings section ─────────────────────────── */

const RankingsSection = ({ content, profiles, sectionId }) => {
  const rankings = parsePowerRankings(content);
  if (rankings.length === 0) return null;
  return (
    <div id={sectionId} className="digest-section digest-section--rankings">
      <span className="digest-section-label">Power Rankings</span>
      <div className="digest-rankings">
        {rankings.map((r) => {
          const profile = profiles.get(r.battleTag);
          const sign = r.mmrChange > 0 ? "+" : "";
          return (
            <div key={r.rank} className="digest-ranking-item">
              <span className="digest-ranking-rank">{r.rank}</span>
              <span className="digest-ranking-avatar">
                {profile?.pic && <DigestAvatar src={profile.pic} country={profile.country} />}
              </span>
              <Link
                to={`/player/${encodeURIComponent(r.battleTag)}`}
                className="digest-ranking-name"
              >
                {r.name}
              </Link>
              <span className={`digest-ranking-mmr${r.mmrChange > 0 ? " digest-ranking-mmr--up" : " digest-ranking-mmr--down"}`}>
                {sign}{r.mmrChange}
              </span>
              <span className="digest-ranking-record">{r.wins}W-{r.losses}L</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ── Meta Report section ────────────────────────────── */



/* ── Awards section ─────────────────────────────────── */

const AWARD_ICONS = { MVP: "\uD83C\uDFC6", "Iron Man": "\uD83D\uDCAA", "Most Improved": "\uD83D\uDCC8", "Biggest Tilt": "\uD83D\uDCC9" };

const AwardsSection = ({ content, profiles, sectionId }) => {
  const awards = parseAwards(content);
  if (awards.length === 0) return null;
  return (
    <div id={sectionId} className="digest-section digest-section--awards">
      <span className="digest-section-label">Awards</span>
      <div className="digest-awards-strip">
        {awards.map((a) => {
          const profile = profiles.get(a.battleTag);
          return (
            <div key={a.category} className="digest-award-card">
              <span className="digest-award-icon">{AWARD_ICONS[a.category] || "\uD83C\uDFC5"}</span>
              <span className="digest-award-category">{a.category}</span>
              <div className="digest-award-player">
                {profile?.pic && <DigestAvatar src={profile.pic} country={profile.country} />}
                <Link
                  to={`/player/${encodeURIComponent(a.battleTag)}`}
                  className="digest-award-name"
                >
                  {a.name}
                </Link>
              </div>
              <span className="digest-award-detail">{a.detail}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ── DigestBanner ────────────────────────────────────── */

const DigestBanner = ({ digest, nameSet, nameToTag, label = "Yesterday in 4v4", dateTabs, isAdmin, apiKey, onDigestUpdated, filterPlayer, clips: propClips, stats: propStats }) => {
  const digestRef = useRef(null);
  const [expandedItem, setExpandedItem] = useState(null);

  // Editorial hook
  const editorial = useEditorial({ digest, isAdmin, apiKey, onDigestUpdated });
  const {
    isEditorial, draft, draftLoading, sectionSelections, statCandidates,
    selectedStats, editingItem, setEditingItem, hiddenAvatars, setHiddenAvatars,
    itemEdits, fetchingMore, publishState, editableSections, isDirty,
    toggleItem, toggleStat, handleEditorQuotes, handleEditSummary,
    handleReorderItem, handleFetchMore, resetToDraft,
  } = editorial;

  // Screenshot hook
  const { copyState, handleScreenshot } = useScreenshot({
    digestRef, dateTabs, label, digestDate: digest?.date,
  });

  // Non-admin quote saving (published view)
  const handleSaveQuotes = useCallback(async (sectionKey, itemIdx, newQuotes) => {
    if (!isAdmin || !apiKey || !digest?.date) return;
    try {
      const res = await fetch(`${RELAY_URL}/api/admin/digest/${digest.date}/quotes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
        body: JSON.stringify({ section: sectionKey, itemIndex: itemIdx, newQuotes }),
      });
      if (res.ok) {
        const data = await res.json();
        if (onDigestUpdated) onDigestUpdated(data.digest);
      }
    } catch (err) {
      console.warn('[DigestBanner] Quote save failed:', err.message);
    }
  }, [isAdmin, apiKey, digest?.date, onDigestUpdated]);

  // Drag-and-drop state
  const dragRef = useRef(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);

  if (!digest) return null;

  // Text source: use draft in editorial mode, otherwise published text
  const sourceText = isEditorial && draft ? draft : (digest.digest || "");

  // Reset expanded item when switching digests
  useEffect(() => { setExpandedItem(null); }, [digest?.date]);
  const allSections = useMemo(() => parseDigestSections(sourceText), [sourceText]);

  // Build nameToTag from draft's MENTIONS section in editorial mode
  const draftNameToTag = useMemo(() => {
    if (!isEditorial || !draft) return null;
    const draftSections = parseDigestSections(draft);
    return parseMentions(draftSections);
  }, [isEditorial, draft]);

  const mentionsMap = useMemo(() => parseMentions(allSections), [allSections]);
  const combinedNameToTag = useMemo(() => {
    const merged = new Map(mentionsMap);
    if (nameToTag) {
      for (const [name, tag] of nameToTag) {
        if (!merged.has(name)) merged.set(name, tag);
      }
    }
    if (draftNameToTag) {
      for (const [name, tag] of draftNameToTag) {
        if (!merged.has(name)) merged.set(name, tag);
      }
    }
    return merged;
  }, [mentionsMap, nameToTag, draftNameToTag]);

  const sections = useMemo(() => {
    const visible = allSections.filter((s) => s.key !== "MENTIONS");
    if (isEditorial) return visible;
    const bansSection = visible.find((s) => s.key === "BANS");
    if (!bansSection) return visible;
    const bannedNames = new Set();
    for (const [name] of combinedNameToTag) {
      if (name.length < 3) continue;
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (new RegExp(`\\b${escaped}\\b`, "i").test(bansSection.content)) {
        bannedNames.add(name);
      }
    }
    if (bannedNames.size === 0) return visible;
    return visible.map((s) => {
      if (s.key !== "DRAMA") return s;
      const items = s.content.split(/;\s*/).filter((item) => {
        return ![...bannedNames].some((n) => {
          const escaped = n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          return new RegExp(`\\b${escaped}\\b`, "i").test(item);
        });
      });
      if (items.length === 0) return null;
      return { ...s, content: items.join("; ") };
    }).filter(Boolean);
  }, [allSections, combinedNameToTag, isEditorial]);

  const combinedNameSet = useMemo(() => {
    const names = new Set(nameSet);
    for (const name of combinedNameToTag.keys()) {
      names.add(name);
    }
    return names;
  }, [nameSet, combinedNameToTag]);

  // When filtering by player, only show sections that mention them
  const displaySections = useMemo(() => {
    if (!filterPlayer) return sections;
    const pName = filterPlayer.split("#")[0];
    const escaped = pName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`\\b${escaped}\\b`, "i");
    return sections.filter((s) => re.test(s.content));
  }, [sections, filterPlayer]);

  const [profiles, setProfiles] = useState(new Map());
  const fetchedRef = useRef(new Set());

  useEffect(() => {
    const tagsToFetch = new Set();

    for (const { key, content } of sections) {
      const meta = DIGEST_SECTIONS.find((s) => s.key === key);
      if (meta?.stat) {
        const stat = parseStatLine(content);
        if (stat) tagsToFetch.add(stat.battleTag);
      } else if (meta?.rankings) {
        for (const r of parsePowerRankings(content)) {
          tagsToFetch.add(r.battleTag);
        }
      } else if (meta?.awards) {
        for (const a of parseAwards(content)) {
          tagsToFetch.add(a.battleTag);
        }
      } else if (key === "UPSET") {
        for (const upsetItem of content.split(/;\s*/)) {
          const um = UPSET_DATA_RE.exec(upsetItem);
          if (um) {
            um[3].split(",").forEach(t => tagsToFetch.add(t));
            um[4].split(",").forEach(t => tagsToFetch.add(t));
          }
        }
      } else if (key === "AT_SPOTLIGHT") {
        for (const atItem of content.split(/;\s*/)) {
          const am = AT_DATA_RE.exec(atItem);
          if (am) {
            am[1].split(",").forEach(t => tagsToFetch.add(t));
          }
        }
      } else if (!meta?.tags) {
        for (const tag of extractMentionedTags(content, combinedNameToTag)) {
          tagsToFetch.add(tag);
        }
      }
    }

    for (const tag of tagsToFetch) {
      if (fetchedRef.current.has(tag)) continue;
      fetchedRef.current.add(tag);
      fetchAndCacheProfile(tag).then((data) => {
        if (data?.pic || data?.country) {
          setProfiles((prev) => {
            const next = new Map(prev);
            next.set(tag, data);
            return next;
          });
        }
      });
    }
  }, [sections, combinedNameToTag]);

  const screenshotBtn = (
    <button className="digest-screenshot-btn" onClick={handleScreenshot} title="Copy as image">
      {copyState === "copying" ? "..." : copyState === "copied" ? "Copied!" : copyState === "saved" ? "Saved!" : <FiCamera size={14} />}
    </button>
  );

  const todayMD = new Date().toISOString().slice(5, 10);
  const isValentines = todayMD === "02-14" || digest.date?.slice(5) === "02-14";
  const digestCls = `news-digest${isValentines ? " news-digest--valentines" : ""}`;
  const vLabels = isValentines ? {
    TOPICS: "Pillow Talk",
    DRAMA: "Lovers' Quarrels",
    BANS: "Restraining Orders",
    HIGHLIGHTS: "Love Letters",
    WINNER: "Heartbreaker",
    LOSER: "Heartbroken",
    GRINDER: "Hopeless Romantic",
    HOTSTREAK: "Hot Date",
    COLDSTREAK: "Left on Read",
  } : null;

  const isEditableSection = (key) => EDITABLE_SECTIONS.some((s) => s.key === key);

  // Confirm before switching tabs when dirty
  const handleTabClick = useCallback((tabOnClick) => {
    if (isDirty && !window.confirm("You have unsaved changes. Switch anyway?")) return;
    tabOnClick();
  }, [isDirty]);

  const renderDateTabs = (tabs) => (
    <div className="digest-date-tabs-wrap">
      <div className="digest-date-tabs">
        {tabs.map((tab, i) => (
          <button
            key={i}
            className={`digest-date-tab${tab.active ? " digest-date-tab--active" : ""}`}
            onClick={() => isEditorial ? handleTabClick(tab.onClick) : tab.onClick()}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {screenshotBtn}
    </div>
  );

  if (displaySections.length === 0) {
    return (
      <div className={digestCls} ref={digestRef}>
        <div className="news-digest-header">
          {dateTabs && dateTabs.length > 1 ? renderDateTabs(dateTabs) : (
            <div className="news-digest-label">{label}{screenshotBtn}</div>
          )}
        </div>
        {draftLoading && isEditorial && (
          <PeonLoader size="sm" />
        )}
        <p className="digest-section-text">{highlightNames(sourceText, combinedNameSet)}</p>
      </div>
    );
  }

  return (
    <div className={digestCls} ref={digestRef}>
      {isValentines && (
        <div className="valentines-hearts">
          {[...Array(10)].map((_, i) => <span key={i} className="valentines-heart">{i % 3 === 0 ? "\uD83D\uDC98" : i % 3 === 1 ? "\u2764\uFE0F" : "\uD83D\uDC95"}</span>)}
        </div>
      )}
      <div className="news-digest-header">
        {dateTabs && dateTabs.length > 1 ? renderDateTabs(dateTabs) : (
          <div className="news-digest-label">{label}{screenshotBtn}</div>
        )}
      </div>
      {draftLoading && isEditorial && (
        <PeonLoader size="sm" />
      )}
      {filterPlayer && (
        <div className="digest-player-filter">
          <span>Showing mentions of <strong>{filterPlayer.split("#")[0]}</strong></span>
          <Link to="/news" className="digest-player-filter-clear">&times;</Link>
        </div>
      )}
      <div className="digest-sections">
        {displaySections.map(({ key, content }) => {
          const meta = DIGEST_SECTIONS.find((s) => s.key === key);
          if (!meta) return null;
          if (key === "SPIKES" || key === "RECAP") return null;
          if (/^none$/i.test(content.trim())) return null;
          const cls = meta.cls;
          const sectionLabel = vLabels?.[key] || meta.label;
          const editable = isEditorial && isEditableSection(key);

          // Clips section: rendered from digest.clips JSON, not text
          if (meta.clips) {
            const digestClips = propClips || digest?.clips;
            return <ClipsSection key={key} sectionId={key.toLowerCase()} clips={digestClips} />;
          }

          // Power Rankings section
          if (meta.rankings) {
            return <RankingsSection key={key} sectionId={key.toLowerCase()} content={content} profiles={profiles} />;
          }

          // Awards section
          if (meta.awards) {
            return <AwardsSection key={key} sectionId={key.toLowerCase()} content={content} profiles={profiles} />;
          }

          if (meta.stat) {
            const stat = parseStatLine(content);
            if (stat) {
              const isExpanded = expandedItem?.key === key;
              return (
                <StatSection
                  key={key}
                  sectionId={key.toLowerCase()}
                  stat={stat}
                  cls={cls}
                  label={sectionLabel}
                  sectionKey={key}
                  profiles={profiles}
                  date={digest.date}
                  expanded={isExpanded}
                  onToggle={() => setExpandedItem(isExpanded ? null : { key, idx: 0 })}
                />
              );
            }
          }

          if (meta.tags) {
            return (
              <div key={key} id={key.toLowerCase()} className={`digest-section digest-section--${cls}`}>
                <span className="digest-section-label">{sectionLabel}</span>
                <span className="digest-tags">
                  {content.split(/,\s*/).filter(Boolean).map((tag, i) => (
                    <span key={i} className="digest-tag">{tag.trim()}</span>
                  ))}
                </span>
              </div>
            );
          }

          const items = content.split(/;\s*/).map(s => s.trim()).filter(Boolean);

          // Hide editable sections where no items are selected
          const sectionSel = sectionSelections[key];
          if (editable && sectionSel && sectionSel.size === 0) return null;

          // Custom UPSET card rendering
          if (key === "UPSET" && !editable) {
            return (
              <div key={key} id={key.toLowerCase()} className={`digest-section digest-section--${cls}`}>
                <span className="digest-section-label">{sectionLabel}</span>
                <div className="digest-upset-cards">
                  {items.map((item, i) => (
                    <UpsetCard key={i} item={item} profiles={profiles} />
                  ))}
                </div>
              </div>
            );
          }

          // Custom AT_SPOTLIGHT card rendering
          if (key === "AT_SPOTLIGHT" && !editable) {
            return (
              <div key={key} id={key.toLowerCase()} className={`digest-section digest-section--${cls}`}>
                <span className="digest-section-label">{sectionLabel}</span>
                <div className="digest-upset-cards">
                  {items.map((item, i) => (
                    <ATSpotlightCard key={i} item={item} profiles={profiles} />
                  ))}
                </div>
              </div>
            );
          }

          const isRecap = key === "RECAP";
          const isClickable = !isRecap;

          const sectionHeader = editable ? (
            <div className="digest-section-admin-label">
              <span className="digest-section-label">{sectionLabel}</span>
              <span className="digest-admin-count">{sectionSel?.size || 0}/{items.length}</span>
              <button
                className="digest-admin-more-btn"
                onClick={(e) => { e.stopPropagation(); handleFetchMore(key); }}
                disabled={fetchingMore === key}
              >
                {fetchingMore === key ? "..." : "More"}
              </button>
            </div>
          ) : (
            <span className="digest-section-label">{sectionLabel}</span>
          );

          return (
            <div key={key} id={key.toLowerCase()} className={`digest-section digest-section--${cls}`}>
              {sectionHeader}
              {items.length > 1 ? (
                <ul className="digest-bullets">
                  {items.map((item, i) => {
                    const itemTags = extractMentionedTags(item, combinedNameToTag);
                    const avatarTags = itemTags.filter((tag) => !hiddenAvatars.has(tag));
                    const avatarProfiles = avatarTags.map((tag) => profiles.get(tag)).filter((p) => p?.pic);
                    const displayItem = key === "UPSET" ? item.replace(UPSET_MMRS_RE, "") : item;
                    const { summary, quotes } = splitQuotes(displayItem);
                    const isExpanded = expandedItem?.key === key && expandedItem?.idx === i;
                    const isSelected = editable ? (sectionSel?.has(i) ?? false) : true;
                    const isEditing = editingItem?.key === key && editingItem?.idx === i;

                    const isDataSection = DATA_SECTIONS.has(key);
                    const handleClick = editable
                      ? (e) => { if (e.target.closest(".cc-panel")) return; toggleItem(key, i); }
                      : (isClickable && !isDataSection)
                        ? (e) => { if (e.target.closest(".cc-panel")) return; setExpandedItem(isExpanded ? null : { key, idx: i }); }
                        : undefined;

                    const isDragOver = editable && dragOverIdx?.key === key && dragOverIdx?.idx === i;

                    return (
                      <li
                        key={i}
                        className={`digest-bullet-row${isClickable || editable ? " digest-bullet-row--clickable" : ""}${editable && !isSelected ? " digest-bullet-row--dimmed" : ""}${editable ? " digest-bullet-row--editorial" : ""}${isDragOver ? " digest-bullet-row--dragover" : ""}`}
                        onClick={handleClick}
                        draggable={editable && !isEditing && !isExpanded}
                        onDragStart={editable ? (e) => {
                          dragRef.current = { key, idx: i };
                          e.dataTransfer.effectAllowed = "move";
                          e.currentTarget.classList.add("digest-bullet-row--dragging");
                        } : undefined}
                        onDragEnd={editable ? (e) => {
                          dragRef.current = null;
                          setDragOverIdx(null);
                          e.currentTarget.classList.remove("digest-bullet-row--dragging");
                        } : undefined}
                        onDragOver={editable ? (e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                          if (dragRef.current?.key === key && dragRef.current?.idx !== i) {
                            setDragOverIdx({ key, idx: i });
                          }
                        } : undefined}
                        onDragLeave={editable ? () => {
                          setDragOverIdx((prev) => prev?.key === key && prev?.idx === i ? null : prev);
                        } : undefined}
                        onDrop={editable ? (e) => {
                          e.preventDefault();
                          setDragOverIdx(null);
                          if (dragRef.current?.key === key && dragRef.current.idx !== i) {
                            handleReorderItem(key, dragRef.current.idx, i);
                          }
                          dragRef.current = null;
                        } : undefined}
                      >
                        {editable && (
                          <div className="digest-admin-controls" onClick={(e) => e.stopPropagation()}>
                            <span
                              className={`digest-admin-check${isSelected ? " digest-admin-check--on" : ""}`}
                              onClick={() => toggleItem(key, i)}
                            >
                              {isSelected ? "\u2713" : ""}
                            </span>
                            <span
                              className="digest-admin-edit"
                              title="Edit text"
                              onClick={() => setEditingItem(isEditing ? null : { key, idx: i })}
                            >
                              <FiEdit2 size={12} />
                            </span>
                            <span
                              className={`digest-admin-chat${isExpanded ? " digest-admin-chat--active" : ""}`}
                              title="Browse chat context"
                              onClick={() => setExpandedItem(isExpanded ? null : { key, idx: i })}
                            >
                              {"\uD83D\uDCAC"}
                            </span>
                          </div>
                        )}
                        <div className="digest-bullet-summary">
                          {avatarProfiles.length > 0 && (
                            <span className="digest-avatars">
                              {avatarProfiles.map((p, ai) => (
                                <span key={ai} className="digest-avatar-wrap">
                                  <img src={p.pic} alt="" className="digest-avatar" onError={(e) => { e.target.style.display = "none"; }} />
                                  {p.country && <CountryFlag name={p.country.toLowerCase()} className="digest-avatar-flag" />}
                                  {editable && (
                                    <span
                                      className="digest-avatar-remove"
                                      onClick={(e) => { e.stopPropagation(); setHiddenAvatars((prev) => new Set(prev).add(avatarTags[ai])); }}
                                    >&times;</span>
                                  )}
                                </span>
                              ))}
                            </span>
                          )}
                          {isEditing ? (
                            <input
                              className="digest-admin-input"
                              defaultValue={summary}
                              autoFocus
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleEditSummary(key, i, e.target.value);
                                if (e.key === "Escape") setEditingItem(null);
                              }}
                              onBlur={(e) => handleEditSummary(key, i, e.target.value)}
                            />
                          ) : (
                            <span className="digest-section-text">
                              {highlightNames(summary, combinedNameSet)}
                            </span>
                          )}
                        </div>
                        <div className="digest-bullet-content">
                          <DigestQuotes quotes={quotes} />
                          {key === "UPSET" && <UpsetCard item={item} profiles={profiles} />}
                          {isClickable && !isDataSection && (
                            <ChatContext
                              date={digest.date}
                              battleTags={itemTags}
                              quotes={quotes}
                              expanded={isExpanded}
                              selectable={isEditorial || isAdmin}
                              existingQuotes={quotes}
                              onSaveQuotes={isEditorial
                                ? (newQ) => handleEditorQuotes(key, i, newQ)
                                : (newQ) => handleSaveQuotes(key, i, newQ)
                              }
                            />
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div
                  className={`digest-section-body${isClickable && !DATA_SECTIONS.has(key) ? " digest-section-body--clickable" : ""}`}
                  onClick={isClickable && !DATA_SECTIONS.has(key) && !editable ? () => {
                    const isExpanded = expandedItem?.key === key && expandedItem?.idx === 0;
                    setExpandedItem(isExpanded ? null : { key, idx: 0 });
                  } : editable ? () => toggleItem(key, 0) : undefined}
                >
                  {(() => {
                    const tags = extractMentionedTags(content, combinedNameToTag).filter((t) => !hiddenAvatars.has(t));
                    const singleProfiles = tags.map((tag) => profiles.get(tag)).filter((p) => p?.pic);
                    const displayContent = key === "UPSET" ? content.replace(UPSET_MMRS_RE, "") : content;
                    const { summary, quotes } = splitQuotes(displayContent);
                    const isExpanded = expandedItem?.key === key && expandedItem?.idx === 0;
                    const isSelected = editable ? (sectionSel?.has(0) ?? false) : true;
                    const isEditing = editingItem?.key === key && editingItem?.idx === 0;
                    return (
                      <div className={`digest-bullet-content${editable && !isSelected ? " digest-bullet-row--dimmed" : ""}`}>
                        {editable && (
                          <div className="digest-admin-controls" onClick={(e) => e.stopPropagation()}>
                            <span
                              className={`digest-admin-check${isSelected ? " digest-admin-check--on" : ""}`}
                              onClick={() => toggleItem(key, 0)}
                            >
                              {isSelected ? "\u2713" : ""}
                            </span>
                            <span
                              className="digest-admin-edit"
                              title="Edit text"
                              onClick={() => setEditingItem(isEditing ? null : { key, idx: 0 })}
                            >
                              <FiEdit2 size={12} />
                            </span>
                            <span
                              className={`digest-admin-chat${isExpanded ? " digest-admin-chat--active" : ""}`}
                              title="Browse chat context"
                              onClick={() => setExpandedItem(isExpanded ? null : { key, idx: 0 })}
                            >
                              {"\uD83D\uDCAC"}
                            </span>
                          </div>
                        )}
                        {singleProfiles.length > 0 && (
                          <span className="digest-avatars">
                            {singleProfiles.map((p, ai) => (
                              <DigestAvatar key={ai} src={p.pic} country={p.country} />
                            ))}
                          </span>
                        )}
                        {isEditing ? (
                          <input
                            className="digest-admin-input"
                            defaultValue={summary}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleEditSummary(key, 0, e.target.value);
                              if (e.key === "Escape") setEditingItem(null);
                            }}
                            onBlur={(e) => handleEditSummary(key, 0, e.target.value)}
                          />
                        ) : (
                          <span className="digest-section-text">
                            {highlightNames(summary, combinedNameSet)}
                          </span>
                        )}
                        <DigestQuotes quotes={quotes} />
                        {key === "UPSET" && <UpsetCard item={content} profiles={profiles} />}
                        {isClickable && !DATA_SECTIONS.has(key) && (
                          <ChatContext
                            date={digest.date}
                            battleTags={tags}
                            quotes={quotes}
                            expanded={isExpanded}
                            selectable={isEditorial || isAdmin}
                            existingQuotes={quotes}
                            onSaveQuotes={isEditorial
                              ? (newQ) => handleEditorQuotes(key, 0, newQ)
                              : (newQ) => handleSaveQuotes(key, 0, newQ)
                            }
                          />
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {/* Clips from JSON data (if not already rendered via text section) */}
      {(() => {
        const digestClips = propClips || digest?.clips;
        const hasClipsSection = displaySections.some(s => s.key === "CLIPS");
        if (!hasClipsSection && digestClips && digestClips.length > 0) {
          return <ClipsSection clips={digestClips} />;
        }
        return null;
      })()}
      {/* Editorial footer: stat picker + reset + save status */}
      {isEditorial && (
        <div className="digest-admin-footer">
          <StatPicker
            candidates={statCandidates}
            selectedStats={selectedStats}
            onToggle={toggleStat}
          />
          <div className="digest-admin-footer-actions">
            <button className="digest-admin-reset-btn" onClick={resetToDraft}>
              Reset to draft
            </button>
            {publishState !== "idle" && (
              <div className={`digest-admin-status${publishState === "saved" ? " digest-admin-status--saved" : ""}`}>
                {publishState === "saving" ? "Saving..." : publishState === "saved" ? "\u2713 Saved" : publishState === "dirty" ? "Unsaved changes" : ""}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DigestBanner;
