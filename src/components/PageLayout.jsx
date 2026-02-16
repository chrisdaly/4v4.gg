import styled from 'styled-components';

const PageOuter = styled.div`
  min-height: ${props => props.$fullHeight ? 'calc(100vh - 52px)' : '100vh'};
  padding: 0 20px 40px 20px;
  ${props => props.$fullHeight && `
    display: flex;
    flex-direction: column;
  `}
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
 * @param {React.ReactNode} header — content above the themed container (e.g. page title, filters)
 * @param {string}  className — extra class on the themed container
 * @param {React.ReactNode} children — content inside the themed container
 */
export const PageLayout = ({ maxWidth, fullHeight, bare, header, className, children }) => (
  <PageOuter $fullHeight={fullHeight}>
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

export default PageLayout;
