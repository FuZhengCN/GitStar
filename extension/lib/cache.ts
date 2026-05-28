const PREFIX = 'gitstar-cache:';

export interface CacheEntry<T> {
  data: T;
  ts: number;
}

export async function getCache<T>(key: string): Promise<CacheEntry<T> | null> {
  try {
    const result = await chrome.storage.local.get(PREFIX + key);
    const entry = result[PREFIX + key];
    if (!entry || typeof entry.ts !== 'number') return null;
    return entry as CacheEntry<T>;
  } catch {
    return null;
  }
}

export async function setCache<T>(key: string, data: T): Promise<void> {
  try {
    await chrome.storage.local.set({ [PREFIX + key]: { data, ts: Date.now() } });
  } catch {
    // 静默失败 — 缓存是 best-effort，不影响功能
  }
}

export function isFresh(entry: CacheEntry<unknown>, ttlMs: number): boolean {
  return Date.now() - entry.ts < ttlMs;
}
