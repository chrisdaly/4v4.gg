/**
 * Shared UI Components
 * Import: import { Button, Badge, Card, Dot, TeamBar, Label, PageLayout } from './components/ui';
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";
import { PageLayout, PageHero } from "./PageLayout";
import { raceMapping } from "../lib/constants";

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
    color: var(--grey-dark);
    border: none;
    &:hover { opacity: 0.9; }
  `}

  ${p => p.$secondary && `
    background: transparent;
    color: var(--gold);
    border: var(--border-thin) solid var(--gold);
    &:hover { background: var(--gold-tint); }
  `}

  ${p => p.$ghost && `
    background: transparent;
    color: var(--grey-light);
    border: var(--border-thin) solid var(--grey-mid);
    &:hover { color: var(--white); border-color: var(--grey-light); }
  `}

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
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
  color: ${p => p.$color || 'var(--white)'};
  border: var(--border-thin) solid ${p => p.$border || 'var(--grey-mid)'};
`;

export const WinBadge = styled(Badge)`
  background: var(--green-tint);
  color: var(--green);
  border-color: var(--green);
`;

export const LossBadge = styled(Badge)`
  background: var(--red-tint);
  color: var(--red);
  border-color: var(--red);
`;

export const GoldBadge = styled(Badge)`
  background: var(--gold);
  color: var(--grey-dark);
  border-color: var(--gold);
`;

// ============================================
// CARD
// ============================================

export const Card = styled.div`
  background: var(--surface-1);
  border: var(--border-thick) solid var(--gold);
  border-radius: var(--radius-md);
  padding: var(--space-4);
`;

export const CardSubtle = styled.div`
  background: var(--surface-1);
  border: var(--border-thin) solid var(--grey-mid);
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
  border-left: 3px solid ${p => p.$blue ? 'var(--team-blue)' : 'var(--team-red)'};
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

  ${p => p.$alt && `background: var(--surface-1);`}

  &:hover {
    background: var(--surface-2);
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
  color: ${p => p.$color || 'var(--white)'};
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
  color: var(--white);
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
  background: var(--overlay-light);
  backdrop-filter: blur(8px);
  border: var(--border-thin) solid var(--surface-3);
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
  border: var(--border-thin) solid rgba(252, 219, 51, 0.3);
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-4);
`;

// ============================================
// TINTED SURFACES
// ============================================

export const GoldSurface = styled.div`
  background: var(--gold-tint);
  border: var(--border-thin) solid rgba(252, 219, 51, 0.3);
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-4);
`;

export const WinSurface = styled.div`
  background: var(--green-tint);
  border: var(--border-thin) solid rgba(74, 222, 128, 0.3);
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-4);
`;

export const LossSurface = styled.div`
  background: var(--red-tint);
  border: var(--border-thin) solid rgba(248, 113, 113, 0.3);
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
  width: var(--space-4);
  height: var(--space-4);
  background: var(--gold);
  border: var(--border-thick) solid var(--grey-dark);
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

// ============================================
// TYPOGRAPHY
// ============================================

export const H1 = styled.h1`
  font-family: var(--font-display);
  font-size: var(--text-xl);
  color: var(--gold);
  margin: 0;
  line-height: 1.2;
`;

export const H2 = styled.h2`
  font-family: var(--font-display);
  font-size: var(--text-lg);
  color: ${p => p.$gold ? 'var(--gold)' : 'var(--white)'};
  margin: 0;
  line-height: 1.3;
`;

export const H3 = styled.h3`
  font-family: var(--font-display);
  font-size: var(--text-base);
  color: ${p => p.$gold ? 'var(--gold)' : 'var(--white)'};
  margin: 0;
  line-height: 1.4;
`;

export const Text = styled.p`
  font-family: ${p => p.$mono ? 'var(--font-mono)' : 'inherit'};
  font-size: ${p => p.$size || 'var(--text-base)'};
  color: ${p => p.$muted ? 'var(--grey-light)' : 'var(--white)'};
  margin: 0;
  line-height: 1.6;
`;

export const Code = styled.code`
  font-family: var(--font-mono);
  font-size: ${p => p.$size || 'var(--text-sm)'};
  background: ${p => p.$block ? 'var(--grey-dark)' : 'var(--surface-3)'};
  color: ${p => p.$dim ? 'var(--grey-light)' : 'var(--white)'};
  padding: ${p => p.$block ? 'var(--space-4)' : 'var(--space-1) var(--space-2)'};
  border-radius: var(--radius-sm);
  ${p => p.$block && `display: block; overflow-x: auto;`}
  ${p => p.$url && `word-break: break-all;`}
`;

export const Pre = styled.pre`
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  background: var(--grey-dark);
  color: var(--white);
  padding: var(--space-4);
  border-radius: var(--radius-md);
  overflow-x: auto;
  margin: 0;
`;

// ============================================
// FORM COMPONENTS
// ============================================

// ---- Custom Select (div-based for full font styling) ----

const SelectWrapper = styled.div`
  position: relative;
  display: inline-block;
`;

const TriggerButton = styled.button`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  background: transparent url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%239ca3af' d='M6 8L2 4h8z'/%3E%3C/svg%3E") no-repeat right 8px center;
  border: 1px solid rgba(252,219,51,0.3);
  border-radius: var(--radius-md);
  color: var(--grey-light);
  padding: var(--space-2) 28px var(--space-2) var(--space-4);
  cursor: pointer;
  text-align: left;
  white-space: nowrap;
  width: 100%;

  &:hover {
    border-color: rgba(252,219,51,0.5);
  }

  &:focus {
    outline: none;
    border-color: var(--gold);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const DropdownList = styled.div`
  position: absolute;
  left: 0;
  ${p => p.$above ? 'bottom: 100%; margin-bottom: 2px;' : 'top: 100%; margin-top: 2px;'}
  min-width: 100%;
  background: var(--grey-dark);
  border: 1px solid rgba(252,219,51,0.4);
  border-radius: var(--radius-md);
  box-shadow: 0 8px 24px rgba(0,0,0,0.5);
  max-height: 240px;
  overflow-y: auto;
  z-index: 1000;
`;

const OptionItem = styled.div`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: ${p => p.$selected ? 'var(--gold)' : 'var(--white)'};
  background: ${p => p.$selected ? 'var(--gold-tint)' : 'transparent'};
  padding: var(--space-2) var(--space-4);
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    background: var(--surface-2);
  }
`;

export const Select = React.forwardRef(function Select(
  { value, defaultValue, onChange, disabled, id, style, className, children, ...rest },
  ref
) {
  // Parse <option> children into {value, label} pairs
  const options = [];
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    const optVal = child.props.value !== undefined ? child.props.value : child.props.children;
    const optLabel = child.props.children;
    options.push({ value: String(optVal), label: optLabel });
  });

  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(() => String(defaultValue ?? options[0]?.value ?? ''));
  const currentValue = String(isControlled ? value : internalValue);

  const [open, setOpen] = useState(false);
  const [above, setAbove] = useState(false);
  const wrapperRef = useRef(null);
  const triggerRef = useRef(null);

  const currentLabel = options.find((o) => o.value === currentValue)?.label || currentValue;

  const handleToggle = useCallback(() => {
    if (disabled) return;
    setOpen((prev) => {
      if (!prev && triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setAbove(rect.bottom + 240 > window.innerHeight);
      }
      return !prev;
    });
  }, [disabled]);

  const handleSelect = useCallback((optValue) => {
    if (!isControlled) setInternalValue(optValue);
    if (onChange) onChange({ target: { value: optValue } });
    setOpen(false);
  }, [isControlled, onChange]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleMouseDown = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  return (
    <SelectWrapper ref={wrapperRef} className={className} {...rest}>
      <TriggerButton
        ref={(node) => {
          triggerRef.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
        type="button"
        id={id}
        style={style}
        disabled={disabled}
        onClick={handleToggle}
      >
        {currentLabel}
      </TriggerButton>
      {open && (
        <DropdownList $above={above}>
          {options.map((opt) => (
            <OptionItem
              key={opt.value}
              $selected={opt.value === currentValue}
              onClick={() => handleSelect(opt.value)}
            >
              {opt.label}
            </OptionItem>
          ))}
        </DropdownList>
      )}
    </SelectWrapper>
  );
});

export const Input = styled.input`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  background: transparent;
  border: 1px solid ${p => p.$error ? 'var(--red)' : 'rgba(252,219,51,0.3)'};
  border-radius: var(--radius-md);
  color: var(--grey-light);
  padding: var(--space-2) var(--space-4);
  width: ${p => p.$fullWidth ? '100%' : 'auto'};

  &::placeholder {
    color: var(--grey-light);
  }

  &:focus {
    outline: none;
    border-color: ${p => p.$error ? 'var(--red)' : 'var(--gold)'};
  }
`;

export const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
`;

export const FieldLabel = styled.label`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--grey-light);
`;

// ============================================
// LAYOUT COMPONENTS
// ============================================

export const Grid = styled.div`
  display: grid;
  grid-template-columns: ${p => p.$cols ? `repeat(${p.$cols}, 1fr)` : '1fr'};
  gap: ${p => p.$gap || 'var(--space-4)'};
  ${p => p.$responsive && `
    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }
  `}
`;

export const Page = styled.div`
  min-height: 100vh;
  padding: var(--space-6);
  max-width: 1200px;
  margin: 0 auto;
`;

export const Section = styled.section`
  padding: var(--space-6) 0;
  ${p => p.$border && `border-bottom: 1px solid var(--grey-mid);`}
`;

export const Container = styled.div`
  max-width: ${p => p.$width || '1200px'};
  margin: 0 auto;
  padding: 0 var(--space-4);
`;

// ============================================
// FEEDBACK COMPONENTS
// ============================================

export const TipBox = styled.div`
  padding: var(--space-4);
  border-radius: var(--radius-md);
  border: 1px solid ${p =>
    p.$variant === 'gold' ? 'rgba(252, 219, 51, 0.3)' :
    p.$variant === 'green' ? 'rgba(74, 222, 128, 0.3)' :
    p.$variant === 'red' ? 'rgba(248, 113, 113, 0.3)' :
    'var(--grey-mid)'
  };
  background: ${p =>
    p.$variant === 'gold' ? 'var(--gold-tint)' :
    p.$variant === 'green' ? 'var(--green-tint)' :
    p.$variant === 'red' ? 'var(--red-tint)' :
    'var(--surface-1)'
  };
`;

export const Note = styled.p`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--grey-light);
  margin: 0;
`;

export const StepIndicator = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--space-6);
  height: var(--space-6);
  border-radius: 50%;
  background: ${p => p.$active ? 'var(--gold)' : 'var(--grey-mid)'};
  color: ${p => p.$active ? 'var(--grey-dark)' : 'var(--white)'};
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: bold;
`;

// ============================================
// MODAL COMPONENTS
// ============================================

export const ModalBackdrop = styled.div`
  position: fixed;
  inset: 0;
  background: var(--overlay-heavy);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal);
`;

export const ModalContent = styled.div`
  background: var(--grey-dark);
  border: var(--border-thin) solid var(--grey-mid);
  border-radius: var(--radius-md);
  padding: var(--space-6);
  max-height: 90vh;
  overflow-y: auto;
  width: ${p =>
    p.$size === 'sm' ? '400px' :
    p.$size === 'lg' ? '800px' :
    '600px'
  };
  max-width: 90vw;
`;

// ============================================
// PAGE NAV (back + sub-tabs)
// ============================================

const PageNavWrap = styled.nav`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-2) 0;
  margin-bottom: var(--space-4);
`;

const BackLink = styled(Link)`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  text-decoration: none;
  color: var(--gold);
  flex-shrink: 0;

  &:hover .pn-arrow { transform: translateX(-3px); }
  &:hover .pn-label { color: var(--white); }
`;

const BackArrow = styled.span.attrs({ className: "pn-arrow" })`
  font-size: var(--text-sm);
  line-height: 1;
  transition: transform var(--transition), color var(--transition);
`;

const BackLabel = styled.span.attrs({ className: "pn-label" })`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  transition: color var(--transition);
`;

const Tabs = styled.div`
  display: flex;
  gap: var(--space-1);
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  &::-webkit-scrollbar { display: none; }
`;

const Tab = styled.button`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${p => p.$active ? "var(--gold)" : "var(--grey-light)"};
  padding: var(--space-2) var(--space-4);
  cursor: pointer;
  transition: color var(--transition);
  border: none;
  border-bottom: 2px solid ${p => p.$active ? "var(--gold)" : "transparent"};
  background: none;
  white-space: nowrap;

  &:hover { color: var(--white); }
`;

/**
 * PageNav — Combined back-link + sub-tabs navigation.
 *
 * @param {string}   backTo    - Route path for the back link
 * @param {string}   backLabel - Label shown next to the arrow (e.g. "News")
 * @param {Array}    tabs      - Array of { key, label } for sub-tabs (optional)
 * @param {string}   activeTab - Key of the currently active tab
 * @param {Function} onTab     - Called with tab key when a tab is clicked
 */
export const PageNav = ({ backTo, backLabel, tabs, activeTab, onTab }) => (
  <PageNavWrap className="reveal" style={{ "--delay": "0.03s" }}>
    <BackLink to={backTo}>
      <BackArrow>&#8592;</BackArrow>
      <BackLabel>{backLabel}</BackLabel>
    </BackLink>
    {tabs && tabs.length > 0 && (
      <Tabs>
        {tabs.map(t => (
          <Tab key={t.key} $active={t.key === activeTab} onClick={() => onTab?.(t.key)}>
            {t.label}
          </Tab>
        ))}
      </Tabs>
    )}
  </PageNavWrap>
);

/** Confirm modal — drop-in replacement for window.confirm() */
export const ConfirmModal = ({
  open,
  title = "Are you sure?",
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  const confirmColor =
    variant === "danger" ? "var(--red)" :
    variant === "gold"   ? "var(--gold)" :
    "var(--green)";

  return (
    <ModalBackdrop onClick={onCancel}>
      <ModalContent $size="sm" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <h3 style={{
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-lg)",
            color: "var(--white)",
            margin: 0,
          }}>{title}</h3>
          {message && (
            <p style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-xs)",
              color: "var(--grey-light)",
              lineHeight: 1.6,
              margin: 0,
            }}>{message}</p>
          )}
          <div style={{ display: "flex", gap: "var(--space-2)", justifyContent: "flex-end", marginTop: "var(--space-2)" }}>
            <Button $ghost onClick={onCancel}>{cancelLabel}</Button>
            <Button
              onClick={onConfirm}
              style={{
                background: confirmColor,
                color: variant === "gold" ? "var(--grey-dark)" : "#fff",
                border: "none",
              }}
            >{confirmLabel}</Button>
          </div>
        </div>
      </ModalContent>
    </ModalBackdrop>
  );
};

// ============================================
// TABLE COMPONENTS
// ============================================

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  background: transparent;
`;

export const TableRow = styled.tr`
  border-bottom: 1px solid var(--surface-3);
  ${p => p.$hover && `
    &:hover {
      background: var(--surface-2);
    }
  `}
  ${p => p.$striped && `
    &:nth-child(odd) {
      background: var(--surface-1);
    }
  `}
`;

export const TableCell = styled.td`
  padding: var(--space-2) var(--space-4);
  text-align: ${p => p.$align || 'left'};
  font-family: ${p => p.$mono ? 'var(--font-mono)' : 'inherit'};
  color: ${p => p.$muted ? 'var(--grey-light)' : 'var(--white)'};
`;

export const TableHeaderCell = styled.th`
  padding: var(--space-2) var(--space-4);
  text-align: ${p => p.$align || 'left'};
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--grey-light);
  font-weight: normal;
  border-bottom: 1px solid var(--grey-mid);
`;

// ============================================
// COUNTRY FLAG
// ============================================

const FlagImg = styled.img`
  width: 16px;
  height: 11px;
  display: inline-block;
  vertical-align: baseline;
`;

/**
 * RaceIcon - Shows race icon, substituting the actual race when player randomed
 * Adds a "?" badge to indicate the player chose random
 */
export const RaceIcon = ({ race, rndRace, className = "" }) => {
  const displayRace = rndRace != null ? rndRace : race;
  if (rndRace == null) {
    return <img src={raceMapping[displayRace]} alt="" className={className} />;
  }
  return (
    <span className="rnd-race-wrapper">
      <img src={raceMapping[displayRace]} alt="" className={className} />
      <img src={raceMapping[0]} alt="random" className="rnd-badge-icon" />
    </span>
  );
};

/**
 * CountryFlag - Replaces Semantic UI Flag component
 * Uses flagcdn.com for flag images
 * @param {string} name - Country code (e.g., "us", "gb", "de")
 * @param {string} className - Optional CSS class
 * @param {object} style - Optional inline styles
 */
export const CountryFlag = ({ name, className, style }) => {
  if (!name) return null;
  const code = name.toLowerCase();
  return (
    <FlagImg
      src={`https://flagcdn.com/16x12/${code}.png`}
      srcSet={`https://flagcdn.com/32x24/${code}.png 2x`}
      alt={code}
      className={className}
      style={style}
      loading="lazy"
    />
  );
};

// ============================================
// SKELETON LOADERS
// ============================================

const skeletonShimmer = `
  @keyframes skeleton-shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
`;

export const Skeleton = styled.div`
  ${skeletonShimmer}
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.04) 25%,
    rgba(255, 255, 255, 0.08) 50%,
    rgba(255, 255, 255, 0.04) 75%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s ease-in-out infinite;
  border-radius: ${(p) => p.$radius || "var(--radius-sm)"};
  width: ${(p) => p.$w || "100%"};
  height: ${(p) => p.$h || "16px"};
`;

export const SkeletonCircle = styled(Skeleton)`
  border-radius: var(--radius-full);
  width: ${(p) => p.$size || "40px"};
  height: ${(p) => p.$size || "40px"};
  flex-shrink: 0;
`;

export const SkeletonMessage = styled.div`
  display: flex;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  align-items: flex-start;
`;

// ============================================
// RE-EXPORTS
// ============================================

export { PageLayout, PageHero };
