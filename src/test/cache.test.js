import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cache, TTL, createCacheKey, fetchWithCache, fetchBatch } from '../lib/cache';

beforeEach(() => {
  cache.clear();
  vi.restoreAllMocks();
});

describe('cache', () => {
  it('stores and retrieves a value', () => {
    cache.set('key1', { foo: 'bar' });
    expect(cache.get('key1')).toEqual({ foo: 'bar' });
  });

  it('returns null for missing keys', () => {
    expect(cache.get('nonexistent')).toBeNull();
  });

  it('respects TTL expiry', () => {
    vi.useFakeTimers();
    cache.set('ttl-key', 'data', 1000);
    expect(cache.get('ttl-key')).toBe('data');

    vi.advanceTimersByTime(1001);
    expect(cache.get('ttl-key')).toBeNull();
    vi.useRealTimers();
  });

  it('clear() removes only cache entries', () => {
    localStorage.setItem('cache:a', JSON.stringify({ data: 1, expiry: Date.now() + 60000 }));
    localStorage.setItem('non-cache-key', 'keep-me');

    cache.clear();

    expect(localStorage.getItem('cache:a')).toBeNull();
    expect(localStorage.getItem('non-cache-key')).toBe('keep-me');
    localStorage.removeItem('non-cache-key');
  });

  it('cleanup() removes only expired entries', () => {
    vi.useFakeTimers();
    cache.set('fresh', 'alive', 60000);
    cache.set('stale', 'dead', 100);

    vi.advanceTimersByTime(200);
    cache.cleanup();

    // stale was expired and should be cleaned
    expect(cache.get('stale')).toBeNull();
    // fresh should still be valid
    expect(cache.get('fresh')).toBe('alive');
    vi.useRealTimers();
  });

  it('remove() deletes a specific key', () => {
    cache.set('del', 'value');
    cache.remove('del');
    expect(cache.get('del')).toBeNull();
  });
});

describe('createCacheKey', () => {
  it('combines prefix and params', () => {
    expect(createCacheKey('player', { tag: 'Foo#123' })).toBe('player:{"tag":"Foo#123"}');
  });
});

describe('TTL', () => {
  it('has expected default values', () => {
    expect(TTL.PERSONAL_SETTINGS).toBe(30 * 60 * 1000);
    expect(TTL.GAME_MODE_STATS).toBe(10 * 60 * 1000);
    expect(TTL.DEFAULT).toBe(5 * 60 * 1000);
  });
});

describe('fetchWithCache', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches from network on cache miss', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ result: 42 }),
    });

    const data = await fetchWithCache('https://api.test/data', { cacheKey: 'test-miss' });
    expect(data).toEqual({ result: 42 });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('returns cached data on cache hit', async () => {
    cache.set('test-hit', { cached: true });

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ cached: false }),
    });

    const data = await fetchWithCache('https://api.test/data', { cacheKey: 'test-hit' });
    expect(data).toEqual({ cached: true });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('skips cache when skipCache is true', async () => {
    cache.set('skip-key', { old: true });

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ fresh: true }),
    });

    const data = await fetchWithCache('https://api.test/data', {
      cacheKey: 'skip-key',
      skipCache: true,
    });
    expect(data).toEqual({ fresh: true });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('deduplicates concurrent requests for the same key', async () => {
    let resolveOuter;
    fetch.mockImplementationOnce(() => new Promise((resolve) => {
      resolveOuter = resolve;
    }));

    const p1 = fetchWithCache('https://api.test/dedup', { cacheKey: 'dedup-key' });
    const p2 = fetchWithCache('https://api.test/dedup', { cacheKey: 'dedup-key' });

    // Both should return the same promise — only one fetch call
    resolveOuter({
      ok: true,
      json: async () => ({ deduped: true }),
    });

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toEqual({ deduped: true });
    expect(r2).toEqual({ deduped: true });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('caches the response after fetch', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ stored: true }),
    });

    await fetchWithCache('https://api.test/store', { cacheKey: 'store-key', ttl: 60000 });

    // Should now be in cache
    expect(cache.get('store-key')).toEqual({ stored: true });
  });

  it('throws on non-OK response', async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 404 });

    await expect(
      fetchWithCache('https://api.test/fail', { cacheKey: 'fail-key' })
    ).rejects.toThrow('HTTP 404');
  });

  it('cleans up in-flight tracking after error', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));

    await expect(
      fetchWithCache('https://api.test/err', { cacheKey: 'err-key' })
    ).rejects.toThrow('Network error');

    // Second call should make a new request (not hang on stale promise)
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ recovered: true }),
    });

    const data = await fetchWithCache('https://api.test/err', { cacheKey: 'err-key' });
    expect(data).toEqual({ recovered: true });
  });
});

describe('fetchBatch', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches multiple URLs in parallel', async () => {
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 1 }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 2 }) });

    const results = await fetchBatch([
      { url: 'https://api.test/1', cacheKey: 'batch-1' },
      { url: 'https://api.test/2', cacheKey: 'batch-2' },
    ]);

    expect(results).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('returns null for failed requests without throwing', async () => {
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 1 }) })
      .mockRejectedValueOnce(new Error('fail'));

    const results = await fetchBatch([
      { url: 'https://api.test/ok', cacheKey: 'batch-ok' },
      { url: 'https://api.test/fail', cacheKey: 'batch-fail' },
    ]);

    expect(results).toEqual([{ id: 1 }, null]);
  });
});
