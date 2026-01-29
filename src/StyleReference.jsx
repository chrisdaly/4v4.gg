import React from "react";
import styled from "styled-components";

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

// ============================================

const StyleReference = () => (
  <Page>
    <Title>Design System</Title>
    <Subtitle>~20 tokens for consistency</Subtitle>

    {/* COLORS */}
    <Section>
      <SectionTitle>Colors (6)</SectionTitle>
      <Grid>
        <Swatch><SwatchColor $color="var(--gold)" /><SwatchLabel>--gold</SwatchLabel></Swatch>
        <Swatch><SwatchColor $color="var(--green)" /><SwatchLabel>--green</SwatchLabel></Swatch>
        <Swatch><SwatchColor $color="var(--red)" /><SwatchLabel>--red</SwatchLabel></Swatch>
        <Swatch><SwatchColor $color="var(--grey-light)" /><SwatchLabel>--grey-light</SwatchLabel></Swatch>
        <Swatch><SwatchColor $color="var(--grey-mid)" /><SwatchLabel>--grey-mid</SwatchLabel></Swatch>
        <Swatch><SwatchColor $color="var(--grey-dark)" /><SwatchLabel>--grey-dark</SwatchLabel></Swatch>
      </Grid>
    </Section>

    {/* TYPOGRAPHY */}
    <Section>
      <SectionTitle>Typography (2 fonts, 5 sizes)</SectionTitle>
      <TypeRow>
        <TypeMeta>Display</TypeMeta>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', color: 'var(--gold)' }}>
          Friz Quadrata — Headlines, player names
        </span>
      </TypeRow>
      <TypeRow>
        <TypeMeta>Mono</TypeMeta>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-base)' }}>
          Inconsolata — Everything else (1847 MMR)
        </span>
      </TypeRow>

      <div style={{ marginTop: 'var(--space-4)' }}>
        <TypeRow><TypeMeta>xl / 28px</TypeMeta><span style={{ fontSize: 'var(--text-xl)', fontFamily: 'var(--font-display)', color: 'var(--gold)' }}>Heading</span></TypeRow>
        <TypeRow><TypeMeta>lg / 20px</TypeMeta><span style={{ fontSize: 'var(--text-lg)' }}>Subheading</span></TypeRow>
        <TypeRow><TypeMeta>base / 15px</TypeMeta><span style={{ fontSize: 'var(--text-base)' }}>Body default</span></TypeRow>
        <TypeRow><TypeMeta>sm / 13px</TypeMeta><span style={{ fontSize: 'var(--text-sm)' }}>Small text</span></TypeRow>
        <TypeRow><TypeMeta>xs / 11px</TypeMeta><span style={{ fontSize: 'var(--text-xs)' }}>Labels</span></TypeRow>
      </div>

      <div style={{ marginTop: 'var(--space-4)' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--grey-light)' }}>
          RANK &nbsp;&nbsp; MMR &nbsp;&nbsp; RECORD &nbsp;&nbsp; FORM
        </span>
        <div style={{ color: 'var(--grey-light)', fontSize: 'var(--text-xs)', marginTop: 'var(--space-1)' }}>
          ↑ Label style: mono + xs + uppercase + letter-spacing
        </div>
      </div>
    </Section>

    {/* SPACING */}
    <Section>
      <SectionTitle>Spacing (6)</SectionTitle>
      {[
        ['--space-1', '4px'],
        ['--space-2', '8px'],
        ['--space-4', '16px'],
        ['--space-6', '24px'],
        ['--space-8', '32px'],
        ['--space-12', '48px'],
      ].map(([name, size]) => (
        <SpaceRow key={name}>
          <SpaceLabel>{name} ({size})</SpaceLabel>
          <SpaceBar $size={size} />
        </SpaceRow>
      ))}
    </Section>

    {/* BORDERS */}
    <Section>
      <SectionTitle>Borders (5)</SectionTitle>
      <Row style={{ gap: 'var(--space-6)' }}>
        {[['sm', '2px'], ['md', '4px'], ['full', '∞']].map(([name, val]) => (
          <div key={name} style={{ textAlign: 'center' }}>
            <div style={{ width: 40, height: 40, background: 'var(--gold)', borderRadius: `var(--radius-${name})`, marginBottom: 'var(--space-1)' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--grey-light)' }}>{name}</span>
          </div>
        ))}
        <div style={{ borderLeft: '1px solid var(--grey-mid)', height: 40 }} />
        {[['thin', '1px'], ['thick', '2px']].map(([name, val]) => (
          <div key={name} style={{ textAlign: 'center' }}>
            <div style={{ width: 50, height: 40, border: `var(--border-${name}) solid var(--gold)`, borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-1)' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--grey-light)' }}>{name}</span>
          </div>
        ))}
      </Row>
    </Section>

    {/* SHADOW */}
    <Section>
      <SectionTitle>Shadow (1)</SectionTitle>
      <div style={{ width: 80, height: 60, background: 'var(--grey-dark)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-glow)' }} />
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--grey-light)', display: 'block', marginTop: 'var(--space-2)' }}>--shadow-glow</span>
    </Section>

    {/* TRANSPARENCY / OVERLAYS */}
    <Section>
      <SectionTitle>Transparency / Overlays (9)</SectionTitle>

      <div style={{ marginBottom: 'var(--space-4)' }}>
        <div style={{ color: 'var(--grey-light)', fontSize: 'var(--text-xs)', marginBottom: 'var(--space-2)' }}>Dark overlays (for stream overlays, modals)</div>
        <Row style={{ gap: 'var(--space-4)' }}>
          {[
            ['--overlay-heavy', 'rgba(0,0,0,0.9)', '0.9'],
            ['--overlay-medium', 'rgba(0,0,0,0.8)', '0.8'],
            ['--overlay-light', 'rgba(0,0,0,0.6)', '0.6'],
          ].map(([name, value, opacity]) => (
            <div key={name} style={{ textAlign: 'center' }}>
              <div style={{ width: 80, height: 50, background: `var(${name})`, border: '1px solid var(--grey-mid)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: '#fff' }}>{opacity}</span>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--grey-light)', display: 'block', marginTop: 'var(--space-1)' }}>{name.replace('--', '')}</span>
            </div>
          ))}
        </Row>
      </div>

      <div style={{ marginBottom: 'var(--space-4)' }}>
        <div style={{ color: 'var(--grey-light)', fontSize: 'var(--text-xs)', marginBottom: 'var(--space-2)' }}>Surface tints (for cards, rows, hover states)</div>
        <Row style={{ gap: 'var(--space-4)' }}>
          {[
            ['--surface-1', '0.02', 'Card bg'],
            ['--surface-2', '0.05', 'Hover'],
            ['--surface-3', '0.1', 'Borders'],
          ].map(([name, opacity, use]) => (
            <div key={name} style={{ textAlign: 'center' }}>
              <div style={{ width: 80, height: 50, background: `var(${name})`, border: '1px solid var(--grey-mid)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--grey-light)' }}>{opacity}</span>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--grey-light)', display: 'block', marginTop: 'var(--space-1)' }}>{use}</span>
            </div>
          ))}
        </Row>
      </div>

      <div style={{ marginBottom: 'var(--space-4)' }}>
        <div style={{ color: 'var(--grey-light)', fontSize: 'var(--text-xs)', marginBottom: 'var(--space-2)' }}>Color tints (for badges, highlights)</div>
        <Row style={{ gap: 'var(--space-4)' }}>
          {[
            ['--gold-tint', 'var(--gold)', 'Gold'],
            ['--green-tint', 'var(--green)', 'Win'],
            ['--red-tint', 'var(--red)', 'Loss'],
          ].map(([name, borderColor, label]) => (
            <div key={name} style={{ textAlign: 'center' }}>
              <div style={{ width: 80, height: 50, background: `var(${name})`, border: `1px solid ${borderColor}`, borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: borderColor }}>{label}</span>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--grey-light)', display: 'block', marginTop: 'var(--space-1)' }}>{name.replace('--', '')}</span>
            </div>
          ))}
        </Row>
      </div>
    </Section>

    {/* OVERLAY COMPONENTS */}
    <Section>
      <SectionTitle>Overlay Components (4)</SectionTitle>
      <div style={{ color: 'var(--grey-light)', fontSize: 'var(--text-xs)', marginBottom: 'var(--space-4)' }}>
        Stream overlays for OBS/Streamlabs. Use: body {"{"} background: transparent !important; {"}"}
      </div>

      <Grid style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-4)' }}>
        {/* OverlayCard */}
        <div>
          <div style={{ background: 'var(--overlay-medium)', border: '1px solid rgba(252,219,51,0.4)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', fontSize: 'var(--text-lg)' }}>PlayerName</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--grey-light)' }}>1847 MMR</div>
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--grey-light)', display: 'block', marginTop: 'var(--space-1)' }}>OverlayCard</span>
        </div>

        {/* OverlayMinimal */}
        <div>
          <div style={{ background: 'linear-gradient(180deg, rgba(30,30,30,0.95) 0%, rgba(15,15,15,0.98) 100%)', border: '1px solid rgba(252,219,51,0.3)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-2) var(--space-4)' }}>
            <div style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', fontSize: 'var(--text-sm)' }}>Match Overlay</div>
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--grey-light)', display: 'block', marginTop: 'var(--space-1)' }}>OverlayMinimal</span>
        </div>

        {/* OverlayGradient */}
        <div>
          <div style={{ background: 'radial-gradient(ellipse at center, var(--overlay-medium) 0%, var(--overlay-light) 60%, transparent 100%)', padding: 'var(--space-4)', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)' }}>Gradient Fade</div>
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--grey-light)', display: 'block', marginTop: 'var(--space-1)' }}>OverlayGradient</span>
        </div>

        {/* OverlayFrosted */}
        <div>
          <div style={{ background: 'rgba(20,20,30,0.7)', backdropFilter: 'blur(8px)', border: '1px solid var(--surface-3)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)' }}>
            <div style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)' }}>Frosted</div>
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--grey-light)', display: 'block', marginTop: 'var(--space-1)' }}>OverlayFrosted</span>
        </div>
      </Grid>
    </Section>

    {/* TINTED SURFACES */}
    <Section>
      <SectionTitle>Tinted Surfaces (3)</SectionTitle>
      <Row style={{ gap: 'var(--space-4)' }}>
        <div style={{ background: 'var(--gold-tint)', border: '1px solid rgba(252,219,51,0.3)', borderRadius: 'var(--radius-md)', padding: 'var(--space-2) var(--space-4)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--gold)' }}>GoldSurface</span>
        </div>
        <div style={{ background: 'var(--green-tint)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: 'var(--radius-md)', padding: 'var(--space-2) var(--space-4)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--green)' }}>WinSurface</span>
        </div>
        <div style={{ background: 'var(--red-tint)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 'var(--radius-md)', padding: 'var(--space-2) var(--space-4)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--red)' }}>LossSurface</span>
        </div>
      </Row>
    </Section>

    {/* COMPONENTS */}
    <Section>
      <SectionTitle>Components</SectionTitle>

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
        <div style={{ color: 'var(--grey-light)', fontSize: 'var(--text-xs)', marginBottom: 'var(--space-2)' }}>Team indicators</div>
        <Row>
          <TeamBar $blue>PlayerName</TeamBar>
          <TeamBar>EnemyPlayer</TeamBar>
        </Row>
      </div>

      <div>
        <div style={{ color: 'var(--grey-light)', fontSize: 'var(--text-xs)', marginBottom: 'var(--space-2)' }}>Card</div>
        <Card style={{ maxWidth: 240 }}>
          <div style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', marginBottom: 'var(--space-1)' }}>PlayerName</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--grey-light)' }}>1847 MMR • 59% WR</div>
        </Card>
      </div>
    </Section>

    {/* QUICK REF */}
    <Section>
      <SectionTitle>Quick Reference</SectionTitle>
      <Code>
{`/* COLORS */
--gold         #fcdb33   Brand, accents, player names
--green        #4ade80   Wins, positive
--red          #f87171   Losses, negative
--grey-light   #999      Secondary text, labels
--grey-mid     #444      Borders, disabled
--grey-dark    #1a1a1a   Elevated surfaces

/* TRANSPARENCY / OVERLAYS */
--overlay-heavy    rgba(0,0,0,0.9)    Nearly opaque
--overlay-medium   rgba(0,0,0,0.8)    Standard overlay
--overlay-light    rgba(0,0,0,0.6)    Lighter backdrop

--surface-1        rgba(255,255,255,0.02)  Card bg
--surface-2        rgba(255,255,255,0.05)  Hover state
--surface-3        rgba(255,255,255,0.1)   Borders

--gold-tint        rgba(252,219,51,0.1)
--green-tint       rgba(74,222,128,0.1)
--red-tint         rgba(248,113,113,0.1)

/* FONTS */
--font-display            Friz Quadrata (headlines)
--font-mono               Inconsolata (everything else)

/* TYPE SCALE */
--text-xs    11px        Labels
--text-sm    13px        Small
--text-base  15px        Body
--text-lg    20px        Subheads
--text-xl    28px        Headings

/* SPACING */
--space-1   4px    --space-6   24px
--space-2   8px    --space-8   32px
--space-4  16px    --space-12  48px

/* BORDERS */
--radius-sm 2px   --radius-md 4px   --radius-full
--border-thin 1px   --border-thick 2px

/* OTHER */
--shadow-glow     Gold glow effect
--transition      150ms ease`}
      </Code>
    </Section>
  </Page>
);

export default StyleReference;
