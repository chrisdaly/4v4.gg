import React, { useState, useCallback } from "react";
import styled from "styled-components";
import { PageLayout, PageNav, PageHero } from "../components/ui";
import { ReplayLabProvider } from "../lib/useReplayLabStore";
import InvestigateTab from "./replay-lab/InvestigateTab";
import CompareTab from "./replay-lab/CompareTab";

const TABS = [
  { key: "investigate", label: "Investigate" },
  { key: "compare", label: "Compare" },
];

const TAB_CONTENT = {
  investigate: {
    title: "Smurf Investigation",
    lead: "Analyze playstyle fingerprints to identify potential alternate accounts. The system compares hotkey usage, APM patterns, and action distributions.",
  },
  compare: {
    title: "Compare Replays",
    lead: "Upload .w3g files to compare playstyle fingerprints side by side.",
  },
};

const Inner = styled.div`
  max-width: 1100px;
  margin: 0 auto;
`;

function ReplayLabInner() {
  const [activeTab, setActiveTab] = useState("investigate");
  const switchTab = useCallback((key) => setActiveTab(key), []);
  const { title, lead } = TAB_CONTENT[activeTab] || TAB_CONTENT.investigate;

  return (
    <PageLayout bare>
      <Inner>
        <PageNav
          backTo="/"
          backLabel="Home"
          tabs={TABS}
          activeTab={activeTab}
          onTab={switchTab}
        />
        <PageHero eyebrow="Replay Lab" title={title} lead={lead} />
        {activeTab === "investigate" && <InvestigateTab />}
        {activeTab === "compare" && <CompareTab />}
      </Inner>
    </PageLayout>
  );
}

export default function ReplayLab() {
  return (
    <ReplayLabProvider>
      <ReplayLabInner />
    </ReplayLabProvider>
  );
}
