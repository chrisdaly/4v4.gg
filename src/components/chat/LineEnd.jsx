import React from "react";
import styled from "styled-components";
import { formatTime } from "../../lib/useChatMessages";

/**
 * The right-hand cell of a chat line: the timestamp plus a fixed 20px slot
 * for the hover-only copy-link control. Message lines (ChatMessage) and game
 * tickers (GameTicker) both end with this cell so their times sit in one
 * column; a ticker has no copy link but still reserves the slot.
 *
 *   time      ISO string, formatted with formatTime
 *   reserve   keep the 20px slot even when there is nothing to put in it
 *             (feed lines and tickers); transcript rows pass false
 *   children  the control for the slot (CopyLink)
 */

export const END_SLOT_PX = 20;

export const Time = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  color: var(--grey-mid);
  white-space: nowrap;
  transition: color var(--transition);
`;

const Cell = styled.span`
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
`;

const Slot = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${END_SLOT_PX}px;
  min-height: ${END_SLOT_PX}px;
  flex-shrink: 0;
`;

export default function LineEnd({ time, reserve = true, children }) {
  return (
    <Cell data-line-end>
      <Time>{time ? formatTime(time) : ""}</Time>
      {(reserve || children) && <Slot data-end-slot>{children}</Slot>}
    </Cell>
  );
}
