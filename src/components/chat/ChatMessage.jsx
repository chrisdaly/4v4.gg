import React from "react";
import { Link } from "react-router-dom";
import styled, { css } from "styled-components";
import { FaTwitch } from "react-icons/fa";
import { raceMapping, raceIcons } from "../../lib/constants";
import { CountryFlag } from "../ui";
import { Chip } from "./chip";
import CopyLink, { CopyLinkButton } from "./CopyLink";
import LineEnd, { Time } from "./LineEnd";
import { formatTime } from "../../lib/useChatMessages";
import { localTimeLabel } from "../../lib/chat/localTime";
import { CHAT_MOBILE_PX } from "../../lib/useIsMobile";

/**
 * One message group (author + consecutive lines) in three looks:
 *
 *   feed        the /chat stream (Chat v3 message group): 38px avatar with
 *               a flag badge, display name (the sender's local time in its
 *               tooltip), the bare MMR, the in-game marker (red dot +
 *               minutes) or a won / lost chip, twitch; mono lines with a
 *               right-aligned timestamp per line. At and below 768px the
 *               avatar is 34px, the header ends with the group's time and
 *               the lines carry no timestamps.
 *   transcript  compact serif transcript rows (RecentConversations,
 *               ChatContext); `target` tints the focus author
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
 *                  chip: { kind: "ingame" | "won" | "lost", label, minutes?, onClick? },
 *                  twitchLogin, twitchTitle }
 *                An in-game chip renders as the marker (its `minutes`, "12m",
 *                next to a red dot), a button when it has onClick (opens the
 *                game modal). Won / lost chips render as the shared Chip.
 *                The feed derives the sender's local time from countryCode
 *                and the first line's sentAt (localTime.js).
 *   target       transcript only: gold tint background for the focus author
 *   watched      feed only: gold bar on the left for watch-listed authors
 *   onNameClick  (author) => void; when set the name is a button, else a /player link
 *   wrapName     (nameNode, author) => node; hover-card wrapper for the name
 *   renderLine   (line) => node; override the line text (linkify, search marks)
 *   renderAfterLine (line) => node; extra rows under a line (bot replies)
 *   permalinkHref (line) => string; feed only: when set, each line gets a
 *                hover-only copy-link anchor next to its timestamp
 */

const FEED_LINE_HEIGHT = 1.45;
const LINE_HEIGHT = 1.5;
const MOBILE_AVATAR = 34; // px, feed at and below the mobile breakpoint

// Avatar size per variant: the feed avatar spans the header row plus one
// message line; transcripts stay at 32px.
export const avatarSize = (variant) => (variant === "transcript" ? 32 : 38);

const mobile = (rules) => css`
  @media (max-width: ${CHAT_MOBILE_PX}px) {
    ${rules}
  }
`;

const Group = styled.div`
  position: relative;
  display: grid;
  grid-template-columns: ${(p) => (p.$variant === "quote" ? "1fr" : `${avatarSize(p.$variant)}px minmax(0, 1fr)`)};
  gap: ${(p) => (p.$variant === "quote" ? "0" : p.$variant === "feed" ? "12px" : "var(--space-3)")};
  align-items: start;
  min-width: 0;
  ${(p) =>
    p.$variant === "feed" &&
    css`
      padding: 10px 0;
      ${mobile(css`
        grid-template-columns: ${MOBILE_AVATAR}px minmax(0, 1fr);
        gap: 10px;
        padding: 9px 0;
      `)}
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
  ${(p) =>
    p.$variant === "feed" &&
    mobile(css`
      width: ${MOBILE_AVATAR}px;
      height: ${MOBILE_AVATAR}px;
    `)}
`;

const avatarFrame = css`
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  display: block;
  border-radius: ${(p) => (p.$variant === "feed" ? "3px" : "var(--radius-md)")};
  ${(p) =>
    p.$variant === "feed" &&
    css`
      border: 1px solid rgba(var(--gold-muted-rgb), 0.45);
    `}
`;

const AvatarImg = styled.img`
  ${avatarFrame}
  object-fit: cover;
`;

const AvatarRaceIcon = styled.img`
  ${avatarFrame}
  padding: ${(p) => (p.$variant === "feed" ? "7px" : "6px")};
  background: var(--surface-2);
  opacity: ${(p) => (p.$faded ? 0.3 : 0.85)};
`;

/* 16x11 flag badge over the avatar corner, ringed in the page background
   colour (#0a0806, the body background under the panels) so it reads as a
   badge on any avatar. The mobile feed draws it 13x10 under a 1px dark drop
   shadow instead of the ring. */
const AvatarFlag = styled.div`
  position: absolute;
  bottom: -3px;
  right: -3px;
  width: 16px;
  height: 11px;
  line-height: 0;
  border-radius: 1px;
  box-shadow: 0 0 0 1px #0a0806;
  overflow: hidden;

  img {
    width: 16px;
    height: 11px;
    display: block;
    object-fit: cover;
  }

  ${(p) =>
    p.$variant === "feed" &&
    mobile(css`
      width: 13px;
      height: 10px;
      box-shadow: none;
      overflow: visible;
      filter: drop-shadow(0 0 1px #000);
      img {
        width: 13px;
        height: 10px;
      }
    `)}
`;

const Body = styled.div`
  min-width: 0;
`;

const Head = styled.div`
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-bottom: ${(p) => (p.$variant === "quote" ? "var(--quote-name-gap)" : p.$variant === "feed" ? "4px" : "2px")};
  line-height: 1.3;
  ${(p) =>
    p.$variant === "feed" &&
    mobile(css`
      flex-wrap: nowrap;
      gap: 7px;
      margin-bottom: 3px;
    `)}
`;

const nameFont = {
  feed: "15px",
  transcript: "var(--text-xxs)",
  quote: "var(--text-xs)",
};

const nameStyles = css`
  font-family: var(--font-display);
  font-size: ${(p) => nameFont[p.$variant] || nameFont.feed};
  color: var(--gold);
  ${(p) =>
    p.$variant === "feed" &&
    mobile(css`
      min-width: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    `)}
`;

const NameLink = styled(Link)`
  ${nameStyles}
  text-decoration: none;
  &:hover {
    text-decoration: underline;
  }
`;

const NameButton = styled.button`
  ${nameStyles}
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  text-align: left;
  &:hover {
    text-decoration: underline;
  }
`;

const NameText = styled.span`
  ${nameStyles}
`;

const ClanTag = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  color: var(--grey-light);
  opacity: 0.8;
  margin-left: calc(-1 * var(--space-1));
  flex-shrink: 0;
  &::before {
    content: "[";
  }
  &::after {
    content: "]";
  }
`;

/* The bare MMR figure: mono 12px on the design's #888 (grey-light at .7) */
const Mmr = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
  opacity: 0.7;
  flex-shrink: 0;
`;

/* The in-game marker: a 6px red dot and the minutes, mono 11px red. A
   button when it opens the game. */
const InGameMarker = styled.button.attrs({ "data-chip": "ingame" })`
  align-self: center;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  background: none;
  border: none;
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  line-height: 1;
  color: var(--red);
  white-space: nowrap;
  &::before {
    content: "";
    width: 6px;
    height: 6px;
    border-radius: var(--radius-full);
    background: var(--red);
  }
  ${(p) =>
    p.$clickable &&
    css`
      cursor: pointer;
      transition: filter var(--transition);
      &:hover {
        filter: brightness(1.25);
      }
    `}
`;

const TwitchLink = styled.a`
  display: inline-flex;
  align-items: center;
  align-self: center;
  flex-shrink: 0;
  svg {
    width: 13px;
    height: 13px;
    fill: var(--twitch-purple);
  }
  &:hover svg {
    opacity: 0.8;
  }
`;

/* Mobile feed only: the group's time at the end of the header, in place of
   the per-line timestamps */
const HeadTime = styled.span`
  display: none;
  margin-left: auto;
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  color: var(--grey-light);
  opacity: 0.7;
  white-space: nowrap;
  ${mobile(css`
    display: inline;
  `)}
`;

const Lines = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(p) => (p.$variant === "feed" ? "3px" : "0")};
`;

const Line = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--space-3);
  align-items: baseline;
  border-radius: var(--radius-sm);
  transition: background 0.6s;
  ${(p) =>
    p.$highlight &&
    css`
      background: rgba(252, 219, 51, 0.14) !important;
    `}
  &:hover ${Time} {
    opacity: 1;
  }
  &:hover ${CopyLinkButton},
  &:focus-within ${CopyLinkButton} {
    opacity: 1;
  }
  ${(p) =>
    p.$variant === "feed" &&
    mobile(css`
      grid-template-columns: minmax(0, 1fr);
      [data-line-end] {
        display: none;
      }
    `)}
`;

const FeedText = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  line-height: ${FEED_LINE_HEIGHT};
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

function AvatarBlock({ meta, variant }) {
  const { avatarUrl, race, countryCode } = meta || {};
  let img;
  if (avatarUrl) {
    img = <AvatarImg src={avatarUrl} alt="" $variant={variant} />;
  } else {
    const raceIcon = race != null ? raceMapping[race] : null;
    img = raceIcon ? (
      <AvatarRaceIcon src={raceIcon} alt="" $variant={variant} />
    ) : (
      <AvatarRaceIcon src={raceIcons.random} alt="" $faded $variant={variant} />
    );
  }
  return (
    <AvatarCol $size={avatarSize(variant)} $variant={variant}>
      {img}
      {countryCode && (
        <AvatarFlag $variant={variant}>
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
}) {
  if (!group?.author) return null;
  const { author, lines = [] } = group;
  const tag = author.battleTag || "";
  const displayName = author.userName || tag.split("#")[0];
  const isQuote = variant === "quote";
  const isFeed = variant === "feed";

  // The sender's local clock rides in the name's tooltip ("5:03a local")
  const localTime = isFeed && meta?.countryCode ? localTimeLabel(meta.countryCode, lines[0]?.sentAt) : null;
  const nameTitle = localTime ? `${localTime} local` : undefined;
  const nameData = localTime ? { "data-local-time": localTime } : {};

  let name = onNameClick ? (
    <NameButton type="button" $variant={variant} title={nameTitle} {...nameData} onClick={() => onNameClick(author)}>
      {displayName}
    </NameButton>
  ) : tag ? (
    <NameLink $variant={variant} title={nameTitle} {...nameData} to={`/player/${encodeURIComponent(tag)}`}>
      {displayName}
    </NameLink>
  ) : (
    <NameText $variant={variant} title={nameTitle} {...nameData}>{displayName}</NameText>
  );
  if (wrapName) name = wrapName(name, author);
  const showHead = !isQuote || Boolean(displayName) || Boolean(wrapName);

  const chip = meta?.chip;
  const Text = variant === "transcript" ? TranscriptText : FeedText;

  let status = null;
  if (!isQuote && chip) {
    if (chip.kind === "ingame") {
      const minutes = chip.minutes || "";
      status = chip.onClick ? (
        <InGameMarker type="button" $clickable onClick={chip.onClick} title={`In game${minutes ? ` ${minutes}` : ""} · click to open`}>
          {minutes}
        </InGameMarker>
      ) : (
        <InGameMarker as="span" title={`In game${minutes ? ` ${minutes}` : ""}`}>{minutes}</InGameMarker>
      );
    } else if (chip.label) {
      status = chip.onClick ? (
        <Chip as="button" type="button" $kind={chip.kind} $clickable onClick={chip.onClick} title="Show this game">
          {chip.label}
        </Chip>
      ) : (
        <Chip $kind={chip.kind}>{chip.label}</Chip>
      );
    }
  }

  return (
    <Group $variant={variant} $target={target} $watched={watched} data-variant={variant} data-watched={watched || undefined}>
      {!isQuote && <AvatarBlock meta={meta} variant={variant} />}
      <Body>
        {showHead && <Head $variant={variant}>
          {name}
          {author.clanTag && <ClanTag>{author.clanTag}</ClanTag>}
          {!isQuote && meta?.mmr != null && <Mmr data-mmr>{Math.round(meta.mmr)}</Mmr>}
          {status}
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
          {isFeed && lines[0]?.sentAt && <HeadTime data-head-time>{formatTime(lines[0].sentAt)}</HeadTime>}
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
          <Lines $variant={variant}>
            {lines.map((line, i) => (
              <React.Fragment key={line.id ?? line.sentAt ?? i}>
                <Line id={line.id != null ? `msg-${line.id}` : undefined} $highlight={Boolean(line.highlight)} $variant={variant}>
                  <Text>{renderLine(line)}</Text>
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
            ))}
          </Lines>
        )}
      </Body>
    </Group>
  );
}

export { FeedText };
