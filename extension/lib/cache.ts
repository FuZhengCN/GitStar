const PREFIX = 'gitstar-cache:';

export interface CacheEntry<T> {
  data: T;
  ts: number;
}

export async function getCache<T>(key: string): Promise<CacheEntry<T> | null> {
  try {
    const result = await chrome.storage.local.get(PREFIX + key);
    const entry = result[PREFIX + key];
    if (!entry || typeof entry.ts !== 'number' || isNaN(entry.ts)) return null;
    return entry as CacheEntry<T>;
  } catch (e) {
    console.debug('gitstar-cache: get failed for', key, e);
    return null;
  }
}

export async function setCache<T>(key: string, data: T): Promise<void> {
  try {
    await chrome.storage.local.set({ [PREFIX + key]: { data, ts: Date.now() } });
  } catch (e) {
    console.debug('gitstar-cache: set failed for', key, e);
  }
}

export function isFresh(entry: CacheEntry<unknown>, ttlMs: number): boolean {
  return Date.now() - entry.ts < ttlMs;
}
