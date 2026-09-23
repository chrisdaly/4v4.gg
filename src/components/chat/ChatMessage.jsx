import React from "react";
import { Link } from "react-router-dom";
import styled, { css } from "styled-components";
import { FaTwitch } from "react-icons/fa";
import { raceMapping, raceIcons } from "../../lib/constants";
import { CountryFlag } from "../ui";
import { Chip } from "./chip";
import CopyLink, { CopyLinkButton } from "./CopyLink";
import LineEnd, { Time } from "./LineEnd";

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
 *                An author without a battleTag renders as plain text (digest
 *                quotes carry names only); a quote group with no name at all
 *                renders its lines with no header.
 *   meta         { avatarUrl, race, countryCode, mmr,
 *                  chip: { kind: "ingame" | "won" | "lost", label, onClick? },
 *                  twitchLogin, twitchTitle }
 *                A chip with onClick renders as a button (in-game chip opens
 *                the game modal)
 *   target       transcript only: gold tint background for the focus author
 *   watched      feed only: gold bar on the left for watch-listed authors
 *   onNameClick  (author) => void; when set the name is a button, else a /player link
 *   wrapName     (nameNode, author) => node; hover-card wrapper for the name
 *   renderLine   (line) => node; override the line text (linkify, search marks)
 *   renderAfterLine (line) => node; extra rows under a line (bot replies)
 *   permalinkHref (line) => string; feed only: when set, each line gets a
 *                hover-only copy-link anchor next to its timestamp
 *   $compact     feed only: tighter density (focus mode): 24px avatar,
 *                var(--space-2) group spacing, 1.4 line-height
 */

const LINE_HEIGHT = 1.5;
const COMPACT_LINE_HEIGHT = 1.4;

// Avatar size per variant. The feed avatar spans a header line plus one
// message line (~44px); transcripts stay at 32px; focus mode is 24px.
export const avatarSize = (variant, compact) =>
  variant === "transcript" ? 32 : compact ? 24 : 44;

const Group = styled.div`
  position: relative;
  display: grid;
  grid-template-columns: ${(p) => (p.$variant === "quote" ? "1fr" : `${avatarSize(p.$variant, p.$compact)}px 1fr`)};
  gap: ${(p) => (p.$variant === "quote" ? "0" : "var(--space-3)")};
  align-items: start;
  min-width: 0;
  ${(p) =>
    p.$variant === "feed" &&
    css`
      padding-top: ${p.$compact ? "var(--space-2)" : "var(--space-3)"};
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
  width: ${(p) => p.$size}px;
  height: ${(p) => p.$size}px;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
  }
`;

const AvatarImg = styled.img`
  width: 100%;
  height: 100%;
  border-radius: var(--radius-md);
  display: block;
  object-fit: cover;
`;

const AvatarRaceIcon = styled.img`
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  border-radius: var(--radius-md);
  display: block;
  padding: ${(p) => (p.$compact ? "4px" : "8px")};
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
  margin-bottom: ${(p) => (p.$variant === "quote" ? "var(--quote-name-gap)" : p.$compact ? "0" : "2px")};
  line-height: ${(p) => (p.$compact ? COMPACT_LINE_HEIGHT : 1.3)};
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

const NameText = styled.span`
  font-family: var(--font-display);
  font-size: ${(p) => nameFont[p.$variant] || nameFont.feed};
  color: var(--gold);
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
  &:hover ${CopyLinkButton},
  &:focus-within ${CopyLinkButton} {
    opacity: 1;
  }
`;

const FeedText = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  line-height: ${(p) => (p.$compact ? COMPACT_LINE_HEIGHT : LINE_HEIGHT)};
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

function AvatarBlock({ meta, compact, variant }) {
  const { avatarUrl, race, countryCode } = meta || {};
  let img;
  if (avatarUrl) {
    img = <AvatarImg src={avatarUrl} alt="" />;
  } else {
    const raceIcon = race != null ? raceMapping[race] : null;
    img = raceIcon ? (
      <AvatarRaceIcon src={raceIcon} alt="" $compact={compact} />
    ) : (
      <AvatarRaceIcon src={raceIcons.random} alt="" $faded $compact={compact} />
    );
  }
  return (
    <AvatarCol $size={avatarSize(variant, compact)}>
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
  permalinkHref,
  $compact = false,
}) {
  if (!group?.author) return null;
  const { author, lines = [] } = group;
  const tag = author.battleTag || "";
  const displayName = author.userName || tag.split("#")[0];
  const isQuote = variant === "quote";
  const isFeed = variant === "feed";
  const compact = isFeed && Boolean($compact);

  let name = onNameClick ? (
    <NameButton type="button" $variant={variant} onClick={() => onNameClick(author)}>
      {displayName}
    </NameButton>
  ) : tag ? (
    <NameLink $variant={variant} to={`/player/${encodeURIComponent(tag)}`}>
      {displayName}
    </NameLink>
  ) : (
    <NameText $variant={variant}>{displayName}</NameText>
  );
  if (wrapName) name = wrapName(name, author);
  const showHead = !isQuote || Boolean(displayName) || Boolean(wrapName);

  const chip = meta?.chip;
  const Text = variant === "transcript" ? TranscriptText : FeedText;

  return (
    <Group $variant={variant} $target={target} $watched={watched} $compact={compact} data-variant={variant} data-compact={compact || undefined} data-watched={watched || undefined}>
      {!isQuote && <AvatarBlock meta={meta} compact={compact} variant={variant} />}
      <Body>
        {showHead && <Head $variant={variant} $compact={compact}>
          {name}
          {author.clanTag && <ClanTag>{author.clanTag}</ClanTag>}
          {!isQuote && meta?.mmr != null && <Mmr>{Math.round(meta.mmr)} MMR</Mmr>}
          {!isQuote && chip?.label && (chip.onClick ? (
            <Chip as="button" type="button" $kind={chip.kind} $clickable onClick={chip.onClick} title="Show this game">
              {chip.label}
            </Chip>
          ) : (
            <Chip $kind={chip.kind}>{chip.label}</Chip>
          ))}
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
        </Head>}
        {isQuote ? (
          <QuoteLines>
            {lines.map((line, i) => (
              <QuoteText key={line.id ?? line.sentAt ?? i} id={line.id != null ? `msg-${line.id}` : undefined}>
                {renderLine(line)}
              </QuoteText>
            ))}
          </QuoteLines>
        ) : (
          lines.map((line, i) => (
            <React.Fragment key={line.id ?? line.sentAt ?? i}>
              <Line id={line.id != null ? `msg-${line.id}` : undefined} $highlight={Boolean(line.highlight)}>
                <Text $compact={compact}>{renderLine(line)}</Text>
                <LineEnd time={line.sentAt} reserve={isFeed && Boolean(permalinkHref)}>
                  {isFeed && permalinkHref && line.id != null && <CopyLink href={permalinkHref(line)} />}
                </LineEnd>
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
