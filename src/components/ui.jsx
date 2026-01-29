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

// ============================================
// OVERLAY CONTAINERS
// ============================================
// For stream overlays (OBS/Streamlabs browser sources)
// Use transparent body: body { background: transparent !important; }

/**
 * OverlayCard - Main container for stream overlays
 * Uses --overlay-medium by default, can override with $bg prop
 * Border uses gold with 0.4 opacity for subtle framing
 */
export const OverlayCard = styled.div`
  background: ${p => p.$bg || 'var(--overlay-medium)'};
  border: 1px solid rgba(252, 219, 51, 0.4);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  text-align: ${p => p.$center ? 'center' : 'left'};
`;

/**
 * OverlayGradient - Radial gradient fade for less harsh edges
 * Good for centered content that fades to transparent
 */
export const OverlayGradient = styled.div`
  background: radial-gradient(
    ellipse at center,
    var(--overlay-medium) 0%,
    var(--overlay-light) 60%,
    transparent 100%
  );
  padding: var(--space-6);
  text-align: center;
`;

/**
 * OverlayFrosted - Frosted glass effect
 * Uses backdrop-filter blur for modern browsers
 */
export const OverlayFrosted = styled.div`
  background: rgba(20, 20, 30, 0.7);
  backdrop-filter: blur(8px);
  border: 1px solid var(--surface-3);
  border-radius: var(--radius-md);
  padding: var(--space-4);
`;

/**
 * OverlayMinimal - Minimal dark panel with gradient
 * Subtle gold border, good for match overlays
 */
export const OverlayMinimal = styled.div`
  background: linear-gradient(
    180deg,
    rgba(30, 30, 30, 0.95) 0%,
    rgba(15, 15, 15, 0.98) 100%
  );
  border: 1px solid rgba(252, 219, 51, 0.3);
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-4);
`;

// ============================================
// TINTED SURFACES
// ============================================

export const GoldSurface = styled.div`
  background: var(--gold-tint);
  border: 1px solid rgba(252, 219, 51, 0.3);
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-4);
`;

export const WinSurface = styled.div`
  background: var(--green-tint);
  border: 1px solid rgba(74, 222, 128, 0.3);
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-4);
`;

export const LossSurface = styled.div`
  background: var(--red-tint);
  border: 1px solid rgba(248, 113, 113, 0.3);
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-4);
`;

// ============================================
// MMR BAR
// ============================================
// Gradient bar showing current MMR between all-time low/peak

export const MmrBarTrack = styled.div`
  position: relative;
  height: var(--space-2);
  background: linear-gradient(to right, var(--red), var(--grey-light), var(--green));
  border-radius: var(--radius-full);
`;

export const MmrBarMarker = styled.div`
  position: absolute;
  top: 50%;
  left: ${p => p.$position || '50%'};
  transform: translate(-50%, -50%);
  width: 12px;
  height: 12px;
  background: var(--gold);
  border: 2px solid #000;
  border-radius: var(--radius-full);
`;

export const MmrBarLabels = styled.div`
  display: flex;
  justify-content: space-between;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--grey-light);
  margin-top: var(--space-1);
`;
