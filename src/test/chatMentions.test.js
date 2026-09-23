import { describe, it, expect } from 'vitest';
import { findWatchedMentions, splitByMentions, watchedNames } from '../lib/chat/mentions';

const watch = new Set(['moon#2', 'grubby#1', 'кулкулкул#2718', 'xi#9']);

describe('findWatchedMentions', () => {
  it('matches the name part before # as a whole word, case-insensitively', () => {
    expect(findWatchedMentions('gg MOON nice game', watch)).toEqual([{ start: 3, end: 7, name: 'MOON' }]);
    expect(findWatchedMentions('moon', watch)).toEqual([{ start: 0, end: 4, name: 'moon' }]);
    expect(findWatchedMentions('@Moon rematch?', watch)).toEqual([{ start: 1, end: 5, name: 'Moon' }]);
  });

  it('does not match inside other words', () => {
    expect(findWatchedMentions('moonlight sonata', watch)).toEqual([]);
    expect(findWatchedMentions('honeymoon', watch)).toEqual([]);
    expect(findWatchedMentions('moon2', watch)).toEqual([]);
    expect(findWatchedMentions('Moon_x', watch)).toEqual([]);
  });

  it('returns every mention in text order without overlaps', () => {
    const out = findWatchedMentions('Grubby vs Moon, then moon again', watch);
    expect(out.map((m) => m.name)).toEqual(['Grubby', 'Moon', 'moon']);
    expect(out[0]).toEqual({ start: 0, end: 6, name: 'Grubby' });
  });

  it('handles non-Latin names and word boundaries', () => {
    expect(findWatchedMentions('gg кулкулкул wp', watch)).toHaveLength(1);
    expect(findWatchedMentions('кулкулкулx', watch)).toEqual([]);
  });

  it('ignores names shorter than 3 characters and empty inputs', () => {
    expect(findWatchedMentions('xi is here', watch)).toEqual([]);
    expect(findWatchedMentions('', watch)).toEqual([]);
    expect(findWatchedMentions('moon', new Set())).toEqual([]);
    expect(findWatchedMentions('moon', null)).toEqual([]);
  });

  it('escapes regex characters in names', () => {
    const w = new Set(['a.b(c)#1']);
    expect(findWatchedMentions('hi a.b(c) there', w)).toEqual([{ start: 3, end: 9, name: 'a.b(c)' }]);
    expect(findWatchedMentions('hi aXb(c) there', w)).toEqual([]);
  });

  it('prefers the longer name when one is a prefix of another', () => {
    const w = new Set(['moon#2', 'moonlight#3']);
    expect(watchedNames(w)).toEqual(['moonlight', 'moon']);
    expect(findWatchedMentions('Moonlight and Moon', w).map((m) => m.name)).toEqual(['Moonlight', 'Moon']);
  });
});

describe('splitByMentions', () => {
  it('splits text into strings and mention runs', () => {
    expect(splitByMentions('gg Moon, nice', watch)).toEqual(['gg ', { mention: 'Moon' }, ', nice']);
    expect(splitByMentions('Moon', watch)).toEqual([{ mention: 'Moon' }]);
    expect(splitByMentions('nothing here', watch)).toEqual(['nothing here']);
  });
});
