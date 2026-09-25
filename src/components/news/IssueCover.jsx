import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { COVER_BACKGROUNDS, hashDate } from "../../lib/digestUtils";
import { issueTitle, issueDateRange } from "../../lib/news/issueRules";

const RELAY_URL = import.meta.env.VITE_CHAT_RELAY_URL || "https://4v4gg-chat-relay.fly.dev";

/**
 * A weekly issue's cover on the news index (design handoff "News v4"):
 * the latest issue as a 21:8 banner, back issues as 16:7 grid cards. The
 * cover shows only the number, title and dates; it fades in on load and
 * has no hover motion.
 *
 * Props: weekly, issueNo, variant ("latest" | "grid"), delay (seconds)
 */

/** The issue's cover image, falling back to the week's stock art. */
export function useCoverImage(weekly) {
  const fallback = COVER_BACKGROUNDS[hashDate(weekly.week_start) % COVER_BACKGROUNDS.length];
  const coverUrl = useMemo(
    () => `${RELAY_URL}/api/admin/weekly-digest/${weekly.week_start}/cover.jpg?v=${weekly.updated_at || weekly.week_start}`,
    [weekly.week_start, weekly.updated_at]
  );
  const [bg, setBg] = useState(fallback);
  useEffect(() => {
    const img = new Image();
    img.onload = () => setBg(coverUrl);
    img.onerror = () => setBg(fallback);
    img.src = coverUrl;
  }, [coverUrl, fallback]);
  return bg;
}

export default function IssueCover({ weekly, issueNo, variant = "grid", delay = 0 }) {
  const bg = useCoverImage(weekly);
  const latest = variant === "latest";
  return (
    <Link
      to={`/news?week=${weekly.week_start}`}
      className={`nw-issue nw-issue--${variant} reveal`}
      style={{ "--delay": `${delay}s` }}
      data-issue={weekly.week_start}
      data-issue-no={issueNo ?? undefined}
    >
      <div className="nw-issue-art" style={{ backgroundImage: `url(${bg})`, backgroundPosition: weekly.cover_position || "center" }} />
      <div className="nw-issue-shade" />
      <div className="nw-issue-body">
        {latest && <span className="nw-issue-kicker">LATEST ISSUE</span>}
        {!latest && issueNo != null && <span className="nw-issue-no">No. {issueNo}</span>}
        <div className="nw-issue-text">
          {latest && issueNo != null && <span className="nw-issue-no">No. {issueNo}</span>}
          <span className="nw-issue-title">{issueTitle(weekly)}</span>
          <span className="nw-issue-rule" />
          <span className="nw-issue-range">{issueDateRange(weekly)}</span>
        </div>
      </div>
    </Link>
  );
}

/** A small issue cover (the player profile's "In the news" rows). */
export function IssueThumb({ weekly, issueNo, className = "" }) {
  const bg = useCoverImage(weekly);
  return (
    <div className={`nw-issue-thumb ${className}`} style={{ backgroundImage: `url(${bg})`, backgroundPosition: weekly.cover_position || "center" }} data-issue-thumb={weekly.week_start}>
      {issueNo != null && <span className="nw-issue-thumb-no">No. {issueNo}</span>}
    </div>
  );
}
