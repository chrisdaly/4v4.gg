/**
 * Tests for the digest parsing functions in News.jsx.
 * These are extracted as local functions, so we re-implement
 * the same logic here for testing. If these are ever refactored
 * into a shared module, update imports accordingly.
 */
import { describe, it, expect } from 'vitest';

/* ── Re-create parsing functions (same logic as News.jsx) ─────── */

const ALL_SECTION_KEYS = [
  "TOPICS", "DRAMA", "BANS", "HIGHLIGHTS", "RECAP",
  "WINNER", "LOSER", "GRINDER", "HOTSTREAK", "COLDSTREAK",
  "MENTIONS",
];
const SECTION_RE = new RegExp(`^(${ALL_SECTION_KEYS.join("|")})\\s*:\\s*`, "gm");

const parseDigestSections = (text) => {
  const sections = [];
  const matches = [...text.matchAll(SECTION_RE)];
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const start = m.index + m[0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    const content = text.slice(start, end).trim();
    if (content) sections.push({ key: m[1], content });
  }
  return sections;
};

const parseMentions = (sections) => {
  const mentionsSection = sections.find((s) => s.key === "MENTIONS");
  if (!mentionsSection) return new Map();
  const map = new Map();
  for (const tag of mentionsSection.content.split(",")) {
    const trimmed = tag.trim();
    if (!trimmed) continue;
    const name = trimmed.split("#")[0];
    if (name) map.set(name, trimmed);
  }
  return map;
};

const parseStatLine = (content) => {
  const m = content.match(/^(.+?#\d+)\s+(.+?)\s+\((\d+)W-(\d+)L\)\s*([WL]*)$/);
  if (!m) return null;
  return {
    battleTag: m[1],
    name: m[1].split("#")[0],
    headline: m[2],
    wins: parseInt(m[3]),
    losses: parseInt(m[4]),
    form: m[5] || "",
  };
};

const QUOTE_RE = /"([^"]+)"/g;

const splitQuotes = (text) => {
  const quotes = [];
  let summary = text;
  for (const m of text.matchAll(QUOTE_RE)) {
    quotes.push(m[1]);
  }
  if (quotes.length > 0) {
    summary = text
      .replace(QUOTE_RE, "")
      .replace(/\btold him to\s*and\b/gi, "")
      .replace(/\bwhere \w+ told him\s*and\b/gi, "")
      .replace(/\bcalling him\s*$/gi, "")
      .replace(/\bcalling him\s+and\b/gi, "")
      .replace(/'\s+of\b/g, "'s")
      .replace(/\s*[—:,]\s*$/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  }
  return { summary, quotes };
};

const extractMentionedTags = (text, nameToTag) => {
  const tags = new Set();
  for (const [name, tag] of nameToTag) {
    if (name.length < 2) continue;
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`\\b${escaped}\\b`, "i");
    if (re.test(text)) {
      tags.add(tag);
    } else if (name.length >= 7) {
      const lower = text.toLowerCase();
      const nameLower = name.toLowerCase();
      for (const word of lower.split(/\W+/)) {
        if (word.length >= 6 && nameLower.startsWith(word)) {
          tags.add(tag);
          break;
        }
      }
    }
  }
  return [...tags];
};

/* ── Tests ────────────────────────────────────────────── */

describe('parseDigestSections', () => {
  it('parses a multi-section digest', () => {
    const text = `TOPICS: balance, maps, meta
DRAMA: PlayerA called PlayerB bad; PlayerC rage quit
HIGHLIGHTS: Amazing clutch by PlayerD
WINNER: Alice#1234 +42 MMR (5W-2L) WWLWW
MENTIONS: Alice#1234,PlayerA#5678`;

    const sections = parseDigestSections(text);
    expect(sections).toHaveLength(5);
    expect(sections[0].key).toBe('TOPICS');
    expect(sections[0].content).toBe('balance, maps, meta');
    expect(sections[1].key).toBe('DRAMA');
    expect(sections[1].content).toContain('PlayerA called PlayerB bad');
    expect(sections[3].key).toBe('WINNER');
    expect(sections[4].key).toBe('MENTIONS');
  });

  it('handles single section', () => {
    const text = 'TOPICS: nothing happened today';
    const sections = parseDigestSections(text);
    expect(sections).toHaveLength(1);
    expect(sections[0].content).toBe('nothing happened today');
  });

  it('skips empty sections', () => {
    const text = `TOPICS: hello
DRAMA:
HIGHLIGHTS: something cool`;
    const sections = parseDigestSections(text);
    const keys = sections.map(s => s.key);
    expect(keys).toContain('TOPICS');
    expect(keys).toContain('HIGHLIGHTS');
  });

  it('returns empty for plain text', () => {
    expect(parseDigestSections('just some random text')).toEqual([]);
  });
});

describe('parseMentions', () => {
  it('parses MENTIONS section into name→tag map', () => {
    const sections = [
      { key: 'TOPICS', content: 'stuff' },
      { key: 'MENTIONS', content: 'Alice#1234,Bob#5678,Carol#9999' },
    ];
    const map = parseMentions(sections);
    expect(map.get('Alice')).toBe('Alice#1234');
    expect(map.get('Bob')).toBe('Bob#5678');
    expect(map.get('Carol')).toBe('Carol#9999');
  });

  it('returns empty map when no MENTIONS section', () => {
    const sections = [{ key: 'TOPICS', content: 'stuff' }];
    expect(parseMentions(sections).size).toBe(0);
  });

  it('handles whitespace in tags', () => {
    const sections = [
      { key: 'MENTIONS', content: ' Alice#1234 , Bob#5678 ' },
    ];
    const map = parseMentions(sections);
    expect(map.get('Alice')).toBe('Alice#1234');
    expect(map.get('Bob')).toBe('Bob#5678');
  });
});

describe('parseStatLine', () => {
  it('parses a full stat line', () => {
    const result = parseStatLine('Alice#1234 +42 MMR (5W-2L) WWLWW');
    expect(result).toEqual({
      battleTag: 'Alice#1234',
      name: 'Alice',
      headline: '+42 MMR',
      wins: 5,
      losses: 2,
      form: 'WWLWW',
    });
  });

  it('parses negative MMR stat line', () => {
    const result = parseStatLine('Bob#5678 -35 MMR (2W-5L) LWLWWL');
    expect(result).toEqual({
      battleTag: 'Bob#5678',
      name: 'Bob',
      headline: '-35 MMR',
      wins: 2,
      losses: 5,
      form: 'LWLWWL',
    });
  });

  it('handles stat line without form string', () => {
    const result = parseStatLine('Carol#9999 8 games (5W-3L)');
    expect(result).toEqual({
      battleTag: 'Carol#9999',
      name: 'Carol',
      headline: '8 games',
      wins: 5,
      losses: 3,
      form: '',
    });
  });

  it('returns null for non-stat text', () => {
    expect(parseStatLine('just some random text')).toBeNull();
    expect(parseStatLine('')).toBeNull();
  });
});

describe('splitQuotes', () => {
  it('extracts quoted text', () => {
    const result = splitQuotes('PlayerA told PlayerB "you are bad" and "uninstall"');
    expect(result.quotes).toEqual(['you are bad', 'uninstall']);
    expect(result.summary).not.toContain('you are bad');
  });

  it('returns original text when no quotes', () => {
    const result = splitQuotes('PlayerA beat PlayerB');
    expect(result.summary).toBe('PlayerA beat PlayerB');
    expect(result.quotes).toEqual([]);
  });

  it('cleans trailing punctuation after quote removal', () => {
    const result = splitQuotes('PlayerA said: "hello"');
    expect(result.summary).not.toMatch(/:\s*$/);
  });
});

describe('extractMentionedTags', () => {
  const nameToTag = new Map([
    ['Alice', 'Alice#1234'],
    ['Bob', 'Bob#5678'],
    ['LongPlayerName', 'LongPlayerName#9999'],
  ]);

  it('finds exact name matches', () => {
    const tags = extractMentionedTags('Alice beat Bob in a game', nameToTag);
    expect(tags).toContain('Alice#1234');
    expect(tags).toContain('Bob#5678');
  });

  it('returns empty for no matches', () => {
    const tags = extractMentionedTags('nobody mentioned here', nameToTag);
    expect(tags).toEqual([]);
  });

  it('finds long name by prefix match', () => {
    const tags = extractMentionedTags('LongPl scored a great play', nameToTag);
    // "LongPl" is 6 chars and "LongPlayerName" starts with "longpl"
    expect(tags).toContain('LongPlayerName#9999');
  });

  it('skips very short names', () => {
    const shortMap = new Map([['A', 'A#1']]);
    const tags = extractMentionedTags('A won the game', shortMap);
    expect(tags).toEqual([]);
  });
});
