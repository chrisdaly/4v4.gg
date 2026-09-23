import styled, { css } from "styled-components";

/** The four /chat panels share this frame (Chat v2 handoff, "Panel style"). */
export const Panel = styled.section`
  background: rgba(10, 8, 6, 0.62);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: var(--radius-md);
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
`;

export const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 11px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
`;

export const labelStyles = css`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--grey-light);
`;

export const PanelLabel = styled.span`
  ${labelStyles}
`;

export const CountPill = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--gold);
  background: var(--gold-tint);
  padding: 1px 7px;
  border-radius: var(--radius-sm);
  white-space: nowrap;
`;

/* Secondary header text (11px): the "online · avg MMR · local" hint, the
   roster's region scope. grey-light at .7 lands on the design's #888. */
export const Hint = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  color: var(--grey-light);
  opacity: 0.7;
  white-space: nowrap;
`;

/* Panel body scrollbar, shared by the region and roster lists */
export const scrollStyles = css`
  overflow-y: auto;
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(var(--gold-muted-rgb), 0.35);
    border-radius: 3px;
  }
`;
