import React, { useState, useRef, useCallback } from "react";
import styled from "styled-components";
import { GiCrossedSwords } from "react-icons/gi";
import { raceMapping, raceIcons } from "../lib/constants";
import { CountryFlag } from "./ui";
import FormDots from "./FormDots";

const HOVER_DELAY_MS = 350;

const Anchor = styled.span`
  position: relative;
  display: inline-flex;
  min-width: 0;
`;

const Card = styled.div`
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 10010;
  width: 230px;
  padding: var(--space-2) var(--space-3);
  background: linear-gradient(180deg, rgba(30, 24, 16, 0.98) 0%, rgba(15, 12, 8, 0.99) 100%);
  border: 1px solid rgba(var(--gold-muted-rgb), 0.4);
  border-radius: var(--radius-md);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.7);
  pointer-events: none;
`;

const TopRow = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
`;

const CardAvatar = styled.img`
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  flex-shrink: 0;
  ${(p) => p.$placeholder && "padding: 6px; background: rgba(255,255,255,0.06); opacity: 0.6; box-sizing: border-box;"}
`;

const NameCol = styled.div`
  min-width: 0;
`;

const CardName = styled.div`
  font-family: var(--font-display);
  font-size: var(--text-xs);
  color: var(--gold);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
  gap: 5px;
`;

const CardMmrLine = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--white);
`;

const MmrLabel = styled.span`
  color: var(--grey-light);
  font-size: var(--text-xxxs);
`;

const StatRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  margin-top: var(--space-2);
  padding-top: var(--space-2);
  border-top: 1px solid rgba(var(--gold-muted-rgb), 0.15);
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
`;

const Wins = styled.span`
  color: var(--green);
`;

const Losses = styled.span`
  color: var(--red);
`;

const RaceIconImg = styled.img`
  width: 16px;
  height: 16px;
  flex-shrink: 0;
`;

const InGameLine = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: var(--space-1);
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--red);
`;

/**
 * Wraps children with a delayed hover card showing player context.
 * All data comes from the maps the chat page already maintains — no fetches.
 */
export default function PlayerHoverCard({ battleTag, avatars, stats, sessions, inGameInfo, style, children }) {
  const [open, setOpen] = useState(false);
  const timerRef = useRef(null);

  const onEnter = useCallback(() => {
    timerRef.current = setTimeout(() => setOpen(true), HOVER_DELAY_MS);
  }, []);

  const onLeave = useCallback(() => {
    clearTimeout(timerRef.current);
    setOpen(false);
  }, []);

  const profile = avatars?.get(battleTag);
  const playerStats = stats?.get(battleTag);
  const form = sessions?.get(battleTag);
  const name = battleTag?.split("#")[0];
  const raceIcon = playerStats?.race != null ? raceMapping[playerStats.race] : null;

  return (
    <Anchor onMouseEnter={onEnter} onMouseLeave={onLeave} style={style}>
      {children}
      {open && (
        <Card>
          <TopRow>
            {profile?.profilePicUrl ? (
              <CardAvatar src={profile.profilePicUrl} alt="" />
            ) : (
              <CardAvatar src={raceIcon || raceIcons.random} alt="" $placeholder />
            )}
            <NameCol>
              <CardName>
                {name}
                {profile?.country && (
                  <CountryFlag name={profile.country.toLowerCase()} style={{ width: 14, height: 10 }} />
                )}
                {raceIcon && <RaceIconImg src={raceIcon} alt="" />}
              </CardName>
              <CardMmrLine>
                {playerStats?.mmr != null ? (
                  <>
                    {Math.round(playerStats.mmr)} <MmrLabel>MMR</MmrLabel>
                    {playerStats.rank != null && <MmrLabel> · #{playerStats.rank}</MmrLabel>}
                  </>
                ) : (
                  <MmrLabel>Unranked</MmrLabel>
                )}
              </CardMmrLine>
            </NameCol>
          </TopRow>
          {(playerStats || form) && (
            <StatRow>
              {playerStats ? (
                <span>
                  <Wins>{playerStats.wins}W</Wins> <Losses>{playerStats.losses}L</Losses>
                </span>
              ) : (
                <span />
              )}
              {form && <FormDots form={form} size="small" />}
            </StatRow>
          )}
          {inGameInfo && (
            <InGameLine>
              <GiCrossedSwords size={11} />
              in game{inGameInfo.mapName ? ` · ${inGameInfo.mapName}` : ""}
            </InGameLine>
          )}
        </Card>
      )}
    </Anchor>
  );
}
