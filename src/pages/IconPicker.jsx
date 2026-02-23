import React from "react";
import styled from "styled-components";

const ICONS = [
  // ── Main Army candidates ──
  { file: "crossed-swords", label: "Crossed Swords", category: "Main Army", credit: "lorc" },
  { file: "swords-emblem", label: "Swords Emblem", category: "Main Army", credit: "lorc" },
  { file: "battle-gear", label: "Battle Gear", category: "Main Army", credit: "lorc" },
  { file: "broadsword", label: "Broadsword", category: "Main Army", credit: "lorc" },
  // ── Secondary Army candidates ──
  { file: "arrow-cluster", label: "Arrow Cluster", category: "Secondary", credit: "lorc" },
  { file: "high-shot", label: "High Shot", category: "Secondary", credit: "lorc" },
  { file: "archer", label: "Archer", category: "Secondary", credit: "delapouite" },
  { file: "bordered-shield", label: "Shield", category: "Secondary", credit: "lorc" },
  // ── Support / Caster candidates ──
  { file: "meditation", label: "Meditation", category: "Support", credit: "lorc" },
  { file: "magic-shield", label: "Magic Shield", category: "Support", credit: "lorc" },
  { file: "embrassed-energy", label: "Energy", category: "Support", credit: "lorc" },
  { file: "magic-swirl", label: "Magic Swirl", category: "Support", credit: "lorc" },
  { file: "wand", label: "Wand", category: "Support", credit: "lorc" },
  // ── Hero candidates ──
  { file: "crown", label: "Crown", category: "Hero", credit: "lorc" },
  { file: "knight-helmet", label: "Helmet", category: "Hero", credit: "lorc" },
  // ── Production / Building candidates ──
  { file: "medieval-barracks", label: "Barracks", category: "Production", credit: "delapouite" },
  { file: "castle", label: "Castle", category: "Production", credit: "delapouite" },
  { file: "watchtower", label: "Watchtower", category: "Production", credit: "delapouite" },
  { file: "anvil", label: "Anvil", category: "Production", credit: "lorc" },
  // ── Altar candidates ──
  { file: "greek-temple", label: "Greek Temple", category: "Altar", credit: "delapouite" },
  { file: "shinto-shrine", label: "Shinto Shrine", category: "Altar", credit: "delapouite" },
];

const SIZES = [12, 16, 20, 24, 32, 48];
const CATEGORIES = ["Main Army", "Secondary", "Support", "Hero", "Production", "Altar"];

export default function IconPicker() {
  return (
    <Wrap>
      <Title>Role Icon Picker</Title>
      <Subtitle>game-icons.net / CC BY 3.0 — pick one per role</Subtitle>

      {CATEGORIES.map(cat => {
        const icons = ICONS.filter(i => i.category === cat);
        return (
          <Section key={cat}>
            <CatLabel>{cat}</CatLabel>
            <Grid>
              {icons.map(icon => (
                <IconCard key={icon.file}>
                  <IconName>{icon.label}</IconName>
                  <SizeRow>
                    {SIZES.map(s => (
                      <SizeCell key={s}>
                        <img
                          src={`/icons/roles/${icon.file}.svg`}
                          alt={icon.label}
                          width={s}
                          height={s}
                          style={{ filter: "invert(1)", display: "block" }}
                        />
                        <SizeLabel>{s}</SizeLabel>
                      </SizeCell>
                    ))}
                  </SizeRow>
                  {/* Show at gold color on dark bg — how it'd look in the glyph */}
                  <GlyphPreview>
                    <img
                      src={`/icons/roles/${icon.file}.svg`}
                      alt={icon.label}
                      width={16}
                      height={16}
                      style={{ filter: "invert(1) sepia(1) saturate(5) hue-rotate(10deg) brightness(1.1)", opacity: 0.6 }}
                    />
                    <span style={{ marginLeft: 4, fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--grey-mid)" }}>
                      in glyph (16px, gold-tinted)
                    </span>
                  </GlyphPreview>
                  <Credit>by {icon.credit}</Credit>
                </IconCard>
              ))}
            </Grid>
          </Section>
        );
      })}

      <Footer>
        All icons from <a href="https://game-icons.net" target="_blank" rel="noreferrer">game-icons.net</a> under CC BY 3.0
      </Footer>
    </Wrap>
  );
}

const Wrap = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--space-6);
`;

const Title = styled.h1`
  font-family: var(--font-display);
  color: var(--gold);
  font-size: var(--text-xl);
  margin-bottom: var(--space-2);
`;

const Subtitle = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--grey-light);
  margin-bottom: var(--space-8);
`;

const Section = styled.div`
  margin-bottom: var(--space-8);
`;

const CatLabel = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--gold);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: var(--space-4);
  border-bottom: 1px solid var(--grey-mid);
  padding-bottom: var(--space-2);
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-4);
`;

const IconCard = styled.div`
  border: 1px solid var(--grey-mid);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  background: rgba(0, 0, 0, 0.3);
`;

const IconName = styled.div`
  font-family: var(--font-display);
  font-size: var(--text-base);
  color: #fff;
  margin-bottom: var(--space-3);
`;

const SizeRow = styled.div`
  display: flex;
  align-items: flex-end;
  gap: var(--space-4);
  margin-bottom: var(--space-3);
`;

const SizeCell = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
`;

const SizeLabel = styled.span`
  font-family: var(--font-mono);
  font-size: 9px;
  color: var(--grey-mid);
`;

const GlyphPreview = styled.div`
  display: flex;
  align-items: center;
  padding: var(--space-2);
  background: rgba(0, 0, 0, 0.5);
  border-radius: var(--radius-sm);
  margin-bottom: var(--space-2);
`;

const Credit = styled.div`
  font-family: var(--font-mono);
  font-size: 9px;
  color: var(--grey-mid);
`;

const Footer = styled.div`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-mid);
  text-align: center;
  margin-top: var(--space-8);
  a { color: var(--gold); }
`;
