import styled from 'styled-components';

const PageOuter = styled.div`
  min-height: ${props => props.$fullHeight ? 'calc(100vh - 52px)' : '100vh'};
  padding: 64px 32px 96px;
  ${props => props.$fullHeight && `
    display: flex;
    flex-direction: column;
  `}
  ${props => props.$overlay && `
    background: rgba(10, 8, 6, 0.6);
    backdrop-filter: blur(12px);
  `}

  @media (max-width: 600px) {
    padding: 32px 16px 64px;
  }
`;

const HeaderWrap = styled.div`
  max-width: ${props => props.$maxWidth || "1200px"};
  margin: 0 auto;
`;

const ThemedBox = styled.div`
  background: var(--theme-bg, var(--surface-1));
  border: var(--theme-border, 1px solid var(--grey-mid));
  border-image: var(--theme-border-image, none);
  border-radius: 12px;
  max-width: ${props => props.$maxWidth || "1200px"};
  margin: 0 auto;
  backdrop-filter: var(--theme-blur, none);
  box-shadow: var(--theme-shadow, none);
  padding: var(--space-4);
  ${props => props.$fullHeight && `
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  `}
`;

/**
 * PageLayout — standardized page wrapper with theme support.
 *
 * @param {string}  maxWidth  — themed container max-width (default "1200px")
 * @param {boolean} fullHeight — fill viewport height (for scrollable content like Ladder)
 * @param {boolean} bare — skip ThemedBox, render children directly (for pages with per-item theming)
 * @param {boolean} overlay — dark frosted overlay background
 * @param {React.ReactNode} header — content above the themed container (e.g. page title, filters)
 * @param {string}  className — extra class on the themed container
 * @param {React.ReactNode} children — content inside the themed container
 */
export const PageLayout = ({ maxWidth, fullHeight, bare, overlay, header, className, children }) => (
  <PageOuter $fullHeight={fullHeight} $overlay={overlay}>
    {header && (
      <HeaderWrap $maxWidth={maxWidth}>
        {header}
      </HeaderWrap>
    )}
    {bare ? (
      children
    ) : (
      <ThemedBox $maxWidth={maxWidth} $fullHeight={fullHeight} className={className}>
        {children}
      </ThemedBox>
    )}
  </PageOuter>
);

/**
 * PageHero — shared eyebrow / title / lead block for page headers.
 *
 * @param {string}          eyebrow   — small uppercase label above the title
 * @param {React.ReactNode} title     — heading (string or JSX)
 * @param {string}          lead      — subtitle paragraph
 * @param {boolean}         lg        — larger title variant (for editorial pages)
 * @param {string}          className — extra class on the wrapper
 * @param {React.ReactNode} children  — extra content below the lead (e.g. tabs)
 */
const HeroWrap = styled.header`
  margin-bottom: var(--space-8);
`;

const HeroEyebrow = styled.span`
  text-transform: uppercase;
  letter-spacing: 0.32em;
  font-size: 0.75rem;
  color: var(--gold);
  font-family: var(--font-mono);
`;

const HeroTitle = styled.h1`
  font-family: var(--font-display);
  font-size: ${props => props.$lg ? 'clamp(2.4rem, 5.5vw, 3.8rem)' : 'clamp(2rem, 5vw, 3.2rem)'};
  color: var(--gold);
  line-height: 1.1;
  margin: 16px 0;
  font-weight: normal;
  text-shadow: 0 2px 16px rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  gap: var(--space-2);
`;

const HeroLead = styled.p`
  font-family: var(--font-body);
  font-size: 1.05rem;
  color: var(--grey-light);
  max-width: 55ch;
  line-height: 1.6;
  margin: 0 0 var(--space-2) 0;
`;

export const PageHero = ({ eyebrow, title, lead, lg, className, children }) => (
  <HeroWrap className={className}>
    {eyebrow && <HeroEyebrow>{eyebrow}</HeroEyebrow>}
    {title && <HeroTitle $lg={lg}>{title}</HeroTitle>}
    {lead && <HeroLead>{lead}</HeroLead>}
    {children}
  </HeroWrap>
);

export default PageLayout;
