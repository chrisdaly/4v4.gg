import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { parseDigestSections, extractMentionedTags } from "../../lib/digestUtils";
import "./BeefTracker.css";

const BeefTracker = ({ digests, nameToTag }) => {
  const [collapsed, setCollapsed] = useState(true);

  const { dramaKings, rivalries } = useMemo(() => {
    if (!digests || digests.length < 2 || !nameToTag || nameToTag.size === 0) {
      return { dramaKings: [], rivalries: [] };
    }

    const playerCounts = new Map();
    const pairCounts = new Map();

    for (const d of digests) {
      const text = d.digest || "";
      const sections = parseDigestSections(text);
      const dramaSec = sections.find((s) => s.key === "DRAMA");
      if (!dramaSec) continue;

      const items = dramaSec.content.split(/;\s*/).map((s) => s.trim()).filter(Boolean);
      for (const item of items) {
        const tags = extractMentionedTags(item, nameToTag);
        for (const tag of tags) {
          playerCounts.set(tag, (playerCounts.get(tag) || 0) + 1);
        }
        // Track pairs (co-mentions in same drama item)
        if (tags.length >= 2) {
          for (let i = 0; i < tags.length; i++) {
            for (let j = i + 1; j < tags.length; j++) {
              const pair = [tags[i], tags[j]].sort().join("||");
              pairCounts.set(pair, (pairCounts.get(pair) || 0) + 1);
            }
          }
        }
      }
    }

    const kings = [...playerCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag, count]) => ({ tag, name: tag.split("#")[0], count }));

    const maxCount = kings[0]?.count || 1;
    for (const k of kings) {
      k.pct = Math.round((k.count / maxCount) * 100);
    }

    const rivs = [...pairCounts.entries()]
      .filter(([, c]) => c >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([pair, count]) => {
        const [a, b] = pair.split("||");
        return { a, aName: a.split("#")[0], b, bName: b.split("#")[0], count };
      });

    return { dramaKings: kings, rivalries: rivs };
  }, [digests, nameToTag]);

  if (dramaKings.length === 0) return null;

  return (
    <div className="beef-tracker">
      <button className="beef-tracker-header" onClick={() => setCollapsed((c) => !c)}>
        <span className="beef-tracker-title">Beef Tracker</span>
        <span className="beef-tracker-toggle">{collapsed ? "+" : "\u2212"}</span>
      </button>
      {!collapsed && (
        <div className="beef-tracker-body">
          <div className="beef-tracker-section">
            <div className="beef-tracker-section-label">Most featured in drama across {digests.length} digests</div>
            <div className="beef-tracker-bars">
              {dramaKings.map((k) => (
                <div key={k.tag} className="beef-tracker-bar-row">
                  <Link
                    to={`/player/${encodeURIComponent(k.tag)}`}
                    className="beef-tracker-name"
                  >
                    {k.name}
                  </Link>
                  <div className="beef-tracker-bar-wrap">
                    <div className="beef-tracker-bar" style={{ width: `${k.pct}%` }} />
                  </div>
                  <span className="beef-tracker-count">{k.count} {k.count === 1 ? "mention" : "mentions"}</span>
                </div>
              ))}
            </div>
          </div>
          {rivalries.length > 0 && (
            <div className="beef-tracker-section">
              <div className="beef-tracker-section-label">Players beefing in the same drama</div>
              <div className="beef-tracker-rivalries">
                {rivalries.map((r, i) => (
                  <div key={i} className="beef-tracker-rivalry">
                    <Link
                      to={`/player/${encodeURIComponent(r.a)}`}
                      className="beef-tracker-rival-name"
                    >
                      {r.aName}
                    </Link>
                    <span className="beef-tracker-vs">vs</span>
                    <Link
                      to={`/player/${encodeURIComponent(r.b)}`}
                      className="beef-tracker-rival-name"
                    >
                      {r.bName}
                    </Link>
                    <span className="beef-tracker-rivalry-count">{r.count}x</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BeefTracker;
