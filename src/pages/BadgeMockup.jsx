import React from "react";
import styled from "styled-components";
import { Badge, WinBadge, LossBadge, GoldBadge, PageHero, Delta } from "../components/ui";
import "../components/game/GameCard.css";
import "../components/game/GameRow.css";

/**
 * Temporary comparison page for the WIN/LOSS badge decision.
 * Route: /badge-mockup. Delete once one style is chosen.
 */

const Page = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--space-8) var(--space-6) var(--space-12);
`;

const Columns = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-6);
  @media (max-width: 800px) { grid-template-columns: 1fr; }
`;

const Col = styled.div`
  background: var(--panel-bg);
  border: 1px solid var(--panel-border);
  border-radius: var(--radius-xl);
  padding: var(--space-6);
  backdrop-filter: blur(12px);
`;

const ColTitle = styled.h2`
  font-family: var(--font-display);
  font-size: var(--text-lg);
  color: var(--gold);
  margin: 0 0 var(--space-1);
`;

const ColSub = styled.p`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
  margin: 0 0 var(--space-6);
`;

const Ctx = styled.div`
  margin-bottom: var(--space-6);
`;

const CtxLabel = styled.div`
  font: var(--text-xxs) var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--grey-light);
  margin-bottom: var(--space-2);
`;

const CardRow = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  background: var(--surface-1);
  border: 1px solid var(--grey-mid);
  border-radius: var(--radius-md);
`;

const Name = styled.span`
  font-family: var(--font-display);
  color: var(--gold);
  font-size: var(--text-xs);
`;

const Mono = styled.span`
  font-family: var(--font-mono);
  color: var(--grey-light);
  font-size: var(--text-xxs);
`;

const TeamHeader = styled.div`
  font-family: var(--font-display);
  font-size: var(--text-lg);
  color: var(--gold);
  display: flex;
  align-items: center;
  gap: var(--space-2);
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: var(--space-8);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  th { text-align: left; font-size: var(--text-xxs); text-transform: uppercase; letter-spacing: 0.1em; color: var(--grey-light); padding: var(--space-2); border-bottom: 1px solid var(--grey-mid); }
  td { padding: var(--space-2); border-bottom: 1px solid var(--surface-3); color: var(--white); vertical-align: top; }
  td:first-child { font-family: var(--font-display); color: var(--gold); white-space: nowrap; }
`;

const players = ["ToD", "Mubarak", "Happy", "120"];

const BadgeMockup = () => (
  <Page>
    <PageHero eyebrow="4v4.gg mockup" title="One badge style" lead="Two families exist today. Pick one; the other gets deleted." />

    <Columns>
      {/* ── Option A: display pill ───────────── */}
      <Col>
        <ColTitle>A. Display pill</ColTitle>
        <ColSub>Friz Quadrata bold 12px, tint background, no border, 4px radius. Today: game cards and rows.</ColSub>

        <Ctx>
          <CtxLabel>Finished card, top row</CtxLabel>
          <CardRow>
            <span className="gc-badge gc-badge-won">WIN</span>
            <Delta value={12} $size="var(--text-xxs)" />
            <Mono>1847 MMR</Mono>
            <Mono style={{ marginLeft: "auto" }}>Northshire LV</Mono>
          </CardRow>
          <CardRow style={{ marginTop: 8 }}>
            <span className="gc-badge gc-badge-lost">LOSS</span>
            <Delta value={-9} $size="var(--text-xxs)" />
            <Mono>1792 MMR</Mono>
            <Mono style={{ marginLeft: "auto" }}>Ekrezem&apos;s Maze</Mono>
          </CardRow>
        </Ctx>

        <Ctx>
          <CtxLabel>Player-centric row (profile match history)</CtxLabel>
          <CardRow>
            <span className="gr-badge gr-badge-won">W</span>
            {players.map((p) => <Name key={p}>{p}</Name>)}
            <Mono style={{ marginLeft: "auto" }}>17:22</Mono>
          </CardRow>
          <CardRow style={{ marginTop: 8 }}>
            <span className="gr-badge gr-badge-lost">L</span>
            {players.map((p) => <Name key={p}>{p}</Name>)}
            <Mono style={{ marginLeft: "auto" }}>24:05</Mono>
          </CardRow>
        </Ctx>

        <Ctx>
          <CtxLabel>Scorecard team header (winner chip)</CtxLabel>
          <TeamHeader><span className="winner-badge">W</span> TEAM 1</TeamHeader>
        </Ctx>

        <Ctx>
          <CtxLabel>Large result (card overlay)</CtxLabel>
          <span className="gc-badge gc-badge-won gc-badge-large">VICTORY</span>
        </Ctx>
      </Col>

      {/* ── Option B: mono pill ──────────────── */}
      <Col>
        <ColTitle>B. Mono pill</ColTitle>
        <ColSub>Inconsolata 14px uppercase 0.05em, tint background, solid 1px border, fully rounded. Today: ui.jsx Badge (unused in the app).</ColSub>

        <Ctx>
          <CtxLabel>Finished card, top row</CtxLabel>
          <CardRow>
            <WinBadge>Win</WinBadge>
            <Delta value={12} $size="var(--text-xxs)" />
            <Mono>1847 MMR</Mono>
            <Mono style={{ marginLeft: "auto" }}>Northshire LV</Mono>
          </CardRow>
          <CardRow style={{ marginTop: 8 }}>
            <LossBadge>Loss</LossBadge>
            <Delta value={-9} $size="var(--text-xxs)" />
            <Mono>1792 MMR</Mono>
            <Mono style={{ marginLeft: "auto" }}>Ekrezem&apos;s Maze</Mono>
          </CardRow>
        </Ctx>

        <Ctx>
          <CtxLabel>Player-centric row (profile match history)</CtxLabel>
          <CardRow>
            <WinBadge style={{ fontSize: "var(--text-xxs)", padding: "2px 8px" }}>W</WinBadge>
            {players.map((p) => <Name key={p}>{p}</Name>)}
            <Mono style={{ marginLeft: "auto" }}>17:22</Mono>
          </CardRow>
          <CardRow style={{ marginTop: 8 }}>
            <LossBadge style={{ fontSize: "var(--text-xxs)", padding: "2px 8px" }}>L</LossBadge>
            {players.map((p) => <Name key={p}>{p}</Name>)}
            <Mono style={{ marginLeft: "auto" }}>24:05</Mono>
          </CardRow>
        </Ctx>

        <Ctx>
          <CtxLabel>Scorecard team header (winner chip)</CtxLabel>
          <TeamHeader><GoldBadge style={{ fontSize: "var(--text-xxs)", padding: "2px 8px" }}>W</GoldBadge> TEAM 1</TeamHeader>
        </Ctx>

        <Ctx>
          <CtxLabel>Large result (card overlay)</CtxLabel>
          <WinBadge style={{ fontSize: "var(--text-sm)", padding: "var(--space-2) var(--space-4)" }}>Victory</WinBadge>
        </Ctx>

        <Ctx>
          <CtxLabel>Neutral status (same family)</CtxLabel>
          <div style={{ display: "flex", gap: 8 }}>
            <Badge>Default</Badge>
            <GoldBadge>Featured</GoldBadge>
          </div>
        </Ctx>
      </Col>
    </Columns>

    <Table>
      <thead>
        <tr><th>Where it lives today</th><th>Look</th><th>Used on</th></tr>
      </thead>
      <tbody>
        <tr><td>.gc-badge (GameCard.css)</td><td>A, WIN / LOSS</td><td>Finished page cards, Home hero card, player-centric cards</td></tr>
        <tr><td>.gr-badge (GameRow.css)</td><td>A, W / L 28x24 box</td><td>Profile match history rows</td></tr>
        <tr><td>.winner-badge (Game.css)</td><td>A-ish, gold fill W chip</td><td>Live and match scorecard team headers</td></tr>
        <tr><td>.gc-result-badge / .gc-result-overlay</td><td>A, large text</td><td>Card overlay (OBS) result state</td></tr>
        <tr><td>Badge / WinBadge / LossBadge / GoldBadge (ui.jsx)</td><td>B</td><td>Style page only; Clips imported it but never rendered it</td></tr>
        <tr><td>.sr-tag (StyleReference.css)</td><td>B-ish, 12px</td><td>Style page section tags only</td></tr>
        <tr><td>.ph-badge (PlayerProfile.css), MVP chip (MiniMatchCard), ADMIN chip (Navbar)</td><td>Tag chips, not results</td><td>Profile header, chat cards, navbar; stay as tagChip pattern</td></tr>
      </tbody>
    </Table>
  </Page>
);

export default BadgeMockup;
