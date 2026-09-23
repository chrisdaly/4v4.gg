import React from "react";
import styled from "styled-components";
import { formatTime } from "../../lib/useChatMessages";

/**
 * The right-hand cell of a chat line: the timestamp plus a fixed 20px slot
 * for the hover-only copy-link control. Message lines (ChatMessage) and game
 * rows (GameRow) both end with this cell so their times sit in one column;
 * a game row has no copy link but still reserves the slot.
 *
 *   time      ISO string, formatted with formatTime (12-hour)
 *   reserve   keep the 20px slot even when there is nothing to put in it
 *             (feed lines and game rows); transcript rows pass false
 *   children  the control for the slot (CopyLink)
 */

export const END_SLOT_PX = 20;

/* mono 11px, dimmed grey-light (the design's #777) */
export const Time = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  color: var(--grey-light);
  opacity: 0.6;
  white-space: nowrap;
  transition: opacity var(--transition);
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
