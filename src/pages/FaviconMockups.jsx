import React from "react";

const DARK = "#1a1a2e";
const GOLD = "#D4A843";
const GOLD_LIGHT = "#e8c96a";
const WHITE = "#ffffff";
const RED = "#cc3333";
const GREEN = "#5cb85c";
const GREY = "#666";

const SIZE = 128;
const SMALL = 32;

const IconFrame = ({ title, children, note }) => (
  <div style={{
    display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
    padding: 24, background: "rgba(255,255,255,0.03)", borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.08)",
  }}>
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ borderRadius: 12 }}>
      <rect width={SIZE} height={SIZE} fill={DARK} rx={16} />
      {children}
    </svg>
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      {/* Small preview */}
      <svg width={SMALL} height={SMALL} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ borderRadius: 4, border: "1px solid rgba(255,255,255,0.15)" }}>
        <rect width={SIZE} height={SIZE} fill={DARK} rx={16} />
        {children}
      </svg>
      <svg width={16} height={16} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ borderRadius: 2, border: "1px solid rgba(255,255,255,0.15)" }}>
        <rect width={SIZE} height={SIZE} fill={DARK} rx={16} />
        {children}
      </svg>
    </div>
    <div style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-sm)", color: WHITE, textAlign: "center" }}>{title}</div>
    {note && <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xxs)", color: GREY, textAlign: "center", maxWidth: 160 }}>{note}</div>}
  </div>
);

// 1. "4v4" typographic
const Icon4v4Text = () => (
  <IconFrame title='"4v4" Text' note="Direct brand recognition, Friz Quadrata">
    <text x="64" y="82" textAnchor="middle" fontFamily="'Friz Quadrata', serif" fontSize="52" fontWeight="bold" fill={GOLD}>4v4</text>
  </IconFrame>
);

// 2. Single "4"
const IconSingle4 = () => (
  <IconFrame title='Bold "4"' note="Minimal, reads at tiny sizes">
    <text x="64" y="92" textAnchor="middle" fontFamily="'Friz Quadrata', serif" fontSize="80" fontWeight="bold" fill={GOLD}>4</text>
  </IconFrame>
);

// 3. Crossed swords
const IconCrossedSwords = () => (
  <IconFrame title="Crossed Swords" note="Classic Warcraft battle motif">
    <g transform="translate(64,64)">
      {/* Sword 1 - top-left to bottom-right */}
      <g transform="rotate(-45)">
        <rect x="-4" y="-48" width="8" height="70" rx="2" fill={GOLD} />
        <rect x="-14" y="18" width="28" height="6" rx="2" fill={GOLD} />
        <circle cx="0" cy="-48" r="5" fill={GOLD_LIGHT} />
      </g>
      {/* Sword 2 - top-right to bottom-left */}
      <g transform="rotate(45)">
        <rect x="-4" y="-48" width="8" height="70" rx="2" fill={GOLD} />
        <rect x="-14" y="18" width="28" height="6" rx="2" fill={GOLD} />
        <circle cx="0" cy="-48" r="5" fill={GOLD_LIGHT} />
      </g>
    </g>
  </IconFrame>
);

// 4. Shield with "4v4"
const IconShield = () => (
  <IconFrame title='Shield "4v4"' note="Competitive / ranked feel">
    <path d="M64 14 L108 34 L108 70 Q108 100 64 118 Q20 100 20 70 L20 34 Z"
      fill="none" stroke={GOLD} strokeWidth="5" />
    <path d="M64 22 L100 38 L100 68 Q100 94 64 110 Q28 94 28 68 L28 38 Z"
      fill="rgba(212,168,67,0.08)" />
    <text x="64" y="78" textAnchor="middle" fontFamily="'Friz Quadrata', serif" fontSize="34" fontWeight="bold" fill={GOLD}>4v4</text>
  </IconFrame>
);

// 5. Four dots in a 2x2 grid
const IconFourDots = () => (
  <IconFrame title="Four Dots" note="Abstract 4 players, ultra-minimal">
    <circle cx="44" cy="44" r="14" fill={GOLD} />
    <circle cx="84" cy="44" r="14" fill={GOLD} />
    <circle cx="44" cy="84" r="14" fill={GOLD} />
    <circle cx="84" cy="84" r="14" fill={GOLD} />
  </IconFrame>
);

// 6. Two mirrored arrows (versus)
const IconVersusArrows = () => (
  <IconFrame title="Versus Arrows" note="Teams facing off">
    <g transform="translate(64,64)">
      {/* Left arrow pointing right */}
      <polygon points="-8,-30 22,-30 32,0 22,30 -8,30 2,0" fill={GOLD} opacity="0.9" />
      {/* Right arrow pointing left */}
      <polygon points="8,-30 -22,-30 -32,0 -22,30 8,30 -2,0" fill={GOLD} opacity="0.5" transform="translate(0,0) scale(-1,1)" />
      {/* VS text */}
    </g>
    <text x="64" y="72" textAnchor="middle" fontFamily="'Friz Quadrata', serif" fontSize="22" fontWeight="bold" fill={DARK}>VS</text>
  </IconFrame>
);

// 7. Gold mine silhouette
const IconGoldMine = () => (
  <IconFrame title="Gold Mine" note="Iconic WC3 reference">
    <g transform="translate(64,68)">
      {/* Mine body */}
      <rect x="-32" y="-10" width="64" height="40" rx="4" fill={GOLD} opacity="0.85" />
      {/* Roof */}
      <polygon points="-38,-10 0,-40 38,-10" fill={GOLD} />
      {/* Door */}
      <rect x="-10" y="4" width="20" height="26" rx="3" fill={DARK} />
      {/* Door arch */}
      <ellipse cx="0" cy="4" rx="10" ry="8" fill={DARK} />
      {/* Gold nugget in door */}
      <circle cx="0" cy="14" r="5" fill={GOLD_LIGHT} />
    </g>
  </IconFrame>
);

// 8. Mini race icon grid (2x2 letters)
const IconRaceGrid = () => (
  <IconFrame title="Race Grid" note="H/O/E/U — 4 races, 4v4">
    <text x="44" y="52" textAnchor="middle" fontFamily="'Friz Quadrata', serif" fontSize="30" fontWeight="bold" fill="#4488ff">H</text>
    <text x="84" y="52" textAnchor="middle" fontFamily="'Friz Quadrata', serif" fontSize="30" fontWeight="bold" fill={RED}>O</text>
    <text x="44" y="92" textAnchor="middle" fontFamily="'Friz Quadrata', serif" fontSize="30" fontWeight="bold" fill={GREEN}>E</text>
    <text x="84" y="92" textAnchor="middle" fontFamily="'Friz Quadrata', serif" fontSize="30" fontWeight="bold" fill="#9966cc">U</text>
  </IconFrame>
);

// 9. "4" with a sword through it
const Icon4Sword = () => (
  <IconFrame title='"4" + Sword' note="Brand + battle hybrid">
    <text x="64" y="92" textAnchor="middle" fontFamily="'Friz Quadrata', serif" fontSize="80" fontWeight="bold" fill={GOLD}>4</text>
    {/* Diagonal sword through the 4 */}
    <g transform="translate(64,64) rotate(-30)">
      <rect x="-3" y="-52" width="6" height="104" rx="2" fill={WHITE} opacity="0.7" />
      <rect x="-10" y="38" width="20" height="5" rx="2" fill={WHITE} opacity="0.7" />
    </g>
  </IconFrame>
);

// 10. Four dots in team colors (blue/red split)
const IconTeamDots = () => (
  <IconFrame title="Team Dots" note="Blue team vs Red team, 4v4 literal">
    {/* Blue team */}
    <circle cx="38" cy="38" r="13" fill="#4488ff" />
    <circle cx="38" cy="68" r="13" fill="#4488ff" />
    <circle cx="38" cy="98" r="13" fill="#4488ff" />
    <circle cx="38" cy="53" r="13" fill="#4488ff" />
    {/* Rearrange to 2x2 per team */}
    {/* Actually let's do left 4 blue, right 4 red in columns */}
    <rect x="0" y="0" width={SIZE} height={SIZE} fill={DARK} rx={16} />
    <circle cx="36" cy="36" r="11" fill="#4488ff" />
    <circle cx="60" cy="36" r="11" fill="#4488ff" />
    <circle cx="36" cy="60" r="11" fill="#4488ff" />
    <circle cx="60" cy="60" r="11" fill="#4488ff" />
    {/* VS divider */}
    <line x1="64" y1="24" x2="64" y2="104" stroke={GOLD} strokeWidth="2" opacity="0.4" />
    <circle cx="68" cy="72" r="11" fill={RED} />
    <circle cx="92" cy="72" r="11" fill={RED} />
    <circle cx="68" cy="96" r="11" fill={RED} />
    <circle cx="92" cy="96" r="11" fill={RED} />
  </IconFrame>
);

// 11. Stylized "GG"
const IconGG = () => (
  <IconFrame title='"GG"' note='From the domain — "good game"'>
    <text x="64" y="84" textAnchor="middle" fontFamily="'Friz Quadrata', serif" fontSize="56" fontWeight="bold" fill={GOLD}>GG</text>
  </IconFrame>
);

// 12. Four-pointed star / compass
const IconStar = () => (
  <IconFrame title="4-Point Star" note="Four points = four players per team">
    <g transform="translate(64,64)">
      <polygon points="0,-44 10,-10 44,0 10,10 0,44 -10,10 -44,0 -10,-10" fill={GOLD} />
      <circle cx="0" cy="0" r="10" fill={DARK} />
      <text x="0" y="5" textAnchor="middle" fontFamily="'Friz Quadrata', serif" fontSize="14" fontWeight="bold" fill={GOLD}>4</text>
    </g>
  </IconFrame>
);

const FaviconMockups = () => (
  <div style={{ padding: "48px 24px", maxWidth: 1200, margin: "0 auto" }}>
    <div style={{ marginBottom: 40 }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xxs)", textTransform: "uppercase", letterSpacing: "0.1em", color: GREY, marginBottom: 8 }}>Favicon Concepts</div>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-xl)", color: WHITE, margin: 0 }}>4v4.gg Favicon Mockups</h1>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--grey-light)", marginTop: 8 }}>
        Each icon shown at 128px (design), 32px (browser tab), and 16px (bookmark) sizes.
      </p>
    </div>

    {/* Typographic */}
    <Section title="Typographic">
      <Icon4v4Text />
      <IconSingle4 />
      <IconGG />
    </Section>

    {/* Symbolic */}
    <Section title="Symbolic">
      <IconCrossedSwords />
      <IconShield />
      <IconFourDots />
      <IconVersusArrows />
      <IconStar />
    </Section>

    {/* Game-referencing */}
    <Section title="Game-Referencing">
      <IconGoldMine />
      <IconRaceGrid />
      <Icon4Sword />
      <IconTeamDots />
    </Section>
  </div>
);

const Section = ({ title, children }) => (
  <div style={{ marginBottom: 48 }}>
    <h2 style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-lg)", color: GOLD, marginBottom: 20, borderBottom: `1px solid rgba(212,168,67,0.2)`, paddingBottom: 8 }}>{title}</h2>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
      {children}
    </div>
  </div>
);

export default FaviconMockups;
