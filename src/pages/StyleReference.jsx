import React, { useState } from "react";
import {
  colors,
  fonts,
  typeScale,
  spacing,
  borders,
  effects,
  overlays,
  surfaces,
  tints,
  leagueColors,
  raceColors,
  zIndex,
  layout,
  quote,
  patterns,
  chartColors,
  components,
} from "../lib/design-tokens";
import { MmrComparison } from "../components/MmrComparison";
import PeonLoader from "../components/PeonLoader";
import {
  Button,
  ResultBadge,
  Dot,
  Delta,
  TeamBar,
  Card,
  CardSubtle,
  ThemedCard,
  Select,
  Input,
  Skeleton,
  SkeletonCircle,
  RaceIcon,
  CountryFlag,
  ConfirmModal,
  PageNav,
  PageHero,
  WinSurface,
  LossSurface,
} from "../components/ui";
import { raceIcons } from "../lib/constants";
import ChatMessage from "../components/chat/ChatMessage";
import QuoteBlock from "../components/chat/QuoteBlock";
import "../styles/pages/DevTools.css";
import "../styles/pages/News.css";
import "../styles/pages/StyleReference.css";


// Sample groups for the ChatMessage section
const SR_CHAT_GROUPS = [
  {
    group: {
      author: { battleTag: "ToD#2412", userName: "ToD", clanTag: "4K" },
      lines: [
        { id: "sr-1", text: "gg wp that was close", sentAt: "2026-09-23T21:34:00Z" },
        { id: "sr-2", text: "human mirror is pain", sentAt: "2026-09-23T21:34:20Z" },
      ],
    },
    meta: { race: 1, countryCode: "FR", mmr: 2140, chip: { kind: "won", label: "won +12" } },
  },
  {
    group: {
      author: { battleTag: "Mubarak#1123", userName: "Mubarak" },
      lines: [{ id: "sr-3", text: "you got lucky with that expo timing", sentAt: "2026-09-23T21:35:00Z" }],
    },
    meta: { race: 2, countryCode: "AE", mmr: 1980, chip: { kind: "ingame", label: "in game 12m" } },
  },
  {
    group: {
      author: { battleTag: "ToD#2412", userName: "ToD", clanTag: "4K" },
      lines: [{ id: "sr-4", text: "lucky? that was calculated", sentAt: "2026-09-23T21:35:40Z" }],
    },
    meta: { race: 1, countryCode: "FR", mmr: 2140 },
  },
];

// Colors that need dark text on their swatch
const lightSwatches = new Set(["gold", "green", "greyLight", "textBody", "white", "amber", "cyan"]);

const coreColorKeys = ["gold", "green", "red", "blue", "cyan", "amber", "greyLight", "greyMid", "greyDark", "white", "textBody"];
const semanticColorKeys = ["teamBlue", "teamRed", "atPurple", "twitchPurple"];

// Accent colour for each tint token (border + label on the tint swatch)
const tintAccent = (key) => {
  if (key.startsWith("gold")) return "var(--gold)";
  if (key.startsWith("green")) return "var(--green)";
  if (key.startsWith("red")) return "var(--red)";
  if (key === "blue") return "var(--team-blue)";
  if (key === "amber") return "var(--amber)";
  if (key === "cyan") return "var(--cyan)";
  if (key === "purple") return "var(--at-purple)";
  return "var(--grey-light)";
};

// *Rgb tokens are triplets, so render them through rgba()
const tintBackground = (key, token) =>
  key.endsWith("Rgb") ? `rgba(var(${token.css}), 0.4)` : token.value;

const mono = { fontFamily: "var(--font-mono)", color: "var(--grey-light)" };
const cellName = { fontFamily: "var(--font-display)", color: "var(--gold)", whiteSpace: "nowrap" };

const StyleReference = () => {
  const colorEntries = Object.entries(colors);
  const spacingEntries = Object.entries(spacing);
  const typeEntries = Object.entries(typeScale);
  const [modalDanger, setModalDanger] = useState(false);
  const [modalGold, setModalGold] = useState(false);
  const [modalSuccess, setModalSuccess] = useState(false);

  const renderSwatch = ([key, token]) => (
    <div
      key={key}
      className={`sr-swatch ${lightSwatches.has(key) ? "light" : "dark"}`}
      style={{ background: token.value }}
    >
      <span className="sr-swatch-name">{token.css}</span>
      <div>
        <span className="sr-swatch-hex">{token.value}</span>
        <span className="sr-swatch-usage">{token.usage}</span>
      </div>
    </div>
  );

  return (
    <div className="sr-page">

      {/* ── Hero ─────────────────────────── */}
      <header className="sr-hero">
        <div className="sr-hero-copy reveal" style={{ "--delay": "0.05s" }}>
          <div className="sr-eyebrow">4v4.gg Design System</div>
          <h1>Dark gold systems for competitive Warcraft III spectating.</h1>
          <p className="sr-lead">
            A cinematic design language built around gold accents, monospace data,
            and dark surfaces for focused match viewing.
          </p>
          <div className="sr-pills">
            <span className="sr-pill">Dark cinema</span>
            <span className="sr-pill">Gold accents</span>
            <span className="sr-pill">Monospace data</span>
            <span className="sr-pill">Real-time</span>
          </div>
        </div>
        <div className="sr-panel reveal" style={{ "--delay": "0.18s" }}>
          <div className="sr-eyebrow">At a glance</div>
          <div className="sr-token-grid">
            <div className="sr-token">
              <span className="sr-token-label">Display font</span>
              <span className="sr-token-value">Friz Quadrata</span>
            </div>
            <div className="sr-token">
              <span className="sr-token-label">Data font</span>
              <span className="sr-token-value">Inconsolata</span>
            </div>
            <div className="sr-token">
              <span className="sr-token-label">Prose font</span>
              <span className="sr-token-value">Libre Baskerville</span>
            </div>
            <div className="sr-token">
              <span className="sr-token-label">Palette</span>
              <span className="sr-token-value">Gold / Green / Red on dark</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Design Principles ────────────── */}
      <section className="sr-section reveal" style={{ "--delay": "0.08s" }}>
        <div className="sr-section-head">
          <div>
            <h2>Design principles</h2>
            <p>Built for the competitive spectator. Fast reads, clear outcomes, cinematic atmosphere.</p>
          </div>
          <div className="sr-tag-row">
            <span className="sr-tag gold">Clarity</span>
            <span className="sr-tag green">Speed</span>
            <span className="sr-tag red">Immersion</span>
          </div>
        </div>
        <div className="sr-card-grid">
          <article className="sr-card reveal" style={{ "--delay": "0.12s" }}>
            <h3>At-a-glance data</h3>
            <p>Monospace numbers, gold highlights, and team colors deliver competitive context instantly.</p>
          </article>
          <article className="sr-card reveal" style={{ "--delay": "0.18s" }}>
            <h3>Competitive contrast</h3>
            <p>High-contrast text on dark surfaces. Gold for emphasis, green and red for win/loss outcomes.</p>
          </article>
          <article className="sr-card reveal" style={{ "--delay": "0.24s" }}>
            <h3>Cinematic immersion</h3>
            <p>Race backgrounds, subtle overlays, and generous spacing create a spectator atmosphere.</p>
          </article>
        </div>
      </section>

      {/* ── Color Palette ────────────────── */}
      <section className="sr-section reveal" style={{ "--delay": "0.1s" }}>
        <div className="sr-section-head">
          <div>
            <h2>Color palette</h2>
            <p>Gold anchors the brand and highlights player names. White for primary content. Green and red signal outcomes.</p>
          </div>
          <div className="sr-tag-row">
            <span className="sr-tag gold">Brand & players</span>
            <span className="sr-tag" style={{ backgroundColor: "var(--white)", color: "var(--grey-dark)" }}>Primary text</span>
            <span className="sr-tag green">Wins</span>
            <span className="sr-tag red">Losses</span>
          </div>
        </div>

        <div className="sr-label" style={{ marginBottom: "var(--space-3)" }}>Core</div>
        <div className="sr-swatch-grid" style={{ marginBottom: "var(--space-6)" }}>
          {colorEntries.filter(([key]) => coreColorKeys.includes(key)).map(renderSwatch)}
        </div>

        <div className="sr-label" style={{ marginBottom: "var(--space-3)" }}>Semantic</div>
        <div className="sr-swatch-grid" style={{ marginBottom: "var(--space-6)" }}>
          {colorEntries.filter(([key]) => semanticColorKeys.includes(key)).map(renderSwatch)}
        </div>

        <div className="sr-label" style={{ marginBottom: "var(--space-3)" }}>Chart colours (chartColors, JS)</div>
        <div className="sr-overlay-grid">
          {Object.entries(chartColors).map(([key, value]) => (
            <div className="sr-overlay-swatch" key={key}>
              <div className="sr-overlay-box" style={{ background: value }}>
                <span style={{ color: ["dot", "dotActive", "gold", "green", "cyan", "amber"].includes(key) ? "var(--grey-dark)" : "var(--white)" }}>{value}</span>
              </div>
              <div className="sr-overlay-name">chartColors.{key}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── League and race colours ──────── */}
      <section className="sr-section reveal" style={{ "--delay": "0.1s" }}>
        <div className="sr-section-head">
          <div>
            <h2>League and race colours</h2>
            <p>Gradient bars for distribution charts. The same league or race must look the same on every page.</p>
          </div>
        </div>
        <div className="sr-layout-grid">
          <div className="sr-surface">
            <div className="meta">Leagues (leagueColors)</div>
            {Object.entries(leagueColors).map(([key, token]) => (
              <div className="sr-bar-row" key={key}>
                <span className="sr-bar-label">{token.css}</span>
                <div className="sr-bar" style={{ background: token.value }} />
              </div>
            ))}
          </div>
          <div className="sr-surface">
            <div className="meta">Races (raceColors)</div>
            {Object.entries(raceColors).map(([key, token]) => (
              <div className="sr-bar-row" key={key}>
                <span className="sr-bar-label">{token.css}</span>
                <div className="sr-bar" style={{ background: token.value }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Typography ───────────────────── */}
      <section className="sr-section reveal" style={{ "--delay": "0.1s" }}>
        <div className="sr-section-head">
          <div>
            <h2>Typography</h2>
            <p>Friz Quadrata delivers Warcraft gravitas. Inconsolata keeps stats crisp. Libre Baskerville for long-form prose.</p>
          </div>
        </div>
        <div className="sr-type-grid">
          <div className="sr-type-sample">
            <div className="sample-title">Display</div>
            <h4 style={{ fontFamily: "var(--font-display)", color: "var(--gold)" }}>
              Friz Quadrata
            </h4>
            <p>Player names, headings, and brand moments. The Warcraft typeface.</p>
          </div>
          <div className="sr-type-sample">
            <div className="sample-title">Mono</div>
            <h4 style={{ fontFamily: "var(--font-mono)", color: "var(--white)" }}>
              Inconsolata
            </h4>
            <p>Stats, MMR values, labels, dates. Tabular data that needs to align.</p>
          </div>
          <div className="sr-type-sample">
            <div className="sample-title">Body</div>
            <h4 style={{ fontFamily: "var(--font-body)", color: "var(--white)" }}>
              Libre Baskerville
            </h4>
            <p>Blog articles, news summaries, empty states, and descriptive prose. Readable serif for anything meant to be read.</p>
          </div>
        </div>

        <div className="sr-type-scale">
          {typeEntries.map(([key, token]) => (
            <div className="sr-type-row" key={key}>
              <span className="sr-type-meta">{token.css} ({token.value})</span>
              <span style={{ fontSize: token.value, color: "var(--white)" }}>{token.usage}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Spacing ──────────────────────── */}
      <section className="sr-section reveal" style={{ "--delay": "0.1s" }}>
        <div className="sr-section-head">
          <div>
            <h2>Spacing</h2>
            <p>A compact scale for dense data displays with room to breathe at larger sizes.</p>
          </div>
        </div>
        {spacingEntries.map(([key, token]) => (
          <div className="sr-space-row" key={key}>
            <span className="sr-space-label">{token.css} ({token.value})</span>
            <div className="sr-space-bar" style={{ width: token.value }} />
          </div>
        ))}
      </section>

      {/* ── Components ───────────────────── */}
      <section className="sr-section reveal" style={{ "--delay": "0.1s" }}>
        <div className="sr-section-head">
          <div>
            <h2>Components</h2>
            <p>The real shared exports from src/components/ui.jsx. Reuse these instead of hand-rolling lookalikes.</p>
          </div>
          <div className="sr-tag-row">
            <span className="sr-tag gold">ui.jsx</span>
          </div>
        </div>

        <table className="sr-table" style={{ marginBottom: "var(--space-8)" }}>
          <thead>
            <tr>
              <th>Component</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {components.map((c) => (
              <tr key={c.name}>
                <td style={cellName}>{c.name}</td>
                <td><code>{c.description}</code></td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="sr-component-grid">
          <div className="sr-stack">
            <div className="sr-label">Button</div>
            <Button $primary>Primary Action</Button>
            <Button $secondary>Secondary</Button>
            <Button $ghost>Ghost</Button>
            <Button $primary disabled>Disabled</Button>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
              <Button $pill>Pill</Button>
              <Button $pill data-active="true">Active pill</Button>
              <Button $pill>Show more</Button>
            </div>
          </div>

          <div className="sr-stack">
            <div className="sr-label">ResultBadge</div>
            <div className="sr-tag-row">
              <ResultBadge $won>WIN</ResultBadge>
              <ResultBadge $lost>LOSS</ResultBadge>
              <ResultBadge $won $square>W</ResultBadge>
              <ResultBadge $lost $square>L</ResultBadge>
              <ResultBadge $winner $size="sm">W</ResultBadge>
              <ResultBadge>Neutral</ResultBadge>
            </div>
            <div className="sr-tag-row">
              <ResultBadge $won $size="sm">SM</ResultBadge>
              <ResultBadge $won>MD</ResultBadge>
              <ResultBadge $won $size="lg">LG</ResultBadge>
            </div>
          </div>

          <div className="sr-stack">
            <div className="sr-label">Dot</div>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-1)" }}>
                <Dot $win $size={6} /><Dot $win /><Dot $win $size={12} />
                <span className="sr-overlay-name" style={{ marginLeft: "var(--space-1)" }}>$size 6 / 8 / 12</span>
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-1)" }}>
                <Dot $win $recent />
                <span className="sr-overlay-name" style={{ marginLeft: "var(--space-1)" }}>$recent</span>
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-1)" }}>
                <Dot $win $dim />
                <span className="sr-overlay-name" style={{ marginLeft: "var(--space-1)" }}>$dim</span>
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-1)" }}>
              <Dot $dim />
              <Dot $win />
              <Dot />
              <Dot $win />
              <Dot $win $recent />
              <span style={{ ...mono, marginLeft: "var(--space-2)", fontSize: "var(--text-xs)" }}>
                3W-2L
              </span>
            </div>
          </div>

          <div className="sr-stack">
            <div className="sr-label">Delta</div>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
              <Delta value={12} />
              <Delta value={-8} />
              <Delta value={0} />
            </div>
          </div>

          <div className="sr-stack">
            <div className="sr-label">Live indicator (.live-dot)</div>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              <span className="live-dot" />
              <span style={{ ...mono, fontSize: "var(--text-xs)" }}>
                Pulsing red dot
              </span>
            </div>
          </div>

          <div className="sr-stack">
            <div className="sr-label">TeamBar</div>
            <TeamBar $blue><span style={{ fontFamily: "var(--font-display)", color: "var(--gold)" }}>Blue Team Player</span></TeamBar>
            <TeamBar><span style={{ fontFamily: "var(--font-display)", color: "var(--gold)" }}>Red Team Player</span></TeamBar>
          </div>

          <div className="sr-stack">
            <div className="sr-label">Card / CardSubtle / ThemedCard</div>
            <Card><span style={{ fontFamily: "var(--font-display)", color: "var(--gold)" }}>Card</span></Card>
            <CardSubtle><span style={{ fontFamily: "var(--font-display)", color: "var(--white)" }}>CardSubtle</span></CardSubtle>
            <ThemedCard><span style={{ fontFamily: "var(--font-display)", color: "var(--white)" }}>ThemedCard</span></ThemedCard>
          </div>

          <div className="sr-stack">
            <div className="sr-label">Select</div>
            <Select defaultValue="S25">
              <option>S25</option>
              <option>S24</option>
              <option>S23</option>
            </Select>
          </div>

          <div className="sr-stack">
            <div className="sr-label">Input</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              <Input placeholder="Plain input" />
              <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
                <svg style={{ position: "absolute", left: "var(--space-3)", color: "var(--grey-light)", pointerEvents: "none" }} width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.5"/>
                  <line x1="8.7" y1="8.7" x2="13" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <Input style={{ paddingLeft: "var(--space-8)" }} placeholder="Search players..." />
              </div>
              <Input $fullWidth placeholder="Full width variant ($fullWidth)" />
              <Input $fullWidth $error defaultValue="Invalid value ($error)" />
            </div>
          </div>

          <div className="sr-stack">
            <div className="sr-label">Skeleton / SkeletonCircle</div>
            <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-start" }}>
              <SkeletonCircle $size="40px" />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                <Skeleton $w="60%" />
                <Skeleton $w="90%" $h="12px" />
                <Skeleton $w="40%" $h="12px" />
              </div>
            </div>
          </div>

          <div className="sr-stack">
            <div className="sr-label">RaceIcon</div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-4)" }}>
              {["human", "orc", "nightelf", "undead", "random"].map((race) => (
                <span key={race} style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: "var(--space-1)" }}>
                  <RaceIcon race={race} size={28} />
                  <span className="sr-overlay-name">{race}</span>
                </span>
              ))}
              <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: "var(--space-1)" }}>
                <RaceIcon race={0} rndRace={1} size={28} />
                <span className="sr-overlay-name">rndRace</span>
              </span>
            </div>
          </div>

          <div className="sr-stack">
            <div className="sr-label">CountryFlag</div>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
              {[
                { code: "us", label: "US" },
                { code: "de", label: "DE" },
                { code: "kr", label: "KR" },
                { code: "ru", label: "RU" },
                { code: "cn", label: "CN" },
                { code: "fr", label: "FR" },
                { code: "br", label: "BR" },
              ].map(({ code, label }) => (
                <span key={code} style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-1)" }}>
                  <CountryFlag name={code} />
                  <span style={{ ...mono, fontSize: "var(--text-xs)" }}>{label}</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="sr-label" style={{ margin: "var(--space-8) 0 var(--space-3)" }}>PageHero</div>
        <div className="sr-demo-box">
          <PageHero
            className="sr-hero-demo"
            eyebrow="Season 25"
            title="Ladder"
            lead="Top 4v4 players ranked by MMR. Filter by race, country, or league."
          />
        </div>
      </section>

      {/* ── Modals ────────────────────────── */}
      <section className="sr-section reveal" style={{ "--delay": "0.1s" }}>
        <div className="sr-section-head">
          <div>
            <h2>Confirm Modal</h2>
            <p>Drop-in replacement for window.confirm(). Three variants: danger (red), gold, and success (green).</p>
          </div>
        </div>
        <div className="sr-component-grid">
          <div className="sr-stack">
            <div className="sr-label">Danger</div>
            <Button $primary style={{ background: "var(--red)", color: "var(--white)" }} onClick={() => setModalDanger(true)}>
              Delete Something
            </Button>
          </div>
          <div className="sr-stack">
            <div className="sr-label">Gold</div>
            <Button $primary onClick={() => setModalGold(true)}>
              Confirm Action
            </Button>
          </div>
          <div className="sr-stack">
            <div className="sr-label">Success</div>
            <Button $primary style={{ background: "var(--green)", color: "var(--grey-dark)" }} onClick={() => setModalSuccess(true)}>
              Approve Change
            </Button>
          </div>
        </div>
        <ConfirmModal
          open={modalDanger}
          title="Delete Digest"
          message="This will permanently delete the cached digest and all editorial edits. This action cannot be undone."
          confirmLabel="Delete"
          variant="danger"
          onConfirm={() => setModalDanger(false)}
          onCancel={() => setModalDanger(false)}
        />
        <ConfirmModal
          open={modalGold}
          title="Publish Changes"
          message="Your editorial changes will be published and visible to all users immediately."
          confirmLabel="Publish"
          variant="gold"
          onConfirm={() => setModalGold(false)}
          onCancel={() => setModalGold(false)}
        />
        <ConfirmModal
          open={modalSuccess}
          title="Approve Player"
          message="This player will be added to the verified list and receive a badge on their profile."
          confirmLabel="Approve"
          variant="success"
          onConfirm={() => setModalSuccess(false)}
          onCancel={() => setModalSuccess(false)}
        />
      </section>

      {/* ── Player Cards ─────────────────── */}
      <section className="sr-section reveal" style={{ "--delay": "0.1s" }}>
        <div className="sr-section-head">
          <div>
            <h2>Player cards</h2>
            <p>Compact identity cards with avatar, name, race, and MMR. Used in cover art tools, could work for spotlights, leaderboards, or anywhere a player needs a visual identity.</p>
          </div>
          <div className="sr-tag-row">
            <span className="sr-tag">dt-player-card</span>
          </div>
        </div>

        <div className="sr-component-grid">
          <div className="sr-stack">
            <div className="sr-label">With avatar</div>
            <div className="dt-player-cards">
              <div className="dt-player-card">
                <div className="dt-player-card-avatar">
                  <img src="/heroes/archmage.jpeg" alt="" className="dt-player-card-img" />
                </div>
                <div className="dt-player-card-info">
                  <span className="dt-player-card-name">ToD</span>
                  <span className="dt-player-card-meta">Human · 2178 MMR</span>
                </div>
                <button className="dt-player-card-remove">&times;</button>
              </div>
              <div className="dt-player-card">
                <div className="dt-player-card-avatar">
                  <img src="/heroes/lich.jpeg" alt="" className="dt-player-card-img" />
                </div>
                <div className="dt-player-card-info">
                  <span className="dt-player-card-name">mubarak</span>
                  <span className="dt-player-card-meta">Undead · 1824 MMR</span>
                </div>
                <button className="dt-player-card-remove">&times;</button>
              </div>
            </div>
          </div>

          <div className="sr-stack">
            <div className="sr-label">Race fallback (no avatar)</div>
            <div className="dt-player-cards">
              <div className="dt-player-card">
                <div className="dt-player-card-avatar">
                  <img src={raceIcons.human} alt="" className="dt-player-card-img dt-race-fallback" />
                </div>
                <div className="dt-player-card-info">
                  <span className="dt-player-card-name">Unknown</span>
                  <span className="dt-player-card-meta">Human · 1500 MMR</span>
                </div>
                <button className="dt-player-card-remove">&times;</button>
              </div>
              <div className="dt-player-card">
                <div className="dt-player-card-avatar">
                  <span className="dt-player-card-img dt-avatar-placeholder" />
                </div>
                <div className="dt-player-card-info">
                  <span className="dt-player-card-name">No data</span>
                  <span className="dt-player-card-meta">n/a</span>
                </div>
                <button className="dt-player-card-remove">&times;</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Chat Transcripts ─────────────── */}
      <section className="sr-section reveal" style={{ "--delay": "0.1s" }}>
        <div className="sr-section-head">
          <div>
            <h2>Chat messages</h2>
            <p>One message group (author + consecutive lines) rendered by <code>ChatMessage</code> in three variants: <code>feed</code> for the /chat stream, <code>transcript</code> for conversation context (profile, digest pickers), <code>quote</code> for digest pull-quotes. Import from <code>components/chat/ChatMessage</code>.</p>
          </div>
          <div className="sr-tag-row">
            <span className="sr-tag gold">ChatMessage</span>
          </div>
        </div>

        <div className="sr-layout-grid">
          {/* Feed */}
          <div className="sr-surface">
            <div className="meta">variant=&quot;feed&quot; (32px avatar, mono lines, chip)</div>
            <div style={{ marginTop: "var(--space-2)" }}>
              {SR_CHAT_GROUPS.map((g, i) => (
                <ChatMessage key={i} variant="feed" group={g.group} meta={g.meta} watched={i === 1} />
              ))}
            </div>
          </div>

          {/* Transcript */}
          <div className="sr-surface">
            <div className="meta">variant=&quot;transcript&quot; (serif lines; target tints the focus author)</div>
            <div style={{ marginTop: "var(--space-2)" }}>
              {SR_CHAT_GROUPS.map((g, i) => (
                <ChatMessage key={i} variant="transcript" group={g.group} meta={{ avatarUrl: g.meta.avatarUrl }} target={g.group.author.userName === "ToD"} />
              ))}
            </div>
          </div>

          {/* Quote */}
          <div className="sr-surface">
            <div className="meta">variant=&quot;quote&quot; via QuoteBlock (name + pull-quotes, no avatar)</div>
            <QuoteBlock
              marginTop="var(--space-2)"
              quotes={["ToD: gg wp that was close", "ToD: human mirror is pain", "Mubarak: you got lucky with that expo timing"]}
            />
            <div style={{ marginTop: "var(--space-4)" }}>
              <div className="meta">Plain quotes (no attribution)</div>
              <QuoteBlock marginTop="var(--space-2)" quotes={["gg wp that was close", "human mirror is pain"]} />
            </div>
          </div>
        </div>

        <table className="sr-table" style={{ marginTop: "var(--space-6)" }}>
          <thead>
            <tr>
              <th>Element</th>
              <th>CSS</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={cellName}>Avatar (feed, transcript)</td>
              <td><code>width: 32px; height: 32px; border-radius: var(--radius-md); object-fit: cover</code> (race icon fallback on var(--surface-2))</td>
            </tr>
            <tr>
              <td style={cellName}>Author name</td>
              <td><code>font-family: var(--font-display); color: var(--gold); font-size: var(--text-xs)</code> (feed, quote) / <code>var(--text-xxs)</code> (transcript)</td>
            </tr>
            <tr>
              <td style={cellName}>Feed line</td>
              <td><code>font-family: var(--font-mono); font-size: var(--text-xs); color: var(--text-body); line-height: 1.5</code></td>
            </tr>
            <tr>
              <td style={cellName}>Transcript line</td>
              <td><code>font-family: var(--font-body); font-size: var(--text-xs); color: var(--text-body); line-height: 1.5</code></td>
            </tr>
            <tr>
              <td style={cellName}>Quote line</td>
              <td><code>margin-left: var(--quote-indent); padding-left: var(--quote-pad-left); border-left: var(--quote-border); font-family: var(--font-body); font-style: italic; color: var(--grey-light)</code></td>
            </tr>
            <tr>
              <td style={cellName}>Target group (transcript)</td>
              <td><code>background: var(--gold-tint); border-radius: var(--radius-md)</code></td>
            </tr>
            <tr>
              <td style={cellName}>Watched group (feed)</td>
              <td><code>box-shadow: inset 2px 0 0 rgba(var(--gold-muted-rgb), 0.6)</code></td>
            </tr>
            <tr>
              <td style={cellName}>Timestamp</td>
              <td><code>font-family: var(--font-mono); font-size: var(--text-xxxs); color: var(--grey-mid)</code></td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* ── Card Borders ─────────────────── */}
      <section className="sr-section reveal" style={{ "--delay": "0.1s" }}>
        <div className="sr-section-head">
          <div>
            <h2>Card borders</h2>
            <p>Gold border for primary cards. Grey for secondary. Tinted backgrounds for win/loss states.</p>
          </div>
        </div>
        <div className="sr-showcase-grid">
          <Card className="sr-showcase-card">
            <div className="card-title" style={{ color: "var(--gold)" }}>Gold Border</div>
            <div className="card-sub">Card: primary cards</div>
          </Card>
          <CardSubtle className="sr-showcase-card">
            <div className="card-title" style={{ color: "var(--white)" }}>Grey Border</div>
            <div className="card-sub">CardSubtle: secondary cards</div>
          </CardSubtle>
          <WinSurface className="sr-showcase-card">
            <div className="card-title" style={{ color: "var(--green)" }}>Win Card</div>
            <div className="card-sub">WinSurface: victory results</div>
          </WinSurface>
          <LossSurface className="sr-showcase-card">
            <div className="card-title" style={{ color: "var(--red)" }}>Loss Card</div>
            <div className="card-sub">LossSurface: defeat results</div>
          </LossSurface>
        </div>
      </section>

      {/* ── Hover Patterns ───────────────── */}
      <section className="sr-section reveal" style={{ "--delay": "0.1s" }}>
        <div className="sr-section-head">
          <div>
            <h2>Hover patterns</h2>
            <p>Neutral row highlights, gold-tinted for branded items, gold text and underlines for links.</p>
          </div>
        </div>
        <div className="sr-layout-grid">
          <div className="sr-surface" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "var(--space-3) var(--space-4) var(--space-1)" }}>
              <div className="meta">Row hovers</div>
            </div>
            <div style={{ padding: "0 var(--space-4) var(--space-4)" }}>
              {[
                { label: "Neutral row", bg: "var(--surface-2)", desc: "Default list/table rows" },
                { label: "Gold row", bg: "var(--gold-tint-subtle)", desc: "Ladder rows, branded items" },
                { label: "Win row", bg: "var(--green-tint-subtle)", desc: "Win-state items" },
                { label: "Loss row", bg: "var(--red-tint-subtle)", desc: "Loss-state items" },
              ].map(({ label, bg, desc }) => (
                <div
                  key={label}
                  style={{
                    padding: "var(--space-2) var(--space-3)",
                    background: bg,
                    borderBottom: "1px solid var(--panel-border)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontFamily: "var(--font-display)", color: "var(--white)", fontSize: "var(--text-sm)" }}>{label}</span>
                  <span style={{ ...mono, fontSize: "var(--text-xxs)" }}>{desc}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="sr-surface">
            <div className="meta">Link hovers</div>
            <div style={{ marginTop: "var(--space-3)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              <div>
                <span style={{ fontFamily: "var(--font-display)", color: "var(--gold)" }}>Player Name</span>
                <span style={{ ...mono, fontSize: "var(--text-xxs)", marginLeft: "var(--space-3)" }}>color: var(--gold)</span>
              </div>
              <div>
                <span style={{ ...mono, textDecoration: "underline" }}>underline link</span>
                <span style={{ ...mono, fontSize: "var(--text-xxs)", marginLeft: "var(--space-3)" }}>text-decoration: underline</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Surface & Overlays ────────────── */}
      <section className="sr-section reveal" style={{ "--delay": "0.1s" }}>
        <div className="sr-section-head">
          <div>
            <h2>Surfaces and overlays</h2>
            <p>Dark overlays for modals and streams. Subtle surface tints for layering. Color tints for state.</p>
          </div>
        </div>

        <div className="sr-label" style={{ marginBottom: "var(--space-3)" }}>Dark overlays</div>
        <div className="sr-overlay-grid" style={{ marginBottom: "var(--space-6)" }}>
          {Object.entries(overlays).map(([key, token]) => (
            <div className="sr-overlay-swatch" key={key}>
              <div className="sr-overlay-box" style={{ background: token.value }}>
                <span>{token.value.match(/[\d.]+\)$/)?.[0]?.replace(")", "") || key}</span>
              </div>
              <div className="sr-overlay-name">{key}</div>
            </div>
          ))}
        </div>

        <div className="sr-label" style={{ marginBottom: "var(--space-3)" }}>Surface tints</div>
        <div className="sr-overlay-grid" style={{ marginBottom: "var(--space-6)" }}>
          {Object.entries(surfaces).map(([key, token]) => (
            <div className="sr-overlay-swatch" key={key}>
              <div className="sr-overlay-box" style={{ background: token.value }}>
                <span style={{ color: "var(--grey-light)" }}>{token.usage}</span>
              </div>
              <div className="sr-overlay-name">{token.css}</div>
            </div>
          ))}
        </div>

        <div className="sr-label" style={{ marginBottom: "var(--space-3)" }}>Color tints</div>
        <div className="sr-overlay-grid" style={{ marginBottom: "var(--space-6)" }}>
          {Object.entries(tints).map(([key, token]) => {
            const accent = tintAccent(key);
            return (
              <div className="sr-overlay-swatch" key={key}>
                <div className="sr-overlay-box" style={{ background: tintBackground(key, token), borderColor: accent }}>
                  <span style={{ color: accent, fontFamily: "var(--font-mono)", fontSize: "var(--text-xxs)" }}>{key}</span>
                </div>
                <div className="sr-overlay-name">{token.css}</div>
              </div>
            );
          })}
        </div>

        <div className="sr-label" style={{ marginBottom: "var(--space-3)" }}>Glow shadows</div>
        <div className="sr-glow-grid">
          <div className="sr-glow-card" style={{ boxShadow: effects.shadowGlow.value }}>
            <span className="sr-overlay-name">{effects.shadowGlow.css}</span>
            <span style={{ ...mono, fontSize: "var(--text-xxs)" }}>{effects.shadowGlow.usage}</span>
          </div>
          <div className="sr-glow-card" style={{ boxShadow: effects.shadowGlowSubtle.value }}>
            <span className="sr-overlay-name">{effects.shadowGlowSubtle.css}</span>
            <span style={{ ...mono, fontSize: "var(--text-xxs)" }}>{effects.shadowGlowSubtle.usage}</span>
          </div>
        </div>
      </section>

      {/* ── Surface Layouts ───────────────── */}
      <section className="sr-section reveal" style={{ "--delay": "0.1s" }}>
        <div className="sr-section-head">
          <div>
            <h2>Surface layouts</h2>
            <p>Layer dark panels with gold accents for dashboards and stat displays.</p>
          </div>
        </div>
        <div className="sr-layout-grid">
          <div className="sr-surface">
            <div className="meta">Match overview</div>
            <h4>Live Games</h4>
            <p>Display ongoing 4v4 matches with team MMR, race icons, and game duration.</p>
            <div className="sr-stat-row">
              <div className="sr-stat">
                <div className="value">12</div>
                <div className="label">Live</div>
              </div>
              <div className="sr-stat">
                <div className="value">1847</div>
                <div className="label">Avg MMR</div>
              </div>
              <div className="sr-stat">
                <div className="value">23m</div>
                <div className="label">Duration</div>
              </div>
            </div>
          </div>
          <div className="sr-surface">
            <div className="meta">Player profile</div>
            <h4>Season Stats</h4>
            <p>Win rates, MMR trends, and match history for individual players.</p>
            <div className="sr-stat-row">
              <div className="sr-stat">
                <div className="value">64%</div>
                <div className="label">Win rate</div>
              </div>
              <div className="sr-stat">
                <div className="value">248</div>
                <div className="label">Games</div>
              </div>
              <div className="sr-stat">
                <div className="value">+12</div>
                <div className="label">MMR</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Text Patterns Examples ────────── */}
      <section className="sr-section reveal" style={{ "--delay": "0.1s" }}>
        <div className="sr-section-head">
          <div>
            <h2>Text patterns</h2>
            <p>Color and font combinations for different content types. Gold for emphasis, white for primary content.</p>
          </div>
        </div>
        <div className="sr-layout-grid">
          <div className="sr-surface">
            <div className="meta">Player and map examples</div>
            <div style={{ marginTop: "var(--space-3)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              <div>
                <div className="sr-label" style={{ marginBottom: "var(--space-1)" }}>Player names (gold display)</div>
                <div style={{ fontFamily: "var(--font-display)", color: "var(--gold)" }}>
                  ToD, Mubarak, Happy, 120
                </div>
              </div>
              <div>
                <div className="sr-label" style={{ marginBottom: "var(--space-1)" }}>Map names (white display)</div>
                <div style={{ fontFamily: "var(--font-display)", color: "var(--white)", fontSize: "var(--text-sm)" }}>
                  Northshire LV, Twilight Ruins LV, Ekrezem&apos;s Maze
                </div>
              </div>
              <div>
                <div className="sr-label" style={{ marginBottom: "var(--space-1)" }}>Data values (white mono)</div>
                <div style={{ fontFamily: "var(--font-mono)", color: "var(--white)" }}>
                  1847 MMR • 64% WR • 248 Games
                </div>
              </div>
            </div>
          </div>
          <div className="sr-surface">
            <div className="meta">Ladder patterns</div>
            <div style={{ marginTop: "var(--space-3)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--space-2) 0", borderBottom: "1px solid var(--grey-mid)" }}>
                <div style={{ fontFamily: "var(--font-display)", color: "var(--gold)" }}>Happy</div>
                <div style={{ fontFamily: "var(--font-mono)", color: "var(--white)", fontWeight: "500" }}>2156</div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--space-2) 0", borderBottom: "1px solid var(--grey-mid)" }}>
                <div style={{ fontFamily: "var(--font-display)", color: "var(--gold)" }}>ToD</div>
                <div style={{ fontFamily: "var(--font-mono)", color: "var(--white)", fontWeight: "500" }}>2089</div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--space-2) 0" }}>
                <div style={{ fontFamily: "var(--font-display)", color: "var(--gold)" }}>Mubarak</div>
                <div style={{ fontFamily: "var(--font-mono)", color: "var(--white)", fontWeight: "500" }}>1943</div>
              </div>
            </div>
          </div>
          <div className="sr-surface">
            <div className="meta">Labels, titles and chips</div>
            <div style={{ marginTop: "var(--space-3)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              <div>
                <div className="sr-label" style={{ marginBottom: "var(--space-1)" }}>label (default, 12px)</div>
                <div style={{ font: "var(--text-xxs) var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--grey-light)" }}>
                  Rank / Player / MMR / Games
                </div>
              </div>
              <div>
                <div className="sr-label" style={{ marginBottom: "var(--space-1)" }}>sectionTitle</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-sm)", color: "var(--gold)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Recent form
                </div>
              </div>
              <div>
                <div className="sr-label" style={{ marginBottom: "var(--space-1)" }}>heroEyebrow</div>
                <div className="sr-eyebrow">Season 25 ladder</div>
              </div>
              <div>
                <div className="sr-label" style={{ marginBottom: "var(--space-1)" }}>tagChip</div>
                <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
                  <span className="sr-chip amber">Upset</span>
                  <span className="sr-chip cyan">High APM</span>
                  <span className="sr-chip purple">AT group</span>
                </div>
              </div>
            </div>
          </div>
          <div className="sr-surface">
            <div className="meta">Popover and themed card</div>
            <div style={{ marginTop: "var(--space-3)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              <div>
                <div className="sr-label" style={{ marginBottom: "var(--space-1)" }}>popover</div>
                <div className="sr-popover-demo">
                  <div className="sr-popover-item active">Season 25</div>
                  <div className="sr-popover-item">Season 24</div>
                  <div className="sr-popover-item">All time</div>
                </div>
              </div>
              <div>
                <div className="sr-label" style={{ marginBottom: "var(--space-1)" }}>cardThemed (ThemedCard)</div>
                <ThemedCard>
                  <div style={{ fontFamily: "var(--font-display)", color: "var(--gold)" }}>Follows the active border theme</div>
                  <div style={{ ...mono, fontSize: "var(--text-xxs)", marginTop: "var(--space-1)" }}>var(--theme-bg / --theme-border / --theme-border-image / --theme-blur / --theme-shadow)</div>
                </ThemedCard>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Usage Patterns (table) ────────── */}
      <section className="sr-section reveal" style={{ "--delay": "0.1s" }}>
        <div className="sr-section-head">
          <div>
            <h2>Usage patterns</h2>
            <p>Common CSS combinations for consistent styling across components.</p>
          </div>
        </div>
        <table className="sr-table">
          <thead>
            <tr>
              <th>Pattern</th>
              <th>CSS</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(patterns).map(([key, pattern]) => (
              <tr key={key}>
                <td style={cellName}>
                  {pattern.description}
                </td>
                <td><code>{pattern.css}</code></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* ── Loading States ────────────────── */}
      <section className="sr-section reveal" style={{ "--delay": "0.1s" }}>
        <div className="sr-section-head">
          <div>
            <h2>Loading states</h2>
            <p>Gold spinner with cycling WC3 peon quotes. Quotes rotate every 3s with fade transitions. Three sizes for inline, component, and page-level loading.</p>
          </div>
        </div>
        <div className="sr-layout-grid">
          <div className="sr-surface">
            <div className="meta">PeonLoader sizes</div>
            <div style={{ display: "flex", gap: "var(--space-8)", alignItems: "flex-start", marginTop: "var(--space-3)" }}>
              <div style={{ textAlign: "center" }}>
                <PeonLoader size="sm" />
                <div className="sr-overlay-name" style={{ marginTop: "var(--space-2)" }}>{'size="sm" (16px)'}</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <PeonLoader size="md" />
                <div className="sr-overlay-name" style={{ marginTop: "var(--space-2)" }}>{'size="md" (24px)'}</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <PeonLoader size="lg" />
                <div className="sr-overlay-name" style={{ marginTop: "var(--space-2)" }}>{'size="lg" (32px, default)'}</div>
              </div>
            </div>
          </div>
          <div className="sr-surface">
            <div className="meta">Bare spinner (.loader-spinner)</div>
            <div style={{ display: "flex", gap: "var(--space-8)", alignItems: "center", marginTop: "var(--space-3)" }}>
              <div style={{ textAlign: "center" }}>
                <div className="loader-spinner sm" />
                <div className="sr-overlay-name" style={{ marginTop: "var(--space-2)" }}>.sm (16px)</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div className="loader-spinner" />
                <div className="sr-overlay-name" style={{ marginTop: "var(--space-2)" }}>no modifier (24px)</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div className="loader-spinner lg" />
                <div className="sr-overlay-name" style={{ marginTop: "var(--space-2)" }}>.lg (32px)</div>
              </div>
            </div>
          </div>
        </div>
        <table className="sr-table" style={{ marginTop: "var(--space-6)" }}>
          <thead>
            <tr>
              <th>Pattern</th>
              <th>Usage</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={cellName}>Page-level centering</td>
              <td><code>{'<div className="page-loader"><PeonLoader /></div>'}</code> - centers vertically (min-height: 60vh); default size is lg (32px)</td>
            </tr>
            <tr>
              <td style={cellName}>Inline / compact</td>
              <td><code>{'<PeonLoader size="sm" />'}</code> - 16px spinner, for inside cards or rows</td>
            </tr>
            <tr>
              <td style={cellName}>Custom interval</td>
              <td><code>{'<PeonLoader interval={4000} />'}</code> - quote cycle speed in ms (default 3000)</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* ── Entrance Animation ────────────── */}
      <section className="sr-section reveal" style={{ "--delay": "0.1s" }}>
        <div className="sr-section-head">
          <div>
            <h2>Entrance animation</h2>
            <p>Staggered fade-up reveals for page sections. Each element animates in with an incremental delay for a cascading effect.</p>
          </div>
          <div className="sr-tag-row">
            <span className="sr-tag gold">900ms</span>
            <span className="sr-tag">cubic-bezier</span>
          </div>
        </div>

        <div className="sr-layout-grid">
          <div className="sr-surface">
            <div className="meta">Live demo</div>
            <div id="reveal-demo" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", marginTop: "var(--space-3)" }}>
              {[0.05, 0.12, 0.20, 0.28].map((delay, i) => (
                <div
                  key={i}
                  className="reveal"
                  style={{
                    "--delay": `${delay}s`,
                    padding: "var(--space-4) var(--space-6)",
                    background: "var(--gold-tint-subtle)",
                    border: "1px solid var(--gold-border-hover)",
                    borderRadius: "var(--radius-md)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "var(--text-xs)",
                    color: "var(--grey-light)",
                  }}
                >
                  Element {i + 1} - delay: {delay}s
                </div>
              ))}
            </div>
            <Button
              $secondary
              style={{ marginTop: "var(--space-4)" }}
              onClick={() => {
                const demo = document.getElementById("reveal-demo");
                if (!demo) return;
                const items = demo.querySelectorAll(".reveal");
                items.forEach((el) => {
                  el.style.animation = "none";
                  el.offsetHeight; // force reflow
                  el.style.animation = "";
                });
              }}
            >
              Replay
            </Button>
          </div>
          <div className="sr-surface">
            <div className="meta">Usage</div>
            <pre className="sr-code" style={{ marginTop: "var(--space-3)" }}>{`<!-- Add .reveal class + --delay variable -->
<div class="reveal" style="--delay: 0.05s">
  First section
</div>
<div class="reveal" style="--delay: 0.10s">
  Second section
</div>
<div class="reveal" style="--delay: 0.15s">
  Third section
</div>`}</pre>
          </div>
        </div>

        <table className="sr-table" style={{ marginTop: "var(--space-6)" }}>
          <thead>
            <tr>
              <th>Property</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={cellName}>Class</td>
              <td><code>.reveal</code></td>
            </tr>
            <tr>
              <td style={cellName}>Transform</td>
              <td><code>opacity: 0 → 1, translateY(18px) → 0</code></td>
            </tr>
            <tr>
              <td style={cellName}>Duration</td>
              <td><code>900ms cubic-bezier(0.17, 0.76, 0.28, 1)</code></td>
            </tr>
            <tr>
              <td style={cellName}>Delay</td>
              <td><code>var(--delay, 0s)</code> - set via inline style</td>
            </tr>
            <tr>
              <td style={cellName}>Reduced motion</td>
              <td><code>animation: none; opacity: 1; transform: none</code></td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* ── Borders & Radius ──────────────── */}
      <section className="sr-section reveal" style={{ "--delay": "0.1s" }}>
        <div className="sr-section-head">
          <div>
            <h2>Borders and radius</h2>
            <p>Tight radius for a sharp, competitive feel. Two border weights for hierarchy.</p>
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-8)", alignItems: "flex-end" }}>
          {Object.entries(borders).filter(([k]) => k.startsWith("radius")).map(([key, token]) => (
            <div key={key} style={{ textAlign: "center" }}>
              <div style={{ width: "var(--space-12)", height: "var(--space-12)", background: "var(--gold)", borderRadius: token.value, marginBottom: "var(--space-2)" }} />
              <div className="sr-overlay-name">{token.css}</div>
              <div className="sr-overlay-name">{token.value}</div>
            </div>
          ))}
          <div style={{ borderLeft: "1px solid var(--grey-mid)", height: "var(--space-12)", margin: "0 var(--space-2)" }} />
          {Object.entries(borders).filter(([k]) => !k.startsWith("radius")).map(([key, token]) => (
            <div key={key} style={{ textAlign: "center" }}>
              <div style={{ width: 56, height: "var(--space-12)", border: `${token.value} solid var(--gold)`, borderRadius: "var(--radius-md)", marginBottom: "var(--space-2)" }} />
              <div className="sr-overlay-name">{token.css}</div>
              <div className="sr-overlay-name">{token.value}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Z-index and layout ───────────── */}
      <section className="sr-section reveal" style={{ "--delay": "0.1s" }}>
        <div className="sr-section-head">
          <div>
            <h2>Z-index and layout</h2>
            <p>Five stacking layers, lowest to highest. Never hardcode a z-index; pick the layer.</p>
          </div>
        </div>
        <div className="sr-layout-grid">
          <div className="sr-surface">
            <div className="meta">Stacking order (zIndex)</div>
            <div className="sr-z-stack">
              {Object.entries(zIndex).map(([key, token], i) => (
                <div key={key} className="sr-z-layer" style={{ "--i": i, zIndex: token.value }}>
                  <span className="sr-z-name">{token.css}</span>
                  <span className="sr-z-value">{token.value}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="sr-surface">
            <div className="meta">Layout (layout.navHeight)</div>
            <div className="sr-nav-height-demo">
              <span className="sr-z-name">{layout.navHeight.css}</span>
              <span className="sr-z-value">{layout.navHeight.value}</span>
            </div>
            <p style={{ marginTop: "var(--space-3)" }}>{layout.navHeight.usage}</p>
          </div>
        </div>
        <table className="sr-table" style={{ marginTop: "var(--space-6)" }}>
          <thead>
            <tr>
              <th>Token</th>
              <th>Value</th>
              <th>Usage</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(zIndex).map(([key, token]) => (
              <tr key={key}>
                <td style={cellName}>{token.css}</td>
                <td><code>{token.value}</code></td>
                <td><code>{token.usage}</code></td>
              </tr>
            ))}
            <tr>
              <td style={cellName}>{layout.navHeight.css}</td>
              <td><code>{layout.navHeight.value}</code></td>
              <td><code>{layout.navHeight.usage}</code></td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* ── MMR Charts ────────────────────── */}
      <section className="sr-section reveal" style={{ "--delay": "0.1s" }}>
        <div className="sr-section-head">
          <div>
            <h2>MMR visualization</h2>
            <p>Combined circle style for AT groups. Area equals sum of individual player circles.</p>
          </div>
          <div className="sr-tag-row">
            <span className="sr-tag blue">AT groups</span>
            <span className="sr-tag">Solo</span>
          </div>
        </div>

        <div className="sr-mmr-grid">
          <div className="sr-mmr-cell">
            <div className="sr-mmr-box">
              <MmrComparison
                data={{
                  teamOneMmrs: [1900, 1900, 1750, 1650],
                  teamTwoMmrs: [1850, 1850, 1700, 1600],
                  teamOneAT: [1, 1, 0, 0],
                  teamTwoAT: [1, 1, 0, 0],
                }}
              />
            </div>
            <div className="sr-mmr-label">2-stack</div>
          </div>
          <div className="sr-mmr-cell">
            <div className="sr-mmr-box">
              <MmrComparison
                data={{
                  teamOneMmrs: [1900, 1900, 1900, 1650],
                  teamTwoMmrs: [1850, 1850, 1850, 1600],
                  teamOneAT: [1, 1, 1, 0],
                  teamTwoAT: [1, 1, 1, 0],
                }}
              />
            </div>
            <div className="sr-mmr-label">3-stack</div>
          </div>
          <div className="sr-mmr-cell">
            <div className="sr-mmr-box">
              <MmrComparison
                data={{
                  teamOneMmrs: [1900, 1900, 1900, 1900],
                  teamTwoMmrs: [1850, 1850, 1850, 1850],
                  teamOneAT: [1, 1, 1, 1],
                  teamTwoAT: [1, 1, 1, 1],
                }}
              />
            </div>
            <div className="sr-mmr-label">4-stack</div>
          </div>
          <div className="sr-mmr-cell">
            <div className="sr-mmr-box">
              <MmrComparison
                data={{
                  teamOneMmrs: [2000, 1900, 1750, 1600],
                  teamTwoMmrs: [1950, 1850, 1700, 1550],
                  teamOneAT: [0, 0, 0, 0],
                  teamTwoAT: [0, 0, 0, 0],
                }}
              />
            </div>
            <div className="sr-mmr-label">No AT</div>
          </div>
        </div>

        <div className="sr-mmr-grid-2">
          <div className="sr-mmr-cell">
            <div className="sr-mmr-box">
              <MmrComparison
                data={{
                  teamOneMmrs: [1850, 1850, 1855, 2000],
                  teamTwoMmrs: [1820, 1820, 1825, 1950],
                  teamOneAT: [1, 1, 0, 0],
                  teamTwoAT: [1, 1, 0, 0],
                }}
              />
            </div>
            <div className="sr-mmr-label">2-stack + solo collision</div>
          </div>
          <div className="sr-mmr-cell">
            <div className="sr-mmr-box">
              <MmrComparison
                data={{
                  teamOneMmrs: [1850, 1850, 1850, 1850],
                  teamTwoMmrs: [1900, 1850, 1750, 1700],
                  teamOneAT: [1, 1, 1, 1],
                  teamTwoAT: [0, 0, 0, 0],
                }}
              />
            </div>
            <div className="sr-mmr-label">4-stack vs all solo</div>
          </div>
        </div>
      </section>

      {/* ── Quick Reference ───────────────── */}
      <section className="sr-section reveal" style={{ "--delay": "0.1s" }}>
        <div className="sr-section-head">
          <div>
            <h2>Quick reference</h2>
            <p>All tokens from src/lib/design-tokens.js in one block.</p>
          </div>
        </div>
        <pre className="sr-code">
{`/* COLORS */
${colorEntries.map(([, t]) => `${t.css.padEnd(18)} ${t.value.padEnd(10)} ${t.usage}`).join("\n")}

/* FONTS */
${Object.entries(fonts).map(([, t]) => `${t.css.padEnd(18)} ${t.usage}`).join("\n")}

/* TYPE SCALE */
${typeEntries.map(([, t]) => `${t.css.padEnd(14)} ${t.value.padEnd(6)} ${t.usage}`).join("\n")}

/* SPACING */
${spacingEntries.map(([, t]) => `${t.css.padEnd(12)} ${t.value}`).join("\n")}

/* BORDERS */
${Object.entries(borders).map(([, t]) => `${t.css.padEnd(16)} ${t.value}`).join("\n")}

/* EFFECTS */
${Object.entries(effects).map(([, t]) => `${t.css.padEnd(20)} ${t.value.padEnd(30)} ${t.usage}`).join("\n")}

/* OVERLAYS */
${Object.entries(overlays).map(([, t]) => `${t.css.padEnd(18)} ${t.value.padEnd(20)} ${t.usage}`).join("\n")}

/* SURFACES */
${Object.entries(surfaces).map(([, t]) => `${t.css.padEnd(18)} ${t.value.padEnd(26)} ${t.usage}`).join("\n")}

/* TINTS */
${Object.entries(tints).map(([, t]) => `${t.css.padEnd(22)} ${t.value.padEnd(26)} ${t.usage}`).join("\n")}

/* Z-INDEX */
${Object.entries(zIndex).map(([, t]) => `${t.css.padEnd(14)} ${String(t.value).padEnd(6)} ${t.usage}`).join("\n")}

/* LAYOUT */
${Object.entries(layout).map(([, t]) => `${t.css.padEnd(14)} ${t.value.padEnd(6)} ${t.usage}`).join("\n")}

/* QUOTE */
${Object.entries(quote).map(([, t]) => `${t.css.padEnd(20)} ${t.value}`).join("\n")}`}
        </pre>
      </section>

      {/* ── Navigation: PageNav Component ────── */}
      <section className="sr-section reveal" style={{ "--delay": "0.1s" }}>
        <div className="sr-section-head">
          <div>
            <h2>Page navigation</h2>
            <p>Combined back-link and sub-tabs. Gold arrow returns to parent page, tabs switch between siblings. Import from ui.jsx.</p>
          </div>
          <div className="sr-tag-row">
            <span className="sr-tag gold">PageNav</span>
          </div>
        </div>

        {/* Live PageNav demos */}
        <div className="sr-label" style={{ marginBottom: "var(--space-3)" }}>Live component</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", marginBottom: "var(--space-8)" }}>
          <div className="sr-surface" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "var(--space-3) var(--space-4) var(--space-1)" }}>
              <div className="meta">Ladder → Player profile</div>
            </div>
            <div style={{ padding: "var(--space-2) var(--space-6) var(--space-3)" }}>
              <PageNav backTo="/ladder" backLabel="Ladder" />
            </div>
          </div>
          <div className="sr-surface" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "var(--space-3) var(--space-4) var(--space-1)" }}>
              <div className="meta">News → Weekly issue (with sibling tabs)</div>
            </div>
            <div style={{ padding: "var(--space-2) var(--space-6) var(--space-3)" }}>
              <PageNav
                backTo="/news"
                backLabel="News"
                tabs={[
                  { key: "1", label: "This week" },
                  { key: "2", label: "Last week" },
                  { key: "3", label: "2 weeks ago" },
                ]}
                activeTab="1"
              />
            </div>
          </div>
          <div className="sr-surface" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "var(--space-3) var(--space-4) var(--space-1)" }}>
              <div className="meta">News → Daily digest (with day tabs)</div>
            </div>
            <div style={{ padding: "var(--space-2) var(--space-6) var(--space-3)" }}>
              <PageNav
                backTo="/news"
                backLabel="News"
                tabs={[
                  { key: "0", label: "Today" },
                  { key: "1", label: "Yesterday" },
                  { key: "2", label: "2 days ago" },
                  { key: "3", label: "3 days ago" },
                  { key: "4", label: "4 days ago" },
                ]}
                activeTab="0"
              />
            </div>
          </div>
          <div className="sr-surface" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "var(--space-3) var(--space-4) var(--space-1)" }}>
              <div className="meta">Finished → Match detail (back only, no tabs)</div>
            </div>
            <div style={{ padding: "var(--space-2) var(--space-6) var(--space-3)" }}>
              <PageNav backTo="/finished" backLabel="Finished" />
            </div>
          </div>
        </div>

        {/* Usage */}
        <div className="sr-label" style={{ marginBottom: "var(--space-3)" }}>Usage</div>
        <pre className="sr-code" style={{ marginBottom: "var(--space-6)" }}>{`import { PageNav } from '../components/ui';

// Back only (no tabs)
<PageNav backTo="/ladder" backLabel="Ladder" />

// Back + sibling tabs
<PageNav
  backTo="/news"
  backLabel="News"
  tabs={[
    { key: "0", label: "This week" },
    { key: "1", label: "Last week" },
  ]}
  activeTab="0"
  onTab={(key) => setActiveIdx(Number(key))}
/>`}</pre>

        <table className="sr-table">
          <thead>
            <tr>
              <th>Element</th>
              <th>CSS</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={cellName}>Back arrow</td>
              <td><code>font-size: var(--text-sm); color: var(--gold); translateX(-3px) on hover</code></td>
            </tr>
            <tr>
              <td style={cellName}>Back label</td>
              <td><code>font-family: var(--font-mono); font-size: var(--text-xxs); uppercase; letter-spacing: 0.08em</code></td>
            </tr>
            <tr>
              <td style={cellName}>Tab (active)</td>
              <td><code>color: var(--gold); border-bottom: 2px solid var(--gold)</code></td>
            </tr>
            <tr>
              <td style={cellName}>Tab (inactive)</td>
              <td><code>color: var(--grey-light); hover → var(--white)</code></td>
            </tr>
          </tbody>
        </table>
      </section>

      <footer className="sr-footer reveal" style={{ "--delay": "0.2s" }}>
        4v4.gg design system - dark gold interfaces for competitive Warcraft III spectating.
      </footer>
    </div>
  );
};

export default StyleReference;
