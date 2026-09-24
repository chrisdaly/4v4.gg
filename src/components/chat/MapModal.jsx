import React, { useEffect, useMemo } from "react";
import styled from "styled-components";
import WorldMap from "../WorldMap";
import { Button, ModalBackdrop } from "../ui";
import { Panel, PanelHeader, CountPill } from "./panel";
import { buildMapData, countriesLabel, regionOf } from "../../lib/chat/regions";

/**
 * The fullscreen world map behind the map panel's body click / expand
 * button on /chat. Same data as MapPanel, in WorldMap's full mode (name and
 * time labels), with the region filter shared with the page: a dot click
 * or a region name in the caption toggles it, "Show all" clears it.
 *
 * Props
 *   users, avatars, stats, inGameTags  the roster and its lookups (buildMapData)
 *   regions        regionSummary rows [{ name, count }] for the caption
 *   region         the selected region name, or null
 *   onRegionChange (name | null) => void
 *   onClose        () => void; the close button, the backdrop and Esc
 */

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

const RegionName = styled.span`
  font-family: var(--font-display);
  font-size: var(--text-xs);
  color: var(--white);
  white-space: nowrap;
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

export default function MapModal({ users, avatars, stats, inGameTags, regions = [], region = null, onRegionChange, onClose }) {
  const { playerCountries, mapPlayers } = useMemo(
    () => buildMapData(users, { stats, avatars, inGameTags }),
    [users, stats, avatars, inGameTags]
  );

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
  const onDotClick = (code) => toggleRegion(regionOf(code));

  return (
    <ModalBackdrop onClick={onClose} data-map-modal>
      <Dialog role="dialog" aria-modal="true" aria-label="World map" onClick={(e) => e.stopPropagation()}>
        <PanelHeader>
          <Title>4v4.GG</Title>
          <CountPill data-country-count>{countriesLabel(playerCountries.size)}</CountPill>
          {region && (
            <>
              <RegionName data-map-region>{region}</RegionName>
              <ShowAll type="button" onClick={() => onRegionChange?.(null)}>
                Show all
              </ShowAll>
            </>
          )}
          <CloseButton $icon type="button" aria-label="Close map" onClick={onClose}>
            &times;
          </CloseButton>
        </PanelHeader>
        <MapBox data-map-modal-box>
          <WorldMap
            instant
            highlightInGame
            playerCountries={playerCountries}
            players={mapPlayers}
            dimOutside={region}
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
      </Dialog>
    </ModalBackdrop>
  );
}
