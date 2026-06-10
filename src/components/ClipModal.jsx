import React, { useEffect, useRef } from "react";

const twitchParents = () => {
  const hosts = new Set([window.location.hostname, "localhost"]);
  return [...hosts].map((h) => `parent=${encodeURIComponent(h)}`).join("&");
};

export default function ClipModal({ clip, onClose, children }) {
  const backdropRef = useRef(null);
  const parents = twitchParents();
  const embedSrc = clip.embed_url
    ? `${clip.embed_url}&${parents}&autoplay=true`
    : `https://clips.twitch.tv/embed?clip=${clip.clip_id}&${parents}&autoplay=true`;

  useEffect(() => {
    backdropRef.current?.focus();
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [onClose]);

  return (
    <div className="clip-modal-backdrop" ref={backdropRef} tabIndex={-1} onClick={onClose}>
      <div className="clip-modal" onClick={(e) => e.stopPropagation()}>
        <button className="clip-modal-close" onClick={onClose}>&times;</button>
        <iframe
          className="clip-modal-embed"
          src={embedSrc}
          allowFullScreen
          title={clip.title}
        />
        <div className="clip-modal-info">
          <h2 className="clip-modal-title">{clip.title}</h2>
          {children}
        </div>
      </div>
    </div>
  );
}
