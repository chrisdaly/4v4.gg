import React from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { FiExternalLink } from "react-icons/fi";
import { PageLayout } from "../components/PageLayout";
import { PageHero } from "../components/ui";

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-4);
  margin-top: var(--space-6);
`;

const ToolCard = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-6);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(var(--gold-muted-rgb), 0.2);
  border-radius: var(--radius-md);
  color: inherit;
  text-decoration: none;
  transition: all 0.15s;

  &:hover {
    border-color: var(--gold);
    background: rgba(252, 219, 51, 0.06);
  }
`;

const CardBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const CardTitle = styled.span`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: #fff;
`;

const CardDesc = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
`;

const TOOLS = [
  {
    to: "/truesight",
    title: "True Sight",
    desc: "Analyze playstyles, fingerprint players, identify smurfs",
  },
  {
    to: "/signatures",
    title: "Signatures",
    desc: "Browse all fingerprinted player profiles",
  },
  {
    to: "/glyph-lab",
    title: "Glyph Lab",
    desc: "Explore unit transition glyphs",
  },
  {
    to: "/blurb-lab",
    title: "Blurb Lab",
    desc: "Tune the LLM match ticker — inspect fact sheets, tweak the prompt",
  },
];

const Lab = () => (
  <PageLayout>
    <PageHero title="Lab" subtitle="Internal tools — admin only" />
    <Grid>
      {TOOLS.map(({ to, title, desc }) => (
        <ToolCard key={to} to={to}>
          <CardBody>
            <CardTitle>{title}</CardTitle>
            <CardDesc>{desc}</CardDesc>
          </CardBody>
          <FiExternalLink size={16} color="var(--grey-light)" />
        </ToolCard>
      ))}
    </Grid>
  </PageLayout>
);

export default Lab;
