import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";
import { HiOutlineChartBar, HiOutlineNewspaper, HiOutlineArrowsExpand } from "react-icons/hi";
import { GiCrossedSwords } from "react-icons/gi";
import WorldMap from "../WorldMap";
import { Button } from "../ui";
import { Panel, PanelHeader, CountPill } from "./panel";
import { buildMapData, countriesLabel, outsideScope, regionOf } from "../../lib/chat/regions";
import { fetchTodayDigest } from "../../lib/chat/digestToday";

/**
 * The map panel on /chat: the 4v4.GG home link with the relay dot, the
 * countries pill, the page's icon buttons (stats, today's digest, games
 * toggle) and the world map. Clicking a dot toggles the region filter
 * (onRegionChange); dots outside the selected region, or the selected
 * country (`country`, set from the fullscreen modal), dim. A click anywhere
 * else on the map body, or the expand button in its corner, calls onExpand
 * (Chat.jsx opens the fullscreen MapModal with it).
 */

const MIN_MAP_HEIGHT = 170; // px

/** Today's digest link ({ date, href }) or null; one cached relay call. */
export function useDigestToday() {
  const [digest, setDigest] = useState(null);
  useEffect(() => {
    let cancelled = false;
    fetchTodayDigest().then((d) => {
      if (!cancelled) setDigest(d);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return digest;
}

const Home = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
  letter-spacing: 0.02em;
  text-decoration: none;
  white-space: nowrap;
  &:hover {
    color: var(--white);
  }
`;

const RelayDot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: var(--radius-full);
  background: ${(p) => (p.$ok ? "var(--green)" : "var(--red)")};
  flex-shrink: 0;
`;

const Actions = styled.div`
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 2px;
`;

const IconButton = styled(Button)`
  width: 24px;
  height: 24px;
  padding: 0;
  border-radius: var(--radius-sm);
  svg {
    width: 14px;
    height: 14px;
  }
  &[data-active="true"] {
    color: var(--gold);
    background: var(--gold-tint);
  }
`;

const MapBox = styled.div`
  flex: 1;
  min-height: ${MIN_MAP_HEIGHT}px;
  position: relative;
  display: flex;
  cursor: zoom-in;
`;

const ExpandButton = styled(IconButton)`
  position: absolute;
  top: 4px;
  right: 4px;
  z-index: 1;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.5);
  background: rgba(10, 8, 6, 0.6);
  &:hover {
    color: var(--white);
  }
`;

const isDot = (target) => Boolean(target?.closest?.("circle.map-dot"));

export default function MapPanel({
  users,
  avatars,
  stats,
  inGameTags,
  status,
  region = null,
  country = null,
  onRegionChange,
  statsOpen = false,
  onStatsOpenChange,
  showGames = true,
  onShowGamesChange,
  onExpand,
  className,
}) {
  const { playerCountries, mapPlayers } = useMemo(
    () => buildMapData(users, { stats, avatars, inGameTags }),
    [users, stats, avatars, inGameTags]
  );
  const dimOutside = useMemo(() => outsideScope({ region, country }), [region, country]);
  const digest = useDigestToday();
  const connected = status === "connected";
  const countryCount = playerCountries.size;

  const onDotClick = (code) => {
    if (!onRegionChange) return;
    const r = regionOf(code);
    onRegionChange(region === r ? null : r);
  };

  // WorldMap stops a dot click's propagation; the target check covers a host
  // whose dots do not (tests) and keeps a dot click from also expanding
  const onBodyClick = (e) => {
    if (isDot(e.target)) return;
    onExpand?.();
  };
  const onExpandClick = (e) => {
    e.stopPropagation();
    onExpand?.();
  };

  return (
    <Panel className={className} data-map-panel aria-label="World map">
      <PanelHeader>
        <Home to="/" title={`4v4.GG home · relay ${status || "connecting"}`}>
          4v4.GG
          <RelayDot data-relay-status={status || "connecting"} $ok={connected} title={`Relay ${status || "connecting"}`} />
        </Home>
        <CountPill data-country-count>{countriesLabel(countryCount)}</CountPill>
        <Actions>
          <IconButton
            type="button"
            $icon
            data-active={statsOpen}
            aria-pressed={statsOpen}
            aria-label="Channel stats"
            title={statsOpen ? "Hide channel stats" : "Show channel stats"}
            onClick={() => onStatsOpenChange?.(!statsOpen)}
          >
            <HiOutlineChartBar />
          </IconButton>
          {digest && (
            <IconButton as={Link} to={digest.href} $icon aria-label="Today's digest" title={`Today's digest (${digest.date})`} data-digest>
              <HiOutlineNewspaper />
            </IconButton>
          )}
          <IconButton
            type="button"
            $icon
            data-active={showGames}
            aria-pressed={showGames}
            aria-label="Game tickers"
            title={showGames ? "Hide game tickers" : "Show game tickers"}
            onClick={() => onShowGamesChange?.(!showGames)}
          >
            <GiCrossedSwords />
          </IconButton>
        </Actions>
      </PanelHeader>
      <MapBox data-map-box onClick={onBodyClick}>
        <ExpandButton type="button" $icon aria-label="Expand map" title="Expand map" onClick={onExpandClick}>
          <HiOutlineArrowsExpand />
        </ExpandButton>
        <WorldMap
          instant
          highlightInGame
          playerCountries={playerCountries}
          players={mapPlayers}
          dimOutside={dimOutside}
          onDotClick={onDotClick}
        />
      </MapBox>
    </Panel>
  );
}
