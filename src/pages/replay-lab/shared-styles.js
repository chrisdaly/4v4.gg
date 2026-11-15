import styled from "styled-components";

export const EmptyState = styled.div`
  padding: var(--space-8) var(--space-4);
  text-align: center;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--grey-light);
  background: var(--surface-1);
  border: var(--border-thin) solid var(--grey-mid);
  border-radius: var(--radius-md);
`;

export const CloseBtn = styled.button`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
  background: none;
  border: 1px solid rgba(var(--gold-muted-rgb), 0.2);
  border-radius: var(--radius-sm);
  padding: 2px 8px;
  cursor: pointer;
  margin-left: auto;
  &:hover { color: var(--red); border-color: rgba(244, 67, 54, 0.3); }
`;
