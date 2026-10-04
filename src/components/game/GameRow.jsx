import React from "react";
import { Link, useHistory } from "react-router-dom";
import "./GameRow.css";

import { RaceIcon } from "../ui";
import useATGroupIds from "../../lib/useATGroupIds";
import { getMapImageUrl, formatDuration, formatTimeAgo } from "../../lib/formatters";
import { GAME_MODE, GAME_MODE_LABEL } from "../../lib/params";

const HERO_SLOTS = 3;

/**
 * GameRow - one match in the player profile's history, as a fixture list:
 *
 *   result +/- map | heroes (with level) | your team | avg vs avg | opponents
 *
 * Each side is one vertical list, highest MMR first, so a player's line shows
 * where they sat in their own lineup. The two lineups mirror about the centre
 * divider: yours right-aligned into it, theirs left-aligned out of it, in the
 * same font and colour. The profile player is the one gold line; every MMR
 * is on hover. Arranged teams get a purple bar down the divider side of
 * their lines, the same purple the match page uses.
 *
 * @param {Object} game - Match data object
 * @param {string} playerBattleTag - The profile player: their MMR, result and gold slot
 * @param {string} linkTo - URL for click navigation (default: /match/{id})
 * @param {boolean} striped - Alternate row styling
 * @param {string} className - Additional CSS class
 * @param {string} mvpTag - battleTag of the match MVP, if known: gets the gold chip
 */
const GameRow = ({ game, playerBattleTag, linkTo, striped = false, className = "", showOpponentHeroes = false, mvpTag }) => {
  const history = useHistory();

  const match = game?.match || game || {};
  const battleTagLower = playerBattleTag?.toLowerCase();

  let playerData = null;
  let allies = [];
  let opponents = [];

  for (const team of match.teams || []) {
    const player = team.players?.find((p) => p.battleTag?.toLowerCase() === battleTagLower);
    if (player) {
      playerData = player;
      allies = team.players
        .filter((p) => p.battleTag?.toLowerCase() !== battleTagLower)
        .sort((a, b) => (b.oldMmr || 0) - (a.oldMmr || 0));
    } else {
      opponents = [...(team.players || [])].sort((a, b) => (b.oldMmr || 0) - (a.oldMmr || 0));
    }
  }

  // Highest MMR first, so a slot's position is the player's standing in the lineup
  const teamMembers = playerData
    ? [playerData, ...allies].sort((a, b) => (b.oldMmr || 0) - (a.oldMmr || 0))
    : [];

  // Who queued together. The hook only asks W3C about players who share an
  // MMR, and caches per lobby, so a page of rows costs a few calls at most.
  // Hooks run before the early returns below; it is a no-op without 4v4.
  const { teamOneAT, teamTwoAT } = useATGroupIds(teamMembers, opponents);

  if (!game || !playerData) return null;

  const seat = teamMembers.findIndex((p) => p.battleTag?.toLowerCase() === battleTagLower) + 1;
  const ordinal = ["", "1st", "2nd", "3rd", "4th"][seat] || `${seat}th`;

  const won = playerData.won === true || playerData.won === 1;
  const mmrChange = (playerData.currentMmr || 0) - (playerData.oldMmr || 0);
  const cleanMapName = match.mapName?.replace(/^\(\d\)\s*/, "") || "Unknown";
  // 4v4 is the site's default and needs no saying. Anything else does, because
  // the row's team and Avg columns read very differently with one player a
  // side. A table filtered to one mode has already said so, so it stays quiet.
  const modeLabel =
    !showOpponentHeroes && match.gameMode && match.gameMode !== GAME_MODE.FOUR_V_FOUR
      ? GAME_MODE_LABEL[match.gameMode] || null
      : null;
  const mapUrl = getMapImageUrl(match.mapName);
  // The heroes the profile player fielded, from the match list already fetched.
  // "unknown" is W3C's placeholder for a hero it could not name, and we have no
  // portrait for it, so it would only ever render as a broken slot.
  const playable = (list) =>
    (list || []).filter((h) => h?.icon && h.icon !== "unknown").slice(0, HERO_SLOTS);
  const heroes = playable(playerData.heroes);
  // In 1v1 the hero matchup is most of the story, and with one player a side
  // there is room to show it. Only when the caller has widened the column for
  // it, though: a mixed-mode table has to keep every row the same shape.
  const soloOpponent = showOpponentHeroes && opponents.length === 1 ? opponents[0] : null;
  const opponentHeroes = soloOpponent ? playable(soloOpponent.heroes) : [];

  // Skip players the API gave no MMR for, or one zero drags the average
  // hundreds of points below the lobby it is meant to describe
  const teamAvg = (ps) => {
    const rated = ps.filter((p) => p.oldMmr > 0);
    return rated.length
      ? Math.round(rated.reduce((sum, p) => sum + p.oldMmr, 0) / rated.length)
      : null;
  };
  const myAvg = teamAvg(teamMembers);
  const theirAvg = teamAvg(opponents);

  const matchId = match.id || game.id;
  const href = linkTo || (matchId ? `/match/${matchId}` : null);

  const goTo = (tag) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    history.push(`/player/${encodeURIComponent(tag)}`);
  };

  // Fixed slots rather than one per hero, so rows stay aligned whether a
  // player fielded one hero or three. `padFront` puts the blanks on the left
  // so a right-hand lineup hugs the edge of the row instead of floating off it.
  const heroSlots = (list, keyPrefix, padFront = false) => {
    const blanks = Math.max(0, HERO_SLOTS - list.length);
    const padded = padFront
      ? [...Array(blanks).fill(null), ...list]
      : [...list, ...Array(blanks).fill(null)];
    return padded.map((h, i) => {
      if (!h) return <span key={`${keyPrefix}-${i}`} className="gr-hero-slot gr-hero--empty" />;
      return (
        <span
          key={`${keyPrefix}-${i}`}
          className="gr-hero-slot"
          title={`${h.name}${h.level ? ` · level ${h.level}` : ""}`}
        >
          <img
            src={`/heroes/${h.icon}.jpeg`}
            alt={h.name}
            className="gr-hero"
            loading="lazy"
            onError={(e) => { e.target.style.visibility = "hidden"; }}
          />
          {h.level > 0 && <span className="gr-hero-lvl" data-hero-level={h.level}>{h.level}</span>}
        </span>
      );
    });
  };

  // One line per player, the same name and font on both sides. Each side
  // leans into the centre divider: yours end with the race icon against it,
  // theirs start with it. The rating is on hover.
  // An arranged team shares one MMR, so after the sort its members sit
  // together: a bar down the divider side of those lines marks the group.
  const chip = (p, i, mine) => {
    const list = mine ? teamMembers : opponents;
    const groups = mine ? teamOneAT : teamTwoAT;
    const groupId = groups[i] || 0;
    const partners = groupId
      ? list.filter((o, j) => j !== i && groups[j] === groupId).map((o) => o.name)
      : [];
    const atClass = groupId
      ? ` gr-p--at${groups[i - 1] !== groupId ? " gr-p--at-start" : ""}${groups[i + 1] !== groupId ? " gr-p--at-end" : ""}`
      : "";
    const isSelf = p.battleTag?.toLowerCase() === battleTagLower;
    const title = [
      `${p.name} · ${p.oldMmr || "?"} MMR`,
      isSelf && `${ordinal} highest on the team`,
      partners.length && `arranged team with ${partners.join(", ")}`,
    ].filter(Boolean).join(" · ");
    const icon = <RaceIcon race={p.race} rndRace={p.rndRace} className="gr-race" />;
    const name = <span className="gr-p-name">{p.name}</span>;
    // The chip sits on the outer end of the line, away from the divider
    const mvp = mvpTag && p.battleTag === mvpTag ? <span className="gr-mvp">MVP</span> : null;
    return (
      <span
        key={i}
        className={`gr-p${isSelf ? " gr-p--self" : ""}${atClass}`}
        title={title}
        data-self-seat={isSelf ? seat : undefined}
        onClick={isSelf ? undefined : goTo(p.battleTag)}
      >
        {mine ? <>{mvp}{name}{icon}</> : <>{icon}{name}{mvp}</>}
      </span>
    );
  };

  const content = (
    <>
      <div className="gr-col gr-game">
        {/* The result and what it cost or paid, together: one glance per row */}
        <span className={`gr-result ${won ? "gr-result--won" : "gr-result--lost"}`}>
          <span className="gr-result-letter">{won ? "W" : "L"}</span>
          <span className="gr-mmr-change">
            {mmrChange >= 0 ? "+" : ""}
            {mmrChange}
          </span>
        </span>
        {mapUrl && (
          <img
            src={mapUrl}
            alt=""
            className="gr-map-img"
            loading="lazy"
            // A map we have no minimap for should leave a gap, not a bordered
            // empty box that reads as a broken row
            onError={(e) => { e.target.style.display = "none"; }}
          />
        )}
        <span className="gr-game-meta">
          <span className="gr-map-name">{cleanMapName}</span>
          <span className="gr-game-sub">
            {modeLabel && <><span className="gr-mode">{modeLabel}</span> · </>}
            {formatDuration(match.durationInSeconds)} · {formatTimeAgo(match.endTime)}
          </span>
        </span>
      </div>

      <div className="gr-col gr-heroes" data-heroes={heroes.length}>
        {heroSlots(heroes, "mine")}
      </div>

      <div className="gr-col gr-side gr-side--mine" data-team="ally">
        {teamMembers.slice(0, 4).map((p, i) => chip(p, i, true))}
      </div>

      <div className="gr-col gr-mid">
        <span className="gr-avg gr-avg--mine" title="Your team's average MMR">{myAvg ?? "–"}</span>
        <span className="gr-vs">vs</span>
        <span className="gr-avg gr-avg--theirs" title="Opponents' average MMR">{theirAvg ?? "–"}</span>
      </div>

      <div className="gr-col gr-side gr-side--theirs" data-team="opponent">
        {opponents.slice(0, 4).map((p, i) => chip(p, i, false))}
      </div>

      {/* The mirror of the hero column, so a 1v1 row reads outward from the
          centre: your heroes, you, the MMRs, them, their heroes. */}
      {soloOpponent && (
        <div className="gr-col gr-heroes gr-heroes--theirs" data-heroes={opponentHeroes.length}>
          {heroSlots(opponentHeroes, "theirs", true)}
        </div>
      )}
    </>
  );

  const classNames = ["game-row", won ? "gr-won" : "gr-lost", striped && "gr-striped", className]
    .filter(Boolean)
    .join(" ");

  if (href) {
    return (
      <Link to={href} className={classNames}>
        {content}
      </Link>
    );
  }

  return <div className={classNames}>{content}</div>;
};

export default GameRow;
