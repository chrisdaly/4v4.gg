import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
import {
  tokenise, lexicalVectors, cosine, centroid, segmentTopics, groupSegments,
} from '../../server/src/topicSegments.js';

const turn = (name, text, day, i) => ({
  id: `${day}-${i}`,
  received_at: `2026-09-2${day} 10:${String(i).padStart(2, '0')}:00`,
  user_name: name,
  battle_tag: `${name}#1`,
  message: text,
});

const PAUSE = [
  'pause if u are afk', 'he asked for a pause fool', 'pause abuse reported',
  'unpaused each time 5 times', 'honor the pause please', 'the next pauses are pause abuse',
];
const GFX = [
  'unplayable these graphics', 'DE graphics sadly unplayable', 'how do u turn new graphics off',
  'going back to Classic GRAPHICS', 'graphics look worse now', 'classic graphics much better',
];
const HERO = [
  'what you think of new hero forsaken paladin', 'does forsaken paladine heal air units',
  'i dont see forsaken paladin in hotkeys', 'forsaken paladin lv 6 imba',
  'paladin hero is strong', 'new paladin broken',
];

describe('tokenise', () => {
  it('drops filler and keeps battle tags', () => {
    expect(tokenise('you are just like the GG xd')).toEqual([]);
    expect(tokenise('report xlrenxuanwei#3229 please')).toContain('xlrenxuanwei#3229');
  });

  it('keeps non-English words, since a fifth of the chat is not English', () => {
    expect(tokenise('kennst du die Covid folge')).toContain('kennst');
    expect(tokenise('ta lose ton side sale merde')).toContain('merde');
    expect(tokenise('заходи играть')).toContain('заходи');
  });

  it('strips links, which are not words', () => {
    expect(tokenise('see https://w3champions.com/match/abc123 there')).toEqual(['see', 'there']);
  });
});

describe('vectors', () => {
  it('scores two ways of saying one thing closer than two subjects', () => {
    const [a, b, c] = lexicalVectors([
      'these graphics are unplayable', 'the graphics look unplayable to me', 'pause abuse reported',
    ]);
    expect(cosine(a, b)).toBeGreaterThan(cosine(a, c));
  });

  it('gives an empty text an empty vector and no similarity', () => {
    const [v] = lexicalVectors(['']);
    expect(v.size).toBe(0);
    expect(cosine(v, v)).toBe(0);
  });

  it('centroid of one vector is that vector', () => {
    const [v] = lexicalVectors(['pause abuse reported again']);
    expect(cosine(centroid([v]), v)).toBeCloseTo(1, 5);
  });
});

describe('segmentTopics', () => {
  const stream = () => {
    const turns = [];
    let i = 0;
    for (const t of PAUSE) turns.push(turn(`P${i % 4}`, t, 1, i++));
    for (const t of GFX) turns.push(turn(`G${i % 4}`, t, 1, i++));
    for (const t of HERO) turns.push(turn(`H${i % 4}`, t, 1, i++));
    return turns;
  };

  it('cuts where the subject changes, not where the traffic pauses', () => {
    const segs = segmentTopics(stream(), { window: 3, minTurns: 3 });
    expect(segs).toHaveLength(3);
    expect(segs.map((s) => s.terms[0])).toEqual(['pause', 'graphics', 'paladin']);
    expect(segs.map((s) => s.turns)).toEqual([6, 6, 6]);
  });

  it('labels each piece with what makes it itself', () => {
    const [first] = segmentTopics(stream(), { window: 3, minTurns: 3 });
    expect(first.terms).toContain('pause');
    expect(first.terms).not.toContain('graphics');
    expect(first.speakers).toBeGreaterThan(1);
    expect(first.lines).toHaveLength(6);
  });

  it('leaves one subject in one piece', () => {
    const turns = PAUSE.concat(PAUSE).map((t, i) => turn(`P${i % 4}`, t, 1, i));
    expect(segmentTopics(turns, { window: 3, minTurns: 3 })).toHaveLength(1);
  });

  it('does not try to segment what it cannot', () => {
    expect(segmentTopics([])).toEqual([]);
    expect(segmentTopics(null)).toEqual([]);
    expect(segmentTopics([turn('A', 'one message', 1, 0)])).toHaveLength(1);
  });
});

describe('groupSegments', () => {
  it('rejoins a subject that came back days later with a new cast', () => {
    const turns = [];
    PAUSE.forEach((t, i) => turns.push(turn(`A${i % 3}`, t, 1, i)));
    GFX.forEach((t, i) => turns.push(turn(`B${i % 3}`, t, 3, i)));
    PAUSE.forEach((t, i) => turns.push(turn(`C${i % 3}`, t.replace('fool', 'idiot'), 5, i)));

    const groups = groupSegments(segmentTopics(turns, { window: 3, minTurns: 3 }), { threshold: 0.3 });
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ conversations: 2, days: 2 });
    expect(groups[0].terms).toContain('pause');
    expect(groups[0].why).toContain('2 separate conversations');
  });

  it('keeps a one-off conversation out, since one argument is not a story', () => {
    const turns = GFX.map((t, i) => turn(`B${i % 3}`, t, 1, i));
    expect(groupSegments(segmentTopics(turns, { window: 3, minTurns: 3 }))).toEqual([]);
  });

  it('counts the whole cast across every time it came up', () => {
    const turns = [];
    PAUSE.forEach((t, i) => turns.push(turn(`A${i % 3}`, t, 1, i)));
    GFX.forEach((t, i) => turns.push(turn(`X${i % 3}`, t, 2, i)));
    PAUSE.forEach((t, i) => turns.push(turn(`C${i % 3}`, t, 3, i)));
    const [g] = groupSegments(segmentTopics(turns, { window: 3, minTurns: 3 }), { threshold: 0.3 });
    expect(g.speakers).toBe(6);
  });

  it('handles nothing', () => {
    expect(groupSegments([])).toEqual([]);
    expect(groupSegments(null)).toEqual([]);
  });
});

/**
 * The sentence-model path, exercised on vectors the real model actually
 * produced: 40 chat lines across four subjects, embedded with
 * multilingual-e5-small and mean-centred, saved rather than recomputed so the
 * test needs no model. Two of the lines are German and French, which is the
 * whole reason for a multilingual model.
 */
describe('segmentTopics with sentence vectors', () => {
  const fixture = JSON.parse(
    readFileSync(resolve(__dirname, 'fixtures/e5-centered.json'), 'utf8'),
  );
  const byText = new Map(fixture.texts.map((t, i) => [t, Float32Array.from(fixture.vectors[i])]));
  const vectorise = (texts) => texts.map((t) => byText.get(t) || new Float32Array(384));
  vectorise.minDepth = 0.5;
  vectorise.groupThreshold = 0.12;

  const turns = fixture.texts.map((t, i) => ({
    id: i,
    received_at: `2026-09-21 10:${String(i).padStart(2, '0')}:00`,
    user_name: `P${i % 4}`,
    battle_tag: `P${i % 4}#1`,
    message: t,
  }));

  it('finds the four subjects and cuts exactly at their edges', () => {
    const segs = segmentTopics(turns, { vectorise });
    expect(segs).toHaveLength(4);
    expect(segs.map((s) => s.from)).toEqual([0, 10, 20, 30]);
  });

  it('separates subjects a bag of words cannot', () => {
    // "diese Grafik ist unspielbar" shares no word with the English graphics
    // talk, and "il a quitte la partie tot encore" none with the leaver talk
    const segs = segmentTopics(turns, { vectorise });
    const forGerman = segs.find((s) => s.lines.some((l) => l.text.includes('diese Grafik')));
    expect(forGerman.lines.some((l) => l.text.includes('graphics'))).toBe(true);
    const forFrench = segs.find((s) => s.lines.some((l) => l.text.includes('il a quitte')));
    expect(forFrench.lines.some((l) => l.text.includes('early leave'))).toBe(true);
  });

  it('does not merge four different subjects into one group', () => {
    const groups = groupSegments(segmentTopics(turns, { vectorise }), {
      threshold: vectorise.groupThreshold, minSegments: 1,
    });
    expect(groups.length).toBeGreaterThan(1);
  });

  it('reads a dense vector the same way as a sparse one', () => {
    const a = byText.get('unplayable these graphics');
    const b = byText.get('diese Grafik ist unspielbar');
    const c = byText.get('another early leave by xlren');
    expect(cosine(a, b)).toBeGreaterThan(cosine(a, c));
    expect(cosine(centroid([a, b]), a)).toBeGreaterThan(0);
  });
});

/**
 * Four defects the first real run on the week of 2026-09-21 showed, each kept
 * here because none of them appeared on synthetic data.
 */
describe('defects from the first real week', () => {
  it('does not turn a language into a subject', () => {
    // Two of the top five "subjects" came back as "est, pas, que, toi" and
    // "ich, das, der, auf", because the stop list was English only
    expect(tokenise('est pas que toi')).toEqual([]);
    expect(tokenise('ich das der auf die')).toEqual([]);
    expect(tokenise('los las por para con')).toEqual([]);
    expect(tokenise('что как это для или')).toEqual([]);
  });

  it('strips every copy of the client furniture, not just the first', () => {
    // A non-global regex replaced one occurrence, so a multi-line paste still
    // produced "message, hidden, show, from, blocked, player" as a subject
    const paste = 'o11ec Sep 21 - 16:20 Message hidden from blocked player '
      + 'Show message lumos Sep 21 - 16:20 Message hidden from blocked player';
    expect(tokenise(paste)).toEqual(['o11ec', 'lumos']);
  });

  it('drops the timestamp header the client puts above a quote', () => {
    // "sep" ranked as a topic word in a week that started in September
    expect(tokenise('GazanResolve Sep 23 - 00:50 pause abuse')).toEqual(['gazanresolve', 'pause', 'abuse']);
  });

  it('refuses a group that has swallowed the week', () => {
    // The largest group was 37 conversations, 124 people and all 7 days,
    // labelled "game, mmr, dont, base, side, play": that is people talking
    const wide = Array.from({ length: 30 }, (_, i) => ({
      from: i, to: i + 1, turns: 5, speakers: 3, cast: [`P${i}`],
      startedAt: `2026-09-2${1 + (i % 7)} 10:00:00`, endedAt: null,
      terms: ['game'], centroid: new Map([['game', 1]]), lines: [],
    }));
    expect(groupSegments(wide, { threshold: 0.3 })).toEqual([]);
    expect(groupSegments(wide.slice(0, 5), { threshold: 0.3 })).toHaveLength(1);
  });
});
