import React, { useEffect, useMemo, useState } from "react";
import styled, { css } from "styled-components";
import WorldMap from "../WorldMap";
import MmrBeeswarmV from "./MmrBeeswarmV";
import { buildPulseData } from "../../lib/chat/pulseData";

/**
 * The Pulse column on /chat, between the stream and the roster (desktop
 * only: hidden below 1100px). Top to bottom: a "Pulse" label with the
 * countries count, the compact world map with the top-three countries
 * under it, and the vertical MMR beeswarm filling the rest. `open` is the
 * persisted chat:showPulse preference (Chat.jsx, toggled from the Pulse
 * pill in the ChatPanel header); Focus mode (body.chat-focus) hides the
 * column too. Clicking a beeswarm dot calls onPlayerClick(tag), which the
 * page turns into a roster filter.
 */

export const PULSE_WIDTH = 360; // px
export const PULSE_BREAKPOINT = 1100; // px viewport, hidden below
const MAP_HEIGHT = 200; // px
const SWARM_MIN_HEIGHT = 240; // px

/** True while document.body carries the class (the ChatPanel Focus contract). */
function useBodyClass(cls) {
  const [present, setPresent] = useState(() => document.body.classList.contains(cls));
  useEffect(() => {
    const update = () => setPresent(document.body.classList.contains(cls));
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, [cls]);
  return present;
}

const Column = styled.aside`
  width: ${PULSE_WIDTH}px;
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;

  @media (max-width: ${PULSE_BREAKPOINT - 1}px) {
    display: none;
  }
`;

const Frame = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
  background: ${(p) => p.$theme?.bg || "var(--panel-bg)"};
  backdrop-filter: ${(p) => p.$theme?.blur || "blur(1px)"};
  border: ${(p) => p.$theme?.border || "8px solid transparent"};
  border-image: ${(p) => p.$theme?.borderImage || 'url("/frames/chat/ChatFrameBorder.png") 30 / 8px stretch'};
  box-shadow: ${(p) => p.$theme?.shadow || "none"};
`;

const label = css`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--grey-light);
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid rgba(var(--gold-muted-rgb), 0.2);
  flex-shrink: 0;
`;

const Label = styled.span`
  ${label}
`;

const Countries = styled.span`
  margin-left: auto;
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
  white-space: nowrap;
`;

const MapBox = styled.div`
  width: 100%;
  height: ${MAP_HEIGHT}px;
  display: flex;
  flex-shrink: 0;
`;

const TopCountries = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xxxs);
  color: var(--grey-light);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: var(--space-1) var(--space-4);
  min-height: 1em;
  flex-shrink: 0;
`;

const SwarmBox = styled.div`
  flex: 1;
  min-height: ${SWARM_MIN_HEIGHT}px;
  display: flex;
  padding: var(--space-2) var(--space-2) var(--space-2) var(--space-1);
  border-top: 1px solid rgba(var(--gold-muted-rgb), 0.2);
`;

export default function PulseColumn({
  open = true,
  users,
  stats,
  avatars,
  inGameTags,
  watchList,
  onPlayerClick,
  borderTheme,
}) {
  const focus = useBodyClass("chat-focus");
  const pulse = useMemo(() => buildPulseData(users, stats, avatars, inGameTags), [users, stats, avatars, inGameTags]);

  if (!open || focus) return null;

  return (
    <Column data-pulse aria-label="Channel pulse">
      <Frame $theme={borderTheme}>
        <Header>
          <Label>Pulse</Label>
          <Countries data-pulse-countries>{pulse.countriesLabel}</Countries>
        </Header>
        <MapBox data-pulse-map>
          <WorldMap compact instant playerCountries={pulse.playerCountries} players={pulse.mapPlayers} />
        </MapBox>
        <TopCountries data-pulse-top>{pulse.topLabel}</TopCountries>
        <SwarmBox data-pulse-swarm>
          <MmrBeeswarmV players={pulse.stripPlayers} inGameTags={inGameTags} watchList={watchList} onPlayerClick={onPlayerClick} />
        </SwarmBox>
      </Frame>
    </Column>
  );
}
