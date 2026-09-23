import React from "react";
import styled from "styled-components";
import { CountryFlag } from "../ui";
import { Panel, PanelHeader, PanelLabel, Hint, scrollStyles } from "./panel";

/**
 * Region ranking under the map on /chat: one row per region (from
 * regionSummary in lib/chat/regions) with the online count, average MMR,
 * local time and a share bar. Clicking a row toggles the region filter.
 */

const ShowAll = styled.button`
  margin-left: auto;
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

const List = styled.div`
  ${scrollStyles}
  padding: 6px 6px 8px;
  display: flex;
  flex-direction: column;
`;

const Row = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 7px 8px;
  border-radius: var(--radius-md);
  cursor: pointer;
  background: ${(p) => (p.$selected ? "var(--gold-tint)" : "transparent")};
  opacity: ${(p) => (p.$muted ? 0.5 : 1)};
  transition: background var(--transition), opacity var(--transition);
  &:hover {
    background: ${(p) => (p.$selected ? "var(--gold-tint)" : "var(--gold-tint-subtle)")};
  }
`;

const Line = styled.div`
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  min-width: 0;
`;

const Name = styled.span`
  font-family: var(--font-display);
  font-size: 13px;
  color: var(--white);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
`;

const Flags = styled.span`
  display: flex;
  gap: 2px;
  flex-shrink: 0;
  align-self: center;
  img {
    width: 14px;
    height: 10px;
    border-radius: 1px;
    display: block;
  }
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

const LocalTime = styled.span`
  color: var(--grey-light);
  opacity: 0.7;
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

export default function RegionsPanel({ rows = [], region = null, onRegionChange, className }) {
  const pick = (name) => onRegionChange?.(region === name ? null : name);
  return (
    <Panel className={className} data-regions-panel aria-label="Regions">
      <PanelHeader>
        <PanelLabel>Regions</PanelLabel>
        <Hint>online · avg MMR · local</Hint>
        {region && (
          <ShowAll type="button" onClick={() => onRegionChange?.(null)}>
            Show all
          </ShowAll>
        )}
      </PanelHeader>
      <List>
        {rows.map((r) => (
          <Row
            key={r.name}
            data-region={r.name}
            data-selected={region === r.name ? "true" : undefined}
            $selected={region === r.name}
            $muted={Boolean(region) && region !== r.name}
            role="button"
            tabIndex={0}
            aria-pressed={region === r.name}
            onClick={() => pick(r.name)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                pick(r.name);
              }
            }}
          >
            <Line>
              <Name>{r.name}</Name>
              <Flags>
                {r.topCountries.map((code) => (
                  <CountryFlag key={code} name={code.toLowerCase()} />
                ))}
              </Flags>
              <Numbers>
                <Count data-region-count>{r.count}</Count>
                <Avg data-region-avg>{r.avgMmr ?? "-"}</Avg>
                <LocalTime data-region-time>{r.localTime}</LocalTime>
              </Numbers>
            </Line>
            <Track>
              <Fill $share={r.share} />
            </Track>
          </Row>
        ))}
      </List>
    </Panel>
  );
}
