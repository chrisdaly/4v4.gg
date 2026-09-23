import React from "react";
import { Link } from "react-router-dom";
import styled, { css } from "styled-components";
import { FaTwitch } from "react-icons/fa";
import { raceMapping, raceIcons } from "../../lib/constants";
import { CountryFlag } from "../ui";
import { formatTime } from "../../lib/useChatMessages";

/**
 * One message group (author + consecutive lines) in three looks:
 *
 *   feed        the /chat stream: 32px avatar, display name, mono lines
 *               with a right-aligned timestamp, one status chip
 *   transcript  compact serif transcript rows (RecentConversations,
 *               ChatContext); `target` tints the highlighted author
 *   quote       no avatar, indented serif italic pull-quotes on the
 *               :root --quote-* vars (news digest, magazine)
 *
 * Props
 *   group        { author: { battleTag, userName, clanTag },
 *                  lines: [{ id, text, sentAt, kind, translation?, highlight? }] }
 *   meta         { avatarUrl, race, countryCode, mmr,
 *                  chip: { kind: "ingame" | "won" | "lost", label }, twitchLogin, twitchTitle }
 *   target       transcript only: gold tint background for the focus author
 *   watched      feed only: gold bar on the left for watch-listed authors
 *   onNameClick  (author) => void; when set the name is a button, else a /player link
 *   wrapName     (nameNode, author) => node; hover-card wrapper for the name
 *   renderLine   (line) => node; override the line text (linkify, search marks)
 *   renderAfterLine (line) => node; extra rows under a line (bot replies)
 */

const LINE_HEIGHT = 1.5;

const Group = styled.div`
  position: relative;
  display: grid;
  grid-template-columns: ${(p) => (p.$variant === "quote" ? "1fr" : "32px 1fr")};
  gap: ${(p) => (p.$variant === "quote" ? "0" : "var(--space-3)")};
  align-items: start;
  min-width: 0;
  ${(p) =>
    p.$variant === "feed" &&
    css`
      padding-top: var(--space-3);
    `}
  ${(p) =>
    p.$variant === "transcript" &&
    css`
      padding: var(--space-1) var(--space-2);
      border-radius: var(--radius-md);
    `}
  ${(p) =>
    p.$target &&
    css`
      background: var(--gold-tint);
    `}
  ${(p) =>
    p.$watched &&
    css`
      box-shadow: inset 2px 0 0 rgba(var(--gold-muted-rgb), 0.6);
    `}
`;

const AvatarCol = styled.div`
  position: relative;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
`;

const AvatarImg = styled.img`
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  display: block;
  object-fit: cover;
`;

const AvatarRaceIcon = styled.img`
  width: 32px;
  height: 32px;
  box-sizing: border-box;
  border-radius: var(--radius-md);
  display: block;
  padding: 6px;
  background: var(--surface-2);
  opacity: ${(p) => (p.$faded ? 0.3 : 0.85)};
`;

const AvatarFlag = styled.div`
  position: absolute;
  bottom: -2px;
  right: -3px;
  line-height: 0;
`;

const Body = styled.div`
  min-width: 0;
`;

const Head = styled.div`
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-bottom: ${(p) => (p.$variant === "quote" ? "var(--quote-name-gap)" : "2px")};
  line-height: 1.3;
`;

const nameFont = {
  feed: "var(--text-xs)",
  transcript: "var(--text-xxs)",
  quote: "var(--text-xs)",
};

const NameLink = styled(Link)`
  font-family: var(--font-display);
  font-size: ${(p) => nameFont[p.$variant] || nameFont.feed};
  color: var(--gold);
  text-decoration: none;
  &:hover {
    text-decoration: underline;
  }
`;

const NameButton = styled.button`
  font-family: var(--font-display);
  font-size: ${(p) => nameFont[p.$variant] || nameFont.feed};
  color: var(--gold);
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  &:hover {
    text-decoration: underline;
  }
`;

const ClanTag = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  color: var(--grey-light);
  opacity: 0.8;
  margin-left: calc(-1 * var(--space-1));
  &::before {
    content: "[";
  }
  &::after {
    content: "]";
  }
`;

const Mmr = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
`;

const chipStyles = {
  ingame: css`
    color: var(--amber);
    background: var(--amber-tint);
    border-color: rgba(245, 158, 11, 0.3);
  `,
  won: css`
    color: var(--green);
    background: var(--green-tint);
    border-color: var(--green-border);
  `,
  lost: css`
    color: var(--red);
    background: var(--red-tint);
    border-color: var(--red-border);
  `,
};

const Chip = styled.span`
  align-self: center;
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  line-height: 1.2;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  padding: 1px var(--space-1);
  white-space: nowrap;
  ${(p) => chipStyles[p.$kind] || chipStyles.ingame}
`;

const TwitchLink = styled.a`
  display: inline-flex;
  align-items: center;
  align-self: center;
  svg {
    width: 13px;
    height: 13px;
    fill: var(--twitch-purple);
  }
  &:hover svg {
    opacity: 0.8;
  }
`;

const Time = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  color: var(--grey-mid);
  white-space: nowrap;
  transition: color var(--transition);
`;

const Line = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--space-3);
  align-items: baseline;
  padding: 1px 0;
  border-radius: var(--radius-sm);
  transition: background 0.6s;
  ${(p) =>
    p.$highlight &&
    css`
      background: rgba(252, 219, 51, 0.14) !important;
    `}
  &:hover ${Time} {
    color: var(--grey-light);
  }
`;

const FeedText = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  line-height: ${LINE_HEIGHT};
  color: var(--text-body);
  overflow-wrap: anywhere;
  word-break: break-word;
`;

const TranscriptText = styled.span`
  font-family: var(--font-body);
  font-size: var(--text-xs);
  line-height: ${LINE_HEIGHT};
  color: var(--text-body);
  overflow-wrap: anywhere;
`;

const QuoteText = styled.blockquote`
  margin: 0 0 0 var(--quote-indent);
  padding: var(--space-1) 0 var(--space-1) var(--quote-pad-left);
  border-left: var(--quote-border);
  font-family: var(--font-body);
  font-size: var(--text-xs);
  font-style: italic;
  line-height: ${LINE_HEIGHT};
  color: var(--grey-light);
  overflow-wrap: anywhere;
`;

const QuoteLines = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--quote-item-gap);
`;

const Translation = styled.div`
  padding: 1px 0 2px;
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  font-style: italic;
  color: var(--grey-light);
  opacity: 0.8;
  line-height: 1.4;
`;

const TranslationLabel = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  font-weight: 700;
  color: var(--grey-light);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-right: 6px;
  font-style: normal;
  opacity: 0.6;
`;

function AvatarBlock({ meta }) {
  const { avatarUrl, race, countryCode } = meta || {};
  let img;
  if (avatarUrl) {
    img = <AvatarImg src={avatarUrl} alt="" />;
  } else {
    const raceIcon = race != null ? raceMapping[race] : null;
    img = raceIcon ? (
      <AvatarRaceIcon src={raceIcon} alt="" />
    ) : (
      <AvatarRaceIcon src={raceIcons.random} alt="" $faded />
    );
  }
  return (
    <AvatarCol>
      {img}
      {countryCode && (
        <AvatarFlag>
          <CountryFlag name={countryCode.toLowerCase()} />
        </AvatarFlag>
      )}
    </AvatarCol>
  );
}

const defaultRenderLine = (line) => line.text;

export default function ChatMessage({
  variant = "feed",
  group,
  meta,
  target = false,
  watched = false,
  onNameClick,
  wrapName,
  renderLine = defaultRenderLine,
  renderAfterLine,
}) {
  if (!group?.author) return null;
  const { author, lines = [] } = group;
  const tag = author.battleTag || "";
  const displayName = author.userName || tag.split("#")[0];
  const isQuote = variant === "quote";
  const isFeed = variant === "feed";

  let name = onNameClick ? (
    <NameButton type="button" $variant={variant} onClick={() => onNameClick(author)}>
      {displayName}
    </NameButton>
  ) : (
    <NameLink $variant={variant} to={`/player/${encodeURIComponent(tag)}`}>
      {displayName}
    </NameLink>
  );
  if (wrapName) name = wrapName(name, author);

  const chip = meta?.chip;
  const Text = variant === "transcript" ? TranscriptText : FeedText;

  return (
    <Group $variant={variant} $target={target} $watched={watched} data-variant={variant}>
      {!isQuote && <AvatarBlock meta={meta} />}
      <Body>
        <Head $variant={variant}>
          {name}
          {author.clanTag && <ClanTag>{author.clanTag}</ClanTag>}
          {!isQuote && meta?.mmr != null && <Mmr>{Math.round(meta.mmr)} MMR</Mmr>}
          {!isQuote && chip?.label && (
            <Chip $kind={chip.kind} data-chip={chip.kind}>
              {chip.label}
            </Chip>
          )}
          {isFeed && meta?.twitchLogin && (
            <TwitchLink
              href={`https://twitch.tv/${meta.twitchLogin}`}
              target="_blank"
              rel="noopener noreferrer"
              title={meta.twitchTitle || "Live on Twitch"}
            >
              <FaTwitch />
            </TwitchLink>
          )}
        </Head>
        {isQuote ? (
          <QuoteLines>
            {lines.map((line) => (
              <QuoteText key={line.id ?? line.sentAt} id={line.id != null ? `msg-${line.id}` : undefined}>
                {renderLine(line)}
              </QuoteText>
            ))}
          </QuoteLines>
        ) : (
          lines.map((line) => (
            <React.Fragment key={line.id ?? line.sentAt}>
              <Line id={line.id != null ? `msg-${line.id}` : undefined} $highlight={Boolean(line.highlight)}>
                <Text>{renderLine(line)}</Text>
                <Time>{line.sentAt ? formatTime(line.sentAt) : ""}</Time>
              </Line>
              {line.translation && (
                <Translation>
                  <TranslationLabel>EN</TranslationLabel>
                  {line.translation}
                </Translation>
              )}
              {renderAfterLine ? renderAfterLine(line) : null}
            </React.Fragment>
          ))
        )}
      </Body>
    </Group>
  );
}

export { FeedText };
