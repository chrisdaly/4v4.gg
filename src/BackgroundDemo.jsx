import React from "react";

const BackgroundDemo = () => {
  // Sample player card to show on each background
  const SampleCard = () => (
    <div style={{
      display: "flex",
      gap: "40px",
      justifyContent: "center",
      alignItems: "flex-start",
      padding: "40px 20px"
    }}>
      {/* Team 1 sample */}
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: "60px",
          height: "60px",
          background: "#333",
          borderRadius: "4px",
          margin: "0 auto 8px"
        }} />
        <h3 style={{ color: "#fcdb33", margin: "0 0 4px" }}>PlayerOne</h3>
        <p style={{ color: "#fff", margin: "0 0 4px", fontFamily: "monospace" }}>
          1842 <span style={{ color: "#888" }}>MMR</span> <span style={{ color: "#666" }}>· #15</span>
        </p>
        <p style={{ color: "#888", fontSize: "10px", margin: "0 0 4px" }}>
          Session: <span style={{ color: "#fff" }}>3W-1L</span> <span style={{ color: "#34c774" }}>↑28 MMR</span>
        </p>
        <div style={{ display: "flex", gap: "3px", justifyContent: "center", marginBottom: "6px" }}>
          {[true, false, true, true, true].map((won, i, arr) => (
            <span key={i} style={{
              width: i === arr.length - 1 ? "9px" : "6px",
              height: i === arr.length - 1 ? "9px" : "6px",
              borderRadius: "50%",
              background: won ? "#34c774" : "#c23434",
              opacity: i === arr.length - 1 ? 1 : 0.6
            }} />
          ))}
        </div>
        <div style={{ width: "80px", height: "20px", background: "rgba(255,255,255,0.1)", margin: "0 auto 4px", borderRadius: "2px" }} />
        <p style={{ color: "#666", fontSize: "9px", margin: 0 }}>
          peak <span style={{ color: "#34c774" }}>1876</span> MMR
        </p>
      </div>

      {/* VS */}
      <div style={{ color: "#888", fontSize: "24px", fontWeight: "bold", paddingTop: "40px" }}>VS</div>

      {/* Team 2 sample */}
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: "60px",
          height: "60px",
          background: "#333",
          borderRadius: "4px",
          margin: "0 auto 8px"
        }} />
        <h3 style={{ color: "#fcdb33", margin: "0 0 4px" }}>PlayerTwo</h3>
        <p style={{ color: "#fff", margin: "0 0 4px", fontFamily: "monospace" }}>
          1798 <span style={{ color: "#888" }}>MMR</span> <span style={{ color: "#666" }}>· #22</span>
        </p>
        <p style={{ color: "#888", fontSize: "10px", margin: "0 0 4px" }}>
          Session: <span style={{ color: "#fff" }}>1W-2L</span> <span style={{ color: "#c23434" }}>↓18 MMR</span>
        </p>
        <div style={{ display: "flex", gap: "3px", justifyContent: "center", marginBottom: "6px" }}>
          {[false, true, false].map((won, i, arr) => (
            <span key={i} style={{
              width: i === arr.length - 1 ? "9px" : "6px",
              height: i === arr.length - 1 ? "9px" : "6px",
              borderRadius: "50%",
              background: won ? "#34c774" : "#c23434",
              opacity: i === arr.length - 1 ? 1 : 0.6
            }} />
          ))}
        </div>
        <div style={{ width: "80px", height: "20px", background: "rgba(255,255,255,0.1)", margin: "0 auto 4px", borderRadius: "2px" }} />
        <p style={{ color: "#666", fontSize: "9px", margin: 0 }}>
          peak <span style={{ color: "#34c774" }}>1834</span> MMR
        </p>
      </div>
    </div>
  );

  const backgrounds = [
    {
      name: "1. Solid Dark",
      style: { background: "#0a0a0a" },
      description: "Clean, minimal, no distractions"
    },
    {
      name: "2. Radial Vignette",
      style: { background: "radial-gradient(ellipse at center, #1a1a1a 0%, #050505 70%)" },
      description: "Focus on center content"
    },
    {
      name: "3. Dark Parchment",
      style: {
        background: "linear-gradient(180deg, #1a1610 0%, #0d0b08 100%)",
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.08'/%3E%3C/svg%3E")`,
      },
      description: "Classic WC3 parchment, darkened"
    },
    {
      name: "4. Stone/Slate Texture",
      style: {
        background: "linear-gradient(135deg, #12120f 0%, #0a0a08 50%, #0f0f0c 100%)",
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='turbulence' baseFrequency='0.5' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.06'/%3E%3C/svg%3E")`,
      },
      description: "Dark stone texture"
    },
    {
      name: "5. Leather/Hide",
      style: {
        background: "radial-gradient(ellipse at center, #1a1512 0%, #0a0806 80%)",
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='5'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.05'/%3E%3C/svg%3E")`,
      },
      description: "Dark leather texture with vignette"
    },
    {
      name: "6. Framed (Gold Border)",
      style: {
        background: "#0a0a0a",
        border: "2px solid #3d3422",
        boxShadow: "inset 0 0 0 1px #1a1a1a, inset 0 0 60px rgba(0,0,0,0.5)"
      },
      description: "Reforged-style subtle gold frame"
    },
    {
      name: "7. Framed (Ornate Corners)",
      style: {
        background: "linear-gradient(180deg, #12100a 0%, #08080a 100%)",
        border: "3px solid transparent",
        borderImage: "linear-gradient(135deg, #4a3d20 0%, #1a1508 50%, #4a3d20 100%) 1",
        boxShadow: "inset 0 0 80px rgba(0,0,0,0.6)"
      },
      description: "Gold gradient border"
    },
    {
      name: "8. Map Preview (Darkened)",
      style: {
        background: "url('/maps/Nightopia.png') center/cover",
        position: "relative"
      },
      overlay: "rgba(0,0,0,0.85)",
      description: "Current map as context"
    },
    {
      name: "9. Warcraft Gold Vignette",
      style: {
        background: "radial-gradient(ellipse at center, #1a1508 0%, #0a0804 60%, #050402 100%)",
      },
      description: "Gold tinted vignette"
    },
    {
      name: "10. Dark with Top Glow",
      style: {
        background: "linear-gradient(180deg, #1a1610 0%, #0a0a0a 30%, #0a0a0a 100%)",
        boxShadow: "inset 0 1px 0 rgba(252, 219, 51, 0.1)"
      },
      description: "Subtle gold light from top"
    },
    {
      name: "11. Aged Paper Dark",
      style: {
        background: "#0f0d0a",
        backgroundImage: `
          radial-gradient(ellipse at 20% 20%, rgba(30, 25, 18, 0.4) 0%, transparent 50%),
          radial-gradient(ellipse at 80% 80%, rgba(25, 20, 15, 0.3) 0%, transparent 50%),
          url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.07'/%3E%3C/svg%3E")
        `,
      },
      description: "Uneven aged paper texture"
    },
    {
      name: "12. Double Border Frame",
      style: {
        background: "#0a0a08",
        border: "1px solid #2a2418",
        boxShadow: "inset 0 0 0 4px #0a0a08, inset 0 0 0 5px #1a1610, 0 0 20px rgba(0,0,0,0.5)"
      },
      description: "Classic double-line frame"
    },
  ];

  return (
    <div style={{ padding: "20px", background: "#000", minHeight: "100vh" }}>
      <h1 style={{ color: "#fcdb33", marginBottom: "10px" }}>Background Options</h1>
      <p style={{ color: "#888", marginBottom: "30px" }}>Compare different background styles for the game view</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "20px" }}>
        {backgrounds.map((bg, idx) => (
          <div key={idx} style={{ border: "1px solid #333", borderRadius: "8px", overflow: "hidden" }}>
            <div style={{ padding: "10px 15px", background: "#1a1a1a", borderBottom: "1px solid #333" }}>
              <h3 style={{ color: "#fcdb33", margin: 0, fontSize: "14px" }}>{bg.name}</h3>
              <p style={{ color: "#666", margin: "4px 0 0", fontSize: "11px" }}>{bg.description}</p>
            </div>
            <div style={{ ...bg.style, position: "relative", minHeight: "200px" }}>
              {bg.overlay && (
                <div style={{
                  position: "absolute",
                  inset: 0,
                  background: bg.overlay,
                  zIndex: 1
                }} />
              )}
              <div style={{ position: "relative", zIndex: 2 }}>
                <SampleCard />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BackgroundDemo;
