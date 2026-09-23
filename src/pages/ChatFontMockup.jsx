import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { PageHero } from "../components/ui";

/**
 * Temporary comparison page for the chat message font decision.
 * Route: /chat-font-mockup. Pulls the last 40 real messages from the relay
 * and renders the same group twice: serif body (current) and mono.
 * Also shows the proposed one-line game ticker in both.
 */

const RELAY = import.meta.env.VITE_CHAT_RELAY_URL || "https://4v4gg-chat-relay.fly.dev";

const Page = styled.div`
  max-width: 1300px;
  margin: 0 auto;
  padding: var(--space-8) var(--space-6) var(--space-12);
`;

const Columns = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-6);
  @media (max-width: 900px) { grid-template-columns: 1fr; }
`;

const Col = styled.div`
  background: var(--panel-bg);
  border: 1px solid var(--panel-border);
  border-radius: var(--radius-xl);
  padding: var(--space-4) var(--space-6);
  backdrop-filter: blur(12px);
`;

const ColTitle = styled.h2`
  font-family: var(--font-display);
  font-size: var(--text-lg);
  color: var(--gold);
  margin: 0 0 var(--space-1);
`;

const ColSub = styled.p`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
  margin: 0 0 var(--space-4);
`;

const Group = styled.div`
  display: grid;
  grid-template-columns: 32px 1fr;
  gap: var(--space-3);
  padding: var(--space-2) 0;
`;

const Avatar = styled.div`
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  background: var(--surface-3);
  border: 1px solid var(--grey-mid);
`;

const Head = styled.div`
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  margin-bottom: 2px;
`;

const Name = styled.span`
  font-family: var(--font-display);
  color: var(--gold);
  font-size: var(--text-xs);
`;

const Mmr = styled.span`
  font-family: var(--font-mono);
  color: var(--grey-light);
  font-size: var(--text-xxs);
`;

const Time = styled.span`
  font-family: var(--font-mono);
  color: var(--grey-mid);
  font-size: var(--text-xxxs);
`;

const Line = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--space-3);
  align-items: baseline;
  &:hover ${Time} { color: var(--grey-light); }
`;

const SerifText = styled.span`
  font-family: var(--font-body);
  font-size: var(--text-sm);
  line-height: 1.6;
  color: var(--text-body);
  overflow-wrap: anywhere;
`;

const MonoText = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  line-height: 1.5;
  color: var(--text-body);
  overflow-wrap: anywhere;
`;

const Ticker = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) 0 var(--space-1) 44px;
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
  cursor: pointer;
  &:hover { color: var(--white); }
`;

const TickerTag = styled.span`
  font-family: var(--font-display);
  font-size: var(--text-xxxs);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${p => p.$live ? "var(--red)" : "var(--green)"};
`;

const InGame = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--amber);
  background: var(--amber-tint);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: var(--radius-sm);
  padding: 1px var(--space-1);
`;

const fmtTime = (iso) => {
  const d = new Date(iso);
  return isNaN(d) ? "" : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

// Collapse consecutive messages by the same author into groups
const groupMessages = (msgs) => {
  const groups = [];
  for (const m of msgs) {
    const last = groups[groups.length - 1];
    if (last && last.tag === m.battle_tag) last.lines.push(m);
    else groups.push({ tag: m.battle_tag, name: m.user_name, lines: [m] });
  }
  return groups;
};

const Stream = ({ groups, Text }) => (
  <>
    {groups.map((g, i) => (
      <React.Fragment key={g.lines[0].id}>
        {i === 2 && (
          <Ticker>
            <TickerTag $live>Live</TickerTag>
            <span>{g.name} +3 started on Northshire LV, 1847 avg</span>
          </Ticker>
        )}
        {i === 5 && (
          <Ticker>
            <TickerTag>Finished</TickerTag>
            <span>Team 1 won 17:22 on Royal Gardens, +12 avg</span>
          </Ticker>
        )}
        <Group>
          <Avatar />
          <div>
            <Head>
              <Name>{g.name}</Name>
              <Mmr>1847 MMR</Mmr>
              {i === 3 && <InGame>in game 12m</InGame>}
            </Head>
            {g.lines.map((m) => (
              <Line key={m.id}>
                <Text>{m.message}</Text>
                <Time>{fmtTime(m.sent_at)}</Time>
              </Line>
            ))}
          </div>
        </Group>
      </React.Fragment>
    ))}
  </>
);

const ChatFontMockup = () => {
  const [groups, setGroups] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${RELAY}/api/chat/messages?limit=40`)
      .then((r) => r.json())
      .then((rows) => setGroups(groupMessages([...rows].reverse().filter((m) => !m.deleted))))
      .catch((e) => setError(String(e)));
  }, []);

  return (
    <Page>
      <PageHero
        eyebrow="4v4.gg mockup"
        title="Chat message font"
        lead="Same 40 real messages, grouped, with the proposed one-line game tickers and in-game chip. Serif is the current choice."
      />
      {error && <ColSub>Could not load messages: {error}</ColSub>}
      <Columns>
        <Col>
          <ColTitle>Serif body</ColTitle>
          <ColSub>Libre Baskerville 16px, line-height 1.6. Reads like prose; taller lines.</ColSub>
          <Stream groups={groups} Text={SerifText} />
        </Col>
        <Col>
          <ColTitle>Mono</ColTitle>
          <ColSub>Inconsolata 14px, line-height 1.5. Matches transcripts and data; about 30% more lines per screen.</ColSub>
          <Stream groups={groups} Text={MonoText} />
        </Col>
      </Columns>
    </Page>
  );
};

export default ChatFontMockup;
