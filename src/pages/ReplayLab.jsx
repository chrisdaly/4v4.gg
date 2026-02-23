import React, { useState, useCallback, useEffect } from "react";
import styled from "styled-components";
import { useLocation, useHistory } from "react-router-dom";
import { PageLayout, PageNav, PageHero } from "../components/ui";
import { ReplayLabProvider } from "../lib/useReplayLabStore";
import ExploreTab from "./replay-lab/ExploreTab";
import SmurfsTab from "./replay-lab/SmurfsTab";
import CompareTab from "./replay-lab/CompareTab";
import GalleryTab from "./replay-lab/GalleryTab";

const TABS = [
  { key: "explore", label: "Explore" },
  { key: "gallery", label: "Gallery" },
  { key: "smurfs", label: "Smurfs" },
  { key: "compare", label: "Compare" },
];

const TAB_CONTENT = {
  explore: {
    title: "Player Explorer",
    lead: "Browse indexed players, view their playstyle fingerprints, and discover their nearest neighbors.",
  },
  gallery: {
    title: "Gallery",
    lead: "The most distinctive playstyles in the indexed population — player extremes across every behavioral dimension.",
  },
  smurfs: {
    title: "Smurf Detection",
    lead: "Suspect pairs ranked by playstyle similarity. High scores indicate players who may share an account or be the same person.",
  },
  compare: {
    title: "Compare Replays",
    lead: "Upload .w3g files to compare playstyle fingerprints side by side.",
  },
};

const Inner = styled.div`
  max-width: 1200px;
  margin: 0 auto;

  /* Add staggered reveal animations */
  > * {
    animation: reveal-up 600ms cubic-bezier(0.17, 0.76, 0.28, 1) both;
  }

  > *:nth-child(1) { animation-delay: 0.05s; }
  > *:nth-child(2) { animation-delay: 0.1s; }
  > *:nth-child(3) { animation-delay: 0.15s; }

  @keyframes reveal-up {
    from {
      opacity: 0;
      transform: translateY(18px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (prefers-reduced-motion) {
    > * {
      animation: none;
      opacity: 1;
      transform: none;
    }
  }
`;

function ReplayLabInner() {
  const location = useLocation();
  const history = useHistory();
  const params = new URLSearchParams(location.search);
  const initialTab = TABS.find(t => t.key === params.get("tab"))?.key || "explore";
  const initialPlayer = params.get("player") || null;

  const [activeTab, setActiveTab] = useState(initialTab);

  const switchTab = useCallback((key) => {
    setActiveTab(key);
    const p = new URLSearchParams(location.search);
    if (key === "explore") p.delete("tab"); else p.set("tab", key);
    p.delete("player");
    history.replace({ search: p.toString() ? `?${p}` : "" });
  }, [history, location.search]);
  const { title, lead } = TAB_CONTENT[activeTab] || TAB_CONTENT.explore;

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
        {activeTab === "explore" && <ExploreTab initialPlayer={initialPlayer} />}
        {activeTab === "gallery" && <GalleryTab />}
        {activeTab === "smurfs" && <SmurfsTab />}
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
