import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

/**
 * The reads card: the latest weekly issue and the latest blog post taking
 * turns every six seconds (crossfade), each on its own art under a bottom
 * fade. The pager bars in the corner pin one.
 *
 * Props: items [{ key, kicker, title, sub, bg, fallbackBg?, href }],
 * rotateSeconds
 */

function Art({ bg, fallbackBg }) {
  const [src, setSrc] = useState(bg);
  useEffect(() => setSrc(bg), [bg]);
  return (
    <>
      <div className="hm-read-bg" style={{ backgroundImage: `url(${src})` }} />
      {fallbackBg && src !== fallbackBg && (
        <img src={bg} alt="" style={{ display: "none" }} onError={() => setSrc(fallbackBg)} />
      )}
    </>
  );
}

export default function ReadsCarousel({ items = [], rotateSeconds = 6 }) {
  const [idx, setIdx] = useState(0);
  const [pinned, setPinned] = useState(null);
  const count = items.length;
  useEffect(() => {
    if (count < 2 || pinned != null) return undefined;
    const id = setInterval(() => setIdx((i) => (i + 1) % count), rotateSeconds * 1000);
    return () => clearInterval(id);
  }, [count, rotateSeconds, pinned]);
  if (count === 0) return null;
  const active = pinned != null ? Math.min(pinned, count - 1) : Math.min(idx, count - 1);
  return (
    <div className="hm-reads" data-reads={count}>
      {items.map((it, i) => (
        <Link
          key={it.key}
          to={it.href}
          className={`hm-read ${i === active ? "is-active" : ""}`}
          data-read={it.key}
          aria-hidden={i === active ? undefined : "true"}
          tabIndex={i === active ? 0 : -1}
        >
          <Art bg={it.bg} fallbackBg={it.fallbackBg} />
          <div className="hm-read-fade" />
          <span className="hm-read-kicker">{it.kicker}</span>
          <span className="hm-read-title">{it.title}</span>
          {it.sub && <span className="hm-read-sub">{it.sub}</span>}
        </Link>
      ))}
      {count > 1 && (
        <div className="hm-read-pager">
          {items.map((it, i) => (
            <button
              key={it.key}
              type="button"
              aria-label={it.title}
              aria-pressed={i === active}
              className={`hm-pager-bar ${i === active ? "is-active" : ""}`}
              onClick={() => setPinned(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
