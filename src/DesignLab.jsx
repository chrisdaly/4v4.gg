import React from "react";
import Navbar from "./Navbar.jsx";
import { MmrComparison } from "./MmrComparison.jsx";

const pieConfig = { combinedGap: 5, areaMultiplier: 1.6 };

// All test scenarios in one array
const scenarios = [
  // Row 1: Basic Stack Sizes
  { label: "2-stack", gold: true, t1: [1900, 1900, 1750, 1650], t2: [1850, 1850, 1700, 1600], at1: [2, 2, 0, 0], at2: [2, 2, 0, 0] },
  { label: "3-stack", gold: true, t1: [1900, 1900, 1900, 1650], t2: [1850, 1850, 1850, 1600], at1: [3, 3, 3, 0], at2: [3, 3, 3, 0] },
  { label: "4-stack", gold: true, t1: [1900, 1900, 1900, 1900], t2: [1850, 1850, 1850, 1850], at1: [4, 4, 4, 4], at2: [4, 4, 4, 4] },
  { label: "No AT", gold: false, t1: [2000, 1900, 1750, 1600], t2: [1950, 1850, 1700, 1550], at1: [0, 0, 0, 0], at2: [0, 0, 0, 0] },

  // Row 2: Collision Scenarios
  { label: "2-stack + solo", gold: true, t1: [1850, 1850, 1855, 2000], t2: [1820, 1820, 1825, 1950], at1: [2, 2, 0, 0], at2: [2, 2, 0, 0] },
  { label: "3-stack + solo", gold: true, t1: [1850, 1850, 1850, 1855], t2: [1820, 1820, 1820, 1825], at1: [3, 3, 3, 0], at2: [3, 3, 3, 0] },
  { label: "Two 2-stacks", gold: true, t1: [1850, 1850, 1855, 1855], t2: [1820, 1820, 1825, 1825], at1: [2, 2, 2, 2], at2: [2, 2, 2, 2] },
  { label: "2+2 solo same", gold: true, t1: [1850, 1850, 1850, 1850], t2: [1820, 1820, 1820, 1820], at1: [2, 2, 0, 0], at2: [2, 2, 0, 0] },

  // Row 3: Wide Spread
  { label: "2-stack top", gold: true, t1: [2100, 2100, 1700, 1600], t2: [2050, 2050, 1650, 1550], at1: [2, 2, 0, 0], at2: [2, 2, 0, 0] },
  { label: "3-stack + far", gold: true, t1: [1900, 1900, 1900, 1500], t2: [1850, 1850, 1850, 1550], at1: [3, 3, 3, 0], at2: [3, 3, 3, 0] },
  { label: "4-stack only", gold: true, t1: [1900, 1900, 1900, 1900], t2: [1850, 1850, 1850, 1850], at1: [4, 4, 4, 4], at2: [4, 4, 4, 4] },
  { label: "Solo collision", gold: false, t1: [2100, 2095, 1700, 1500], t2: [2050, 2045, 1650, 1550], at1: [0, 0, 0, 0], at2: [0, 0, 0, 0] },

  // Row 4: Mixed
  { label: "4 vs solo", gold: true, t1: [1850, 1850, 1850, 1850], t2: [1900, 1850, 1750, 1700], at1: [4, 4, 4, 4], at2: [0, 0, 0, 0] },
  { label: "3 vs 2", gold: true, t1: [1850, 1850, 1850, 1700], t2: [1820, 1820, 1750, 1650], at1: [3, 3, 3, 0], at2: [2, 2, 0, 0] },
  { label: "2+2 vs solo", gold: true, t1: [2000, 2000, 1700, 1700], t2: [1950, 1900, 1750, 1650], at1: [2, 2, 2, 2], at2: [0, 0, 0, 0] },
  { label: "2-stack bottom", gold: true, t1: [2100, 2000, 1600, 1600], t2: [2050, 1950, 1650, 1650], at1: [0, 0, 2, 2], at2: [0, 0, 2, 2] },
];

const DesignLab = () => (
  <div>
    <Navbar />
    <div style={{ padding: "12px 16px", background: "var(--surface-2)", borderBottom: "1px solid var(--grey-mid)" }}>
      <span style={{ color: "var(--gold)", fontFamily: "var(--font-display)", fontSize: "16px" }}>AT Visualization</span>
      <span style={{ color: "var(--grey-light)", fontSize: "11px", marginLeft: "12px" }}>
        Combined circle: r × √n × √1.6, Gap: 5px
      </span>
    </div>

    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: "8px",
      padding: "12px",
      background: "#0a0a0a",
    }}>
      {scenarios.map((s, i) => (
        <div key={i} style={{ textAlign: "center" }}>
          <div style={{ height: 110, background: "var(--surface-1)", borderRadius: "4px", padding: "4px" }}>
            <MmrComparison
              data={{ teamOneMmrs: s.t1, teamTwoMmrs: s.t2, teamOneAT: s.at1, teamTwoAT: s.at2 }}
              atStyle="combined"
              pieConfig={pieConfig}
              compact={true}
            />
          </div>
          <div style={{ color: s.gold ? "var(--gold)" : "var(--grey-light)", fontSize: "10px", marginTop: "4px" }}>
            {s.label}
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default DesignLab;
