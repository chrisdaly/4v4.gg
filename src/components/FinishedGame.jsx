import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";
import Game from "./Game";
import PeonLoader from "./PeonLoader";
import PlayerPlaystyleCard from "./PlayerPlaystyleCard";
import { renderBlurbText } from "./MatchNote";
import { preprocessPlayerScores } from "../lib/utils";
import { cache } from "../lib/cache";
import { enrichPlayerData } from "../lib/gameDataUtils";
import { getMatchBlurb } from "../lib/api";
import { computeNote, noteContextFromMatch } from "../lib/matchNotes";
import useAdmin from "../lib/useAdmin";

// Get cached player data for a finished match
const getCachedMatchPlayerData = (matchId) => {
  return cache.get(`finishedMatchPlayers:${matchId}`);
};

const FinishedGame = ({ data, compact = false }) => {
  const matchId = data?.match?.id;
  const cachedData = matchId ? getCachedMatchPlayerData(matchId) : null;

  // Initialize from cache for instant display
  const [playerData, setPlayerData] = useState(cachedData?.playerData || null);
  const [metaData, setMetaData] = useState(cachedData?.metaData || null);
  const [profilePics, setProfilePics] = useState(cachedData?.profilePics || {});
  const [playerCountries, setPlayerCountries] = useState(cachedData?.countries || {});
  const [sessionData, setSessionData] = useState(cachedData?.sessions || {});
  const [isLoading, setIsLoading] = useState(!cachedData && !compact);
  const [gameProfiles, setGameProfiles] = useState(null);
  const { adminKey } = useAdmin();

  useEffect(() => {
    if (matchId && !compact) {
      fetch(`${import.meta.env.VITE_CHAT_RELAY_URL || "https://4v4gg-chat-relay.fly.dev"}/api/fingerprints/match/${encodeURIComponent(matchId)}`)
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d?.profiles?.length) setGameProfiles(d.profiles); })
        .catch(() => {});
    }
  }, [matchId, compact]);

  useEffect(() => {
    fetchMatchData();
  }, []);

  const fetchMatchData = async () => {
    try {
      if (!data) {
        throw new Error("Invalid match data format");
      }
      const processedData = preprocessPlayerScores(data.match, data.playerScores);
      const { playerData: newPlayerData, metaData: newMetaData } = processedData;
      const fullMetaData = { ...newMetaData, matchId: data.match.id };
      setPlayerData(newPlayerData);
      setMetaData(fullMetaData);

      // Heuristics describe the game itself and stay accurate forever.
      // Relay blurb includes streak/H2H context that's only meaningful in the
      // moment — only use it as a fallback when heuristics find nothing.
      const note = computeNote(noteContextFromMatch(data.match), {
        playerScores: data.playerScores,
        matchPlayers: (data.match.teams || []).flatMap((t) => t.players || []),
      });
      if (note) {
        setMetaData((prev) => (prev ? { ...prev, note } : prev));
      } else {
        const tryBlurb = (attempt = 0) =>
          getMatchBlurb(data.match.id).then(({ blurb, parts, pending, retryInMs }) => {
            // Match page: show headline only (timeless). Fall back to blurb for old rows.
            const text = parts?.headline || blurb;
            if (text) {
              setMetaData((prev) => (prev ? { ...prev, note: { text, tag: null } } : prev));
            }
            if (pending && attempt < 2) {
              setTimeout(() => tryBlurb(attempt + 1), retryInMs || 5 * 60 * 1000);
            }
          });
        tryBlurb();
      }

      // In compact mode, skip fetching extra player data for faster loading
      if (compact) {
        setIsLoading(false);
      } else {
        // If we have cached data, still refresh but don't show loading
        if (!cachedData) {
          setIsLoading(true);
        }
        await fetchPlayerData(newPlayerData, fullMetaData);
      }
    } catch (error) {
      console.error("Error fetching match data:", error.message);
      setIsLoading(false);
    }
  };

  const fetchPlayerData = async (processedData, freshMetaData) => {
    try {
      const result = await enrichPlayerData(processedData, {
        fetchSessions: true,
        fetchTwitchStatus: false,
      });

      // Merge with existing data to prevent flash of missing content
      setProfilePics(prev => ({ ...prev, ...result.profilePics }));
      setPlayerCountries(prev => ({ ...prev, ...result.countries }));
      setSessionData(prev => ({ ...prev, ...result.sessions }));

      // Cache all player data for this match (30 minute TTL - finished match data is stable)
      if (matchId) {
        cache.set(`finishedMatchPlayers:${matchId}`, {
          playerData: processedData,
          metaData: freshMetaData,
          profilePics: result.profilePics,
          countries: result.countries,
          sessions: result.sessions,
        }, 30 * 60 * 1000);
      }
    } catch (error) {
      console.error("Error fetching player data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Reorder players: team 1 reversed, team 2 normal (same logic as Game component)
  const displayPlayers = playerData
    ? [...playerData.slice(0, 4).reverse(), ...playerData.slice(4)]
    : [];

  return (
    <>
      {isLoading ? (
        <div className="page-loader">
          <PeonLoader />
        </div>
      ) : playerData ? (
        <>
          {adminKey && !compact && data?.match?.id && (
            <MatchActions>
              <BlurbLabLink to={`/blurb-lab?id=${encodeURIComponent(data.match.id)}`}>
                blurb lab →
              </BlurbLabLink>
            </MatchActions>
          )}
          <Game playerData={playerData} metaData={metaData} profilePics={profilePics} playerCountries={playerCountries} sessionData={sessionData} compact={compact} />
          {metaData?.note && !compact && (
            <NoteFooter>
              {(() => {
                const note = metaData.note;
                if (typeof note === "string") return renderBlurbText(note);
                if (note.tag) return (
                  <>
                    <HeadlinePlayerName to={`/player/${encodeURIComponent(note.tag)}`}>
                      {note.name}
                    </HeadlinePlayerName>
                    {" "}{renderBlurbText(note.text)}
                  </>
                );
                return renderBlurbText(note.text);
              })()}
            </NoteFooter>
          )}

          {/* Playstyle Section — only shown when replay exists for this match */}
          {!compact && gameProfiles && (
            <PlaystyleSection>
              <SectionHeader>
                <SectionTitle>Player Playstyles</SectionTitle>
                <SectionSubtitle>Fingerprints from this game's replay — APM, hotkey usage, and action patterns</SectionSubtitle>
              </SectionHeader>

              {[1, 2].map((team) => {
                const teamProfiles = gameProfiles.filter(p => p.teamId === team);
                if (!teamProfiles.length) return null;
                return (
                  <TeamColumn key={team} style={{ marginBottom: "var(--space-6)" }}>
                    <TeamLabel $team={team}>Team {team}</TeamLabel>
                    <PlaystyleGrid>
                      {teamProfiles.map((p) => (
                        <PlayerPlaystyleCard
                          key={p.battleTag || p.playerName}
                          battleTag={p.battleTag}
                          race={p.race}
                          compact
                          preloadedProfile={p.profileData}
                        />
                      ))}
                    </PlaystyleGrid>
                  </TeamColumn>
                );
              })}
            </PlaystyleSection>
          )}
        </>
      ) : (
        <div>Error: Failed to load match data</div>
      )}
    </>
  );
};

// ── Styled Components ────────────────────────────

const MatchActions = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-4) 0;

  .match-w3c-link {
    display: flex;
    align-items: center;
    opacity: 0.4;
    transition: opacity 0.15s;
    &:hover { opacity: 0.9; }
  }

  .match-w3c-logo {
    height: 14px;
    width: auto;
    display: block;
  }
`;

const NoteFooter = styled.div`
  text-align: center;
  padding: var(--space-4) var(--space-8) var(--space-2);
  max-width: 700px;
  margin: 0 auto;
  font-family: var(--font-body);
  font-size: var(--text-sm);
  font-style: italic;
  color: var(--gold);
  opacity: 0.85;
  line-height: 1.5;

  @media (max-width: 768px) {
    font-size: var(--text-xs);
    padding: var(--space-3) var(--space-4) var(--space-2);
  }
`;

const HeadlinePlayerName = styled(Link)`
  font-family: var(--font-display);
  font-style: normal;
  color: var(--gold);
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;

const BlurbLabLink = styled(Link)`
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  color: var(--grey-dark);
  text-decoration: none;
  &:hover { color: var(--grey-light); }
`;

const PlaystyleSection = styled.section`
  max-width: 1400px;
  margin: var(--space-8) auto 0;
  padding: 0 var(--space-4);
`;

const SectionHeader = styled.div`
  text-align: center;
  margin-bottom: var(--space-6);
`;

const SectionTitle = styled.h2`
  font-family: var(--font-display);
  font-size: var(--text-lg);
  color: var(--gold);
  margin-bottom: var(--space-2);
`;

const SectionSubtitle = styled.p`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--grey-light);
`;

const TeamsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
`;

const TeamColumn = styled.div``;

const TeamLabel = styled.h3`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: ${(p) => (p.$team === 1 ? "var(--team-blue)" : "var(--red)")};
  margin-bottom: var(--space-3);
  text-transform: uppercase;
  letter-spacing: 0.1em;
`;

const PlaystyleGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-3);

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

export default FinishedGame;
