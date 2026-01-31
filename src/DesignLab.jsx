import React, { useState, useEffect } from "react";
import Navbar from "./Navbar.jsx";
import GameDesignVariant from "./GameDesignVariant.jsx";
import { processOngoingGameData } from "./utils.jsx";
import {
  mockOngoingGame,
  mockProfilePics,
  mockPlayerCountries,
  mockSessionData,
} from "./mockData/atGameData.js";

// Test scenarios for different AT and MMR combinations
const testScenarios = {
  "2at_oneTeam": {
    label: "2 AT (One Team)",
    description: "Team 2 has one AT pair",
    mmrOverrides: {
      "napo#21972": 1765, // Similar to SolveThis (1761) for collision test
    },
    atGroups: {
      "xxxxxx#21442": ["alpha#211874"],
      "alpha#211874": ["xxxxxx#21442"],
    },
  },
  "2at_bothTeams": {
    label: "2 AT (Both Teams)",
    description: "Each team has one AT pair",
    mmrOverrides: {
      "solana#21903": 1868, // Same as iLoveMyAlly for AT
    },
    atGroups: {
      "solana#21903": ["ilovemyally#2845"],
      "ilovemyally#2845": ["solana#21903"],
      "xxxxxx#21442": ["alpha#211874"],
      "alpha#211874": ["xxxxxx#21442"],
    },
  },
  "4at_oneTeam": {
    label: "4 AT (One Team - 2 Pairs)",
    description: "Team 2 has two AT pairs",
    mmrOverrides: {
      "napo#21972": 1761, // Same as SolveThis for AT pair
    },
    atGroups: {
      "xxxxxx#21442": ["alpha#211874"],
      "alpha#211874": ["xxxxxx#21442"],
      "napo#21972": ["solvethis#2809"],
      "solvethis#2809": ["napo#21972"],
    },
  },
  "4at_bothTeams": {
    label: "4 AT (Both Teams - 2 Pairs Each)",
    description: "Both teams fully AT",
    mmrOverrides: {
      "solana#21903": 1868, // Same as iLoveMyAlly
      "geass#21832": 1633, // Same as Dapanda for AT pair
      "napo#21972": 1761, // Same as SolveThis
    },
    atGroups: {
      "solana#21903": ["ilovemyally#2845"],
      "ilovemyally#2845": ["solana#21903"],
      "geass#21832": ["dapanda#11992"],
      "dapanda#11992": ["geass#21832"],
      "xxxxxx#21442": ["alpha#211874"],
      "alpha#211874": ["xxxxxx#21442"],
      "napo#21972": ["solvethis#2809"],
      "solvethis#2809": ["napo#21972"],
    },
  },
  "collision_2close": {
    label: "2 Close MMRs (No AT)",
    description: "Napo & SolveThis similar MMR, no AT",
    mmrOverrides: {
      "napo#21972": 1763,
    },
    atGroups: {},
  },
  "collision_3close": {
    label: "3 Close MMRs (No AT)",
    description: "Three players with similar MMR on Team 2",
    mmrOverrides: {
      "napo#21972": 1765,
      "alpha#211874": 1760,
    },
    atGroups: {},
  },
  "collision_4close": {
    label: "4 Close MMRs (No AT)",
    description: "All Team 2 players similar MMR",
    mmrOverrides: {
      "xxxxxx#21442": 1800,
      "alpha#211874": 1805,
      "napo#21972": 1795,
      "solvethis#2809": 1802,
    },
    atGroups: {},
  },
  "mixed_at_collision": {
    label: "AT + Collision",
    description: "AT pair + two non-AT with similar MMR",
    mmrOverrides: {
      "napo#21972": 1763,
    },
    atGroups: {
      "xxxxxx#21442": ["alpha#211874"],
      "alpha#211874": ["xxxxxx#21442"],
    },
  },
  "3player_at": {
    label: "3-Player AT",
    description: "Team 2 has a 3-player AT group (thirds)",
    mmrOverrides: {
      "xxxxxx#21442": 1900,
      "alpha#211874": 1900,
      "napo#21972": 1900,
    },
    atGroups: {
      "xxxxxx#21442": ["alpha#211874", "napo#21972"],
      "alpha#211874": ["xxxxxx#21442", "napo#21972"],
      "napo#21972": ["xxxxxx#21442", "alpha#211874"],
    },
  },
  "4player_at": {
    label: "4-Player AT",
    description: "Team 2 is a full 4-player AT group (quarters)",
    mmrOverrides: {
      "xxxxxx#21442": 1850,
      "alpha#211874": 1850,
      "napo#21972": 1850,
      "solvethis#2809": 1850,
    },
    atGroups: {
      "xxxxxx#21442": ["alpha#211874", "napo#21972", "solvethis#2809"],
      "alpha#211874": ["xxxxxx#21442", "napo#21972", "solvethis#2809"],
      "napo#21972": ["xxxxxx#21442", "alpha#211874", "solvethis#2809"],
      "solvethis#2809": ["xxxxxx#21442", "alpha#211874", "napo#21972"],
    },
  },
};

// Simplified - just a dash now, color controlled by AT Color picker

const atColors = [
  { id: "gold", label: "Gold", color: "var(--gold)", hex: "#c9a227" },
  { id: "purple", label: "Purple", color: "#8b5cf6", hex: "#8b5cf6" },
  { id: "teal", label: "Teal", color: "#14b8a6", hex: "#14b8a6" },
];

const mmrLayouts = [
  { id: "vertical", label: "Vertical (Current)" },
  { id: "sideBySide", label: "Side-by-Side" },
  { id: "horizontal", label: "Horizontal" },
  { id: "strip", label: "Compact Strip" },
];

const DesignLab = () => {
  const [playerData, setPlayerData] = useState(null);
  const [metaData, setMetaData] = useState(null);
  const [atColor, setAtColor] = useState("gold");
  const [mmrLayout, setMmrLayout] = useState("sideBySide");
  const [scenario, setScenario] = useState("2at_oneTeam");

  // Petal shape parameters
  const [petalLength, setPetalLength] = useState(1.4);
  const [petalWidth, setPetalWidth] = useState(0.7);
  const [petalOffset, setPetalOffset] = useState(0.3);
  const [petalRotation, setPetalRotation] = useState(0);

  // Process data with scenario overrides
  useEffect(() => {
    const processedData = processOngoingGameData(mockOngoingGame);
    const currentScenario = testScenarios[scenario];

    // Apply MMR overrides from scenario
    const modifiedPlayerData = processedData.playerData.map(player => {
      const btLower = player.battleTag.toLowerCase();
      if (currentScenario.mmrOverrides[btLower]) {
        return { ...player, oldMmr: currentScenario.mmrOverrides[btLower] };
      }
      return player;
    });

    setPlayerData(modifiedPlayerData);
    setMetaData(processedData.metaData);
  }, [scenario]);

  // Apply AT color as CSS variable
  useEffect(() => {
    const colorObj = atColors.find(c => c.id === atColor);
    if (colorObj) {
      document.documentElement.style.setProperty('--at-color', colorObj.hex);
    }
  }, [atColor]);

  if (!playerData || !metaData) {
    return <div>Loading mock data...</div>;
  }

  const currentColor = atColors.find(c => c.id === atColor);

  return (
    <div>
      <Navbar />

      {/* Controls Panel */}
      <div style={{
        padding: "16px 24px",
        background: "var(--surface-2)",
        borderBottom: "1px solid var(--grey-mid)",
      }}>
        <h2 style={{ color: "var(--gold)", margin: "0 0 16px", fontFamily: "var(--font-display)" }}>
          Design Lab - AT Indicator & MMR Chart
        </h2>

        <div style={{ display: "flex", gap: "32px", flexWrap: "wrap" }}>
          {/* AT Color */}
          <div>
            <label style={{ color: "var(--grey-light)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: "6px" }}>
              AT Color (applies to both)
            </label>
            <div style={{ display: "flex", gap: "6px" }}>
              {atColors.map(color => (
                <button
                  key={color.id}
                  onClick={() => setAtColor(color.id)}
                  style={{
                    padding: "6px 12px",
                    background: atColor === color.id ? color.hex : "var(--surface-3)",
                    color: atColor === color.id ? "#000" : "#fff",
                    border: `2px solid ${color.hex}`,
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontFamily: "var(--font-mono)",
                    fontSize: "11px",
                  }}
                >
                  {color.label}
                </button>
              ))}
            </div>
          </div>

          {/* MMR Layout */}
          <div>
            <label style={{ color: "var(--grey-light)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: "6px" }}>
              MMR Chart Layout
            </label>
            <div style={{ display: "flex", gap: "6px" }}>
              {mmrLayouts.map(layout => (
                <button
                  key={layout.id}
                  onClick={() => setMmrLayout(layout.id)}
                  style={{
                    padding: "6px 12px",
                    background: mmrLayout === layout.id ? "var(--gold)" : "var(--surface-3)",
                    color: mmrLayout === layout.id ? "#000" : "#fff",
                    border: "1px solid var(--grey-mid)",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontFamily: "var(--font-mono)",
                    fontSize: "11px",
                  }}
                >
                  {layout.label}
                </button>
              ))}
            </div>
          </div>

          {/* Test Scenario */}
          <div>
            <label style={{ color: "var(--grey-light)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: "6px" }}>
              Test Scenario
            </label>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {Object.entries(testScenarios).map(([id, sc]) => (
                <button
                  key={id}
                  onClick={() => setScenario(id)}
                  title={sc.description}
                  style={{
                    padding: "6px 12px",
                    background: scenario === id ? "var(--gold)" : "var(--surface-3)",
                    color: scenario === id ? "#000" : "#fff",
                    border: "1px solid var(--grey-mid)",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontFamily: "var(--font-mono)",
                    fontSize: "10px",
                  }}
                >
                  {sc.label}
                </button>
              ))}
            </div>
            <p style={{ color: "var(--grey-mid)", fontSize: "11px", margin: "6px 0 0" }}>
              {testScenarios[scenario].description}
            </p>
          </div>
        </div>

        {/* Petal Shape Controls */}
        <div style={{ marginTop: "16px", padding: "16px", background: "var(--surface-3)", borderRadius: "8px" }}>
          <label style={{ color: "var(--gold)", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: "12px", fontWeight: "bold" }}>
            Petal Shape Parameters
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
            <div>
              <label style={{ color: "var(--grey-light)", fontSize: "10px", display: "block", marginBottom: "4px" }}>
                Length: {petalLength.toFixed(2)}
              </label>
              <input
                type="range"
                min="0.5"
                max="2.5"
                step="0.1"
                value={petalLength}
                onChange={(e) => setPetalLength(parseFloat(e.target.value))}
                style={{ width: "100%" }}
              />
            </div>
            <div>
              <label style={{ color: "var(--grey-light)", fontSize: "10px", display: "block", marginBottom: "4px" }}>
                Width: {petalWidth.toFixed(2)}
              </label>
              <input
                type="range"
                min="0.2"
                max="1.5"
                step="0.1"
                value={petalWidth}
                onChange={(e) => setPetalWidth(parseFloat(e.target.value))}
                style={{ width: "100%" }}
              />
            </div>
            <div>
              <label style={{ color: "var(--grey-light)", fontSize: "10px", display: "block", marginBottom: "4px" }}>
                Offset: {petalOffset.toFixed(2)}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={petalOffset}
                onChange={(e) => setPetalOffset(parseFloat(e.target.value))}
                style={{ width: "100%" }}
              />
            </div>
            <div>
              <label style={{ color: "var(--grey-light)", fontSize: "10px", display: "block", marginBottom: "4px" }}>
                Rotation: {petalRotation}°
              </label>
              <input
                type="range"
                min="0"
                max="90"
                step="5"
                value={petalRotation}
                onChange={(e) => setPetalRotation(parseInt(e.target.value))}
                style={{ width: "100%" }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Game Display with selected MMR layout */}
      <div className="games">
        <GameDesignVariant
          key={scenario}
          playerData={playerData}
          metaData={metaData}
          profilePics={mockProfilePics}
          playerCountries={mockPlayerCountries}
          sessionData={mockSessionData}
          compact={false}
          initialATGroups={testScenarios[scenario].atGroups}
          mmrLayout={mmrLayout}
          atColor={currentColor?.hex}
          petalParams={{ length: petalLength, width: petalWidth, offset: petalOffset, rotation: petalRotation }}
        />
      </div>

      {/* Layout comparison - all 4 side by side */}
      <div style={{
        padding: "24px",
        background: "var(--surface-2)",
        margin: "24px",
        borderRadius: "8px",
        border: "1px solid var(--grey-mid)",
      }}>
        <h3 style={{ color: "var(--gold)", margin: "0 0 8px", fontFamily: "var(--font-display)" }}>
          Layout Comparison
        </h3>
        <p style={{ color: "var(--grey-light)", fontSize: "12px", marginBottom: "16px" }}>
          How each layout would fit in the center column between teams
        </p>

        <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", alignItems: "flex-start" }}>
          {mmrLayouts.map(layout => (
            <div key={layout.id} style={{ textAlign: "center" }}>
              <h4 style={{
                color: mmrLayout === layout.id ? "var(--gold)" : "#fff",
                fontSize: "11px",
                margin: "0 0 8px",
                textTransform: "uppercase",
                letterSpacing: "0.1em"
              }}>
                {layout.label}
              </h4>
              <div style={{
                width: layout.id === "horizontal" || layout.id === "strip" ? "200px" : layout.id === "sideBySide" ? "120px" : "100px",
                height: layout.id === "horizontal" ? "80px" : layout.id === "strip" ? "50px" : "160px",
                background: "var(--surface-1)",
                borderRadius: "4px",
                padding: "8px",
                border: mmrLayout === layout.id ? "2px solid var(--gold)" : "1px solid var(--grey-mid)",
              }}>
                <MmrPreview layout={layout.id} atColor={currentColor?.hex} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Simple preview component for MMR layouts
const MmrPreview = ({ layout, atColor }) => {
  const svgRef = React.useRef(null);

  React.useEffect(() => {
    if (!svgRef.current) return;
    const svg = svgRef.current;
    const width = svg.clientWidth;
    const height = svg.clientHeight;

    // Clear
    svg.innerHTML = '';

    // Mock data - team1: 2112, 1870, 1868, 1633 | team2: 2035, 2035, 1813, 1761
    // Team 1: Solana (1870) + iLoveMyAlly (1868) are AT
    // Team 2: xxxxxx + ALPHA (both 2035) are AT
    const team1 = [2112, 1870, 1868, 1633]; // Index 1,2 are AT
    const team2 = [2035, 2035, 1813, 1761]; // Index 0,1 are AT
    const team1AT = [false, true, true, false];
    const team2AT = [true, true, false, false];
    const minMmr = 1600;
    const maxMmr = 2150;

    const ns = "http://www.w3.org/2000/svg";

    if (layout === "vertical" || layout === "sideBySide") {
      const yScale = (mmr) => 10 + (1 - (mmr - minMmr) / (maxMmr - minMmr)) * (height - 20);
      const x1 = layout === "sideBySide" ? width * 0.35 : width * 0.33;
      const x2 = layout === "sideBySide" ? width * 0.65 : width * 0.67;
      const centerX = width / 2;
      const atHalfOffset = 3; // Half offset - AT dots equidistant from team line

      // Team spread lines (draw first so dots appear on top)
      const team1Ys = team1.map(m => yScale(m)).sort((a, b) => a - b);
      const team2Ys = team2.map(m => yScale(m)).sort((a, b) => a - b);

      // Team 1 spread line
      const t1Spread = document.createElementNS(ns, "line");
      t1Spread.setAttribute("x1", x1);
      t1Spread.setAttribute("y1", team1Ys[0]);
      t1Spread.setAttribute("x2", x1);
      t1Spread.setAttribute("y2", team1Ys[team1Ys.length - 1]);
      t1Spread.setAttribute("stroke", "#4a9eff");
      t1Spread.setAttribute("stroke-width", "2");
      t1Spread.setAttribute("stroke-opacity", "0.4");
      svg.appendChild(t1Spread);

      // Team 2 spread line
      const t2Spread = document.createElementNS(ns, "line");
      t2Spread.setAttribute("x1", x2);
      t2Spread.setAttribute("y1", team2Ys[0]);
      t2Spread.setAttribute("x2", x2);
      t2Spread.setAttribute("y2", team2Ys[team2Ys.length - 1]);
      t2Spread.setAttribute("stroke", "#ef4444");
      t2Spread.setAttribute("stroke-width", "2");
      t2Spread.setAttribute("stroke-opacity", "0.4");
      svg.appendChild(t2Spread);

      // Center line
      const line = document.createElementNS(ns, "line");
      line.setAttribute("x1", centerX);
      line.setAttribute("y1", 0);
      line.setAttribute("x2", centerX);
      line.setAttribute("y2", height);
      line.setAttribute("stroke", "#444");
      line.setAttribute("stroke-width", "1");
      svg.appendChild(line);

      // Team 1: AT pairs equidistant from team line + collision for non-AT
      const collisionOffset = 8;
      const team1Pos = [];
      let team1ATCount = 0;
      team1.forEach((mmr, i) => {
        const y = yScale(mmr);
        let x = x1;
        const isAT = team1AT[i];
        if (isAT) {
          team1ATCount++;
          // Odd AT (1,3,5) toward center, even AT (2,4,6) toward outer
          const isOddAT = team1ATCount % 2 === 1;
          if (isOddAT) {
            x = x1 + atHalfOffset; // toward center
          } else {
            x = x1 - atHalfOffset; // toward outer
          }
        } else {
          // Check collision for non-AT - only offset X, never Y
          let attempts = 0;
          while (attempts < 5) {
            const collision = team1Pos.find(p => Math.abs(p.y - y) < 10 && Math.abs(p.x - x) < 10);
            if (!collision) break;
            attempts++;
            x = x1 - (collisionOffset * attempts); // Offset to outer (left)
          }
        }
        team1Pos.push({ mmr, x, y, index: i, isAT });
      });

      // Team 2: AT pairs equidistant from team line + collision for non-AT
      const team2Pos = [];
      let team2ATCount = 0;
      team2.forEach((mmr, i) => {
        const y = yScale(mmr);
        let x = x2;
        const isAT = team2AT[i];
        if (isAT) {
          team2ATCount++;
          // Odd AT (1,3,5) toward center, even AT (2,4,6) toward outer
          const isOddAT = team2ATCount % 2 === 1;
          if (isOddAT) {
            x = x2 - atHalfOffset; // toward center
          } else {
            x = x2 + atHalfOffset; // toward outer
          }
        } else {
          // Check collision for non-AT
          let attempts = 0;
          while (attempts < 5) {
            const collision = team2Pos.find(p => Math.abs(p.y - y) < 10 && Math.abs(p.x - x) < 10);
            if (!collision) break;
            attempts++;
            x = x2 + (collisionOffset * attempts); // Offset to outer (right)
          }
        }
        team2Pos.push({ mmr, x, y, index: i, isAT });
      });

      // Team 1 dots - AT players get half circles (left/right)
      // Odd AT (1,3,5) gets right half, even AT (2,4,6) gets left half
      let team1ATRenderCount = 0;
      team1Pos.forEach(p => {
        if (p.isAT) {
          team1ATRenderCount++;
          const r = 4;
          const isOddAT = team1ATRenderCount % 2 === 1;
          const path = document.createElementNS(ns, "path");
          if (isOddAT) {
            // Right half: M center, L top, A to bottom through right, Z
            path.setAttribute("d", `M ${p.x} ${p.y} L ${p.x} ${p.y - r} A ${r} ${r} 0 0 1 ${p.x} ${p.y + r} Z`);
          } else {
            // Left half: M center, L bottom, A to top through left, Z
            path.setAttribute("d", `M ${p.x} ${p.y} L ${p.x} ${p.y + r} A ${r} ${r} 0 0 1 ${p.x} ${p.y - r} Z`);
          }
          path.setAttribute("fill", "#4a9eff");
          svg.appendChild(path);
        } else {
          const circle = document.createElementNS(ns, "circle");
          circle.setAttribute("cx", p.x);
          circle.setAttribute("cy", p.y);
          circle.setAttribute("r", 4);
          circle.setAttribute("fill", "#4a9eff");
          svg.appendChild(circle);
        }
      });

      // Team 2 dots - AT players get half circles (left/right)
      // Odd AT (1,3,5) gets left half, even AT (2,4,6) gets right half (opposite of team 1)
      let team2ATRenderCount = 0;
      team2Pos.forEach(p => {
        if (p.isAT) {
          team2ATRenderCount++;
          const r = 4;
          const isOddAT = team2ATRenderCount % 2 === 1;
          const path = document.createElementNS(ns, "path");
          if (isOddAT) {
            // Left half: M center, L bottom, A to top through left, Z
            path.setAttribute("d", `M ${p.x} ${p.y} L ${p.x} ${p.y + r} A ${r} ${r} 0 0 1 ${p.x} ${p.y - r} Z`);
          } else {
            // Right half: M center, L top, A to bottom through right, Z
            path.setAttribute("d", `M ${p.x} ${p.y} L ${p.x} ${p.y - r} A ${r} ${r} 0 0 1 ${p.x} ${p.y + r} Z`);
          }
          path.setAttribute("fill", "#ef4444");
          svg.appendChild(path);
        } else {
          const circle = document.createElementNS(ns, "circle");
          circle.setAttribute("cx", p.x);
          circle.setAttribute("cy", p.y);
          circle.setAttribute("r", 4);
          circle.setAttribute("fill", "#ef4444");
          svg.appendChild(circle);
        }
      });

    } else if (layout === "horizontal" || layout === "strip") {
      const xScale = (mmr) => 10 + ((mmr - minMmr) / (maxMmr - minMmr)) * (width - 20);
      const centerY = height / 2;

      // All dots on one line
      const allData = [
        ...team1.map(mmr => ({ mmr, team: 1, isAT: false })),
        ...team2.map((mmr, i) => ({ mmr, team: 2, isAT: i < 2 })),
      ];

      // Simple collision offset
      const positioned = [];
      allData.forEach(d => {
        let x = xScale(d.mmr);
        let y = centerY;
        let attempts = 0;
        while (attempts < 5) {
          const collision = positioned.find(p => Math.abs(p.x - x) < 10 && Math.abs(p.y - y) < 10);
          if (!collision) break;
          y = centerY + (attempts % 2 === 0 ? 1 : -1) * Math.ceil(attempts / 2) * 10;
          attempts++;
        }
        positioned.push({ ...d, x, y });
      });

      // AT line
      const atPlayers = positioned.filter(p => p.isAT);
      if (atPlayers.length === 2) {
        const atLine = document.createElementNS(ns, "line");
        atLine.setAttribute("x1", atPlayers[0].x);
        atLine.setAttribute("y1", atPlayers[0].y);
        atLine.setAttribute("x2", atPlayers[1].x);
        atLine.setAttribute("y2", atPlayers[1].y);
        atLine.setAttribute("stroke", atColor);
        atLine.setAttribute("stroke-width", "3");
        svg.appendChild(atLine);
      }

      positioned.forEach(d => {
        const circle = document.createElementNS(ns, "circle");
        circle.setAttribute("cx", d.x);
        circle.setAttribute("cy", d.y);
        circle.setAttribute("r", layout === "strip" ? 5 : 6);
        circle.setAttribute("fill", d.team === 1 ? "#4a9eff" : "#ef4444");
        if (d.isAT) {
          circle.setAttribute("stroke", atColor);
          circle.setAttribute("stroke-width", "2");
        }
        svg.appendChild(circle);
      });
    }
  }, [layout, atColor]);

  return <svg ref={svgRef} style={{ width: "100%", height: "100%" }} />;
};

export default DesignLab;
