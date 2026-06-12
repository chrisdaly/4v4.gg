import React from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { raceMapping } from "../lib/constants";

/* Renders a match note from lib/matchNotes.js. Subject notes get the
   player's avatar (or race icon), linked name, match MMR, and the hero
   icons they played — plain notes render as text. LLM blurbs may tag
   game entities like [[frostwyrm|frosties]]; we render the unit/hero
   icon inline after the tagged words. */

// Readable entity id → internal unit code (public/units/{code}.png)
const UNIT_ICON_CODES = {
  footman: "hfoo", rifleman: "hrif", knight: "hkni", priest: "hmpr",
  sorceress: "hsor", spellbreaker: "hspt", gryphon: "hgry", mortarteam: "hmtm",
  siegeengine: "hsie", dragonhawk: "hdhw", gyrocopter: "hgyr",
  waterelemental: "hwat", peasant: "hpea",
  grunt: "ogru", headhunter: "ohun", raider: "orai", shaman: "oshm",
  witchdoctor: "odoc", kodo: "okod", tauren: "otau", windrider: "owvy",
  batrider: "otbr", demolisher: "ocat", peon: "opeo",
  ghoul: "ugho", cryptfiend: "ucry", gargoyle: "ugar", abomination: "uabo",
  necromancer: "unec", banshee: "uban", meatwagon: "umtw", frostwyrm: "ufro",
  destroyer: "ubsp", obsidianstatue: "uobs", acolyte: "uaco",
  archer: "earc", huntress: "ehun", dryad: "edry", druidoftheclaw: "edoc",
  druidofthetalon: "edot", hippogryph: "ehip", chimaera: "echm",
  mountaingiant: "emtg", faeriedragon: "efdr", wisp: "ewsp",
};

const HERO_IDS = new Set([
  "archmage", "mountainking", "paladin", "sorceror", "blademaster", "farseer",
  "shadowhunter", "taurenchieftain", "deathknight", "lich", "dreadlord",
  "cryptlord", "demonhunter", "keeperofthegrove", "priestessofthemoon",
  "warden", "alchemist", "avatarofflame", "bansheeranger", "beastmaster",
  "pandarenbrewmaster", "pitlord", "seawitch", "tinker",
]);

function entityIconSrc(id) {
  if (UNIT_ICON_CODES[id]) return `/units/${UNIT_ICON_CODES[id]}.png`;
  if (HERO_IDS.has(id)) return `/heroes/${id}.jpeg`;
  return null;
}

const ENTITY_RE = /\[\[(\w+)\|([^\]]+)\]\]/g;

export function stripBlurbMarkup(text) {
  return typeof text === "string" ? text.replace(ENTITY_RE, "$2") : text;
}

/** Parses [[id|words]] markup into text + inline entity icons. */
export function renderBlurbText(text) {
  if (typeof text !== "string" || !text.includes("[[")) return text;
  const parts = [];
  let last = 0;
  for (const m of text.matchAll(ENTITY_RE)) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const src = entityIconSrc(m[1]);
    parts.push(
      <span key={m.index} style={{ whiteSpace: "nowrap" }}>
        {m[2]}
        {src && (
          <EntityIcon
            src={src}
            alt={m[1]}
            title={m[1]}
            onError={(e) => { e.target.style.display = "none"; }}
          />
        )}
      </span>
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

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

const EntityIcon = styled.img`
  width: 20px;
  height: 20px;
  border-radius: var(--radius-sm);
  border: 1px solid rgba(var(--gold-muted-rgb), 0.4);
  box-sizing: border-box;
  vertical-align: text-bottom;
  margin-left: 3px;
`;

export default function MatchNote({ note, avatarUrl = null }) {
  if (!note) return null;
  // Events built before the structured-note change may still hold strings
  if (typeof note === "string") return <Wrap>{renderBlurbText(note)}</Wrap>;
  if (!note.tag) {
    const stackIcon = note.raceId != null ? raceMapping[note.raceId] : null;
    return (
      <Wrap>
        {stackIcon && <RaceIconImg src={stackIcon} alt="" />}
        <span>{renderBlurbText(note.text)}</span>
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
