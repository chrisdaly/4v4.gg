import React, { useState } from "react";

import { MmrComparison } from "../components/MmrComparison";
import { geometricMean, stdDev } from "../lib/formatters";

const pieConfig = { combinedGap: 5, areaMultiplier: 1.6 };

// ============================================================================
// Test Data Scenarios
// ============================================================================

const scenarios = {
  balanced: {
    label: "Balanced (Δ4)",
    data: {
      teamOneMmrs: [1800, 1600, 1400, 1200],
      teamTwoMmrs: [1780, 1590, 1410, 1220],
      teamOneAT: [0, 0, 0, 0],
      teamTwoAT: [0, 0, 0, 0],
    },
  },
  moderate: {
    label: "Moderate Gap (Δ85)",
    data: {
      teamOneMmrs: [2000, 1800, 1500, 1200],
      teamTwoMmrs: [1850, 1650, 1450, 1150],
      teamOneAT: [0, 0, 0, 0],
      teamTwoAT: [0, 0, 0, 0],
    },
  },
  mismatch: {
    label: "Mismatch (Δ200+)",
    data: {
      teamOneMmrs: [2400, 2200, 2000, 1800],
      teamTwoMmrs: [1900, 1700, 1500, 1300],
      teamOneAT: [0, 0, 0, 0],
      teamTwoAT: [0, 0, 0, 0],
    },
  },
  clustered: {
    label: "Clustered (swarm test)",
    data: {
      teamOneMmrs: [1550, 1520, 1510, 1500],
      teamTwoMmrs: [1540, 1530, 1505, 1495],
      teamOneAT: [0, 0, 0, 0],
      teamTwoAT: [0, 0, 0, 0],
    },
  },
  highVariance: {
    label: "High vs Low Variance",
    data: {
      teamOneMmrs: [2400, 1600, 1200, 800],
      teamTwoMmrs: [1600, 1550, 1500, 1450],
      teamOneAT: [0, 0, 0, 0],
      teamTwoAT: [0, 0, 0, 0],
    },
  },
  withStacks: {
    label: "With AT Stacks",
    data: {
      teamOneMmrs: [2000, 2000, 1400, 1000],
      teamTwoMmrs: [1900, 1900, 1300, 900],
      teamOneAT: [1, 1, 0, 0],
      teamTwoAT: [1, 1, 0, 0],
    },
  },
};

// ============================================================================
// Design Components
// ============================================================================

// Design A: Side Labels (for wider contexts like Game.jsx)
// Stats on left/right, chart in middle - requires horizontal space
const SideLabels = ({ data, chartWidth = 200, height = 160 }) => {
  const t1Mean = Math.round(geometricMean(data.teamOneMmrs));
  const t2Mean = Math.round(geometricMean(data.teamTwoMmrs));
  const t1Std = Math.round(stdDev(data.teamOneMmrs, t1Mean));
  const t2Std = Math.round(stdDev(data.teamTwoMmrs, t2Mean));

  const SideLabel = ({ mean, std, color, align }) => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: align === "left" ? "flex-end" : "flex-start",
        padding: "0 8px",
        minWidth: "52px",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "13px",
          color,
          fontWeight: "500",
        }}
      >
        {mean}
      </div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "11px",
          color: "rgba(255,255,255,0.5)",
          marginTop: "2px",
        }}
      >
        ±{std}
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", alignItems: "stretch" }}>
      <SideLabel mean={t1Mean} std={t1Std} color="#4da6ff" align="left" />
      <div style={{ width: chartWidth, height, background: "#0d0d0d", borderRadius: "6px" }}>
        <MmrComparison
          data={data}
          atStyle="combined"
          pieConfig={pieConfig}
          compact={true}
          showMean={true}
          showStdDev={true}
          hideLabels={true}
        />
      </div>
      <SideLabel mean={t2Mean} std={t2Std} color="#ef4444" align="right" />
    </div>
  );
};

// Design B: Stats Below (for narrow contexts like MatchOverlay)
// Chart takes full width, stats in row below
const StatsBelow = ({ data, width = 200, height = 140 }) => {
  const t1Mean = Math.round(geometricMean(data.teamOneMmrs));
  const t2Mean = Math.round(geometricMean(data.teamTwoMmrs));
  const t1Std = Math.round(stdDev(data.teamOneMmrs, t1Mean));
  const t2Std = Math.round(stdDev(data.teamTwoMmrs, t2Mean));

  return (
    <div style={{ width }}>
      {/* Chart takes full width */}
      <div style={{ height, background: "#0d0d0d", borderRadius: "6px 6px 0 0" }}>
        <MmrComparison
          data={data}
          atStyle="combined"
          pieConfig={pieConfig}
          compact={true}
          showMean={true}
          showStdDev={true}
          hideLabels={true}
        />
      </div>
      {/* Compact stats row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "6px 10px",
          background: "rgba(255,255,255,0.02)",
          borderRadius: "0 0 6px 6px",
          borderTop: "1px solid rgba(255,255,255,0.05)",
          fontFamily: "var(--font-mono)",
          fontSize: "12px",
        }}
      >
        <div style={{ color: "#4da6ff" }}>
          {t1Mean} <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "10px" }}>±{t1Std}</span>
        </div>
        <div style={{ color: "#ef4444" }}>
          <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "10px" }}>±{t2Std}</span> {t2Mean}
        </div>
      </div>
    </div>
  );
};

// Design C: Chart Only (current default)
// Just the visualization, no external stats - relies on inline labels or nothing
const ChartOnly = ({ data, width = 200, height = 160 }) => {
  return (
    <div style={{ width, height, background: "#0d0d0d", borderRadius: "6px" }}>
      <MmrComparison
        data={data}
        atStyle="combined"
        pieConfig={pieConfig}
        compact={true}
        showMean={true}
        showStdDev={true}
        hideLabels={true}
      />
    </div>
  );
};

// ============================================================================
// Section Components
// ============================================================================

const Section = ({ title, description, context, children }) => (
  <div style={{ marginBottom: "64px" }}>
    <h2
      style={{
        color: "#fff",
        fontFamily: "var(--font-display)",
        fontSize: "20px",
        margin: "0 0 8px 0",
        fontWeight: "normal",
      }}
    >
      {title}
    </h2>
    {description && (
      <p style={{ color: "#888", fontSize: "14px", margin: "0 0 8px 0", lineHeight: 1.5 }}>
        {description}
      </p>
    )}
    {context && (
      <p style={{ color: "#666", fontSize: "12px", margin: "0 0 24px 0", fontFamily: "var(--font-mono)" }}>
        Use case: {context}
      </p>
    )}
    <div style={{ display: "flex", flexWrap: "wrap", gap: "32px", alignItems: "flex-start" }}>
      {children}
    </div>
  </div>
);

const Scenario = ({ label, children }) => (
  <div>
    {children}
    <div
      style={{
        color: "#666",
        fontFamily: "var(--font-mono)",
        fontSize: "11px",
        marginTop: "8px",
        textAlign: "center",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
      }}
    >
      {label}
    </div>
  </div>
);

// ============================================================================
// Main Page Component
// ============================================================================

const MmrLab = () => {
  const [activeScenario, setActiveScenario] = useState("clustered");
  const currentData = scenarios[activeScenario].data;

  return (
    <div>
      <div style={{ padding: "32px 48px 80px", background: "#0a0a0a", minHeight: "100vh" }}>
        <h1
          style={{
            color: "var(--gold)",
            fontFamily: "var(--font-display)",
            fontSize: "32px",
            margin: "0 0 16px 0",
            fontWeight: "normal",
          }}
        >
          MMR Statistics Lab
        </h1>
        <p style={{ color: "#888", fontSize: "14px", margin: "0 0 32px 0", maxWidth: "600px" }}>
          Testing stats display options. The "Clustered" scenario tests beeswarm when MMRs are close.
        </p>

        {/* Scenario selector */}
        <div style={{ marginBottom: "48px" }}>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {Object.entries(scenarios).map(([key, { label }]) => (
              <button
                key={key}
                onClick={() => setActiveScenario(key)}
                style={{
                  padding: "8px 16px",
                  fontFamily: "var(--font-mono)",
                  fontSize: "12px",
                  border: activeScenario === key ? "1px solid var(--gold)" : "1px solid #333",
                  background: activeScenario === key ? "rgba(252,219,51,0.1)" : "transparent",
                  color: activeScenario === key ? "var(--gold)" : "#888",
                  borderRadius: "4px",
                  cursor: "pointer",
                  transition: "all 150ms ease",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Design options */}
        <Section
          title="A. Side Labels"
          description="Stats flanking the chart. Clean but requires horizontal space."
          context="Game.jsx - has room in the table layout"
        >
          <SideLabels data={currentData} chartWidth={200} height={160} />
        </Section>

        <Section
          title="B. Stats Below"
          description="Chart takes full width, stats in compact row below."
          context="MatchOverlay.jsx - limited horizontal space between teams"
        >
          <StatsBelow data={currentData} width={200} height={140} />
        </Section>

        <Section
          title="C. Chart Only"
          description="Just the visualization with shading, no external stats."
          context="When stats are shown elsewhere (team headers already show MMR)"
        >
          <ChartOnly data={currentData} width={200} height={160} />
        </Section>

        {/* Width comparison */}
        <h2
          style={{
            color: "#fff",
            fontFamily: "var(--font-display)",
            fontSize: "20px",
            margin: "64px 0 24px 0",
            fontWeight: "normal",
            borderTop: "1px solid #333",
            paddingTop: "48px",
          }}
        >
          Chart Width Comparison
        </h2>
        <p style={{ color: "#888", fontSize: "14px", margin: "0 0 24px 0" }}>
          Testing different chart widths to ensure beeswarm has room when MMRs cluster.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "24px", alignItems: "flex-end" }}>
          {[120, 160, 200, 240].map((w) => (
            <Scenario key={w} label={`${w}px wide`}>
              <ChartOnly data={scenarios.clustered.data} width={w} height={140} />
            </Scenario>
          ))}
        </div>

        {/* All scenarios comparison */}
        <h2
          style={{
            color: "#fff",
            fontFamily: "var(--font-display)",
            fontSize: "20px",
            margin: "64px 0 24px 0",
            fontWeight: "normal",
            borderTop: "1px solid #333",
            paddingTop: "48px",
          }}
        >
          All Scenarios
        </h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "24px" }}>
          {Object.entries(scenarios).map(([key, { label, data }]) => (
            <Scenario key={key} label={label}>
              <ChartOnly data={data} width={180} height={140} />
            </Scenario>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MmrLab;
