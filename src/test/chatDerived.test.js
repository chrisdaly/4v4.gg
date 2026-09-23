import { describe, it, expect } from 'vitest';
import {
  createFeedIndex,
  updateFeedIndex,
  recentChattersFrom,
  inGameTagsFrom,
  ongoingIndexFrom,
} from '../lib/chat/derived';
import { indexBotResponses } from '../lib/useChatMessages';

const T0 = Date.parse('2026-09-23T12:00:00Z');
const iso = (offsetMs) => new Date(T0 + offsetMs).toISOString();
const msg = (id, tag, offsetMs, extra = {}) => ({
  id, battleTag: tag, userName: tag.split('#')[0], clanTag: '', text: 'hi',
  sentAt: iso(offsetMs), receivedAt: null, deleted: false, kind: 'message', ...extra,
});

describe('updateFeedIndex', () => {
  it('indexes authors and their newest message time', () => {
    const index = createFeedIndex();
    const { lastChatAt, messageTags } = updateFeedIndex(index, [
      msg('1', 'A#1', 0), msg('2', 'B#2', 1000), msg('3', 'A#1', 5000),
    ]);
    expect([...messageTags]).toEqual(['A#1', 'B#2']);
    expect(lastChatAt.get('A#1')).toBe(T0 + 5000);
    expect(lastChatAt.get('B#2')).toBe(T0 + 1000);
  });

  it('keeps identity when nothing changed, updates on new tail', () => {
    const index = createFeedIndex();
    const list = [msg('1', 'A#1', 0)];
    const first = updateFeedIndex(index, list);
    const again = updateFeedIndex(index, [...list]);
    expect(again.lastChatAt).toBe(first.lastChatAt);
    expect(again.messageTags).toBe(first.messageTags);

    const next = updateFeedIndex(index, [...list, msg('2', 'A#1', 9000)]);
    expect(next.lastChatAt).not.toBe(first.lastChatAt);
    expect(next.lastChatAt.get('A#1')).toBe(T0 + 9000);
  });

  it('picks up authors from prepended history without touching newest times', () => {
    const index = createFeedIndex();
    const live = [msg('10', 'A#1', 0)];
    updateFeedIndex(index, live);
    const { lastChatAt, messageTags } = updateFeedIndex(index, [msg('1', 'C#3', -60000), msg('2', 'A#1', -30000), ...live]);
    expect(messageTags.has('C#3')).toBe(true);
    expect(lastChatAt.get('A#1')).toBe(T0);
  });

  it('only visits unseen messages', () => {
    const index = createFeedIndex();
    const list = Array.from({ length: 50 }, (_, i) => msg(`m${i}`, `P${i % 5}#0`, i * 1000));
    updateFeedIndex(index, list);
    const seenBefore = index.seen.size;
    const trimmed = list.slice(10); // cap trimmed the head
    updateFeedIndex(index, [...trimmed, msg('new', 'Z#9', 99000)]);
    expect(index.seen.size).toBe(seenBefore + 1);
    expect(index.tags.has('Z#9')).toBe(true);
  });

  it('ignores system rows', () => {
    const index = createFeedIndex();
    const { messageTags } = updateFeedIndex(index, [msg('s', 'system', 0, { kind: 'system' }), msg('e', '', 0, { kind: 'system' })]);
    expect(messageTags.size).toBe(0);
  });
});

describe('recentChattersFrom / inGameTagsFrom', () => {
  const lastChatAt = new Map([
    ['Fresh#1', T0 - 30_000],
    ['Recent#2', T0 - 5 * 60_000],
    ['Old#3', T0 - 11 * 60_000],
  ]);

  it('recent chatters = within 10 minutes', () => {
    expect([...recentChattersFrom(lastChatAt, T0)].sort()).toEqual(['Fresh#1', 'Recent#2']);
  });

  it('in-game tags drop anyone who chatted in the last minute', () => {
    const ongoing = [{ teams: [{ players: [{ battleTag: 'Fresh#1' }, { battleTag: 'Recent#2' }] }, { players: [{ battleTag: 'Quiet#4' }] }] }];
    expect([...inGameTagsFrom(ongoing, lastChatAt, T0)].sort()).toEqual(['Quiet#4', 'Recent#2']);
  });

  it('ongoingIndexFrom builds the per-player lookups', () => {
    const ongoing = [{ id: 'm1', mapName: 'Ferocity', startTime: 's', teams: [{ players: [{ battleTag: 'A#1' }] }] }];
    const { inGameInfoMap, inGameMatchMap, ongoingMatchIds } = ongoingIndexFrom(ongoing);
    expect(inGameInfoMap.get('A#1')).toEqual({ mapName: 'Ferocity', startTime: 's', matchId: 'm1' });
    expect(inGameMatchMap.get('A#1')).toBe('/player/A%231');
    expect([...ongoingMatchIds]).toEqual(['m1']);
  });
});

describe('indexBotResponses', () => {
  it('maps each response to the newest matching command message in one pass', () => {
    const messages = [
      msg('1', 'A#1', 0, { text: '!stats grubby' }),
      msg('2', 'B#2', 1000, { text: '!games' }),
      msg('3', 'A#1', 2000, { text: '!stats moon' }),
      msg('4', 'A#1', 3000, { text: 'not a command' }),
    ];
    const brA = { command: '!stats', triggeredByTag: 'A#1', response: 'x' };
    const brB = { command: '!games', triggeredByTag: 'B#2', response: 'y' };
    const brNone = { command: '!help', triggeredByTag: 'C#3', response: 'z' };
    const { botResponseMap, unmatchedBotResponses } = indexBotResponses([brA, brB, brNone], messages);
    expect(botResponseMap.get('3')).toBe(brA);
    expect(botResponseMap.has('1')).toBe(false);
    expect(botResponseMap.get('2')).toBe(brB);
    expect(unmatchedBotResponses).toEqual([brNone]);
  });
});
