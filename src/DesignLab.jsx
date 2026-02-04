import React from "react";
import Navbar from "./Navbar.jsx";
import { MmrComparison } from "./MmrComparison.jsx";

const pieConfig = { combinedGap: 5, areaMultiplier: 1.6 };

const Chart = ({ data, label, subtitle, gold = true }) => (
  <div style={{ textAlign: "center" }}>
    <div style={{ height: 120, background: "var(--surface-1)", borderRadius: "6px", padding: "6px" }}>
      <MmrComparison data={data} atStyle="combined" pieConfig={pieConfig} compact={true} />
    </div>
    <div style={{ color: gold ? "var(--gold)" : "var(--grey-light)", fontSize: "10px", marginTop: "6px", fontWeight: 500 }}>
      {label}
    </div>
    {subtitle && <div style={{ color: "var(--grey-mid)", fontSize: "9px" }}>{subtitle}</div>}
  </div>
);

const Section = ({ title, description, children, cols = 4 }) => (
  <div style={{ marginBottom: "24px" }}>
    <div style={{ marginBottom: "10px" }}>
      <span style={{ color: "var(--gold)", fontSize: "13px", fontFamily: "var(--font-display)" }}>{title}</span>
      {description && <span style={{ color: "var(--grey-light)", fontSize: "11px", marginLeft: "12px" }}>{description}</span>}
    </div>
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: "12px" }}>
      {children}
    </div>
  </div>
);

const DesignLab = () => (
  <div>
    <Navbar />

    {/* Header */}
    <div style={{ padding: "16px 20px", background: "var(--surface-2)", borderBottom: "1px solid var(--grey-mid)" }}>
      <h2 style={{ color: "var(--gold)", margin: 0, fontFamily: "var(--font-display)", fontSize: "18px" }}>
        MMR Visualization
      </h2>
      <div style={{ color: "var(--grey-light)", fontSize: "12px", marginTop: "4px" }}>
        How we display team skill distribution in the match chart
      </div>
    </div>

    <div style={{ padding: "20px", background: "#0a0a0a" }}>

      {/* 1. Basic MMR */}
      <Section title="1. MMR Axis" description="Each dot = one player, Y position = MMR">
        <Chart label="Even teams" subtitle="Similar spread" gold={false} data={{ teamOneMmrs: [1900, 1800, 1700, 1600], teamTwoMmrs: [1850, 1750, 1650, 1550], teamOneAT: [0, 0, 0, 0], teamTwoAT: [0, 0, 0, 0] }} />
        <Chart label="Wide spread" subtitle="High variance" gold={false} data={{ teamOneMmrs: [2200, 1900, 1600, 1400], teamTwoMmrs: [2100, 1850, 1650, 1500], teamOneAT: [0, 0, 0, 0], teamTwoAT: [0, 0, 0, 0] }} />
        <Chart label="Tight cluster" subtitle="Low variance" gold={false} data={{ teamOneMmrs: [1820, 1810, 1800, 1790], teamTwoMmrs: [1815, 1805, 1795, 1785], teamOneAT: [0, 0, 0, 0], teamTwoAT: [0, 0, 0, 0] }} />
        <Chart label="Skill gap" subtitle="Mismatch" gold={false} data={{ teamOneMmrs: [2000, 1950, 1900, 1850], teamTwoMmrs: [1700, 1650, 1600, 1550], teamOneAT: [0, 0, 0, 0], teamTwoAT: [0, 0, 0, 0] }} />
      </Section>

      {/* 2. Collisions */}
      <Section title="2. Collision Handling" description="When MMRs overlap, offset dots on X-axis">
        <Chart label="No collision" subtitle="Spread MMR" gold={false} data={{ teamOneMmrs: [2000, 1800, 1600, 1400], teamTwoMmrs: [1900, 1700, 1500, 1300], teamOneAT: [0, 0, 0, 0], teamTwoAT: [0, 0, 0, 0] }} />
        <Chart label="Two close" subtitle="5 MMR apart" gold={false} data={{ teamOneMmrs: [1900, 1895, 1700, 1500], teamTwoMmrs: [1850, 1845, 1650, 1450], teamOneAT: [0, 0, 0, 0], teamTwoAT: [0, 0, 0, 0] }} />
        <Chart label="Three close" subtitle="Cluster at top" gold={false} data={{ teamOneMmrs: [1900, 1898, 1896, 1600], teamTwoMmrs: [1850, 1848, 1846, 1550], teamOneAT: [0, 0, 0, 0], teamTwoAT: [0, 0, 0, 0] }} />
        <Chart label="All identical" subtitle="Same MMR" gold={false} data={{ teamOneMmrs: [1800, 1800, 1800, 1800], teamTwoMmrs: [1750, 1750, 1750, 1750], teamOneAT: [0, 0, 0, 0], teamTwoAT: [0, 0, 0, 0] }} />
      </Section>

      {/* 3. AT Groups */}
      <Section title="3. Arranged Teams (AT)" description="Grouped players shown as combined circle · r = base × √n × √1.6">
        <Chart label="2-stack" subtitle="Duo queue" data={{ teamOneMmrs: [1900, 1900, 1750, 1650], teamTwoMmrs: [1850, 1850, 1700, 1600], teamOneAT: [2, 2, 0, 0], teamTwoAT: [2, 2, 0, 0] }} />
        <Chart label="3-stack" subtitle="Trio queue" data={{ teamOneMmrs: [1900, 1900, 1900, 1650], teamTwoMmrs: [1850, 1850, 1850, 1600], teamOneAT: [3, 3, 3, 0], teamTwoAT: [3, 3, 3, 0] }} />
        <Chart label="4-stack" subtitle="Full premade" data={{ teamOneMmrs: [1900, 1900, 1900, 1900], teamTwoMmrs: [1850, 1850, 1850, 1850], teamOneAT: [4, 4, 4, 4], teamTwoAT: [4, 4, 4, 4] }} />
        <Chart label="Two 2-stacks" subtitle="Double duo" data={{ teamOneMmrs: [2000, 2000, 1700, 1700], teamTwoMmrs: [1950, 1950, 1650, 1650], teamOneAT: [2, 2, 2, 2], teamTwoAT: [2, 2, 2, 2] }} />
      </Section>

      {/* 4. AT + Solo Collisions */}
      <Section title="4. AT + Solo Collisions" description="Solo dots pushed away from AT circles">
        <Chart label="2-stack + solo" subtitle="Solo near AT" data={{ teamOneMmrs: [1850, 1850, 1855, 2000], teamTwoMmrs: [1820, 1820, 1825, 1950], teamOneAT: [2, 2, 0, 0], teamTwoAT: [2, 2, 0, 0] }} />
        <Chart label="3-stack + solo" subtitle="Solo very close" data={{ teamOneMmrs: [1850, 1850, 1850, 1855], teamTwoMmrs: [1820, 1820, 1820, 1825], teamOneAT: [3, 3, 3, 0], teamTwoAT: [3, 3, 3, 0] }} />
        <Chart label="2+2 solo same" subtitle="All identical" data={{ teamOneMmrs: [1850, 1850, 1850, 1850], teamTwoMmrs: [1820, 1820, 1820, 1820], teamOneAT: [2, 2, 0, 0], teamTwoAT: [2, 2, 0, 0] }} />
        <Chart label="4 vs solo" subtitle="Stack vs randoms" data={{ teamOneMmrs: [1850, 1850, 1850, 1850], teamTwoMmrs: [1900, 1850, 1750, 1700], teamOneAT: [4, 4, 4, 4], teamTwoAT: [0, 0, 0, 0] }} />
      </Section>

    </div>
  </div>
);

export default DesignLab;
