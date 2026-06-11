import React from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import crownIcon from "../assets/icons/king.svg";
import { raceMapping, raceIcons } from "../lib/constants";
import { MmrComparison } from "./MmrComparison";
import PlayerHoverCard from "./PlayerHoverCard";

/* Compact match scoreboard: two vertical team columns with the MMR dot
   chart between them. Shared by chat game-event cards and the Active
   Games sidebar so the miniature match layout stays consistent. */

const TeamsRow = styled.div`
  display: flex;
  align-items: stretch;
  gap: var(--space-3);
`;

const TeamCol = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  ${(p) => p.$right && "align-items: flex-end; text-align: right;"}
  ${(p) => p.$dim && "opacity: 0.55;"}
`;

const TeamHeader = styled.div`
  display: flex;
  align-items: center;
  min-height: 13px;
  margin-bottom: 2px;
`;

const Crown = styled.img`
  width: 13px;
  height: 13px;
  flex-shrink: 0;
  filter: drop-shadow(0 0 3px rgba(252, 219, 51, 0.4));
`;

const PlayerRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  max-width: 100%;
  flex-direction: ${(p) => (p.$reverse ? "row-reverse" : "row")};
`;

const RaceImg = styled.img`
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  opacity: ${(p) => (p.$faded ? 0.4 : 0.85)};
`;

const PlayerNameLink = styled(Link)`
  font-family: var(--font-display);
  font-size: var(--text-xs);
  color: var(--gold);
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  display: block;

  &:hover {
    text-decoration: underline;
  }
`;

const ChartMid = styled.div`
  width: 64px;
  flex-shrink: 0;

  @media (max-width: 560px) {
    display: none;
  }
`;

/**
 * teamA / teamB: { players: [{battleTag, name, race, mmr}], winner }
 * dimLosers: fade the non-winner column (finished games)
 * showChart: render the vertical MMR dot chart between the columns
 *            (fixed 700–2700 scale so dot height compares across games)
 * hoverData: optional { avatars, stats, sessions, inGameTags, inGameInfoMap }
 *            — enables PlayerHoverCard on names when the caller has the maps
 */
export default function MiniTeamsRow({ teamA, teamB, dimLosers = false, showChart = true, hoverData = null }) {
  const renderName = (p) => {
    const link = (
      <PlayerNameLink
        to={`/player/${encodeURIComponent(p.battleTag || p.name)}`}
        onClick={(e) => e.stopPropagation()}
      >
        {p.name}
      </PlayerNameLink>
    );
    if (!hoverData || !p.battleTag) return link;
    return (
      <PlayerHoverCard
        battleTag={p.battleTag}
        avatars={hoverData.avatars}
        stats={hoverData.stats}
        sessions={hoverData.sessions}
        inGameInfo={hoverData.inGameTags?.has(p.battleTag) ? hoverData.inGameInfoMap?.get(p.battleTag) : null}
        style={{ minWidth: 0, maxWidth: "100%" }}
      >
        {link}
      </PlayerHoverCard>
    );
  };

  const showHeader = teamA.winner || teamB.winner;

  const renderTeamCol = (team, { right = false } = {}) => (
    <TeamCol $right={right} $dim={dimLosers && !team.winner}>
      {showHeader && (
        <TeamHeader>
          {team.winner && <Crown src={crownIcon} alt="winners" />}
        </TeamHeader>
      )}
      {(team.players || []).map((p, i) => (
        <PlayerRow key={p.battleTag || i} $reverse={right}>
          <RaceImg
            src={(p.race != null && raceMapping[p.race]) || raceIcons.random}
            alt=""
            $faded={p.race == null}
          />
          {renderName(p)}
        </PlayerRow>
      ))}
    </TeamCol>
  );

  const hasChart = showChart && (teamA.players || []).some((p) => p.mmr > 0);

  return (
    <TeamsRow>
      {renderTeamCol(teamA)}
      {hasChart && (
        <ChartMid>
          <MmrComparison
            data={{
              teamOneMmrs: (teamA.players || []).map((p) => p.mmr || 0),
              teamTwoMmrs: (teamB.players || []).map((p) => p.mmr || 0),
            }}
            compact
            hideLabels
          />
        </ChartMid>
      )}
      {renderTeamCol(teamB, { right: true })}
    </TeamsRow>
  );
}
