import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStaleCache } from '../../hooks/useStaleCache';

// Mock cache module
vi.mock('../../lib/cache', () => ({
  getCache: vi.fn(),
  setCache: vi.fn(),
  isFresh: vi.fn(),
}));

import { getCache, setCache, isFresh } from '../../lib/cache';

const mockedGetCache = getCache as ReturnType<typeof vi.fn>;
const mockedSetCache = setCache as ReturnType<typeof vi.fn>;
const mockedIsFresh = isFresh as ReturnType<typeof vi.fn>;

function advanceTimers(ms: number) {
  act(() => { vi.advanceTimersByTime(ms); });
}

describe('useStaleCache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  it('returns null data and loading=true when no cache and fetch in progress', async () => {
    mockedGetCache.mockResolvedValue(null);
    mockedIsFresh.mockReturnValue(false);

    const fetcher = vi.fn().mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve('fresh data'), 100))
    );

    const { result } = renderHook(() =>
      useStaleCache('test-key', fetcher, 5000)
    );

    // Flush microtasks so getCache resolves and loading is set to true
    await act(async () => { vi.advanceTimersByTime(0); });

    // Before fetch resolves (100ms timer not yet advanced)
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('returns cached data immediately and skips fetch when fresh', async () => {
    mockedGetCache.mockResolvedValue({ data: 'cached', ts: Date.now() - 1000 });
    mockedIsFresh.mockReturnValue(true);

    const fetcher = vi.fn();

    const { result } = renderHook(() =>
      useStaleCache('test-key', fetcher, 5000)
    );

    await act(async () => { vi.advanceTimersByTime(0); });

    expect(result.current.data).toBe('cached');
    expect(result.current.loading).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('returns cached data immediately then refreshes in background when stale', async () => {
    mockedGetCache.mockResolvedValue({ data: 'stale-data', ts: Date.now() - 10000 });
    mockedIsFresh.mockReturnValue(false);
    mockedSetCache.mockResolvedValue(undefined);

    // Use a pending promise so fetch doesn't resolve in the same microtask
    let resolveFetcher: (value: string) => void;
    const fetcher = vi.fn().mockImplementation(
      () => new Promise<string>(resolve => { resolveFetcher = resolve; })
    );

    const { result } = renderHook(() =>
      useStaleCache('test-key', fetcher, 5000)
    );

    // Flush microtasks: getCache resolves, stale data shown
    await act(async () => { vi.advanceTimersByTime(0); });
    expect(result.current.data).toBe('stale-data');
    expect(result.current.loading).toBe(false);

    // Resolve fetcher: data updates to fresh
    await act(async () => {
      resolveFetcher!('fresh-data');
    });

    expect(result.current.data).toBe('fresh-data');
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(mockedSetCache).toHaveBeenCalledWith('test-key', 'fresh-data');
  });

  it('preserves stale data on fetch error', async () => {
    mockedGetCache.mockResolvedValue({ data: 'stale-data', ts: Date.now() - 10000 });
    mockedIsFresh.mockReturnValue(false);

    const fetcher = vi.fn().mockRejectedValue(new Error('network error'));

    const { result } = renderHook(() =>
      useStaleCache('test-key', fetcher, 5000)
    );

    await act(async () => { vi.advanceTimersByTime(0); });

    // Shows stale data
    expect(result.current.data).toBe('stale-data');

    // After failed fetch
    await act(async () => {
      await Promise.resolve().catch(() => {});
      vi.advanceTimersByTime(0);
    });

    // Still shows stale data, no error (silent retention)
    expect(result.current.data).toBe('stale-data');
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('sets error when fetch fails and no cache exists', async () => {
    mockedGetCache.mockResolvedValue(null);

    const fetcher = vi.fn().mockRejectedValue(new Error('network error'));

    const { result } = renderHook(() =>
      useStaleCache('test-key', fetcher, 5000)
    );

    await act(async () => { vi.advanceTimersByTime(0); });
    await act(async () => {
      await Promise.resolve().catch(() => {});
      vi.advanceTimersByTime(0);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('network error');
  });

  it('resets to null/loading=false when cacheKey is null', async () => {
    mockedGetCache.mockResolvedValue({ data: 'cached', ts: Date.now() });
    mockedIsFresh.mockReturnValue(true);

    const { result, rerender } = renderHook(
      ({ key }) => useStaleCache(key, vi.fn(), 5000),
      { initialProps: { key: 'valid-key' as string | null } }
    );

    await act(async () => { vi.advanceTimersByTime(0); });
    expect(result.current.data).toBe('cached');

    // Switch key to null
    rerender({ key: null });

    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('does not update state after unmount (cancel race condition)', async () => {
    mockedGetCache.mockResolvedValue(null);
    mockedIsFresh.mockReturnValue(false);

    let resolveFetch: (value: string) => void;
    const fetcher = vi.fn().mockImplementation(
      () => new Promise<string>(resolve => { resolveFetch = resolve; })
    );

    const { result, unmount } = renderHook(() =>
      useStaleCache('test-key', fetcher, 5000)
    );

    await act(async () => { vi.advanceTimersByTime(0); });

    // Unmount before fetch resolves
    unmount();

    // Resolve fetch after unmount — should NOT throw or update state
    await act(async () => {
      resolveFetch!('late-data');
    });

    // No assertion needed — the test passes if no "state update on unmounted component" warning/error
    expect(fetcher).toHaveBeenCalled();
    expect(mockedSetCache).not.toHaveBeenCalled(); // cancelled prevents cache write
  });

  it('re-fetches when cacheKey changes', async () => {
    mockedGetCache.mockResolvedValue(null);
    mockedSetCache.mockResolvedValue(undefined);

    const fetcher = vi.fn().mockImplementation(
      (key: string) => Promise.resolve(key)
    );

    const { rerender } = renderHook(
      ({ key, fn }) => useStaleCache(key, fn, 5000),
      {
        initialProps: {
          key: 'key-a',
          fn: vi.fn().mockResolvedValue('data-a'),
        },
      }
    );

    await act(async () => { vi.advanceTimersByTime(0); });

    rerender({
      key: 'key-b',
      fn: vi.fn().mockResolvedValue('data-b'),
    });

    await act(async () => { vi.advanceTimersByTime(0); });
    // Should have triggered a new fetch for the new key
    expect(mockedGetCache).toHaveBeenCalledWith('key-b');
  });
});
