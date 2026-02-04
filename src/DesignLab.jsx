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
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
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
        description="Each dot represents one player. Vertical position shows their MMR rating."
      >
        <Chart label="Even teams" gold={false} data={{ teamOneMmrs: [1900, 1800, 1700, 1600], teamTwoMmrs: [1850, 1750, 1650, 1550], teamOneAT: [0, 0, 0, 0], teamTwoAT: [0, 0, 0, 0] }} />
        <Chart label="Wide spread" gold={false} data={{ teamOneMmrs: [2200, 1900, 1600, 1400], teamTwoMmrs: [2100, 1850, 1650, 1500], teamOneAT: [0, 0, 0, 0], teamTwoAT: [0, 0, 0, 0] }} />
        <Chart label="Skill gap" gold={false} data={{ teamOneMmrs: [2000, 1950, 1900, 1850], teamTwoMmrs: [1600, 1550, 1500, 1450], teamOneAT: [0, 0, 0, 0], teamTwoAT: [0, 0, 0, 0] }} />
      </Section>

      <Section
        number="02"
        title="Collision Handling"
        description="When players have similar MMR, dots are offset horizontally to avoid overlap."
      >
        <Chart label="Two players close" gold={false} data={{ teamOneMmrs: [1900, 1895, 1700, 1500], teamTwoMmrs: [1850, 1845, 1650, 1450], teamOneAT: [0, 0, 0, 0], teamTwoAT: [0, 0, 0, 0] }} />
        <Chart label="Three players close" gold={false} data={{ teamOneMmrs: [1900, 1898, 1896, 1600], teamTwoMmrs: [1850, 1848, 1846, 1550], teamOneAT: [0, 0, 0, 0], teamTwoAT: [0, 0, 0, 0] }} />
        <Chart label="All identical MMR" gold={false} data={{ teamOneMmrs: [1800, 1800, 1800, 1800], teamTwoMmrs: [1750, 1750, 1750, 1750], teamOneAT: [0, 0, 0, 0], teamTwoAT: [0, 0, 0, 0] }} />
      </Section>

      <Section
        number="03"
        title="Arranged Teams"
        description="Players queuing together are shown as a single combined circle. Circle area = sum of individual circles."
      >
        <Chart label="2-stack (duo)" data={{ teamOneMmrs: [1900, 1900, 1750, 1650], teamTwoMmrs: [1850, 1850, 1700, 1600], teamOneAT: [2, 2, 0, 0], teamTwoAT: [2, 2, 0, 0] }} />
        <Chart label="3-stack (trio)" data={{ teamOneMmrs: [1900, 1900, 1900, 1650], teamTwoMmrs: [1850, 1850, 1850, 1600], teamOneAT: [3, 3, 3, 0], teamTwoAT: [3, 3, 3, 0] }} />
        <Chart label="4-stack (full premade)" data={{ teamOneMmrs: [1900, 1900, 1900, 1900], teamTwoMmrs: [1850, 1850, 1850, 1850], teamOneAT: [4, 4, 4, 4], teamTwoAT: [4, 4, 4, 4] }} />
      </Section>

      <Section
        number="04"
        title="Mixed Scenarios"
        description="Solo players near AT groups are pushed away. AT circles take priority positioning."
      >
        <Chart label="2-stack + solo collision" data={{ teamOneMmrs: [1850, 1850, 1855, 2000], teamTwoMmrs: [1820, 1820, 1825, 1950], teamOneAT: [2, 2, 0, 0], teamTwoAT: [2, 2, 0, 0] }} />
        <Chart label="4-stack vs all solos" data={{ teamOneMmrs: [1850, 1850, 1850, 1850], teamTwoMmrs: [1900, 1850, 1750, 1700], teamOneAT: [4, 4, 4, 4], teamTwoAT: [0, 0, 0, 0] }} />
        <Chart label="Two 2-stacks" data={{ teamOneMmrs: [2000, 2000, 1700, 1700], teamTwoMmrs: [1950, 1950, 1650, 1650], teamOneAT: [2, 2, 2, 2], teamTwoAT: [2, 2, 2, 2] }} />
      </Section>

      {/* Formula reference */}
      <div style={{
        background: "var(--surface-1)",
        border: "1px solid var(--grey-mid)",
        borderRadius: "8px",
        padding: "16px 20px",
        display: "flex",
        alignItems: "center",
        gap: "24px"
      }}>
        <div style={{ color: "var(--grey-light)", fontSize: "12px" }}>Combined circle formula:</div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "14px" }}>
          <span style={{ color: "var(--gold)" }}>radius</span>
          <span style={{ color: "var(--grey-light)" }}> = </span>
          <span style={{ color: "#fff" }}>base</span>
          <span style={{ color: "var(--grey-light)" }}> × </span>
          <span style={{ color: "var(--green)" }}>√n</span>
          <span style={{ color: "var(--grey-light)" }}> × </span>
          <span style={{ color: "var(--green)" }}>√1.6</span>
        </div>
        <div style={{ color: "var(--grey-mid)", fontSize: "11px", marginLeft: "auto" }}>
          gap: 5px · rotation: 45°
        </div>
      </div>

    </div>
  </div>
);

export default DesignLab;
