import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";
import { HiOutlineArrowLeft } from "react-icons/hi";
import WorldMap from "../WorldMap";
import { Button, CountryFlag, Input, ModalBackdrop } from "../ui";
import { Avatar } from "../UserListSidebar";
import useIdleTags from "../../lib/chat/useIdleTags";
import { formatGameMinutes } from "./chip";
import { Panel, PanelHeader, CountPill, scrollStyles } from "./panel";
import { buildMapData, countriesLabel, countryNameOf, countryOf, countrySummary, outsideScope } from "../../lib/chat/regions";

/**
 * The fullscreen world map behind the map panel's body click / expand
 * button on /chat. Same data as MapPanel, in WorldMap's full mode (name and
 * time labels), plus a right rail to dig into the roster by country.
 *
 * The page keeps one scope at a time, a region or a country. A region name
 * in the caption toggles the region; a dot click or a country row in the
 * rail selects that country, which switches the rail to its players; the
 * back arrow returns to the country list; "Show all" in the header clears
 * whichever is set. The scope outlives the modal: the roster stays narrowed
 * after closing, which is the point of drilling in.
 *
 * Props
 *   users, avatars, stats, inGameTags  the roster and its lookups (buildMapData)
 *   inGameInfoMap   battleTag -> { matchId, mapName, startTime } for the game rows
 *   regions         regionSummary rows [{ name, count }] for the caption
 *   region          the selected region name, or null
 *   country         the selected country code, or null
 *   onRegionChange  (name | null) => void
 *   onCountryChange (code | null) => void
 *   onOpenGame      (inGameInfoMap entry) => void; an in-game player row
 *   onClose         () => void; the close button, the backdrop and Esc
 */

const RAIL_WIDTH = 320; // px
const AVATAR = 28; // px

const Dialog = styled(Panel)`
  width: 92vw;
  max-width: 1400px;
  height: 88vh;
  background: rgba(10, 8, 6, 0.92);
`;

const Title = styled.span`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
  letter-spacing: 0.02em;
  white-space: nowrap;
`;

const ScopeName = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-display);
  font-size: var(--text-xs);
  color: var(--white);
  white-space: nowrap;
  img {
    width: 16px;
    height: 12px;
    border-radius: 1px;
    display: block;
  }
`;

const ShowAll = styled.button`
  background: none;
  border: 0;
  padding: 0;
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--gold);
  cursor: pointer;
  &:hover {
    color: var(--white);
  }
`;

const CloseButton = styled(Button)`
  margin-left: auto;
  flex-shrink: 0;
`;

const Body = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
`;

const MapColumn = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
`;

const MapBox = styled.div`
  flex: 1;
  min-height: 0;
  position: relative;
  display: flex;
`;

const Caption = styled.div`
  flex-shrink: 0;
  padding: 8px 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const CaptionRegion = styled.button`
  background: none;
  border: 0;
  padding: 0;
  font: inherit;
  color: var(--grey-light);
  cursor: pointer;
  &:hover {
    color: var(--white);
  }
  &[data-active="true"] {
    color: var(--gold);
  }
`;

const CaptionCount = styled.span`
  color: var(--white);
  margin-left: 4px;
`;

const Sep = styled.span`
  margin: 0 8px;
  opacity: 0.5;
`;

/* ── Rail ──────────────────────────────────────────────────────────── */

const Rail = styled.aside`
  width: ${RAIL_WIDTH}px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-left: 1px solid rgba(255, 255, 255, 0.07);
  background: rgba(10, 8, 6, 0.62);
`;

const RailTop = styled.div`
  padding: 10px 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
`;

const FilterInput = styled(Input)`
  font-size: var(--text-xxs);
  padding: 6px 10px;
`;

const RailCaption = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  color: var(--grey-light);
  opacity: 0.7;
  letter-spacing: 0.05em;
`;

const RailList = styled.div`
  ${scrollStyles}
  flex: 1;
  min-height: 0;
  padding: 6px 6px 10px;
  display: flex;
  flex-direction: column;
`;

const CountryRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 7px 8px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background var(--transition);
  &:hover {
    background: var(--gold-tint-subtle);
  }
`;

const Line = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
`;

const Flag = styled.span`
  flex-shrink: 0;
  line-height: 0;
  img {
    width: 16px;
    height: 12px;
    border-radius: 1px;
    display: block;
  }
`;

const CountryName = styled.span`
  font-family: var(--font-display);
  font-size: 13px;
  color: var(--white);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
`;

const Numbers = styled.span`
  margin-left: auto;
  display: flex;
  gap: 10px;
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
`;

const Count = styled.span`
  color: var(--white);
`;

const Avg = styled.span`
  color: var(--grey-light);
`;

const Track = styled.div`
  height: 3px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: var(--radius-sm);
  overflow: hidden;
`;

const Fill = styled.div`
  height: 100%;
  width: ${(p) => Math.round(p.$share * 100)}%;
  background: var(--gold);
`;

const PlayersHeader = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 4px 4px 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  margin-bottom: 4px;
`;

const BackButton = styled(Button)`
  width: 24px;
  height: 24px;
  padding: 0;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
  svg {
    width: 14px;
    height: 14px;
  }
`;

const PlayersCount = styled.span`
  margin-left: auto;
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--white);
  flex-shrink: 0;
`;

const PlayerRow = styled.div`
  display: grid;
  grid-template-columns: ${AVATAR}px minmax(0, 1fr) 6px 40px;
  align-items: center;
  gap: 9px;
  padding: 4px 6px;
  border-radius: var(--radius-md);
  opacity: ${(p) => (p.$dim === "idle" ? 0.6 : 1)};
  transition: background var(--transition);
  ${(p) => p.$clickable && "cursor: pointer;"}
  &:hover {
    background: var(--gold-tint-subtle);
  }
`;

const PlayerName = styled(Link)`
  min-width: 0;
  font-family: var(--font-display);
  font-size: var(--text-xs);
  color: ${(p) => (p.$dim === "idle" ? "rgba(var(--gold-muted-rgb), 0.8)" : "var(--gold)")};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-decoration: none;
  &:hover {
    text-decoration: underline;
  }
`;

const GameDot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: var(--radius-full);
  background: ${(p) => (p.$on ? "var(--red)" : "transparent")};
`;

const Mmr = styled.span`
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--white);
  text-align: right;
`;

const Empty = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--grey-light);
  padding: var(--space-3) var(--space-2);
`;

const playerUrl = (tag) => `/player/${encodeURIComponent(tag)}`;
const playersLabel = (n) => `${n} ${n === 1 ? "player" : "players"}`;

/* ── Component ─────────────────────────────────────────────────────── */

export default function MapModal({
  users,
  avatars,
  stats,
  inGameTags,
  inGameInfoMap,
  regions = [],
  region = null,
  country = null,
  onRegionChange,
  onCountryChange,
  onOpenGame,
  onClose,
}) {
  const [filter, setFilter] = useState("");
  const { playerCountries, mapPlayers } = useMemo(
    () => buildMapData(users, { stats, avatars, inGameTags }),
    [users, stats, avatars, inGameTags]
  );
  const countries = useMemo(() => countrySummary(users, { stats, avatars, inGameTags }), [users, stats, avatars, inGameTags]);
  const dimOutside = useMemo(() => outsideScope({ region, country }), [region, country]);
  const idleTags = useIdleTags(users || [], inGameTags);

  // Esc closes this first; capture + stopPropagation keeps the chat panel's
  // own Esc handling (search, date picker) out of it
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  const toggleRegion = (name) => onRegionChange?.(region === name ? null : name);
  const selectCountry = (code) => onCountryChange?.(country === code ? null : code);
  const onDotClick = (code) => selectCountry(code);
  const showAll = () => {
    if (country) onCountryChange?.(null);
    if (region) onRegionChange?.(null);
  };

  const q = filter.trim().toLowerCase();
  const playersView = Boolean(country) || q.length > 0;
  const players = useMemo(() => {
    if (!playersView) return [];
    const mmrOf = (u) => stats?.get(u.battleTag)?.mmr ?? -Infinity;
    return (users || [])
      .filter((u) => !country || countryOf(u, avatars) === country)
      .filter((u) => !q || (u.name || "").toLowerCase().includes(q))
      .sort((a, b) => mmrOf(b) - mmrOf(a) || (a.name || "").localeCompare(b.name || ""));
  }, [playersView, users, stats, avatars, country, q]);

  const scopeLabel = country ? countryNameOf(country) : region;

  return (
    <ModalBackdrop onClick={onClose} data-map-modal>
      <Dialog role="dialog" aria-modal="true" aria-label="World map" onClick={(e) => e.stopPropagation()}>
        <PanelHeader>
          <Title>4v4.GG</Title>
          <CountPill data-country-count>{countriesLabel(playerCountries.size)}</CountPill>
          {scopeLabel && (
            <>
              <ScopeName data-map-region={country ? undefined : region} data-map-country={country || undefined}>
                {country && <CountryFlag name={country.toLowerCase()} />}
                {scopeLabel}
              </ScopeName>
              <ShowAll type="button" onClick={showAll}>
                Show all
              </ShowAll>
            </>
          )}
          <CloseButton $icon type="button" aria-label="Close map" onClick={onClose}>
            &times;
          </CloseButton>
        </PanelHeader>
        <Body>
          <MapColumn>
            <MapBox data-map-modal-box>
              <WorldMap
                instant
                highlightInGame
                playerCountries={playerCountries}
                players={mapPlayers}
                dimOutside={dimOutside}
                onDotClick={onDotClick}
              />
            </MapBox>
            <Caption data-map-caption>
              {regions.map((r, i) => (
                <React.Fragment key={r.name}>
                  {i > 0 && <Sep aria-hidden="true">·</Sep>}
                  <CaptionRegion
                    type="button"
                    data-active={region === r.name}
                    aria-pressed={region === r.name}
                    onClick={() => toggleRegion(r.name)}
                  >
                    {r.name}
                  </CaptionRegion>
                  <CaptionCount>{r.count}</CaptionCount>
                </React.Fragment>
              ))}
            </Caption>
          </MapColumn>
          <Rail data-map-rail aria-label="Players by country">
            <RailTop>
              <FilterInput
                $fullWidth
                type="search"
                placeholder="Filter players"
                aria-label="Filter players"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
              <RailCaption data-rail-caption>
                {playersLabel((users || []).length)} · {countriesLabel(playerCountries.size)}
              </RailCaption>
            </RailTop>
            <RailList>
              {!playersView &&
                countries.map((c) => (
                  <CountryRow
                    key={c.code}
                    data-country-row={c.code}
                    role="button"
                    tabIndex={0}
                    onClick={() => selectCountry(c.code)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        selectCountry(c.code);
                      }
                    }}
                  >
                    <Line>
                      <Flag>
                        <CountryFlag name={c.code.toLowerCase()} />
                      </Flag>
                      <CountryName>{c.name}</CountryName>
                      <Numbers>
                        <Count data-country-row-count>{c.count}</Count>
                        <Avg data-country-row-avg>{c.avgMmr ?? "-"}</Avg>
                      </Numbers>
                    </Line>
                    <Track>
                      <Fill $share={c.share} />
                    </Track>
                  </CountryRow>
                ))}
              {!playersView && countries.length === 0 && <Empty>No countries yet</Empty>}
              {playersView && (
                <>
                  <PlayersHeader data-players-header>
                    <BackButton
                      $icon
                      type="button"
                      aria-label={country ? "Back to countries" : "Clear filter"}
                      title={country ? "Back to countries" : "Clear filter"}
                      onClick={() => (country ? onCountryChange?.(null) : setFilter(""))}
                    >
                      <HiOutlineArrowLeft />
                    </BackButton>
                    {country ? (
                      <ScopeName>
                        <CountryFlag name={country.toLowerCase()} />
                        {countryNameOf(country)}
                      </ScopeName>
                    ) : (
                      <ScopeName>Matches</ScopeName>
                    )}
                    <PlayersCount data-players-count>{players.length}</PlayersCount>
                  </PlayersHeader>
                  {players.length === 0 && <Empty>{country ? `Nobody online in ${countryNameOf(country)}` : "No players match"}</Empty>}
                  {players.map((u) => {
                    const tag = u.battleTag;
                    const inGame = Boolean(inGameTags?.has(tag));
                    const info = inGame ? inGameInfoMap?.get(tag) : null;
                    const open = info && onOpenGame ? () => onOpenGame(info) : null;
                    const dim = idleTags?.has(tag) ? "idle" : undefined;
                    const mmr = stats?.get(tag)?.mmr;
                    const gameTitle = info
                      ? ["in game", info.mapName, formatGameMinutes(info.startTime)].filter(Boolean).join(" · ")
                      : null;
                    return (
                      <PlayerRow
                        key={tag}
                        data-rail-row={tag}
                        data-dim={dim}
                        $dim={dim}
                        $clickable={Boolean(open)}
                        role={open ? "button" : undefined}
                        tabIndex={open ? 0 : undefined}
                        title={gameTitle || undefined}
                        onClick={open || undefined}
                        onKeyDown={
                          open
                            ? (e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  open();
                                }
                              }
                            : undefined
                        }
                      >
                        <Avatar tag={tag} avatars={avatars} stats={stats} />
                        <PlayerName to={playerUrl(tag)} $dim={dim} onClick={(e) => e.stopPropagation()}>
                          {u.name}
                        </PlayerName>
                        <GameDot data-in-game={inGame ? "true" : undefined} $on={inGame} />
                        <Mmr>{mmr != null ? Math.round(mmr) : ""}</Mmr>
                      </PlayerRow>
                    );
                  })}
                </>
              )}
            </RailList>
          </Rail>
        </Body>
      </Dialog>
    </ModalBackdrop>
  );
}
