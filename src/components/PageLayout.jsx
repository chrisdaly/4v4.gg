import styled from 'styled-components';

const PageOuter = styled.div`
  min-height: 100vh;
  padding: 0 20px 40px 20px;
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
`;

/**
 * PageLayout — standardized page wrapper with theme support.
 *
 * @param {string}  maxWidth  — themed container max-width (default "1200px")
 * @param {React.ReactNode} header — content above the themed container (e.g. page title, filters)
 * @param {string}  className — extra class on the themed container
 * @param {React.ReactNode} children — content inside the themed container
 */
export const PageLayout = ({ maxWidth, header, className, children }) => (
  <PageOuter>
    {header}
    <ThemedBox $maxWidth={maxWidth} className={className}>
      {children}
    </ThemedBox>
  </PageOuter>
);

export default PageLayout;