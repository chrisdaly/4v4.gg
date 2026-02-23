import React from "react";
import styled from "styled-components";
import PlaystyleReport from "./PlaystyleReport";

const SEGMENT_LABELS = {
  action: "Actions",
  apm: "APM",
  hotkey: "Hotkeys",
  tempo: "Tempo",
  intensity: "Intensity",
  transitions: "Switching",
  rhythm: "Rhythm",
};

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function PersonaSplit({ personaData }) {
  if (!personaData || !personaData.split) return null;

  const { silhouette, clusterSizes, interClusterSimilarity, topDivergences = [], personas } = personaData;

  return (
    <Wrap>
      {/* Banner */}
      <Banner>
        <BannerTitle>Possible Account Sharing</BannerTitle>
        <BannerStats>
          <Stat>
            <StatLabel>Separation</StatLabel>
            <StatValue>{Math.round(silhouette * 100)}%</StatValue>
          </Stat>
          <Stat>
            <StatLabel>Similarity</StatLabel>
            <StatValue>{Math.round((interClusterSimilarity || 0) * 100)}%</StatValue>
          </Stat>
          <Stat>
            <StatLabel>Split</StatLabel>
            <StatValue>{clusterSizes[0]} / {clusterSizes[1]}</StatValue>
          </Stat>
        </BannerStats>
      </Banner>

      {/* Divergence bars */}
      {topDivergences.length > 0 && (
        <DivergenceSection>
          <DivLabel>Top Divergences</DivLabel>
          {topDivergences.map((d) => (
            <DivRow key={d.segment}>
              <DivSegName>{SEGMENT_LABELS[d.segment] || d.segment}</DivSegName>
              <DivTrack>
                <DivFill style={{ width: `${Math.round(d.divergence * 100)}%` }} />
              </DivTrack>
              <DivPct>{Math.round(d.divergence * 100)}%</DivPct>
            </DivRow>
          ))}
        </DivergenceSection>
      )}

      {/* Side-by-side reports */}
      <Grid>
        {personas.map((persona, i) => (
          <PersonaCol key={i}>
            <PersonaHeader $idx={i}>
              <PersonaLabel>Persona {i === 0 ? "A" : "B"}</PersonaLabel>
              <PersonaMeta>
                {persona.replayCount} game{persona.replayCount !== 1 ? "s" : ""}
                {persona.dateRange && (
                  <> · {formatDate(persona.dateRange.earliest)}–{formatDate(persona.dateRange.latest)}</>
                )}
              </PersonaMeta>
            </PersonaHeader>
            <PlaystyleReport profileData={persona} />
          </PersonaCol>
        ))}
      </Grid>
    </Wrap>
  );
}

/* ── Styled Components ───────────────────────────────── */

const Wrap = styled.div`
  margin-top: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
`;

const Banner = styled.div`
  border: 1px solid var(--red);
  border-radius: var(--radius-md);
  background: rgba(255, 50, 50, 0.06);
  padding: var(--space-4) var(--space-6);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  flex-wrap: wrap;
`;

const BannerTitle = styled.div`
  font-family: var(--font-display);
  font-size: var(--text-base);
  color: var(--red);
`;

const BannerStats = styled.div`
  display: flex;
  gap: var(--space-6);
`;

const Stat = styled.div`
  text-align: center;
`;

const StatLabel = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 2px;
`;

const StatValue = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: #fff;
  font-weight: 600;
`;

const DivergenceSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: var(--space-4);
  border: 1px solid var(--grey-mid);
  border-radius: var(--radius-md);
  background: rgba(0, 0, 0, 0.3);
`;

const DivLabel = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--gold);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: var(--space-2);
`;

const DivRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const DivSegName = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
  width: 72px;
  text-transform: uppercase;
`;

const DivTrack = styled.div`
  flex: 1;
  height: 6px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 3px;
  overflow: hidden;
`;

const DivFill = styled.div`
  height: 100%;
  background: var(--red);
  border-radius: 3px;
  opacity: 0.8;
`;

const DivPct = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
  width: 36px;
  text-align: right;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const PersonaCol = styled.div`
  min-width: 0;
`;

const PersonaHeader = styled.div`
  margin-bottom: var(--space-3);
  padding-bottom: var(--space-2);
  border-bottom: 2px solid ${p => p.$idx === 0 ? "var(--gold)" : "var(--green)"};
`;

const PersonaLabel = styled.div`
  font-family: var(--font-display);
  font-size: var(--text-base);
  color: #fff;
`;

const PersonaMeta = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
  margin-top: 2px;
`;
