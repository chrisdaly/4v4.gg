/**
 * Shared UI Components
 * Import: import { Button, Badge, Card, Dot, TeamBar, Label } from './components/ui';
 */

import styled from "styled-components";

// ============================================
// BUTTON
// ============================================

export const Button = styled.button`
  padding: var(--space-2) var(--space-4);
  font-family: var(--font-display);
  font-size: var(--text-sm);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: opacity var(--transition);

  ${p => p.$primary && `
    background: var(--gold);
    color: #0a0a0a;
    border: none;
    &:hover { opacity: 0.9; }
  `}

  ${p => p.$secondary && `
    background: transparent;
    color: var(--gold);
    border: var(--border-thin) solid var(--gold);
    &:hover { background: rgba(252, 219, 51, 0.1); }
  `}

  ${p => p.$ghost && `
    background: transparent;
    color: var(--grey-light);
    border: var(--border-thin) solid var(--grey-mid);
    &:hover { color: #fff; border-color: var(--grey-light); }
  `}
`;

// ============================================
// BADGE
// ============================================

export const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: var(--space-1) var(--space-2);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-radius: var(--radius-full);
  background: ${p => p.$bg || 'var(--grey-dark)'};
  color: ${p => p.$color || '#fff'};
  border: 1px solid ${p => p.$border || 'var(--grey-mid)'};
`;

export const WinBadge = styled(Badge)`
  background: rgba(74, 222, 128, 0.15);
  color: var(--green);
  border-color: var(--green);
`;

export const LossBadge = styled(Badge)`
  background: rgba(248, 113, 113, 0.15);
  color: var(--red);
  border-color: var(--red);
`;

export const GoldBadge = styled(Badge)`
  background: var(--gold);
  color: #0a0a0a;
  border-color: var(--gold);
`;

// ============================================
// CARD
// ============================================

export const Card = styled.div`
  background: rgba(255, 255, 255, 0.02);
  border: var(--border-thick) solid var(--gold);
  border-radius: var(--radius-md);
  padding: var(--space-4);
`;

export const CardSubtle = styled.div`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--grey-mid);
  border-radius: var(--radius-md);
  padding: var(--space-4);
`;

// ============================================
// DOT (Win/Loss indicator)
// ============================================
// Use $recent for most recent game (larger)
// Default size: 8px, recent: 10px

export const Dot = styled.span`
  display: inline-block;
  width: ${p => p.$recent ? '10px' : '8px'};
  height: ${p => p.$recent ? '10px' : '8px'};
  border-radius: var(--radius-full);
  background: ${p => p.$win ? 'var(--green)' : 'var(--red)'};
  opacity: ${p => p.$recent ? 1 : 0.7};
`;

// ============================================
// TEAM BAR
// ============================================

export const TeamBar = styled.div`
  padding: var(--space-2) var(--space-4);
  border-left: 3px solid ${p => p.$blue ? '#3b82f6' : '#ef4444'};
  background: ${p => p.$blue ? 'rgba(59, 130, 246, 0.1)' : 'rgba(239, 68, 68, 0.1)'};
`;

// ============================================
// LABEL (Column headers, section titles)
// ============================================

export const Label = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--grey-light);
`;

// ============================================
// STAT ROW
// ============================================

export const StatRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2) var(--space-4);

  ${p => p.$alt && `background: rgba(255, 255, 255, 0.02);`}

  &:hover {
    background: rgba(255, 255, 255, 0.04);
  }
`;

export const StatLabel = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--grey-light);
`;

export const StatValue = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-base);
  color: ${p => p.$color || '#fff'};
`;

// ============================================
// PLAYER NAME
// ============================================

export const PlayerName = styled.span`
  font-family: var(--font-display);
  color: var(--gold);
  font-size: ${p => p.$size || 'var(--text-lg)'};
`;

// ============================================
// MMR VALUE
// ============================================

export const MMR = styled.span`
  font-family: var(--font-mono);
  color: #fff;
  font-size: ${p => p.$size || 'var(--text-base)'};
`;

// ============================================
// WIN/LOSS TEXT
// ============================================

export const Win = styled.span`
  color: var(--green);
`;

export const Loss = styled.span`
  color: var(--red);
`;

// ============================================
// FLEX UTILITIES
// ============================================

export const Row = styled.div`
  display: flex;
  align-items: ${p => p.$align || 'center'};
  justify-content: ${p => p.$justify || 'flex-start'};
  gap: ${p => p.$gap || 'var(--space-2)'};
  flex-wrap: ${p => p.$wrap ? 'wrap' : 'nowrap'};
`;

export const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${p => p.$gap || 'var(--space-2)'};
`;
