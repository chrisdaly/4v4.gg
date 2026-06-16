import React, { useState, useCallback } from "react";
import styled from "styled-components";
import { useLocation, useHistory } from "react-router-dom";
import { PageLayout, PageNav, PageHero } from "../components/ui";
import { ReplayLabProvider } from "../lib/useReplayLabStore";
import ExploreTab from "./replay-lab/ExploreTab";
import SmurfsTab from "./replay-lab/SmurfsTab";
import GalleryTab from "./replay-lab/GalleryTab";
import ValidationTab from "./replay-lab/ValidationTab";
import InvestigateTab from "./replay-lab/InvestigateTab";

const TABS = [
  { key: "identify", label: "Identify" },
  { key: "map",      label: "Map" },
  { key: "signatures", label: "Signatures" },
  { key: "confirmed",  label: "Confirmed" },
];

// Redirect old tab keys to their new equivalents
const LEGACY_KEYS = {
  scout:      "identify",
  compare:    "identify",
  explore:    "map",
  gallery:    "signatures",
  smurfs:     "confirmed",
  validation: "confirmed",
};

const TAB_CONTENT = {
  identify: {
    title: "Identify",
    lead: "Search any player to find similar-fingerprint candidates — backed by playstyle fingerprint + neural similarity.",
  },
  map: {
    title: "Player Map",
    lead: "Browse indexed players, view their playstyle fingerprints, and discover their nearest neighbors.",
  },
  signatures: {
    title: "Signatures",
    lead: "The most distinctive playstyles in the indexed population — player extremes across every behavioral dimension.",
  },
  confirmed: {
    title: "Confirmed",
    lead: "Verified smurf–main pairs and auto-detected suspects ranked by playstyle similarity.",
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
  const rawKey = params.get("tab");
  const resolvedKey = LEGACY_KEYS[rawKey] || rawKey;
  const initialTab = TABS.find(t => t.key === resolvedKey)?.key || "identify";
  const initialPlayer = params.get("player") || null;

  const [activeTab, setActiveTab] = useState(initialTab);

  const switchTab = useCallback((key) => {
    setActiveTab(key);
    const p = new URLSearchParams(location.search);
    if (key === "identify") p.delete("tab"); else p.set("tab", key);
    p.delete("player");
    history.replace({ search: p.toString() ? `?${p}` : "" });
  }, [history, location.search]);

  const { title, lead } = TAB_CONTENT[activeTab] || TAB_CONTENT.identify;

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
        <PageHero eyebrow="True Sight" title={title} lead={lead} />
        {activeTab === "identify"   && <InvestigateTab />}
        {activeTab === "map"        && <ExploreTab initialPlayer={initialPlayer} />}
        {activeTab === "signatures" && <GalleryTab />}
        {activeTab === "confirmed"  && (
          <>
            <ValidationTab />
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", margin: "var(--space-8) 0" }} />
            <SmurfsTab />
          </>
        )}
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
