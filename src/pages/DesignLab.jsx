import React, { useEffect } from "react";

import { MmrComparison } from "../components/MmrComparison";

const pieConfig = { combinedGap: 5, areaMultiplier: 1.6 };

// Chart wrapper component
const Chart = ({ data, width = 200, height = 160, showMean = false, showStdDev = false, showValues = false }) => (
  <div className="blog-chart">
    <div style={{ width, height }}>
      <MmrComparison data={data} atStyle="combined" pieConfig={pieConfig} compact={true} showMean={showMean} showStdDev={showStdDev} showValues={showValues} />
    </div>
  </div>
);

// Simple 1v1 chart
const SoloChart = ({ p1, p2 }) => (
  <div className="blog-chart" style={{ width: 100, height: 160, position: "relative", border: "1px solid var(--grey-mid)", borderRadius: "var(--radius-sm)" }}>
    {/* Y-axis labels inside */}
    <span style={{ position: "absolute", top: 4, left: 6, fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--grey-mid)" }}>2700</span>
    <span style={{ position: "absolute", bottom: 4, left: 6, fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--grey-mid)" }}>700</span>
    {/* Blue dot */}
    <div style={{
      position: "absolute",
      left: "35%",
      top: `${100 - ((p1 - 700) / 2000) * 100}%`,
      transform: "translate(-50%, -50%)",
      width: 12, height: 12,
      borderRadius: "50%",
      background: "var(--team-blue)"
    }} />
    {/* Red dot */}
    <div style={{
      position: "absolute",
      left: "65%",
      top: `${100 - ((p2 - 700) / 2000) * 100}%`,
      transform: "translate(-50%, -50%)",
      width: 12, height: 12,
      borderRadius: "50%",
      background: "var(--team-red)"
    }} />
    {/* Center divider */}
    <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: "var(--grey-mid)" }} />
  </div>
);

const DesignLab = () => {
  // Force classic (black) theme on blog pages
  useEffect(() => {
    const s = document.body.style;
    const prev = {
      bgImg: s.getPropertyValue("--theme-bg-img"),
      bgOverlay: s.getPropertyValue("--theme-bg-overlay"),
    };
    s.setProperty("--theme-bg-img", "none");
    s.setProperty("--theme-bg-overlay", "none");
    return () => {
      s.setProperty("--theme-bg-img", prev.bgImg);
      s.setProperty("--theme-bg-overlay", prev.bgOverlay);
    };
  }, []);

  return (
  <div>
    <article className="blog-article">
      <div className="content">

        <h1>Dots, Not Numbers</h1>

        <div className="blog-meta">
          <span className="blog-date">February 2025</span>
          <div className="blog-tags">
            <span className="blog-tag">dataviz</span>
            <span className="blog-tag">design</span>
            <span className="blog-tag">wc3</span>
          </div>
        </div>

        <p>
          The loading screen shows eight numbers. Four on your team, four on theirs. You have maybe five seconds to figure out if this is going to be one-sided.
        </p>

        <div className="blog-mmr-display">
          <div className="team-blue">
            <div>2387</div>
            <div>1653</div>
            <div>1502</div>
            <div>1041</div>
          </div>
          <div className="vs">vs</div>
          <div className="team-red">
            <div>2098</div>
            <div>1756</div>
            <div>1247</div>
            <div>963</div>
          </div>
        </div>

        <p>
          Quick. Which team wins?
        </p>

        <p>
          You start doing the math, adding them up, dividing by four, eyeballing the highs and lows. But the map is loading and you don't have time. And even if you did, raw averages hide a lot: a team with two great players and two weak ones feels different than four medium players.
        </p>

        <p>
          This is why I built the dot chart. The balance should be obvious at a glance.
        </p>

        <h2>The problem with averages</h2>

        <p>
          The matchmaker balances teams by geometric mean. You could display that for each team, add standard deviation to show the spread. But a team with a 2400 and an 800 could have the same mean as four 1600s. Those are very different games. You have to <a href="https://en.wikipedia.org/wiki/Anscombe%27s_quartet" target="_blank" rel="noopener">show the data</a>.
        </p>

        <h2>Showing the data</h2>

        <p>
          Start with 1v1: two dots on a vertical axis, positioned by MMR. If the dots are close, it's fair; if one is way higher, it's not.
        </p>

        <div className="blog-chart-row gap-lg">
          <div className="blog-chart-labeled">
            <SoloChart p1={1650} p2={1620} />
            <div className="blog-chart-label">fair match</div>
          </div>
          <div className="blog-chart-labeled">
            <SoloChart p1={2100} p2={1400} />
            <div className="blog-chart-label">mismatch</div>
          </div>
        </div>

        <p>
          For 4v4, same idea: eight dots with blue on the left and red on the right, higher meaning more skilled.
        </p>

        <div className="blog-chart-row">
          <Chart
            data={{ teamOneMmrs: [2300, 1900, 1500, 1100], teamTwoMmrs: [2200, 1800, 1400, 1000], teamOneAT: [0, 0, 0, 0], teamTwoAT: [0, 0, 0, 0] }}
            width={240}
            height={200}
          />
        </div>

        <p>
          Now you can see the balance, the spread, whether there's a carry.
        </p>

        <p>
          The vertical scale is fixed from 700 to 2700, so you can compare charts across matches. A high-MMR lobby looks different from a low-MMR lobby even when both are balanced:
        </p>

        <div className="blog-chart-row">
          <div className="blog-chart-labeled">
            <Chart
              data={{ teamOneMmrs: [2500, 2300, 2100, 1900], teamTwoMmrs: [2400, 2200, 2000, 1800], teamOneAT: [0, 0, 0, 0], teamTwoAT: [0, 0, 0, 0] }}
              width={180}
              height={160}
            />
            <div className="blog-chart-label">high mmr</div>
          </div>
          <div className="blog-chart-labeled">
            <Chart
              data={{ teamOneMmrs: [1400, 1200, 1000, 800], teamTwoMmrs: [1350, 1150, 950, 750], teamOneAT: [0, 0, 0, 0], teamTwoAT: [0, 0, 0, 0] }}
              width={180}
              height={160}
            />
            <div className="blog-chart-label">low mmr</div>
          </div>
        </div>

        <p>
          So who wins the opening matchup? Blue, with a ~130 geometric mean advantage:
        </p>

        <div className="blog-chart-row">
          <Chart
            data={{ teamOneMmrs: [2387, 1653, 1502, 1041], teamTwoMmrs: [2098, 1756, 1247, 963], teamOneAT: [0, 0, 0, 0], teamTwoAT: [0, 0, 0, 0] }}
            width={320}
            height={200}
            showValues={true}
          />
        </div>

        <h2>Overlapping dots</h2>

        <p>
          When players have similar ratings, dots would overlap, so I nudge them apart horizontally while keeping the highest-rated player centered.
        </p>

        <div className="blog-chart-row">
          <div className="blog-chart-labeled">
            <Chart
              data={{ teamOneMmrs: [2200, 1800, 1400, 1000], teamTwoMmrs: [2100, 1700, 1300, 900], teamOneAT: [0, 0, 0, 0], teamTwoAT: [0, 0, 0, 0] }}
              width={180}
              height={160}
            />
            <div className="blog-chart-label">spread out</div>
          </div>
          <div className="blog-chart-labeled">
            <Chart
              data={{ teamOneMmrs: [1700, 1700, 1700, 1700], teamTwoMmrs: [1650, 1650, 1650, 1650], teamOneAT: [0, 0, 0, 0], teamTwoAT: [0, 0, 0, 0] }}
              width={180}
              height={160}
            />
            <div className="blog-chart-label">all identical</div>
          </div>
        </div>

        <h2>Arranged teams</h2>

        <p>
          Some players queue together as an "arranged team" or AT, sharing a single MMR. Two friends at 1800 will outperform two strangers at 1800 since they coordinate and know each other's style, so the chart should distinguish them. I show ATs as a single circle split into segments, with area scaling to group size:
        </p>

        <div className="blog-visual-math">
          {/* Duo equation */}
          <div className="blog-equation">
            <div className="blog-eq-left">
              <svg width="28" height="28"><circle cx="14" cy="14" r="10" fill="var(--team-blue)" /></svg>
              <span className="blog-op-plus">+</span>
              <svg width="28" height="28"><circle cx="14" cy="14" r="10" fill="var(--team-blue)" /></svg>
            </div>
            <span className="blog-op-equals">=</span>
            <div className="blog-eq-right">
              <svg width="36" height="36">
                <circle cx="18" cy="18" r="14.1" fill="var(--team-blue)" />
                <line x1="28" y1="8" x2="8" y2="28" stroke="#0a0a0a" strokeWidth="2.5" />
              </svg>
            </div>
            <span className="blog-eq-label">n = 2</span>
          </div>

          {/* Trio equation */}
          <div className="blog-equation">
            <div className="blog-eq-left">
              <svg width="28" height="28"><circle cx="14" cy="14" r="10" fill="var(--team-blue)" /></svg>
              <span className="blog-op-plus">+</span>
              <svg width="28" height="28"><circle cx="14" cy="14" r="10" fill="var(--team-blue)" /></svg>
              <span className="blog-op-plus">+</span>
              <svg width="28" height="28"><circle cx="14" cy="14" r="10" fill="var(--team-blue)" /></svg>
            </div>
            <span className="blog-op-equals">=</span>
            <div className="blog-eq-right">
              <svg width="42" height="42">
                <circle cx="21" cy="21" r="17.3" fill="var(--team-blue)" />
                <line x1="21" y1="21" x2="33.2" y2="8.8" stroke="#0a0a0a" strokeWidth="2.5" />
                <line x1="21" y1="21" x2="6.0" y2="12.3" stroke="#0a0a0a" strokeWidth="2.5" />
                <line x1="21" y1="21" x2="21" y2="38.3" stroke="#0a0a0a" strokeWidth="2.5" />
              </svg>
            </div>
            <span className="blog-eq-label">n = 3</span>
          </div>

          {/* Quad equation */}
          <div className="blog-equation">
            <div className="blog-eq-left">
              <svg width="28" height="28"><circle cx="14" cy="14" r="10" fill="var(--team-blue)" /></svg>
              <span className="blog-op-plus">+</span>
              <svg width="28" height="28"><circle cx="14" cy="14" r="10" fill="var(--team-blue)" /></svg>
              <span className="blog-op-plus">+</span>
              <svg width="28" height="28"><circle cx="14" cy="14" r="10" fill="var(--team-blue)" /></svg>
              <span className="blog-op-plus">+</span>
              <svg width="28" height="28"><circle cx="14" cy="14" r="10" fill="var(--team-blue)" /></svg>
            </div>
            <span className="blog-op-equals">=</span>
            <div className="blog-eq-right">
              <svg width="48" height="48">
                <circle cx="24" cy="24" r="20" fill="var(--team-blue)" />
                <line x1="10" y1="10" x2="38" y2="38" stroke="#0a0a0a" strokeWidth="2.5" />
                <line x1="38" y1="10" x2="10" y2="38" stroke="#0a0a0a" strokeWidth="2.5" />
              </svg>
            </div>
            <span className="blog-eq-label">n = 4</span>
          </div>
        </div>

        <p>
          Segments tell you group size at a glance and prevent confusion with solos who happen to have similar MMR: randoms cluster as separate dots, friends form a single segmented circle.
        </p>

        <div className="blog-chart-row">
          <div className="blog-chart-labeled">
            <Chart
              data={{ teamOneMmrs: [2000, 2000, 1400, 1000], teamTwoMmrs: [1900, 1900, 1300, 900], teamOneAT: [1, 1, 0, 0], teamTwoAT: [1, 1, 0, 0] }}
              width={180}
              height={160}
            />
            <div className="blog-chart-label">duo + solos</div>
          </div>
          <div className="blog-chart-labeled">
            <Chart
              data={{ teamOneMmrs: [1700, 1700, 1700, 1700], teamTwoMmrs: [1600, 1600, 1600, 1600], teamOneAT: [1, 1, 1, 1], teamTwoAT: [1, 1, 1, 1] }}
              width={180}
              height={160}
            />
            <div className="blog-chart-label">full stacks</div>
          </div>
          <div className="blog-chart-labeled">
            <Chart
              data={{ teamOneMmrs: [2200, 2200, 1200, 1200], teamTwoMmrs: [2100, 2100, 1100, 1100], teamOneAT: [1, 1, 2, 2], teamTwoAT: [1, 1, 2, 2] }}
              width={180}
              height={160}
            />
            <div className="blog-chart-label">two duos each</div>
          </div>
        </div>

        <h2>Gallery</h2>

        <p>
          Every team composition you might see:</p>

        {/* Row 1: All solos */}
        <div className="blog-gallery-group">
          <div className="blog-gallery-section">All solos</div>
          <div className="blog-gallery-row">
            <div className="blog-chart-labeled">
              <Chart data={{ teamOneMmrs: [1800, 1750, 1700, 1650], teamTwoMmrs: [1780, 1730, 1680, 1630], teamOneAT: [0, 0, 0, 0], teamTwoAT: [0, 0, 0, 0] }} width={180} height={160} />
              <div className="blog-chart-label">balanced</div>
            </div>
            <div className="blog-chart-labeled">
              <Chart data={{ teamOneMmrs: [2200, 2100, 2000, 1900], teamTwoMmrs: [1600, 1550, 1500, 1450], teamOneAT: [0, 0, 0, 0], teamTwoAT: [0, 0, 0, 0] }} width={180} height={160} />
              <div className="blog-chart-label">mismatch</div>
            </div>
            <div className="blog-chart-labeled">
              <Chart data={{ teamOneMmrs: [2400, 1600, 1400, 1200], teamTwoMmrs: [1700, 1650, 1600, 1550], teamOneAT: [0, 0, 0, 0], teamTwoAT: [0, 0, 0, 0] }} width={180} height={160} />
              <div className="blog-chart-label">carry</div>
            </div>
            <div className="blog-chart-labeled">
              <Chart data={{ teamOneMmrs: [2500, 2400, 2300, 2200], teamTwoMmrs: [2450, 2350, 2250, 2150], teamOneAT: [0, 0, 0, 0], teamTwoAT: [0, 0, 0, 0] }} width={180} height={160} />
              <div className="blog-chart-label">high mmr</div>
            </div>
            <div className="blog-chart-labeled">
              <Chart data={{ teamOneMmrs: [1100, 1000, 900, 800], teamTwoMmrs: [1050, 950, 850, 750], teamOneAT: [0, 0, 0, 0], teamTwoAT: [0, 0, 0, 0] }} width={180} height={160} />
              <div className="blog-chart-label">low mmr</div>
            </div>
          </div>
        </div>

        {/* Row 2: Duo + solos */}
        <div className="blog-gallery-group">
          <div className="blog-gallery-section">Duo + solos</div>
          <div className="blog-gallery-row">
            <div className="blog-chart-labeled">
              <Chart data={{ teamOneMmrs: [1900, 1900, 1600, 1400], teamTwoMmrs: [1850, 1850, 1550, 1350], teamOneAT: [1, 1, 0, 0], teamTwoAT: [1, 1, 0, 0] }} width={180} height={160} />
              <div className="blog-chart-label">both have duo</div>
            </div>
            <div className="blog-chart-labeled">
              <Chart data={{ teamOneMmrs: [2000, 2000, 1500, 1300], teamTwoMmrs: [1700, 1650, 1600, 1550], teamOneAT: [1, 1, 0, 0], teamTwoAT: [0, 0, 0, 0] }} width={180} height={160} />
              <div className="blog-chart-label">duo vs solos</div>
            </div>
            <div className="blog-chart-labeled">
              <Chart data={{ teamOneMmrs: [2200, 2200, 1200, 1000], teamTwoMmrs: [1600, 1600, 1600, 1600], teamOneAT: [1, 1, 0, 0], teamTwoAT: [0, 0, 0, 0] }} width={180} height={160} />
              <div className="blog-chart-label">high duo carrying</div>
            </div>
            <div className="blog-chart-labeled">
              <Chart data={{ teamOneMmrs: [1400, 1400, 1800, 1600], teamTwoMmrs: [1500, 1500, 1700, 1500], teamOneAT: [1, 1, 0, 0], teamTwoAT: [1, 1, 0, 0] }} width={180} height={160} />
              <div className="blog-chart-label">low duo</div>
            </div>
          </div>
        </div>

        {/* Row 3: Two duos */}
        <div className="blog-gallery-group">
          <div className="blog-gallery-section">Two duos</div>
          <div className="blog-gallery-row">
            <div className="blog-chart-labeled">
              <Chart data={{ teamOneMmrs: [2000, 2000, 1400, 1400], teamTwoMmrs: [1950, 1950, 1350, 1350], teamOneAT: [1, 1, 2, 2], teamTwoAT: [1, 1, 2, 2] }} width={180} height={160} />
              <div className="blog-chart-label">mirrored</div>
            </div>
            <div className="blog-chart-labeled">
              <Chart data={{ teamOneMmrs: [2100, 2100, 1300, 1300], teamTwoMmrs: [1700, 1700, 1700, 1700], teamOneAT: [1, 1, 2, 2], teamTwoAT: [1, 1, 2, 2] }} width={180} height={160} />
              <div className="blog-chart-label">split vs even</div>
            </div>
            <div className="blog-chart-labeled">
              <Chart data={{ teamOneMmrs: [1800, 1800, 1800, 1800], teamTwoMmrs: [2000, 2000, 1600, 1600], teamOneAT: [1, 1, 2, 2], teamTwoAT: [1, 1, 2, 2] }} width={180} height={160} />
              <div className="blog-chart-label">clustered vs split</div>
            </div>
            <div className="blog-chart-labeled">
              <Chart data={{ teamOneMmrs: [2200, 2200, 1200, 1200], teamTwoMmrs: [1900, 1500, 1400, 1000], teamOneAT: [1, 1, 2, 2], teamTwoAT: [0, 0, 0, 0] }} width={180} height={160} />
              <div className="blog-chart-label">2 duos vs solos</div>
            </div>
          </div>
        </div>

        {/* Row 4: Trio + solo */}
        <div className="blog-gallery-group">
          <div className="blog-gallery-section">Trio + solo</div>
          <div className="blog-gallery-row">
            <div className="blog-chart-labeled">
              <Chart data={{ teamOneMmrs: [1800, 1800, 1800, 1500], teamTwoMmrs: [1750, 1750, 1750, 1450], teamOneAT: [1, 1, 1, 0], teamTwoAT: [1, 1, 1, 0] }} width={180} height={160} />
              <div className="blog-chart-label">both have trio</div>
            </div>
            <div className="blog-chart-labeled">
              <Chart data={{ teamOneMmrs: [2000, 2000, 2000, 1200], teamTwoMmrs: [1700, 1700, 1600, 1600], teamOneAT: [1, 1, 1, 0], teamTwoAT: [1, 1, 0, 0] }} width={180} height={160} />
              <div className="blog-chart-label">trio vs duo</div>
            </div>
            <div className="blog-chart-labeled">
              <Chart data={{ teamOneMmrs: [1900, 1900, 1900, 1400], teamTwoMmrs: [1750, 1700, 1650, 1600], teamOneAT: [1, 1, 1, 0], teamTwoAT: [0, 0, 0, 0] }} width={180} height={160} />
              <div className="blog-chart-label">trio vs solos</div>
            </div>
            <div className="blog-chart-labeled">
              <Chart data={{ teamOneMmrs: [2200, 2200, 2200, 800], teamTwoMmrs: [1700, 1700, 1700, 1700], teamOneAT: [1, 1, 1, 0], teamTwoAT: [1, 1, 1, 1] }} width={180} height={160} />
              <div className="blog-chart-label">trio carrying</div>
            </div>
          </div>
        </div>

        {/* Row 5: Full stacks */}
        <div className="blog-gallery-group">
          <div className="blog-gallery-section">Full stacks</div>
          <div className="blog-gallery-row">
            <div className="blog-chart-labeled">
              <Chart data={{ teamOneMmrs: [1800, 1800, 1800, 1800], teamTwoMmrs: [1750, 1750, 1750, 1750], teamOneAT: [1, 1, 1, 1], teamTwoAT: [1, 1, 1, 1] }} width={180} height={160} />
              <div className="blog-chart-label">even stacks</div>
            </div>
            <div className="blog-chart-labeled">
              <Chart data={{ teamOneMmrs: [2200, 2200, 2200, 2200], teamTwoMmrs: [1400, 1400, 1400, 1400], teamOneAT: [1, 1, 1, 1], teamTwoAT: [1, 1, 1, 1] }} width={180} height={160} />
              <div className="blog-chart-label">stack mismatch</div>
            </div>
            <div className="blog-chart-labeled">
              <Chart data={{ teamOneMmrs: [1900, 1900, 1900, 1900], teamTwoMmrs: [2000, 1800, 1600, 1400], teamOneAT: [1, 1, 1, 1], teamTwoAT: [0, 0, 0, 0] }} width={180} height={160} />
              <div className="blog-chart-label">stack vs solos</div>
            </div>
            <div className="blog-chart-labeled">
              <Chart data={{ teamOneMmrs: [1700, 1700, 1700, 1700], teamTwoMmrs: [1900, 1900, 1500, 1500], teamOneAT: [1, 1, 1, 1], teamTwoAT: [1, 1, 2, 2] }} width={180} height={160} />
              <div className="blog-chart-label">stack vs 2 duos</div>
            </div>
            <div className="blog-chart-labeled">
              <Chart data={{ teamOneMmrs: [2400, 2400, 2400, 2400], teamTwoMmrs: [2350, 2350, 2350, 2350], teamOneAT: [1, 1, 1, 1], teamTwoAT: [1, 1, 1, 1] }} width={180} height={160} />
              <div className="blog-chart-label">high mmr stacks</div>
            </div>
          </div>
        </div>

      </div>
    </article>
  </div>
  );
};

export default DesignLab;
