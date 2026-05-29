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

const MAX_ENTRIES = 30;

async function evictOldest(): Promise<void> {
  try {
    const all = await chrome.storage.local.get(null);
    const cacheKeys = Object.keys(all)
      .filter((k) => k.startsWith(PREFIX))
      .sort((a, b) => (all[a].ts || 0) - (all[b].ts || 0));

    if (cacheKeys.length > MAX_ENTRIES) {
      const toRemove = cacheKeys.slice(0, cacheKeys.length - MAX_ENTRIES);
      await chrome.storage.local.remove(toRemove);
    }
  } catch (e) {
    console.debug('gitstar-cache: evict failed', e);
  }
}

export async function setCache<T>(key: string, data: T): Promise<void> {
  try {
    await chrome.storage.local.set({ [PREFIX + key]: { data, ts: Date.now() } });
    evictOldest();
  } catch (e) {
    console.debug('gitstar-cache: set failed for', key, e);
  }
}

export function isFresh(entry: CacheEntry<unknown>, ttlMs: number): boolean {
  return Date.now() - entry.ts < ttlMs;
}
