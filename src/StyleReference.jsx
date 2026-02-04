import React, { useState } from "react";
import styled from "styled-components";
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
} from "./design-tokens";
import { MmrComparison } from "./MmrComparison";

const Page = styled.div`
  padding: var(--space-8);
  background: #0a0a0a;
  min-height: 100vh;
  max-width: 900px;
  margin: 0 auto;
`;

const Title = styled.h1`
  font-family: var(--font-display);
  font-size: var(--text-xl);
  color: var(--gold);
  margin-bottom: var(--space-1);
`;

const Subtitle = styled.p`
  color: var(--grey-light);
  font-size: var(--text-sm);
  margin-bottom: var(--space-8);
`;

const Section = styled.section`
  margin-bottom: var(--space-8);
`;

const SectionTitle = styled.h2`
  font-size: var(--text-xs);
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--green);
  margin-bottom: var(--space-4);
  padding-bottom: var(--space-1);
  border-bottom: 1px solid var(--grey-mid);
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: var(--space-2);
`;

const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  align-items: center;
`;

const Code = styled.pre`
  background: var(--grey-dark);
  padding: var(--space-4);
  border-radius: var(--radius-md);
  color: var(--grey-light);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  overflow-x: auto;
  margin-top: var(--space-4);
`;

// Color swatch
const Swatch = styled.div`
  display: flex;
  flex-direction: column;
`;

const SwatchColor = styled.div`
  height: 40px;
  background: ${p => p.$color};
  border-radius: var(--radius-md) var(--radius-md) 0 0;
  border: 1px solid var(--grey-mid);
  border-bottom: none;
`;

const SwatchLabel = styled.div`
  background: var(--grey-dark);
  padding: var(--space-1) var(--space-2);
  border-radius: 0 0 var(--radius-md) var(--radius-md);
  border: 1px solid var(--grey-mid);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: #fff;
`;

// Type sample
const TypeRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: var(--space-4);
  padding: var(--space-2) 0;
  border-bottom: 1px solid #222;
  &:last-child { border-bottom: none; }
`;

const TypeMeta = styled.span`
  flex: 0 0 80px;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--grey-light);
`;

// Spacing bar
const SpaceRow = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-1);
`;

const SpaceBar = styled.div`
  width: ${p => p.$size};
  height: 16px;
  background: var(--gold);
  border-radius: var(--radius-sm);
  opacity: 0.8;
`;

const SpaceLabel = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--grey-light);
  min-width: 100px;
`;

// Components
const Card = styled.div`
  background: rgba(255,255,255,0.02);
  border: var(--border-thick) solid var(--gold);
  border-radius: var(--radius-md);
  padding: var(--space-4);
`;

const Badge = styled.span`
  display: inline-flex;
  padding: var(--space-1) var(--space-2);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-radius: var(--radius-full);
  background: ${p => p.$bg || 'var(--grey-dark)'};
  color: ${p => p.$color || '#fff'};
  border: 1px solid ${p => p.$border || 'var(--grey-mid)'};
`;

const Dot = styled.span`
  width: ${p => p.$recent ? '10px' : '8px'};
  height: ${p => p.$recent ? '10px' : '8px'};
  border-radius: var(--radius-full);
  background: ${p => p.$win ? 'var(--green)' : 'var(--red)'};
  opacity: ${p => p.$recent ? 1 : 0.7};
`;

const Button = styled.button`
  padding: var(--space-2) var(--space-4);
  font-family: var(--font-display);
  font-size: var(--text-sm);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: opacity var(--transition);

  ${p => p.$primary && `
    background: var(--gold);
    color: #0a0a0a;
    border: none;
    &:hover { opacity: 0.9; }
  `}

  ${p => p.$secondary && `
    background: transparent;
    color: var(--gold);
    border: var(--border-thin) solid var(--gold);
    &:hover { background: rgba(252,219,51,0.1); }
  `}
`;

const TeamBar = styled.div`
  padding: var(--space-2) var(--space-4);
  border-left: 3px solid ${p => p.$blue ? '#3b82f6' : '#ef4444'};
  background: ${p => p.$blue ? 'rgba(59,130,246,0.1)' : 'rgba(239,68,68,0.1)'};
  font-family: var(--font-display);
  color: var(--gold);
`;

const Note = styled.p`
  font-size: var(--text-xs);
  color: var(--grey-light);
  margin-bottom: var(--space-4);
  font-style: italic;
`;

const SliderRow = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
`;

const SliderLabel = styled.label`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--grey-light);
  min-width: 100px;
`;

const SliderInput = styled.input`
  flex: 1;
  accent-color: var(--gold);
`;

const SliderValue = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--gold);
  min-width: 50px;
  text-align: right;
`;

const Checkbox = styled.input`
  accent-color: var(--gold);
`;

// ============================================

const StyleReference = () => {
  const colorEntries = Object.entries(colors);
  const spacingEntries = Object.entries(spacing);
  const typeEntries = Object.entries(typeScale);

  // Pie config state for interactive playground
  const [pieConfig, setPieConfig] = useState({
    gapAngle: 0.5,
    radius: 10,
    innerRadius: 0,
    showRing: false,
    showLines: false,
  });

  const updatePieConfig = (key, value) => {
    setPieConfig(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Page>
      <Title>Design System</Title>
      <Subtitle>Single source of truth: src/design-tokens.js</Subtitle>

      {/* COLORS */}
      <Section>
        <SectionTitle>Colors ({colorEntries.length})</SectionTitle>
        <Grid>
          {colorEntries.map(([key, token]) => (
            <Swatch key={key}>
              <SwatchColor $color={token.value} />
              <SwatchLabel>{token.css}</SwatchLabel>
            </Swatch>
          ))}
        </Grid>
      </Section>

      {/* TYPOGRAPHY */}
      <Section>
        <SectionTitle>Typography ({Object.keys(fonts).length} fonts, {typeEntries.length} sizes)</SectionTitle>
        {Object.entries(fonts).map(([key, token]) => (
          <TypeRow key={key}>
            <TypeMeta>{key}</TypeMeta>
            <span style={{ fontFamily: token.value, fontSize: 'var(--text-lg)', color: key === 'display' ? 'var(--gold)' : '#fff' }}>
              {token.usage}
            </span>
          </TypeRow>
        ))}

        <div style={{ marginTop: 'var(--space-4)' }}>
          {typeEntries.map(([key, token]) => (
            <TypeRow key={key}>
              <TypeMeta>{key} / {token.value}</TypeMeta>
              <span style={{ fontSize: token.value }}>{token.usage}</span>
            </TypeRow>
          ))}
        </div>

        <div style={{ marginTop: 'var(--space-4)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--grey-light)' }}>
            RANK &nbsp;&nbsp; MMR &nbsp;&nbsp; RECORD &nbsp;&nbsp; FORM
          </span>
          <div style={{ color: 'var(--grey-light)', fontSize: 'var(--text-xs)', marginTop: 'var(--space-1)' }}>
            Label style: mono + xs + uppercase + letter-spacing
          </div>
        </div>
      </Section>

      {/* SPACING */}
      <Section>
        <SectionTitle>Spacing ({spacingEntries.length})</SectionTitle>
        {spacingEntries.map(([key, token]) => (
          <SpaceRow key={key}>
            <SpaceLabel>{token.css} ({token.value})</SpaceLabel>
            <SpaceBar $size={token.value} />
          </SpaceRow>
        ))}
      </Section>

      {/* BORDERS */}
      <Section>
        <SectionTitle>Borders ({Object.keys(borders).length})</SectionTitle>
        <Row style={{ gap: 'var(--space-6)' }}>
          {Object.entries(borders).filter(([k]) => k.startsWith('radius')).map(([key, token]) => (
            <div key={key} style={{ textAlign: 'center' }}>
              <div style={{ width: 40, height: 40, background: 'var(--gold)', borderRadius: token.value, marginBottom: 'var(--space-1)' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--grey-light)' }}>{key.replace('radius', '').toLowerCase() || 'sm'}</span>
            </div>
          ))}
          <div style={{ borderLeft: '1px solid var(--grey-mid)', height: 40 }} />
          {Object.entries(borders).filter(([k]) => !k.startsWith('radius')).map(([key, token]) => (
            <div key={key} style={{ textAlign: 'center' }}>
              <div style={{ width: 50, height: 40, border: `${token.value} solid var(--gold)`, borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-1)' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--grey-light)' }}>{key}</span>
            </div>
          ))}
        </Row>
      </Section>

      {/* EFFECTS */}
      <Section>
        <SectionTitle>Effects ({Object.keys(effects).length})</SectionTitle>
        <Row style={{ gap: 'var(--space-6)' }}>
          <div>
            <div style={{ width: 80, height: 60, background: 'var(--grey-dark)', borderRadius: 'var(--radius-md)', boxShadow: effects.shadowGlow.value }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--grey-light)', display: 'block', marginTop: 'var(--space-2)' }}>{effects.shadowGlow.css}</span>
          </div>
        </Row>
      </Section>

      {/* OVERLAYS */}
      <Section>
        <SectionTitle>Transparency / Overlays</SectionTitle>

        <div style={{ marginBottom: 'var(--space-4)' }}>
          <div style={{ color: 'var(--grey-light)', fontSize: 'var(--text-xs)', marginBottom: 'var(--space-2)' }}>Dark overlays (for stream overlays, modals)</div>
          <Row style={{ gap: 'var(--space-4)' }}>
            {Object.entries(overlays).map(([key, token]) => (
              <div key={key} style={{ textAlign: 'center' }}>
                <div style={{ width: 80, height: 50, background: token.value, border: '1px solid var(--grey-mid)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: '#fff' }}>{token.value.match(/[\d.]+\)$/)?.[0]?.replace(')', '') || key}</span>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--grey-light)', display: 'block', marginTop: 'var(--space-1)' }}>{key}</span>
              </div>
            ))}
          </Row>
        </div>

        <div style={{ marginBottom: 'var(--space-4)' }}>
          <div style={{ color: 'var(--grey-light)', fontSize: 'var(--text-xs)', marginBottom: 'var(--space-2)' }}>Surface tints (for cards, rows, hover states)</div>
          <Row style={{ gap: 'var(--space-4)' }}>
            {Object.entries(surfaces).map(([key, token]) => (
              <div key={key} style={{ textAlign: 'center' }}>
                <div style={{ width: 80, height: 50, background: token.value, border: '1px solid var(--grey-mid)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--grey-light)' }}>{token.value.match(/[\d.]+\)$/)?.[0]?.replace(')', '') || key}</span>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--grey-light)', display: 'block', marginTop: 'var(--space-1)' }}>{token.usage}</span>
              </div>
            ))}
          </Row>
        </div>

        <div style={{ marginBottom: 'var(--space-4)' }}>
          <div style={{ color: 'var(--grey-light)', fontSize: 'var(--text-xs)', marginBottom: 'var(--space-2)' }}>Color tints (for badges, highlights)</div>
          <Row style={{ gap: 'var(--space-4)' }}>
            {Object.entries(tints).map(([key, token]) => {
              const borderColor = key === 'gold' ? 'var(--gold)' : key === 'green' ? 'var(--green)' : 'var(--red)';
              return (
                <div key={key} style={{ textAlign: 'center' }}>
                  <div style={{ width: 80, height: 50, background: token.value, border: `1px solid ${borderColor}`, borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: borderColor }}>{key}</span>
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--grey-light)', display: 'block', marginTop: 'var(--space-1)' }}>{token.css}</span>
                </div>
              );
            })}
          </Row>
        </div>
      </Section>

      {/* COMPONENTS */}
      <Section>
        <SectionTitle>Components ({components.length})</SectionTitle>

        <div style={{ marginBottom: 'var(--space-4)' }}>
          <div style={{ color: 'var(--grey-light)', fontSize: 'var(--text-xs)', marginBottom: 'var(--space-2)' }}>Buttons</div>
          <Row>
            <Button $primary>Primary</Button>
            <Button $secondary>Secondary</Button>
          </Row>
        </div>

        <div style={{ marginBottom: 'var(--space-4)' }}>
          <div style={{ color: 'var(--grey-light)', fontSize: 'var(--text-xs)', marginBottom: 'var(--space-2)' }}>Badges</div>
          <Row>
            <Badge>Default</Badge>
            <Badge $bg="var(--gold)" $color="#0a0a0a" $border="var(--gold)">Gold</Badge>
            <Badge $bg="rgba(74,222,128,0.15)" $color="var(--green)" $border="var(--green)">Win</Badge>
            <Badge $bg="rgba(248,113,113,0.15)" $color="var(--red)" $border="var(--red)">Loss</Badge>
          </Row>
        </div>

        <div style={{ marginBottom: 'var(--space-4)' }}>
          <div style={{ color: 'var(--grey-light)', fontSize: 'var(--text-xs)', marginBottom: 'var(--space-2)' }}>Form dots (most recent = largest)</div>
          <Row style={{ gap: 'var(--space-1)', alignItems: 'center' }}>
            <Dot /><Dot $win /><Dot /><Dot $win /><Dot $win $recent />
            <span style={{ marginLeft: 'var(--space-2)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--grey-light)' }}>3W-2L</span>
          </Row>
        </div>

        <div style={{ marginBottom: 'var(--space-4)' }}>
          <div style={{ color: 'var(--grey-light)', fontSize: 'var(--text-xs)', marginBottom: 'var(--space-2)' }}>Live indicator</div>
          <Row style={{ alignItems: 'center', gap: 'var(--space-2)' }}>
            <span className="live-dot"></span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--grey-light)' }}>Pulsing red dot for live/ongoing status</span>
          </Row>
        </div>

        <div style={{ marginBottom: 'var(--space-4)' }}>
          <div style={{ color: 'var(--grey-light)', fontSize: 'var(--text-xs)', marginBottom: 'var(--space-2)' }}>Team indicators</div>
          <Row>
            <TeamBar $blue>PlayerName</TeamBar>
            <TeamBar>EnemyPlayer</TeamBar>
          </Row>
        </div>

        <div style={{ marginBottom: 'var(--space-4)' }}>
          <div style={{ color: 'var(--grey-light)', fontSize: 'var(--text-xs)', marginBottom: 'var(--space-2)' }}>Card</div>
          <Card style={{ maxWidth: 240 }}>
            <div style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', marginBottom: 'var(--space-1)' }}>PlayerName</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--grey-light)' }}>1847 MMR - 59% WR</div>
          </Card>
        </div>

        <div>
          <div style={{ color: 'var(--grey-light)', fontSize: 'var(--text-xs)', marginBottom: 'var(--space-2)' }}>Select / Dropdown</div>
          <Row style={{ gap: 'var(--space-4)' }}>
            <select style={{
              fontFamily: '"Friz_Quadrata_Bold", serif',
              background: 'linear-gradient(180deg, rgba(30, 30, 30, 0.95) 0%, rgba(15, 15, 15, 0.98) 100%)',
              border: '1px solid rgba(252, 219, 51, 0.3)',
              borderRadius: '4px',
              color: 'var(--gold)',
              fontSize: '12px',
              letterSpacing: '0.5px',
              padding: '8px 28px 8px 12px',
              cursor: 'pointer',
              WebkitAppearance: 'none',
              MozAppearance: 'none',
              appearance: 'none',
              backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath fill='%23fcdb33' d='M0 0l5 6 5-6z'/%3E%3C/svg%3E\")",
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 10px center',
            }}>
              <option>S24</option>
              <option>S23</option>
              <option>S22</option>
            </select>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--grey-light)' }}>Gold border, custom arrow, Friz Quadrata font</span>
          </Row>
        </div>
      </Section>

      {/* CARD BORDERS */}
      <Section>
        <SectionTitle>Card Borders</SectionTitle>
        <Note>Gold border for primary cards. No hover animations that move cards.</Note>

        <Grid style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
          <div>
            <div style={{ background: surfaces.surface1.value, border: `${borders.thick.value} solid ${colors.gold.value}`, borderRadius: borders.radiusMd.value, padding: 'var(--space-4)' }}>
              <div style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', marginBottom: 'var(--space-1)' }}>Gold Border</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--grey-light)' }}>Primary cards</div>
            </div>
            <Code style={{ marginTop: 'var(--space-2)', padding: 'var(--space-2)', fontSize: 10 }}>
{patterns.cardGold.css}
            </Code>
          </div>

          <div>
            <div style={{ background: surfaces.surface1.value, border: `1px solid ${colors.greyMid.value}`, borderRadius: borders.radiusMd.value, padding: 'var(--space-4)' }}>
              <div style={{ fontFamily: 'var(--font-display)', color: '#fff', marginBottom: 'var(--space-1)' }}>Grey Border</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--grey-light)' }}>Secondary cards</div>
            </div>
            <Code style={{ marginTop: 'var(--space-2)', padding: 'var(--space-2)', fontSize: 10 }}>
{patterns.cardSubtle.css}
            </Code>
          </div>

          <div>
            <div style={{ background: tints.green.value, border: `1px solid rgba(74,222,128,0.25)`, borderRadius: borders.radiusMd.value, padding: 'var(--space-4)' }}>
              <div style={{ fontFamily: 'var(--font-display)', color: 'var(--green)', marginBottom: 'var(--space-1)' }}>Win Card</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--grey-light)' }}>Victory results</div>
            </div>
          </div>

          <div>
            <div style={{ background: tints.red.value, border: `1px solid rgba(248,113,113,0.25)`, borderRadius: borders.radiusMd.value, padding: 'var(--space-4)' }}>
              <div style={{ fontFamily: 'var(--font-display)', color: 'var(--red)', marginBottom: 'var(--space-1)' }}>Loss Card</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--grey-light)' }}>Defeat results</div>
            </div>
          </div>
        </Grid>
      </Section>

      {/* GAME DISPLAYS */}
      <Section>
        <SectionTitle>Game Display Variants</SectionTitle>
        <Note>Unified GameCard and GameRow components for displaying match data.</Note>

        <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
          <div style={{ background: 'var(--surface-1)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--gold)', marginBottom: 'var(--space-2)' }}>
              GameCard (default)
            </div>
            <div style={{ color: 'var(--grey-light)', fontSize: 'var(--text-xs)', marginBottom: 'var(--space-2)' }}>
              Full card with map image, team details, and MMR. Used on /finished page.
            </div>
            <Code style={{ marginTop: 'var(--space-2)', padding: 'var(--space-2)', fontSize: 10 }}>
{`<GameCard
  game={gameData}
  playerBattleTag="Player#1234"
  status="live" // optional: "live" | "won" | "lost"
/>`}
            </Code>
          </div>

          <div style={{ background: 'var(--surface-1)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--gold)', marginBottom: 'var(--space-2)' }}>
              GameCard (global mode)
            </div>
            <div style={{ color: 'var(--grey-light)', fontSize: 'var(--text-xs)', marginBottom: 'var(--space-2)' }}>
              No player perspective. Shows avg MMR prominently. Used on /finished page.
            </div>
            <Code style={{ marginTop: 'var(--space-2)', padding: 'var(--space-2)', fontSize: 10 }}>
{`<GameCard
  game={gameData}
  // No playerBattleTag = global mode
/>`}
            </Code>
          </div>

          <div style={{ background: 'var(--surface-1)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--gold)', marginBottom: 'var(--space-2)' }}>
              GameCard (overlay)
            </div>
            <div style={{ color: 'var(--grey-light)', fontSize: 'var(--text-xs)', marginBottom: 'var(--space-2)' }}>
              Stream overlay for OBS/Streamlabs. Transparent bg, multiple layouts. Used at /overlay/lastgame/:tag
            </div>
            <Code style={{ marginTop: 'var(--space-2)', padding: 'var(--space-2)', fontSize: 10 }}>
{`<GameCard
  game={gameData}
  playerBattleTag="Player#1234"
  overlay={true}
  size="expanded"
  layout="vertical" // "horizontal" | "vertical" | "compact" | "wide"
/>`}
            </Code>
          </div>

          <div style={{ background: 'var(--surface-1)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--gold)', marginBottom: 'var(--space-2)' }}>
              GameRow (table)
            </div>
            <div style={{ color: 'var(--grey-light)', fontSize: 'var(--text-xs)', marginBottom: 'var(--space-2)' }}>
              Table row format for Match History. Shows Result, Map, Avg MMR, +/-, Allies, Duration, Time.
            </div>
            <Code style={{ marginTop: 'var(--space-2)', padding: 'var(--space-2)', fontSize: 10 }}>
{`<GameRow
  game={matchData}
  playerBattleTag="Player#1234"
  striped={true} // alternate row styling
/>`}
            </Code>
          </div>
        </div>

        <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-2)', background: 'rgba(252,219,51,0.05)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(252,219,51,0.2)' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--gold)' }}>Import</div>
          <Code style={{ marginTop: 'var(--space-1)', padding: 'var(--space-1)', fontSize: 10, background: 'transparent' }}>
{`import { GameCard, GameRow } from "./components/game";`}
          </Code>
        </div>
      </Section>

      {/* USAGE PATTERNS */}
      <Section>
        <SectionTitle>Usage Patterns</SectionTitle>
        <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
          {Object.entries(patterns).map(([key, pattern]) => (
            <div key={key} style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center', padding: 'var(--space-2)', background: 'var(--surface-1)', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--gold)', minWidth: 120 }}>{pattern.description}</span>
              <code style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--grey-light)' }}>{pattern.css}</code>
            </div>
          ))}
        </div>
      </Section>

      {/* MMR CHARTS - INTERACTIVE PLAYGROUND */}
      <Section>
        <SectionTitle>MMR Chart - Pie Tuning Playground</SectionTitle>
        <Note>Adjust sliders to tune the unified pie visualization for AT groups.</Note>

        {/* Controls */}
        <div style={{ background: 'var(--surface-2)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)' }}>
          <SliderRow>
            <SliderLabel>Gap Angle</SliderLabel>
            <SliderInput
              type="range"
              min="0"
              max="1.5"
              step="0.05"
              value={pieConfig.gapAngle}
              onChange={e => updatePieConfig('gapAngle', parseFloat(e.target.value))}
            />
            <SliderValue>{pieConfig.gapAngle.toFixed(2)}</SliderValue>
          </SliderRow>

          <SliderRow>
            <SliderLabel>Radius</SliderLabel>
            <SliderInput
              type="range"
              min="4"
              max="20"
              step="1"
              value={pieConfig.radius}
              onChange={e => updatePieConfig('radius', parseFloat(e.target.value))}
            />
            <SliderValue>{pieConfig.radius}px</SliderValue>
          </SliderRow>

          <SliderRow>
            <SliderLabel>Inner Radius</SliderLabel>
            <SliderInput
              type="range"
              min="0"
              max="10"
              step="1"
              value={pieConfig.innerRadius}
              onChange={e => updatePieConfig('innerRadius', parseFloat(e.target.value))}
            />
            <SliderValue>{pieConfig.innerRadius}px</SliderValue>
          </SliderRow>

          <SliderRow>
            <SliderLabel>Show Ring</SliderLabel>
            <Checkbox
              type="checkbox"
              checked={pieConfig.showRing}
              onChange={e => updatePieConfig('showRing', e.target.checked)}
            />
          </SliderRow>

          <SliderRow>
            <SliderLabel>Show Lines</SliderLabel>
            <Checkbox
              type="checkbox"
              checked={pieConfig.showLines}
              onChange={e => updatePieConfig('showLines', e.target.checked)}
            />
          </SliderRow>
        </div>

        {/* Live Preview - All Stack Sizes */}
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--gold)', marginBottom: 'var(--space-2)' }}>
            Live Preview: 2-stack, 3-stack, 4-stack
          </div>
          <Grid style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)' }}>
            {/* 2-stack */}
            <div>
              <div style={{ height: 180, background: 'var(--surface-1)', borderRadius: 'var(--radius-md)', padding: 'var(--space-2)' }}>
                <MmrComparison
                  data={{
                    teamOneMmrs: [1850, 1900, 1750, 2000],
                    teamTwoMmrs: [1820, 1880, 1700, 1950],
                    teamOneAT: [2, 2, 0, 0],
                    teamTwoAT: [2, 2, 0, 0],
                  }}
                  atStyle="combined"
                  pieConfig={pieConfig}
                />
              </div>
              <div style={{ color: 'var(--grey-light)', fontSize: 'var(--text-xs)', marginTop: 'var(--space-2)', textAlign: 'center' }}>
                2-stack (duo)
              </div>
            </div>

            {/* 3-stack */}
            <div>
              <div style={{ height: 180, background: 'var(--surface-1)', borderRadius: 'var(--radius-md)', padding: 'var(--space-2)' }}>
                <MmrComparison
                  data={{
                    teamOneMmrs: [1850, 1900, 1750, 2000],
                    teamTwoMmrs: [1820, 1880, 1700, 1950],
                    teamOneAT: [3, 3, 3, 0],
                    teamTwoAT: [3, 3, 3, 0],
                  }}
                  atStyle="combined"
                  pieConfig={pieConfig}
                />
              </div>
              <div style={{ color: 'var(--grey-light)', fontSize: 'var(--text-xs)', marginTop: 'var(--space-2)', textAlign: 'center' }}>
                3-stack (trio)
              </div>
            </div>

            {/* 4-stack */}
            <div>
              <div style={{ height: 180, background: 'var(--surface-1)', borderRadius: 'var(--radius-md)', padding: 'var(--space-2)' }}>
                <MmrComparison
                  data={{
                    teamOneMmrs: [1850, 1900, 1750, 2000],
                    teamTwoMmrs: [1820, 1880, 1700, 1950],
                    teamOneAT: [4, 4, 4, 4],
                    teamTwoAT: [4, 4, 4, 4],
                  }}
                  atStyle="combined"
                  pieConfig={pieConfig}
                />
              </div>
              <div style={{ color: 'var(--grey-light)', fontSize: 'var(--text-xs)', marginTop: 'var(--space-2)', textAlign: 'center' }}>
                4-stack (full team)
              </div>
            </div>
          </Grid>
        </div>

        {/* Mixed scenario */}
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--gold)', marginBottom: 'var(--space-2)' }}>
            Mixed: Team 1 has 2-stack, Team 2 all solo
          </div>
          <div style={{ maxWidth: 250 }}>
            <div style={{ height: 180, background: 'var(--surface-1)', borderRadius: 'var(--radius-md)', padding: 'var(--space-2)' }}>
              <MmrComparison
                data={{
                  teamOneMmrs: [1850, 1855, 1700, 2100],
                  teamTwoMmrs: [1820, 1825, 1830, 1900],
                  teamOneAT: [2, 2, 0, 0],
                  teamTwoAT: [0, 0, 0, 0],
                }}
                atStyle="combined"
                pieConfig={pieConfig}
              />
            </div>
          </div>
        </div>

        {/* Config output */}
        <div style={{ background: 'var(--grey-dark)', padding: 'var(--space-2)', borderRadius: 'var(--radius-sm)', marginTop: 'var(--space-4)' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--grey-light)' }}>
            pieConfig = {JSON.stringify(pieConfig)}
          </div>
        </div>
      </Section>

      {/* QUICK REF */}
      <Section>
        <SectionTitle>Quick Reference</SectionTitle>
        <Note>Generated from src/design-tokens.js</Note>
        <Code>
{`/* COLORS */
${colorEntries.map(([k, t]) => `${t.css.padEnd(18)} ${t.value.padEnd(10)} ${t.usage}`).join('\n')}

/* FONTS */
${Object.entries(fonts).map(([k, t]) => `${t.css.padEnd(18)} ${t.usage}`).join('\n')}

/* TYPE SCALE */
${typeEntries.map(([k, t]) => `${t.css.padEnd(14)} ${t.value.padEnd(6)} ${t.usage}`).join('\n')}

/* SPACING */
${spacingEntries.map(([k, t]) => `${t.css.padEnd(12)} ${t.value}`).join('\n')}

/* BORDERS */
${Object.entries(borders).map(([k, t]) => `${t.css.padEnd(16)} ${t.value}`).join('\n')}

/* EFFECTS */
${Object.entries(effects).map(([k, t]) => `${t.css.padEnd(16)} ${t.usage}`).join('\n')}`}
        </Code>
      </Section>
    </Page>
  );
};

export default StyleReference;
