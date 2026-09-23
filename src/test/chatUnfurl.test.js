import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { detectUnfurl, fetchUnfurl, resetUnfurlCache } from '../lib/chat/unfurl';

describe('detectUnfurl', () => {
  it('finds clips.twitch.tv slugs', () => {
    expect(detectUnfurl('look https://clips.twitch.tv/AbcDef-123_xyz lol')).toEqual({
      kind: 'twitch', id: 'AbcDef-123_xyz', url: 'https://clips.twitch.tv/AbcDef-123_xyz', host: 'clips.twitch.tv',
    });
    expect(detectUnfurl('https://clips.twitch.tv/Slug?featured=false')).toMatchObject({ kind: 'twitch', id: 'Slug' });
  });

  it('finds twitch.tv/<channel>/clip/<slug> URLs', () => {
    expect(detectUnfurl('https://www.twitch.tv/grubby/clip/HappyClip-abc')).toMatchObject({ kind: 'twitch', id: 'HappyClip-abc' });
    expect(detectUnfurl('https://m.twitch.tv/grubby/clip/HappyClip-abc?x=1')).toMatchObject({ kind: 'twitch', id: 'HappyClip-abc' });
  });

  it('ignores twitch channel and video links', () => {
    expect(detectUnfurl('https://twitch.tv/grubby')).toBeNull();
    expect(detectUnfurl('https://www.twitch.tv/videos/12345')).toBeNull();
    expect(detectUnfurl('https://twitch.tv/clip/')).toBeNull();
  });

  it('finds youtube.com/watch?v= and youtu.be links', () => {
    expect(detectUnfurl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10')).toEqual({
      kind: 'youtube', id: 'dQw4w9WgXcQ', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', host: 'youtube.com',
    });
    expect(detectUnfurl('https://youtu.be/dQw4w9WgXcQ?si=abc')).toMatchObject({ kind: 'youtube', id: 'dQw4w9WgXcQ' });
    expect(detectUnfurl('https://youtube.com/shorts/dQw4w9WgXcQ')).toMatchObject({ kind: 'youtube', id: 'dQw4w9WgXcQ' });
  });

  it('rejects malformed youtube ids and other hosts', () => {
    expect(detectUnfurl('https://www.youtube.com/watch?v=short')).toBeNull();
    expect(detectUnfurl('https://www.youtube.com/channel/UC123')).toBeNull();
    expect(detectUnfurl('https://example.com/watch?v=dQw4w9WgXcQ')).toBeNull();
  });

  it('returns the first supported URL only and null for plain text', () => {
    const two = detectUnfurl('https://youtu.be/dQw4w9WgXcQ and https://clips.twitch.tv/Second');
    expect(two).toMatchObject({ kind: 'youtube' });
    expect(detectUnfurl('https://example.com then https://clips.twitch.tv/Second')).toMatchObject({ kind: 'twitch', id: 'Second' });
    expect(detectUnfurl('no links here')).toBeNull();
    expect(detectUnfurl('')).toBeNull();
    expect(detectUnfurl(null)).toBeNull();
  });
});

describe('fetchUnfurl', () => {
  beforeEach(() => {
    resetUnfurlCache();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('asks the relay for twitch clips and caches per id', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ title: 'Big play', thumbnail_url: 'https://t/x.jpg', broadcaster_name: 'Grubby', url: 'https://clips.twitch.tv/Slug' }),
    });
    const target = detectUnfurl('https://clips.twitch.tv/Slug');
    const a = await fetchUnfurl(target);
    const b = await fetchUnfurl(target);
    expect(a).toEqual({ title: 'Big play', thumbnail: 'https://t/x.jpg', author: 'Grubby', url: 'https://clips.twitch.tv/Slug' });
    expect(b).toBe(a);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/api\/twitch\/clip\/Slug$/);
  });

  it('uses the public oEmbed endpoint for youtube', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ title: 'Never', thumbnail_url: 'https://i.ytimg.com/x.jpg', author_name: 'Rick' }),
    });
    const meta = await fetchUnfurl(detectUnfurl('https://youtu.be/dQw4w9WgXcQ'));
    expect(meta).toEqual({ title: 'Never', thumbnail: 'https://i.ytimg.com/x.jpg', author: 'Rick', url: null });
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url.startsWith('https://www.youtube.com/oembed?url=')).toBe(true);
    expect(url).toContain(encodeURIComponent('https://www.youtube.com/watch?v=dQw4w9WgXcQ'));
    expect(url).toContain('format=json');
  });

  it('resolves null on failures and caches the miss', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    const target = detectUnfurl('https://clips.twitch.tv/Gone');
    expect(await fetchUnfurl(target)).toBeNull();
    expect(await fetchUnfurl(target)).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(await fetchUnfurl(null)).toBeNull();
  });
});
