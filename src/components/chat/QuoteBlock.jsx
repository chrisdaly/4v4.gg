import React from "react";
import styled from "styled-components";
import ChatMessage from "./ChatMessage";
import { groupQuotesBySpeaker } from "../../lib/digestUtils";

/**
 * Digest pull-quotes: a list of "Speaker: text" strings (or bare strings)
 * grouped by consecutive speaker and rendered through the ChatMessage quote
 * variant. Used by the daily digest (DigestBanner) and the weekly magazine.
 */

export const QuoteGroups = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--quote-group-gap);
  margin-top: ${(p) => p.$marginTop || 0};
`;

// "ToD: gg wp" strings -> ChatMessage group shape. Unattributed quotes get an
// empty author, which the quote variant renders without a header.
export function quoteGroupsFromStrings(quotes) {
  return groupQuotesBySpeaker(quotes || []).map((g) => ({
    author: { userName: g.name || "" },
    lines: g.messages.map((text) => ({ text })),
  }));
}

export default function QuoteBlock({ quotes, marginTop, className, style }) {
  if (!quotes || quotes.length === 0) return null;
  const groups = quoteGroupsFromStrings(quotes);
  return (
    <QuoteGroups $marginTop={marginTop} className={className} style={style}>
      {groups.map((group, i) => (
        <ChatMessage key={i} variant="quote" group={group} />
      ))}
    </QuoteGroups>
  );
}
