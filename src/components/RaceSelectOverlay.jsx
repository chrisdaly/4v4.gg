import React from "react";
import styled, { keyframes } from "styled-components";
import { themeList } from "../lib/borderThemes";
import { useTheme } from "../lib/ThemeContext";

const RACE_IDS = ["human", "orc", "nightElf", "undead"];
const OTHER_IDS = ["ironforge", "bevel"];

const raceThemes = themeList.filter((t) => RACE_IDS.includes(t.id));
const otherThemes = themeList.filter((t) => OTHER_IDS.includes(t.id));

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

const HeaderImage = styled.img`
  width: 100%;
  max-width: 600px;
  border-radius: var(--radius-md);
  border: 2px solid rgba(252, 219, 51, 0.2);
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

const RaceGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-4);
  width: 100%;

  @media (max-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-2);
  }
`;

const RaceCard = styled.button`
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

const RacePreview = styled.div`
  width: 100%;
  aspect-ratio: 16 / 10;
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: url(${(p) => p.$bg}) center / cover no-repeat;
  border: ${(p) => p.$border};
  border-image: ${(p) => p.$borderImage};
`;

const RaceName = styled.span`
  font-family: var(--font-display);
  font-size: var(--text-base);
  color: #fff;
`;

const RaceDesc = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
`;

const OtherSection = styled.div`
  display: flex;
  gap: var(--space-2);
  align-items: center;
`;

const OtherLabel = styled.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  white-space: nowrap;
`;

const OtherButton = styled.button`
  padding: 6px 16px;
  background: rgba(15, 12, 8, 0.8);
  border: 1px solid rgba(160, 130, 80, 0.2);
  border-radius: var(--radius-sm);
  color: var(--grey-light);
  font-family: var(--font-display);
  font-size: var(--text-xs);
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: var(--gold);
    color: var(--gold);
    background: rgba(252, 219, 51, 0.06);
  }
`;

const DEFAULT_BG = "/frames/launcher/Static_Background.png";

const RaceSelectOverlay = () => {
  const { setThemeId } = useTheme();

  return (
    <Backdrop>
      <Content>
        <HeaderImage src="/frames/fansite-kit/4-races.jpg" alt="Warcraft III Races" />
        <Title>Choose Your Race</Title>
        <Subtitle>This sets your site theme — you can change it anytime from the navbar</Subtitle>
        <RaceGrid>
          {raceThemes.map((t) => (
            <RaceCard key={t.id} onClick={() => setThemeId(t.id)}>
              <RacePreview
                $bg={t.backgroundImg || DEFAULT_BG}
                $border={t.border}
                $borderImage={t.borderImage}
              />
              <RaceName>{t.name}</RaceName>
              <RaceDesc>{t.desc}</RaceDesc>
            </RaceCard>
          ))}
        </RaceGrid>
        <OtherSection>
          <OtherLabel>or:</OtherLabel>
          {otherThemes.map((t) => (
            <OtherButton key={t.id} onClick={() => setThemeId(t.id)}>
              {t.name}
            </OtherButton>
          ))}
        </OtherSection>
      </Content>
    </Backdrop>
  );
};

export default RaceSelectOverlay;
