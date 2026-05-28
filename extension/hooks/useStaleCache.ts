import { useState, useEffect } from 'react';
import { getCache, setCache } from '../lib/cache';

export function useStaleCache<T>(
  cacheKey: string | null,
  fetcher: () => Promise<T>,
  ttlMs: number,
): { data: T | null; loading: boolean; error: string | null } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cacheKey) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    async function run() {
      const cached = await getCache<T>(cacheKey!);
      if (cancelled) return;

      if (cached) {
        setData(cached.data);
        setLoading(false);
      } else {
        setLoading(true);
      }

      try {
        const fresh = await fetcher();
        if (cancelled) return;
        setData(fresh);
        setError(null);
        setCache(cacheKey!, fresh).catch(() => {});
      } catch (err: unknown) {
        if (cancelled) return;
        const e = err as { message?: string };
        if (!cached) {
          setError(e.message || '加载失败');
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
