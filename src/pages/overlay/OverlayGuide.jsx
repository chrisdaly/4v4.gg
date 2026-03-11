import React from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";

const Page = styled.div`
  background: #0a0a0a;
  min-height: 100vh;
  padding: var(--space-6);
  color: var(--white);
  max-width: 800px;
  margin: 0 auto;
`;

const BackLink = styled(Link)`
  display: inline-block;
  margin-bottom: var(--space-4);
  color: var(--grey-light);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  text-decoration: none;

  &:hover {
    color: var(--gold);
  }
`;

const Title = styled.h1`
  font-family: var(--font-display);
  font-size: var(--text-xl);
  color: var(--gold);
  margin: 0 0 var(--space-6) 0;
`;

const Section = styled.section`
  margin-bottom: var(--space-6);
`;

const SectionTitle = styled.h2`
  font-family: var(--font-display);
  font-size: var(--text-lg);
  color: var(--white);
  margin: 0 0 var(--space-3) 0;
`;

const Text = styled.p`
  color: var(--grey-light);
  font-size: var(--text-sm);
  line-height: 1.6;
  margin: 0 0 var(--space-3) 0;
`;

const StepList = styled.ol`
  list-style: none;
  padding: 0;
  margin: 0;
  counter-reset: step;
`;

const Step = styled.li`
  counter-increment: step;
  margin-bottom: var(--space-4);
  padding-left: var(--space-8);
  position: relative;

  &::before {
    content: counter(step);
    position: absolute;
    left: 0;
    top: 0;
    width: 28px;
    height: 28px;
    background: var(--gold);
    color: #000;
    border-radius: 50%;
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
  }
`;

const StepTitle = styled.h3`
  font-family: var(--font-display);
  font-size: var(--text-base);
  color: var(--white);
  margin: 0 0 var(--space-1) 0;
`;

const StepText = styled.p`
  color: var(--grey-light);
  font-size: var(--text-sm);
  margin: 0;
  line-height: 1.5;
`;

const Code = styled.code`
  display: block;
  padding: var(--space-3);
  background: var(--grey-dark);
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--green);
  margin-top: var(--space-2);
  word-break: break-all;
`;

const Tip = styled.div`
  background: rgba(252, 219, 51, 0.1);
  border-left: 3px solid var(--gold);
  padding: var(--space-3);
  margin-top: var(--space-3);
  font-size: var(--text-sm);
  color: var(--grey-light);
`;

const OverlayGuide = () => {
  return (
    <Page>
      <BackLink to="/overlay">← Back to Overlay Setup</BackLink>

      <Title>OBS Setup Guide</Title>

      <Section>
        <Text>
          This guide will help you add the 4v4.gg match overlay to your stream using OBS Studio or Streamlabs.
        </Text>
      </Section>

      <Section>
        <SectionTitle>Adding the Overlay</SectionTitle>

        <StepList>
          <Step>
            <StepTitle>Open OBS Sources</StepTitle>
            <StepText>
              In OBS, click the + button under "Sources" in your scene.
            </StepText>
          </Step>

          <Step>
            <StepTitle>Add Browser Source</StepTitle>
            <StepText>
              Select "Browser" from the source types. Give it a name like "4v4.gg Overlay".
            </StepText>
          </Step>

          <Step>
            <StepTitle>Configure the URL</StepTitle>
            <StepText>
              Paste your overlay URL from the setup page. It should look like:
            </StepText>
            <Code>https://4v4.gg/overlay/match/YourTag%231234?style=default</Code>
          </Step>

          <Step>
            <StepTitle>Set Dimensions</StepTitle>
            <StepText>
              For horizontal layout: Width 1200, Height 200<br />
              For vertical layout: Width 240, Height 450
            </StepText>
          </Step>

          <Step>
            <StepTitle>Add Custom CSS</StepTitle>
            <StepText>
              In the "Custom CSS" field, add this to make the background transparent:
            </StepText>
            <Code>body {"{"} background: transparent !important; {"}"}</Code>
          </Step>

          <Step>
            <StepTitle>Position the Overlay</StepTitle>
            <StepText>
              Click "OK" then drag the overlay to your preferred position. The horizontal layout works well at the top of your stream, while vertical works well on the side.
            </StepText>
          </Step>
        </StepList>
      </Section>

      <Section>
        <SectionTitle>How It Works</SectionTitle>
        <Text>
          The overlay automatically detects when you're in a 4v4 game and shows the match info. When you're not in a game, the overlay shows nothing (fully transparent), so you can leave it enabled all the time.
        </Text>
        <Tip>
          The overlay refreshes every 30 seconds to check for new games. It may take up to a minute after your game starts for the overlay to appear.
        </Tip>
      </Section>

      <Section>
        <SectionTitle>Troubleshooting</SectionTitle>
        <Text>
          <strong>Overlay not showing?</strong> Make sure your battle tag is correct and includes the # and numbers (e.g., Player#1234). The tag is case-sensitive.
        </Text>
        <Text>
          <strong>Background not transparent?</strong> Double-check the custom CSS is added. You can also try unchecking "Shutdown source when not visible" in the browser source settings.
        </Text>
        <Text>
          <strong>Wrong team on left?</strong> The overlay automatically puts your team on the left side. If this isn't working, verify your battle tag matches exactly what's shown on W3Champions.
        </Text>
      </Section>
    </Page>
  );
};

export default OverlayGuide;
