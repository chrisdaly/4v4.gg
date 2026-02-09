import React, { useState, useEffect } from "react";
import { Link, useHistory } from "react-router-dom";
import { GiCrossedSwords } from "react-icons/gi";

import OngoingGame from "../components/OngoingGame";
import ChatPanel from "../components/ChatPanel";
import useChatStream from "../lib/useChatStream";
import { useTheme } from "../lib/ThemeContext";
import { calculateTeamMMR } from "../lib/utils";
import { getOngoingMatches, getOngoingMatchesCached } from "../lib/api";

const RELAY_URL =
  import.meta.env.VITE_CHAT_RELAY_URL || "https://4v4gg-chat-relay.fly.dev";

const emptyMap = new Map();
const emptySet = new Set();

// Sort matches by team MMR (highest first)
const sortByMMR = (matches) => {
  if (!matches) return [];
  return matches.slice().sort((a, b) => {
    const teamAMMR = calculateTeamMMR(a.teams);
    const teamBMMR = calculateTeamMMR(b.teams);
    return teamBMMR - teamAMMR;
  });
};

// Initialize from cache for instant UI on navigation
const getInitialData = () => {
  const cached = getOngoingMatchesCached();
  if (cached?.matches) {
    return sortByMMR(cached.matches);
  }
  return null;
};

const DigestBanner = ({ digest }) => {
  if (!digest) return null;
  return (
    <div className="dashboard-digest">
      <div className="dashboard-digest-label">Yesterday in 4v4</div>
      {digest.digest}
    </div>
  );
};

const OngoingGames = () => {
  const history = useHistory();
  const [ongoingGameData, setOngoingGameData] = useState(getInitialData);
  const [isLoading, setIsLoading] = useState(() => getInitialData() === null);
  const [digest, setDigest] = useState(null);

  const { messages, status, botResponses, translations } = useChatStream();
  const { borderTheme } = useTheme();

  // Fetch most recent digest on mount
  useEffect(() => {
    fetch(`${RELAY_URL}/api/admin/digests`)
      .then((r) => r.ok ? r.json() : [])
      .then((digests) => {
        if (digests.length > 0) setDigest(digests[0]);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchOngoingMatchesData();
    const interval = setInterval(fetchOngoingMatchesData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchOngoingMatchesData = async () => {
    try {
      const data = await getOngoingMatches();
      const sortedMatches = sortByMMR(data.matches);
      setOngoingGameData(sortedMatches);
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching match data:", error.message);
      setIsLoading(false);
    }
  };

  const gamesContent = isLoading ? (
    <div className="page-loader">
      <div className="loader-spinner lg" />
      <span className="loader-text">Loading matches</span>
    </div>
  ) : ongoingGameData && ongoingGameData.length > 0 ? (
    <div className="dashboard-games">
      {ongoingGameData.map((d) => (
        <div
          key={d.id}
          className="game-clickable"
          onClick={(e) => {
            if (e.target.closest("a")) return;
            history.push(`/match/${d.id}`);
          }}
        >
          <OngoingGame ongoingGameData={d} />
        </div>
      ))}
    </div>
  ) : ongoingGameData ? (
    <div className="empty-state">
      <GiCrossedSwords className="empty-state-icon" />
      <h2 className="empty-state-title">No Live Games</h2>
      <p className="empty-state-text">No 4v4 matches are being played right now</p>
      <Link to="/finished" className="empty-state-link">View recently finished games</Link>
    </div>
  ) : (
    <div>
      Error: Failed to load match data
      <p>{JSON.stringify(ongoingGameData)}</p>
    </div>
  );

  return (
    <div className="dashboard">
      <DigestBanner digest={digest} />
      <div className="dashboard-columns">
        {gamesContent}
        <div className="dashboard-chat">
          <ChatPanel
            messages={messages}
            status={status}
            avatars={emptyMap}
            stats={emptyMap}
            sessions={emptyMap}
            inGameTags={emptySet}
            recentWinners={emptySet}
            botResponses={botResponses}
            translations={translations}
            borderTheme={borderTheme}
          />
        </div>
      </div>
    </div>
  );
};

export default OngoingGames;
