/**
 * Shared UI Components
 * Import: import { Button, Badge, Card, ThemedCard, Dot, Delta, TeamBar, Select, Input, PageNav, PageLayout } from './components/ui';
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";
import { PageLayout, PageHero } from "./PageLayout";
import { raceMapping, raceIcons } from "../lib/constants";

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

  /* Ghost pill: tags, date tabs, "show more" (patterns.ghostPill) */
  ${p => p.$pill && `
    font-family: var(--font-mono);
    font-size: var(--text-xxs);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: var(--space-1) var(--space-3);
    background: transparent;
    color: var(--grey-light);
    border: var(--border-thin) solid var(--surface-3);
    border-radius: var(--radius-full);
    transition: color var(--transition), border-color var(--transition);
    &:hover { color: var(--white); border-color: var(--grey-light); }
    &[data-active="true"], &.active { color: var(--gold); border-color: var(--gold-border-hover); background: var(--gold-tint-subtle); }
  `}

  /* Icon-only square button (close, toggle, prev/next). Pass an aria-label. */
  ${p => p.$icon && `
    padding: var(--space-1);
    width: 32px;
    height: 32px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    font-size: var(--text-sm);
    background: transparent;
    color: var(--grey-light);
    border: var(--border-thin) solid transparent;
    &:hover { color: var(--white); background: var(--surface-2); }
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

// Theme-aware card: follows the active border theme (patterns.cardThemed).
// The most common card shape in the app; use instead of copying the var(--theme-*) block.
export const ThemedCard = styled.div`
  background: var(--theme-bg, var(--surface-1));
  border: var(--theme-border, var(--border-thin) solid var(--grey-mid));
  border-image: var(--theme-border-image, none);
  border-radius: ${p => p.$radius || 'var(--radius-xl)'};
  backdrop-filter: var(--theme-blur, none);
  box-shadow: var(--theme-shadow, none);
  padding: ${p => p.$padding || 'var(--space-4)'};
`;

// ============================================
// DOT (Win/Loss indicator)
// ============================================
// The single form-dot implementation. $size overrides the base size in px
// (default 8; $recent adds 2px). $dim fades older games.

export const Dot = styled.span`
  display: inline-block;
  width: ${p => (p.$size || 8) + (p.$recent ? 2 : 0)}px;
  height: ${p => (p.$size || 8) + (p.$recent ? 2 : 0)}px;
  border-radius: var(--radius-full);
  background: ${p => p.$win ? 'var(--green)' : 'var(--red)'};
  opacity: ${p => p.$dim ? 0.35 : p.$recent ? 1 : 0.7};
  flex-shrink: 0;
`;

// Signed MMR change chip (patterns.deltaChip): <Delta value={12} /> renders "+12" in green
export const Delta = styled.span.attrs(p => ({
  children: p.children ?? (p.value > 0 ? `+${p.value}` : p.value === 0 ? '0' : `${p.value}`),
}))`
  font-family: var(--font-mono);
  font-size: ${p => p.$size || 'var(--text-xs)'};
  font-weight: 700;
  color: ${p => (p.value ?? 0) > 0 ? 'var(--green)' : (p.value ?? 0) < 0 ? 'var(--red)' : 'var(--grey-light)'};
`;

// ============================================
// TEAM BAR
// ============================================

export const TeamBar = styled.div`
  padding: var(--space-2) var(--space-4);
  border-left: 3px solid ${p => p.$blue ? 'var(--team-blue)' : 'var(--team-red)'};
  background: ${p => p.$blue ? 'var(--blue-tint)' : 'rgba(239, 68, 68, 0.1)'};
`;

// ============================================
// TINTED SURFACES
// ============================================

export const WinSurface = styled.div`
  background: var(--green-tint);
  border: var(--border-thin) solid var(--green-border);
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-4);
`;

export const LossSurface = styled.div`
  background: var(--red-tint);
  border: var(--border-thin) solid var(--red-border);
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-4);
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
  z-index: var(--z-dropdown);
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
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid ${p => p.$error ? 'var(--red)' : 'rgba(var(--gold-dark-rgb), 0.3)'};
  border-radius: var(--radius-sm);
  color: var(--white);
  padding: var(--space-2) var(--space-4);
  width: ${p => p.$fullWidth ? '100%' : 'auto'};
  transition: var(--transition);
  box-sizing: border-box;
  box-shadow: inset 0 1px 4px rgba(0, 0, 0, 0.5);

  &::placeholder {
    color: var(--grey-light);
  }

  &:focus {
    outline: none;
    border-color: ${p => p.$error ? 'var(--red)' : 'var(--gold)'};
    box-shadow: inset 0 1px 4px rgba(0, 0, 0, 0.5), 0 0 8px rgba(var(--gold-dark-rgb), 0.15);
  }

  &:hover:not(:focus) {
    border-color: ${p => p.$error ? 'var(--red)' : 'rgba(var(--gold-dark-rgb), 0.55)'};
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

  @media (max-width: 600px) {
    gap: var(--space-2);
    margin-bottom: var(--space-2);
  }
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

  @media (max-width: 600px) {
    font-size: var(--text-xxxs);
    padding: var(--space-1) var(--space-2);
  }
`;

/**
 * PageNav - Combined back-link + sub-tabs navigation.
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

/** Confirm modal - drop-in replacement for window.confirm() */
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
                color: variant === "gold" ? "var(--grey-dark)" : "var(--white)",
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
 * Accepts numeric race ids (0/1/2/4/8) or string names ("human", "nightelf", ...)
 */
const resolveRaceIcon = (race) => {
  if (raceMapping[race] !== undefined) return raceMapping[race];
  const key = String(race).toLowerCase().replace(/\s/g, "");
  if (key === "nightelf") return raceIcons.elf;
  return raceIcons[key];
};

export const RaceIcon = ({ race, rndRace, className = "", size }) => {
  const displayRace = rndRace != null ? rndRace : race;
  const src = resolveRaceIcon(displayRace);
  const sizeStyle = size ? { width: size, height: size } : undefined;
  if (rndRace == null) {
    return <img src={src} alt="" className={className} style={sizeStyle} />;
  }
  return (
    <span className="rnd-race-wrapper">
      <img src={src} alt="" className={className} style={sizeStyle} />
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

// ============================================
// RE-EXPORTS
// ============================================

export { PageLayout, PageHero };
