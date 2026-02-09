import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Link, useHistory } from "react-router-dom";
import useChatStream from "../lib/useChatStream";
import { getOngoingMatches, getOngoingMatchesCached, getPlayerStats, getPlayerProfile, getLadder } from "../lib/api";
import { calculateTeamMMR } from "../lib/utils";
import OnlineMmrStrip from "../components/OnlineMmrStrip";
import { CountryFlag } from "../components/ui";

const RELAY_URL =
  import.meta.env.VITE_CHAT_RELAY_URL || "https://4v4gg-chat-relay.fly.dev";

// Sort matches by team MMR (highest first)
const sortByMMR = (matches) => {
  if (!matches) return [];
  return matches.slice().sort((a, b) => {
    return calculateTeamMMR(b.teams) - calculateTeamMMR(a.teams);
  });
};

const getInitialData = () => {
  const cached = getOngoingMatchesCached();
  if (cached?.matches) return sortByMMR(cached.matches);
  return null;
};

/* ── DigestBanner ──────────────────────────────────────── */

const DIGEST_SECTIONS = [
  { key: "TOPICS", label: "Topics", cls: "topics", tags: true },
  { key: "DRAMA", label: "Drama", cls: "drama" },
  { key: "BANS", label: "Bans", cls: "bans" },
  { key: "HIGHLIGHTS", label: "Highlights", cls: "highlights" },
  { key: "WINNER", label: "Winner", cls: "winner", stat: true },
  { key: "LOSER", label: "Loser", cls: "loser", stat: true },
  { key: "GRINDER", label: "Grinder", cls: "grinder", stat: true },
  { key: "HOTSTREAK", label: "Hot", cls: "hotstreak", stat: true },
  { key: "COLDSTREAK", label: "Cold", cls: "coldstreak", stat: true },
];

const ALL_SECTION_KEYS = [...DIGEST_SECTIONS.map((s) => s.key), "MENTIONS"];
const SECTION_RE = new RegExp(`^(${ALL_SECTION_KEYS.join("|")})\\s*:\\s*`, "gm");

const parseDigestSections = (text) => {
  const sections = [];
  const matches = [...text.matchAll(SECTION_RE)];
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const start = m.index + m[0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    const content = text.slice(start, end).trim();
    if (content) sections.push({ key: m[1], content });
  }
  return sections;
};

// Parse MENTIONS section into a name→battleTag map
const parseMentions = (sections) => {
  const mentionsSection = sections.find((s) => s.key === "MENTIONS");
  if (!mentionsSection) return new Map();
  const map = new Map();
  for (const tag of mentionsSection.content.split(",")) {
    const trimmed = tag.trim();
    if (!trimmed) continue;
    const name = trimmed.split("#")[0];
    if (name) map.set(name, trimmed);
  }
  return map;
};

// Unified parser for all stat lines
const parseStatLine = (content) => {
  const m = content.match(/^(.+?#\d+)\s+(.+?)\s+\((\d+)W-(\d+)L\)\s*([WL]*)$/);
  if (!m) return null;
  return {
    battleTag: m[1],
    name: m[1].split("#")[0],
    headline: m[2],
    wins: parseInt(m[3]),
    losses: parseInt(m[4]),
    form: m[5] || "",
  };
};

const highlightNames = (text, nameSet) => {
  if (!nameSet || nameSet.size === 0) return [text];
  const names = [...nameSet].sort((a, b) => b.length - a.length);
  const escaped = names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`\\b(${escaped.join("|")})\\b`, "gi");
  const parts = [];
  let last = 0;
  for (const match of text.matchAll(re)) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push(
      <span key={match.index} className="digest-name">{match[0]}</span>
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
};

const extractMentionedTags = (text, nameToTag) => {
  const tags = new Set();
  const lower = text.toLowerCase();
  for (const [name, tag] of nameToTag) {
    if (name.length < 2) continue;
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`\\b${escaped}\\b`, "i");
    if (re.test(text)) {
      tags.add(tag);
    } else if (name.length >= 4) {
      // Prefix match: "Ghost" in text matches "GhostGGGL" in nameToTag
      const nameLower = name.toLowerCase();
      // Check if any word in the text starts with a known name prefix
      for (const word of lower.split(/\W+/)) {
        if (word.length >= 4 && nameLower.startsWith(word)) {
          tags.add(tag);
          break;
        }
      }
    }
  }
  return [...tags];
};

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

const StatSection = ({ stat, cls, label, profiles }) => {
  const profile = profiles.get(stat.battleTag);
  return (
    <div className={`digest-section digest-section--${cls}`}>
      <span className="digest-section-label">{label}</span>
      <div className="digest-stat">
        {profile?.pic && <DigestAvatar src={profile.pic} country={profile.country} />}
        <Link
          to={`/player/${encodeURIComponent(stat.battleTag)}`}
          className="digest-stat-name"
        >
          {stat.name}
        </Link>
        <span className="digest-stat-headline">{stat.headline}</span>
        <FormDots form={stat.form} />
      </div>
    </div>
  );
};

const DigestBanner = ({ digest, nameSet, nameToTag, label = "Yesterday in 4v4", dateTabs }) => {
  if (!digest) return null;

  const text = digest.digest || "";
  const allSections = useMemo(() => parseDigestSections(text), [text]);

  // Build combined nameToTag: merge MENTIONS (reliable) + live nameToTag (fallback)
  const mentionsMap = useMemo(() => parseMentions(allSections), [allSections]);
  const combinedNameToTag = useMemo(() => {
    const merged = new Map(mentionsMap);
    if (nameToTag) {
      for (const [name, tag] of nameToTag) {
        if (!merged.has(name)) merged.set(name, tag);
      }
    }
    return merged;
  }, [mentionsMap, nameToTag]);

  // Visible sections (exclude MENTIONS)
  const sections = useMemo(
    () => allSections.filter((s) => s.key !== "MENTIONS"),
    [allSections],
  );

  // Build combined name set for highlighting (includes MENTIONS names)
  const combinedNameSet = useMemo(() => {
    const names = new Set(nameSet);
    for (const name of combinedNameToTag.keys()) {
      names.add(name);
    }
    return names;
  }, [nameSet, combinedNameToTag]);

  const [profiles, setProfiles] = useState(new Map());
  const fetchedRef = useRef(new Set());

  // Fetch profiles for all mentioned battleTags
  useEffect(() => {
    const tagsToFetch = new Set();

    for (const { key, content } of sections) {
      const meta = DIGEST_SECTIONS.find((s) => s.key === key);
      if (meta?.stat) {
        const stat = parseStatLine(content);
        if (stat) tagsToFetch.add(stat.battleTag);
      } else if (!meta?.tags) {
        // Fetch profiles for all text sections (drama, highlights, MVP)
        for (const tag of extractMentionedTags(content, combinedNameToTag)) {
          tagsToFetch.add(tag);
        }
      }
    }

    for (const tag of tagsToFetch) {
      if (fetchedRef.current.has(tag)) continue;
      fetchedRef.current.add(tag);
      getPlayerProfile(tag).then((profile) => {
        if (profile?.profilePicUrl || profile?.country) {
          setProfiles((prev) => {
            const next = new Map(prev);
            next.set(tag, { pic: profile.profilePicUrl, country: profile.country });
            return next;
          });
        }
      });
    }
  }, [sections, combinedNameToTag]);

  if (sections.length === 0) {
    return (
      <div className="home-panel home-digest">
        <div className="home-digest-header">
        {dateTabs && dateTabs.length > 1 ? (
          <div className="digest-date-tabs">
            {dateTabs.map((tab, i) => (
              <button
                key={i}
                className={`digest-date-tab${tab.active ? " digest-date-tab--active" : ""}`}
                onClick={tab.onClick}
              >
                {tab.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="home-digest-label">{label}</div>
        )}
      </div>
        <p className="digest-section-text">{highlightNames(text, combinedNameSet)}</p>
      </div>
    );
  }

  return (
    <div className="home-panel home-digest">
      <div className="home-digest-header">
        {dateTabs && dateTabs.length > 1 ? (
          <div className="digest-date-tabs">
            {dateTabs.map((tab, i) => (
              <button
                key={i}
                className={`digest-date-tab${tab.active ? " digest-date-tab--active" : ""}`}
                onClick={tab.onClick}
              >
                {tab.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="home-digest-label">{label}</div>
        )}
      </div>
      <div className="digest-sections">
        {sections.map(({ key, content }) => {
          const meta = DIGEST_SECTIONS.find((s) => s.key === key);
          if (!meta) return null;
          const { cls, label } = meta;

          // Stat sections — avatar + headline + form dots
          if (meta.stat) {
            const stat = parseStatLine(content);
            if (stat) {
              return <StatSection key={key} stat={stat} cls={cls} label={label} profiles={profiles} />;
            }
          }

          // Topic tags
          if (meta.tags) {
            return (
              <div key={key} className={`digest-section digest-section--${cls}`}>
                <span className="digest-section-label">{label}</span>
                <span className="digest-tags">
                  {content.split(/,\s*/).filter(Boolean).map((tag, i) => (
                    <span key={i} className="digest-tag">{tag.trim()}</span>
                  ))}
                </span>
              </div>
            );
          }

          // Drama/Highlights/MVP — split on semicolons, per-item avatars for drama
          const items = content.split(/;\s*/).map(s => s.trim()).filter(Boolean);

          return (
            <div key={key} className={`digest-section digest-section--${cls}`}>
              <span className="digest-section-label">{label}</span>
              {items.length > 1 ? (
                <ul className="digest-bullets">
                  {items.map((item, i) => {
                    const itemTags = extractMentionedTags(item, combinedNameToTag);
                    const itemProfiles = itemTags
                      .map((tag) => profiles.get(tag))
                      .filter(Boolean);

                    const avatarElements = itemProfiles
                      .filter((p) => p.pic)
                      .map((p, j) => <DigestAvatar key={j} src={p.pic} country={p.country} />);

                    return (
                      <li key={i} className="digest-bullet-row">
                        <div className="digest-avatars">
                          {avatarElements}
                        </div>
                        <span className="digest-section-text">
                          {highlightNames(item, combinedNameSet)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="digest-section-body">
                  {(() => {
                    const tags = extractMentionedTags(content, combinedNameToTag);
                    const ps = tags.map((t) => profiles.get(t)).filter(Boolean);
                    return ps.length > 0 ? (
                      <div className="digest-avatars">
                        {ps.map((p, i) => p.pic && <DigestAvatar key={i} src={p.pic} country={p.country} />)}
                      </div>
                    ) : null;
                  })()}
                  <span className="digest-section-text">
                    {highlightNames(content, combinedNameSet)}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ── Digest date label ─────────────────────────────────── */

const formatDigestLabel = (dateStr) => {
  const today = new Date().toISOString().slice(0, 10);
  if (dateStr === today) return "Today so far";
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (dateStr === yesterday) return "Yesterday";
  const d = new Date(dateStr + "T12:00:00");
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${days[d.getDay()]} ${months[d.getMonth()]} ${d.getDate()}`;
};

/* ── MmrChart (fills remaining space) ─────────────────── */

const MmrChart = ({ players, matches, count, histogram }) => {
  const history = useHistory();
  const handlePlayerClick = useCallback((battleTag) => {
    if (battleTag) history.push(`/player/${encodeURIComponent(battleTag)}`);
  }, [history]);

  return (
    <div className="home-panel home-mmr-chart">
      <div className="home-section-header">
        <span className="home-section-title">MMR Distribution</span>
        <span className="home-section-count">{count} online</span>
        {matches && matches.length > 0 && (
          <span className="home-section-count">
            {matches.reduce((sum, m) => sum + (m.teams || []).reduce((s, t) => s + (t.players?.length || 0), 0), 0)} live
          </span>
        )}
      </div>
      <OnlineMmrStrip
        players={players}
        matches={matches}
        histogram={histogram}
        onPlayerClick={handlePlayerClick}
      />
    </div>
  );
};

/* ── Home Page ─────────────────────────────────────────── */

const Home = () => {
  const { onlineUsers, messages } = useChatStream();
  const [matches, setMatches] = useState(getInitialData);
  const [allDigests, setAllDigests] = useState([]);
  const [digestIdx, setDigestIdx] = useState(0);
  const [playerStats, setPlayerStats] = useState(new Map());
  const [histogram, setHistogram] = useState(null);
  const fetchedRef = useRef(new Set());

  // Fetch live games
  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const data = await getOngoingMatches();
        setMatches(sortByMMR(data.matches));
      } catch {}
    };
    fetchMatches();
    const interval = setInterval(fetchMatches, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch all digests (today + past)
  useEffect(() => {
    Promise.all([
      fetch(`${RELAY_URL}/api/admin/stats/today`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch(`${RELAY_URL}/api/admin/digests`)
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
    ]).then(([today, past]) => {
      const combined = [];
      if (today?.digest) combined.push(today);
      for (const d of past) {
        if (!combined.some((c) => c.date === d.date)) combined.push(d);
      }
      setAllDigests(combined);
    });
  }, []);

  // Fetch ladder histogram (all 7 leagues, runs once)
  useEffect(() => {
    Promise.all([0, 1, 2, 3, 4, 5, 6].map((id) => getLadder(id)))
      .then((results) => {
        const allMmrs = results.flat().map((e) => e?.player?.mmr).filter((m) => m != null && m > 0);
        if (allMmrs.length === 0) return;
        const min = Math.floor(Math.min(...allMmrs) / 50) * 50;
        const max = Math.ceil(Math.max(...allMmrs) / 50) * 50;
        const bucketSize = Math.max(1, Math.round((max - min) / 50));
        const bins = [];
        for (let v = min; v < max; v += bucketSize) {
          const count = allMmrs.filter((m) => m >= v && m < v + bucketSize).length;
          bins.push({ mmr: v + bucketSize / 2, count });
        }
        setHistogram(bins);
      })
      .catch(() => {});
  }, []);

  // Fetch player stats incrementally
  useEffect(() => {
    for (const u of onlineUsers) {
      const tag = u.battleTag;
      if (!tag || fetchedRef.current.has(tag)) continue;
      fetchedRef.current.add(tag);
      getPlayerStats(tag).then((stats) => {
        if (stats) {
          setPlayerStats((prev) => {
            const next = new Map(prev);
            next.set(tag, stats);
            return next;
          });
        }
      });
    }
  }, [onlineUsers]);

  // Build name set + name→battleTag map for digest highlighting & avatar lookup
  const { nameSet, nameToTag } = useMemo(() => {
    const names = new Set();
    const tagMap = new Map();
    for (const u of onlineUsers) {
      const tag = u.battleTag;
      const name = tag?.split("#")[0];
      if (name) {
        names.add(name);
        tagMap.set(name, tag);
      }
    }
    for (const m of messages) {
      const tag = m.battle_tag || m.battleTag;
      const name = tag?.split("#")[0];
      if (name) {
        names.add(name);
        if (!tagMap.has(name)) tagMap.set(name, tag);
      }
    }
    return { nameSet: names, nameToTag: tagMap };
  }, [onlineUsers, messages]);

  // Derive players with stats (sorted by MMR)
  const playersWithStats = useMemo(() => {
    return onlineUsers
      .map((u) => {
        const stats = playerStats.get(u.battleTag);
        return {
          battleTag: u.battleTag,
          name: u.battleTag?.split("#")[0],
          mmr: stats?.mmr ?? null,
          race: stats?.race ?? null,
          wins: stats?.wins ?? 0,
          losses: stats?.losses ?? 0,
          rank: stats?.rank ?? null,
        };
      })
      .sort((a, b) => (b.mmr ?? 0) - (a.mmr ?? 0));
  }, [onlineUsers, playerStats]);

  const stripPlayers = useMemo(() => {
    const online = playersWithStats.filter((p) => p.mmr != null);
    const onlineTags = new Set(online.map((p) => p.battleTag));
    // Add match participants not already in the online list
    if (matches) {
      for (const match of matches) {
        for (const team of match.teams || []) {
          for (const p of team.players || []) {
            const mmr = p.oldMmr || p.currentMmr || 0;
            if (p.battleTag && !onlineTags.has(p.battleTag) && mmr > 0) {
              onlineTags.add(p.battleTag);
              online.push({
                battleTag: p.battleTag,
                name: p.battleTag.split("#")[0],
                mmr,
                race: p.race ?? null,
                wins: 0,
                losses: 0,
                rank: null,
              });
            }
          }
        }
      }
    }
    return online;
  }, [playersWithStats, matches]);

  const currentDigest = allDigests[digestIdx] || null;
  const digestLabel = currentDigest ? formatDigestLabel(currentDigest.date) : null;

  return (
    <div className="home">
      <div className="home-columns">
        <div className="home-col-digest">
          {allDigests.length > 0 && (
            <DigestBanner
              digest={currentDigest}
              nameSet={nameSet}
              nameToTag={nameToTag}
              label={digestLabel}
              dateTabs={allDigests.map((d, i) => ({
                label: formatDigestLabel(d.date),
                active: i === digestIdx,
                onClick: () => setDigestIdx(i),
              }))}
            />
          )}
        </div>
        <div className="home-col-chart">
          {stripPlayers.length > 0 && (
            <MmrChart players={stripPlayers} matches={matches} count={onlineUsers.length} histogram={histogram} />
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;
