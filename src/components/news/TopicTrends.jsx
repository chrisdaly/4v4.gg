import React, { useMemo } from "react";
import { parseDigestSections } from "../../lib/digestUtils";
import "./TopicTrends.css";

const TAXONOMY = new Set([
  "balance", "map pool", "race war", "griefing", "matchmaking",
  "meta", "tournament", "player beef", "ban drama", "tech issues",
  "memes", "stream drama",
]);

const TopicTrends = ({ digests }) => {
  const { topics, dates, matrix } = useMemo(() => {
    if (!digests || digests.length < 2) return { topics: [], dates: [], matrix: {} };

    // Parse topics from each digest, keeping only taxonomy matches
    const dateTopics = [];
    for (const d of digests) {
      const text = d.digest || "";
      const sections = parseDigestSections(text);
      const topicSec = sections.find((s) => s.key === "TOPICS");
      if (!topicSec) continue;
      const tags = topicSec.content
        .split(/,\s*/)
        .map((t) => t.trim().toLowerCase())
        .filter((t) => TAXONOMY.has(t));
      if (tags.length > 0) {
        dateTopics.push({ date: d.date, tags });
      }
    }

    if (dateTopics.length < 2) return { topics: [], dates: [], matrix: {} };

    // Count frequency per topic
    const freq = new Map();
    for (const { tags } of dateTopics) {
      for (const tag of tags) {
        freq.set(tag, (freq.get(tag) || 0) + 1);
      }
    }

    // Sort topics by frequency (most common first)
    const sortedTopics = [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([t]) => t);

    // Build date list (chronological)
    const sortedDates = dateTopics.map((d) => d.date).reverse();

    // Build matrix: topic -> date -> present
    const mat = {};
    for (const topic of sortedTopics) {
      mat[topic] = {};
      for (const { date, tags } of dateTopics) {
        mat[topic][date] = tags.includes(topic);
      }
    }

    return { topics: sortedTopics, dates: sortedDates, matrix: mat };
  }, [digests]);

  if (topics.length === 0) return null;

  const formatDate = (dateStr) => {
    const d = new Date(dateStr + "T12:00:00");
    const days = ["S", "M", "T", "W", "T", "F", "S"];
    return days[d.getDay()];
  };

  return (
    <div className="topic-trends">
      <div className="topic-trends-header">Topic Trends</div>
      <div className="topic-trends-grid" style={{ "--cols": dates.length }}>
        {/* Column headers (dates) */}
        <div className="topic-trends-corner" />
        {dates.map((date) => (
          <div key={date} className="topic-trends-date" title={date}>
            {formatDate(date)}
          </div>
        ))}

        {/* Rows (topics) */}
        {topics.map((topic) => (
          <React.Fragment key={topic}>
            <div className="topic-trends-label">{topic}</div>
            {dates.map((date) => (
              <div
                key={`${topic}-${date}`}
                className={`topic-trends-cell${matrix[topic][date] ? " topic-trends-cell--active" : ""}`}
                title={`${topic} — ${date}`}
              />
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default TopicTrends;
