import React from "react";
import Navbar from "./Navbar.jsx";
import { MmrComparison } from "./MmrComparison.jsx";

// Fixed config for combined circle style (Gap: 5px, Area Multiplier: 160%)
const pieConfig = {
  combinedGap: 5,
  areaMultiplier: 1.6,
};

const DesignLab = () => {
  return (
    <div>
      <Navbar />

      {/* Header */}
      <div style={{
        padding: "16px 24px",
        background: "var(--surface-2)",
        borderBottom: "1px solid var(--grey-mid)",
      }}>
        <h2 style={{ color: "var(--gold)", margin: "0 0 8px", fontFamily: "var(--font-display)" }}>
          AT Visualization Test
        </h2>
        <p style={{ color: "var(--grey-light)", fontSize: "12px", margin: 0 }}>
          Combined circle style: Area = sum of individual circles (r × √n × √1.6), Gap: 5px
        </p>
      </div>

      {/* Basic Stack Sizes - AT players have identical MMR */}
      <div style={{
        padding: "24px",
        background: "var(--surface-2)",
        margin: "24px",
        borderRadius: "8px",
        border: "1px solid var(--grey-mid)",
      }}>
        <h3 style={{ color: "var(--gold)", margin: "0 0 16px", fontFamily: "var(--font-display)" }}>
          Basic Stack Sizes
        </h3>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
          {/* 2-stack */}
          <div style={{ textAlign: "center" }}>
            <div style={{ height: 200, background: "var(--surface-1)", borderRadius: "8px", padding: "8px" }}>
              <MmrComparison
                data={{
                  teamOneMmrs: [1900, 1900, 1750, 1650],
                  teamTwoMmrs: [1850, 1850, 1700, 1600],
                  teamOneAT: [2, 2, 0, 0],
                  teamTwoAT: [2, 2, 0, 0],
                }}
                atStyle="combined"
                pieConfig={pieConfig}
              />
            </div>
            <div style={{ color: "var(--gold)", fontSize: "11px", marginTop: "8px", fontWeight: "bold" }}>
              2-stack (duo)
            </div>
          </div>

          {/* 3-stack */}
          <div style={{ textAlign: "center" }}>
            <div style={{ height: 200, background: "var(--surface-1)", borderRadius: "8px", padding: "8px" }}>
              <MmrComparison
                data={{
                  teamOneMmrs: [1900, 1900, 1900, 1650],
                  teamTwoMmrs: [1850, 1850, 1850, 1600],
                  teamOneAT: [3, 3, 3, 0],
                  teamTwoAT: [3, 3, 3, 0],
                }}
                atStyle="combined"
                pieConfig={pieConfig}
              />
            </div>
            <div style={{ color: "var(--gold)", fontSize: "11px", marginTop: "8px", fontWeight: "bold" }}>
              3-stack (trio)
            </div>
          </div>

          {/* 4-stack */}
          <div style={{ textAlign: "center" }}>
            <div style={{ height: 200, background: "var(--surface-1)", borderRadius: "8px", padding: "8px" }}>
              <MmrComparison
                data={{
                  teamOneMmrs: [1900, 1900, 1900, 1900],
                  teamTwoMmrs: [1850, 1850, 1850, 1850],
                  teamOneAT: [4, 4, 4, 4],
                  teamTwoAT: [4, 4, 4, 4],
                }}
                atStyle="combined"
                pieConfig={pieConfig}
              />
            </div>
            <div style={{ color: "var(--gold)", fontSize: "11px", marginTop: "8px", fontWeight: "bold" }}>
              4-stack (full)
            </div>
          </div>

          {/* No AT */}
          <div style={{ textAlign: "center" }}>
            <div style={{ height: 200, background: "var(--surface-1)", borderRadius: "8px", padding: "8px" }}>
              <MmrComparison
                data={{
                  teamOneMmrs: [2000, 1900, 1750, 1600],
                  teamTwoMmrs: [1950, 1850, 1700, 1550],
                  teamOneAT: [0, 0, 0, 0],
                  teamTwoAT: [0, 0, 0, 0],
                }}
                atStyle="combined"
                pieConfig={pieConfig}
              />
            </div>
            <div style={{ color: "var(--grey-light)", fontSize: "11px", marginTop: "8px", fontWeight: "bold" }}>
              No AT (all solo)
            </div>
          </div>
        </div>
      </div>

      {/* AT + Solo Collision Scenarios */}
      <div style={{
        padding: "24px",
        background: "var(--surface-2)",
        margin: "24px",
        borderRadius: "8px",
        border: "1px solid var(--grey-mid)",
      }}>
        <h3 style={{ color: "var(--gold)", margin: "0 0 16px", fontFamily: "var(--font-display)" }}>
          AT + Solo Collision Scenarios
        </h3>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
          {/* 2-stack colliding with solo */}
          <div style={{ textAlign: "center" }}>
            <div style={{ height: 200, background: "var(--surface-1)", borderRadius: "8px", padding: "8px" }}>
              <MmrComparison
                data={{
                  teamOneMmrs: [1850, 1850, 1855, 2000],
                  teamTwoMmrs: [1820, 1820, 1825, 1950],
                  teamOneAT: [2, 2, 0, 0],
                  teamTwoAT: [2, 2, 0, 0],
                }}
                atStyle="combined"
                pieConfig={pieConfig}
              />
            </div>
            <div style={{ color: "var(--gold)", fontSize: "11px", marginTop: "8px", fontWeight: "bold" }}>
              2-stack near solo
            </div>
            <div style={{ color: "var(--grey-mid)", fontSize: "10px" }}>
              Solo 5 MMR away
            </div>
          </div>

          {/* 3-stack colliding with solo */}
          <div style={{ textAlign: "center" }}>
            <div style={{ height: 200, background: "var(--surface-1)", borderRadius: "8px", padding: "8px" }}>
              <MmrComparison
                data={{
                  teamOneMmrs: [1850, 1850, 1850, 1855],
                  teamTwoMmrs: [1820, 1820, 1820, 1825],
                  teamOneAT: [3, 3, 3, 0],
                  teamTwoAT: [3, 3, 3, 0],
                }}
                atStyle="combined"
                pieConfig={pieConfig}
              />
            </div>
            <div style={{ color: "var(--gold)", fontSize: "11px", marginTop: "8px", fontWeight: "bold" }}>
              3-stack near solo
            </div>
            <div style={{ color: "var(--grey-mid)", fontSize: "10px" }}>
              Solo very close
            </div>
          </div>

          {/* Two 2-stacks colliding */}
          <div style={{ textAlign: "center" }}>
            <div style={{ height: 200, background: "var(--surface-1)", borderRadius: "8px", padding: "8px" }}>
              <MmrComparison
                data={{
                  teamOneMmrs: [1850, 1850, 1855, 1855],
                  teamTwoMmrs: [1820, 1820, 1825, 1825],
                  teamOneAT: [2, 2, 2, 2],
                  teamTwoAT: [2, 2, 2, 2],
                }}
                atStyle="combined"
                pieConfig={pieConfig}
              />
            </div>
            <div style={{ color: "var(--gold)", fontSize: "11px", marginTop: "8px", fontWeight: "bold" }}>
              Two 2-stacks close
            </div>
            <div style={{ color: "var(--grey-mid)", fontSize: "10px" }}>
              5 MMR apart
            </div>
          </div>

          {/* Extreme collision - all same MMR */}
          <div style={{ textAlign: "center" }}>
            <div style={{ height: 200, background: "var(--surface-1)", borderRadius: "8px", padding: "8px" }}>
              <MmrComparison
                data={{
                  teamOneMmrs: [1850, 1850, 1850, 1850],
                  teamTwoMmrs: [1820, 1820, 1820, 1820],
                  teamOneAT: [2, 2, 0, 0],
                  teamTwoAT: [2, 2, 0, 0],
                }}
                atStyle="combined"
                pieConfig={pieConfig}
              />
            </div>
            <div style={{ color: "var(--gold)", fontSize: "11px", marginTop: "8px", fontWeight: "bold" }}>
              2-stack + 2 solo (same MMR)
            </div>
            <div style={{ color: "var(--grey-mid)", fontSize: "10px" }}>
              All identical MMR
            </div>
          </div>
        </div>
      </div>

      {/* Wide MMR Spread Scenarios */}
      <div style={{
        padding: "24px",
        background: "var(--surface-2)",
        margin: "24px",
        borderRadius: "8px",
        border: "1px solid var(--grey-mid)",
      }}>
        <h3 style={{ color: "var(--gold)", margin: "0 0 16px", fontFamily: "var(--font-display)" }}>
          Wide MMR Spread
        </h3>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
          {/* Wide spread - 2-stack at top */}
          <div style={{ textAlign: "center" }}>
            <div style={{ height: 200, background: "var(--surface-1)", borderRadius: "8px", padding: "8px" }}>
              <MmrComparison
                data={{
                  teamOneMmrs: [2100, 2100, 1700, 1600],
                  teamTwoMmrs: [2050, 2050, 1650, 1550],
                  teamOneAT: [2, 2, 0, 0],
                  teamTwoAT: [2, 2, 0, 0],
                }}
                atStyle="combined"
                pieConfig={pieConfig}
              />
            </div>
            <div style={{ color: "var(--gold)", fontSize: "11px", marginTop: "8px", fontWeight: "bold" }}>
              2-stack at top
            </div>
          </div>

          {/* Wide spread - 3-stack */}
          <div style={{ textAlign: "center" }}>
            <div style={{ height: 200, background: "var(--surface-1)", borderRadius: "8px", padding: "8px" }}>
              <MmrComparison
                data={{
                  teamOneMmrs: [1900, 1900, 1900, 1500],
                  teamTwoMmrs: [1850, 1850, 1850, 1550],
                  teamOneAT: [3, 3, 3, 0],
                  teamTwoAT: [3, 3, 3, 0],
                }}
                atStyle="combined"
                pieConfig={pieConfig}
              />
            </div>
            <div style={{ color: "var(--gold)", fontSize: "11px", marginTop: "8px", fontWeight: "bold" }}>
              3-stack + far solo
            </div>
          </div>

          {/* 4-stack */}
          <div style={{ textAlign: "center" }}>
            <div style={{ height: 200, background: "var(--surface-1)", borderRadius: "8px", padding: "8px" }}>
              <MmrComparison
                data={{
                  teamOneMmrs: [1900, 1900, 1900, 1900],
                  teamTwoMmrs: [1850, 1850, 1850, 1850],
                  teamOneAT: [4, 4, 4, 4],
                  teamTwoAT: [4, 4, 4, 4],
                }}
                atStyle="combined"
                pieConfig={pieConfig}
              />
            </div>
            <div style={{ color: "var(--gold)", fontSize: "11px", marginTop: "8px", fontWeight: "bold" }}>
              4-stack (identical MMR)
            </div>
          </div>

          {/* Solo collision at one end */}
          <div style={{ textAlign: "center" }}>
            <div style={{ height: 200, background: "var(--surface-1)", borderRadius: "8px", padding: "8px" }}>
              <MmrComparison
                data={{
                  teamOneMmrs: [2100, 2095, 1700, 1500],
                  teamTwoMmrs: [2050, 2045, 1650, 1550],
                  teamOneAT: [0, 0, 0, 0],
                  teamTwoAT: [0, 0, 0, 0],
                }}
                atStyle="combined"
                pieConfig={pieConfig}
              />
            </div>
            <div style={{ color: "var(--grey-light)", fontSize: "11px", marginTop: "8px", fontWeight: "bold" }}>
              Solo collision (top)
            </div>
          </div>
        </div>
      </div>

      {/* Mixed Team Scenarios */}
      <div style={{
        padding: "24px",
        background: "var(--surface-2)",
        margin: "24px",
        borderRadius: "8px",
        border: "1px solid var(--grey-mid)",
      }}>
        <h3 style={{ color: "var(--gold)", margin: "0 0 16px", fontFamily: "var(--font-display)" }}>
          Mixed Team Scenarios
        </h3>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
          {/* One team AT, one solo */}
          <div style={{ textAlign: "center" }}>
            <div style={{ height: 200, background: "var(--surface-1)", borderRadius: "8px", padding: "8px" }}>
              <MmrComparison
                data={{
                  teamOneMmrs: [1850, 1850, 1850, 1850],
                  teamTwoMmrs: [1900, 1850, 1750, 1700],
                  teamOneAT: [4, 4, 4, 4],
                  teamTwoAT: [0, 0, 0, 0],
                }}
                atStyle="combined"
                pieConfig={pieConfig}
              />
            </div>
            <div style={{ color: "var(--gold)", fontSize: "11px", marginTop: "8px", fontWeight: "bold" }}>
              4-stack vs all solo
            </div>
          </div>

          {/* 3-stack vs 2-stack */}
          <div style={{ textAlign: "center" }}>
            <div style={{ height: 200, background: "var(--surface-1)", borderRadius: "8px", padding: "8px" }}>
              <MmrComparison
                data={{
                  teamOneMmrs: [1850, 1850, 1850, 1700],
                  teamTwoMmrs: [1820, 1820, 1750, 1650],
                  teamOneAT: [3, 3, 3, 0],
                  teamTwoAT: [2, 2, 0, 0],
                }}
                atStyle="combined"
                pieConfig={pieConfig}
              />
            </div>
            <div style={{ color: "var(--gold)", fontSize: "11px", marginTop: "8px", fontWeight: "bold" }}>
              3-stack vs 2-stack
            </div>
          </div>

          {/* Two 2-stacks on same team */}
          <div style={{ textAlign: "center" }}>
            <div style={{ height: 200, background: "var(--surface-1)", borderRadius: "8px", padding: "8px" }}>
              <MmrComparison
                data={{
                  teamOneMmrs: [2000, 2000, 1700, 1700],
                  teamTwoMmrs: [1950, 1900, 1750, 1650],
                  teamOneAT: [2, 2, 2, 2],
                  teamTwoAT: [0, 0, 0, 0],
                }}
                atStyle="combined"
                pieConfig={pieConfig}
              />
            </div>
            <div style={{ color: "var(--gold)", fontSize: "11px", marginTop: "8px", fontWeight: "bold" }}>
              Two 2-stacks vs solo
            </div>
          </div>

          {/* 2-stack at bottom */}
          <div style={{ textAlign: "center" }}>
            <div style={{ height: 200, background: "var(--surface-1)", borderRadius: "8px", padding: "8px" }}>
              <MmrComparison
                data={{
                  teamOneMmrs: [2100, 2000, 1600, 1600],
                  teamTwoMmrs: [2050, 1950, 1650, 1650],
                  teamOneAT: [0, 0, 2, 2],
                  teamTwoAT: [0, 0, 2, 2],
                }}
                atStyle="combined"
                pieConfig={pieConfig}
              />
            </div>
            <div style={{ color: "var(--gold)", fontSize: "11px", marginTop: "8px", fontWeight: "bold" }}>
              2-stack at bottom
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DesignLab;
