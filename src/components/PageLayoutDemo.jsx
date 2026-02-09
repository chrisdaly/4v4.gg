import React from 'react';
import { PageLayout } from './ui';
import { H1, H2, Text, Card, Button } from './ui';

/**
 * PageLayoutDemo - Example usage of PageLayout component
 *
 * This demo shows how pages can use PageLayout instead of
 * custom CSS for consistent padding and theme support.
 */
const PageLayoutDemo = () => {
  return (
    <PageLayout maxWidth="900px">
      <div style={{ padding: '40px' }}>
        <H1>PageLayout Demo</H1>
        <Text $muted style={{ marginBottom: '24px' }}>
          This demonstrates the new PageLayout component with theme variables
        </Text>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <Card>
            <H2>Feature Overview</H2>
            <Text>
              PageLayout provides standardized page containers with:
            </Text>
            <ul style={{ color: 'var(--grey-light)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)' }}>
              <li>Consistent padding: 0 20px 40px 20px</li>
              <li>Theme variables: --theme-bg, --theme-border, --theme-blur, etc.</li>
              <li>Responsive max-width with auto centering</li>
              <li>12px border radius and backdrop-filter</li>
              <li>min-height: 100vh coverage</li>
            </ul>
          </Card>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Card>
              <H2>Before</H2>
              <Text $muted style={{ fontSize: 'var(--text-sm)' }}>
                Each page had custom CSS for padding and theming
              </Text>
            </Card>

            <Card>
              <H2>After</H2>
              <Text $muted style={{ fontSize: 'var(--text-sm)' }}>
                Single PageLayout component handles all styling
              </Text>
            </Card>
          </div>

          <div style={{ textAlign: 'center', marginTop: '32px' }}>
            <Button $primary>This page uses PageLayout!</Button>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default PageLayoutDemo;