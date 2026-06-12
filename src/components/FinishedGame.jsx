import React, { useState, useEffect } from "react";
import styled from "styled-components";
import Game from "./Game";
import PeonLoader from "./PeonLoader";
import PlayerPlaystyleCard from "./PlayerPlaystyleCard";
import { preprocessPlayerScores } from "../lib/utils";
import { cache } from "../lib/cache";
import { enrichPlayerData } from "../lib/gameDataUtils";
import { getMatchBlurb } from "../lib/api";
import { computeNote, noteContextFromMatch } from "../lib/matchNotes";

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

      // "Interesting game" blurb — heuristics first; when they find nothing,
      // ask the relay's LLM ticker for a drama angle (streaks, rivalries)
      const note = computeNote(noteContextFromMatch(data.match), {
        playerScores: data.playerScores,
        matchPlayers: (data.match.teams || []).flatMap((t) => t.players || []),
      });
      if (note) {
        setMetaData((prev) => (prev ? { ...prev, note } : prev));
      } else {
        const tryBlurb = (attempt = 0) =>
          getMatchBlurb(data.match.id).then(({ blurb, pending, retryInMs }) => {
            if (blurb) {
              setMetaData((prev) => (prev ? { ...prev, note: { text: blurb, tag: null } } : prev));
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
          <Game playerData={playerData} metaData={metaData} profilePics={profilePics} playerCountries={playerCountries} sessionData={sessionData} compact={compact} />

          {/* Playstyle Section */}
          {!compact && (
            <PlaystyleSection>
              <SectionHeader>
                <SectionTitle>Player Playstyles</SectionTitle>
                <SectionSubtitle>Behavioral fingerprints from APM, hotkey usage, and action patterns</SectionSubtitle>
              </SectionHeader>

              <TeamsContainer>
                {/* Team 1 */}
                <TeamColumn>
                  <TeamLabel $team={1}>Team 1</TeamLabel>
                  <PlaystyleGrid>
                    {displayPlayers.slice(0, 4).map((player) => (
                      <PlayerPlaystyleCard
                        key={player.battleTag}
                        battleTag={player.battleTag}
                        race={player.race}
                        compact
                      />
                    ))}
                  </PlaystyleGrid>
                </TeamColumn>

                {/* Team 2 */}
                <TeamColumn>
                  <TeamLabel $team={2}>Team 2</TeamLabel>
                  <PlaystyleGrid>
                    {displayPlayers.slice(4).map((player) => (
                      <PlayerPlaystyleCard
                        key={player.battleTag}
                        battleTag={player.battleTag}
                        race={player.race}
                        compact
                      />
                    ))}
                  </PlaystyleGrid>
                </TeamColumn>
              </TeamsContainer>
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
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-8);

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    gap: var(--space-6);
  }
`;

const TeamColumn = styled.div``;

const TeamLabel = styled.h3`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: ${(p) => (p.$team === 1 ? "var(--team-blue)" : "var(--red)")};
  margin-bottom: var(--space-4);
  text-transform: uppercase;
  letter-spacing: 0.1em;
`;

const PlaystyleGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-4);

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

export default FinishedGame;
