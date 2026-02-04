import React from "react";
import Navbar from "./Navbar.jsx";
import { MmrComparison } from "./MmrComparison.jsx";

const pieConfig = { combinedGap: 5, areaMultiplier: 1.6 };

const Chart = ({ data, label, gold = true }) => (
  <div style={{ textAlign: "center" }}>
    <div style={{ height: 160, background: "#111", borderRadius: "8px", padding: "8px" }}>
      <MmrComparison data={data} atStyle="combined" pieConfig={pieConfig} compact={true} />
    </div>
    <div style={{ color: gold ? "var(--gold)" : "#fff", fontSize: "12px", marginTop: "8px", fontWeight: 500 }}>
      {label}
    </div>
  </div>
);

const Section = ({ number, title, description, children }) => (
  <div style={{
    background: "var(--surface-1)",
    border: "1px solid var(--grey-mid)",
    borderRadius: "8px",
    padding: "20px",
    marginBottom: "20px"
  }}>
    <div style={{ marginBottom: "16px" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "4px" }}>
        <span style={{ color: "var(--grey-mid)", fontSize: "12px", fontFamily: "var(--font-mono)" }}>{number}</span>
        <span style={{ color: "var(--gold)", fontSize: "16px", fontFamily: "var(--font-display)" }}>{title}</span>
      </div>
      <div style={{ color: "var(--grey-light)", fontSize: "13px" }}>{description}</div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
      {children}
    </div>
  </div>
);

const DesignLab = () => (
  <div>
    <Navbar />

    <div style={{ padding: "24px 32px", background: "var(--surface-2)", borderBottom: "1px solid var(--grey-mid)" }}>
      <h1 style={{ color: "var(--gold)", margin: 0, fontFamily: "var(--font-display)", fontSize: "24px" }}>
        MMR Visualization
      </h1>
      <div style={{ color: "var(--grey-light)", fontSize: "14px", marginTop: "8px" }}>
        How we display team skill distribution in the match chart
      </div>
    </div>

    <div style={{ padding: "24px 32px", background: "#0a0a0a" }}>

      <Section
        number="01"
        title="MMR Axis"
        description={<>Each dot = one player. Y-axis fixed from <span style={{ fontFamily: "var(--font-mono)" }}>700</span> (min) to <span style={{ fontFamily: "var(--font-mono)" }}>2700</span> (max seen in 4v4). Blue = team 1, Red = team 2.</>}
      >
        <Chart label="Even teams" gold={false} data={{ teamOneMmrs: [2200, 1800, 1400, 1000], teamTwoMmrs: [2100, 1700, 1300, 900], teamOneAT: [0, 0, 0, 0], teamTwoAT: [0, 0, 0, 0] }} />
        <Chart label="High MMR" gold={false} data={{ teamOneMmrs: [2500, 2300, 2100, 1900], teamTwoMmrs: [2400, 2200, 2000, 1800], teamOneAT: [0, 0, 0, 0], teamTwoAT: [0, 0, 0, 0] }} />
        <Chart label="Low MMR" gold={false} data={{ teamOneMmrs: [1300, 1100, 900, 750], teamTwoMmrs: [1250, 1050, 850, 700], teamOneAT: [0, 0, 0, 0], teamTwoAT: [0, 0, 0, 0] }} />
        <Chart label="Skill gap" gold={false} data={{ teamOneMmrs: [2400, 2200, 2000, 1800], teamTwoMmrs: [1400, 1200, 1000, 800], teamOneAT: [0, 0, 0, 0], teamTwoAT: [0, 0, 0, 0] }} />
      </Section>

      <Section
        number="02"
        title="Collision Handling"
        description="When players have similar MMR, dots offset horizontally to avoid overlap. Higher MMR players get priority center position."
      >
        <Chart label="No collision" gold={false} data={{ teamOneMmrs: [2200, 1800, 1400, 1000], teamTwoMmrs: [2100, 1700, 1300, 900], teamOneAT: [0, 0, 0, 0], teamTwoAT: [0, 0, 0, 0] }} />
        <Chart label="Two close" gold={false} data={{ teamOneMmrs: [2200, 2190, 1400, 1000], teamTwoMmrs: [2100, 2090, 1300, 900], teamOneAT: [0, 0, 0, 0], teamTwoAT: [0, 0, 0, 0] }} />
        <Chart label="Three close" gold={false} data={{ teamOneMmrs: [2200, 2195, 2190, 1000], teamTwoMmrs: [2100, 2095, 2090, 900], teamOneAT: [0, 0, 0, 0], teamTwoAT: [0, 0, 0, 0] }} />
        <Chart label="All identical" gold={false} data={{ teamOneMmrs: [1700, 1700, 1700, 1700], teamTwoMmrs: [1650, 1650, 1650, 1650], teamOneAT: [0, 0, 0, 0], teamTwoAT: [0, 0, 0, 0] }} />
      </Section>

      <Section
        number="03"
        title="Arranged Teams"
        description={<>AT players share MMR—without distinction they'd look like collision-offset solos. Solution: combine into one circle (area = sum of individuals × 1.6), split into n segments with 5px gaps.</>}
      >
        <Chart label="2-stack (duo)" data={{ teamOneMmrs: [2000, 2000, 1400, 1000], teamTwoMmrs: [1900, 1900, 1300, 900], teamOneAT: [2, 2, 0, 0], teamTwoAT: [2, 2, 0, 0] }} />
        <Chart label="3-stack (trio)" data={{ teamOneMmrs: [1800, 1800, 1800, 1000], teamTwoMmrs: [1700, 1700, 1700, 900], teamOneAT: [3, 3, 3, 0], teamTwoAT: [3, 3, 3, 0] }} />
        <Chart label="4-stack (premade)" data={{ teamOneMmrs: [1700, 1700, 1700, 1700], teamTwoMmrs: [1600, 1600, 1600, 1600], teamOneAT: [4, 4, 4, 4], teamTwoAT: [4, 4, 4, 4] }} />
        <Chart label="2+2 stacks (same team)" data={{ teamOneMmrs: [2200, 2200, 1200, 1200], teamTwoMmrs: [2100, 2100, 1100, 1100], teamOneAT: [2, 2, 2, 2], teamTwoAT: [2, 2, 2, 2] }} />
      </Section>

      <Section
        number="04"
        title="AT + Solo Collisions"
        description="Solo players near AT groups pushed away horizontally. AT circles get priority center positioning."
      >
        <Chart label="Solo near 2-stack" data={{ teamOneMmrs: [2000, 2000, 2010, 1200], teamTwoMmrs: [1900, 1900, 1910, 1100], teamOneAT: [2, 2, 0, 0], teamTwoAT: [2, 2, 0, 0] }} />
        <Chart label="Solo near 3-stack" data={{ teamOneMmrs: [1800, 1800, 1800, 1810], teamTwoMmrs: [1700, 1700, 1700, 1710], teamOneAT: [3, 3, 3, 0], teamTwoAT: [3, 3, 3, 0] }} />
        <Chart label="4-stack vs solos" data={{ teamOneMmrs: [1700, 1700, 1700, 1700], teamTwoMmrs: [2000, 1700, 1400, 1100], teamOneAT: [4, 4, 4, 4], teamTwoAT: [0, 0, 0, 0] }} />
        <Chart label="3-stack vs 2-stack" data={{ teamOneMmrs: [2000, 2000, 2000, 1200], teamTwoMmrs: [1800, 1800, 1400, 1000], teamOneAT: [3, 3, 3, 0], teamTwoAT: [2, 2, 0, 0] }} />
      </Section>

    </div>
  </div>
);

export default DesignLab;
