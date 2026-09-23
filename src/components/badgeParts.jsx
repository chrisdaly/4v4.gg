// Shared styled pieces for the small match-card badges (StreakBadges, RivalryBadge).
import { Link } from "react-router-dom";
import styled from "styled-components";

export const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  margin-top: 6px;
`;

export const Row = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
`;

export const Label = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  font-weight: 700;
  letter-spacing: 0.12em;
  min-width: 36px;
  color: ${(p) => p.$color || "var(--cyan)"};
`;

export const PlayerLink = styled(Link)`
  font-family: var(--font-display);
  font-size: var(--text-xs);
  color: var(--gold);
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
  &:hover { text-decoration: underline; }
`;

export const Dots = styled.span`
  display: flex;
  gap: 2px;
  flex-shrink: 0;
`;

export const BADGE_DOT_SIZE = 7;
