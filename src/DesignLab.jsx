import React from "react";
import Navbar from "./Navbar.jsx";
import { MmrComparison } from "./MmrComparison.jsx";

const pieConfig = { combinedGap: 5, areaMultiplier: 1.6 };

const Chart = ({ data, label, gold = true }) => (
  <div style={{ textAlign: "center" }}>
    <div style={{ height: 120, background: "var(--surface-1)", borderRadius: "6px", padding: "6px" }}>
      <MmrComparison data={data} atStyle="combined" pieConfig={pieConfig} compact={true} />
    </div>
    <div style={{ color: gold ? "var(--gold)" : "var(--grey-light)", fontSize: "10px", marginTop: "6px", fontWeight: 500 }}>
      {label}
    </div>
  </div>
);

const Section = ({ title, children }) => (
  <div style={{ marginBottom: "16px" }}>
    <div style={{ color: "var(--grey-light)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px", fontFamily: "var(--font-mono)" }}>
      {title}
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
      {children}
    </div>
  </div>
);

const DesignLab = () => (
  <div>
    <Navbar />

    {/* Header with philosophy */}
    <div style={{ padding: "16px 20px", background: "var(--surface-2)", borderBottom: "1px solid var(--grey-mid)" }}>
      <h2 style={{ color: "var(--gold)", margin: "0 0 12px", fontFamily: "var(--font-display)", fontSize: "18px" }}>
        AT Visualization
      </h2>
      <div style={{ display: "flex", gap: "32px", fontSize: "12px", color: "var(--grey-light)" }}>
        <div>
          <div style={{ color: "var(--gold)", fontFamily: "var(--font-mono)", marginBottom: "4px" }}>Combined Circle</div>
          <div>AT groups shown as single circle with area = sum of individuals</div>
        </div>
        <div style={{ fontFamily: "var(--font-mono)", background: "var(--surface-1)", padding: "8px 12px", borderRadius: "4px", border: "1px solid var(--grey-mid)" }}>
          <span style={{ color: "var(--gold)" }}>r</span> = base × <span style={{ color: "var(--green)" }}>√n</span> × <span style={{ color: "#6ee7b7" }}>√1.6</span>
          <div style={{ fontSize: "10px", color: "var(--grey-mid)", marginTop: "2px" }}>
            gap: 5px · rotation: 45°
          </div>
        </div>
      </div>
    </div>

    <div style={{ padding: "16px 20px", background: "#0a0a0a" }}>

      <Section title="Stack Sizes">
        <Chart label="2-stack (duo)" data={{ teamOneMmrs: [1900, 1900, 1750, 1650], teamTwoMmrs: [1850, 1850, 1700, 1600], teamOneAT: [2, 2, 0, 0], teamTwoAT: [2, 2, 0, 0] }} />
        <Chart label="3-stack (trio)" data={{ teamOneMmrs: [1900, 1900, 1900, 1650], teamTwoMmrs: [1850, 1850, 1850, 1600], teamOneAT: [3, 3, 3, 0], teamTwoAT: [3, 3, 3, 0] }} />
        <Chart label="4-stack (full)" data={{ teamOneMmrs: [1900, 1900, 1900, 1900], teamTwoMmrs: [1850, 1850, 1850, 1850], teamOneAT: [4, 4, 4, 4], teamTwoAT: [4, 4, 4, 4] }} />
        <Chart label="No AT (solo)" gold={false} data={{ teamOneMmrs: [2000, 1900, 1750, 1600], teamTwoMmrs: [1950, 1850, 1700, 1550], teamOneAT: [0, 0, 0, 0], teamTwoAT: [0, 0, 0, 0] }} />
      </Section>

      <Section title="Collision Handling">
        <Chart label="2-stack + solo near" data={{ teamOneMmrs: [1850, 1850, 1855, 2000], teamTwoMmrs: [1820, 1820, 1825, 1950], teamOneAT: [2, 2, 0, 0], teamTwoAT: [2, 2, 0, 0] }} />
        <Chart label="3-stack + solo near" data={{ teamOneMmrs: [1850, 1850, 1850, 1855], teamTwoMmrs: [1820, 1820, 1820, 1825], teamOneAT: [3, 3, 3, 0], teamTwoAT: [3, 3, 3, 0] }} />
        <Chart label="Two 2-stacks close" data={{ teamOneMmrs: [1850, 1850, 1855, 1855], teamTwoMmrs: [1820, 1820, 1825, 1825], teamOneAT: [2, 2, 2, 2], teamTwoAT: [2, 2, 2, 2] }} />
        <Chart label="2+2 solo identical" data={{ teamOneMmrs: [1850, 1850, 1850, 1850], teamTwoMmrs: [1820, 1820, 1820, 1820], teamOneAT: [2, 2, 0, 0], teamTwoAT: [2, 2, 0, 0] }} />
      </Section>

      <Section title="Mixed Matchups">
        <Chart label="4-stack vs solo" data={{ teamOneMmrs: [1850, 1850, 1850, 1850], teamTwoMmrs: [1900, 1850, 1750, 1700], teamOneAT: [4, 4, 4, 4], teamTwoAT: [0, 0, 0, 0] }} />
        <Chart label="3-stack vs 2-stack" data={{ teamOneMmrs: [1850, 1850, 1850, 1700], teamTwoMmrs: [1820, 1820, 1750, 1650], teamOneAT: [3, 3, 3, 0], teamTwoAT: [2, 2, 0, 0] }} />
        <Chart label="Two 2-stacks vs solo" data={{ teamOneMmrs: [2000, 2000, 1700, 1700], teamTwoMmrs: [1950, 1900, 1750, 1650], teamOneAT: [2, 2, 2, 2], teamTwoAT: [0, 0, 0, 0] }} />
        <Chart label="2-stack at bottom" data={{ teamOneMmrs: [2100, 2000, 1600, 1600], teamTwoMmrs: [2050, 1950, 1650, 1650], teamOneAT: [0, 0, 2, 2], teamTwoAT: [0, 0, 2, 2] }} />
      </Section>

      <Section title="Wide MMR Spread">
        <Chart label="2-stack at top" data={{ teamOneMmrs: [2100, 2100, 1700, 1600], teamTwoMmrs: [2050, 2050, 1650, 1550], teamOneAT: [2, 2, 0, 0], teamTwoAT: [2, 2, 0, 0] }} />
        <Chart label="3-stack + far solo" data={{ teamOneMmrs: [1900, 1900, 1900, 1500], teamTwoMmrs: [1850, 1850, 1850, 1550], teamOneAT: [3, 3, 3, 0], teamTwoAT: [3, 3, 3, 0] }} />
        <Chart label="Solo collision top" gold={false} data={{ teamOneMmrs: [2100, 2095, 1700, 1500], teamTwoMmrs: [2050, 2045, 1650, 1550], teamOneAT: [0, 0, 0, 0], teamTwoAT: [0, 0, 0, 0] }} />
        <Chart label="Extreme spread" data={{ teamOneMmrs: [2200, 2200, 1500, 1500], teamTwoMmrs: [2100, 2100, 1600, 1600], teamOneAT: [2, 2, 2, 2], teamTwoAT: [2, 2, 2, 2] }} />
      </Section>

    </div>
  </div>
);

export default DesignLab;
