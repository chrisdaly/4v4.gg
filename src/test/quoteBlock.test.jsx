import { describe, it, expect, afterEach } from 'vitest';
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import QuoteBlock, { quoteGroupsFromStrings } from '../components/chat/QuoteBlock';

afterEach(cleanup);

describe('QuoteBlock', () => {
  it('maps "Speaker: text" strings into ChatMessage quote groups', () => {
    const groups = quoteGroupsFromStrings(['ToD: gg wp', 'ToD: human mirror is pain', 'Mubarak: lucky expo', 'unattributed line']);
    expect(groups).toEqual([
      { author: { userName: 'ToD' }, lines: [{ text: 'gg wp' }, { text: 'human mirror is pain' }] },
      { author: { userName: 'Mubarak' }, lines: [{ text: 'lucky expo' }] },
      { author: { userName: '' }, lines: [{ text: 'unattributed line' }] },
    ]);
  });

  it('renders each group through the quote variant: plain-text names, blockquotes, no avatar', () => {
    render(
      <MemoryRouter>
        <QuoteBlock quotes={['ToD: gg wp', 'ToD: human mirror is pain', 'Mubarak: lucky expo']} />
      </MemoryRouter>
    );
    const groups = document.querySelectorAll('[data-variant="quote"]');
    expect(groups.length).toBe(2);
    expect(document.querySelectorAll('blockquote').length).toBe(3);
    expect(screen.getByText('gg wp').tagName).toBe('BLOCKQUOTE');
    // digest quotes carry names only, so the name is text, not a /player link
    const name = screen.getByText('ToD');
    expect(name.tagName).toBe('SPAN');
    expect(document.querySelector('a[href^="/player/"]')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
  });

  it('renders unattributed quotes with no header and nothing for an empty list', () => {
    const { container } = render(
      <MemoryRouter>
        <QuoteBlock quotes={['gg wp that was close']} />
      </MemoryRouter>
    );
    const group = container.querySelector('[data-variant="quote"]');
    expect(group.querySelector('blockquote')).not.toBeNull();
    expect(group.querySelector('a, span')).toBeNull();
    cleanup();
    const empty = render(<MemoryRouter><QuoteBlock quotes={[]} /></MemoryRouter>);
    expect(empty.container.innerHTML).toBe('');
  });
});
