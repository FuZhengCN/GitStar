import { useState, useEffect } from 'react';
import { getCache, setCache, isFresh } from '../lib/cache';

/**
 * Stale-while-revalidate cache hook. Shows cached data instantly, refreshes in background.
 *
 * @param cacheKey - Cache key (null to skip). Params should be encodeURIComponent-encoded.
 * @param fetcher - Data fetcher. **Must be wrapped in useCallback** with stable deps.
 * @param ttlMs - Cache TTL in ms. Fresh cache skips fetch entirely.
 */
export function useStaleCache<T>(
  cacheKey: string | null,
  fetcher: () => Promise<T>,
  ttlMs: number,
): { data: T | null; loading: boolean; error: Error | null } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!cacheKey) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    const key = cacheKey;

    async function run() {
      const cached = await getCache<T>(key);
      if (cancelled) return;

      if (cached) {
        setData(cached.data);
        setLoading(false);
        if (isFresh(cached, ttlMs)) return; // Cache fresh, skip background refresh
      } else {
        setLoading(true);
      }

      try {
        const fresh = await fetcher();
        if (cancelled) return;
        setData(fresh);
        setError(null);
        setCache(key, fresh).catch(() => {});
      } catch (err: unknown) {
        if (cancelled) return;
        if (!cached) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
        // 有旧缓存时静默保留旧数据
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();

    return () => { cancelled = true; };
  }, [cacheKey, fetcher, ttlMs]);

  return { data, loading, error };
}
