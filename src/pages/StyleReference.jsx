import React from "react";
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
  patterns,
  components,
} from "../lib/design-tokens";
import { MmrComparison } from "../components/MmrComparison";
import PeonLoader from "../components/PeonLoader";
import { CountryFlag, Select, Input, Button } from "../components/ui";
import "../styles/pages/StyleReference.css";

const pieConfig = { combinedGap: 5, areaMultiplier: 1.6 };

// Colors that need dark text on their swatch
const lightSwatches = new Set(["gold", "green", "greyLight", "textBody", "white"]);

const StyleReference = () => {
  const colorEntries = Object.entries(colors);
  const spacingEntries = Object.entries(spacing);
  const typeEntries = Object.entries(typeScale);

  return (
    <div className="sr-page">

      {/* ── Hero ─────────────────────────── */}
      <header className="sr-hero">
        <div className="sr-hero-copy sr-reveal" style={{ "--delay": "0.05s" }}>
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
        <div className="sr-panel sr-reveal" style={{ "--delay": "0.18s" }}>
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
      <section className="sr-section sr-reveal" style={{ "--delay": "0.08s" }}>
        <div className="sr-section-head">
          <div>
            <h2>Design principles</h2>
            <p>Built for the competitive spectator. Fast reads, clear outcomes, cinematic atmosphere.</p>
          </div>
          <div className="sr-badge-row">
            <span className="sr-badge gold">Clarity</span>
            <span className="sr-badge green">Speed</span>
            <span className="sr-badge red">Immersion</span>
          </div>
        </div>
        <div className="sr-card-grid">
          <article className="sr-card sr-reveal" style={{ "--delay": "0.12s" }}>
            <h3>At-a-glance data</h3>
            <p>Monospace numbers, gold highlights, and team colors deliver competitive context instantly.</p>
          </article>
          <article className="sr-card sr-reveal" style={{ "--delay": "0.18s" }}>
            <h3>Competitive contrast</h3>
            <p>High-contrast text on dark surfaces. Gold for emphasis, green and red for win/loss outcomes.</p>
          </article>
          <article className="sr-card sr-reveal" style={{ "--delay": "0.24s" }}>
            <h3>Cinematic immersion</h3>
            <p>Race backgrounds, subtle overlays, and generous spacing create a spectator atmosphere.</p>
          </article>
        </div>
      </section>

      {/* ── Color Palette ────────────────── */}
      <section className="sr-section sr-reveal" style={{ "--delay": "0.1s" }}>
        <div className="sr-section-head">
          <div>
            <h2>Color palette</h2>
            <p>Gold anchors the brand. Green and red signal outcomes. Cool greys recede into the background.</p>
          </div>
        </div>
        <div className="sr-swatch-grid">
          {colorEntries
            .filter(([key]) => !["teamBlue", "teamRed", "twitchPurple", "atPurple", "white", "textBody"].includes(key))
            .map(([key, token]) => (
            <div
              key={key}
              className={`sr-swatch ${lightSwatches.has(key) ? "light" : "dark"}`}
              style={{ background: token.value }}
            >
              <span className="sr-swatch-name">{token.css}</span>
              <div>
                <span className="sr-swatch-hex">{token.value}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Typography ───────────────────── */}
      <section className="sr-section sr-reveal" style={{ "--delay": "0.1s" }}>
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
            <h4 style={{ fontFamily: "var(--font-mono)", color: "#fff" }}>
              Inconsolata
            </h4>
            <p>Stats, MMR values, labels, dates. Tabular data that needs to align.</p>
          </div>
          <div className="sr-type-sample">
            <div className="sample-title">Body</div>
            <h4 style={{ fontFamily: "var(--font-body)", color: "#fff" }}>
              Libre Baskerville
            </h4>
            <p>Blog articles, news summaries, empty states, and descriptive prose. Readable serif for anything meant to be read.</p>
          </div>
        </div>

        <div className="sr-type-scale">
          {typeEntries.map(([key, token]) => (
            <div className="sr-type-row" key={key}>
              <span className="sr-type-meta">{token.css} ({token.value})</span>
              <span style={{ fontSize: token.value, color: "#fff" }}>{token.usage}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Spacing ──────────────────────── */}
      <section className="sr-section sr-reveal" style={{ "--delay": "0.1s" }}>
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
      <section className="sr-section sr-reveal" style={{ "--delay": "0.1s" }}>
        <div className="sr-section-head">
          <div>
            <h2>Components</h2>
            <p>Buttons, badges, team indicators, and form dots. The building blocks of match display.</p>
          </div>
        </div>
        <div className="sr-component-grid">
          <div className="sr-stack">
            <div className="sr-label">Buttons</div>
            <button className="sr-btn sr-btn-primary">Primary Action</button>
            <button className="sr-btn sr-btn-secondary">Secondary</button>
          </div>

          <div className="sr-stack">
            <div className="sr-label">Badges</div>
            <div className="sr-badge-row">
              <span className="sr-badge">Default</span>
              <span className="sr-badge gold">Gold</span>
              <span className="sr-badge green">Win</span>
              <span className="sr-badge red">Loss</span>
            </div>
          </div>

          <div className="sr-stack">
            <div className="sr-label">Form dots</div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span className="sr-dot loss sm" />
              <span className="sr-dot win sm" />
              <span className="sr-dot loss sm" />
              <span className="sr-dot win sm" />
              <span className="sr-dot win lg" />
              <span style={{ marginLeft: 8, fontFamily: "var(--font-mono)", fontSize: "0.9rem", color: "var(--grey-light)" }}>
                3W-2L
              </span>
            </div>
          </div>

          <div className="sr-stack">
            <div className="sr-label">Live indicator</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="live-dot" />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", color: "var(--grey-light)" }}>
                Pulsing red dot
              </span>
            </div>
          </div>

          <div className="sr-stack">
            <div className="sr-label">Team indicators</div>
            <div className="sr-team-bar blue">Blue Team Player</div>
            <div className="sr-team-bar red">Red Team Player</div>
          </div>

          <div className="sr-stack">
            <div className="sr-label">Select / Dropdown</div>
            <Select defaultValue="S24">
              <option>S24</option>
              <option>S23</option>
              <option>S22</option>
            </Select>
          </div>

          <div className="sr-stack">
            <div className="sr-label">Input</div>
            <Input placeholder="Search players..." />
          </div>

          <div className="sr-stack">
            <div className="sr-label">Country flags</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {[
                { code: "us", label: "US" },
                { code: "de", label: "DE" },
                { code: "kr", label: "KR" },
                { code: "ru", label: "RU" },
                { code: "cn", label: "CN" },
                { code: "fr", label: "FR" },
                { code: "br", label: "BR" },
              ].map(({ code, label }) => (
                <span key={code} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <CountryFlag name={code} />
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--grey-light)" }}>{label}</span>
                </span>
              ))}
            </div>
          </div>

          <div className="sr-stack">
            <div className="sr-label">Peon loader sizes</div>
            <div style={{ display: "flex", gap: 32, alignItems: "flex-start" }}>
              <div style={{ textAlign: "center" }}>
                <PeonLoader size="sm" />
                <div className="sr-overlay-name" style={{ marginTop: 8 }}>sm</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <PeonLoader size="md" />
                <div className="sr-overlay-name" style={{ marginTop: 8 }}>md</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <PeonLoader size="lg" />
                <div className="sr-overlay-name" style={{ marginTop: 8 }}>lg</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Card Borders ─────────────────── */}
      <section className="sr-section sr-reveal" style={{ "--delay": "0.1s" }}>
        <div className="sr-section-head">
          <div>
            <h2>Card borders</h2>
            <p>Gold border for primary cards. Grey for secondary. Tinted backgrounds for win/loss states.</p>
          </div>
        </div>
        <div className="sr-showcase-grid">
          <div
            className="sr-showcase-card"
            style={{
              background: surfaces.surface1.value,
              border: `${borders.thick.value} solid ${colors.gold.value}`,
            }}
          >
            <div className="card-title" style={{ color: "var(--gold)" }}>Gold Border</div>
            <div className="card-sub">Primary cards</div>
          </div>
          <div
            className="sr-showcase-card"
            style={{
              background: surfaces.surface1.value,
              border: `1px solid ${colors.greyMid.value}`,
            }}
          >
            <div className="card-title" style={{ color: "#fff" }}>Grey Border</div>
            <div className="card-sub">Secondary cards</div>
          </div>
          <div
            className="sr-showcase-card"
            style={{
              background: tints.green.value,
              border: "1px solid rgba(74,222,128,0.25)",
            }}
          >
            <div className="card-title" style={{ color: "var(--green)" }}>Win Card</div>
            <div className="card-sub">Victory results</div>
          </div>
          <div
            className="sr-showcase-card"
            style={{
              background: tints.red.value,
              border: "1px solid rgba(248,113,113,0.25)",
            }}
          >
            <div className="card-title" style={{ color: "var(--red)" }}>Loss Card</div>
            <div className="card-sub">Defeat results</div>
          </div>
        </div>
      </section>

      {/* ── Surface & Overlays ────────────── */}
      <section className="sr-section sr-reveal" style={{ "--delay": "0.1s" }}>
        <div className="sr-section-head">
          <div>
            <h2>Surfaces and overlays</h2>
            <p>Dark overlays for modals and streams. Subtle surface tints for layering. Color tints for state.</p>
          </div>
        </div>

        <div className="sr-label" style={{ marginBottom: 12 }}>Dark overlays</div>
        <div className="sr-overlay-grid" style={{ marginBottom: 24 }}>
          {Object.entries(overlays).map(([key, token]) => (
            <div className="sr-overlay-swatch" key={key}>
              <div className="sr-overlay-box" style={{ background: token.value }}>
                <span>{token.value.match(/[\d.]+\)$/)?.[0]?.replace(")", "") || key}</span>
              </div>
              <div className="sr-overlay-name">{key}</div>
            </div>
          ))}
        </div>

        <div className="sr-label" style={{ marginBottom: 12 }}>Surface tints</div>
        <div className="sr-overlay-grid" style={{ marginBottom: 24 }}>
          {Object.entries(surfaces).map(([key, token]) => (
            <div className="sr-overlay-swatch" key={key}>
              <div className="sr-overlay-box" style={{ background: token.value }}>
                <span style={{ color: "var(--grey-light)" }}>{token.usage}</span>
              </div>
              <div className="sr-overlay-name">{token.css}</div>
            </div>
          ))}
        </div>

        <div className="sr-label" style={{ marginBottom: 12 }}>Color tints</div>
        <div className="sr-overlay-grid">
          {Object.entries(tints).map(([key, token]) => {
            const accent = key === "gold" ? "var(--gold)" : key === "green" ? "var(--green)" : "var(--red)";
            return (
              <div className="sr-overlay-swatch" key={key}>
                <div className="sr-overlay-box" style={{ background: token.value, borderColor: accent }}>
                  <span style={{ color: accent, fontFamily: "var(--font-mono)", fontSize: "0.78rem" }}>{key}</span>
                </div>
                <div className="sr-overlay-name">{token.css}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Surface Layouts ───────────────── */}
      <section className="sr-section sr-reveal" style={{ "--delay": "0.1s" }}>
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

      {/* ── Usage Patterns (table) ────────── */}
      <section className="sr-section sr-reveal" style={{ "--delay": "0.1s" }}>
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
                <td style={{ fontFamily: "var(--font-display)", color: "var(--gold)", whiteSpace: "nowrap" }}>
                  {pattern.description}
                </td>
                <td><code>{pattern.css}</code></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* ── Loading States ────────────────── */}
      <section className="sr-section sr-reveal" style={{ "--delay": "0.1s" }}>
        <div className="sr-section-head">
          <div>
            <h2>Loading states</h2>
            <p>Gold spinner with random WC3 peon quotes. Three sizes for inline, component, and page-level loading.</p>
          </div>
        </div>
        <div className="sr-layout-grid">
          <div className="sr-surface">
            <div className="meta">Spinner sizes</div>
            <div style={{ display: "flex", gap: 32, alignItems: "center", marginTop: 12 }}>
              <div style={{ textAlign: "center" }}>
                <div className="loader-spinner sm" />
                <div className="sr-overlay-name" style={{ marginTop: 8 }}>sm (16px)</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div className="loader-spinner" />
                <div className="sr-overlay-name" style={{ marginTop: 8 }}>default (24px)</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div className="loader-spinner lg" />
                <div className="sr-overlay-name" style={{ marginTop: 8 }}>lg (32px)</div>
              </div>
            </div>
          </div>
          <div className="sr-surface">
            <div className="meta">Page loader (PeonLoader)</div>
            <div style={{ padding: 16 }}>
              <PeonLoader />
            </div>
          </div>
        </div>
      </section>

      {/* ── Borders & Radius ──────────────── */}
      <section className="sr-section sr-reveal" style={{ "--delay": "0.1s" }}>
        <div className="sr-section-head">
          <div>
            <h2>Borders and radius</h2>
            <p>Tight radius for a sharp, competitive feel. Two border weights for hierarchy.</p>
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 32, alignItems: "flex-end" }}>
          {Object.entries(borders).filter(([k]) => k.startsWith("radius")).map(([key, token]) => (
            <div key={key} style={{ textAlign: "center" }}>
              <div style={{ width: 48, height: 48, background: "var(--gold)", borderRadius: token.value, marginBottom: 8 }} />
              <div className="sr-overlay-name">{token.css}</div>
              <div className="sr-overlay-name">{token.value}</div>
            </div>
          ))}
          <div style={{ borderLeft: "1px solid var(--grey-mid)", height: 48, margin: "0 8px" }} />
          {Object.entries(borders).filter(([k]) => !k.startsWith("radius")).map(([key, token]) => (
            <div key={key} style={{ textAlign: "center" }}>
              <div style={{ width: 56, height: 48, border: `${token.value} solid var(--gold)`, borderRadius: "var(--radius-md)", marginBottom: 8 }} />
              <div className="sr-overlay-name">{token.css}</div>
              <div className="sr-overlay-name">{token.value}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── MMR Charts ────────────────────── */}
      <section className="sr-section sr-reveal" style={{ "--delay": "0.1s" }}>
        <div className="sr-section-head">
          <div>
            <h2>MMR visualization</h2>
            <p>Combined circle style for AT groups. Area equals sum of individual player circles.</p>
          </div>
          <div className="sr-badge-row">
            <span className="sr-badge blue">AT groups</span>
            <span className="sr-badge">Solo</span>
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
                atStyle="combined"
                pieConfig={pieConfig}
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
                atStyle="combined"
                pieConfig={pieConfig}
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
                atStyle="combined"
                pieConfig={pieConfig}
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
                atStyle="combined"
                pieConfig={pieConfig}
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
                atStyle="combined"
                pieConfig={pieConfig}
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
                atStyle="combined"
                pieConfig={pieConfig}
              />
            </div>
            <div className="sr-mmr-label">4-stack vs all solo</div>
          </div>
        </div>
      </section>

      {/* ── Quick Reference ───────────────── */}
      <section className="sr-section sr-reveal" style={{ "--delay": "0.1s" }}>
        <div className="sr-section-head">
          <div>
            <h2>Quick reference</h2>
            <p>All tokens from src/lib/design-tokens.js in one block.</p>
          </div>
        </div>
        <pre className="sr-code">
{`/* COLORS */
${colorEntries.map(([k, t]) => `${t.css.padEnd(18)} ${t.value.padEnd(10)} ${t.usage}`).join("\n")}

/* FONTS */
${Object.entries(fonts).map(([k, t]) => `${t.css.padEnd(18)} ${t.usage}`).join("\n")}

/* TYPE SCALE */
${typeEntries.map(([k, t]) => `${t.css.padEnd(14)} ${t.value.padEnd(6)} ${t.usage}`).join("\n")}

/* SPACING */
${spacingEntries.map(([k, t]) => `${t.css.padEnd(12)} ${t.value}`).join("\n")}

/* BORDERS */
${Object.entries(borders).map(([k, t]) => `${t.css.padEnd(16)} ${t.value}`).join("\n")}

/* EFFECTS */
${Object.entries(effects).map(([k, t]) => `${t.css.padEnd(16)} ${t.usage}`).join("\n")}`}
        </pre>
      </section>

      <footer className="sr-footer sr-reveal" style={{ "--delay": "0.2s" }}>
        4v4.gg design system — dark gold interfaces for competitive Warcraft III spectating.
      </footer>
    </div>
  );
};

export default StyleReference;
