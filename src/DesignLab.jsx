import React from "react";
import Navbar from "./Navbar.jsx";
import { MmrComparison } from "./MmrComparison.jsx";

const pieConfig = { combinedGap: 5, areaMultiplier: 1.6 };

// Chart wrapper component
const Chart = ({ data, width = 200, height = 160, showMean = false, showStdDev = false }) => (
  <div className="blog-chart">
    <div style={{ width, height }}>
      <MmrComparison data={data} atStyle="combined" pieConfig={pieConfig} compact={true} showMean={showMean} showStdDev={showStdDev} />
    </div>
  </div>
);

// Simple 1v1 chart
const SoloChart = ({ p1, p2 }) => (
  <div style={{ display: "flex", alignItems: "stretch" }}>
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "flex-end", paddingRight: "6px", height: 160 }}>
      <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--grey-mid)" }}>2700</span>
      <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--grey-mid)" }}>700</span>
    </div>
    <div className="blog-chart" style={{ width: 100, height: 160, position: "relative", borderLeft: "1px solid var(--grey-mid)" }}>
      <div style={{
        position: "absolute",
        left: "30%",
        top: `${100 - ((p1 - 700) / 2000) * 100}%`,
        transform: "translate(-50%, -50%)",
        width: 12, height: 12,
        borderRadius: "50%",
        background: "var(--team-blue)"
      }} />
      <div style={{
        position: "absolute",
        left: "70%",
        top: `${100 - ((p2 - 700) / 2000) * 100}%`,
        transform: "translate(-50%, -50%)",
        width: 12, height: 12,
        borderRadius: "50%",
        background: "var(--team-red)"
      }} />
      <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: "var(--grey-mid)" }} />
    </div>
  </div>
);

const DesignLab = () => (
  <div>
    <Navbar />

    <article className="blog-article">
      <div className="content">

        <h1>All's Fair in Love and Warcraft</h1>

        <p>
          The loading screen shows eight numbers. Four on your team, four on theirs. You have maybe ten seconds to figure out if this is going to be a stomp or a real game.
        </p>

        <div className="blog-mmr-display">
          <div className="team-blue">
            <div>2344</div>
            <div>1989</div>
            <div>1734</div>
            <div>1702</div>
          </div>
          <div className="vs">vs</div>
          <div className="team-red">
            <div>2127</div>
            <div>1597</div>
            <div>1567</div>
            <div>1375</div>
          </div>
        </div>

        <p>
          Quick. Which team wins?
        </p>

        <p>
          You start doing the math. Add them up, divide by four. Or eyeball the high and low values, try to feel out where the averages sit. But the map is loading. You don't have time. And even if you did, raw averages hide a lot. A team with two great players and two weak ones feels different than four medium players.
        </p>

        <p>
          This is what I built 4v4.gg to solve. Whether you're a player on the loading screen, an observer watching a stream, or just browsing for an interesting game to spectate, the balance should be obvious at a glance.
        </p>

        <h2>The simple case</h2>

        <p>
          In 1v1, matchmaking is straightforward. Each player has an MMR. The matchmaker pairs players with similar ratings. If your MMR is higher, you're favored to win.
        </p>

        <h2>The hard case</h2>

        <p>
          4v4 is harder. The matchmaker can't find eight people with identical skill, so it balances teams by their geometric mean. The geometric mean is the nth root of the product. It's less sensitive to outliers than arithmetic mean, which matters when skill gaps are wide.
        </p>

        <div className="blog-chart-row">
          <svg width="340" height="200" style={{ display: "block" }}>
            {/* Horizontal baseline */}
            <line x1="20" y1="140" x2="320" y2="140" stroke="var(--grey-mid)" strokeWidth="1" />

            {/* Player dots on baseline */}
            <circle cx="50" cy="140" r="8" fill="var(--team-blue)" />
            <circle cx="120" cy="140" r="8" fill="var(--team-blue)" />
            <circle cx="200" cy="140" r="8" fill="var(--team-blue)" />
            <circle cx="290" cy="140" r="8" fill="var(--team-blue)" />

            {/* Labels below dots */}
            <text x="50" y="165" fill="var(--grey-light)" fontSize="12" fontFamily="var(--font-mono)" textAnchor="middle">1100</text>
            <text x="120" y="165" fill="var(--grey-light)" fontSize="12" fontFamily="var(--font-mono)" textAnchor="middle">1400</text>
            <text x="200" y="165" fill="var(--grey-light)" fontSize="12" fontFamily="var(--font-mono)" textAnchor="middle">1700</text>
            <text x="290" y="165" fill="var(--grey-light)" fontSize="12" fontFamily="var(--font-mono)" textAnchor="middle">2100</text>

            {/* Semicircle arc for geometric mean construction */}
            <path d="M 50 140 A 120 120 0 0 1 290 140" fill="none" stroke="var(--grey-mid)" strokeWidth="1" strokeDasharray="4,4" />

            {/* Vertical line to geometric mean */}
            <line x1="155" y1="140" x2="155" y2="35" stroke="var(--gold)" strokeWidth="2" />

            {/* Mean point */}
            <circle cx="155" cy="35" r="10" fill="var(--gold)" />

            {/* Mean label */}
            <text x="155" y="18" fill="var(--gold)" fontSize="14" fontFamily="var(--font-mono)" textAnchor="middle">μ = 1533</text>
          </svg>
        </div>

        <p>
          You could display the geometric mean for each team, maybe add standard deviation to show how spread out the ratings are. But even those hide things. A team with a 2400 and an 800 could balance against two 1600s. Those are very different games. The first has a huge skill gap within the team. The second is actually even.
        </p>

        <p>
          This is the same problem statisticians call <a href="https://en.wikipedia.org/wiki/Anscombe%27s_quartet" target="_blank" rel="noopener">Anscombe's Quartet</a>: four datasets with identical means, variances, and correlations that look completely different when plotted. Summary statistics lie. You have to show the data.
        </p>

        <h2>Showing the data</h2>

        <p>
          Start with 1v1. Two dots on a vertical axis, positioned by MMR. If the dots are close, it's fair. If one is way higher, someone's getting stomped.
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
          For 4v4, same idea. Eight dots, blue team on the left, red on the right. Higher means more skilled.
        </p>

        <div className="blog-chart-row">
          <Chart
            data={{ teamOneMmrs: [2100, 1700, 1400, 1100], teamTwoMmrs: [1900, 1600, 1300, 1000], teamOneAT: [0, 0, 0, 0], teamTwoAT: [0, 0, 0, 0] }}
            width={240}
            height={200}
          />
        </div>

        <p>
          You can see the balance and the spread at a glance. Are the teams even? Is there a carry? Is one team top-heavy while the other is clustered in the middle?
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

        <h2>Overlapping dots</h2>

        <p>
          What happens when players have similar ratings? The dots would overlap. I nudge them apart horizontally. The highest-rated player stays centered, others shift outward.
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

        <h2>Playing with friends</h2>

        <p>
          Some players queue together as a group, called an "arranged team" or AT. They share a combined rating, so they'd appear as overlapping dots. But I want to distinguish them from random collisions. Four friends who've practiced together play differently than four strangers.
        </p>

        <p>
          I show arranged teams as a single larger circle, split into segments. The key insight is that the circle's area should scale with the number of players. A 4-stack should look four times as substantial as a solo player. Since area scales with the square of the radius, I use:
        </p>

        <p style={{ fontFamily: "var(--font-mono)", textAlign: "center", color: "var(--grey-light)", margin: "24px 0" }}>
          radius = baseRadius × √n
        </p>

        <p>
          A duo has √2 ≈ 1.41× the radius of a solo. A quad has 2× the radius. The visual weight grows proportionally with group size.
        </p>

        <div className="blog-visual-math">
          {/* Duo equation */}
          <div className="blog-equation">
            <svg width="40" height="40"><circle cx="20" cy="20" r="10" fill="var(--team-blue)" /></svg>
            <span className="blog-operator">+</span>
            <svg width="40" height="40"><circle cx="20" cy="20" r="10" fill="var(--team-blue)" /></svg>
            <span className="blog-operator">=</span>
            <svg width="50" height="50">
              <circle cx="25" cy="25" r="14.1" fill="var(--team-blue)" />
              <line x1="25" y1="10.9" x2="25" y2="39.1" stroke="#0a0a0a" strokeWidth="3" />
            </svg>
          </div>

          {/* Trio equation */}
          <div className="blog-equation">
            <svg width="40" height="40"><circle cx="20" cy="20" r="10" fill="var(--team-blue)" /></svg>
            <span className="blog-operator">+</span>
            <svg width="40" height="40"><circle cx="20" cy="20" r="10" fill="var(--team-blue)" /></svg>
            <span className="blog-operator">+</span>
            <svg width="40" height="40"><circle cx="20" cy="20" r="10" fill="var(--team-blue)" /></svg>
            <span className="blog-operator">=</span>
            <svg width="56" height="56">
              <circle cx="28" cy="28" r="17.3" fill="var(--team-blue)" />
              <line x1="28" y1="28" x2="28" y2="10.7" stroke="#0a0a0a" strokeWidth="3" />
              <line x1="28" y1="28" x2="43" y2="36.7" stroke="#0a0a0a" strokeWidth="3" />
              <line x1="28" y1="28" x2="13" y2="36.7" stroke="#0a0a0a" strokeWidth="3" />
            </svg>
          </div>

          {/* Quad equation */}
          <div className="blog-equation">
            <svg width="40" height="40"><circle cx="20" cy="20" r="10" fill="var(--team-blue)" /></svg>
            <span className="blog-operator">+</span>
            <svg width="40" height="40"><circle cx="20" cy="20" r="10" fill="var(--team-blue)" /></svg>
            <span className="blog-operator">+</span>
            <svg width="40" height="40"><circle cx="20" cy="20" r="10" fill="var(--team-blue)" /></svg>
            <span className="blog-operator">+</span>
            <svg width="40" height="40"><circle cx="20" cy="20" r="10" fill="var(--team-blue)" /></svg>
            <span className="blog-operator">=</span>
            <svg width="60" height="60">
              <circle cx="30" cy="30" r="20" fill="var(--team-blue)" />
              <line x1="10" y1="30" x2="50" y2="30" stroke="#0a0a0a" strokeWidth="3" />
              <line x1="30" y1="10" x2="30" y2="50" stroke="#0a0a0a" strokeWidth="3" />
            </svg>
          </div>
        </div>

        <p>
          The segments serve two purposes. First, they show how many players are in the group at a glance. Second, they distinguish AT circles from coincidentally overlapping solo players. When four randoms happen to have similar MMR, they cluster as separate dots. When four friends queue together, they form a single segmented circle.
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

        <h2>Mean and spread</h2>

        <p>
          I also draw a horizontal line at each team's geometric mean. If the lines are level, the match is balanced.
        </p>

        <p>
          The shaded region shows standard deviation. A tight band means consistent skill levels. A wide band means high variance, maybe one strong player with weaker teammates.
        </p>

        <div className="blog-chart-row">
          <div className="blog-chart-labeled">
            <Chart
              data={{ teamOneMmrs: [2100, 1900, 1700, 1500], teamTwoMmrs: [2000, 1800, 1600, 1400], teamOneAT: [0, 0, 0, 0], teamTwoAT: [0, 0, 0, 0] }}
              width={180}
              height={160}
              showMean={true}
              showStdDev={true}
            />
            <div className="blog-chart-label">even spread</div>
          </div>
          <div className="blog-chart-labeled">
            <Chart
              data={{ teamOneMmrs: [2400, 1600, 1200, 800], teamTwoMmrs: [1600, 1550, 1500, 1450], teamOneAT: [0, 0, 0, 0], teamTwoAT: [0, 0, 0, 0] }}
              width={180}
              height={160}
              showMean={true}
              showStdDev={true}
            />
            <div className="blog-chart-label">high vs low variance</div>
          </div>
        </div>

        <p>
          Dots show individual players. The line shows team strength. The shaded region shows team cohesion.
        </p>

        <p style={{ marginTop: "48px" }}>
          None of this is complicated on its own. The challenge is making it all work together and still feel simple when you glance at it. The chart should just tell you: is this match fair?
        </p>

        <h2>Gallery</h2>

        <p>
          Here's every combination of team composition and MMR distribution you might see.
        </p>

        {/* Row 1: All solos */}
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

        {/* Row 2: Duo + solos */}
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

        {/* Row 3: Two duos */}
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

        {/* Row 4: Trio + solo */}
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

        {/* Row 5: Full stacks */}
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
    </article>
  </div>
);

export default DesignLab;
