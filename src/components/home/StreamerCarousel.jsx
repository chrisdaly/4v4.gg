import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

/**
 * The live streamer card (80px): one 4v4 streamer at a time, crossfading
 * every six seconds. Thumbnail from Twitch's live preview with the LIVE
 * badge, name, stream title, viewers and "i / n". Links to the streamer's
 * /stream page. Renders nothing while nobody in the channel is live.
 *
 * Props: liveStreamers (Map battleTag -> { twitchName, title, viewerCount },
 * from useTwitchLive), onlineUsers (for display names), rotateSeconds
 */

const THUMB = (login) => `https://static-cdn.jtvnw.net/previews-ttv/live_user_${login}-208x116.jpg`;

export default function StreamerCarousel({ liveStreamers, onlineUsers = [], rotateSeconds = 6 }) {
  const streams = useMemo(() => {
    const names = new Map(onlineUsers.map((u) => [u.battleTag, u.name]));
    return [...(liveStreamers || new Map()).entries()]
      .map(([tag, info]) => ({ tag, name: names.get(tag) || tag.split("#")[0], ...info }))
      .sort((a, b) => (b.viewerCount || 0) - (a.viewerCount || 0));
  }, [liveStreamers, onlineUsers]);
  const [idx, setIdx] = useState(0);
  const count = streams.length;
  useEffect(() => {
    if (count < 2) return undefined;
    const id = setInterval(() => setIdx((i) => (i + 1) % count), rotateSeconds * 1000);
    return () => clearInterval(id);
  }, [count, rotateSeconds]);
  if (count === 0) return null;
  const active = Math.min(idx, count - 1);
  return (
    <div className="hm-streams" data-streamers={count}>
      {streams.map((s, i) => (
        <Link
          key={s.tag}
          to={`/stream/${encodeURIComponent(s.tag)}`}
          className={`hm-stream hm-panel ${i === active ? "is-active" : ""}`}
          data-stream={s.tag}
          aria-hidden={i === active ? undefined : "true"}
          tabIndex={i === active ? 0 : -1}
        >
          <div className="hm-stream-thumb" style={{ backgroundImage: `url(${THUMB(s.twitchName)})` }}>
            <span className="hm-stream-live">
              <span className="hm-stream-live-dot" />
              LIVE
            </span>
          </div>
          <div className="hm-stream-body">
            <span className="hm-stream-top">
              <span className="hm-stream-name">{s.name}</span>
              <span className="hm-stream-pos">{i + 1} / {count}</span>
            </span>
            <span className="hm-stream-title">{s.title || "Live on Twitch"}</span>
            <span className="hm-stream-viewers">{(s.viewerCount || 0).toLocaleString("en-US")} watching</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
