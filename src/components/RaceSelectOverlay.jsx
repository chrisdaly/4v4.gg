import React from "react";
import styled, { keyframes } from "styled-components";
import { themeList } from "../lib/borderThemes";
import { useTheme } from "../lib/ThemeContext";

const FEATURED_IDS = [
  "human", "orc", "nightElf", "undead",
  "frozenThrone", "dalaran", "arena", "midnight",
];

const featuredThemes = FEATURED_IDS.map((id) => themeList.find((t) => t.id === id)).filter(Boolean);

const fadeIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;

const slideUp = keyframes`
  from { opacity: 0; transform: translateY(30px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 100000;
  background: rgba(0, 0, 0, 0.92);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  animation: ${fadeIn} 0.5s ease;
`;

const Content = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-6);
  max-width: 900px;
  width: 100%;
  padding: var(--space-4);
  animation: ${slideUp} 0.6s ease 0.2s both;
`;

const Title = styled.h1`
  font-family: var(--font-display);
  color: var(--gold);
  font-size: var(--text-xl);
  letter-spacing: 2px;
  text-align: center;
  margin: 0;
  text-shadow: 0 2px 12px rgba(252, 219, 51, 0.3);
`;

const Subtitle = styled.p`
  font-family: var(--font-mono);
  color: var(--grey-light);
  font-size: var(--text-xs);
  text-align: center;
  margin: 0;
  letter-spacing: 0.5px;
`;

const ThemeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-4);
  width: 100%;

  @media (max-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-2);
  }
`;

const ThemeCard = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-4) var(--space-2);
  background: rgba(15, 12, 8, 0.8);
  border: 2px solid rgba(160, 130, 80, 0.2);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: var(--gold);
    background: rgba(252, 219, 51, 0.06);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  }
`;

const ThemePreview = styled.div`
  width: 100%;
  aspect-ratio: 16 / 10;
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: url(${(p) => p.$bg}) center / cover no-repeat;
  border: 1px solid rgba(255, 255, 255, 0.08);
`;

const ThemeName = styled.span`
  font-family: var(--font-display);
  font-size: var(--text-base);
  color: #fff;
`;

const DEFAULT_BG = "/frames/launcher/Static_Background.png";

const RaceSelectOverlay = () => {
  const { setThemeId } = useTheme();

  return (
    <Backdrop>
      <Content>
        <Title>Choose Your Theme</Title>
        <Subtitle>Pick a look to get started — change anytime from the navbar</Subtitle>
        <ThemeGrid>
          {featuredThemes.map((t) => (
            <ThemeCard key={t.id} onClick={() => setThemeId(t.id)}>
              <ThemePreview $bg={t.backgroundImg || DEFAULT_BG} />
              <ThemeName>{t.name}</ThemeName>
            </ThemeCard>
          ))}
        </ThemeGrid>
      </Content>
    </Backdrop>
  );
};

export default RaceSelectOverlay;
