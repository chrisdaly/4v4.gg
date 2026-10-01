// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

// A real SQLite file, so this covers the migration, the column and every
// reader that has to carry a translation back out. The translation used to
// live only in an SSE broadcast: a reload or a scroll into history left
// every non-Latin line untranslated.
let dir;
let db;

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), '4v4-translate-'));
  process.env.DB_PATH = join(dir, 'chat.db');
  db = await import('../../server/src/db.js');
  db.initDb?.();
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

const message = (id, text) => ({
  id, battleTag: `Sasha#${id}`, userName: 'Sasha', message: text,
  sentAt: '2026-09-30T10:00:00.000Z', room: '4 vs 4',
});

describe('stored translations', () => {
  it('writes onto the message and hands it back with history and search', () => {
    db.insertMessage(message('t1', 'привет всем'));
    expect(db.setTranslation('t1', 'hello everyone')).toBe(true);

    const [history] = db.getMessages({ limit: 10 }).filter((m) => m.id === 't1');
    expect(history.translation).toBe('hello everyone');

    const [hit] = db.queryMessages({ q: 'привет', fields: 'message', sinceHours: null }, 10, 0);
    expect(hit.translation).toBe('hello everyone');
  });

  it('refuses an empty translation or an unknown message', () => {
    expect(db.setTranslation('t1', '')).toBe(false);
    expect(db.setTranslation('nope', 'hello')).toBe(false);
  });

  it('lists what still needs one, and stops listing it once it has one', () => {
    db.insertMessage(message('t2', '你好'));
    const waiting = () => db.untranslatedMessages(50).map((m) => m.id);
    expect(waiting()).toContain('t2');
    expect(waiting()).not.toContain('t1');
    db.setTranslation('t2', 'hi');
    expect(waiting()).not.toContain('t2');
  });
});
