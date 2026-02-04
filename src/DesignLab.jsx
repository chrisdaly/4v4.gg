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
        description="Each dot represents one player. Vertical position shows their MMR rating."
      >
        <Chart label="Even teams" gold={false} data={{ teamOneMmrs: [1900, 1800, 1700, 1600], teamTwoMmrs: [1880, 1780, 1680, 1580], teamOneAT: [0, 0, 0, 0], teamTwoAT: [0, 0, 0, 0] }} />
        <Chart label="Wide spread" gold={false} data={{ teamOneMmrs: [2000, 1850, 1700, 1550], teamTwoMmrs: [1950, 1800, 1650, 1500], teamOneAT: [0, 0, 0, 0], teamTwoAT: [0, 0, 0, 0] }} />
        <Chart label="Tight cluster" gold={false} data={{ teamOneMmrs: [1820, 1800, 1780, 1760], teamTwoMmrs: [1810, 1790, 1770, 1750], teamOneAT: [0, 0, 0, 0], teamTwoAT: [0, 0, 0, 0] }} />
        <Chart label="Skill gap" gold={false} data={{ teamOneMmrs: [1950, 1900, 1850, 1800], teamTwoMmrs: [1700, 1650, 1600, 1550], teamOneAT: [0, 0, 0, 0], teamTwoAT: [0, 0, 0, 0] }} />
      </Section>

      <Section
        number="02"
        title="Collision Handling"
        description="When players have similar MMR, dots are offset horizontally to avoid overlap."
      >
        <Chart label="No collision" gold={false} data={{ teamOneMmrs: [1900, 1800, 1700, 1600], teamTwoMmrs: [1880, 1780, 1680, 1580], teamOneAT: [0, 0, 0, 0], teamTwoAT: [0, 0, 0, 0] }} />
        <Chart label="Two close" gold={false} data={{ teamOneMmrs: [1850, 1845, 1700, 1600], teamTwoMmrs: [1830, 1825, 1680, 1580], teamOneAT: [0, 0, 0, 0], teamTwoAT: [0, 0, 0, 0] }} />
        <Chart label="Three close" gold={false} data={{ teamOneMmrs: [1850, 1848, 1846, 1650], teamTwoMmrs: [1830, 1828, 1826, 1630], teamOneAT: [0, 0, 0, 0], teamTwoAT: [0, 0, 0, 0] }} />
        <Chart label="All identical" gold={false} data={{ teamOneMmrs: [1800, 1800, 1800, 1800], teamTwoMmrs: [1780, 1780, 1780, 1780], teamOneAT: [0, 0, 0, 0], teamTwoAT: [0, 0, 0, 0] }} />
      </Section>

      <Section
        number="03"
        title="Arranged Teams"
        description={<>Players queuing together shown as combined circle. <span style={{ fontFamily: "var(--font-mono)", color: "var(--gold)" }}>radius = base × √n × √1.6</span> with 5px gaps between segments.</>}
      >
        <Chart label="2-stack (duo)" data={{ teamOneMmrs: [1850, 1850, 1750, 1650], teamTwoMmrs: [1830, 1830, 1730, 1630], teamOneAT: [2, 2, 0, 0], teamTwoAT: [2, 2, 0, 0] }} />
        <Chart label="3-stack (trio)" data={{ teamOneMmrs: [1850, 1850, 1850, 1650], teamTwoMmrs: [1830, 1830, 1830, 1630], teamOneAT: [3, 3, 3, 0], teamTwoAT: [3, 3, 3, 0] }} />
        <Chart label="4-stack (premade)" data={{ teamOneMmrs: [1800, 1800, 1800, 1800], teamTwoMmrs: [1780, 1780, 1780, 1780], teamOneAT: [4, 4, 4, 4], teamTwoAT: [4, 4, 4, 4] }} />
        <Chart label="Two 2-stacks" data={{ teamOneMmrs: [1900, 1900, 1700, 1700], teamTwoMmrs: [1880, 1880, 1680, 1680], teamOneAT: [2, 2, 2, 2], teamTwoAT: [2, 2, 2, 2] }} />
      </Section>

      <Section
        number="04"
        title="AT + Solo Collisions"
        description="Solo players near AT groups are pushed away horizontally. AT circles take priority positioning."
      >
        <Chart label="Solo near 2-stack" data={{ teamOneMmrs: [1850, 1850, 1855, 1700], teamTwoMmrs: [1830, 1830, 1835, 1680], teamOneAT: [2, 2, 0, 0], teamTwoAT: [2, 2, 0, 0] }} />
        <Chart label="Solo near 3-stack" data={{ teamOneMmrs: [1850, 1850, 1850, 1855], teamTwoMmrs: [1830, 1830, 1830, 1835], teamOneAT: [3, 3, 3, 0], teamTwoAT: [3, 3, 3, 0] }} />
        <Chart label="4-stack vs solos" data={{ teamOneMmrs: [1800, 1800, 1800, 1800], teamTwoMmrs: [1850, 1800, 1750, 1700], teamOneAT: [4, 4, 4, 4], teamTwoAT: [0, 0, 0, 0] }} />
        <Chart label="3-stack vs 2-stack" data={{ teamOneMmrs: [1850, 1850, 1850, 1700], teamTwoMmrs: [1830, 1830, 1730, 1680], teamOneAT: [3, 3, 3, 0], teamTwoAT: [2, 2, 0, 0] }} />
      </Section>

    </div>
  </div>
);

export default DesignLab;
