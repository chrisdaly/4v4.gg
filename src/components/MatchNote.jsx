import React from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { raceMapping } from "../lib/constants";

/* Renders a match note from lib/matchNotes.js. Subject notes get the
   player's avatar (or race icon), linked name, match MMR, and the hero
   icons they played — plain notes render as text. */

const Wrap = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-style: italic;
  color: var(--gold);
`;

const Avatar = styled.img`
  width: 22px;
  height: 22px;
  border-radius: var(--radius-sm);
  object-fit: cover;
  ${(p) => p.$raceIcon && "padding: 1px; background: rgba(255,255,255,0.06); box-sizing: border-box;"}
`;

const RaceIconImg = styled.img`
  width: 20px;
  height: 20px;
`;

const Quote = styled.span`
  color: var(--grey-light);
  &::before {
    content: "— “";
  }
  &::after {
    content: "”";
  }
`;

const Name = styled(Link)`
  font-family: var(--font-display);
  font-style: normal;
  color: var(--gold);
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;

const Mmr = styled.span`
  font-style: normal;
  font-size: var(--text-xxxs);
  color: var(--grey-light);
`;

const HeroIcons = styled.span`
  display: inline-flex;
  gap: 2px;
`;

const HeroImg = styled.img`
  width: 22px;
  height: 22px;
  border-radius: var(--radius-sm);
  border: 1px solid rgba(var(--gold-muted-rgb), 0.4);
  box-sizing: border-box;
`;

export default function MatchNote({ note, avatarUrl = null }) {
  if (!note) return null;
  // Events built before the structured-note change may still hold strings
  if (typeof note === "string") return <Wrap>{note}</Wrap>;
  if (!note.tag) {
    const stackIcon = note.raceId != null ? raceMapping[note.raceId] : null;
    return (
      <Wrap>
        {stackIcon && <RaceIconImg src={stackIcon} alt="" />}
        <span>{note.text}</span>
        {note.quote && <Quote>{note.quote}</Quote>}
      </Wrap>
    );
  }

  const raceIcon = note.race != null ? raceMapping[note.race] : null;

  return (
    <Wrap>
      {(avatarUrl || raceIcon) && (
        <Avatar src={avatarUrl || raceIcon} alt="" $raceIcon={!avatarUrl} />
      )}
      <Name
        to={`/player/${encodeURIComponent(note.tag)}`}
        onClick={(e) => e.stopPropagation()}
      >
        {note.name}
      </Name>
      {note.mmr != null && <Mmr>{note.mmr}</Mmr>}
      <span>{note.text}</span>
      {note.heroes?.length > 0 && (
        <HeroIcons>
          {note.heroes.map((h, i) => (
            <HeroImg
              key={`${h.icon}-${i}`}
              src={`/heroes/${h.icon}.jpeg`}
              alt={h.icon}
              title={h.level ? `${h.icon} (level ${h.level})` : h.icon}
              onError={(e) => { e.target.style.display = "none"; }}
            />
          ))}
        </HeroIcons>
      )}
    </Wrap>
  );
}
